/**
 * Matrix V2 API Client
 * Enhanced client for the new 3x3 matrix system - Updated for Supabase Edge Functions
 */
import { supabaseApi } from '../../lib/supabase';

export interface MatrixTreeResponse {
  rootWallet: string;
  rootInfo: {
    username?: string;
    currentLevel: number;
    isActivated: boolean;
    totalDirectReferrals: number;
    totalTeamSize: number;
  };
  maxLayers: number;
  tree: {
    root: string;
    layers: Record<number, Array<{
      memberWallet: string;
      position: 'L' | 'M' | 'R';
      parentWallet: string;
      placementType: 'direct' | 'spillover';
      placedAt: string;
      username?: string;
      currentLevel: number;
      isActivated: boolean;
    }>>;
  };
}

export interface MatrixStatsResponse {
  walletAddress: string;
  totalTeamSize: number;
  directReferrals: number;
  layerCounts: Record<number, number>;
  layerBreakdown: Array<{
    layer: number;
    memberCount: number;
    maxCapacity: number;
    fillPercentage: number;
  }>;
}

export interface LayerMembersResponse {
  rootWallet: string;
  layer: number;
  maxCapacity: number;
  currentCount: number;
  fillPercentage: number;
  availableSlots: number;
  members: Array<{
    memberWallet: string;
    position: 'L' | 'M' | 'R';
    parentWallet: string;
    placementType: 'direct' | 'spillover';
    placedAt: string;
    username?: string;
    currentLevel: number;
    isActivated: boolean;
  }>;
  positionMap: {
    L: any[];
    M: any[];
    R: any[];
  };
}

export interface MatrixSummaryResponse {
  rootWallet: string;
  totalMembers: number;
  activatedMembers: number;
  deepestLayer: number;
  activationRate: number;
  layerSummary: Array<{
    layer: number;
    maxCapacity: number;
    fillCount: number;
    fillPercentage: number;
    availableSlots: number;
    members: Array<{
      walletAddress: string;
      position: 'L' | 'M' | 'R';
      placementType: 'direct' | 'spillover';
      placedAt: string;
      activated: boolean;
    }>;
    positions: {
      L: string | null;
      M: string | null;
      R: string | null;
    };
  }>;
  nextAvailableLayer: number | null;
}

export interface EnhancedMatrixSummaryResponse extends MatrixSummaryResponse {
  performanceMetrics: {
    averageLayerFillRate: number;
    activationRate: number;
    spilloverRate: number;
    growthVelocity: number;
    rewardEfficiency: number;
  };
  cacheStatus: 'fresh' | 'cached';
  lastUpdated: string;
}

