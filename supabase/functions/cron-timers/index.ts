import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

console.log('🕒 Cron Reward Timers function started successfully!')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('⏰ Starting reward timer processing...')

    // Call database function to process expired timers
    const { data: timerResult, error: timerError } = await supabase.rpc('process_expired_timers')

    if (timerError) {
      console.error('Timer processing error:', timerError)
      throw timerError
    }

    console.log('Timer processing result:', timerResult)

    // Get upcoming expiring rewards for notifications
    const { data: upcomingTimers, error: upcomingError } = await supabase
      .from('reward_timers')
      .select(`
        id,
        recipient_wallet,
        timer_type,
        expires_at,
        layer_rewards!inner(reward_amount)
      `)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .lte('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()) // Expiring within 24 hours
      .eq('notification_sent', false)

    if (upcomingError) {
      console.error('Error getting upcoming expiring timers:', upcomingError)
    } else if (upcomingTimers && upcomingTimers.length > 0) {
      console.log(`Found ${upcomingTimers.length} upcoming expiring timers`)
      
      // Send notifications (notification system integration can be added here)
      for (const timer of upcomingTimers) {
        console.log(`Expiring soon: wallet ${timer.recipient_wallet}, type ${timer.timer_type}`)
        
        // Mark notification as sent
        await supabase
          .from('reward_timers')
          .update({ notification_sent: true })
          .eq('id', timer.id)
      }
    }

    // Check if Super Root has upgraded to Level 2
    await checkSuperRootUpgrade(supabase)

    return new Response(JSON.stringify({
      success: true,
      timer_processing: timerResult,
      upcoming_notifications: upcomingTimers?.length || 0,
      processed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Cron reward timer error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// Check Super Root upgrade status
async function checkSuperRootUpgrade(supabase) {
  try {
    // Get Super Root current status
    const { data: superRoot } = await supabase
      .from('members')
      .select('wallet_address, current_level')
      .eq('activation_sequence', 0)
      .single()

    if (superRoot && superRoot.current_level >= 2) {
      console.log('🎉 Super Root upgraded to Level 2, checking pending rewards...')
      
      // Update Super Root pending rewards to claimable
      const { data: updatedRewards, error: updateError } = await supabase
        .from('layer_rewards')
        .update({ 
          status: 'claimable',
          updated_at: new Date().toISOString()
        })
        .eq('reward_recipient_wallet', superRoot.wallet_address)
        .eq('status', 'pending')
        .select('id, reward_amount')

      if (updateError) {
        console.error('Error updating Super Root reward status:', updateError)
      } else if (updatedRewards && updatedRewards.length > 0) {
        console.log(`✅ Updated ${updatedRewards.length} Super Root rewards to claimable status`)
        
        // Deactivate related timers
        for (const reward of updatedRewards) {
          await supabase
            .from('reward_timers')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('reward_id', reward.id)
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking Super Root upgrade status:', error)
  }
}