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
    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase()
    
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

// Get matrix structure for a given root wallet
async function getMatrixStructure(supabase: any, rootWallet?: string) {
  if (!rootWallet) {
    // Get all matrix structures
    const { data: allStructures, error } = await supabase
      .rpc('analyze_matrix_structure')
      .limit(10)

    return new Response(JSON.stringify({
      success: true,
      structures: allStructures || [],
      error: error?.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  // Get specific matrix structure
  const { data: structure, error } = await supabase
    .rpc('analyze_matrix_structure')
    .eq('placement_root', rootWallet)
    .single()

  if (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `Matrix structure not found: ${error.message}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    })
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

// Get placement information for a specific member
async function getPlacementInfo(supabase: any, walletAddress: string) {
  const { data: placementData, error } = await supabase
    .from('referrals')
    .select(`
      *,
      referrer_user:users!referrals_referrer_wallet_fkey(username, email),
      placement_root_user:users!referrals_placement_root_fkey(username, email)
    `)
    .eq('referred_wallet', walletAddress)
    .single()

  if (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `Placement info not found: ${error.message}`,
      is_placed: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  return new Response(JSON.stringify({
    success: true,
    placement: placementData,
    is_placed: true
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Find optimal placement for a new member
async function findOptimalPlacement(supabase: any, referrerWallet: string, newMemberWallet: string) {
  console.log(`🔍 Finding optimal placement: ${referrerWallet} -> ${newMemberWallet}`)

  try {
    // 1. Find referrer's matrix root
    const { data: referrerPlacement } = await supabase
      .from('referrals')
      .select('placement_root')
      .eq('referred_wallet', referrerWallet)
      .single()

    const matrixRoot = referrerPlacement?.placement_root || referrerWallet

    console.log(`📊 Matrix root: ${matrixRoot}`)

    // 2. Check direct placement under referrer (Layer 1)
    const directPlacement = await findAvailablePositionInLayer(supabase, referrerWallet, matrixRoot, 1)
    
    if (directPlacement.available) {
      return new Response(JSON.stringify({
        success: true,
        placement_found: true,
        placement_type: 'direct',
        parent_wallet: referrerWallet,
        matrix_root: matrixRoot,
        layer: 1,
        position: directPlacement.position,
        estimated_rewards: calculateEstimatedRewards(1)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 3. Find spillover placement
    const spilloverPlacement = await findSpilloverPlacement(supabase, matrixRoot, 19)
    
    if (spilloverPlacement.available) {
      return new Response(JSON.stringify({
        success: true,
        placement_found: true,
        placement_type: 'spillover',
        parent_wallet: spilloverPlacement.parent_wallet,
        matrix_root: matrixRoot,
        layer: spilloverPlacement.layer,
        position: spilloverPlacement.position,
        estimated_rewards: calculateEstimatedRewards(spilloverPlacement.layer)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 4. No placement found
    return new Response(JSON.stringify({
      success: true,
      placement_found: false,
      message: 'No available placement positions found in matrix',
      matrix_root: matrixRoot
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

// Helper function to find available position in a specific layer
async function findAvailablePositionInLayer(supabase: any, parentWallet: string, rootWallet: string, layer: number) {
  // Get existing positions for this parent at this layer
  const { data: existingPositions } = await supabase
    .from('referrals')
    .select('placement_position')
    .eq('referrer_wallet', parentWallet)
    .eq('placement_root', rootWallet)
    .eq('placement_layer', layer)

  const occupied = existingPositions?.map((p: any) => p.placement_position) || []
  const availablePositions = ['L', 'M', 'R'].filter(pos => !occupied.includes(pos))

  if (availablePositions.length > 0) {
    return {
      available: true,
      position: availablePositions[0], // Take first available position
      occupied_count: occupied.length,
      total_positions: 3
    }
  }

  return {
    available: false,
    occupied_count: occupied.length,
    total_positions: 3
  }
}

// Helper function to find spillover placement
async function findSpilloverPlacement(supabase: any, rootWallet: string, maxLayer: number) {
  for (let layer = 1; layer <= maxLayer; layer++) {
    console.log(`🔍 Searching layer ${layer} for spillover opportunities...`)

    // Get all members at this layer
    const { data: layerMembers } = await supabase
      .from('referrals')
      .select('referred_wallet')
      .eq('placement_root', rootWallet)
      .eq('placement_layer', layer)

    if (layerMembers && layerMembers.length > 0) {
      // Check each member for available positions in the next layer
      for (const member of layerMembers) {
        const nextLayerPlacement = await findAvailablePositionInLayer(
          supabase, 
          member.referred_wallet, 
          rootWallet, 
          layer + 1
        )

        if (nextLayerPlacement.available) {
          return {
            available: true,
            parent_wallet: member.referred_wallet,
            layer: layer + 1,
            position: nextLayerPlacement.position
          }
        }
      }
    }
  }

  return { available: false }
}

// Calculate estimated rewards for a layer
function calculateEstimatedRewards(layer: number): any {
  // L and M positions get immediate rewards
  // R position gets pending rewards (72-hour timer)
  const rewardAmount = 100 // Base USDC reward

  return {
    immediate_positions: ['L', 'M'],
    pending_positions: ['R'],
    reward_amount_usdc: rewardAmount,
    pending_hours: 72,
    layer_multiplier: layer <= 3 ? 1 : Math.floor(layer / 3)
  }
}

// Place a member in the matrix
async function placeMember(supabase: any, placementData: any) {
  const {
    referred_wallet,
    referrer_wallet,
    placement_root,
    placement_layer,
    placement_position,
    referral_type = 'direct'
  } = placementData

  console.log(`🎯 Placing member: ${referred_wallet} under ${referrer_wallet} at Layer ${placement_layer} Position ${placement_position}`)

  try {
    // Generate placement path
    const placement_path = `${placement_root}/${placement_layer}/${placement_position}`

    const currentTime = new Date().toISOString()

    // Insert referral record
    const { data: newReferral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        referred_wallet,
        referrer_wallet,
        placement_root,
        placement_layer,
        placement_position,
        placement_path,
        referral_type,
        referred_at: currentTime,
        placed_at: currentTime
      })
      .select()
      .single()

    if (referralError) {
      throw new Error(`Failed to place member: ${referralError.message}`)
    }

    console.log(`✅ Member placed successfully: ${referred_wallet}`)

    // Check if this placement triggers any rewards
    const rewardCheck = await checkRewardTrigger(supabase, newReferral)

    return new Response(JSON.stringify({
      success: true,
      placement: newReferral,
      reward_triggered: rewardCheck.triggered,
      reward_info: rewardCheck.info
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

// Check if placement triggers rewards
async function checkRewardTrigger(supabase: any, placement: MatrixPlacement) {
  try {
    // Check if this placement completes a matrix layer
    const { count } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_wallet', placement.referrer_wallet)
      .eq('placement_root', placement.placement_root)
      .eq('placement_layer', placement.placement_layer)

    const positions_filled = count || 0
    const layer_complete = positions_filled >= 3

    if (layer_complete) {
      console.log(`🎉 Layer ${placement.placement_layer} complete for ${placement.referrer_wallet}`)
      
      // Create reward record for L and M positions (immediate)
      if (['L', 'M'].includes(placement.placement_position)) {
        await createRewardRecord(supabase, {
          root_wallet: placement.placement_root,
          triggering_member_wallet: placement.referred_wallet,
          layer: placement.placement_layer,
          nft_level: 1, // Default, should be determined from member data
          reward_amount_usdc: 100,
          status: 'claimable'
        })

        return {
          triggered: true,
          info: {
            type: 'immediate_reward',
            amount: 100,
            position: placement.placement_position
          }
        }
      }

      // Create pending reward for R position (72-hour timer)
      if (placement.placement_position === 'R') {
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 72)

        await createRewardRecord(supabase, {
          root_wallet: placement.placement_root,
          triggering_member_wallet: placement.referred_wallet,
          layer: placement.placement_layer,
          nft_level: 1,
          reward_amount_usdc: 100,
          status: 'pending',
          expires_at: expiresAt.toISOString()
        })

        return {
          triggered: true,
          info: {
            type: 'pending_reward',
            amount: 100,
            position: placement.placement_position,
            pending_hours: 72
          }
        }
      }
    }

    return { triggered: false }

  } catch (error) {
    console.error('Check reward trigger error:', error)
    return { triggered: false, error: error.message }
  }
}

// Create reward record
async function createRewardRecord(supabase: any, rewardData: any) {
  const { error } = await supabase
    .from('reward_claims')
    .insert({
      root_wallet: rewardData.root_wallet,
      triggering_member_wallet: rewardData.triggering_member_wallet,
      layer: rewardData.layer,
      nft_level: rewardData.nft_level,
      reward_amount_usdc: rewardData.reward_amount_usdc,
      status: rewardData.status,
      expires_at: rewardData.expires_at,
      metadata: {
        trigger_type: 'matrix_completion',
        layer_completed: rewardData.layer,
        created_by_api: 'matrix-operations'
      }
    })

  if (error) {
    console.error('Create reward record error:', error)
    throw new Error(`Failed to create reward record: ${error.message}`)
  }

  console.log(`✅ Reward record created: ${rewardData.reward_amount_usdc} USDC for ${rewardData.root_wallet}`)
}

// Get matrix statistics
async function getMatrixStatistics(supabase: any, rootWallet?: string) {
  if (rootWallet) {
    // Get statistics for specific root
    const { data: stats, error } = await supabase
      .from('matrix_statistics')
      .select('*')
      .eq('placement_root', rootWallet)
      .single()

    return new Response(JSON.stringify({
      success: true,
      statistics: stats,
      error: error?.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } else {
    // Get overall system statistics
    const { data: allStats, error } = await supabase
      .from('matrix_statistics')
      .select('*')
      .order('total_members', { ascending: false })
      .limit(20)

    return new Response(JSON.stringify({
      success: true,
      statistics: allStats || [],
      error: error?.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
}

// Get layer analysis
async function getLayerAnalysis(supabase: any, rootWallet: string, layer: number) {
  const { data: layerStats, error } = await supabase
    .from('layer_statistics')
    .select('*')
    .eq('placement_root', rootWallet)
    .eq('placement_layer', layer)

  const { data: layerMembers, error: membersError } = await supabase
    .from('referrals')
    .select(`
      referred_wallet,
      placement_position,
      referred_at,
      users!referrals_referred_wallet_fkey(username)
    `)
    .eq('placement_root', rootWallet)
    .eq('placement_layer', layer)
    .order('referred_at', { ascending: true })

  return new Response(JSON.stringify({
    success: true,
    layer_statistics: layerStats?.[0] || null,
    layer_members: layerMembers || [],
    layer,
    root_wallet: rootWallet,
    errors: {
      stats: error?.message,
      members: membersError?.message
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Check spillover opportunities
async function checkSpilloverOpportunities(supabase: any, walletAddress: string) {
  // Find all matrix roots where this wallet could potentially spill over
  const { data: allRoots } = await supabase
    .from('referrals')
    .select('placement_root')
    .eq('referrer_wallet', walletAddress)
    .or(`placement_root.eq.${walletAddress}`)

  const opportunities = []
  const uniqueRoots = [...new Set(allRoots?.map((r: any) => r.placement_root) || [walletAddress])]

  for (const root of uniqueRoots) {
    const spilloverPlacement = await findSpilloverPlacement(supabase, root, 10) // Check up to layer 10
    
    if (spilloverPlacement.available) {
      opportunities.push({
        matrix_root: root,
        available_placement: spilloverPlacement,
        estimated_rewards: calculateEstimatedRewards(spilloverPlacement.layer)
      })
    }
  }

  return new Response(JSON.stringify({
    success: true,
    spillover_opportunities: opportunities,
    total_opportunities: opportunities.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Sync matrix data
async function syncMatrixData(supabase: any) {
  console.log(`🔄 Starting matrix data synchronization...`)

  try {
    // Run matrix system overview to check current state
    const { data: systemOverview } = await supabase
      .rpc('get_matrix_system_overview')

    // Update matrix layer summaries
    const { data: allReferrals } = await supabase
      .from('referrals')
      .select('placement_root, placement_layer')
      .not('placement_root', 'is', null)

    const updates = []
    if (allReferrals) {
      const rootLayers = new Map()
      
      allReferrals.forEach((ref: any) => {
        const key = `${ref.placement_root}-${ref.placement_layer}`
        if (!rootLayers.has(key)) {
          rootLayers.set(key, { root: ref.placement_root, layer: ref.placement_layer, count: 0 })
        }
        rootLayers.get(key).count++
      })

      for (const [_, data] of rootLayers) {
        await supabase.rpc('update_matrix_layer_summary', {
          p_root_wallet: data.root,
          p_layer: data.layer
        })
        updates.push(`${data.root}-L${data.layer}`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sync_completed: true,
      system_overview: systemOverview || [],
      layer_summaries_updated: updates.length,
      updates_detail: updates
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Sync matrix data error:', error)
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

// Simulate placement without actually placing
async function simulatePlacement(supabase: any, referrerWallet: string, newMemberWallet: string) {
  console.log(`🎮 Simulating placement: ${referrerWallet} -> ${newMemberWallet}`)

  // Run the same logic as findOptimalPlacement but don't actually place
  const placementResult = await findOptimalPlacement(supabase, referrerWallet, newMemberWallet)
  const placementData = await placementResult.json()

  if (placementData.success && placementData.placement_found) {
    // Simulate reward calculations
    const rewardSimulation = {
      immediate_reward: ['L', 'M'].includes(placementData.position),
      pending_reward: placementData.position === 'R',
      reward_amount: 100,
      reward_delay_hours: placementData.position === 'R' ? 72 : 0
    }

    return new Response(JSON.stringify({
      success: true,
      simulation_result: {
        ...placementData,
        reward_simulation,
        note: 'This is a simulation - no actual placement was made'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }

  return placementResult
}