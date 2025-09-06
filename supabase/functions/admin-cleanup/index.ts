// =============================================
// Beehive Platform - Admin Cleanup Function
// Handles user cleanup and maintenance tasks
// =============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
const ADMIN_KEY = Deno.env.get('ADMIN_SECRET_KEY') || 'beehive-admin-secret';
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Verify admin key
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey !== ADMIN_KEY) {
      return new Response(JSON.stringify({
        error: 'Unauthorized - Admin access required'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Handle GET requests - list cleanup candidates
    if (req.method === 'GET') {
      return await handleGetCleanupCandidates(supabase);
    }
    // Parse request body
    const requestData = await req.json();
    const { action } = requestData;
    switch(action){
      case 'cleanup-expired-users':
        return await handleCleanupExpiredUsers(supabase, requestData.dryRun || false);
      case 'cleanup-single-user':
        if (!requestData.walletAddress) {
          return new Response(JSON.stringify({
            error: 'Wallet address required for single user cleanup'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
        return await handleCleanupSingleUser(supabase, requestData.walletAddress, requestData.dryRun || false);
      case 'get-cleanup-candidates':
        return await handleGetCleanupCandidates(supabase);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
    }
  } catch (error) {
    console.error('Admin cleanup function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
async function handleGetCleanupCandidates(supabase) {
  try {
    const now = new Date();
    const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
    // Find users who are candidates for cleanup:
    // 1. Not activated members
    // 2. No active countdown timers
    // 3. Don't have root referrer (or explicitly exclude root referrer users)
    const { data: candidates } = await supabase.from('users').select(`
        wallet_address,
        referrer_wallet,
        username,
        created_at,
        members!inner(is_activated),
        countdown_timers(end_time, is_active)
      `).eq('members.is_activated', false).neq('referrer_wallet', ROOT_WALLET) // Don't cleanup users with root referrer
    ;
    const cleanupCandidates = [];
    if (candidates) {
      for (const user of candidates){
        // Check if user has active countdown
        const hasActiveCountdown = user.countdown_timers?.some((ct)=>ct.is_active && new Date(ct.end_time) > now);
        if (!hasActiveCountdown) {
          cleanupCandidates.push({
            wallet_address: user.wallet_address,
            referrer_wallet: user.referrer_wallet,
            username: user.username,
            created_at: user.created_at,
            days_since_creation: Math.floor((now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
          });
        }
      }
    }
    return new Response(JSON.stringify({
      success: true,
      candidates: cleanupCandidates,
      count: cleanupCandidates.length,
      message: `Found ${cleanupCandidates.length} users eligible for cleanup`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get cleanup candidates error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get cleanup candidates',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleCleanupExpiredUsers(supabase, dryRun) {
  try {
    const candidates = await handleGetCleanupCandidates(supabase);
    const candidatesData = await candidates.json();
    if (!candidatesData.success || candidatesData.candidates.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No users found for cleanup',
        cleaned: 0
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const results = [];
    let cleanedCount = 0;
    for (const candidate of candidatesData.candidates){
      const result = await cleanupSingleUserInternal(supabase, candidate.wallet_address, dryRun);
      results.push(result);
      if (result.success) cleanedCount++;
    }
    return new Response(JSON.stringify({
      success: true,
      message: dryRun ? `Dry run: Would clean up ${cleanedCount} users` : `Successfully cleaned up ${cleanedCount} users`,
      cleaned: cleanedCount,
      dryRun,
      results
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Cleanup expired users error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to cleanup expired users',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleCleanupSingleUser(supabase, walletAddress, dryRun) {
  try {
    const result = await cleanupSingleUserInternal(supabase, walletAddress, dryRun);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Cleanup single user error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to cleanup user',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function cleanupSingleUserInternal(supabase, walletAddress, dryRun) {
  try {
    const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
    // Check if user exists and is eligible for cleanup
    const { data: userData } = await supabase.from('users').select(`
        wallet_address,
        referrer_wallet,
        username,
        members(is_activated),
        countdown_timers(end_time, is_active)
      `).eq('wallet_address', walletAddress).single();
    if (!userData) {
      return {
        success: false,
        message: 'User not found',
        walletAddress
      };
    }
    // Don't cleanup users with root referrer
    if (userData.referrer_wallet === ROOT_WALLET) {
      return {
        success: false,
        message: 'User has root referrer - protected from cleanup',
        walletAddress
      };
    }
    // Don't cleanup activated members
    if (userData.members?.is_activated) {
      return {
        success: false,
        message: 'User is activated member - protected from cleanup',
        walletAddress
      };
    }
    // Check for active countdown
    const now = new Date();
    const hasActiveCountdown = userData.countdown_timers?.some((ct)=>ct.is_active && new Date(ct.end_time) > now);
    if (hasActiveCountdown) {
      return {
        success: false,
        message: 'User has active countdown - protected from cleanup',
        walletAddress
      };
    }
    if (dryRun) {
      return {
        success: true,
        message: 'Dry run: User would be cleaned up',
        walletAddress,
        dryRun: true
      };
    }
    // Perform cleanup - delete in order due to foreign key constraints
    console.log(`🗑️ Cleaning up user: ${walletAddress}`);
    await supabase.from('user_balances').delete().eq('wallet_address', walletAddress);
    await supabase.from('members').delete().eq('wallet_address', walletAddress);
    await supabase.from('referrals').delete().eq('member_wallet', walletAddress);
    await supabase.from('countdown_timers').delete().eq('wallet_address', walletAddress);
    await supabase.from('users').delete().eq('wallet_address', walletAddress);
    console.log(`✅ Successfully cleaned up user: ${walletAddress}`);
    return {
      success: true,
      message: 'User successfully cleaned up',
      walletAddress
    };
  } catch (error) {
    console.error(`Failed to cleanup user ${walletAddress}:`, error);
    return {
      success: false,
      message: `Cleanup failed: ${error.message}`,
      walletAddress
    };
  }
} // Updated Sat Sep  6 06:15:00 PM UTC 2025
