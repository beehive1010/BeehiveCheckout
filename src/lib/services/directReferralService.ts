import {supabase} from '../supabase';

/**
 * 获取用户的直接推荐人数（基于 v_direct_referrals view）
 * 只计算通过该用户推荐链接直接注册的用户（referral_depth = 1），不包括矩阵安置的溢出用户
 * 使用 v_direct_referrals view 以提高性能和准确性
 */
export async function getDirectReferralCount(referrerWallet: string): Promise<number> {
  try {
    console.log(`🔍 Fetching direct referrals for wallet: ${referrerWallet}`);

    // Use v_direct_referrals view (filters for referral_depth = 1)
    // This view is based on referrals table which tracks actual referral relationships
    // Use ilike for case-insensitive matching (addresses may not be lowercase in DB)
    const { count, error } = await supabase
      .from('v_direct_referrals')
      .select('*', { count: 'exact', head: true })
      .ilike('referrer_wallet', referrerWallet);

    if (error) {
      console.error('❌ v_direct_referrals view query failed:', error);
      return 0;
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
 * 获取用户的直推用户详细信息（使用 v_direct_referrals view）
 */
export async function getDirectReferralDetails(referrerWallet: string): Promise<Array<{
  memberWallet: string;
  memberName: string;
  referredAt: string;
  isActivated: boolean;
  memberLevel: number;
  activationRank: number | null;
  referralNumber: number;
}>> {
  try {
    console.log(`🔍 Fetching detailed referral info for: ${referrerWallet}`);

    // Use v_direct_referrals view (filters for referral_depth = 1)
    const { data: referralData, error: referralError } = await supabase
      .from('v_direct_referrals')
      .select(`
        referred_wallet,
        referrer_wallet,
        referral_date,
        referred_level,
        referred_activation_time
      `)
      .ilike('referrer_wallet', referrerWallet)
      .order('referral_date', { ascending: false });

    if (referralError) {
      console.error('❌ Error fetching v_direct_referrals data:', referralError);
      return [];
    }

    if (!referralData || referralData.length === 0) {
      console.log('📭 No direct referrals found');
      return [];
    }

    // Get user details from users table for display names
    const walletAddresses = referralData.map(r => r.referred_wallet);
    const { data: usersData } = await supabase
      .from('users')
      .select('wallet_address, username')
      .in('wallet_address', walletAddresses);

    // Get activation sequence from members table
    const { data: membersData } = await supabase
      .from('members')
      .select('wallet_address, current_level, activation_sequence')
      .in('wallet_address', walletAddresses);

    console.log(`✅ Found ${referralData.length} direct referrals, ${membersData?.length || 0} activated`);

    // Combine data with v_direct_referrals view as primary source
    return referralData.map((referral, index) => {
      const userData = usersData?.find(u =>
        u.wallet_address.toLowerCase() === referral.referred_wallet.toLowerCase()
      );
      const memberData = membersData?.find(m =>
        m.wallet_address.toLowerCase() === referral.referred_wallet.toLowerCase()
      );

      return {
        memberWallet: referral.referred_wallet,
        memberName: userData?.username || 'Unknown',
        referredAt: referral.referral_date || 'Unknown',
        isActivated: !!memberData && memberData.current_level > 0,
        memberLevel: memberData?.current_level || referral.referred_level || 0,
        activationRank: memberData?.activation_sequence || null,
        referralNumber: index + 1 // Sequential numbering based on date order
      };
    });
  } catch (error) {
    console.error('❌ Failed to get referral details:', error);
    return [];
  }
}