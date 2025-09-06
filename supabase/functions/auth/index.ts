// =============================================
// Beehive Platform - Authentication Edge Function
// Handles wallet authentication with Supabase Auth integration
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Simplified auth function - InAppWallet handles authentication
// This function only handles user management and membership operations

interface AuthRequest {
  action: 'register' | 'get-user' | 'claim-nft-token-1' | 'create-referral-link' | 'process-referral-link' | 'get-countdowns' | 'create-countdown';
  walletAddress?: string;
  referrerWallet?: string;
  referralToken?: string;
  username?: string;
  email?: string;
  // Countdown timer params
  timerType?: string;
  title?: string;
  durationHours?: number;
  description?: string;
  autoAction?: string;
  // Referral link params
  baseUrl?: string;
  maxUses?: number;
  expiresDays?: number;
  claimData?: {
    claimMethod: string;
    referrerWallet?: string;
    transactionHash?: string;
    mintTxHash?: string;
    isOffChain?: boolean;
    targetLevel?: number;
    tokenId?: number;
    network?: string;
    amount?: string;
    chainId?: number;
    bridgeUsed?: boolean;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Handle GET requests - simple health check
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          service: 'beehive-auth',
          message: 'Beehive Platform Authentication Service'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase()
    
    // Parse request body
    let requestData: AuthRequest = { action: 'get-user' }
    try {
      const body = await req.json()
      requestData = body
    } catch {
      // For GET requests or requests without body, use query params
      const url = new URL(req.url)
      const action = url.searchParams.get('action') || 'get-user'
      requestData = { action: action as any }
    }

    const { action } = requestData

    // Most actions require wallet address
    if (!walletAddress && req.method !== 'OPTIONS') {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (action) {
      
      case 'register':
        return await handleUserRegistration(supabase, walletAddress!, requestData)
      
      case 'get-user':
        return await handleGetUser(supabase, walletAddress!)
      
      case 'claim-nft-token-1':
        return await handleNFTClaim(supabase, walletAddress!, requestData.claimData!)

      case 'create-referral-link':
        return await handleCreateReferralLink(supabase, walletAddress!, requestData)

      case 'process-referral-link':
        return await handleProcessReferralLink(supabase, walletAddress!, requestData)

      case 'get-countdowns':
        return await handleGetCountdowns(supabase, walletAddress!)

      case 'create-countdown':
        return await handleCreateCountdown(supabase, walletAddress!, requestData)

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Auth function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// handleWalletLogin function removed - InAppWallet handles authentication

async function handleUserRegistration(supabase: any, walletAddress: string, data: any) {
  try {
    // Create or update user
    const { data: result, error } = await supabase
      .rpc('upsert_user', {
        p_wallet_address: walletAddress,
        p_referrer_wallet: data.referrerWallet,
        p_username: data.username,
        p_email: data.email
      })

    if (error) throw error

    // Get complete user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        wallet_address,
        referrer_wallet,
        username,
        email,
        current_level,
        created_at,
        members (
          is_activated,
          activated_at,
          current_level,
          levels_owned,
          total_direct_referrals,
          total_team_size
        ),
        user_balances (
          bcc_transferable,
          bcc_locked,
          total_usdt_earned,
          pending_upgrade_rewards
        )
      `)
      .eq('wallet_address', walletAddress)
      .single()

    if (userError) throw userError

    const response = {
      success: true,
      action: result.action,
      user: userData,
      message: result.action === 'created' ? 'User registered successfully' : 'User updated successfully'
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return new Response(
      JSON.stringify({ error: 'Registration failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetUser(supabase: any, walletAddress: string) {
  try {
    // Simplified user query - just basic user table
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    // User doesn't exist - return null but success
    if (error && error.code === 'PGRST116') {
      return new Response(
        JSON.stringify({
          success: true,
          user: null,
          isRegistered: false,
          isActivated: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (error) throw error

    const response = {
      success: true,
      user: userData || null,
      isRegistered: !!userData,
      isActivated: userData?.member_activated || false // Assuming single field for member status
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get user error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch user data', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleNFTClaim(supabase: any, walletAddress: string, claimData: any) {
  try {
    // Ensure user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('wallet_address', walletAddress)
      .single()

    if (!existingUser) {
      // Create user first
      const { error: createError } = await supabase
        .rpc('upsert_user', {
          p_wallet_address: walletAddress,
          p_referrer_wallet: claimData.referrerWallet
        })

      if (createError) throw createError
    }

    // Generate transaction ID
    const transactionId = `nft_claim_${walletAddress}_${Date.now()}`

    // Create order record
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        wallet_address: walletAddress,
        order_type: 'membership',
        item_id: `level_${claimData.targetLevel || 1}`,
        amount_usdt: claimData.claimMethod === 'demo' ? 0 : 100,
        payment_method: claimData.claimMethod,
        status: 'completed',
        transaction_hash: claimData.transactionHash || transactionId,
        completed_at: new Date().toISOString(),
        metadata: {
          ...claimData,
          transaction_id: transactionId
        }
      })

    if (orderError) throw orderError

    // Activate member
    const { error: memberError } = await supabase
      .from('members')
      .update({
        is_activated: true,
        activated_at: new Date().toISOString(),
        current_level: claimData.targetLevel || 1,
        levels_owned: [claimData.targetLevel || 1],
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress)

    if (memberError) throw memberError

    // Update user current level
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        current_level: claimData.targetLevel || 1,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress)

    if (userUpdateError) throw userUpdateError

    // Credit initial BCC tokens (500 transferable + 10,350 locked)
    const { error: balanceError } = await supabase
      .from('user_balances')
      .update({
        bcc_transferable: 500,
        bcc_locked: 10350,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress)

    if (balanceError) throw balanceError

    // Place in referrer's matrix if referrer exists
    if (claimData.referrerWallet) {
      const { error: matrixError } = await supabase
        .rpc('place_member_in_matrix', {
          p_root_wallet: claimData.referrerWallet,
          p_member_wallet: walletAddress,
          p_placer_wallet: claimData.referrerWallet,
          p_placement_type: 'direct'
        })

      // Don't fail if matrix placement fails (referrer might not exist)
      if (matrixError) {
        console.warn('Matrix placement warning:', matrixError)
      }
    }

    const response = {
      success: true,
      transactionId,
      level: claimData.targetLevel || 1,
      bccCredited: {
        transferable: 500,
        locked: 10350
      },
      message: `Level ${claimData.targetLevel || 1} NFT claimed successfully! You've received 500 transferable BCC and 10,350 locked BCC tokens.`
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('NFT claim error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to claim NFT' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCreateReferralLink(supabase: any, walletAddress: string, data: any) {
  try {
    const { baseUrl = 'https://beehive-platform.com/register', maxUses, expiresDays } = data

    const { data: result, error } = await supabase
      .rpc('create_referral_link', {
        p_referrer_wallet: walletAddress,
        p_base_url: baseUrl,
        p_max_uses: maxUses,
        p_expires_days: expiresDays
      })

    if (error) throw error

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = {
      success: true,
      referralUrl: result.referral_url,
      referralToken: result.referral_token,
      referralId: result.referral_id,
      expiresAt: result.expires_at,
      maxUses: result.max_uses,
      message: `Referral link created successfully`
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Create referral link error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create referral link' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleProcessReferralLink(supabase: any, walletAddress: string, data: any) {
  try {
    const { referralToken } = data

    if (!referralToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Referral token required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process referral link (with wallet for registration claim, without for click tracking)
    const { data: result, error } = await supabase
      .rpc('process_referral_link', {
        p_referral_token: referralToken,
        p_claimer_wallet: walletAddress // Can be null for click tracking
      })

    if (error) throw error

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = {
      success: true,
      action: result.action,
      referrerWallet: result.referrer_wallet,
      referralToken: result.referral_token,
      ...(result.action === 'registration_claimed' && {
        claimedAt: result.claimed_at,
        message: `Successfully linked to referrer ${result.referrer_wallet}`
      }),
      ...(result.action === 'click_tracked' && {
        referralUrl: result.referral_url,
        message: 'Referral link clicked and tracked'
      })
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process referral link error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process referral link' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetCountdowns(supabase: any, walletAddress: string) {
  try {
    const { data: countdowns, error } = await supabase
      .rpc('get_active_countdowns', {
        p_wallet_address: walletAddress
      })

    if (error) throw error

    const response = {
      success: true,
      countdowns: countdowns || [],
      activeCount: countdowns?.filter((c: any) => !c.is_expired).length || 0
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get countdowns error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch countdown timers' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCreateCountdown(supabase: any, walletAddress: string, data: any) {
  try {
    const { timerType, title, durationHours, description, autoAction } = data

    if (!timerType || !title || !durationHours) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Timer type, title, and duration hours required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin for certain timer types
    const restrictedTypes = ['admin_override', 'system_maintenance', 'platform_event']
    if (restrictedTypes.includes(timerType)) {
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('wallet_address', walletAddress)
        .single()

      if (!userData?.is_admin) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Admin privileges required for this timer type'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { data: result, error } = await supabase
      .rpc('create_countdown_timer', {
        p_wallet_address: walletAddress,
        p_timer_type: timerType,
        p_title: title,
        p_duration_hours: durationHours,
        p_description: description,
        p_auto_action: autoAction,
        p_admin_wallet: walletAddress
      })

    if (error) throw error

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = {
      success: true,
      timerId: result.timer_id,
      timerType: result.timer_type,
      title: result.title,
      endTime: result.end_time,
      durationHours: result.duration_hours,
      message: `Countdown timer "${result.title}" created successfully`
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Create countdown error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create countdown timer' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleLogConnection(supabase: any, walletAddress: string, data: any) {
  try {
    // Just return success for connection logging - no actual logging needed
    // This endpoint exists for backward compatibility with old client code
    const response = {
      success: true,
      message: 'Connection logged successfully',
      walletAddress
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Log connection error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to log connection' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// JWT/JWKS functions removed - InAppWallet handles authentication