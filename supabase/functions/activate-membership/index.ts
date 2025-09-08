import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log(`🚀 修复版会员激活函数启动成功!`)

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
    const { transactionHash, level = 1, action, ...data } = requestBody
    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase()

    if (!walletAddress) {
      throw new Error('钱包地址缺失')
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

      return new Response(JSON.stringify({
        success: true,
        member: memberData,
        isActivated: memberData?.current_level > 0 || false,
        currentLevel: memberData?.current_level || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 特殊情况：检查现有NFT而非验证新交易
    const isCheckingExisting = transactionHash === 'check_existing';
    
    if (!transactionHash || (!isCheckingExisting && !transactionHash)) {
      throw new Error('NFT claim交易哈希缺失，无法验证')
    }

    console.log(`🔐 安全激活会员: ${walletAddress}, 交易: ${transactionHash}`);

    // 首先检查用户是否已经拥有链上NFT
    const existingNFTCheck = await checkExistingNFTAndSync(supabase, walletAddress, level);
    if (existingNFTCheck.hasNFT) {
      console.log(`✅ 用户已拥有Level ${level} NFT，返回现有记录`);
      return new Response(JSON.stringify(existingNFTCheck), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 如果是检查现有NFT的请求且链上没有NFT，直接返回
    if (isCheckingExisting) {
      return new Response(JSON.stringify({
        success: false,
        hasNFT: false,
        message: '链上未检测到NFT'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const result = await activateMembershipSecure(supabase, walletAddress, transactionHash, level);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('会员激活错误:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// 安全的会员激活函数 - 修复版
async function activateMembershipSecure(supabase, walletAddress, transactionHash, level) {
  console.log(`🔒 开始安全激活流程: ${walletAddress}`);

  try {
    // 1. 验证用户存在且有完整注册信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_address, referrer_wallet, username, email')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !userData) {
      throw new Error('用户不存在或注册信息不完整，无法激活会员身份');
    }

    console.log(`✅ 用户验证成功: ${userData.username}`);

    // 2. 检查是否已经是激活会员
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
        message: '会员身份已激活'
      };
    }

    // 3. 验证NFT claim交易
    console.log(`🔍 验证区块链交易: ${transactionHash}`);
    
    const isValidTransaction = await verifyNFTClaimTransaction(transactionHash, walletAddress, level);
    if (!isValidTransaction) {
      throw new Error('区块链交易验证失败 - 交易无效或未确认');
    }
    console.log(`✅ 区块链交易验证成功: ${transactionHash}`);

    // 4. 创建members记录
    const currentTime = new Date().toISOString();
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert({
        wallet_address: walletAddress,
        current_level: level,
        levels_owned: [level],
        has_pending_rewards: false,
        referrer_wallet: userData.referrer_wallet,
        activation_rank: 1, // Set initial activation rank
        tier_level: 1, // Set initial tier level
        created_at: currentTime,
        updated_at: currentTime
      })
      .select()
      .single();

    if (memberError) {
      console.error('创建会员记录失败:', memberError);
      throw new Error(`会员激活失败: ${memberError.message}`);
    }

    console.log(`✅ 会员记录创建成功: ${walletAddress}`);

    // 4.5. 初始化BCC余额 - 新激活会员奖励
    try {
      const initialBccLocked = 10450; // 锁仓BCC
      const initialBccTransferable = 500; // 初始可转账BCC
      const level1UnlockBonus = 100; // Level 1 激活解锁奖励
      
      // 计算最终余额: 锁仓减少100，可转账增加100
      const finalBccLocked = initialBccLocked - level1UnlockBonus;
      const finalBccTransferable = initialBccTransferable + level1UnlockBonus;
      
      console.log(`💰 分配BCC余额: ${finalBccLocked} 锁仓 + ${finalBccTransferable} 可转账`);
      
      // 创建或更新用户余额记录
      const { data: existingBalance } = await supabase
        .from('user_balances')
        .select('wallet_address')
        .eq('wallet_address', walletAddress)
        .single();

      if (existingBalance) {
        // 更新现有余额
        await supabase
          .from('user_balances')
          .update({
            bcc_transferable: finalBccTransferable,
            bcc_locked: finalBccLocked,
            updated_at: currentTime
          })
          .eq('wallet_address', walletAddress);
        console.log(`✅ BCC余额更新成功: ${walletAddress}`);
      } else {
        // 创建新的余额记录
        await supabase
          .from('user_balances')
          .insert({
            wallet_address: walletAddress,
            bcc_transferable: finalBccTransferable,
            bcc_locked: finalBccLocked,
            bcc_restricted: 0,
            total_usdt_earned: 0,
            pending_rewards_usdt: 0,
            created_at: currentTime,
            updated_at: currentTime
          });
        console.log(`✅ BCC余额初始化成功: ${walletAddress}`);
      }

      // 记录BCC交易日志
      await supabase
        .from('bcc_transactions')
        .insert({
          wallet_address: walletAddress,
          amount: finalBccTransferable + finalBccLocked,
          balance_type: 'activation_reward',
          transaction_type: 'reward',
          purpose: `Level ${level} 会员激活奖励: ${finalBccLocked} 锁仓 + ${finalBccTransferable} 可转账`,
          status: 'completed',
          created_at: currentTime,
          processed_at: currentTime,
          metadata: {
            initial_locked: initialBccLocked,
            initial_transferable: initialBccTransferable,
            unlock_bonus: level1UnlockBonus,
            final_locked: finalBccLocked,
            final_transferable: finalBccTransferable,
            activation_level: level
          }
        });
        
      console.log(`✅ BCC交易记录创建成功: ${walletAddress}`);
    } catch (bccError) {
      console.error('BCC余额分配失败:', bccError);
      // 不要因为BCC分配失败而回滚整个激活过程，只记录错误
    }

    // 5. 处理推荐关系 - 使用改进的矩阵安置算法
    const referrerWallet = userData.referrer_wallet;
    const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
    
    if (referrerWallet && referrerWallet !== ROOT_WALLET) {
      console.log(`🔗 处理推荐关系: ${referrerWallet} -> ${walletAddress}`);
      
      // 检查推荐者是否为激活会员
      const { data: referrerMember } = await supabase
        .from('members')
        .select('wallet_address, current_level')
        .eq('wallet_address', referrerWallet)
        .gt('current_level', 0)
        .single();

      if (referrerMember) {
        // 使用改进的矩阵安置算法
        const placementResult = await findOptimalMatrixPlacement(supabase, referrerWallet, walletAddress);
        
        if (placementResult.success) {
          console.log(`✅ 找到最佳安置位置: Layer ${placementResult.layer}, Position ${placementResult.position}`);
          
          // 创建推荐关系记录
          const { error: referralError } = await supabase
            .from('referrals')
            .insert({
              referred_wallet: walletAddress,
              referrer_wallet: referrerWallet,
              placement_root: placementResult.rootWallet,
              placement_layer: placementResult.layer,
              placement_position: placementResult.position,
              placement_path: `${placementResult.rootWallet}/${placementResult.layer}/${placementResult.position}`,
              referral_type: placementResult.placementType
            });

          if (referralError) {
            console.warn('创建推荐关系失败，但会员激活成功:', referralError);
          } else {
            console.log(`✅ 推荐关系创建成功: ${referrerWallet} -> ${walletAddress}`);
            
            // Update referrer's member record (simplified - just update timestamp)
            await supabase
              .from('members')
              .update({ 
                updated_at: currentTime
              })
              .eq('wallet_address', referrerWallet);
            
            console.log(`✅ 推荐人统计更新成功: ${referrerWallet}`);
            
            // 触发奖励系统
            await triggerRewardSystem(supabase, placementResult, walletAddress, level);
          }
        } else {
          console.error('⚠️ 矩阵安置失败:', placementResult.error);
        }
      } else {
        console.warn(`⚠️ 推荐者 ${referrerWallet} 不是激活会员，跳过推荐关系创建`);
      }
    } else {
      console.log(`📝 无有效推荐者，跳过推荐关系创建`);
    }

    // 6. 更新用户表的当前等级
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ 
        current_level: level,
        updated_at: currentTime
      })
      .eq('wallet_address', walletAddress);

    if (userUpdateError) {
      console.warn('更新用户等级失败:', userUpdateError);
    }

    console.log(`🎉 会员激活完成: ${walletAddress} -> Level ${level}`);
    
    return {
      success: true,
      action: 'activated',
      member: newMember,
      transactionHash: transactionHash,
      level: level,
      message: `Level ${level} 会员身份激活成功`
    };

  } catch (error) {
    console.error('安全激活会员身份错误:', error);
    throw new Error(`激活失败: ${error.message}`);
  }
}

// 验证NFT claim交易的区块链验证函数
async function verifyNFTClaimTransaction(transactionHash: string, walletAddress: string, expectedLevel: number) {
  console.log(`🔗 开始验证交易: ${transactionHash}`);
  
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
      console.log(`✅ 数据库记录已存在且已激活`);
      return {
        success: true,
        hasNFT: true,
        action: 'already_synced',
        member: existingMember,
        message: `Level ${level} 会员身份已激活（链上验证）`
      };
    }
    
    // 3. 如果链上有NFT但数据库缺少记录，则补充记录
    console.log(`🔧 链上有NFT但数据库缺少记录，开始同步...`);
    
    // 验证用户存在
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_address, referrer_wallet, username, email')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (userError || !userData) {
      throw new Error('用户不存在，无法同步会员记录');
    }
    
    // 创建会员记录
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
    
    console.log(`✅ 链上NFT数据同步完成: ${walletAddress} -> Level ${level}`);

    // 同步时也需要分配BCC余额
    try {
      const initialBccLocked = 10450;
      const initialBccTransferable = 500;
      const level1UnlockBonus = 100;
      
      const finalBccLocked = initialBccLocked - level1UnlockBonus;
      const finalBccTransferable = initialBccTransferable + level1UnlockBonus;
      
      console.log(`💰 同步时分配BCC余额: ${finalBccLocked} 锁仓 + ${finalBccTransferable} 可转账`);
      
      // 检查是否已有余额记录
      const { data: existingBalance } = await supabase
        .from('user_balances')
        .select('wallet_address')
        .eq('wallet_address', walletAddress)
        .single();

      if (!existingBalance) {
        await supabase
          .from('user_balances')
          .insert({
            wallet_address: walletAddress,
            bcc_transferable: finalBccTransferable,
            bcc_locked: finalBccLocked,
            bcc_restricted: 0,
            total_usdt_earned: 0,
            pending_rewards_usdt: 0,
            created_at: currentTime,
            updated_at: currentTime
          });
        
        // 记录交易日志
        await supabase
          .from('bcc_transactions')
          .insert({
            wallet_address: walletAddress,
            amount: finalBccTransferable + finalBccLocked,
            balance_type: 'activation_reward',
            transaction_type: 'reward',
            purpose: `Level ${level} 会员同步奖励: ${finalBccLocked} 锁仓 + ${finalBccTransferable} 可转账`,
            status: 'completed',
            created_at: currentTime,
            processed_at: currentTime,
            metadata: {
              sync_type: 'chain_to_db',
              activation_level: level
            }
          });
          
        console.log(`✅ 同步时BCC余额分配成功: ${walletAddress}`);
      } else {
        console.log(`ℹ️ BCC余额记录已存在，跳过分配`);
      }
    } catch (bccError) {
      console.error('同步时BCC余额分配失败:', bccError);
    }
    
    return {
      success: true,
      hasNFT: true,
      action: 'synced_from_chain',
      member: newMember,
      level: level,
      message: `Level ${level} 会员身份已同步（基于链上NFT）`
    };
    
  } catch (error) {
    console.error('检查链上NFT错误:', error);
    return { hasNFT: false, error: error.message };
  }
}

// 🎯 改进的矩阵安置算法 - 3x3矩阵系统
async function findOptimalMatrixPlacement(supabase, referrerWallet: string, newMemberWallet: string) {
  console.log(`🔍 开始矩阵安置算法: ${referrerWallet} -> ${newMemberWallet}`);
  
  try {
    // 1. 查找推荐人的根矩阵
    const rootWallet = await findMatrixRoot(supabase, referrerWallet);
    console.log(`📊 矩阵根用户: ${rootWallet}`);
    
    // 2. 尝试在推荐人直接下级找位置
    let placement = await findAvailablePosition(supabase, referrerWallet, rootWallet, 1);
    
    if (placement.found) {
      return {
        success: true,
        parentWallet: referrerWallet,
        rootWallet: rootWallet,
        layer: 1,
        position: placement.position,
        placementType: 'direct'
      };
    }
    
    // 3. 使用溢出算法找最佳位置
    const spilloverPlacement = await findSpilloverPosition(supabase, referrerWallet, rootWallet);
    
    if (spilloverPlacement.found) {
      return {
        success: true,
        parentWallet: spilloverPlacement.parentWallet,
        rootWallet: rootWallet,
        layer: spilloverPlacement.layer,
        position: spilloverPlacement.position,
        placementType: 'spillover'
      };
    }
    
    throw new Error('无法找到可用的矩阵位置');
    
  } catch (error) {
    console.error('矩阵安置算法错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 查找矩阵根用户
async function findMatrixRoot(supabase, walletAddress: string): Promise<string> {
  const { data: referralData } = await supabase
    .from('referrals')
    .select('root_wallet')
    .eq('member_wallet', walletAddress)
    .single();
    
  if (referralData?.root_wallet) {
    return referralData.root_wallet;
  }
  
  return walletAddress;
}

// 查找可用位置 - 正确的矩阵结构 (Layer n = 3^n 个位置)
async function findAvailablePosition(supabase, parentWallet: string, rootWallet: string, layer: number) {
  // 计算该层的总位置数: 3^layer
  const totalPositions = Math.pow(3, layer);
  const matrixPositions = Array.from({ length: totalPositions }, (_, i) => (i + 1).toString());
  
  console.log(`📊 Layer ${layer} 总位置数: ${totalPositions}`);
  
  const { data: occupiedPositions } = await supabase
    .from('referrals')
    .select('position')
    .eq('parent_wallet', parentWallet)
    .eq('root_wallet', rootWallet)
    .eq('layer', layer);
    
  const occupied = occupiedPositions?.map(p => p.position) || [];
  console.log(`📍 父级 ${parentWallet} Layer ${layer} 已占用位置 (${occupied.length}/${totalPositions}):`, occupied);
  
  // 按照 L → M → R 优先级查找可用位置
  for (const position of matrixPositions) {
    if (!occupied.includes(position)) {
      console.log(`✅ 找到可用位置: Layer ${layer}, Position ${position}`);
      return { found: true, position };
    }
  }
  
  console.log(`❌ Layer ${layer} 已满，无可用位置`);
  return { found: false };
}

// 溢出安置算法 - 广度优先搜索
async function findSpilloverPosition(supabase, originalReferrer: string, rootWallet: string) {
  console.log(`🌊 开始溢出算法搜索...`);
  
  const maxLayer = 19;
  let currentLayer = 1;
  
  while (currentLayer <= maxLayer) {
    console.log(`🔍 搜索第 ${currentLayer} 层...`);
    
    const { data: layerMembers } = await supabase
      .from('referrals')
      .select('member_wallet')
      .eq('root_wallet', rootWallet)
      .eq('layer', currentLayer);
    
    if (layerMembers && layerMembers.length > 0) {
      for (const member of layerMembers) {
        const placement = await findAvailablePosition(supabase, member.member_wallet, rootWallet, currentLayer + 1);
        
        if (placement.found) {
          console.log(`✅ 溢出安置成功: Layer ${currentLayer + 1}, Parent: ${member.member_wallet}`);
          return {
            found: true,
            parentWallet: member.member_wallet,
            layer: currentLayer + 1,
            position: placement.position
          };
        }
      }
    }
    
    currentLayer++;
  }
  
  return { found: false };
}

// 🎁 奖励触发系统
async function triggerRewardSystem(supabase, placementResult: any, newMemberWallet: string, level: number) {
  console.log(`🎁 检查奖励触发: ${newMemberWallet} 安置到 Layer ${placementResult.layer}`);
  
  try {
    // 检查新安置是否完成了某个矩阵
    const matrixCompleted = await checkMatrixCompletion(supabase, placementResult.parentWallet, placementResult.rootWallet, placementResult.layer);
    
    if (matrixCompleted.isComplete) {
      console.log(`🎉 矩阵完成! Layer ${placementResult.layer} 已满`);
      
      // 检查奖励资格
      const eligibilityCheck = await checkRewardEligibility(supabase, placementResult.parentWallet, placementResult.layer);
      
      if (eligibilityCheck.isEligible) {
        await createRewardRecord(supabase, {
          rootWallet: placementResult.rootWallet,
          triggeringMemberWallet: newMemberWallet,
          layer: placementResult.layer,
          nftLevel: level,
          rewardAmountUsdc: calculateRewardAmount(placementResult.layer, level)
        });
        
        console.log(`✅ 奖励记录创建成功: Layer ${placementResult.layer}`);
      } else {
        console.log(`⏳ 奖励资格不满足: ${eligibilityCheck.reason}`);
      }
    }
    
  } catch (error) {
    console.error('奖励触发系统错误:', error);
  }
}

// 检查矩阵完成状态 - 修正版
async function checkMatrixCompletion(supabase, parentWallet: string, rootWallet: string, layer: number) {
  // 计算该层的总位置数: 3^layer
  const maxPositions = Math.pow(3, layer);
  
  const { data: positions, count } = await supabase
    .from('referrals')
    .select('position', { count: 'exact' })
    .eq('parent_wallet', parentWallet)
    .eq('root_wallet', rootWallet)
    .eq('layer', layer);
    
  const currentCount = count || 0;
  const isComplete = currentCount >= maxPositions;
  
  console.log(`📊 矩阵检查: Layer ${layer}, 当前 ${currentCount}/${maxPositions}, 完成: ${isComplete}`);
  
  return {
    isComplete,
    currentCount,
    maxPositions
  };
}

// 检查奖励资格 - 包含Level 2特殊限制
async function checkRewardEligibility(supabase, memberWallet: string, layer: number) {
  try {
    // 获取成员数据
    const { data: memberData } = await supabase
      .from('members')
      .select('current_level')
      .eq('wallet_address', memberWallet)
      .single();
      
    if (!memberData) {
      return {
        isEligible: false,
        reason: '成员数据不存在'
      };
    }
    
    // 计算直接推荐数量
    const { count: directReferrals } = await supabase
      .from('referrals')
      .select('*', { count: 'exact' })
      .eq('referrer_wallet', memberWallet);
    const memberLevel = memberData.current_level || 0;
    
    // 基本要求：必须有NFT等级才能获得奖励
    if (memberLevel < 1) {
      return {
        isEligible: false,
        reason: '成员未激活或无NFT等级'
      };
    }
    
    // Layer 1 Right slot (位置3) 特殊限制：需要Level 2
    if (layer === 1) {
      // 这里需要检查具体位置，但简化处理，假设Layer 1都需要Level 2
      if (memberLevel < 2) {
        return {
          isEligible: false,
          reason: 'Layer 1奖励需要升级到Level 2'
        };
      }
    }
    
    // Level 2升级的特殊限制：需要3个直推
    if (memberLevel === 1 && directReferrals < 3) {
      return {
        isEligible: false,
        reason: `Level 2需要3个直推，当前只有 ${directReferrals} 个`
      };
    }
    
    // 奖励资格：根用户必须持有≥该层级的NFT
    // 这里简化处理，实际应该检查triggering member的level
    
    return {
      isEligible: true,
      directReferrals,
      memberLevel
    };
    
  } catch (error) {
    return {
      isEligible: false,
      reason: `资格检查错误: ${error.message}`
    };
  }
}

// 创建奖励记录
async function createRewardRecord(supabase, rewardData: any) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 72);
  
  const { error } = await supabase
    .from('reward_claims')
    .insert({
      root_wallet: rewardData.rootWallet,
      triggering_member_wallet: rewardData.triggeringMemberWallet,
      layer: rewardData.layer,
      nft_level: rewardData.nftLevel,
      reward_amount_usdc: rewardData.rewardAmountUsdc,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      metadata: {
        trigger_type: 'matrix_completion',
        layer_completed: rewardData.layer
      }
    });
    
  if (error) {
    throw new Error(`创建奖励记录失败: ${error.message}`);
  }
}

// 计算奖励金额 - 基于NFT价格
function calculateRewardAmount(layer: number, nftLevel: number): number {
  // Layer Reward = 该层级的NFT价格
  // Level 1: 100 USDC, Level 2: 150 USDC, Level 3: 200 USDC...
  // 每级增加50 USDC，最高Level 19: 1000 USDC
  
  let nftPrice: number;
  if (nftLevel === 1) {
    nftPrice = 100; // Level 1特殊价格
  } else if (nftLevel <= 19) {
    nftPrice = 100 + (nftLevel - 1) * 50; // Level 2-19: 150, 200, 250...1000
  } else {
    nftPrice = 1000; // 超过Level 19的固定价格
  }
  
  console.log(`💰 奖励计算: Layer ${layer}, NFT Level ${nftLevel} = ${nftPrice} USDC`);
  
  return nftPrice;
}