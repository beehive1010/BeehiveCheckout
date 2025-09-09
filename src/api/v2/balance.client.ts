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
    try {
      const response = await apiRequest('POST', '/api/balance/breakdown', { action: 'get-breakdown' }, walletAddress);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get balance breakdown');
      }

      return result.data;
    } catch (error) {
      console.error('Balance breakdown fetch error:', error);
      throw error;
    }
  },

  /**
   * Get simple balance summary (for dashboard)
   */
  async getBalanceSummary(walletAddress: string): Promise<BalanceSummary> {
    try {
      const response = await apiRequest('POST', '/api/balance/summary', { action: 'get-balance' }, walletAddress);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get balance summary');
      }

      return result.data;
    } catch (error) {
      console.error('Balance summary fetch error:', error);
      throw error;
    }
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
    try {
      const response = await apiRequest('POST', '/api/withdrawal-system/withdraw', {
        action: 'request-withdrawal',
        amount,
        targetChain,
        targetWalletAddress
      }, walletAddress);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to request withdrawal');
      }

      return result.data;
    } catch (error) {
      console.error('USDT withdrawal request error:', error);
      throw error;
    }
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
    try {
      const response = await apiRequest('POST', '/api/withdrawal-system/history', {
        action: 'get-history',
        limit
      }, walletAddress);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get withdrawal history');
      }

      return result.data;
    } catch (error) {
      console.error('Withdrawal history fetch error:', error);
      throw error;
    }
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
    try {
      const response = await apiRequest('POST', '/api/bcc-purchase/spend', {
        action: 'spend-bcc',
        amount,
        purpose,
        bucketPreference
      }, walletAddress);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to spend BCC');
      }

      return result;
    } catch (error) {
      console.error('BCC spend error:', error);
      throw error;
    }
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
    try {
      const response = await apiRequest('POST', '/api/balance/update', {
        action: 'update-bcc',
        changes,
        reason
      }, walletAddress);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update BCC balance');
      }

      return result;
    } catch (error) {
      console.error('BCC balance update error:', error);
      throw error;
    }
  },

  /**
   * Get global BCC pool statistics
   */
  async getGlobalBccPoolStats(): Promise<GlobalPoolStats> {
    try {
      const response = await apiRequest('POST', '/api/balance/global-stats', { 
        action: 'get-global-pool'
      });
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get global BCC pool stats');
      }

      return result.data;
    } catch (error) {
      console.error('Global BCC pool stats fetch error:', error);
      throw error;
    }
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
    try {
      const params: any = { 
        action: 'get-activity',
        limit
      };
      if (type) params.type = type;
      
      const response = await apiRequest('POST', '/api/balance/activity', params, walletAddress);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get balance activity');
      }

      return result.data;
    } catch (error) {
      console.error('Balance activity fetch error:', error);
      throw error;
    }
  }
};