// =============================================
// Beehive Platform - Simplified Authentication Function  
// Focuses on smooth user experience and registration/activation flow
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface AuthRequest {
  action: 'register' | 'get-user' | 'activate-membership';
  walletAddress?: string;
  referrerWallet?: string;
  username?: string;
  email?: string;
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
          service: 'beehive-auth-simplified',
          message: 'Beehive Platform Authentication Service - Simplified Version'
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

    console.log(`🔍 Auth Request - Action: ${action}, Wallet: ${walletAddress}`)

    switch (action) {
      case 'register':
        return await handleUserRegistration(supabase, walletAddress!, requestData)
      
      case 'get-user':
        return await handleGetUser(supabase, walletAddress!)
      
      case 'activate-membership':
        return await handleActivateMembership(supabase, walletAddress!)

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
    console.log(`📝 Registration request for: ${walletAddress}`)

    // Check if user already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('wallet_address, referrer_wallet')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingUser) {
      console.log(`✅ User already exists: ${walletAddress}`)
      return new Response(
        JSON.stringify({
          success: true,
          action: 'existing',
          message: 'User already registered',
          user: existingUser
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ROOT_WALLET = '0x0000000000000000000000000000000000000001'
    
    // Validate referrer or use root as default
    let validReferrerWallet = ROOT_WALLET // Default to root
    
    if (data.referrerWallet && data.referrerWallet !== ROOT_WALLET) {
      const { data: referrerMember } = await supabase
        .from('members')
        .select('wallet_address, is_activated')
        .eq('wallet_address', data.referrerWallet)
        .single()
      
      if (referrerMember && referrerMember.is_activated) {
        validReferrerWallet = data.referrerWallet
        console.log(`✅ Valid active referrer: ${data.referrerWallet}`)
      } else {
        console.log(`📍 Invalid/inactive referrer, using root: ${data.referrerWallet}`)
      }
    } else {
      console.log(`📍 No referrer provided, using root wallet`)
    }

    // Create user record
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        wallet_address: walletAddress,
        referrer_wallet: validReferrerWallet,
        username: data.username || `user_${walletAddress.slice(-6)}`,
        email: data.email || null,
        current_level: 0,
        is_upgraded: false,
        upgrade_timer_enabled: false
      })
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      throw userError
    }

    // Create member record (not activated yet)
    const { error: memberError } = await supabase
      .from('members')
      .insert({
        wallet_address: walletAddress,
        is_activated: false,
        current_level: 0,
        max_layer: 0,
        levels_owned: [],
        has_pending_rewards: false,
        upgrade_reminder_enabled: false,
        total_direct_referrals: 0,
        total_team_size: 0
      })

    if (memberError) {
      console.error('Member creation error:', memberError)
      throw memberError
    }

    // Create referral entry
    try {
      await supabase
        .from('referrals')
        .insert({
          root_wallet: validReferrerWallet,
          member_wallet: walletAddress,
          layer: 1,
          position: 'L', // Simplified placement
          parent_wallet: validReferrerWallet,
          placer_wallet: validReferrerWallet,
          placement_type: validReferrerWallet === ROOT_WALLET ? 'direct' : 'direct',
          is_active: true
        })
      console.log(`✅ Referral entry created for: ${walletAddress}`)
    } catch (referralError) {
      console.error('Referral creation failed (non-critical):', referralError)
    }

    // Create user balance record
    try {
      await supabase
        .from('user_balances')
        .insert({
          wallet_address: walletAddress,
          bcc_transferable: 500,
          bcc_locked: 0,
          total_usdt_earned: 0
        })
      console.log(`✅ Balance record created for: ${walletAddress}`)
    } catch (balanceError) {
      console.error('Balance creation failed (non-critical):', balanceError)
    }

    console.log(`🎉 Registration completed for: ${walletAddress}`)

    return new Response(
      JSON.stringify({
        success: true,
        action: 'created',
        user: newUser,
        message: 'User registered successfully - ready to activate membership'
      }),
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
    console.log(`👤 Get user request for: ${walletAddress}`)

    // Get member data 
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select(`
        wallet_address,
        is_activated,
        activated_at,
        current_level,
        max_layer,
        levels_owned,
        has_pending_rewards,
        created_at,
        updated_at
      `)
      .eq('wallet_address', walletAddress)
      .single()

    // Get user data for referrer_wallet, username, email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('referrer_wallet, username, email')
      .eq('wallet_address', walletAddress)
      .single()

    // Get balance data
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('bcc_transferable, bcc_restricted, bcc_locked, total_usdt_earned, available_usdt_rewards')
      .eq('wallet_address', walletAddress)
      .single()

    // User doesn't exist - return null but success (allows smooth registration flow)
    if ((memberError && memberError.code === 'PGRST116') || (userError && userError.code === 'PGRST116')) {
      console.log(`❌ User not found: ${walletAddress}`)
      return new Response(
        JSON.stringify({
          success: true,
          user: null,
          isRegistered: false,
          isMember: false,
          canAccessReferrals: false,
          isPending: false,
          userFlow: 'registration'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (memberError) throw memberError
    if (userError) throw userError

    const isMember = memberData?.is_activated || false
    
    // Sanitize referrer wallet - don't expose root wallet to frontend
    const ROOT_WALLET = '0x0000000000000000000000000000000000000001'
    const sanitizedUserData = {
      ...userData,
      referrer_wallet: userData?.referrer_wallet === ROOT_WALLET ? null : userData?.referrer_wallet
    }

    // Combine member, user, and balance data
    const combinedUserData = {
      ...memberData,
      ...sanitizedUserData,
      user_balances: [balanceData || { 
        bcc_transferable: 0, 
        bcc_restricted: 0, 
        bcc_locked: 0, 
        total_usdt_earned: 0, 
        available_usdt_rewards: 0 
      }]
    }

    // Determine user flow for frontend routing
    let userFlow = 'registration'
    if (memberData) {
      if (isMember) {
        userFlow = 'dashboard' // Fully activated member
      } else {
        userFlow = 'claim_nft' // Registered but needs to activate membership
      }
    }

    console.log(`✅ User data retrieved for: ${walletAddress}, Flow: ${userFlow}, Member: ${isMember}`)

    return new Response(
      JSON.stringify({
        success: true,
        user: combinedUserData,
        isRegistered: !!memberData,
        isMember: isMember,
        canAccessReferrals: isMember,
        isPending: false,
        memberData: memberData,
        userFlow: userFlow
      }),
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
    console.log(`🚀 Activation request for: ${walletAddress}`)

    // Check if member record exists
    const { data: memberData } = await supabase
      .from('members')
      .select('wallet_address, is_activated')
      .eq('wallet_address', walletAddress)
      .single()

    if (!memberData) {
      console.log(`❌ Member not found for activation: ${walletAddress}`)
      return new Response(
        JSON.stringify({ 
          error: 'User not found. Please register first.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already activated
    if (memberData.is_activated) {
      console.log(`⚠️ User already activated: ${walletAddress}`)
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Membership is already activated' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Activate membership
    const { error: activationError } = await supabase
      .from('members')
      .update({
        is_activated: true,
        activated_at: new Date().toISOString(),
        current_level: 1,
        levels_owned: [1],
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress)

    if (activationError) {
      console.error('Activation error:', activationError)
      throw activationError
    }

    // Update user record
    await supabase
      .from('users')
      .update({
        current_level: 1,
        is_upgraded: true
      })
      .eq('wallet_address', walletAddress)

    console.log(`🎉 Membership activated for: ${walletAddress}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Membership activated! Welcome to Beehive!'
      }),
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

// Updated Sat Sep  6 06:20:00 PM UTC 2025