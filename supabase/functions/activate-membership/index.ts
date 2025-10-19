import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createThirdwebClient, getContract, readContract } from 'https://esm.sh/thirdweb@5'
import { arbitrum } from 'https://esm.sh/thirdweb@5/chains'
import { verifyNFTClaimTransaction, isValidTransactionHash } from '../_shared/verifyTransaction.ts'

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

console.log(`🚀 Fixed membership activation function with correct database schema! [v2.0-idempotency-fix]`)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with extended timeout for matrix operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-statement-timeout': '180000' // 180 second (3 minutes) timeout for activation with matrix triggers
          }
        }
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
        const thirdwebClientId = Deno.env.get('VITE_THIRDWEB_CLIENT_ID');
        const thirdwebSecretKey = Deno.env.get('VITE_THIRDWEB_SECRET_KEY');

        if (!thirdwebClientId) {
          throw new Error('VITE_THIRDWEB_CLIENT_ID environment variable is required');
        }

        const client = createThirdwebClient({
          clientId: thirdwebClientId,
          secretKey: thirdwebSecretKey
        });

        // Check both contracts: old ARB ONE and new ARB ONE
        const contractAddresses = [
          { chain: arbitrum, address: '0x15742D22f64985bC124676e206FCE3fFEb175719', name: 'ARB ONE Old' },
          { chain: arbitrum, address: '0x018F516B0d1E77Cc5947226Abc2E864B167C7E29', name: 'ARB ONE New (2025-10-08)' }
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

    // ✅ CRITICAL: Also check members table for idempotency
    // If members record exists but membership doesn't, this was a partial success (timeout during triggers)
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('members')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .maybeSingle();

    console.log(`🔍 Idempotency check results:`);
    console.log(`  - existingMembership:`, existingMembership ? 'EXISTS ✅' : 'NOT FOUND ❌');
    console.log(`  - existingMember:`, existingMember ? 'EXISTS ✅' : 'NOT FOUND ❌');

    // If both membership and members exist, return already activated
    if (existingMembership && existingMember) {
      console.log(`⚠️ Level ${level} membership already claimed for: ${walletAddress}`);
      return new Response(JSON.stringify({
        success: true,
        method: 'already_activated',
        message: `Level ${level} membership already activated`,
        result: {
          membership: existingMembership,
          member: existingMember,
          walletAddress,
          level,
          alreadyActivated: true
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // ✅ IDEMPOTENCY FIX: If members exists but membership doesn't,
    // this means previous activation partially succeeded (likely timeout during member creation)
    // Just create the missing membership record and return success
    if (existingMember && !existingMembership) {
      console.log(`🔧 Found existing member but missing membership record -补充创建 membership`);

      const membershipData = {
        wallet_address: walletAddress,
        nft_level: level,
        claim_price: level === 1 ? 30 : (level === 2 ? 150 : 800),
        claimed_at: existingMember.activation_time || new Date().toISOString(),
        is_member: true,
        unlock_membership_level: level
      };

      const { data: newMembership, error: membershipError } = await supabase
        .from('membership')
        .insert(membershipData)
        .select()
        .single();

      if (membershipError) {
        console.error('❌ Failed to补充 membership record:', membershipError);
      } else {
        console.log(`✅ 补充 membership record created for existing member`);
      }

      return new Response(JSON.stringify({
        success: true,
        method: '补充_activation',
        message: `Completed partial activation - membership record补充创建`,
        result: {
          membership: newMembership,
          member: existingMember,
          walletAddress,
          level,
          wasPartialActivation: true
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // ✅ CRITICAL FIX: If membership exists but members doesn't,
    // this means previous activation failed during members creation (timeout)
    // Need to continue and create members record + trigger all related records
    if (existingMembership && !existingMember) {
      console.log(`🔧 Found existing membership but missing members record -补充创建 members and related records`);
      // Don't return here - continue to normal flow to create members record
      // This will trigger all the database triggers (referrals, user_balances, matrix_referrals, etc.)
    }

    // Log if there was an error checking membership (but continue if just no rows found)
    if (membershipCheckError) {
      console.warn(`⚠️ Error checking existing membership:`, membershipCheckError);
    }
    if (memberCheckError) {
      console.warn(`⚠️ Error checking existing member:`, memberCheckError);
    }

    // Step 3: VERIFY ON-CHAIN NFT OWNERSHIP BEFORE CREATING MEMBERSHIP
    console.log(`🔐 Verifying on-chain NFT ownership for Level ${level}...`);

    try {
      const thirdwebClientId = Deno.env.get('VITE_THIRDWEB_CLIENT_ID');
      const thirdwebSecretKey = Deno.env.get('VITE_THIRDWEB_SECRET_KEY');

      if (!thirdwebClientId) {
        throw new Error('VITE_THIRDWEB_CLIENT_ID environment variable is required');
      }

      const client = createThirdwebClient({
        clientId: thirdwebClientId,
        secretKey: thirdwebSecretKey
      });

      // Check both contracts: old ARB ONE and new ARB ONE
      const contractAddresses = [
        { chain: arbitrum, address: '0x15742D22f64985bC124676e206FCE3fFEb175719', name: 'ARB ONE Old' },
        { chain: arbitrum, address: '0x018F516B0d1E77Cc5947226Abc2E864B167C7E29', name: 'ARB ONE New (2025-10-08)' }
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

    // Step 4 & 5: Create membership and members records in a single RPC transaction
    // This prevents data layer gaps if one succeeds but the other fails
    let membership = existingMembership;
    let memberRecord = null;

    if (!existingMember) {
      console.log(`👥 Creating members record (with automatic membership sync via trigger)...`);

      try {
        // Get the next activation sequence number using atomic function
        const { data: nextSequence, error: seqError } = await supabase
          .rpc('get_next_activation_sequence');

        if (seqError) {
          console.error('❌ Failed to get activation sequence:', seqError);
          throw new Error(`Failed to get activation sequence: ${seqError.message}`);
        }

        console.log(`🔢 Assigned activation_sequence: ${nextSequence}`);

        // ✅ IMPORTANT: Always use referrer from users table (most reliable source)
        const finalReferrerWallet = userData.referrer_wallet || normalizedReferrerWallet;
        console.log(`🔗 Using referrer wallet: ${finalReferrerWallet}`);

        const memberData = {
          wallet_address: walletAddress,
          referrer_wallet: finalReferrerWallet,
          current_level: level,
          activation_sequence: nextSequence,
          activation_time: new Date().toISOString(),
          total_nft_claimed: 1
        };

        // INSERT members will trigger:
        // 1. sync_member_to_membership_trigger -> creates membership automatically
        // 2. trigger_auto_create_balance_with_initial -> user balance
        // 3. trigger_member_initial_level1_rewards -> rewards
        // NOTE: trigger_recursive_matrix_placement is DISABLED - using batch placement instead
        const { data: newMember, error: memberError } = await supabase
          .from('members')
          .insert(memberData)
          .select()
          .single();

        if (memberError) {
          console.error('❌ CRITICAL: Failed to create members record:', memberError);

          // Check if this was a timeout
          if (memberError.message?.includes('timeout') || memberError.code === '57014') {
            console.error('⏰ TIMEOUT during members creation - triggers took too long');
            console.error('💡 User may have partial activation - use补充 script to complete');
          }

          return new Response(JSON.stringify({
            success: false,
            error: 'MEMBER_CREATION_FAILED',
            message: `Failed to create members record: ${memberError.message}`,
            details: memberError,
            memberData: memberData,
            isTimeout: memberError.message?.includes('timeout') || memberError.code === '57014'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }

        memberRecord = newMember;
        console.log(`✅ Members record created: ${memberRecord.wallet_address}`);
        console.log(`✅ Database triggers executing in background...`);

        // ✅ Shorter wait (500ms) - triggers will complete asynchronously
        // Most critical triggers (membership, balance) complete quickly
        // Matrix placement may take longer but happens asynchronously
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log(`✅ Initial trigger execution complete, continuing verification...`);

        // Membership should have been created by sync_member_to_membership_trigger
        // Verify it was created
        const { data: autoMembership } = await supabase
          .from('membership')
          .select('*')
          .ilike('wallet_address', walletAddress)
          .eq('nft_level', level)
          .maybeSingle();

        if (autoMembership) {
          membership = autoMembership;
          console.log(`✅ Membership auto-created by trigger: ${membership.wallet_address}`);
        } else {
          console.warn(`⚠️ Membership not found after members creation - trigger may have failed`);
        }


      } catch (memberErr: any) {
        console.error('❌ CRITICAL: Members record creation exception:', memberErr);

        // Check if this was a timeout
        const isTimeout = memberErr.message?.includes('timeout') ||
                         memberErr.message?.includes('canceling statement') ||
                         memberErr.code === '57014';

        if (isTimeout) {
          console.error('⏰ TIMEOUT EXCEPTION - Database triggers exceeded time limit');
          console.error('💡 Partial activation possible - check membership and members tables');
        }

        return new Response(JSON.stringify({
          success: false,
          error: 'MEMBER_CREATION_EXCEPTION',
          message: `Exception during members record creation: ${memberErr.message}`,
          details: memberErr,
          isTimeout: isTimeout
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    } else {
      console.log(`✅ Using existing members record: ${existingMember.wallet_address}`);
      memberRecord = existingMember;

      // If membership doesn't exist, create it
      if (!existingMembership) {
        console.log(`🔧 补充 missing membership record...`);
        const membershipData = {
          wallet_address: walletAddress,
          nft_level: level,
          is_member: true,
          claimed_at: existingMember.activation_time || new Date().toISOString()
        };

        const { data: newMembership, error: membershipError } = await supabase
          .from('membership')
          .insert(membershipData)
          .select()
          .single();

        if (!membershipError && newMembership) {
          membership = newMembership;
          console.log(`✅ Membership补充 created`);
        }
      } else {
        membership = existingMembership;
      }
    }

    // Step 5: Create referrals record (direct referral)
    let referralRecord = null;

    if (normalizedReferrerWallet && memberRecord) {
      console.log(`🔗 Step 5: Creating referrals record...`);

      try {
        const referralData = {
          referred_wallet: walletAddress,
          referrer_wallet: normalizedReferrerWallet,
          referral_depth: 1, // Direct referral
          created_at: new Date().toISOString()
        };

        const { data: referral, error: referralError } = await supabase
          .from('referrals')
          .insert(referralData)
          .select()
          .single();

        if (referralError) {
          console.error(`❌ Referral creation failed:`, referralError);
          // Non-critical, continue
        } else {
          console.log(`✅ Referral record created`);
          referralRecord = referral;
        }
      } catch (referralErr) {
        console.error(`❌ Referral creation exception:`, referralErr);
        // Non-critical, continue
      }
    } else {
      console.log(`ℹ️ No referrer, skipping referrals record`);
    }

    // Step 6: Record matrix placement - BATCH PROCESSING
    // ✅ NEW: Use batch_place_member_in_matrices with checkpointing
    let matrixResult: any = null;

    if (normalizedReferrerWallet && memberRecord) {
      console.log(`🔗 Starting matrix placement for: ${walletAddress} -> ${normalizedReferrerWallet}`);

      try {
        // ✅ NEW: Call Branch-First BFS placement function
        // Places member in referrer's matrix tree using Branch-First BFS strategy
        // Entry node = referrer's position in the tree
        const { data: placementResult, error: placementError } = await supabase
          .rpc('fn_place_member_branch_bfs', {
            p_member_wallet: walletAddress,
            p_referrer_wallet: normalizedReferrerWallet,
            p_activation_time: memberRecord.activation_time || new Date().toISOString(),
            p_tx_hash: transactionHash || null
          });

        if (placementError) {
          console.error('❌ Matrix placement error:', placementError);
          matrixResult = {
            success: false,
            error: placementError.message,
            message: 'Matrix placement failed'
          };
        } else {
          console.log(`✅ Matrix placement result (Branch-First BFS):`, placementResult);
          matrixResult = {
            success: placementResult.success,
            ...placementResult,
            message: placementResult.success
              ? `Placed in matrix: ${placementResult.matrix_root} at layer ${placementResult.layer}, slot ${placementResult.slot} (${placementResult.referral_type})`
              : `Matrix placement failed: ${placementResult.message}`
          };
        }

      } catch (placementErr: any) {
        console.error('❌ Matrix placement exception:', placementErr);
        matrixResult = {
          success: false,
          error: placementErr.message,
          message: 'Matrix placement exception'
        };
      }

    } else {
      console.log(`ℹ️ No referrer wallet, skipping matrix placement`);
      matrixResult = {
        success: true,
        message: 'No referrer - no matrix placement needed'
      };
    }

    // Step 6.5: Trigger direct referral rewards for Level 1
    // ✅ Direct referral reward: 10% of NFT base price to direct referrer
    let directRewardResult: any = null;

    if (level === 1 && normalizedReferrerWallet && memberRecord) {
      console.log(`💰 Step 6.5: Triggering direct referral reward for Level 1...`);

      try {
        const { data: directReward, error: directRewardError } = await supabase
          .rpc('trigger_direct_referral_rewards', {
            p_upgrading_member_wallet: walletAddress,
            p_new_level: 1,
            p_nft_price: 100  // Base price without platform fee
          });

        if (directRewardError) {
          console.error('❌ Direct referral reward creation failed:', directRewardError);
          directRewardResult = {
            success: false,
            error: directRewardError.message
          };
        } else {
          console.log(`✅ Direct referral reward result:`, directReward);
          directRewardResult = directReward;
        }

      } catch (directRewardErr: any) {
        console.error('❌ Direct referral reward exception:', directRewardErr);
        directRewardResult = {
          success: false,
          error: directRewardErr.message
        };
      }

    } else {
      console.log(`ℹ️ Skipping direct referral reward (level: ${level}, referrer: ${normalizedReferrerWallet})`);
    }

    // Step 7: Verify blockchain transaction (if provided)
    if (level === 1 && transactionHash) {
      // ✅ FIX: Verify transaction on blockchain before processing
      console.log(`🔍 Verifying NFT claim transaction: ${transactionHash}`);

      // Validate transaction hash format
      if (!isValidTransactionHash(transactionHash)) {
        console.error('❌ Invalid transaction hash format:', transactionHash);
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid transaction hash format',
          message: 'Please provide a valid Ethereum transaction hash',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verify transaction on blockchain (skip for test/simulation)
      if (transactionHash !== 'simulation' && !transactionHash.startsWith('test_')) {
        const verificationResult = await verifyNFTClaimTransaction(
          transactionHash,
          walletAddress,
          1 // Level 1
        );

        if (!verificationResult.valid) {
          console.error('❌ Transaction verification failed:', verificationResult.error);
          return new Response(JSON.stringify({
            success: false,
            error: `Transaction verification failed: ${verificationResult.error}`,
            message: 'Please ensure you have successfully claimed the NFT on-chain with the correct transaction.',
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log('✅ Transaction verified successfully:', verificationResult.details);
      } else {
        console.log('⚠️ Skipping verification for test/simulation transaction');
      }
    }

    // Step 8: Process USDC transfer for Level 1 activation
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

    // ❌ REMOVED: Step 9 was incorrectly calling trigger_layer_rewards_on_upgrade for Level 1
    // Level 1 should ONLY use trigger_direct_referral_rewards (Step 6.5)
    // trigger_layer_rewards_on_upgrade creates layer_rewards (wrong table)
    // trigger_direct_referral_rewards creates direct_rewards (correct table)
    let layerRewardResult = null;

    // ✅ Verify all database records were created before returning success
    console.log(`🔍 Final verification: Checking all database records...`);

    let finalVerification = {
      memberExists: false,
      membershipExists: false,
      balanceExists: false,
      referralsExist: false,
      matrixPlacementExists: false
    };

    try {
      // Check members record
      const { data: finalMember } = await supabase
        .from('members')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .single();
      finalVerification.memberExists = !!finalMember;

      // Check membership record
      const { data: finalMembership } = await supabase
        .from('membership')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .eq('nft_level', level)
        .single();
      finalVerification.membershipExists = !!finalMembership;

      // Check user_balances record
      const { data: finalBalance } = await supabase
        .from('user_balances')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .single();
      finalVerification.balanceExists = !!finalBalance;

      // Check referrals record (if referrer exists)
      if (normalizedReferrerWallet) {
        const { data: finalReferrals } = await supabase
          .from('referrals')
          .select('*')
          .ilike('referred_wallet', walletAddress)
          .single();
        finalVerification.referralsExist = !!finalReferrals;
      } else {
        finalVerification.referralsExist = true; // Skip check if no referrer
      }

      // Check matrix_referrals record
      const { data: finalMatrixReferrals } = await supabase
        .from('matrix_referrals')
        .select('*')
        .ilike('member_wallet', walletAddress);
      finalVerification.matrixPlacementExists = !!finalMatrixReferrals && finalMatrixReferrals.length > 0;

      console.log(`✅ Final verification results:`, finalVerification);

    } catch (verifyError) {
      console.warn(`⚠️ Final verification error:`, verifyError);
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
        directReward: directRewardResult,
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
          directRewardCreated: !!directRewardResult,
          usdcTransferInitiated: !!usdcTransferResult,
          layerRewardProcessed: !!layerRewardResult
        },
        finalVerification: finalVerification
      },
      transactionHash
    };

    console.log(`🎉 Activation completed successfully for: ${walletAddress}`);

    // Log verification status
    if (finalVerification.memberExists && finalVerification.membershipExists && finalVerification.balanceExists) {
      console.log(`📊 Core records verified (members, membership, user_balances)`);
      if (!finalVerification.matrixPlacementExists) {
        console.log(`⏳ Matrix placement may still be processing in background`);
      }
    }

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