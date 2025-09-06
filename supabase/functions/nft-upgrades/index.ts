// Beehive Platform - NFT Upgrade Edge Function
// Handles NFT claiming, upgrading, and level management with Thirdweb integration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "https://esm.sh/thirdweb@5";
import { defineChain } from "https://esm.sh/thirdweb/chains";
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

// NFT Contract configuration - adjust based on your deployed contract
const NFT_CONTRACT_ADDRESS = "0x..."; // Replace with actual deployed contract address
const CHAIN_ID = 137; // Polygon network

// Define the chain
const chain = defineChain({
  id: CHAIN_ID,
  name: "Polygon",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://polygon-rpc.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url: "https://polygonscan.com",
    },
  },
});

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
    // Parse request body first to check for Level 1 NFT claim
    let requestData = {
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
      };
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
      case 'get-upgrade-history':
        return await handleGetUpgradeHistory(supabase, walletAddress, requestData.limit, requestData.offset);
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
      .single();
    
    if (levelInfoError || !levelInfo) {
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
      .single();
    
    // For new users (no member record), only Level 1 is eligible
    if (memberError && memberError.code === 'PGRST116') {
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
    let restrictions = [];

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
// NFT minting function using Thirdweb
async function mintNFT(recipientAddress: string, level: number, metadata: any) {
  try {
    // Get NFT contract
    const nftContract = getContract({
      client: thirdwebClient,
      address: NFT_CONTRACT_ADDRESS,
      chain: chain,
    });

    // Prepare the mint transaction
    const mintTransaction = prepareContractCall({
      contract: nftContract,
      method: "mintTo",
      params: [recipientAddress, level, metadata]
    });

    // Execute the transaction with server wallet
    const result = await sendTransaction({
      transaction: mintTransaction,
      account: serverWallet,
    });

    return {
      success: true,
      transactionHash: result.transactionHash,
      tokenId: level // or get from event logs
    };
  } catch (error) {
    console.error('NFT minting error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function handleProcessUpgrade(supabase, walletAddress, data) {
  try {
    const level = data.level || data.nft_level;
    const transactionHash = data.transactionHash || data.transaction_hash;
    const paymentAmount = data.payment_amount_usdc || 0;
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
    // Users must own lower levels before upgrading to higher levels
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('current_level, levels_owned, is_activated')
      .eq('wallet_address', walletAddress)
      .single();

    if (memberError && memberError.code !== 'PGRST116') { // PGRST116 = no rows returned (new user)
      console.error('Member data fetch error:', memberError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Unable to verify member status for sequential upgrade validation'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // For existing members, enforce sequential upgrade rules
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
      amount_usdt: paymentAmount || 0,
      amount_bcc: null,
      transaction_hash: transactionHash,
      status: 'pending',
      metadata: {
        level: level,
        token_id: level,
        network: data.network || 'ethereum'
      }
    }).select().single();
    if (orderError) {
      console.error('Order creation error:', orderError);
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

    // After successful NFT purchase, trigger layer reward distribution
    console.log(`🎯 Triggering layer reward distribution for NFT Level ${level} purchase by ${walletAddress}`);
    
    let rewardDistResult = null;
    try {
      const { data: rewardResult, error: rewardError } = await supabase.rpc('distribute_layer_rewards', {
        p_nft_level: level,
        p_payer_wallet: walletAddress,
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
    // Mint NFT using Thirdweb after successful purchase
    const nftMetadata = {
      name: `Beehive Level ${level} NFT`,
      description: `Level ${level} membership NFT for Beehive Platform`,
      image: `https://your-cdn.com/nft-level-${level}.png`, // Replace with actual URL
      level: level,
      wallet_address: walletAddress,
      mint_date: new Date().toISOString()
    };

    console.log(`Minting NFT Level ${level} for ${walletAddress}`);
    const mintResult = await mintNFT(walletAddress, level, nftMetadata);

    if (!mintResult.success) {
      console.error('NFT minting failed:', mintResult.error);
      // Still complete the database purchase even if NFT fails
      if (orderData) {
        await supabase.from('orders').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            ...orderData.metadata,
            nft_mint_failed: true,
            nft_error: mintResult.error
          }
        }).eq('id', orderData.id);
      }
    } else {
      // Update order with NFT transaction hash
      if (orderData) {
        await supabase.from('orders').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            ...orderData.metadata,
            nft_transaction_hash: mintResult.transactionHash,
            nft_token_id: mintResult.tokenId
          }
        }).eq('id', orderData.id);
      }
      console.log(`NFT Level ${level} minted successfully:`, mintResult);
    }

    // Log successful purchase
    console.log(`NFT Level ${level} purchase successful:`, {
      walletAddress,
      level,
      transactionHash,
      result: purchaseResult,
      nftMint: mintResult
    });
    return new Response(JSON.stringify({
      success: true,
      message: 'NFT upgrade processed successfully',
      data: {
        ...purchaseResult,
        nft: mintResult,
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
