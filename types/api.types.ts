// Unified API Response Types for Beehive Platform
// This file defines consistent type interfaces for all API responses

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string;
}

// Auth related types
export interface AuthResponse extends ApiResponse {
  data?: {
    user?: {
      wallet_address: string;
      username?: string;
      email?: string;
      is_activated: boolean;
      current_level?: number;
    };
    session?: {
      access_token: string;
      expires_at: number;
    };
  };
}

// NFT Upgrade related types
export interface NFTLevelInfo {
  level: number;
  tokenId: number;
  priceUSDT: number;
  requiredDirectReferrals: number;
  requiredPreviousLevel: number | null;
  layerRewardsUnlocked: number[];
  levelName: string;
  description: string;
  eligible?: boolean;
  reason?: string;
  requirements?: any;
}

export interface NFTUpgradeResponse extends ApiResponse {
  data?: {
    level: number;
    transaction_hash?: string;
    nft?: {
      success: boolean;
      transactionHash?: string;
      tokenId?: number;
      error?: string;
    };
    rewards?: {
      bcc_transferable: number;
      bcc_locked: number;
      layer_rewards?: any[];
    };
  };
}

export interface UpgradePathResponse extends ApiResponse {
  data?: {
    currentLevel: number;
    directReferrals: number;
    eligibleUpgrades: NFTLevelInfo[];
    futureUpgrades: NFTLevelInfo[];
    summary: {
      maxLayersUnlocked: number;
      totalLevelsRemaining: number;
      nextAvailableLevel?: number;
    };
  };
}

// Rewards related types
export interface RewardClaimResponse extends ApiResponse {
  data?: {
    claim_id: string;
    amount_usdc: number;
    layer: number;
    nft_level: number;
  };
}

export interface RewardBalanceResponse extends ApiResponse {
  data?: {
    wallet_address: string;
    pending_balance_usdc: number;
    claimable_balance_usdc: number;
    total_withdrawn_usdc: number;
    pending_claims_count: number;
    claimable_claims_count: number;
  };
}

// Membership related types
export interface MembershipActivationResponse extends ApiResponse {
  data?: {
    membership_activated: boolean;
    nft_level: number;
    rewards: {
      bcc_transferable: number;
      bcc_locked: number;
    };
    matrix_placement?: {
      position: string;
      upline_wallet: string;
    };
  };
}

// BCC Purchase related types
export interface BCCPurchaseResponse extends ApiResponse {
  data?: {
    order_id: string;
    amount_bcc: number;
    amount_usdc: number;
    transaction_hash?: string;
    status: 'pending' | 'completed' | 'failed';
  };
}

// Matrix related types
export interface MatrixPosition {
  wallet_address: string;
  level: number;
  position: string;
  parent_wallet?: string;
  children: MatrixPosition[];
}

export interface MatrixResponse extends ApiResponse {
  data?: {
    root_wallet: string;
    matrix_data: MatrixPosition[];
    layer: number;
    total_members: number;
  };
}

// Service Request types for NFT services
export interface ServiceRequestResponse extends ApiResponse {
  data?: {
    request_id: string;
    nft_id: string;
    status: 'new_application' | 'processing' | 'awaiting_feedback' | 'completed';
    created_at: string;
    estimated_completion?: string;
  };
}

// Error types for better error handling
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  status?: number;
}

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

// Type guards for runtime type checking
export function isApiResponse<T>(obj: any): obj is ApiResponse<T> {
  return typeof obj === 'object' && obj !== null && typeof obj.success === 'boolean';
}

export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

export function isErrorResponse(response: ApiResponse): response is ApiResponse & { success: false; error: string } {
  return response.success === false && typeof response.error === 'string';
}