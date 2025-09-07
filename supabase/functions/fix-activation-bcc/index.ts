// Fix BCC Activation Logic - Correct Implementation
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
  const action = url.searchParams.get('action') || 'fix-existing-user';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    if (action === 'fix-existing-user') {
      // Fix the existing test user's balance
      const walletAddress = '0x742d35cc6636c0532925a3b8d6ac6c9c78b8d1aa';
      
      console.log(`🔧 Fixing BCC balance for user: ${walletAddress}`);

      // Correct Level 1 activation should result in:
      // 500 BCC (base activation) + 100 BCC (Level 1 unlock) = 600 BCC transferable
      // 10,450 BCC (base locked) - 100 BCC (unlocked) = 10,350 BCC locked

      const { error: updateError } = await supabase
        .from('balances')
        .update({
          bcc_transferable: 600,        // 500 base + 100 unlocked from Level 1
          bcc_locked: 10350,           // 10,450 base - 100 unlocked
          bcc_locked_total: 10350,     // Total locked amount
          bcc_unlocked_balance: 600,   // Total unlocked (transferable)
          total_bcc: 10950,            // 600 + 10,350 = 10,950 total
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (updateError) {
        throw updateError;
      }

      // Also update NFT levels configuration to reflect correct unlock amounts
      const nftLevelUpdates = [];
      for (let level = 1; level <= 19; level++) {
        const unlockAmount = 100 + (level - 1) * 50; // Level 1: 100, Level 2: 150, etc.
        
        const { error: nftError } = await supabase
          .from('nft_levels')
          .update({
            bcc_reward: unlockAmount,  // This represents the unlock amount, not total
            benefits: [
              level === 1 ? 'Access to basic courses' : `All Level ${level-1} benefits`,
              level === 1 ? 'Entry to community' : `Level ${level} course access`,
              `Unlocks ${unlockAmount} BCC from locked balance when purchased`
            ],
            updated_at: new Date().toISOString()
          })
          .eq('level', level);

        if (!nftError) {
          nftLevelUpdates.push({ level, unlockAmount });
          console.log(`✅ Updated Level ${level} unlock: ${unlockAmount} BCC`);
        }
      }

      // Verify the fix
      const { data: updatedBalance } = await supabase
        .from('balances')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      console.log('🎉 BCC balance fix completed!');

      return new Response(JSON.stringify({
        success: true,
        message: 'BCC activation logic fixed',
        correctedBalance: {
          transferable: updatedBalance?.bcc_transferable || 0,
          locked: updatedBalance?.bcc_locked || 0,
          total: updatedBalance?.total_bcc || 0
        },
        nftLevelUpdates: nftLevelUpdates,
        explanation: {
          baseActivation: '500 BCC transferable + 10,450 BCC locked',
          level1Unlock: '100 BCC unlocked from locked to transferable',
          finalResult: '600 BCC transferable + 10,350 BCC locked = 10,950 total'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fix activation BCC error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});