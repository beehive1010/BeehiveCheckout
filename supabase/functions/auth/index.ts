// =============================================
// Beehive Platform - Authentication Edge Function
// Simplified version for actual database schema
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface AuthRequest {
  action: 'register' | 'get-user' | 'activate-membership' | 'toggle-pending' | 'check-pending';
  walletAddress?: string;
  referrerWallet?: string;
  username?: string;
  email?: string;
  pendingHours?: number;
  pendingEnabled?: boolean;
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

async function handleUserRegistration(supabase: any, walletAddress: string, data: any) {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('wallet_address, referrer_wallet')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingUser) {
      return new Response(
        JSON.stringify({
          success: true,
          action: 'existing',
          message: 'User already registered'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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

    // Create user record first
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        wallet_address: walletAddress,
        referrer_wallet: validReferrerWallet,
        username: data.username || null,
        email: data.email || null,
        current_level: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) throw userError

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

    // Create user balance record
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

    // Activate membership
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
      message: 'Membership activated! You can now access referral system.'
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

async function handleTogglePending(supabase: any, walletAddress: string, data: any) {
  try {
    // For now, return not implemented since we don't have users table
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Pending system not implemented without users table'
      }),
      { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    // Get member data
    const { data: memberData } = await supabase
      .from('members')
      .select('is_activated')
      .eq('wallet_address', walletAddress)
      .single()

    if (!memberData) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isMember = memberData?.is_activated || false
    const isPending = false // No pending system without users table

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