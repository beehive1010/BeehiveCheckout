import type { Express } from "express";
import { rewardsService } from '../services/rewards.service';

export function registerRewardsRoutes(app: Express, requireWallet: any) {
  
  // Get pending rewards with countdown timers
  app.get("/api/rewards/pending", requireWallet, async (req: any, res) => {
    try {
      const pendingRewards = await rewardsService.getPendingRewards(req.walletAddress);
      res.json(pendingRewards);
    } catch (error) {
      console.error('Get pending rewards error:', error);
      res.status(500).json({ error: 'Failed to get pending rewards' });
    }
  });

  // Get user reward summary (both pending and claimable)
  app.get("/api/rewards/summary", requireWallet, async (req: any, res) => {
    try {
      const summary = await rewardsService.getUserRewardSummary(req.walletAddress);
      res.json(summary);
    } catch (error) {
      console.error('Get reward summary error:', error);
      res.status(500).json({ error: 'Failed to get reward summary' });
    }
  });

  // Get claimable rewards  
  app.get("/api/rewards/claimable", requireWallet, async (req: any, res) => {
    try {
      const summary = await rewardsService.getUserRewardSummary(req.walletAddress);
      res.json(summary.claimableRewards);
    } catch (error) {
      console.error('Get claimable rewards error:', error);
      res.status(500).json({ error: 'Failed to get claimable rewards' });
    }
  });

  // Claim specific rewards
  app.post("/api/rewards/claim", requireWallet, async (req: any, res) => {
    try {
      const { rewardIds } = req.body;
      
      if (!rewardIds || !Array.isArray(rewardIds)) {
        return res.status(400).json({ 
          error: 'Missing rewardIds array' 
        });
      }

      const totalClaimed = await rewardsService.claimRewards(req.walletAddress, rewardIds);
      
      res.json({ 
        success: true,
        totalClaimed,
        message: `Successfully claimed ${totalClaimed} USDT in rewards`
      });
    } catch (error) {
      console.error('Claim rewards error:', error);
      res.status(500).json({ 
        error: 'Failed to claim rewards',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual cron trigger for admin testing
  app.post("/api/rewards/cron/trigger", requireWallet, async (req: any, res) => {
    try {
      const { default: RewardsCronService } = await import('../cron/rewards-cron');
      const result = await RewardsCronService.manualTrigger();
      res.json(result);
    } catch (error) {
      console.error('Manual cron trigger error:', error);
      res.status(500).json({ error: 'Failed to trigger cron job' });
    }
  });

  // TEST ENDPOINT: Test Level N upgrade reward distribution
  app.post("/api/rewards/test-upgrade", requireWallet, async (req: any, res) => {
    try {
      const { memberWallet, triggerLevel, upgradeAmount } = req.body;
      
      console.log(`🧪 Testing L${triggerLevel} upgrade for ${memberWallet}`);
      
      // Validate input
      if (!memberWallet || !triggerLevel || triggerLevel < 1 || triggerLevel > 19) {
        return res.status(400).json({ 
          error: 'Invalid input. triggerLevel must be 1-19' 
        });
      }

      const createdRewards = await rewardsService.processLevelUpgradeRewards({
        memberWallet,
        triggerLevel,
        upgradeAmount: upgradeAmount || 100 // Default test amount
      });

      console.log(`🎯 Test completed: Created ${createdRewards.length} rewards`);
      
      res.json({ 
        success: true,
        rewards: createdRewards.map(r => ({
          id: r.id,
          recipientWallet: r.recipientWallet,
          amount: r.rewardAmount,
          status: r.status,
          expiresAt: r.expiresAt
        }))
      });
      
    } catch (error) {
      console.error('Test upgrade error:', error);
      res.status(500).json({ 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Process member upgrade (for when user actually upgrades)
  app.post("/api/rewards/process-upgrade", requireWallet, async (req: any, res) => {
    try {
      const { newLevel } = req.body;
      
      if (!newLevel || newLevel < 1 || newLevel > 19) {
        return res.status(400).json({ 
          error: 'Invalid newLevel. Must be 1-19' 
        });
      }

      const confirmedRewards = await rewardsService.processMemberUpgrade(req.walletAddress, newLevel);
      
      res.json({ 
        success: true,
        confirmedRewards: confirmedRewards.length,
        message: `Confirmed ${confirmedRewards.length} pending rewards`
      });
      
    } catch (error) {
      console.error('Process upgrade error:', error);
      res.status(500).json({ 
        error: 'Failed to process upgrade',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}