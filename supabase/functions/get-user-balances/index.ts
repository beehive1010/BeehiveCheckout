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

    // Get user balances from multiple tables
    const [bccResult, cthResult, pendingResult] = await Promise.all([
      supabaseClient
        .from('bcc_balances')
        .select('transferable, restricted')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single(),
      
      supabaseClient
        .from('cth_balances')
        .select('balance')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single(),
      
      supabaseClient
        .from('pending_timers')
        .select('amount, timer_end')
        .eq('wallet_address', walletAddress.toLowerCase())
        .gte('timer_end', new Date().toISOString())
    ])

    const balances = {
      bcc: {
        transferable: bccResult.data?.transferable || '0',
        restricted: bccResult.data?.restricted || '0',
        total: String(
          parseFloat(bccResult.data?.transferable || '0') + 
          parseFloat(bccResult.data?.restricted || '0')
        )
      },
      cth: {
        balance: cthResult.data?.balance || '0'
      },
      pending: pendingResult.data?.map(p => ({
        amount: p.amount,
        timerEnd: p.timer_end
      })) || []
    }

    return new Response(
      JSON.stringify(balances),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error fetching user balances:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})