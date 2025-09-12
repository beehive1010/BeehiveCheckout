import { supabase } from '../supabase';

/**
 * 获取用户的直接推荐人数（基于 matrix_stats 视图）
 * 只计算通过该用户推荐链接直接注册的用户，不包括矩阵安置的溢出用户
 */
export async function getDirectReferralCount(referrerWallet: string): Promise<number> {
  try {
    console.log(`🔍 Fetching direct referrals from matrix_stats for wallet: ${referrerWallet}`);
    
    // Use matrix_stats view to get direct referral count (bypasses RLS issues) with exact matching
    const { data, error } = await supabase
      .from('matrix_stats')
      .select('direct_referrals_count')
      .eq('member_wallet', referrerWallet)
      .single();

    if (error) {
      console.error('❌ Error fetching from matrix_stats:', error);
      // Fallback to users table query if matrix_stats fails
      console.log('🔄 Falling back to users table...');
      
      const { count, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', referrerWallet)
        .neq('wallet_address', '0x0000000000000000000000000000000000000001');
      
      if (usersError) {
        console.error('❌ Fallback users query also failed:', usersError);
        return 0;
      }
      
      const directCount = count || 0;
      console.log(`✅ Direct referral count (fallback) for ${referrerWallet}: ${directCount}`);
      return directCount;
    }

    const directCount = data?.direct_referrals_count || 0;
    console.log(`✅ Direct referral count from matrix_stats for ${referrerWallet}: ${directCount}`);
    
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
    console.log(`🔍 Fetching detailed referral info for: ${referrerWallet}`);
    
    // Try to get data from referrals table first (contains matrix placement info)
    const { data: referralData, error: referralError } = await supabase
      .from('referrals')
      .select(`
        member_wallet,
        referrer_wallet,
        placed_at,
        is_active
      `)
      .eq('referrer_wallet', referrerWallet)
      .order('placed_at', { ascending: false });

    if (referralError) {
      console.error('❌ Error fetching from referrals table:', referralError);
    }

    // Get user info and member info using case-insensitive query
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('wallet_address, username, created_at')
      .ilike('referrer_wallet', referrerWallet)
      .neq('wallet_address', '0x0000000000000000000000000000000000000001')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching user details (fallback):', usersError);
      return [];
    }

    if (!usersData || usersData.length === 0) {
      console.log('📭 No direct referrals found');
      return [];
    }

    // Get activation status from members table
    const walletAddresses = usersData.map(u => u.wallet_address);
    const { data: membersData } = await supabase
      .from('members')
      .select('wallet_address, current_level, activation_rank')
      .in('wallet_address', walletAddresses);

    console.log(`✅ Found ${usersData.length} direct referrals, ${membersData?.length || 0} activated`);

    // Combine data
    return usersData.map(user => {
      const memberData = membersData?.find(m => m.wallet_address === user.wallet_address);
      const referralInfo = referralData?.find(r => r.member_wallet === user.wallet_address);
      
      return {
        memberWallet: user.wallet_address,
        memberName: user.username || 'Unknown',
        referredAt: referralInfo?.placed_at || user.created_at,
        isActivated: !!memberData && memberData.current_level > 0,
        memberLevel: memberData?.current_level || 0,
        activationRank: memberData?.activation_rank || null
      };
    });
  } catch (error) {
    console.error('❌ Failed to get referral details:', error);
    return [];
  }
}