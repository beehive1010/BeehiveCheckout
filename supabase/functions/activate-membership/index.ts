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
    
    // Generate correlation ID for tracking related operations
    const correlationId = `activation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Helper function for logging operations
    const logOperation = async (
      logLevel: 'info' | 'warning' | 'error' | 'critical',
      category: string,
      operationName: string,
      status: 'success' | 'failure' | 'pending' | 'retry' = 'pending',
      inputParams?: any,
      outputResult?: any,
      errorCode?: string,
      errorMessage?: string,
      errorDetails?: any,
      durationMs?: number
    ) => {
      try {
        await supabase.rpc('log_operation', {
          p_log_level: logLevel,
          p_category: category,
          p_operation_name: operationName,
          p_status: status,
          p_wallet_address: walletAddress,
          p_referrer_wallet: normalizedReferrerWallet,
          p_function_name: 'activate-membership',
          p_operation_data: null,
          p_input_parameters: inputParams ? JSON.stringify(inputParams) : null,
          p_output_result: outputResult ? JSON.stringify(outputResult) : null,
          p_error_code: errorCode,
          p_error_message: errorMessage,
          p_error_details: errorDetails ? JSON.stringify(errorDetails) : null,
          p_correlation_id: correlationId,
          p_duration_ms: durationMs
        });
      } catch (logError) {
        console.error('❌ Failed to log operation:', logError);
      }
    };
    
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
      await logOperation('error', 'validation', 'wallet_address_validation', 'failure', 
        { headers: headerWalletAddress, body: bodyWalletAddress }, 
        null, 'MISSING_WALLET_ADDRESS', 'No wallet address found in headers or body');
      
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
    
    // Log activation start
    await logOperation('info', 'member_activation', 'activation_started', 'pending',
      { transactionHash, level, referrerWallet, action });
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
    
    // Step 4: Create members record FIRST (required for referrals_new foreign key constraints)
    // Step 5: Then create referrals_new record AFTER members record exists
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
            await logOperation('error', 'member_activation', 'members_record_creation', 'failure',
              memberData, null, 'MEMBER_CREATION_ERROR', memberError.message, memberError);
            throw new Error(`Failed to create members record: ${memberError.message}`);
          } else {
            memberRecord = newMember;
            console.log(`✅ Members record created successfully: ${memberRecord.wallet_address} with referrer: ${memberRecord.referrer_wallet}`);
            await logOperation('info', 'member_activation', 'members_record_creation', 'success',
              memberData, memberRecord);
            
            // 验证referrer是否正确保存
            if (normalizedReferrerWallet && !memberRecord.referrer_wallet) {
              console.error(`🚨 CRITICAL: Referrer lost during member creation! Expected: ${normalizedReferrerWallet}, Got: ${memberRecord.referrer_wallet}`);
              await logOperation('critical', 'member_activation', 'referrer_validation', 'failure',
                { expected: normalizedReferrerWallet, actual: memberRecord.referrer_wallet },
                null, 'REFERRER_LOST', 'Referrer wallet lost during member creation');
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
    
    // Step 5: Create referrals_new record AFTER members record exists (for foreign key constraints)
    let referralRecord = null;
    if (normalizedReferrerWallet && normalizedReferrerWallet !== '0x0000000000000000000000000000000000000001' && memberRecord) {
      try {
        console.log(`🔗 Creating referrals_new record AFTER members: ${userData.wallet_address} -> ${normalizedReferrerWallet}`);
        
        // 🔧 FIXED: Use UPSERT after members record exists to satisfy foreign key constraints
        const { data: referralNewData, error: referralNewError } = await supabase.from('referrals_new').upsert({
          referrer_wallet: normalizedReferrerWallet,
          referred_wallet: userData.wallet_address,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'referred_wallet'  // Update if exists, insert if not
        }).select();
        
        if (referralNewError) {
          console.warn('⚠️ Failed to upsert referrals_new record:', referralNewError);
          await logOperation('warning', 'referral_processing', 'referrals_new_creation', 'failure',
            { referrer_wallet: normalizedReferrerWallet, referred_wallet: userData.wallet_address },
            null, 'REFERRALS_NEW_ERROR', referralNewError.message, referralNewError);
        } else {
          console.log(`✅ Referrals_new record upserted successfully: ${userData.wallet_address} -> ${normalizedReferrerWallet}`);
          referralRecord = referralNewData?.[0] || null;
          await logOperation('info', 'referral_processing', 'referrals_new_creation', 'success',
            { referrer_wallet: normalizedReferrerWallet, referred_wallet: userData.wallet_address },
            referralRecord);
          
          // 🔧 CRITICAL: Verify the record was actually created/updated
          const { data: verifyReferral, error: verifyError } = await supabase
            .from('referrals_new')
            .select('referrer_wallet, referred_wallet, created_at')
            .eq('referred_wallet', userData.wallet_address)
            .single();
            
          if (verifyError || !verifyReferral) {
            console.error(`🚨 CRITICAL: Failed to verify referrals_new record after upsert!`, verifyError);
            await logOperation('critical', 'referral_processing', 'referrals_new_verification', 'failure',
              { referred_wallet: userData.wallet_address }, null, 'VERIFICATION_FAILED', 'Failed to verify referrals_new record', verifyError);
          } else {
            console.log(`✅ Verified referrals_new record: ${verifyReferral.referred_wallet} -> ${verifyReferral.referrer_wallet}`);
          }
        }
      } catch (referralErr) {
        console.error('❌ Referrals_new creation error (CRITICAL for consistency):', referralErr);
        await logOperation('critical', 'referral_processing', 'referrals_new_creation', 'failure',
          { referrer_wallet: normalizedReferrerWallet, referred_wallet: userData.wallet_address },
          null, 'REFERRALS_NEW_CRITICAL_ERROR', referralErr.message, referralErr);
        // Don't throw error, but make sure this is logged for debugging
      }
    }
    
    // Step 6: SMART matrix placement AFTER members record is safely created
    if (normalizedReferrerWallet && normalizedReferrerWallet !== '0x0000000000000000000000000000000000000001' && memberRecord) {
      try {
        console.log(`📐 Starting SMART matrix placement: ${userData.wallet_address} -> ${normalizedReferrerWallet}`);
        
        // 🔧 UPDATED: Use matrix-fix function with BFS algorithm for proper placement
        const { data: matrixPlacementResult, error: matrixPlacementError } = await supabase.functions.invoke('matrix-fix', {
          body: {
            action: 'place_member_advanced',
            memberWallet: userData.wallet_address,
            referrerWallet: normalizedReferrerWallet
          }
        });
        
        if (matrixPlacementError || !matrixPlacementResult?.success) {
          console.warn('⚠️ Smart matrix placement failed, trying alternative:', matrixPlacementError?.message || matrixPlacementResult?.error);
          await logOperation('warning', 'matrix_placement', 'smart_matrix_placement', 'failure',
            { member_wallet: userData.wallet_address, referrer_wallet: normalizedReferrerWallet },
            matrixPlacementResult, 'SMART_PLACEMENT_FAILED', 
            matrixPlacementError?.message || matrixPlacementResult?.error, matrixPlacementError);
          
          // 🔧 FALLBACK: If smart placement fails, try the complete algorithm
          try {
            console.log('🔧 Attempting alternative matrix placement...');
            
            const { data: completeResult, error: completeError } = await supabase.rpc('place_member_matrix_complete', {
              p_member_wallet: userData.wallet_address,
              p_referrer_wallet: normalizedReferrerWallet
            });
            
            if (!completeError && completeResult?.success) {
              console.log('✅ Alternative matrix placement succeeded');
              await logOperation('info', 'matrix_placement', 'complete_matrix_placement', 'success',
                { member_wallet: userData.wallet_address, referrer_wallet: normalizedReferrerWallet },
                completeResult);
              referralRecord = completeResult;
            } else {
              console.warn('⚠️ All matrix placement methods failed');
              await logOperation('error', 'matrix_placement', 'complete_matrix_placement', 'failure',
                { member_wallet: userData.wallet_address, referrer_wallet: normalizedReferrerWallet },
                completeResult, 'COMPLETE_PLACEMENT_FAILED', completeError?.message, completeError);
              
              // Check if member already has placement from a previous attempt
              const { data: existingMatrix, error: checkError } = await supabase
                .from('matrix_referrals')
                .select('*')
                .eq('member_wallet', userData.wallet_address)
                .maybeSingle();
                
              if (!checkError && existingMatrix) {
                console.log('✅ Found existing matrix placement from previous attempt');
                await logOperation('info', 'matrix_placement', 'existing_placement_found', 'success',
                  { member_wallet: userData.wallet_address }, existingMatrix);
                referralRecord = { 
                  method: 'existing_placement', 
                  success: true,
                  placement_data: existingMatrix
                };
              } else {
                console.error('❌ Matrix placement completely failed - this should be investigated');
                await logOperation('critical', 'matrix_placement', 'all_placements_failed', 'failure',
                  { member_wallet: userData.wallet_address, referrer_wallet: normalizedReferrerWallet },
                  null, 'ALL_PLACEMENTS_FAILED', 'All matrix placement methods failed and no existing placement found');
              }
            }
          } catch (fallbackError) {
            console.error('❌ Matrix placement fallback error:', fallbackError);
            await logOperation('error', 'matrix_placement', 'fallback_error', 'failure',
              { member_wallet: userData.wallet_address, referrer_wallet: normalizedReferrerWallet },
              null, 'FALLBACK_ERROR', fallbackError.message, fallbackError);
          }
        } else {
          console.log(`✅ SMART matrix placement succeeded:`, matrixPlacementResult);
          await logOperation('info', 'matrix_placement', 'smart_matrix_placement', 'success',
            { member_wallet: userData.wallet_address, referrer_wallet: normalizedReferrerWallet },
            matrixPlacementResult);
          referralRecord = matrixPlacementResult;
        }
      } catch (matrixErr) {
        console.error('❌ Matrix placement critical error (members record is SAFE):', matrixErr);
        // 矩阵安置失败不影响会员激活状态，但需要记录错误
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
    // Log successful activation completion
    await logOperation('info', 'member_activation', 'activation_completed', 'success',
      { transactionHash, level, referrerWallet }, responseData.result);
    
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
    
    // Log critical activation failure
    try {
      await logOperation('critical', 'member_activation', 'activation_failed', 'failure',
        { transactionHash, level, referrerWallet }, null, 'ACTIVATION_ERROR', error.message, error);
    } catch (logErr) {
      console.error('❌ Failed to log activation error:', logErr);
    }
    
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
