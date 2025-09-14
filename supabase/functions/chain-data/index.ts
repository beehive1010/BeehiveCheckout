import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, contractAddress, walletAddress } = await req.json();
    console.log('Chain data request:', { action, contractAddress, walletAddress });

    if (!action) {
      throw new Error('Action parameter is required');
    }

    switch (action) {
      case 'get-token-balance':
        if (!contractAddress || !walletAddress) {
          throw new Error('contractAddress and walletAddress are required');
        }

        try {
          // Use Arbiscan API on the backend to avoid CORS issues
          const arbiscanUrl = `https://api-sepolia.arbiscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${walletAddress}&tag=latest`;
          
          console.log('Fetching balance from Arbiscan:', arbiscanUrl);
          
          const response = await fetch(arbiscanUrl);
          const data = await response.json();
          
          if (data.status === '1') {
            return new Response(JSON.stringify({
              success: true,
              balance: data.result,
              contractAddress,
              walletAddress
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            throw new Error(`Arbiscan API error: ${data.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error fetching token balance:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to fetch token balance'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Chain data error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});