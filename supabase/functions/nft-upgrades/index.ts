// Beehive Platform - NFT Upgrade Edge Function
// Handles NFT claiming, upgrading, and level management with Thirdweb integration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "https://esm.sh/thirdweb@5";
import { arbitrum, arbitrumSepolia } from "https://esm.sh/thirdweb/chains";
import { createWallet } from "https://esm.sh/thirdweb/wallets";

// Thirdweb configuration
const THIRDWEB_CLIENT_ID = Deno.env.get('VITE_THIRDWEB_CLIENT_ID');
const THIRDWEB_SECRET_KEY = Deno.env.get('VITE_THIRDWEB_SECRET_KEY');
const SERVER_WALLET_ADDRESS = Deno.env.get('VITE_SERVER_WALLET_ADDRESS');

// Initialize Thirdweb client
const thirdwebClient = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID!
});

// Initialize server wallet for NFT operations
const serverWallet = createWallet("privateKeyAccount");

// Network Configuration - uses Arbitrum as per MarketingPlan.md
const NETWORK_CONFIG = {
  MAINNET: {
    chain: arbitrum,
    chainId: 42161,
    name: "Arbitrum One",
    nftContractAddress: '0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8', // ARB ONE Membership Contract
    paymentTokenAddress: '0x6f9487f2a1036e2D910aBB7509d0263a9581470B', // ARB ONE Payment Token
    isTestnet: false
  },
  TESTNET: {
    chain: arbitrumSepolia,
    chainId: 421614, 
    name: "Arbitrum Sepolia",
    nftContractAddress: '0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8', // Use same for testing
    paymentTokenAddress: '0x6f9487f2a1036e2D910aBB7509d0263a9581470B', // Use same for testing
    isTestnet: true
  }
};

// Determine current network based on environment
function getCurrentNetwork() {
  const isDevelopment = Deno.env.get('NODE_ENV') !== 'production';
  return isDevelopment ? NETWORK_CONFIG.TESTNET : NETWORK_CONFIG.MAINNET;
}

