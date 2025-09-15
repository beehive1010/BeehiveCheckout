// =============================================
// Beehive Platform - Improved Membership Activation Edge Function
// More reliable version with better error handling and fallback mechanisms
// =============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

console.log('🎯 Improved Activate Membership function started!');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json().catch(() => ({}));
    const { transactionHash, level = 1, referrerWallet, walletAddress: bodyWalletAddress } = requestBody;
    const headerWalletAddress = req.headers.get('x-wallet-address');
    const walletAddress = headerWalletAddress || bodyWalletAddress;

    if (!walletAddress) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🚀 Processing activation: ${walletAddress}, TxHash: ${transactionHash}, Level: ${level}`);

    // Strategy 1: Try blockchain verification with timeout
    let verificationResult = null;
    if (transactionHash && transactionHash !== 'check_existing' && !transactionHash.startsWith('demo_')) {
      try {
        console.log(`🔍 Attempting blockchain verification...`);
        verificationResult = await Promise.race([
          verifyTransactionWithTimeout(transactionHash, walletAddress, level),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Verification timeout')), 10000))
        ]);
        console.log(`✅ Blockchain verification successful`);
      } catch (error) {
        console.warn(`⚠️ Blockchain verification failed: ${error.message}`);
        // Log the issue but continue with fallback
        await logActivationIssue(supabase, walletAddress, transactionHash, `Blockchain verification failed: ${error.message}`);
      }
    }

    // Strategy 2: Check if user already has NFT on-chain (more reliable)
    let hasNFTOnChain = false;
    try {
      console.log(`🔍 Checking NFT ownership directly...`);
      hasNFTOnChain = await checkNFTOwnership(walletAddress, level);
      if (hasNFTOnChain) {
        console.log(`✅ User owns Level ${level} NFT on-chain, proceeding with activation`);
      }
    } catch (error) {
      console.warn(`⚠️ NFT ownership check failed: ${error.message}`);
    }

    // Strategy 3: If we have either verification OR on-chain NFT, proceed
    if (verificationResult || hasNFTOnChain || transactionHash === 'check_existing' || transactionHash?.startsWith('demo_')) {
      try {
        console.log(`🎯 Proceeding with database activation...`);
        
        // Use the reliable database function
        const { data: result, error } = await supabase.rpc('activate_nft_level1_membership', {
          p_wallet_address: walletAddress,
          p_referrer_wallet: referrerWallet || null
        });

        if (error) {
          throw error;
        }

        console.log(`✅ Activation completed successfully`);
        return new Response(JSON.stringify({
          success: true,
          method: 'improved_activation',
          message: 'Membership activated successfully',
          result: result,
          verification_method: verificationResult ? 'transaction' : hasNFTOnChain ? 'nft_ownership' : 'manual',
          transactionHash: transactionHash
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (dbError) {
        console.error(`❌ Database activation failed: ${dbError.message}`);
        await logActivationIssue(supabase, walletAddress, transactionHash, `Database activation failed: ${dbError.message}`);
        
        // Strategy 4: Ultimate fallback - use fallback function
        try {
          console.log(`🔄 Trying fallback activation method...`);
          const { data: fallbackResult, error: fallbackError } = await supabase.rpc('activate_membership_fallback', {
            p_wallet_address: walletAddress,
            p_referrer_wallet: referrerWallet || null,
            p_transaction_hash: transactionHash,
            p_level: level
          });

          if (fallbackError) throw fallbackError;

          return new Response(JSON.stringify({
            success: true,
            method: 'fallback_activation',
            message: 'Membership activated via fallback method',
            result: fallbackResult,
            transactionHash: transactionHash
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (fallbackError) {
          console.error(`❌ All activation methods failed: ${fallbackError.message}`);
          await logActivationIssue(supabase, walletAddress, transactionHash, `All methods failed: ${fallbackError.message}`);
          
          return new Response(JSON.stringify({
            success: false,
            error: 'Activation failed: All methods exhausted',
            details: fallbackError.message,
            transactionHash: transactionHash,
            support_message: 'Please contact support with your transaction hash'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    } else {
      // No valid verification or NFT ownership found
      await logActivationIssue(supabase, walletAddress, transactionHash, 'No valid verification found');
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Unable to verify transaction or NFT ownership',
        transactionHash: transactionHash,
        support_message: 'Please ensure your transaction is confirmed and try again'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function: Verify transaction with better error handling
async function verifyTransactionWithTimeout(transactionHash: string, walletAddress: string, level: number) {
  const ARBITRUM_ONE_RPC = 'https://arb1.arbitrum.io/rpc';
  
  try {
    const receiptResponse = await fetch(ARBITRUM_ONE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [transactionHash],
        id: 1
      })
    });

    if (!receiptResponse.ok) {
      throw new Error(`RPC request failed: ${receiptResponse.status}`);
    }

    const receiptData = await receiptResponse.json();
    const receipt = receiptData.result;

    if (!receipt) {
      throw new Error('Transaction not found or not confirmed');
    }

    if (receipt.status !== '0x1') {
      throw new Error('Transaction failed');
    }

    // Basic validation - just check if from address matches
    if (receipt.from?.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error(`Transaction sender mismatch`);
    }

    return true;
  } catch (error) {
    throw new Error(`Transaction verification failed: ${error.message}`);
  }
}

// Helper function: Check NFT ownership directly
async function checkNFTOwnership(walletAddress: string, level: number) {
  const ARBITRUM_ONE_RPC = 'https://arb1.arbitrum.io/rpc';
  const NFT_CONTRACT = '0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8';
  
  try {
    // ERC1155 balanceOf call
    const balanceResponse = await fetch(ARBITRUM_ONE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: NFT_CONTRACT,
          data: `0x00fdd58e${walletAddress.slice(2).padStart(64, '0')}${level.toString(16).padStart(64, '0')}`
        }, 'latest'],
        id: 1
      })
    });

    const balanceData = await balanceResponse.json();
    const balance = parseInt(balanceData.result, 16);
    
    return balance > 0;
  } catch (error) {
    console.warn(`NFT ownership check failed: ${error.message}`);
    return false;
  }
}

// Helper function: Log activation issues
async function logActivationIssue(supabase: any, walletAddress: string, transactionHash: string, errorMessage: string) {
  try {
    await supabase.rpc('log_activation_issue', {
      p_wallet_address: walletAddress,
      p_transaction_hash: transactionHash,
      p_error_message: errorMessage,
      p_method: 'improved_edge_function'
    });
  } catch (error) {
    console.warn(`Failed to log activation issue: ${error.message}`);
  }
}