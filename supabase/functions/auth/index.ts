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
  action: 'register' | 'get-user' | 'activate-membership' | 'create-countdown' | 'get-countdowns' | 'toggle-countdown-mode' | 'get-countdown-settings';
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
  // Admin settings
  enableCountdowns?: boolean;
  defaultCountdownHours?: number;
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

    // Handle sophisticated authentication flow
    let authUser = null
    let requiresAuth = false
    let shouldCleanupUser = false
    
    // Get wallet address first to determine auth requirements
    if (walletAddress) {
      // Check user existence
      const { data: userData } = await supabase
        .from('users')
        .select('wallet_address, auth_user_id')
        .eq('wallet_address', walletAddress)
        .single()
      
      // Check member status
      const { data: memberData } = await supabase
        .from('members')
        .select('is_activated')
        .eq('wallet_address', walletAddress)
        .single()
      
      // Check for active countdown timers
      const { data: countdownData } = await supabase
        .from('countdown_timers')
        .select('end_time, timer_type, is_active')
        .eq('wallet_address', walletAddress)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      const publicActions = ['get-user', 'register', 'create-countdown', 'get-countdowns', 'activate-membership']
      const now = new Date()
      
      console.log(`🔍 Auth Check - User: ${!!userData}, Member: ${!!memberData}, Active: ${memberData?.is_activated}, Countdown: ${!!countdownData}`)
      
      // Authentication flow logic
      if (!userData && !memberData) {
        // Case 1: No user, no membership → Only allow register
        requiresAuth = false
        if (action !== 'register' && !publicActions.includes(action)) {
          return new Response(
            JSON.stringify({ 
              error: 'User not found', 
              action_required: 'register',
              message: 'Please register first' 
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else if (userData && memberData?.is_activated) {
        // Case 2: Active member → Use member auth (skip user auth)
        requiresAuth = !publicActions.includes(action)
        console.log(`👑 Active member - Auth required: ${requiresAuth}`)
      } else if (userData && !memberData?.is_activated) {
        // Case 3: User exists but not active member
        if (countdownData && new Date(countdownData.end_time) > now) {
          // Has countdown time - allow operations (including NFT claiming)
          requiresAuth = false
          console.log(`⏰ User with countdown - No auth required for any operations`)
        } else if (action === 'activate-membership') {
          // Allow membership activation even without countdown
          requiresAuth = false
          console.log(`🎫 Allowing membership activation without countdown`)
        } else {
          // No countdown time - cleanup user and redirect to registration
          shouldCleanupUser = true
          requiresAuth = false
        }
      } else if (!userData && memberData) {
        // Case 4: Member exists but no user record (shouldn't happen, but handle it)
        requiresAuth = !publicActions.includes(action)
        console.log(`⚠️ Member without user record - Auth required: ${requiresAuth}`)
      } else {
        // Default case
        requiresAuth = false
      }
    }

    // Handle user cleanup if needed
    if (shouldCleanupUser && action === 'get-user') {
      try {
        console.log(`🗑️ Cleaning up inactive user without countdown: ${walletAddress}`)
        
        // Delete in order due to foreign key constraints
        await supabase.from('user_balances').delete().eq('wallet_address', walletAddress)
        await supabase.from('members').delete().eq('wallet_address', walletAddress)
        await supabase.from('referrals').delete().eq('member_wallet', walletAddress)
        await supabase.from('users').delete().eq('wallet_address', walletAddress)
        
        return new Response(
          JSON.stringify({
            error: 'Account expired',
            action_required: 'register_with_referral',
            message: 'Your registration has expired. Please re-register using a referral link and activate your membership.',
            cleanup: true
          }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (cleanupError) {
        console.error('Failed to cleanup user:', cleanupError)
      }
    }

    // If auth is required, verify the token
    if (requiresAuth) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authentication required for active members' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        )
        
        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: 'Invalid authentication' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        authUser = user
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Authentication verification failed' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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


      case 'create-countdown':
        return await handleCreateCountdown(supabase, walletAddress!, requestData)

      case 'get-countdowns':
        return await handleGetCountdowns(supabase, walletAddress!)

      case 'toggle-countdown-mode':
        return await handleToggleCountdownMode(supabase, walletAddress!, requestData)

      case 'get-countdown-settings':
        return await handleGetCountdownSettings(supabase, walletAddress!)

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
    // Create anonymous Supabase auth user if none exists
    if (!authUser) {
      const { data: newAuthUser, error: authCreateError } = await supabase.auth.signInAnonymously()
      if (authCreateError) {
        console.error('Failed to create auth user:', authCreateError)
      } else {
        authUser = newAuthUser.user
      }
    }

    // Check if user already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('wallet_address, referrer_wallet')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingUser) {
      // Sync auth user ID to existing user record
      if (authUser) {
        await supabase
          .from('users')
          .update({ 
            auth_user_id: authUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', walletAddress)
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'existing',
          message: 'User already registered',
          authUserId: authUser?.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate referrer exists and is an active member
    let validReferrerWallet = null
    if (data.referrerWallet) {
      const { data: referrerMember } = await supabase
        .from('members')
        .select('wallet_address, is_activated')
        .eq('wallet_address', data.referrerWallet)
        .single()
      
      if (referrerMember && referrerMember.is_activated) {
        validReferrerWallet = data.referrerWallet
        console.log(`✅ Valid active referrer found: ${data.referrerWallet}`)
      } else if (referrerMember && !referrerMember.is_activated) {
        console.log(`❌ Referrer ${data.referrerWallet} exists but not activated, proceeding without referrer`)
      } else {
        console.log(`❌ Referrer ${data.referrerWallet} not found or not a member, proceeding without referrer`)
      }
    }

    // Create user record - sync with auth user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        wallet_address: walletAddress,
        referrer_wallet: validReferrerWallet,
        username: data.username || authUser?.user_metadata?.username || null,
        email: data.email || authUser?.email || null,
        auth_user_id: authUser?.id || null,
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

    // Handle referral tree placement if there's a valid referrer
    if (validReferrerWallet) {
      try {
        // Get the next available position in the referrer's matrix
        const { data: matrixSummary } = await supabase
          .from('member_matrix_summary')
          .select('*')
          .eq('root_wallet', validReferrerWallet)
          .single()

        // Determine placement details
        let placementLayer = 1
        let placementPosition = 0
        let placementZone = 'L'
        
        if (matrixSummary) {
          placementLayer = matrixSummary.next_placement_layer
          placementPosition = matrixSummary.next_placement_position
          placementZone = matrixSummary.next_placement_zone
        }

        // Insert into referrals table
        await supabase
          .from('referrals')
          .insert({
            root_wallet: validReferrerWallet,
            member_wallet: walletAddress,
            layer: placementLayer,
            position: placementZone, // L, M, R format expected
            parent_wallet: validReferrerWallet, // For layer 1, parent is the referrer
            placer_wallet: validReferrerWallet,
            placement_type: 'direct',
            is_active: true
          })

        // Update referrer's direct referral count
        await supabase
          .from('members')
          .update({
            total_direct_referrals: supabase.rpc('increment', { increment_by: 1 })
          })
          .eq('wallet_address', validReferrerWallet)

      } catch (referralError) {
        console.error('Referral tree placement failed:', referralError)
        // Don't fail registration if referral placement fails
      }
    }

    // Create countdown timer for new users with referrals (if enabled)
    if (validReferrerWallet) {
      try {
        // Check if countdown mode is enabled
        const { data: settings } = await supabase
          .from('admin_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['countdown_mode_enabled', 'default_countdown_hours'])

        const countdownEnabled = settings?.find(s => s.setting_key === 'countdown_mode_enabled')?.setting_value === 'true'
        const countdownHours = parseInt(settings?.find(s => s.setting_key === 'default_countdown_hours')?.setting_value || '24')

        if (countdownEnabled) {
          const endTime = new Date(Date.now() + (countdownHours * 60 * 60 * 1000))
          
          await supabase
            .from('countdown_timers')
            .insert({
              wallet_address: walletAddress,
              timer_type: 'referral_join_timer',
              title: 'Complete Registration',
              description: `You have ${countdownHours} hours to complete your membership activation after joining via referral`,
              end_time: endTime.toISOString(),
              auto_action: 'require_auth', // After countdown, require auth
              is_active: true,
              metadata: {
                referrer_wallet: validReferrerWallet,
                countdown_hours: countdownHours
              }
            })
            
          console.log(`⏰ Countdown enabled: Created ${countdownHours}h timer for ${walletAddress}`)
        } else {
          console.log(`🚫 Countdown disabled: No timer created for ${walletAddress}`)
        }
      } catch (countdownError) {
        console.error('Failed to create countdown timer:', countdownError)
        // Don't fail registration if countdown creation fails
      }
    }

    // Create user balance record - using actual database schema
    try {
      await supabase
        .from('user_balances')
        .insert({
          wallet_address: walletAddress,
          bcc_transferable: 500.0, // Default 500 BCC
          bcc_locked: 0.0,
          total_usdt_earned: 0.0,
          pending_upgrade_rewards: 0.0,
          rewards_claimed: 0.0
        })
    } catch (insertError) {
      // If insert fails, try update (user might already exist)
      console.log('Insert failed, trying upsert:', insertError.message)
      const { error: upsertError } = await supabase
        .from('user_balances')
        .upsert({
          wallet_address: walletAddress,
          bcc_transferable: 500.0, // Default 500 BCC
          bcc_locked: 0.0,
          total_usdt_earned: 0.0,
          pending_upgrade_rewards: 0.0,
          rewards_claimed: 0.0
        }, { 
          onConflict: 'wallet_address'
        })
      if (upsertError) throw upsertError
    }


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

    // User doesn't exist - return null but success
    if ((memberError && memberError.code === 'PGRST116') || (userError && userError.code === 'PGRST116')) {
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
    if (userError) throw userError

    // Check if user is a member
    const isMember = memberData?.is_activated || false
    
    // For now, no pending system (can be added later if needed)
    const isPending = false

    // Combine member, user, and balance data
    const combinedUserData = {
      ...memberData,
      ...(userData || {}), // Add referrer_wallet, username, email from users table
      user_balances: [balanceData || { 
        bcc_transferable: 0, 
        bcc_restricted: 0, 
        bcc_locked: 0, 
        total_usdt_earned: 0, 
        available_usdt_rewards: 0 
      }]
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
      user: combinedUserData,
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

async function handleToggleCountdownMode(supabase: any, walletAddress: string, data: any) {
  try {
    // Check if user is admin (you may want to add proper admin check)
    const { enableCountdowns, defaultCountdownHours = 24 } = data;

    // Update admin settings
    await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'countdown_mode_enabled',
        setting_value: enableCountdowns ? 'true' : 'false',
        description: 'Enable/disable countdown timers for new referral users'
      }, { onConflict: 'setting_key' })

    await supabase
      .from('admin_settings')
      .upsert({
        setting_key: 'default_countdown_hours',
        setting_value: defaultCountdownHours.toString(),
        description: 'Default countdown hours for referral users'
      }, { onConflict: 'setting_key' })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Countdown mode ${enableCountdowns ? 'enabled' : 'disabled'}`,
        settings: {
          countdownEnabled: enableCountdowns,
          defaultHours: defaultCountdownHours
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Toggle countdown mode error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to toggle countdown mode',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGetCountdownSettings(supabase: any, walletAddress: string) {
  try {
    // Get current countdown settings
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['countdown_mode_enabled', 'default_countdown_hours'])

    const countdownEnabled = settings?.find(s => s.setting_key === 'countdown_mode_enabled')?.setting_value === 'true'
    const defaultHours = parseInt(settings?.find(s => s.setting_key === 'default_countdown_hours')?.setting_value || '24')

    return new Response(
      JSON.stringify({
        success: true,
        settings: {
          countdownEnabled: countdownEnabled || false,
          defaultHours: defaultHours || 24
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get countdown settings error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get countdown settings',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Updated Sat Sep  6 05:25:12 PM UTC 2025
