import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

console.log(`👥 Member Management API启动成功!`)

interface MemberInfo {
  wallet_address: string;
  activation_sequence?: number;
  bcc_locked_initial?: number;
  bcc_locked_remaining?: number;
  current_level: number;
  has_pending_rewards: boolean;
  levels_owned: any[];
  referrer_wallet?: string;
  activation_time: string;
  updated_at: string;
}

interface MembershipInfo {
  wallet_address: string;
  activated_at?: string;
  activation_sequence: number;
  activation_tier?: number;
  bcc_locked_amount?: number;
  claim_status: string;
  nft_level: number;
  referrer_wallet?: string;
  tier_multiplier?: number;
}

interface UserInfo {
  wallet_address: string;
  email?: string;
  username?: string;
  pre_referrer?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

interface UserBalance {
  wallet_address: string;
  bcc_locked: number;
  bcc_total_initial: number;
  bcc_transferable: number;
  usdc_claimable: number;
  usdc_pending: number;
  usdc_claimed_total: number;
  current_tier?: number;
  tier_multiplier?: number;
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
    
    if (!walletAddress && !['list-members', 'system-stats'].includes(action || '')) {
      throw new Error('钱包地址缺失')
    }

    console.log(`👥 Member Management Action: ${action} for wallet: ${walletAddress}`)

    switch (action) {
      case 'get-member-info':
        return await getMemberInfo(supabase, walletAddress!)
      
      case 'get-complete-info':
        return await getCompleteUserInfo(supabase, walletAddress!)
      
      case 'get-matrix-status':
        return await getMatrixStatus(supabase, walletAddress!)
      
      case 'get-balance-details':
        return await getBalanceDetails(supabase, walletAddress!)
      
      case 'list-members':
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const offset = parseInt(url.searchParams.get('offset') || '0')
        const tier = url.searchParams.get('tier')
        return await listMembers(supabase, limit, offset, tier)
      
      case 'get-member-stats':
        return await getMemberStats(supabase, walletAddress!)
      
      case 'get-referral-tree':
        const depth = parseInt(url.searchParams.get('depth') || '3')
        return await getReferralTree(supabase, walletAddress!, depth)
      
      case 'system-stats':
        return await getSystemStats(supabase)
      
      case 'update-member':
        if (req.method !== 'PUT' && req.method !== 'POST') {
          throw new Error('Invalid method for update-member')
        }
        const updateData = await req.json()
        return await updateMemberInfo(supabase, walletAddress!, updateData)
      
      case 'sync-member-data':
        return await syncMemberData(supabase, walletAddress!)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Member Management Error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// Get basic member information
async function getMemberInfo(supabase: any, walletAddress: string) {
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()

  if (memberError) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Member not found',
      member: null,
      debug: { memberError }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    })
  }

