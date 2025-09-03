import { Express } from 'express';
import { storage } from '../services/storage.service';

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
      
      // Get member data from storage service
      const member = await storage.getMember(walletAddress);
      
      const stats = {
        directReferralCount: member?.totalDirectReferrals || 0,
        totalTeamCount: member?.totalTeamSize || 0,
        totalReferrals: 0,
        totalEarnings: 0, // TODO: Calculate from rewards
        monthlyEarnings: 0,
        pendingCommissions: 0,
        nextPayout: 'No pending payouts',
        currentLevel: member?.currentLevel || 0,
        memberActivated: member?.isActivated || false,
        matrixLevel: 0, // TODO: Implement when matrix data available
        positionIndex: 0,
        levelsOwned: member?.levelsOwned || [],
        downlineMatrix: Array.from({ length: 19 }, (_, i) => ({
          level: i + 1,
          members: 0,
          upgraded: 0,
          placements: 0
        })),
        recentReferrals: []
      };
      
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