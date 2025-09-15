// NFT Purchase Edge Function
// Handles NFT purchases with proper permissions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role for full database access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const walletAddress = req.headers.get('x-wallet-address');
    if (!walletAddress) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { nft_id, nft_type, price_bcc, price_usdt, transaction_hash } = await req.json();

    if (!nft_id || !nft_type || !price_bcc) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required purchase data'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🛒 Processing NFT purchase for ${walletAddress}`, {
      nft_id, nft_type, price_bcc, price_usdt
    });

    // Step 1: Verify user has sufficient BCC balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('bcc_transferable, bcc_locked')
      .ilike('wallet_address', walletAddress)
      .maybeSingle();

    const currentTransferable = balanceData?.bcc_transferable || 600; // Default for new users
    if (currentTransferable < price_bcc) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Insufficient BCC balance',
        current_balance: currentTransferable,
        required: price_bcc
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Insert purchase record using service role (bypasses RLS)
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('nft_purchases')
      .insert({
        buyer_wallet: walletAddress,
        nft_id,
        nft_type,
        price_bcc,
        price_usdt: price_usdt || 0,
        payment_method: 'bcc',
        transaction_hash: transaction_hash || `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`
      })
      .select()
      .maybeSingle();

    if (purchaseError) {
      console.error('❌ Purchase insert error:', purchaseError);
      throw purchaseError;
    }

    console.log('✅ Purchase record created:', purchaseData.id);

    // Step 3: Update user BCC balance (deduct spent BCC)
    const newTransferable = currentTransferable - price_bcc;
    
    if (balanceData) {
      // Update existing balance record
      const { error: balanceUpdateError } = await supabase
        .from('user_balances')
        .update({
          bcc_transferable: newTransferable,
          updated_at: new Date().toISOString()
        })
        .ilike('wallet_address', walletAddress);

      if (balanceUpdateError) {
        console.error('❌ Balance update error:', balanceUpdateError);
        // Rollback purchase if balance update fails
        await supabase.from('nft_purchases').delete().eq('id', purchaseData.id);
        throw balanceUpdateError;
      }
    } else {
      // Create new balance record
      const { error: balanceCreateError } = await supabase
        .from('user_balances')
        .insert({
          wallet_address: walletAddress,
          bcc_transferable: newTransferable,
          bcc_locked: 10350, // Default locked amount for new users
          total_usdt_earned: 0,
          pending_upgrade_rewards: 0,
          rewards_claimed: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (balanceCreateError) {
        console.error('❌ Balance create error:', balanceCreateError);
        // Rollback purchase if balance creation fails
        await supabase.from('nft_purchases').delete().eq('id', purchaseData.id);
        throw balanceCreateError;
      }
    }

    // Step 4: Update NFT supply if it's a merchant NFT with limited supply
    if (nft_type === 'merchant') {
      const { data: nftData } = await supabase
        .from('merchant_nfts')
        .select('supply_available')
        .eq('id', nft_id)
        .maybeSingle();

      if (nftData?.supply_available && nftData.supply_available > 0) {
        await supabase
          .from('merchant_nfts')
          .update({
            supply_available: nftData.supply_available - 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', nft_id);
      }
    }

    console.log('✅ NFT purchase completed successfully');

    return new Response(JSON.stringify({
      success: true,
      purchase: purchaseData,
      new_balance: {
        transferable: newTransferable,
        locked: balanceData?.bcc_locked || 10350
      },
      message: 'NFT purchased successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ NFT purchase error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to purchase NFT',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});