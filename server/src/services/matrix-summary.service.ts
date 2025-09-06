import { db } from '../../db';
import { 
  memberReferralTree, 
  memberMatrixSummary, 
  members, 
  users,
  layerRewards 
} from '@shared/schema';
import { eq, and, count, desc, asc, sql } from 'drizzle-orm';

export interface LayerStatistics {
  layer: number;
  maxPositions: number;
  filledPositions: number;
  activatedPositions: number;
  leftZoneFilled: number;
  middleZoneFilled: number;
  rightZoneFilled: number;
  availablePositions: number[];
  nextZone: 'L' | 'M' | 'R';
  fillPercentage: number;
}

export interface MatrixSummaryData {
  rootWallet: string;
  totalMembers: number;
  activatedMembers: number;
  deepestLayer: number;
  layerStats: LayerStatistics[];
  nextPlacementLayer: number;
  nextPlacementPosition: number;
  nextPlacementZone: 'L' | 'M' | 'R';
  totalRewardsEarned: number;
  pendingRewards: number;
}

/**
 * Matrix Summary Service
 * Manages matrix statistics and summary data
 */
export class MatrixSummaryService {

  /**
   * Generate complete matrix summary for a root wallet
   */
  async generateMatrixSummary(rootWallet: string): Promise<MatrixSummaryData> {
    const wallet = rootWallet.toLowerCase();
    
    // Get all members in this root's matrix
    const allMembers = await db
      .select()
      .from(memberReferralTree)
      .where(eq(memberReferralTree.rootWallet, wallet))
      .orderBy(asc(memberReferralTree.layer), asc(memberReferralTree.position));

    // Calculate basic statistics
    const totalMembers = allMembers.length;
    const activatedMembers = allMembers.filter(m => m.memberActivated).length;
    const deepestLayer = allMembers.length > 0 
      ? Math.max(...allMembers.map(m => m.layer)) 
      : 0;

    // Generate layer statistics
    const layerStats = await this.generateLayerStatistics(wallet, deepestLayer);
    
    // Find next placement position
    const nextPlacement = this.findNextPlacement(layerStats);

    // Calculate reward statistics
    const rewardStats = await this.calculateRewardStatistics(wallet);

    const summary: MatrixSummaryData = {
      rootWallet: wallet,
      totalMembers,
      activatedMembers,
      deepestLayer,
      layerStats,
      nextPlacementLayer: nextPlacement.layer,
      nextPlacementPosition: nextPlacement.position,
      nextPlacementZone: nextPlacement.zone,
      totalRewardsEarned: rewardStats.totalEarned,
      pendingRewards: rewardStats.pending
    };

    // Update the cached summary in database
    await this.updateCachedSummary(summary);

    return summary;
  }

  /**
   * Generate statistics for each layer
   */
  private async generateLayerStatistics(rootWallet: string, maxLayer: number): Promise<LayerStatistics[]> {
    const layerStats: LayerStatistics[] = [];

    for (let layer = 1; layer <= Math.max(maxLayer, 3); layer++) {
      // Get members in this layer
      const layerMembers = await db
        .select()
        .from(memberReferralTree)
        .where(and(
          eq(memberReferralTree.rootWallet, rootWallet),
          eq(memberReferralTree.layer, layer)
        ));

      const maxPositions = Math.pow(3, layer);
      const filledPositions = layerMembers.length;
      const activatedPositions = layerMembers.filter(m => m.memberActivated).length;

      // Count positions by zone
      const leftZoneFilled = layerMembers.filter(m => m.zone === 'L').length;
      const middleZoneFilled = layerMembers.filter(m => m.zone === 'M').length;
      const rightZoneFilled = layerMembers.filter(m => m.zone === 'R').length;

      // Calculate available positions
      const occupiedPositions = layerMembers.map(m => m.position);
      const availablePositions = Array.from({ length: maxPositions }, (_, i) => i)
        .filter(pos => !occupiedPositions.includes(pos));

      // Determine next zone priority (L -> M -> R)
      let nextZone: 'L' | 'M' | 'R' = 'L';
      if (leftZoneFilled === 0) {
        nextZone = 'L';
      } else if (middleZoneFilled === 0) {
        nextZone = 'M';
      } else if (rightZoneFilled === 0) {
        nextZone = 'R';
      } else {
        // If this layer is full, next zone starts with L again
        nextZone = 'L';
      }

      const fillPercentage = (filledPositions / maxPositions) * 100;

      layerStats.push({
        layer,
        maxPositions,
        filledPositions,
        activatedPositions,
        leftZoneFilled,
        middleZoneFilled,
        rightZoneFilled,
        availablePositions,
        nextZone,
        fillPercentage
      });
    }

    return layerStats;
  }

