import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const walletAddress = url.pathname.split('/').pop()

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'GET') {
      // Get all rewards for the user
      const { data: rewards, error: rewardsError } = await supabaseClient
        .from('layer_rewards')
        .select(`
          id,
          reward_amount,
          status,
          created_at,
          expires_at,
          claimed_at,
          matrix_layer,
          layer_position,
          triggering_member_wallet,
          triggering_nft_level,
          roll_up_reason,
          recipient_current_level,
          recipient_required_level,
          requires_direct_referrals,
          direct_referrals_current,
          direct_referrals_required
        `)
        .eq('reward_recipient_wallet', walletAddress)
        .order('created_at', { ascending: false })

      if (rewardsError) {
        console.error('Rewards query error:', rewardsError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch rewards' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get user balance
      const { data: balance } = await supabaseClient
        .from('user_balances')
        .select('reward_balance, total_earned, total_withdrawn, available_balance')
        .eq('wallet_address', walletAddress)
        .single()

      // Categorize rewards
      const claimableRewards = rewards?.filter(r => r.status === 'claimable') || []
      const pendingRewards = rewards?.filter(r => r.status === 'pending') || []
      const claimedRewards = rewards?.filter(r => r.status === 'claimed') || []
      const expiredRewards = rewards?.filter(r => r.status === 'expired' || r.status === 'rolled_up') || []

      // Calculate totals
      const totalClaimable = claimableRewards.reduce((sum, r) => sum + r.reward_amount, 0)
      const totalPending = pendingRewards.reduce((sum, r) => sum + r.reward_amount, 0)
      const totalClaimed = claimedRewards.reduce((sum, r) => sum + r.reward_amount, 0)

      // Check for expired rewards that should be processed
      const now = new Date()
      const expiredPendingRewards = pendingRewards.filter(r => 
        r.expires_at && new Date(r.expires_at) < now
      )

      // Get reward timers for active rewards
      const activeRewardIds = [...claimableRewards, ...pendingRewards].map(r => r.id)
      const { data: timers } = await supabaseClient
        .from('reward_timers')
        .select('*')
        .in('reward_id', activeRewardIds)

      const response = {
        summary: {
          totalClaimable: totalClaimable,
          totalPending: totalPending,
          totalClaimed: totalClaimed,
          claimableCount: claimableRewards.length,
          pendingCount: pendingRewards.length,
          claimedCount: claimedRewards.length,
          expiredCount: expiredRewards.length,
        },
        balance: {
          rewardBalance: balance?.reward_balance || 0,
          totalEarned: balance?.total_earned || 0,
          totalWithdrawn: balance?.total_withdrawn || 0,
          availableBalance: balance?.available_balance || 0,
        },
        rewards: {
          claimable: claimableRewards.map(r => ({
            ...r,
            timeRemaining: null, // Already claimable
            canClaim: true,
          })),
          pending: pendingRewards.map(r => {
            const timer = timers?.find(t => t.reward_id === r.id)
            const expiresAt = r.expires_at ? new Date(r.expires_at) : null
            const canClaim = expiresAt ? expiresAt <= now : false
            
            return {
              ...r,
              timeRemaining: expiresAt && !canClaim ? expiresAt.getTime() - now.getTime() : 0,
              canClaim,
              timer: timer || null,
            }
          }),
          claimed: claimedRewards.slice(0, 10), // Latest 10 claimed rewards
          expired: expiredRewards,
        },
        needsProcessing: expiredPendingRewards.length > 0,
        lastUpdated: new Date().toISOString(),
      }

      return new Response(
        JSON.stringify(response),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Rewards status function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})