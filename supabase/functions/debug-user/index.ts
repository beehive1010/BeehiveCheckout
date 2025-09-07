import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

console.log(`🔍 User Debug Function启动成功!`)

serve(async (req) => {
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
        },
      }
    )

    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase()
    
    if (!walletAddress) {
      throw new Error('钱包地址缺失')
    }

    console.log(`🔍 Debug用户状态: ${walletAddress}`)

    // 1. Check users table with both cases
    const { data: usersLower, error: usersLowerError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)

    const { data: usersOriginal, error: usersOriginalError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.charAt(0).toUpperCase() + walletAddress.slice(1))

    // 2. Check members table
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .eq('wallet_address', walletAddress)

    // 3. Check referrals table
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_wallet', walletAddress)

    // 4. Check wallet connection logs
    const { data: connectionLogs, error: logsError } = await supabase
      .from('wallet_connection_logs')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('connected_at', { ascending: false })
      .limit(5)

    // 5. Check user activities
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(10)

    // 6. Search for similar addresses (case variations)
    const addressUpper = walletAddress.toUpperCase()
    const addressChecksum = walletAddress.charAt(0) + walletAddress.slice(1).toLowerCase()
    
    const { data: similarUsers, error: similarError } = await supabase
      .from('users')
      .select('wallet_address, email, created_at, registration_status')
      .or(`wallet_address.eq.${walletAddress},wallet_address.eq.${addressUpper},wallet_address.eq.${addressChecksum}`)

    // 7. Check all tables for any trace of this address
    const debugResults = {
      walletAddress: walletAddress,
      search: {
        usersLower: usersLower?.length || 0,
        usersOriginal: usersOriginal?.length || 0,
        members: members?.length || 0,
        referrals: referrals?.length || 0,
        connectionLogs: connectionLogs?.length || 0,
        activities: activities?.length || 0,
        similarUsers: similarUsers?.length || 0
      },
      data: {
        users: usersLower || usersOriginal || [],
        members: members || [],
        referrals: referrals || [],
        recentConnections: connectionLogs?.slice(0, 2) || [],
        recentActivities: activities?.slice(0, 3) || [],
        similarAddresses: similarUsers || []
      },
      errors: {
        usersError: usersLowerError?.message,
        membersError: membersError?.message,
        referralsError: referralsError?.message,
        logsError: logsError?.message,
        activitiesError: activitiesError?.message,
        similarError: similarError?.message
      }
    }

    console.log('Debug结果:', JSON.stringify(debugResults, null, 2))

    return new Response(JSON.stringify({
      success: true,
      debug: debugResults,
      summary: {
        userExists: (usersLower?.length || 0) > 0 || (usersOriginal?.length || 0) > 0,
        memberExists: (members?.length || 0) > 0,
        hasReferrals: (referrals?.length || 0) > 0,
        hasConnections: (connectionLogs?.length || 0) > 0,
        hasActivities: (activities?.length || 0) > 0,
        totalTraces: (usersLower?.length || 0) + (members?.length || 0) + (connectionLogs?.length || 0) + (activities?.length || 0)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Debug错误:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      debug: `Debug function error: ${error.message}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})