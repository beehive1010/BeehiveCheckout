// Data Fix Function - Repairs data inconsistencies for activated members
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, walletAddress } = await req.json();

    switch (action) {
      case 'fix-member-data':
        return await fixMemberData(supabase, walletAddress);
      case 'analyze-member':
        return await analyzeMember(supabase, walletAddress);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Data fix error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeMember(supabase, walletAddress) {
  try {
    console.log(`🔍 Analyzing member data for: ${walletAddress}`);

    // Get member data
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    // Get referrals data
    const { data: referralsData, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_wallet', walletAddress.toLowerCase());

    // Get balance data
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        member: memberData,
        user: userData,
        referrals: referralsData,
        balance: balanceData,
        errors: {
          memberError,
          userError,
          referralsError,
          balanceError
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(JSON.stringify({
      error: 'Analysis failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function fixMemberData(supabase, walletAddress) {
  try {
    console.log(`🔧 Fixing member data for: ${walletAddress}`);
    
    const fixes = [];
    let memberData, userData;

    // Get current member data
    const { data: currentMember, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (memberError || !currentMember) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Member not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    memberData = currentMember;

    // Get user data
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (userError || !currentUser) {
      fixes.push('⚠️  No user record found');
    } else {
      userData = currentUser;
    }

    // Fix 1: Ensure levels_owned includes current_level
    if (memberData.is_activated && memberData.current_level > 0) {
      const levelsOwned = memberData.levels_owned || [];
      if (!levelsOwned.includes(memberData.current_level)) {
        const newLevelsOwned = [...levelsOwned, memberData.current_level].sort((a, b) => a - b);
        
        const { error: updateError } = await supabase
          .from('members')
          .update({ levels_owned: newLevelsOwned })
          .eq('wallet_address', walletAddress.toLowerCase());

        if (!updateError) {
          fixes.push(`✅ Fixed levels_owned: added level ${memberData.current_level}`);
        } else {
          fixes.push(`❌ Failed to update levels_owned: ${updateError.message}`);
        }
      } else {
        fixes.push(`✓ levels_owned already correct: ${levelsOwned}`);
      }
    }

    // Fix 2: Create referrals entry if member is activated but no referrals record exists
    if (memberData.is_activated && userData?.referrer_wallet) {
      const { data: existingReferral, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_wallet', walletAddress.toLowerCase())
        .single();

      if (referralError && referralError.code === 'PGRST116') {
        // No referral record exists, create one
        const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
        const referrerWallet = userData.referrer_wallet || ROOT_WALLET;

        const { error: insertError } = await supabase
          .from('referrals')
          .insert({
            referrer_wallet: referrerWallet,
            referred_wallet: walletAddress.toLowerCase(),
            is_active: true,
            layer: 1,
            member_wallet: walletAddress.toLowerCase(),
            placement_type: 'direct',
            position: 'left'
          });

        if (!insertError) {
          fixes.push(`✅ Created missing referrals record with referrer: ${referrerWallet}`);
        } else {
          fixes.push(`❌ Failed to create referrals record: ${insertError.message}`);
        }
      } else if (!referralError) {
        fixes.push(`✓ Referrals record already exists`);
      } else {
        fixes.push(`⚠️  Referrals check failed: ${referralError.message}`);
      }
    }

    // Fix 3: Ensure user_balances record exists
    const { data: existingBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (balanceError && balanceError.code === 'PGRST116') {
      // No balance record exists, create one
      const { error: insertError } = await supabase
        .from('user_balances')
        .insert({
          wallet_address: walletAddress.toLowerCase(),
          bcc_transferable: 500, // Default starter balance
          bcc_restricted: 0,
          bcc_locked: 0,
          total_usdt_earned: 0,
          available_usdt_rewards: 0
        });

      if (!insertError) {
        fixes.push(`✅ Created missing user_balances record`);
      } else {
        fixes.push(`❌ Failed to create balance record: ${insertError.message}`);
      }
    } else if (!balanceError) {
      fixes.push(`✓ Balance record already exists`);
    }

    console.log(`🔧 Data fix completed for ${walletAddress}:`, fixes);

    return new Response(JSON.stringify({
      success: true,
      message: `Data fix completed for ${walletAddress}`,
      fixes: fixes,
      summary: {
        wallet_address: memberData.wallet_address,
        is_activated: memberData.is_activated,
        current_level: memberData.current_level,
        levels_owned: memberData.levels_owned,
        referrer_wallet: userData?.referrer_wallet
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fix member data error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fix member data',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}