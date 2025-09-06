/**
 * Balance V2 API Client
 * Enhanced client for the new balance management system
 * Updated to use Supabase Edge Functions
 */

import { apiRequest } from '../../lib/queryClient';

export interface BalanceBreakdown {
  walletAddress: string;
  bcc: {
    transferable: number;
    restricted: number;
    locked: number;
    total: number;
    breakdown: {
      transferable: {
        amount: number;
        description: string;
        usage: string;
      };
      restricted: {
        amount: number;
        description: string;
        usage: string;
      };
      locked: {
        amount: number;
        description: string;
        usage: string;
      };
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
    createdAt: string;
  };
}

export interface BalanceSummary {
  totalBcc: number;
  availableBcc: number;
  availableUsdt: number;
  totalUsdtEarnings: number;
  activationTier: number;
  lastUpdated: string;
}

export interface WithdrawalRequest {
  success: boolean;
  withdrawalId: string;
  requestedAmount: number;
  netAmount: number;
  gasFee: number;
  gasFeePercentage: number;
  targetChain: string;
  estimatedProcessingTime: string;
  status: string;
  message: string;
}

export interface WithdrawalHistoryItem {
  id: string;
  amount: number;
  netAmount: number;
  gasFee: number;
  gasFeePercentage: number;
  targetChain: string;
  targetWalletAddress: string;
  status: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  txHash?: string;
  failureReason?: string;
}

export interface GlobalPoolStats {
  globalPool: {
    totalBccLocked: number;
    totalMembersActivated: number;
    currentTier: number;
  };
  tierBreakdown: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4: number;
  };
  tierInfo: {
    tier1: { range: string; multiplier: string };
    tier2: { range: string; multiplier: string };
    tier3: { range: string; multiplier: string };
    tier4: { range: string; multiplier: string };
  };
}

export const balanceV2Client = {
  /**
   * Get complete balance breakdown
   */
  async getBalanceBreakdown(walletAddress: string): Promise<BalanceBreakdown> {
    const response = await apiRequest('GET', '/api/v2/balance/breakdown', undefined, walletAddress);
    return response.json();
  },

  /**
   * Get simple balance summary (for dashboard)
   */
  async getBalanceSummary(walletAddress: string): Promise<BalanceSummary> {
    const response = await apiRequest('GET', '/api/v2/balance/summary', undefined, walletAddress);
    return response.json();
  },

  /**
   * Request USDT withdrawal
   */
  async requestUsdtWithdrawal(
    amount: number,
    targetChain: string,
    targetWalletAddress: string,
    walletAddress: string
  ): Promise<WithdrawalRequest> {
    const response = await apiRequest('POST', '/api/v2/balance/withdraw', {
      amount,
      targetChain,
      targetWalletAddress
    }, walletAddress);
    return response.json();
  },

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(walletAddress: string, limit: number = 20): Promise<{
    withdrawals: WithdrawalHistoryItem[];
    totalWithdrawals: number;
    pagination: {
      limit: number;
      hasMore: boolean;
    };
  }> {
    const response = await apiRequest('GET', '/api/v2/balance/withdrawals', { limit }, walletAddress);
    return response.json();
  },

  /**
   * Spend BCC (for courses, NFTs, etc.)
   */
  async spendBcc(
    amount: number,
    purpose: string,
    walletAddress: string,
    bucketPreference: 'transferable' | 'restricted' | 'auto' = 'auto'
  ): Promise<{
    success: boolean;
    amountSpent: number;
    bucketUsed: string;
    purpose: string;
    newBalance: {
      totalBcc: number;
      transferable: number;
      restricted: number;
      locked: number;
    };
    message: string;
  }> {
    const response = await apiRequest('POST', '/api/v2/balance/spend-bcc', {
      amount,
      purpose,
      bucketPreference
    }, walletAddress);
    return response.json();
  },

  /**
   * Update BCC balance (internal/admin use)
   */
  async updateBccBalance(
    changes: {
      transferable?: number;
      restricted?: number;
      locked?: number;
    },
    reason: string,
    walletAddress: string
  ): Promise<{
    success: boolean;
    changes: {
      transferable: number;
      restricted: number;
      locked: number;
    };
    reason: string;
    newBalance: {
      totalBcc: number;
      transferable: number;
      restricted: number;
      locked: number;
    };
    message: string;
  }> {
    const response = await apiRequest('POST', '/api/v2/balance/update-bcc', {
      changes,
      reason
    }, walletAddress);
    return response.json();
  },

  /**
   * Get global BCC pool statistics
   */
  async getGlobalBccPoolStats(): Promise<GlobalPoolStats> {
    const response = await apiRequest('GET', '/api/v2/balance/global-pool');
    return response.json();
  },

  /**
   * Get balance activity/transaction history
   */
  async getBalanceActivity(
    walletAddress: string,
    limit: number = 50,
    type?: string
  ): Promise<{
    activities: any[]; // Will be populated when activity tracking is implemented
    filters: {
      availableTypes: string[];
      currentFilter: string;
    };
    pagination: {
      limit: number;
      hasMore: boolean;
    };
    message: string;
  }> {
    const params: any = { limit };
    if (type) params.type = type;
    
    const response = await apiRequest('GET', '/api/v2/balance/activity', params, walletAddress);
    return response.json();
  }
};