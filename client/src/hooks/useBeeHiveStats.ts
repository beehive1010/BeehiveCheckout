import { useQuery } from '@tanstack/react-query';
import { useWallet } from './useWallet';

interface CompanyStats {
  totalMembers: number;
  levelDistribution: Array<{ level: number; count: number }>;
  totalRewards: number;
  pendingRewards: number;
}

interface UserReferralStats {
  directReferralCount: string | number;
  totalTeamCount: number;
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
}

export function useCompanyStats() {
  return useQuery<CompanyStats>({
    queryKey: ['/api/beehive/company-stats'],
    queryFn: async () => {
      const response = await fetch('/api/beehive/company-stats', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch company stats');
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useUserReferralStats() {
  const { walletAddress } = useWallet();

  return useQuery<UserReferralStats>({
    queryKey: ['/api/beehive/user-stats', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/beehive/user-stats/${walletAddress}`, { 
        credentials: 'include',
        headers: { 'x-wallet-address': walletAddress }
      });
      if (!response.ok) throw new Error('Failed to fetch user stats');
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 15000, // 15 seconds
  });
}