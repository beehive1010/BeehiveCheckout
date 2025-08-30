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

  // Automated claim with Thirdweb Engine
  app.post("/api/rewards/claim", requireWallet, async (req: any, res) => {
    try {
      const { rewardId, recipientAddress } = req.body;
      
      if (!rewardId || !recipientAddress) {
        return res.status(400).json({ 
          error: 'Missing rewardId or recipientAddress' 
        });
      }

      const result = await rewardsService.claimRewardWithEngine(
        rewardId, 
        req.walletAddress, 
        recipientAddress
      );
      
      res.json(result);
    } catch (error) {
      console.error('Automated claim error:', error);
      res.status(500).json({ 
        error: 'Failed to claim reward',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Claim specific reward (legacy)
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

      // Process upgrade rewards according to Layer 1-19 specifications
      const createdRewards = await rewardsService.processLevelUpgradeRewards({
        memberWallet,
        triggerLevel,
        upgradeAmount: upgradeAmount || 0
      });

      // Return detailed test results
      res.json({
        success: true,
        message: `L${triggerLevel} upgrade processed successfully`,
        testResults: {
          triggerLevel,
          expectedRewardAmount: 50 + (triggerLevel * 50), // 100, 150, 200, ..., 1000
          createdRewards: createdRewards.length,
          rewardDetails: createdRewards.map(r => ({
            id: r.id,
            beneficiaryWallet: r.beneficiaryWallet,
            amount: r.amount,
            tokenType: r.tokenType,
            status: r.status,
            payoutLayer: r.payoutLayer,
            triggerLevel: r.triggerLevel,
            notes: r.notes
          })),
          specification: {
            rule: `Level ${triggerLevel} upgrade → ${triggerLevel}th ancestor gets ${50 + (triggerLevel * 50)} USDT`,
            eligibility: `Upline must have membership_level >= ${triggerLevel}`,
            pending: 'If not eligible, 72h pending with expiration/reallocation',
            platformRevenue: triggerLevel === 1 ? '+30 USDT for Level 1 only' : 'No platform fee for L2-L19'
          }
        }
      });
    } catch (error) {
      console.error('Test upgrade error:', error);
      res.status(500).json({ 
        error: 'Test upgrade failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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