  /**
   * Find the next available placement position
   */
  private findNextPlacement(layerStats: LayerStatistics[]): {
    layer: number;
    position: number;
    zone: 'L' | 'M' | 'R';
  } {
    // Find first layer with available positions
    for (const layer of layerStats) {
      if (layer.availablePositions.length > 0) {
        const nextPosition = layer.availablePositions[0];
        
        // Determine zone based on position
        // Simple mapping for now - would need proper calculation for deeper layers
        let zone: 'L' | 'M' | 'R' = 'L';
        if (layer.layer === 1) {
          zone = nextPosition === 0 ? 'L' : nextPosition === 1 ? 'M' : 'R';
        } else {
          // For deeper layers, use priority: L -> M -> R
          zone = layer.nextZone;
        }

        return {
          layer: layer.layer,
          position: nextPosition,
          zone
        };
      }
    }

    // If all layers are full, go to next layer
    const nextLayer = layerStats.length + 1;
    if (nextLayer <= 19) {
      return {
        layer: nextLayer,
        position: 0,
        zone: 'L'
      };
    }

    // Matrix is completely full
    return {
      layer: 19,
      position: 0,
      zone: 'L'
    };
  }

  /**
   * Calculate reward statistics for a root wallet
   */
  private async calculateRewardStatistics(rootWallet: string): Promise<{
    totalEarned: number;
    pending: number;
  }> {
    try {
      // Get all rewards where this wallet is the recipient
      const [totalResult] = await db
        .select({ 
          total: sql<number>`COALESCE(SUM(${layerRewards.rewardAmountUSDT}), 0)` 
        })
        .from(layerRewards)
        .where(and(
          eq(layerRewards.recipientWallet, rootWallet),
          eq(layerRewards.status, 'claimed')
        ));

      const [pendingResult] = await db
        .select({ 
          pending: sql<number>`COALESCE(SUM(${layerRewards.rewardAmountUSDT}), 0)` 
        })
        .from(layerRewards)
        .where(and(
          eq(layerRewards.recipientWallet, rootWallet),
          eq(layerRewards.status, 'claimable')
        ));

      return {
        totalEarned: totalResult?.total || 0,
        pending: pendingResult?.pending || 0
      };
    } catch (error) {
      console.error('Error calculating reward statistics:', error);
      return { totalEarned: 0, pending: 0 };
    }
  }

  /**
   * Update cached matrix summary in database
   */
  private async updateCachedSummary(summary: MatrixSummaryData): Promise<void> {
    try {
      // Check if summary exists
      const [existing] = await db
        .select()
        .from(memberMatrixSummary)
        .where(eq(memberMatrixSummary.rootWallet, summary.rootWallet));

      const summaryData = {
        rootWallet: summary.rootWallet,
        totalMembers: summary.totalMembers,
        activatedMembers: summary.activatedMembers,
        deepestLayer: summary.deepestLayer,
        layerStats: summary.layerStats,
        nextPlacementLayer: summary.nextPlacementLayer,
        nextPlacementPosition: summary.nextPlacementPosition,
        nextPlacementZone: summary.nextPlacementZone,
        lastUpdated: new Date()
      };

      if (existing) {
        // Update existing summary
        await db
          .update(memberMatrixSummary)
          .set(summaryData)
          .where(eq(memberMatrixSummary.rootWallet, summary.rootWallet));
      } else {
        // Create new summary
        await db
          .insert(memberMatrixSummary)
          .values(summaryData);
      }

      console.log(`✅ Matrix summary updated for ${summary.rootWallet}`);
    } catch (error) {
      console.error('Failed to update cached summary:', error);
    }
  }

