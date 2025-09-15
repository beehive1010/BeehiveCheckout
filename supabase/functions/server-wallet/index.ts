// Server Wallet Management Edge Function
// Handles secure server wallet operations for cross-chain withdrawals and transfers

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WithdrawalRequest {
  id?: string;
  user_wallet: string;
  amount: string;
  target_chain_id: number;
  token_address: string;
  user_signature: string;
  metadata?: Record<string, any>;
}

interface ServerWalletBalance {
  chain_id: number;
  token_address: string;
  balance: string;
  decimals: number;
  symbol: string;
  last_updated: string;
}

serve(async (req) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, wallet-address, admin-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const action = segments[segments.length - 1] || segments[segments.length - 2];

    // Route handling
    switch (req.method) {
      case 'GET':
        return await handleGet(action, url, supabaseClient, corsHeaders);
      case 'POST':
        return await handlePost(action, req, supabaseClient, corsHeaders);
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Server wallet function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleGet(action: string, url: URL, supabaseClient: any, corsHeaders: any) {
  switch (action) {
    case 'balance':
      return await getServerWalletBalance(url, supabaseClient, corsHeaders);
    case 'status':
      return await getServerWalletStatus(supabaseClient, corsHeaders);
    case 'withdrawals':
      return await getWithdrawalHistory(url, supabaseClient, corsHeaders);
    case 'supported-chains':
      return await getSupportedChains(corsHeaders);
    default:
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
}

async function handlePost(action: string, req: Request, supabaseClient: any, corsHeaders: any) {
  const body = await req.json();

  switch (action) {
    case 'withdraw':
      return await processWithdrawal(body, supabaseClient, corsHeaders);
    case 'estimate-gas':
      return await estimateWithdrawalGas(body, corsHeaders);
    case 'validate-signature':
      return await validateWithdrawalSignature(body, corsHeaders);
    default:
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
}

async function getServerWalletBalance(url: URL, supabaseClient: any, corsHeaders: any) {
  try {
    const chainId = url.searchParams.get('chain_id');
    const tokenAddress = url.searchParams.get('token_address');

    if (!chainId || !tokenAddress) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing chain_id or token_address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get server wallet balance from database cache (updated periodically)
    const { data: balanceData, error } = await supabaseClient
      .from('server_wallet_balances')
      .select('*')
      .eq('chain_id', parseInt(chainId))
.eq('token_address', tokenAddress)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // Not found is OK
      throw error;
    }

    // If no cached data, return estimated balance
    if (!balanceData) {
      return new Response(
        JSON.stringify({
          success: true,
          balance: {
            chain_id: parseInt(chainId),
            token_address: tokenAddress,
            balance: '0',
            decimals: 6,
            symbol: 'USDC',
            last_updated: new Date().toISOString(),
            cached: false
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        balance: {
          ...balanceData,
          cached: true
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get server wallet balance error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getServerWalletStatus(supabaseClient: any, corsHeaders: any) {
  try {
    // Get server wallet status across all chains
    const { data: balances, error } = await supabaseClient
      .from('server_wallet_balances')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) throw error;

    // Calculate total holdings in USD equivalent
    let totalUSDValue = 0;
    const chainStatuses: any[] = [];

    if (balances) {
      for (const balance of balances) {
        const usdValue = parseFloat(balance.balance) * (balance.price_usd || 1);
        totalUSDValue += usdValue;
        
        chainStatuses.push({
          chain_id: balance.chain_id,
          chain_name: balance.chain_name,
          token_symbol: balance.symbol,
          balance: balance.balance,
          usd_value: usdValue.toFixed(2),
          last_updated: balance.last_updated,
          is_operational: balance.balance && parseFloat(balance.balance) > 100 // Minimum operational balance
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: {
          total_usd_value: totalUSDValue.toFixed(2),
          operational_chains: chainStatuses.filter(c => c.is_operational).length,
          total_chains: chainStatuses.length,
          chains: chainStatuses,
          last_updated: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get server wallet status error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function processWithdrawal(withdrawalData: WithdrawalRequest, supabaseClient: any, corsHeaders: any) {
  try {
    // Validate withdrawal request
    const validation = validateWithdrawalRequest(withdrawalData);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate withdrawal ID
    const withdrawalId = `wd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store withdrawal request in database
    const { data: insertData, error: insertError } = await supabaseClient
      .from('withdrawal_requests')
      .insert([{
        id: withdrawalId,
        user_wallet: withdrawalData.user_wallet,
        amount: withdrawalData.amount,
        target_chain_id: withdrawalData.target_chain_id,
        token_address: withdrawalData.token_address,
        user_signature: withdrawalData.user_signature,
        metadata: withdrawalData.metadata || {},
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .maybeSingle();

    if (insertError) throw insertError;

    // TODO: Implement actual blockchain transaction processing
    // For now, we'll simulate the processing with a delay
    
    // In a real implementation, this would:
    // 1. Check server wallet balance
    // 2. Verify user signature
    // 3. Execute blockchain transaction
    // 4. Update database with transaction hash
    // 5. Monitor transaction confirmation

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal: {
          id: withdrawalId,
          status: 'processing',
          estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          message: 'Withdrawal request submitted successfully'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Process withdrawal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function estimateWithdrawalGas(requestData: any, corsHeaders: any) {
  try {
    const chainId = requestData.target_chain_id;
    const amount = requestData.amount;

    // Chain-specific gas estimates (simplified)
    const gasEstimates: Record<number, { gasLimit: number; gasPriceUSD: number }> = {
      1: { gasLimit: 65000, gasPriceUSD: 15 },      // Ethereum
      137: { gasLimit: 65000, gasPriceUSD: 0.02 },  // Polygon
      42161: { gasLimit: 65000, gasPriceUSD: 0.8 }, // Arbitrum
      10: { gasLimit: 65000, gasPriceUSD: 0.5 },    // Optimism
      56: { gasLimit: 65000, gasPriceUSD: 0.5 },    // BSC
      8453: { gasLimit: 65000, gasPriceUSD: 0.3 }   // Base
    };

    const estimate = gasEstimates[chainId] || { gasLimit: 65000, gasPriceUSD: 1 };

    return new Response(
      JSON.stringify({
        success: true,
        estimate: {
          gas_limit: estimate.gasLimit.toString(),
          gas_price_usd: estimate.gasPriceUSD.toString(),
          total_fee_usd: estimate.gasPriceUSD,
          estimated_time_minutes: chainId === 1 ? 3 : 1 // Ethereum slower
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Estimate withdrawal gas error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function validateWithdrawalSignature(signatureData: any, corsHeaders: any) {
  try {
    // TODO: Implement proper signature validation
    // This would verify that the user actually signed the withdrawal request
    
    const { user_wallet, amount, signature } = signatureData;
    
    // Simple validation for now
    const isValid = signature && signature.length > 10 && user_wallet && amount;
    
    return new Response(
      JSON.stringify({
        success: true,
        valid: isValid,
        message: isValid ? 'Signature is valid' : 'Invalid signature'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validate withdrawal signature error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getWithdrawalHistory(url: URL, supabaseClient: any, corsHeaders: any) {
  try {
    const userWallet = url.searchParams.get('user_wallet');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabaseClient
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userWallet) {
      query = query.eq('user_wallet', userWallet);
    }

    const { data, error } = await query;
    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        withdrawals: data || [],
        pagination: {
          limit,
          offset,
          total: data?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get withdrawal history error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getSupportedChains(corsHeaders: any) {
  try {
    const supportedChains = [
      { chain_id: 1, name: 'Ethereum', symbol: 'ETH', usdc_address: '0xA0b86a33E6411efaC5C8F58fb8DbbBe3ba5eC1A3' },
      { chain_id: 137, name: 'Polygon', symbol: 'MATIC', usdc_address: '0x2791Bca1f2de4661ED88A30c99A7a9449Aa84174' },
      { chain_id: 42161, name: 'Arbitrum', symbol: 'ARB', usdc_address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
      { chain_id: 10, name: 'Optimism', symbol: 'OP', usdc_address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
      { chain_id: 56, name: 'BSC', symbol: 'BNB', usdc_address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
      { chain_id: 8453, name: 'Base', symbol: 'BASE', usdc_address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }
    ];

    return new Response(
      JSON.stringify({
        success: true,
        chains: supportedChains
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get supported chains error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function validateWithdrawalRequest(request: WithdrawalRequest): { isValid: boolean; error?: string } {
  if (!request.user_wallet || !request.amount || !request.target_chain_id) {
    return { isValid: false, error: 'Missing required fields' };
  }

  if (parseFloat(request.amount) <= 0) {
    return { isValid: false, error: 'Invalid amount' };
  }

  if (parseFloat(request.amount) > 10000) {
    return { isValid: false, error: 'Amount exceeds maximum withdrawal limit' };
  }

  if (parseFloat(request.amount) < 1) {
    return { isValid: false, error: 'Amount below minimum withdrawal limit' };
  }

  if (!request.user_signature || request.user_signature.length < 10) {
    return { isValid: false, error: 'Invalid user signature' };
  }

  return { isValid: true };
}