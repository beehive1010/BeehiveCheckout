import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const walletAddress = url.pathname.split('/').pop()

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method === 'GET') {
      // Get BCC balance data
      const { data: balanceData, error: balanceError } = await supabaseClient
        .from('user_balances')
        .select(`
          bcc_balance,
          bcc_locked,
          bcc_total_unlocked,
          bcc_used,
          last_updated,
          activation_tier,
          tier_multiplier
        `)
        .eq('wallet_address', walletAddress)
        .maybeSingle()

      if (balanceError) {
        console.error('Balance query error:', balanceError)
        return new Response(
          JSON.stringify({ error: 'Balance not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get recent BCC release logs
      const { data: releaseLogs, error: releaseError } = await supabaseClient
        .from('bcc_release_logs')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(5)

      if (releaseError) {
        console.error('Release logs query error:', releaseError)
      }

      // Calculate next release time (72 hours from last release)
      const latestRelease = releaseLogs?.[0]
      const nextReleaseTime = latestRelease 
        ? new Date(new Date(latestRelease.created_at).getTime() + 72 * 60 * 60 * 1000)
        : null

      // Get member level for BCC unlock calculations
      const { data: memberData } = await supabaseClient
        .from('members')
        .select('current_level')
        .eq('wallet_address', walletAddress)
        .maybeSingle()

      const response = {
        balance: {
          available: balanceData.bcc_balance || 0,
          locked: balanceData.bcc_locked || 0,
          totalUnlocked: balanceData.bcc_total_unlocked || 0,
          used: balanceData.bcc_used || 0,
          lastUpdated: balanceData.last_updated,
        },
        release: {
          nextReleaseTime: nextReleaseTime?.toISOString() || null,
          canRelease: balanceData.bcc_locked > 0,
          estimatedRelease: Math.min(balanceData.bcc_locked || 0, 100), // 100 BCC per 72hr cycle
        },
        member: {
          currentLevel: memberData?.current_level || 1,
          activationTier: balanceData.activation_tier || 1,
          tierMultiplier: balanceData.tier_multiplier || 1,
        },
        recentReleases: releaseLogs || [],
      }

      return new Response(
        JSON.stringify(response),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('BCC Balance function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})