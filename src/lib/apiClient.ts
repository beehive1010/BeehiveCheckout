// Enhanced API Client with Type Safety and Error Handling
import { supabaseApi } from './supabase';
import type { 
  ApiResponse, 
  ApiError,
  AuthResponse,
  NFTUpgradeResponse,
  UpgradePathResponse,
  RewardClaimResponse,
  RewardBalanceResponse,
  MembershipActivationResponse,
  BCCPurchaseResponse,
  MatrixResponse,
  ServiceRequestResponse
} from '../../types/api.types';
import { 
  isApiResponse,
  isSuccessResponse,
  isErrorResponse
} from '../../types/api.types';

// Local ApiException class to avoid import issues
export class ApiException extends Error {
  code: string;
  details?: Record<string, any>;
  status?: number;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
    this.code = error.code;
    this.details = error.details;
    this.status = error.status;
  }
}

class TypedApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  }

  // Generic method for type-safe API calls
  private async makeApiCall<T>(
    endpoint: string, 
    options: RequestInit,
    walletAddress?: string
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (walletAddress) {
      // Preserve original case for wallet addresses as required by specification
      headers['x-wallet-address'] = walletAddress;
    }

    try {
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!isApiResponse(data)) {
        throw new ApiException({
          code: 'INVALID_RESPONSE',
          message: 'Invalid API response format',
          status: response.status,
        });
      }

      if (!response.ok && !data.success) {
        throw new ApiException({
          code: data.error || 'API_ERROR',
          message: data.message || data.error || 'API request failed',
          status: response.status,
          details: data.details ? { details: data.details } : undefined,
        });
      }

      return data;
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }

      throw new ApiException({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
        status: 500,
      });
    }
  }

  // Auth methods with type safety
  async login(walletAddress: string, signature: string, message: string): Promise<AuthResponse> {
    return this.makeApiCall<AuthResponse['data']>('auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        signature,
        message
      })
    }, walletAddress);
  }

  async register(
    walletAddress: string, 
    referrerWallet?: string, 
    username?: string, 
    email?: string
  ): Promise<AuthResponse> {
    return this.makeApiCall<AuthResponse['data']>('auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        referrerWallet,
        username,
        email
      })
    }, walletAddress);
  }

  async getUser(walletAddress: string): Promise<AuthResponse> {
    return this.makeApiCall<AuthResponse['data']>('auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get-user'
      })
    }, walletAddress);
  }

  async activateMembership(walletAddress: string): Promise<MembershipActivationResponse> {
    return this.makeApiCall<MembershipActivationResponse['data']>('auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'activate-membership'
      })
    }, walletAddress);
  }

  // NFT Upgrade methods with type safety
  async getUpgradePath(walletAddress: string): Promise<UpgradePathResponse> {
    return this.makeApiCall<UpgradePathResponse['data']>('nft-upgrades', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get-upgrade-path'
      })
    }, walletAddress);
  }

  async getLevelInfo(walletAddress: string, level?: number): Promise<ApiResponse> {
    return this.makeApiCall('nft-upgrades', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get-level-info',
        level
      })
    }, walletAddress);
  }

  async checkUpgradeEligibility(walletAddress: string, level: number): Promise<ApiResponse> {
    return this.makeApiCall('nft-upgrades', {
      method: 'POST',
      body: JSON.stringify({
        action: 'check-eligibility',
        level
      })
    }, walletAddress);
  }

  async processUpgrade(
    walletAddress: string,
    level: number,
    paymentMethod: string,
    transactionHash?: string,
    network?: string
  ): Promise<NFTUpgradeResponse> {
    return this.makeApiCall<NFTUpgradeResponse['data']>('nft-upgrades', {
      method: 'POST',
      body: JSON.stringify({
        action: 'process-upgrade',
        level,
        paymentMethod,
        transactionHash,
        network
      })
    }, walletAddress);
  }

  // Rewards methods with type safety
  async getRewards(walletAddress: string, level?: number, layer?: number): Promise<ApiResponse> {
    return this.makeApiCall('rewards', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get-rewards',
        level,
        layer
      })
    }, walletAddress);
  }

  async claimReward(walletAddress: string, claimId: string): Promise<RewardClaimResponse> {
    return this.makeApiCall<RewardClaimResponse['data']>('rewards', {
      method: 'POST',
      body: JSON.stringify({
        action: 'claim-reward',
        claim_id: claimId
      })
    }, walletAddress);
  }

  async getRewardBalance(walletAddress: string): Promise<RewardBalanceResponse> {
    return this.makeApiCall<RewardBalanceResponse['data']>('rewards', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get-balance'
      })
    }, walletAddress);
  }

  async getPendingRewards(walletAddress: string): Promise<ApiResponse> {
    return this.makeApiCall('rewards', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get-pending-rewards'
      })
    }, walletAddress);
  }

  // BCC Purchase methods
  async getBccConfig(): Promise<ApiResponse> {
    return this.makeApiCall('bcc-purchase', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get-config'
      })
    });
  }

  async createBccPurchase(
    walletAddress: string,
    amountUSDC: number,
    network: string,
    paymentMethod: string,
    transactionHash?: string,
    bridgeUsed?: boolean
  ): Promise<BCCPurchaseResponse> {
    return this.makeApiCall<BCCPurchaseResponse['data']>('bcc-purchase', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create-purchase',
        amountUSDC,
        network,
        paymentMethod,
        transactionHash,
        bridgeUsed
      })
    }, walletAddress);
  }

  // Matrix methods
  async getMatrix(
    walletAddress: string, 
    rootWallet?: string, 
    layer?: number
  ): Promise<MatrixResponse> {
    return this.makeApiCall<MatrixResponse['data']>('matrix', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get-matrix',
        rootWallet: rootWallet || walletAddress,
        layer
      })
    }, walletAddress);
  }

  async getMatrixStats(walletAddress: string): Promise<ApiResponse> {
    return this.makeApiCall('matrix', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get-matrix-stats'
      })
    }, walletAddress);
  }

  // Service Request methods for NFT services
  async submitServiceRequest(
    walletAddress: string,
    nftId: string,
    requestData: {
      requestTitle: string;
      requestDescription: string;
      urgency: 'low' | 'normal' | 'high';
      contactInfo?: string;
      additionalFiles?: string[];
    }
  ): Promise<ServiceRequestResponse> {
    // This would need a dedicated service-requests edge function
    return this.makeApiCall<ServiceRequestResponse['data']>('service-requests', {
      method: 'POST',
      body: JSON.stringify({
        action: 'submit-request',
        nft_id: nftId,
        ...requestData
      })
    }, walletAddress);
  }

  async getServiceRequests(walletAddress: string, nftId?: string): Promise<ApiResponse> {
    return this.makeApiCall('service-requests', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get-requests',
        nft_id: nftId
      })
    }, walletAddress);
  }

  // Helper methods for error handling
  static isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
    return isSuccessResponse(response);
  }

  static isErrorResponse(response: ApiResponse): response is ApiResponse & { success: false; error: string } {
    return isErrorResponse(response);
  }
}

// Create singleton instance
export const typedApiClient = new TypedApiClient();

// Export for convenience  
export { TypedApiClient };
export type { ApiResponse };