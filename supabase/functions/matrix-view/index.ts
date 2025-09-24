import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
      
      // Get enhanced stats from improved referrals_stats_view
      const { data: statsData, error: statsError } = await supabase
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
        .single()

      if (statsError && statsError.code !== 'PGRST116') { // Ignore not found error
        console.log('Enhanced stats not found, using fallback:', statsError.message)
      }

      console.log('📊 Enhanced stats data:', statsData)

      // Try to get matrix layers data, with fallback if view doesn't exist
      let matrixData = null;
      let matrixError = null;
      
      try {
        const result = await supabase
          .from('matrix_layers_view')
          .select(`
            layer,
            filled_slots,
            empty_slots,
            max_slots,
            completion_rate
          `)
          .eq('matrix_root_wallet', walletAddress)
          .order('layer');
        
        matrixData = result.data;
        matrixError = result.error;
      } catch (error) {
        console.log('matrix_layers_view not available, using fallback calculation');
        matrixError = error;
      }

      if (matrixError) {
        console.error('Error fetching matrix data:', matrixError)
        console.log('Using direct table calculation as fallback...')
        // Continue with empty data - will be calculated from member positions
        matrixData = [];
      }

      console.log(`📊 Matrix layer data for ${walletAddress}:`, matrixData)
      console.log(`📊 Matrix layer data retrieved: ${matrixData?.length || 0} layers`)

      // Get detailed member positions for L/M/R breakdown
      const { data: membersData } = await supabase
        .from('matrix_referrals_tree_view')
        .select('layer, position')
        .eq('matrix_root_wallet', walletAddress)

      // Count positions by layer
      const positionCounts: any = {}
      membersData?.forEach(member => {
        if (!positionCounts[member.layer]) {
          positionCounts[member.layer] = { L: 0, M: 0, R: 0 }
        }
        if (member.position && ['L', 'M', 'R'].includes(member.position)) {
          positionCounts[member.layer][member.position]++
        }
      })

      // Transform data from matrix_layers_view
      const completeStats = []
      
      // Initialize all 19 layers
      for (let layer = 1; layer <= 19; layer++) {
        const layerData = matrixData?.find((l: any) => l.layer === layer)
        const posData = positionCounts[layer] || { L: 0, M: 0, R: 0 }
        
        if (layerData) {
          // Manual percentage calculation to avoid database view issues
          const totalMembers = layerData.filled_slots || 0;
          const maxCapacity = layerData.max_slots || Math.pow(3, layer);
          const calculatedPercentage = maxCapacity > 0 ? (totalMembers / maxCapacity) * 100 : 0;
          const safePercentage = Math.min(Math.max(calculatedPercentage, 0), 100); // Clamp between 0-100
          
          console.log(`🔍 Layer ${layer} calculation:`, {
            totalMembers,
            maxCapacity,
            calculatedPercentage,
            safePercentage,
            db_completion_rate: layerData.completion_rate
          });
          
          completeStats.push({
            layer: layerData.layer,
            totalMembers: totalMembers,
            leftMembers: posData.L,
            middleMembers: posData.M,
            rightMembers: posData.R,
            maxCapacity: maxCapacity,
            fillPercentage: safePercentage,
            activeMembers: totalMembers, // All filled slots are considered active
            completedPercentage: safePercentage,
            emptySlots: Math.max(maxCapacity - totalMembers, 0)
          })
        } else {
          // Layer not in view - calculate from position data
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
            emptySlots: Math.max(maxCapacity - totalMembers, 0)
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
      // Get detailed matrix member data using matrix_referrals_tree_view
      console.log(`👥 Getting matrix members for wallet: ${walletAddress}`)
      
      const { data: matrixMembers, error: membersError } = await supabase
        .from('matrix_referrals_tree_view')
        .select(`
          member_wallet,
          matrix_root_wallet,
          layer,
          position,
          referral_type,
          child_activation_time
        `)
        .eq('matrix_root_wallet', walletAddress)
        .order('layer')
        .order('position')

      if (membersError) {
        console.error('Error fetching matrix members:', membersError)
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
            note: 'No matrix members found'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      // Get additional user info
      const memberWallets = matrixMembers?.map(m => m.member_wallet).filter(Boolean) || []
      let usersData = []
      let membersData = []

      if (memberWallets.length > 0) {
        const [usersResult, membersResult] = await Promise.all([
          supabase.from('users').select('wallet_address, username').in('wallet_address', memberWallets),
          supabase.from('members').select('wallet_address, current_level').in('wallet_address', memberWallets)
        ])

        usersData = usersResult.data || []
        membersData = membersResult.data || []
      }

      const usersMap = new Map(usersData.map((u: any) => [u.wallet_address, u]))
      const membersMap = new Map(membersData.map((m: any) => [m.wallet_address, m]))

      // Organize by layer
      const byLayer: any = {}
      const treeMembers: any [] = []

      matrixMembers?.forEach((member: any) => {
        const userInfo = usersMap.get(member.member_wallet)
        const memberInfo = membersMap.get(member.member_wallet)

        const memberData = {
          wallet_address: member.member_wallet,
          username: userInfo?.username || `User${member.member_wallet?.slice(-4) || ''}`,
          matrix_position: member.position,
          current_level: (memberInfo as any)?.current_level || 1,
          is_activated: Boolean((memberInfo as any)?.current_level && (memberInfo as any).current_level > 0),
          joined_at: member.child_activation_time,
          referral_type: member.referral_type,
          layer: member.layer
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