import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.16.1/mod.ts'

interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          wallet_address: string
          member_activated: boolean
          current_level: number
        }
        Update: {
          member_activated?: boolean
          current_level?: number
        }
      }
      membership_state: {
        Row: {
          wallet_address: string
          levels_owned: number[]
          active_level: number
          joined_at: string
          last_upgrade_at?: string
        }
        Insert: {
          wallet_address: string
          levels_owned: number[]
          active_level: number
          joined_at?: string
        }
        Update: {
          levels_owned?: number[]
          active_level?: number
          last_upgrade_at?: string
        }
      }
      orders: {
        Insert: {
          wallet_address: string
          membership_level: number
          amount_usdt: number
          payment_method: string
          status: string
          tx_hash?: string
        }
      }
    }
  }
}

const activationSchema = z.object({
  level: z.number().min(1).max(19),
  txHash: z.string().optional(),
  paymentMethod: z.string().default('demo')
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

    const body = await req.json()
    const { level, txHash, paymentMethod } = activationSchema.parse(body)

    // Calculate membership cost (Level 1 = 100 USDT, +50 USDT per level)
    const membershipCost = 50 + (level * 50)

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (userError) {
      return new Response(
        JSON.stringify({ error: 'User not found. Please register first.' }),
        {
          status: 404,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          },
        },
      )
    }

    // Create order record
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        wallet_address: walletAddress,
        membership_level: level,
        amount_usdt: membershipCost,
        payment_method: paymentMethod,
        status: 'completed',
        tx_hash: txHash
      })

    if (orderError) {
      console.error('Order creation error:', orderError)
    }

    // Update user activation status
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        member_activated: true,
        current_level: level
      })
      .eq('wallet_address', walletAddress)

    if (updateUserError) {
      throw updateUserError
    }

    // Create or update membership state
    const { data: existingMembership } = await supabase
      .from('membership_state')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingMembership) {
      // Update existing membership
      const newLevelsOwned = [...new Set([...existingMembership.levels_owned, level])]
      
      const { error: membershipError } = await supabase
        .from('membership_state')
        .update({
          levels_owned: newLevelsOwned,
          active_level: Math.max(existingMembership.active_level, level),
          last_upgrade_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress)

      if (membershipError) {
        throw membershipError
      }
    } else {
      // Create new membership state
      const { error: membershipError } = await supabase
        .from('membership_state')
        .insert({
          wallet_address: walletAddress,
          levels_owned: [level],
          active_level: level,
          joined_at: new Date().toISOString()
        })

      if (membershipError) {
        throw membershipError
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Level ${level} membership activated successfully!`,
        level,
        cost: membershipCost,
        txHash
      }),
      {
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      },
    )

  } catch (error) {
    console.error('Membership activation error:', error)
    
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