// Beehive Platform - Enhanced Balance Management Edge Function  
// Handles segregated BCC balance (transferable vs locked), tier-based unlocks, and comprehensive balance operations
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// BCC Tier Configuration with halving mechanism (matches MarketingPlan.md)
const BCC_TIER_CONFIG = {
  PHASE_1: { id: 1, maxMembers: 9999, multiplier: 1.0 },
  PHASE_2: { id: 2, maxMembers: 9999, multiplier: 0.5 },
  PHASE_3: { id: 3, maxMembers: 19999, multiplier: 0.25 },
  PHASE_4: { id: 4, maxMembers: Infinity, multiplier: 0.125 }
} as const;

// BCC Level unlock amounts (base amounts for Phase 1)
const BCC_LEVEL_UNLOCK_BASE = {
  1: 100, 2: 150, 3: 200, 4: 250, 5: 300, 6: 350, 7: 400, 8: 450, 9: 500,
  10: 550, 11: 600, 12: 650, 13: 700, 14: 750, 15: 800, 16: 850, 17: 900, 18: 950, 19: 1000
} as const;

interface BccBalanceBreakdown {
  transferable: number;
  locked_rewards: number;
  locked_level_unlock: number;
  locked_staking_rewards: number;
  pending_activation: number;
  total: number;
  breakdown_details: {
    tier_phase: number;
    tier_multiplier: number;
    next_unlock_level?: number;
    next_unlock_amount?: number;
    pending_reward_claims: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const walletAddress = req.headers.get('x-wallet-address'); // Preserve original case
    if (!walletAddress) {
      return new Response(JSON.stringify({
        error: 'Wallet address required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get-balance-breakdown';

    switch (action) {
      case 'get-balance-breakdown':
        return await handleGetBalanceBreakdown(supabase, walletAddress);
      case 'transfer-bcc':
        return await handleTransferBcc(supabase, walletAddress, await req.json());
      case 'claim-locked-rewards':
        return await handleClaimLockedRewards(supabase, walletAddress);
      case 'unlock-level-rewards':
        return await handleUnlockLevelRewards(supabase, walletAddress, await req.json());
      case 'get-unlock-history':
        return await handleGetUnlockHistory(supabase, walletAddress);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Enhanced balance function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getCurrentTierPhase(supabase: any): Promise<number> {
  try {
    // Count total activated members to determine current tier
    const { count: totalActivated, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('is_activated', true);

    if (error) throw error;

    const activatedCount = totalActivated || 0;
    
    if (activatedCount <= 9999) return 1;
    if (activatedCount <= 19998) return 2; // 9999 + 9999
    if (activatedCount <= 39997) return 3; // 19998 + 19999
    return 4;
  } catch (error) {
    console.error('Error getting tier phase:', error);
    return 1; // Default to Phase 1
  }
}

async function calculateBccUnlockAmount(level: number, tierPhase: number): Promise<number> {
  const baseAmount = BCC_LEVEL_UNLOCK_BASE[level as keyof typeof BCC_LEVEL_UNLOCK_BASE] || 0;
  const tierConfig = Object.values(BCC_TIER_CONFIG).find(tier => tier.id === tierPhase);
  const multiplier = tierConfig?.multiplier || 1.0;
  
  return Math.floor(baseAmount * multiplier);
}

async function handleGetBalanceBreakdown(supabase: any, walletAddress: string) {
  try {
    // Get current tier phase
    const tierPhase = await getCurrentTierPhase(supabase);
    const tierConfig = Object.values(BCC_TIER_CONFIG).find(tier => tier.id === tierPhase)!;

    // Get member data
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('current_level, is_activated, levels_owned')
      .eq('wallet_address', walletAddress)
      .single();

    if (memberError && memberError.code !== 'PGRST116') {
      throw memberError;
    }

    const currentLevel = memberData?.current_level || 0;
    const isActivated = memberData?.is_activated || false;
    const levelsOwned = memberData?.levels_owned || [];

    // Get current balance from user_balances table
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('bcc_transferable, bcc_locked, bcc_earned_rewards, bcc_pending_activation')
      .eq('wallet_address', walletAddress)
      .single();

    if (balanceError && balanceError.code !== 'PGRST116') {
      throw balanceError;
    }

    // Initialize balance if not exists
    const currentBalance = balanceData || {
      bcc_transferable: 0,
      bcc_locked: 0,
      bcc_earned_rewards: 0,
      bcc_pending_activation: isActivated ? 0 : await calculateBccUnlockAmount(1, tierPhase)
    };

    // Get pending reward claims
    const { data: pendingRewards, error: rewardError } = await supabase
      .from('reward_claims')
      .select('reward_amount_bcc')
      .eq('recipient_wallet', walletAddress)
      .eq('status', 'pending');

    if (rewardError) throw rewardError;

    const lockedRewards = pendingRewards?.reduce((sum: number, reward: any) => 
      sum + (reward.reward_amount_bcc || 0), 0) || 0;

    // Calculate next level unlock amount
    const nextLevel = currentLevel + 1;
    const nextUnlockAmount = nextLevel <= 19 ? 
      await calculateBccUnlockAmount(nextLevel, tierPhase) : 0;

    // Build comprehensive balance breakdown
    const balanceBreakdown: BccBalanceBreakdown = {
      transferable: currentBalance.bcc_transferable || 0,
      locked_rewards: lockedRewards,
      locked_level_unlock: nextUnlockAmount,
      locked_staking_rewards: currentBalance.bcc_locked || 0,
      pending_activation: currentBalance.bcc_pending_activation || 0,
      total: (currentBalance.bcc_transferable || 0) + 
             lockedRewards + 
             nextUnlockAmount + 
             (currentBalance.bcc_locked || 0) + 
             (currentBalance.bcc_pending_activation || 0),
      breakdown_details: {
        tier_phase: tierPhase,
        tier_multiplier: tierConfig.multiplier,
        next_unlock_level: nextLevel <= 19 ? nextLevel : undefined,
        next_unlock_amount: nextUnlockAmount > 0 ? nextUnlockAmount : undefined,
        pending_reward_claims: pendingRewards?.length || 0
      }
    };

    return new Response(JSON.stringify({
      success: true,
      balance_breakdown: balanceBreakdown,
      member_info: {
        current_level: currentLevel,
        is_activated: isActivated,
        levels_owned: levelsOwned,
        wallet_address: walletAddress
      },
      tier_info: {
        current_phase: tierPhase,
        multiplier: tierConfig.multiplier,
        max_members: tierConfig.maxMembers,
        phase_name: `Phase ${tierPhase}`
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Balance breakdown error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch balance breakdown',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleTransferBcc(supabase: any, walletAddress: string, data: any) {
  try {
    const { recipient_wallet, amount, purpose } = data;

    if (!recipient_wallet || !amount || amount <= 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Valid recipient wallet and amount required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check transferable balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('bcc_transferable')
      .eq('wallet_address', walletAddress)
      .single();

    if (balanceError) throw balanceError;

    const transferableBalance = balanceData?.bcc_transferable || 0;
    if (transferableBalance < amount) {
      return new Response(JSON.stringify({
        success: false,
        error: `Insufficient transferable balance. Available: ${transferableBalance} BCC, Requested: ${amount} BCC`,
        available_transferable: transferableBalance
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Execute transfer using stored procedure
    const { data: transferResult, error: transferError } = await supabase
      .rpc('transfer_bcc_segregated', {
        p_from_wallet: walletAddress,
        p_to_wallet: recipient_wallet,
        p_amount: amount,
        p_purpose: purpose || 'BCC Transfer',
        p_balance_type: 'transferable'
      });

    if (transferError) throw transferError;

    if (!transferResult?.success) {
      return new Response(JSON.stringify({
        success: false,
        error: transferResult?.error || 'Transfer failed'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      transfer: {
        from: walletAddress,
        to: recipient_wallet,
        amount: amount,
        purpose: purpose || 'BCC Transfer',
        new_sender_balance: transferResult.new_sender_balance,
        new_recipient_balance: transferResult.new_recipient_balance,
        transaction_id: transferResult.transaction_id
      },
      message: `Successfully transferred ${amount} BCC to ${recipient_wallet}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Transfer BCC error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to transfer BCC',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleClaimLockedRewards(supabase: any, walletAddress: string) {
  try {
    // Get pending reward claims that can be unlocked
    const { data: claimableRewards, error: rewardError } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('recipient_wallet', walletAddress)
      .eq('status', 'pending')
      .lte('expires_at', new Date().toISOString()); // Only expired/claimable rewards

    if (rewardError) throw rewardError;

    if (!claimableRewards || claimableRewards.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No claimable rewards available',
        pending_rewards: 0
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Process reward claims using stored procedure
    const { data: claimResult, error: claimError } = await supabase
      .rpc('claim_locked_bcc_rewards', {
        p_wallet_address: walletAddress
      });

    if (claimError) throw claimError;

    return new Response(JSON.stringify({
      success: true,
      claimed_rewards: {
        total_amount: claimResult.total_claimed,
        reward_count: claimResult.rewards_processed,
        new_transferable_balance: claimResult.new_transferable_balance
      },
      message: `Successfully claimed ${claimResult.total_claimed} BCC from ${claimResult.rewards_processed} rewards`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Claim locked rewards error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to claim locked rewards',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleUnlockLevelRewards(supabase: any, walletAddress: string, data: any) {
  try {
    const { level } = data;

    if (!level || level < 1 || level > 19) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Valid level (1-19) required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Execute level reward unlock using stored procedure
    const { data: unlockResult, error: unlockError } = await supabase
      .rpc('unlock_level_bcc_rewards', {
        p_wallet_address: walletAddress,
        p_level: level
      });

    if (unlockError) throw unlockError;

    if (!unlockResult?.success) {
      return new Response(JSON.stringify({
        success: false,
        error: unlockResult?.error || 'Level unlock failed'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      unlock: {
        level: level,
        amount_unlocked: unlockResult.amount_unlocked,
        new_transferable_balance: unlockResult.new_transferable_balance,
        tier_phase: unlockResult.tier_phase
      },
      message: `Successfully unlocked ${unlockResult.amount_unlocked} BCC for reaching Level ${level}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unlock level rewards error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to unlock level rewards',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetUnlockHistory(supabase: any, walletAddress: string) {
  try {
    // Get unlock history from transactions table
    const { data: unlockHistory, error: historyError } = await supabase
      .from('bcc_transactions')
      .select(`
        transaction_id,
        amount,
        transaction_type,
        purpose,
        metadata,
        created_at,
        status
      `)
      .eq('wallet_address', walletAddress)
      .in('transaction_type', ['level_unlock', 'reward_claim', 'activation_unlock'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (historyError) throw historyError;

    return new Response(JSON.stringify({
      success: true,
      unlock_history: unlockHistory || [],
      summary: {
        total_unlocks: unlockHistory?.length || 0,
        total_amount: unlockHistory?.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0) || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get unlock history error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch unlock history',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}