import { db } from '../../db';
import { userRewards, userNotifications } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface UserReward {
  id: string;
  recipientWallet: string;
  sourceWallet: string;
  triggerLevel: number;
  payoutLayer: number;
  rewardAmount: number;
  status: 'pending' | 'confirmed' | 'claimed' | 'expired';
  requiresLevel?: number;
  expiresAt?: Date;
  confirmedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface ClaimableReward {
  id: string;
  amount: number;
  tokenType: string;
  triggerLevel: number;
  memberWallet: string;
  createdAt: string;
  expiresAt?: string;
}

/**
 * PostgreSQL-based Rewards Repository
 * Replaces ReplitDB adapter for reward operations
 */
export class RewardsPostgreSQLRepository {
  
  /**
   * Create a new reward record in PostgreSQL
   */
  async create(reward: {
    recipientWallet: string;
    sourceWallet: string;
    triggerLevel: number;
    payoutLayer: number;
    rewardAmount: number;
    status: 'pending' | 'confirmed' | 'claimed';
    requiresLevel?: number;
    expiresAt?: Date;
    notes?: string;
  }): Promise<UserReward> {
    
    const [newReward] = await db.insert(userRewards).values({
      recipientWallet: reward.recipientWallet.toLowerCase(),
      sourceWallet: reward.sourceWallet.toLowerCase(),
      triggerLevel: reward.triggerLevel,
      payoutLayer: reward.payoutLayer,
      rewardAmount: reward.rewardAmount.toString(),
      status: reward.status,
      requiresLevel: reward.requiresLevel,
      expiresAt: reward.expiresAt,
      notes: reward.notes || `L${reward.triggerLevel} upgrade reward`
    }).returning();

    return {
      id: newReward.id,
      recipientWallet: newReward.recipientWallet,
      sourceWallet: newReward.sourceWallet,
      triggerLevel: newReward.triggerLevel,
      payoutLayer: newReward.payoutLayer,
      rewardAmount: parseFloat(newReward.rewardAmount),
      status: newReward.status as any,
      requiresLevel: newReward.requiresLevel || undefined,
      expiresAt: newReward.expiresAt || undefined,
      confirmedAt: newReward.confirmedAt || undefined,
      notes: newReward.notes || undefined,
      createdAt: newReward.createdAt
    };
  }

  /**
   * Get reward by ID
   */
  async getById(id: string): Promise<UserReward | null> {
    const [reward] = await db.select().from(userRewards).where(eq(userRewards.id, id));
    
    if (!reward) return null;

    return {
      id: reward.id,
      recipientWallet: reward.recipientWallet,
      sourceWallet: reward.sourceWallet,
      triggerLevel: reward.triggerLevel,
      payoutLayer: reward.payoutLayer,
      rewardAmount: parseFloat(reward.rewardAmount),
      status: reward.status as any,
      requiresLevel: reward.requiresLevel || undefined,
      expiresAt: reward.expiresAt || undefined,
      confirmedAt: reward.confirmedAt || undefined,
      notes: reward.notes || undefined,
      createdAt: reward.createdAt
    };
  }

  /**
   * List rewards by beneficiary wallet
   */
  async listByBeneficiary(
    recipientWallet: string,
    options: {
      status?: 'pending' | 'confirmed' | 'claimed';
      limit?: number;
    } = {}
  ): Promise<{rewards: UserReward[], nextCursor?: string}> {
    
    const { status, limit = 50 } = options;
    const wallet = recipientWallet.toLowerCase();

    let query = db.select().from(userRewards)
      .where(eq(userRewards.recipientWallet, wallet))
      .orderBy(desc(userRewards.createdAt))
      .limit(limit);

    if (status) {
      query = db.select().from(userRewards)
        .where(and(
          eq(userRewards.recipientWallet, wallet),
          eq(userRewards.status, status)
        ))
        .orderBy(desc(userRewards.createdAt))
        .limit(limit);
    }

    const results = await query;

    const rewards: UserReward[] = results.map(reward => ({
      id: reward.id,
      recipientWallet: reward.recipientWallet,
      sourceWallet: reward.sourceWallet,
      triggerLevel: reward.triggerLevel,
      payoutLayer: reward.payoutLayer,
      rewardAmount: parseFloat(reward.rewardAmount),
      status: reward.status as any,
      requiresLevel: reward.requiresLevel || undefined,
      expiresAt: reward.expiresAt || undefined,
      confirmedAt: reward.confirmedAt || undefined,
      notes: reward.notes || undefined,
      createdAt: reward.createdAt
    }));

    return { rewards };
  }

  /**
   * Update reward status
   */
  async setStatus(id: string, newStatus: 'pending' | 'confirmed' | 'claimed' | 'expired'): Promise<void> {
    const updateData: any = { status: newStatus };
    
    if (newStatus === 'confirmed') {
      updateData.confirmedAt = new Date();
    }

    await db.update(userRewards)
      .set(updateData)
      .where(eq(userRewards.id, id));
  }

  /**
   * Create reward notification (72h timer)
   */
  async createNotification(notification: {
    recipientWallet: string;
    triggerWallet: string;
    triggerLevel: number;
    layerNumber: number;
    rewardAmount: number;
    expiresAt: Date;
  }): Promise<void> {
    
    await db.insert(rewardNotifications).values({
      recipientWallet: notification.recipientWallet.toLowerCase(),
      triggerWallet: notification.triggerWallet.toLowerCase(),
      triggerLevel: notification.triggerLevel,
      layerNumber: notification.layerNumber,
      rewardAmount: notification.rewardAmount * 100, // Convert to cents
      expiresAt: notification.expiresAt,
      status: 'pending'
    });
  }

  /**
   * Create upgrade notification in PostgreSQL directly via SQL
   */
  async createUpgradeNotification(upgrade: {
    walletAddress: string;
    triggerWallet: string;
    triggerLevel: number;
    layerNumber: number;
    rewardAmount: number;
    expiresAt: Date;
  }): Promise<void> {
    
    // Insert directly into upgrade_notifications table
    await db.execute(sql`
      INSERT INTO upgrade_notifications (wallet_address, trigger_wallet, trigger_level, layer_number, reward_amount, expires_at, status, created_at)
      VALUES (${upgrade.walletAddress.toLowerCase()}, ${upgrade.triggerWallet.toLowerCase()}, ${upgrade.triggerLevel}, ${upgrade.layerNumber}, ${upgrade.rewardAmount * 100}, ${upgrade.expiresAt}, 'pending', NOW())
    `);
  }
}