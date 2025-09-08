import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { matrixService } from '../lib/supabase/matrixService';

// 用户矩阵层级详情hook
export function useUserMatrixLayers() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['matrix-layers', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const result = await matrixService.getMatrix(walletAddress, walletAddress);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch matrix layers');
      }
      return result.matrix;
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
    queryKey: ['matrix-positions', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const result = await matrixService.findOptimalPosition(walletAddress, walletAddress);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch available positions');
      }
      return result.position;
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
    queryKey: ['matrix-stats', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const result = await matrixService.getMatrixStats(walletAddress);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch matrix statistics');
      }
      return result.stats;
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
      referrerWallet: string;
    }) => {
      if (!walletAddress) throw new Error('Wallet address required');
      return await matrixService.placeMember(
        placementData.memberWallet,
        placementData.referrerWallet,
        walletAddress
      );
    },
    onSuccess: () => {
      // Invalidate related caches
      queryClient.invalidateQueries({ queryKey: ['matrix-layers'] });
      queryClient.invalidateQueries({ queryKey: ['matrix-positions'] });
      queryClient.invalidateQueries({ queryKey: ['matrix-stats'] });
    },
  });
}