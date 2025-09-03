import { 
  userActivities,
  users,
  members,
  cthBalances,
  type UserActivity,
  type InsertUserActivity,
  type User
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, sql } from "drizzle-orm";

// Simplified StorageService without service delegation to avoid initialization issues
export class StorageService {
  
  // User Activity operations - implemented directly here
  async getUserActivity(walletAddress: string, limit: number = 50): Promise<Array<{
    id: string;
    type: 'reward' | 'purchase' | 'merchant_nft_claim' | 'token_purchase' | 'membership';
    title?: string;
    description: string;
    amount?: string;
    amountType?: string;
    timestamp: Date;
    status?: string;
  }>> {
    try {
      const activities = await db
        .select()
        .from(userActivities)
        .where(eq(userActivities.walletAddress, walletAddress))
        .orderBy(desc(userActivities.createdAt))
        .limit(limit);
      
      return activities.map(activity => ({
        id: activity.id,
        type: activity.activityType as any,
        title: activity.title,
        description: activity.description || activity.title,
        amount: activity.amount?.toString(),
        amountType: activity.amountType || undefined,
        timestamp: activity.createdAt,
        status: 'completed'
      }));
    } catch (error: any) {
      console.error('userActivities table not found, returning empty array:', error?.message);
      // Return empty activity array if table doesn't exist
      return [];
    }

  }

  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    try {
      const [newActivity] = await db
        .insert(userActivities)
        .values(activity)
        .returning();
      return newActivity;
    } catch (error: any) {
      console.error('userActivities table not found, skipping activity creation:', error?.message);
      // Return mock activity if table doesn't exist
      return {
        id: 'mock_' + Date.now(),
        walletAddress: activity.walletAddress,
        activityType: activity.activityType,
        title: activity.title || '',
        description: activity.description || '',
        amount: activity.amount,
        amountType: activity.amountType,
        metadata: activity.metadata,
        relatedWallet: null,
        relatedLevel: null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserActivity;
    }
  }

  // User operations
  async getUser(walletAddress: string): Promise<any | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
      
      if (!user) {
        return null;
      }

      // Also get member data if exists
      const [memberData] = await db
        .select()
        .from(members)
        .where(eq(members.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      // Combine user and member data for backward compatibility
      return {
        ...user,
        memberActivated: memberData?.isActivated || false,
        // Keep currentLevel from users table as primary source
        currentLevel: user.currentLevel || 0
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }
  
  async createUser(userData: any): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        walletAddress: userData.walletAddress.toLowerCase(),
        username: userData.username,
        email: userData.email,
        referrerWallet: userData.referrerWallet?.toLowerCase(),
        currentLevel: userData.currentLevel || 0,
        isUpgraded: false,
        upgradeTimerEnabled: false
      })
      .returning();
    return newUser;
  }
  
  async updateUser(walletAddress: string, updates: any) {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .returning();
    return updatedUser;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user || null;
  }

  async createOrUpdateMember(walletAddress: string, memberData: any) {
    // Try to insert first, if it fails due to unique constraint, update instead
    try {
      await db
        .insert(members)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          isActivated: memberData.isActivated,
          activatedAt: memberData.activatedAt,
          currentLevel: memberData.currentLevel,
          levelsOwned: memberData.levelsOwned,
          hasPendingRewards: false,
          upgradeReminderEnabled: false,
          totalDirectReferrals: 0,
          totalTeamSize: 0
        });
    } catch (error) {
      // If insert fails due to unique constraint, update existing record
      await db
        .update(members)
        .set({
          isActivated: memberData.isActivated,
          activatedAt: memberData.activatedAt,
          currentLevel: memberData.currentLevel,
          levelsOwned: memberData.levelsOwned,
          updatedAt: new Date()
        })
        .where(eq(members.walletAddress, walletAddress.toLowerCase()));
    }
  }

  async getMember(walletAddress: string) {
    try {
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
      return member || null;
    } catch (error) {
      console.error('Error getting member:', error);
      return null;
    }
  }

  async getUserWallet(walletAddress: string) {
    try {
      const [wallet] = await db
        .select()
        .from(cthBalances)
        .where(eq(cthBalances.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
      return wallet ? {
        bccBalance: wallet.balance,
        bccLocked: 0, // Not implemented yet
        availableUSDT: 0 // Not implemented yet
      } : null;
    } catch (error) {
      console.error('Error getting user wallet:', error);
      return null;
    }
  }
}

export const storage = new StorageService();