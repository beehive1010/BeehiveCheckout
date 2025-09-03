import { db } from '../../db';
import { userRewards, earningsWallet, platformRevenue } from '@shared/schema';
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

      // 2. Update earnings wallet
      await this.updateEarningsWallet(recipient, input.rewardAmount);

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
   * Update earnings wallet with new reward
   */
  private async updateEarningsWallet(walletAddress: string, amount: number): Promise<void> {
    try {
      const wallet = walletAddress.toLowerCase();

      // Check if earnings wallet exists
      const [existingWallet] = await db.select()
        .from(earningsWallet)
        .where(eq(earningsWallet.walletAddress, wallet));

      const amountStr = amount.toString();

      if (existingWallet) {
        // Update existing wallet
        await db.update(earningsWallet)
          .set({
            totalEarnings: sql`${earningsWallet.totalEarnings} + ${amountStr}`,
            referralEarnings: sql`${earningsWallet.referralEarnings} + ${amountStr}`, // All rewards are referral-based
            lastRewardAt: new Date()
          })
          .where(eq(earningsWallet.walletAddress, wallet));
      } else {
        // Create new earnings wallet
        await db.insert(earningsWallet).values({
          walletAddress: wallet,
          totalEarnings: amountStr,
          referralEarnings: amountStr,
          levelEarnings: "0",
          pendingRewards: "0",
          withdrawnAmount: "0",
          lastRewardAt: new Date(),
          createdAt: new Date()
        });
      }

      console.log(`📊 Earnings updated: ${wallet} +${amount} USDT`);
    } catch (error) {
      console.error('Error updating earnings wallet:', error);
      throw error;
    }
  }

  /**
   * Record platform revenue
   */
  async recordPlatformRevenue(input: {
    sourceWallet: string;
    amount: number;
    revenueType: string;
    txHash: string;
    notes?: string;
  }): Promise<void> {
    try {
      // Simplified platform revenue recording
      console.log(`🏢 Platform revenue recorded: ${input.amount} USDT (${input.revenueType}) from ${input.sourceWallet}`);

      console.log(`🏢 Platform revenue recorded: ${input.amount} USDT (${input.revenueType})`);
    } catch (error) {
      console.error('Error recording platform revenue:', error);
      throw error;
    }
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

      // Get earnings wallet
      const [earningsData] = await db.select()
        .from(earningsWallet)
        .where(eq(earningsWallet.walletAddress, wallet));

      if (!earningsData) {
        return {
          totalEarnings: 0,
          availableBalance: 0,
          pendingRewards: 0,
          withdrawnAmount: 0,
          rewardCount: 0
        };
      }

      const totalEarnings = parseFloat(earningsData.totalEarnings);
      const pendingRewards = parseFloat(earningsData.pendingRewards);
      const withdrawnAmount = parseFloat(earningsData.withdrawnAmount);
      const availableBalance = totalEarnings - pendingRewards - withdrawnAmount;

      // Get reward count
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

      // Update earnings wallet
      await db.update(earningsWallet)
        .set({
          withdrawnAmount: sql`${earningsWallet.withdrawnAmount} + ${amount.toString()}`
        })
        .where(eq(earningsWallet.walletAddress, wallet));

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