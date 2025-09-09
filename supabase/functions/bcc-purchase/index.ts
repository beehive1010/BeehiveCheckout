// =============================================
// Beehive Platform - BCC Purchase Edge Function
// Handles BCC token purchases with USDC via Thirdweb bridge
// =============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
const COMPANY_SERVER_WALLET = Deno.env.get('COMPANY_SERVER_WALLET') || "0x1234567890123456789012345678901234567890";
const BCC_EXCHANGE_RATE = 1 // 1 USDC = 1 BCC
;
const MINIMUM_PURCHASE_USDC = 10;
const MAXIMUM_PURCHASE_USDC = 10000;
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const walletAddress = req.headers.get('x-wallet-address');
    if (!walletAddress) {
      return new Response(JSON.stringify({
        error: 'Wallet address required'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { action, ...requestData } = await req.json();
    switch(action){
      case 'get-config':
        return await handleGetConfig();
      case 'create-purchase':
        return await handleCreatePurchase(supabase, walletAddress, requestData);
      case 'confirm-payment':
        return await handleConfirmPayment(supabase, walletAddress, requestData);
      case 'get-history':
        return await handleGetHistory(supabase, walletAddress, requestData);
      case 'get-pending':
        return await handleGetPending(supabase, walletAddress);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
    }
  } catch (error) {
    console.error('BCC purchase function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
async function handleGetConfig() {
  const networkConfigs = {
    'arbitrum-one': {
      chainId: 42161,
      name: 'Arbitrum One',
      usdcContract: '0xA0b86a33E6441E8Ff8BBb5F0f1F4a90AC4Cd0a35',
      bridgeSupported: true
    },
    'arbitrum-sepolia': {
      chainId: 421614,
      name: 'Arbitrum Sepolia',
      usdcContract: '0xTestUSDCContract',
      bridgeSupported: true
    },
    'ethereum': {
      chainId: 1,
      name: 'Ethereum Mainnet',
      usdcContract: '0xA0b86a33E6441E8Ff8BBb5F0f1F4a90AC4Cd0a35',
      bridgeSupported: true
    },
    'polygon': {
      chainId: 137,
      name: 'Polygon',
      usdcContract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      bridgeSupported: true
    }
  };
  const response = {
    success: true,
    config: {
      exchangeRate: BCC_EXCHANGE_RATE,
      minimumPurchaseUSDC: MINIMUM_PURCHASE_USDC,
      maximumPurchaseUSDC: MAXIMUM_PURCHASE_USDC,
      companyServerWallet: COMPANY_SERVER_WALLET,
      supportedNetworks: networkConfigs,
      paymentMethods: [
        'thirdweb_bridge',
        'direct_transfer'
      ],
      processingTimeEstimate: '5-15 minutes'
    }
  };
  return new Response(JSON.stringify(response), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
async function handleCreatePurchase(supabase, walletAddress, data) {
  try {
    const { amountUSDC, network, paymentMethod, transactionHash, bridgeUsed } = data;
    // Validate purchase amount
    if (amountUSDC < MINIMUM_PURCHASE_USDC) {
      return new Response(JSON.stringify({
        success: false,
        error: `Minimum purchase amount is $${MINIMUM_PURCHASE_USDC} USDC`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (amountUSDC > MAXIMUM_PURCHASE_USDC) {
      return new Response(JSON.stringify({
        success: false,
        error: `Maximum purchase amount is $${MAXIMUM_PURCHASE_USDC} USDC`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get network configuration
    const networkConfigs = {
      'arbitrum-one': {
        chainId: 42161,
        name: 'Arbitrum One',
        usdcContract: '0xA0b86a33E6441E8Ff8BBb5F0f1F4a90AC4Cd0a35'
      },
      'arbitrum-sepolia': {
        chainId: 421614,
        name: 'Arbitrum Sepolia',
        usdcContract: '0xTestUSDCContract'
      },
      'ethereum': {
        chainId: 1,
        name: 'Ethereum Mainnet',
        usdcContract: '0xA0b86a33E6441E8Ff8BBb5F0f1F4a90AC4Cd0a35'
      },
      'polygon': {
        chainId: 137,
        name: 'Polygon',
        usdcContract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
      }
    };
    const networkInfo = networkConfigs[network];
    if (!networkInfo) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unsupported network'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Calculate BCC amount
    const bccAmount = amountUSDC * BCC_EXCHANGE_RATE;
    // Create purchase order
    const orderId = `bcc_purchase_${walletAddress}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes expiry
    ;
    const { error: insertError } = await supabase.from('bcc_purchase_orders').insert({
      order_id: orderId,
      buyer_wallet: walletAddress,
      amount_usdc: amountUSDC,
      amount_bcc: bccAmount,
      network: network,
      payment_method: paymentMethod || 'thirdweb_bridge',
      company_wallet: COMPANY_SERVER_WALLET,
      transaction_hash: transactionHash || null,
      bridge_used: bridgeUsed || false,
      status: 'pending',
      exchange_rate: BCC_EXCHANGE_RATE,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    if (insertError) throw insertError;
    const response = {
      success: true,
      orderId,
      amountUSDC,
      amountBCC: bccAmount,
      exchangeRate: BCC_EXCHANGE_RATE,
      companyWallet: COMPANY_SERVER_WALLET,
      networkInfo,
      message: `Purchase order created. Send ${amountUSDC} USDC to company wallet to receive ${bccAmount} BCC tokens.`,
      estimatedProcessingTime: '5-15 minutes after payment confirmation'
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Create purchase error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create purchase order'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleConfirmPayment(supabase, walletAddress, data) {
  try {
    const { orderId, transactionHash, actualAmountReceived } = data;
    // Find the purchase order
    const { data: purchaseOrder, error: fetchError } = await supabase.from('bcc_purchase_orders').select('*').eq('order_id', orderId).eq('buyer_wallet', walletAddress).single();
    if (fetchError || !purchaseOrder) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Purchase order not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (purchaseOrder.status !== 'pending') {
      return new Response(JSON.stringify({
        success: false,
        error: `Order is already ${purchaseOrder.status}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if order has expired
    if (new Date() > new Date(purchaseOrder.expires_at)) {
      const { error: expireError } = await supabase.from('bcc_purchase_orders').update({
        status: 'expired',
        updated_at: new Date().toISOString()
      }).eq('order_id', orderId);
      return new Response(JSON.stringify({
        success: false,
        error: 'Purchase order has expired'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Process BCC purchase using the database function
    const { data: result, error: processError } = await supabase.rpc('process_bcc_purchase', {
      p_order_id: orderId,
      p_amount_received: actualAmountReceived || purchaseOrder.amount_usdc
    });
    if (processError) throw processError;
    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const response = {
      success: true,
      message: `Successfully credited ${result.amount_bcc} BCC tokens to your account`,
      orderId: result.order_id,
      amountCredited: result.amount_bcc,
      transactionHash,
      status: 'completed'
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to confirm payment'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleGetHistory(supabase, walletAddress, data) {
  try {
    const limit = data.limit || 20;
    const offset = data.offset || 0;
    const { data: purchases, error } = await supabase.from('bcc_purchase_orders').select('*').eq('buyer_wallet', walletAddress).order('created_at', {
      ascending: false
    }).range(offset, offset + limit - 1);
    if (error) throw error;
    const response = {
      success: true,
      purchases: purchases || [],
      pagination: {
        limit,
        offset,
        total: purchases?.length || 0
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch purchase history'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleGetPending(supabase, walletAddress) {
  try {
    const { data: pendingPurchases, error } = await supabase.from('bcc_purchase_orders').select('*').eq('buyer_wallet', walletAddress).in('status', [
      'pending',
      'processing'
    ]).gt('expires_at', new Date().toISOString()).order('created_at', {
      ascending: false
    });
    if (error) throw error;
    const response = {
      success: true,
      pendingPurchases: pendingPurchases || [],
      count: pendingPurchases?.length || 0
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get pending error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch pending purchases'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
