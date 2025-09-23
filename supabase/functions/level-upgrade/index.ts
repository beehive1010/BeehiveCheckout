import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface LevelUpgradeRequest {
  action: 'upgrade_level' | 'check_requirements' | 'get_pricing' | 'verify_transaction'
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
      .select('current_level, levels_owned, activation_rank, tier_level')
      .eq('wallet_address', walletAddress) // Preserve case
      .maybeSingle()

    if (memberError || !memberData) {
      return {
        success: false,
        action: 'upgrade_level',
        message: 'Member not found or not activated',
        error: 'Member data missing'
      }
    }

    const currentLevel = memberData.current_level
    const levelsOwned = memberData.levels_owned || []
    
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

    // 4. Create membership record (triggers BCC release and other membership processing)
    console.log(`💫 Creating membership record for Level ${targetLevel}...`)
    const { data: membershipData, error: membershipError } = await supabase
      .from('membership')
      .insert({
        wallet_address: walletAddress, // Preserve case
        nft_level: targetLevel,
        claim_price: LEVEL_CONFIG.PRICING[targetLevel] || 0,
        claimed_at: new Date().toISOString(),
        is_member: true,
        unlock_membership_level: targetLevel + 1, // Dynamic unlock level
        total_cost: LEVEL_CONFIG.PRICING[targetLevel] || 0
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

    // 5. Update member level (triggers level upgrade rewards and layer rewards)
    console.log(`⬆️ Updating member level to ${targetLevel}...`)
    const { data: memberUpdateResult, error: memberUpdateError } = await supabase
      .from('members')
      .update({
        current_level: targetLevel,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress) // Preserve case
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

    // 6. Get final results from triggered functions
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for triggers to complete
    
    // Check user balance changes
    const { data: balanceData } = await supabase
      .from('user_balances')
      .select('bcc_balance, pending_bcc_rewards')
      .eq('wallet_address', walletAddress)
      .single()

    // Check layer rewards created
    const { count: layerRewardsCount } = await supabase
      .from('layer_rewards')
      .select('*', { count: 'exact' })
      .eq('triggering_member_wallet', walletAddress)
      .eq('level', targetLevel)

    // 7. Log the upgrade
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
        membershipCreated: !!membershipData,
        memberLevelUpdated: !!memberUpdateResult,
        currentBccBalance: balanceData?.bcc_balance || 0,
        pendingBccRewards: balanceData?.pending_bcc_rewards || 0,
        layerRewardsTriggered: layerRewardsCount || 0
      },
      message: `Successfully upgraded to Level ${targetLevel}! Membership record created, level updated, triggers fired for BCC release and layer rewards.`
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
      .select('current_level, levels_owned')
      .eq('wallet_address', walletAddress) // Preserve case
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
    const levelsOwned = memberData.levels_owned || []
    
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

    if (levelsOwned.includes(targetLevel)) {
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
      const { count: directReferralsCount } = await supabase
        .from('direct_referrals')
        .select('*', { count: 'exact' })
        .eq('referrer_wallet', walletAddress) // Preserve case

      const directReferrals = directReferralsCount || 0
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