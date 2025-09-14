// =============================================
// Beehive Platform - Comprehensive Matrix Management Edge Function
// Handles 3x3 spillover matrix, placement, 19-layer tree structure, and referral operations
// Consolidates matrix and matrix-operations functionality
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
  spilloverRoot?: string; // The actual matrix root when spillover occurs
  originalRoot?: string; // The original referrer wallet
  searchDepth?: number; // How deep we searched to find the position
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
    // Check authorization header
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing authorization header',
        code: 401
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const walletAddress = req.headers.get('x-wallet-address');
    const url = new URL(req.url);
    
    let requestData;
    let action;

    // Handle both POST with JSON body and GET with query params
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
        action = requestData.action;
      } catch {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON payload'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      action = url.searchParams.get('action');
      requestData = Object.fromEntries(url.searchParams.entries());
    }

    console.log(`🔷 Matrix Operations Action: ${action} for wallet: ${walletAddress}`);

    switch (action) {
      // Advanced Matrix Operations (3x3 Spillover System)
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
      
      // Simple Referral Operations
      case 'get-matrix-structure':
        return await getMatrixStructure(supabase, walletAddress || requestData.rootWallet);
      case 'get-placement-info':
        return await getPlacementInfo(supabase, walletAddress!);
      case 'find-optimal-placement':
        const referrerWallet = requestData.referrer_wallet || requestData.referrerWallet;
        if (!referrerWallet) {
          throw new Error('Referrer wallet required for placement search');
        }
        return await findOptimalPlacement(supabase, referrerWallet, walletAddress!);
      case 'get-matrix-statistics':
        return await getMatrixStatistics(supabase, walletAddress);
      case 'get-layer-analysis':
        const layer = parseInt(requestData.layer || '1');
        return await getLayerAnalysis(supabase, walletAddress, layer);
      case 'check-spillover-opportunities':
        return await checkSpilloverOpportunities(supabase, walletAddress!);
      case 'sync-matrix-data':
        return await syncMatrixData(supabase);
      case 'get-reward-eligibility':
        const checkLayer = parseInt(requestData.layer || '1');
        return await getRewardEligibility(supabase, walletAddress!, checkLayer);
      case 'simulate-placement':
        const simReferrer = requestData.referrer_wallet || requestData.referrerWallet;
        if (!simReferrer) {
          throw new Error('Referrer wallet required for simulation');
        }
        return await simulatePlacement(supabase, simReferrer, walletAddress!);
      
      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Matrix function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// =============================================
// ADVANCED MATRIX FUNCTIONS (3x3 Spillover System)
// =============================================

async function findNextAvailablePosition(supabase: any, rootWallet: string): Promise<PlacementResult> {
  console.log(`🔍 Finding next available position for root: ${rootWallet} using 3x3 spillover logic`);
  
  // Check layer 1 first (direct positions under root)
  const layer1Positions = ['L', 'M', 'R'];
  
  for (const position of layer1Positions) {
    const { data: existingReferrals, error: referralsError } = await supabase
      .from('referrals')
      .select('id, member_wallet')
      .eq('matrix_root_wallet', rootWallet)
      .eq('matrix_layer', 1)
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
    
    const isOccupied = (existingReferrals?.length > 0);
    
    if (!isOccupied) {
      console.log(`✅ Found available Layer 1 position: ${position}`);
      return {
        success: true,
        layer: 1,
        position: position
      };
    }
  }
  
  console.log(`📈 Layer 1 full, checking spillover opportunities...`);
  
  // Layer 1 is full, find spillover placement in layer 1 members' matrices
  // Get all layer 1 members under this root, ordered by activation sequence
  const { data: layer1Members, error: layer1Error } = await supabase
    .from('referrals')
    .select(`
      member_wallet,
      matrix_position,
      placed_at
    `)
    .eq('matrix_root_wallet', rootWallet)
    .eq('matrix_layer', 1)
    .order('placed_at'); // Order by activation time (earlier first)
  
  if (layer1Error) {
    console.error(`❌ Error fetching layer 1 members: ${layer1Error.message}`);
    return {
      success: false,
      layer: 0,
      position: '',
      error: `Failed to fetch layer 1 members: ${layer1Error.message}`
    };
  }
  
  // Try to place in each layer 1 member's matrix (spillover placement)
  for (const layer1Member of layer1Members || []) {
    console.log(`🔄 Checking spillover placement in ${layer1Member.member_wallet}'s matrix...`);
    
    // Check if this layer 1 member has any open positions in their own matrix
    for (const spilloverPosition of layer1Positions) {
      const { data: spilloverCheck, error: spilloverError } = await supabase
        .from('referrals')
        .select('id')
        .eq('matrix_root_wallet', layer1Member.member_wallet) // This member becomes the root
        .eq('matrix_layer', 1)
        .eq('matrix_position', spilloverPosition)
        .limit(1);
      
      if (spilloverError) {
        console.warn(`⚠️ Error checking spillover for ${layer1Member.member_wallet}: ${spilloverError.message}`);
        continue;
      }
      
      const spilloverOccupied = (spilloverCheck?.length > 0);
      
      if (!spilloverOccupied) {
        console.log(`✅ Found spillover position: ${layer1Member.member_wallet} -> Layer 1, Position ${spilloverPosition}`);
        return {
          success: true,
          layer: 1,
          position: spilloverPosition,
          spilloverRoot: layer1Member.member_wallet, // This indicates spillover placement
          originalRoot: rootWallet
        };
      }
    }
  }
  
  // If layer 1 members' matrices are also full, check their downlines recursively
  console.log(`🔄 Layer 1 members' matrices full, checking deeper layers...`);
  
  // Recursive search in layer 2, 3, 4... for any available positions
  for (let searchLayer = 2; searchLayer <= 19; searchLayer++) {
    // Get all members at the previous layer who might have available positions
    const { data: layerMembers, error: layerError } = await supabase
      .from('referrals')
      .select('member_wallet, placed_at')
      .eq('matrix_root_wallet', rootWallet)
      .eq('matrix_layer', searchLayer - 1)
      .order('placed_at'); // Order by activation time

    if (layerError || !layerMembers?.length) {
      continue; // Skip to next layer if no members or error
    }

    // Check each member at this layer for available positions in their matrix
    for (const layerMember of layerMembers) {
      for (const recursivePosition of layer1Positions) {
        const { data: deepCheck, error: deepError } = await supabase
          .from('referrals')
          .select('id')
          .eq('matrix_root_wallet', layerMember.member_wallet) // Check this member's matrix
          .eq('matrix_layer', 1) // Always layer 1 in their own matrix
          .eq('matrix_position', recursivePosition)
          .limit(1);

        if (deepError) {
          console.warn(`⚠️ Error checking deep layer for ${layerMember.member_wallet}: ${deepError.message}`);
          continue;
        }

        const deepOccupied = (deepCheck?.length > 0);

        if (!deepOccupied) {
          console.log(`✅ Found deep placement: ${layerMember.member_wallet} -> Layer 1, Position ${recursivePosition} (search layer ${searchLayer})`);
          return {
            success: true,
            layer: 1, // Always layer 1 in the target's own matrix
            position: recursivePosition,
            spilloverRoot: layerMember.member_wallet, // This member becomes the matrix root
            originalRoot: rootWallet,
            searchDepth: searchLayer // Track how deep we searched
          };
        }
      }
    }
  }

  console.log(`❌ No available positions found in entire matrix tree (searched up to layer 19)`);
  return {
    success: false,
    layer: 0,
    position: '',
    error: 'No available positions in entire 3x3 matrix tree structure'
  };
}

async function safelyPlaceMember(
  supabase: any, 
  rootWallet: string, 
  memberWallet: string, 
  layer: number, 
  position: string,
  spilloverRoot?: string
): Promise<PlacementResult> {
  const actualRoot = spilloverRoot || rootWallet;
  console.log(`🔒 Safely placing member ${memberWallet} at Layer ${layer}, Position ${position} for matrix root ${actualRoot}`);
  
  try {
    // Get member and matrix root activation sequences
    const { data: memberInfo, error: memberError } = await supabase
      .from('members')
      .select('activation_sequence')
      .eq('wallet_address', memberWallet)
      .single();
      
    const { data: rootInfo, error: rootError } = await supabase
      .from('members')
      .select('activation_sequence')
      .eq('wallet_address', actualRoot)
      .single();

    if (memberError || rootError) {
      throw new Error(`Failed to get member or root info: ${memberError?.message || rootError?.message}`);
    }

    // Insert the matrix placement record directly
    const { data: insertResult, error: insertError } = await supabase
      .from('referrals')
      .insert({
        member_wallet: memberWallet,
        referrer_wallet: rootWallet, // Keep original referrer
        matrix_root_wallet: actualRoot, // Use spillover root if applicable
        matrix_root_sequence: rootInfo.activation_sequence,
        matrix_layer: layer,
        matrix_position: position,
        member_activation_sequence: memberInfo.activation_sequence,
        is_direct_referral: actualRoot === rootWallet, // True only if not spillover
        is_spillover_placement: actualRoot !== rootWallet, // True if spillover
        placed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error(`❌ Direct placement failed: ${insertError.message}`);
      return {
        success: false,
        layer: layer,
        position: position,
        error: `Direct placement failed: ${insertError.message}`
      };
    }
    
    console.log(`✅ Member placed successfully: ${memberWallet} -> Matrix Root: ${actualRoot}, Layer ${layer}, Position ${position}`);
    return {
      success: true,
      layer: layer,
      position: position,
      spilloverRoot: actualRoot !== rootWallet ? actualRoot : undefined
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

async function handleGetMatrix(supabase, walletAddress: string, data) {
  try {
    console.log('🎯 Matrix request data:', data);
    const { rootWallet, layer, limit = 1000 } = data;
    const targetRoot = rootWallet || walletAddress;
    
    console.log(`📊 Getting matrix for root: ${targetRoot}, wallet: ${walletAddress}`);

    if (!walletAddress) {
      console.error('❌ No wallet address provided');
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let membersQuery = supabase
      .from('members')
      .select('wallet_address, referrer_wallet, current_level, activation_time')
      .eq('referrer_wallet', targetRoot)
      .limit(limit);

    let referralsQuery = supabase
      .from('referrals')
      .select(`
        member_wallet,
        referrer_wallet,
        matrix_position,
        matrix_layer,
        matrix_root_wallet,
        placed_at
      `)
      .or(`referrer_wallet.eq.${targetRoot},matrix_root_wallet.eq.${targetRoot}`)
      .limit(limit);

    console.log('🔍 Executing queries: members, referrals...');
    
    const [membersResult, referralsResult] = await Promise.allSettled([
      membersQuery,
      referralsQuery
    ]);

    let memberData = [];
    let referralData = [];

    if (membersResult.status === 'fulfilled' && !membersResult.value.error) {
      memberData = membersResult.value.data || [];
      console.log(`✅ Members query successful: ${memberData.length} members found`);
    } else {
      console.warn('⚠️ Members query failed:', membersResult);
    }

    if (referralsResult.status === 'fulfilled' && !referralsResult.value.error) {
      referralData = referralsResult.value.data || [];
      console.log(`✅ Referrals query successful: ${referralData.length} referrals found`);
    } else {
      console.warn('⚠️ Referrals query failed:', referralsResult);
    }

    const finalMatrixData = [];
    
    // Process referrals data first (original positions)
    referralData.forEach((referral, index) => {
      const member = memberData.find(m => 
        m.wallet_address === referral.member_wallet
      );
      
      if (member) {
        finalMatrixData.push({
          wallet_address: referral.member_wallet,
          root_wallet: referral.matrix_root_wallet || targetRoot,
          layer: referral.matrix_layer || 1,
          position: referral.matrix_position || `${index + 1}`,
          parent_wallet: referral.referrer_wallet,
          is_activated: true,
          placement_order: index + 1,
          created_at: referral.placed_at || member.activation_time,
          members: {
            current_level: member.current_level || 1,
            is_activated: true,
            username: member.username || null
          },
          source: 'referrals'
        });
      }
    });
    
    // Note: spillover_matrix table does not exist in current database
    
    // Add remaining members not in either table (direct referrals only)
    memberData.forEach((member, index) => {
      const alreadyProcessed = finalMatrixData.some(f => 
        f.wallet_address === member.wallet_address
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
          created_at: member.activation_time,
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

    const matrixTree = buildMatrixTree(finalMatrixData || []);
    const layerStats = calculateLayerStatistics(finalMatrixData || []);
    const spilloverAnalysis = calculateSpilloverAnalysis(finalMatrixData || []);

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
        spilloverMembers: 0, // spillover_matrix table does not exist
        directMembers: finalMatrixData.filter(m => m.source === 'direct').length,
        matrix_data: matrixTree,
        layer_statistics: layerStats,
        spillover_analysis: spilloverAnalysis
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🎯 Placing member ${memberWallet} in matrix for root ${rootWallet}`);

    const positionResult = await findNextAvailablePosition(supabase, rootWallet);

    if (!positionResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: positionResult.error || 'Failed to find available position'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const placementResult = await safelyPlaceMember(
      supabase, 
      rootWallet, 
      memberWallet, 
      positionResult.layer, 
      positionResult.position,
      positionResult.spilloverRoot // Pass spillover root if available
    );

    if (!placementResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: placementResult.error || 'Failed to place member in matrix'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Place member error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to place member in matrix',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const optimalPosition = await findNextAvailablePosition(supabase, rootWallet);

    if (!optimalPosition.success) {
      return new Response(JSON.stringify({
        success: false,
        error: optimalPosition.error || 'No available positions found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const { count: referralCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('matrix_root_wallet', rootWallet);

    // spillover_matrix table does not exist
    const spilloverCount = 0;

    return new Response(JSON.stringify({
      success: true,
      data: {
        optimal_position: optimalPosition,
        current_matrix_size: {
          referrals: referralCount || 0,
          spillover: spilloverCount,
          total: (referralCount || 0) + spilloverCount
        },
        recommendation: `Place at Layer ${optimalPosition.layer}, Position ${optimalPosition.position}`
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Find optimal position error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to find optimal position',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Process spillover error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process spillover',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let referralsQuery = supabase
      .from('referrals')
      .select('*')
      .eq('matrix_root_wallet', walletAddress)
      .neq('member_wallet', walletAddress)
      .order('matrix_layer')
      .order('placed_at')
      .range(offset, offset + limit - 1);

    if (layer) {
      referralsQuery = referralsQuery.eq('matrix_layer', layer);
    }

    const [referralsResult] = await Promise.allSettled([
      referralsQuery
    ]);

    let downlineData = [];

    if (referralsResult.status === 'fulfilled' && referralsResult.value.data) {
      downlineData.push(...referralsResult.value.data.map(item => ({ ...item, source: 'referrals' })));
    }

    const uniqueDownline = downlineData.filter((item, index, self) =>
      index === self.findIndex(other => 
        other.member_wallet === item.member_wallet && other.matrix_layer === item.matrix_layer
      )
    );

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
          spillover: 0 // spillover_matrix table does not exist
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get downline error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch downline data',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const [referralsResult] = await Promise.allSettled([
      supabase
        .from('referrals')
        .select('*')
        .eq('member_wallet', walletAddress)
    ]);

    const memberPositions = [];

    if (referralsResult.status === 'fulfilled' && referralsResult.value.data) {
      memberPositions.push(...referralsResult.value.data.map(item => ({ ...item, source: 'referrals' })));
    }

    const uplineData = [];

    for (const position of memberPositions || []) {
      if (position.matrix_parent || position.referrer_wallet) {
        const parentWallet = position.matrix_parent || position.referrer_wallet;
        const uplineChain = await getUplineChain(supabase, parentWallet, position.matrix_root_wallet);
        uplineData.push({
          matrix_root: position.matrix_root_wallet,
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get upline error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch upline data',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔍 Getting matrix stats for wallet: ${walletAddress}`);
    
    const { data: referralsStats, error: referralsError } = await supabase
      .from('referrals')
      .select('member_wallet, referrer_wallet, matrix_layer, placed_at')
      .eq('referrer_wallet', walletAddress);

    if (referralsError) {
      console.error('❌ Referrals stats query error:', referralsError);
      throw new Error(`Referrals stats query failed: ${referralsError.message}`);
    }

    // Note: spillover_matrix table does not exist
    const spilloverStats = [];
    console.log(`✅ Spillover stats: 0 positions (table does not exist)`);

    const { data: memberInfo, error: memberError } = await supabase
      .from('members')
      .select('wallet_address, referrer_wallet, current_level, activation_time')
      .eq('wallet_address', walletAddress)
      .single();

    if (memberError && memberError.code !== 'PGRST116') {
      console.error('❌ Member info query error:', memberError);
      throw new Error(`Member info query failed: ${memberError.message}`);
    }

    console.log(`✅ Found ${referralsStats?.length || 0} referrals and ${spilloverStats?.length || 0} spillover positions`);

    const rootMatrixData = [
      ...(referralsStats || []).map((item, index) => ({
        wallet_address: item.member_wallet,
        layer: item.matrix_layer || 1,
        is_activated: true,
        created_at: item.placed_at,
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
      created_at: memberInfo.activation_time
    }] : [];

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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get matrix stats error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch matrix statistics',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

// =============================================
// SIMPLE REFERRAL OPERATIONS
// =============================================

async function getMatrixStructure(supabase: any, rootWallet?: string) {
  if (!rootWallet) {
    const { data: allReferrals, error } = await supabase
      .from('referrals')
      .select('member_wallet, referrer_wallet, id')
      .order('id')
      .limit(100);

    const structures = {};
    if (allReferrals) {
      allReferrals.forEach((ref: any) => {
        if (!structures[ref.referrer_wallet]) {
          structures[ref.referrer_wallet] = {
            root_wallet: ref.referrer_wallet,
            total_referrals: 0,
            direct_referrals: [],
            last_referral: null
          };
        }
        
        structures[ref.referrer_wallet].total_referrals++;
        structures[ref.referrer_wallet].direct_referrals.push({
          member_wallet: ref.member_wallet,
          referral_id: ref.id
        });
        structures[ref.referrer_wallet].last_referral = ref.id;
      });
    }

    return new Response(JSON.stringify({
      success: true,
      structures: Object.values(structures),
      error: error?.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }

  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('member_wallet, referrer_wallet, id')
    .eq('referrer_wallet', rootWallet)
    .order('id');

  if (error || !referrals) {
    return new Response(JSON.stringify({
      success: false,
      error: `Referral structure not found: ${error?.message || 'No referrals found'}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    });
  }

  const structure = {
    root_wallet: rootWallet,
    total_referrals: referrals.length,
    direct_referrals: referrals.map((r: any) => ({
      member_wallet: r.member_wallet,
      referral_id: r.id
    })),
    first_referral: referrals.length > 0 ? referrals[0].id : null,
    last_referral: referrals.length > 0 ? referrals[referrals.length - 1].id : null
  };

  return new Response(JSON.stringify({
    success: true,
    structure,
    root_wallet: rootWallet
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
}

async function getPlacementInfo(supabase: any, walletAddress: string) {
  const { data: referralData, error } = await supabase
    .from('referrals')
    .select('member_wallet, referrer_wallet, id')
    .eq('member_wallet', walletAddress)
    .single();

  if (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `Referral info not found: ${error.message}`,
      is_referred: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }

  const { data: referrerData } = await supabase
    .from('members')
    .select('username, current_level')
    .eq('wallet_address', referralData.referrer_wallet)
    .single();

  return new Response(JSON.stringify({
    success: true,
    referral_info: {
      ...referralData,
      referrer_info: referrerData
    },
    is_referred: true
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
}

async function findOptimalPlacement(supabase: any, referrerWallet: string, newMemberWallet: string) {
  console.log(`🔍 Finding referral placement: ${referrerWallet} -> ${newMemberWallet}`);

  try {
    const { data: referrerData, error: referrerError } = await supabase
      .from('members')
      .select('wallet_address, username, current_level')
      .eq('wallet_address', referrerWallet)
      .single();

    if (referrerError || !referrerData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Referrer not found in members table'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('member_wallet')
      .eq('member_wallet', newMemberWallet)
      .single();

    if (existingReferral) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Member already has a referrer'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const { count: referralCount } = await supabase
      .from('referrals')
      .select('member_wallet', { count: 'exact', head: true })
      .eq('referrer_wallet', referrerWallet);

    return new Response(JSON.stringify({
      success: true,
      placement_found: true,
      placement_type: 'direct_referral',
      referrer_wallet: referrerWallet,
      referrer_info: referrerData,
      current_referral_count: referralCount || 0,
      estimated_rewards: {
        referral_bonus: 100,
        currency: 'USDC',
        conditions: 'Immediate upon successful referral'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Find optimal placement error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

function calculateReferralRewards(): any {
  return {
    direct_referral_bonus: 100,
    currency: 'USDC',
    bonus_type: 'immediate',
    conditions: 'Paid when referred member activates NFT membership'
  };
}

async function getMatrixStatistics(supabase: any, rootWallet?: string) {
  if (rootWallet) {
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('member_wallet')
      .eq('referrer_wallet', rootWallet);

    if (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const stats = {
      referrer_wallet: rootWallet,
      total_referrals: referrals?.length || 0,
      first_referral: referrals?.length ? referrals[0]?.id : null,
      last_referral: referrals?.length ? referrals[referrals.length - 1]?.id : null,
      referrals_this_month: 0
    };

    return new Response(JSON.stringify({
      success: true,
      statistics: stats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } else {
    const { data: allReferrals, error } = await supabase
      .from('referrals')
      .select('referrer_wallet');

    if (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const referrerStats = {};
    if (allReferrals) {
      allReferrals.forEach((ref: any) => {
        if (!referrerStats[ref.referrer_wallet]) {
          referrerStats[ref.referrer_wallet] = {
            referrer_wallet: ref.referrer_wallet,
            total_referrals: 0,
            last_referral: null
          };
        }
        
        referrerStats[ref.referrer_wallet].total_referrals++;
        if (!referrerStats[ref.referrer_wallet].last_referral || 
            new Date(ref.id) > new Date(referrerStats[ref.referrer_wallet].last_referral)) {
          referrerStats[ref.referrer_wallet].last_referral = ref.id;
        }
      });
    }

    const allStats = Object.values(referrerStats)
      .sort((a: any, b: any) => b.total_referrals - a.total_referrals)
      .slice(0, 20);

    return new Response(JSON.stringify({
      success: true,
      statistics: allStats || [],
      total_system_referrals: allReferrals?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
}

async function getLayerAnalysis(supabase: any, rootWallet: string, timeRange: number = 30) {
  const timeThreshold = new Date();
  timeThreshold.setDate(timeThreshold.getDate() - timeRange);
  
  const { data: recentReferrals, error } = await supabase
    .from('referrals')
    .select('member_wallet')
    .eq('referrer_wallet', rootWallet)
    .order('id');

  if (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }

  const stats = {
    referrer_wallet: rootWallet,
    time_range_days: timeRange,
    total_referrals: recentReferrals?.length || 0,
    first_referral: recentReferrals?.length ? recentReferrals[0]?.id : null,
    last_referral: recentReferrals?.length ? recentReferrals[recentReferrals.length - 1]?.id : null,
    avg_referrals_per_day: recentReferrals?.length ? (recentReferrals.length / timeRange).toFixed(2) : 0
  };

  const dailyStats = {};

  return new Response(JSON.stringify({
    success: true,
    referral_analysis: stats,
    daily_breakdown: dailyStats,
    recent_referrals: recentReferrals || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
}

async function checkSpilloverOpportunities(supabase: any, walletAddress: string) {
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('wallet_address, current_level, username')
    .eq('wallet_address', walletAddress)
    .single();

  if (memberError || !memberData) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Member not found - must be a member to refer others',
      can_refer: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    });
  }

  const { count: currentReferrals } = await supabase
    .from('referrals')
    .select('member_wallet', { count: 'exact', head: true })
    .eq('referrer_wallet', walletAddress);

  const opportunities = {
    can_refer: true,
    current_referrals: currentReferrals || 0,
    member_level: memberData.current_level,
    referral_bonus: calculateReferralRewards(),
    requirements: {
      must_have_nft: memberData.current_level >= 1,
      eligible_for_rewards: memberData.current_level >= 1
    }
  };

  return new Response(JSON.stringify({
    success: true,
    referral_opportunities: opportunities
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
}

async function syncMatrixData(supabase: any) {
  console.log(`🔄 Starting referral system data synchronization...`);

  try {
    const { data: allReferrals, error: referralsError } = await supabase
      .from('referrals')
      .select('member_wallet, referrer_wallet');

    if (referralsError) {
      throw new Error(`Failed to fetch referrals data: ${referralsError.message}`);
    }

    const referrerSummary = {};
    
    if (allReferrals) {
      allReferrals.forEach((ref: any) => {
        if (!referrerSummary[ref.referrer_wallet]) {
          referrerSummary[ref.referrer_wallet] = {
            referrer_wallet: ref.referrer_wallet,
            total_referrals: 0,
            first_referral: ref.id,
            last_referral: ref.id,
            referrals_this_week: 0,
            referrals_this_month: 0
          };
        }
        
        referrerSummary[ref.referrer_wallet].total_referrals++;
        
        if (ref.id < referrerSummary[ref.referrer_wallet].first_referral) {
          referrerSummary[ref.referrer_wallet].first_referral = ref.id;
        }
        if (ref.id > referrerSummary[ref.referrer_wallet].last_referral) {
          referrerSummary[ref.referrer_wallet].last_referral = ref.id;
        }

        referrerSummary[ref.referrer_wallet].referrals_this_week = 0;
        referrerSummary[ref.referrer_wallet].referrals_this_month = 0;
      });
    }

    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, current_level');

    const memberStats = {
      total_members: members?.length || 0,
      level_1_members: members?.filter((m: any) => m.current_level === 1).length || 0,
      level_2_members: members?.filter((m: any) => m.current_level >= 2).length || 0,
      total_referrals: allReferrals?.length || 0,
      active_referrers: Object.keys(referrerSummary).length
    };

    const topReferrers = Object.values(referrerSummary)
      .sort((a: any, b: any) => b.total_referrals - a.total_referrals)
      .slice(0, 10);

    return new Response(JSON.stringify({
      success: true,
      sync_completed: true,
      system_overview: {
        total_referrers: Object.keys(referrerSummary).length,
        top_referrers: topReferrers,
        member_statistics: memberStats
      },
      sync_timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Sync referral data error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

async function getRewardEligibility(supabase: any, walletAddress: string, layer: number) {
  const { data: memberData } = await supabase
    .from('members')
    .select('current_level, referrer_wallet')
    .eq('wallet_address', walletAddress)
    .single();

  if (!memberData) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Member not found',
      eligible: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    });
  }

  const { count: directReferrals } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_wallet', walletAddress)
    .eq('placement_layer', 1);

  const eligibilityChecks = {
    has_nft: memberData.current_level >= 1,
    has_level_2: memberData.current_level >= 2,
    direct_referrals_count: directReferrals || 0,
    needs_direct_referrals: memberData.current_level === 1 && (directReferrals || 0) < 3,
    layer_requirement_met: layer === 1 ? memberData.current_level >= 2 : true
  };

  const isEligible = eligibilityChecks.has_nft && 
                    (!eligibilityChecks.needs_direct_referrals) && 
                    eligibilityChecks.layer_requirement_met;

  return new Response(JSON.stringify({
    success: true,
    eligible: isEligible,
    member_level: memberData.current_level,
    eligibility_checks: eligibilityChecks,
    requirements: {
      layer_1_reward: 'Requires Level 2 NFT',
      level_2_upgrade: 'Requires 3 direct referrals',
      general: 'Must have activated NFT membership'
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
}

async function simulatePlacement(supabase: any, referrerWallet: string, newMemberWallet: string) {
  console.log(`🎮 Simulating referral: ${referrerWallet} -> ${newMemberWallet}`);

  const placementResult = await findOptimalPlacement(supabase, referrerWallet, newMemberWallet);
  const placementData = await placementResult.json();

  if (placementData.success && placementData.placement_found) {
    const rewardSimulation = calculateReferralRewards();

    return new Response(JSON.stringify({
      success: true,
      simulation_result: {
        ...placementData,
        reward_simulation: rewardSimulation,
        note: 'This is a simulation - no actual referral was created'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }

  return placementResult;
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
    
    if (member.position.startsWith('L') || member.position === 'L') {
      layerStats[layer].l_positions++;
    } else if (member.position.startsWith('M') || member.position === 'M') {
      layerStats[layer].m_positions++;
    } else if (member.position.startsWith('R') || member.position === 'R') {
      layerStats[layer].r_positions++;
    }
  });

  Object.keys(layerStats).forEach(layer => {
    const layerNum = parseInt(layer);
    const maxCapacity = Math.pow(3, layerNum);
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
    
    if (stats.fill_rate > 80 && layerNum < 19) {
      analysis.spillover_opportunities.push({
        layer: layerNum,
        next_layer: layerNum + 1,
        current_fill_rate: stats.fill_rate,
        spillover_potential: stats.filled_positions * 3
      });
    }
    
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
  const [referralsResult] = await Promise.allSettled([
    supabase
      .from('referrals')
      .select('*')
      .eq('matrix_root_wallet', rootWallet)
      .eq('matrix_layer', triggerLayer)
  ]);

  let layerData = [];
  
  if (referralsResult.status === 'fulfilled' && referralsResult.value.data) {
    layerData.push(...referralsResult.value.data);
  }

  if (!layerData || layerData.length === 0) {
    return { spillover_processed: false, reason: 'No data for trigger layer' };
  }

  const maxCapacity = Math.pow(3, triggerLayer);
  const fillRate = (layerData.length / maxCapacity) * 100;

  if (fillRate >= 80) {
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
    const [referralResult] = await Promise.allSettled([
      supabase
        .from('referrals')
        .select('*')
        .eq('member_wallet', currentWallet)
        .eq('matrix_root_wallet', rootWallet)
        .single()
    ]);

    let position = null;

    if (referralResult.status === 'fulfilled' && referralResult.value.data) {
      position = referralResult.value.data;
      position.source = 'referrals';
    }

    if (!position) {
      break;
    }

    uplineChain.push(position);
    currentWallet = position.referrer_wallet;
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