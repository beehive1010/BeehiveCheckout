// Server Wallet API Client
// Handles communication with server wallet management edge functions

import { updatedApiClient } from '../apiClientUpdated';

export interface WithdrawalRequest {
  user_wallet: string;
  amount: string;
  target_chain_id: number;
  token_address: string;
  user_signature: string;
  metadata?: Record<string, any>;
}

export interface WithdrawalResponse {
  success: boolean;
  withdrawal?: {
    id: string;
    status: string;
    estimated_completion: string;
    message: string;
  };
  error?: string;
}

export interface ServerWalletBalance {
  chain_id: number;
  token_address: string;
  balance: string;
  decimals: number;
  symbol: string;
  last_updated: string;
  cached: boolean;
}

export interface ServerWalletStatus {
  total_usd_value: string;
  operational_chains: number;
  total_chains: number;
  chains: Array<{
    chain_id: number;
    chain_name: string;
    token_symbol: string;
    balance: string;
    usd_value: string;
    is_operational: boolean;
    last_updated: string;
  }>;
  last_updated: string;
}

export interface WithdrawalHistory {
  id: string;
  user_wallet: string;
  amount: string;
  target_chain_id: number;
  token_address: string;
  transaction_hash?: string;
  status: string;
  created_at: string;
  completed_at?: string;
  gas_fee_usd?: string;
}

export interface GasEstimate {
  gas_limit: string;
  gas_price_usd: string;
  total_fee_usd: number;
  estimated_time_minutes: number;
}

class ServerWalletAPI {
  private baseUrl = '/server-wallet';

  /**
   * Get server wallet balance for specific chain and token
   */
  async getBalance(chainId: number, tokenAddress: string): Promise<{
    success: boolean;
    balance?: ServerWalletBalance;
    error?: string;
  }> {
    try {
      const response = await updatedApiClient.makeRequest(
        `${this.baseUrl}/balance?chain_id=${chainId}&token_address=${tokenAddress}`,
        { method: 'GET' }
      );
      return response;
    } catch (error) {
      console.error('Get server wallet balance failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get overall server wallet status across all chains
   */
  async getStatus(): Promise<{
    success: boolean;
    status?: ServerWalletStatus;
    error?: string;
  }> {
    try {
      const response = await updatedApiClient.makeRequest(
        `${this.baseUrl}/status`,
        { method: 'GET' }
      );
      return response;
    } catch (error) {
      console.error('Get server wallet status failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Submit withdrawal request
   */
  async submitWithdrawal(withdrawalData: WithdrawalRequest): Promise<WithdrawalResponse> {
    try {
      const response = await updatedApiClient.makeRequest(
        `${this.baseUrl}/withdraw`,
        { method: 'POST' },
        withdrawalData
      );
      return response;
    } catch (error) {
      console.error('Submit withdrawal failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Estimate gas fees for withdrawal
   */
  async estimateGas(withdrawalData: Partial<WithdrawalRequest>): Promise<{
    success: boolean;
    estimate?: GasEstimate;
    error?: string;
  }> {
    try {
      const response = await updatedApiClient.makeRequest(
        `${this.baseUrl}/estimate-gas`,
        { method: 'POST' },
        withdrawalData
      );
      return response;
    } catch (error) {
      console.error('Estimate gas failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate withdrawal signature
   */
  async validateSignature(signatureData: {
    user_wallet: string;
    amount: string;
    signature: string;
  }): Promise<{
    success: boolean;
    valid?: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await updatedApiClient.makeRequest(
        `${this.baseUrl}/validate-signature`,
        { method: 'POST' },
        signatureData
      );
      return response;
    } catch (error) {
      console.error('Validate signature failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get withdrawal history for user
   */
  async getWithdrawalHistory(
    userWallet?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    success: boolean;
    withdrawals?: WithdrawalHistory[];
    pagination?: {
      limit: number;
      offset: number;
      total: number;
    };
    error?: string;
  }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (userWallet) {
        params.set('user_wallet', userWallet);
      }

      const response = await updatedApiClient.makeRequest(
        `${this.baseUrl}/withdrawals?${params.toString()}`,
        { method: 'GET' }
      );
      return response;
    } catch (error) {
      console.error('Get withdrawal history failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get supported chains for withdrawals
   */
  async getSupportedChains(): Promise<{
    success: boolean;
    chains?: Array<{
      chain_id: number;
      name: string;
      symbol: string;
      usdc_address: string;
    }>;
    error?: string;
  }> {
    try {
      const response = await updatedApiClient.makeRequest(
        `${this.baseUrl}/supported-chains`,
        { method: 'GET' }
      );
      return response;
    } catch (error) {
      console.error('Get supported chains failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check user withdrawal limits
   */
  async checkWithdrawalLimits(userWallet: string, amountUSD: number): Promise<{
    success: boolean;
    allowed?: boolean;
    reason?: string;
    daily_limit?: number;
    monthly_limit?: number;
    daily_remaining?: number;
    monthly_remaining?: number;
    error?: string;
  }> {
    try {
      // This would be implemented as a separate function call
      // For now, we'll do basic client-side validation
      const maxDaily = 1000;
      const maxMonthly = 10000;

      if (amountUSD > maxDaily) {
        return {
          success: true,
          allowed: false,
          reason: 'daily_limit_exceeded',
          daily_limit: maxDaily,
          monthly_limit: maxMonthly
        };
      }

      return {
        success: true,
        allowed: true,
        daily_limit: maxDaily,
        monthly_limit: maxMonthly,
        daily_remaining: maxDaily - amountUSD,
        monthly_remaining: maxMonthly - amountUSD
      };
    } catch (error) {
      console.error('Check withdrawal limits failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate withdrawal signature request message
   */
  generateSignatureMessage(withdrawalData: {
    user_wallet: string;
    amount: string;
    target_chain_id: number;
    token_address: string;
    nonce?: number;
  }): string {
    const nonce = withdrawalData.nonce || Date.now();
    
    return `Withdraw ${withdrawalData.amount} USDC to chain ${withdrawalData.target_chain_id}\n` +
           `Token: ${withdrawalData.token_address}\n` +
           `Wallet: ${withdrawalData.user_wallet}\n` +
           `Nonce: ${nonce}\n` +
           `Timestamp: ${new Date().toISOString()}`;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: string, decimals: number = 6): string {
    const num = parseFloat(amount);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Validate withdrawal amount
   */
  validateWithdrawalAmount(amount: string): {
    isValid: boolean;
    error?: string;
  } {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return { isValid: false, error: 'Invalid amount' };
    }
    
    if (numAmount < 1) {
      return { isValid: false, error: 'Minimum withdrawal is 1 USDC' };
    }
    
    if (numAmount > 10000) {
      return { isValid: false, error: 'Maximum withdrawal is 10,000 USDC' };
    }
    
    return { isValid: true };
  }

  /**
   * Get withdrawal status color for UI
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'processing':
        return 'text-blue-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
      case 'cancelled':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  }

  /**
   * Get withdrawal status display name
   */
  getStatusDisplayName(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }
}

// Export singleton instance
export const serverWalletAPI = new ServerWalletAPI();

// Export types for use in components
export type {
  WithdrawalRequest,
  WithdrawalResponse,
  ServerWalletBalance,
  ServerWalletStatus,
  WithdrawalHistory,
  GasEstimate
};