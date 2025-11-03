import {useQuery} from '@tanstack/react-query';
import {useWallet} from './useWallet';
import {supabase} from '../lib/supabase';

interface MemberData {
  current_level: number;
  activation_sequence: number;
}

interface UserReferralStats {
  directReferralCount: string | number;

  // 总团队统计（所有层级，通过referrer树计算）
  totalTeamCount: number;              // 所有推荐层级的总人数
  totalTeamActivated?: number;         // 所有层级中激活的人数

  // 矩阵团队统计（19层矩阵内占位）
  matrixStats: {
    totalMembers: number;              // 矩阵内总人数（19层）
    activeMembers: number;             // 矩阵内激活人数（current_level >= 1）
    deepestLayer: number;              // 最深层级
    directReferrals: number;           // Layer 1 直推人数
    spilloverMembers: number;          // 滑落成员数
  };

  totalReferrals?: number;
  totalEarnings: string | number;
  monthlyEarnings: string | number;
  pendingCommissions: string | number;
  nextPayout: string;
  currentLevel: number;
  memberActivated: boolean;
  matrixLevel: number;
  positionIndex: number;
  levelsOwned: number[];
  downlineMatrix: Array<{
    level: number;
    members: number;
    upgraded: number;
    placements: number;
  }>;
  recentReferrals?: Array<{
    walletAddress: string;
    joinedAt: string;
    activated: boolean;
  }>;
}


