// Referral Links Management Function
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

    const walletAddress = req.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return new Response(JSON.stringify({
        error: 'Wallet address required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action } = await req.json();
    
    switch (action) {
      case 'create-referral-link':
        return await createReferralLink(supabase, walletAddress);
      case 'get-referral-link':
        return await getReferralLink(supabase, walletAddress);
      case 'get-referral-stats':
        return await getReferralStats(supabase, walletAddress);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Referral links error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function createReferralLink(supabase, walletAddress) {
  try {
    console.log(`🔗 Creating referral link for: ${walletAddress}`);

    // Check if user already has a referral link
    const { data: existingLink, error: checkError } = await supabase
      .from('referral_links')
      .select('*')
      .eq('referrer_wallet', walletAddress)
      .maybeSingle();

    if (existingLink && !checkError) {
      console.log(`✓ Referral link already exists: ${existingLink.link_code}`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Referral link already exists',
        link: `${Deno.env.get('FRONTEND_URL') || 'https://beehive-lifestyle.io'}/welcome?ref=${existingLink.link_code}`,
        link_code: existingLink.link_code,
        created_at: existingLink.created_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate unique link code
    const linkCode = generateLinkCode(walletAddress);
    
    // Create referral link record
    const { data: newLink, error: insertError } = await supabase
      .from('referral_links')
      .insert({
        referrer_wallet: walletAddress,
        link_code: linkCode,
        is_active: true,
        clicks: 0,
        conversions: 0
      })
      .select()
      .maybeSingle();

    if (insertError) {
      console.error('Create referral link error:', insertError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create referral link',
        details: insertError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const fullLink = `${Deno.env.get('FRONTEND_URL') || 'https://beehive-lifestyle.io'}/welcome?ref=${linkCode}`;
    
    console.log(`✅ Referral link created: ${fullLink}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Referral link created successfully',
      link: fullLink,
      link_code: linkCode,
      created_at: newLink.created_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create referral link error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create referral link',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getReferralLink(supabase, walletAddress) {
  try {
    const { data: linkData, error } = await supabase
      .from('referral_links')
      .select('*')
      .eq('referrer_wallet', walletAddress)
      .maybeSingle();

    if (error || !linkData) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No referral link found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const fullLink = `${Deno.env.get('FRONTEND_URL') || 'https://beehive-lifestyle.io'}/welcome?ref=${linkData.link_code}`;

    return new Response(JSON.stringify({
      success: true,
      link: fullLink,
      link_code: linkData.link_code,
      clicks: linkData.clicks || 0,
      conversions: linkData.conversions || 0,
      created_at: linkData.created_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get referral link error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get referral link'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getReferralStats(supabase, walletAddress) {
  try {
    // Get direct referrals count (direct referrals)
    const { count: directReferrals } = await supabase
      .from('referrals')
      .select('*', { count: 'exact' })
      .eq('referrer_wallet', walletAddress)
      .eq('referral_type', 'direct');

    // Get total team size (all referrals under this user) 
    const { count: totalTeam } = await supabase
      .from('referrals')
      .select('*', { count: 'exact' })
      .eq('referrer_wallet', walletAddress);

    // Get recent referrals for additional stats
    const { data: recentReferrals } = await supabase
      .from('referrals')
      .select('referred_wallet, created_at, status')
      .eq('referrer_wallet', walletAddress)
      .order('created_at', { ascending: false })
      .limit(10);

    return new Response(JSON.stringify({
      success: true,
      stats: {
        clicks: 0, // No referral links table, so no click tracking
        conversions: directReferrals || 0, // Use direct referrals as conversions
        direct_referrals: directReferrals || 0,
        total_team: totalTeam || 0,
        conversion_rate: '0.00', // No click data available
        recent_referrals: recentReferrals || [],
        active_referrals: (recentReferrals?.filter(r => r.status === 'active') || []).length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get referral stats error:', error);
    return new Response(JSON.stringify({
      success: true,
      stats: {
        clicks: 0,
        conversions: 0,
        direct_referrals: 0,
        total_team: 0,
        conversion_rate: '0.00'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}


function generateLinkCode(walletAddress) {
  // Generate a unique link code based on wallet address + timestamp
  const timestamp = Date.now().toString();
  const addressPart = walletAddress.slice(-8); // Last 8 characters of wallet
  const randomPart = Math.random().toString(36).substring(2, 8); // 6 random chars
  
  return `${addressPart}${timestamp.slice(-6)}${randomPart}`.toLowerCase();
}