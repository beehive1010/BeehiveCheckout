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
  action: 'register' | 'get-user' | 'create-referral-link' | 'process-referral-link' | 'get-countdowns' | 'create-countdown' | 'activate-membership' | 'toggle-pending' | 'check-pending';
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
  // Pending system params
  pendingHours?: number;
  pendingEnabled?: boolean;
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
      
      case 'activate-membership':
        return await handleActivateMembership(supabase, walletAddress!)

      case 'create-referral-link':
        return await handleCreateReferralLink(supabase, walletAddress!, requestData)

      case 'process-referral-link':
        return await handleProcessReferralLink(supabase, walletAddress!, requestData)

      case 'get-countdowns':
        return await handleGetCountdowns(supabase, walletAddress!)

      case 'create-countdown':
        return await handleCreateCountdown(supabase, walletAddress!, requestData)

      case 'toggle-pending':
        return await handleTogglePending(supabase, walletAddress!, requestData)

      case 'check-pending':
        return await handleCheckPending(supabase, walletAddress!)

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
    // Check if user already exists (with member and balance data)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select(`
        wallet_address,
        referrer_wallet,
        username,
        email,
        members (
          is_activated
        ),
        user_balances (
          bcc_transferable,
          bcc_locked
        )
      `)
      .eq('wallet_address', walletAddress)
      .single()

    // If user exists, just return their current data
    if (existingUser && !checkError) {
      // Optionally update username/email if provided
      const updateData: any = {}
      if (data.username && data.username !== existingUser.username) {
        updateData.username = data.username
      }
      if (data.email && data.email !== existingUser.email) {
        updateData.email = data.email
      }
      
      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString()
        await supabase
          .from('users')
          .update(updateData)
          .eq('wallet_address', walletAddress)
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'existing',
          user: existingUser,
          message: 'User already registered'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // User doesn't exist or there was an error checking - proceed with creation
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    // Validate referrer exists if provided
    let validReferrerWallet = null
    if (data.referrerWallet) {
      const { data: referrerExists } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('wallet_address', data.referrerWallet)
        .single()
      
      if (referrerExists) {
        validReferrerWallet = data.referrerWallet
      } else {
        console.log(`Referrer ${data.referrerWallet} not found, proceeding without referrer`)
      }
    }

    // Create new user (basic user record)
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        wallet_address: walletAddress,
        referrer_wallet: validReferrerWallet,
        username: data.username || null,
        email: data.email || null,
        current_level: 0, // No level initially 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Create member record (not activated yet)
    const { error: memberError } = await supabase
      .from('members')
      .insert({
        wallet_address: walletAddress,
        is_activated: false,
        current_level: 0,
        max_layer: 0,
        levels_owned: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (memberError) throw memberError

    // Create user balance record with only existing columns
    const { error: balanceError } = await supabase
      .from('user_balances')
      .insert({
        wallet_address: walletAddress,
        bcc_transferable: 0,
        bcc_locked: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (balanceError) throw balanceError

    const response = {
      success: true,
      action: 'created',
      user: newUser,
      message: 'User registered successfully - ready to activate membership'
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Registration failed',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetUser(supabase: any, walletAddress: string) {
  try {
    // Get user data with member status using proper joins
    const { data: userData, error } = await supabase
      .from('users')
      .select(`
        wallet_address,
        referrer_wallet,
        username,
        email,
        current_level,
        is_upgraded,
        upgrade_timer_enabled,
        created_at,
        updated_at,
        members (
          is_activated,
          activated_at,
          current_level,
          max_layer,
          levels_owned,
          has_pending_rewards
        ),
        user_balances (
          bcc_transferable,
          bcc_locked
        )
      `)
      .eq('wallet_address', walletAddress)
      .single()

    // User doesn't exist - return null but success
    if (error && error.code === 'PGRST116') {
      return new Response(
        JSON.stringify({
          success: true,
          user: null,
          isRegistered: false,
          isMember: false,
          canAccessReferrals: false,
          isPending: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (error) throw error

    // Check if user is a member (from members table)
    const memberData = userData?.members?.[0] || null
    const isMember = memberData?.is_activated || false
    
    // Check pending status (using upgrade_timer_enabled from users table)
    const isPending = userData?.upgrade_timer_enabled || false

    const response = {
      success: true,
      user: userData || null,
      isRegistered: !!userData,
      isMember: isMember,
      canAccessReferrals: isMember && !isPending, // Only active members can access referrals
      isPending: isPending,
      memberData: memberData
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

async function handleActivateMembership(supabase: any, walletAddress: string) {
  try {
    // Check if member record exists
    const { data: memberData } = await supabase
      .from('members')
      .select('wallet_address, is_activated')
      .eq('wallet_address', walletAddress)
      .single()

    if (!memberData) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found. Please register first.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already activated
    if (memberData.is_activated) {
      return new Response(
        JSON.stringify({ 
          error: 'Membership is already activated' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Activate membership in members table
    const { error: activationError } = await supabase
      .from('members')
      .update({
        is_activated: true,
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress)

    if (activationError) throw activationError

    const response = {
      success: true,
      message: 'Membership activated! You can now access referral system and use nft-upgrade function for levels.'
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Membership activation error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to activate membership',
        details: error.message 
      }),
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

// Pending system functions for special users
async function handleTogglePending(supabase: any, walletAddress: string, data: any) {
  try {
    const { pendingHours, pendingEnabled } = data

    // Check if user is a member (only members can have pending status)
    const { data: memberData } = await supabase
      .from('members')
      .select('is_activated')
      .eq('wallet_address', walletAddress)
      .single()

    if (!memberData?.is_activated) {
      return new Response(
        JSON.stringify({ 
          error: 'Only activated members can have pending status' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update upgrade_timer_enabled in users table (this acts as pending)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        upgrade_timer_enabled: pendingEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress)

    if (updateError) throw updateError

    const response = {
      success: true,
      pendingEnabled,
      message: pendingEnabled 
        ? 'Pending timer activated - referrals temporarily blocked'
        : 'Pending timer deactivated - referrals restored'
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Toggle pending error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to toggle pending status',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleCheckPending(supabase: any, walletAddress: string) {
  try {
    // Get user and member data with joins
    const { data: userData } = await supabase
      .from('users')
      .select(`
        upgrade_timer_enabled,
        members (
          is_activated
        )
      `)
      .eq('wallet_address', walletAddress)
      .single()

    if (!userData) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const memberData = userData?.members?.[0] || null
    const isMember = memberData?.is_activated || false
    const isPending = userData.upgrade_timer_enabled || false

    const response = {
      success: true,
      isMember: isMember,
      isPending: isPending,
      canAccessReferrals: isMember && !isPending
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Check pending error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to check pending status',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}