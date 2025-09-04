import { Express } from 'express';
import { storage } from '../services/storage.service';
import { db } from '../../db';
import { users, members, referrals, userWallet } from '@shared/schema';
import { eq, count, sum, and, desc } from 'drizzle-orm';

/**
 * Statistics Routes - Using new database views
 */
export function registerStatsRoutes(app: Express) {
  const requireWallet = (req: any, res: any, next: any) => {
    const walletAddress = req.headers['x-wallet-address'];
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    req.walletAddress = walletAddress;
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    // TODO: Implement proper admin authentication
    next();
  };

  // 用户推荐统计
  app.get("/api/stats/user-referrals", requireWallet, async (req: any, res) => {
    try {
      const { walletAddress } = req;
      const wallet = walletAddress.toLowerCase();
      
      console.log(`📊 Fetching referral stats for: ${wallet}`);
      
      // Get member data from database
      const [member] = await db.select().from(members).where(eq(members.walletAddress, wallet));
      const [user] = await db.select().from(users).where(eq(users.walletAddress, wallet));
      
      // Get referral counts
      const directReferralsResult = await db
        .select({ count: count() })
        .from(referrals)
        .where(eq(referrals.rootWallet, wallet));
      
      const totalReferralsResult = await db
        .select({ count: count() })
        .from(referrals)
        .where(eq(referrals.rootWallet, wallet));
      
      // Get user wallet for earnings
      const [wallet_data] = await db.select().from(userWallet).where(eq(userWallet.walletAddress, wallet));
      
      // Get recent referrals (last 10)
      const recentReferralsData = await db
        .select({
          memberWallet: referrals.memberWallet,
          placedAt: referrals.placedAt,
          layer: referrals.layer,
          position: referrals.position,
          isActive: referrals.isActive
        })
        .from(referrals)
        .where(eq(referrals.rootWallet, wallet))
        .limit(10)
        .orderBy(desc(referrals.placedAt));
      
      // Build downline matrix by layers
      const downlineMatrix = [];
      for (let level = 1; level <= 19; level++) {
        const layerReferralsResult = await db
          .select({ count: count() })
          .from(referrals)
          .where(and(
            eq(referrals.rootWallet, wallet),
            eq(referrals.layer, level)
          ));
        
        downlineMatrix.push({
          level,
          members: layerReferralsResult[0]?.count || 0,
          upgraded: 0, // TODO: Calculate upgraded members
          placements: layerReferralsResult[0]?.count || 0
        });
      }
      
      const totalUSDTEarnings = wallet_data ? (wallet_data.totalUSDTEarnings / 100) : 0; // Convert from cents
      const availableUSDT = wallet_data ? (wallet_data.availableUSDT / 100) : 0;
      
      const stats = {
        directReferralCount: directReferralsResult[0]?.count || 0,
        totalTeamCount: totalReferralsResult[0]?.count || 0,
        totalReferrals: totalReferralsResult[0]?.count || 0,
        totalEarnings: totalUSDTEarnings,
        monthlyEarnings: 0, // TODO: Calculate monthly earnings
        pendingCommissions: wallet_data?.pendingUpgradeRewards || 0,
        nextPayout: 'No pending payouts',
        currentLevel: member?.currentLevel || user?.currentLevel || 0,
        memberActivated: member?.isActivated || false,
        matrixLevel: 0, // TODO: Implement when matrix data available
        positionIndex: 0,
        levelsOwned: member?.levelsOwned || [],
        downlineMatrix,
        recentReferrals: recentReferralsData.map(ref => ({
          walletAddress: ref.memberWallet,
          joinedAt: ref.placedAt.toISOString(),
          activated: ref.isActive,
          layer: ref.layer,
          position: ref.position
        }))
      };
      
      console.log(`✅ Referral stats calculated:`, {
        directReferrals: stats.directReferralCount,
        totalReferrals: stats.totalReferrals,
        totalEarnings: stats.totalEarnings,
        memberActivated: stats.memberActivated
      });
      
      res.json(stats);
    } catch (error) {
      console.error('Referral stats error:', error);
      res.status(500).json({ error: 'Failed to fetch referral stats' });
    }
  });

  // 用户矩阵统计
  app.get("/api/stats/user-matrix", requireWallet, async (req: any, res) => {
    try {
      const { walletAddress } = req;
      
      const member = await storage.getMember(walletAddress);
      
      const matrixStats = {
        totalMembers: 0,
        activeLayers: 0,
        matrixCapacity: Math.pow(3, 19) - 1, // 19 layers, 3^19 total capacity
        fillPercentage: 0,
        layerStats: Array.from({ length: 19 }, (_, i) => {
          const layer = i + 1;
          return {
            layer,
            filled: 0,
            capacity: Math.pow(3, layer),
            available: Math.pow(3, layer),
            leftCount: 0,
            middleCount: 0,
            rightCount: 0,
          };
        })
      };
      
      res.json(matrixStats);
    } catch (error) {
      console.error('Matrix stats error:', error);
      res.status(500).json({ error: 'Failed to fetch matrix stats' });
    }
  });

  // 用户奖励统计
  app.get("/api/stats/user-rewards", requireWallet, async (req: any, res) => {
    try {
      const { walletAddress } = req;
      
      const wallet = await storage.getUserWallet(walletAddress);
      
      const rewardStats = {
        totalEarned: 0, // TODO: Implement when reward system is available
        available: wallet?.availableUSDT || 0,
        withdrawn: 0, // TODO: Implement when withdrawal system is available
        pendingClaims: 0,
        pendingAmount: 0,
        bccBalance: wallet?.bccBalance || 0,
        bccLocked: wallet?.bccLocked || 0,
        recentRewards: [], // TODO: Get recent reward history
      };
      
      res.json(rewardStats);
    } catch (error) {
      console.error('Reward stats error:', error);
      res.status(500).json({ error: 'Failed to fetch reward stats' });
    }
  });
}