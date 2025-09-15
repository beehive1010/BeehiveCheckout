import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

interface BCCReleaseRequest {
  action: 'unlock_bcc' | 'check_tier' | 'calculate_release' | 'get_balance' | 'process_level_unlock'
  walletAddress: string
  targetLevel?: number
  activationRank?: number
}

interface BCCReleaseResponse {
  success: boolean
  action: string
  tier?: number
  activationRank?: number
  bccUnlocked?: number
  totalBccLocked?: number
  totalBccUnlocked?: number
  tierMultiplier?: number
  levelUnlocked?: number
  balanceDetails?: {
    transferable: number
    locked: number
    totalEarned: number
  }
  message: string
  error?: string
}

// BCC Release Configuration based on MarketingPlan.md
const BCC_RELEASE_CONFIG = {
  // Base BCC amounts per level
  BASE_AMOUNTS: {
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

  // Tier boundaries and multipliers
  TIERS: {
    1: { min: 1, max: 9999, multiplier: 1.0, name: 'Tier 1' },
    2: { min: 10000, max: 29999, multiplier: 0.5, name: 'Tier 2' },
    3: { min: 30000, max: 99999, multiplier: 0.25, name: 'Tier 3' },
    4: { min: 100000, max: 268240, multiplier: 0.125, name: 'Tier 4' }
  },

  // Total BCC locked per tier (for Level 1-19 combined)
  TOTAL_LOCKED_PER_TIER: {
    1: 10450,  // Tier 1: Full 10,450 BCC
    2: 5225,   // Tier 2: Half (10,450 / 2)
    3: 2612.5, // Tier 3: Quarter (10,450 / 4)
    4: 1306.25 // Tier 4: Eighth (10,450 / 8)
  },

  // Initial activation bonus (unlocked immediately)
  ACTIVATION_BONUS: 500
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

    const { action, walletAddress, targetLevel, activationRank } = await req.json() as BCCReleaseRequest

    console.log(`>� BCC Release System Action: ${action} for ${walletAddress}`)

    let response: BCCReleaseResponse

    switch (action) {
      case 'unlock_bcc':
        response = await unlockBCCForLevel(supabase, walletAddress, targetLevel!)
        break
      
      case 'check_tier':
        response = await checkUserTier(supabase, walletAddress, activationRank)
        break
      
      case 'calculate_release':
        response = await calculateBCCRelease(supabase, walletAddress, targetLevel!)
        break
      
      case 'get_balance':
        response = await getUserBCCBalance(supabase, walletAddress)
        break
        
      case 'process_level_unlock':
        response = await processLevelUnlock(supabase, walletAddress, targetLevel!)
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
    console.error('BCC Release System error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        action: 'error',
        error: error.message || 'BCC release failed',
        message: 'Processing failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Unlock BCC for a specific level
async function unlockBCCForLevel(supabase: any, walletAddress: string, targetLevel: number): Promise<BCCReleaseResponse> {
  console.log(`= Unlocking BCC for Level ${targetLevel}: ${walletAddress}`)

  try {
    // 1. Get member data including activation rank and tier
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('activation_rank, tier_level, current_level, levels_owned')
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle()

    if (memberError) {
      return {
        success: false,
        action: 'unlock_bcc',
        message: `Database error: ${memberError.message}`,
        error: 'Database error'
      }
    }

    if (!memberData) {
      return {
        success: false,
        action: 'unlock_bcc',
        message: 'Member not found',
        error: 'Member data missing'
      }
    }

    const { activation_rank, tier_level, current_level, levels_owned } = memberData
    
    // 2. Verify member has reached the target level
    if (current_level < targetLevel) {
      return {
        success: false,
        action: 'unlock_bcc',
        message: `Member must be Level ${targetLevel} to unlock BCC`,
        error: 'Insufficient level'
      }
    }

    // 3. Check if BCC has already been unlocked for this level
    const { data: existingRelease } = await supabase
      .from('bcc_release_rewards')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('level_unlocked', targetLevel)
      .eq('status', 'unlocked')
      .maybeSingle()

    if (existingRelease) {
      return {
        success: false,
        action: 'unlock_bcc',
        message: `BCC already unlocked for Level ${targetLevel}`,
        error: 'Already unlocked'
      }
    }

    // 4. Calculate BCC release amount based on tier
    const tier = tier_level || getTierFromActivationRank(activation_rank)
    const baseBCCAmount = BCC_RELEASE_CONFIG.BASE_AMOUNTS[targetLevel] || 0
    const tierMultiplier = BCC_RELEASE_CONFIG.TIERS[tier]?.multiplier || 0.125
    const finalBCCAmount = baseBCCAmount * tierMultiplier

    console.log(`=� BCC Calculation: Level ${targetLevel}, Base ${baseBCCAmount}, Tier ${tier} (${tierMultiplier}x) = ${finalBCCAmount} BCC`)

    // 5. Update user balance - move BCC from locked to transferable
    const { data: currentBalance } = await supabase
      .from('user_balances')
      .select('bcc_transferable, bcc_locked')
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle()

    const newTransferable = (currentBalance?.bcc_transferable || 0) + finalBCCAmount
    const newLocked = Math.max(0, (currentBalance?.bcc_locked || 0) - finalBCCAmount)

    await supabase
      .from('user_balances')
      .update({
        bcc_transferable: newTransferable,
        bcc_locked: newLocked,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress.toLowerCase())

    // 6. Create BCC release reward record
    await supabase
      .from('bcc_release_rewards')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        activation_rank: activation_rank,
        tier: tier,
        level_unlocked: targetLevel,
        bcc_amount: finalBCCAmount,
        status: 'unlocked',
        unlocked_at: new Date().toISOString()
      })

    // 7. Log BCC transaction
    await supabase
      .from('bcc_transactions')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        amount: finalBCCAmount,
        balance_type: 'unlock_reward',
        transaction_type: 'unlock',
        purpose: `Level ${targetLevel} BCC unlock: ${finalBCCAmount} BCC (Tier ${tier})`,
        status: 'completed',
        created_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        metadata: {
          level: targetLevel,
          tier: tier,
          base_amount: baseBCCAmount,
          tier_multiplier: tierMultiplier,
          final_amount: finalBCCAmount,
          activation_rank: activation_rank
        }
      })

    console.log(` BCC unlocked successfully: ${finalBCCAmount} BCC for Level ${targetLevel}`)

    return {
      success: true,
      action: 'unlock_bcc',
      tier,
      levelUnlocked: targetLevel,
      bccUnlocked: finalBCCAmount,
      tierMultiplier,
      balanceDetails: {
        transferable: newTransferable,
        locked: newLocked,
        totalEarned: newTransferable
      },
      message: `Successfully unlocked ${finalBCCAmount} BCC for Level ${targetLevel}`
    }

  } catch (error) {
    console.error('Unlock BCC error:', error)
    return {
      success: false,
      action: 'unlock_bcc',
      message: 'Failed to unlock BCC',
      error: error.message
    }
  }
}

// Check user's tier based on activation rank
async function checkUserTier(supabase: any, walletAddress: string, providedRank?: number): Promise<BCCReleaseResponse> {
  console.log(`<� Checking tier for: ${walletAddress}`)

  try {
    let activationRank = providedRank

    // If rank not provided, get it from member data
    if (!activationRank) {
      const { data: memberData } = await supabase
        .from('members')
        .select('activation_rank')
        .eq('wallet_address', walletAddress.toLowerCase())
        .maybeSingle()

      activationRank = memberData?.activation_rank
    }

    if (!activationRank) {
      return {
        success: false,
        action: 'check_tier',
        message: 'Activation rank not found',
        error: 'Missing activation rank'
      }
    }

    const tier = getTierFromActivationRank(activationRank)
    const tierConfig = BCC_RELEASE_CONFIG.TIERS[tier]

    return {
      success: true,
      action: 'check_tier',
      tier,
      activationRank,
      tierMultiplier: tierConfig.multiplier,
      totalBccLocked: BCC_RELEASE_CONFIG.TOTAL_LOCKED_PER_TIER[tier],
      message: `User is in ${tierConfig.name} (Rank #${activationRank}) with ${tierConfig.multiplier}x multiplier`
    }

  } catch (error) {
    console.error('Check tier error:', error)
    return {
      success: false,
      action: 'check_tier',
      message: 'Failed to check tier',
      error: error.message
    }
  }
}

// Calculate total BCC release for all levels
async function calculateBCCRelease(supabase: any, walletAddress: string, upToLevel: number): Promise<BCCReleaseResponse> {
  console.log(`>� Calculating BCC release up to Level ${upToLevel}: ${walletAddress}`)

  try {
    // Get member data
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('activation_rank, tier_level')
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle()

    if (memberError) {
      return {
        success: false,
        action: 'calculate_release',
        message: `Database error: ${memberError.message}`,
        error: 'Database error'
      }
    }

    if (!memberData) {
      return {
        success: false,
        action: 'calculate_release',
        message: 'Member not found',
        error: 'Member data missing'
      }
    }

    const tier = memberData.tier_level || getTierFromActivationRank(memberData.activation_rank)
    const tierMultiplier = BCC_RELEASE_CONFIG.TIERS[tier]?.multiplier || 0.125

    let totalBCC = 0
    const levelBreakdown: any[] = []

    // Calculate BCC for each level up to target
    for (let level = 1; level <= upToLevel && level <= 19; level++) {
      const baseBCC = BCC_RELEASE_CONFIG.BASE_AMOUNTS[level] || 0
      const adjustedBCC = baseBCC * tierMultiplier
      totalBCC += adjustedBCC

      levelBreakdown.push({
        level,
        baseBCC,
        adjustedBCC,
        tierMultiplier
      })
    }

    return {
      success: true,
      action: 'calculate_release',
      tier,
      tierMultiplier,
      totalBccLocked: totalBCC,
      message: `Total BCC release: ${totalBCC} BCC (up to Level ${upToLevel})`,
      // Include level breakdown in response
      ...{ levelBreakdown }
    }

  } catch (error) {
    console.error('Calculate BCC release error:', error)
    return {
      success: false,
      action: 'calculate_release',
      message: 'Failed to calculate BCC release',
      error: error.message
    }
  }
}

// Get user's current BCC balance details
async function getUserBCCBalance(supabase: any, walletAddress: string): Promise<BCCReleaseResponse> {
  console.log(`=� Getting BCC balance for: ${walletAddress}`)

  try {
    // Get current balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('bcc_transferable, bcc_locked, bcc_restricted, total_usdt_earned')
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle()

    if (balanceError) {
      return {
        success: false,
        action: 'get_balance',
        message: `Database error: ${balanceError.message}`,
        error: 'Database error'
      }
    }

    if (!balanceData) {
      return {
        success: false,
        action: 'get_balance',
        message: 'Balance record not found',
        error: 'No balance data'
      }
    }

    // Get BCC release history
    const { data: releaseHistory } = await supabase
      .from('bcc_release_rewards')
      .select('level_unlocked, bcc_amount, status, unlocked_at')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('level_unlocked', { ascending: true })

    const totalUnlocked = releaseHistory?.reduce((sum, release) => 
      sum + (release.status === 'unlocked' ? release.bcc_amount : 0), 0) || 0

    return {
      success: true,
      action: 'get_balance',
      balanceDetails: {
        transferable: balanceData.bcc_transferable || 0,
        locked: balanceData.bcc_locked || 0,
        totalEarned: totalUnlocked
      },
      totalBccUnlocked: totalUnlocked,
      message: `Balance: ${balanceData.bcc_transferable || 0} transferable, ${balanceData.bcc_locked || 0} locked`,
      // Include release history in response
      ...{ releaseHistory }
    }

  } catch (error) {
    console.error('Get BCC balance error:', error)
    return {
      success: false,
      action: 'get_balance',
      message: 'Failed to get balance',
      error: error.message
    }
  }
}

// Process level unlock (comprehensive function)
async function processLevelUnlock(supabase: any, walletAddress: string, targetLevel: number): Promise<BCCReleaseResponse> {
  console.log(`= Processing level unlock: Level ${targetLevel} for ${walletAddress}`)

  try {
    // 1. Verify member has reached the level
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('current_level, levels_owned, activation_rank, tier_level')
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle()

    if (memberError) {
      return {
        success: false,
        action: 'process_level_unlock',
        message: `Database error: ${memberError.message}`,
        error: 'Database error'
      }
    }

    if (!memberData || memberData.current_level < targetLevel) {
      return {
        success: false,
        action: 'process_level_unlock',
        message: 'Member has not reached the required level',
        error: 'Insufficient level'
      }
    }

    // 2. Check if already processed
    const { data: existingRelease } = await supabase
      .from('bcc_release_rewards')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('level_unlocked', targetLevel)
      .maybeSingle()

    if (existingRelease && existingRelease.status === 'unlocked') {
      return {
        success: false,
        action: 'process_level_unlock',
        message: 'Level already processed',
        error: 'Already unlocked'
      }
    }

    // 3. Process the unlock
    const unlockResult = await unlockBCCForLevel(supabase, walletAddress, targetLevel)

    if (!unlockResult.success) {
      return unlockResult
    }

    // 4. Check for pending rewards that can now be claimed
    await checkAndUpdatePendingRewards(supabase, walletAddress, targetLevel)

    // 5. Process any triggered layer rewards from matrix completions
    await processTriggeredRewards(supabase, walletAddress, targetLevel)

    return {
      success: true,
      action: 'process_level_unlock',
      levelUnlocked: targetLevel,
      bccUnlocked: unlockResult.bccUnlocked,
      tier: unlockResult.tier,
      tierMultiplier: unlockResult.tierMultiplier,
      balanceDetails: unlockResult.balanceDetails,
      message: `Level ${targetLevel} unlock processed successfully. ${unlockResult.bccUnlocked} BCC unlocked.`
    }

  } catch (error) {
    console.error('Process level unlock error:', error)
    return {
      success: false,
      action: 'process_level_unlock',
      message: 'Failed to process level unlock',
      error: error.message
    }
  }
}

// Check and update pending rewards that can now be claimed
async function checkAndUpdatePendingRewards(supabase: any, walletAddress: string, newLevel: number): Promise<void> {
  console.log(`= Checking pending rewards for Level ${newLevel} unlock`)

  try {
    // Get pending rewards that can now be claimed
    const { data: pendingRewards } = await supabase
      .from('layer_reward_claims')
      .select('*')
      .eq('root_wallet', walletAddress.toLowerCase())
      .eq('status', 'pending')
      .lte('nft_level', newLevel) // Member now qualifies for these levels
      .gt('expires_at', new Date().toISOString()) // Not expired yet

    if (pendingRewards && pendingRewards.length > 0) {
      console.log(` Updating ${pendingRewards.length} pending rewards to claimable`)

      // Update all qualifying rewards to claimable
      await supabase
        .from('layer_reward_claims')
        .update({ status: 'claimable' })
        .eq('root_wallet', walletAddress.toLowerCase())
        .eq('status', 'pending')
        .lte('nft_level', newLevel)
        .gt('expires_at', new Date().toISOString())
    }

  } catch (error) {
    console.error('Check pending rewards error:', error)
  }
}

// Process triggered rewards from matrix completions
async function processTriggeredRewards(supabase: any, walletAddress: string, level: number): Promise<void> {
  console.log(`<� Processing triggered rewards for Level ${level}`)

  try {
    // This function would integrate with the matrix system to check if any 
    // matrix completions should trigger new rewards based on the level upgrade
    
    // For now, this is a placeholder - the actual implementation would involve
    // checking the referral matrix for completed layers and creating new reward claims

    console.log(`=� Triggered rewards processing complete for ${walletAddress}`)

  } catch (error) {
    console.error('Process triggered rewards error:', error)
  }
}

// Utility function to determine tier from activation rank
function getTierFromActivationRank(activationRank: number): number {
  if (activationRank <= 9999) return 1
  if (activationRank <= 29999) return 2  
  if (activationRank <= 99999) return 3
  return 4
}