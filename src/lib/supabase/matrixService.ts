import { callEdgeFunction } from '../supabaseClient';

export interface MatrixPlacement {
  memberWallet: string;
  rootWallet: string;
  layer: number;
  position: 'L' | 'M' | 'R';
  placementType: 'direct' | 'spillover';
  parentWallet: string;
}

export interface MatrixStats {
  totalMembers: number;
  directReferrals: number;
  layerCounts: Record<number, number>;
  maxLayer: number;
  activationRate: number;
}

export interface MatrixMember {
  walletAddress: string;
  username?: string;
  layer: number;
  position: string;
  parentWallet?: string;
  isActivated: boolean;
  placementType: 'direct' | 'spillover';
  placedAt: string;
}

/**
 * Matrix Service using Supabase Edge Functions
 * Implements the 3×3 matrix placement algorithm as described in MarketingPlan.md
 */
export const matrixService = {
  /**
   * Place a new member in the matrix system
   * Finds the optimal placement following L→M→R priority and layer spillover rules
   */
  async placeMember(
    memberWallet: string, 
    referrerWallet: string, 
    walletAddress: string
  ): Promise<{
    success: boolean;
    placement?: MatrixPlacement;
    message: string;
  }> {
    try {
      const result = await callEdgeFunction('matrix', {
        action: 'place-member',
        memberWallet: memberWallet.toLowerCase(),
        referrerWallet: referrerWallet.toLowerCase(),
        placementType: 'direct'
      }, walletAddress);

      if (!result.success) {
        throw new Error(result.error || 'Failed to place member in matrix');
      }

      return {
        success: true,
        placement: result.placement,
        message: result.message || 'Member successfully placed in matrix'
      };
    } catch (error: any) {
      console.error('Matrix placement error:', error);
      return {
        success: false,
        message: error.message || 'Failed to place member in matrix'
      };
    }
  },

  /**
   * Get matrix tree structure for a root wallet
   */
  async getMatrix(
    rootWallet: string, 
    walletAddress: string,
    options: { layer?: number; limit?: number } = {}
  ): Promise<{
    success: boolean;
    matrix?: {
      rootWallet: string;
      members: MatrixMember[];
      stats: MatrixStats;
    };
    error?: string;
  }> {
    try {
      const result = await callEdgeFunction('matrix', {
        action: 'get-matrix',
        rootWallet: rootWallet.toLowerCase(),
        layer: options.layer,
        limit: options.limit || 1000
      }, walletAddress);

      return result;
    } catch (error: any) {
      console.error('Get matrix error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch matrix data'
      };
    }
  },

  /**
   * Get matrix statistics for a wallet
   */
  async getMatrixStats(walletAddress: string): Promise<{
    success: boolean;
    stats?: MatrixStats;
    error?: string;
  }> {
    try {
      const result = await callEdgeFunction('matrix', {
        action: 'get-matrix-stats'
      }, walletAddress);

      return result;
    } catch (error: any) {
      console.error('Matrix stats error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch matrix statistics'
      };
    }
  },

  /**
   * Get downline members for a specific layer
   */
  async getDownline(
    rootWallet: string,
    layer: number,
    walletAddress: string
  ): Promise<{
    success: boolean;
    members?: MatrixMember[];
    error?: string;
  }> {
    try {
      const result = await callEdgeFunction('matrix', {
        action: 'get-downline',
        rootWallet: rootWallet.toLowerCase(),
        layer
      }, walletAddress);

      return result;
    } catch (error: any) {
      console.error('Get downline error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch downline members'
      };
    }
  },

  /**
   * Get upline path for a member
   */
  async getUpline(walletAddress: string): Promise<{
    success: boolean;
    upline?: MatrixMember[];
    error?: string;
  }> {
    try {
      const result = await callEdgeFunction('matrix', {
        action: 'get-upline'
      }, walletAddress);

      return result;
    } catch (error: any) {
      console.error('Get upline error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch upline path'
      };
    }
  },

  /**
   * Find optimal placement position for new member
   * Implements the 3×3 matrix algorithm:
   * - Layer 1: max 3 (L, M, R)
   * - Layer 2: max 9 (3²)
   * - Layer N: max 3^N
   */
  async findOptimalPosition(
    referrerWallet: string,
    walletAddress: string
  ): Promise<{
    success: boolean;
    position?: {
      rootWallet: string;
      layer: number;
      position: 'L' | 'M' | 'R';
      parentWallet: string;
      availableSlots: number;
    };
    error?: string;
  }> {
    try {
      const result = await callEdgeFunction('matrix', {
        action: 'find-optimal-position',
        referrerWallet: referrerWallet.toLowerCase()
      }, walletAddress);

      return result;
    } catch (error: any) {
      console.error('Find optimal position error:', error);
      return {
        success: false,
        error: error.message || 'Failed to find optimal matrix position'
      };
    }
  },

  /**
   * Process spillover when direct positions are full
   * Finds next available slot following layer spillover rules
   */
  async processSpillover(
    memberWallet: string,
    originalReferrer: string,
    walletAddress: string
  ): Promise<{
    success: boolean;
    spilloverPlacement?: MatrixPlacement;
    error?: string;
  }> {
    try {
      const result = await callEdgeFunction('matrix', {
        action: 'process-spillover',
        memberWallet: memberWallet.toLowerCase(),
        originalReferrer: originalReferrer.toLowerCase()
      }, walletAddress);

      return result;
    } catch (error: any) {
      console.error('Process spillover error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process matrix spillover'
      };
    }
  },

  /**
   * Trigger Layer 1 reward after successful placement
   * Called after member is placed in matrix to award referrer
   */
  async triggerLayerReward(
    memberWallet: string,
    level: number,
    walletAddress: string
  ): Promise<{
    success: boolean;
    reward?: {
      amount: number;
      currency: 'USDC' | 'BCC';
      rootWallet: string;
      layer: number;
    };
    error?: string;
  }> {
    try {
      // Use the rewards Edge Function for layer rewards
      const result = await callEdgeFunction('rewards', {
        action: 'process-layer-reward',
        memberWallet: memberWallet.toLowerCase(),
        level,
        trigger: 'member-placement'
      }, walletAddress);

      return result;
    } catch (error: any) {
      console.error('Trigger layer reward error:', error);
      return {
        success: false,
        error: error.message || 'Failed to trigger layer reward'
      };
    }
  }
};