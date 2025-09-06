import type { Express } from "express";
import { layerRewardsService } from '../services/layer-rewards.service';
import { enhancedBalanceService } from '../services/enhanced-balance.service';

export function registerRewardsV2Routes(app: Express, requireWallet: any) {

  // Get claimable rewards using new layer system
  app.get("/api/v2/rewards/claimable", requireWallet, async (req: any, res) => {
    try {
      const claimableRewards = await layerRewardsService.getClaimableRewards(req.walletAddress);
      
      const total = claimableRewards.reduce((sum, reward) => sum + reward.rewardAmount, 0);
      
      res.json({
        rewards: claimableRewards,
        totalClaimable: total,
        count: claimableRewards.length,
        currency: 'USDT'
      });
    } catch (error) {
      console.error('Get claimable rewards v2 error:', error);
      res.status(500).json({ error: 'Failed to get claimable rewards' });
    }
  });

  // Get pending rewards with timeout info
  app.get("/api/v2/rewards/pending", requireWallet, async (req: any, res) => {
    try {
      const pendingRewards = await layerRewardsService.getPendingRewards(req.walletAddress);
      
      const total = pendingRewards.reduce((sum, reward) => sum + reward.rewardAmount, 0);
      
      res.json({
        rewards: pendingRewards,
        totalPending: total,
        count: pendingRewards.length,
        currency: 'USDT',
        info: {
          unlockRequirement: 'Upgrade to required level',
          timeLimit: '72 hours before rollup',
          rollupBehavior: 'Rewards rollup to next qualified upline'
        }
      });
    } catch (error) {
      console.error('Get pending rewards v2 error:', error);
      res.status(500).json({ error: 'Failed to get pending rewards' });
    }
  });

  // Claim a specific reward
  app.post("/api/v2/rewards/claim/:rewardId", requireWallet, async (req: any, res) => {
    try {
      const { rewardId } = req.params;
      
      const result = await layerRewardsService.claimReward(rewardId, req.walletAddress);
      
      res.json({
        success: result.success,
        amountClaimed: result.amountClaimed,
        currency: 'USDT',
        message: `Successfully claimed ${result.amountClaimed} USDT`,
        txHash: result.txHash
      });
    } catch (error) {
      console.error('Claim reward v2 error:', error);
      res.status(500).json({ 
        error: 'Failed to claim reward',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get complete reward history
  app.get("/api/v2/rewards/history", requireWallet, async (req: any, res) => {
    try {
      const { limit = 50 } = req.query;
      const history = await layerRewardsService.getRewardHistory(
        req.walletAddress, 
        parseInt(limit as string)
      );
      
      res.json({
        rewards: history,
        totalRewards: history.length,
        pagination: {
          limit: parseInt(limit as string),
          hasMore: history.length >= parseInt(limit as string)
        }
      });
    } catch (error) {
      console.error('Get reward history v2 error:', error);
      res.status(500).json({ error: 'Failed to get reward history' });
    }
  });

  // Process level upgrade rewards (triggers layer rewards)
  app.post("/api/v2/rewards/trigger-upgrade", requireWallet, async (req: any, res) => {
    try {
      const { memberWallet, triggerLevel, upgradeAmount = 0 } = req.body;
      
      if (!memberWallet || !triggerLevel || triggerLevel < 1 || triggerLevel > 19) {
        return res.status(400).json({ 
          error: 'Invalid input. memberWallet and triggerLevel (1-19) required' 
        });
      }

      console.log(`🎯 Triggering L${triggerLevel} upgrade rewards for ${memberWallet}`);
      
      const rewards = await layerRewardsService.processLevelUpgradeRewards({
        memberWallet,
        triggerLevel,
        upgradeAmount: upgradeAmount * 100 // Convert to cents
      });

      const totalRewardAmount = rewards.reduce((sum, r) => sum + r.rewardAmountUSDT, 0) / 100;
      
      res.json({
        success: true,
        message: `Level ${triggerLevel} upgrade processed successfully`,
        upgradeDetails: {
          memberWallet,
          triggerLevel,
          upgradeAmount,
          rewardsCreated: rewards.length,
          totalRewardDistributed: totalRewardAmount,
          currency: 'USDT'
        },
        rewardBreakdown: rewards.map(reward => ({
          recipient: reward.recipientWallet,
          layer: reward.layerNumber,
          amount: reward.rewardAmountUSDT / 100,
          status: reward.status,
          requiresLevel: reward.requiresLevel,
          expiresAt: reward.pendingExpiresAt.toISOString()
        }))
      });

    } catch (error) {
      console.error('Trigger upgrade rewards error:', error);
      res.status(500).json({ 
        error: 'Failed to process upgrade rewards',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual reward processing (admin/cron)
  app.post("/api/v2/rewards/process-expired", async (req, res) => {
    try {
      const { adminKey } = req.headers;
      
      // Basic admin validation - in production, use proper authentication
      if (adminKey !== process.env.ADMIN_API_KEY) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = await layerRewardsService.processExpiredRewards();
      
      res.json({
        success: true,
        message: 'Expired rewards processing completed',
        results: {
          rolledUp: result.rolledUp,
          expired: result.expired,
          totalProcessed: result.rolledUp + result.expired
        },
        processedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Process expired rewards error:', error);
      res.status(500).json({ 
        error: 'Failed to process expired rewards',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get rewards statistics
  app.get("/api/v2/rewards/stats", requireWallet, async (req: any, res) => {
    try {
      const [claimable, pending, history] = await Promise.all([
        layerRewardsService.getClaimableRewards(req.walletAddress),
        layerRewardsService.getPendingRewards(req.walletAddress),
        layerRewardsService.getRewardHistory(req.walletAddress, 1000) // Get all history for stats
      ]);

      const totalClaimable = claimable.reduce((sum, r) => sum + r.rewardAmount, 0);
      const totalPending = pending.reduce((sum, r) => sum + r.rewardAmount, 0);
      
      const claimedRewards = history.filter(r => r.status === 'claimed');
      const totalClaimed = claimedRewards.reduce((sum, r) => sum + r.amount, 0);
      
      const rolledUpRewards = history.filter(r => r.status === 'rollup');
      const totalRolledUp = rolledUpRewards.reduce((sum, r) => sum + r.amount, 0);

      res.json({
        summary: {
          totalEarnings: totalClaimable + totalPending + totalClaimed,
          claimableAmount: totalClaimable,
          pendingAmount: totalPending,
          claimedAmount: totalClaimed,
          rolledUpAmount: totalRolledUp
        },
        counts: {
          totalRewards: history.length,
          claimableRewards: claimable.length,
          pendingRewards: pending.length,
          claimedRewards: claimedRewards.length,
          rolledUpRewards: rolledUpRewards.length
        },
        currency: 'USDT',
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get rewards stats error:', error);
      res.status(500).json({ error: 'Failed to get rewards statistics' });
    }
  });

  // Get supported withdrawal chains
  app.get("/api/v2/rewards/withdrawal-chains", requireWallet, async (req: any, res) => {
    try {
      const supportedChains = [
        {
          id: 'ethereum',
          name: 'Ethereum',
          symbol: 'ETH',
          chainId: 1,
          withdrawalFee: 2.5,
          processingTime: '15-30 minutes',
          minWithdrawal: 10, // $10 minimum
          gasToken: 'ETH'
        },
        {
          id: 'polygon',
          name: 'Polygon',
          symbol: 'MATIC', 
          chainId: 137,
          withdrawalFee: 1.0,
          processingTime: '5-10 minutes',
          minWithdrawal: 5, // $5 minimum
          gasToken: 'MATIC'
        },
        {
          id: 'arbitrum',
          name: 'Arbitrum',
          symbol: 'ETH',
          chainId: 42161,
          withdrawalFee: 1.5,
          processingTime: '10-20 minutes', 
          minWithdrawal: 10,
          gasToken: 'ETH'
        },
        {
          id: 'optimism',
          name: 'Optimism',
          symbol: 'ETH',
          chainId: 10,
          withdrawalFee: 1.5,
          processingTime: '10-20 minutes',
          minWithdrawal: 10,
          gasToken: 'ETH'
        },
        {
          id: 'bsc',
          name: 'BNB Smart Chain',
          symbol: 'BNB',
          chainId: 56,
          withdrawalFee: 1.0,
          processingTime: '5-10 minutes',
          minWithdrawal: 5,
          gasToken: 'BNB'
        }
      ];
      
      res.json({
        supportedChains,
        defaultChain: 'polygon',
        info: {
          feeExplanation: 'Withdrawal fees cover gas costs for blockchain transactions',
          processingNote: 'Processing times are estimates and may vary based on network conditions'
        }
      });

    } catch (error) {
      console.error('Get withdrawal chains error:', error);
      res.status(500).json({ error: 'Failed to get withdrawal chains' });
    }
  });

  // Test endpoint for layer rewards (development only)
  app.post("/api/v2/rewards/test-layer-distribution", requireWallet, async (req: any, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Test endpoint not available in production' });
      }

      const { memberWallet, triggerLevel = 1 } = req.body;
      
      if (!memberWallet) {
        return res.status(400).json({ error: 'memberWallet required for testing' });
      }

      console.log(`🧪 Testing layer reward distribution for L${triggerLevel} upgrade`);
      
      const rewards = await layerRewardsService.processLevelUpgradeRewards({
        memberWallet,
        triggerLevel,
        upgradeAmount: 10000 // $100 in cents
      });

      res.json({
        testResults: {
          memberWallet,
          triggerLevel,
          rewardsGenerated: rewards.length,
          layerDistribution: rewards.map(r => ({
            layer: r.layerNumber,
            recipient: r.recipientWallet,
            amount: r.rewardAmountUSDT / 100,
            status: r.status,
            requiresLevel: r.requiresLevel
          })),
          totalDistributed: rewards.reduce((sum, r) => sum + r.rewardAmountUSDT, 0) / 100
        },
        message: `Test completed: ${rewards.length} rewards created across matrix layers`
      });

    } catch (error) {
      console.error('Test layer distribution error:', error);
      res.status(500).json({ 
        error: 'Layer distribution test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}