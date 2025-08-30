import type { Express } from "express";
import { rewardsService } from '../services';

export function registerRewardsRoutes(app: Express, requireWallet: any) {
  
  // Get pending rewards
  app.get("/api/rewards/pending", requireWallet, async (req: any, res) => {
    try {
      const pendingRewards = await rewardsService.getPendingRewards(req.walletAddress);
      res.json(pendingRewards);
    } catch (error) {
      console.error('Get pending rewards error:', error);
      res.status(500).json({ error: 'Failed to get pending rewards' });
    }
  });

  // Get claimable rewards  
  app.get("/api/rewards/claimable", requireWallet, async (req: any, res) => {
    try {
      const claimableRewards = await rewardsService.getClaimableRewards(req.walletAddress);
      res.json(claimableRewards);
    } catch (error) {
      console.error('Get claimable rewards error:', error);
      res.status(500).json({ error: 'Failed to get claimable rewards' });
    }
  });

  // Claim specific reward
  app.post("/api/rewards/claim/:rewardId", requireWallet, async (req: any, res) => {
    try {
      const { rewardId } = req.params;
      const result = await rewardsService.claimReward(rewardId, req.walletAddress);
      res.json(result);
    } catch (error) {
      console.error('Claim reward error:', error);
      res.status(500).json({ 
        error: 'Failed to claim reward',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Claim all confirmed rewards
  app.post("/api/rewards/claim-all", requireWallet, async (req: any, res) => {
    try {
      const result = await rewardsService.claimAllRewards(req.walletAddress);
      res.json(result);
    } catch (error) {
      console.error('Claim all rewards error:', error);
      res.status(500).json({ 
        error: 'Failed to claim all rewards',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Claim reward with blockchain transfer
  app.post("/api/rewards/claim-with-transfer/:rewardId", requireWallet, async (req: any, res) => {
    try {
      const { rewardId } = req.params;
      const { chainId, toAddress } = req.body;
      
      // Get reward details first
      const claimableRewards = await rewardsService.getClaimableRewards(req.walletAddress);
      const reward = claimableRewards.find(r => r.id === rewardId);
      
      if (!reward) {
        return res.status(404).json({ error: 'Reward not found or not claimable' });
      }

      // In real implementation, would execute blockchain transfer
      console.log(`Would transfer ${reward.amount} ${reward.tokenType} to ${toAddress} on chain ${chainId}`);
      
      // Claim the reward
      const result = await rewardsService.claimReward(rewardId, req.walletAddress);
      
      res.json({
        ...result,
        transfer: {
          amount: reward.amount,
          tokenType: reward.tokenType,
          toAddress,
          chainId
        }
      });
    } catch (error) {
      console.error('Claim with transfer error:', error);
      res.status(500).json({ 
        error: 'Failed to claim reward with transfer',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get supported chains for transfers
  app.get("/api/rewards/supported-chains", requireWallet, async (req: any, res) => {
    try {
      const supportedChains = [
        { id: 1, name: 'Ethereum', symbol: 'ETH' },
        { id: 137, name: 'Polygon', symbol: 'MATIC' },
        { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
        { id: 10, name: 'Optimism', symbol: 'ETH' }
      ];
      
      res.json(supportedChains);
    } catch (error) {
      console.error('Get supported chains error:', error);
      res.status(500).json({ error: 'Failed to get supported chains' });
    }
  });

  // Process spillover rewards (cron job endpoint)
  app.post("/api/rewards/process-spillover", async (req, res) => {
    try {
      const result = await rewardsService.processPendingRewards();
      res.json({
        success: true,
        message: 'Spillover processing completed',
        result
      });
    } catch (error) {
      console.error('Process spillover error:', error);
      res.status(500).json({ 
        error: 'Failed to process spillover',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}