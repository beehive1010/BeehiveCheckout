import type { Express } from "express";
import { usersService, referralsService, rewardsService } from '../services';

export function registerMembershipRoutes(app: Express, requireWallet: any) {
  
  // Activate membership level
  app.post("/api/membership/activate", requireWallet, async (req: any, res) => {
    try {
      const { level, txHash } = req.body;
      
      if (!level || level < 1 || level > 19) {
        return res.status(400).json({ error: 'Invalid membership level' });
      }

      // Activate user at specified level
      await usersService.activateUser(req.walletAddress, level);
      
      // Process reward distribution for this level upgrade
      if (level > 1) {
        await rewardsService.processLevelUpgradeRewards({
          memberWallet: req.walletAddress,
          triggerLevel: level,
          upgradeAmount: 0 // Amount would be calculated based on level
        });
      }

      res.json({ 
        success: true, 
        message: `Membership activated at level ${level}`,
        txHash 
      });
    } catch (error) {
      console.error('Membership activation error:', error);
      res.status(500).json({ 
        error: 'Failed to activate membership',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // NFT-based activation
  app.post("/api/membership/nft-activate", requireWallet, async (req: any, res) => {
    try {
      const { level, nftTokenId, contractAddress } = req.body;
      
      if (!level || level < 1 || level > 19) {
        return res.status(400).json({ error: 'Invalid membership level' });
      }

      // In real implementation, would verify NFT ownership
      console.log(`Verifying NFT ownership: ${contractAddress}#${nftTokenId} for ${req.walletAddress}`);
      
      // Activate user
      await usersService.activateUser(req.walletAddress, level);
      
      // Process rewards
      await rewardsService.processLevelUpgradeRewards({
        memberWallet: req.walletAddress,
        triggerLevel: level,
        upgradeAmount: 0
      });

      res.json({ 
        success: true, 
        message: `NFT membership activated at level ${level}`,
        nftTokenId,
        contractAddress
      });
    } catch (error) {
      console.error('NFT activation error:', error);
      res.status(500).json({ 
        error: 'Failed to activate NFT membership',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Debug endpoint for testing matrix layers
  app.post("/api/debug/test-layers", requireWallet, async (req: any, res) => {
    try {
      const { targetLevel } = req.body;
      
      if (!targetLevel || targetLevel < 1 || targetLevel > 19) {
        return res.status(400).json({ error: 'Invalid target level' });
      }

      // Simulate level upgrade for testing
      await usersService.updateMembershipLevel(req.walletAddress, targetLevel);
      
      // Get updated referral stats
      const stats = await referralsService.getReferralStats(req.walletAddress);
      
      res.json({ 
        success: true, 
        message: `Debug: Updated to level ${targetLevel}`,
        stats
      });
    } catch (error) {
      console.error('Debug test layers error:', error);
      res.status(500).json({ 
        error: 'Debug operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}