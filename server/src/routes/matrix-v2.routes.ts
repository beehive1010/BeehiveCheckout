import { Express } from 'express';
import { matrixPlacementService } from '../services/matrix-placement.service';
import { matrixSummaryService } from '../services/matrix-summary.service';
import { db } from '../../db';
import { memberReferralTree, members, users } from '@shared/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

/**
 * Enhanced Matrix Routes - v2 for new referral system
 * Uses memberReferralTree schema with proper 3x3 matrix logic
 */
export function registerMatrixV2Routes(app: Express) {
  const requireWallet = (req: any, res: any, next: any) => {
    const walletAddress = req.headers['x-wallet-address'];
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    req.walletAddress = walletAddress.toLowerCase();
    next();
  };

  // Get user's complete matrix tree
  app.get("/api/v2/matrix/tree/:rootWallet/:maxLayers?", async (req: any, res) => {
    try {
      const { rootWallet, maxLayers = 5 } = req.params;
      const layers = parseInt(maxLayers);
      
      if (layers < 1 || layers > 19) {
        return res.status(400).json({ error: 'Layers must be between 1 and 19' });
      }

      const tree = await matrixPlacementService.getMatrixTree(
        rootWallet.toLowerCase(), 
        layers
      );
      
      // Get root user info
      const [rootUser] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, rootWallet.toLowerCase()));

      const [rootMember] = await db
        .select()
        .from(members)
        .where(eq(members.walletAddress, rootWallet.toLowerCase()));

      res.json({
        rootWallet: rootWallet.toLowerCase(),
        rootInfo: {
          username: rootUser?.username,
          currentLevel: rootMember?.currentLevel || 0,
          isActivated: rootMember?.isActivated || false,
          totalDirectReferrals: rootMember?.totalDirectReferrals || 0,
          totalTeamSize: rootMember?.totalTeamSize || 0
        },
        maxLayers: layers,
        tree
      });
    } catch (error) {
      console.error('Matrix tree error:', error);
      res.status(500).json({ error: 'Failed to fetch matrix tree' });
    }
  });

  // Get matrix statistics for a user
  app.get("/api/v2/matrix/stats/:walletAddress", async (req: any, res) => {
    try {
      const { walletAddress } = req.params;
      const stats = await matrixPlacementService.getTeamStats(walletAddress.toLowerCase());
      
      res.json({
        walletAddress: walletAddress.toLowerCase(),
        ...stats,
        layerBreakdown: Object.entries(stats.layerCounts).map(([layer, count]) => ({
          layer: parseInt(layer),
          memberCount: count,
          maxCapacity: Math.pow(3, parseInt(layer)),
          fillPercentage: (count / Math.pow(3, parseInt(layer))) * 100
        }))
      });
    } catch (error) {
      console.error('Matrix stats error:', error);
      res.status(500).json({ error: 'Failed to fetch matrix statistics' });
    }
  });

  // Get specific layer members
  app.get("/api/v2/matrix/layer/:rootWallet/:layer", async (req: any, res) => {
    try {
      const { rootWallet, layer } = req.params;
      const layerNum = parseInt(layer);
      
      if (layerNum < 1 || layerNum > 19) {
        return res.status(400).json({ error: 'Layer must be between 1 and 19' });
      }

      const members = await matrixPlacementService.getLayerMembers(
        rootWallet.toLowerCase(),
        layerNum
      );

      const maxCapacity = Math.pow(3, layerNum);
      const fillPercentage = (members.length / maxCapacity) * 100;

      // Get member details
      const memberDetails = await Promise.all(
        members.map(async (member) => {
          const [userInfo] = await db
            .select()
            .from(users)
            .where(eq(users.walletAddress, member.memberWallet));
          
          const [memberInfo] = await db
            .select()
            .from(db.select().from(members))
            .where(eq(members.walletAddress, member.memberWallet));

          return {
            ...member,
            username: userInfo?.username,
            currentLevel: memberInfo?.currentLevel || 0,
            isActivated: memberInfo?.isActivated || false
          };
        })
      );

      res.json({
        rootWallet: rootWallet.toLowerCase(),
        layer: layerNum,
        maxCapacity,
        currentCount: members.length,
        fillPercentage,
        availableSlots: maxCapacity - members.length,
        members: memberDetails,
        positionMap: {
          L: memberDetails.filter(m => m.position === 'L'),
          M: memberDetails.filter(m => m.position === 'M'),
          R: memberDetails.filter(m => m.position === 'R')
        }
      });
    } catch (error) {
      console.error('Matrix layer error:', error);
      res.status(500).json({ error: 'Failed to fetch layer members' });
    }
  });

  // Place new member in matrix
  app.post("/api/v2/matrix/place", requireWallet, async (req: any, res) => {
    try {
      const { memberWallet, referrerWallet } = req.body;
      
      if (!memberWallet || !referrerWallet) {
        return res.status(400).json({ 
          error: 'memberWallet and referrerWallet are required' 
        });
      }

      // Validate member doesn't already exist in referrer's matrix
      const [existing] = await db
        .select()
        .from(memberReferralTree)
        .where(and(
          eq(memberReferralTree.rootWallet, referrerWallet.toLowerCase()),
          eq(memberReferralTree.memberWallet, memberWallet.toLowerCase())
        ));

      if (existing) {
        return res.status(409).json({ 
          error: 'Member already exists in this referrer\'s matrix' 
        });
      }

      // Execute placement
      const placement = await matrixPlacementService.placeInMatrix(
        memberWallet.toLowerCase(),
        referrerWallet.toLowerCase()
      );

      res.json({
        success: true,
        placement: {
          memberWallet: placement.memberWallet,
          rootWallet: placement.rootWallet,
          layer: placement.layer,
          position: placement.position,
          placementType: placement.placementType,
          parentWallet: placement.parentWallet
        },
        message: `Member placed at Layer ${placement.layer}, Position ${placement.position}`
      });

    } catch (error) {
      console.error('Matrix placement error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to place member in matrix' 
      });
    }
  });

  // Get next available positions for a root
  app.get("/api/v2/matrix/next-positions/:rootWallet", async (req: any, res) => {
    try {
      const { rootWallet } = req.params;

      // Find first available layer
      for (let layer = 1; layer <= 19; layer++) {
        const members = await matrixPlacementService.getLayerMembers(
          rootWallet.toLowerCase(),
          layer
        );
        
        const maxCapacity = Math.pow(3, layer);
        if (members.length < maxCapacity) {
          const occupiedPositions = members.map(m => m.position);
          const availablePositions = ['L', 'M', 'R'].filter(
            pos => !occupiedPositions.includes(pos)
          );

          return res.json({
            nextLayer: layer,
            availablePositions,
            recommendedPosition: availablePositions[0],
            currentCapacity: members.length,
            maxCapacity,
            fillPercentage: (members.length / maxCapacity) * 100
          });
        }
      }

      res.json({
        nextLayer: null,
        availablePositions: [],
        message: 'Matrix is full (19 layers complete)'
      });

    } catch (error) {
      console.error('Next positions error:', error);
      res.status(500).json({ error: 'Failed to find available positions' });
    }
  });

  // Get member's position in a specific root's matrix
  app.get("/api/v2/matrix/position/:memberWallet/:rootWallet", async (req: any, res) => {
    try {
      const { memberWallet, rootWallet } = req.params;

      const position = await matrixPlacementService.getMatrixPosition(
        memberWallet.toLowerCase(),
        rootWallet.toLowerCase()
      );

      if (!position) {
        return res.status(404).json({ 
          error: 'Member not found in this root\'s matrix' 
        });
      }

      res.json({
        memberWallet: memberWallet.toLowerCase(),
        rootWallet: rootWallet.toLowerCase(),
        position
      });

    } catch (error) {
      console.error('Matrix position error:', error);
      res.status(500).json({ error: 'Failed to get matrix position' });
    }
  });

  // Get complete matrix summary for a root
  app.get("/api/v2/matrix/summary/:rootWallet", async (req: any, res) => {
    try {
      const { rootWallet } = req.params;
      
      // Get all members in matrix
      const allMembers = await db
        .select()
        .from(memberReferralTree)
        .where(and(
          eq(memberReferralTree.rootWallet, rootWallet.toLowerCase()),
          eq(memberReferralTree.isActivePosition, true)
        ))
        .orderBy(asc(memberReferralTree.layer), asc(memberReferralTree.position));

      // Group by layers
      const layerSummary: Record<number, any> = {};
      let totalMembers = 0;
      let activatedMembers = 0;
      let deepestLayer = 0;

      for (const member of allMembers) {
        const layer = member.layer;
        if (!layerSummary[layer]) {
          layerSummary[layer] = {
            layer,
            maxCapacity: Math.pow(3, layer),
            members: [],
            positions: { L: null, M: null, R: null }
          };
        }

        layerSummary[layer].members.push({
          walletAddress: member.memberWallet,
          position: member.zone,
          placementType: member.placementType,
          placedAt: member.placedAt,
          activated: member.memberActivated
        });

        layerSummary[layer].positions[member.zone as 'L'|'M'|'R'] = member.memberWallet;

        totalMembers++;
        if (member.memberActivated) activatedMembers++;
        if (layer > deepestLayer) deepestLayer = layer;
      }

      // Calculate fill percentages
      Object.values(layerSummary).forEach((layer: any) => {
        layer.fillCount = layer.members.length;
        layer.fillPercentage = (layer.fillCount / layer.maxCapacity) * 100;
        layer.availableSlots = layer.maxCapacity - layer.fillCount;
      });

      res.json({
        rootWallet: rootWallet.toLowerCase(),
        totalMembers,
        activatedMembers,
        deepestLayer,
        activationRate: totalMembers > 0 ? (activatedMembers / totalMembers) * 100 : 0,
        layerSummary: Object.values(layerSummary).sort((a: any, b: any) => a.layer - b.layer),
        nextAvailableLayer: deepestLayer < 19 ? deepestLayer + 1 : null
      });

    } catch (error) {
      console.error('Matrix summary error:', error);
      res.status(500).json({ error: 'Failed to get matrix summary' });
    }
  });

  // Get enhanced matrix summary with performance metrics
  app.get("/api/v2/matrix/enhanced-summary/:rootWallet", async (req: any, res) => {
    try {
      const { rootWallet } = req.params;
      const { forceRefresh = false } = req.query;

      // Get matrix summary (cached or fresh)
      let summary = forceRefresh ? null : await matrixSummaryService.getCachedMatrixSummary(rootWallet.toLowerCase());
      
      if (!summary) {
        summary = await matrixSummaryService.generateMatrixSummary(rootWallet.toLowerCase());
      }

      // Get performance metrics
      const metrics = await matrixSummaryService.getMatrixPerformanceMetrics(rootWallet.toLowerCase());

      res.json({
        ...summary,
        performanceMetrics: metrics,
        cacheStatus: forceRefresh ? 'fresh' : 'cached',
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Enhanced matrix summary error:', error);
      res.status(500).json({ error: 'Failed to get enhanced matrix summary' });
    }
  });

  // Refresh matrix summary cache (admin endpoint)
  app.post("/api/v2/matrix/refresh-cache/:rootWallet?", requireWallet, async (req: any, res) => {
    try {
      const { rootWallet } = req.params;

      if (rootWallet) {
        // Refresh specific user's cache
        const summary = await matrixSummaryService.generateMatrixSummary(rootWallet.toLowerCase());
        res.json({
          success: true,
          refreshed: 1,
          rootWallet: rootWallet.toLowerCase(),
          summary
        });
      } else {
        // Refresh all caches (admin function)
        const refreshedCount = await matrixSummaryService.refreshAllCachedSummaries();
        res.json({
          success: true,
          refreshed: refreshedCount,
          message: `Refreshed ${refreshedCount} matrix summaries`
        });
      }

    } catch (error) {
      console.error('Refresh cache error:', error);
      res.status(500).json({ error: 'Failed to refresh matrix cache' });
    }
  });

  // Get matrix health check
  app.get("/api/v2/matrix/health", async (req: any, res) => {
    try {
      // Check matrix system health
      const [totalTrees] = await db
        .selectDistinct({ count: memberReferralTree.rootWallet })
        .from(memberReferralTree);

      const [totalPlacements] = await db
        .select({ count: count() })
        .from(memberReferralTree);

      const [activePlacements] = await db
        .select({ count: count() })
        .from(memberReferralTree)
        .where(eq(memberReferralTree.isActivePosition, true));

      res.json({
        status: 'healthy',
        statistics: {
          totalMatrixTrees: Array.isArray(totalTrees) ? totalTrees.length : 0,
          totalPlacements: totalPlacements.count || 0,
          activePlacements: activePlacements.count || 0,
          systemLoad: 'normal'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Matrix health check error:', error);
      res.status(500).json({ 
        status: 'unhealthy',
        error: 'Matrix system health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });
}