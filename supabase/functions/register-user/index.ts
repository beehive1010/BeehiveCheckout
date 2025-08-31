import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.16.1/mod.ts'

interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          wallet_address: string
          email: string
          username: string
          secondary_password_hash: string
          referrer_wallet?: string
          preferred_language?: string
          member_activated: boolean
          registration_expires_at?: string
          registration_timeout_hours?: number
          created_at: string
        }
        Insert: {
          wallet_address: string
          email: string
          username: string
          secondary_password_hash: string
          referrer_wallet?: string
          preferred_language?: string
          member_activated?: boolean
          registration_expires_at?: string
          registration_timeout_hours?: number
        }
      }
      bcc_balances: {
        Row: {
          wallet_address: string
          transferable: number
          restricted: number
          created_at: string
        }
        Insert: {
          wallet_address: string
          transferable?: number
          restricted?: number
        }
      }
    }
  }
}

const insertUserSchema = z.object({
  walletAddress: z.string(),
  email: z.string().email(),
  username: z.string().min(3),
  secondaryPasswordHash: z.string(),
  referrerWallet: z.string().optional(),
  preferredLanguage: z.string().optional(),
  isCompanyDirectReferral: z.boolean().optional(),
  referralCode: z.string().optional()
})

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

  if (method !== 'POST') {
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

    const body = await req.json()
    const validatedData = insertUserSchema.parse(body)

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('wallet_address', validatedData.walletAddress.toLowerCase())
      .single()

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'User already registered with this wallet address' }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          },
        },
      )
    }

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from('users')
      .select('username')
      .eq('username', validatedData.username)
      .single()

    if (existingUsername) {
      return new Response(
        JSON.stringify({ error: 'Username already taken. Please choose a different username.' }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          },
        },
      )
    }

    // Set registration timeout (48 hours default)
    const timeoutHours = 48
    const registrationExpiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000)

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        wallet_address: validatedData.walletAddress.toLowerCase(),
        email: validatedData.email,
        username: validatedData.username,
        secondary_password_hash: validatedData.secondaryPasswordHash,
        referrer_wallet: validatedData.referrerWallet?.toLowerCase(),
        preferred_language: validatedData.preferredLanguage || 'en',
        member_activated: false,
        registration_expires_at: registrationExpiresAt.toISOString(),
        registration_timeout_hours: timeoutHours
      })
      .select()
      .single()

    if (userError) {
      throw userError
    }

    // Initialize BCC balance
    const { error: balanceError } = await supabase
      .from('bcc_balances')
      .insert({
        wallet_address: user.wallet_address,
        transferable: 0,
        restricted: 0
      })

    if (balanceError) {
      console.error('Failed to create BCC balance:', balanceError)
      // Don't fail registration if balance creation fails
    }

    return new Response(
      JSON.stringify({ 
        user,
        message: 'Registration successful! You have 48 hours to upgrade to Level 1 membership.'
      }),
      {
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      },
    )

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error.name === 'ZodError') {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input data',
          details: error.errors
        }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          },
        },
      )
    }

    return new Response(
      JSON.stringify({ error: error.message }),
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