  return new Response(JSON.stringify({
    success: true,
    member: memberData,
    currentLevel: memberData?.current_level || 0,
    hasActivated: !!memberData?.activation_sequence
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Get complete user information including membership, balances, and matrix status
async function getCompleteUserInfo(supabase: any, walletAddress: string) {
  // Use the user_complete_info view we created
  const { data: userInfo, error: userError } = await supabase
    .from('user_complete_info')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()

  if (userError) {
    console.error('User complete info error:', userError)
    return new Response(JSON.stringify({
      success: false,
      error: 'User information not found',
      debug: { userError }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    })
  }

  return new Response(JSON.stringify({
    success: true,
    user: userInfo
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Get matrix status for a member
async function getMatrixStatus(supabase: any, walletAddress: string) {
  const { data: matrixData, error: matrixError } = await supabase
    .from('referrals')
    .select(`
      *,
      placement_root_user:users!referrals_placement_root_fkey(username),
      referrer_user:users!referrals_referrer_wallet_fkey(username)
    `)
    .eq('referred_wallet', walletAddress)

  if (matrixError) {
    console.error('Matrix status error:', matrixError)
  }

  // Get matrix statistics for this user if they are a root
  const { data: matrixStats, error: statsError } = await supabase
    .rpc('analyze_matrix_structure')
    .eq('placement_root', walletAddress)

  return new Response(JSON.stringify({
    success: true,
    matrix_placement: matrixData,
    matrix_as_root: matrixStats || [],
    errors: {
      matrix: matrixError?.message,
      stats: statsError?.message
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Get detailed balance information
async function getBalanceDetails(supabase: any, walletAddress: string) {
  // Get balance summary from the view we created
  const { data: balanceData, error: balanceError } = await supabase
    .from('user_balance_summary')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()

  // Get recent BCC transactions
  const { data: transactions, error: transError } = await supabase
    .from('bcc_transactions')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(10)

  return new Response(JSON.stringify({
    success: true,
    balance: balanceData,
    recent_transactions: transactions || [],
    errors: {
      balance: balanceError?.message,
      transactions: transError?.message
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// List members with filters
async function listMembers(supabase: any, limit: number, offset: number, tier?: string) {
  let query = supabase
    .from('members')
    .select(`
      wallet_address,
      activation_sequence,
      current_level,
      activation_time,
      users!members_wallet_address_fkey(username, email)
    `)
    .order('activation_sequence', { ascending: true })
    .range(offset, offset + limit - 1)

  if (tier) {
    query = query.eq('current_level', parseInt(tier))
  }

  const { data: members, error: membersError } = await query

  // Get total count
  const { count, error: countError } = await supabase
    .from('members')
    .select('wallet_address', { count: 'exact', head: true })

  return new Response(JSON.stringify({
    success: true,
    members: members || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (offset + limit) < (count || 0)
    },
    errors: {
      members: membersError?.message,
      count: countError?.message
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Get member statistics
async function getMemberStats(supabase: any, walletAddress: string) {
  // Get referral statistics
  const { data: referralStats, error: refError } = await supabase
    .from('referrals')
    .select('referred_wallet, placement_layer, placement_position')
    .eq('referrer_wallet', walletAddress)

  // Get reward statistics
  const { data: rewardStats, error: rewardError } = await supabase
    .from('layer_rewards')
    .select('reward_amount, is_claimed, created_at')
    .eq('reward_recipient_wallet', walletAddress)

  const directReferrals = referralStats?.length || 0
  const totalRewards = rewardStats?.reduce((sum: number, reward: any) => sum + (reward.reward_amount || 0), 0) || 0
  const claimedRewards = rewardStats?.filter((r: any) => r.is_claimed)?.length || 0

  return new Response(JSON.stringify({
    success: true,
    stats: {
      direct_referrals: directReferrals,
      total_rewards_usdt: totalRewards,
      claimed_rewards_count: claimedRewards,
      pending_rewards_count: (rewardStats?.length || 0) - claimedRewards,
      matrix_placements_by_layer: referralStats?.reduce((acc: any, ref: any) => {
        acc[ref.placement_layer] = (acc[ref.placement_layer] || 0) + 1
        return acc
      }, {}) || {}
    },
    raw_data: {
      referrals: referralStats || [],
      rewards: rewardStats || []
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Get referral tree
async function getReferralTree(supabase: any, rootWallet: string, maxDepth: number) {
  const tree = await buildReferralTree(supabase, rootWallet, 1, maxDepth)
  
  return new Response(JSON.stringify({
    success: true,
    tree,
    root_wallet: rootWallet,
    max_depth: maxDepth
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Recursive function to build referral tree
async function buildReferralTree(supabase: any, walletAddress: string, currentDepth: number, maxDepth: number): Promise<any> {
  if (currentDepth > maxDepth) {
    return null
  }

  // Get user info
  const { data: userInfo } = await supabase
    .from('users')
    .select('username, email')
    .eq('wallet_address', walletAddress)
    .single()

  // Get member info
  const { data: memberInfo } = await supabase
    .from('members')
    .select('current_level, activation_sequence')
    .eq('wallet_address', walletAddress)
    .single()

  // Get direct referrals
  const { data: referrals } = await supabase
    .from('referrals')
    .select('referred_wallet, placement_position, placement_layer')
    .eq('referrer_wallet', walletAddress)
    .eq('placement_layer', 1) // Direct referrals only

  const children = []
  if (referrals && currentDepth < maxDepth) {
    for (const referral of referrals) {
      const childTree = await buildReferralTree(supabase, referral.referred_wallet, currentDepth + 1, maxDepth)
      if (childTree) {
        children.push({
          ...childTree,
          position: referral.placement_position,
          layer: referral.placement_layer
        })
      }
    }
  }

  return {
    wallet_address: walletAddress,
    username: userInfo?.username,
    email: userInfo?.email,
    current_level: memberInfo?.current_level || 0,
    activation_sequence: memberInfo?.activation_sequence,
    direct_referrals_count: referrals?.length || 0,
    children,
    depth: currentDepth
  }
}

// Get system statistics
async function getSystemStats(supabase: any) {
  // Use the system overview function
  const { data: systemOverview, error: overviewError } = await supabase
    .rpc('get_matrix_system_overview')

  // Get current activation tier
  const { data: currentTier, error: tierError } = await supabase
    .rpc('get_current_activation_tier')

  // Get matrix health check
  const { data: healthCheck, error: healthError } = await supabase
    .rpc('check_matrix_health')

  return new Response(JSON.stringify({
    success: true,
    system_overview: systemOverview || [],
    current_tier: currentTier?.[0] || null,
    health_check: healthCheck || [],
    errors: {
      overview: overviewError?.message,
      tier: tierError?.message,
      health: healthError?.message
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Update member information
async function updateMemberInfo(supabase: any, walletAddress: string, updateData: any) {
  const allowedFields = [
    'bcc_locked_initial',
    'bcc_locked_remaining',
    'current_level',
    'has_pending_rewards',
    'levels_owned'
  ]

  // Filter update data to only allowed fields
  const filteredData: any = {}
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredData[key] = updateData[key]
    }
  })

  if (Object.keys(filteredData).length === 0) {
    throw new Error('No valid fields to update')
  }

  filteredData.updated_at = new Date().toISOString()

  const { data: updatedMember, error: updateError } = await supabase
    .from('members')
    .update(filteredData)
    .eq('wallet_address', walletAddress)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Update failed: ${updateError.message}`)
  }

  return new Response(JSON.stringify({
    success: true,
    member: updatedMember,
    updated_fields: Object.keys(filteredData)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  })
}

// Sync member data from various sources
async function syncMemberData(supabase: any, walletAddress: string) {
  const results: any = {
    user_sync: false,
    membership_sync: false,
    balance_sync: false,
    matrix_sync: false,
    errors: {}
  }

  try {
    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (userError) {
      results.errors.user = userError.message
    } else {
      results.user_sync = true
    }

    // Check membership status
    const { data: membershipData, error: membershipError } = await supabase
      .from('membership')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (membershipError) {
      results.errors.membership = membershipError.message
    } else {
      results.membership_sync = true
    }

    // Check if member record exists and is consistent with membership
    if (membershipData?.activated_at) {
      console.log(`🔍 Checking member record consistency for: ${walletAddress}`);
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (memberError && memberError.code === 'PGRST116') {
        // Member doesn't exist, create it
        console.log(`Creating member record for activated user: ${walletAddress}`)
        
        const { data: newMember, error: createError } = await supabase
          .from('members')
          .insert({
            wallet_address: walletAddress,
            activation_sequence: membershipData.activation_sequence,
            current_level: membershipData.nft_level,
            referrer_wallet: membershipData.referrer_wallet,
            levels_owned: [membershipData.nft_level],
            has_pending_rewards: false,
            activation_time: membershipData.activated_at,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          results.errors.member_creation = createError.message
        } else {
          results.member_created = true
        }
      }
    }

    // Check balance records - only for verified registered users
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (balanceError) {
      results.errors.balance = balanceError.message
    } else {
      results.balance_sync = true
    }

    return new Response(JSON.stringify({
      success: true,
      sync_results: results,
      message: 'Data synchronization completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Sync member data error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      partial_results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}