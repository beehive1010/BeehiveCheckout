import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          wallet_address: string
          email: string
          username: string
          member_activated: boolean
          current_level: number
          preferred_language: string
          registration_expires_at?: string
          created_at: string
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
      }
      bcc_balances: {
        Row: {
          wallet_address: string
          transferable: number
          restricted: number
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

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          {
            status: 404,
            headers: { 
              "Content-Type": "application/json",
              'Access-Control-Allow-Origin': '*',
            },
          },
        )
      }
      throw userError
    }

    // Get membership state
    const { data: membershipState } = await supabase
      .from('membership_state')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    // Get BCC balance
    const { data: bccBalance } = await supabase
      .from('bcc_balances')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    return new Response(
      JSON.stringify({
        user,
        membershipState,
        bccBalance: bccBalance || { transferable: 0, restricted: 0 },
        cthBalance: { balance: 0 } // CTH balance placeholder
      }),
      {
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        },
      },
    )

  } catch (error) {
    console.error('Get user error:', error)
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