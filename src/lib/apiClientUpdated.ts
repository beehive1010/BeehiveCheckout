// Updated API Client for Beehive Platform - Matches All New Edge Functions
import { supabaseApi } from './supabase';

// API Response interfaces matching new edge functions
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}

// NFT Upgrades API responses
export interface NFTLevelInfo {
  level: number;
  price_usdt: number;
  unlock_amount_bcc: number;
  requirements: string[];
  is_active: boolean;
}

export interface NFTEligibilityResponse extends ApiResponse {
  eligible: boolean;
  hasLevel: boolean;
  currentLevel: number;
  targetLevel: number;
  restrictions: string[];
  ownedLevels: number[];
  nextAvailableLevel: number;
  reason: string;
}

export interface NFTUpgradeResponse extends ApiResponse {
  data: {
    nft: {
      success: boolean;
      transactionHash?: string;
      tokenId?: number;
      error?: string;
    };
    rewards?: any;
  };
}

// Enhanced Balance API responses
export interface BccBalanceBreakdown {
  transferable: number;
  locked_rewards: number;
  locked_level_unlock: number;
  locked_staking_rewards: number;
  pending_activation: number;
  total: number;
  breakdown_details: {
    tier_phase: number;
    tier_multiplier: number;
    next_unlock_level?: number;
    next_unlock_amount?: number;
    pending_reward_claims: number;
  };
}

export interface EnhancedBalanceResponse extends ApiResponse {
  balance_breakdown: BccBalanceBreakdown;
  member_info: {
    current_level: number;
    is_activated: boolean;
    levels_owned: number[];
    wallet_address: string;
  };
  tier_info: {
    current_phase: number;
    multiplier: number;
    max_members: number;
    phase_name: string;
  };
}

// Rewards API responses
export interface RewardClaimResponse extends ApiResponse {
  claimed_rewards?: {
    total_amount: number;
    reward_count: number;
    new_balance?: number;
  };
  restriction_type?: string;
  required_level?: number;
  current_level?: number;
}

// Admin Stats responses
export interface AdminDashboardStats {
  overview: {
    total_members: number;
    total_activated: number;
    total_revenue_usdt: number;
    total_pending_rewards: number;
    daily_active_users: number;
    new_registrations_today: number;
  };
  systemHealth: 'healthy' | 'degraded' | 'down';
}

// Performance Monitor responses
export interface SystemHealthMetrics {
  active_connections: number;
  query_queue_size: number;
  cache_hit_ratio: number;
  slow_queries_count: number;
  system_load: number;
  disk_usage_percent: number;
}

