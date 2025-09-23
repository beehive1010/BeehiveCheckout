import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
}

interface SystemCheckResult {
  success: boolean;
  data?: {
    issues: number;
    details: string;
    recommendations?: string[];
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

    let result: SystemCheckResult;

    switch (checkType) {
      case 'users_sync':
        result = await checkUsersSync(supabaseClient);
        break;
      case 'membership_sync':
        result = await checkMembershipSync(supabaseClient);
        break;
      case 'referrals_sync':
        result = await checkReferralsSync(supabaseClient);
        break;
      case 'matrix_gaps':
        result = await checkMatrixGaps(supabaseClient);
        break;
      case 'layer_rewards_check':
        result = await checkLayerRewards(supabaseClient);
        break;
      case 'user_balance_check':
        result = await checkUserBalance(supabaseClient);
        break;
      case 'views_refresh':
        result = await checkViewsStatus(supabaseClient);
        break;
      default:
        result = {
          success: false,
          error: `Unknown check type: ${checkType}`
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
    console.error('System check error:', error)
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

async function checkUsersSync(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for users without corresponding members records
    const { data: orphanUsers, error: orphanError } = await supabase
      .from('users')
      .select('wallet_address')
      .not('wallet_address', 'in', 
        supabase.from('members').select('wallet_address')
      );

    if (orphanError) throw orphanError;

    // Check for members without corresponding users records
    const { data: orphanMembers, error: orphanMembersError } = await supabase
      .from('members')
      .select('wallet_address')
      .not('wallet_address', 'in',
        supabase.from('users').select('wallet_address')
      );

    if (orphanMembersError) throw orphanMembersError;

    const totalIssues = (orphanUsers?.length || 0) + (orphanMembers?.length || 0);

    return {
      success: true,
      data: {
        issues: totalIssues,
        details: `Found ${orphanUsers?.length || 0} users without member records and ${orphanMembers?.length || 0} members without user records`,
        recommendations: totalIssues > 0 ? [
          'Create missing member records for orphaned users',
          'Create missing user records for orphaned members', 
          'Verify wallet address consistency'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Users sync check failed: ${error.message}`
    };
  }
}

async function checkMembershipSync(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for inconsistencies between users.membership_level and members.current_level
    const { data: inconsistent, error } = await supabase
      .rpc('check_membership_level_consistency');

    if (error) throw error;

    const issues = Array.isArray(inconsistent) ? inconsistent.length : 0;

    return {
      success: true,
      data: {
        issues,
        details: `Found ${issues} users with inconsistent membership levels between users and members tables`,
        recommendations: issues > 0 ? [
          'Sync membership levels between tables',
          'Update activation timestamps',
          'Verify NFT ownership matches membership level'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Membership sync check failed: ${error.message}`
    };
  }
}

async function checkReferralsSync(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for invalid referral relationships
    const { data: invalidReferrals, error } = await supabase
      .from('referrals_new')
      .select('referrer_wallet, referred_wallet')
      .or('referrer_wallet.is.null,referred_wallet.is.null');

    if (error) throw error;

    // Check for self-referrals
    const { data: selfReferrals, error: selfError } = await supabase
      .from('referrals_new')
      .select('referrer_wallet, referred_wallet')
      .filter('referrer_wallet', 'eq', 'referred_wallet');

    if (selfError) throw selfError;

    const totalIssues = (invalidReferrals?.length || 0) + (selfReferrals?.length || 0);

    return {
      success: true,
      data: {
        issues: totalIssues,
        details: `Found ${invalidReferrals?.length || 0} invalid referrals and ${selfReferrals?.length || 0} self-referrals`,
        recommendations: totalIssues > 0 ? [
          'Remove invalid referral records',
          'Fix self-referral entries',
          'Validate all referrer wallet addresses exist'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Referrals sync check failed: ${error.message}`
    };
  }
}

async function checkMatrixGaps(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for missing matrix positions that should be filled
    const { data: matrixGaps, error } = await supabase
      .rpc('find_matrix_position_gaps');

    if (error) throw error;

    const issues = Array.isArray(matrixGaps) ? matrixGaps.length : 0;

    return {
      success: true,
      data: {
        issues,
        details: `Found ${issues} gaps in matrix positions that need to be filled`,
        recommendations: issues > 0 ? [
          'Fill empty matrix positions with eligible members',
          'Verify matrix tree structure integrity',
          'Update matrix placement timestamps'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Matrix gaps check failed: ${error.message}`
    };
  }
}

async function checkLayerRewards(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for inconsistencies in layer rewards
    const { data: rewardIssues, error } = await supabase
      .rpc('validate_layer_rewards_integrity');

    if (error) throw error;

    const issues = Array.isArray(rewardIssues) ? rewardIssues.length : 0;

    return {
      success: true,
      data: {
        issues,
        details: `Found ${issues} layer reward inconsistencies or processing errors`,
        recommendations: issues > 0 ? [
          'Recalculate incorrect reward amounts',
          'Process pending reward claims',
          'Verify reward distribution logic'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Layer rewards check failed: ${error.message}`
    };
  }
}

async function checkUserBalance(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check for balance inconsistencies
    const { data: balanceIssues, error } = await supabase
      .rpc('validate_user_balance_integrity');

    if (error) throw error;

    const issues = Array.isArray(balanceIssues) ? balanceIssues.length : 0;

    return {
      success: true,
      data: {
        issues,
        details: `Found ${issues} user balance inconsistencies or calculation errors`,
        recommendations: issues > 0 ? [
          'Recalculate BCC balances',
          'Sync transferable and restricted amounts',
          'Verify transaction history'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `User balance check failed: ${error.message}`
    };
  }
}

async function checkViewsStatus(supabase: any): Promise<SystemCheckResult> {
  try {
    // Check if materialized views need refresh
    const { data: viewStatus, error } = await supabase
      .rpc('check_materialized_views_status');

    if (error) throw error;

    const staleViews = Array.isArray(viewStatus) ? viewStatus.filter(v => v.needs_refresh) : [];

    return {
      success: true,
      data: {
        issues: staleViews.length,
        details: `Found ${staleViews.length} materialized views that need refreshing`,
        recommendations: staleViews.length > 0 ? [
          'Refresh stale materialized views',
          'Update view statistics',
          'Rebuild view indexes if needed'
        ] : []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Views status check failed: ${error.message}`
    };
  }
}