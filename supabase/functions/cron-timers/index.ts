// Beehive Platform - Cron Timer Management Edge Function
// Handles automated countdown timers, expired rewards, and roll-up processing
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify cron secret to ensure only authorized cron jobs can execute
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET_KEY');
    
    if (!cronSecret || cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized - Invalid cron secret'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'process-all-timers';

    console.log(`🕐 Cron timer execution started: ${action}`);

    switch (action) {
      case 'process-expired-rewards':
        return await processExpiredRewards(supabaseClient);
      case 'update-reward-timers':
        return await updateRewardTimers(supabaseClient);
      case 'process-pending-rollups':
        return await processPendingRollups(supabaseClient);
      case 'cleanup-old-timers':
        return await cleanupOldTimers(supabaseClient);
      case 'process-all-timers':
        return await processAllTimers(supabaseClient);
      case 'health-check':
        return await healthCheck(supabaseClient);
      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Unknown action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('❌ Cron timer error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Process all expired rewards and convert them to roll-up status
 */
async function processExpiredRewards(supabaseClient: any) {
  console.log('🔄 Processing expired rewards...');
  
  try {
    // Get all pending rewards that have expired (72 hours past creation)
    const { data: expiredRewards, error: expiredError } = await supabaseClient
      .from('reward_claims')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

    if (expiredError) throw expiredError;

    console.log(`⏰ Found ${expiredRewards?.length || 0} expired rewards to process`);

    if (!expiredRewards || expiredRewards.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No expired rewards to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processedCount = 0;
    let rollupCount = 0;
    const errors: any[] = [];

    // Process each expired reward
    for (const reward of expiredRewards) {
      try {
        console.log(`🔄 Processing expired reward: ${reward.id} for wallet: ${reward.root_wallet}`);
        
        // Use the stored procedure to handle rollup logic
        const { data: rollupResult, error: rollupError } = await supabaseClient.rpc(
          'process_reward_rollup',
          {
            p_claim_id: reward.id,
            p_reason: '72_hour_expiry'
          }
        );

        if (rollupError) {
          console.error(`❌ Rollup failed for reward ${reward.id}:`, rollupError);
          errors.push({ reward_id: reward.id, error: rollupError.message });
          continue;
        }

        if (rollupResult?.success) {
          processedCount++;
          if (rollupResult.rolled_up) {
            rollupCount++;
            console.log(`✅ Reward ${reward.id} rolled up to ${rollupResult.new_root_wallet}`);
          } else {
            console.log(`✅ Reward ${reward.id} marked as expired`);
          }

          // Create notification for the original root member
          await createRewardNotification(supabaseClient, {
            wallet_address: reward.root_wallet,
            type: 'reward_expired',
            title: 'Reward Expired',
            message: `Your ${reward.layer} layer reward of ${reward.reward_amount_usdc} USDT expired after 72 hours.`,
            metadata: {
              claim_id: reward.id,
              layer: reward.layer,
              amount: reward.reward_amount_usdc,
              rolled_up: rollupResult.rolled_up,
              new_root: rollupResult.new_root_wallet
            }
          });

          // If rolled up, notify the new recipient
          if (rollupResult.rolled_up && rollupResult.new_root_wallet) {
            await createRewardNotification(supabaseClient, {
              wallet_address: rollupResult.new_root_wallet,
              type: 'reward_received',
              title: 'Reward Rolled Up to You',
              message: `You received a rolled-up ${reward.layer} layer reward of ${reward.reward_amount_usdc} USDT.`,
              metadata: {
                claim_id: reward.id,
                layer: reward.layer,
                amount: reward.reward_amount_usdc,
                original_root: reward.root_wallet
              }
            });
          }
        }
      } catch (rewardError) {
        console.error(`❌ Failed to process reward ${reward.id}:`, rewardError);
        errors.push({ reward_id: reward.id, error: rewardError.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} expired rewards`,
      data: {
        total_expired: expiredRewards.length,
        processed: processedCount,
        rolled_up: rollupCount,
        errors: errors.length,
        error_details: errors
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Process expired rewards error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process expired rewards',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Update all active countdown timers
 */
async function updateRewardTimers(supabaseClient: any) {
  console.log('🔄 Updating reward timers...');

  try {
    // Get all active timers
    const { data: activeTimers, error: timersError } = await supabaseClient
      .from('countdown_timers')
      .select('*')
      .eq('status', 'active');

    if (timersError) throw timersError;

    console.log(`⏰ Found ${activeTimers?.length || 0} active timers to update`);

    if (!activeTimers || activeTimers.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No active timers to update',
        updated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let expiredCount = 0;
    const now = new Date();

    // Check each timer for expiration
    for (const timer of activeTimers) {
      const endTime = new Date(timer.ends_at);
      
      if (now >= endTime) {
        // Timer expired - update status and trigger auto action if configured
        const { error: updateError } = await supabaseClient
          .from('countdown_timers')
          .update({
            status: 'expired',
            expired_at: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', timer.id);

        if (updateError) {
          console.error(`❌ Failed to update expired timer ${timer.id}:`, updateError);
          continue;
        }

        expiredCount++;
        console.log(`⏰ Timer ${timer.id} marked as expired`);

        // Execute auto action if configured
        if (timer.auto_action) {
          try {
            await executeTimerAutoAction(supabaseClient, timer);
          } catch (actionError) {
            console.error(`❌ Auto action failed for timer ${timer.id}:`, actionError);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Updated ${activeTimers.length} timers, ${expiredCount} expired`,
      data: {
        total_checked: activeTimers.length,
        expired: expiredCount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Update timers error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update timers',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Process pending rollups that need to be executed
 */
async function processPendingRollups(supabaseClient: any) {
  console.log('🔄 Processing pending rollups...');

  try {
    // Get rewards marked for rollup
    const { data: rollupRewards, error: rollupError } = await supabaseClient
      .from('reward_claims')
      .select('*')
      .eq('status', 'pending_rollup');

    if (rollupError) throw rollupError;

    if (!rollupRewards || rollupRewards.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending rollups to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processedCount = 0;

    for (const reward of rollupRewards) {
      try {
        const { data: rollupResult, error: processError } = await supabaseClient.rpc(
          'execute_reward_rollup',
          { p_claim_id: reward.id }
        );

        if (processError) {
          console.error(`❌ Rollup execution failed for ${reward.id}:`, processError);
          continue;
        }

        if (rollupResult?.success) {
          processedCount++;
          console.log(`✅ Rollup executed for reward ${reward.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to process rollup ${reward.id}:`, error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} pending rollups`,
      data: { processed: processedCount }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Process rollups error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process rollups',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Cleanup old expired timers and notifications
 */
async function cleanupOldTimers(supabaseClient: any) {
  console.log('🧹 Cleaning up old timers...');

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Delete old expired timers (older than 7 days)
    const { error: cleanupError } = await supabaseClient
      .from('countdown_timers')
      .delete()
      .eq('status', 'expired')
      .lt('expired_at', sevenDaysAgo);

    if (cleanupError) throw cleanupError;

    // Clean up old read notifications (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { error: notificationCleanupError } = await supabaseClient
      .from('reward_notifications')
      .delete()
      .eq('is_read', true)
      .lt('created_at', thirtyDaysAgo);

    if (notificationCleanupError) {
      console.warn('⚠️ Notification cleanup warning:', notificationCleanupError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Cleanup completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Cleanup failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Process all timer-related tasks in sequence
 */
async function processAllTimers(supabaseClient: any) {
  console.log('🔄 Processing all timer tasks...');

  const results = {
    rewards_processed: 0,
    timers_updated: 0,
    rollups_processed: 0,
    cleanup_completed: false,
    errors: [] as any[]
  };

  // 1. Process expired rewards
  try {
    const rewardsResponse = await processExpiredRewards(supabaseClient);
    const rewardsData = await rewardsResponse.json();
    if (rewardsData.success) {
      results.rewards_processed = rewardsData.data?.processed || 0;
    } else {
      results.errors.push({ task: 'expired_rewards', error: rewardsData.error });
    }
  } catch (error) {
    results.errors.push({ task: 'expired_rewards', error: error.message });
  }

  // 2. Update reward timers
  try {
    const timersResponse = await updateRewardTimers(supabaseClient);
    const timersData = await timersResponse.json();
    if (timersData.success) {
      results.timers_updated = timersData.data?.expired || 0;
    } else {
      results.errors.push({ task: 'update_timers', error: timersData.error });
    }
  } catch (error) {
    results.errors.push({ task: 'update_timers', error: error.message });
  }

  // 3. Process pending rollups
  try {
    const rollupsResponse = await processPendingRollups(supabaseClient);
    const rollupsData = await rollupsResponse.json();
    if (rollupsData.success) {
      results.rollups_processed = rollupsData.data?.processed || 0;
    } else {
      results.errors.push({ task: 'pending_rollups', error: rollupsData.error });
    }
  } catch (error) {
    results.errors.push({ task: 'pending_rollups', error: error.message });
  }

  // 4. Cleanup old data
  try {
    const cleanupResponse = await cleanupOldTimers(supabaseClient);
    const cleanupData = await cleanupResponse.json();
    results.cleanup_completed = cleanupData.success;
    if (!cleanupData.success) {
      results.errors.push({ task: 'cleanup', error: cleanupData.error });
    }
  } catch (error) {
    results.errors.push({ task: 'cleanup', error: error.message });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'All timer tasks processed',
    data: results,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Health check endpoint
 */
async function healthCheck(supabaseClient: any) {
  try {
    // Basic database connectivity test
    const { data, error } = await supabaseClient
      .from('users')
      .select('count(*)', { count: 'exact', head: true });

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      message: 'Cron timer service is healthy',
      timestamp: new Date().toISOString(),
      database_connected: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
      database_connected: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Helper function to execute timer auto actions
 */
async function executeTimerAutoAction(supabaseClient: any, timer: any) {
  if (!timer.auto_action) return;

  try {
    switch (timer.auto_action) {
      case 'expire_reward':
        if (timer.metadata?.claim_id) {
          await supabaseClient.rpc('process_reward_rollup', {
            p_claim_id: timer.metadata.claim_id,
            p_reason: 'timer_expired'
          });
        }
        break;
      
      case 'send_notification':
        if (timer.wallet_address) {
          await createRewardNotification(supabaseClient, {
            wallet_address: timer.wallet_address,
            type: 'timer_expired',
            title: 'Timer Expired',
            message: timer.auto_action_message || 'Your countdown timer has expired.',
            metadata: timer.metadata
          });
        }
        break;
      
      default:
        console.warn(`⚠️ Unknown auto action: ${timer.auto_action}`);
    }
  } catch (error) {
    console.error(`❌ Auto action execution failed for timer ${timer.id}:`, error);
  }
}

/**
 * Helper function to create reward notifications
 */
async function createRewardNotification(supabaseClient: any, notification: {
  wallet_address: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}) {
  try {
    const { error } = await supabaseClient
      .from('reward_notifications')
      .insert({
        wallet_address: notification.wallet_address,
        notification_type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Failed to create notification:', error);
    }
  } catch (error) {
    console.error('❌ Notification creation error:', error);
  }
}