export function useUserReferralStats() {
  const { walletAddress } = useWallet();

  return useQuery<UserReferralStats>({
    queryKey: ['/api/stats/user-referrals-v3', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');

      console.log('📊 useUserReferralStats - Starting for wallet:', walletAddress);

      try {
        // Use direct fetch for referrals_stats_view to bypass Supabase JS client issues
        console.log('🔍 Direct fetching referrals_stats_view...');

        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const viewUrl = `${SUPABASE_URL}/rest/v1/referrals_stats_view?referrer_wallet=ilike.${walletAddress}&select=*`;

        const fetchPromise = fetch(viewUrl, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          }
        });

        const viewTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('referrals_stats_view timeout')), 15000);
        });

        const response = await Promise.race([fetchPromise, viewTimeout]) as Response;

        let referralStats = null;
        let referralError = null;

        if (response.ok) {
          const dataArray = await response.json();
          referralStats = dataArray && dataArray.length > 0 ? dataArray[0] : null;
          console.log('✅ Referral stats:', referralStats);
        } else {
          referralError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          console.error('❌ Error fetching referral stats:', referralError);
        }

        // Use fn_get_user_total_referral_stats for accurate team statistics
        console.log('🔍 Calling fn_get_user_total_referral_stats...');

        const rpcPromise = supabase
          .rpc('fn_get_user_total_referral_stats', { p_user_wallet: walletAddress })
          .single();

        const rpcTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('RPC fn_get_user_total_referral_stats timeout')), 20000);
        });

        const { data: teamStats, error: teamStatsError } = await Promise.race([
          rpcPromise,
          rpcTimeout
        ]) as any;

        if (teamStatsError) {
          console.error('❌ Error fetching team statistics:', teamStatsError);
          // Continue execution with default values instead of throwing
        } else {
          console.log('✅ Team stats received:', teamStats);
        }

        console.log(`📊 Team Statistics for ${walletAddress}:`, {
          totalTeamMembers: teamStats?.total_team_members || 0,
          activeMatrixMembers: teamStats?.active_matrix_members || 0,
          maxReferralDepth: teamStats?.max_referral_depth || 0,
          maxMatrixDepth: teamStats?.max_matrix_depth || 0,
          beyondMatrix: teamStats?.beyond_matrix_members || 0
        });

        // Use v_referral_statistics for layer-by-layer breakdown
        const { data: matrixOverview } = await supabase
          .from('v_referral_statistics')
          .select('*')
          .ilike('member_wallet', walletAddress)
          .maybeSingle();

        // Get member's current level and info using canonical view
        const { data: memberData, error: memberError } = await supabase
          .from('v_member_overview')
          .select('current_level, wallet_address, is_active')
          .ilike('wallet_address', walletAddress)
          .maybeSingle();

        if (memberError) {
          console.error('Error fetching member data:', memberError);
        }

        // Get reward statistics from canonical view
        const { data: rewardOverview } = await supabase
          .from('v_reward_overview')
          .select('*')
          .ilike('member_id', walletAddress)
          .maybeSingle();

        // Use rewards_stats_view for total earnings
        const { data: rewardStats } = await supabase
          .from('rewards_stats_view')
          .select('*')
          .ilike('wallet_address', walletAddress)
          .maybeSingle();

        const totalEarnings = rewardStats?.total_claimed || 0;

        // Use v_direct_referrals for recent referrals
        const { data: recentReferralsData } = await supabase
          .from('v_direct_referrals')
          .select('*')
          .ilike('referrer_wallet', walletAddress)
          .eq('referral_depth', 1) // Only direct referrals
          .order('referral_date', { ascending: false })
          .limit(5);

        const recentReferrals = (recentReferralsData || []).map((referral) => ({
          walletAddress: referral.referred_wallet,
          joinedAt: referral.referral_date || new Date().toISOString(),
          activated: (referral.referred_level || 0) > 0
        }));

        return {
          directReferralCount: referralStats?.direct_referrals || 0,

          // 总团队统计（所有层级，递归referrer树）
          totalTeamCount: teamStats?.total_team_members || 0,
          totalTeamActivated: teamStats?.active_matrix_members || 0, // 19层矩阵内激活人数

          // 矩阵团队统计（19层矩阵内）
          matrixStats: {
            totalMembers: teamStats?.active_matrix_members || 0,       // 矩阵内总人数（19层）
            activeMembers: teamStats?.active_matrix_members || 0,      // 矩阵内激活人数
            deepestLayer: teamStats?.max_matrix_depth || 0,            // 最深层级
            directReferrals: teamStats?.direct_referrals || 0,         // Layer 1直推
            spilloverMembers: teamStats?.total_spillover || 0          // 滑落成员
          },

          totalReferrals: referralStats?.total_referrals || 0,
          totalEarnings: totalEarnings.toString(),
          monthlyEarnings: '0', // TODO: Calculate monthly earnings
          pendingCommissions: (rewardOverview?.pending_cnt || 0).toString(),
          nextPayout: rewardOverview?.next_expiring_at || 'TBD',
          currentLevel: memberData?.current_level || 1,
          memberActivated: memberData?.is_active || false,
          matrixLevel: memberData?.current_level || 1,
          positionIndex: 1,
          levelsOwned: [memberData?.current_level || 1],
          downlineMatrix: [], // TODO: Calculate downline matrix stats
          recentReferrals
        };
      } catch (error) {
        console.error('💥 Exception in useUserReferralStats:', error);
        throw error;
      }
    },
    enabled: !!walletAddress,
    staleTime: 30000, // 增加到30秒，减少频繁查询
    refetchInterval: 30000, // 30秒刷新一次
    refetchIntervalInBackground: false, // 不在后台刷新，节省资源
    retry: 1, // 失败时只重试一次
  });
}