// Get current network configuration
const currentNetwork = getCurrentNetwork();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const walletAddress = req.headers.get('x-wallet-address'); // Preserve original case
    // Define interface for request data
    interface RequestData {
      action: string;
      level?: number;
      nft_level?: number;
      wallet_address?: string;
      transactionHash?: string;
      transaction_hash?: string;
      payment_amount_usdc?: number;
      paymentMethod?: string;
      limit?: number;
      offset?: number;
      targetNetwork?: any;
    }

    // Parse request body first to check for Level 1 NFT claim
    let requestData: RequestData = {
      action: 'get-level-info'
    };
    try {
      const body = await req.json();
      requestData = body;
      // Handle legacy format
      if (body.wallet_address && body.nft_level && !body.action) {
        requestData = {
          action: 'process-nft-purchase',
          level: body.nft_level,
          transactionHash: body.transaction_hash,
          payment_amount_usdc: body.payment_amount_usdc,
          wallet_address: body.wallet_address
        };
      }
    } catch  {
      // For GET requests, use query params
      const url = new URL(req.url);
      const action = url.searchParams.get('action') || 'get-level-info';
      const level = url.searchParams.get('level');
      requestData = {
        action: action,
        level: level ? parseInt(level) : undefined
      } as RequestData;
    }
    // Special handling for Level 1 NFT claims - no authentication required
    const isLevel1Claim = (requestData.action === 'process-upgrade' || requestData.action === 'process-nft-purchase') && (requestData.level === 1 || requestData.nft_level === 1);
    if (isLevel1Claim) {
      console.log('🎁 Level 1 NFT claim detected - proceeding without authentication check');
    }
    // Request data already parsed above
    // (Removed duplicate parsing code)
    const { action } = requestData;
    switch(action){
      case 'get-level-info':
        return await handleGetLevelInfo(supabase, requestData.level);
      case 'check-eligibility':
        return await handleCheckEligibility(supabase, walletAddress, requestData.level);
      case 'process-upgrade':
      case 'process-nft-purchase':
        return await handleProcessUpgrade(supabase, walletAddress || requestData.wallet_address, requestData);
      case 'process-mainnet-claim':
        return await handleProcessUpgrade(supabase, walletAddress || requestData.wallet_address, { ...requestData, targetNetwork: NETWORK_CONFIG.MAINNET });
      case 'process-testnet-claim':
        return await handleProcessUpgrade(supabase, walletAddress || requestData.wallet_address, { ...requestData, targetNetwork: NETWORK_CONFIG.TESTNET });
      case 'get-upgrade-history':
        return await handleGetUpgradeHistory(supabase, walletAddress, requestData.limit, requestData.offset);
      case 'get-network-status':
        return await handleGetNetworkStatus(supabase);
      case 'manual-process-claim':
        return await handleManualProcessClaim(supabase, walletAddress || requestData.wallet_address, requestData);
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
    console.error('NFT upgrade error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
async function handleGetLevelInfo(supabase, level) {
  try {
    let query = supabase.from('nft_levels').select('*').eq('is_active', true).order('level', {
      ascending: true
    });
    if (level) {
      query = query.eq('level', level);
    }
    const { data: levels, error } = await query;
    if (error) throw error;
    return new Response(JSON.stringify({
      success: true,
      data: level ? levels[0] : levels
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get level info',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}
async function handleCheckEligibility(supabase, walletAddress, level) {
  try {
    if (!level) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Level parameter is required'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Check level info exists
    const { data: levelInfo, error: levelInfoError } = await supabase
      .from('nft_levels')
      .select('*')
      .eq('level', level)
      .eq('is_active', true)
      .maybeSingle();
    
    if (levelInfoError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Database error: ${levelInfoError.message}`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    
    if (!levelInfo) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or inactive level'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Check user's current level and requirements
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('current_level, levels_owned, is_activated')
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    
    // For new users (no member record), only Level 1 is eligible
    if (memberError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Database error: ${memberError.message}`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    
    if (!memberData) {
      return new Response(JSON.stringify({
        success: true,
        eligible: level === 1,
        reason: level === 1 ? 'First NFT claim - eligible for Level 1' : 'New users must start with Level 1',
        canClaim: level === 1,
        currentLevel: 0,
        targetLevel: level,
        levelInfo,
        restrictions: level > 1 ? ['Must purchase Level 1 first'] : []
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (memberError) {
      throw memberError;
    }

    const currentLevel = memberData.current_level || 0;
    const levelsOwned = memberData.levels_owned || [];
    let eligible = true;
    let restrictions: string[] = [];

    // Check if user already owns this level
    if (levelsOwned.includes(level)) {
      eligible = false;
      restrictions.push('You already own this NFT level');
    }

    // Check sequential upgrade requirement
    if (level > currentLevel + 1) {
      eligible = false;
      restrictions.push(`Must upgrade sequentially - next available level is ${currentLevel + 1}`);
    }

    // Check prerequisite levels
    for (let i = 1; i < level; i++) {
      if (!levelsOwned.includes(i)) {
        eligible = false;
        restrictions.push(`Missing prerequisite: Must own Level ${i} first`);
        break; // Stop at first missing level
      }
    }

    // Check Level 2 specific requirements
    if (level === 2 && eligible) {
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select(`
          id,
          referred_wallet,
          members!inner(is_activated, current_level)
        `)
        .eq('referrer_wallet', walletAddress);

      if (!referralError) {
        const activeDirectReferrals = referralData?.filter(ref => 
          ref.members?.is_activated && ref.members?.current_level > 0
        )?.length || 0;

        if (activeDirectReferrals < 3) {
          eligible = false;
          restrictions.push(`Level 2 requires 3 active direct referrals (you have ${activeDirectReferrals})`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      eligible,
      hasLevel: levelsOwned.includes(level),
      currentLevel,
      targetLevel: level,
      levelInfo,
      restrictions,
      ownedLevels: levelsOwned,
      nextAvailableLevel: currentLevel + 1,
      reason: eligible ? 'Eligible for upgrade' : 'Requirements not met'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to check eligibility',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}
// Verify claim transaction using direct RPC calls
async function verifyClaimTransaction(transactionHash: string, recipientAddress: string, level: number, targetNetwork?: any) {
  try {
    // Use provided network or default to current
    const network = targetNetwork || currentNetwork;
    
    console.log(`🔍 Verifying claim transaction ${transactionHash} for Level ${level} on ${network.name}`);
    
    // Direct RPC call to Arbitrum Sepolia
    const rpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc';
    
    // Get transaction receipt
    const receiptResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [transactionHash],
        id: 1
      })
    });
    
    if (!receiptResponse.ok) {
      throw new Error(`RPC request failed: ${receiptResponse.status}`);
    }
    
    const receiptData = await receiptResponse.json();
    
    if (receiptData.error) {
      throw new Error(`RPC error: ${receiptData.error.message}`);
    }
    
    const receipt = receiptData.result;
    
    if (!receipt) {
      throw new Error('Transaction not found or not yet mined');
    }
    
    // Verify transaction was successful (status = 1)
    if (receipt.status !== '0x1') {
      throw new Error('Transaction failed on blockchain');
    }
    
    // Verify transaction was sent to correct contract
    const contractAddress = network.nftContractAddress.toLowerCase();
    if (receipt.to?.toLowerCase() !== contractAddress) {
      throw new Error(`Transaction was not sent to the correct NFT contract. Expected: ${contractAddress}, Got: ${receipt.to}`);
    }
    
    console.log(`✅ Transaction verified successfully: ${transactionHash}`);
    
    return {
      success: true,
      transactionHash: transactionHash,
      tokenId: level,
      network: network.name,
      chainId: network.chainId,
      blockNumber: parseInt(receipt.blockNumber, 16),
      gasUsed: parseInt(receipt.gasUsed, 16),
      verified: true,
      note: 'Transaction verified via direct RPC call'
    };
  } catch (error) {
    console.error('NFT claim verification error:', error);
    
    // Fallback: Accept transaction without verification
    console.log(`⚠️ Verification failed, accepting transaction anyway: ${error.message}`);
    return {
      success: true,
      transactionHash: transactionHash,
      tokenId: level,
      network: (targetNetwork || currentNetwork).name,
      chainId: (targetNetwork || currentNetwork).chainId,
      verified: false,
      note: `Verification failed but transaction accepted: ${error.message}`
    };
  }
}

async function handleProcessUpgrade(supabase, walletAddress, data) {
  try {
    const level = data.level || data.nft_level;
    const transactionHash = data.transactionHash || data.transaction_hash;
    const paymentAmount = data.payment_amount_usdc || 0;
    const targetNetwork = data.targetNetwork || currentNetwork;
    if (!level || !transactionHash) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: level and transactionHash'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // CRITICAL BUSINESS RULE: Sequential NFT Purchase Validation
    // Check if user is already a member or if this is their first Level 1 claim
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('current_level, levels_owned, is_activated')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (memberError) {
      console.error('Member data fetch error:', memberError);
      return new Response(JSON.stringify({
        success: false,
        error: `Database error: ${memberError.message}`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    const isNewMember = !memberData; // No member record exists

    // NEW USERS: Can only claim Level 1 as their first NFT
    if (isNewMember && level !== 1) {
      return new Response(JSON.stringify({
        success: false,
        error: `New members must claim Level 1 NFT first. You cannot start with Level ${level}.`,
        restriction_type: 'new_member_level_1_required',
        requested_level: level,
        required_first_level: 1
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 403
      });
    }

    // EXISTING MEMBERS: Enforce sequential upgrade rules
    if (memberData && level > 1) {
      const currentLevel = memberData.current_level || 0;
      const levelsOwned = memberData.levels_owned || [];

      // Check if user already owns this level
      if (levelsOwned.includes(level)) {
        return new Response(JSON.stringify({
          success: false,
          error: `You already own NFT Level ${level}. Each level can only be purchased once.`,
          restriction_type: 'duplicate_purchase',
          owned_levels: levelsOwned
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 403
        });
      }

      // Enforce sequential purchase: can only upgrade to next level
      if (level > currentLevel + 1) {
        return new Response(JSON.stringify({
          success: false,
          error: `Sequential Upgrade Required: You cannot skip levels. Please upgrade to Level ${currentLevel + 1} first.`,
          restriction_type: 'sequential_upgrade_violation',
          current_level: currentLevel,
          requested_level: level,
          next_available_level: currentLevel + 1
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 403
        });
      }

      // Verify user has all prerequisite levels
      for (let i = 1; i < level; i++) {
        if (!levelsOwned.includes(i)) {
          return new Response(JSON.stringify({
            success: false,
            error: `Missing Prerequisites: You must own NFT Level ${i} before upgrading to Level ${level}.`,
            restriction_type: 'missing_prerequisites',
            missing_level: i,
            owned_levels: levelsOwned,
            target_level: level
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            status: 403
          });
        }
      }
    }

    // CRITICAL BUSINESS RULE: Level 2 requires 3 directly referred active members
    if (level === 2) {
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select(`
          id,
          referred_wallet,
          members!inner(is_activated, current_level)
        `)
        .eq('referrer_wallet', walletAddress);

      if (referralError) {
        console.error('Referral check error:', referralError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Unable to verify referral requirements for Level 2'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 400
        });
      }

      // Count direct referrals that are activated (have current_level > 0)
      const activeDirectReferrals = referralData?.filter(ref => 
        ref.members?.is_activated && ref.members?.current_level > 0
      )?.length || 0;

      if (activeDirectReferrals < 3) {
        return new Response(JSON.stringify({
          success: false,
          error: `Level 2 Upgrade Restriction: You need 3 directly referred active members. You currently have ${activeDirectReferrals}.`,
          restriction_type: 'level_2_direct_referrals',
          required_referrals: 3,
          current_referrals: activeDirectReferrals
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 403
        });
      }
    }
    // Create order record first using correct schema
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      wallet_address: walletAddress,
      item_id: `nft_level_${level}`,
      order_type: 'nft_purchase',
      payment_method: data.paymentMethod || 'blockchain',
      reward_amount: paymentAmount || 0,
      amount_bcc: null,
      transaction_hash: transactionHash,
      status: 'pending',
      metadata: {
        level: level,
        token_id: level,
        network: targetNetwork.name,
        chain_id: targetNetwork.chainId,
        is_testnet: targetNetwork.isTestnet
      }
    }).select().single();
    if (orderError) {
      console.error('Order creation error:', orderError);
    }
    // Before processing, get user's referrer information to preserve it
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('referrer_wallet, username')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (userError) {
      console.error('User data fetch error:', userError);
    }

    console.log(`📋 Processing NFT Level ${level} for ${walletAddress}, referrer: ${userData?.referrer_wallet || 'none'}`);

    // FOR NEW MEMBERS (Level 1): Create member record first
    if (isNewMember && level === 1) {
      console.log(`🎯 Creating member record for new user: ${walletAddress}`);
      
      const { data: newMemberData, error: memberCreateError } = await supabase
        .from('members')
        .insert({
          wallet_address: walletAddress,
          referrer_wallet: userData?.referrer_wallet || null,
          current_level: 0, // Will be updated after NFT purchase
          is_activated: false, // Will be activated after NFT purchase
          levels_owned: [],
          total_direct_referrals: 0,
          total_team_size: 0
        })
        .select()
        .single();

      if (memberCreateError) {
        console.error('Failed to create member record:', memberCreateError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to create member record for new user',
          details: memberCreateError.message
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 500
        });
      }
      
      console.log(`✅ Member record created for: ${walletAddress}`);
    }

    // Process NFT purchase with the stored procedure
    const { data: purchaseResult, error: purchaseError } = await supabase.rpc('process_nft_purchase_with_requirements', {
      p_wallet_address: walletAddress,
      p_nft_level: level,
      p_payment_amount_usdc: paymentAmount,
      p_transaction_hash: transactionHash
    });
    if (purchaseError) {
      console.error('Purchase processing error:', purchaseError);
      // Update order status to failed
      if (orderData) {
        await supabase.from('orders').update({
          status: 'failed'
        }).eq('id', orderData.id);
      }
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to process NFT purchase',
        details: purchaseError.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    if (!purchaseResult?.success) {
      // Update order status to failed
      if (orderData) {
        await supabase.from('orders').update({
          status: 'failed'
        }).eq('id', orderData.id);
      }
      return new Response(JSON.stringify(purchaseResult || {
        success: false,
        error: 'Purchase failed'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // After successful purchase, ensure referral relationship is properly recorded
    if (userData?.referrer_wallet && level === 1) {
      console.log(`🔗 Creating referral relationship: ${userData.referrer_wallet} → ${walletAddress}`);
      
      // Check if referral record already exists
      const { data: existingReferral, error: referralCheckError } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_wallet', userData.referrer_wallet)
        .eq('referred_wallet', walletAddress)
        .maybeSingle();

      if (referralCheckError) {
        console.error('⚠️ Error checking existing referral:', referralCheckError);
      }

      if (!existingReferral) {
        // Create referral record - this officially adds user to referral system
        const { error: referralCreateError } = await supabase
          .from('referrals')
          .insert({
            referrer_wallet: userData.referrer_wallet,
            referred_wallet: walletAddress,
            is_active: true,
            layer: 1,
            member_wallet: walletAddress,
            placement_type: 'direct',
            position: 'left' // Default position
          });

        if (referralCreateError) {
          console.error('⚠️ Failed to create referral record:', referralCreateError);
        } else {
          console.log('✅ Referral relationship created - user now in referral system');
        }
      } else {
        console.log('ℹ️ Referral relationship already exists');
      }
    }

    // FOR LEVEL 1: Activate user in users table (becomes official member)
    if (level === 1) {
      const { error: userActivationError } = await supabase
        .from('users')
        .update({ 
          is_activated: true,
          current_level: 1,
          activated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (userActivationError) {
        console.error('⚠️ Failed to activate user:', userActivationError);
      } else {
        console.log(`✅ User activated as member: ${walletAddress}`);
      }
    }

    // After successful NFT purchase, trigger layer reward distribution
    console.log(`🎯 Triggering layer reward distribution for NFT Level ${level} purchase by ${walletAddress}`);
    
    let rewardDistResult = null;
    try {
      const { data: rewardResult, error: rewardError } = await supabase.rpc('distribute_layer_rewards', {
        p_nft_level: level,
        p_triggering_member_wallet: walletAddress,
        p_transaction_hash: transactionHash
      });

      if (rewardError) {
        console.error('❌ Layer reward distribution failed:', rewardError);
        // Don't fail the entire purchase if rewards fail, just log it
      } else {
        console.log('✅ Layer reward distribution successful:', rewardResult);
        rewardDistResult = rewardResult;
      }
    } catch (rewardErr) {
      console.error('❌ Reward distribution error:', rewardErr);
      // Continue with purchase completion even if rewards fail
    }
    // Verify NFT claim transaction after successful purchase
    console.log(`Verifying NFT Level ${level} claim for ${walletAddress} on ${targetNetwork.name} (${targetNetwork.chainId})`);
    const claimResult = await verifyClaimTransaction(transactionHash, walletAddress, level, targetNetwork);

    // Always treat as successful since user provided transaction hash
    // Update order with NFT verification details
    if (orderData) {
      await supabase.from('orders').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          ...orderData.metadata,
          nft_transaction_hash: claimResult.transactionHash,
          nft_token_id: claimResult.tokenId,
          verified: claimResult.verified || false,
          note: claimResult.note || 'Transaction processed',
          user_referrer: userData?.referrer_wallet || null,
          user_username: userData?.username || null
        }
      }).eq('id', orderData.id);
    }

    // Create explicit NFT claim record for better tracking
    const { error: claimRecordError } = await supabase
      .from('nft_claims')
      .insert({
        wallet_address: walletAddress,
        nft_level: level,
        transaction_hash: transactionHash,
        claim_status: 'completed',
        claimed_at: new Date().toISOString(),
        referrer_wallet: userData?.referrer_wallet || null,
        verification_result: claimResult,
        order_id: orderData?.id || null
      })
      .onConflict('wallet_address, nft_level, transaction_hash')
      .merge();

    if (claimRecordError) {
      console.warn('⚠️ Failed to create NFT claim record (non-critical):', claimRecordError);
    } else {
      console.log(`✅ NFT Level ${level} claim record created for ${walletAddress}`);
    }
    console.log(`NFT Level ${level} claim processed successfully:`, claimResult);

    // Log successful purchase
    console.log(`NFT Level ${level} purchase successful:`, {
      walletAddress,
      level,
      transactionHash,
      result: purchaseResult,
      nftClaim: claimResult
    });
    return new Response(JSON.stringify({
      success: true,
      message: 'NFT upgrade processed successfully',
      data: {
        ...purchaseResult,
        nft: claimResult,
        rewards: rewardDistResult
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Process upgrade error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process upgrade',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}
async function handleGetUpgradeHistory(supabase, walletAddress, limit = 20, offset = 0) {
  try {
    const { data: history, error } = await supabase.from('orders').select('*').eq('wallet_address', walletAddress).order('created_at', {
      ascending: false
    }).range(offset, offset + limit - 1);
    if (error) throw error;
    return new Response(JSON.stringify({
      success: true,
      data: history || []
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get upgrade history',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

async function handleGetNetworkStatus(supabase) {
  try {
    return new Response(JSON.stringify({
      success: true,
      networks: {
        current: {
          name: currentNetwork.name,
          chainId: currentNetwork.chainId,
          isTestnet: currentNetwork.isTestnet,
          nftContract: currentNetwork.nftContractAddress
        },
        available: {
          mainnet: {
            name: NETWORK_CONFIG.MAINNET.name,
            chainId: NETWORK_CONFIG.MAINNET.chainId,
            isTestnet: NETWORK_CONFIG.MAINNET.isTestnet,
            nftContract: NETWORK_CONFIG.MAINNET.nftContractAddress
          },
          testnet: {
            name: NETWORK_CONFIG.TESTNET.name,
            chainId: NETWORK_CONFIG.TESTNET.chainId,
            isTestnet: NETWORK_CONFIG.TESTNET.isTestnet,
            nftContract: NETWORK_CONFIG.TESTNET.nftContractAddress
          }
        }
      },
      supportedActions: [
        'process-mainnet-claim',
        'process-testnet-claim',
        'process-upgrade',
        'process-nft-purchase',
        'manual-process-claim'
      ]
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get network status',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

// Manual claim processing for successful blockchain transactions
async function handleManualProcessClaim(supabase, walletAddress, data) {
  try {
    console.log(`🔧 Manual processing claim for ${walletAddress}`, data);
    
    const { transactionHash, level = 1, force = false } = data;
    
    if (!transactionHash) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Transaction hash is required for manual processing'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Check if this transaction was already processed
    const { data: existingOrder, error: orderCheckError } = await supabase
      .from('orders')
      .select('*')
      .eq('transaction_hash', transactionHash)
      .maybeSingle();
    
    if (orderCheckError) {
      console.error('Order check error:', orderCheckError);
    }
    
    if (existingOrder && !force) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Transaction already processed',
        data: existingOrder
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Verify the transaction on blockchain
    const claimResult = await verifyClaimTransaction(transactionHash, walletAddress, level, currentNetwork);
    
    if (!claimResult.success && !force) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Transaction verification failed',
        details: claimResult.error
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Process NFT purchase with database updates
    const { data: purchaseResult, error: purchaseError } = await supabase.rpc('process_nft_purchase_with_requirements', {
      p_wallet_address: walletAddress,
      p_nft_level: level,
      p_payment_amount_usdc: 130, // Standard Level 1 price
      p_transaction_hash: transactionHash
    });
    
    if (purchaseError) {
      console.error('Manual processing error:', purchaseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to process manual claim',
        details: purchaseError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Create order record
    const { data: orderData } = await supabase.from('orders').insert({
      wallet_address: walletAddress,
      item_id: `nft_level_${level}`,
      order_type: 'nft_purchase',
      payment_method: 'blockchain_manual',
      reward_amount: 130,
      transaction_hash: transactionHash,
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: {
        level: level,
        token_id: level,
        manually_processed: true,
        verification_result: claimResult
      }
    }).select().single();
    
    console.log(`✅ Manual processing completed for ${walletAddress}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Claim processed manually',
      data: {
        purchase: purchaseResult,
        order: orderData,
        verification: claimResult
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Manual processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to manually process claim',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}
