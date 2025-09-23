import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
}

interface SystemFixResult {
  success: boolean;
  data?: {
    fixed: number;
    details: string;
    summary?: string[];
  };
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { checkType } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let result: SystemFixResult;

    switch (checkType) {
      case 'users_sync':
        result = await fixUsersSync(supabaseClient);
        break;
      case 'membership_sync':
        result = await fixMembershipSync(supabaseClient);
        break;
      case 'referrals_sync':
        result = await fixReferralsSync(supabaseClient);
        break;
      case 'matrix_gaps':
        result = await fixMatrixGaps(supabaseClient);
        break;
      case 'layer_rewards_check':
        result = await fixLayerRewards(supabaseClient);
        break;
      case 'user_balance_check':
        result = await fixUserBalance(supabaseClient);
        break;
      case 'views_refresh':
        result = await refreshViews(supabaseClient);
        break;
      default:
        result = {
          success: false,
          error: `Unknown fix type: ${checkType}`
        };
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400
      }
    )

  } catch (error) {
    console.error('System fix error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function fixUsersSync(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Fix orphaned users by creating member records
    const { data: orphanUsers, error: orphanError } = await supabase
      .from('users')
      .select('wallet_address, created_at')
      .not('wallet_address', 'in', 
        supabase.from('members').select('wallet_address')
      );

    if (orphanError) throw orphanError;

    if (orphanUsers && orphanUsers.length > 0) {
      const memberRecords = orphanUsers.map(user => ({
        wallet_address: user.wallet_address,
        current_level: 0,
        created_at: user.created_at,
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('members')
        .insert(memberRecords);

      if (insertError) throw insertError;
      
      totalFixed += orphanUsers.length;
      summary.push(`Created ${orphanUsers.length} missing member records`);
    }

    // Fix orphaned members by creating user records
    const { data: orphanMembers, error: orphanMembersError } = await supabase
      .from('members')
      .select('wallet_address, created_at')
      .not('wallet_address', 'in',
        supabase.from('users').select('wallet_address')
      );

    if (orphanMembersError) throw orphanMembersError;

    if (orphanMembers && orphanMembers.length > 0) {
      const userRecords = orphanMembers.map(member => ({
        wallet_address: member.wallet_address,
        membership_level: 0,
        registration_status: 'active',
        created_at: member.created_at,
        updated_at: new Date().toISOString()
      }));

      const { error: insertUserError } = await supabase
        .from('users')
        .insert(userRecords);

      if (insertUserError) throw insertUserError;
      
      totalFixed += orphanMembers.length;
      summary.push(`Created ${orphanMembers.length} missing user records`);
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully synchronized ${totalFixed} user/member records`,
        summary
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Users sync fix failed: ${error.message}`
    };
  }
}

async function fixMembershipSync(supabase: any): Promise<SystemFixResult> {
  try {
    const { data: fixResult, error } = await supabase
      .rpc('fix_membership_level_consistency');

    if (error) throw error;

    const fixed = fixResult?.fixed_count || 0;

    return {
      success: true,
      data: {
        fixed,
        details: `Successfully synchronized ${fixed} membership level inconsistencies`,
        summary: fixed > 0 ? [
          `Updated ${fixed} membership levels`,
          'Synchronized users and members tables',
          'Updated activation timestamps'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Membership sync fix failed: ${error.message}`
    };
  }
}

async function fixReferralsSync(supabase: any): Promise<SystemFixResult> {
  try {
    let totalFixed = 0;
    const summary: string[] = [];

    // Remove invalid referrals (null wallet addresses)
    const { data: deletedInvalid, error: deleteError } = await supabase
      .from('referrals_new')
      .delete()
      .or('referrer_wallet.is.null,referred_wallet.is.null')
      .select();

    if (deleteError) throw deleteError;

    if (deletedInvalid && deletedInvalid.length > 0) {
      totalFixed += deletedInvalid.length;
      summary.push(`Removed ${deletedInvalid.length} invalid referral records`);
    }

    // Remove self-referrals
    const { data: deletedSelf, error: deleteSelfError } = await supabase
      .from('referrals_new')
      .delete()
      .filter('referrer_wallet', 'eq', 'referred_wallet')
      .select();

    if (deleteSelfError) throw deleteSelfError;

    if (deletedSelf && deletedSelf.length > 0) {
      totalFixed += deletedSelf.length;
      summary.push(`Removed ${deletedSelf.length} self-referral records`);
    }

    return {
      success: true,
      data: {
        fixed: totalFixed,
        details: `Successfully cleaned up ${totalFixed} referral inconsistencies`,
        summary
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Referrals sync fix failed: ${error.message}`
    };
  }
}

async function fixMatrixGaps(supabase: any): Promise<SystemFixResult> {
  try {
    const { data: fixResult, error } = await supabase
      .rpc('fill_matrix_position_gaps');

    if (error) throw error;

    const fixed = fixResult?.positions_filled || 0;

    return {
      success: true,
      data: {
        fixed,
        details: `Successfully filled ${fixed} matrix position gaps`,
        summary: fixed > 0 ? [
          `Filled ${fixed} empty matrix positions`,
          'Updated matrix tree structure',
          'Recalculated matrix placements'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Matrix gaps fix failed: ${error.message}`
    };
  }
}

async function fixLayerRewards(supabase: any): Promise<SystemFixResult> {
  try {
    const { data: fixResult, error } = await supabase
      .rpc('fix_layer_rewards_integrity');

    if (error) throw error;

    const fixed = fixResult?.rewards_fixed || 0;

    return {
      success: true,
      data: {
        fixed,
        details: `Successfully fixed ${fixed} layer reward inconsistencies`,
        summary: fixed > 0 ? [
          `Recalculated ${fixed} reward amounts`,
          'Processed pending claims',
          'Updated reward statuses'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Layer rewards fix failed: ${error.message}`
    };
  }
}

async function fixUserBalance(supabase: any): Promise<SystemFixResult> {
  try {
    const { data: fixResult, error } = await supabase
      .rpc('fix_user_balance_integrity');

    if (error) throw error;

    const fixed = fixResult?.balances_fixed || 0;

    return {
      success: true,
      data: {
        fixed,
        details: `Successfully fixed ${fixed} user balance inconsistencies`,
        summary: fixed > 0 ? [
          `Recalculated ${fixed} BCC balances`,
          'Synchronized transferable amounts',
          'Updated balance timestamps'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `User balance fix failed: ${error.message}`
    };
  }
}

async function refreshViews(supabase: any): Promise<SystemFixResult> {
  try {
    const { data: refreshResult, error } = await supabase
      .rpc('refresh_all_materialized_views');

    if (error) throw error;

    const refreshed = refreshResult?.views_refreshed || 0;

    return {
      success: true,
      data: {
        fixed: refreshed,
        details: `Successfully refreshed ${refreshed} materialized views`,
        summary: refreshed > 0 ? [
          `Refreshed ${refreshed} materialized views`,
          'Updated view statistics',
          'Rebuilt view indexes'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Views refresh failed: ${error.message}`
    };
  }
}