import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          wallet_address: string
          member_activated: boolean
          registration_expires_at?: string
          registration_timeout_hours?: number
          referrer_wallet?: string
          created_at: string
        }
      }
    }
  }
}

serve(async (req) => {
  const { method } = req

  // Handle CORS
  if (method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Address',
      }
    })
  }

  if (method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    // Get wallet address from header
    const walletAddress = req.headers.get('X-Wallet-Address')?.toLowerCase()
    
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          },
        },
      )
    }

    // Parse query parameters for referral detection
    const url = new URL(req.url)
    const ref = url.searchParams.get('ref')
    const code = url.searchParams.get('code')
    const referrer = url.searchParams.get('referrer')

    // Check if user already exists
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    let registrationRequired = false
    let uplineWallet = null
    let isCompanyDirectReferral = false
    let referralCode = null

    if (!existingUser) {
      registrationRequired = true

      // Handle referral logic
      if (ref && ref.startsWith('0x')) {
        // Direct wallet address referral
        const { data: referrerUser } = await supabase
          .from('users')
          .select('wallet_address')
          .eq('wallet_address', ref.toLowerCase())
          .single()

        if (referrerUser) {
          uplineWallet = ref.toLowerCase()
          referralCode = ref
        }
      } else if (code === '001122') {
        // Company direct referral code
        isCompanyDirectReferral = true
        uplineWallet = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0' // Company wallet
        referralCode = code
      }

      // If no valid referral link and no special code, require form
      if (!uplineWallet && !isCompanyDirectReferral) {
        return new Response(
          JSON.stringify({
            registered: false,
            registrationRequired: true,
            needsReferralForm: true,
            message: 'Registration form required - no valid referral link detected'
          }),
          {
            headers: { 
              "Content-Type": "application/json",
              'Access-Control-Allow-Origin': '*',
            },
          },
        )
      }
    }

    return new Response(
      JSON.stringify({
        registered: !!existingUser,
        activated: existingUser?.member_activated || false,
        registrationRequired,
        uplineWallet,
        isCompanyDirectReferral,
        referralCode,
        registrationExpiresAt: existingUser?.registration_expires_at,
        registrationTimeoutHours: existingUser?.registration_timeout_hours || 48
      }),
      {
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      },
    )

  } catch (error) {
    console.error('Registration status check error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to check registration status' }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  }
})