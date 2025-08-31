import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    )

    const walletAddress = req.headers.get('X-Wallet-Address')
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    const body = await req.json()
    const { connectionType, userAgent, referrerUrl, ...additionalData } = body

    // Log wallet connection to database
    const { data, error } = await supabaseClient
      .from('wallet_connections')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        connection_type: connectionType,
        user_agent: userAgent,
        referrer_url: referrerUrl,
        additional_data: additionalData,
        connected_at: new Date().toISOString()
      })

    if (error && error.code !== '23505') { // Ignore duplicate key errors
      throw error
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error logging wallet connection:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})