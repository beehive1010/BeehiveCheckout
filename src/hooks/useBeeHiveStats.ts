import {useQuery} from '@tanstack/react-query';
import {useWallet} from './useWallet';
import {supabase} from '../lib/supabaseClient';

interface MemberData {
  current_level: number;
  activation_sequence: number;
}

interface UserReferralStats {
  directReferralCount: string | number;
  totalTeamCount: number;
  totalReferrals?: number; // Add missing property
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
  }>; // Add missing property
}


export function useUserReferralStats() {
  const { walletAddress } = useWallet();

  return useQuery<UserReferralStats>({
    queryKey: ['/api/stats/user-referrals', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      
      // Get direct referrals count using referrals table (direct referrals)
      const { count: directReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', walletAddress);

      // Get total team count from referrals table (all matrix members under this root)
      const { count: totalTeam } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('matrix_root_wallet', walletAddress);

      // Get member's current level and info using exact matching
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('current_level, activation_sequence')
        .eq('wallet_address', walletAddress)
        .maybeSingle() as { data: MemberData | null; error: any };

      if (memberError) {
        console.error('Error fetching member data:', memberError);
      }

      // Get total earnings from layer_rewards using correct column names
      const { data: rewardsData } = await supabase
        .from('layer_rewards')
        .select('reward_amount')
        .eq('reward_recipient_wallet', walletAddress)
        .eq('status', 'claimed');

      const totalEarnings = rewardsData?.reduce((sum, reward) => sum + (Number(reward.reward_amount) || 0), 0) || 0;

      // Get recent referrals with activation status - use referrals table directly
      const { data: recentReferralsData } = await supabase
        .from('referrals')
        .select(`
          member_wallet,
          placed_at,
          matrix_position,
          matrix_layer
        `)
        .eq('matrix_root_wallet', walletAddress)
        .eq('matrix_layer', 1) // Only direct layer 1 members
        .order('placed_at', { ascending: false })
        .limit(5);

      // Get activation status for recent referrals
      const recentReferrals = await Promise.all(
        (recentReferralsData || []).map(async (referral) => {
          const { data: memberData } = await supabase
            .from('members')
            .select('current_level')
            .eq('wallet_address', referral.member_wallet)
            .single();

          return {
            walletAddress: referral.member_wallet,
            joinedAt: referral.placed_at || new Date().toISOString(),
            activated: (memberData?.current_level || 0) > 0
          };
        })
      );

      return {
        directReferralCount: directReferrals || 0,
        totalTeamCount: totalTeam || 0,
        totalReferrals: directReferrals || 0,
        totalEarnings: totalEarnings.toString(),
        monthlyEarnings: '0', // TODO: Calculate monthly earnings
        pendingCommissions: '0', // TODO: Calculate pending commissions
        nextPayout: 'TBD',
        currentLevel: memberData?.current_level || 1,
        memberActivated: (memberData?.current_level || 0) > 0,
        matrixLevel: memberData?.current_level || 1,
        positionIndex: memberData?.activation_sequence || 1,
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
      
      // Get matrix placements by layer using referrals table directly
      const { data: matrixData } = await supabase
        .from('referrals')
        .select('matrix_layer, matrix_position, member_wallet, referrer_wallet')
        .eq('matrix_root_wallet', walletAddress)
        .order('matrix_layer');

      // Group by layer and count
      const layerStats = matrixData?.reduce((acc, placement) => {
        const layer = placement.matrix_layer;
        const position = placement.matrix_position;
        if (layer !== null && layer !== undefined && position !== null && position !== undefined) {
          if (!acc[layer]) {
            acc[layer] = { members: 0, positions: [] };
          }
          acc[layer].members++;
          acc[layer].positions.push(position);
        }
        return acc;
      }, {} as Record<number, { members: number; positions: string[] }>) || {};

      return {
        totalLayers: Object.keys(layerStats).length,
        layerStats,
        totalMembers: matrixData?.length || 0,
        matrixData: matrixData || [] // 原始数据供详细显示
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
      
      // 获取完整的19层矩阵结构
      const { data: fullMatrixData } = await supabase
        .from('referrals')
        .select(`
          matrix_layer,
          matrix_position,
          member_wallet,
          referrer_wallet,
          matrix_activation_sequence,
          is_spillover_placement,
          placed_at
        `)
        .eq('matrix_root_wallet', walletAddress)
        .order('matrix_layer, matrix_position');

      // 按层级组织数据
      const matrixByLayers = fullMatrixData?.reduce((acc, member) => {
        const layer = member.matrix_layer;
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
          position: m.matrix_position,
          wallet: m.member_wallet,
          parent: m.referrer_wallet,
          joinedAt: m.placed_at,
          type: m.is_spillover_placement ? 'spillover' : 'direct'
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