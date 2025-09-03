import type { Express } from "express";
import { usersService, referralsService, rewardsService } from '../services';
import { debugKeys } from '../repositories';

export function registerAdminRoutes(app: Express, requireWallet: any) {
  
  // Admin settings endpoint
  app.post("/api/admin/settings", requireWallet, async (req: any, res) => {
    try {
      // In real implementation, would check admin permissions
      const { setting, value } = req.body;
      
      console.log(`Admin setting update: ${setting} = ${value}`);
      
      res.json({
        success: true,
        message: `Setting ${setting} updated`,
        setting,
        value
      });
    } catch (error) {
      console.error('Admin settings error:', error);
      res.status(500).json({ error: 'Failed to update admin settings' });
    }
  });

  // Debug endpoint - list database keys by prefix
  app.get("/api/debug/db/keys", requireWallet, async (req: any, res) => {
    try {
      // In real implementation, would check admin permissions
      const { prefix = '', limit = 100 } = req.query;
      
      const result = await debugKeys(prefix as string, parseInt(limit as string));
      
      res.json({
        prefix: prefix || 'ALL',
        ...result
      });
    } catch (error) {
      console.error('Debug keys error:', error);
      res.status(500).json({ error: 'Failed to list debug keys' });
    }
  });

  // Admin user management
  app.get("/api/admin/users", requireWallet, async (req: any, res) => {
    try {
      const { level, activated, limit = 50, cursor } = req.query;
      
      let result;
      if (level) {
        result = await usersService.getUsersByLevel(
          parseInt(level as string),
          parseInt(limit as string),
          cursor as string
        );
      } else if (activated === 'true') {
        result = await usersService.getActivatedUsers(
          parseInt(limit as string),
          cursor as string
        );
      } else {
        // Default to activated users
        result = await usersService.getActivatedUsers(
          parseInt(limit as string),
          cursor as string
        );
      }
      
      res.json(result);
    } catch (error) {
      console.error('Admin get users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // Admin reward management
  app.post("/api/admin/rewards/confirm/:rewardId", requireWallet, async (req: any, res) => {
    try {
      const { rewardId } = req.params;
      
      await rewardsService.manuallyConfirmReward(rewardId);
      
      res.json({
        success: true,
        message: `Reward ${rewardId} manually confirmed`
      });
    } catch (error) {
      console.error('Admin confirm reward error:', error);
      res.status(500).json({ 
        error: 'Failed to confirm reward',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin reward expiration
  app.post("/api/admin/rewards/expire/:rewardId", requireWallet, async (req: any, res) => {
    try {
      const { rewardId } = req.params;
      
      await rewardsService.manuallyExpireReward(rewardId);
      
      res.json({
        success: true,
        message: `Reward ${rewardId} manually expired and reallocated`
      });
    } catch (error) {
      console.error('Admin expire reward error:', error);
      res.status(500).json({ 
        error: 'Failed to expire reward',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin matrix validation
  app.get("/api/admin/matrix/validate/:walletAddress", requireWallet, async (req: any, res) => {
    try {
      const { walletAddress } = req.params;
      
      const validation = await referralsService.validateMatrixIntegrity(walletAddress);
      
      res.json({
        walletAddress: walletAddress.toLowerCase(),
        ...validation
      });
    } catch (error) {
      console.error('Admin matrix validation error:', error);
      res.status(500).json({ error: 'Failed to validate matrix' });
    }
  });

  // Admin process pending rewards manually
  app.post("/api/admin/rewards/process-pending", requireWallet, async (req: any, res) => {
    try {
      const result = await rewardsService.processPendingRewards();
      
      res.json({
        success: true,
        message: 'Pending rewards processed',
        result
      });
    } catch (error) {
      console.error('Admin process pending error:', error);
      res.status(500).json({ 
        error: 'Failed to process pending rewards',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}