import type { Express } from "express";
import { enhancedBalanceService } from '../services/enhanced-balance.service';

export function registerBalanceV2Routes(app: Express, requireWallet: any) {

  // Get complete balance breakdown
  app.get("/api/v2/balance/breakdown", requireWallet, async (req: any, res) => {
    try {
      const balance = await enhancedBalanceService.getBalanceBreakdown(req.walletAddress);
      
      res.json({
        walletAddress: balance.walletAddress,
        bcc: {
          transferable: balance.bccTransferable,
          restricted: balance.bccRestricted,
          locked: balance.bccLocked,
          total: balance.totalBcc,
          breakdown: {
            transferable: {
              amount: balance.bccTransferable,
              description: 'Available for transfers and spending',
              usage: 'Courses, NFTs, P2P transfers'
            },
            restricted: {
              amount: balance.bccRestricted,
              description: 'From rewards, limited usage',
              usage: 'Courses and platform features only'
            },
            locked: {
              amount: balance.bccLocked,
              description: 'Staked or locked BCC',
              usage: 'Earning staking rewards'
            }
          }
        },
        usdt: {
          totalEarned: balance.totalUsdtEarned / 100,
          availableRewards: balance.availableUsdtRewards / 100,
          totalWithdrawn: balance.totalUsdtWithdrawn / 100,
          pendingWithdrawals: (balance.totalUsdtEarned - balance.availableUsdtRewards - balance.totalUsdtWithdrawn) / 100
        },
        activation: {
          tier: balance.activationTier,
          order: balance.activationOrder,
          tierDescription: this.getTierDescription(balance.activationTier)
        },
        metadata: {
          lastUpdated: balance.lastUpdated.toISOString(),
          createdAt: balance.createdAt.toISOString()
        }
      });
    } catch (error) {
      console.error('Get balance breakdown v2 error:', error);
      res.status(500).json({ error: 'Failed to get balance breakdown' });
    }
  });

  // Get simple balance summary (for dashboard)
  app.get("/api/v2/balance/summary", requireWallet, async (req: any, res) => {
    try {
      const balance = await enhancedBalanceService.getBalanceBreakdown(req.walletAddress);
      
      res.json({
        totalBcc: balance.totalBcc,
        availableBcc: balance.bccTransferable + balance.bccRestricted,
        availableUsdt: balance.availableUsdtRewards / 100,
        totalUsdtEarnings: balance.totalUsdtEarned / 100,
        activationTier: balance.activationTier,
        lastUpdated: balance.lastUpdated.toISOString()
      });
    } catch (error) {
      console.error('Get balance summary v2 error:', error);
      res.status(500).json({ error: 'Failed to get balance summary' });
    }
  });

  // Request USDT withdrawal
  app.post("/api/v2/balance/withdraw", requireWallet, async (req: any, res) => {
    try {
      const { amount, targetChain, targetWalletAddress } = req.body;
      
      if (!amount || !targetChain || !targetWalletAddress) {
        return res.status(400).json({ 
          error: 'amount, targetChain, and targetWalletAddress are required' 
        });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
      }

      const amountCents = Math.floor(amount * 100); // Convert to cents
      
      const result = await enhancedBalanceService.requestUsdtWithdrawal({
        walletAddress: req.walletAddress,
        amountUsdt: amountCents,
        targetChain,
        targetWalletAddress
      });
      
      res.json({
        success: true,
        withdrawalId: result.id,
        requestedAmount: amount,
        netAmount: result.netAmount / 100,
        gasFee: result.gasFeeAmount / 100,
        gasFeePercentage: result.gasFeePercentage,
        targetChain: result.targetChain,
        estimatedProcessingTime: result.estimatedProcessingTime,
        status: result.status,
        message: `Withdrawal request created successfully. You will receive ${result.netAmount/100} USDT after fees.`
      });

    } catch (error) {
      console.error('USDT withdrawal request error:', error);
      res.status(500).json({ 
        error: 'Failed to create withdrawal request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get withdrawal history
  app.get("/api/v2/balance/withdrawals", requireWallet, async (req: any, res) => {
    try {
      const { limit = 20 } = req.query;
      
      const withdrawals = await enhancedBalanceService.getWithdrawalHistory(
        req.walletAddress,
        parseInt(limit as string)
      );
      
      res.json({
        withdrawals,
        totalWithdrawals: withdrawals.length,
        pagination: {
          limit: parseInt(limit as string),
          hasMore: withdrawals.length >= parseInt(limit as string)
        }
      });

    } catch (error) {
      console.error('Get withdrawal history error:', error);
      res.status(500).json({ error: 'Failed to get withdrawal history' });
    }
  });

  // Spend BCC (for courses, NFTs, etc.)
  app.post("/api/v2/balance/spend-bcc", requireWallet, async (req: any, res) => {
    try {
      const { amount, purpose, bucketPreference = 'auto' } = req.body;
      
      if (!amount || !purpose) {
        return res.status(400).json({ 
          error: 'amount and purpose are required' 
        });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
      }

      const result = await enhancedBalanceService.spendBcc(
        req.walletAddress,
        amount,
        bucketPreference
      );
      
      res.json({
        success: result.success,
        amountSpent: amount,
        bucketUsed: result.bucketUsed,
        purpose,
        newBalance: {
          totalBcc: result.newBalance.totalBcc,
          transferable: result.newBalance.bccTransferable,
          restricted: result.newBalance.bccRestricted,
          locked: result.newBalance.bccLocked
        },
        message: `Successfully spent ${amount} BCC from ${result.bucketUsed} bucket(s)`
      });

    } catch (error) {
      console.error('BCC spending error:', error);
      res.status(500).json({ 
        error: 'Failed to spend BCC',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update BCC balance (internal/admin use)
  app.post("/api/v2/balance/update-bcc", requireWallet, async (req: any, res) => {
    try {
      const { changes, reason } = req.body;
      
      if (!changes || typeof changes !== 'object') {
        return res.status(400).json({ error: 'changes object is required' });
      }

      const { transferable, restricted, locked } = changes;
      
      const result = await enhancedBalanceService.updateBccBalance(req.walletAddress, {
        transferable: transferable || 0,
        restricted: restricted || 0,  
        locked: locked || 0
      });
      
      res.json({
        success: true,
        changes: {
          transferable: transferable || 0,
          restricted: restricted || 0,
          locked: locked || 0
        },
        reason,
        newBalance: {
          totalBcc: result.totalBcc,
          transferable: result.bccTransferable,
          restricted: result.bccRestricted,
          locked: result.bccLocked
        },
        message: 'BCC balance updated successfully'
      });

    } catch (error) {
      console.error('BCC balance update error:', error);
      res.status(500).json({ 
        error: 'Failed to update BCC balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get global BCC pool statistics
  app.get("/api/v2/balance/global-pool", async (req: any, res) => {
    try {
      const poolStats = await enhancedBalanceService.getGlobalBccPoolStats();
      
      res.json({
        globalPool: {
          totalBccLocked: poolStats.totalBccLocked,
          totalMembersActivated: poolStats.totalMembersActivated,
          currentTier: poolStats.currentTier
        },
        tierBreakdown: poolStats.tierBreakdown,
        tierInfo: {
          tier1: { range: '1-9,999 members', multiplier: '1x' },
          tier2: { range: '10,000-19,999 members', multiplier: '1.25x' },
          tier3: { range: '20,000-39,999 members', multiplier: '1.5x' },
          tier4: { range: '40,000+ members', multiplier: '2x' }
        }
      });

    } catch (error) {
      console.error('Get global pool stats error:', error);
      res.status(500).json({ error: 'Failed to get global pool statistics' });
    }
  });

  // Get balance activity/transaction history
  app.get("/api/v2/balance/activity", requireWallet, async (req: any, res) => {
    try {
      const { limit = 50, type } = req.query;
      
      // This would require a balance_transactions or activity table
      // For now, return placeholder structure
      res.json({
        activities: [],
        filters: {
          availableTypes: ['reward_earned', 'bcc_spent', 'usdt_withdrawal', 'bcc_transfer', 'activation_bonus'],
          currentFilter: type || 'all'
        },
        pagination: {
          limit: parseInt(limit as string),
          hasMore: false
        },
        message: 'Activity tracking coming soon'
      });

    } catch (error) {
      console.error('Get balance activity error:', error);
      res.status(500).json({ error: 'Failed to get balance activity' });
    }
  });

  // Helper function for tier descriptions
  function getTierDescription(tier: number): string {
    const descriptions: Record<number, string> = {
      1: 'Early Adopter (1-9,999 members)',
      2: 'Growth Phase (10,000-19,999 members)', 
      3: 'Expansion Phase (20,000-39,999 members)',
      4: 'Mature Phase (40,000+ members)'
    };
    
    return descriptions[tier] || 'Unknown Tier';
  }
}