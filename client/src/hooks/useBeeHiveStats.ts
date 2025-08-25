import { useQuery } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { membershipLevels } from '../lib/config/membershipLevels';

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
      const response = await fetch('/api/beehive/company-stats', { 
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch company stats: ${response.status} ${response.statusText}`);
      }
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
        headers: { 
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch user stats: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    },
    enabled: !!walletAddress,
    staleTime: 5000, // 5 seconds - shorter for testing
  });
}