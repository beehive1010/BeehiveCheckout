import { useQuery } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { membershipLevels } from '../lib/config/membershipLevels';
import { apiRequest } from '../lib/queryClient';

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
      const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/referral-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({
          action: 'get-referral-stats'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch referral stats`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch referral stats');
      }
      
      // Map backend response to expected format
      const stats = result.stats || {};
      return {
        directReferralCount: stats.direct_referrals || 0,
        totalTeamCount: stats.total_team || 0,
        totalReferrals: stats.direct_referrals || 0,
        totalEarnings: '0',
        monthlyEarnings: '0', 
        pendingCommissions: '0',
        nextPayout: 'TBD',
        currentLevel: 1,
        memberActivated: true,
        matrixLevel: 1,
        positionIndex: 1,
        levelsOwned: [1],
        downlineMatrix: [],
        recentReferrals: []
      };
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    refetchInterval: 10000, // Less frequent polling for better performance
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
      const response = await fetch('/api/stats/user-matrix', {
        headers: { 
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch matrix stats');
      }
      return response.json();
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
      const response = await fetch('/api/stats/user-rewards', {
        headers: { 
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch reward stats');
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 3000,
    refetchInterval: 8000,
  });
}