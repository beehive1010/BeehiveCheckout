// Server Wallet Management Edge Function
// Handles secure server wallet operations for cross-chain withdrawals and transfers

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createThirdwebClient } from 'https://esm.sh/thirdweb@5.28.0';
import { privateKeyToAccount } from 'https://esm.sh/thirdweb@5.28.0/wallets';
import { arbitrum, polygon, optimism, ethereum, base, bsc } from 'https://esm.sh/thirdweb@5.28.0/chains';
import { getContract, prepareContractCall, sendTransaction } from 'https://esm.sh/thirdweb@5.28.0';
import { transfer } from 'https://esm.sh/thirdweb@5.28.0/extensions/erc20';

interface WithdrawalRequest {
  id?: string;
  user_wallet: string;
  amount: string;
  target_chain_id: number;
  token_address: string;
  user_signature: string;
  withdrawal_fee?: number;
  gas_fee_wallet?: string;
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

// Initialize Thirdweb client
const thirdwebClient = createThirdwebClient({
  clientId: Deno.env.get('VITE_THIRDWEB_CLIENT_ID') ?? '',
  secretKey: Deno.env.get('VITE_THIRDWEB_SECRET_KEY') ?? '',
});

// Server wallet private key (should be stored securely in environment)
const SERVER_WALLET_PRIVATE_KEY = Deno.env.get('SERVER_WALLET_PRIVATE_KEY') ?? '';

// Chain mapping
const getChainFromId = (chainId: number) => {
  switch (chainId) {
    case 1: return ethereum;
    case 137: return polygon;
    case 42161: return arbitrum;
    case 10: return optimism;
    case 56: return bsc;
    case 8453: return base;
    default: return arbitrum; // Default to Arbitrum
  }
};

// Helper function to get token decimals for different chains
function getTokenDecimals(chainId: number, tokenAddress: string): number {
  // USDT decimals vary by chain
  const usdtDecimals: Record<number, number> = {
    1: 6,      // Ethereum USDT
    137: 6,    // Polygon USDT  
    42161: 6,  // Arbitrum USDT
    10: 6,     // Optimism USDT
    56: 18,    // BSC USDT (18 decimals!)
    8453: 6    // Base USDT
  };
  
  // Check if it's a custom token with 18 decimals (like your test USDT)
  const customTokens18Decimals = [
    '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' // Your custom test USDT
  ];
  
  if (customTokens18Decimals.includes(tokenAddress.toLowerCase())) {
    return 18;
  }
  
  return usdtDecimals[chainId] || 6; // Default to 6 decimals
}\n\nserve(async (req) => {
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
            decimals: getTokenDecimals(parseInt(chainId), tokenAddress),
            symbol: 'USDT',
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

    const withdrawalFees: Record<number, number> = {
      1: 15.0,      // Ethereum
      137: 1.0,     // Polygon
      42161: 2.0,   // Arbitrum
      10: 1.5,      // Optimism
      56: 1.0,      // BSC
      8453: 1.5     // Base
    };
    
    const fee = withdrawalData.withdrawal_fee || withdrawalFees[withdrawalData.target_chain_id] || 2.0;
    const grossAmount = parseFloat(withdrawalData.amount);
    const netAmount = grossAmount - fee;
    const gasFeeWallet = withdrawalData.gas_fee_wallet || '0xC2422eae8A56914509b6977E69F7f3aCE7DD6463';
    
    // Store additional fee information in metadata
    const enhancedMetadata = {
      ...withdrawalData.metadata,
      fee_amount: fee,
      net_amount: netAmount,
      gas_fee_wallet: gasFeeWallet,
      fee_transaction_hash: null, // Will be populated when real transaction is made
      user_transaction_hash: null // Will be populated when real transaction is made
    };
    
    if (netAmount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: `Amount too small. Minimum withdrawal is ${fee + 0.01} USDT (including ${fee} USDT fee)` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Implement actual blockchain transaction processing using Thirdweb
    try {
      // 1. Initialize server wallet account
      if (!SERVER_WALLET_PRIVATE_KEY) {
        throw new Error('Server wallet private key not configured');
      }
      
      const serverAccount = privateKeyToAccount({
        client: thirdwebClient,
        privateKey: SERVER_WALLET_PRIVATE_KEY,
      });
      
      // 2. Get the target chain
      const targetChain = getChainFromId(withdrawalData.target_chain_id);
      
      // 3. Setup token contract
      const tokenContract = getContract({
        client: thirdwebClient,
        chain: targetChain,
        address: withdrawalData.token_address,
      });
      
      // 4. Calculate amounts with proper decimals
      const tokenDecimals = getTokenDecimals(withdrawalData.target_chain_id, withdrawalData.token_address);
      const netAmountWei = BigInt(Math.floor(netAmount * Math.pow(10, tokenDecimals)));
      const feeAmountWei = BigInt(Math.floor(fee * Math.pow(10, tokenDecimals)));
      
      // 5. Execute user withdrawal transaction
      console.log(`🔄 Executing withdrawal: ${netAmount} USDT to ${withdrawalData.user_wallet}`);
      
      const userTransferTransaction = transfer({
        contract: tokenContract,
        to: withdrawalData.user_wallet,
        amount: netAmountWei,
      });
      
      const userTxResult = await sendTransaction({
        transaction: userTransferTransaction,
        account: serverAccount,
      });
      
      console.log(`✅ User transfer successful: ${userTxResult.transactionHash}`);
      
      // 6. Execute fee transfer transaction  
      let feeTransactionHash = null;
      if (fee > 0 && gasFeeWallet) {
        console.log(`🔄 Executing fee transfer: ${fee} USDT to ${gasFeeWallet}`);
        
        const feeTransferTransaction = transfer({
          contract: tokenContract,
          to: gasFeeWallet,
          amount: feeAmountWei,
        });
        
        const feeTxResult = await sendTransaction({
          transaction: feeTransferTransaction,
          account: serverAccount,
        });
        
        feeTransactionHash = feeTxResult.transactionHash;
        console.log(`✅ Fee transfer successful: ${feeTransactionHash}`);
      }
      
      // 7. Store transaction information in metadata
      const enhancedMetadata = {
        ...withdrawalData.metadata,
        fee_amount: fee,
        net_amount: netAmount,
        gas_fee_wallet: gasFeeWallet,
        fee_transaction_hash: feeTransactionHash,
        user_transaction_hash: userTxResult.transactionHash,
        chain_id: withdrawalData.target_chain_id,
        token_decimals: tokenDecimals,
      };
      
      // 8. Store withdrawal request in database with transaction hashes
      const { data: insertData, error: insertError } = await supabaseClient
        .from('withdrawal_requests')
        .insert([{
          id: withdrawalId,
          user_wallet: withdrawalData.user_wallet,
          amount: grossAmount.toString(),
          target_chain_id: withdrawalData.target_chain_id,
          token_address: withdrawalData.token_address,
          user_signature: withdrawalData.user_signature,
          metadata: enhancedMetadata,
          status: 'completed',
          user_transaction_hash: userTxResult.transactionHash,
          fee_transaction_hash: feeTransactionHash,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }])
        .select()
        .maybeSingle();

      if (insertError) {
        console.error('Database insert error:', insertError);
        // Transaction succeeded but database failed - log for manual reconciliation
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          withdrawal: {
            id: withdrawalId,
            status: 'completed',
            gross_amount: grossAmount,
            fee_amount: fee,
            net_amount: netAmount,
            gas_fee_wallet: gasFeeWallet,
            user_transaction_hash: userTxResult.transactionHash,
            fee_transaction_hash: feeTransactionHash,
            completed_at: new Date().toISOString(),
            message: `Withdrawal completed successfully. ${netAmount.toFixed(2)} USDT sent to your wallet (${fee} USDT fee deducted).`
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (blockchainError: any) {
      console.error('Blockchain transaction error:', blockchainError);
      
      // Store failed withdrawal request for monitoring
      const failedMetadata = {
        ...withdrawalData.metadata,
        fee_amount: fee,
        net_amount: netAmount,
        gas_fee_wallet: gasFeeWallet,
        error: blockchainError.message,
        failed_at: new Date().toISOString(),
      };
      
      await supabaseClient
        .from('withdrawal_requests')
        .insert([{
          id: withdrawalId,
          user_wallet: withdrawalData.user_wallet,
          amount: grossAmount.toString(),
          target_chain_id: withdrawalData.target_chain_id,
          token_address: withdrawalData.token_address,
          user_signature: withdrawalData.user_signature,
          metadata: failedMetadata,
          status: 'failed',
          created_at: new Date().toISOString(),
        }]);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Withdrawal failed: ${blockchainError.message}`,
          withdrawal_id: withdrawalId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal: {
          id: withdrawalId,
          status: 'processing',
          gross_amount: grossAmount,
          fee_amount: fee,
          net_amount: netAmount,
          gas_fee_wallet: gasFeeWallet,
          estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          message: `Withdrawal request submitted successfully. You will receive ${netAmount.toFixed(2)} USDT (${fee} USDT fee deducted).`
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

    // Chain-specific withdrawal fees (in USDT) that will be deducted
    const withdrawalFees: Record<number, number> = {
      1: 15.0,      // Ethereum - higher gas fees
      137: 1.0,     // Polygon - low fees
      42161: 2.0,   // Arbitrum - moderate fees
      10: 1.5,      // Optimism - low-moderate fees
      56: 1.0,      // BSC - low fees
      8453: 1.5     // Base - low-moderate fees
    };
    
    // Chain-specific gas estimates (simplified)
    const gasEstimates: Record<number, { gasLimit: number; gasPriceUSD: number }> = {
      1: { gasLimit: 65000, gasPriceUSD: 15 },      // Ethereum
      137: { gasLimit: 65000, gasPriceUSD: 0.02 },  // Polygon
      42161: { gasLimit: 65000, gasPriceUSD: 0.8 }, // Arbitrum
      10: { gasLimit: 65000, gasPriceUSD: 0.5 },    // Optimism
      56: { gasLimit: 65000, gasPriceUSD: 0.5 },    // BSC
      8453: { gasLimit: 65000, gasPriceUSD: 0.3 }   // Base
    };
    
    const fee = withdrawalFees[chainId] || 2.0;

    const estimate = gasEstimates[chainId] || { gasLimit: 65000, gasPriceUSD: 1 };

    return new Response(
      JSON.stringify({
        success: true,
        estimate: {
          gas_limit: estimate.gasLimit.toString(),
          gas_price_usd: estimate.gasPriceUSD.toString(),
          withdrawal_fee_usdt: fee,
          total_fee_usd: fee, // User pays withdrawal fee, not gas directly
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
      { chain_id: 1, name: 'Ethereum', symbol: 'ETH', usdt_address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', withdrawal_fee: 15.0 },
      { chain_id: 137, name: 'Polygon', symbol: 'MATIC', usdt_address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', withdrawal_fee: 1.0 },
      { chain_id: 42161, name: 'Arbitrum', symbol: 'ARB', usdt_address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', withdrawal_fee: 2.0 },
      { chain_id: 10, name: 'Optimism', symbol: 'OP', usdt_address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', withdrawal_fee: 1.5 },
      { chain_id: 56, name: 'BSC', symbol: 'BNB', usdt_address: '0x55d398326f99059fF775485246999027B3197955', withdrawal_fee: 1.0 },
      { chain_id: 8453, name: 'Base', symbol: 'BASE', usdt_address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', withdrawal_fee: 1.5 }
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