/**
 * Matrix V2 API Client
 * Enhanced client for the new 3x3 matrix system - Updated for Supabase Edge Functions
 */
import { apiRequest } from '../../lib/queryClient';

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
      const response = await apiRequest('POST', '/api/matrix/stats', { rootWallet }, walletAddress || rootWallet);
      const result = await response.json();
      
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
      const response = await apiRequest('POST', '/api/matrix/stats', {}, walletAddress);
      const result = await response.json();
      
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
        layerCounts[layer.layer] = layer.memberCount || 0;
        layerBreakdown.push({
          layer: layer.layer,
          memberCount: layer.memberCount || 0,
          maxCapacity: layer.maxCapacity || Math.pow(3, layer.layer),
          fillPercentage: layer.fillPercentage || 0
        });
      });

      return {
        walletAddress,
        totalTeamSize: result.stats.totalTeamSize || 0,
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
      const response = await apiRequest('POST', '/api/matrix/downline', { rootWallet, layer }, walletAddress || rootWallet);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch layer members');
      }

      const layerMembers = result.matrix.members.filter((m: any) => m.layer === layer);
      const maxCapacity = Math.pow(3, layer);
      
      // Create position map
      const positionMap: { L: any[]; M: any[]; R: any[] } = { L: [], M: [], R: [] };
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
        
        const position = member.position as 'L' | 'M' | 'R';
        if (positionMap[position]) {
          positionMap[position].push(memberData);
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
      const response = await apiRequest('POST', '/api/matrix/place', {
        referrerWallet,
        memberWallet,
        placementType: 'direct'
      }, walletAddress);
      const result = await response.json();

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
    try {
      const response = await apiRequest('POST', '/api/matrix/next-positions', { rootWallet }, rootWallet);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get next positions');
      }

      return result.data;
    } catch (error) {
      console.error('Next positions fetch error:', error);
      throw error;
    }
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
    try {
      const response = await apiRequest('POST', '/api/matrix/member-position', { 
        memberWallet, 
        rootWallet 
      }, memberWallet);
      const result = await response.json();
      
      if (!result.success) {
        if (result.error?.includes('not found')) {
          throw new Error('Member not found in this root\'s matrix');
        }
        throw new Error(result.error || 'Failed to get member position');
      }

      return result.data;
    } catch (error) {
      console.error('Member position fetch error:', error);
      throw error;
    }
  },

  /**
   * Get complete matrix summary for a root
   */
  async getMatrixSummary(rootWallet: string): Promise<MatrixSummaryResponse> {
    try {
      const response = await apiRequest('POST', '/api/matrix/summary', { rootWallet }, rootWallet);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get matrix summary');
      }

      return result.data;
    } catch (error) {
      console.error('Matrix summary fetch error:', error);
      throw error;
    }
  },

  /**
   * Get enhanced matrix summary with performance metrics
   */
  async getEnhancedMatrixSummary(rootWallet: string, forceRefresh: boolean = false): Promise<EnhancedMatrixSummaryResponse> {
    try {
      const response = await apiRequest('POST', '/api/matrix/enhanced-summary', { 
        rootWallet,
        forceRefresh 
      }, rootWallet);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get enhanced matrix summary');
      }

      return result.data;
    } catch (error) {
      console.error('Enhanced matrix summary fetch error:', error);
      throw error;
    }
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
    try {
      const response = await apiRequest('POST', '/api/matrix/refresh-cache', { rootWallet }, walletAddress);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to refresh matrix cache');
      }

      return result;
    } catch (error) {
      console.error('Matrix cache refresh error:', error);
      throw error;
    }
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
    try {
      const response = await apiRequest('POST', '/api/matrix/health', {}, undefined);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get matrix health');
      }

      return result.data;
    } catch (error) {
      console.error('Matrix health fetch error:', error);
      throw error;
    }
  }
};