/**
 * Matrix Data Hooks - Direct API calls to Supabase functions
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

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

// Placeholder hook for dashboard data
export const useDashboardV2 = (walletAddress?: string) => {
  const [data, setData] = useState<{
    balance: BalanceData;
    matrix: MatrixStatsData;
    rewards: RewardsData;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      loadDashboardData();
    }
  }, [walletAddress]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call matrix-view function for matrix stats
      const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/matrix-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1MjUwMTYsImV4cCI6MjA0MDEwMTAxNn0.gBWZUvwCJgP1lsVQlZNDsYXDxBEr31QfRtNEgYzS6NA`,
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify({
          action: 'get-layer-stats'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const summary = result.data.summary;
          const layerStats = result.data.layer_stats;

          setData({
            balance: {
              totalBcc: 0, // Placeholder
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
                totalMembers: layer.totalMembers,
                leftMembers: layer.leftMembers,
                middleMembers: layer.middleMembers,
                rightMembers: layer.rightMembers,
                maxCapacity: layer.maxCapacity,
                fillPercentage: layer.fillPercentage,
                activeMembers: layer.activeMembers
              }))
            },
            rewards: {
              claimableAmount: 0, // Placeholder
              pendingAmount: 0,
              claimedAmount: 0,
              totalEarnings: 0
            }
          });
        }
      }
    } catch (error: any) {
      console.error('Dashboard data loading error:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error };
};

// Placeholder hooks
export const useMatrixTreeV2 = (walletAddress?: string, maxLayers: number = 5) => {
  return { data: null, isLoading: false, error: null };
};

export const useBalanceBreakdownV2 = (walletAddress?: string) => {
  return { data: null, isLoading: false, error: null };
};

export const useClaimableRewardsV2 = (walletAddress?: string) => {
  return { data: null, isLoading: false, error: null };
};

export const usePendingRewardsV2 = (walletAddress?: string) => {
  return { data: null, isLoading: false, error: null };
};

export const useRefreshDashboardV2 = () => {
  const refreshAll = async (walletAddress: string) => {
    console.log('Refreshing dashboard data for:', walletAddress);
    // Placeholder implementation
  };

  return { refreshAll };
};

export const useGlobalPoolStatsV2 = () => {
  return { data: null, isLoading: false, error: null };
};