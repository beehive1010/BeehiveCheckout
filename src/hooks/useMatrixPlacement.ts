import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { apiRequest } from '../lib/queryClient';

// 用户矩阵层级详情hook
export function useUserMatrixLayers() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/matrix/layers', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch('/api/matrix/layers', {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch matrix layers');
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // 30 seconds
  });
}

// 可用安置位置hook
export function useAvailablePositions() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/matrix/available-positions', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch('/api/matrix/available-positions', {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch available positions');
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    refetchInterval: 15000, // More frequent updates for placement opportunities
  });
}

// 最优安置建议hook
export function useOptimalPlacements() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/matrix/optimal-placements', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch('/api/matrix/optimal-placements', {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch optimal placements');
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 8000,
    refetchInterval: 20000,
  });
}

// 安置新成员mutation
export function usePlaceMember() {
  const queryClient = useQueryClient();
  const { walletAddress } = useWallet();

  return useMutation({
    mutationFn: async (placementData: {
      memberWallet: string;
      targetRootWallet: string;
      layer: number;
      position: 'L' | 'M' | 'R';
      placementType: 'direct' | 'spillover';
    }) => {
      return await apiRequest('POST', '/api/matrix/place-member', placementData);
    },
    onSuccess: () => {
      // Invalidate related caches
      queryClient.invalidateQueries({ queryKey: ['/api/matrix/layers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/matrix/available-positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/matrix/optimal-placements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/user-referrals'] });
    },
  });
}