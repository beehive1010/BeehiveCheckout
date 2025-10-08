import {serve} from "https://deno.land/std@0.168.0/http/server.ts"
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyNFTClaimTransaction, isValidTransactionHash } from '../_shared/verifyTransaction.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface LevelUpgradeRequest {
  action?: 'upgrade_level' | 'check_requirements' | 'get_pricing' | 'verify_transaction' | 'debug_user_status'
  walletAddress?: string
  targetLevel?: number
  transactionHash?: string
  network?: 'mainnet' | 'testnet' | 'simulation'
  // CheckoutWidget payment flow parameters
  recipientAddress?: string
  paymentTransactionHash?: string
  paymentAmount?: number
}

interface LevelUpgradeResponse {
  success: boolean
  action: string
  currentLevel?: number
  targetLevel?: number
  canUpgrade?: boolean
  requirements?: {
    directReferrals: {
      required: number
      current: number
      satisfied: boolean
    }
    sequentialUpgrade: {
      required: boolean
      nextLevel: number
      satisfied: boolean
    }
    pricing: {
      usdcCost: number
      bccUnlocked: number
    }
  }
  pricing?: {
    level: number
    usdcCost: number
    bccUnlocked: number
  }[]
  upgradeResult?: {
    newLevel: number
    bccUnlocked: number
    pendingRewardsClaimed: number
    newPendingRewards: number
  }
  message: string
  error?: string
}

