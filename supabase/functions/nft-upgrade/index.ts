// Beehive Platform - NFT Upgrade Edge Function
// Processes NFT level upgrades with correct reward system

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

    const { wallet_address, nft_level, payment_amount_usdc, transaction_hash } = await req.json()

    // Validate inputs
    if (!wallet_address || !nft_level || !payment_amount_usdc || !transaction_hash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Process NFT purchase with requirements check and notifications
    const { data: purchaseResult, error: purchaseError } = await supabaseClient
      .rpc('process_nft_purchase_with_requirements', {
        p_wallet_address: wallet_address,
        p_nft_level: nft_level,
        p_payment_amount_usdc: payment_amount_usdc,
        p_transaction_hash: transaction_hash
      })

    if (purchaseError) {
      console.error('Purchase processing error:', purchaseError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to process NFT purchase',
          details: purchaseError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!purchaseResult.success) {
      return new Response(
        JSON.stringify(purchaseResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Log successful purchase
    console.log(`NFT Level ${nft_level} purchase successful:`, {
      wallet_address,
      payment_amount_usdc,
      transaction_hash,
      layer_rewards_created: purchaseResult.layer_rewards_created
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