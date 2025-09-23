import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createThirdwebClient, getContract, readContract } from 'https://esm.sh/thirdweb@5';
import { arbitrum } from 'https://esm.sh/thirdweb@5/chains';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
console.log(`🚀 Fixed membership activation function with correct database schema!`);
serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Create Supabase client
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const requestBody = await req.json().catch(()=>({}));
    const { transactionHash, level = 1, action, referrerWallet, walletAddress: bodyWalletAddress, ...data } = requestBody;
    const headerWalletAddress = req.headers.get('x-wallet-address');
    const rawWalletAddress = headerWalletAddress || bodyWalletAddress;
    // 保持钱包地址的原始大小写，不要转换为小写
    const walletAddress = rawWalletAddress;
    const normalizedReferrerWallet = referrerWallet;
    console.log(`🔍 Wallet address parsing (preserving original case):`, {
      headerWallet: headerWalletAddress,
      bodyWallet: bodyWalletAddress,
      finalWallet: walletAddress,
      referrerWallet: normalizedReferrerWallet
    });
    if (!walletAddress) {
      console.error('❌ No wallet address found in headers or body');
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address missing - please provide wallet address in x-wallet-address header or request body'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
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
        // Get contract instance - use the correct membership NFT contract
        const contract = getContract({
          client,
          chain: arbitrum,
          address: '0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8'
        });
        // Check balance using ERC-1155 balanceOf function
        const balance = await readContract({
          contract,
          method: "function balanceOf(address account, uint256 id) view returns (uint256)",
          params: [
            walletAddress,
            BigInt(targetLevel)
          ]
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
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });
      } catch (error) {
        console.error('❌ NFT ownership check failed:', error);
        return new Response(JSON.stringify({
          success: false,
          hasNFT: false,
          error: error.message,
          level: targetLevel,
          walletAddress
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });
      }
    }
    // Handle membership activation (main functionality)
    console.log(`🚀 Starting membership activation for: ${walletAddress}, Level: ${level}`);
    // Step 1: Check if user is registered (case-insensitive query)
    const { data: userData, error: userError } = await supabase.from('users').select('*').ilike('wallet_address', walletAddress).single();
    if (userError || !userData) {
      console.log(`❌ User not registered: ${walletAddress}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'User must be registered first - please complete registration before claiming NFT',
        isRegistered: false,
        isActivated: false
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    console.log(`✅ User registration confirmed: ${userData.wallet_address}`);
    // Step 2: Check if this membership level has already been claimed
    const { data: existingMembership, error: membershipCheckError } = await supabase.from('membership').select('*').ilike('wallet_address', walletAddress).eq('nft_level', level).single();
    if (existingMembership && !membershipCheckError) {
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // Step 3: Record new membership claim (use exact wallet address from database)
    const membershipData = {
      wallet_address: userData.wallet_address, // Use exact case from users table
      nft_level: level,
      claim_price: data.paymentAmount || (level === 1 ? 130 : level === 2 ? 150 : level === 3 ? 200 : 200 + (50 * (level - 3))),
      claimed_at: new Date().toISOString(),
      is_member: true,
      unlock_membership_level: level + 1, // Dynamic unlock level
      platform_activation_fee: level === 1 ? 30 : 0, // Only Level 1 has platform fee
      total_cost: data.paymentAmount || (level === 1 ? 130 : level === 2 ? 150 : level === 3 ? 200 : 200 + (50 * (level - 3)))
    };
    const { data: membership, error: membershipError } = await supabase.from('membership').insert(membershipData).select().single();
    if (membershipError) {
      console.error('❌ Failed to create membership record:', membershipError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to create membership record: ${membershipError.message}`,
        detail: membershipError
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    console.log(`✅ Membership record created successfully: ${membership.wallet_address}`);
    // Step 4: Now that membership is created, create members record
    let memberRecord = null;
    try {
      console.log(`👥 Creating members record for: ${walletAddress}`);
      // Get the next activation sequence number
      const { data: sequenceData } = await supabase.from('members').select('activation_sequence').order('activation_sequence', {
        ascending: false
      }).limit(1);
      const nextSequence = sequenceData && sequenceData.length > 0 ? (sequenceData[0].activation_sequence || 0) + 1 : 1;
      const memberData = {
        wallet_address: userData.wallet_address, // Use exact case from users table
        referrer_wallet: normalizedReferrerWallet,
        current_level: level,
        activation_sequence: nextSequence,
        activation_time: new Date().toISOString(),
        total_nft_claimed: 1
      };
      const { data: newMember, error: memberError } = await supabase.from('members').insert(memberData).select().single();
      if (memberError) {
        console.error('❌ Failed to create members record:', memberError);
        throw new Error(`Failed to create members record: ${memberError.message}`);
      } else {
        memberRecord = newMember;
        console.log(`✅ Members record created: ${memberRecord.wallet_address} with referrer: ${memberRecord.referrer_wallet}`);
      }
    } catch (memberErr) {
      console.error('❌ Members record creation error (critical):', memberErr);
      throw memberErr;
    }
    // Step 5: Record referral if referrer exists - use matrix placement function
    let referralRecord = null;
    if (normalizedReferrerWallet && normalizedReferrerWallet !== '0x0000000000000000000000000000000000000001' && memberRecord) {
      try {
        console.log(`🔗 Recording referral for: ${walletAddress} -> ${normalizedReferrerWallet}`);
        
        // First, create referrals_new record for view consistency
        const { error: referralNewError } = await supabase.from('referrals_new').insert({
          referrer_wallet: normalizedReferrerWallet,
          referred_wallet: userData.wallet_address,
          created_at: new Date().toISOString()
        });
        
        if (referralNewError && !referralNewError.message?.includes('duplicate')) {
          console.warn('⚠️ Failed to create referrals_new record:', referralNewError);
        } else {
          console.log(`✅ Referrals_new record created: ${userData.wallet_address} -> ${normalizedReferrerWallet}`);
        }
        
        // Use the matrix function to place member and create referral record
        const matrixPlacementResult = await supabase.rpc('place_new_member_in_matrix_correct', {
          p_member_wallet: userData.wallet_address, // Use exact case from users table
          p_referrer_wallet: normalizedReferrerWallet
        });
        if (matrixPlacementResult.error) {
          console.warn('⚠️ Matrix placement failed:', matrixPlacementResult.error);
        } else {
          console.log(`✅ Matrix placement completed:`, matrixPlacementResult.data);
          referralRecord = matrixPlacementResult.data;
        }
      } catch (referralErr) {
        console.warn('⚠️ Matrix placement error (non-critical):', referralErr);
      }
    }
    // Matrix placement was already done in Step 5
    let matrixResult = referralRecord;
    
    // Step 6: Create Layer 1 rewards after matrix placement is complete
    let layerRewardResult = null;
    if (referralRecord && referralRecord.success) {
      try {
        console.log(`💰 Creating Layer 1 rewards for Level 1 activation: ${walletAddress}`);
        const { data: layerReward, error: layerRewardError } = await supabase.rpc('trigger_layer_rewards_on_upgrade', {
          p_upgrading_member_wallet: userData.wallet_address,
          p_new_level: 1, // Level 1 activation triggers Layer 1 reward
          p_nft_price: 100 // Layer 1 reward is 100 USD, not 130
        });
        
        if (layerRewardError) {
          console.warn('⚠️ Layer 1 reward creation failed:', layerRewardError);
        } else {
          console.log(`✅ Layer 1 reward created:`, layerReward);
          layerRewardResult = layerReward;
        }
      } catch (layerRewardErr) {
        console.warn('⚠️ Layer 1 reward error (non-critical):', layerRewardErr);
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
        transactionHash,
        level,
        walletAddress,
        referrerWallet: normalizedReferrerWallet,
        completedSteps: {
          membershipCreated: !!membership,
          memberRecordCreated: !!memberRecord,
          referralRecorded: !!referralRecord,
          matrixPlaced: !!matrixResult,
          layerRewardCreated: !!layerRewardResult && layerRewardResult.success
        },
        layerReward: layerRewardResult
      },
      transactionHash
    };
    console.log(`🎉 Activation completed successfully for: ${walletAddress}`);
    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Activation function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: `Activation failed: ${error.message}`,
      detail: error
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
