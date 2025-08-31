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
          created_at: string
        }
        Insert: {
          wallet_address: string
          email: string
          username: string
          member_activated?: boolean
        }
        Update: {
          wallet_address?: string
          email?: string
          username?: string
          member_activated?: boolean
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

    if (method === 'GET') {
      // Check if wallet exists and get user info
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return new Response(
        JSON.stringify({
          verified: !!user,
          registered: !!user,
          activated: user?.member_activated || false,
          user: user || null
        }),
        {
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          },
        },
      )
    }

    if (method === 'POST') {
      // Verify wallet signature (simplified version)
      const { signature, message } = await req.json()
      
      // In a real implementation, you would verify the signature here
      // For now, we'll just check if the wallet exists
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      return new Response(
        JSON.stringify({
          verified: true,
          user: user || null,
          message: user ? 'Wallet verified and registered' : 'Wallet verified but not registered'
        }),
        {
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          },
        },
      )
    }

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

  } catch (error) {
    console.error('Verify wallet error:', error)
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