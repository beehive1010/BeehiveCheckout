import { Express } from 'express';
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
      
      // Get member data from database with timeout handling
      let member, user, wallet_data, recentReferralsData;
      
      try {
        [member] = await db.select().from(members).where(eq(members.walletAddress, wallet));
        [user] = await db.select().from(users).where(eq(users.walletAddress, wallet));
      } catch (error) {
        console.warn('Database timeout for member/user query, using fallback data:', error.message);
        member = null;
        user = null;
      }
      
      // Get referral counts with error handling
      let directReferralsResult = [{ count: 0 }];
      let totalReferralsResult = [{ count: 0 }];
      
      try {
        directReferralsResult = await db
          .select({ count: count() })
          .from(referrals)
          .where(eq(referrals.rootWallet, wallet));
        
        totalReferralsResult = await db
          .select({ count: count() })
          .from(referrals)
          .where(eq(referrals.rootWallet, wallet));
      } catch (error) {
        console.warn('Database timeout for referrals query, using fallback data:', error.message);
      }
      
      // Get user wallet for earnings with error handling
      try {
        [wallet_data] = await db.select().from(userWallet).where(eq(userWallet.walletAddress, wallet));
      } catch (error) {
        console.warn('Database timeout for wallet query, using fallback data:', error.message);
        wallet_data = null;
      }
      
      // Get recent referrals (last 10) with error handling
      try {
        recentReferralsData = await db
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
      } catch (error) {
        console.warn('Database timeout for recent referrals query, using fallback data:', error.message);
        recentReferralsData = [];
      }
      
      // Build downline matrix by layers with error handling
      const downlineMatrix = [];
      for (let level = 1; level <= 19; level++) {
        let layerCount = 0;
        try {
          const layerReferralsResult = await db
            .select({ count: count() })
            .from(referrals)
            .where(and(
              eq(referrals.rootWallet, wallet),
              eq(referrals.layer, level)
            ));
          layerCount = layerReferralsResult[0]?.count || 0;
        } catch (error) {
          console.warn(`Database timeout for layer ${level} query, using fallback data:`, error.message);
        }
        
        downlineMatrix.push({
          level,
          members: layerCount,
          upgraded: 0, // TODO: Calculate upgraded members
          placements: layerCount
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
      const wallet = walletAddress.toLowerCase();
      
      // Get member data from database  
      const [member] = await db.select().from(members).where(eq(members.walletAddress, wallet));
      
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
      const wallet_address = walletAddress.toLowerCase();
      
      // Get user wallet data from database
      const [wallet_data] = await db.select().from(userWallet).where(eq(userWallet.walletAddress, wallet_address));
      
      const rewardStats = {
        totalEarned: wallet_data ? (wallet_data.totalUSDTEarnings / 100) : 0, // Convert from cents
        available: wallet_data ? (wallet_data.availableUSDT / 100) : 0,
        withdrawn: wallet_data ? (wallet_data.withdrawnUSDT / 100) : 0,
        pendingClaims: 0,
        pendingAmount: wallet_data?.pendingUpgradeRewards || 0,
        bccBalance: wallet_data?.bccBalance || 0,
        bccLocked: wallet_data?.bccLocked || 0,
        recentRewards: [], // TODO: Get recent reward history
      };
      
      res.json(rewardStats);
    } catch (error) {
      console.error('Reward stats error:', error);
      res.status(500).json({ error: 'Failed to fetch reward stats' });
    }
  });
}