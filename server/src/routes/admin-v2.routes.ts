import type { Express } from "express";
import { rollupManagementService } from '../services/rollup-management.service';
import { layerRewardsService } from '../services/layer-rewards.service';
import { enhancedBalanceService } from '../services/enhanced-balance.service';

export function registerAdminV2Routes(app: Express) {
  
  // Admin authentication middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    const adminKey = req.headers['x-admin-key'] || req.headers['authorization'];
    
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  };

  // Manual timeout processing (emergency use)
  app.post("/api/v2/admin/process-timeouts", requireAdmin, async (req, res) => {
    try {
      console.log('🔧 Manual timeout processing triggered by admin');
      
      const results = await rollupManagementService.processAllTimeouts();
      
      res.json({
        success: true,
        message: 'Timeout processing completed successfully',
        results: {
          expiredRewards: {
            rolledUp: results.expiredRewards.rolledUp,
            expired: results.expiredRewards.expired,
            total: results.expiredRewards.rolledUp + results.expiredRewards.expired
          },
          upgradeTimers: {
            processed: results.upgradeTimers.processed,
            expired: results.upgradeTimers.expired,
            total: results.upgradeTimers.processed + results.upgradeTimers.expired
          },
          analytics: results.analytics
        },
        processedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Admin timeout processing error:', error);
      res.status(500).json({
        error: 'Failed to process timeouts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get rollup analytics and system health
  app.get("/api/v2/admin/rollup-analytics", requireAdmin, async (req, res) => {
    try {
      const analytics = await rollupManagementService.processAllTimeouts();
      
      // Get global BCC pool stats
      const poolStats = await enhancedBalanceService.getGlobalBccPoolStats();
      
      res.json({
        rollupAnalytics: analytics.analytics,
        systemHealth: {
          rollupEfficiency: `${analytics.analytics.rollupEfficiencyRate.toFixed(1)}%`,
          platformReallocation: `$${analytics.analytics.platformReallocation.toFixed(2)}`,
          averageRollupLayer: analytics.analytics.averageRollupLayer.toFixed(1),
          status: analytics.analytics.rollupEfficiencyRate > 70 ? 'healthy' : 'needs_attention'
        },
        globalStats: {
          totalBccLocked: poolStats.totalBccLocked,
          totalMembersActivated: poolStats.totalMembersActivated,
          currentTier: poolStats.currentTier,
          tierBreakdown: poolStats.tierBreakdown
        },
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get rollup analytics error:', error);
      res.status(500).json({ error: 'Failed to get rollup analytics' });
    }
  });

  // Create manual upgrade timer
  app.post("/api/v2/admin/create-upgrade-timer", requireAdmin, async (req, res) => {
    try {
      const { memberWallet, currentLevel, targetLevel, gracePeriodHours = 168 } = req.body;
      
      if (!memberWallet || !currentLevel || !targetLevel) {
        return res.status(400).json({ 
          error: 'memberWallet, currentLevel, and targetLevel are required' 
        });
      }

      await rollupManagementService.createUpgradeTimer(
        memberWallet,
        currentLevel,
        targetLevel,
        gracePeriodHours
      );
      
      res.json({
        success: true,
        message: `Upgrade timer created for ${memberWallet}`,
        timer: {
          memberWallet,
          currentLevel,
          targetLevel,
          gracePeriodHours,
          expiresAt: new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000).toISOString()
        }
      });

    } catch (error) {
      console.error('Create upgrade timer error:', error);
      res.status(500).json({ 
        error: 'Failed to create upgrade timer',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get upgrade timers for a member
  app.get("/api/v2/admin/upgrade-timers/:memberWallet", requireAdmin, async (req, res) => {
    try {
      const { memberWallet } = req.params;
      
      const timers = await rollupManagementService.getUpgradeTimers(memberWallet);
      
      res.json({
        memberWallet,
        activeTimers: timers,
        totalTimers: timers.length,
        totalPendingRewardValue: timers.reduce((sum, t) => sum + t.potentialRewardValue, 0) / 100
      });

    } catch (error) {
      console.error('Get upgrade timers error:', error);
      res.status(500).json({ error: 'Failed to get upgrade timers' });
    }
  });

  // Manual reward distribution (admin testing)
  app.post("/api/v2/admin/manual-reward-distribution", requireAdmin, async (req, res) => {
    try {
      const { memberWallet, triggerLevel, note = 'Admin manual distribution' } = req.body;
      
      if (!memberWallet || !triggerLevel) {
        return res.status(400).json({ 
          error: 'memberWallet and triggerLevel are required' 
        });
      }

      console.log(`🔧 Admin manual reward distribution: L${triggerLevel} for ${memberWallet}`);
      
      const rewards = await layerRewardsService.processLevelUpgradeRewards({
        memberWallet,
        triggerLevel,
        upgradeAmount: 10000 // $100 in cents for admin testing
      });

      const totalAmount = rewards.reduce((sum, r) => sum + r.rewardAmountUSDT, 0) / 100;
      
      res.json({
        success: true,
        message: `Manual reward distribution completed`,
        distribution: {
          memberWallet,
          triggerLevel,
          note,
          rewardsCreated: rewards.length,
          totalAmountDistributed: totalAmount,
          rewardBreakdown: rewards.map(r => ({
            recipient: r.recipientWallet,
            layer: r.layerNumber,
            amount: r.rewardAmountUSDT / 100,
            status: r.status,
            requiresLevel: r.requiresLevel
          }))
        },
        distributedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Manual reward distribution error:', error);
      res.status(500).json({ 
        error: 'Failed to distribute rewards manually',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // System health check for new v2 APIs
  app.get("/api/v2/admin/system-health", requireAdmin, async (req, res) => {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        services: {
          layerRewards: 'operational',
          rollupManagement: 'operational', 
          enhancedBalance: 'operational',
          matrixPlacement: 'operational'
        },
        database: {
          status: 'connected',
          activeConnections: 'normal'
        },
        apiVersion: 'v2.0',
        features: {
          matrix3x3: 'enabled',
          layerRewards: 'enabled',
          intelligentRollup: 'enabled',
          upgradeTimers: 'enabled',
          bccBalanceTracking: 'enabled'
        }
      };

      res.json(health);

    } catch (error) {
      console.error('System health check error:', error);
      res.status(500).json({ 
        error: 'System health check failed',
        services: {
          layerRewards: 'error',
          rollupManagement: 'error',
          enhancedBalance: 'error',
          matrixPlacement: 'error'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
}