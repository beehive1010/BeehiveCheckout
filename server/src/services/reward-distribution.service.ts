import { db } from '../../db';
import { userRewards, userBalances, platformRevenue } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export interface RewardDistributionInput {
  recipientWallet: string;
  sourceWallet: string;
  triggerLevel: number;
  rewardAmount: number;
  rewardType: 'activation' | 'upgrade' | 'matrix';
  txHash: string;
  notes?: string;
}

/**
 * Reward Distribution Service
 * Handles USDT reward distribution and earnings tracking
 */
export class RewardDistributionService {

  /**
   * Distribute reward to recipient and update earnings
   */
  async distributeReward(input: RewardDistributionInput): Promise<{
    success: boolean;
    rewardId?: string;
    message: string;
  }> {
    try {
      const recipient = input.recipientWallet.toLowerCase();
      const source = input.sourceWallet.toLowerCase();

      // 1. Create reward record
      const [reward] = await db.insert(userRewards).values({
        recipientWallet: recipient,
        sourceWallet: source,
        triggerLevel: input.triggerLevel,
        payoutLayer: 1, // Simplified for this implementation
        rewardAmount: input.rewardAmount.toString(),
        status: 'confirmed',
        confirmedAt: new Date(),
        notes: input.notes || `${input.rewardType} reward: ${input.rewardAmount} USDT`,
        createdAt: new Date()
      }).returning();

      // 2. Update user balance
      await this.updateUserBalance(recipient, input.rewardAmount);

      console.log(`💰 Reward distributed: ${input.rewardAmount} USDT → ${recipient} (${input.rewardType})`);

      return {
        success: true,
        rewardId: reward.id,
        message: `${input.rewardAmount} USDT reward distributed successfully`
      };
    } catch (error) {
      console.error('Reward distribution error:', error);
      return {
        success: false,
        message: 'Failed to distribute reward'
      };
    }
  }

  /**
   * Update user balance with new USDT reward
   */
  private async updateUserBalance(walletAddress: string, amount: number): Promise<void> {
    try {
      const wallet = walletAddress.toLowerCase();
      const amountCents = Math.floor(amount * 100); // Convert to cents

      // Check if user balance exists
      const [existingBalance] = await db.select()
        .from(userBalances)
        .where(eq(userBalances.walletAddress, wallet));

      if (existingBalance) {
        // Update existing balance
        await db.update(userBalances)
          .set({
            totalUsdtEarned: sql`${userBalances.totalUsdtEarned} + ${amountCents}`,
            availableUsdtRewards: sql`${userBalances.availableUsdtRewards} + ${amountCents}`,
            lastUpdated: new Date()
          })
          .where(eq(userBalances.walletAddress, wallet));
      } else {
        // Create new user balance
        await db.insert(userBalances).values({
          walletAddress: wallet,
          bccTransferable: 500, // Default 500 BCC for new users
          bccRestricted: 0,
          bccLocked: 0,
          totalUsdtEarned: amountCents,
          availableUsdtRewards: amountCents,
          totalUsdtWithdrawn: 0,
          cthBalance: 0,
          lastUpdated: new Date(),
        });
      }

      console.log(`📊 Balance updated: ${wallet} +${amount} USDT`);
    } catch (error) {
      console.error('Error updating user balance:', error);
      throw error;
    }
  }

