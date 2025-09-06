/**
 * Enhanced Dashboard Hook using V2 APIs
 * Provides comprehensive dashboard data with improved performance
 */

import { useQuery } from '@tanstack/react-query';
import { matrixV2Client } from '../api/v2/matrix.client';
import { rewardsV2Client } from '../api/v2/rewards.client';
import { balanceV2Client } from '../api/v2/balance.client';

export interface DashboardV2Data {
  balance: {
    bcc: {
      total: number;
      transferable: number;
      restricted: number;
      locked: number;
    };
    usdt: {
      totalEarned: number;
      availableRewards: number;
      totalWithdrawn: number;
    };
    activationTier: number;
  };
  matrix: {
    totalTeamSize: number;
    directReferrals: number;
    layerCounts: Record<number, number>;
    deepestLayer: number;
    averageLayerFillRate: number;
    activationRate: number;
  };
  rewards: {
    totalEarnings: number;
    claimableAmount: number;
    pendingAmount: number;
    claimedAmount: number;
    claimableCount: number;
    pendingCount: number;
  };
  performance: {
    spilloverRate: number;
    growthVelocity: number;
    rewardEfficiency: number;
  };
}

/**
 * Main dashboard data hook
 */
export const useDashboardV2 = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['dashboard-v2', walletAddress],
    enabled: !!walletAddress,
    queryFn: async (): Promise<DashboardV2Data> => {
      if (!walletAddress) throw new Error('Wallet address required');

      // Fetch all dashboard data concurrently
      const [balanceSummary, matrixStats, rewardsStats, enhancedMatrix] = await Promise.all([
        balanceV2Client.getBalanceSummary(walletAddress),
        matrixV2Client.getMatrixStats(walletAddress),
        rewardsV2Client.getRewardsStats(walletAddress),
        matrixV2Client.getEnhancedMatrixSummary(walletAddress).catch(() => null) // Optional
      ]);

      return {
        balance: {
          bcc: {
            total: balanceSummary.totalBcc,
            transferable: balanceSummary.availableBcc - balanceSummary.totalBcc + balanceSummary.totalBcc, // Calculate from summary
            restricted: 0, // Will be calculated properly
            locked: 0
          },
          usdt: {
            totalEarned: balanceSummary.totalUsdtEarnings,
            availableRewards: balanceSummary.availableUsdt,
            totalWithdrawn: balanceSummary.totalUsdtEarnings - balanceSummary.availableUsdt
          },
          activationTier: balanceSummary.activationTier
        },
        matrix: {
          totalTeamSize: matrixStats.totalTeamSize,
          directReferrals: matrixStats.directReferrals,
          layerCounts: matrixStats.layerCounts,
          deepestLayer: Math.max(...Object.keys(matrixStats.layerCounts).map(Number), 0),
          averageLayerFillRate: enhancedMatrix?.performanceMetrics.averageLayerFillRate || 0,
          activationRate: enhancedMatrix?.performanceMetrics.activationRate || 0
        },
        rewards: {
          totalEarnings: rewardsStats.summary.totalEarnings,
          claimableAmount: rewardsStats.summary.claimableAmount,
          pendingAmount: rewardsStats.summary.pendingAmount,
          claimedAmount: rewardsStats.summary.claimedAmount,
          claimableCount: rewardsStats.counts.claimableRewards,
          pendingCount: rewardsStats.counts.pendingRewards
        },
        performance: {
          spilloverRate: enhancedMatrix?.performanceMetrics.spilloverRate || 0,
          growthVelocity: enhancedMatrix?.performanceMetrics.growthVelocity || 0,
          rewardEfficiency: enhancedMatrix?.performanceMetrics.rewardEfficiency || 0
        }
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    refetchOnWindowFocus: true
  });
};

/**
 * Hook for detailed balance information
 */
export const useBalanceBreakdownV2 = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['balance-breakdown-v2', walletAddress],
    enabled: !!walletAddress,
    queryFn: () => balanceV2Client.getBalanceBreakdown(walletAddress!),
    staleTime: 30000,
    refetchInterval: 60000
  });
};

/**
 * Hook for matrix tree visualization
 */
export const useMatrixTreeV2 = (walletAddress?: string, maxLayers: number = 5) => {
  return useQuery({
    queryKey: ['matrix-tree-v2', walletAddress, maxLayers],
    enabled: !!walletAddress,
    queryFn: () => matrixV2Client.getMatrixTree(walletAddress!, maxLayers),
    staleTime: 60000, // 1 minute for tree data
    refetchInterval: 120000 // Refetch every 2 minutes
  });
};

/**
 * Hook for claimable rewards
 */
export const useClaimableRewardsV2 = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['claimable-rewards-v2', walletAddress],
    enabled: !!walletAddress,
    queryFn: () => rewardsV2Client.getClaimableRewards(walletAddress!),
    staleTime: 30000,
    refetchInterval: 60000
  });
};

/**
 * Hook for pending rewards
 */
export const usePendingRewardsV2 = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['pending-rewards-v2', walletAddress],
    enabled: !!walletAddress,
    queryFn: () => rewardsV2Client.getPendingRewards(walletAddress!),
    staleTime: 30000,
    refetchInterval: 60000
  });
};

/**
 * Hook for withdrawal history
 */
export const useWithdrawalHistoryV2 = (walletAddress?: string, limit: number = 20) => {
  return useQuery({
    queryKey: ['withdrawal-history-v2', walletAddress, limit],
    enabled: !!walletAddress,
    queryFn: () => balanceV2Client.getWithdrawalHistory(walletAddress!, limit),
    staleTime: 60000,
    refetchInterval: 120000
  });
};

/**
 * Hook for global BCC pool stats
 */
export const useGlobalPoolStatsV2 = () => {
  return useQuery({
    queryKey: ['global-pool-stats-v2'],
    queryFn: () => balanceV2Client.getGlobalBccPoolStats(),
    staleTime: 300000, // 5 minutes for global stats
    refetchInterval: 600000 // Refetch every 10 minutes
  });
};

/**
 * Hook for matrix health monitoring
 */
export const useMatrixHealthV2 = () => {
  return useQuery({
    queryKey: ['matrix-health-v2'],
    queryFn: () => matrixV2Client.getMatrixHealth(),
    staleTime: 60000,
    refetchInterval: 120000
  });
};

/**
 * Hook for refreshing all dashboard data
 */
export const useRefreshDashboardV2 = () => {
  const queryClient = useQuery.queryClient;

  const refreshAll = async (walletAddress: string) => {
    // Invalidate all dashboard-related queries
    await queryClient.invalidateQueries({ queryKey: ['dashboard-v2'] });
    await queryClient.invalidateQueries({ queryKey: ['balance-breakdown-v2'] });
    await queryClient.invalidateQueries({ queryKey: ['matrix-tree-v2'] });
    await queryClient.invalidateQueries({ queryKey: ['claimable-rewards-v2'] });
    await queryClient.invalidateQueries({ queryKey: ['pending-rewards-v2'] });
    await queryClient.invalidateQueries({ queryKey: ['withdrawal-history-v2'] });
    
    // Optionally refresh matrix cache on server
    try {
      await matrixV2Client.refreshMatrixCache(walletAddress, walletAddress);
    } catch (error) {
      console.warn('Failed to refresh matrix cache:', error);
    }
  };

  return { refreshAll };
};