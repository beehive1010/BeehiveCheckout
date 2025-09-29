/**
 * Matrix Data Hooks - Direct API calls to Supabase functions
 */

import {useQuery} from '@tanstack/react-query';

interface MatrixStatsData {
  totalMembers: number;
  activeMembers: number;
  directReferrals: number;
  deepestLayer: number;
  layerBreakdown: Array<{
    layer: number;
    totalMembers: number;
    leftMembers: number;
    middleMembers: number;
    rightMembers: number;
    maxCapacity: number;
    fillPercentage: number;
    activeMembers: number;
  }>;
  layerCounts: Record<number, number>;
}

interface BalanceData {
  totalBcc: number;
  availableBcc: number;
  totalUsdtEarnings: number;
  availableUsdt: number;
  activationTier: number;
}

interface RewardsData {
  claimableAmount: number;
  pendingAmount: number;
  claimedAmount: number;
  totalEarnings: number;
}

interface PerformanceData {
  spilloverRate: number;
  growthVelocity: number;
  rewardEfficiency: number;
}

interface DashboardData {
  balance: BalanceData;
  matrix: MatrixStatsData;
  rewards: RewardsData;
  performance: PerformanceData;
}

interface BalanceBreakdown {
  bcc: {
    total: number;
    transferable: number;
    restricted: number;
    locked: number;
    breakdown: {
      transferable: { description: string; usage: string };
      restricted: { description: string; usage: string };
      locked: { description: string; usage: string };
    };
  };
  usdt: {
    totalEarned: number;
    availableRewards: number;
    totalWithdrawn: number;
    pendingWithdrawals: number;
  };
  activation: {
    tier: number;
    order: number;
    tierDescription: string;
  };
  metadata: {
    lastUpdated: string;
  };
}

interface LayerReward {
  id: string;
  rewardAmount: number;
  triggerLevel: number;
  layerNumber: number;
  triggerWallet: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
}

interface PendingReward extends LayerReward {
  requiresLevel: number;
  currentRecipientLevel: number;
  unlockCondition: string;
  timeRemaining: string;
}

// Helper function to call Supabase functions
const callSupabaseFunction = async (functionName: string, action: string, walletAddress: string, extraData: any = {}) => {
  const response = await fetch(`https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'x-wallet-address': walletAddress
    },
    body: JSON.stringify({
      action,
      ...extraData
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Function call failed');
  }

  return result.data;
};

// Main dashboard data hook
export const useDashboardV2 = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['dashboard-v2', walletAddress],
    queryFn: async (): Promise<DashboardData> => {
      if (!walletAddress) throw new Error('Wallet address required');

      // Get matrix stats
      const matrixStats = await callSupabaseFunction('matrix-view', 'get-layer-stats', walletAddress);
      const summary = matrixStats.summary || {};
      const layerStats = matrixStats.layer_stats || [];

      // Build layer counts
      const layerCounts: Record<number, number> = {};
      layerStats.forEach((layer: any) => {
        layerCounts[layer.layer] = layer.totalMembers || 0;
      });

      return {
        balance: {
          totalBcc: 0,
          availableBcc: 0,
          totalUsdtEarnings: 0,
          availableUsdt: 0,
          activationTier: 1
        },
        matrix: {
          totalMembers: summary.total_members || 0,
          activeMembers: summary.total_active || 0,
          directReferrals: layerStats.find((l: any) => l.layer === 1)?.totalMembers || 0,
          deepestLayer: summary.deepest_layer || 0,
          layerBreakdown: layerStats.slice(0, 5).map((layer: any) => ({
            layer: layer.layer,
            totalMembers: layer.totalMembers || 0,
            leftMembers: layer.leftMembers || 0,
            middleMembers: layer.middleMembers || 0,
            rightMembers: layer.rightMembers || 0,
            maxCapacity: layer.maxCapacity || Math.pow(3, layer.layer),
            fillPercentage: layer.fillPercentage || 0,
            activeMembers: layer.activeMembers || 0
          })),
          layerCounts
        },
        rewards: {
          claimableAmount: 0,
          pendingAmount: 0,
          claimedAmount: 0,
          totalEarnings: 0
        },
        performance: {
          spilloverRate: 0,
          growthVelocity: 0,
          rewardEfficiency: 0
        }
      };
    },
    enabled: !!walletAddress,
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  });
};

// Matrix tree data hook
export const useMatrixTreeV2 = (walletAddress?: string, maxLayers: number = 19) => {
  return useQuery({
    queryKey: ['matrix-tree-v2', walletAddress, maxLayers],
    queryFn: async () => {
      if (!walletAddress) throw new Error('Wallet address required');
      
      return await callSupabaseFunction('matrix-view', 'get-matrix-tree', walletAddress, {
        maxLayers
      });
    },
    enabled: !!walletAddress,
    staleTime: 30000,
    cacheTime: 300000,
  });
};

// Balance breakdown hook
export const useBalanceBreakdownV2 = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['balance-breakdown-v2', walletAddress],
    queryFn: async (): Promise<BalanceBreakdown> => {
      if (!walletAddress) throw new Error('Wallet address required');
      
      // For now return mock data since we don't have a balance breakdown function
      return {
        bcc: {
          total: 0,
          transferable: 0,
          restricted: 0,
          locked: 0,
          breakdown: {
            transferable: { description: 'Freely transferable BCC tokens', usage: 'Trading, transfers, staking' },
            restricted: { description: 'Restricted BCC tokens', usage: 'Limited use cases only' },
            locked: { description: 'Time-locked BCC tokens', usage: 'Unlocks based on conditions' }
          }
        },
        usdt: {
          totalEarned: 0,
          availableRewards: 0,
          totalWithdrawn: 0,
          pendingWithdrawals: 0
        },
        activation: {
          tier: 1,
          order: 1,
          tierDescription: 'Basic tier member'
        },
        metadata: {
          lastUpdated: new Date().toISOString()
        }
      };
    },
    enabled: !!walletAddress,
    staleTime: 60000,
    cacheTime: 300000,
  });
};

// Claimable rewards hook
export const useClaimableRewardsV2 = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['claimable-rewards-v2', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('Wallet address required');
      
      // For now return empty data since we don't have rewards functions implemented
      return {
        rewards: [] as LayerReward[],
        totalClaimable: 0,
        count: 0,
        currency: 'USDT'
      };
    },
    enabled: !!walletAddress,
    staleTime: 30000,
    cacheTime: 300000,
  });
};

// Pending rewards hook  
export const usePendingRewardsV2 = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['pending-rewards-v2', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('Wallet address required');
      
      // For now return empty data since we don't have rewards functions implemented
      return {
        rewards: [] as PendingReward[],
        totalPending: 0,
        count: 0,
        currency: 'USDT',
        info: {
          unlockRequirement: 'Upgrade to required level',
          timeLimit: '72 hours',
          rollupBehavior: 'Rolls up to qualified upline'
        }
      };
    },
    enabled: !!walletAddress,
    staleTime: 30000,
    cacheTime: 300000,
  });
};

// Dashboard refresh hook
export const useRefreshDashboardV2 = () => {
  const refreshAll = async (walletAddress: string) => {
    // This would invalidate React Query caches to force refresh
    console.log('Dashboard refresh not fully implemented yet for:', walletAddress);
  };

  return { refreshAll };
};

// Global pool stats hook
export const useGlobalPoolStatsV2 = () => {
  return useQuery({
    queryKey: ['global-pool-stats-v2'],
    queryFn: async () => {
      // Return empty data for now
      return null;
    },
    staleTime: 60000,
    cacheTime: 300000,
  });
};