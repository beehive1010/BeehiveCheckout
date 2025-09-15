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
      case 'get-dashboard-activity':
        return await handleGetDashboardActivity(supabase, walletAddress, requestData);
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
    // CRITICAL: Verify user is registered before returning balance data
    console.log(`🔍 Verifying user registration for balance query: ${walletAddress}`);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_address')
      .ilike('wallet_address', walletAddress)
      .single();

    if (userError || !userData) {
      console.error(`❌ Balance query denied - user not registered: ${walletAddress}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'User must be registered before accessing balance information. Please complete registration first.',
        balance: null
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log(`✅ User registration verified for balance query: ${walletAddress}`);

    // Get user balance - use case insensitive search
    const { data: balanceData, error: balanceError } = await supabase.from('user_balances').select('*').ilike('wallet_address', walletAddress).single();
    if (balanceError && balanceError.code !== 'PGRST116') {
      throw balanceError;
    }
    // Get pending rewards (unclaimed rewards) - case insensitive
    const { data: pendingRewards, error: rewardsError } = await supabase.from('layer_rewards').select('amount_usdt').ilike('recipient_wallet', walletAddress).eq('is_claimed', false);
    if (rewardsError) throw rewardsError;
    const pendingRewardAmount = pendingRewards?.reduce((sum, reward)=>sum + parseFloat(reward.amount_usdt), 0) || 0;
    // Get recent BCC purchase orders - case insensitive
    const { data: recentPurchases, error: purchaseError } = await supabase.from('bcc_purchase_orders').select('amount_bcc, status, created_at').ilike('buyer_wallet', walletAddress).order('created_at', {
      ascending: false
    }).limit(5);
    if (purchaseError) throw purchaseError;
    const balance = balanceData || {
      wallet_address: walletAddress,
      bcc_balance: 0,
      bcc_locked: 0,
      total_earned: 0,
      reward_balance: 0,
      reward_claimed: 0,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    const response = {
      success: true,
      balance: {
        ...balance,
        bcc_transferable: balance.bcc_balance || 0, // Map to expected frontend field
        total_bcc: (balance.bcc_balance || 0) + (balance.bcc_locked || 0),
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
        totalCredits: credits.reduce((

            sum, t)=>sum + parseFloat(t.amount || '0'), 0),
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
      p_to_wallet: recipientWallet,
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
        to: recipientWallet,
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
      // Handle NFT purchase directly without database function
      const nftType = data.nftType || 'merchant';
      
      // Get current balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('bcc_balance')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();
      
      if (balanceError || !balanceData) {
        throw new Error('User balance not found');
      }
      
      const currentBalance = balanceData.bcc_balance || 0;
      if (currentBalance < amount) {
        throw new Error(`Insufficient BCC balance. Available: ${currentBalance}, Required: ${amount}`);
      }
      
      // Verify NFT exists and is available
      let nftExists = false;
      if (nftType === 'advertisement') {
        const { data: nftData, error: nftError } = await supabase
          .from('advertisement_nfts')
          .select('id')
          .eq('id', itemId)
          .eq('is_active', true)
          .single();
        nftExists = !nftError && !!nftData;
      } else if (nftType === 'merchant') {
        const { data: nftData, error: nftError } = await supabase
          .from('merchant_nfts')
          .select('id, supply_available')
          .eq('id', itemId)
          .eq('is_active', true)
          .single();
        nftExists = !nftError && !!nftData;
        if (nftExists && nftData.supply_available !== null && nftData.supply_available <= 0) {
          throw new Error('NFT is sold out');
        }
      }
      
      if (!nftExists) {
        throw new Error('NFT not found or not available');
      }
      
      // Update user balance
      const newBalance = currentBalance - amount;
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({
          bcc_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress.toLowerCase());
      
      if (updateError) throw updateError;
      
      // Update NFT supply for merchant NFTs
      if (nftType === 'merchant') {
        const { data: currentNFT } = await supabase
          .from('merchant_nfts')
          .select('supply_available')
          .eq('id', itemId)
          .single();
        
        if (currentNFT && currentNFT.supply_available !== null) {
          await supabase
            .from('merchant_nfts')
            .update({
              supply_available: Math.max(0, currentNFT.supply_available - 1),
              updated_at: new Date().toISOString()
            })
            .eq('id', itemId);
        }
      }
      
      result = {
        success: true,
        new_balance: newBalance,
        amount_spent: amount,
        nft_id: itemId,
        nft_type: nftType
      };
      
      purchaseRecord = {
        type: 'nft',
        nftId: itemId,
        nftType: nftType
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

// Dashboard activity handler - temporary fix
async function handleGetDashboardActivity(supabase, walletAddress, requestData) {
  try {
    console.log(`📊 Getting dashboard activity for: ${walletAddress}`);
    
    // Return minimal activity data - prevents dashboard crashes
    const activities = [
      {
        id: 1,
        activity_type: 'membership_activation',
        activity_data: { level: 1 },
        created_at: new Date().toISOString(),
        description: 'Membership activated'
      }
    ];

    return new Response(JSON.stringify({
      success: true,
      activity: activities
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Dashboard activity error:', error);
    return new Response(JSON.stringify({
      success: true,
      activity: [] // Return empty array to prevent crashes
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
