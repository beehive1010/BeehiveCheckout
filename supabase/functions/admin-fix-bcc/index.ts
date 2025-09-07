// Admin function to fix BCC rewards via existing admin function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'fix-bcc-rewards') {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
      console.log('🔧 Fixing BCC rewards configuration...');

      // Update each NFT level with correct BCC rewards
      const updates = [];
      
      for (let level = 1; level <= 19; level++) {
        const transferable = level === 1 ? 500 : 500 + (level - 1) * 100;
        const locked = level === 1 ? 10350 : 10350 + (level - 1) * 50;
        const total = transferable + locked;

        const benefits = [
          level === 1 ? 'Access to basic courses' : `All Level ${level-1} benefits`,
          level === 1 ? 'Entry to community' : `Level ${level} course access`,
          `Unlocks ${transferable} transferable BCC + ${locked} locked BCC when purchased`
        ];

        // Update NFT level
        const { error } = await supabase
          .from('nft_levels')
          .update({
            bcc_reward: total,
            benefits: benefits,
            updated_at: new Date().toISOString()
          })
          .eq('level', level);

        if (error) {
          console.error(`Error updating level ${level}:`, error);
        } else {
          console.log(`✅ Level ${level}: ${transferable}T + ${locked}L = ${total} BCC`);
          updates.push({ level, transferable, locked, total });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'BCC rewards fixed successfully',
        updates: updates
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to fix BCC rewards',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});