// =============================================
// Beehive Platform - Balance Management Edge Function
// Handles BCC balance queries, USDT earnings, and balance operations
// =============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase();
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
      case 'get-balance':
        return await handleGetBalance(supabase, walletAddress);
      case 'get-transactions':
        return await handleGetTransactions(supabase, walletAddress, requestData);
      case 'transfer-bcc':
        return await handleTransferBcc(supabase, walletAddress, requestData);
      case 'spend-bcc':
        return await handleSpendBcc(supabase, walletAddress, requestData);
      case 'get-earning-history':
        return await handleGetEarningHistory(supabase, walletAddress, requestData);
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
    console.error('Balance function error:', error);
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
async function handleGetBalance(supabase, walletAddress) {
  try {
    // Get user balance
    const { data: balanceData, error: balanceError } = await supabase.from('user_balances').select('*').eq('wallet_address', walletAddress).single();
    if (balanceError && balanceError.code !== 'PGRST116') {
      throw balanceError;
    }
    // Get pending rewards (unclaimed rewards)
    const { data: pendingRewards, error: rewardsError } = await supabase.from('layer_rewards').select('amount_usdt').eq('recipient_wallet', walletAddress).eq('is_claimed', false);
    if (rewardsError) throw rewardsError;
    const pendingRewardAmount = pendingRewards?.reduce((sum, reward)=>sum + parseFloat(reward.amount_usdt), 0) || 0;
    // Get recent BCC purchase orders
    const { data: recentPurchases, error: purchaseError } = await supabase.from('bcc_purchase_orders').select('amount_bcc, status, created_at').eq('buyer_wallet', walletAddress).order('created_at', {
      ascending: false
    }).limit(5);
    if (purchaseError) throw purchaseError;
    const balance = balanceData || {
      wallet_address: walletAddress,
      bcc_transferable: 0,
      bcc_locked: 0,
      total_usdt_earned: 0,
      pending_upgrade_rewards: 0,
      rewards_claimed: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const response = {
      success: true,
      balance: {
        ...balance,
        total_bcc: (balance.bcc_transferable || 0) + (balance.bcc_locked || 0),
        pending_rewards_usdt: pendingRewardAmount
      },
      recentActivity: {
        pendingRewardCount: pendingRewards?.length || 0,
        recentPurchases: recentPurchases || []
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch balance data'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleGetTransactions(supabase, walletAddress, data) {
  try {
    const { limit = 50, offset = 0 } = data;
    // Get BCC purchase orders as transaction history
    const { data: transactions, error } = await supabase.from('bcc_purchase_orders').select('order_id, amount_bcc as amount, amount_usdc, status, network, payment_method, created_at, completed_at').eq('buyer_wallet', walletAddress).order('created_at', {
      ascending: false
    }).range(offset, offset + limit - 1);
    if (error) throw error;
    // Get transaction summary - all BCC purchases are credits
    const credits = transactions?.filter((t)=>t.status === 'completed') || [];
    const debits = [] // No debits in this simple view
    ;
    const response = {
      success: true,
      transactions: transactions || [],
      summary: {
        totalCredits: credits.reduce((sum, t)=>sum + parseFloat(t.amount || '0'), 0),
        totalDebits: debits.reduce((sum, t)=>sum + parseFloat(t.amount || '0'), 0),
        creditCount: credits.length,
        debitCount: debits.length
      },
      pagination: {
        limit,
        offset,
        total: transactions?.length || 0
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch transaction history'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleTransferBcc(supabase, walletAddress, data) {
  try {
    const { amount, recipientWallet, purpose } = data;
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Valid amount required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!recipientWallet) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Recipient wallet address required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Process BCC transfer
    const { data: result, error: transferError } = await supabase.rpc('transfer_bcc_tokens', {
      p_from_wallet: walletAddress,
      p_to_wallet: recipientWallet.toLowerCase(),
      p_amount: amount,
      p_purpose: purpose || 'User transfer'
    });
    if (transferError) throw transferError;
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
      transfer: {
        from: walletAddress,
        to: recipientWallet.toLowerCase(),
        amount: amount,
        purpose: purpose || 'User transfer',
        newBalance: result.new_sender_balance,
        recipientNewBalance: result.new_recipient_balance
      },
      message: `Successfully transferred ${amount} BCC to ${recipientWallet}`
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Transfer BCC error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to transfer BCC tokens'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleSpendBcc(supabase, walletAddress, data) {
  try {
    const { amount, itemType, itemId, purpose } = data;
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Valid amount required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!itemType || !itemId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Item type and ID required for spending'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Process BCC spending based on item type
    let result;
    let purchaseRecord;
    if (itemType === 'nft') {
      // Handle NFT purchase
      const { data: nftResult, error: nftError } = await supabase.rpc('purchase_nft_with_bcc', {
        p_buyer_wallet: walletAddress,
        p_nft_id: itemId,
        p_nft_type: data.nftType || 'merchant',
        p_price_bcc: amount
      });
      if (nftError) throw nftError;
      result = nftResult;
      purchaseRecord = {
        type: 'nft',
        nftId: itemId,
        nftType: data.nftType || 'merchant'
      };
    } else if (itemType === 'course') {
      // Handle course purchase
      const { data: courseResult, error: courseError } = await supabase.rpc('purchase_course_with_bcc', {
        p_wallet_address: walletAddress,
        p_course_id: itemId,
        p_price_bcc: amount
      });
      if (courseError) throw courseError;
      result = courseResult;
      purchaseRecord = {
        type: 'course',
        courseId: itemId
      };
    } else {
      // Generic BCC spending
      const { data: spendResult, error: spendError } = await supabase.rpc('spend_bcc_tokens', {
        p_wallet_address: walletAddress,
        p_amount: amount,
        p_purpose: purpose || `${itemType} purchase`,
        p_item_reference: `${itemType}:${itemId}`
      });
      if (spendError) throw spendError;
      result = spendResult;
      purchaseRecord = {
        type: itemType,
        itemId: itemId
      };
    }
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
      purchase: {
        wallet: walletAddress,
        amount: amount,
        itemType: itemType,
        itemId: itemId,
        purpose: purpose || `${itemType} purchase`,
        newBalance: result.new_balance,
        ...purchaseRecord
      },
      message: `Successfully spent ${amount} BCC on ${itemType}`
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Spend BCC error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to spend BCC tokens'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleGetEarningHistory(supabase, walletAddress, data) {
  try {
    const { limit = 50, offset = 0 } = data;
    // Get USDT earning history from rewards
    const { data: rewardHistory, error: rewardError } = await supabase.from('layer_rewards').select(`
        id,
        payer_wallet,
        layer,
        amount_usdt,
        is_claimed,
        created_at,
        claimed_at
      `).eq('recipient_wallet', walletAddress).order('created_at', {
      ascending: false
    }).range(offset, offset + limit - 1);
    if (rewardError) throw rewardError;
    // Get BCC earning history from purchases
    const { data: bccHistory, error: bccError } = await supabase.from('bcc_purchase_orders').select(`
        order_id,
        amount_bcc,
        amount_usdc,
        network,
        payment_method,
        status,
        created_at,
        completed_at
      `).eq('buyer_wallet', walletAddress).eq('status', 'completed').order('completed_at', {
      ascending: false
    }).range(offset, offset + limit - 1);
    if (bccError) throw bccError;
    // Calculate totals
    const totalUsdtEarned = rewardHistory?.reduce((sum, reward)=>sum + parseFloat(reward.amount_usdt), 0) || 0;
    const totalBccEarned = bccHistory?.reduce((sum, purchase)=>sum + parseFloat(purchase.amount_bcc), 0) || 0;
    const totalClaimedRewards = rewardHistory?.filter((r)=>r.is_claimed === true).length || 0;
    const totalPendingRewards = rewardHistory?.filter((r)=>r.is_claimed === false).length || 0;
    const response = {
      success: true,
      earningHistory: {
        usdtRewards: rewardHistory || [],
        bccPurchases: bccHistory || []
      },
      summary: {
        totalUsdtEarned,
        totalBccEarned,
        totalRewardCount: rewardHistory?.length || 0,
        claimedRewards: totalClaimedRewards,
        pendingRewards: totalPendingRewards,
        totalPurchases: bccHistory?.length || 0
      },
      pagination: {
        limit,
        offset
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get earning history error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch earning history'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
