import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
}

console.log(`🔷 Matrix Operations API启动成功!`)

interface MatrixPlacement {
  referred_wallet: string;
  referrer_wallet: string;
  placement_root: string;
  placement_layer: number;
  placement_position: string;
  placement_path: string;
  referral_type: string;
  referred_at?: string;
  placed_at?: string;
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
        },
      }
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const walletAddress = req.headers.get('x-wallet-address')
    
    console.log(`🔷 Matrix Operations Action: ${action} for wallet: ${walletAddress}`)

    switch (action) {
      case 'get-matrix-structure':
        return await getMatrixStructure(supabase, walletAddress)
      
      case 'get-placement-info':
        return await getPlacementInfo(supabase, walletAddress!)
      
      case 'find-optimal-placement':
        const referrerWallet = url.searchParams.get('referrer_wallet')
        if (!referrerWallet) {
          throw new Error('Referrer wallet required for placement search')
        }
        return await findOptimalPlacement(supabase, referrerWallet, walletAddress!)
      
      case 'place-member':
        if (req.method !== 'POST') {
          throw new Error('POST method required for placing member')
        }
        const placementData = await req.json()
        return await placeMember(supabase, placementData)
      
      case 'get-matrix-statistics':
        return await getMatrixStatistics(supabase, walletAddress)
      
      case 'get-layer-analysis':
        const layer = parseInt(url.searchParams.get('layer') || '1')
        return await getLayerAnalysis(supabase, walletAddress, layer)
      
      case 'check-spillover-opportunities':
        return await checkSpilloverOpportunities(supabase, walletAddress!)
      
      case 'sync-matrix-data':
        return await syncMatrixData(supabase)
      
      case 'get-reward-eligibility':
        const checkLayer = parseInt(url.searchParams.get('layer') || '1')
        return await getRewardEligibility(supabase, walletAddress!, checkLayer)
      
      case 'simulate-placement':
        const simReferrer = url.searchParams.get('referrer_wallet')
        if (!simReferrer) {
          throw new Error('Referrer wallet required for simulation')
        }
        return await simulatePlacement(supabase, simReferrer, walletAddress!)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Matrix Operations Error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// Get referral structure (simplified version)
async function getMatrixStructure(supabase: any, rootWallet?: string) {
  if (!rootWallet) {
    // Get all referral structures from referrals table
    const { data: allReferrals, error } = await supabase
      .from('referrals')
      .select('member_wallet, referrer_wallet, id')
      .order('id')
      .limit(100)

    // Group by referrer_wallet to create structure summaries
    const structures = {}
    if (allReferrals) {
      allReferrals.forEach((ref: any) => {
        if (!structures[ref.referrer_wallet]) {
          structures[ref.referrer_wallet] = {
            root_wallet: ref.referrer_wallet,
            total_referrals: 0,
            direct_referrals: [],
            last_referral: null
          }
        }
        
        structures[ref.referrer_wallet].total_referrals++
        structures[ref.referrer_wallet].direct_referrals.push({
          member_wallet: ref.member_wallet,
          referral_id: ref.id
        })
        structures[ref.referrer_wallet].last_referral = ref.id
      })
    }

    return new Response(JSON.stringify({
      success: true,
      structures: Object.values(structures),
      error: error?.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  // Get specific referral structure  
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('member_wallet, referrer_wallet, id')
    .eq('referrer_wallet', rootWallet)
    .order('id')

  if (error || !referrals) {
    return new Response(JSON.stringify({
      success: false,
      error: `Referral structure not found: ${error?.message || 'No referrals found'}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    })
  }

  // Build structure data
  const structure = {
    root_wallet: rootWallet,
    total_referrals: referrals.length,
    direct_referrals: referrals.map((r: any) => ({
      member_wallet: r.member_wallet,
      referral_id: r.id
    })),
    first_referral: referrals.length > 0 ? referrals[0].id : null,
    last_referral: referrals.length > 0 ? referrals[referrals.length - 1].id : null
  }

  return new Response(JSON.stringify({
    success: true,
    structure,
    root_wallet: rootWallet
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Get referral information for a specific member
async function getPlacementInfo(supabase: any, walletAddress: string) {
  const { data: referralData, error } = await supabase
    .from('referrals')
    .select('member_wallet, referrer_wallet, id')
    .eq('member_wallet', walletAddress)
    .single()

  if (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `Referral info not found: ${error.message}`,
      is_referred: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  // Get referrer's info from members table
  const { data: referrerData } = await supabase
    .from('members')
    .select('username, current_level')
    .eq('wallet_address', referralData.referrer_wallet)
    .single()

  return new Response(JSON.stringify({
    success: true,
    referral_info: {
      ...referralData,
      referrer_info: referrerData
    },
    is_referred: true
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Simple referral placement (no complex matrix)
async function findOptimalPlacement(supabase: any, referrerWallet: string, newMemberWallet: string) {
  console.log(`🔍 Finding referral placement: ${referrerWallet} -> ${newMemberWallet}`)

  try {
    // Check if referrer exists in members table
    const { data: referrerData, error: referrerError } = await supabase
      .from('members')
      .select('wallet_address, username, current_level')
      .eq('wallet_address', referrerWallet)
      .single()

    if (referrerError || !referrerData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Referrer not found in members table'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    // Check if new member already exists in referrals
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('member_wallet')
      .eq('member_wallet', newMemberWallet)
      .single()

    if (existingReferral) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Member already has a referrer'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Get current referral count for referrer
    const { count: referralCount } = await supabase
      .from('referrals')
      .select('member_wallet', { count: 'exact', head: true })
      .eq('referrer_wallet', referrerWallet)

    return new Response(JSON.stringify({
      success: true,
      placement_found: true,
      placement_type: 'direct_referral',
      referrer_wallet: referrerWallet,
      referrer_info: referrerData,
      current_referral_count: referralCount || 0,
      estimated_rewards: {
        referral_bonus: 100,
        currency: 'USDC',
        conditions: 'Immediate upon successful referral'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Find optimal placement error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}

// Simple helper functions for basic referral system
function calculateReferralRewards(): any {
  return {
    direct_referral_bonus: 100,
    currency: 'USDC',
    bonus_type: 'immediate',
    conditions: 'Paid when referred member activates NFT membership'
  }
}

// Create a simple referral relationship
async function placeMember(supabase: any, placementData: any) {
  const {
    member_wallet,
    referrer_wallet
  } = placementData

  console.log(`🎯 Creating referral: ${member_wallet} under ${referrer_wallet}`)

  try {
    const currentTime = new Date().toISOString()

    // Insert referral record
    const { data: newReferral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        member_wallet,
        referrer_wallet
      })
      .select()
      .single()

    if (referralError) {
      throw new Error(`Failed to create referral: ${referralError.message}`)
    }

    console.log(`✅ Referral created successfully: ${member_wallet}`)

    // Check if referrer should get rewards
    const rewardInfo = calculateReferralRewards()

    return new Response(JSON.stringify({
      success: true,
      referral: newReferral,
      reward_info: rewardInfo
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Place member error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}

// Create reward record for referral bonus
async function createRewardRecord(supabase: any, rewardData: any) {
  const { error } = await supabase
    .from('reward_claims')
    .insert({
      wallet_address: rewardData.wallet_address,
      amount: rewardData.amount,
      currency: rewardData.currency || 'USDC',
      claim_type: rewardData.claim_type || 'referral_bonus',
      status: rewardData.status || 'pending'
    })

  if (error) {
    console.error('Create reward record error:', error)
    throw new Error(`Failed to create reward record: ${error.message}`)
  }

  console.log(`✅ Reward record created: ${rewardData.amount} ${rewardData.currency} for ${rewardData.wallet_address}`)
}

// Get referral statistics
async function getMatrixStatistics(supabase: any, rootWallet?: string) {
  if (rootWallet) {
    // Get statistics for specific referrer from referrals table
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('member_wallet')
      .eq('referrer_wallet', rootWallet)

    if (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Calculate statistics
    const stats = {
      referrer_wallet: rootWallet,
      total_referrals: referrals?.length || 0,
      first_referral: referrals?.length ? referrals[0]?.id : null,
      last_referral: referrals?.length ? referrals[referrals.length - 1]?.id : null,
      referrals_this_month: 0 // Time-based filtering not available without timestamps
    }

    return new Response(JSON.stringify({
      success: true,
      statistics: stats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } else {
    // Get overall system statistics from referrals table
    const { data: allReferrals, error } = await supabase
      .from('referrals')
      .select('referrer_wallet')

    if (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Group by referrer_wallet and calculate stats
    const referrerStats = {}
    if (allReferrals) {
      allReferrals.forEach((ref: any) => {
        if (!referrerStats[ref.referrer_wallet]) {
          referrerStats[ref.referrer_wallet] = {
            referrer_wallet: ref.referrer_wallet,
            total_referrals: 0,
            last_referral: null
          }
        }
        
        referrerStats[ref.referrer_wallet].total_referrals++
        if (!referrerStats[ref.referrer_wallet].last_referral || 
            new Date(ref.id) > new Date(referrerStats[ref.referrer_wallet].last_referral)) {
          referrerStats[ref.referrer_wallet].last_referral = ref.id
        }
      })
    }

    // Sort by total_referrals
    const allStats = Object.values(referrerStats)
      .sort((a: any, b: any) => b.total_referrals - a.total_referrals)
      .slice(0, 20)

    return new Response(JSON.stringify({
      success: true,
      statistics: allStats || [],
      total_system_referrals: allReferrals?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
}

// Get referral timeline analysis (simplified)
async function getLayerAnalysis(supabase: any, rootWallet: string, timeRange: number = 30) {
  // Get referrals for this referrer within time range (days)
  const timeThreshold = new Date()
  timeThreshold.setDate(timeThreshold.getDate() - timeRange)
  
  const { data: recentReferrals, error } = await supabase
    .from('referrals')
    .select('member_wallet')
    .eq('referrer_wallet', rootWallet)
    .order('id')

  if (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }

  // Calculate statistics
  const stats = {
    referrer_wallet: rootWallet,
    time_range_days: timeRange,
    total_referrals: recentReferrals?.length || 0,
    first_referral: recentReferrals?.length ? recentReferrals[0]?.id : null,
    last_referral: recentReferrals?.length ? recentReferrals[recentReferrals.length - 1]?.id : null,
    avg_referrals_per_day: recentReferrals?.length ? (recentReferrals.length / timeRange).toFixed(2) : 0
  }

  // Daily stats not available without timestamps
  const dailyStats = {}

  return new Response(JSON.stringify({
    success: true,
    referral_analysis: stats,
    daily_breakdown: dailyStats,
    recent_referrals: recentReferrals || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Check referral opportunities
async function checkSpilloverOpportunities(supabase: any, walletAddress: string) {
  // Check if wallet is already a member and can refer others
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('wallet_address, current_level, username')
    .eq('wallet_address', walletAddress)
    .single()

  if (memberError || !memberData) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Member not found - must be a member to refer others',
      can_refer: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    })
  }

  // Get current referral count
  const { count: currentReferrals } = await supabase
    .from('referrals')
    .select('member_wallet', { count: 'exact', head: true })
    .eq('referrer_wallet', walletAddress)

  const opportunities = {
    can_refer: true,
    current_referrals: currentReferrals || 0,
    member_level: memberData.current_level,
    referral_bonus: calculateReferralRewards(),
    requirements: {
      must_have_nft: memberData.current_level >= 1,
      eligible_for_rewards: memberData.current_level >= 1
    }
  }

  return new Response(JSON.stringify({
    success: true,
    referral_opportunities: opportunities
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Sync referral system data
async function syncMatrixData(supabase: any) {
  console.log(`🔄 Starting referral system data synchronization...`)

  try {
    // Get all referrals data
    const { data: allReferrals, error: referralsError } = await supabase
      .from('referrals')
      .select('member_wallet, referrer_wallet')

    if (referralsError) {
      throw new Error(`Failed to fetch referrals data: ${referralsError.message}`)
    }

    // Build system overview
    const referrerSummary = {}
    
    if (allReferrals) {
      allReferrals.forEach((ref: any) => {
        if (!referrerSummary[ref.referrer_wallet]) {
          referrerSummary[ref.referrer_wallet] = {
            referrer_wallet: ref.referrer_wallet,
            total_referrals: 0,
            first_referral: ref.id,
            last_referral: ref.id,
            referrals_this_week: 0,
            referrals_this_month: 0
          }
        }
        
        referrerSummary[ref.referrer_wallet].total_referrals++
        
        // Update first and last referral IDs (not time-based)
        if (ref.id < referrerSummary[ref.referrer_wallet].first_referral) {
          referrerSummary[ref.referrer_wallet].first_referral = ref.id
        }
        if (ref.id > referrerSummary[ref.referrer_wallet].last_referral) {
          referrerSummary[ref.referrer_wallet].last_referral = ref.id
        }

        // Time-based counting not available without timestamps
        referrerSummary[ref.referrer_wallet].referrals_this_week = 0
        referrerSummary[ref.referrer_wallet].referrals_this_month = 0
      })
    }

    // Get member status summary
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, current_level')

    const memberStats = {
      total_members: members?.length || 0,
      level_1_members: members?.filter((m: any) => m.current_level === 1).length || 0,
      level_2_members: members?.filter((m: any) => m.current_level >= 2).length || 0,
      total_referrals: allReferrals?.length || 0,
      active_referrers: Object.keys(referrerSummary).length
    }

    // Top referrers
    const topReferrers = Object.values(referrerSummary)
      .sort((a: any, b: any) => b.total_referrals - a.total_referrals)
      .slice(0, 10)

    return new Response(JSON.stringify({
      success: true,
      sync_completed: true,
      system_overview: {
        total_referrers: Object.keys(referrerSummary).length,
        top_referrers: topReferrers,
        member_statistics: memberStats
      },
      sync_timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Sync referral data error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}

// Get reward eligibility for a member
async function getRewardEligibility(supabase: any, walletAddress: string, layer: number) {
  // Get member information
  const { data: memberData } = await supabase
    .from('members')
    .select('current_level, referrer_wallet')
    .eq('wallet_address', walletAddress)
    .single()

  if (!memberData) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Member not found',
      eligible: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    })
  }

  // Check direct referral requirements for Level 2
  const { count: directReferrals } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_wallet', walletAddress)
    .eq('placement_layer', 1)

  const eligibilityChecks = {
    has_nft: memberData.current_level >= 1,
    has_level_2: memberData.current_level >= 2,
    direct_referrals_count: directReferrals || 0,
    needs_direct_referrals: memberData.current_level === 1 && (directReferrals || 0) < 3,
    layer_requirement_met: layer === 1 ? memberData.current_level >= 2 : true
  }

  const isEligible = eligibilityChecks.has_nft && 
                    (!eligibilityChecks.needs_direct_referrals) && 
                    eligibilityChecks.layer_requirement_met

  return new Response(JSON.stringify({
    success: true,
    eligible: isEligible,
    member_level: memberData.current_level,
    eligibility_checks: eligibilityChecks,
    requirements: {
      layer_1_reward: 'Requires Level 2 NFT',
      level_2_upgrade: 'Requires 3 direct referrals',
      general: 'Must have activated NFT membership'
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Simulate referral without actually creating it
async function simulatePlacement(supabase: any, referrerWallet: string, newMemberWallet: string) {
  console.log(`🎮 Simulating referral: ${referrerWallet} -> ${newMemberWallet}`)

  // Run the same logic as findOptimalPlacement but don't actually place
  const placementResult = await findOptimalPlacement(supabase, referrerWallet, newMemberWallet)
  const placementData = await placementResult.json()

  if (placementData.success && placementData.placement_found) {
    const rewardSimulation = calculateReferralRewards()

    return new Response(JSON.stringify({
      success: true,
      simulation_result: {
        ...placementData,
        reward_simulation: rewardSimulation,
        note: 'This is a simulation - no actual referral was created'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  return placementResult
}