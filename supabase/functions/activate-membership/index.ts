import {serve} from "https://deno.land/std@0.168.0/http/server.ts";
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {createThirdwebClient, getContract, readContract} from 'https://esm.sh/thirdweb@5';
import {arbitrum} from 'https://esm.sh/thirdweb@5/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
console.log(`🚀 Fixed membership activation function with correct database schema!`);
serve(async (req: Request) => {
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
    let normalizedReferrerWallet = referrerWallet;
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
    
    // 🚨 CRITICAL: 验证level参数必须有效且 >= 1
    if (!level || level < 1 || level > 5) {
      console.error(`🚨 CRITICAL: 无效的membership level: ${level}`);
      return new Response(JSON.stringify({
        success: false,
        error: `无效的membership level: ${level}. 有效范围: 1-5`,
        detail: { receivedLevel: level, validRange: '1-5' }
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Step 1: CRITICAL - 严格用户注册检查
    console.log(`🔍 STRICT user registration check for: ${walletAddress}`);
    
    // 双重验证：先检查钱包地址格式
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.error(`❌ Invalid wallet address format: ${walletAddress}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid wallet address format',
        isRegistered: false,
        isActivated: false,
        requiredAction: 'valid_wallet_address'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    // 严格的用户注册查询 - 使用精确匹配和case-insensitive
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_address, referrer_wallet, username, created_at')
      .ilike('wallet_address', walletAddress)
      .single();
    
    // 严格验证：用户必须存在且有完整数据
    if (userError || !userData || !userData.wallet_address) {
      console.error(`🚨 CRITICAL: User registration failed - user not found in database:`, {
        wallet: walletAddress,
        error: userError?.message,
        errorCode: userError?.code,
        userFound: !!userData,
        userData: userData
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: 'REGISTRATION REQUIRED: User not found in database. Please complete registration first.',
        isRegistered: false,
        isActivated: false,
        requiredAction: 'registration',
        message: 'You must register your account with a valid referrer before claiming NFTs',
        debug: {
          wallet: walletAddress,
          errorType: userError?.code || 'USER_NOT_FOUND',
          checksPassed: {
            walletFormat: true,
            userExists: false
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    // 验证用户数据完整性
    if (!userData.username) {
      console.error(`🚨 CRITICAL: User data incomplete - missing username:`, userData);
      return new Response(JSON.stringify({
        success: false,
        error: 'INCOMPLETE REGISTRATION: User profile incomplete. Please complete registration.',
        isRegistered: false,
        isActivated: false,
        requiredAction: 'complete_registration'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    console.log(`✅ User registration confirmed: ${userData.wallet_address}`);
    // Step 2: Check if this membership level has already been claimed
    const { data: existingMembership, error: membershipCheckError } = await supabase.from('membership').select('*').ilike('wallet_address', walletAddress).eq('nft_level', level).single();
    if (existingMembership && !membershipCheckError) {
      console.log(`✅ Found existing Level ${level} membership for: ${walletAddress}`);
      
      // 🔧 CRITICAL FIX: 不要直接返回，继续检查是否缺少members记录
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('members')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .maybeSingle();
      
      if (existingMember && !memberCheckError) {
        console.log(`✅ Complete activation found: both membership and members records exist`);
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
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });
      } else {
        console.log(`🔧 INCOMPLETE ACTIVATION DETECTED: has membership but missing members record`);
        console.log(`📝 Will create missing members record for: ${walletAddress}`);
        
        // 🔧 CRITICAL FIX: 对于不完整激活，使用数据库中存储的referrer
        if (!normalizedReferrerWallet) {
          normalizedReferrerWallet = userData.referrer_wallet;
          console.log(`🔧 Using stored referrer for incomplete activation: ${normalizedReferrerWallet}`);
        }
        
        // 继续执行，不返回，让函数补充缺失的members记录
      }
    }
    
    // Step 3: Handle membership record (create new or use existing)
    let membership;
    if (existingMembership) {
      console.log(`✅ Using existing membership record for Level ${level}`);
      membership = existingMembership;
    } else {
      console.log(`📝 Creating new membership record for Level ${level}`);
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
      const { data: newMembership, error: membershipError } = await supabase.from('membership').insert(membershipData).select().single();
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
      membership = newMembership;
      console.log(`✅ New membership record created successfully: ${membership.wallet_address}`);
    }
    
    // Step 4: FIRST create referrals_new record (权威推荐关系) - 必须在members记录之前
    let referralRecord = null;
    if (normalizedReferrerWallet && normalizedReferrerWallet !== '0x0000000000000000000000000000000000000001') {
      try {
        console.log(`🔗 Creating referrals_new record FIRST: ${userData.wallet_address} -> ${normalizedReferrerWallet}`);
        
        // Create referrals_new record for view consistency (权威来源)
        const { error: referralNewError } = await supabase.from('referrals_new').insert({
          referrer_wallet: normalizedReferrerWallet,
          referred_wallet: userData.wallet_address,
          created_at: new Date().toISOString()
        });
        
        if (referralNewError && !referralNewError.message?.includes('duplicate')) {
          console.warn('⚠️ Failed to create referrals_new record:', referralNewError);
        } else {
          console.log(`✅ Referrals_new record created FIRST: ${userData.wallet_address} -> ${normalizedReferrerWallet}`);
        }
      } catch (referralErr) {
        console.warn('⚠️ Referrals_new creation error (non-critical):', referralErr);
      }
    }
    
    // Step 5: Now create members record (after referrals_new exists)
    let memberRecord = null;
    try {
      console.log(`👥 Creating members record AFTER referrals_new: ${walletAddress}`);
      
      // Validate referrer exists in users table (not members table - referrer might not be activated yet)
      if (normalizedReferrerWallet && normalizedReferrerWallet !== '0x0000000000000000000000000000000000000001') {
        const { data: referrerExists, error: referrerCheckError } = await supabase
          .from('users')
          .select('wallet_address, username')
          .ilike('wallet_address', normalizedReferrerWallet)
          .maybeSingle();
          
        if (referrerCheckError || !referrerExists) {
          console.warn(`⚠️ Referrer ${normalizedReferrerWallet} not found in users table, proceeding without referrer`);
          normalizedReferrerWallet = null;
        } else {
          console.log(`✅ Referrer validation passed: ${referrerExists.wallet_address} (registered user: ${referrerExists.username})`);
        }
      }
      
      // Get the next activation sequence number (with concurrent safety)
      // Use a database function for atomic sequence generation
      const { data: sequenceResult, error: sequenceError } = await supabase.rpc('get_next_activation_sequence');
      
      let nextSequence;
      if (sequenceError) {
        console.warn('⚠️ Failed to get sequence from RPC, falling back to query method');
        const { data: sequenceData } = await supabase.from('members').select('activation_sequence').order('activation_sequence', {
          ascending: false
        }).limit(1);
        nextSequence = sequenceData && sequenceData.length > 0 ? (sequenceData[0].activation_sequence || 0) + 1 : 1;
      } else {
        nextSequence = sequenceResult || 1;
      }
      
      // 🚨 CRITICAL: 强制referrer验证 - members创建必须有referrer (除了root用户)
      if (nextSequence > 1 && !normalizedReferrerWallet) {
        console.log(`🔧 Attempting to find referrer for sequence ${nextSequence} user: ${userData.wallet_address}`);
        
        // 第一优先级：从用户注册数据中获取referrer
        if (userData.referrer_wallet && userData.referrer_wallet !== '0x0000000000000000000000000000000000000001') {
          normalizedReferrerWallet = userData.referrer_wallet;
          console.log(`✅ Using stored referrer from users table: ${normalizedReferrerWallet}`);
        } else {
          // 第二优先级：检查referrals_new记录
          console.log(`🔍 Checking referrals_new for backup referrer...`);
          const { data: referralData, error: referralError } = await supabase
            .from('referrals_new')
            .select('referrer_wallet')
            .eq('referred_wallet', userData.wallet_address)
            .maybeSingle();
          
          if (!referralError && referralData && referralData.referrer_wallet) {
            normalizedReferrerWallet = referralData.referrer_wallet;
            console.log(`✅ Using referrer from referrals_new: ${normalizedReferrerWallet}`);
          } else {
            // 无法找到任何有效referrer - 严格拒绝
            console.error(`🚨 CRITICAL: NO VALID REFERRER FOUND!`, {
              wallet: userData.wallet_address,
              sequence: nextSequence,
              usersTableReferrer: userData.referrer_wallet,
              referralsNewCheck: referralError ? 'ERROR' : 'NOT_FOUND'
            });
            
            throw new Error(`REFERRER REQUIRED: Cannot create member record without valid referrer. Wallet: ${userData.wallet_address}, Sequence: ${nextSequence}. All users after the first must have a referrer.`);
          }
        }
      }
      
      // 📝 Log final referrer validation result
      console.log(`📋 Referrer validation result:`, {
        wallet: userData.wallet_address,
        sequence: nextSequence,
        finalReferrer: normalizedReferrerWallet,
        isRootUser: nextSequence === 1
      });
      
      // 验证referrer确实存在
      if (normalizedReferrerWallet) {
        const { data: referrerExists, error: referrerCheckError } = await supabase
          .from('users')
          .select('wallet_address')
          .ilike('wallet_address', normalizedReferrerWallet)
          .single();
          
        if (referrerCheckError || !referrerExists) {
          console.error(`🚨 CRITICAL: Referrer验证失败! Referrer: ${normalizedReferrerWallet}`);
          throw new Error(`Referrer ${normalizedReferrerWallet} 不是已注册用户，无法创建member`);
        }
        
        console.log(`✅ Referrer验证通过: ${referrerExists.wallet_address}`);
      }
      
      // 🚨 CRITICAL: 验证level必须 >= 1，绝不能创建Level 0的members
      if (!level || level < 1) {
        console.error(`🚨 CRITICAL: 尝试创建Level ${level}的member! Level必须 >= 1`);
        throw new Error(`无效的membership level: ${level}. Members记录要求level >= 1`);
      }
      
      const memberData = {
        wallet_address: userData.wallet_address, // Use exact case from users table
        referrer_wallet: normalizedReferrerWallet, // Validated referrer
        current_level: level, // 已验证 >= 1
        activation_sequence: nextSequence,
        activation_time: new Date().toISOString(),
        total_nft_claimed: 1
      };
      
      console.log(`📝 Inserting member record with data:`, {
        wallet_address: memberData.wallet_address,
        referrer_wallet: memberData.referrer_wallet,
        current_level: memberData.current_level,
        activation_sequence: memberData.activation_sequence
      });
      
      // 先检查members记录是否已经存在
      const { data: existingMember, error: existingError } = await supabase
        .from('members')
        .select('*')
        .ilike('wallet_address', userData.wallet_address)
        .maybeSingle();

      if (existingMember) {
        console.log(`✅ Members record already exists: ${existingMember.wallet_address} with referrer: ${existingMember.referrer_wallet}`);
        memberRecord = existingMember;
        
        // 验证现有记录的数据是否一致
        if (normalizedReferrerWallet && existingMember.referrer_wallet !== normalizedReferrerWallet) {
          console.warn(`⚠️ Existing member referrer (${existingMember.referrer_wallet}) differs from expected (${normalizedReferrerWallet})`);
        }
        
        if (existingMember.current_level !== level) {
          console.log(`🔄 Updating member level from ${existingMember.current_level} to ${level}`);
          const { data: updatedMember, error: updateError } = await supabase
            .from('members')
            .update({ current_level: level })
            .eq('wallet_address', userData.wallet_address)
            .select()
            .single();
          
          if (updateError) {
            console.error('❌ Failed to update member level:', updateError);
          } else {
            memberRecord = updatedMember;
            console.log(`✅ Member level updated successfully`);
          }
        }
      } else {
        // 🔧 INTEGRATED FIX: 直接创建members记录，使用内置的fix逻辑
        console.log(`🔧 Creating members record with integrated fix logic`);
        
        try {
          console.log(`📝 Creating members record with fixed spillover logic`);
          
          // 直接创建members记录，触发器会自动调用修复后的spillover函数
          const { data: newMember, error: memberError } = await supabase.from('members').insert(memberData).select().single();
          
          if (memberError) {
            console.error('❌ Failed to create members record:', memberError);
            throw new Error(`Failed to create members record: ${memberError.message}`);
          } else {
            memberRecord = newMember;
            console.log(`✅ Members record created successfully: ${memberRecord.wallet_address} with referrer: ${memberRecord.referrer_wallet}`);
            
            // 验证referrer是否正确保存
            if (normalizedReferrerWallet && !memberRecord.referrer_wallet) {
              console.error(`🚨 CRITICAL: Referrer lost during member creation! Expected: ${normalizedReferrerWallet}, Got: ${memberRecord.referrer_wallet}`);
            }
          }
        } catch (memberCreateError) {
          console.error('❌ Member creation failed:', memberCreateError);
          throw memberCreateError;
        }
      }
    } catch (memberErr) {
      console.error('❌ Members record creation error (critical):', memberErr);
      throw memberErr;
    }
    
    // Step 6: Advanced matrix placement AFTER members record is safely created
    if (normalizedReferrerWallet && normalizedReferrerWallet !== '0x0000000000000000000000000000000000000001' && memberRecord) {
      try {
        console.log(`📐 Starting ADVANCED matrix placement (separate from members creation): ${walletAddress} -> ${normalizedReferrerWallet}`);
        
        // 🔧 NEW: Use our improved matrix placement function
        const advancedPlacementResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/matrix-fix`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'place_member_advanced',
            memberWallet: userData.wallet_address,
            referrerWallet: normalizedReferrerWallet
          })
        });
        
        const advancedPlacementResult = await advancedPlacementResponse.json();
        
        if (advancedPlacementResult.success) {
          console.log(`✅ ADVANCED matrix placement succeeded:`, advancedPlacementResult.placement);
          referralRecord = advancedPlacementResult.placement;
        } else {
          console.warn('⚠️ ADVANCED matrix placement failed, but members record is SAFE:', advancedPlacementResult.error);
          // 重要：矩阵安置失败不影响会员激活，用户依然可以正常使用
        }
      } catch (matrixErr) {
        console.warn('⚠️ Advanced matrix placement error (non-critical, members record is SAFE):', matrixErr);
        // 矩阵安置失败不影响会员激活状态
      }
    }
    // Matrix placement was already done in Step 6
    let matrixResult = referralRecord;
    
    // Step 7: Trigger BCC release for Level activation
    let bccReleaseResult = null;
    try {
      console.log(`🔓 Unlocking BCC for Level ${level} activation...`);
      const bccResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bcc-release-system`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          action: 'process_level_unlock',
          walletAddress: userData.wallet_address,
          targetLevel: level
        })
      });
      
      if (bccResponse.ok) {
        bccReleaseResult = await bccResponse.json();
        console.log(`✅ BCC release completed:`, bccReleaseResult);
      } else {
        console.warn(`⚠️ BCC release failed with status ${bccResponse.status}`);
        const errorText = await bccResponse.text();
        console.warn(`BCC release error:`, errorText);
      }
    } catch (bccError) {
      console.warn('⚠️ BCC release error (non-critical):', bccError);
    }
    
    // Step 8: Create Layer 1 rewards ONLY after member record is confirmed to exist
    let layerRewardResult = null;
    if (memberRecord && memberRecord.wallet_address) {
      try {
        console.log(`💰 Creating Layer 1 rewards for Level 1 activation: ${walletAddress}`);
        console.log(`🔍 Verified member exists before triggering rewards: ${memberRecord.wallet_address}`);
        
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

      // Step 8.1: Check and update pending rewards that may now be claimable after Level 1 activation
      console.log(`🎁 Checking pending rewards after Level 1 activation for ${walletAddress}...`);
      try {
        const { data: pendingRewardCheck, error: pendingRewardError } = await supabase.rpc('check_pending_rewards_after_upgrade', {
          p_upgraded_wallet: walletAddress,
          p_new_level: level
        });

        if (pendingRewardError) {
          console.warn('⚠️ Pending reward check failed:', pendingRewardError);
        } else {
          console.log(`✅ Pending reward check completed for Level ${level} activation:`, pendingRewardCheck);
        }
      } catch (pendingRewardErr) {
        console.warn('⚠️ Pending reward check error (non-critical):', pendingRewardErr);
      }
    }

    // Step 8.2: Check and compensate for missing layer rewards (trigger补偿逻辑)
    console.log(`🔍 Checking if layer rewards were triggered for ${walletAddress} Level ${level}...`);
    try {
      // Check if layer reward exists for this activation
      const { data: existingLayerReward, error: checkError } = await supabase
        .from('layer_rewards')
        .select('id, status, reward_amount')
        .eq('triggering_member_wallet', userData.wallet_address)
        .eq('matrix_layer', level)
        .maybeSingle();

      if (checkError) {
        console.warn('⚠️ Layer reward check query failed:', checkError);
      } else if (!existingLayerReward) {
        console.log(`❌ Missing layer reward detected, compensating with manual trigger...`);
        
        // Calculate correct NFT price for all levels (1-19)
        const getNftPrice = (lvl) => {
          const prices = {
            1: 100, 2: 150, 3: 200, 4: 250, 5: 300, 6: 350, 7: 400, 8: 450, 9: 500,
            10: 550, 11: 600, 12: 650, 13: 700, 14: 750, 15: 800, 16: 850, 17: 900, 18: 950, 19: 1000
          };
          return prices[lvl] || (lvl <= 19 ? 100 + (lvl - 1) * 50 : 0);
        };
        
        // Manually trigger the layer reward creation
        const { data: compensationResult, error: compensationError } = await supabase.rpc('trigger_layer_rewards_on_upgrade', {
          p_upgrading_member_wallet: userData.wallet_address,
          p_new_level: level,
          p_nft_price: getNftPrice(level)
        });

        if (compensationError) {
          console.warn('⚠️ Layer reward compensation failed:', compensationError);
        } else {
          console.log(`✅ Layer reward compensation successful:`, compensationResult);
          // Update the layerRewardResult for response
          if (compensationResult && compensationResult.success) {
            layerRewardResult = compensationResult;
          }
        }
      } else {
        console.log(`✅ Layer reward already exists: ${existingLayerReward.id} (${existingLayerReward.status}, ${existingLayerReward.reward_amount})`);
      }
    } catch (compensationErr) {
      console.warn('⚠️ Layer reward compensation error (non-critical):', compensationErr);
    }

    // Step 9: Post-activation verification - Verify chain-database consistency
    console.log(`🔍 Post-activation verification: Checking chain-database consistency...`);
    let chainVerification = null;
    try {
      // Verify on-chain NFT ownership matches database records
      const thirdwebClientId = Deno.env.get('THIRDWEB_CLIENT_ID');
      if (thirdwebClientId && memberRecord) {
        const client = createThirdwebClient({
          clientId: thirdwebClientId,
          secretKey: Deno.env.get('THIRDWEB_SECRET_KEY')
        });

        const contract = getContract({
          client,
          chain: arbitrum,
          address: '0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8'
        });

        // Check on-chain NFT balance
        const chainBalance = await readContract({
          contract,
          method: "function balanceOf(address account, uint256 id) view returns (uint256)",
          params: [userData.wallet_address, BigInt(level)]
        });

        const hasNFTOnChain = Number(chainBalance) > 0;
        const hasNFTInDB = !!memberRecord && memberRecord.current_level >= level;
        
        chainVerification = {
          chainBalance: chainBalance.toString(),
          hasNFTOnChain,
          hasNFTInDB,
          isConsistent: hasNFTOnChain === hasNFTInDB,
          verificationTime: new Date().toISOString()
        };

        if (hasNFTOnChain && hasNFTInDB) {
          console.log(`✅ Chain-database consistency verified: NFT Level ${level} exists both on-chain and in database`);
        } else if (!hasNFTOnChain && hasNFTInDB) {
          console.warn(`⚠️ Inconsistency: Database shows Level ${level} but NFT not found on-chain (may be pending)`);
        } else if (hasNFTOnChain && !hasNFTInDB) {
          console.warn(`⚠️ Inconsistency: NFT Level ${level} exists on-chain but database not synced`);
        } else {
          console.warn(`⚠️ Neither chain nor database shows Level ${level} NFT - activation may have failed`);
        }

        // Verify all created records exist
        const verificationQueries = await Promise.allSettled([
          supabase.from('membership').select('id').eq('wallet_address', userData.wallet_address).eq('nft_level', level).single(),
          supabase.from('members').select('id').eq('wallet_address', userData.wallet_address).single(),
          supabase.from('referrals_new').select('id').eq('referred_wallet', userData.wallet_address).maybeSingle(),
          supabase.from('matrix_referrals').select('id').eq('member_wallet', userData.wallet_address).maybeSingle(),
          supabase.from('layer_rewards').select('id').eq('triggering_member_wallet', userData.wallet_address).eq('matrix_layer', level).maybeSingle()
        ]);

        const [membershipCheck, membersCheck, referralsCheck, matrixCheck, rewardsCheck] = verificationQueries;
        
        const dbVerification = {
          membershipExists: membershipCheck.status === 'fulfilled' && membershipCheck.value.data,
          membersExists: membersCheck.status === 'fulfilled' && membersCheck.value.data,
          referralsExists: referralsCheck.status === 'fulfilled' && referralsCheck.value.data,
          matrixExists: matrixCheck.status === 'fulfilled' && matrixCheck.value.data,
          rewardsExists: rewardsCheck.status === 'fulfilled' && rewardsCheck.value.data
        };

        chainVerification.databaseConsistency = dbVerification;
        
        const dbConsistencyRate = Object.values(dbVerification).filter(Boolean).length / Object.keys(dbVerification).length;
        console.log(`📊 Database consistency rate: ${(dbConsistencyRate * 100).toFixed(1)}%`);

      } else {
        console.warn('⚠️ Thirdweb client not available or member record missing - skipping chain verification');
      }
    } catch (verificationError) {
      console.warn('⚠️ Post-activation verification failed (non-critical):', verificationError);
      chainVerification = {
        error: verificationError.message,
        verificationTime: new Date().toISOString()
      };
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
          bccReleased: !!bccReleaseResult && bccReleaseResult.success,
          layerRewardCreated: !!layerRewardResult && layerRewardResult.success
        },
        bccRelease: bccReleaseResult,
        layerReward: layerRewardResult,
        chainVerification: chainVerification
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