// 新增：用户矩阵统计hook
export function useUserMatrixStats() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/stats/user-matrix-v2', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');

      console.log('📊 useUserMatrixStats - Starting for wallet:', walletAddress);

      try {
        // Use v_referral_statistics for overall statistics
        console.log('🔍 Querying v_referral_statistics...');
        const matrixOverviewPromise = supabase
          .from('v_referral_statistics')
          .select('*')
          .ilike('member_wallet', walletAddress)
          .maybeSingle();

        const matrixOverviewTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('v_referral_statistics timeout')), 15000);
        });

        const { data: matrixOverview, error: matrixOverviewError } = await Promise.race([
          matrixOverviewPromise,
          matrixOverviewTimeout
        ]) as any;

        if (matrixOverviewError) {
          console.error('❌ Error fetching matrix overview:', matrixOverviewError);
        } else {
          console.log('✅ Matrix overview:', matrixOverview);
        }

        // Use RPC function for layer-by-layer statistics (user's 19 layers)
        console.log('🔍 Calling fn_get_user_layer_stats...');
        const layerDataPromise = supabase
          .rpc('fn_get_user_layer_stats', { p_user_wallet: walletAddress });

        const layerDataTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('fn_get_user_layer_stats timeout')), 15000);
        });

        const { data: layerData, error: layerDataError } = await Promise.race([
          layerDataPromise,
          layerDataTimeout
        ]) as any;

        if (layerDataError) {
          console.error('❌ Error fetching layer stats:', layerDataError);
        } else {
          console.log('✅ Layer stats received:', layerData?.length, 'layers');
        }

        // Count ALL unique members via referrer tree (no layer limit)
        console.log('🔍 Fetching all members for count...');
        const allMembersPromise = supabase
          .from('members')
          .select('wallet_address, referrer_wallet');

        const allMembersTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('members table timeout')), 15000);
        });

        const { data: allMembersForCount, error: allMembersError } = await Promise.race([
          allMembersPromise,
          allMembersTimeout
        ]) as any;

        if (allMembersError) {
          console.error('❌ Error fetching all members:', allMembersError);
        } else {
          console.log('✅ All members fetched:', allMembersForCount?.length);
        }

        // Build downline tree recursively
        let totalMembersAllLayers = 0;
        if (allMembersForCount) {
          const downlineSet = new Set<string>();
          const findDownline = (rootWallet: string) => {
            allMembersForCount.forEach(member => {
              if (member.referrer_wallet?.toLowerCase() === rootWallet.toLowerCase() &&
                  !downlineSet.has(member.wallet_address.toLowerCase())) {
                downlineSet.add(member.wallet_address.toLowerCase());
                findDownline(member.wallet_address);
              }
            });
          };
          findDownline(walletAddress);
          totalMembersAllLayers = downlineSet.size;
        }

        // Transform layer data into the expected format
        const layerStats = (layerData || []).reduce((acc, layer) => {
          acc[layer.layer] = {
            members: layer.filled || 0,  // Use 'filled' from fn_get_user_layer_stats
            positions: [] // positions array not needed from view
          };
          return acc;
        }, {} as Record<number, { members: number; positions: string[] }>);

        return {
          totalLayers: matrixOverview?.max_spillover_layer || 0,
          layerStats,
          totalMembers: totalMembersAllLayers || 0, // Count all layers, not limited to 19
          matrixData: layerData || [] // Layer data instead of raw matrix data
        };
      } catch (error) {
        console.error('💥 Exception in useUserMatrixStats:', error);
        throw error;
      }
    },
    enabled: !!walletAddress,
    staleTime: 30000, // 增加缓存时间
    refetchInterval: 45000, // 45秒刷新一次（这个查询更重）
    retry: 1,
  });
}

