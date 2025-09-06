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

    // Note: Referral entry will be created during membership activation
    // Registration only stores the referrer_wallet in users table
    console.log(`📝 Referrer stored for later activation: ${validReferrerWallet}`)

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

    // Use the new SQL function to handle the complete activation flow
    const { data: activationResult, error: activationError } = await supabase
      .rpc('activate_member_with_nft_claim', {
        p_wallet_address: walletAddress,
        p_nft_type: 'membership',
        p_payment_method: 'demo_activation',
        p_transaction_hash: `activation_${Date.now()}`
      })

    if (activationError) {
      console.error('SQL activation function error:', activationError)
      throw activationError
    }

    if (!activationResult.success) {
      console.log(`❌ Activation failed: ${activationResult.error}`)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: activationResult.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process referral rewards for the new member
    try {
      const { data: rewardResult } = await supabase
        .rpc('process_referral_rewards', {
          p_new_member_wallet: walletAddress,
          p_activation_level: 1
        })
      
      if (rewardResult.success) {
        console.log(`💰 Referral rewards processed: ${rewardResult.total_rewards_distributed} USDT distributed across ${rewardResult.layers_processed} layers`)
      }
    } catch (rewardError) {
      console.error('Reward processing failed (non-critical):', rewardError)
      // Continue - member activation is successful even if rewards fail
    }

    console.log(`🎉 Complete member activation successful:`, activationResult)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Membership activated! Welcome to Beehive! 🎉',
        details: {
          wallet_address: activationResult.wallet_address,
          referrer_wallet: activationResult.referrer_wallet,
          level: activationResult.level,
          activated_at: activationResult.activated_at
        }
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