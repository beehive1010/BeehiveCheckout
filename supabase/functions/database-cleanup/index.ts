import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log(`🧹 Database cleanup function started!`)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
      }
    )

    console.log('🧹 Starting database cleanup - preserving only root user')

    // Show data before cleanup
    console.log('=== BEFORE CLEANUP ===')
    
    // Delete data in correct order to handle foreign key constraints
    
    // 1. countdown_timers (depends on members)
    console.log('Cleaning countdown_timers...')
    await supabase.from('countdown_timers')
      .delete()
      .neq('wallet_address', '0x0000000000000000000000000000000000000001')

    // 2. reward_claims (depends on members)  
    console.log('Cleaning reward_claims...')
    await supabase.from('reward_claims')
      .delete()
      .neq('triggering_member_wallet', '0x0000000000000000000000000000000000000001')

    // 3. user_balances (depends on users)
    console.log('Cleaning user_balances...')
    await supabase.from('user_balances')
      .delete()
      .neq('wallet_address', '0x0000000000000000000000000000000000000001')

    // 4. layer_rewards (depends on members via recipient_wallet and payer_wallet)
    console.log('Cleaning layer_rewards...')
    const { error: layerRewardsError } = await supabase
      .from('layer_rewards')
      .delete()
      .or(`recipient_wallet.neq.0x0000000000000000000000000000000000000001,payer_wallet.neq.0x0000000000000000000000000000000000000001`)

    // 5. spillover_matrix (depends on users via member_wallet)
    console.log('Cleaning spillover_matrix...')
    const { error: matrixError } = await supabase
      .from('spillover_matrix')
      .delete()
      .or(`matrix_root.neq.0x0000000000000000000000000000000000000001,member_wallet.neq.0x0000000000000000000000000000000000000001`)

    // 6. referrals (depends on members via member_wallet)
    console.log('Cleaning referrals...')
    await supabase.from('referrals')
      .delete()
      .neq('referred_wallet', '0x0000000000000000000000000000000000000001')

    // 7. membership (depends on members)
    console.log('Cleaning membership...')
    await supabase.from('membership')
      .delete()
      .neq('wallet_address', '0x0000000000000000000000000000000000000001')

    // 8. platform_fees (keep only root related)
    console.log('Cleaning platform_fees...')
    await supabase.from('platform_fees')
      .delete()
      .neq('payer_wallet', '0x0000000000000000000000000000000000000001')

    // 9. bcc_transactions (keep only root related)
    console.log('Cleaning bcc_transactions...')
    await supabase.from('bcc_transactions')
      .delete()
      .neq('wallet_address', '0x0000000000000000000000000000000000000001')

    // 10. members (depends on users)
    console.log('Cleaning members...')
    await supabase.from('members')
      .delete()
      .neq('wallet_address', '0x0000000000000000000000000000000000000001')

    // 11. users (base table)
    console.log('Cleaning users...')
    await supabase.from('users')
      .delete()
      .neq('wallet_address', '0x0000000000000000000000000000000000000001')

    // Show counts after cleanup
    console.log('=== AFTER CLEANUP ===')

    const { data: userCount } = await supabase.from('users').select('*', { count: 'exact' })
    const { data: memberCount } = await supabase.from('members').select('*', { count: 'exact' })
    const { data: referralCount } = await supabase.from('referrals').select('*', { count: 'exact' })
    
    console.log(`Users remaining: ${userCount?.length || 0}`)
    console.log(`Members remaining: ${memberCount?.length || 0}`)
    console.log(`Referrals remaining: ${referralCount?.length || 0}`)

    // Verify root user still exists
    const { data: rootUser } = await supabase
      .from('users')
      .select('username, wallet_address, role')
      .eq('wallet_address', '0x0000000000000000000000000000000000000001')
      .single()

    console.log('Root user preserved:', rootUser)

    return new Response(JSON.stringify({
      success: true,
      message: '🧹 Database cleanup completed - only root user preserved',
      rootUser: rootUser,
      counts: {
        users: userCount?.length || 0,
        members: memberCount?.length || 0,
        referrals: referralCount?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Database cleanup error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})