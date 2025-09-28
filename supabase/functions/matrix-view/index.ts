import {serve} from "https://deno.land/std@0.168.0/http/server.ts"
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

console.log('🔍 Matrix View function started successfully!')

serve(async (req: Request) => {
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

    const walletAddress = req.headers.get('x-wallet-address')
    if (!walletAddress) {
      throw new Error('Wallet address required')
    }

    const { action } = await req.json()

    if (action === 'get-layer-stats') {
      // Get layer statistics using matrix_layers_view and referrals_stats_view
      console.log(`📊 Getting layer statistics for wallet: ${walletAddress}`)
      
      // Try to get enhanced stats from referrals_stats_view (with fallback if view doesn't exist)
      let statsData = null;
      try {
        const { data: enhancedStats, error: statsError } = await supabase
          .from('referrals_stats_view')
          .select(`
            wallet_address,
            username,
            direct_referrals_count,
            activated_referrals_count,
            total_team_size,
            max_layer,
            active_layers,
            total_activated_members,
            total_network_size,
            has_matrix_team
          `)
          .eq('wallet_address', walletAddress)
          .single();

        if (!statsError) {
          statsData = enhancedStats;
          console.log('📊 Enhanced stats data from view:', statsData);
        }
      } catch (error) {
        console.log('⚠️ referrals_stats_view not available, will calculate manually');
      }

      // Try to get matrix layers data from matrix_layer_view (with fallback if view doesn't exist)
      let matrixData = null;
      let matrixError = null;

      try {
        const result = await supabase
          .from('matrix_layer_view')
          .select(`
            layer,
            filled_slots,
            empty_slots,
            max_slots,
            left_members,
            middle_members,
            right_members,
            activated_members,
            completion_rate,
            activation_rate,
            layer_status,
            is_balanced
          `)
          .eq('matrix_root_wallet', walletAddress)
          .order('layer');

        matrixData = result.data;
        matrixError = result.error;

        if (!matrixError && matrixData) {
          console.log('📊 Matrix layer data from view:', matrixData.length, 'layers');
        }
      } catch (error) {
        console.log('⚠️ matrix_layer_view not available, using fallback calculation');
        matrixError = error;
        matrixData = null;
      }

      if (matrixError) {
        console.error('Error fetching matrix data:', matrixError)
        console.log('Using direct table calculation as fallback...')
        // Continue with empty data - will be calculated from member positions
        matrixData = [];
      }

      console.log(`📊 Matrix layer data for ${walletAddress}:`, matrixData)
      console.log(`📊 Matrix layer data retrieved: ${matrixData?.length || 0} layers`)

      // Get detailed member positions for L/M/R breakdown from matrix_referrals_tree_view if matrix_layer_view data is incomplete
      const { data: membersData } = await supabase
        .from('matrix_referrals_tree_view')
        .select('matrix_layer, matrix_position')
        .eq('matrix_root_wallet', walletAddress)

      // Count positions by layer as fallback
      const positionCounts: any = {}
      membersData?.forEach(member => {
        if (!positionCounts[member.matrix_layer]) {
          positionCounts[member.matrix_layer] = { L: 0, M: 0, R: 0 }
        }
        if (member.matrix_position && ['L', 'M', 'R'].includes(member.matrix_position)) {
          positionCounts[member.matrix_layer][member.matrix_position]++
        }
      })

      // Transform data from matrix_layer_view (optimized)
      const completeStats = []
      
      // Initialize all 19 layers
      for (let layer = 1; layer <= 19; layer++) {
        const layerData = matrixData?.find((l: any) => l.layer === layer)
        const posData = positionCounts[layer] || { L: 0, M: 0, R: 0 }
        
        if (layerData) {
          // Use data directly from matrix_layer_view (already calculated)
          const totalMembers = layerData.filled_slots || 0;
          const maxCapacity = layerData.max_slots || Math.pow(3, layer);
          const fillPercentage = layerData.completion_rate || 0;
          const activationRate = layerData.activation_rate || 0;
          
          console.log(`🔍 Layer ${layer} from matrix_layer_view:`, {
            totalMembers,
            maxCapacity,
            fillPercentage,
            activationRate,
            leftMembers: layerData.left_members,
            middleMembers: layerData.middle_members,
            rightMembers: layerData.right_members,
            layer_status: layerData.layer_status,
            is_balanced: layerData.is_balanced
          });
          
          completeStats.push({
            layer: layerData.layer,
            totalMembers: totalMembers,
            leftMembers: layerData.left_members || 0,
            middleMembers: layerData.middle_members || 0,
            rightMembers: layerData.right_members || 0,
            maxCapacity: maxCapacity,
            fillPercentage: fillPercentage,
            activeMembers: layerData.activated_members || 0,
            completedPercentage: fillPercentage, // Use completion_rate as fill percentage
            emptySlots: layerData.empty_slots || 0,
            activationRate: activationRate,
            layerStatus: layerData.layer_status || 'empty',
            isBalanced: layerData.is_balanced || false
          })
        } else {
          // Layer not in matrix_layer_view - use fallback calculation
          const maxCapacity = Math.pow(3, layer);
          const totalMembers = posData.L + posData.M + posData.R;
          const calculatedPercentage = maxCapacity > 0 ? (totalMembers / maxCapacity) * 100 : 0;
          const safePercentage = Math.min(Math.max(calculatedPercentage, 0), 100);
          
          console.log(`🔍 Layer ${layer} fallback calculation:`, {
            totalMembers,
            maxCapacity,
            calculatedPercentage,
            safePercentage,
            positions: posData
          });
          
          completeStats.push({
            layer,
            totalMembers: totalMembers,
            leftMembers: posData.L,
            middleMembers: posData.M,
            rightMembers: posData.R,
            maxCapacity,
            fillPercentage: safePercentage,
            activeMembers: totalMembers,
            completedPercentage: safePercentage,
            emptySlots: Math.max(maxCapacity - totalMembers, 0),
            activationRate: totalMembers > 0 ? 100 : 0,
            layerStatus: totalMembers > 0 ? 'active' : 'empty',
            isBalanced: Math.abs(posData.L - posData.M) <= 1 && Math.abs(posData.M - posData.R) <= 1
          })
        }
      }

      console.log(`✅ Generated statistics for ${completeStats.length} layers`)

      return new Response(JSON.stringify({
        success: true,
        data: {
          wallet_address: walletAddress,
          layer_stats: completeStats,
          summary: {
            // Matrix layer statistics
            total_members: completeStats.reduce((sum, stat) => sum + stat.totalMembers, 0),
            total_active: completeStats.reduce((sum, stat) => sum + stat.activeMembers, 0),
            deepest_layer: Math.max(...completeStats.filter(s => s.totalMembers > 0).map(s => s.layer), 0),
            max_layer: Math.max(...completeStats.filter(s => s.totalMembers > 0).map(s => s.layer), 0),
            layers_with_data: completeStats.filter(s => s.totalMembers > 0).length,
            
            // Enhanced referral statistics (from improved referrals_stats_view)
            direct_referrals: statsData?.direct_referrals_count || 0,
            activated_referrals: statsData?.activated_referrals_count || 0,
            total_team_size: statsData?.total_team_size || completeStats.reduce((sum, stat) => sum + stat.totalMembers, 0),
            total_network_size: statsData?.total_network_size || 0,
            active_layers: statsData?.active_layers || 0,
            total_activated_members: statsData?.total_activated_members || 0,
            has_matrix_team: statsData?.has_matrix_team || false,
            
            // Computed metrics
            network_strength: (completeStats.reduce((sum, stat) => sum + stat.totalMembers, 0) * 5) + (statsData?.activated_referrals_count || 0) * 10,
            
            // Legacy aliases for backward compatibility
            total_members_alias: completeStats.reduce((sum, stat) => sum + stat.totalMembers, 0)
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    if (action === 'get-matrix-members' || action === 'get-matrix-tree') {
      // Get detailed matrix member data using matrix_referrals_tree_view (now shows complete 19-layer recursive data)
      console.log(`👥 Getting complete 19-layer matrix members for wallet: ${walletAddress}`)
      
      console.log(`👥 Querying matrix_referrals_tree_view (complete 19-layer data) for wallet: ${walletAddress}`)
      
      const { data: matrixMembers, error: membersError } = await supabase
        .from('matrix_referrals_tree_view')
        .select(`
          member_wallet,
          matrix_root_wallet,
          matrix_layer,
          matrix_position,
          referral_type,
          activation_time,
          parent_wallet,
          username,
          current_level,
          is_active,
          is_spillover,
          referral_depth
        `)
        .eq('matrix_root_wallet', walletAddress)
        .order('matrix_layer')
        .order('matrix_position')

      console.log(`👥 Matrix query result:`, { 
        memberCount: matrixMembers?.length || 0,
        error: membersError,
        sampleData: matrixMembers?.slice(0, 2)
      })

      if (membersError) {
        console.error('❌ Error fetching matrix members:', membersError)
        // Don't throw, return empty data instead
        return new Response(JSON.stringify({
          success: true,
          data: {
            wallet_address: walletAddress,
            matrix_data: {
              by_layer: {},
              total_members: 0
            },
            tree_members: [],
            note: `Matrix query error: ${membersError.message}`
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }
      
      if (!matrixMembers || matrixMembers.length === 0) {
        console.log('⚠️ No matrix members found for wallet:', walletAddress)
        return new Response(JSON.stringify({
          success: true,
          data: {
            wallet_address: walletAddress,
            matrix_data: {
              by_layer: {},
              total_members: 0
            },
            tree_members: [],
            note: 'No matrix members found - empty result'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      // Data is already enriched from matrix_referrals_tree_view
      const byLayer: any = {}
      const treeMembers: any [] = []

      matrixMembers?.forEach((member: any) => {
        const memberData = {
          wallet_address: member.member_wallet,
          username: member.username || `User${member.member_wallet?.slice(-4) || ''}`,
          matrix_position: member.matrix_position,  // L, M, R from matrix placement
          current_level: member.current_level || 1,
          is_activated: Boolean(member.is_active),
          joined_at: member.activation_time,  // Use activation time
          is_spillover: Boolean(member.is_spillover),  // Actual spillover status from view
          layer: member.matrix_layer,  // Use layer from view
          parent_wallet: member.parent_wallet,  // Include parent info
          placement_type: member.referral_type,  // Direct or indirect placement
          referral_depth: member.referral_depth  // Original referral depth
        }

        // Add to layer organization
        if (!byLayer[member.layer]) {
          byLayer[member.layer] = []
        }
        byLayer[member.layer].push(memberData)

        // Add to tree members
        treeMembers.push(memberData)
      })

      console.log(`✅ Retrieved ${matrixMembers?.length || 0} matrix members`)

      return new Response(JSON.stringify({
        success: true,
        data: {
          wallet_address: walletAddress,
          matrix_data: {
            by_layer: byLayer,
            total_members: matrixMembers?.length || 0
          },
          tree_members: treeMembers
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    throw new Error(`Unknown action: ${action}`)

  } catch (error) {
    console.error('Matrix view error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})