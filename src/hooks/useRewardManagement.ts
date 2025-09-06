import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { updatedApiClient } from '../lib/apiClientUpdated';

// 用户奖励详情hook
export function useUserRewards() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/rewards/user', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await apiRequest('GET', '/api/rewards/user', { 'Cache-Control': 'no-cache' }, walletAddress);
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    refetchInterval: 12000,
  });
}

// 待领取奖励hook
export function useClaimableRewards() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/rewards/claimable', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await updatedApiClient.getClaimableRewards(walletAddress);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch claimable rewards');
      }
      
      return response.data;
    },
    enabled: !!walletAddress,
    staleTime: 3000,
    refetchInterval: 8000, // Frequent updates for real-time claiming
  });
}

// 奖励领取mutation
export function useClaimReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rewardId: string) => {
      return await apiRequest('POST', '/api/rewards/claim', { rewardId });
    },
    onSuccess: () => {
      // Invalidate reward-related caches
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/claimable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/balances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/user-rewards'] });
    },
  });
}

// USDT提现mutation
export function useWithdrawUSDT() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (withdrawalData: {
      amount: number; // Amount in cents
      toAddress?: string;
      memo?: string;
    }) => {
      return await apiRequest('POST', '/api/wallet/withdraw-usdt', withdrawalData);
    },
    onSuccess: () => {
      // Update balance and reward caches
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/balances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/activity'] });
    },
  });
}