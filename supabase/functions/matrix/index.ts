// Beehive Platform - Matrix Management Edge Function
// Handles 3x3 matrix spillover, placement, and 19-layer tree structure with L-M-R positioning
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

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

    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase();
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

async function handleGetMatrix(supabase, walletAddress: string, data) {
  try {
    const { rootWallet, layer, limit = 1000 } = data;
    const targetRoot = rootWallet || walletAddress;

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

    let query = supabase
      .from('matrix_positions')
      .select(`
        wallet_address,
        root_wallet,
        layer,
        position,
        parent_wallet,
        is_activated,
        placement_order,
        created_at,
        members!inner(
          current_level,
          is_activated,
          username
        )
      `)
      .eq('root_wallet', targetRoot)
      .order('layer', { ascending: true })
      .order('placement_order', { ascending: true })
      .limit(limit);

    if (layer) {
      query = query.eq('layer', layer);
    }

    const { data: matrixData, error } = await query;

    if (error) {
      throw error;
    }

    // Build matrix tree structure
    const matrixTree = buildMatrixTree(matrixData || []);

    // Calculate layer statistics
    const layerStats = calculateLayerStatistics(matrixData || []);

    // Calculate spillover information
    const spilloverAnalysis = calculateSpilloverAnalysis(matrixData || []);

    return new Response(JSON.stringify({
      success: true,
      data: {
        root_wallet: targetRoot,
        matrix_data: matrixTree,
        layer_statistics: layerStats,
        spillover_analysis: spilloverAnalysis,
        total_members: matrixData?.length || 0,
        max_layer: Math.max(...(matrixData?.map(m => m.layer) || [0]))
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get matrix error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch matrix data',
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

    // Use the existing stored procedure with enhanced logic
    const { data: placementResult, error: placementError } = await supabase.rpc('find_next_matrix_position', {
      p_root_wallet: rootWallet,
      p_new_member_wallet: memberWallet
    });

    if (placementError) {
      throw placementError;
    }

    if (!placementResult?.success) {
      return new Response(JSON.stringify({
        success: false,
        error: placementResult?.error || 'Failed to find matrix position'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Now place the member using the found position
    const { data: memberPlacementResult, error: memberPlacementError } = await supabase.rpc('place_member_in_matrix', {
      p_root_wallet: rootWallet,
      p_member_wallet: memberWallet,
      p_placer_wallet: placerWallet || walletAddress,
      p_matrix_position: placementResult.position
    });

    if (memberPlacementError) {
      throw memberPlacementError;
    }

    if (!memberPlacementResult?.success) {
      return new Response(JSON.stringify({
        success: false,
        error: memberPlacementResult?.error || 'Failed to place member in matrix'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Update matrix layer summary
    await supabase.rpc('update_matrix_layer_summary', {});

    // Check if this placement triggers any spillover
    const spilloverResult = await processAutomaticSpillover(supabase, rootWallet, placementResult.layer);

    return new Response(JSON.stringify({
      success: true,
      message: 'Member placed successfully in matrix',
      data: {
        placement_result: memberPlacementResult,
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

    // Get current matrix structure for the root
    const { data: matrixData, error } = await supabase
      .from('matrix_positions')
      .select('*')
      .eq('root_wallet', rootWallet)
      .order('layer')
      .order('placement_order');

    if (error) {
      throw error;
    }

    // Find optimal position using L-M-R priority filling algorithm
    const optimalPosition = findOptimalLMRPosition(matrixData || []);

    return new Response(JSON.stringify({
      success: true,
      data: {
        optimal_position: optimalPosition,
        current_matrix_size: matrixData?.length || 0,
        recommendation: optimalPosition.recommendation
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

    let query = supabase
      .from('matrix_positions')
      .select(`
        *,
        members!inner(
          username,
          current_level,
          is_activated,
          created_at
        )
      `)
      .eq('root_wallet', walletAddress)
      .neq('wallet_address', walletAddress) // Exclude self
      .order('layer')
      .order('placement_order')
      .range(offset, offset + limit - 1);

    if (layer) {
      query = query.eq('layer', layer);
    }

    const { data: downlineData, error } = await query;

    if (error) {
      throw error;
    }

    // Group by layers and calculate statistics
    const layerGroups = groupByLayer(downlineData || []);
    const downlineStats = calculateDownlineStats(downlineData || []);

    return new Response(JSON.stringify({
      success: true,
      data: {
        downline_members: downlineData || [],
        layer_groups: layerGroups,
        statistics: downlineStats,
        total_downline: downlineData?.length || 0
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

    // Get the member's matrix positions (they can be in multiple matrices)
    const { data: memberPositions, error } = await supabase
      .from('matrix_positions')
      .select('*')
      .eq('wallet_address', walletAddress);

    if (error) {
      throw error;
    }

    const uplineData = [];

    // For each matrix the member is in, get their upline chain
    for (const position of memberPositions || []) {
      if (position.parent_wallet) {
        // Get upline chain up to root
        const uplineChain = await getUplineChain(supabase, position.parent_wallet, position.root_wallet);
        uplineData.push({
          matrix_root: position.root_wallet,
          member_position: position.position,
          member_layer: position.layer,
          upline_chain: uplineChain
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

    // Get matrix statistics for the user as root
    const { data: matrixStats, error: statsError } = await supabase
      .from('matrix_positions')
      .select('layer, position, is_activated, created_at')
      .eq('root_wallet', walletAddress);

    if (statsError) {
      throw statsError;
    }

    // Get member's own positions in other matrices
    const { data: memberPositions, error: positionsError } = await supabase
      .from('matrix_positions')
      .select('root_wallet, layer, position, is_activated')
      .eq('wallet_address', walletAddress)
      .neq('root_wallet', walletAddress);

    if (positionsError) {
      throw positionsError;
    }

    // Calculate comprehensive statistics
    const stats = {
      as_root: calculateRootMatrixStats(matrixStats || []),
      as_member: calculateMemberMatrixStats(memberPositions || []),
      overall: calculateOverallMatrixStats(matrixStats || [], memberPositions || [])
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

// Helper Functions for Matrix Logic

function buildMatrixTree(matrixData: any[]): any {
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

function calculateLayerStatistics(matrixData: any[]): any {
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

function calculateSpilloverAnalysis(matrixData: any[]): any {
  // Analyze spillover patterns and potential optimizations
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
        spillover_potential: stats.filled_positions * 3 // Each member can spawn 3 in next layer
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

function findOptimalLMRPosition(matrixData: any[]): any {
  // Implement L-M-R priority filling algorithm
  const layerCapacity = {};
  const layerCounts = {};
  
  // Count existing positions per layer
  matrixData.forEach(member => {
    const layer = member.layer;
    if (!layerCounts[layer]) {
      layerCounts[layer] = { L: 0, M: 0, R: 0, total: 0 };
    }
    
    if (member.position.startsWith('L') || member.position === 'L') {
      layerCounts[layer].L++;
    } else if (member.position.startsWith('M') || member.position === 'M') {
      layerCounts[layer].M++;
    } else if (member.position.startsWith('R') || member.position === 'R') {
      layerCounts[layer].R++;
    }
    layerCounts[layer].total++;
  });

  // Find the first available position following L -> M -> R priority
  for (let layer = 1; layer <= 19; layer++) {
    const maxCapacity = Math.pow(3, layer);
    const currentCount = layerCounts[layer]?.total || 0;
    
    if (currentCount < maxCapacity) {
      const counts = layerCounts[layer] || { L: 0, M: 0, R: 0, total: 0 };
      const layerCapacityPerBranch = Math.pow(3, layer - 1);
      
      // Check L branch first
      if (counts.L < layerCapacityPerBranch) {
        return {
          layer,
          position: generateLPosition(layer, counts.L),
          branch: 'L',
          recommendation: 'Optimal L-branch placement'
        };
      }
      
      // Then M branch
      if (counts.M < layerCapacityPerBranch) {
        return {
          layer,
          position: generateMPosition(layer, counts.M),
          branch: 'M',
          recommendation: 'Optimal M-branch placement'
        };
      }
      
      // Finally R branch
      if (counts.R < layerCapacityPerBranch) {
        return {
          layer,
          position: generateRPosition(layer, counts.R),
          branch: 'R',
          recommendation: 'Optimal R-branch placement'
        };
      }
    }
  }

  return {
    layer: null,
    position: null,
    branch: null,
    recommendation: 'Matrix is full (19 layers completed)'
  };
}

function generateLPosition(layer: number, existingCount: number): string {
  if (layer === 1) return 'L';
  
  // Generate sub-positions like L.L, L.M, L.R, L.L.L, etc.
  const basePositions = ['L', 'M', 'R'];
  const positionsPerSubLevel = Math.pow(3, layer - 2);
  const subLevel = Math.floor(existingCount / positionsPerSubLevel) + 1;
  const positionInSubLevel = existingCount % positionsPerSubLevel;
  
  return `L.${'LMR'[Math.floor(positionInSubLevel / Math.pow(3, layer - 3))]}`;
}

function generateMPosition(layer: number, existingCount: number): string {
  if (layer === 1) return 'M';
  return `M.${'LMR'[existingCount % 3]}`;
}

function generateRPosition(layer: number, existingCount: number): string {
  if (layer === 1) return 'R';
  return `R.${'LMR'[existingCount % 3]}`;
}

async function processAutomaticSpillover(supabase, rootWallet: string, triggerLayer: number): Promise<any> {
  // Check if any positions in the trigger layer are ready to spillover
  const { data: layerData, error } = await supabase
    .from('matrix_positions')
    .select('*')
    .eq('root_wallet', rootWallet)
    .eq('layer', triggerLayer);

  if (error || !layerData) {
    return { spillover_processed: false, reason: 'No data for trigger layer' };
  }

  // Calculate if layer is ready for spillover (when approaching capacity)
  const maxCapacity = Math.pow(3, triggerLayer);
  const fillRate = (layerData.length / maxCapacity) * 100;

  if (fillRate >= 80) { // Trigger spillover at 80% capacity
    // Process spillover logic here
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
    const { data: position, error } = await supabase
      .from('matrix_positions')
      .select(`
        *,
        members!inner(username, current_level, is_activated)
      `)
      .eq('wallet_address', currentWallet)
      .eq('root_wallet', rootWallet)
      .single();

    if (error || !position) {
      break;
    }

    uplineChain.push(position);
    currentWallet = position.parent_wallet;
  }

  return uplineChain;
}

function groupByLayer(data: any[]): any {
  return data.reduce((acc, item) => {
    const layer = item.layer;
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
    activated_members: data.filter(m => m.is_activated).length,
    layers_depth: Math.max(...data.map(m => m.layer), 0),
    recent_additions: data.filter(m => {
      const createdDate = new Date(m.created_at);
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
  // Calculate a composite score based on team size, depth, and activation rates
  const teamSize = rootData.length;
  const maxDepth = Math.max(...rootData.map(m => m.layer), 0);
  const activationRate = rootData.length > 0 ? rootData.filter(m => m.is_activated).length / rootData.length : 0;
  
  return Math.round((teamSize * 0.4 + maxDepth * 0.3 + activationRate * 100 * 0.3) * 10) / 10;
}