import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createThirdwebClient, getContract, readContract } from 'https://esm.sh/thirdweb@5'
import { arbitrum } from 'https://esm.sh/thirdweb@5/chains'

// Correct database interface definition matching the actual database schema
interface MemberInfo {
  wallet_address: string;
  referrer_wallet?: string;
  current_level: number;
  activation_sequence?: number;
  activation_time?: string;
  total_nft_claimed?: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log(`🚀 Fixed membership activation function with correct database schema!`)

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
    const rawWalletAddress = headerWalletAddress || bodyWalletAddress

    // 保持钱包地址的原始大小写，不要转换为小写
    const walletAddress = rawWalletAddress
    // referrerWallet 会在获取用户数据后设置，这里先保存前端传递的值
    let normalizedReferrerWallet = referrerWallet

    console.log(`🔍 Request details:`, {
      action,
      level,
      headerWallet: headerWalletAddress,
      bodyWallet: bodyWalletAddress,
      finalWallet: walletAddress,
      referrerWallet: normalizedReferrerWallet,
      requestBody
    })

    if (!walletAddress) {
      console.error('❌ No wallet address found in headers or body')
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address missing - please provide wallet address in x-wallet-address header or request body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Handle activation status check action (lightweight, no blockchain verification)
    if (action === 'check-activation-status') {
      console.log(`🔍 Checking activation status for ${walletAddress}`);

      try {
        // Check if user is registered
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .ilike('wallet_address', walletAddress)
          .single();

        if (userError || !userData) {
          return new Response(JSON.stringify({
            success: true,
            isActivated: false,
            hasNFT: false,
            member: null,
            message: 'User not registered'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        }

        // Check member data
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .ilike('wallet_address', walletAddress)
          .single();

        if (memberError || !memberData) {
          return new Response(JSON.stringify({
            success: true,
            isActivated: false,
            hasNFT: false,
            member: null,
            message: 'No membership found'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        }

        const isActivated = memberData.is_activated && memberData.current_level > 0;

        return new Response(JSON.stringify({
          success: true,
          isActivated,
          hasNFT: isActivated, // If activated in DB, assume NFT exists
          member: memberData,
          message: isActivated ? 'Member activated' : 'Member not activated'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });

      } catch (error) {
        console.error('❌ Activation status check failed:', error);
        return new Response(JSON.stringify({
          success: true,
          isActivated: false,
          hasNFT: false,
          member: null,
          error: (error as Error).message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
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
          secretKey: thirdwebSecretKey
        });

        // Check both contracts: old ARB ONE and new ARB ONE
        const contractAddresses = [
          { chain: arbitrum, address: '0x15742D22f64985bC124676e206FCE3fFEb175719', name: 'ARB ONE Old' },
          { chain: arbitrum, address: '0xe57332db0B8d7e6aF8a260a4fEcfA53104728693', name: 'ARB ONE New' }
        ];

        let hasNFT = false;
        let totalBalance = BigInt(0);
        let contractFound = '';

        // Check each contract
        for (const contractInfo of contractAddresses) {
          try {
            const contract = getContract({
              client,
              chain: contractInfo.chain,
              address: contractInfo.address
            });

            const balance = await readContract({
              contract,
              method: "function balanceOf(address account, uint256 id) view returns (uint256)",
              params: [walletAddress, BigInt(targetLevel)]
            });

            if (Number(balance) > 0) {
              hasNFT = true;
              totalBalance = balance;
              contractFound = contractInfo.name;
              console.log(`✅ Found NFT on ${contractInfo.name}: Level ${targetLevel} balance = ${balance.toString()}`);
              break; // Found NFT, no need to check further
            } else {
              console.log(`❌ No NFT on ${contractInfo.name} for Level ${targetLevel}`);
            }
          } catch (error) {
            console.error(`⚠️ Error checking ${contractInfo.name}:`, error);
            // Continue to next contract
          }
        }

        console.log(`📊 NFT ownership check result: hasNFT = ${hasNFT}, contract = ${contractFound}, balance = ${totalBalance.toString()}`);

        return new Response(JSON.stringify({
          success: true,
          hasNFT,
          balance: totalBalance.toString(),
          contractFound,
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

    // Handle membership activation (main functionality)
    console.log(`🚀 Starting membership activation for: ${walletAddress}, Level: ${level}`);

    // Step 1: Check if user is registered (case-insensitive query)
    // 🔧 STRICT CHECK: User MUST be registered before claiming NFT
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .single();

    if (userError || !userData) {
      console.error(`❌ User not registered: ${walletAddress}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'REGISTRATION_REQUIRED',
        message: 'User must complete registration before claiming NFT',
        isRegistered: false,
        isActivated: false,
        requiresRegistration: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log(`✅ User registration confirmed: ${userData.wallet_address}`);

    // 如果前端没有传递referrerWallet，从用户数据中获取
    if (!normalizedReferrerWallet && userData.referrer_wallet) {
      normalizedReferrerWallet = userData.referrer_wallet;
      console.log(`🔗 Using referrer from user data: ${normalizedReferrerWallet}`);
    }

    // Step 2: Check if this membership level has already been claimed
    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from('membership')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .eq('nft_level', level)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no rows found

    // If membership exists, return already activated
    if (existingMembership) {
      console.log(`⚠️ Level ${level} membership already claimed for: ${walletAddress}`);
      return new Response(JSON.stringify({
        success: true,
        method: 'already_activated',
        message: `Level ${level} membership already activated`,
        result: {
          membership: existingMembership,
          walletAddress,
          level,
          alreadyActivated: true
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Log if there was an error checking membership (but continue if just no rows found)
    if (membershipCheckError) {
      console.warn(`⚠️ Error checking existing membership:`, membershipCheckError);
    }

    // Step 3: VERIFY ON-CHAIN NFT OWNERSHIP BEFORE CREATING MEMBERSHIP
    console.log(`🔐 Verifying on-chain NFT ownership for Level ${level}...`);

    try {
      const thirdwebClientId = Deno.env.get('THIRDWEB_CLIENT_ID');
      const thirdwebSecretKey = Deno.env.get('THIRDWEB_SECRET_KEY');

      if (!thirdwebClientId) {
        throw new Error('THIRDWEB_CLIENT_ID environment variable is required');
      }

      const client = createThirdwebClient({
        clientId: thirdwebClientId,
        secretKey: thirdwebSecretKey
      });

      // Check both contracts: old ARB ONE and new ARB ONE
      const contractAddresses = [
        { chain: arbitrum, address: '0x15742D22f64985bC124676e206FCE3fFEb175719', name: 'ARB ONE Old' },
        { chain: arbitrum, address: '0xe57332db0B8d7e6aF8a260a4fEcfA53104728693', name: 'ARB ONE New' }
      ];

      let hasNFT = false;
      let totalBalance = BigInt(0);
      let contractFound = '';

      // Check each contract
      for (const contractInfo of contractAddresses) {
        try {
          const contract = getContract({
            client,
            chain: contractInfo.chain,
            address: contractInfo.address
          });

          const balance = await readContract({
            contract,
            method: "function balanceOf(address account, uint256 id) view returns (uint256)",
            params: [walletAddress, BigInt(level)]
          });

          if (Number(balance) > 0) {
            hasNFT = true;
            totalBalance = balance;
            contractFound = contractInfo.name;
            console.log(`✅ Found NFT on ${contractInfo.name}: Level ${level} balance = ${balance.toString()}`);
            break; // Found NFT, no need to check further
          } else {
            console.log(`❌ No NFT on ${contractInfo.name} for Level ${level}`);
          }
        } catch (error) {
          console.error(`⚠️ Error checking ${contractInfo.name}:`, error);
          // Continue to next contract
        }
      }

      if (!hasNFT) {
        console.error(`❌ NFT ownership verification failed: User does not own Level ${level} NFT on any supported chain`);
        return new Response(JSON.stringify({
          success: false,
          error: 'NFT_OWNERSHIP_REQUIRED',
          message: `You must own a Level ${level} membership NFT on-chain before activation`,
          hasNFT: false,
          balance: totalBalance.toString(),
          level,
          walletAddress
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        });
      }

      console.log(`✅ NFT ownership verified on ${contractFound}: Level ${level} balance = ${totalBalance.toString()}`);

    } catch (error) {
      console.error('❌ NFT ownership verification error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'NFT_VERIFICATION_FAILED',
        message: `Failed to verify NFT ownership: ${(error as Error).message}`,
        details: (error as Error).message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    // Step 4: Record new membership claim (only after NFT ownership is verified)
    // membership table has: id, wallet_address, nft_level, claim_price, claimed_at, is_member, unlock_membership_level
    const membershipData = {
      wallet_address: walletAddress, // 保持原始大小写
      nft_level: level,
      is_member: true,
      claimed_at: new Date().toISOString()
    };

    const { data: membership, error: membershipError } = await supabase
      .from('membership')
      .insert(membershipData)
      .select()
      .single();

    if (membershipError) {
      console.error('❌ Failed to create membership record:', membershipError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to create membership record: ${membershipError.message}`,
        detail: membershipError
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    console.log(`✅ Membership record created successfully: ${membership.wallet_address}`);

    // Step 4: Now that membership is created, create members record
    let memberRecord = null;
    try {
      console.log(`👥 Creating members record for: ${walletAddress}`);

      // Get the next activation sequence number using atomic function
      const { data: nextSequence, error: seqError } = await supabase
        .rpc('get_next_activation_sequence');

      if (seqError) {
        console.error('❌ Failed to get activation sequence:', seqError);
        throw new Error(`Failed to get activation sequence: ${seqError.message}`);
      }

      console.log(`🔢 Assigned activation_sequence: ${nextSequence}`);

      const memberData = {
        wallet_address: walletAddress,
        referrer_wallet: normalizedReferrerWallet,
        current_level: level,
        activation_sequence: nextSequence,
        activation_time: new Date().toISOString(),
        total_nft_claimed: 1
      };

      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert(memberData)
        .select()
        .single();

      if (memberError) {
        console.warn('⚠️ Failed to create members record:', memberError);
      } else {
        memberRecord = newMember;
        console.log(`✅ Members record created: ${memberRecord.wallet_address}`);
      }
    } catch (memberErr) {
      console.warn('⚠️ Members record creation error (non-critical):', memberErr);
    }

    // Step 5: Record referral if referrer exists - use matrix placement function
    // 🔧 FIX: Allow default referrer (0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242) for matrix placement
    let referralRecord = null;
    if (normalizedReferrerWallet && memberRecord) {
      try {
        console.log(`🔗 Recording referral for: ${walletAddress} -> ${normalizedReferrerWallet}`);

        // Use the recursive matrix placement function to place member in all upline matrices
        const matrixPlacementResult = await supabase.rpc(
          'recursive_matrix_placement',
          {
            p_member_wallet: walletAddress,
            p_referrer_wallet: normalizedReferrerWallet
          }
        );

        if (matrixPlacementResult.error) {
          console.warn('⚠️ Matrix placement failed:', matrixPlacementResult.error);
        } else {
          console.log(`✅ Matrix placement completed:`, matrixPlacementResult.data);
          referralRecord = matrixPlacementResult.data;
        }
      } catch (referralErr) {
        console.warn('⚠️ Matrix placement error (non-critical):', referralErr);
      }
    } else {
      console.warn(`⚠️ Skipping matrix placement: referrer=${normalizedReferrerWallet}, memberRecord=${!!memberRecord}`);
    }

    // Matrix placement was already done in Step 5
    let matrixResult = referralRecord;

    // Step 6: Process USDC transfer for Level 1 activation
    let usdcTransferResult = null;
    if (level === 1 && transactionHash) {
      try {
        console.log(`💰 Processing USDC transfer for Level 1 activation...`);
        console.log(`🎯 NFT Claim transaction: ${transactionHash}`);

        // Call the USDC transfer function
        const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY');

        const usdcTransferResponse = await fetch(
          `${supabaseUrl}/functions/v1/nft-claim-usdc-transfer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              token_id: '1',
              claimer_address: walletAddress,
              transaction_hash: transactionHash,
            }),
          }
        );

        if (usdcTransferResponse.ok) {
          usdcTransferResult = await usdcTransferResponse.json();
          console.log(`✅ USDC transfer initiated:`, usdcTransferResult);
        } else {
          const errorText = await usdcTransferResponse.text();
          console.warn(`⚠️ USDC transfer failed: ${errorText}`);
        }

      } catch (usdcTransferErr) {
        console.warn('⚠️ USDC transfer error (non-critical):', usdcTransferErr);
      }
    }

    // Step 7: Process layer reward for Level 1 activation (direct referral to upline)
    let layerRewardResult = null;
    if (level === 1 && normalizedReferrerWallet && normalizedReferrerWallet !== '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab') {
      try {
        console.log(`💰 Processing layer reward for Level 1 activation...`);
        console.log(`🎯 Reward will be sent to referrer: ${normalizedReferrerWallet}`);
        console.log(`🎯 Reward amount: 100 USDC (Level 1 NFT base price)`);

        // Level 1 activation triggers layer_reward (direct referral)
        const { data: rewardData, error: rewardError } = await supabase.rpc('trigger_layer_rewards_on_upgrade', {
          p_upgrading_member_wallet: walletAddress,
          p_new_level: level,
          p_nft_price: 100 // Level 1 NFT base price without platform fee
        });

        if (rewardError) {
          console.warn('⚠️ Layer reward creation failed:', rewardError);
        } else {
          console.log(`✅ Layer reward triggered for Level 1 activation:`, rewardData);
          layerRewardResult = rewardData;
        }

        // Verify layer reward was created
        const { data: createdRewards, error: checkError } = await supabase
          .from('layer_rewards')
          .select('id, reward_recipient_wallet, reward_amount, status, matrix_layer, recipient_required_level')
          .ilike('triggering_member_wallet', walletAddress)
          .eq('triggering_nft_level', level);

        if (!checkError && createdRewards && createdRewards.length > 0) {
          console.log(`✅ Verified ${createdRewards.length} layer reward(s) created for Level 1:`,
            createdRewards.map(r => `${r.reward_recipient_wallet}: ${r.reward_amount} USDC (${r.status}, Layer ${r.matrix_layer}, Required Level ${r.recipient_required_level})`));
        }

      } catch (layerRewardErr) {
        console.warn('⚠️ Layer reward error (non-critical):', layerRewardErr);
      }
    }

    // Return success response
    const responseData = {
      success: true,
      method: 'complete_activation',
      message: `Level ${level} membership activation completed with all related records`,
      result: {
        membership: membership,
        member: memberRecord,
        referral: referralRecord,
        matrixPlacement: matrixResult,
        usdcTransfer: usdcTransferResult,
        layerReward: layerRewardResult,
        transactionHash,
        level,
        walletAddress,
        referrerWallet: normalizedReferrerWallet,
        completedSteps: {
          membershipCreated: !!membership,
          memberRecordCreated: !!memberRecord,
          referralRecorded: !!referralRecord,
          matrixPlaced: !!matrixResult,
          usdcTransferInitiated: !!usdcTransferResult,
          layerRewardProcessed: !!layerRewardResult
        }
      },
      transactionHash
    };

    console.log(`🎉 Activation completed successfully for: ${walletAddress}`);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Activation function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: `Activation failed: ${(error as Error).message}`,
      detail: error
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})