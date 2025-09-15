import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

console.log('🔍 Matrix View function started successfully!')

serve(async (req) => {
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
      // Get layer statistics using the fixed get_1x3_matrix_view function
      console.log(`📊 Getting layer statistics for wallet: ${walletAddress}`)
      
      const { data: matrixData, error: matrixError } = await supabase.rpc('get_1x3_matrix_view', {
        p_wallet_address: walletAddress,
        p_levels: 19  // Get up to 19 layers
      })

      if (matrixError) {
        console.error('Error fetching matrix data:', matrixError)
        throw matrixError
      }

      console.log(`📊 Matrix data retrieved: ${matrixData?.length || 0} members`)

      // Process matrix data to generate layer statistics
      const layerStatsMap = new Map()
      
      // Initialize all layers with zero counts
      for (let layer = 1; layer <= 19; layer++) {
        layerStatsMap.set(layer, {
          layer,
          totalMembers: 0,
          leftMembers: 0,
          middleMembers: 0,
          rightMembers: 0,
          maxCapacity: Math.pow(3, layer),
          activeMembers: 0
        })
      }

      // Process actual matrix data
      if (matrixData && matrixData.length > 0) {
        matrixData.forEach((member: any) => {
          const layer = member.matrix_layer
          if (layer <= 19) {
            const stats = layerStatsMap.get(layer)
            if (stats) {
              stats.totalMembers++
              
              // Count by position (L, M, R)
              switch (member.matrix_position) {
                case 'L':
                  stats.leftMembers++
                  break
                case 'M':
                  stats.middleMembers++
                  break
                case 'R':
                  stats.rightMembers++
                  break
              }
              
              // Count activated members
              if (member.is_activated) {
                stats.activeMembers++
              }
              
              layerStatsMap.set(layer, stats)
            }
          }
        })
      }

      // Convert to final array with calculated percentages
      const completeStats = []
      for (let layer = 1; layer <= 19; layer++) {
        const stats = layerStatsMap.get(layer)
        const fillPercentage = stats.maxCapacity > 0 ? (stats.totalMembers / stats.maxCapacity) * 100 : 0
        const completedPercentage = stats.totalMembers > 0 ? (stats.activeMembers / stats.totalMembers) * 100 : 0
        
        completeStats.push({
          layer,
          totalMembers: stats.totalMembers,
          leftMembers: stats.leftMembers,
          middleMembers: stats.middleMembers,
          rightMembers: stats.rightMembers,
          maxCapacity: stats.maxCapacity,
          fillPercentage: parseFloat(fillPercentage.toFixed(2)),
          activeMembers: stats.activeMembers,
          completedPercentage: parseFloat(completedPercentage.toFixed(2))
        })
      }

      console.log(`✅ Generated statistics for ${completeStats.length} layers`)

      return new Response(JSON.stringify({
        success: true,
        data: {
          wallet_address: walletAddress,
          layer_stats: completeStats,
          summary: {
            total_members: completeStats.reduce((sum, stat) => sum + stat.totalMembers, 0),
            total_active: completeStats.reduce((sum, stat) => sum + stat.activeMembers, 0),
            deepest_layer: Math.max(...completeStats.filter(s => s.totalMembers > 0).map(s => s.layer), 0),
            layers_with_data: completeStats.filter(s => s.totalMembers > 0).length
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    if (action === 'get-matrix-members') {
      // Get detailed matrix member data using the fixed get_1x3_matrix_view function
      console.log(`👥 Getting matrix members for wallet: ${walletAddress}`)
      
      const { data: matrixMembers, error: membersError } = await supabase.rpc('get_1x3_matrix_view', {
        p_wallet_address: walletAddress,
        p_levels: 19  // Get up to 19 layers
      })

      if (membersError) {
        console.error('Error fetching matrix members:', membersError)
        throw membersError
      }

      // Organize by layer
      const byLayer = {}
      matrixMembers?.forEach(member => {
        if (!byLayer[member.matrix_layer]) {
          byLayer[member.matrix_layer] = []
        }
        byLayer[member.matrix_layer].push({
          wallet_address: member.wallet_address,
          username: member.username,
          matrix_position: member.matrix_position,
          current_level: member.current_level,
          is_activated: member.is_activated,
          joined_at: member.activation_time,  // Use activation_time instead of joined_at
          activation_sequence: member.activation_sequence
        })
      })

      console.log(`✅ Retrieved ${matrixMembers?.length || 0} matrix members`)

      return new Response(JSON.stringify({
        success: true,
        data: {
          wallet_address: walletAddress,
          matrix_data: {
            by_layer: byLayer,
            total_members: matrixMembers?.length || 0
          }
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