import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // 创建Supabase客户端
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
    const { transactionHash, level = 1, action, referrerWallet, ...data } = requestBody
    const walletAddress = req.headers.get('x-wallet-address')

    if (!walletAddress) {
      throw new Error('Wallet address missing')
    }

    // Handle member info query action
    if (action === 'get-member-info') {
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (memberError) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Member not found',
          member: null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
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

      return new Response(JSON.stringify({
        success: true,
        member: memberData,
        isActivated: isReallyActivated,
        currentLevel: memberData?.current_level || 0
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
    const existingNFTCheck = await checkExistingNFTAndSync(supabase, walletAddress, level);
    if (existingNFTCheck.hasNFT) {
      console.log(`✅ User already owns Level ${level} NFT, returning existing record`);
      return new Response(JSON.stringify(existingNFTCheck), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // If checking existing NFT request and no NFT on chain, return directly
    if (isCheckingExisting) {
      return new Response(JSON.stringify({
        success: false,
        hasNFT: false,
        message: 'No NFT detected on chain'
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
      error: error.message 
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
    // 1. Check if already an activated member
    const { data: existingMember } = await supabase
      .from('members')
      .select('wallet_address, current_level, activation_rank')
      .eq('wallet_address', walletAddress)
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

    // 3. Call unified database activation function
    console.log(`🔄 Calling database activation function: activate_nft_level1_membership`);
    
    const { data: activationResult, error: activationError } = await supabase.rpc(
      'activate_nft_level1_membership',
      {
        p_wallet_address: walletAddress,
        p_referrer_wallet: referrerWallet || '0x0000000000000000000000000000000000000001',
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
    throw new Error(`Activation failed: ${error.message}`);
  }
}

// Blockchain verification function for NFT claim transactions
async function verifyNFTClaimTransaction(transactionHash: string, walletAddress: string, expectedLevel: number) {
  console.log(`🔗 Starting transaction verification: ${transactionHash}`);
  
  const ARBITRUM_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
  const NFT_CONTRACT = '0x2Cb47141485754371c24Efcc65d46Ccf004f769a';
  const EXPECTED_TOKEN_ID = expectedLevel;
  
  try {
    // 1. 获取交易回执
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
      console.log('⏳ 交易还未确认，需要等待');
      return false;
    }
    
    if (receipt.status !== '0x1') {
      console.log('❌ 交易失败');
      return false;
    }
    
    console.log(`📋 交易确认成功，gas used: ${receipt.gasUsed}`);
    
    // 2. 验证交易是从正确的钱包地址发起
    if (receipt.from?.toLowerCase() !== walletAddress.toLowerCase()) {
      console.log(`❌ 交易发起者不匹配: ${receipt.from} vs ${walletAddress}`);
      return false;
    }
    
    // 3. 验证交易是发往NFT合约
    if (receipt.to?.toLowerCase() !== NFT_CONTRACT.toLowerCase()) {
      console.log(`❌ 交易接收者不匹配: ${receipt.to} vs ${NFT_CONTRACT}`);
      return false;
    }
    
    // 4. 验证交易logs中包含NFT mint事件
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
          
          console.log(`✅ NFT mint 事件验证成功: Token ID ${tokenId} 铸造给 ${walletAddress}`);
          nftMintFound = true;
          break;
        }
      }
    }
    
    if (!nftMintFound) {
      console.log('❌ 未找到正确的NFT mint事件');
      return false;
    }
    
    // 5. 确保交易已经有足够的确认数
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
    
    console.log(`📊 交易确认数: ${confirmations}`);
    
    if (confirmations < 3) {
      console.log(`⏳ 等待更多确认: ${confirmations}/3`);
      return false;
    }
    
    console.log(`✅ 区块链验证完成: 交易有效且已充分确认`);
    return true;
    
  } catch (error) {
    console.error('区块链验证错误:', error);
    return false;
  }
}

// 检查用户是否已经拥有链上NFT，如果有但数据库缺少记录，则同步数据
async function checkExistingNFTAndSync(supabase, walletAddress: string, level: number) {
  console.log(`🔍 检查用户 ${walletAddress} 是否已拥有 Level ${level} NFT`);
  
  const ARBITRUM_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
  const NFT_CONTRACT = '0x2Cb47141485754371c24Efcc65d46Ccf004f769a';
  const TOKEN_ID = level;
  
  try {
    // 1. 检查链上NFT余额
    const balanceResponse = await fetch(ARBITRUM_SEPOLIA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: NFT_CONTRACT,
          data: `0x00fdd58e${walletAddress.slice(2).padStart(64, '0')}${TOKEN_ID.toString(16).padStart(64, '0')}`
        }, 'latest'],
        id: 1
      })
    });
    
    const balanceData = await balanceResponse.json();
    const balance = parseInt(balanceData.result || '0x0', 16);
    
    console.log(`📊 链上NFT余额检查: Token ID ${TOKEN_ID} = ${balance}`);
    
    if (balance === 0) {
      console.log(`❌ 用户未拥有 Level ${level} NFT`);
      return { hasNFT: false };
    }
    
    console.log(`✅ 用户已拥有 Level ${level} NFT`);
    
    // 2. 检查数据库中是否已有对应的会员记录
    const { data: existingMember } = await supabase
      .from('members')
      .select('wallet_address, current_level, activation_rank')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (existingMember && existingMember.current_level > 0) {
      console.log(`✅ 数据库members记录已存在且已激活，但需要检查完整的activation记录`);
      
      // 检查是否存在完整的membership和referrals记录
      const { data: membershipRecord } = await supabase
        .from('membership')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();
        
      const { data: referralRecord } = await supabase
        .from('referrals')
        .select('id')
        .eq('member_wallet', walletAddress)
        .single();
      
      if (membershipRecord && referralRecord) {
        console.log(`✅ 完整的activation记录已存在`);
        return {
          success: true,
          hasNFT: true,
          action: 'already_synced',
          member: existingMember,
          message: `Level ${level} 会员身份已激活（链上验证）`
        };
      } else {
        console.log(`🔧 members记录存在但缺少membership/referrals记录，需要补充完整激活流程`);
        // 继续执行完整的同步流程以创建缺失的记录
      }
    }
    
    // 3. 如果链上有NFT但数据库缺少完整的activation记录，则补充记录
    console.log(`🔧 链上有NFT但缺少完整的activation记录，开始同步...`);
    
    // 验证用户存在
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_address, referrer_wallet, username, email')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (userError || !userData) {
      throw new Error('用户不存在，无法同步会员记录');
    }
    
    // 如果members记录不存在，先创建它
    if (!existingMember) {
      console.log(`📝 创建members记录...`);
      const currentTime = new Date().toISOString();
      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert({
          wallet_address: walletAddress,
          current_level: level,
          levels_owned: [level],
          has_pending_rewards: false,
          referrer_wallet: userData.referrer_wallet,
          activation_rank: 1,
          tier_level: 1,
          created_at: currentTime,
          updated_at: currentTime
        })
        .select()
        .single();
      
      if (memberError) {
        console.error('同步会员记录失败:', memberError);
        throw new Error(`同步会员记录失败: ${memberError.message}`);
      }
      console.log(`✅ 新members记录创建完成`);
    }
    
    // 使用完整的activation函数来创建missing的membership和referrals记录
    console.log(`🚀 调用完整的activation函数来补充缺失的记录...`);
    const { data: activationResult, error: activationError } = await supabase.rpc(
      'activate_nft_level1_membership',
      {
        p_wallet_address: walletAddress,
        p_referrer_wallet: userData.referrer_wallet || '0x0000000000000000000000000000000000000001',
        p_transaction_hash: `chain_sync_${Date.now()}`
      }
    );

    if (activationError) {
      console.error('❌ 完整激活同步失败:', activationError);
      throw new Error(`激活同步失败: ${activationError.message}`);
    }

    if (!activationResult || !activationResult.success) {
      const errorMessage = activationResult?.message || '激活同步返回失败';
      console.error('❌ 激活同步函数返回失败:', errorMessage);
      throw new Error(`激活同步失败: ${errorMessage}`);
    }
    
    console.log(`✅ 链上NFT完整数据同步完成: ${walletAddress} -> Level ${level}`);

    // 获取最新的members记录
    const { data: updatedMember } = await supabase
      .from('members')
      .select('wallet_address, current_level, activation_rank')
      .eq('wallet_address', walletAddress)
      .single();
    
    return {
      success: true,
      hasNFT: true,
      action: 'synced_from_chain',
      member: updatedMember,
      level: level,
      message: `Level ${level} 会员身份已同步（基于链上NFT和完整激活流程）`,
      activationDetails: {
        membershipCreated: activationResult.membership_created,
        platformFeeAdded: activationResult.platform_fee_added,
        rewardTriggered: activationResult.reward_triggered,
        referralCreated: activationResult.referral_created
      }
    };
    
  } catch (error) {
    console.error('检查链上NFT错误:', error);
    return { hasNFT: false, error: error.message };
  }
}

// Note: Matrix placement and reward logic now handled by activate_nft_level1_membership() database function