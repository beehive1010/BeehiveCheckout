import {supabase} from '../supabase';

/**
 * 获取用户的直接推荐人数（基于 referrals 表）
 * 只计算通过该用户推荐链接直接注册的用户（is_direct_referral=true），不包括矩阵安置的溢出用户
 */
export async function getDirectReferralCount(referrerWallet: string): Promise<number> {
  try {
    console.log(`🔍 Fetching direct referrals for wallet: ${referrerWallet}`);

    // Primary: Use referrals_stats_view for optimized referral stats
    const { data, error } = await supabase
      .from('referrals_stats_view')
      .select('direct_referrals')
      .ilike('referrer_wallet', referrerWallet)
      .single();

    if (error) {
      console.error('❌ referrals_stats_view query failed:', error);
      
      // Fallback to direct referrals table query
      console.log('🔄 Falling back to referrals table...');
      
      const { count, error: fallbackError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .ilike('referrer_wallet', referrerWallet)
        .neq('member_wallet', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab');

      if (fallbackError) {
        console.error('❌ referrals fallback failed:', fallbackError);
        return 0;
      }

      const directCount = count || 0;
      console.log(`✅ Direct referral count (referrals fallback) for ${referrerWallet}: ${directCount}`);
      return directCount;
    }

    const directCount = data?.direct_referrals || 0;
    console.log(`✅ Direct referral count from view for ${referrerWallet}: ${directCount}`);
    
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
  
  const qualified = currentCount >= requiredCount;
  const shortage = Math.max(0, requiredCount - currentCount); // 需要多少人才能达标
  
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
    console.log(`🔍 Fetching detailed referral info for: ${referrerWallet}`);
    
    // Primary: Get referral data from referrals table (direct referrals tracking)
    const { data: referralData, error: referralError } = await supabase
      .from('referrals')
      .select(`
        member_wallet,
        referrer_wallet,
        placed_at
      `)
      .ilike('referrer_wallet', referrerWallet)
      .order('placed_at', { ascending: false });

    if (referralError) {
      console.error('❌ Error fetching referrals data:', referralError);
      return [];
    }

    if (!referralData || referralData.length === 0) {
      console.log('📭 No direct referrals found in referrals');
      return [];
    }

    // Get user details from users table for display names
    const walletAddresses = referralData.map(r => r.member_wallet);
    const { data: usersData } = await supabase
      .from('users')
      .select('wallet_address, username')
      .in('wallet_address', walletAddresses);

    // Get activation status from members table
    const { data: membersData } = await supabase
      .from('members')
      .select('wallet_address, current_level, activation_sequence')
      .in('wallet_address', walletAddresses);

    console.log(`✅ Found ${referralData.length} direct referrals, ${membersData?.length || 0} activated`);

    // Combine data with referrals table as primary source
    return referralData.map(referral => {
      const userData = usersData?.find(u => u.wallet_address === referral.member_wallet);
      const memberData = membersData?.find(m => m.wallet_address === referral.member_wallet);
      
      return {
        memberWallet: referral.member_wallet,
        memberName: userData?.username || 'Unknown',
        referredAt: referral.placed_at || 'Unknown',
        isActivated: !!memberData && memberData.current_level > 0,
        memberLevel: memberData?.current_level || 0,
        activationRank: memberData?.activation_sequence || null
      };
    });
  } catch (error) {
    console.error('❌ Failed to get referral details:', error);
    return [];
  }
}