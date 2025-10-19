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
    queryKey: ['/api/stats/user-referrals', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');

      // Use referrals_stats_view for referral statistics
      const { data: referralStats } = await supabase
        .from('referrals_stats_view')
        .select('*')
        .ilike('referrer_wallet', walletAddress)
        .maybeSingle();

      // Use v_matrix_overview for matrix statistics
      const { data: matrixOverview } = await supabase
        .from('v_matrix_overview')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .maybeSingle();

      // Count ALL team members from members table (recursive downline through referrer_wallet)
      // This gets ALL descendants regardless of depth (not limited by 19-layer matrix constraint)
      const { data: allMembersData, error: membersError } = await supabase
        .from('members')
        .select('wallet_address, referrer_wallet');

      // Build downline tree recursively in JavaScript
      let totalTeamCount = 0;
      if (allMembersData && !membersError) {
        const downlineSet = new Set<string>();
        const findDownline = (rootWallet: string) => {
          allMembersData.forEach(member => {
            if (member.referrer_wallet?.toLowerCase() === rootWallet.toLowerCase() &&
                !downlineSet.has(member.wallet_address.toLowerCase())) {
              downlineSet.add(member.wallet_address.toLowerCase());
              findDownline(member.wallet_address); // Recursive
            }
          });
        };

        findDownline(walletAddress);
        totalTeamCount = downlineSet.size;

        console.log(`📊 Team Size Calculation for ${walletAddress}:`, {
          method: 'recursive referrer tree',
          totalTeamCount,
          totalMembersInDB: allMembersData.length
        });
      } else {
        console.error('Error fetching members for team count:', membersError);
        // Fallback to matrix_referrals count
        const { data: matrixData } = await supabase
          .from('matrix_referrals')
          .select('member_wallet')
          .eq('matrix_root_wallet', walletAddress);
        totalTeamCount = matrixData ? new Set(matrixData.map(r => r.member_wallet)).size : 0;

        console.log(`📊 Team Size Fallback for ${walletAddress}:`, {
          method: 'matrix_referrals',
          totalTeamCount
        });
      }

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
        totalTeamCount: totalTeamCount || 0,
        totalTeamActivated: 0, // TODO: Calculate from recursive tree

        // 矩阵团队统计（19层矩阵内）
        matrixStats: {
          totalMembers: matrixOverview?.total_members || 0,       // 矩阵内总人数
          activeMembers: matrixOverview?.active_members || 0,     // 矩阵内激活人数
          deepestLayer: matrixOverview?.deepest_layer || 0,       // 最深层级
          directReferrals: matrixOverview?.direct_referrals || 0, // Layer 1直推
          spilloverMembers: matrixOverview?.spillover_members || 0 // 滑落成员
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
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
}

// 新增：用户矩阵统计hook
export function useUserMatrixStats() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/stats/user-matrix', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');

      // Use v_matrix_overview for overall statistics
      const { data: matrixOverview } = await supabase
        .from('v_matrix_overview')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .maybeSingle();

      // Use v_matrix_layers_v2 for layer-by-layer statistics (all layers)
      const { data: layerData } = await supabase
        .from('v_matrix_layers_v2')
        .select('*')
        .ilike('root', walletAddress)
        .order('layer');

      // Count ALL unique members via referrer tree (no layer limit)
      const { data: allMembersForCount } = await supabase
        .from('members')
        .select('wallet_address, referrer_wallet');

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
          members: layer.filled,
          positions: [] // positions array not needed from view
        };
        return acc;
      }, {} as Record<number, { members: number; positions: string[] }>);

      return {
        totalLayers: matrixOverview?.deepest_layer || 0,
        layerStats,
        totalMembers: totalMembersAllLayers || 0, // Count all layers, not limited to 19
        matrixData: layerData || [] // Layer data instead of raw matrix data
      };
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}

// 19层递归矩阵详细数据hook
export function useFullMatrixStructure() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/matrix/full-structure', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');

      // 获取完整的19层矩阵结构 - use filtered view to show only direct children per layer
      const { data: fullMatrixData } = await supabase
        .from('v_matrix_direct_children')
        .select(`
          layer_index,
          slot_index,
          slot_num_seq,
          member_wallet,
          parent_wallet,
          member_activation_sequence,
          referral_type,
          placed_at
        `)
        .eq('matrix_root_wallet', walletAddress)
        .order('layer_index, slot_num_seq');

      // 按层级组织数据
      const matrixByLayers = fullMatrixData?.reduce((acc, member) => {
        const layer = member.layer_index;
        if (!acc[layer]) {
          acc[layer] = [];
        }
        acc[layer].push(member);
        return acc;
      }, {} as Record<number, typeof fullMatrixData>) || {};

      // 计算每层统计
      const layerSummary = Object.entries(matrixByLayers).map(([layer, members]) => ({
        layer: parseInt(layer),
        memberCount: members.length,
        maxCapacity: Math.pow(3, parseInt(layer)), // Layer n可容纳3^n个成员
        fillPercentage: (members.length / Math.pow(3, parseInt(layer))) * 100,
        positions: members.map(m => ({
          position: m.slot_index,
          slot_num: m.slot_num_seq,
          wallet: m.member_wallet,
          parent: m.parent_wallet,
          joinedAt: m.placed_at,
          type: m.referral_type
        }))
      }));

      return {
        matrixByLayers,
        layerSummary,
        totalMembers: fullMatrixData?.length || 0,
        totalLayers: Object.keys(matrixByLayers).length,
        fullMatrixData: fullMatrixData || []
      };
    },
    enabled: !!walletAddress,
    staleTime: 3000,
    refetchInterval: 10000,
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
    staleTime: 3000,
    refetchInterval: 8000,
  });
}