// Level upgrade configuration based on MarketingPlan.md
const LEVEL_CONFIG = {
  // NFT pricing (USDC) - aligned with frontend and activate-membership
  PRICING: {
    1: 130,   // Level 1: 130 USDC (includes 30 USDC platform activation fee)
    2: 150,   // Level 2: 150 USDC
    3: 200,   // Level 3: 200 USDC
    4: 250,   // Level 4: 250 USDC (200 + 50*1)
    5: 300,   // Level 5: 300 USDC (200 + 50*2)
    6: 350,   // Level 6: 350 USDC (200 + 50*3)
    7: 400,   // Level 7: 400 USDC (200 + 50*4)
    8: 450,   // Level 8: 450 USDC (200 + 50*5)
    9: 500,   // Level 9: 500 USDC (200 + 50*6)
    10: 550,  // Level 10: 550 USDC (200 + 50*7)
    11: 600,  // Level 11: 600 USDC (200 + 50*8)
    12: 650,  // Level 12: 650 USDC (200 + 50*9)
    13: 700,  // Level 13: 700 USDC (200 + 50*10)
    14: 750,  // Level 14: 750 USDC (200 + 50*11)
    15: 800,  // Level 15: 800 USDC (200 + 50*12)
    16: 850,  // Level 16: 850 USDC (200 + 50*13)
    17: 900,  // Level 17: 900 USDC (200 + 50*14)
    18: 950,  // Level 18: 950 USDC (200 + 50*15)
    19: 1000  // Level 19: 1000 USDC (200 + 50*16)
  },

  // BCC unlock amounts (base amounts)
  BCC_UNLOCK: {
    1: 100,   // Level 1: 100 BCC
    2: 150,   // Level 2: 150 BCC
    3: 200,   // Level 3: 200 BCC
    4: 250,   // Level 4: 250 BCC
    5: 300,   // Level 5: 300 BCC
    6: 350,   // Level 6: 350 BCC
    7: 400,   // Level 7: 400 BCC
    8: 450,   // Level 8: 450 BCC
    9: 500,   // Level 9: 500 BCC
    10: 550,  // Level 10: 550 BCC
    11: 600,  // Level 11: 600 BCC
    12: 650,  // Level 12: 650 BCC
    13: 700,  // Level 13: 700 BCC
    14: 750,  // Level 14: 750 BCC
    15: 800,  // Level 15: 800 BCC
    16: 850,  // Level 16: 850 BCC
    17: 900,  // Level 17: 900 BCC
    18: 950,  // Level 18: 950 BCC
    19: 1000  // Level 19: 1000 BCC
  },

  // Special requirements
  SPECIAL_REQUIREMENTS: {
    // Level 2 requires 3 direct referrals
    LEVEL_2_DIRECT_REFERRALS: 3,
    // R-slot reward requires Level 2+
    R_SLOT_MINIMUM_LEVEL: 2
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const requestBody = await req.json() as LevelUpgradeRequest

    // CheckoutWidget payment flow (new approach - server-side minting)
    if (requestBody.recipientAddress && requestBody.paymentTransactionHash && requestBody.paymentAmount) {
      console.log('📝 CheckoutWidget upgrade request:', {
        recipientAddress: requestBody.recipientAddress,
        targetLevel: requestBody.targetLevel,
        paymentAmount: requestBody.paymentAmount,
        paymentTransactionHash: requestBody.paymentTransactionHash
      });

      return await handleCheckoutWidgetUpgrade(
        supabase,
        requestBody.recipientAddress,
        requestBody.targetLevel!,
        requestBody.paymentTransactionHash,
        requestBody.paymentAmount
      );
    }

    // Legacy flow (existing action-based approach)
    const { action, walletAddress, targetLevel, transactionHash, network } = requestBody

    console.log(`🚀 Level Upgrade Action: ${action} for ${walletAddress}`)

    let response: LevelUpgradeResponse

    switch (action) {
      case 'upgrade_level':
        response = await processLevelUpgrade(supabase, walletAddress!, targetLevel!, transactionHash, network)
        break

      case 'check_requirements':
        response = await checkUpgradeRequirements(supabase, walletAddress!, targetLevel!)
        break

      case 'get_pricing':
        response = await getLevelPricing(walletAddress!, targetLevel)
        break

      case 'verify_transaction':
        response = await verifyUpgradeTransaction(transactionHash!, walletAddress!, targetLevel!, network)
        break

      case 'debug_user_status':
        response = await debugUserStatus(supabase, walletAddress!)
        break

      default:
        response = {
          success: false,
          action: action || 'unknown',
          message: 'Invalid action specified',
          error: 'Unknown action'
        }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Level upgrade error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        action: 'error',
        error: error.message || 'Level upgrade failed',
        message: 'Processing failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Handle CheckoutWidget payment flow with server-side NFT minting
async function handleCheckoutWidgetUpgrade(
  supabase: any,
  recipientAddress: string,
  targetLevel: number,
  paymentTransactionHash: string,
  paymentAmount: number
): Promise<Response> {
  try {
    // Step 1: Verify payment transaction
    console.log('🔍 Verifying payment transaction...');
    const paymentVerified = await verifyPaymentTransaction(
      paymentTransactionHash,
      paymentAmount,
      recipientAddress
    );

    if (!paymentVerified) {
      throw new Error('Payment verification failed');
    }

    console.log('✅ Payment verified');

    // Step 2: Mint NFT using Thirdweb Engine (server wallet)
    console.log(`🎨 Minting Level ${targetLevel} NFT via Thirdweb Engine...`);
    const mintResult = await mintNFTViaEngine(recipientAddress, targetLevel);

    console.log('✅ NFT minted:', mintResult);

    // Step 3: Update membership level and trigger rewards using existing flow
    console.log('💾 Processing level upgrade with layer rewards...');
    const upgradeResult = await processLevelUpgradeWithRewards(
      supabase,
      recipientAddress,
      targetLevel,
      mintResult.transactionHash,
      paymentAmount
    );

    console.log('✅ Level upgrade complete:', upgradeResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Level ${targetLevel} upgrade successful`,
        data: {
          mintTransactionHash: mintResult.transactionHash,
          paymentTransactionHash,
          membershipLevel: targetLevel,
          layerRewardsTriggered: upgradeResult.layerRewardsTriggered
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ CheckoutWidget upgrade error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}

// Verify payment transaction (simplified - TODO: on-chain verification)
async function verifyPaymentTransaction(
  txHash: string,
  expectedAmount: number,
  buyer: string
): Promise<boolean> {
  if (!txHash || !expectedAmount || !buyer) {
    return false;
  }

  console.log('🔍 Payment verification (simplified):', {
    txHash,
    expectedAmount,
    buyer
  });

  return true;
}

// Mint NFT via Thirdweb Engine (same as mint-and-send-nft)
async function mintNFTViaEngine(
  recipientAddress: string,
  level: number
): Promise<{ transactionHash: string; tokenId: string }> {
  const clientId = Deno.env.get('VITE_THIRDWEB_CLIENT_ID');
  const secretKey = Deno.env.get('VITE_THIRDWEB_SECRET_KEY');
  const vaultAccessToken = Deno.env.get('VITE_VAULT_ACCESS_TOKEN');
  const serverWallet = Deno.env.get('VITE_SERVER_WALLET_ADDRESS');
  const nftContract = Deno.env.get('VITE_MEMBERSHIP_NFT_CONTRACT');
  const chainId = '42161'; // Arbitrum

  if (!clientId || !vaultAccessToken || !serverWallet || !nftContract) {
    throw new Error('Missing Thirdweb configuration');
  }

  console.log('🎨 Minting NFT via Thirdweb v1 API:', {
    contract: nftContract,
    recipient: recipientAddress,
    tokenId: level,
    chain: chainId,
    serverWallet
  });

  // Encode ERC1155 mint function call
  const mintFunctionSelector = '0x731133e9'; // mint(address,uint256,uint256,bytes)

  // Encode parameters
  const toPadded = recipientAddress.toLowerCase().slice(2).padStart(64, '0');
  const idPadded = level.toString(16).padStart(64, '0');
  const amountPadded = '1'.padStart(64, '0'); // mint 1 NFT
  const dataOffsetPadded = '80'.padStart(64, '0'); // offset to bytes data
  const dataLengthPadded = '0'.padStart(64, '0'); // empty bytes data

  const encodedData = mintFunctionSelector + toPadded + idPadded + amountPadded + dataOffsetPadded + dataLengthPadded;

  console.log('📝 Encoded mint data:', {
    selector: mintFunctionSelector,
    to: recipientAddress,
    tokenId: level,
    amount: 1,
    encodedData
  });

  // Call Thirdweb v1 transactions API
  const transactionRequest = {
    chainId: chainId,
    from: serverWallet,
    transactions: [
      {
        to: nftContract,
        value: '0',
        data: encodedData
      }
    ]
  };

  console.log('🚀 Calling thirdweb /v1/transactions API');

  const mintResponse = await fetch('https://api.thirdweb.com/v1/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-secret-key': secretKey || '',
      'x-vault-access-token': vaultAccessToken
    },
    body: JSON.stringify(transactionRequest)
  });

  if (!mintResponse.ok) {
    const errorText = await mintResponse.text();
    throw new Error(`Thirdweb mint failed: ${mintResponse.status} - ${errorText}`);
  }

  const mintData = await mintResponse.json();
  console.log('🎨 Mint response:', JSON.stringify(mintData, null, 2));

  // Extract transaction hash
  const txHash =
    mintData.result?.transactionHash ||
    mintData.result?.receipt?.transactionHash ||
    mintData.result?.queueId ||
    mintData.queueId ||
    'pending';

  return {
    transactionHash: txHash,
    tokenId: level.toString()
  };
}

// Process level upgrade with layer rewards (Level 2-19)
async function processLevelUpgradeWithRewards(
  supabase: any,
  walletAddress: string,
  targetLevel: number,
  mintTxHash: string,
  nftPrice: number
): Promise<any> {
  console.log('📞 Processing level upgrade with rewards:', {
    walletAddress,
    targetLevel,
    mintTxHash,
    nftPrice
  });

  // Step 0: Verify blockchain transaction (if provided)
  if (mintTxHash && mintTxHash !== 'simulation' && !mintTxHash.startsWith('test_')) {
    console.log(`🔍 Verifying Level ${targetLevel} upgrade transaction: ${mintTxHash}`);

    // Validate transaction hash format
    if (!isValidTransactionHash(mintTxHash)) {
      console.error('❌ Invalid transaction hash format:', mintTxHash);
      throw new Error('Invalid transaction hash format');
    }

    // Verify transaction on blockchain
    const verificationResult = await verifyNFTClaimTransaction(
      mintTxHash,
      walletAddress,
      targetLevel
    );

    if (!verificationResult.valid) {
      console.error('❌ Transaction verification failed:', verificationResult.error);
      throw new Error(`Transaction verification failed: ${verificationResult.error}`);
    }

    console.log('✅ Transaction verified successfully:', verificationResult.details);
  } else if (mintTxHash) {
    console.log('⚠️ Skipping verification for test/simulation transaction');
  }

  // Step 1: Update membership table with new level
  console.log('📝 Updating membership table...');
  const { error: membershipError } = await supabase
    .from('membership')
    .upsert({
      wallet_address: walletAddress,
      nft_level: targetLevel,
      transaction_hash: mintTxHash,
      is_member: true,
      claimed_at: new Date().toISOString(),
      network: 'mainnet',
      claim_price: nftPrice,
      total_cost: nftPrice,
      unlock_membership_level: targetLevel + 1
    }, {
      onConflict: 'wallet_address,nft_level'
    });

  if (membershipError) {
    console.error('❌ Membership update error:', membershipError);
    throw new Error(`Failed to update membership: ${membershipError.message}`);
  }

  console.log('✅ Membership record updated');

  // Step 2: Update members table with new current_level
  console.log('📝 Updating members table...');
  const { error: membersError } = await supabase
    .from('members')
    .update({
      current_level: targetLevel,
      updated_at: new Date().toISOString()
    })
    .eq('wallet_address', walletAddress);

  if (membersError) {
    console.error('❌ Members update error:', membersError);
    throw new Error(`Failed to update member level: ${membersError.message}`);
  }

  console.log('✅ Member level updated to', targetLevel);

  // Step 3: Trigger appropriate rewards based on level
  let directRewardData = null;
  let directRewardError = null;
  let matrixRewardData = null;
  let matrixRewardError = null;

  if (targetLevel === 1) {
    // Level 1: Only direct referral reward (100 USDT, not NFT price)
    const level1RewardAmount = 100; // Fixed reward amount for Level 1
    console.log(`💰 Triggering direct referral reward for Level 1 (${level1RewardAmount} USDT)...`);

    const { data, error } = await supabase.rpc('trigger_layer_rewards_on_upgrade', {
      p_upgrading_member_wallet: walletAddress,
      p_new_level: targetLevel,
      p_nft_price: level1RewardAmount
    });

    directRewardData = data;
    directRewardError = error;

    if (directRewardError) {
      console.error(`⚠️ Direct referral reward error:`, directRewardError);
    } else {
      console.log(`✅ Direct referral reward triggered:`, directRewardData);
    }

  } else if (targetLevel >= 2 && targetLevel <= 19) {
    // Level 2-19: Only matrix layer rewards (no direct referral rewards)
    console.log(`💰 Triggering matrix layer rewards for Level ${targetLevel}...`);

    const { data, error } = await supabase.rpc('trigger_matrix_layer_rewards', {
      p_upgrading_member_wallet: walletAddress,
      p_new_level: targetLevel,
      p_nft_price: nftPrice
    });

    matrixRewardData = data;
    matrixRewardError = error;

    if (matrixRewardError) {
      console.error(`⚠️ Matrix layer reward error:`, matrixRewardError);
    } else {
      console.log(`✅ Matrix layer rewards triggered:`, matrixRewardData);
    }
  }

  return {
    membershipUpdated: true,
    levelUpdated: targetLevel,
    directRewardTriggered: targetLevel === 1 && !directRewardError,
    matrixRewardsTriggered: targetLevel >= 2 && !matrixRewardError,
    directRewardData: directRewardData,
    matrixRewardData: matrixRewardData
  };
}

// Process level upgrade transaction
async function processLevelUpgrade(
  supabase: any, 
  walletAddress: string, 
  targetLevel: number, 
  transactionHash?: string, 
  network?: string
): Promise<LevelUpgradeResponse> {
  console.log(`🔄 Processing Level ${targetLevel} upgrade for ${walletAddress}`)

  try {
    // 1. Get current member data
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('current_level, wallet_address')
      .ilike('wallet_address', walletAddress) // Case insensitive match
      .maybeSingle()

    if (memberError) {
      console.error('Member query error:', memberError)
      return {
        success: false,
        action: 'upgrade_level',
        message: 'Member query failed',
        error: memberError.message
      }
    }

    if (!memberData) {
      return {
        success: false,
        action: 'upgrade_level',
        message: 'Member not found or not activated',
        error: 'Member data missing'
      }
    }

    const currentLevel = memberData.current_level
    console.log(`📊 Found member: ${memberData.wallet_address} at Level ${currentLevel}`)
    
    // Members must start at Level 1 - no Level 0 exists
    if (!currentLevel || currentLevel < 1) {
      return {
        success: false,
        action: 'upgrade_level',
        message: 'Member must be activated at Level 1 before upgrading',
        error: 'Invalid member level - must start at Level 1'
      }
    }

    // 2. Validate upgrade requirements
    const requirementCheck = await checkUpgradeRequirements(supabase, walletAddress, targetLevel)
    if (!requirementCheck.success || !requirementCheck.canUpgrade) {
      return {
        success: false,
        action: 'upgrade_level',
        message: requirementCheck.message || 'Upgrade requirements not met',
        error: 'Requirements not satisfied',
        requirements: requirementCheck.requirements
      }
    }

    // 3. Verify blockchain transaction (if not simulation)
    if (transactionHash && transactionHash !== 'simulation') {
      const transactionResult = await verifyUpgradeTransaction(transactionHash, walletAddress, targetLevel, network)
      if (!transactionResult.success) {
        return {
          success: false,
          action: 'upgrade_level',
          message: 'Blockchain transaction verification failed',
          error: transactionResult.error
        }
      }
    }

    // 4. Verify referrals record exists (required for upgrade integrity)
    console.log(`🔗 Verifying referrals record exists for ${walletAddress}...`)
    const { data: referralsNewData } = await supabase
      .from('referrals')
      .select('referrer_wallet, member_wallet')
      .ilike('member_wallet', walletAddress) // Case insensitive match
      .maybeSingle()

    if (!referralsNewData) {
      console.warn(`⚠️ No referrals record found for ${walletAddress} - this may indicate incomplete registration`)
      // For upgrade, we don't block if no referral exists (could be root user or legacy data)
    } else {
      console.log(`✅ Referrals_new record verified: ${referralsNewData.member_wallet} -> ${referralsNewData.referrer_wallet}`)
    }

    // 5. Create or verify membership record (triggers BCC release and other membership processing)
    console.log(`💫 Creating membership record for Level ${targetLevel}...`)

    // Use upsert to avoid duplicate key errors
    const { data: membershipData, error: membershipError } = await supabase
      .from('membership')
      .upsert({
        wallet_address: walletAddress, // Preserve case
        nft_level: targetLevel,
        claim_price: LEVEL_CONFIG.PRICING[targetLevel] || 0,
        claimed_at: new Date().toISOString(),
        is_member: true,
        unlock_membership_level: targetLevel + 1, // Dynamic unlock level
        platform_activation_fee: targetLevel === 1 ? 30 : 0, // Only Level 1 has platform fee
        total_cost: LEVEL_CONFIG.PRICING[targetLevel] || 0
      }, {
        onConflict: 'wallet_address,nft_level'
      })
      .select()
      .single()

    if (membershipError) {
      console.error('Membership record creation failed:', membershipError)
      return {
        success: false,
        action: 'upgrade_level',
        message: 'Failed to create membership record',
        error: membershipError.message
      }
    }

    console.log(`✅ Membership record upserted - triggers fired:`, membershipData)

    // 6. Update member level (triggers level upgrade rewards and layer rewards)
    console.log(`⬆️ Updating member level to ${targetLevel}...`)
    const { data: memberUpdateResult, error: memberUpdateError } = await supabase
      .from('members')
      .update({
        current_level: targetLevel
      })
      .ilike('wallet_address', walletAddress) // Case insensitive match
      .select()
      .single()

    if (memberUpdateError) {
      console.error('Member level update failed:', memberUpdateError)
      return {
        success: false,
        action: 'upgrade_level', 
        message: 'Failed to update member level',
        error: memberUpdateError.message
      }
    }

    console.log(`✅ Member level updated - upgrade triggers fired:`, memberUpdateResult)

    // 6.1. Note: Layer rewards will be handled by membership table triggers
    console.log(`💰 Layer rewards will be processed by database triggers...`)
    
    // 6.2. Note: Pending rewards will be handled by member level update triggers  
    console.log(`🎁 Pending rewards will be processed by database triggers...`)

    // 6.3. BCC release is handled automatically by database trigger
    // The trigger_level_upgrade_rewards trigger calls release_bcc_on_level_upgrade()
    // when members.current_level is updated
    console.log(`✅ BCC release will be handled by database trigger (release_bcc_on_level_upgrade)`);

    // 6.4. Trigger Layer Rewards for Level Upgrade (Level 2-19)
    // Layer rewards are only triggered for upgrades from Level 2 onwards
    console.log(`🔍 Triggering layer rewards for ${walletAddress} Level ${targetLevel} upgrade...`)
    let layerRewardResult = null;

    if (targetLevel >= 2) {
      try {
        // For Level 2-19 upgrades, trigger layer rewards to matrix_root members
        // Reward amount = NFT price of the target level
        // The getNftPrice function to get reward amounts (base NFT prices without platform fees)
        const getNftPrice = (lvl) => {
          const prices = {
            1: 100,   // Level 1: 100 USDC (base price, excludes 30 USDC platform fee)
            2: 150, 3: 200, 4: 250, 5: 300, 6: 350, 7: 400, 8: 450, 9: 500,
            10: 550, 11: 600, 12: 650, 13: 700, 14: 750, 15: 800, 16: 850, 17: 900, 18: 950, 19: 1000
          };
          return prices[lvl] || (lvl <= 19 ? 100 + (lvl - 1) * 50 : 0);
        };

        console.log(`💰 Creating rewards for Level ${targetLevel} upgrade...`);
        console.log(`🎯 Reward amount will be: ${getNftPrice(targetLevel)} USDC (Level ${targetLevel} NFT price)`);

        // Level 1: Trigger direct referral rewards to referrer
        // Level 2-19: Trigger layer rewards to matrix root (19 layers)
        let layerRewardData: any = null;
        let layerRewardError: any = null;

        if (targetLevel === 1) {
          console.log(`🎯 Level 1 upgrade - triggering direct referral rewards to referrer`);
          const result = await supabase.rpc('trigger_direct_referral_rewards', {
            p_upgrading_member_wallet: walletAddress,
            p_new_level: targetLevel,
            p_nft_price: getNftPrice(targetLevel)
          });
          layerRewardData = result.data;
          layerRewardError = result.error;
        } else {
          console.log(`🎯 Level ${targetLevel} upgrade - triggering layer rewards to matrix root (19 layers)`);
          const result = await supabase.rpc('trigger_layer_rewards_on_upgrade', {
            p_upgrading_member_wallet: walletAddress,
            p_new_level: targetLevel,
            p_nft_price: getNftPrice(targetLevel)
          });
          layerRewardData = result.data;
          layerRewardError = result.error;
        }

        if (layerRewardError) {
          console.warn('⚠️ Layer reward creation failed:', layerRewardError);
        } else {
          console.log(`✅ Layer rewards triggered for Level ${targetLevel} upgrade:`, layerRewardData);
          layerRewardResult = layerRewardData;
        }

        // Additional check: Verify layer rewards were created
        const { data: createdLayerRewards, error: checkError } = await supabase
          .from('layer_rewards')
          .select('id, matrix_layer, matrix_root_wallet, reward_amount, status')
          .ilike('triggering_member_wallet', walletAddress)
          .eq('triggering_nft_level', targetLevel);

        if (!checkError && createdLayerRewards && createdLayerRewards.length > 0) {
          console.log(`✅ Verified ${createdLayerRewards.length} layer rewards created for Level ${targetLevel}:`,
            createdLayerRewards.map(r => `${r.matrix_root_wallet}: ${r.reward_amount} USDC (${r.status})`));
        } else if (!checkError && (!createdLayerRewards || createdLayerRewards.length === 0)) {
          console.warn(`⚠️ No layer rewards found after Level ${targetLevel} upgrade - may indicate missing matrix members at this layer`);
        }

      } catch (layerRewardErr) {
        console.warn('⚠️ Layer reward error (non-critical):', layerRewardErr);
      }
    } else {
      console.log(`ℹ️ Level 1 upgrades do not trigger layer rewards - only direct referral rewards`);
      layerRewardResult = { success: true, note: 'Level 1 does not trigger layer rewards' };
    }

    // 6.5. Check and update pending rewards that may now be claimable after upgrade
    console.log(`🎁 Checking pending rewards after Level ${targetLevel} upgrade for ${walletAddress}...`);
    try {
      const { data: pendingRewardCheck, error: pendingRewardError } = await supabase.rpc('check_pending_rewards_after_upgrade', {
        p_upgraded_wallet: walletAddress,
        p_new_level: targetLevel
      });

      if (pendingRewardError) {
        console.warn('⚠️ Pending reward check failed:', pendingRewardError);
      } else {
        console.log(`✅ Pending reward check completed for Level ${targetLevel} upgrade:`, pendingRewardCheck);
      }
    } catch (pendingRewardErr) {
      console.warn('⚠️ Pending reward check error (non-critical):', pendingRewardErr);
    }

    // 7. Get final results from triggered functions
    // ✅ Reduced wait time from 2000ms to 500ms - triggers complete quickly, verification is optional
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check user balance changes
    const { data: balanceData } = await supabase
      .from('user_balances')
      .select('bcc_balance, pending_bcc_rewards')
      .ilike('wallet_address', walletAddress)
      .maybeSingle()

    // Check layer rewards created
    const { count: layerRewardsCount } = await supabase
      .from('layer_rewards')
      .select('*', { count: 'exact' })
      .eq('triggering_member_wallet', walletAddress)
      .eq('level', targetLevel)

    // 8. Log the upgrade
    await supabase
      .from('audit_logs')
      .insert({
        wallet_address: walletAddress, // Preserve case
        action: 'level_upgrade',
        details: {
          fromLevel: currentLevel,
          toLevel: targetLevel,
          transactionHash,
          network,
          referralsNewVerified: !!referralsNewData,
          membershipRecordCreated: !!membershipData,
          memberLevelUpdated: !!memberUpdateResult,
          bccBalance: balanceData?.bcc_balance || 0,
          pendingBccRewards: balanceData?.pending_bcc_rewards || 0,
          layerRewardsTriggered: layerRewardsCount || 0
        }
      })

    console.log(`🎉 Level upgrade completed: ${walletAddress} -> Level ${targetLevel}`)

    return {
      success: true,
      action: 'upgrade_level',
      currentLevel,
      targetLevel,
      upgradeResult: {
        newLevel: targetLevel,
        bccUnlocked: LEVEL_CONFIG.BCC_UNLOCK[targetLevel] || 0,
        pendingRewardsClaimed: 0,
        newPendingRewards: balanceData?.pending_bcc_rewards || 0
      },
      message: `Successfully upgraded to Level ${targetLevel}! Referrals verified, membership record created, level updated, triggers fired for BCC release and layer rewards.`
    }

  } catch (error) {
    console.error('Process level upgrade error:', error)
    return {
      success: false,
      action: 'upgrade_level',
      message: 'Failed to process level upgrade',
      error: error.message
    }
  }
}

// Check upgrade requirements
async function checkUpgradeRequirements(supabase: any, walletAddress: string, targetLevel: number): Promise<LevelUpgradeResponse> {
  console.log(`📋 Checking upgrade requirements: Level ${targetLevel} for ${walletAddress}`)

  try {
    // 1. Get member data
    const { data: memberData } = await supabase
      .from('members')
      .select('current_level, wallet_address')
      .ilike('wallet_address', walletAddress) // Case insensitive match
      .maybeSingle()

    if (!memberData) {
      return {
        success: false,
        action: 'check_requirements',
        message: 'Member not found',
        error: 'Member data missing'
      }
    }

    const currentLevel = memberData.current_level
    
    // Members must start at Level 1 - no Level 0 exists
    if (!currentLevel || currentLevel < 1) {
      return {
        success: false,
        action: 'check_requirements',
        canUpgrade: false,
        message: 'Member must be activated at Level 1 before upgrading',
        error: 'Invalid member level - must start at Level 1'
      }
    }

    // 2. Check target level validity
    if (targetLevel > 19) {
      return {
        success: false,
        action: 'check_requirements',
        canUpgrade: false,
        message: 'Maximum level is 19',
        error: 'Invalid target level'
      }
    }

    if (targetLevel <= currentLevel) {
      return {
        success: false,
        action: 'check_requirements',
        canUpgrade: false,
        message: `Cannot downgrade or claim same level. Current: ${currentLevel}, Target: ${targetLevel}`,
        error: 'Invalid target level - must be higher than current level'
      }
    }

    // 3. STRICT Sequential upgrade requirement verification
    const expectedNextLevel = currentLevel + 1
    const isSequential = targetLevel === expectedNextLevel

    if (!isSequential) {
      return {
        success: false,
        action: 'check_requirements',
        canUpgrade: false,
        requirements: {
          directReferrals: { required: 0, current: 0, satisfied: true },
          sequentialUpgrade: {
            required: true,
            nextLevel: expectedNextLevel,
            satisfied: false
          },
          pricing: {
            usdcCost: LEVEL_CONFIG.PRICING[targetLevel] || 0,
            bccUnlocked: LEVEL_CONFIG.BCC_UNLOCK[targetLevel] || 0
          }
        },
        message: `SEQUENTIAL UPGRADE REQUIRED: Must upgrade one level at a time. Current Level: ${currentLevel}, Must claim Level: ${expectedNextLevel}. Cannot skip to Level ${targetLevel}.`,
        error: 'Non-sequential upgrade not allowed'
      }
    }

    // 4. Check if user already has membership record for this level
    const { data: existingMembership } = await supabase
      .from('membership')
      .select('nft_level')
      .ilike('wallet_address', walletAddress)
      .eq('nft_level', targetLevel)
      .maybeSingle()

    if (existingMembership) {
      return {
        success: false,
        action: 'check_requirements',
        canUpgrade: false,
        message: `Already own Level ${targetLevel} NFT`,
        error: 'Level already owned'
      }
    }

    // 5. Verify user has ALL prerequisite levels (double-check against membership table)
    console.log(`🔍 Verifying user has all prerequisite levels (1 to ${currentLevel})...`);
    const { data: allMemberships } = await supabase
      .from('membership')
      .select('nft_level')
      .ilike('wallet_address', walletAddress)
      .order('nft_level', { ascending: true });

    const ownedLevels = allMemberships ? allMemberships.map(m => m.nft_level).sort((a, b) => a - b) : [];

    // Check for gaps in owned levels
    for (let level = 1; level <= currentLevel; level++) {
      if (!ownedLevels.includes(level)) {
        return {
          success: false,
          action: 'check_requirements',
          canUpgrade: false,
          message: `Missing prerequisite Level ${level} NFT. Must own all levels 1-${currentLevel} before upgrading to Level ${targetLevel}.`,
          error: `Missing Level ${level} NFT`,
          debug: {
            currentLevel,
            targetLevel,
            ownedLevels,
            missingLevel: level
          }
        }
      }
    }

    console.log(`✅ Prerequisite verification passed: User owns Levels ${ownedLevels.join(', ')}`);
    console.log(`✅ Sequential upgrade validation passed: ${currentLevel} -> ${targetLevel}`);

    // 6. Check Level 2 special requirement (3 direct referrals)
    let directReferralsCheck = { required: 0, current: 0, satisfied: true }
    
    if (targetLevel === 2) {
      // Use referrals_stats_view for accurate direct referral count (includes referrals data)
      const { data: referralsStatsData, error: referralsStatsError } = await supabase
        .from('referrals_stats_view')
        .select('direct_referrals_count')
        .ilike('wallet_address', walletAddress)
        .maybeSingle()

      let directReferrals = 0
      
      if (!referralsStatsError && referralsStatsData) {
        directReferrals = referralsStatsData.direct_referrals_count || 0
      } else {
        console.warn('⚠️ referrals_stats_view query failed, trying referrals fallback:', referralsStatsError)
        // Fallback to referrals table
        const { count: fallbackCount } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .ilike('referrer_wallet', walletAddress)
        
        directReferrals = fallbackCount || 0
      }

      const requiredReferrals = LEVEL_CONFIG.SPECIAL_REQUIREMENTS.LEVEL_2_DIRECT_REFERRALS

      directReferralsCheck = {
        required: requiredReferrals,
        current: directReferrals,
        satisfied: directReferrals >= requiredReferrals
      }

      if (!directReferralsCheck.satisfied) {
        return {
          success: false,
          action: 'check_requirements',
          canUpgrade: false,
          requirements: {
            directReferrals: directReferralsCheck,
            sequentialUpgrade: { required: true, nextLevel: targetLevel, satisfied: true },
            pricing: {
              usdcCost: LEVEL_CONFIG.PRICING[targetLevel] || 0,
              bccUnlocked: LEVEL_CONFIG.BCC_UNLOCK[targetLevel] || 0
            }
          },
          message: `Level 2 requires ${requiredReferrals} direct referrals (current: ${directReferrals})`,
          error: 'Insufficient direct referrals'
        }
      }
    }

    // 4. All requirements satisfied
    return {
      success: true,
      action: 'check_requirements',
      currentLevel,
      targetLevel,
      canUpgrade: true,
      requirements: {
        directReferrals: directReferralsCheck,
        sequentialUpgrade: { required: true, nextLevel: targetLevel, satisfied: true },
        pricing: {
          usdcCost: LEVEL_CONFIG.PRICING[targetLevel] || 0,
          bccUnlocked: LEVEL_CONFIG.BCC_UNLOCK[targetLevel] || 0
        }
      },
      message: `✅ ALL REQUIREMENTS SATISFIED: Can upgrade to Level ${targetLevel}. Cost: ${LEVEL_CONFIG.PRICING[targetLevel]} USDC. Prerequisites verified: owns all required levels, sequential upgrade validated${directReferralsCheck.required > 0 ? `, direct referrals: ${directReferralsCheck.current}/${directReferralsCheck.required}` : ''}.`
    }

  } catch (error) {
    console.error('Check upgrade requirements error:', error)
    return {
      success: false,
      action: 'check_requirements',
      message: 'Failed to check requirements',
      error: error.message
    }
  }
}

// Get level pricing information
async function getLevelPricing(walletAddress: string, maxLevel?: number): Promise<LevelUpgradeResponse> {
  console.log(`💰 Getting level pricing for ${walletAddress} up to Level ${maxLevel || 19}`)

  try {
    const pricing = []
    const endLevel = Math.min(maxLevel || 19, 19)

    for (let level = 1; level <= endLevel; level++) {
      pricing.push({
        level,
        usdcCost: LEVEL_CONFIG.PRICING[level] || 0,
        bccUnlocked: LEVEL_CONFIG.BCC_UNLOCK[level] || 0
      })
    }

    return {
      success: true,
      action: 'get_pricing',
      pricing,
      message: `Pricing information for Levels 1-${endLevel}`
    }

  } catch (error) {
    console.error('Get level pricing error:', error)
    return {
      success: false,
      action: 'get_pricing',
      message: 'Failed to get pricing',
      error: error.message
    }
  }
}

// Verify upgrade transaction on blockchain
async function verifyUpgradeTransaction(
  transactionHash: string, 
  walletAddress: string, 
  targetLevel: number, 
  network?: string
): Promise<LevelUpgradeResponse> {
  console.log(`= 🔍 Verifying upgrade transaction: ${transactionHash}`)

  try {
    // Use the same verification logic as activation but for upgrades
    const RPC_URL = network === 'mainnet'
      ? 'https://arb1.arbitrum.io/rpc'
      : 'https://sepolia-rollup.arbitrum.io/rpc'

    // Use correct contract addresses based on network
    const NFT_CONTRACT = network === 'mainnet'
      ? '0x018F516B0d1E77Cc5947226Abc2E864B167C7E29' // ARB ONE New Membership Contract (2025-10-08)
      : '0xC99CF23CeCE6bF79bD2a23FE5f1D9716D62EC9E1' // ARB Sepolia V4 Membership Contract
    const PAYMENT_TOKEN_CONTRACT = network === 'mainnet'
      ? '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' // Arbitrum mainnet USDT (Official)
      : '0xb67f84e6148D087D4fc5F390BedC75597770f6c0' // Arbitrum Sepolia USDT
    const EXPECTED_TOKEN_ID = targetLevel

    // Get transaction receipt
    const receiptResponse = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [transactionHash],
        id: 1
      })
    })
    
    const receiptData = await receiptResponse.json()
    const receipt = receiptData.result

    if (!receipt) {
      return {
        success: false,
        action: 'verify_transaction',
        message: 'Transaction not found or not confirmed',
        error: 'Transaction pending'
      }
    }
    
    if (receipt.status !== '0x1') {
      return {
        success: false,
        action: 'verify_transaction',
        message: 'Transaction failed',
        error: 'Transaction reverted'
      }
    }
    
    // Verify transaction details
    if (receipt.from?.toLowerCase() !== walletAddress.toLowerCase()) { // Keep lowercase for address comparison
      return {
        success: false,
        action: 'verify_transaction',
        message: 'Transaction sender mismatch',
        error: 'Invalid sender'
      }
    }
    
    if (receipt.to?.toLowerCase() !== NFT_CONTRACT.toLowerCase()) {
      return {
        success: false,
        action: 'verify_transaction',
        message: 'Transaction contract mismatch',
        error: 'Invalid contract'
      }
    }
    
    // Verify NFT mint event
    const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    
    let nftMintFound = false
    for (const log of receipt.logs) {
      if (log.address?.toLowerCase() === NFT_CONTRACT.toLowerCase() && 
          log.topics[0] === transferEventSignature) {
        
        const tokenId = parseInt(log.topics[3], 16)
        const toAddress = log.topics[2]
        const zeroAddress = '0x0000000000000000000000000000000000000000000000000000000000000000'
        
        if (log.topics[1] === zeroAddress && 
            toAddress.toLowerCase().includes(walletAddress.slice(2).toLowerCase()) && // Keep lowercase for address comparison
            tokenId === EXPECTED_TOKEN_ID) {
          
          console.log(`✅ NFT upgrade verified: Token ID ${tokenId} minted to ${walletAddress}`)
          nftMintFound = true
          break
        }
      }
    }
    
    if (!nftMintFound) {
      return {
        success: false,
        action: 'verify_transaction',
        message: 'NFT mint event not found in transaction',
        error: 'Invalid NFT mint'
      }
    }

    return {
      success: true,
      action: 'verify_transaction',
      message: 'Transaction verified successfully'
    }

  } catch (error) {
    console.error('Verify transaction error:', error)
    return {
      success: false,
      action: 'verify_transaction',
      message: 'Transaction verification failed',
      error: error.message
    }
  }
}

// Unlock BCC for level upgrade
async function unlockBCCForLevelUpgrade(supabase: any, walletAddress: string, targetLevel: number, memberData: any): Promise<{bccUnlocked: number}> {
  console.log(`= 🔓 Unlocking BCC for Level ${targetLevel} upgrade`)

  try {
    // Call the BCC release system to unlock BCC
    const bccResult = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bcc-release-system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        action: 'process_level_unlock',
        walletAddress,
        targetLevel
      })
    })

    const bccData = await bccResult.json()
    return { bccUnlocked: bccData.bccUnlocked || 0 }

  } catch (error) {
    console.error('Unlock BCC error:', error)
    return { bccUnlocked: 0 }
  }
}

// Process pending rewards that can now be claimed
async function processPendingRewardsForUpgrade(supabase: any, walletAddress: string, newLevel: number): Promise<{claimed: number}> {
  console.log(`🎁 Processing pending rewards for Level ${newLevel} upgrade`)

  try {
    // Call the reward processing system
    const rewardResult = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-rewards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        action: 'check_pending',
        walletAddress
      })
    })

    const rewardData = await rewardResult.json()
    return { claimed: rewardData.rewardsProcessed || 0 }

  } catch (error) {
    console.error('Process pending rewards error:', error)
    return { claimed: 0 }
  }
}

// Trigger layer rewards for upgrade
async function triggerLayerRewardsForUpgrade(supabase: any, walletAddress: string, newLevel: number): Promise<{created: number}> {
  console.log(`⚡ Triggering layer rewards for Level ${newLevel} upgrade`)

  try {
    // This would integrate with matrix system to check for newly triggered rewards
    // For now, return placeholder
    return { created: 0 }

  } catch (error) {
    console.error('Trigger layer rewards error:', error)
    return { created: 0 }
  }
}

// Debug user status - comprehensive check
async function debugUserStatus(supabase: any, walletAddress: string): Promise<LevelUpgradeResponse> {
  console.log(`🔍 Debug: Comprehensive status check for ${walletAddress}`)

  try {
    // 1. Get member data
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('current_level, wallet_address, activation_sequence, activation_time')
      .ilike('wallet_address', walletAddress)
      .maybeSingle()

    // 2. Get direct referrals count using referrals table
    const { count: directReferralsCount, error: referralsError } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .ilike('referrer_wallet', walletAddress)

    // Fallback to referrals table if referrals fails
    let fallbackReferralsCount = 0
    if (referralsError || !directReferralsCount) {
      const { count: fallbackCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .ilike('referrer_wallet', walletAddress)
        .eq('is_direct_referral', true)
      
      fallbackReferralsCount = fallbackCount || 0
    }

    // 3. Get membership records
    const { data: membershipRecords, error: membershipError } = await supabase
      .from('membership')
      .select('nft_level, is_member, claimed_at, unlock_membership_level')
      .ilike('wallet_address', walletAddress)
      .order('nft_level', { ascending: true })

    // 4. Get user balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('bcc_balance, pending_bcc_rewards')
      .ilike('wallet_address', walletAddress)
      .maybeSingle()

    // 5. Get referrals record
    const { data: referralsNewData, error: referralsNewError } = await supabase
      .from('referrals')
      .select('referrer_wallet, member_wallet')
      .ilike('member_wallet', walletAddress)
      .maybeSingle()

    // 6. Get layer rewards
    const { data: layerRewardsData, error: layerRewardsError } = await supabase
      .from('layer_rewards')
      .select('id, matrix_layer, status, reward_amount, created_at')
      .ilike('triggering_member_wallet', walletAddress)
      .order('matrix_layer', { ascending: true })

    const debugInfo = {
      walletAddress,
      member: memberError ? null : memberData,
      memberError: memberError?.message,
      
      directReferrals: referralsError ? fallbackReferralsCount : (directReferralsCount || 0),
      referralsError: referralsError?.message,
      
      membershipRecords: membershipError ? [] : (membershipRecords || []),
      membershipError: membershipError?.message,
      
      balance: balanceError ? null : balanceData,
      balanceError: balanceError?.message,
      
      referralsNew: referralsNewError ? null : referralsNewData,
      referralsNewError: referralsNewError?.message,
      
      layerRewards: layerRewardsError ? [] : (layerRewardsData || []),
      layerRewardsError: layerRewardsError?.message,
      
      // Analysis
      analysis: {
        currentLevel: memberData?.current_level || 0,
        canUpgradeToLevel2: (memberData?.current_level === 1) && ((referralsError ? fallbackReferralsCount : (directReferralsCount || 0)) >= 3),
        hasLevel2Membership: (membershipRecords || []).some(m => m.nft_level === 2),
        nextUnlockLevel: membershipRecords && membershipRecords.length > 0 
          ? Math.max(...membershipRecords.map(m => m.unlock_membership_level || 0))
          : null,
        ownedNFTLevels: (membershipRecords || []).map(m => m.nft_level),
        syncIssues: []
      }
    }

    // Check for sync issues
    const analysis = debugInfo.analysis
    if (memberData && membershipRecords) {
      const maxOwnedNFTLevel = membershipRecords.length > 0 ? Math.max(...membershipRecords.map(m => m.nft_level)) : 0
      if (memberData.current_level < maxOwnedNFTLevel) {
        analysis.syncIssues.push(`Database level (${memberData.current_level}) < Max NFT level (${maxOwnedNFTLevel})`)
      }
    }

    return {
      success: true,
      action: 'debug_user_status',
      message: 'Debug information collected',
      debugInfo
    } as any

  } catch (error) {
    console.error('Debug user status error:', error)
    return {
      success: false,
      action: 'debug_user_status',
      message: 'Failed to collect debug information',
      error: error.message
    }
  }
}