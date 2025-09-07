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

    console.log('📋 First checking current NFT level configuration...');
    
    // Get current Level 1 configuration
    const { data: currentLevel1, error: level1Error } = await supabase
      .from('nft_levels')
      .select('*')
      .eq('level', 1)
      .single();
    
    if (level1Error) {
      console.error('Error fetching Level 1 config:', level1Error);
    } else {
      console.log('Current Level 1 config:', currentLevel1);
    }

    // Update NFT levels with correct BCC rewards according to unlock mechanism
    const updates = [];
    for (let level = 1; level <= 19; level++) {
      // Calculate unlock amounts (not total BCC)
      const unlockAmount = level === 1 ? 100 : 100 + (level - 1) * 50;
      
      const benefits = [
        level === 1 ? 'Access to basic courses' : `All Level ${level-1} benefits`,
        level === 1 ? 'Entry to community' : `Level ${level} course access`,
        `Unlocks ${unlockAmount} BCC from locked balance when purchased`
      ];

      updates.push({
        level,
        unlockAmount,
        benefits
      });

      // Update the database record - bcc_reward represents unlock amount
      const { error: updateError } = await supabase
        .from('nft_levels')
        .update({
          bcc_reward: unlockAmount,    // This represents the unlock amount
          benefits: benefits,
          updated_at: new Date().toISOString()
        })
        .eq('level', level);

      if (updateError) {
        console.error(`Failed to update level ${level}:`, updateError);
      } else {
        console.log(`✅ Updated Level ${level}: Unlocks ${unlockAmount} BCC`);
      }
    }

    // Verify the user balance update
    const { data: updatedBalance } = await supabase
      .from('balances')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    // Verify the NFT level updates
    const { data: updatedLevels, error: fetchError } = await supabase
      .from('nft_levels')
      .select('level, bcc_reward, benefits')
      .order('level');

    if (fetchError) {
      throw fetchError;
    }

    console.log('🎉 BCC rewards and balance fix completed successfully!');

    return new Response(JSON.stringify({
      success: true,
      message: 'BCC unlock mechanism implemented successfully',
      correctedBalance: {
        wallet: walletAddress,
        transferable: updatedBalance?.bcc_transferable || 0,
        locked: updatedBalance?.bcc_locked || 0,
        total: updatedBalance?.total_bcc || 0
      },
      nftLevelUpdates: updates,
      verification: updatedLevels,
      explanation: {
        baseActivation: '500 BCC transferable + 10,450 BCC locked = 10,950 total',
        level1Unlock: '100 BCC unlocked from locked to transferable',
        finalResult: '600 BCC transferable + 10,350 BCC locked = 10,950 total',
        mechanism: 'Each NFT level unlocks BCC from locked to transferable (not adds new BCC)'
      }
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