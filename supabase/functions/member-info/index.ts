import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
console.log(`👤 Member Info API启动成功!`);
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const walletAddress = req.headers.get('x-wallet-address');
    if (!walletAddress) {
      throw new Error('钱包地址缺失');
    }
    console.log(`👤 Getting member info for: ${walletAddress}`);
    // Get member info with SERVICE_ROLE_KEY to bypass RLS
    const { data: memberData, error: memberError } = await supabase.from('members').select('*').eq('wallet_address', walletAddress).single();
    if (memberError) {
      console.log('Member query error:', memberError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Member not found',
        member: null,
        debug: {
          memberError
        }
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }
    console.log(`✅ Member found:`, memberData);
    return new Response(JSON.stringify({
      success: true,
      member: memberData,
      isActivated: memberData?.is_activated || false,
      currentLevel: memberData?.current_level || 0
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Member info error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
