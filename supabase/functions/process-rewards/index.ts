import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

interface RewardProcessingRequest {
  action: 'claim_reward' | 'process_expired' | 'check_pending' | 'rollup_expired'
  rewardId?: string
  walletAddress?: string
  level?: number
}

interface RewardProcessingResponse {
  success: boolean
  action: string
  rewardsProcessed?: number
  rewardsRolledUp?: number
  rewardsExpired?: number
  claimedAmount?: number
  pendingRewards?: any[]
  message: string
  error?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, rewardId, walletAddress, level } = await req.json() as RewardProcessingRequest

    console.log(`<� Reward Processing Action: ${action}`)

    let response: RewardProcessingResponse

    switch (action) {
      case 'claim_reward':
        response = await claimReward(supabase, rewardId!, walletAddress!)
        break
      
      case 'process_expired':
        response = await processExpiredRewards(supabase)
        break
      
      case 'check_pending':
        response = await checkPendingRewards(supabase, walletAddress!)
        break
      
      case 'rollup_expired':
        response = await rollupExpiredRewards(supabase, walletAddress)
        break
      
      default:
        response = {
          success: false,
          action,
          message: 'Invalid action specified',
          error: 'Unknown action'
        }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Reward processing error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        action: 'error',
        error: error.message || 'Reward processing failed',
        message: 'Processing failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Claim a specific reward
async function claimReward(supabase: any, rewardId: string, walletAddress: string): Promise<RewardProcessingResponse> {
  console.log(`=� Claiming reward: ${rewardId} for ${walletAddress}`)

  try {
    // 1. Get reward details and verify ownership
    const { data: reward, error: rewardError } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('id', rewardId)
      .eq('root_wallet', walletAddress.toLowerCase())
      .eq('status', 'claimable')
      .single()

    if (rewardError || !reward) {
      return {
        success: false,
        action: 'claim_reward',
        message: 'Reward not found or not claimable',
        error: 'Invalid reward claim'
      }
    }

    // 2. Check if reward has expired
    const now = new Date()
    const expiresAt = new Date(reward.expires_at)
    
    if (now > expiresAt) {
      // Process expiry and potential rollup
      await processExpiredReward(supabase, reward)
      return {
        success: false,
        action: 'claim_reward',
        message: 'Reward has expired and been processed',
        error: 'Reward expired'
      }
    }

    // 3. Update user USDC balance
    await updateUserUSDCBalance(supabase, walletAddress, reward.reward_amount)

    // 4. Mark reward as claimed
    await supabase
      .from('layer_reward_claims')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString()
      })
      .eq('id', rewardId)

    // 5. Log the transaction
    await supabase
      .from('audit_logs')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        action: 'reward_claimed',
        details: {
          rewardId,
          amount: reward.reward_amount,
          nftLevel: reward.nft_level,
          triggeredBy: reward.triggered_by_wallet
        }
      })

    console.log(` Reward claimed successfully: ${reward.reward_amount} USDC`)

    return {
      success: true,
      action: 'claim_reward',
      claimedAmount: reward.reward_amount,
      message: `Successfully claimed ${reward.reward_amount} USDC reward`
    }

  } catch (error) {
    console.error('Claim reward error:', error)
    return {
      success: false,
      action: 'claim_reward',
      message: 'Failed to claim reward',
      error: error.message
    }
  }
}

// Process expired rewards and handle rollups
async function processExpiredRewards(supabase: any): Promise<RewardProcessingResponse> {
  console.log('� Processing expired rewards...')

  try {
    // Get all expired pending/claimable rewards
    const now = new Date().toISOString()
    const { data: expiredRewards, error } = await supabase
      .from('layer_reward_claims')
      .select('*')
      .in('status', ['pending', 'claimable'])
      .lt('expires_at', now)

    if (error) throw error

    if (!expiredRewards || expiredRewards.length === 0) {
      return {
        success: true,
        action: 'process_expired',
        rewardsProcessed: 0,
        message: 'No expired rewards to process'
      }
    }

    console.log(`=� Found ${expiredRewards.length} expired rewards`)

    let rewardsRolledUp = 0
    let rewardsExpired = 0

    for (const reward of expiredRewards) {
      const result = await processExpiredReward(supabase, reward)
      if (result.rolledUp) {
        rewardsRolledUp++
      } else {
        rewardsExpired++
      }
    }

    return {
      success: true,
      action: 'process_expired',
      rewardsProcessed: expiredRewards.length,
      rewardsRolledUp,
      rewardsExpired,
      message: `Processed ${expiredRewards.length} expired rewards: ${rewardsRolledUp} rolled up, ${rewardsExpired} forfeited`
    }

  } catch (error) {
    console.error('Process expired rewards error:', error)
    return {
      success: false,
      action: 'process_expired',
      message: 'Failed to process expired rewards',
      error: error.message
    }
  }
}

