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
      
      // Due to database connection issues, return fallback data for now
      const stats = {
        directReferralCount: 0,
        totalTeamCount: 0,
        totalReferrals: 0,
        totalEarnings: 0.00,
        monthlyEarnings: 0,
        pendingCommissions: 0,
        nextPayout: 'No pending payouts',
        currentLevel: 0,
        memberActivated: false,
        matrixLevel: 0,
        positionIndex: 0,
        levelsOwned: [],
        downlineMatrix: Array.from({ length: 19 }, (_, i) => ({
          level: i + 1,
          members: 0,
          upgraded: 0,
          placements: 0
        })),
        recentReferrals: []
      };
      
      console.log(`✅ Referral stats returned (fallback data):`, {
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