import { 
  rewardClaims,
  rewardRollups,
  userRewards,
  type RewardClaim,
  type InsertRewardClaim,
  type RewardRollup,
  type InsertRewardRollup,
  type UserReward,
  type InsertUserReward,
  type RewardWithdrawal,
  type InsertRewardWithdrawal
} from "@shared/schema";
import { db } from "../../db";
import { eq, and, lt, isNull } from "drizzle-orm";

export class RewardService {
  // Reward claims operations - replaces earnings wallet
  async getRewardClaims(recipientWallet: string): Promise<RewardClaim[]> {
    return await db
      .select()
      .from(rewardClaims)
      .where(eq(rewardClaims.recipientWallet, recipientWallet))
      .orderBy(rewardClaims.createdAt);
  }

  async createRewardClaim(claim: InsertRewardClaim): Promise<RewardClaim> {
    const [newClaim] = await db
      .insert(rewardClaims)
      .values(claim)
      .returning();
    return newClaim;
  }

  async updateRewardClaim(id: string, updates: Partial<RewardClaim>): Promise<RewardClaim | undefined> {
    const [updatedClaim] = await db
      .update(rewardClaims)
      .set(updates)
      .where(eq(rewardClaims.id, id))
      .returning();
    return updatedClaim || undefined;
  }

  async getPendingRewardClaims(): Promise<RewardClaim[]> {
    return await db
      .select()
      .from(rewardClaims)
      .where(and(
        eq(rewardClaims.status, 'pending'),
        isNull(rewardClaims.claimedAt)
      ));
  }

  async getExpiredRewardClaims(): Promise<RewardClaim[]> {
    return await db
      .select()
      .from(rewardClaims)
      .where(and(
        eq(rewardClaims.status, 'pending'),
        lt(rewardClaims.expiresAt, new Date())
      ));
  }

  // Reward rollups operations
  async getRewardRollups(walletAddress: string): Promise<RewardRollup[]> {
    return await db
      .select()
      .from(rewardRollups)
      .where(eq(rewardRollups.originalRecipient, walletAddress))
      .orderBy(rewardRollups.createdAt);
  }

  async createRewardRollup(rollup: InsertRewardRollup): Promise<RewardRollup> {
    const [newRollup] = await db
      .insert(rewardRollups)
      .values(rollup)
      .returning();
    return newRollup;
  }

  // User rewards operations
  async createUserReward(data: InsertUserReward): Promise<UserReward> {
    const [newReward] = await db
      .insert(userRewards)
      .values(data)
      .returning();
    return newReward;
  }

  async getUserRewardsByRecipient(recipientWallet: string): Promise<UserReward[]> {
    return await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.recipientWallet, recipientWallet))
      .orderBy(userRewards.createdAt);
  }

  async getUserRewardsBySource(sourceWallet: string): Promise<UserReward[]> {
    return await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.sourceWallet, sourceWallet))
      .orderBy(userRewards.createdAt);
  }

  async getPendingUserRewards(): Promise<UserReward[]> {
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

  async getUserRewardsExpiredBefore(date: Date): Promise<UserReward[]> {
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