import { 
  rewardClaims,
  rollUpRecords,
  userRewards
} from "@shared/schema";
import { db } from "../../db";
import { eq, and, lt, isNull } from "drizzle-orm";

export class RewardService {
  // Reward claims operations - replaces earnings wallet
  async getRewardClaims(recipientWallet: string): Promise<typeof rewardClaims.$inferSelect[]> {
    return await db
      .select()
      .from(rewardClaims)
      .where(eq(rewardClaims.recipientWallet, recipientWallet))
      .orderBy(rewardClaims.createdAt);
  }

  async createRewardClaim(claim: typeof rewardClaims.$inferInsert): Promise<typeof rewardClaims.$inferSelect> {
    const [newClaim] = await db
      .insert(rewardClaims)
      .values(claim)
      .returning();
    return newClaim;
  }

  async updateRewardClaim(id: string, updates: Partial<typeof rewardClaims.$inferSelect>): Promise<RewardClaim | undefined> {
    const [updatedClaim] = await db
      .update(rewardClaims)
      .set(updates)
      .where(eq(rewardClaims.id, id))
      .returning();
    return updatedClaim || undefined;
  }

  async getPendingRewardClaims(): Promise<typeof rewardClaims.$inferSelect[]> {
    return await db
      .select()
      .from(rewardClaims)
      .where(and(
        eq(rewardClaims.status, 'pending'),
        isNull(rewardClaims.claimedAt)
      ));
  }

  async getExpiredRewardClaims(): Promise<typeof rewardClaims.$inferSelect[]> {
    return await db
      .select()
      .from(rewardClaims)
      .where(and(
        eq(rewardClaims.status, 'pending'),
        lt(rewardClaims.expiresAt, new Date())
      ));
  }

  // Reward rollups operations
  async getRewardRollups(walletAddress: string): Promise<typeof rollUpRecords.$inferSelect[]> {
    return await db
      .select()
      .from(rollUpRecords)
      .where(eq(rollUpRecords.originalRecipient, walletAddress))
      .orderBy(rollUpRecords.createdAt);
  }

  async createRewardRollup(rollup: typeof rollUpRecords.$inferInsert): Promise<typeof rollUpRecords.$inferSelect> {
    const [newRollup] = await db
      .insert(rollUpRecords)
      .values(rollup)
      .returning();
    return newRollup;
  }

  // User rewards operations
  async createUserReward(data: InsertUserReward): Promise<typeof userRewards.$inferSelect> {
    const [newReward] = await db
      .insert(userRewards)
      .values(data)
      .returning();
    return newReward;
  }

  async getUserRewardsByRecipient(recipientWallet: string): Promise<typeof userRewards.$inferSelect[]> {
    return await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.recipientWallet, recipientWallet))
      .orderBy(userRewards.createdAt);
  }

  async getUserRewardsBySource(sourceWallet: string): Promise<typeof userRewards.$inferSelect[]> {
    return await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.sourceWallet, sourceWallet))
      .orderBy(userRewards.createdAt);
  }

  async getPendingUserRewards(): Promise<typeof userRewards.$inferSelect[]> {
    return await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.status, 'pending'));
  }

  async updateUserRewardStatus(
    id: string, 
    status: string, 
    confirmedAt?: Date, 
    expiredAt?: Date, 
    notes?: string
  ): Promise<void> {
    await db
      .update(userRewards)
      .set({
        status,
        confirmedAt,
        expiredAt,
        notes,
        updatedAt: new Date()
      })
      .where(eq(userRewards.id, id));
  }

  async getUserRewardsExpiredBefore(date: Date): Promise<typeof userRewards.$inferSelect[]> {
    return await db
      .select()
      .from(userRewards)
      .where(and(
        eq(userRewards.status, 'pending'),
        lt(userRewards.expiresAt, date)
      ));
  }

  async unlockPendingRewards(unlockCondition: string, sourceWallet: string): Promise<void> {
    await db
      .update(userRewards)
      .set({
        status: 'unlocked',
        confirmedAt: new Date(),
        notes: `Unlocked by condition: ${unlockCondition}`,
        updatedAt: new Date()
      })
      .where(and(
        eq(userRewards.sourceWallet, sourceWallet),
        eq(userRewards.status, 'pending')
      ));
  }

  // Business logic operations - updated for new matrix system
  async processMatrixRewards(buyerWallet: string, level: number): Promise<void> {
    // TODO: Implement matrix reward processing logic
    console.log(`Processing matrix rewards for ${buyerWallet} at level ${level}`);
  }

  async processReferralRewards(walletAddress: string, level: number): Promise<void> {
    // TODO: Implement referral reward processing logic
    console.log(`Processing referral rewards for ${walletAddress} at level ${level}`);
  }

  async createRewardWithdrawal(withdrawal: InsertRewardWithdrawal): Promise<RewardWithdrawal> {
    // TODO: Implement when RewardWithdrawal table is created
    throw new Error('RewardWithdrawal table not yet implemented');
  }
}

export const rewardService = new RewardService();