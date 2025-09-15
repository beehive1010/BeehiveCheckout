import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createThirdwebClient, getContract, readContract } from 'https://esm.sh/thirdweb@5'
import { arbitrumSepolia } from 'https://esm.sh/thirdweb@5/chains'

// Correct database interface definition
interface MemberInfo {
  wallet_address: string;
  activation_sequence?: number;
  current_level: number;
  has_pending_rewards: boolean;
  levels_owned: any[];
  referrer_wallet?: string;
  activation_time: string;
  updated_at: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log(`🚀 Fixed membership activation function started successfully!`)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
      }
    )

    const requestBody = await req.json().catch(() => ({}))
    const { transactionHash, level = 1, action, referrerWallet, walletAddress: bodyWalletAddress, ...data } = requestBody
    const headerWalletAddress = req.headers.get('x-wallet-address')
    const walletAddress = headerWalletAddress || bodyWalletAddress
    
    console.log(`🔍 Wallet address parsing:`, {
      headerWallet: headerWalletAddress,
      bodyWallet: bodyWalletAddress,
      finalWallet: walletAddress,
      headers: Array.from(req.headers.entries())
    })

    if (!walletAddress) {
      console.error('❌ No wallet address found in headers or body')
      throw new Error('Wallet address missing')
    }

    // Handle NFT ownership check action
    if (action === 'check-nft-ownership') {
      const targetLevel = level || 1;
      console.log(`🔍 Checking NFT ownership for ${walletAddress}, Level: ${targetLevel}`);

      try {
        // Create Thirdweb client
        const thirdwebClientId = Deno.env.get('THIRDWEB_CLIENT_ID');
        const thirdwebSecretKey = Deno.env.get('THIRDWEB_SECRET_KEY');

        if (!thirdwebClientId) {
          throw new Error('THIRDWEB_CLIENT_ID environment variable is required');
        }

        const client = createThirdwebClient({
          clientId: thirdwebClientId,
          secretKey: thirdwebSecretKey // Optional for read operations
        });

        // Get contract instance
        const contract = getContract({
          client,
          chain: arbitrumSepolia,
          address: '0x99265477249389469929CEA07c4a337af9e12cdA'
        });

        // Check balance using ERC-1155 balanceOf function
        const balance = await readContract({
          contract,
          method: "function balanceOf(address account, uint256 id) view returns (uint256)",
          params: [walletAddress, BigInt(targetLevel)]
        });

        const hasNFT = Number(balance) > 0;

        console.log(`📊 NFT ownership check result: Level ${targetLevel} balance = ${balance.toString()}, hasNFT = ${hasNFT}`);

        return new Response(JSON.stringify({
          success: true,
          hasNFT,
          balance: balance.toString(),
          level: targetLevel,
          walletAddress
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });

      } catch (error) {
        console.error('❌ NFT ownership check failed:', error);
        return new Response(JSON.stringify({
          success: false,
          hasNFT: false,
          error: (error as Error).message,
          level: targetLevel,
          walletAddress
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
    }

    // Handle member info query action
    if (action === 'get-member-info') {
      console.log(`🔍 Getting member info for: ${walletAddress}`);
      
      // First check if user is registered in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .single();

      if (userError || !userData) {
        console.log(`❌ User not registered: ${walletAddress}`);
        return new Response(JSON.stringify({
          success: false,
          error: 'User not registered - please complete registration first',
          member: null,
          isRegistered: false,
          isActivated: false
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }

      // Check if they have claimed membership NFT (should be recorded in membership table first)
      const { data: membershipData, error: membershipError } = await supabase
        .from('membership')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .eq('nft_level', 1) // Level 1 NFT claim
        .single();

      if (membershipError) {
        console.log(`⏳ User registered but no Level 1 NFT claimed yet: ${walletAddress}`);
        return new Response(JSON.stringify({
          success: true,
          error: 'Level 1 NFT not claimed - please claim Level 1 NFT to activate membership',
          member: null,
          membership: null,
          isRegistered: true,
          isActivated: false,
          user: userData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }

      // Then check members table (should exist after membership NFT claim)
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .single();

      if (memberError) {
        console.log(`🔧 Membership NFT claimed but member record missing: ${walletAddress}`);
        return new Response(JSON.stringify({
          success: false,
          error: 'Data inconsistency - membership claimed but member record missing',
          member: null,
          membership: membershipData,
          isRegistered: true,
          isActivated: false,
          user: userData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }

      // Consistent activation check - require level > 0 (like Dashboard and auth service)
      // Use the same logic as the auth service to prevent redirect loops
      const hasValidLevel = memberData?.current_level > 0;
      const hasActivationFlag = memberData?.is_active === true || memberData?.is_activated === true;
      const isReallyActivated = hasValidLevel;

      console.log(`🔍 Detailed member activation check:`, {
        wallet: walletAddress,
        current_level: memberData?.current_level,
        is_active: memberData?.is_active,
        is_activated: memberData?.is_activated,
        hasValidLevel,
        hasActivationFlag,
        finalResult: isReallyActivated,
        memberRecord: memberData
      });

      console.log(`✅ User is activated member: ${walletAddress}, Level: ${memberData?.current_level}`);
      return new Response(JSON.stringify({
        success: true,
        member: memberData,
        membership: membershipData,
        isRegistered: true,
        isActivated: isReallyActivated,
        currentLevel: memberData?.current_level || 0,
        user: userData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Special case: checking existing NFT rather than verifying new transaction
    const isCheckingExisting = transactionHash === 'check_existing';

    if (!transactionHash || (!isCheckingExisting && !transactionHash)) {
      throw new Error('NFT claim transaction hash missing, unable to verify')
    }

    console.log(`🔐 Secure membership activation: ${walletAddress}, transaction: ${transactionHash}`);

    // First check if user already owns on-chain NFT
    const existingNFTCheck = await checkExistingNFTAndSync(supabase, walletAddress, level, referrerWallet);
    if (existingNFTCheck.hasNFT) {
      console.log(`✅ User already owns Level ${level} NFT, returning existing record`);
      return new Response(JSON.stringify(existingNFTCheck), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // If checking existing NFT request and no NFT on chain, check database membership
    if (isCheckingExisting) {
      // Check if user has membership in database even without on-chain NFT
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .single();

      if (!memberError && memberData && memberData.current_level > 0) {
        console.log(`✅ User has database membership Level ${memberData.current_level}, even without on-chain NFT`);
        return new Response(JSON.stringify({
          success: true,
          hasNFT: true,
          member: memberData,
          message: 'Membership found in database'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      return new Response(JSON.stringify({
        success: false,
        hasNFT: false,
        message: 'No NFT detected on chain and no database membership'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Use the new unified NFT Level 1 activation function
    const result = await activateNftLevel1Membership(supabase, walletAddress, transactionHash, level, referrerWallet);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Membership activation error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// Use new unified NFT Level 1 activation function
async function activateNftLevel1Membership(supabase, walletAddress, transactionHash, level, referrerWallet) {
  console.log(`🔒 Starting NFT Level 1 activation process: ${walletAddress}`);

  try {
    // 0. CRITICAL: Check if user is registered first
    console.log(`🔍 Checking if user is registered: ${walletAddress}`);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_address, username, email')
      .ilike('wallet_address', walletAddress)
      .single();

    if (userError || !userData) {
      console.error(`❌ User not registered: ${walletAddress}`, userError);
      throw new Error(`User must be registered first. Please complete user registration before activating membership.`);
    }

    console.log(`✅ User registration verified: ${walletAddress}`);

    // 1. Check if already an activated member
    const { data: existingMember } = await supabase
      .from('members')
      .select('wallet_address, current_level, activation_sequence')
      .ilike('wallet_address', walletAddress)
      .single();

    if (existingMember && existingMember.current_level > 0) {
      return {
        success: true,
        action: 'already_activated',
        member: existingMember,
        message: 'Membership already activated'
      };
    }

    // 2. Verify NFT claim transaction (if not demo transaction)
    if (!transactionHash.startsWith('demo_') && transactionHash !== 'check_existing') {
      console.log(`🔍 Verifying blockchain transaction: ${transactionHash}`);

      const isValidTransaction = await verifyNFTClaimTransaction(transactionHash, walletAddress, level);
      if (!isValidTransaction) {
        throw new Error('Blockchain transaction verification failed - transaction invalid or unconfirmed');
      }
      console.log(`✅ Blockchain transaction verification successful: ${transactionHash}`);
    } else {
      console.log(`🎮 Demo or check mode, skipping blockchain verification: ${transactionHash}`);
    }

    // 2.5. Use referrer from parameters or default
    const finalReferrerWallet = referrerWallet || '0x0000000000000000000000000000000000000001';
    console.log(`📝 Using referrer wallet: ${finalReferrerWallet}`);

    // 3. Call unified database activation function
    console.log(`🔄 Calling database activation function: activate_nft_level1_membership`);

    const { data: activationResult, error: activationError } = await supabase.rpc(
      'activate_nft_level1_membership',
      {
        p_wallet_address: walletAddress,
        p_referrer_wallet: finalReferrerWallet,
        p_transaction_hash: transactionHash
      }
    );

    if (activationError) {
      console.error('❌ Database activation function call failed:', activationError);
      throw new Error(`Activation failed: ${activationError.message}`);
    }

    if (!activationResult || !activationResult.success) {
      const errorMessage = activationResult?.message || 'Unknown activation error';
      console.error('❌ Activation function returned failure:', errorMessage);
      throw new Error(`Activation failed: ${errorMessage}`);
    }

    console.log(`✅ NFT Level 1 activation successful:`, activationResult);

    return {
      success: true,
      action: 'activated',
      member: activationResult.member_data,
      transactionHash: transactionHash,
      level: level,
      message: `Level ${level} membership activation successful`,
      activationDetails: {
        membershipCreated: activationResult.membership_created,
        platformFeeAdded: activationResult.platform_fee_added,
        rewardTriggered: activationResult.reward_triggered,
        referralCreated: activationResult.referral_created
      }
    };

  } catch (error) {
    console.error('NFT Level 1 activation error:', error);
    throw new Error(`Activation failed: ${(error as Error).message}`);
  }
}

// Blockchain verification function for NFT claim transactions
async function verifyNFTClaimTransaction(transactionHash: string, walletAddress: string, expectedLevel: number) {
  console.log(`🔗 Starting transaction verification: ${transactionHash}`);

  const ARBITRUM_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
  const NFT_CONTRACT = '0x99265477249389469929CEA07c4a337af9e12cdA';
  const EXPECTED_TOKEN_ID = expectedLevel;

  try {
    // 1. Get transaction receipt
    const receiptResponse = await fetch(ARBITRUM_SEPOLIA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [transactionHash],
        id: 1
      })
    });

    const receiptData = await receiptResponse.json();
    const receipt = receiptData.result;

    if (!receipt) {
      console.log('⏳ Transaction not yet confirmed, waiting for confirmation');
      return false;
    }

    if (receipt.status !== '0x1') {
      console.log('❌ Transaction failed');
      return false;
    }

    console.log(`📋 Transaction confirmed successfully, gas used: ${receipt.gasUsed}`);

    // 2. Verify transaction is initiated from correct wallet address
    if (receipt.from?.toLowerCase() !== walletAddress.toLowerCase()) {
      console.log(`❌ Transaction sender mismatch: ${receipt.from} vs ${walletAddress}`);
      return false;
    }

    // 3. Verify transaction is sent to NFT contract
    if (receipt.to?.toLowerCase() !== NFT_CONTRACT.toLowerCase()) {
      console.log(`❌ Transaction recipient mismatch: ${receipt.to} vs ${NFT_CONTRACT}`);
      return false;
    }

    // 4. Verify transaction logs contain NFT mint event
    const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

    let nftMintFound = false;
    for (const log of receipt.logs) {
      if (log.address?.toLowerCase() === NFT_CONTRACT.toLowerCase() &&
          log.topics[0] === transferEventSignature) {

        const fromAddress = log.topics[1];
        const toAddress = log.topics[2];
        const tokenId = parseInt(log.topics[3], 16);

        const zeroAddress = '0x0000000000000000000000000000000000000000000000000000000000000000';

        if (fromAddress === zeroAddress &&
            toAddress.toLowerCase().includes(walletAddress.slice(2).toLowerCase()) &&
            tokenId === EXPECTED_TOKEN_ID) {

          console.log(`✅ NFT mint event verified successfully: Token ID ${tokenId} minted to ${walletAddress}`);
          nftMintFound = true;
          break;
        }
      }
    }

    if (!nftMintFound) {
      console.log('❌ Correct NFT mint event not found');
      return false;
    }

    // 5. Ensure transaction has sufficient confirmations
    const currentBlockResponse = await fetch(ARBITRUM_SEPOLIA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 2
      })
    });

    const currentBlockData = await currentBlockResponse.json();
    const currentBlock = parseInt(currentBlockData.result, 16);
    const transactionBlock = parseInt(receipt.blockNumber, 16);
    const confirmations = currentBlock - transactionBlock;

    console.log(`📊 Transaction confirmations: ${confirmations}`);

    if (confirmations < 3) {
      console.log(`⏳ Waiting for more confirmations: ${confirmations}/3`);
      return false;
    }

    console.log(`✅ Blockchain verification completed: Transaction valid and sufficiently confirmed`);
    return true;

  } catch (error) {
    console.error('Blockchain verification error:', error);
    return false;
  }
}

// Check if user already owns on-chain NFT, sync data if NFT exists but database record is missing
async function checkExistingNFTAndSync(supabase, walletAddress: string, level: number, referrerWallet?: string) {
  console.log(`🔍 Checking if user ${walletAddress} already owns Level ${level} NFT`);

  try {
    // CRITICAL: First check if user is registered
    console.log(`🔍 Checking if user is registered before NFT sync: ${walletAddress}`);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_address, username, email')
      .ilike('wallet_address', walletAddress)
      .single();

    if (userError || !userData) {
      console.error(`❌ Cannot sync NFT - user not registered: ${walletAddress}`, userError);
      return {
        hasNFT: false,
        error: 'User must be registered before NFT synchronization can occur. Please complete user registration first.'
      };
    }

    console.log(`✅ User registration verified for NFT sync: ${walletAddress}`);

    // 1. Use Thirdweb to check on-chain NFT balance
    const NFT_CONTRACT_ADDRESS = '0x99265477249389469929CEA07c4a337af9e12cdA';
    const TOKEN_ID = level;

    console.log(`🔍 Using Thirdweb to check NFT balance for ${walletAddress}, Token ID: ${TOKEN_ID}`);

    try {
      // Create Thirdweb client
      const thirdwebClientId = Deno.env.get('THIRDWEB_CLIENT_ID');
      const thirdwebSecretKey = Deno.env.get('THIRDWEB_SECRET_KEY');

      if (!thirdwebClientId) {
        throw new Error('THIRDWEB_CLIENT_ID environment variable is required');
      }

      const client = createThirdwebClient({
        clientId: thirdwebClientId,
        secretKey: thirdwebSecretKey // Optional for read operations
      });

      // Get contract instance
      const contract = getContract({
        client,
        chain: arbitrumSepolia,
        address: NFT_CONTRACT_ADDRESS
      });

      // Check balance using ERC-1155 balanceOf function
      const balance = await readContract({
        contract,
        method: "function balanceOf(address account, uint256 id) view returns (uint256)",
        params: [walletAddress, BigInt(TOKEN_ID)]
      });

      console.log(`📊 Thirdweb NFT balance check: Token ID ${TOKEN_ID} = ${balance.toString()}`);

      const balanceNum = Number(balance);

      if (balanceNum === 0) {
        console.log(`❌ User does not own Level ${level} NFT on-chain`);
        return { hasNFT: false };
      }

      console.log(`✅ User owns Level ${level} NFT on-chain (balance: ${balanceNum})`);

    } catch (thirdwebError) {
      const error = thirdwebError as Error;
      console.error(`❌ Thirdweb NFT check failed:`, error);
      // Fallback to false if Thirdweb fails
      return {
        hasNFT: false,
        error: `On-chain verification failed: ${error.message || 'Unknown error'}`
      };
    }

    // 2. Check if corresponding member record already exists in database
    const { data: existingMember } = await supabase
      .from('members')
      .select('wallet_address, current_level, activation_sequence')
      .ilike('wallet_address', walletAddress)
      .single();

    if (existingMember && existingMember.current_level > 0) {
      console.log(`✅ Database members record exists and is activated, but need to check complete activation records`);

      // Check if complete membership and referrals records exist
      const { data: membershipRecord } = await supabase
        .from('membership')
        .select('id')
        .ilike('wallet_address', walletAddress)
        .single();

      const { data: referralRecord } = await supabase
        .from('referrals')
        .select('id')
        .eq('member_wallet', walletAddress)
        .single();

      if (membershipRecord && referralRecord) {
        console.log(`✅ Complete activation records already exist`);
        return {
          success: true,
          hasNFT: true,
          action: 'already_synced',
          member: existingMember,
          message: `Level ${level} membership already activated (verified on-chain)`
        };
      } else {
        console.log(`🔧 Members record exists but missing membership/referrals records, need to complete activation process`);
        // Continue with complete sync process to create missing records
      }
    }

    // 3. If NFT exists on-chain but database lacks complete activation records, supplement records
    console.log(`🔧 NFT exists on-chain but missing complete activation records, starting sync...`);

    // userData already verified at the beginning of this function
    console.log(`✅ User data already verified for sync: ${userData.wallet_address}`);

    // If members record doesn't exist, create it first
    if (!existingMember) {
      console.log(`📝 Creating members record...`);
      const currentTime = new Date().toISOString();
      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert({
          wallet_address: walletAddress,
          current_level: level,
          levels_owned: [level], // FIXED: Single level array, no duplicates
          has_pending_rewards: false,
          referrer_wallet: referrerWallet || '0x0000000000000000000000000000000000000001',
          activation_sequence: 1,
          activation_time: currentTime,
          updated_at: currentTime
        })
        .select()
        .single();

      if (memberError) {
        console.error('Failed to sync member record:', memberError);
        throw new Error(`Failed to sync member record: ${memberError.message}`);
      }
      console.log(`✅ New members record created successfully`);
    }

    // Use complete activation function to create missing membership and referrals records
    console.log(`🚀 Calling complete activation function to supplement missing records...`);
    const { data: activationResult, error: activationError } = await supabase.rpc(
      'activate_nft_level1_membership',
      {
        p_wallet_address: walletAddress,
        p_referrer_wallet: referrerWallet || '0x0000000000000000000000000000000000000001',
        p_transaction_hash: `chain_sync_${Date.now()}`
      }
    );

    if (activationError) {
      console.error('❌ Complete activation sync failed:', activationError);
      throw new Error(`Activation sync failed: ${activationError.message}`);
    }

    if (!activationResult || !activationResult.success) {
      const errorMessage = activationResult?.message || 'Activation sync returned failure';
      console.error('❌ Activation sync function returned failure:', errorMessage);
      throw new Error(`Activation sync failed: ${errorMessage}`);
    }

    console.log(`✅ On-chain NFT complete data sync finished: ${walletAddress} -> Level ${level}`);

    // Get latest members record
    const { data: updatedMember } = await supabase
      .from('members')
      .select('wallet_address, current_level, activation_sequence')
      .ilike('wallet_address', walletAddress)
      .single();

    return {
      success: true,
      hasNFT: true,
      action: 'synced_from_chain',
      member: updatedMember,
      level: level,
      message: `Level ${level} membership synced (based on on-chain NFT and complete activation process)`,
      activationDetails: {
        membershipCreated: activationResult.membership_created,
        platformFeeAdded: activationResult.platform_fee_added,
        rewardTriggered: activationResult.reward_triggered,
        referralCreated: activationResult.referral_created
      }
    };
  } catch (error) {
    console.error('Check on-chain NFT error:', error);
    return { hasNFT: false, error: (error as Error).message };
  }
}