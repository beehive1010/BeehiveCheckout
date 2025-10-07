// =============================================
// Beehive Platform - Matrix Management Edge Function
// Handles matrix placement, queries, and member management
// =============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase();
    if (!walletAddress) {
      return new Response(JSON.stringify({
        error: 'Wallet address required'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { action, ...requestData } = await req.json();
    switch(action){
      case 'get-matrix':
        return await handleGetMatrix(supabase, walletAddress, requestData);
      case 'place-member':
        return await handlePlaceMember(supabase, walletAddress, requestData);
      case 'get-downline':
        return await handleGetDownline(supabase, walletAddress, requestData);
      case 'get-upline':
        return await handleGetUpline(supabase, walletAddress, requestData);
      case 'get-matrix-stats':
        return await handleGetMatrixStats(supabase, walletAddress);
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
    console.error('Matrix function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
async function handleGetMatrix(supabase, walletAddress, data) {
  try {
    const rootWallet = data.rootWallet || walletAddress;
    const layer = data.layer || null;
    let query = supabase.from('referrals').select(`
        root_wallet,
        member_wallet,
        layer,
        position,
        parent_wallet,
        placer_wallet,
        placement_type,
        is_active,
        created_at,
        member_info:users!referrals_member_wallet_fkey (
          wallet_address,
          username,
          current_level
        ),
        member_data:members!referrals_member_wallet_fkey (
          is_activated,
          current_level,
          levels_owned,
          total_direct_referrals
        )
      `).eq('root_wallet', rootWallet).order('layer', {
      ascending: true
    }).order('position', {
      ascending: true
    });
    if (layer !== null) {
      query = query.eq('layer', layer);
    }
    const { data: matrixData, error } = await query;
    if (error) throw error;
    // Get matrix summary
    const { data: summaryData, error: summaryError } = await supabase.from('matrix_layer_summary').select('*').eq('root_wallet', rootWallet).order('layer', {
      ascending: true
    });
    if (summaryError) throw summaryError;
    // Calculate total team size and ActiveMember members
    const totalMembers = matrixData?.length || 0;
    const activeMembers = matrixData?.filter((m)=>m.member_data?.[0]?.is_activated)?.length || 0;
    const response = {
      success: true,
      matrix: {
        rootWallet,
        members: matrixData || [],
        summary: summaryData || [],
        stats: {
          totalMembers,
          activeMembers,
          layers: Math.max(...matrixData?.map((m)=>m.layer) || [
            0
          ])
        }
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get matrix error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch matrix data'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handlePlaceMember(supabase, walletAddress, data) {
  try {
    const { rootWallet, memberWallet, placerWallet, placementType = 'direct' } = data;
    // Validate that the requesting wallet can place members
    if (walletAddress !== rootWallet && walletAddress !== placerWallet) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Cannot place members in this matrix'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if member is activated
    const { data: memberData, error: memberError } = await supabase.from('members').select('is_activated, current_level').eq('wallet_address', memberWallet).single();
    if (memberError || !memberData?.is_activated) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Member must be activated to join matrix'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Place member in matrix
    const { data: result, error: placementError } = await supabase.rpc('place_member_in_matrix', {
      p_root_wallet: rootWallet,
      p_member_wallet: memberWallet,
      p_placer_wallet: placerWallet,
      p_placement_type: placementType
    });
    if (placementError) throw placementError;
    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const response = {
      success: true,
      placement: {
        rootWallet,
        memberWallet,
        layer: result.layer,
        position: result.position,
        placementType
      },
      message: `Successfully placed ${memberWallet} in matrix at layer ${result.layer}, position ${result.position}`
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Place member error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to place member in matrix'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleGetDownline(supabase, walletAddress, data) {
  try {
    const { layer, limit = 50, offset = 0 } = data;
    let query = supabase.from('referrals').select(`
        member_wallet,
        layer,
        position,
        placement_type,
        is_active,
        created_at,
        member_info:users!referrals_member_wallet_fkey (
          wallet_address,
          username,
          current_level,
          created_at
        ),
        member_data:members!referrals_member_wallet_fkey (
          is_activated,
          activated_at,
          current_level,
          levels_owned,
          total_direct_referrals,
          total_team_size
        )
      `).eq('root_wallet', walletAddress).order('layer', {
      ascending: true
    }).order('created_at', {
      ascending: false
    }).range(offset, offset + limit - 1);
    if (layer) {
      query = query.eq('layer', layer);
    }
    const { data: downlineData, error } = await query;
    if (error) throw error;
    const response = {
      success: true,
      downline: downlineData || [],
      pagination: {
        limit,
        offset,
        total: downlineData?.length || 0
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get downline error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch downline data'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleGetUpline(supabase, walletAddress, data) {
  try {
    // Find all upline members (where current user is in their matrix)
    const { data: uplineData, error } = await supabase.from('referrals').select(`
        root_wallet,
        layer,
        position,
        placement_type,
        created_at,
        root_info:users!referrals_root_wallet_fkey (
          wallet_address,
          username,
          current_level,
          created_at
        ),
        root_member:members!referrals_root_wallet_fkey (
          is_activated,
          current_level,
          levels_owned,
          total_direct_referrals
        )
      `).eq('member_wallet', walletAddress).order('layer', {
      ascending: true
    });
    if (error) throw error;
    const response = {
      success: true,
      upline: uplineData || []
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get upline error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch upline data'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleGetMatrixStats(supabase, walletAddress) {
  try {
    // Get matrix summary for user as root
    const { data: summaryData, error: summaryError } = await supabase.from('matrix_layer_summary').select('*').eq('root_wallet', walletAddress);
    if (summaryError) throw summaryError;
    // Get total referrals count
    const { data: referralCount, error: countError } = await supabase.from('referrals').select('member_wallet', {
      count: 'exact'
    }).eq('root_wallet', walletAddress);
    if (countError) throw countError;
    // Get direct referrals count
    const { data: directCount, error: directError } = await supabase.from('referrals').select('member_wallet', {
      count: 'exact'
    }).eq('root_wallet', walletAddress).eq('layer', 1);
    if (directError) throw directError;
    // Get recent matrix activity
    const { data: recentActivity, error: activityError } = await supabase.from('matrix_activity_log').select(`
        activity_type,
        member_wallet,
        layer,
        position,
        created_at,
        member_info:users!matrix_activity_log_member_wallet_fkey (
          username
        )
      `).eq('root_wallet', walletAddress).order('created_at', {
      ascending: false
    }).limit(10);
    if (activityError) throw activityError;
    const response = {
      success: true,
      stats: {
        totalReferrals: referralCount?.length || 0,
        directReferrals: directCount?.length || 0,
        layerSummary: summaryData || [],
        recentActivity: recentActivity || []
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get matrix stats error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch matrix statistics'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
