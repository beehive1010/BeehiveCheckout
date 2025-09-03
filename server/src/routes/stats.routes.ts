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
      
      // Use new referral service
      const referralStats = await storage.getReferralsByMember(walletAddress);
      const member = await storage.getMember(walletAddress);
      
      const stats = {
        directReferralCount: member?.totalDirectReferrals || 0,
        totalTeamCount: member?.totalTeamSize || 0,
        totalReferrals: referralStats.length,
        totalEarnings: 0, // TODO: Calculate from rewards
        monthlyEarnings: 0,
        pendingCommissions: 0,
        nextPayout: 'No pending payouts',
        currentLevel: member?.currentLevel || 0,
        memberActivated: member?.isActivated || false,
        matrixLevel: member?.maxLayer || 0,
        positionIndex: 0,
        levelsOwned: member?.levelsOwned || [],
        downlineMatrix: Array.from({ length: 19 }, (_, i) => ({
          level: i + 1,
          members: referralStats.filter(r => r.layer === i + 1).length,
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
      
      const referrals = await storage.getReferrals(walletAddress);
      const member = await storage.getMember(walletAddress);
      
      const matrixStats = {
        totalMembers: referrals.length,
        activeLayers: member?.maxLayer || 0,
        matrixCapacity: Math.pow(3, 19) - 1, // 19 layers, 3^19 total capacity
        fillPercentage: referrals.length / (Math.pow(3, 19) - 1) * 100,
        layerStats: Array.from({ length: 19 }, (_, i) => {
          const layer = i + 1;
          const layerMembers = referrals.filter(r => r.layer === layer);
          return {
            layer,
            filled: layerMembers.length,
            capacity: Math.pow(3, layer),
            available: Math.pow(3, layer) - layerMembers.length,
            leftCount: layerMembers.filter(r => r.position === 'L').length,
            middleCount: layerMembers.filter(r => r.position === 'M').length,
            rightCount: layerMembers.filter(r => r.position === 'R').length,
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
      const rewardClaims = await storage.getPendingRewardClaims(walletAddress);
      
      const rewardStats = {
        totalEarned: wallet?.totalUSDTEarnings || 0,
        available: wallet?.availableUSDT || 0,
        withdrawn: wallet?.withdrawnUSDT || 0,
        pendingClaims: rewardClaims?.length || 0,
        pendingAmount: rewardClaims?.reduce((sum, claim) => sum + claim.amount, 0) || 0,
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