// Check pending rewards for a specific wallet
async function checkPendingRewards(supabase: any, walletAddress: string): Promise<RewardProcessingResponse> {
  console.log(`= Checking pending rewards for: ${walletAddress}`)

  try {
    // Get all pending rewards for the wallet
    const { data: pendingRewards, error } = await supabase
      .from('layer_reward_claims')
      .select(`
        *,
        triggered_by_wallet
      `)
      .eq('root_wallet', walletAddress.toLowerCase())
      .in('status', ['pending', 'claimable'])
      .order('created_at', { ascending: false })

    if (error) throw error

    // Check member's current level for pending reward eligibility
    const { data: memberData } = await supabase
      .from('members')
      .select('current_level, levels_owned')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()

    const currentLevel = memberData?.current_level || 0
    const levelsOwned = memberData?.levels_owned || []

    // Process each pending reward to check if it can be made claimable
    const processedRewards = []
    let newlyClaimable = 0

    for (const reward of pendingRewards || []) {
      const timeLeft = new Date(reward.expires_at).getTime() - new Date().getTime()
      const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))

      // Check if member now qualifies for this reward
      if (reward.status === 'pending' && currentLevel >= reward.nft_level) {
        // Upgrade reward to claimable
        await supabase
          .from('layer_reward_claims')
          .update({ status: 'claimable' })
          .eq('id', reward.id)

        reward.status = 'claimable'
        newlyClaimable++
      }

      processedRewards.push({
        ...reward,
        hoursLeft,
        isExpired: hoursLeft <= 0,
        canClaim: reward.status === 'claimable' && hoursLeft > 0
      })
    }

    return {
      success: true,
      action: 'check_pending',
      pendingRewards: processedRewards,
      message: `Found ${processedRewards.length} pending/claimable rewards${newlyClaimable > 0 ? `, ${newlyClaimable} newly claimable` : ''}`
    }

  } catch (error) {
    console.error('Check pending rewards error:', error)
    return {
      success: false,
      action: 'check_pending',
      message: 'Failed to check pending rewards',
      error: error.message
    }
  }
}

// Roll up expired rewards to next qualified upline
async function rollupExpiredRewards(supabase: any, walletAddress?: string): Promise<RewardProcessingResponse> {
  console.log('= Rolling up expired rewards...')

  try {
    const filter = walletAddress ? 
      supabase
        .from('layer_reward_claims')
        .select('*')
        .eq('root_wallet', walletAddress.toLowerCase())
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString()) :
      supabase
        .from('layer_reward_claims')
        .select('*')
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString())

    const { data: expiredRewards, error } = await filter

    if (error) throw error

    let rolledUp = 0
    let forfeited = 0

    for (const reward of expiredRewards || []) {
      const result = await processExpiredReward(supabase, reward)
      if (result.rolledUp) {
        rolledUp++
      } else {
        forfeited++
      }
    }

    return {
      success: true,
      action: 'rollup_expired',
      rewardsRolledUp: rolledUp,
      rewardsExpired: forfeited,
      message: `Rollup complete: ${rolledUp} rolled up, ${forfeited} forfeited`
    }

  } catch (error) {
    console.error('Rollup expired rewards error:', error)
    return {
      success: false,
      action: 'rollup_expired',
      message: 'Failed to rollup expired rewards',
      error: error.message
    }
  }
}

