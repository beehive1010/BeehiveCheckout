import {serve} from "https://deno.land/std@0.168.0/http/server.ts"
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface LevelUpgradeRequest {
  action: 'upgrade_level' | 'check_requirements' | 'get_pricing' | 'verify_transaction' | 'debug_user_status'
  walletAddress: string
  targetLevel?: number
  transactionHash?: string
  network?: 'mainnet' | 'testnet' | 'simulation'
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

    const { action, walletAddress, targetLevel, transactionHash, network } = await req.json() as LevelUpgradeRequest

    console.log(`🚀 Level Upgrade Action: ${action} for ${walletAddress}`)

    let response: LevelUpgradeResponse

    switch (action) {
      case 'upgrade_level':
        response = await processLevelUpgrade(supabase, walletAddress, targetLevel!, transactionHash, network)
        break
      
      case 'check_requirements':
        response = await checkUpgradeRequirements(supabase, walletAddress, targetLevel!)
        break
      
      case 'get_pricing':
        response = await getLevelPricing(walletAddress, targetLevel)
        break
        
      case 'verify_transaction':
        response = await verifyUpgradeTransaction(transactionHash!, walletAddress, targetLevel!, network)
        break
      
      case 'debug_user_status':
        response = await debugUserStatus(supabase, walletAddress)
        break
      
      default:
        response = {
          success: false,
          action,
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

    // 4. Verify referrals_new record exists (required for upgrade integrity)
    console.log(`🔗 Verifying referrals_new record exists for ${walletAddress}...`)
    const { data: referralsNewData } = await supabase
      .from('referrals_new')
      .select('referrer_wallet, referred_wallet')
      .ilike('referred_wallet', walletAddress) // Case insensitive match
      .maybeSingle()

    if (!referralsNewData) {
      console.warn(`⚠️ No referrals_new record found for ${walletAddress} - this may indicate incomplete registration`)
      // For upgrade, we don't block if no referral exists (could be root user or legacy data)
    } else {
      console.log(`✅ Referrals_new record verified: ${referralsNewData.referred_wallet} -> ${referralsNewData.referrer_wallet}`)
    }

    // 5. Create membership record (triggers BCC release and other membership processing)
    console.log(`💫 Creating membership record for Level ${targetLevel}...`)
    const { data: membershipData, error: membershipError } = await supabase
      .from('membership')
      .insert({
        wallet_address: walletAddress, // Preserve case
        nft_level: targetLevel,
        claim_price: LEVEL_CONFIG.PRICING[targetLevel] || 0,
        claimed_at: new Date().toISOString(),
        is_member: true,
        unlock_membership_level: targetLevel + 1 // Dynamic unlock level
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

    console.log(`✅ Membership record created - triggers fired:`, membershipData)

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

    // 6.3. Check and compensate for missing layer rewards (trigger补偿逻辑)
    console.log(`🔍 Checking if layer rewards were triggered for ${walletAddress} Level ${targetLevel}...`)
    try {
      // Check if layer reward exists for this level upgrade
      const { data: existingLayerReward, error: checkError } = await supabase
        .from('layer_rewards')
        .select('id, status, reward_amount')
        .ilike('triggering_member_wallet', walletAddress)
        .eq('matrix_layer', targetLevel)
        .maybeSingle()

      if (checkError) {
        console.warn('⚠️ Layer reward check query failed:', checkError)
      } else if (!existingLayerReward) {
        console.log(`❌ Missing layer reward detected for Level ${targetLevel}, compensating with manual trigger...`)
        
        // Calculate correct layer reward amount for all levels (1-19)
        // This should match the get_nft_level_price database function
        const getLayerRewardAmount = (lvl) => {
          const rewardAmounts = {
            1: 100, 2: 150, 3: 200, 4: 250, 5: 300, 6: 350, 7: 400, 8: 450, 9: 500,
            10: 550, 11: 600, 12: 650, 13: 700, 14: 750, 15: 800, 16: 850, 17: 900, 18: 950, 19: 1000
          };
          return rewardAmounts[lvl] || (lvl <= 19 ? 100 + (lvl - 1) * 50 : 0);
        };
        
        // Manually trigger the layer reward creation
        const { data: compensationResult, error: compensationError } = await supabase.rpc('trigger_layer_rewards_on_upgrade', {
          p_upgrading_member_wallet: walletAddress,
          p_new_level: targetLevel,
          p_nft_price: getLayerRewardAmount(targetLevel)
        })

        if (compensationError) {
          console.warn('⚠️ Layer reward compensation failed:', compensationError)
        } else {
          console.log(`✅ Layer reward compensation successful:`, compensationResult)
        }
      } else {
        console.log(`✅ Layer reward already exists: ${existingLayerReward.id} (${existingLayerReward.status}, ${existingLayerReward.reward_amount})`)
      }
    } catch (compensationErr) {
      console.warn('⚠️ Layer reward compensation error (non-critical):', compensationErr)
    }

    // 7. Get final results from triggered functions
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for triggers to complete
    
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

    // 2. Check sequential upgrade requirement
    const expectedNextLevel = currentLevel + 1
    const isSequential = targetLevel === expectedNextLevel
    
    if (targetLevel > 19) {
      return {
        success: false,
        action: 'check_requirements',
        canUpgrade: false,
        message: 'Maximum level is 19',
        error: 'Invalid target level'
      }
    }

    // Check if user already has membership record for this level
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
        message: `Must upgrade sequentially. Next level: ${expectedNextLevel}`,
        error: 'Non-sequential upgrade'
      }
    }

    // 3. Check Level 2 special requirement (3 direct referrals)
    let directReferralsCheck = { required: 0, current: 0, satisfied: true }
    
    if (targetLevel === 2) {
      // Use referrals_stats_view for accurate direct referral count (includes referrals_new data)
      const { data: referralsStatsData, error: referralsStatsError } = await supabase
        .from('referrals_stats_view')
        .select('direct_referrals_count')
        .ilike('wallet_address', walletAddress)
        .maybeSingle()

      let directReferrals = 0
      
      if (!referralsStatsError && referralsStatsData) {
        directReferrals = referralsStatsData.direct_referrals_count || 0
      } else {
        console.warn('⚠️ referrals_stats_view query failed, trying referrals_new fallback:', referralsStatsError)
        // Fallback to referrals_new table
        const { count: fallbackCount } = await supabase
          .from('referrals_new')
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
      message: `Can upgrade to Level ${targetLevel}. Cost: ${LEVEL_CONFIG.PRICING[targetLevel]} USDC`
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
    
    const NFT_CONTRACT = '0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8' // ARB ONE Membership Contract
    const PAYMENT_TOKEN_CONTRACT = '0x6f9487f2a1036e2D910aBB7509d0263a9581470B' // ARB ONE Payment Token
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

    // 2. Get direct referrals count using referrals_new table
    const { count: directReferralsCount, error: referralsError } = await supabase
      .from('referrals_new')
      .select('*', { count: 'exact', head: true })
      .ilike('referrer_wallet', walletAddress)

    // Fallback to referrals table if referrals_new fails
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

    // 5. Get referrals_new record
    const { data: referralsNewData, error: referralsNewError } = await supabase
      .from('referrals_new')
      .select('referrer_wallet, referred_wallet')
      .ilike('referred_wallet', walletAddress)
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