// 19层递归矩阵详细数据hook
export function useFullMatrixStructure() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/matrix/full-structure', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');

      // 获取完整的19层矩阵结构 - use fn_get_user_matrix_subtree
      const { data: fullMatrixData, error: matrixError } = await supabase
        .rpc('fn_get_user_matrix_subtree', { p_root_wallet: walletAddress });

      if (matrixError) {
        console.error('Error fetching matrix subtree:', matrixError);
        throw matrixError;
      }

      // Transform data to expected format
      const transformedData = fullMatrixData
        ?.filter(m => m.depth_from_user > 0) // Exclude root
        ?.map(m => ({
          layer: m.layer,
          slot: m.slot,
          member_wallet: m.member_wallet,
          parent_wallet: m.parent_wallet,
          activation_sequence: m.activation_sequence,
          referral_type: m.referral_type,
          activation_time: m.activation_time
        }))
        ?.sort((a, b) => {
          if (a.layer !== b.layer) return a.layer - b.layer;
          return a.activation_sequence - b.activation_sequence;
        }) || [];

      // 按层级组织数据
      const matrixByLayers = transformedData.reduce((acc, member) => {
        const layer = member.layer;
        if (!acc[layer]) {
          acc[layer] = [];
        }
        acc[layer].push(member);
        return acc;
      }, {} as Record<number, typeof transformedData>);

      // 计算每层统计
      const layerSummary = Object.entries(matrixByLayers).map(([layer, members]) => ({
        layer: parseInt(layer),
        memberCount: members.length,
        maxCapacity: Math.pow(3, parseInt(layer)), // Layer n可容纳3^n个成员
        fillPercentage: (members.length / Math.pow(3, parseInt(layer))) * 100,
        positions: members.map(m => ({
          position: m.slot,
          slot_num: m.activation_sequence,
          wallet: m.member_wallet,
          parent: m.parent_wallet,
          joinedAt: m.activation_time,
          type: m.referral_type
        }))
      }));

      return {
        matrixByLayers,
        layerSummary,
        totalMembers: transformedData.length,
        totalLayers: Object.keys(matrixByLayers).length,
        fullMatrixData: transformedData
      };
    },
    enabled: !!walletAddress,
    staleTime: 60000, // 1分钟缓存（矩阵结构变化较慢）
    refetchInterval: 60000,
    retry: 1,
  });
}

// 新增：用户奖励统计hook
export function useUserRewardStats() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/stats/user-rewards', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      
      // Get all rewards for this wallet using exact matching
      const { data: rewardsData } = await supabase
        .from('layer_rewards')
        .select('*')
        .eq('reward_recipient_wallet', walletAddress);

      // 区分 direct rewards (matrix_layer = 0) 和 layer rewards (matrix_layer >= 1)
      const directRewards = rewardsData?.filter(r => r.matrix_layer === 0) || [];
      const layerRewards = rewardsData?.filter(r => r.matrix_layer >= 1) || [];

      const claimableRewards = rewardsData?.filter(r => r.status === 'claimable') || [];
      const pendingRewards = rewardsData?.filter(r => r.status === 'pending') || [];
      const claimedRewards = rewardsData?.filter(r => r.status === 'claimed') || [];

      const claimableDirectRewards = directRewards.filter(r => r.status === 'claimable');
      const claimableLayerRewards = layerRewards.filter(r => r.status === 'claimable');

      const totalClaimableAmount = claimableRewards.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);
      const totalPendingAmount = pendingRewards.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);
      const totalClaimedAmount = claimedRewards.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);

      const directRewardsAmount = directRewards.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);
      const layerRewardsAmount = layerRewards.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);

      return {
        claimableRewards: claimableRewards.length,
        pendingRewards: pendingRewards.length,
        claimedRewards: claimedRewards.length,
        totalClaimableAmount,
        totalPendingAmount,
        totalClaimedAmount,
        // Direct vs Layer rewards breakdown
        directRewards: {
          count: directRewards.length,
          claimableCount: claimableDirectRewards.length,
          totalAmount: directRewardsAmount,
          claimableAmount: claimableDirectRewards.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0)
        },
        layerRewards: {
          count: layerRewards.length,
          claimableCount: claimableLayerRewards.length,
          totalAmount: layerRewardsAmount,
          claimableAmount: claimableLayerRewards.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0)
        },
        recentRewards: rewardsData?.slice(0, 10) || []
      };
    },
    enabled: !!walletAddress,
    staleTime: 30000, // 30秒缓存
    refetchInterval: 30000,
    retry: 1,
  });
}