// Process a single expired reward (rollup or forfeit)
async function processExpiredReward(supabase: any, reward: any): Promise<{rolledUp: boolean}> {
  console.log(`� Processing expired reward: ${reward.id}`)

  try {
    // Find next qualified upline member
    const nextUpline = await findNextQualifiedUpline(supabase, reward.root_wallet, reward.nft_level)

    if (nextUpline) {
      console.log(`= Rolling up reward to: ${nextUpline}`)

      // Create new reward for the upline
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 72) // New 72-hour window

      await supabase
        .from('layer_reward_claims')
        .insert({
          root_wallet: nextUpline,
          triggered_by_wallet: reward.triggered_by_wallet,
          nft_level: reward.nft_level,
          reward_amount: reward.reward_amount,
          status: 'claimable', // Assume upline qualifies
          expires_at: expiresAt.toISOString(),
          rolled_up_from: reward.id
        })

      // Mark original as rolled up
      await supabase
        .from('layer_reward_claims')
        .update({
          status: 'rolled_up',
          rolled_up_to: nextUpline,
          processed_at: new Date().toISOString()
        })
        .eq('id', reward.id)

      // Log rollup
      await supabase
        .from('reward_rollups')
        .insert({
          original_root_wallet: reward.root_wallet,
          new_root_wallet: nextUpline,
          reward_amount: reward.reward_amount,
          nft_level: reward.nft_level,
          rollup_reason: 'expired_timeout',
          original_reward_id: reward.id
        })

      return { rolledUp: true }

    } else {
      console.log(`=� No qualified upline found, forfeiting reward`)

      // Mark as forfeited
      await supabase
        .from('layer_reward_claims')
        .update({
          status: 'forfeited',
          processed_at: new Date().toISOString()
        })
        .eq('id', reward.id)

      // Log forfeiture
      await supabase
        .from('reward_rollups')
        .insert({
          original_root_wallet: reward.root_wallet,
          new_root_wallet: null,
          reward_amount: reward.reward_amount,
          nft_level: reward.nft_level,
          rollup_reason: 'no_qualified_upline',
          original_reward_id: reward.id
        })

      return { rolledUp: false }
    }

  } catch (error) {
    console.error('Process expired reward error:', error)
    return { rolledUp: false }
  }
}

// Find next qualified upline member
async function findNextQualifiedUpline(supabase: any, currentRoot: string, requiredLevel: number): Promise<string | null> {
  console.log(`= Finding next qualified upline for ${currentRoot}, level ${requiredLevel}`)

  try {
    // Find the referrer of the current root
    const { data: referralData } = await supabase
      .from('referrals')
      .select('referrer_wallet, placement_root')
      .eq('referred_wallet', currentRoot)
      .single()

    if (!referralData?.referrer_wallet) {
      console.log('No referrer found')
      return null
    }

    let currentWallet = referralData.referrer_wallet

    // Traverse up the referral chain to find qualified member
    for (let depth = 0; depth < 10; depth++) { // Prevent infinite loops
      const { data: memberData } = await supabase
        .from('members')
        .select('current_level, wallet_address')
        .eq('wallet_address', currentWallet)
        .single()

      if (memberData && memberData.current_level >= requiredLevel) {
        console.log(` Found qualified upline: ${currentWallet} (Level ${memberData.current_level})`)
        return currentWallet
      }

      // Move up to next referrer
      const { data: nextReferral } = await supabase
        .from('referrals')
        .select('referrer_wallet')
        .eq('referred_wallet', currentWallet)
        .single()

      if (!nextReferral?.referrer_wallet) {
        break
      }

      currentWallet = nextReferral.referrer_wallet
    }

    console.log('No qualified upline found in chain')
    return null

  } catch (error) {
    console.error('Find qualified upline error:', error)
    return null
  }
}

// Update user USDC balance
async function updateUserUSDCBalance(supabase: any, walletAddress: string, amount: number): Promise<void> {
  console.log(`=� Adding ${amount} USDC to ${walletAddress}`)

  try {
    // Get current balance
    const { data: currentBalance } = await supabase
      .from('user_balances')
      .select('usdc_balance')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()

    const newBalance = (currentBalance?.usdc_balance || 0) + amount

    // Update balance
    await supabase
      .from('user_balances')
      .upsert({
        wallet_address: walletAddress.toLowerCase(),
        usdc_balance: newBalance,
        updated_at: new Date().toISOString()
      }, { onConflict: 'wallet_address' })

    console.log(` USDC balance updated: ${walletAddress} -> ${newBalance}`)

  } catch (error) {
    console.error('Update USDC balance error:', error)
    throw error
  }
}