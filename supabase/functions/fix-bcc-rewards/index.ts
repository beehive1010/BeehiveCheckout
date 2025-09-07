// Fix BCC Rewards Configuration - Admin Function
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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Admin authentication check
    const adminToken = req.headers.get('x-admin-token');
    if (!adminToken || adminToken !== 'fix-bcc-rewards-admin-2025') {
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔧 Starting BCC rewards fix...');

    // Update NFT levels with correct BCC rewards according to MarketingPlan.md
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

      updates.push({
        level,
        transferable,
        locked, 
        total,
        benefits
      });

      // Update the database record
      const { error: updateError } = await supabase
        .from('nft_levels')
        .update({
          bcc_reward: total,
          benefits: benefits,
          updated_at: new Date().toISOString()
        })
        .eq('level', level);

      if (updateError) {
        console.error(`Failed to update level ${level}:`, updateError);
      } else {
        console.log(`✅ Updated Level ${level}: ${transferable}T + ${locked}L = ${total} BCC`);
      }
    }

    // Verify the updates
    const { data: updatedLevels, error: fetchError } = await supabase
      .from('nft_levels')
      .select('level, bcc_reward, benefits')
      .order('level');

    if (fetchError) {
      throw fetchError;
    }

    console.log('🎉 BCC rewards fix completed successfully!');

    return new Response(JSON.stringify({
      success: true,
      message: 'BCC rewards updated successfully',
      updates: updates,
      verification: updatedLevels
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fix BCC rewards error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});