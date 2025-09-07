// Beehive Platform - Rewards Management Edge Function
// Handles reward claims, processing, and management
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    let action = url.pathname.split('/').pop();
    
    // If no action from URL path, try to get from query params or use default
    if (!action || action === 'rewards') {
      action = url.searchParams.get('action') || 'get-balance';
    }

    switch (action) {
      case 'get-claims':
        return await getRewardClaims(req, supabaseClient);
      case 'claim-reward':
        return await claimReward(req, supabaseClient);
      case 'get-notifications':
        return await getRewardNotifications(req, supabaseClient);
      case 'withdraw-balance':
        return await withdrawRewardBalance(req, supabaseClient);
      case 'get-balance':
        return await getRewardBalance(req, supabaseClient);
      case 'maintenance':
        return await runMaintenance(req, supabaseClient);
      case 'dashboard':
        return await getRewardDashboard(req, supabaseClient);
      case 'check-pending-rewards':
        return await checkPendingRewards(req, supabaseClient);
      case 'process-expired-rewards':
        return await processExpiredRewards(req, supabaseClient);
      case 'get-reward-timers':
        return await getRewardTimers(req, supabaseClient);
      case 'update-reward-status':
        return await updateRewardStatus(req, supabaseClient);
      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Unknown action'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 400
        });
    }
  } catch (error) {
    console.error('Rewards function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

async function getRewardClaims(req, supabaseClient) {
  const { wallet_address, status, layer } = await req.json();

  if (!wallet_address) {
    return new Response(JSON.stringify({
      success: false,
      error: 'wallet_address required'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }

  let query = supabaseClient
    .from('reward_claims_dashboard')
    .select('*')
    .eq('root_wallet', wallet_address);

  if (status) {
    query = query.eq('status', status);
  }

  if (layer) {
    query = query.eq('layer', layer);
  }

  const { data: claims, error } = await query
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get claims error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch claims'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }

  return new Response(JSON.stringify({
    success: true,
    data: claims
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

async function claimReward(req, supabaseClient) {
  const { claim_id, wallet_address } = await req.json();

  if (!claim_id || !wallet_address) {
    return new Response(JSON.stringify({
      success: false,
      error: 'claim_id and wallet_address required'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }

  // Verify claim ownership
  const { data: claim, error: claimError } = await supabaseClient
    .from('reward_claims')
    .select('*')
    .eq('id', claim_id)
    .eq('root_wallet', wallet_address)
    .single();

  if (claimError || !claim) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Claim not found or access denied'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 404
    });
  }

  if (claim.status !== 'claimable') {
    return new Response(JSON.stringify({
      success: false,
      error: `Claim is ${claim.status}, cannot be claimed`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }

  // CRITICAL BUSINESS RULE: Check Level 2 Right Slot restriction
  // Layer 1 (Right slot) rewards require root to be Level 2+
  if (claim.layer === 1 && claim.matrix_position === 'right') {
    const { data: memberData, error: memberError } = await supabaseClient
      .from('members')
      .select('current_level')
      .eq('wallet_address', wallet_address)
      .single();

    if (memberError || !memberData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unable to verify member level requirements'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    if (memberData.current_level < 2) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Level 2 Right Slot Restriction: You must upgrade to Level 2 to claim Layer 1 Right slot rewards',
        restriction_type: 'level_2_right_slot',
        required_level: 2,
        current_level: memberData.current_level
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 403
      });
    }
  }

  // Process the claim using new balance system
  try {
    // Use new claim_reward_to_balance function (handles status update and balance internally)
    const { data: claimResult, error: balanceError } = await supabaseClient.rpc('claim_reward_to_balance', {
      p_claim_id: claim_id,
      p_wallet_address: wallet_address
    });

    if (balanceError || !claimResult?.success) {
      throw new Error(claimResult?.error || balanceError?.message || 'Claim processing failed');
    }

    console.log(`Reward claimed successfully: ${claim_id} for ${wallet_address}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Reward claimed successfully',
      data: {
        claim_id: claim_id,
        amount_usdc: claim.reward_amount_usdc,
        layer: claim.layer,
        nft_level: claim.nft_level
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Claim processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process claim',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

async function runMaintenance(req, supabaseClient) {
  // Run reward system maintenance (expired rewards, rollups, etc.)
  const { data: maintenanceResult, error } = await supabaseClient.rpc('process_reward_system_maintenance');

  if (error) {
    console.error('Maintenance error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Maintenance failed'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Maintenance completed',
    data: maintenanceResult
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

async function getRewardDashboard(req, supabaseClient) {
  const { wallet_address } = await req.json();

  if (!wallet_address) {
    return new Response(JSON.stringify({
      success: false,
      error: 'wallet_address required'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }

  // Get reward claims summary
  const { data: claimsSummary, error: claimsError } = await supabaseClient
    .from('reward_claims')
    .select('status, layer, reward_amount_usdc')
    .eq('root_wallet', wallet_address);

  if (claimsError) {
    console.error('Dashboard claims error:', claimsError);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch dashboard data'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }

  // Get member requirements
  const { data: requirements, error: reqError } = await supabaseClient
    .from('member_requirements_view')
    .select('*')
    .eq('wallet_address', wallet_address)
    .single();

  if (reqError) {
    console.error('Dashboard requirements error:', reqError);
  }

  // Calculate summary statistics
  const totalClaimed = claimsSummary
    .filter(c => c.status === 'claimed')
    .reduce((sum, c) => sum + parseFloat(c.reward_amount_usdc), 0);

  const totalPending = claimsSummary
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + parseFloat(c.reward_amount_usdc), 0);

  const totalClaimable = claimsSummary
    .filter(c => c.status === 'claimable')
    .reduce((sum, c) => sum + parseFloat(c.reward_amount_usdc), 0);

  return new Response(JSON.stringify({
    success: true,
    data: {
      wallet_address,
      reward_summary: {
        total_claimed_usdc: totalClaimed,
        total_pending_usdc: totalPending,
        total_claimable_usdc: totalClaimable,
        total_claims: claimsSummary.length
      },
      member_requirements: requirements || null,
      recent_claims: claimsSummary.slice(0, 10)
    }
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

async function getRewardNotifications(req, supabaseClient) {
  const { wallet_address, is_read, limit = 50 } = await req.json();

  if (!wallet_address) {
    return new Response(JSON.stringify({
      success: false,
      error: 'wallet_address required'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }

  let query = supabaseClient
    .from('reward_notifications')
    .select('*')
    .eq('wallet_address', wallet_address);

  if (typeof is_read === 'boolean') {
    query = query.eq('is_read', is_read);
  }

  const { data: notifications, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Get notifications error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch notifications'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }

  return new Response(JSON.stringify({
    success: true,
    data: notifications,
    unread_count: notifications.filter(n => !n.is_read).length
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

async function withdrawRewardBalance(req, supabaseClient) {
  const { wallet_address, amount_usdc, withdrawal_address } = await req.json();

  if (!wallet_address || !amount_usdc) {
    return new Response(JSON.stringify({
      success: false,
      error: 'wallet_address and amount_usdc required'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }

  // Process withdrawal using database function
  const { data: withdrawalResult, error } = await supabaseClient.rpc('withdraw_reward_balance', {
    p_wallet_address: wallet_address,
    p_amount_usdc: amount_usdc,
    p_withdrawal_address: withdrawal_address
  });

  if (error || !withdrawalResult?.success) {
    console.error('Withdrawal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: withdrawalResult?.error || 'Withdrawal failed',
      details: error?.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }

  console.log(`Withdrawal processed: ${amount_usdc} USDC for ${wallet_address}`);

  return new Response(JSON.stringify({
    success: true,
    message: 'Withdrawal processed successfully',
    data: withdrawalResult
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

async function getRewardBalance(req, supabaseClient) {
  const { wallet_address } = await req.json();

  if (!wallet_address) {
    return new Response(JSON.stringify({
      success: false,
      error: 'wallet_address required'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }

  // Get reward balance from view
  const { data: balanceData, error } = await supabaseClient
    .from('member_reward_balances')
    .select('*')
    .eq('wallet_address', wallet_address)
    .single();

  if (error) {
    console.error('Balance fetch error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch balance'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }

  return new Response(JSON.stringify({
    success: true,
    data: balanceData || {
      wallet_address,
      pending_balance_usdc: 0,
      claimable_balance_usdc: 0,
      total_withdrawn_usdc: 0,
      pending_claims_count: 0,
      claimable_claims_count: 0,
      pending_claims_total_usdc: 0,
      claimable_claims_total_usdc: 0
    }
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// New functions for enhanced reward management

async function checkPendingRewards(req, supabaseClient) {
  const { wallet_address } = await req.json();

  if (!wallet_address) {
    return new Response(JSON.stringify({
      success: false,
      error: 'wallet_address required'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    // Get pending rewards with countdown timers
    const { data: pendingRewards, error } = await supabaseClient
      .from('reward_claims')
      .select(`
        *,
        countdown_timers (
          id,
          timer_type,
          title,
          ends_at,
          status,
          auto_action
        )
      `)
      .eq('root_wallet', wallet_address)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate time remaining for each pending reward
    const enrichedRewards = (pendingRewards || []).map(reward => {
      const timer = reward.countdown_timers?.[0];
      let timeRemaining = null;
      let canUpgrade = false;

      if (timer) {
        const now = new Date();
        const endTime = new Date(timer.ends_at);
        const remainingMs = endTime.getTime() - now.getTime();
        
        if (remainingMs > 0) {
          timeRemaining = {
            hours: Math.floor(remainingMs / (1000 * 60 * 60)),
            minutes: Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)),
            total_hours: remainingMs / (1000 * 60 * 60)
          };
        } else {
          // Timer expired - should be processed
          canUpgrade = true;
        }
      }

      return {
        ...reward,
        time_remaining: timeRemaining,
        can_upgrade: canUpgrade,
        is_expired: timeRemaining === null && timer
      };
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        pending_rewards: enrichedRewards,
        total_pending: enrichedRewards.length,
        expired_count: enrichedRewards.filter(r => r.is_expired).length,
        upgrade_ready_count: enrichedRewards.filter(r => r.can_upgrade).length
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Check pending rewards error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to check pending rewards',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

async function processExpiredRewards(req, supabaseClient) {
  try {
    // Process expired rewards using the stored procedure
    const { data: processResult, error } = await supabaseClient.rpc('process_expired_rewards');

    if (error) {
      throw error;
    }

    console.log('✅ Expired rewards processed:', processResult);

    return new Response(JSON.stringify({
      success: true,
      message: 'Expired rewards processed successfully',
      data: processResult
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Process expired rewards error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process expired rewards',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

async function getRewardTimers(req, supabaseClient) {
  const { wallet_address, timer_type } = await req.json();

  if (!wallet_address) {
    return new Response(JSON.stringify({
      success: false,
      error: 'wallet_address required'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    let query = supabaseClient
      .from('countdown_timers')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (timer_type) {
      query = query.eq('timer_type', timer_type);
    }

    const { data: timers, error } = await query;

    if (error) {
      throw error;
    }

    // Enrich timers with remaining time calculation
    const enrichedTimers = (timers || []).map(timer => {
      const now = new Date();
      const endTime = new Date(timer.ends_at);
      const remainingMs = endTime.getTime() - now.getTime();
      
      return {
        ...timer,
        time_remaining: remainingMs > 0 ? {
          total_ms: remainingMs,
          hours: Math.floor(remainingMs / (1000 * 60 * 60)),
          minutes: Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((remainingMs % (1000 * 60)) / 1000)
        } : null,
        is_expired: remainingMs <= 0
      };
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        timers: enrichedTimers,
        active_count: enrichedTimers.filter(t => !t.is_expired).length,
        expired_count: enrichedTimers.filter(t => t.is_expired).length
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get reward timers error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch reward timers',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

async function updateRewardStatus(req, supabaseClient) {
  const { wallet_address, claim_id, new_status, admin_override } = await req.json();

  if (!wallet_address || !claim_id || !new_status) {
    return new Response(JSON.stringify({
      success: false,
      error: 'wallet_address, claim_id, and new_status required'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    // Verify the reward claim exists and belongs to the user (unless admin override)
    const { data: existingClaim, error: fetchError } = await supabaseClient
      .from('reward_claims')
      .select('*')
      .eq('id', claim_id)
      .single();

    if (fetchError || !existingClaim) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Reward claim not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Check authorization (either owner or admin)
    let isAuthorized = existingClaim.root_wallet === wallet_address;
    
    if (!isAuthorized && admin_override) {
      // Check if user is admin
      const { data: adminCheck } = await supabaseClient.rpc('is_admin', {
        p_wallet_address: wallet_address
      });
      isAuthorized = adminCheck?.is_admin || false;
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized to update this reward claim'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['claimable', 'expired', 'rolled_up'],
      'claimable': ['claimed', 'expired'],
      'claimed': [], // Final state
      'expired': ['rolled_up'], // Can be rolled up to upline
      'rolled_up': [] // Final state
    };

    if (!validTransitions[existingClaim.status]?.includes(new_status)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid status transition from ${existingClaim.status} to ${new_status}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Update the reward status
    const updateData = {
      status: new_status,
      updated_at: new Date().toISOString()
    };

    // Add specific fields based on new status
    if (new_status === 'claimed') {
      updateData.claimed_at = new Date().toISOString();
    } else if (new_status === 'expired') {
      updateData.expired_at = new Date().toISOString();
    } else if (new_status === 'claimable') {
      updateData.claimable_at = new Date().toISOString();
    }

    const { data: updatedClaim, error: updateError } = await supabaseClient
      .from('reward_claims')
      .update(updateData)
      .eq('id', claim_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log(`Reward claim ${claim_id} status updated from ${existingClaim.status} to ${new_status}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Reward status updated to ${new_status}`,
      data: updatedClaim
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Update reward status error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update reward status',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}
