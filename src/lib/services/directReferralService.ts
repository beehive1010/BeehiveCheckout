import { supabase } from '../supabase';

/**
 * 获取用户的直接推荐人数（基于 referrals 表）
 * 只计算通过该用户推荐链接直接注册的用户，不包括矩阵安置的溢出用户
 */
export async function getDirectReferralCount(referrerWallet: string): Promise<number> {
  try {
    console.log(`🔍 Fetching direct referrals for wallet: ${referrerWallet}`);
    
    const { data, error } = await supabase
      .from('referrals')
      .select('id', { count: 'exact' })
      .eq('referrer_wallet', referrerWallet)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching direct referrals:', error);
      throw error;
    }

    const count = data?.length || 0;
    console.log(`✅ Direct referral count for ${referrerWallet}: ${count}`);
    
    return count;
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
}> {
  const requiredCount = 3;
  const currentCount = await getDirectReferralCount(walletAddress);
  
  const qualified = currentCount > requiredCount;
  
  return {
    qualified,
    currentCount,
    requiredCount,
    message: qualified 
      ? `您有 ${currentCount} 个直推用户，满足 Level 2 解锁条件`
      : `Level 2 需要超过 ${requiredCount} 个直推用户 (当前: ${currentCount}个)`
  };
}

/**
 * 获取用户的直推用户详细信息
 */
export async function getDirectReferralDetails(referrerWallet: string): Promise<Array<{
  memberWallet: string;
  placedAt: string;
  isActive: boolean;
  activationRank: number | null;
}>> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        member_wallet,
        placed_at,
        is_active,
        activation_rank
      `)
      .eq('referrer_wallet', referrerWallet)
      .eq('is_active', true)
      .order('placed_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching referral details:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Failed to get referral details:', error);
    return [];
  }
}