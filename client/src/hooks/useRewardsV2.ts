import { useQuery } from '@tanstack/react-query';
import { useWallet } from './useWallet';

// V2 奖励相关的类型定义
interface PendingReward {
  id: string;
  currentRecipientWallet: string;
  recipientUsername: string | null;
  originalRecipientWallet: string;
  originalRecipientUsername: string | null;
  rewardAmountUsd: number;
  requiredLevel: number;
  timeoutHours: number;
  createdAt: string;
  expiresAt: string;
  status: string;
  reallocationAttempts: number;
  secondsRemaining: number;
  hoursRemaining: number;
  countdownStatus: 'ACTIVE' | 'EXPIRED';
  countdownDisplay: string;
  triggerWallet: string;
  triggerUsername: string | null;
  triggerLevel: number;
  triggerLayer: number;
  triggerPosition: number;
  triggerPositionName: string;
}

interface ClaimableReward {
  rewardId: string;
  rootWallet: string;
  rootUsername: string | null;
  triggerWallet: string;
  triggerUsername: string | null;
  triggerLevel: number;
  triggerLayer: number;
  triggerPosition: number;
  triggerPositionName: string;
  rewardAmountUsd: number;
  requiredLevel: number;
  qualified: boolean;
  status: string;
  specialRule: string | null;
  createdAt: string;
  hasRequiredNft: boolean;
  daysPending: number;
}

interface RewardSummary {
  walletAddress: string;
  username: string | null;
  memberActivated: boolean;
  currentLevel: number;
  ownedNftLevels: number[];
  pendingRewardsCount: number;
  claimableRewardsCount: number;
  expiredRewardsCount: number;
  pendingRewardsUsd: number;
  claimableRewardsUsd: number;
  totalEarnedUsd: number;
  activeLayerPositions: number;
  globalPosition: number | null;
  matrixLayer: number | null;
  positionInLayer: number | null;
  matrixPositionName: string | null;
}

// 获取用户的待处理奖励（带倒计时）
export function usePendingRewards() {
  const { walletAddress } = useWallet();

  return useQuery<PendingReward[]>({
    queryKey: ['/api/v2/rewards/pending', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/v2/rewards/pending/${walletAddress}`, {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch pending rewards: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 5000, // 5秒缓存（倒计时需要更频繁更新）
    refetchInterval: 10000, // 10秒刷新倒计时
    refetchIntervalInBackground: true,
  });
}

// 获取用户的可领取奖励
export function useClaimableRewards() {
  const { walletAddress } = useWallet();

  return useQuery<ClaimableReward[]>({
    queryKey: ['/api/v2/rewards/claimable', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/v2/rewards/claimable/${walletAddress}`, {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch claimable rewards: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 15000, // 15秒缓存
    refetchInterval: 30000, // 30秒刷新
  });
}

// 获取用户的奖励总结
export function useRewardSummary() {
  const { walletAddress } = useWallet();

  return useQuery<RewardSummary>({
    queryKey: ['/api/v2/rewards/summary', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/v2/rewards/summary/${walletAddress}`, {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch reward summary: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 10000, // 10秒缓存
    refetchInterval: 30000, // 30秒刷新
  });
}

// 领取奖励的mutation hook
export function useClaimReward() {
  const { walletAddress } = useWallet();

  return async (rewardId: string) => {
    if (!walletAddress) throw new Error('No wallet address');
    
    const response = await fetch(`/api/v2/rewards/claim/${rewardId}`, {
      method: 'POST',
      headers: {
        'X-Wallet-Address': walletAddress,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to claim reward');
    }
    
    return response.json();
  };
}