  /**
   * Record platform revenue (especially 30 USDT from Level 1 activations)
   */
  async recordPlatformRevenue(input: {
    sourceWallet: string;
    level: number;
    amount: number;
    revenueType: string;
    txHash: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    revenueId?: string;
    message: string;
  }> {
    try {
      const [revenue] = await db.insert(platformRevenue).values({
        sourceType: input.revenueType, // 'nft_claim', 'membership_upgrade', 'platform_fee'
        sourceWallet: input.sourceWallet.toLowerCase(),
        level: input.level,
        amount: input.amount.toString(),
        txHash: input.txHash,
        notes: input.notes || `Level ${input.level} activation - Platform revenue: ${input.amount} USDT`,
        createdAt: new Date()
      }).returning();

      console.log(`🏢 Platform revenue recorded: ${input.amount} USDT from Level ${input.level} activation by ${input.sourceWallet}`);

      return {
        success: true,
        revenueId: revenue.id,
        message: `Platform revenue of ${input.amount} USDT recorded successfully`
      };
    } catch (error) {
      console.error('Error recording platform revenue:', error);
      return {
        success: false,
        message: 'Failed to record platform revenue'
      };
    }
  }

  /**
   * Record Level 1 activation revenue (30 USDT to platform)
   */
  async recordLevel1Revenue(sourceWallet: string, txHash: string): Promise<{
    success: boolean;
    revenueId?: string;
    message: string;
  }> {
    return this.recordPlatformRevenue({
      sourceWallet,
      level: 1,
      amount: 30,
      revenueType: 'nft_claim',
      txHash,
      notes: 'Level 1 NFT claim - Platform receives 30 USDT (130 USDT total - 100 USDT to user BCC unlock)'
    });
  }

  /**
   * Get user's total earnings summary
   */
  async getEarningsSummary(walletAddress: string): Promise<{
    totalEarnings: number;
    availableBalance: number;
    pendingRewards: number;
    withdrawnAmount: number;
    rewardCount: number;
  }> {
    try {
      const wallet = walletAddress.toLowerCase();

      // Get user balance
      const [balanceData] = await db.select()
        .from(userBalances)
        .where(eq(userBalances.walletAddress, wallet));

      if (!balanceData) {
        return {
          totalEarnings: 0,
          availableBalance: 0,
          pendingRewards: 0,
          withdrawnAmount: 0,
          rewardCount: 0
        };
      }

      const totalEarnings = balanceData.totalUsdtEarned / 100; // Convert from cents
      const availableBalance = balanceData.availableUsdtRewards / 100;
      const withdrawnAmount = balanceData.totalUsdtWithdrawn / 100;
      const pendingRewards = 0; // No pending rewards in new system

      // Get reward count from userRewards table
      const rewardCountResult = await db.select({ count: sql<number>`count(*)` })
        .from(userRewards)
        .where(eq(userRewards.recipientWallet, wallet));
      
      const rewardCount = rewardCountResult[0]?.count || 0;

      return {
        totalEarnings,
        availableBalance: Math.max(0, availableBalance),
        pendingRewards,
        withdrawnAmount,
        rewardCount: Number(rewardCount)
      };
    } catch (error) {
      console.error('Error getting earnings summary:', error);
      return {
        totalEarnings: 0,
        availableBalance: 0,
        pendingRewards: 0,
        withdrawnAmount: 0,
        rewardCount: 0
      };
    }
  }

  /**
   * Process withdrawal (mark as withdrawn)
   */
  async processWithdrawal(walletAddress: string, amount: number, txHash: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const wallet = walletAddress.toLowerCase();

      // Update user balance for withdrawal
      const amountCents = Math.floor(amount * 100);
      await db.update(userBalances)
        .set({
          totalUsdtWithdrawn: sql`${userBalances.totalUsdtWithdrawn} + ${amountCents}`,
          availableUsdtRewards: sql`${userBalances.availableUsdtRewards} - ${amountCents}`,
          lastUpdated: new Date()
        })
        .where(eq(userBalances.walletAddress, wallet));

      console.log(`💸 Withdrawal processed: ${amount} USDT from ${wallet}`);

      return {
        success: true,
        message: `${amount} USDT withdrawal processed`
      };
    } catch (error) {
      console.error('Withdrawal processing error:', error);
      return {
        success: false,
        message: 'Failed to process withdrawal'
      };
    }
  }
}

export const rewardDistributionService = new RewardDistributionService();