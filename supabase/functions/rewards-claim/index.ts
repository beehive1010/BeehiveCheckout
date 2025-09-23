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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { walletAddress, rewardId } = await req.json()

    if (!walletAddress || !rewardId) {
      return new Response(
        JSON.stringify({ error: 'Wallet address and reward ID required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the reward to verify it's claimable
    const { data: reward, error: rewardError } = await supabaseClient
      .from('layer_rewards')
      .select('*')
      .eq('id', rewardId)
      .eq('reward_recipient_wallet', walletAddress)
      .single()

    if (rewardError || !reward) {
      return new Response(
        JSON.stringify({ error: 'Reward not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (reward.status !== 'claimable') {
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
      return new Response(
        JSON.stringify({ error: 'Reward has expired' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update reward status to claimed
    const { error: updateRewardError } = await supabaseClient
      .from('layer_rewards')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', rewardId)

    if (updateRewardError) {
      console.error('Update reward error:', updateRewardError)
      return new Response(
        JSON.stringify({ error: 'Failed to update reward status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update user balance
    const { data: currentBalance, error: balanceError } = await supabaseClient
      .from('user_balances')
      .select('reward_balance, total_earned, available_balance')
      .eq('wallet_address', walletAddress)
      .single()

    if (balanceError) {
      console.error('Balance query error:', balanceError)
      // Continue even if balance query fails - we'll create a record
    }

    const newRewardBalance = (currentBalance?.reward_balance || 0) + reward.reward_amount
    const newTotalEarned = (currentBalance?.total_earned || 0) + reward.reward_amount
    const newAvailableBalance = (currentBalance?.available_balance || 0) + reward.reward_amount

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
      console.error('Balance update error:', updateBalanceError)
      // Rollback reward status
      await supabaseClient
        .from('layer_rewards')
        .update({
          status: 'claimable',
          claimed_at: null,
        })
        .eq('id', rewardId)
      
      return new Response(
        JSON.stringify({ error: 'Failed to update balance' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({
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
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Claim reward function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})