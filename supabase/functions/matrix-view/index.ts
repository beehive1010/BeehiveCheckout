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
      // Get layer statistics using the optimized view
      console.log(`📊 Getting layer statistics for wallet: ${walletAddress}`)
      
      const { data: layerStats, error: layerError } = await supabase
        .from('matrix_layer_stats_view')
        .select('*')
        .eq('matrix_root_wallet', walletAddress)
        .order('matrix_layer', { ascending: true })

      if (layerError) {
        console.error('Error fetching layer stats:', layerError)
        throw layerError
      }

      // Generate complete 19-layer statistics
      const completeStats = []
      for (let layer = 1; layer <= 19; layer++) {
        const layerData = layerStats?.find(s => s.matrix_layer === layer)
        
        if (layerData) {
          completeStats.push({
            layer,
            totalMembers: parseInt(layerData.total_members),
            leftMembers: parseInt(layerData.left_members),
            middleMembers: parseInt(layerData.middle_members),
            rightMembers: parseInt(layerData.right_members),
            maxCapacity: Math.pow(3, layer),
            fillPercentage: parseFloat(layerData.fill_percentage) || 0,
            activeMembers: parseInt(layerData.active_members),
            completedPercentage: parseFloat(layerData.completion_percentage) || 0
          })
        } else {
          // Empty layer
          completeStats.push({
            layer,
            totalMembers: 0,
            leftMembers: 0,
            middleMembers: 0,
            rightMembers: 0,
            maxCapacity: Math.pow(3, layer),
            fillPercentage: 0,
            activeMembers: 0,
            completedPercentage: 0
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
      // Get detailed matrix member data using the optimized view
      console.log(`👥 Getting matrix members for wallet: ${walletAddress}`)
      
      const { data: matrixMembers, error: membersError } = await supabase
        .from('matrix_view')
        .select('*')
        .eq('matrix_root_wallet', walletAddress)
        .order('matrix_layer', { ascending: true })
        .order('matrix_position', { ascending: true })

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
          joined_at: member.joined_at,
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