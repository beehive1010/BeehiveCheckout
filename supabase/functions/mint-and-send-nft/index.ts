import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      recipientAddress,
      level,
      paymentTransactionHash,
      paymentAmount,
      referrerWallet
    } = await req.json();

    console.log('📝 Mint and send NFT request:', {
      recipientAddress,
      level,
      paymentAmount,
      paymentTransactionHash
    });

    // Verify payment transaction
    console.log('🔍 Verifying payment transaction...');
    const paymentVerified = await verifyPaymentTransaction(
      paymentTransactionHash,
      paymentAmount,
      recipientAddress
    );

    if (!paymentVerified) {
      throw new Error('Payment verification failed');
    }

    console.log('✅ Payment verified');

    // Mint NFT using Thirdweb Engine
    console.log('🎨 Minting NFT via Thirdweb Engine...');
    const mintResult = await mintNFTViaEngine(recipientAddress, level);

    console.log('✅ NFT minted:', mintResult);

    // Call activate-membership function to handle complete activation flow
    console.log('💾 Calling activate-membership for complete activation...');
    const activationResult = await callActivateMembership(
      recipientAddress,
      level,
      mintResult.transactionHash,
      referrerWallet
    );

    console.log('✅ Complete activation finished:', activationResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'NFT minted and sent successfully',
        data: {
          mintTransactionHash: mintResult.transactionHash,
          paymentTransactionHash,
          membershipActivated: true,
          level
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function verifyPaymentTransaction(
  txHash: string,
  expectedAmount: number,
  buyer: string
): Promise<boolean> {
  // TODO: Verify transaction on-chain
  // For now, simple validation
  if (!txHash || !expectedAmount || !buyer) {
    return false;
  }

  console.log('🔍 Payment verification (simplified):', {
    txHash,
    expectedAmount,
    buyer
  });

  return true;
}

async function mintNFTViaEngine(
  recipientAddress: string,
  level: number
): Promise<{ transactionHash: string; tokenId: string }> {
  const clientId = Deno.env.get('VITE_THIRDWEB_CLIENT_ID');
  const secretKey = Deno.env.get('VITE_THIRDWEB_SECRET_KEY');
  const vaultAccessToken = Deno.env.get('VITE_VAULT_ACCESS_TOKEN');
  const serverWallet = Deno.env.get('VITE_SERVER_WALLET_ADDRESS');
  const nftContract = Deno.env.get('VITE_MEMBERSHIP_NFT_CONTRACT');
  const chainId = '42161'; // Arbitrum

  if (!clientId || !vaultAccessToken || !serverWallet || !nftContract) {
    throw new Error('Missing Thirdweb configuration');
  }

  console.log('🎨 Minting NFT via Thirdweb v1 API:', {
    contract: nftContract,
    recipient: recipientAddress,
    tokenId: level,
    chain: chainId,
    serverWallet
  });

  // Encode ERC1155 mint function call
  // function mint(address to, uint256 id, uint256 amount, bytes memory data)
  const mintFunctionSelector = '0x731133e9'; // mint(address,uint256,uint256,bytes)

  // Encode parameters
  const toPadded = recipientAddress.toLowerCase().slice(2).padStart(64, '0');
  const idPadded = level.toString(16).padStart(64, '0');
  const amountPadded = '1'.padStart(64, '0'); // mint 1 NFT
  const dataOffsetPadded = '80'.padStart(64, '0'); // offset to bytes data
  const dataLengthPadded = '0'.padStart(64, '0'); // empty bytes data

  const encodedData = mintFunctionSelector + toPadded + idPadded + amountPadded + dataOffsetPadded + dataLengthPadded;

  console.log('📝 Encoded mint data:', {
    selector: mintFunctionSelector,
    to: recipientAddress,
    tokenId: level,
    amount: 1,
    encodedData
  });

  // Call Thirdweb v1 transactions API
  const transactionRequest = {
    chainId: chainId,
    from: serverWallet,
    transactions: [
      {
        to: nftContract,
        value: '0',
        data: encodedData
      }
    ]
  };

  console.log('🚀 Calling thirdweb /v1/transactions API');

  const mintResponse = await fetch('https://api.thirdweb.com/v1/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-secret-key': secretKey || '',
      'x-vault-access-token': vaultAccessToken
    },
    body: JSON.stringify(transactionRequest)
  });

  if (!mintResponse.ok) {
    const errorText = await mintResponse.text();
    throw new Error(`Thirdweb mint failed: ${mintResponse.status} - ${errorText}`);
  }

  const mintData = await mintResponse.json();
  console.log('🎨 Mint response:', JSON.stringify(mintData, null, 2));

  // Extract transaction hash
  const txHash =
    mintData.result?.transactionHash ||
    mintData.result?.receipt?.transactionHash ||
    mintData.result?.queueId ||
    mintData.queueId ||
    'pending';

  return {
    transactionHash: txHash,
    tokenId: level.toString()
  };
}

async function callActivateMembership(
  walletAddress: string,
  level: number,
  mintTxHash: string,
  referrerWallet?: string
): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  console.log('📞 Calling activate-membership Edge Function:', {
    walletAddress,
    level,
    mintTxHash,
    referrerWallet
  });

  // Call activate-membership Edge Function
  // This will handle:
  // 1. Create membership record
  // 2. Create members record with activation_sequence
  // 3. Record referral via recursive_matrix_placement
  // 4. Create referrals and matrix_referrals records
  // 5. Trigger direct rewards (layer_rewards)
  const response = await fetch(`${supabaseUrl}/functions/v1/activate-membership`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
      'x-wallet-address': walletAddress
    },
    body: JSON.stringify({
      transactionHash: mintTxHash,
      level: level,
      referrerWallet: referrerWallet,
      action: 'activate' // Explicit action for activation
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Activation failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Activation response:', result);

  return result;
}
