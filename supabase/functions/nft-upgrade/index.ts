// Beehive Platform - NFT Upgrade Edge Function
// Handles NFT claiming, upgrading, and level management

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface NFTRequest {
  action: 'get-level-info' | 'check-eligibility' | 'process-upgrade' | 'get-upgrade-history' | 'process-nft-purchase';
  level?: number;
  paymentMethod?: string;
  transactionHash?: string;
  network?: string;
  limit?: number;
  offset?: number;
  // Legacy fields for backward compatibility
  wallet_address?: string;
  nft_level?: number;
  payment_amount_usdc?: number;
  transaction_hash?: string;
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

    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase()

    // Parse request body
    let requestData: NFTRequest = { action: 'get-level-info' }
    try {
      const body = await req.json()
      requestData = body
      
      // Handle legacy format
      if (body.wallet_address && body.nft_level && !body.action) {
        requestData = {
          action: 'process-nft-purchase',
          level: body.nft_level,
          transactionHash: body.transaction_hash,
          payment_amount_usdc: body.payment_amount_usdc,
          wallet_address: body.wallet_address
        }
      }
    } catch {
      // For GET requests, use query params
      const url = new URL(req.url)
      const action = url.searchParams.get('action') || 'get-level-info'
      requestData = { action: action as any }
    }

    const { action } = requestData

    switch (action) {
      case 'get-level-info':
        return await handleGetLevelInfo(supabase, requestData.level)
      
      case 'check-eligibility':
        return await handleCheckEligibility(supabase, walletAddress!, requestData.level!)
      
      case 'process-upgrade':
      case 'process-nft-purchase':
        return await handleProcessUpgrade(supabase, walletAddress || requestData.wallet_address!, requestData)
      
      case 'get-upgrade-history':
        return await handleGetUpgradeHistory(supabase, walletAddress!, requestData.limit, requestData.offset)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('NFT upgrade error:', error)
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

async function handleGetLevelInfo(supabase: any, level?: number) {
  try {
    let query = supabase
      .from('nft_levels')
      .select('*')
      .eq('is_active', true)
      .order('level', { ascending: true })

    if (level) {
      query = query.eq('level', level)
    }

    const { data: levels, error } = await query

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        data: level ? levels[0] : levels
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to get level info',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

async function handleCheckEligibility(supabase: any, walletAddress: string, level: number) {
  try {
    // Check user's current level and requirements
    const { data: memberData } = await supabase
      .from('members')
      .select('current_level, levels_owned, is_activated')
      .eq('wallet_address', walletAddress)
      .single()

    if (!memberData) {
      return new Response(
        JSON.stringify({
          success: true,
          eligible: true,
          reason: 'First NFT claim - eligible for Level 1',
          canClaim: level === 1
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check level requirements
    const { data: levelInfo } = await supabase
      .from('nft_levels')
      .select('*')
      .eq('level', level)
      .single()

    if (!levelInfo) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid level'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const hasLevel = memberData.levels_owned?.includes(level) || false
    const canUpgrade = level <= memberData.current_level + 1

    return new Response(
      JSON.stringify({
        success: true,
        eligible: !hasLevel && canUpgrade,
        hasLevel,
        currentLevel: memberData.current_level,
        targetLevel: level,
        levelInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to check eligibility',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

async function handleProcessUpgrade(supabase: any, walletAddress: string, data: any) {
  try {
    const level = data.level || data.nft_level
    const transactionHash = data.transactionHash || data.transaction_hash
    const paymentAmount = data.payment_amount_usdc || 0

    if (!level || !transactionHash) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: level and transactionHash' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create order record first using correct schema
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        wallet_address: walletAddress,
        item_id: `nft_level_${level}`, // Use item_id format
        order_type: 'nft_purchase',
        payment_method: data.paymentMethod || 'blockchain',
        amount_usdt: paymentAmount || 0,
        amount_bcc: null, // NFT purchases are in USDT
        transaction_hash: transactionHash,
        status: 'pending',
        metadata: {
          level: level,
          token_id: level,
          network: data.network || 'ethereum'
        }
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
    }

    // Process NFT purchase with the stored procedure
    const { data: purchaseResult, error: purchaseError } = await supabase
      .rpc('process_nft_purchase_with_requirements', {
        p_wallet_address: walletAddress,
        p_nft_level: level,
        p_payment_amount_usdc: paymentAmount,
        p_transaction_hash: transactionHash
      })

    if (purchaseError) {
      console.error('Purchase processing error:', purchaseError)
      
      // Update order status to failed
      if (orderData) {
        await supabase
          .from('orders')
          .update({ status: 'failed' })
          .eq('id', orderData.id)
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to process NFT purchase',
          details: purchaseError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!purchaseResult?.success) {
      // Update order status to failed
      if (orderData) {
        await supabase
          .from('orders')
          .update({ status: 'failed' })
          .eq('id', orderData.id)
      }
      
      return new Response(
        JSON.stringify(purchaseResult || { success: false, error: 'Purchase failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Update order status to completed
    if (orderData) {
      await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', orderData.id)
    }

    // Log successful purchase
    console.log(`NFT Level ${level} purchase successful:`, {
      walletAddress,
      level,
      transactionHash,
      result: purchaseResult
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'NFT upgrade processed successfully',
        data: purchaseResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process upgrade error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to process upgrade',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

async function handleGetUpgradeHistory(supabase: any, walletAddress: string, limit = 20, offset = 0) {
  try {
    const { data: history, error } = await supabase
      .from('orders')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        data: history || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to get upgrade history',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}