export class UpdatedApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  }

  // Generic method for API calls with proper error handling
  public async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    walletAddress?: string
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      ...options.headers as Record<string, string>,
    };

    if (walletAddress) {
      headers['x-wallet-address'] = walletAddress; // Preserve original case
    }

    try {
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown API error'
      };
    }
  }

  // NFT Upgrades API (matches /supabase/functions/nft-upgrades/index.ts)
  async getNFTLevelInfo(level?: number): Promise<ApiResponse<NFTLevelInfo[]>> {
    const params = level ? `?action=get-level-info&level=${level}` : '?action=get-level-info';
    return this.makeRequest(`nft-upgrades${params}`);
  }

  async checkNFTEligibility(walletAddress: string, level: number): Promise<NFTEligibilityResponse> {
    return this.makeRequest(
      `nft-upgrades?action=check-eligibility&level=${level}`,
      { method: 'POST' },
      walletAddress
    );
  }

  async processNFTUpgrade(
    walletAddress: string,
    upgradeData: {
      level: number;
      transactionHash: string;
      payment_amount_usdc: number;
      paymentMethod?: string;
      network?: string;
    }
  ): Promise<NFTUpgradeResponse> {
    return this.makeRequest(
      'nft-upgrades',
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'process-upgrade',
          ...upgradeData
        })
      },
      walletAddress
    );
  }

  async getNFTUpgradeHistory(
    walletAddress: string,
    limit = 20,
    offset = 0
  ): Promise<ApiResponse<any[]>> {
    return this.makeRequest(
      `nft-upgrades?action=get-upgrade-history&limit=${limit}&offset=${offset}`,
      {},
      walletAddress
    );
  }

  // Enhanced Balance API (matches /supabase/functions/balance-enhanced/index.ts)
  async getBalanceBreakdown(walletAddress: string): Promise<EnhancedBalanceResponse> {
    return this.makeRequest(
      'balance-enhanced?action=get-balance-breakdown',
      {},
      walletAddress
    );
  }

  async transferBCC(
    walletAddress: string,
    transferData: {
      recipient_wallet: string;
      amount: number;
      purpose?: string;
    }
  ): Promise<ApiResponse> {
    return this.makeRequest(
      'balance-enhanced?action=transfer-bcc',
      {
        method: 'POST',
        body: JSON.stringify(transferData)
      },
      walletAddress
    );
  }

  async claimLockedRewards(walletAddress: string): Promise<ApiResponse> {
    return this.makeRequest(
      'balance-enhanced?action=claim-locked-rewards',
      { method: 'POST' },
      walletAddress
    );
  }

  async unlockLevelRewards(
    walletAddress: string,
    level: number
  ): Promise<ApiResponse> {
    return this.makeRequest(
      'balance-enhanced?action=unlock-level-rewards',
      {
        method: 'POST',
        body: JSON.stringify({ level })
      },
      walletAddress
    );
  }

  async getBCCUnlockHistory(walletAddress: string): Promise<ApiResponse> {
    return this.makeRequest(
      'balance-enhanced?action=get-unlock-history',
      {},
      walletAddress
    );
  }

  // Rewards API (matches /supabase/functions/rewards/index.ts)
  async claimLayerReward(
    walletAddress: string,
    rewardData: {
      reward_claim_id: string;
      layer: number;
      matrix_position: 'left' | 'right';
    }
  ): Promise<RewardClaimResponse> {
    return this.makeRequest(
      'rewards',
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'claim-reward',
          ...rewardData
        })
      },
      walletAddress
    );
  }

  async getRewardHistory(
    walletAddress: string,
    limit = 50,
    offset = 0
  ): Promise<ApiResponse> {
    return this.makeRequest(
      `rewards?action=get-reward-history&limit=${limit}&offset=${offset}`,
      {},
      walletAddress
    );
  }

  async getClaimableRewards(walletAddress: string): Promise<ApiResponse> {
    return this.makeRequest(
      'rewards?action=get-claimable-rewards',
      {},
      walletAddress
    );
  }

  // Admin Stats API (matches /supabase/functions/admin-stats/index.ts)
  async getAdminDashboardStats(adminToken: string): Promise<ApiResponse<AdminDashboardStats>> {
    return this.makeRequest(
      'admin-stats?action=dashboard-stats',
      {
        headers: {
          'x-admin-token': adminToken
        }
      }
    );
  }

  async getSystemHealth(adminToken: string): Promise<ApiResponse<SystemHealthMetrics>> {
    return this.makeRequest(
      'admin-stats?action=system-health',
      {
        headers: {
          'x-admin-token': adminToken
        }
      }
    );
  }

  async getUserAnalytics(adminToken: string): Promise<ApiResponse> {
    return this.makeRequest(
      'admin-stats?action=user-analytics',
      {
        headers: {
          'x-admin-token': adminToken
        }
      }
    );
  }

  async getNFTAnalytics(adminToken: string): Promise<ApiResponse> {
    return this.makeRequest(
      'admin-stats?action=nft-analytics',
      {
        headers: {
          'x-admin-token': adminToken
        }
      }
    );
  }

  async getRewardsAnalytics(adminToken: string): Promise<ApiResponse> {
    return this.makeRequest(
      'admin-stats?action=rewards-analytics',
      {
        headers: {
          'x-admin-token': adminToken
        }
      }
    );
  }

  // Performance Monitor API (matches /supabase/functions/performance-monitor/index.ts)
  async getPerformanceHealth(adminToken: string): Promise<ApiResponse<SystemHealthMetrics>> {
    return this.makeRequest(
      'performance-monitor?action=system-health',
      {
        headers: {
          'x-admin-token': adminToken
        }
      }
    );
  }

  async getQueryPerformance(adminToken: string): Promise<ApiResponse> {
    return this.makeRequest(
      'performance-monitor?action=query-performance',
      {
        headers: {
          'x-admin-token': adminToken
        }
      }
    );
  }

  async getOptimizationReport(adminToken: string): Promise<ApiResponse> {
    return this.makeRequest(
      'performance-monitor?action=optimization-report',
      {
        headers: {
          'x-admin-token': adminToken
        }
      }
    );
  }

  async refreshDatabaseStats(adminToken: string): Promise<ApiResponse> {
    return this.makeRequest(
      'performance-monitor?action=refresh-statistics',
      {
        method: 'POST',
        headers: {
          'x-admin-token': adminToken
        }
      }
    );
  }

  // Cron Timers API (matches /supabase/functions/cron-timers/index.ts)
  async getCronStatus(adminToken: string): Promise<ApiResponse> {
    return this.makeRequest(
      'cron-timers?action=status',
      {
        headers: {
          'x-admin-token': adminToken
        }
      }
    );
  }

  async processExpiredRewards(adminToken: string): Promise<ApiResponse> {
    return this.makeRequest(
      'cron-timers?action=process-expired',
      {
        method: 'POST',
        headers: {
          'x-admin-token': adminToken
        }
      }
    );
  }

  async getActiveTimers(walletAddress?: string): Promise<ApiResponse> {
    const endpoint = walletAddress 
      ? `cron-timers?action=get-timers&wallet=${walletAddress}`
      : 'cron-timers?action=get-timers';
    
    return this.makeRequest(endpoint);
  }

  // Multi-Chain Payment API methods
  async recordMultiChainPayment(paymentData: {
    transactionHash: string;
    chainId: number;
    amount: number;
    payerAddress: string;
    paymentPurpose: string;
    fees: any;
    status: string;
    level?: number;
    referenceId?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('multi-chain-payment/record', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  async createBridgeRequest(bridgeData: {
    sourceChainId: number;
    targetChainId: number;
    amount: number;
    transactionHash: string;
    payerAddress: string;
    paymentPurpose: string;
    bridgeTransactionId: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('multi-chain-payment/bridge', {
      method: 'POST',
      body: JSON.stringify(bridgeData)
    });
  }

  async getMultiChainTransactions(walletAddress: string): Promise<ApiResponse> {
    return this.makeRequest(`multi-chain-payment/history?wallet=${walletAddress}`);
  }

  async getBridgeStatus(bridgeTransactionId: string): Promise<ApiResponse> {
    return this.makeRequest(`multi-chain-payment/bridge-status?id=${bridgeTransactionId}`);
  }

  // Legacy API methods for backward compatibility
  async authenticateUser(walletAddress: string): Promise<ApiResponse> {
    return this.makeRequest('auth', {
      method: 'POST',
      body: JSON.stringify({ wallet_address: walletAddress })
    });
  }

  async getMatrixData(walletAddress: string): Promise<ApiResponse> {
    return this.makeRequest('matrix', {}, walletAddress);
  }
}

// Create singleton instance
export const updatedApiClient = new UpdatedApiClient();

// Export for backward compatibility
export default updatedApiClient;