/**
 * Rewards V2 API Client
 * Enhanced client for the new layer-based rewards system
 * Updated to use Supabase Edge Functions
 */

import { apiRequest } from '../../lib/queryClient';

export interface LayerReward {
  id: string;
  rewardAmount: number; // USDT dollars
  triggerLevel: number;
  layerNumber: number;
  triggerWallet: string;
  status: 'claimable' | 'pending' | 'claimed';
  createdAt: string;
  claimedAt?: string;
  expiresAt?: string;
}

export interface PendingReward extends LayerReward {
  requiresLevel: number;
  currentRecipientLevel: number;
  unlockCondition: string;
  timeRemaining: string;
}

export interface ClaimableRewardsResponse {
  rewards: LayerReward[];
  totalClaimable: number;
  count: number;
  currency: string;
}

export interface PendingRewardsResponse {
  rewards: PendingReward[];
  totalPending: number;
  count: number;
  currency: string;
  info: {
    unlockRequirement: string;
    timeLimit: string;
    rollupBehavior: string;
  };
}

export interface RewardsStatsResponse {
  summary: {
    totalEarnings: number;
    claimableAmount: number;
    pendingAmount: number;
    claimedAmount: number;
    rolledUpAmount: number;
  };
  counts: {
    totalRewards: number;
    claimableRewards: number;
    pendingRewards: number;
    claimedRewards: number;
    rolledUpRewards: number;
  };
  currency: string;
  lastUpdated: string;
}

export interface UpgradeRewardsResponse {
  success: boolean;
  message: string;
  upgradeDetails: {
    memberWallet: string;
    triggerLevel: number;
    upgradeAmount: number;
    rewardsCreated: number;
    totalRewardDistributed: number;
    currency: string;
  };
  rewardBreakdown: Array<{
    recipient: string;
    layer: number;
    amount: number;
    status: string;
    requiresLevel: number;
    expiresAt: string;
  }>;
}

export interface WithdrawalChain {
  id: string;
  name: string;
  symbol: string;
  chainId: number;
  withdrawalFee: number;
  processingTime: string;
  minWithdrawal: number;
  gasToken: string;
}

export const rewardsV2Client = {
  /**
   * Get claimable rewards
   */
  async getClaimableRewards(walletAddress: string): Promise<ClaimableRewardsResponse> {
    const response = await apiRequest('GET', '/api/v2/rewards/claimable', undefined, walletAddress);
    return response.json();
  },

  /**
   * Get pending rewards with timeout info
   */
  async getPendingRewards(walletAddress: string): Promise<PendingRewardsResponse> {
    const response = await apiRequest('GET', '/api/v2/rewards/pending', undefined, walletAddress);
    return response.json();
  },

  /**
   * Claim a specific reward
   */
  async claimReward(rewardId: string, walletAddress: string): Promise<{
    success: boolean;
    amountClaimed: number;
    currency: string;
    message: string;
    txHash: string;
  }> {
    const response = await apiRequest('POST', `/api/v2/rewards/claim/${rewardId}`, {}, walletAddress);
    return response.json();
  },

  /**
   * Get complete reward history
   */
  async getRewardHistory(walletAddress: string, limit: number = 50): Promise<{
    rewards: Array<{
      id: string;
      amount: number;
      triggerLevel: number;
      layerNumber: number;
      triggerWallet: string;
      status: string;
      createdAt: string;
      claimedAt?: string;
      expiresAt?: string;
    }>;
    totalRewards: number;
    pagination: {
      limit: number;
      hasMore: boolean;
    };
  }> {
    const response = await apiRequest('GET', '/api/v2/rewards/history', { limit }, walletAddress);
    return response.json();
  },

  /**
   * Get rewards statistics
   */
  async getRewardsStats(walletAddress: string): Promise<RewardsStatsResponse> {
    const response = await apiRequest('GET', '/api/v2/rewards/stats', undefined, walletAddress);
    return response.json();
  },

  /**
   * Trigger upgrade rewards (for testing/admin)
   */
  async triggerUpgradeRewards(
    memberWallet: string, 
    triggerLevel: number, 
    upgradeAmount: number = 0,
    walletAddress: string
  ): Promise<UpgradeRewardsResponse> {
    const response = await apiRequest('POST', '/api/v2/rewards/trigger-upgrade', {
      memberWallet,
      triggerLevel,
      upgradeAmount
    }, walletAddress);
    return response.json();
  },

  /**
   * Get supported withdrawal chains
   */
  async getWithdrawalChains(walletAddress: string): Promise<{
    supportedChains: WithdrawalChain[];
    defaultChain: string;
    info: {
      feeExplanation: string;
      processingNote: string;
    };
  }> {
    const response = await apiRequest('GET', '/api/v2/rewards/withdrawal-chains', undefined, walletAddress);
    return response.json();
  }
};