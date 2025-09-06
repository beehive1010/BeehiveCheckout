// Beehive Platform - Rewards Management Edge Function
// Handles reward claims, processing, and management

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    switch (action) {
      case 'get-claims':
        return await getRewardClaims(req, supabaseClient)
      case 'claim-reward':
        return await claimReward(req, supabaseClient)
      case 'get-notifications':
        return await getRewardNotifications(req, supabaseClient)
      case 'withdraw-balance':
        return await withdrawRewardBalance(req, supabaseClient)
      case 'get-balance':
        return await getRewardBalance(req, supabaseClient)
      case 'maintenance':
        return await runMaintenance(req, supabaseClient)
      case 'dashboard':
        return await getRewardDashboard(req, supabaseClient)
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }

  } catch (error) {
    console.error('Rewards function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function getRewardClaims(req: Request, supabaseClient: any) {
  const { wallet_address, status, layer } = await req.json()

  if (!wallet_address) {
    return new Response(
      JSON.stringify({ success: false, error: 'wallet_address required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  let query = supabaseClient
    .from('reward_claims_dashboard')
    .select('*')
    .eq('root_wallet', wallet_address)

  if (status) {
    query = query.eq('status', status)
  }

  if (layer) {
    query = query.eq('layer', layer)
  }

  const { data: claims, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Get claims error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch claims' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: claims
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function claimReward(req: Request, supabaseClient: any) {
  const { claim_id, wallet_address } = await req.json()

  if (!claim_id || !wallet_address) {
    return new Response(
      JSON.stringify({ success: false, error: 'claim_id and wallet_address required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  // Verify claim ownership
  const { data: claim, error: claimError } = await supabaseClient
    .from('reward_claims')
    .select('*')
    .eq('id', claim_id)
    .eq('root_wallet', wallet_address)
    .single()

  if (claimError || !claim) {
    return new Response(
      JSON.stringify({ success: false, error: 'Claim not found or access denied' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    )
  }

  if (claim.status !== 'claimable') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Claim is ${claim.status}, cannot be claimed` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  // Process the claim using new balance system
  try {
    // Use new claim_reward_to_balance function (handles status update and balance internally)
    const { data: claimResult, error: balanceError } = await supabaseClient
      .rpc('claim_reward_to_balance', {
        p_claim_id: claim_id,
        p_wallet_address: wallet_address
      })

    if (balanceError || !claimResult?.success) {
      throw new Error(claimResult?.error || balanceError?.message || 'Claim processing failed')
    }

    console.log(`Reward claimed successfully: ${claim_id} for ${wallet_address}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reward claimed successfully',
        data: {
          claim_id: claim_id,
          amount_usdc: claim.reward_amount_usdc,
          layer: claim.layer,
          nft_level: claim.nft_level
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Claim processing error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to process claim',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

async function runMaintenance(req: Request, supabaseClient: any) {
  // Run reward system maintenance (expired rewards, rollups, etc.)
  const { data: maintenanceResult, error } = await supabaseClient
    .rpc('process_reward_system_maintenance')

  if (error) {
    console.error('Maintenance error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Maintenance failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Maintenance completed',
      data: maintenanceResult
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getRewardDashboard(req: Request, supabaseClient: any) {
  const { wallet_address } = await req.json()

  if (!wallet_address) {
    return new Response(
      JSON.stringify({ success: false, error: 'wallet_address required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  // Get reward claims summary
  const { data: claimsSummary, error: claimsError } = await supabaseClient
    .from('reward_claims')
    .select('status, layer, reward_amount_usdc')
    .eq('root_wallet', wallet_address)

  if (claimsError) {
    console.error('Dashboard claims error:', claimsError)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch dashboard data' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  // Get member requirements
  const { data: requirements, error: reqError } = await supabaseClient
    .from('member_requirements_view')
    .select('*')
    .eq('wallet_address', wallet_address)
    .single()

  if (reqError) {
    console.error('Dashboard requirements error:', reqError)
  }

  // Calculate summary statistics
  const totalClaimed = claimsSummary
    .filter((c: any) => c.status === 'claimed')
    .reduce((sum: number, c: any) => sum + parseFloat(c.reward_amount_usdc), 0)

  const totalPending = claimsSummary
    .filter((c: any) => c.status === 'pending')
    .reduce((sum: number, c: any) => sum + parseFloat(c.reward_amount_usdc), 0)

  const totalClaimable = claimsSummary
    .filter((c: any) => c.status === 'claimable')
    .reduce((sum: number, c: any) => sum + parseFloat(c.reward_amount_usdc), 0)

  return new Response(
    JSON.stringify({
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
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getRewardNotifications(req: Request, supabaseClient: any) {
  const { wallet_address, is_read, limit = 50 } = await req.json()

  if (!wallet_address) {
    return new Response(
      JSON.stringify({ success: false, error: 'wallet_address required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  let query = supabaseClient
    .from('reward_notifications')
    .select('*')
    .eq('wallet_address', wallet_address)

  if (typeof is_read === 'boolean') {
    query = query.eq('is_read', is_read)
  }

  const { data: notifications, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Get notifications error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch notifications' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: notifications,
      unread_count: notifications.filter((n: any) => !n.is_read).length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function withdrawRewardBalance(req: Request, supabaseClient: any) {
  const { wallet_address, amount_usdc, withdrawal_address } = await req.json()

  if (!wallet_address || !amount_usdc) {
    return new Response(
      JSON.stringify({ success: false, error: 'wallet_address and amount_usdc required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  // Process withdrawal using database function
  const { data: withdrawalResult, error } = await supabaseClient
    .rpc('withdraw_reward_balance', {
      p_wallet_address: wallet_address,
      p_amount_usdc: amount_usdc,
      p_withdrawal_address: withdrawal_address
    })

  if (error || !withdrawalResult?.success) {
    console.error('Withdrawal error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: withdrawalResult?.error || 'Withdrawal failed',
        details: error?.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  console.log(`Withdrawal processed: ${amount_usdc} USDC for ${wallet_address}`)

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Withdrawal processed successfully',
      data: withdrawalResult
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getRewardBalance(req: Request, supabaseClient: any) {
  const { wallet_address } = await req.json()

  if (!wallet_address) {
    return new Response(
      JSON.stringify({ success: false, error: 'wallet_address required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  // Get reward balance from view
  const { data: balanceData, error } = await supabaseClient
    .from('member_reward_balances')
    .select('*')
    .eq('wallet_address', wallet_address)
    .single()

  if (error) {
    console.error('Balance fetch error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch balance' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  return new Response(
    JSON.stringify({
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
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}