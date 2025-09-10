import { useQuery } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { membershipLevels } from '../lib/config/membershipLevels';
import { apiRequest } from '../lib/queryClient';
import { supabase } from '../lib/supabase';

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
      
      // Get direct referrals count
      const { count: directReferrals } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', walletAddress);

      // Get total team count from matrix placements
      const { count: totalTeam } = await supabase
        .from('individual_matrix_placements')
        .select('*', { count: 'exact', head: true })
        .eq('matrix_owner', walletAddress);

      // Get member's current level and info
      const { data: memberData } = await supabase
        .from('members')
        .select('current_level, levels_owned, activation_rank')
        .eq('wallet_address', walletAddress)
        .single();

      // Get total earnings from layer rewards
      const { data: rewardsData } = await supabase
        .from('layer_rewards')
        .select('amount_usdt')
        .eq('recipient_wallet', walletAddress)
        .eq('is_claimed', true);

      const totalEarnings = rewardsData?.reduce((sum, reward) => sum + (reward.amount_usdt || 0), 0) || 0;

      // Get recent referrals with activation status
      const { data: recentReferralsData } = await supabase
        .from('members')
        .select('wallet_address, created_at, current_level')
        .eq('referrer_wallet', walletAddress)
        .order('created_at', { ascending: false })
        .limit(5);

      const recentReferrals = recentReferralsData?.map(member => ({
        walletAddress: member.wallet_address,
        joinedAt: member.created_at,
        activated: member.current_level > 0
      })) || [];

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
        matrixLevel: memberData?.levels_owned?.length || 1,
        positionIndex: 1,
        levelsOwned: memberData?.levels_owned || [1],
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
      
      // Get matrix placements by layer
      const { data: matrixData } = await supabase
        .from('individual_matrix_placements')
        .select('layer_in_owner_matrix, position_in_layer, member_wallet')
        .eq('matrix_owner', walletAddress)
        .order('layer_in_owner_matrix');

      // Group by layer and count
      const layerStats = matrixData?.reduce((acc, placement) => {
        const layer = placement.layer_in_owner_matrix;
        if (!acc[layer]) {
          acc[layer] = { members: 0, positions: [] };
        }
        acc[layer].members++;
        acc[layer].positions.push(placement.position_in_layer);
        return acc;
      }, {} as Record<number, { members: number; positions: string[] }>) || {};

      return {
        totalLayers: Object.keys(layerStats).length,
        layerStats,
        totalMembers: matrixData?.length || 0
      };
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}

// 新增：用户奖励统计hook
export function useUserRewardStats() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/stats/user-rewards', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      
      // Get all rewards for this wallet
      const { data: rewardsData } = await supabase
        .from('layer_rewards')
        .select('*')
        .eq('recipient_wallet', walletAddress);

      const claimableRewards = rewardsData?.filter(r => r.reward_type === 'layer_reward' && !r.is_claimed) || [];
      const pendingRewards = rewardsData?.filter(r => r.reward_type === 'pending_layer_reward') || [];
      const claimedRewards = rewardsData?.filter(r => r.is_claimed) || [];

      const totalClaimableAmount = claimableRewards.reduce((sum, r) => sum + (r.amount_usdt || 0), 0);
      const totalPendingAmount = pendingRewards.reduce((sum, r) => sum + (r.amount_usdt || 0), 0);
      const totalClaimedAmount = claimedRewards.reduce((sum, r) => sum + (r.amount_usdt || 0), 0);

      return {
        claimableRewards: claimableRewards.length,
        pendingRewards: pendingRewards.length,
        claimedRewards: claimedRewards.length,
        totalClaimableAmount,
        totalPendingAmount,
        totalClaimedAmount,
        recentRewards: rewardsData?.slice(0, 10) || []
      };
    },
    enabled: !!walletAddress,
    staleTime: 3000,
    refetchInterval: 8000,
  });
}