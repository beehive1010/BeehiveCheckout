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
  action: 'register' | 'get-user' | 'activate-membership' | 'create-countdown' | 'get-countdowns';
  walletAddress?: string;
  referrerWallet?: string;
  username?: string;
  email?: string;
  // Countdown timer params
  timerType?: string;
  title?: string;
  durationHours?: number;
  description?: string;
  autoAction?: string;
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

    // Check Supabase authentication first
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Supabase authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify Supabase JWT token
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid Supabase authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Most actions require wallet address
    if (!walletAddress && req.method !== 'OPTIONS') {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (action) {
      
      case 'register':
        return await handleUserRegistration(supabase, walletAddress!, requestData, authUser)
      
      case 'get-user':
        return await handleGetUser(supabase, walletAddress!)
      
      case 'activate-membership':
        return await handleActivateMembership(supabase, walletAddress!)

      case 'toggle-pending':
        return await handleTogglePending(supabase, walletAddress!, requestData)

      case 'check-pending':
        return await handleCheckPending(supabase, walletAddress!)

      case 'create-countdown':
        return await handleCreateCountdown(supabase, walletAddress!, requestData)

      case 'get-countdowns':
        return await handleGetCountdowns(supabase, walletAddress!)

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

async function handleUserRegistration(supabase: any, walletAddress: string, data: any, authUser: any) {
  try {
    // Check if user already exists in users table
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

    // Create user record - using actual database schema
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        wallet_address: walletAddress,
        referrer_wallet: validReferrerWallet,
        username: data.username || authUser.user_metadata?.username || null,
        email: data.email || authUser.email || null,
        current_level: 0,
        is_upgraded: false,
        upgrade_timer_enabled: false
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
        has_pending_rewards: false,
        upgrade_reminder_enabled: false,
        total_direct_referrals: 0,
        total_team_size: 0
      })

    if (memberError) throw memberError

    // Create user balance record
    const { error: balanceError } = await supabase
      .from('user_balances')
      .insert({
        wallet_address: walletAddress,
        bcc_transferable: 0,
        bcc_locked: 0,
        total_usdt_earned: 0,
        pending_upgrade_rewards: 0,
        rewards_claimed: 0
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
    // Get member data with balance info
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select(`
        wallet_address,
        referrer_wallet,
        username,
        email,
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

    // Get balance data
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('bcc_transferable, bcc_locked')
      .eq('wallet_address', walletAddress)
      .single()

    // User doesn't exist - return null but success
    if (memberError && memberError.code === 'PGRST116') {
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

    if (memberError) throw memberError

    // Check if user is a member
    const isMember = memberData?.is_activated || false
    
    // For now, no pending system (can be added later if needed)
    const isPending = false

    // Combine member and balance data
    const userData = {
      ...memberData,
      user_balances: [balanceData || { bcc_transferable: 0, bcc_locked: 0 }]
    }

    // Determine user flow for frontend routing
    let userFlow = 'registration';
    if (memberData) {
      if (isMember) {
        userFlow = 'dashboard'; // Fully activated member
      } else {
        userFlow = 'claim_nft'; // Registered but needs to activate membership
      }
    }

    const response = {
      success: true,
      user: userData,
      isRegistered: !!memberData,
      isMember: isMember,
      canAccessReferrals: isMember && !isPending,
      isPending: isPending,
      memberData: memberData,
      userFlow: userFlow
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
    const { pendingEnabled, pendingHours } = data;
    
    // Update user's pending status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        pending_enabled: pendingEnabled,
        pending_hours: pendingHours || null,
        pending_until: pendingEnabled && pendingHours 
          ? new Date(Date.now() + (pendingHours * 60 * 60 * 1000)).toISOString() 
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Pending status ${pendingEnabled ? 'enabled' : 'disabled'}`,
        pendingEnabled,
        pendingHours
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Toggle pending error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to toggle pending status',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleCheckPending(supabase: any, walletAddress: string) {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('pending_enabled, pending_hours, pending_until')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError) throw userError;

    // Check if pending period has expired
    let isPending = false;
    if (userData.pending_enabled && userData.pending_until) {
      isPending = new Date() < new Date(userData.pending_until);
    } else if (userData.pending_enabled && !userData.pending_until) {
      isPending = true; // Indefinite pending
    }

    return new Response(
      JSON.stringify({
        success: true,
        isPending,
        pendingEnabled: userData.pending_enabled,
        pendingHours: userData.pending_hours,
        pendingUntil: userData.pending_until
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Check pending error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to check pending status',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleCreateCountdown(supabase: any, walletAddress: string, data: any) {
  try {
    const { timerType, title, durationHours, description, autoAction } = data;

    // Create countdown timer using correct table name
    const { data: newCountdown, error: countdownError } = await supabase
      .from('countdown_timers')
      .insert({
        wallet_address: walletAddress,
        timer_type: timerType,
        title: title,
        description: description || null,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + (durationHours * 60 * 60 * 1000)).toISOString(),
        auto_action: autoAction || 'delete_user_and_referrals', // Default action
        is_active: true
      })
      .select()
      .single();

    if (countdownError) throw countdownError;

    return new Response(
      JSON.stringify({
        success: true,
        countdown: newCountdown,
        message: 'Countdown timer created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Create countdown error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create countdown timer',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGetCountdowns(supabase: any, walletAddress: string) {
  try {
    const { data: countdowns, error: countdownError } = await supabase
      .from('countdown_timers')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (countdownError) throw countdownError;

    // Update expired countdowns and execute auto actions
    const now = new Date();
    const activeCountdowns = [];
    const expiredCountdowns = [];

    for (const countdown of countdowns || []) {
      if (new Date(countdown.end_time) <= now) {
        expiredCountdowns.push(countdown);
        
        // Execute auto action - delete user and referrals when countdown expires
        if (countdown.auto_action === 'delete_user_and_referrals') {
          console.log(`Executing auto action: deleting user and referrals for ${countdown.wallet_address}`);
          
          try {
            // Delete referrals first (foreign key dependencies)
            await supabase
              .from('referrals')
              .delete()
              .or(`root_wallet.eq.${countdown.wallet_address},member_wallet.eq.${countdown.wallet_address},parent_wallet.eq.${countdown.wallet_address},placer_wallet.eq.${countdown.wallet_address}`);
            
            // Delete user balances
            await supabase
              .from('user_balances')
              .delete()
              .eq('wallet_address', countdown.wallet_address);
            
            // Delete member record
            await supabase
              .from('members')
              .delete()
              .eq('wallet_address', countdown.wallet_address);
            
            // Finally delete user record
            await supabase
              .from('users')
              .delete()
              .eq('wallet_address', countdown.wallet_address);
              
            console.log(`✅ Deleted user and all referrals for ${countdown.wallet_address}`);
          } catch (deleteError) {
            console.error(`❌ Failed to delete user data for ${countdown.wallet_address}:`, deleteError);
          }
        }
      } else {
        activeCountdowns.push(countdown);
      }
    }

    // Deactivate expired countdowns
    if (expiredCountdowns.length > 0) {
      const expiredIds = expiredCountdowns.map(c => c.id);
      await supabase
        .from('countdown_timers')
        .update({ is_active: false })
        .in('id', expiredIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        countdowns: activeCountdowns,
        expiredCount: expiredCountdowns.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get countdowns error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch countdown timers',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