export const matrixV2Client = {
  /**
   * Get complete matrix tree for a root wallet
   */
  async getMatrixTree(rootWallet: string, maxLayers: number = 5, walletAddress?: string): Promise<MatrixTreeResponse> {
    try {
      const result = await supabaseApi.getMatrix(walletAddress || rootWallet, rootWallet);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch matrix tree');
      }

      // Transform Supabase response to expected format
      const layerMap: Record<number, any[]> = {};
      result.matrix.members.forEach((member: any) => {
        if (!layerMap[member.layer]) {
          layerMap[member.layer] = [];
        }
        layerMap[member.layer].push({
          memberWallet: member.member_wallet,
          position: member.position,
          parentWallet: member.parent_wallet,
          placementType: member.placement_type,
          placedAt: member.created_at,
          username: member.member_info?.[0]?.username,
          currentLevel: member.member_data?.[0]?.current_level || 0,
          isActivated: member.member_data?.[0]?.is_activated || false
        });
      });

      return {
        rootWallet,
        rootInfo: {
          username: undefined, // TODO: Get from root user data
          currentLevel: result.matrix.stats?.activeMembers || 0,
          isActivated: true,
          totalDirectReferrals: layerMap[1]?.length || 0,
          totalTeamSize: result.matrix.stats?.totalMembers || 0
        },
        maxLayers,
        tree: {
          root: rootWallet,
          layers: layerMap
        }
      };
    } catch (error) {
      console.error('Matrix tree fetch error:', error);
      throw error;
    }
  },

  /**
   * Get matrix statistics for a wallet
   */
  async getMatrixStats(walletAddress: string): Promise<MatrixStatsResponse> {
    try {
      const result = await supabaseApi.getMatrixStats(walletAddress);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch matrix stats');
      }

      // Transform layer summary to layer counts
      const layerCounts: Record<number, number> = {};
      const layerBreakdown: Array<{
        layer: number;
        memberCount: number;
        maxCapacity: number;
        fillPercentage: number;
      }> = [];

      result.stats.layerSummary?.forEach((layer: any) => {
        layerCounts[layer.layer] = layer.member_count || 0;
        layerBreakdown.push({
          layer: layer.layer,
          memberCount: layer.member_count || 0,
          maxCapacity: Math.pow(3, layer.layer), // 3^layer capacity
          fillPercentage: ((layer.member_count || 0) / Math.pow(3, layer.layer)) * 100
        });
      });

      return {
        walletAddress,
        totalTeamSize: result.stats.totalReferrals || 0,
        directReferrals: result.stats.directReferrals || 0,
        layerCounts,
        layerBreakdown
      };
    } catch (error) {
      console.error('Matrix stats fetch error:', error);
      throw error;
    }
  },

  /**
   * Get specific layer members
   */
  async getLayerMembers(rootWallet: string, layer: number, walletAddress?: string): Promise<LayerMembersResponse> {
    try {
      const result = await supabaseApi.getMatrix(walletAddress || rootWallet, rootWallet, layer);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch layer members');
      }

      const layerMembers = result.matrix.members.filter((m: any) => m.layer === layer);
      const maxCapacity = Math.pow(3, layer);
      
      // Create position map
      const positionMap = { L: [], M: [], R: [] };
      const members = layerMembers.map((member: any) => {
        const memberData = {
          memberWallet: member.member_wallet,
          position: member.position as 'L' | 'M' | 'R',
          parentWallet: member.parent_wallet,
          placementType: member.placement_type,
          placedAt: member.created_at,
          username: member.member_info?.[0]?.username,
          currentLevel: member.member_data?.[0]?.current_level || 0,
          isActivated: member.member_data?.[0]?.is_activated || false
        };
        
        if (positionMap[member.position]) {
          positionMap[member.position].push(memberData);
        }
        
        return memberData;
      });

      return {
        rootWallet,
        layer,
        maxCapacity,
        currentCount: layerMembers.length,
        fillPercentage: (layerMembers.length / maxCapacity) * 100,
        availableSlots: maxCapacity - layerMembers.length,
        members,
        positionMap
      };
    } catch (error) {
      console.error('Layer members fetch error:', error);
      throw error;
    }
  },

  /**
   * Place new member in matrix
   */
  async placeMember(memberWallet: string, referrerWallet: string, walletAddress: string): Promise<{
    success: boolean;
    placement: {
      memberWallet: string;
      rootWallet: string;
      layer: number;
      position: 'L' | 'M' | 'R';
      placementType: 'direct' | 'spillover';
      parentWallet: string;
    };
    message: string;
  }> {
    try {
      const result = await supabaseApi.placeMember(
        walletAddress,
        referrerWallet,
        memberWallet,
        referrerWallet,
        'direct'
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to place member');
      }

      return {
        success: true,
        placement: {
          memberWallet: result.placement.memberWallet,
          rootWallet: result.placement.rootWallet,
          layer: result.placement.layer,
          position: result.placement.position,
          placementType: result.placement.placementType,
          parentWallet: memberWallet // Assuming parent is the placer
        },
        message: result.message
      };
    } catch (error) {
      console.error('Place member error:', error);
      throw error;
    }
  },

  /**
   * Get next available positions for a root
   */
  async getNextPositions(rootWallet: string): Promise<{
    nextLayer: number | null;
    availablePositions: string[];
    recommendedPosition: string;
    currentCapacity: number;
    maxCapacity: number;
    fillPercentage: number;
  }> {
    const response = await fetch(`/api/v2/matrix/next-positions/${rootWallet}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get next positions: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get member's position in a specific root's matrix
   */
  async getMemberPosition(memberWallet: string, rootWallet: string): Promise<{
    memberWallet: string;
    rootWallet: string;
    position: {
      layer: number;
      position: 'L' | 'M' | 'R';
      placementType: 'direct' | 'spillover';
      parentWallet: string;
    };
  }> {
    const response = await fetch(`/api/v2/matrix/position/${memberWallet}/${rootWallet}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Member not found in this root\'s matrix');
      }
      throw new Error(`Failed to get member position: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get complete matrix summary for a root
   */
  async getMatrixSummary(rootWallet: string): Promise<MatrixSummaryResponse> {
    const response = await fetch(`/api/v2/matrix/summary/${rootWallet}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get matrix summary: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get enhanced matrix summary with performance metrics
   */
  async getEnhancedMatrixSummary(rootWallet: string, forceRefresh: boolean = false): Promise<EnhancedMatrixSummaryResponse> {
    const url = new URL(`/api/v2/matrix/enhanced-summary/${rootWallet}`, window.location.origin);
    if (forceRefresh) {
      url.searchParams.set('forceRefresh', 'true');
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get enhanced matrix summary: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Refresh matrix summary cache (requires wallet auth)
   */
  async refreshMatrixCache(rootWallet: string, walletAddress: string): Promise<{
    success: boolean;
    refreshed: number;
    rootWallet: string;
    summary: MatrixSummaryResponse;
  }> {
    const response = await fetch(`/api/v2/matrix/refresh-cache/${rootWallet}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wallet-Address': walletAddress
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh matrix cache: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get matrix system health
   */
  async getMatrixHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    statistics: {
      totalMatrixTrees: number;
      totalPlacements: number;
      activePlacements: number;
      systemLoad: string;
    };
    timestamp: string;
  }> {
    const response = await fetch(`/api/v2/matrix/health`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get matrix health: ${response.statusText}`);
    }

    return response.json();
  }
};