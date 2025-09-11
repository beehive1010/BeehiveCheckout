import { supabase } from '../supabase';
import { getMembershipLevelFromDB, getLayerRuleFromDB } from './membershipPricing';

export interface LayerRewardDistribution {
  layerLevel: number;
  rootWallet: string;
  triggeringMemberWallet: string;
  nftLevel: number;
  rewardAmountUsdc: number;
  status: 'claimable' | 'pending' | 'rolled_up';
  reason?: string;
  expiresAt?: string;
  rollUpTarget?: string;
}

export interface RewardDistributionResult {
  success: boolean;
  distributions: LayerRewardDistribution[];
  error?: string;
}

/**
 * 获取用户当前的 NFT 等级
 */
async function getUserCurrentLevel(walletAddress: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('current_nft_level')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      console.error('❌ Error fetching user level:', error);
      return 0;
    }

    return data?.current_nft_level || 0;
  } catch (error) {
    console.error('❌ Failed to get user level:', error);
    return 0;
  }
}

/**
 * 获取用户的直推人数
 */
async function getUserDirectReferrals(walletAddress: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('referrer_wallet')
      .eq('referrer_wallet', walletAddress);

    if (error) {
      console.error('❌ Error fetching direct referrals:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('❌ Failed to get direct referrals:', error);
    return 0;
  }
}

/**
 * 检查层级 1 特殊升级规则
 */
async function checkLayer1SpecialRules(walletAddress: string, requiredLevel: number): Promise<{ qualified: boolean; reason?: string }> {
  // 获取 Layer 1 的规则
  const layerRule = await getLayerRuleFromDB(1);
  
  if (!layerRule || !layerRule.has_special_upgrade_rule) {
    return { qualified: true };
  }

  // 如果需要级别 2，检查特殊规则
  if (requiredLevel === 2) {
    const directReferrals = await getUserDirectReferrals(walletAddress);
    const requiredReferrals = layerRule.direct_referrals_needed || 3;
    
    if (directReferrals <= requiredReferrals) {
      return { 
        qualified: false, 
        reason: `需要超过 ${requiredReferrals} 个直推人数 (当前: ${directReferrals}个)` 
      };
    }
  }

  return { qualified: true };
}

/**
 * 获取矩阵中用户的上级钱包地址（按层级排序）
 */
async function getMatrixUplines(memberWallet: string): Promise<Array<{ wallet: string; layer: number }>> {
  try {
    // 查询该用户的矩阵结构，获取上级信息
    const { data, error } = await supabase
      .from('matrix_members')
      .select(`
        matrix_root,
        matrix_layer,
        matrix_placement_id
      `)
      .eq('member_wallet', memberWallet)
      .order('matrix_layer', { ascending: true });

    if (error) {
      console.error('❌ Error fetching matrix uplines:', error);
      return [];
    }

    // 构建上级列表
    const uplines: Array<{ wallet: string; layer: number }> = [];
    
    if (data && data.length > 0) {
      // 添加直接根节点（Layer 1）
      const firstEntry = data[0];
      if (firstEntry.matrix_root && firstEntry.matrix_root !== memberWallet) {
        uplines.push({ wallet: firstEntry.matrix_root, layer: 1 });
      }

      // 基于矩阵层级结构添加更高层级的上级
      // 这里需要根据实际的矩阵表结构来实现
      // 简化版本：假设每个层级都有明确的上级关系
    }

    return uplines;
  } catch (error) {
    console.error('❌ Failed to get matrix uplines:', error);
    return [];
  }
}

/**
 * 分发层级奖励的主要逻辑
 */
export async function distributeLayerRewards(
  claimerWallet: string,
  claimedLevel: number,
  nftPriceUsdc: number,
  transactionHash?: string
): Promise<RewardDistributionResult> {
  try {
    console.log(`🎁 Starting layer reward distribution for ${claimerWallet} claiming level ${claimedLevel}`);
    
    const distributions: LayerRewardDistribution[] = [];
    
    // 获取该用户的上级列表
    const uplines = await getMatrixUplines(claimerWallet);
    
    if (uplines.length === 0) {
      console.log('⚠️ No uplines found, skipping reward distribution');
      return { success: true, distributions: [] };
    }

    // 为每个层级分发奖励
    for (const upline of uplines) {
      const { wallet: rootWallet, layer } = upline;
      
      // 获取根用户的当前等级
      const rootCurrentLevel = await getUserCurrentLevel(rootWallet);
      
      console.log(`📊 Checking reward eligibility: root=${rootWallet}, rootLevel=${rootCurrentLevel}, requiredLevel=${claimedLevel}, layer=${layer}`);
      
      // 基本条件：根用户等级必须 >= 被声明的等级
      if (rootCurrentLevel >= claimedLevel) {
        // 检查 Layer 1 的特殊规则（如果适用）
        const layer1Check = await checkLayer1SpecialRules(rootWallet, claimedLevel);
        
        if (layer1Check.qualified) {
          // 符合条件：状态为 claimable
          const distribution: LayerRewardDistribution = {
            layerLevel: layer,
            rootWallet,
            triggeringMemberWallet: claimerWallet,
            nftLevel: claimedLevel,
            rewardAmountUsdc: nftPriceUsdc, // NFT 价格作为奖励
            status: 'claimable',
            reason: '符合条件，可立即领取'
          };
          
          distributions.push(distribution);
          
          // 创建 reward_claims 记录
          await createRewardClaim(distribution, transactionHash);
          
        } else {
          // 不符合条件：状态为 pending，启动 72 小时计时器
          const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72小时后
          
          const distribution: LayerRewardDistribution = {
            layerLevel: layer,
            rootWallet,
            triggeringMemberWallet: claimerWallet,
            nftLevel: claimedLevel,
            rewardAmountUsdc: nftPriceUsdc,
            status: 'pending',
            reason: layer1Check.reason || '等待特殊升级要求满足',
            expiresAt
          };
          
          distributions.push(distribution);
          
          // 创建 pending reward_claims 记录
          await createRewardClaim(distribution, transactionHash);
          
          // 启动 72 小时计时器（通过数据库触发器或定时任务处理）
          await scheduleRollUpTimer(distribution);
        }
      } else {
        // 等级不足：状态为 pending，启动 72 小时计时器
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
        
        const distribution: LayerRewardDistribution = {
          layerLevel: layer,
          rootWallet,
          triggeringMemberWallet: claimerWallet,
          nftLevel: claimedLevel,
          rewardAmountUsdc: nftPriceUsdc,
          status: 'pending',
          reason: `根用户等级不足 (当前: ${rootCurrentLevel}, 需要: ${claimedLevel})`,
          expiresAt
        };
        
        distributions.push(distribution);
        
        // 创建 pending reward_claims 记录
        await createRewardClaim(distribution, transactionHash);
        
        // 启动 72 小时计时器
        await scheduleRollUpTimer(distribution);
      }
    }
    
    console.log(`✅ Layer reward distribution completed. Created ${distributions.length} reward entries.`);
    
    return { success: true, distributions };
    
  } catch (error) {
    console.error('❌ Error in layer reward distribution:', error);
    return { 
      success: false, 
      distributions: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 创建奖励声明记录
 */
async function createRewardClaim(distribution: LayerRewardDistribution, transactionHash?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('reward_claims')
      .insert({
        root_wallet: distribution.rootWallet,
        triggering_member_wallet: distribution.triggeringMemberWallet,
        layer: distribution.layerLevel,
        nft_level: distribution.nftLevel,
        reward_amount_usdc: distribution.rewardAmountUsdc,
        status: distribution.status,
        expires_at: distribution.expiresAt || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        triggering_transaction_hash: transactionHash,
        metadata: {
          reason: distribution.reason,
          created_by: 'layer_reward_service'
        }
      });

    if (error) {
      console.error('❌ Error creating reward claim:', error);
      throw error;
    }
    
    console.log(`📝 Created reward claim for ${distribution.rootWallet} (${distribution.status})`);
  } catch (error) {
    console.error('❌ Failed to create reward claim:', error);
    throw error;
  }
}

/**
 * 安排 72 小时后的 roll-up 计时器
 */
async function scheduleRollUpTimer(distribution: LayerRewardDistribution): Promise<void> {
  try {
    // 创建奖励通知记录，用于跟踪计时器
    const { error } = await supabase
      .from('reward_notifications')
      .insert({
        wallet_address: distribution.rootWallet,
        notification_type: 'rollup_timer',
        message: `奖励将在72小时后自动上卷: ${distribution.rewardAmountUsdc} USDC`,
        countdown_hours: 72,
        metadata: {
          triggering_member: distribution.triggeringMemberWallet,
          nft_level: distribution.nftLevel,
          layer: distribution.layerLevel,
          expires_at: distribution.expiresAt,
          reason: distribution.reason
        }
      });

    if (error) {
      console.error('❌ Error creating rollup timer:', error);
      throw error;
    }
    
    console.log(`⏰ Scheduled 72h rollup timer for ${distribution.rootWallet}`);
  } catch (error) {
    console.error('❌ Failed to schedule rollup timer:', error);
  }
}

/**
 * 执行过期奖励的上卷逻辑
 */
export async function processExpiredRewards(): Promise<void> {
  try {
    console.log('🔄 Processing expired rewards...');
    
    // 查找所有过期的 pending 奖励
    const { data: expiredRewards, error } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('❌ Error fetching expired rewards:', error);
      return;
    }

    if (!expiredRewards || expiredRewards.length === 0) {
      console.log('✅ No expired rewards to process');
      return;
    }

    console.log(`📋 Found ${expiredRewards.length} expired rewards to roll up`);

    for (const reward of expiredRewards) {
      await rollUpReward(reward);
    }
    
  } catch (error) {
    console.error('❌ Error processing expired rewards:', error);
  }
}

/**
 * 将单个奖励上卷到符合条件的上级
 */
async function rollUpReward(reward: any): Promise<void> {
  try {
    console.log(`📈 Rolling up reward for ${reward.root_wallet} to next qualified upline`);
    
    // 获取当前根用户的上级
    const uplines = await getMatrixUplines(reward.root_wallet);
    
    // 找到第一个符合条件的上级
    for (const upline of uplines) {
      const uplineLevel = await getUserCurrentLevel(upline.wallet);
      const layer1Check = await checkLayer1SpecialRules(upline.wallet, reward.nft_level);
      
      if (uplineLevel >= reward.nft_level && layer1Check.qualified) {
        // 找到了符合条件的上级，执行上卷
        await executeRollUp(reward, upline.wallet);
        return;
      }
    }
    
    // 如果没有找到符合条件的上级，标记为系统回收
    console.log(`⚠️ No qualified upline found for reward ${reward.id}, marking as system rollback`);
    
    await supabase
      .from('reward_claims')
      .update({
        status: 'rolled_up',
        rolled_up_to_wallet: 'system',
        rolled_up_at: new Date().toISOString(),
        metadata: {
          ...reward.metadata,
          rollup_reason: '无符合条件的上级，系统回收'
        }
      })
      .eq('id', reward.id);
      
  } catch (error) {
    console.error(`❌ Error rolling up reward ${reward.id}:`, error);
  }
}

/**
 * 执行实际的上卷操作
 */
async function executeRollUp(originalReward: any, targetWallet: string): Promise<void> {
  try {
    // 更新原始奖励记录
    await supabase
      .from('reward_claims')
      .update({
        status: 'rolled_up',
        rolled_up_to_wallet: targetWallet,
        rolled_up_at: new Date().toISOString(),
        metadata: {
          ...originalReward.metadata,
          rollup_reason: '上卷到符合条件的上级'
        }
      })
      .eq('id', originalReward.id);

    // 为目标钱包创建新的可领取奖励
    await supabase
      .from('reward_claims')
      .insert({
        root_wallet: targetWallet,
        triggering_member_wallet: originalReward.triggering_member_wallet,
        layer: originalReward.layer + 1, // 上卷到更高层级
        nft_level: originalReward.nft_level,
        reward_amount_usdc: originalReward.reward_amount_usdc,
        status: 'claimable',
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        triggering_transaction_hash: originalReward.triggering_transaction_hash,
        metadata: {
          rollup_from: originalReward.root_wallet,
          rollup_from_id: originalReward.id,
          created_by: 'rollup_system'
        }
      });
    
    console.log(`✅ Successfully rolled up reward from ${originalReward.root_wallet} to ${targetWallet}`);
    
  } catch (error) {
    console.error(`❌ Error executing rollup to ${targetWallet}:`, error);
    throw error;
  }
}