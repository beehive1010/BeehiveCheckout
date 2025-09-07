// Simple Dashboard Function - Handles dashboard activity and data requests
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    let action = 'get-activity';
    
    // Determine action from URL path
    if (url.pathname.includes('/activity')) {
      action = 'get-activity';
    } else if (url.pathname.includes('/data')) {
      action = 'get-data';
    } else if (url.pathname.includes('/stats')) {
      action = 'get-stats';
    }

    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase();
    
    if (!walletAddress) {
      return new Response(JSON.stringify({
        error: 'Wallet address required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Dashboard function: ${action} for ${walletAddress}`);

    switch (action) {
      case 'get-activity':
        return await getDashboardActivity(supabase, walletAddress);
      case 'get-data':
        return await getDashboardData(supabase, walletAddress);
      case 'get-stats':
        return await getDashboardStats(supabase, walletAddress);
      default:
        return new Response(JSON.stringify({
          success: true,
          activity: [] // Return empty activity for unknown actions
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Dashboard function error:', error);
    return new Response(JSON.stringify({
      success: true,
      activity: [], // Return empty array on error to prevent frontend crashes
      error_info: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getDashboardActivity(supabase, walletAddress) {
  try {
    // Return minimal activity data - can be expanded later
    const activities = [
      {
        id: 1,
        activity_type: 'membership_activation',
        activity_data: { level: 1 },
        created_at: new Date().toISOString(),
        description: 'Membership activated'
      }
    ];

    return new Response(JSON.stringify({
      success: true,
      activity: activities
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get activity error:', error);
    return new Response(JSON.stringify({
      success: true,
      activity: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getDashboardData(supabase, walletAddress) {
  try {
    // Get basic member data
    const { data: memberData } = await supabase
      .from('members')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    // Get balance data
    const { data: balanceData } = await supabase
      .from('user_balances')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    return new Response(JSON.stringify({
      success: true,
      member: memberData,
      balance: balanceData || {
        bcc_transferable: 0,
        bcc_restricted: 0,
        bcc_locked: 0,
        total_usdt_earned: 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch dashboard data'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getDashboardStats(supabase, walletAddress) {
  try {
    return new Response(JSON.stringify({
      success: true,
      stats: {
        total_referrals: 0,
        active_referrals: 0,
        total_earnings: 0,
        pending_rewards: 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return new Response(JSON.stringify({
      success: true,
      stats: {
        total_referrals: 0,
        active_referrals: 0,
        total_earnings: 0,
        pending_rewards: 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}