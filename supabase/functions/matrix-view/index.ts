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
      // Get layer statistics using matrix_layers_view directly
      console.log(`📊 Getting layer statistics for wallet: ${walletAddress}`)
      
      const { data: matrixData, error: matrixError } = await supabase
        .from('matrix_layers_view')
        .select('*')
        .eq('matrix_root_wallet', walletAddress)
        .order('layer')

      if (matrixError) {
        console.error('Error fetching matrix data:', matrixError)
        throw matrixError
      }

      console.log(`📊 Matrix layer data retrieved: ${matrixData?.length || 0} layers`)

      // Transform data directly from matrix_layers_view (no need for processing)
      const completeStats = []
      
      // Initialize all 19 layers
      for (let layer = 1; layer <= 19; layer++) {
        const layerData = matrixData?.find((l: any) => l.layer === layer)
        
        if (layerData) {
          // Use data from matrix_layers_view directly
          completeStats.push({
            layer: layerData.layer,
            totalMembers: layerData.filled_slots || 0,
            leftMembers: layerData.left_count || 0,
            middleMembers: layerData.middle_count || 0,
            rightMembers: layerData.right_count || 0,
            maxCapacity: layerData.max_slots || Math.pow(3, layer),
            fillPercentage: parseFloat(layerData.completion_rate || 0),
            activeMembers: layerData.activated_members || 0,
            completedPercentage: parseFloat(layerData.completion_rate || 0)
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
      // Get detailed matrix member data using matrix_referrals_view
      console.log(`👥 Getting matrix members for wallet: ${walletAddress}`)
      
      const { data: matrixMembers, error: membersError } = await supabase
        .from('matrix_referrals_view')
        .select('*')
        .eq('matrix_root_wallet', walletAddress)
        .order('layer')
        .order('position')

      if (membersError) {
        console.error('Error fetching matrix members:', membersError)
        throw membersError
      }

      // Organize by layer
      const byLayer = {}
      matrixMembers?.forEach(member => {
        if (!byLayer[member.layer]) {
          byLayer[member.layer] = []
        }
        byLayer[member.layer].push({
          wallet_address: member.member_wallet,
          username: member.username,
          matrix_position: member.position,
          current_level: member.current_level,
          is_activated: member.is_activated,
          joined_at: member.created_at,  // Use created_at from matrix_referrals_view
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