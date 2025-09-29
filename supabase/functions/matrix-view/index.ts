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

    const { action, matrixRoot, maxLayers } = await req.json()

    if (action === 'get-matrix-slots-detailed') {
      // Get detailed matrix slots data for comprehensive view
      console.log(`🎯 Getting detailed matrix slots for: ${matrixRoot}`)
      
      try {
        // Get matrix_referrals data organized by layers and positions
        const { data: matrixReferrals, error: matrixError } = await supabase
          .from('matrix_referrals')
          .select(`
            member_wallet,
            parent_wallet,
            layer,
            position,
            referral_type,
            created_at
          `)
          .eq('matrix_root_wallet', matrixRoot)
          .lte('layer', maxLayers || 3)
          .order('layer')
          .order('position')

        if (matrixError) {
          console.error('Matrix referrals query error:', matrixError)
          throw matrixError
        }

        // Get user and member data separately to avoid join issues
        const memberWallets = matrixReferrals?.map(r => r.member_wallet) || []
        
        let usersData = []
        let membersData = []
        
        if (memberWallets.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('wallet_address, username')
            .in('wallet_address', memberWallets)

          const { data: members } = await supabase
            .from('members')
            .select('wallet_address, current_level')
            .in('wallet_address', memberWallets)

          usersData = users || []
          membersData = members || []
        }

        // Organize data by layers and create slot structure
        const organizedData = {
          layer1: [],
          layer2: [],
          layer3: []
        }

        // Process each layer
        for (let layer = 1; layer <= (maxLayers || 3); layer++) {
          const layerData = matrixReferrals?.filter(r => r.layer === layer) || []
          const slotsForLayer = []

          // Generate slot numbers for this layer
          const slotsCount = Math.pow(3, layer)
          
          for (let slotNum = 1; slotNum <= slotsCount; slotNum++) {
            // Find if this slot is occupied
            const slotData = layerData.find((_, index) => index + 1 === slotNum)
            
            if (slotData) {
              // Find corresponding user and member data
              const userData = usersData.find(u => u.wallet_address === slotData.member_wallet)
              const memberData = membersData.find(m => m.wallet_address === slotData.member_wallet)
              
              slotsForLayer.push({
                slot_number: slotNum,
                position: slotData.position,
                slot_status: 'occupied',
                member_wallet: slotData.member_wallet,
                member_username: userData?.username,
                member_level: memberData?.current_level,
                parent_wallet: slotData.parent_wallet,
                referral_type: slotData.referral_type,
                created_at: slotData.created_at
              })
            } else {
              // Calculate position for empty slot
              let position = ''
              if (layer === 1) {
                position = ['L', 'M', 'R'][slotNum - 1]
              } else {
                const parentIndex = Math.floor((slotNum - 1) / 3)
                const childIndex = (slotNum - 1) % 3
                const childPos = ['L', 'M', 'R'][childIndex]
                // This is a simplified position calculation
                position = `${parentIndex + 1}.${childPos}`
              }
              
              slotsForLayer.push({
                slot_number: slotNum,
                position: position,
                slot_status: 'empty',
                member_wallet: null,
                member_username: null,
                member_level: null,
                parent_wallet: null,
                referral_type: null,
                created_at: null
              })
            }
          }

          organizedData[`layer${layer}` as keyof typeof organizedData] = slotsForLayer
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: organizedData,
            matrixRoot: matrixRoot,
            totalLayers: maxLayers || 3
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      } catch (error) {
        console.error('Detailed matrix slots error:', error)
        throw error
      }
    }

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

      // Try to get matrix layers data from matrix_layer_details (with fallback if view doesn't exist)
      let matrixData = null;
      let matrixError = null;

      try {
        const result = await supabase
          .from('matrix_layer_details')
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
          console.log('📊 Matrix layer data from matrix_layer_details:', matrixData.length, 'layers');
        }
      } catch (error) {
        console.log('⚠️ matrix_layer_details not available, using fallback calculation');
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

      // Use matrix_referrals table directly for accurate layer statistics
      const { data: membersData, error: membersError } = await supabase
        .from('matrix_referrals')
        .select('layer, position')
        .eq('matrix_root_wallet', walletAddress)

      console.log(`📊 Direct referrals query result for ${walletAddress}:`, { 
        memberCount: membersData?.length || 0,
        error: membersError,
        sampleData: membersData?.slice(0, 5)
      })

      // Count positions by layer using actual matrix_referrals data
      const positionCounts: any = {}
      membersData?.forEach(member => {
        if (!positionCounts[member.layer]) {
          positionCounts[member.layer] = { total: 0 }
        }
        // Count all positions in this layer
        if (member.position) {
          positionCounts[member.layer].total++
        }
      })

      console.log(`📊 Position counts by layer:`, positionCounts)

      // Transform data from matrix_layer_details (optimized)
      const completeStats = []
      
      // Initialize all 19 layers
      for (let layer = 1; layer <= 19; layer++) {
        const layerData = matrixData?.find((l: any) => l.layer === layer)
        const posData = positionCounts[layer] || { total: 0 }
        
        if (layerData) {
          // Use data directly from matrix_layer_view (already calculated)
          const totalMembers = layerData.filled_slots || 0;
          const maxCapacity = layerData.max_slots || Math.pow(3, layer);
          const fillPercentage = layerData.completion_rate || 0;
          const activationRate = layerData.activation_rate || 0;
          
          console.log(`🔍 Layer ${layer} from matrix_layer_details:`, {
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
          // Layer not in matrix_layer_details - use correct matrix calculation
          // Layer 1 = 3 positions (L,M,R), Layer 2 = 9 positions, Layer 3 = 27 positions, etc.
          const maxCapacity = Math.pow(3, layer);
          const totalMembers = posData.total || 0;
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
            leftMembers: 0,   // We'll calculate these separately if needed
            middleMembers: 0,
            rightMembers: 0,
            maxCapacity,
            fillPercentage: safePercentage,
            activeMembers: totalMembers,
            completedPercentage: safePercentage,
            emptySlots: Math.max(maxCapacity - totalMembers, 0),
            activationRate: totalMembers > 0 ? 100 : 0,
            layerStatus: totalMembers > 0 ? 'active' : 'empty',
            isBalanced: true // We'll calculate this properly later if needed
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
      // Get detailed matrix member data using corrected referrals table query to handle position conflicts
      console.log(`👥 Getting complete 19-layer matrix members for wallet: ${walletAddress}`)
      
      console.log(`👥 Querying referrals table directly with deduplication for wallet: ${walletAddress}`)
      
      // Use matrix_referrals table to get complete 19-layer matrix structure
      const { data: matrixMembers, error: membersError } = await supabase
        .from('matrix_referrals')
        .select(`
          member_wallet,
          matrix_root_wallet,
          layer,
          position,
          created_at,
          parent_wallet,
          referral_type
        `)
        .eq('matrix_root_wallet', walletAddress)
        .order('layer')
        .order('position')
        .order('created_at')
      
      // Get user and member data separately to avoid join issues
      const memberWallets = matrixMembers?.map(r => r.member_wallet) || []
      
      let usersData = []
      let membersData = []
      
      if (memberWallets.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('wallet_address, username')
          .in('wallet_address', memberWallets)

        const { data: members } = await supabase
          .from('members')
          .select('wallet_address, current_level')
          .in('wallet_address', memberWallets)

        usersData = users || []
        membersData = members || []
      }

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

      // Process data from referrals table with deduplication for position conflicts
      const byLayer: any = {}
      const treeMembers: any [] = []
      const positionTracker: any = {} // Track positions to handle conflicts
      
      // Process members with deduplication logic for position conflicts  
      matrixMembers?.forEach((member: any) => {
        const layerKey = member.layer
        const positionKey = `${layerKey}_${member.position}`
        
        // For position conflicts, prefer direct referrals over spillovers, and earlier timestamps
        const isDirect = member.referral_type === 'is_direct'
        const shouldInclude = !positionTracker[positionKey] || 
                             (isDirect && positionTracker[positionKey].referral_type !== 'is_direct') ||
                             (isDirect === (positionTracker[positionKey].referral_type === 'is_direct') && 
                              new Date(member.created_at) < new Date(positionTracker[positionKey].created_at))
        
        if (shouldInclude) {
          // Find corresponding user and member data
          const userData = usersData.find(u => u.wallet_address === member.member_wallet)
          const memberInfo = membersData.find(m => m.wallet_address === member.member_wallet)
          
          const memberData = {
            wallet_address: member.member_wallet,
            username: userData?.username || `User${member.member_wallet?.slice(-4) || ''}`,
            matrix_position: member.position,  // Position from matrix_referrals (L, M, R, L.L, etc.)
            current_level: memberInfo?.current_level || 1,
            is_activated: Boolean(memberInfo?.current_level >= 1),
            joined_at: member.created_at,  // Use created_at time
            is_spillover: member.referral_type === 'is_spillover',  // Spillover based on referral_type
            layer: member.layer,  // Use layer from matrix_referrals table
            parent_wallet: member.parent_wallet,  // Use parent_wallet
            placement_type: member.referral_type === 'is_direct' ? 'direct_referral' : 'spillover_placement',
            referral_depth: member.layer  // Use layer as depth
          }

          // Update position tracker
          positionTracker[positionKey] = {
            referral_type: member.referral_type,
            created_at: member.created_at,
            member_data: memberData
          }
        }
      })
      
      // Organize final deduplicated results
      Object.values(positionTracker).forEach((trackedMember: any) => {
        const memberData = trackedMember.member_data
        
        // Add to layer organization
        if (!byLayer[memberData.layer]) {
          byLayer[memberData.layer] = []
        }
        byLayer[memberData.layer].push(memberData)

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