import { useQuery } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { membershipLevels } from '../lib/config/membershipLevels';
import { apiRequest } from '../lib/queryClient';
import { supabase } from '../lib/supabaseClient';

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
      
      // Get direct referrals count using new MasterSpec referrals_new table (URL direct referrals)
      const { count: directReferrals } = await supabase
        .from('referrals_new')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_wallet', walletAddress);

      // Get total team count from matrix_referrals table (all matrix members under this root)
      const { count: totalTeam } = await supabase
        .from('matrix_referrals')
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

      // Get total earnings from layer rewards using correct column names
      const { data: rewardsData } = await supabase
        .from('layer_rewards')
        .select('reward_amount')
        .eq('reward_recipient_wallet', walletAddress)
        .eq('status', 'claimed');

      const totalEarnings = rewardsData?.reduce((sum, reward) => sum + (Number(reward.reward_amount) || 0), 0) || 0;

      // Get recent referrals with activation status using new MasterSpec matrix_referrals table
      const { data: recentReferralsData } = await supabase
        .from('matrix_referrals')
        .select(`
          member_wallet,
          created_at,
          position,
          parent_depth,
          members!matrix_referrals_member_wallet_fkey(current_level)
        `)
        .eq('matrix_root_wallet', walletAddress)
        .eq('parent_depth', 1) // Only direct layer 1 members
        .order('created_at', { ascending: false })
        .limit(5);

      const recentReferrals = recentReferralsData?.map(referral => ({
        walletAddress: referral.member_wallet,
        joinedAt: referral.created_at || new Date().toISOString(),
        activated: (referral.members as any)?.current_level > 0
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
      
      // Get matrix placements by layer using matrix_referrals_tree_view
      const { data: matrixData } = await supabase
        .from('matrix_referrals_tree_view')
        .select('layer, position, member_wallet')
        .eq('matrix_root_wallet', walletAddress)
        .order('layer');

      // Group by layer and count
      const layerStats = matrixData?.reduce((acc, placement) => {
        const layer = placement.layer;
        const position = placement.position;
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
      
      // Get all rewards for this wallet using exact matching
      const { data: rewardsData } = await supabase
        .from('layer_rewards')
        .select('*')
        .eq('recipient_wallet', walletAddress);

      const claimableRewards = rewardsData?.filter(r => !r.is_claimed && r.reward_type === 'layer_reward') || [];
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