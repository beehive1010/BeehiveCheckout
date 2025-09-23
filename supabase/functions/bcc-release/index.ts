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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { walletAddress, triggerType = 'manual' } = await req.json()

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get current balance
    const { data: currentBalance, error: balanceError } = await supabaseClient
      .from('user_balances')
      .select('bcc_balance, bcc_locked, bcc_total_unlocked')
      .eq('wallet_address', walletAddress)
      .single()

    if (balanceError || !currentBalance) {
      return new Response(
        JSON.stringify({ error: 'Balance not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (currentBalance.bcc_locked <= 0) {
      return new Response(
        JSON.stringify({ error: 'No locked BCC to release' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check last release time (enforce 72-hour cooldown)
    const { data: lastRelease } = await supabaseClient
      .from('bcc_release_logs')
      .select('created_at')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lastRelease && triggerType === 'manual') {
      const timeSinceLastRelease = Date.now() - new Date(lastRelease.created_at).getTime()
      const seventyTwoHours = 72 * 60 * 60 * 1000
      
      if (timeSinceLastRelease < seventyTwoHours) {
        const timeRemaining = seventyTwoHours - timeSinceLastRelease
        return new Response(
          JSON.stringify({ 
            error: 'Release cooldown active',
            timeRemaining: timeRemaining,
            nextReleaseTime: new Date(Date.now() + timeRemaining).toISOString()
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Calculate release amount (100 BCC or remaining locked amount, whichever is smaller)
    const releaseAmount = Math.min(currentBalance.bcc_locked, 100)
    const newLockedAmount = currentBalance.bcc_locked - releaseAmount
    const newAvailableAmount = currentBalance.bcc_balance + releaseAmount
    const newTotalUnlocked = currentBalance.bcc_total_unlocked + releaseAmount

    // Get member level for logging
    const { data: memberData } = await supabaseClient
      .from('members')
      .select('current_level')
      .eq('wallet_address', walletAddress)
      .single()

    // Update balance
    const { error: updateError } = await supabaseClient
      .from('user_balances')
      .update({
        bcc_balance: newAvailableAmount,
        bcc_locked: newLockedAmount,
        bcc_total_unlocked: newTotalUnlocked,
        last_updated: new Date().toISOString(),
      })
      .eq('wallet_address', walletAddress)

    if (updateError) {
      console.error('Balance update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update balance' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the release
    const { error: logError } = await supabaseClient
      .from('bcc_release_logs')
      .insert({
        wallet_address: walletAddress,
        bcc_released: releaseAmount,
        bcc_remaining_locked: newLockedAmount,
        from_level: memberData?.current_level || 1,
        to_level: memberData?.current_level || 1,
        release_reason: triggerType === 'manual' ? 'Manual 72-hour release' : 'Automatic 72-hour release',
      })

    if (logError) {
      console.error('Release log error:', logError)
      // Continue despite logging error
    }

    return new Response(
      JSON.stringify({
        success: true,
        release: {
          amount: releaseAmount,
          remainingLocked: newLockedAmount,
          newAvailableBalance: newAvailableAmount,
          totalUnlocked: newTotalUnlocked,
        },
        message: `Successfully released ${releaseAmount} BCC`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('BCC Release function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})