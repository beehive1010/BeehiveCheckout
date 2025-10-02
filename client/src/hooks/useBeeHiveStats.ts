import { useQuery } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { membershipLevels } from '../lib/config/membershipLevels';

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


export function useUserReferralStats() {
  const { walletAddress } = useWallet();

  return useQuery<UserReferralStats>({
    queryKey: ['/api/beehive/user-stats', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/beehive/user-stats/${walletAddress}?t=${Date.now()}`, { 
        credentials: 'include',
        headers: { 
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch user stats: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    },
    enabled: !!walletAddress,
    staleTime: 2000, // 2 seconds for faster updates
    refetchInterval: 3000, // Real-time polling every 3 seconds
    refetchIntervalInBackground: true, // Continue polling when tab is in background
  });
}