  /**
   * Get cached matrix summary (faster than recalculating)
   */
  async getCachedMatrixSummary(rootWallet: string): Promise<MatrixSummaryData | null> {
    try {
      const [cached] = await db
        .select()
        .from(memberMatrixSummary)
        .where(eq(memberMatrixSummary.rootWallet, rootWallet.toLowerCase()));

      if (!cached) {
        return null;
      }

      // Get fresh reward statistics
      const rewardStats = await this.calculateRewardStatistics(rootWallet.toLowerCase());

      return {
        rootWallet: cached.rootWallet,
        totalMembers: cached.totalMembers,
        activatedMembers: cached.activatedMembers,
        deepestLayer: cached.deepestLayer,
        layerStats: cached.layerStats as LayerStatistics[],
        nextPlacementLayer: cached.nextPlacementLayer,
        nextPlacementPosition: cached.nextPlacementPosition,
        nextPlacementZone: cached.nextPlacementZone as 'L' | 'M' | 'R',
        totalRewardsEarned: rewardStats.totalEarned,
        pendingRewards: rewardStats.pending
      };
    } catch (error) {
      console.error('Failed to get cached summary:', error);
      return null;
    }
  }

  /**
   * Get matrix performance metrics
   */
  async getMatrixPerformanceMetrics(rootWallet: string): Promise<{
    averageLayerFillRate: number;
    activationRate: number;
    spilloverRate: number;
    growthVelocity: number; // members added per day
    rewardEfficiency: number; // rewards per member
  }> {
    try {
      const summary = await this.getCachedMatrixSummary(rootWallet) || 
                      await this.generateMatrixSummary(rootWallet);

      // Calculate average fill rate across layers
      const activeLayers = summary.layerStats.filter(l => l.filledPositions > 0);
      const averageLayerFillRate = activeLayers.length > 0
        ? activeLayers.reduce((sum, layer) => sum + layer.fillPercentage, 0) / activeLayers.length
        : 0;

      // Calculate activation rate
      const activationRate = summary.totalMembers > 0
        ? (summary.activatedMembers / summary.totalMembers) * 100
        : 0;

      // Calculate spillover rate (members placed via spillover vs direct)
      const allMembers = await db
        .select()
        .from(memberReferralTree)
        .where(eq(memberReferralTree.rootWallet, rootWallet.toLowerCase()));

      const spilloverCount = allMembers.filter(m => m.placementType === 'spillover').length;
      const spilloverRate = allMembers.length > 0
        ? (spilloverCount / allMembers.length) * 100
        : 0;

      // Calculate growth velocity (members added in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentMembers = allMembers.filter(m => m.placedAt >= sevenDaysAgo);
      const growthVelocity = recentMembers.length / 7; // per day

      // Calculate reward efficiency
      const rewardEfficiency = summary.totalMembers > 0
        ? summary.totalRewardsEarned / summary.totalMembers
        : 0;

      return {
        averageLayerFillRate,
        activationRate,
        spilloverRate,
        growthVelocity,
        rewardEfficiency
      };
    } catch (error) {
      console.error('Failed to calculate performance metrics:', error);
      return {
        averageLayerFillRate: 0,
        activationRate: 0,
        spilloverRate: 0,
        growthVelocity: 0,
        rewardEfficiency: 0
      };
    }
  }

  /**
   * Refresh all cached summaries (maintenance function)
   */
  async refreshAllCachedSummaries(): Promise<number> {
    try {
      // Get all unique root wallets
      const rootWallets = await db
        .selectDistinct({ rootWallet: memberReferralTree.rootWallet })
        .from(memberReferralTree);

      let refreshedCount = 0;
      for (const { rootWallet } of rootWallets) {
        await this.generateMatrixSummary(rootWallet);
        refreshedCount++;
      }

      console.log(`✅ Refreshed ${refreshedCount} matrix summaries`);
      return refreshedCount;
    } catch (error) {
      console.error('Failed to refresh cached summaries:', error);
      return 0;
    }
  }
}

export const matrixSummaryService = new MatrixSummaryService();