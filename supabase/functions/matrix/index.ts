// =============================================
// Beehive Platform - Matrix Management Edge Function (FIXED)
// Handles 3x3 spillover matrix, placement, and 19-layer tree structure with L-M-R positioning
// Compatible with new recursive 3x3 spillover referral system
// =============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// =============================================
// INTERFACES AND TYPES
// =============================================

// MatrixPosition interface for type safety
interface MatrixPosition {
  wallet_address: string;
  root_wallet: string;
  layer: number;
  position: string; // Format: "L", "M", "R", "L.L", "L.M", "L.R", "M.L", etc.
  parent_wallet?: string;
  is_activated: boolean;
  placement_order: number;
  created_at: string;
}

interface PlacementResult {
  success: boolean;
  layer: number;
  position: string;
  error?: string;
  conflictDetected?: boolean;
}

// =============================================
// MAIN SERVE HANDLER
// =============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const walletAddress = req.headers.get('x-wallet-address');
    let requestData;

    try {
      requestData = await req.json();
    } catch {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON payload'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const { action } = requestData;

    console.log(`🔷 Matrix Operations Action: ${action} for wallet: ${walletAddress}`);

    switch (action) {
      case 'get-matrix':
        return await handleGetMatrix(supabase, walletAddress, requestData);
      case 'place-member':
        return await handlePlaceMember(supabase, walletAddress, requestData);
      case 'get-downline':
        return await handleGetDownline(supabase, walletAddress, requestData);
      case 'get-upline':
        return await handleGetUpline(supabase, walletAddress, requestData);
      case 'get-matrix-stats':
        return await handleGetMatrixStats(supabase, walletAddress, requestData);
      case 'find-optimal-position':
        return await handleFindOptimalPosition(supabase, walletAddress, requestData);
      case 'process-spillover':
        return await handleProcessSpillover(supabase, walletAddress, requestData);
      default:
        return new Response(JSON.stringify({
          success: false,
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
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

// =============================================
// MATRIX PLACEMENT FIXING FUNCTIONS
// =============================================

// 修复的位置查找算法 - 严格检查位置占用
async function findNextAvailablePosition(supabase: any, rootWallet: string): Promise<PlacementResult> {
  console.log(`🔍 Finding next available position for root: ${rootWallet}`);
  
  // 从第1层开始检查
  for (let layer = 1; layer <= 19; layer++) {
    console.log(`📊 Checking layer ${layer}...`);
    
    // L-M-R 严格顺序检查
    const positions = ['L', 'M', 'R'];
    
    for (const position of positions) {
      // 检查 referrals 表中的占用情况
      const { data: existingReferrals, error: referralsError } = await supabase
        .from('referrals')
        .select('id, member_wallet')
        .ilike('matrix_root', rootWallet)
        .eq('matrix_layer', layer)
        .eq('matrix_position', position)
        .limit(1);
      
      if (referralsError) {
        console.error(`❌ Error checking referrals: ${referralsError.message}`);
        return {
          success: false,
          layer: 0,
          position: '',
          error: `Database error: ${referralsError.message}`
        };
      }
      
      // 检查 spillover_matrix 表中的占用情况
      const { data: existingPlacements, error: placementsError } = await supabase
        .from('spillover_matrix')
        .select('id, member_wallet')
        .ilike('matrix_root', rootWallet)
        .eq('matrix_layer', layer)
        .eq('matrix_position', position)
        .eq('is_active', true)
        .limit(1);
      
      if (placementsError) {
        console.error(`❌ Error checking placements: ${placementsError.message}`);
        return {
          success: false,
          layer: 0,
          position: '',
          error: `Database error: ${placementsError.message}`
        };
      }
      
      // 如果两个表都显示该位置空闲，则可以使用
      const isOccupied = (existingReferrals?.length > 0) || (existingPlacements?.length > 0);
      
      if (!isOccupied) {
        console.log(`✅ Found available position: Layer ${layer}, Position ${position}`);
        return {
          success: true,
          layer: layer,
          position: position
        };
      } else {
        console.log(`❌ Position occupied: Layer ${layer}, Position ${position}`);
      }
    }
  }
  
  return {
    success: false,
    layer: 0,
    position: '',
    error: 'All 19 layers are full'
  };
}

// 修复的安全放置函数 - 带冲突检测和回滚
async function safelyPlaceMember(
  supabase: any, 
  rootWallet: string, 
  memberWallet: string, 
  layer: number, 
  position: string
): Promise<PlacementResult> {
  console.log(`🔒 Safely placing member ${memberWallet} at Layer ${layer}, Position ${position} for root ${rootWallet}`);
  
  try {
    // 使用数据库RPC函数进行安全放置
    const { data: placementResult, error: placementError } = await supabase.rpc(
      'safe_matrix_placement',
      {
        p_root_wallet: rootWallet,
        p_member_wallet: memberWallet,
        p_layer: layer,
        p_position: position
      }
    );
    
    if (placementError) {
      console.error(`❌ Placement failed: ${placementError.message}`);
      return {
        success: false,
        layer: layer,
        position: position,
        error: `Placement failed: ${placementError.message}`
      };
    }
    
    if (!placementResult?.success) {
      return {
        success: false,
        layer: layer,
        position: position,
        error: placementResult?.error || 'Unknown placement error'
      };
    }
    
    console.log(`✅ Member placed successfully: ${memberWallet} -> Layer ${layer}, Position ${position}`);
    return {
      success: true,
      layer: layer,
      position: position
    };
    
  } catch (error) {
    console.error(`❌ Safe placement error: ${error.message}`);
    return {
      success: false,
      layer: layer,
      position: position,
      error: `Safe placement error: ${error.message}`
    };
  }
}

// =============================================
// MAIN HANDLER FUNCTIONS (FIXED)
// =============================================

async function handleGetMatrix(supabase, walletAddress: string, data) {
  try {
    console.log('🎯 Matrix request data:', data);
    const { rootWallet, layer, limit = 1000 } = data;
    const targetRoot = (rootWallet || walletAddress)?.toLowerCase();
    
    console.log(`📊 Getting matrix for root: ${targetRoot}, wallet: ${walletAddress}`);

    if (!walletAddress) {
      console.error('❌ No wallet address provided');
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // ✅ FIXED: Use correct tables - referrals and spillover_matrix
    let membersQuery = supabase
      .from('members')
      .select('wallet_address, referrer_wallet, current_level, username, created_at')
      .ilike('referrer_wallet', targetRoot)
      .limit(limit);

    // ✅ FIXED: Query referrals table with correct fields
    let referralsQuery = supabase
      .from('referrals')
      .select(`
        member_wallet,
        referrer_wallet,
        matrix_parent,
        matrix_position,
        matrix_layer,
        matrix_root,
        created_at
      `)
      .or(`referrer_wallet.ilike.${targetRoot},matrix_parent.ilike.${targetRoot}`)
      .limit(limit);

    // ✅ FIXED: Query spillover_matrix table for spillover positions
    let spilloverQuery = supabase
      .from('spillover_matrix')
      .select(`
        member_wallet,
        matrix_root,
        matrix_parent,
        matrix_position,
        matrix_layer,
        is_active,
        placed_at
      `)
      .ilike('matrix_root', targetRoot)
      .eq('is_active', true)
      .limit(limit);

    console.log('🔍 Executing queries: members, referrals, spillover_matrix...');
    
    // Execute all queries in parallel
    const [membersResult, referralsResult, spilloverResult] = await Promise.allSettled([
      membersQuery,
      referralsQuery,
      spilloverQuery
    ]);

    let memberData = [];
    let referralData = [];
    let spilloverData = [];

    // Process members query result
    if (membersResult.status === 'fulfilled' && !membersResult.value.error) {
      memberData = membersResult.value.data || [];
      console.log(`✅ Members query successful: ${memberData.length} members found`);
    } else {
      console.warn('⚠️ Members query failed:', membersResult);
    }

    // Process referrals query result
    if (referralsResult.status === 'fulfilled' && !referralsResult.value.error) {
      referralData = referralsResult.value.data || [];
      console.log(`✅ Referrals query successful: ${referralData.length} referrals found`);
    } else {
      console.warn('⚠️ Referrals query failed:', referralsResult);
    }

    // Process spillover query result
    if (spilloverResult.status === 'fulfilled' && !spilloverResult.value.error) {
      spilloverData = spilloverResult.value.data || [];
      console.log(`✅ Spillover query successful: ${spilloverData.length} spillover positions found`);
    } else {
      console.warn('⚠️ Spillover query failed:', spilloverResult);
    }

    // ✅ FIXED: Combine data to build matrix structure using both tables
    const finalMatrixData = [];
    
    // Process referrals data first (original positions)
    referralData.forEach((referral, index) => {
      const member = memberData.find(m => 
        m.wallet_address.toLowerCase() === referral.member_wallet.toLowerCase()
      );
      
      if (member) {
        finalMatrixData.push({
          wallet_address: referral.member_wallet,
          root_wallet: referral.matrix_root || targetRoot,
          layer: referral.matrix_layer || 1,
          position: referral.matrix_position || `${index + 1}`,
          parent_wallet: referral.matrix_parent || referral.referrer_wallet,
          is_activated: true,
          placement_order: index + 1,
          created_at: referral.created_at || member.created_at,
          members: {
            current_level: member.current_level || 1,
            is_activated: true,
            username: member.username || null
          },
          source: 'referrals'
        });
      }
    });
    
    // Process spillover data (spillover positions)
    spilloverData.forEach((spillover, index) => {
      // Check if already added from referrals
      const alreadyProcessed = finalMatrixData.some(f => 
        f.wallet_address.toLowerCase() === spillover.member_wallet.toLowerCase() &&
        f.layer === spillover.matrix_layer
      );
      
      if (!alreadyProcessed) {
        const member = memberData.find(m => 
          m.wallet_address.toLowerCase() === spillover.member_wallet.toLowerCase()
        );
        
        if (member) {
          finalMatrixData.push({
            wallet_address: spillover.member_wallet,
            root_wallet: spillover.matrix_root,
            layer: spillover.matrix_layer,
            position: spillover.matrix_position,
            parent_wallet: spillover.matrix_parent,
            is_activated: spillover.is_active,
            placement_order: referralData.length + index + 1,
            created_at: spillover.placed_at,
            members: {
              current_level: member.current_level || 1,
              is_activated: spillover.is_active,
              username: member.username || null
            },
            source: 'spillover'
          });
        }
      }
    });
    
    // Add remaining members not in either table (direct referrals only)
    memberData.forEach((member, index) => {
      const alreadyProcessed = finalMatrixData.some(f => 
        f.wallet_address.toLowerCase() === member.wallet_address.toLowerCase()
      );
      
      if (!alreadyProcessed) {
        finalMatrixData.push({
          wallet_address: member.wallet_address,
          root_wallet: targetRoot,
          layer: 1, // Direct referrals are layer 1
          position: `${index + 1}`,
          parent_wallet: member.referrer_wallet,
          is_activated: true,
          placement_order: index + 1,
          created_at: member.created_at,
          members: {
            current_level: member.current_level || 1,
            is_activated: true,
            username: member.username || null
          },
          source: 'direct'
        });
      }
    });

    console.log(`🎯 Final matrix data processed: ${finalMatrixData.length} members`);

    // Build matrix tree structure
    const matrixTree = buildMatrixTree(finalMatrixData || []);

    // Calculate layer statistics
    const layerStats = calculateLayerStatistics(finalMatrixData || []);

    // Calculate spillover information
    const spilloverAnalysis = calculateSpilloverAnalysis(finalMatrixData || []);

    // Format data for frontend compatibility
    const formattedMembers = (finalMatrixData || []).map(member => ({
      walletAddress: member.wallet_address,
      username: member.members?.username || null,
      level: member.members?.current_level || 1,
      layer: member.layer,
      position: member.placement_order,
      isActive: true,
      placedAt: member.created_at,
      downlineCount: 0,
      source: member.source || 'unknown'
    }));

    return new Response(JSON.stringify({
      success: true,
      data: {
        rootWallet: targetRoot,
        members: formattedMembers,
        totalLayers: Math.max(...(finalMatrixData?.map(m => m.layer) || [0])),
        totalMembers: finalMatrixData?.length || 0,
        referralMembers: referralData.length,
        spilloverMembers: spilloverData.length,
        directMembers: finalMatrixData.filter(m => m.source === 'direct').length,
        // Keep original detailed data for advanced usage
        matrix_data: matrixTree,
        layer_statistics: layerStats,
        spillover_analysis: spilloverAnalysis
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Get matrix error:', error);
    
    const errorMessage = error.message || 'Unknown matrix error';
    const errorDetails = {
      error_type: error.constructor.name,
      timestamp: new Date().toISOString(),
      wallet_address: walletAddress,
      target_root: data.rootWallet,
      stack: error.stack?.substring(0, 500)
    };
    
    console.error('🔍 Error details:', errorDetails);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch matrix data',
      message: errorMessage,
      details: errorDetails
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

async function handlePlaceMember(supabase, walletAddress: string, data) {
  try {
    const { rootWallet, memberWallet, placerWallet, placementType = 'spillover' } = data;

    if (!walletAddress || !rootWallet || !memberWallet) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters: walletAddress, rootWallet, memberWallet'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`🎯 Placing member ${memberWallet} in matrix for root ${rootWallet}`);

    // ✅ FIXED: Use our enhanced placement algorithm
    const positionResult = await findNextAvailablePosition(supabase, rootWallet);

    if (!positionResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: positionResult.error || 'Failed to find available position'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // ✅ FIXED: Use safe placement function
    const placementResult = await safelyPlaceMember(
      supabase, 
      rootWallet, 
      memberWallet, 
      positionResult.layer, 
      positionResult.position
    );

    if (!placementResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: placementResult.error || 'Failed to place member in matrix'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Check if this placement triggers any spillover
    const spilloverResult = await processAutomaticSpillover(supabase, rootWallet, placementResult.layer);

    return new Response(JSON.stringify({
      success: true,
      message: 'Member placed successfully in matrix',
      data: {
        placement_result: placementResult,
        spillover_info: spilloverResult,
        position: placementResult.position,
        layer: placementResult.layer,
        root_wallet: rootWallet,
        member_wallet: memberWallet
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Place member error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to place member in matrix',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

async function handleFindOptimalPosition(supabase, walletAddress: string, data) {
  try {
    const { rootWallet, memberWallet } = data;

    if (!walletAddress || !rootWallet || !memberWallet) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // ✅ FIXED: Use corrected position finding algorithm
    const optimalPosition = await findNextAvailablePosition(supabase, rootWallet);

    if (!optimalPosition.success) {
      return new Response(JSON.stringify({
        success: false,
        error: optimalPosition.error || 'No available positions found'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // ✅ FIXED: Get current matrix size from both tables
    const { count: referralCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .ilike('matrix_root', rootWallet);

    const { count: spilloverCount } = await supabase
      .from('spillover_matrix')
      .select('*', { count: 'exact', head: true })
      .ilike('matrix_root', rootWallet)
      .eq('is_active', true);

    return new Response(JSON.stringify({
      success: true,
      data: {
        optimal_position: optimalPosition,
        current_matrix_size: {
          referrals: referralCount || 0,
          spillover: spilloverCount || 0,
          total: (referralCount || 0) + (spilloverCount || 0)
        },
        recommendation: `Place at Layer ${optimalPosition.layer}, Position ${optimalPosition.position}`
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Find optimal position error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to find optimal position',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

async function handleProcessSpillover(supabase, walletAddress: string, data) {
  try {
    const { rootWallet, triggerLayer } = data;

    const spilloverResult = await processAutomaticSpillover(supabase, rootWallet, triggerLayer);

    return new Response(JSON.stringify({
      success: true,
      message: 'Spillover processing completed',
      data: spilloverResult
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Process spillover error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process spillover',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

async function handleGetDownline(supabase, walletAddress: string, data) {
  try {
    const { layer, limit = 50, offset = 0 } = data;

    if (!walletAddress) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // ✅ FIXED: Query both referrals and spillover_matrix tables
    let referralsQuery = supabase
      .from('referrals')
      .select('*')
      .ilike('matrix_root', walletAddress)
      .neq('member_wallet', walletAddress) // Exclude self
      .order('matrix_layer')
      .order('created_at')
      .range(offset, offset + limit - 1);

    let spilloverQuery = supabase
      .from('spillover_matrix')
      .select('*')
      .ilike('matrix_root', walletAddress)
      .neq('member_wallet', walletAddress) // Exclude self
      .eq('is_active', true)
      .order('matrix_layer')
      .order('placed_at')
      .range(offset, offset + limit - 1);

    if (layer) {
      referralsQuery = referralsQuery.eq('matrix_layer', layer);
      spilloverQuery = spilloverQuery.eq('matrix_layer', layer);
    }

    const [referralsResult, spilloverResult] = await Promise.allSettled([
      referralsQuery,
      spilloverQuery
    ]);

    let downlineData = [];

    // Combine results from both tables
    if (referralsResult.status === 'fulfilled' && referralsResult.value.data) {
      downlineData.push(...referralsResult.value.data.map(item => ({ ...item, source: 'referrals' })));
    }

    if (spilloverResult.status === 'fulfilled' && spilloverResult.value.data) {
      downlineData.push(...spilloverResult.value.data.map(item => ({ ...item, source: 'spillover' })));
    }

    // Remove duplicates based on member_wallet and layer
    const uniqueDownline = downlineData.filter((item, index, self) =>
      index === self.findIndex(other => 
        other.member_wallet === item.member_wallet && other.matrix_layer === item.matrix_layer
      )
    );

    // Group by layers and calculate statistics
    const layerGroups = groupByLayer(uniqueDownline || []);
    const downlineStats = calculateDownlineStats(uniqueDownline || []);

    return new Response(JSON.stringify({
      success: true,
      data: {
        downline_members: uniqueDownline || [],
        layer_groups: layerGroups,
        statistics: downlineStats,
        total_downline: uniqueDownline?.length || 0,
        sources: {
          referrals: downlineData.filter(item => item.source === 'referrals').length,
          spillover: downlineData.filter(item => item.source === 'spillover').length
        }
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get downline error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch downline data',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

async function handleGetUpline(supabase, walletAddress: string, data) {
  try {
    if (!walletAddress) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // ✅ FIXED: Get member's matrix positions from both tables
    const [referralsResult, spilloverResult] = await Promise.allSettled([
      supabase
        .from('referrals')
        .select('*')
        .ilike('member_wallet', walletAddress),
      supabase
        .from('spillover_matrix')
        .select('*')
        .ilike('member_wallet', walletAddress)
        .eq('is_active', true)
    ]);

    const memberPositions = [];

    if (referralsResult.status === 'fulfilled' && referralsResult.value.data) {
      memberPositions.push(...referralsResult.value.data.map(item => ({ ...item, source: 'referrals' })));
    }

    if (spilloverResult.status === 'fulfilled' && spilloverResult.value.data) {
      memberPositions.push(...spilloverResult.value.data.map(item => ({ ...item, source: 'spillover' })));
    }

    const uplineData = [];

    // For each matrix position, get upline chain
    for (const position of memberPositions || []) {
      if (position.matrix_parent || position.referrer_wallet) {
        const parentWallet = position.matrix_parent || position.referrer_wallet;
        const uplineChain = await getUplineChain(supabase, parentWallet, position.matrix_root);
        uplineData.push({
          matrix_root: position.matrix_root,
          member_position: position.matrix_position,
          member_layer: position.matrix_layer,
          upline_chain: uplineChain,
          source: position.source
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: uplineData
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get upline error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch upline data',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

async function handleGetMatrixStats(supabase, walletAddress: string, data) {
  try {
    if (!walletAddress) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // ✅ FIXED: Get matrix statistics using correct tables
    console.log(`🔍 Getting matrix stats for wallet: ${walletAddress}`);
    
    // Get referrals data
    const { data: referralsStats, error: referralsError } = await supabase
      .from('referrals')
      .select('member_wallet, referrer_wallet, matrix_layer, created_at')
      .ilike('referrer_wallet', walletAddress);

    if (referralsError) {
      console.error('❌ Referrals stats query error:', referralsError);
      throw new Error(`Referrals stats query failed: ${referralsError.message}`);
    }

    // Get spillover data
    const { data: spilloverStats, error: spilloverError } = await supabase
      .from('spillover_matrix')
      .select('member_wallet, matrix_root, matrix_layer, placed_at')
      .ilike('matrix_root', walletAddress)
      .eq('is_active', true);

    if (spilloverError) {
      console.error('❌ Spillover stats query error:', spilloverError);
      throw new Error(`Spillover stats query failed: ${spilloverError.message}`);
    }

    // Get member's own info
    const { data: memberInfo, error: memberError } = await supabase
      .from('members')
      .select('wallet_address, referrer_wallet, current_level, created_at')
      .ilike('wallet_address', walletAddress)
      .single();

    if (memberError && memberError.code !== 'PGRST116') {
      console.error('❌ Member info query error:', memberError);
      throw new Error(`Member info query failed: ${memberError.message}`);
    }

    console.log(`✅ Found ${referralsStats?.length || 0} referrals and ${spilloverStats?.length || 0} spillover positions`);

    // Convert data to matrix format for calculations
    const rootMatrixData = [
      ...(referralsStats || []).map((item, index) => ({
        wallet_address: item.member_wallet,
        layer: item.matrix_layer || 1,
        is_activated: true,
        created_at: item.created_at,
        source: 'referrals'
      })),
      ...(spilloverStats || []).map((item, index) => ({
        wallet_address: item.member_wallet,
        layer: item.matrix_layer,
        is_activated: true,
        created_at: item.placed_at,
        source: 'spillover'
      }))
    ];

    const memberMatrixData = memberInfo ? [{
      root_wallet: memberInfo.referrer_wallet,
      layer: 1,
      is_activated: true,
      created_at: memberInfo.created_at
    }] : [];

    // Calculate comprehensive statistics
    const stats = {
      as_root: calculateRootMatrixStats(rootMatrixData),
      as_member: calculateMemberMatrixStats(memberMatrixData),
      overall: calculateOverallMatrixStats(rootMatrixData, memberMatrixData),
      direct_referrals: (referralsStats || []).filter(r => (r.matrix_layer || 1) === 1).length,
      spillover_positions: (spilloverStats || []).length,
      total_team_size: rootMatrixData.length,
      member_level: memberInfo?.current_level || 0,
      has_referrer: !!memberInfo?.referrer_wallet,
      referrer_wallet: memberInfo?.referrer_wallet || null,
      sources_breakdown: {
        referrals: (referralsStats || []).length,
        spillover: (spilloverStats || []).length
      }
    };

    return new Response(JSON.stringify({
      success: true,
      data: stats
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get matrix stats error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch matrix statistics',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

// =============================================
// HELPER FUNCTIONS FOR MATRIX LOGIC
// =============================================

function buildMatrixTree(matrixData: MatrixPosition[]): any {
  const tree = {};
  const layers = {};
  
  matrixData.forEach(member => {
    if (!layers[member.layer]) {
      layers[member.layer] = [];
    }
    layers[member.layer].push(member);
  });

  // Sort each layer by position priority (L, M, R, then sub-positions)
  Object.keys(layers).forEach(layer => {
    layers[layer].sort((a, b) => {
      return comparePositions(a.position, b.position);
    });
  });

  return {
    by_layer: layers,
    total_members: matrixData.length,
    max_layer: Math.max(...Object.keys(layers).map(Number), 0)
  };
}

function comparePositions(posA: string, posB: string): number {
  const positionWeights = { 'L': 1, 'M': 2, 'R': 3 };
  
  const getPositionWeight = (pos: string) => {
    const parts = pos.split('.');
    let weight = 0;
    parts.forEach((part, index) => {
      weight += (positionWeights[part] || 0) * Math.pow(10, parts.length - index - 1);
    });
    return weight;
  };

  return getPositionWeight(posA) - getPositionWeight(posB);
}

function calculateLayerStatistics(matrixData: MatrixPosition[]): any {
  const layerStats = {};
  
  matrixData.forEach(member => {
    const layer = member.layer;
    if (!layerStats[layer]) {
      layerStats[layer] = {
        total_positions: 0,
        filled_positions: 0,
        activated_members: 0,
        l_positions: 0,
        m_positions: 0,
        r_positions: 0,
        fill_rate: 0
      };
    }
    
    layerStats[layer].filled_positions++;
    if (member.is_activated) {
      layerStats[layer].activated_members++;
    }
    
    // Count L-M-R distribution
    if (member.position.startsWith('L') || member.position === 'L') {
      layerStats[layer].l_positions++;
    } else if (member.position.startsWith('M') || member.position === 'M') {
      layerStats[layer].m_positions++;
    } else if (member.position.startsWith('R') || member.position === 'R') {
      layerStats[layer].r_positions++;
    }
  });

  // Calculate max capacity and fill rates for each layer
  Object.keys(layerStats).forEach(layer => {
    const layerNum = parseInt(layer);
    const maxCapacity = Math.pow(3, layerNum); // 3^layer positions
    layerStats[layer].max_capacity = maxCapacity;
    layerStats[layer].fill_rate = (layerStats[layer].filled_positions / maxCapacity) * 100;
  });

  return layerStats;
}

function calculateSpilloverAnalysis(matrixData: MatrixPosition[]): any {
  const analysis = {
    spillover_opportunities: [],
    bottlenecks: [],
    optimization_suggestions: []
  };

  const layerStats = calculateLayerStatistics(matrixData);

  Object.keys(layerStats).forEach(layer => {
    const stats = layerStats[layer];
    const layerNum = parseInt(layer);
    
    // Identify spillover opportunities
    if (stats.fill_rate > 80 && layerNum < 19) {
      analysis.spillover_opportunities.push({
        layer: layerNum,
        next_layer: layerNum + 1,
        current_fill_rate: stats.fill_rate,
        spillover_potential: stats.filled_positions * 3
      });
    }
    
    // Identify bottlenecks (uneven L-M-R distribution)
    const imbalance = Math.max(stats.l_positions, stats.m_positions, stats.r_positions) - 
                     Math.min(stats.l_positions, stats.m_positions, stats.r_positions);
    if (imbalance > 2) {
      analysis.bottlenecks.push({
        layer: layerNum,
        imbalance_ratio: imbalance,
        distribution: {
          l: stats.l_positions,
          m: stats.m_positions,
          r: stats.r_positions
        }
      });
    }
  });

  return analysis;
}

async function processAutomaticSpillover(supabase, rootWallet: string, triggerLayer: number): Promise<any> {
  // ✅ FIXED: Check spillover readiness using both tables
  const [referralsResult, spilloverResult] = await Promise.allSettled([
    supabase
      .from('referrals')
      .select('*')
      .ilike('matrix_root', rootWallet)
      .eq('matrix_layer', triggerLayer),
    supabase
      .from('spillover_matrix')
      .select('*')
      .ilike('matrix_root', rootWallet)
      .eq('matrix_layer', triggerLayer)
      .eq('is_active', true)
  ]);

  let layerData = [];
  
  if (referralsResult.status === 'fulfilled' && referralsResult.value.data) {
    layerData.push(...referralsResult.value.data);
  }
  
  if (spilloverResult.status === 'fulfilled' && spilloverResult.value.data) {
    layerData.push(...spilloverResult.value.data);
  }

  if (!layerData || layerData.length === 0) {
    return { spillover_processed: false, reason: 'No data for trigger layer' };
  }

  // Calculate if layer is ready for spillover (when approaching capacity)
  const maxCapacity = Math.pow(3, triggerLayer);
  const fillRate = (layerData.length / maxCapacity) * 100;

  if (fillRate >= 80) { // Trigger spillover at 80% capacity
    return {
      spillover_processed: true,
      trigger_layer: triggerLayer,
      fill_rate: fillRate,
      members_affected: layerData.length,
      next_layer_preparations: triggerLayer < 19 ? triggerLayer + 1 : null
    };
  }

  return {
    spillover_processed: false,
    reason: `Layer ${triggerLayer} not ready for spillover (${fillRate}% filled)`
  };
}

async function getUplineChain(supabase, startWallet: string, rootWallet: string): Promise<any[]> {
  const uplineChain = [];
  let currentWallet = startWallet;

  while (currentWallet && currentWallet !== rootWallet) {
    // ✅ FIXED: Search in both referrals and spillover_matrix tables
    const [referralResult, spilloverResult] = await Promise.allSettled([
      supabase
        .from('referrals')
        .select('*')
        .ilike('member_wallet', currentWallet)
        .ilike('matrix_root', rootWallet)
        .single(),
      supabase
        .from('spillover_matrix')
        .select('*')
        .ilike('member_wallet', currentWallet)
        .ilike('matrix_root', rootWallet)
        .eq('is_active', true)
        .single()
    ]);

    let position = null;

    if (referralResult.status === 'fulfilled' && referralResult.value.data) {
      position = referralResult.value.data;
      position.source = 'referrals';
    } else if (spilloverResult.status === 'fulfilled' && spilloverResult.value.data) {
      position = spilloverResult.value.data;
      position.source = 'spillover';
    }

    if (!position) {
      break;
    }

    uplineChain.push(position);
    currentWallet = position.matrix_parent || position.referrer_wallet;
  }

  return uplineChain;
}

function groupByLayer(data: any[]): any {
  return data.reduce((acc, item) => {
    const layer = item.matrix_layer || item.layer;
    if (!acc[layer]) {
      acc[layer] = [];
    }
    acc[layer].push(item);
    return acc;
  }, {});
}

function calculateDownlineStats(data: any[]): any {
  return {
    total_members: data.length,
    activated_members: data.filter(m => m.is_activated || m.is_active).length,
    layers_depth: Math.max(...data.map(m => m.matrix_layer || m.layer), 0),
    recent_additions: data.filter(m => {
      const createdDate = new Date(m.created_at || m.placed_at);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return createdDate > sevenDaysAgo;
    }).length
  };
}

function calculateRootMatrixStats(data: any[]): any {
  return {
    total_team_size: data.length,
    activated_members: data.filter(m => m.is_activated).length,
    max_depth: Math.max(...data.map(m => m.layer), 0),
    layer_distribution: data.reduce((acc, m) => {
      acc[m.layer] = (acc[m.layer] || 0) + 1;
      return acc;
    }, {}),
    sources_breakdown: data.reduce((acc, m) => {
      acc[m.source] = (acc[m.source] || 0) + 1;
      return acc;
    }, {})
  };
}

function calculateMemberMatrixStats(data: any[]): any {
  return {
    matrices_joined: data.length,
    average_layer: data.length > 0 ? data.reduce((sum, m) => sum + m.layer, 0) / data.length : 0,
    highest_layer: Math.max(...data.map(m => m.layer), 0),
    activated_positions: data.filter(m => m.is_activated).length
  };
}

function calculateOverallMatrixStats(rootData: any[], memberData: any[]): any {
  return {
    total_involvement: rootData.length + memberData.length,
    leadership_ratio: rootData.length > 0 ? rootData.length / (rootData.length + memberData.length) : 0,
    network_strength: calculateNetworkStrength(rootData, memberData)
  };
}

function calculateNetworkStrength(rootData: any[], memberData: any[]): number {
  const teamSize = rootData.length;
  const maxDepth = Math.max(...rootData.map(m => m.layer), 0);
  const activationRate = rootData.length > 0 ? rootData.filter(m => m.is_activated).length / rootData.length : 0;
  
  return Math.round((teamSize * 0.4 + maxDepth * 0.3 + activationRate * 100 * 0.3) * 10) / 10;
}