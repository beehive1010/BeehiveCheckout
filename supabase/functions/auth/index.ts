// =============================================
// Beehive Platform - Authentication Edge Function
// Handles wallet authentication with Supabase Auth integration
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createThirdwebClient, verifySignature } from 'https://esm.sh/thirdweb@5'
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Initialize Thirdweb client
const thirdwebClient = createThirdwebClient({
  clientId: Deno.env.get('THIRDWEB_CLIENT_ID') || 'your-client-id',
})

// JWT Configuration
const JWT_AUD = 'beehive-platform'
const JWT_ISS = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth'
const JWT_EXPIRY = 3600 // 1 hour

// Generate or get stored JWT keys
let jwtKeyPair: CryptoKeyPair | null = null

async function getJWTKeys(): Promise<CryptoKeyPair> {
  if (jwtKeyPair) return jwtKeyPair
  
  // Try to get keys from environment (base64 encoded)
  const storedPrivateKey = Deno.env.get('JWT_PRIVATE_KEY')
  const storedPublicKey = Deno.env.get('JWT_PUBLIC_KEY')
  
  if (storedPrivateKey && storedPublicKey) {
    try {
      const privateKeyBuffer = Uint8Array.from(atob(storedPrivateKey), c => c.charCodeAt(0))
      const publicKeyBuffer = Uint8Array.from(atob(storedPublicKey), c => c.charCodeAt(0))
      
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      )
      
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
      )
      
      jwtKeyPair = { privateKey, publicKey }
      console.log('✅ JWT keys loaded from environment')
      return jwtKeyPair
    } catch (error) {
      console.warn('Failed to load stored JWT keys:', error)
    }
  }
  
  // Generate new keys if not found
  console.log('🔑 Generating new JWT keys...')
  jwtKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )
  
  // Export keys for storage (you should store these in environment variables)
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', jwtKeyPair.privateKey)
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', jwtKeyPair.publicKey)
  
  const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)))
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
  
  console.log('🔑 New JWT keys generated. Store these in environment variables:')
  console.log('JWT_PRIVATE_KEY:', privateKeyBase64)
  console.log('JWT_PUBLIC_KEY:', publicKeyBase64)
  
  return jwtKeyPair
}

interface AuthRequest {
  action: 'login' | 'register' | 'get-user' | 'claim-nft-token-1' | 'create-referral-link' | 'process-referral-link' | 'get-countdowns' | 'create-countdown' | 'log-connection' | 'jwks' | 'generate-jwt';
  walletAddress?: string;
  signature?: string;
  message?: string;
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
    // Handle GET requests for JWKS endpoint
    if (req.method === 'GET') {
      const url = new URL(req.url)
      if (url.pathname.endsWith('/.well-known/jwks.json') || url.searchParams.get('jwks') === 'true') {
        return await handleJWKS()
      }
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

    // JWKS and JWT generation don't require wallet address
    if (action === 'jwks') {
      return await handleJWKS()
    }
    
    if (action === 'generate-jwt' && walletAddress) {
      return await handleGenerateJWT(supabase, walletAddress, requestData)
    }

    // Other actions require wallet address
    if (!walletAddress && req.method !== 'OPTIONS') {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (action) {
      case 'login':
        return await handleWalletLogin(supabase, walletAddress!, requestData)
      
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

      case 'log-connection':
        return await handleLogConnection(supabase, walletAddress!, requestData)

      case 'jwks':
        return await handleJWKS()

      case 'generate-jwt':
        return await handleGenerateJWT(supabase, walletAddress!, requestData)

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

async function handleWalletLogin(supabase: any, walletAddress: string, data: any) {
  try {
    const { signature, message } = data
    
    if (!signature || !message) {
      return new Response(
        JSON.stringify({ error: 'Signature and message are required for wallet authentication' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify signature using Thirdweb
    try {
      const isValid = await verifySignature({
        message,
        signature,
        address: walletAddress,
        client: thirdwebClient,
      })

      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (verifyError) {
      console.error('Signature verification failed:', verifyError)
      return new Response(
        JSON.stringify({ error: 'Signature verification failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create wallet session (signature already verified)
    const { data: sessionResult, error: sessionError } = await supabase
      .rpc('create_wallet_session', {
        p_wallet_address: walletAddress,
        p_signature: signature,
        p_message: message
      })

    if (sessionError) throw sessionError

    if (!sessionResult.success) {
      return new Response(
        JSON.stringify({ error: sessionResult.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        wallet_address,
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

    const response = {
      success: true,
      session: sessionResult,
      user: userData || null,
      message: userData ? 'Login successful' : 'User not found'
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Login error:', error)
    return new Response(
      JSON.stringify({ error: 'Login failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

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
    const { data: userData, error } = await supabase
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
          max_layer,
          levels_owned,
          has_pending_rewards,
          total_direct_referrals,
          total_team_size,
          last_upgrade_at,
          last_reward_claim_at
        ),
        user_balances (
          bcc_transferable,
          bcc_locked,
          total_usdt_earned,
          pending_upgrade_rewards,
          rewards_claimed,
          updated_at
        )
      `)
      .eq('wallet_address', walletAddress)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    const response = {
      success: true,
      user: userData || null,
      isRegistered: !!userData,
      isActivated: userData?.members?.[0]?.is_activated || false
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get user error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch user data' }),
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

async function handleJWKS() {
  try {
    const keyPair = await getJWTKeys()
    
    // Export public key in JWK format
    const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
    
    // Create JWKS response
    const jwks = {
      keys: [{
        kty: publicKey.kty,
        use: 'sig',
        alg: 'ES256',
        kid: 'beehive-auth-key-1',
        crv: publicKey.crv,
        x: publicKey.x,
        y: publicKey.y
      }]
    }

    return new Response(
      JSON.stringify(jwks),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        } 
      }
    )
  } catch (error) {
    console.error('JWKS error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate JWKS' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGenerateJWT(supabase: any, walletAddress: string, data: any) {
  try {
    // Verify user exists and get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        wallet_address,
        username,
        email,
        current_level,
        members (
          is_activated,
          current_level
        )
      `)
      .eq('wallet_address', walletAddress)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const keyPair = await getJWTKeys()
    const now = Math.floor(Date.now() / 1000)
    
    // Create JWT payload
    const payload = {
      iss: JWT_ISS, // Issuer
      aud: JWT_AUD, // Audience 
      sub: walletAddress, // Subject (wallet address)
      iat: now, // Issued at
      exp: now + JWT_EXPIRY, // Expires at
      wallet_address: walletAddress,
      username: userData.username,
      email: userData.email,
      current_level: userData.current_level,
      is_activated: userData.members?.[0]?.is_activated || false,
      user_level: userData.members?.[0]?.current_level || 0
    }

    // Sign JWT
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ 
        alg: 'ES256', 
        kid: 'beehive-auth-key-1',
        typ: 'JWT' 
      })
      .sign(keyPair.privateKey)

    const response = {
      success: true,
      jwt,
      payload: {
        wallet_address: walletAddress,
        username: userData.username,
        current_level: userData.current_level,
        is_activated: userData.members?.[0]?.is_activated || false
      },
      expires_in: JWT_EXPIRY,
      expires_at: new Date((now + JWT_EXPIRY) * 1000).toISOString()
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('JWT generation error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate JWT' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}