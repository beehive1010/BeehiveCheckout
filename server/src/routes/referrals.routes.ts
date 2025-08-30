import type { Express } from "express";
import { referralsService, usersService } from '../services';

export function registerReferralsRoutes(app: Express, requireWallet: any) {
  
  // Get user referral stats and beehive data
  app.get("/api/beehive/user-stats/:walletAddress?", requireWallet, async (req: any, res) => {
    try {
      const targetWallet = req.params.walletAddress || req.walletAddress;
      
      // Get referral statistics
      const referralStats = await referralsService.getReferralStats(targetWallet);
      
      res.json({
        walletAddress: targetWallet.toLowerCase(),
        ...referralStats
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: 'Failed to get user statistics' });
    }
  });

  // Get beehive matrix view
  app.get("/api/beehive/matrix", requireWallet, async (req: any, res) => {
    try {
      const referralChain = await referralsService.getReferralChain(req.walletAddress);
      const directReferrals = await referralsService.getDirectReferralsWithDetails(req.walletAddress);
      
      res.json({
        uplineChain: referralChain,
        directReferrals,
        matrixPosition: {
          hasUpline: referralChain.length > 0,
          directSlots: directReferrals.length,
          availableSlots: Math.max(0, 3 - directReferrals.length)
        }
      });
    } catch (error) {
      console.error('Get matrix view error:', error);
      res.status(500).json({ error: 'Failed to get matrix view' });
    }
  });

  // Get referral layers for a specific wallet
  app.get("/api/referrals/layers/:walletAddress?", requireWallet, async (req: any, res) => {
    try {
      const targetWallet = req.params.walletAddress || req.walletAddress;
      const layers = [];
      
      // Get referrals for each layer (1-19)
      for (let layer = 1; layer <= 19; layer++) {
        const referralsAtLayer = await referralsService.getReferralsAtLevel(targetWallet, layer);
        
        if (referralsAtLayer.length > 0) {
          // Get user details for each referral
          const layerDetails = [];
          for (const referralWallet of referralsAtLayer) {
            const userProfile = await usersService.getUserProfile(referralWallet);
            if (userProfile) {
              layerDetails.push({
                walletAddress: userProfile.user.walletAddress,
                username: userProfile.user.username,
                membershipLevel: userProfile.membershipLevel,
                isActivated: userProfile.isActivated,
                joinedAt: userProfile.user.createdAt
              });
            }
          }
          
          layers.push({
            layer,
            count: referralsAtLayer.length,
            members: layerDetails
          });
        } else {
          layers.push({
            layer,
            count: 0,
            members: []
          });
        }
      }
      
      res.json({
        walletAddress: targetWallet.toLowerCase(),
        layers
      });
    } catch (error) {
      console.error('Get referral layers error:', error);
      res.status(500).json({ error: 'Failed to get referral layers' });
    }
  });

  // Calculate layers for testing
  app.post("/api/referrals/calculate-layers", requireWallet, async (req: any, res) => {
    try {
      const referralStats = await referralsService.getReferralStats(req.walletAddress);
      
      res.json({
        success: true,
        stats: referralStats
      });
    } catch (error) {
      console.error('Calculate layers error:', error);
      res.status(500).json({ error: 'Failed to calculate layers' });
    }
  });

  // Get individual matrix view
  app.get("/api/matrix/individual/:walletAddress?", requireWallet, async (req: any, res) => {
    try {
      const targetWallet = req.params.walletAddress || req.walletAddress;
      
      // Get user's position in the matrix
      const uplineChain = await referralsService.getReferralChain(targetWallet);
      const directReferrals = await referralsService.getDirectReferralsWithDetails(targetWallet);
      
      // Get matrix levels view
      const matrixLevels = [];
      for (let level = 1; level <= 5; level++) {
        const referralsAtLevel = await referralsService.getReferralsAtLevel(targetWallet, level);
        matrixLevels.push({
          level,
          positions: referralsAtLevel.length,
          maxPositions: Math.pow(3, level), // 3^level positions at each level
          wallets: referralsAtLevel
        });
      }
      
      res.json({
        walletAddress: targetWallet.toLowerCase(),
        uplineChain,
        directReferrals,
        matrixLevels,
        summary: {
          totalUplines: uplineChain.length,
          directCount: directReferrals.length,
          totalDownline: matrixLevels.reduce((sum, level) => sum + level.positions, 0)
        }
      });
    } catch (error) {
      console.error('Get individual matrix error:', error);
      res.status(500).json({ error: 'Failed to get individual matrix' });
    }
  });

  // Get layer members with pagination
  app.get("/api/referrals/layer-members", requireWallet, async (req: any, res) => {
    try {
      const { layer = 1, limit = 20, offset = 0 } = req.query;
      
      const referralsAtLayer = await referralsService.getReferralsAtLevel(
        req.walletAddress, 
        parseInt(layer as string)
      );
      
      // Apply pagination
      const paginatedWallets = referralsAtLayer.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );
      
      // Get user details
      const members = [];
      for (const wallet of paginatedWallets) {
        const userProfile = await usersService.getUserProfile(wallet);
        if (userProfile) {
          members.push({
            walletAddress: userProfile.user.walletAddress,
            username: userProfile.user.username || `User_${wallet.slice(-6)}`,
            membershipLevel: userProfile.membershipLevel,
            isActivated: userProfile.isActivated,
            joinedAt: userProfile.user.createdAt
          });
        }
      }
      
      res.json({
        layer: parseInt(layer as string),
        total: referralsAtLayer.length,
        members,
        pagination: {
          offset: parseInt(offset as string),
          limit: parseInt(limit as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < referralsAtLayer.length
        }
      });
    } catch (error) {
      console.error('Get layer members error:', error);
      res.status(500).json({ error: 'Failed to get layer members' });
    }
  });
}