import {serve} from "https://deno.land/std@0.168.0/http/server.ts"
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2'

// Simple logger replacement
class EdgeFunctionLogger {
  constructor(private supabase: any, private functionName: string) {}
  async logInfo(action: string, category: string, data: any) {
    console.log(`[${this.functionName}] ${action}:`, data);
  }
  async logError(action: string, category: string, error: any, data?: any) {
    console.error(`[${this.functionName}] ${action}:`, error, data);
  }
}

class PerformanceTimer {
  private startTime: number;
  constructor(private operation: string, private logger: EdgeFunctionLogger) {
    this.startTime = Date.now();
  }
  async end() {
    const duration = Date.now() - this.startTime;
    console.log(`[Timer] ${this.operation}: ${duration}ms`);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('🏆 Rewards-claim function started successfully!')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  let logger: EdgeFunctionLogger
  let timer: PerformanceTimer

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Initialize logger
    logger = new EdgeFunctionLogger(supabaseClient, 'rewards-claim')
    timer = new PerformanceTimer('rewards-claim-request', logger)

    const { walletAddress, rewardId } = await req.json()
    
    console.log(`🏆 Reward claim request: wallet=${walletAddress}, rewardId=${rewardId}`)
    
    await logger.logInfo('claim-request-started', 'layer_rewards', { 
      walletAddress, 
      rewardId 
    })

    if (!walletAddress || !rewardId) {
      await logger.logValidationError('invalid-claim-request', 'Missing wallet address or reward ID', { walletAddress, rewardId })
      
      return new Response(
        JSON.stringify({ error: 'Wallet address and reward ID required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the reward to verify it's claimable
    console.log(`🔍 Fetching reward: ID=${rewardId} for wallet=${walletAddress}`)
    
    const { data: reward, error: rewardError } = await supabaseClient
      .from('layer_rewards')
      .select('*')
      .eq('id', rewardId)
      .eq('reward_recipient_wallet', walletAddress)
      .single()

    if (rewardError || !reward) {
      console.error('❌ Reward not found:', rewardError)
      await logger.logError('reward-not-found', 'layer_rewards', rewardError || 'Reward not found', 'REWARD_NOT_FOUND', { 
        rewardId, 
        walletAddress 
      })
      
      return new Response(
        JSON.stringify({ error: 'Reward not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log(`✅ Reward found: ${reward.reward_amount} for layer ${reward.matrix_layer} position ${reward.layer_position}`)
    
    await logger.logInfo('reward-found', 'layer_rewards', {
      rewardId: reward.id,
      amount: reward.reward_amount,
      layer: reward.matrix_layer,
      position: reward.layer_position,
      status: reward.status
    })

    if (reward.status !== 'claimable') {
      console.log(`❌ Reward not claimable: status=${reward.status}`)
      await logger.logWarning('reward-not-claimable', 'layer_rewards', `Reward status is ${reward.status}, expected claimable`, {
        rewardId: reward.id,
        currentStatus: reward.status,
        expiresAt: reward.expires_at
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Reward not claimable',
          currentStatus: reward.status,
          expiresAt: reward.expires_at,
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (reward.claimed_at) {
      console.log(`❌ Reward already claimed at: ${reward.claimed_at}`)
      await logger.logWarning('reward-already-claimed', 'layer_rewards', 'Reward already claimed', {
        rewardId: reward.id,
        claimedAt: reward.claimed_at
      })
      
      return new Response(
        JSON.stringify({ error: 'Reward already claimed' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if reward has expired
    if (reward.expires_at && new Date(reward.expires_at) < new Date()) {
      console.log(`❌ Reward has expired: ${reward.expires_at}`)
      await logger.logWarning('reward-expired', 'layer_rewards', 'Reward has expired', {
        rewardId: reward.id,
        expiresAt: reward.expires_at,
        currentTime: new Date().toISOString()
      })
      
      return new Response(
        JSON.stringify({ error: 'Reward has expired' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log(`✅ Reward validation passed, proceeding to claim`)

    // Update reward status to claimed
    console.log(`🔄 Updating reward status to claimed: ID=${rewardId}`)
    
    const { error: updateRewardError } = await supabaseClient
      .from('layer_rewards')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', rewardId)

    if (updateRewardError) {
      console.error('❌ Update reward error:', updateRewardError)
      await logger.logDatabaseError('reward-status-update-failed', updateRewardError, { rewardId })
      
      return new Response(
        JSON.stringify({ error: 'Failed to update reward status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log(`✅ Reward status updated to claimed`)
    await logger.logInfo('reward-status-updated', 'layer_rewards', { rewardId, status: 'claimed' })

    // Update user balance
    console.log(`💰 Fetching current balance for wallet: ${walletAddress}`)
    
    const { data: currentBalance, error: balanceError } = await supabaseClient
      .from('user_balances')
      .select('reward_balance, total_earned, available_balance')
      .eq('wallet_address', walletAddress)
      .maybeSingle()

    if (balanceError) {
      console.error('❌ Balance query error:', balanceError)
      await logger.logDatabaseError('balance-query-failed', balanceError, { walletAddress })
      // Continue even if balance query fails - we'll create a record
    }
    
    console.log(`💰 Current balance: reward=${currentBalance?.reward_balance || 0}, total=${currentBalance?.total_earned || 0}, available=${currentBalance?.available_balance || 0}`)

    const newRewardBalance = (currentBalance?.reward_balance || 0) + reward.reward_amount
    const newTotalEarned = (currentBalance?.total_earned || 0) + reward.reward_amount
    const newAvailableBalance = (currentBalance?.available_balance || 0) + reward.reward_amount
    
    console.log(`💰 Updating balance: reward=${newRewardBalance}, total=${newTotalEarned}, available=${newAvailableBalance}`)

    const { error: updateBalanceError } = await supabaseClient
      .from('user_balances')
      .upsert({
        wallet_address: walletAddress,
        reward_balance: newRewardBalance,
        total_earned: newTotalEarned,
        available_balance: newAvailableBalance,
        last_updated: new Date().toISOString(),
      })

    if (updateBalanceError) {
      console.error('❌ Balance update error:', updateBalanceError)
      await logger.logDatabaseError('balance-update-failed', updateBalanceError, { 
        walletAddress, 
        newRewardBalance, 
        newTotalEarned, 
        newAvailableBalance 
      })
      
      console.log(`🔄 Rolling back reward status to claimable`)
      // Rollback reward status
      await supabaseClient
        .from('layer_rewards')
        .update({
          status: 'claimable',
          claimed_at: null,
        })
        .eq('id', rewardId)
      
      await logger.logWarning('reward-rollback-executed', 'layer_rewards', 'Balance update failed, rolled back reward status', { rewardId })
      
      return new Response(
        JSON.stringify({ error: 'Failed to update balance' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log(`✅ Balance updated successfully`)
    await logger.logInfo('balance-updated', 'wallet_operations', {
      walletAddress,
      rewardAmount: reward.reward_amount,
      newRewardBalance,
      newTotalEarned,
      newAvailableBalance
    })

    // Log final success and complete performance timer
    const responseData = {
      success: true,
      claimedReward: {
        id: reward.id,
        amount: reward.reward_amount,
        layer: reward.matrix_layer,
        position: reward.layer_position,
        claimedAt: new Date().toISOString(),
      },
      updatedBalance: {
        rewardBalance: newRewardBalance,
        totalEarned: newTotalEarned,
        availableBalance: newAvailableBalance,
      },
      message: `Successfully claimed $${reward.reward_amount.toFixed(2)} reward`,
    }
    
    console.log(`🎉 Reward claim successful: $${reward.reward_amount} claimed for ${walletAddress}`)
    
    // Complete performance timer and log final success
    await timer.end('layer_rewards', true, responseData)
    
    await logger.logSuccess('reward-claim-completed', 'layer_rewards', {
      walletAddress,
      rewardId: reward.id,
      amount: reward.reward_amount,
      layer: reward.matrix_layer,
      finalBalance: newAvailableBalance
    })

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Claim reward function error:', error)
    
    // Log critical error if logger is available
    if (logger) {
      await logger.logCritical('reward-claim-function-error', 'layer_rewards', error)
      
      // Complete timer with error if available
      if (timer) {
        await timer.end('layer_rewards', false, null, error)
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})