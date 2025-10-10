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
            // Calculate position for this slot number
            let expectedPosition = ''
            if (layer === 1) {
              expectedPosition = ['L', 'M', 'R'][slotNum - 1]
            } else if (layer === 2) {
              const positions = ['L.L', 'L.M', 'L.R', 'M.L', 'M.M', 'M.R', 'R.L', 'R.M', 'R.R']
              expectedPosition = positions[slotNum - 1]
            } else {
              // For deeper layers, calculate position based on slot number
              const parentIndex = Math.floor((slotNum - 1) / 3)
              const childIndex = (slotNum - 1) % 3
              const parentPos = ['L', 'M', 'R'][parentIndex]  
              const childPos = ['L', 'M', 'R'][childIndex]
              expectedPosition = `${parentPos}.${childPos}`
            }
            
            // Find if this slot is occupied by matching position
            const slotData = layerData.find(data => data.position === expectedPosition)
            
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
              // Use the same expectedPosition for empty slots
              slotsForLayer.push({
                slot_number: slotNum,
                position: expectedPosition,
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
      // Get layer statistics directly from matrix_referrals table
      console.log(`📊 Getting layer statistics for wallet: ${walletAddress}`)

      // Get team size stats from referrals_stats_view (has correct total_referrals)
      let totalTeamSize = 0;
      try {
        const { data: teamStats, error: teamError } = await supabase
          .from('referrals_stats_view')
          .select('total_referrals, unique_members')
          .eq('referrer_wallet', walletAddress)
          .maybeSingle();

        if (!teamError && teamStats) {
          totalTeamSize = teamStats.total_referrals || teamStats.unique_members || 0;
          console.log('📊 Team size from referrals_stats_view:', totalTeamSize);
        }
      } catch (error) {
        console.log('⚠️ referrals_stats_view query failed:', error);
      }

      // Use v_matrix_layers view for efficient aggregated statistics
      console.log(`📊 Using v_matrix_layers view for layer statistics`)

      const { data: layerData, error: layerDataError } = await supabase
        .from('v_matrix_layers')
        .select('layer, capacity, filled, spillovers, directs')
        .eq('root', walletAddress)
        .order('layer')

      if (layerDataError) {
        console.error('❌ Error querying v_matrix_layers:', layerDataError)
        throw layerDataError
      }

      console.log(`📊 v_matrix_layers returned ${layerData?.length || 0} layers`)

      // Get L/M/R breakdown from matrix_referrals for layers with data
      const positionCounts: any = {}

      // Initialize from view data
      layerData?.forEach((row: any) => {
        positionCounts[row.layer] = {
          total: row.filled || 0,
          L: 0,
          M: 0,
          R: 0
        }
      })

      // Query matrix_referrals for position details only for layers with data
      const layersToQuery = layerData?.map(d => d.layer) || []

      if (layersToQuery.length > 0) {
        const { data: positionsData, error: posError } = await supabase
          .from('matrix_referrals')
          .select('layer, position')
          .eq('matrix_root_wallet', walletAddress)
          .in('layer', layersToQuery)

        if (!posError && positionsData) {
          // Count L/M/R positions for each layer
          positionsData.forEach((item: any) => {
            const layer = item.layer
            if (positionCounts[layer]) {
              const pos = item.position
              // Check last character of position string
              if (pos === 'L' || pos?.endsWith('.L')) {
                positionCounts[layer].L++
              } else if (pos === 'M' || pos?.endsWith('.M')) {
                positionCounts[layer].M++
              } else if (pos === 'R' || pos?.endsWith('.R')) {
                positionCounts[layer].R++
              }
            }
          })
        }
      }

      console.log(`📊 Position counts by layer with L/M/R:`, positionCounts)

      // Get actual direct referrals count from members table (users who have this wallet as referrer)
      const { count: actualDirectReferrals, error: directRefError } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', walletAddress)

      console.log(`📊 Actual direct referrals from members table:`, actualDirectReferrals)

      // Build complete stats for all 19 layers
      const completeStats = []

      // Initialize all 19 layers
      for (let layer = 1; layer <= 19; layer++) {
        const posData = positionCounts[layer] || { total: 0, L: 0, M: 0, R: 0 }
        const maxCapacity = Math.pow(3, layer);
        const totalMembers = posData.total || 0;
        const calculatedPercentage = maxCapacity > 0 ? (totalMembers / maxCapacity) * 100 : 0;
        const safePercentage = Math.min(Math.max(calculatedPercentage, 0), 100);

        console.log(`🔍 Layer ${layer} calculation:`, {
          totalMembers,
          leftMembers: posData.L,
          middleMembers: posData.M,
          rightMembers: posData.R,
          maxCapacity,
          fillPercentage: safePercentage
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
          layerStatus: totalMembers >= maxCapacity ? 'completed' : totalMembers > 0 ? 'active' : 'empty',
          isBalanced: Math.abs(posData.L - posData.M) <= 1 && Math.abs(posData.M - posData.R) <= 1
        })
      }

      console.log(`✅ Generated statistics for ${completeStats.length} layers`)

      // Calculate summary statistics
      const totalMatrixMembers = completeStats.reduce((sum, stat) => sum + stat.totalMembers, 0);
      const maxLayer = Math.max(...completeStats.filter(s => s.totalMembers > 0).map(s => s.layer), 0);
      const layersWithData = completeStats.filter(s => s.totalMembers > 0).length;

      return new Response(JSON.stringify({
        success: true,
        data: {
          wallet_address: walletAddress,
          layer_stats: completeStats,
          summary: {
            // Matrix layer statistics
            total_members: totalMatrixMembers,
            total_active: totalMatrixMembers, // All members in matrix are active
            deepest_layer: maxLayer,
            max_layer: maxLayer,
            layers_with_data: layersWithData,

            // Referral statistics - use actual counts from database
            direct_referrals: actualDirectReferrals || 0,  // From members.referrer_wallet
            activated_referrals: actualDirectReferrals || 0,  // All members in members table are activated
            total_team_size: totalTeamSize || totalMatrixMembers,  // From referrals_stats_view or matrix total
            total_network_size: totalMatrixMembers,
            active_layers: layersWithData,
            total_activated_members: totalMatrixMembers,
            has_matrix_team: totalMatrixMembers > 0,

            // Computed metrics
            network_strength: (totalMatrixMembers * 5) + (actualDirectReferrals || 0) * 10,

            // Legacy aliases for backward compatibility
            total_members_alias: totalMatrixMembers
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
      
      // Get matrix data from both tables to ensure complete coverage
      // First get from referrals table (main source for new users)
      const { data: referralMembers, error: referralError } = await supabase
        .from('referrals')
        .select(`
          member_wallet,
          matrix_root_wallet,
          matrix_layer,
          matrix_position,
          placed_at,
          referrer_wallet,
          is_spillover_placement
        `)
        .eq('matrix_root_wallet', walletAddress)
        .not('matrix_position', 'is', null)
        .order('matrix_layer')
        .order('placed_at')

      // Also get from matrix_referrals table for backward compatibility
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
      
      // Combine and normalize data from both sources
      const allMatrixMembers = []
      
      // Add referrals data (main source)
      if (referralMembers && !referralError) {
        referralMembers.forEach(ref => {
          allMatrixMembers.push({
            member_wallet: ref.member_wallet,
            matrix_root_wallet: ref.matrix_root_wallet,
            layer: ref.matrix_layer,
            position: ref.matrix_position,
            created_at: ref.placed_at,
            parent_wallet: ref.referrer_wallet,
            referral_type: ref.is_spillover_placement ? 'is_spillover' : 'is_direct'
          })
        })
      }
      
      // Add matrix_referrals data (legacy support)
      if (matrixMembers && !membersError) {
        matrixMembers.forEach(matrix => {
          // Only add if not already present from referrals table
          const exists = allMatrixMembers.some(m => 
            m.member_wallet === matrix.member_wallet && 
            m.position === matrix.position
          )
          if (!exists) {
            allMatrixMembers.push(matrix)
          }
        })
      }
      
      // Get user and member data separately to avoid join issues
      const memberWallets = allMatrixMembers?.map(r => r.member_wallet) || []
      
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
        memberCount: allMatrixMembers?.length || 0,
        referralError: referralError,
        matrixError: membersError,
        sampleData: allMatrixMembers?.slice(0, 2)
      })

      if (membersError && referralError) {
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
      
      if (!allMatrixMembers || allMatrixMembers.length === 0) {
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
      allMatrixMembers?.forEach((member: any) => {
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

      console.log(`✅ Retrieved ${allMatrixMembers?.length || 0} matrix members`)

      return new Response(JSON.stringify({
        success: true,
        data: {
          wallet_address: walletAddress,
          matrix_data: {
            by_layer: byLayer,
            total_members: allMatrixMembers?.length || 0
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