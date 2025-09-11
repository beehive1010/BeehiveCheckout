import { supabase } from '../supabase';

/**
 * 获取用户的直接推荐人数（基于 referrals 表）
 * 只计算通过该用户推荐链接直接注册的用户，不包括矩阵安置的溢出用户
 */
export async function getDirectReferralCount(referrerWallet: string): Promise<number> {
  try {
    console.log(`🔍 Fetching direct referrals for wallet: ${referrerWallet}`);
    
    // Count users who have this wallet as their referrer
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_wallet', referrerWallet)
      .neq('wallet_address', '0x0000000000000000000000000000000000000001');

    if (error) {
      console.error('❌ Error fetching direct referrals:', error);
      throw error;
    }

    const directCount = count || 0;
    console.log(`✅ Direct referral count for ${referrerWallet}: ${directCount}`);
    
    return directCount;
  } catch (error) {
    console.error('❌ Failed to get direct referral count:', error);
    return 0;
  }
}

/**
 * 检查用户是否满足 Level 2 的直推要求
 * Level 2 需要超过 3 个直接推荐用户
 */
export async function checkLevel2DirectReferralRequirement(walletAddress: string): Promise<{
  qualified: boolean;
  currentCount: number;
  requiredCount: number;
  message: string;
  detailedStatus: string;
}> {
  const requiredCount = 3;
  const currentCount = await getDirectReferralCount(walletAddress);
  
  const qualified = currentCount > requiredCount;
  const shortage = Math.max(0, requiredCount + 1 - currentCount); // 需要多少人才能达标
  
  let detailedStatus = '';
  if (qualified) {
    detailedStatus = `✅ 直推人数已达标：${currentCount}/${requiredCount}+ (超出 ${currentCount - requiredCount} 人)`;
  } else {
    detailedStatus = `❌ 直推人数未达标：${currentCount}/${requiredCount}+ (还需 ${shortage} 人)`;
  }
  
  return {
    qualified,
    currentCount,
    requiredCount,
    message: qualified 
      ? `您有 ${currentCount} 个直推用户，满足 Level 2 解锁条件`
      : `Level 2 需要超过 ${requiredCount} 个直推用户 (当前: ${currentCount}个，还需: ${shortage}人)`,
    detailedStatus
  };
}

/**
 * 获取用户的直推用户详细信息
 */
export async function getDirectReferralDetails(referrerWallet: string): Promise<Array<{
  memberWallet: string;
  memberName: string;
  referredAt: string;
  isActivated: boolean;
  memberLevel: number;
  activationRank: number | null;
}>> {
  try {
    // 使用新的直推关系视图
    const { data, error } = await supabase
      .from('direct_referrals_view')
      .select('*')
      .eq('referrer_wallet', referrerWallet)
      .order('referred_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching referral details:', error);
      throw error;
    }

    return (data || []).map(item => ({
      memberWallet: item.member_wallet,
      memberName: item.member_name,
      referredAt: item.referred_at,
      isActivated: item.is_activated,
      memberLevel: item.member_level || 0,
      activationRank: item.activation_rank
    }));
  } catch (error) {
    console.error('❌ Failed to get referral details:', error);
    return [];
  }
}