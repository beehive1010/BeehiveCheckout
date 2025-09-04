import { 
  userActivities,
  users,
  members,
  cthBalances,
  userNotifications,
  type UserActivity,
  type InsertUserActivity,
  type User,
  type UserNotification,
  type InsertUserNotification
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, sql, and, isNull, not, count } from "drizzle-orm";

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

  // ==================== User Notifications Methods ====================

  async createUserNotification(data: InsertUserNotification): Promise<UserNotification> {
    const insertData: any = {
      recipientWallet: data.recipientWallet.toLowerCase(),
      title: data.title,
      message: data.message,
      type: data.type,
    };
    
    // Add optional fields only if they exist
    if (data.triggerWallet) insertData.triggerWallet = data.triggerWallet.toLowerCase();
    if (data.relatedWallet) insertData.relatedWallet = data.relatedWallet.toLowerCase();
    if (data.amount !== undefined) insertData.amount = data.amount;
    if (data.amountType) insertData.amountType = data.amountType;
    if (data.level !== undefined) insertData.level = data.level;
    if (data.layer !== undefined) insertData.layer = data.layer;
    if (data.position) insertData.position = data.position;
    if (data.priority) insertData.priority = data.priority;
    if (data.actionRequired !== undefined) insertData.actionRequired = data.actionRequired;
    if (data.actionType) insertData.actionType = data.actionType;
    if (data.actionUrl) insertData.actionUrl = data.actionUrl;
    if (data.expiresAt) insertData.expiresAt = data.expiresAt;
    if (data.metadata) insertData.metadata = data.metadata;
    if (data.isRead !== undefined) insertData.isRead = data.isRead;
    if (data.isArchived !== undefined) insertData.isArchived = data.isArchived;
    if (data.emailSent !== undefined) insertData.emailSent = data.emailSent;

    const [notification] = await db
      .insert(userNotifications)
      .values(insertData)
      .returning();
    return notification;
  }

  async updateUserNotification(id: string, updates: Partial<UserNotification>): Promise<UserNotification | null> {
    const [updated] = await db
      .update(userNotifications)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userNotifications.id, id))
      .returning();
    return updated || null;
  }

  async getUserNotifications(
    walletAddress: string, 
    filters: {
      isRead?: boolean;
      type?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      isArchived?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<UserNotification[]> {
    const conditions = [eq(userNotifications.recipientWallet, walletAddress.toLowerCase())];
    
    if (filters.isRead !== undefined) {
      conditions.push(eq(userNotifications.isRead, filters.isRead));
    }
    if (filters.type) {
      conditions.push(eq(userNotifications.type, filters.type));
    }
    if (filters.priority) {
      conditions.push(eq(userNotifications.priority, filters.priority));
    }
    if (filters.isArchived !== undefined) {
      conditions.push(eq(userNotifications.isArchived, filters.isArchived));
    }

    let baseQuery = db
      .select()
      .from(userNotifications)
      .where(and(...conditions))
      .orderBy(desc(userNotifications.createdAt));

    if (filters.limit) {
      if (filters.offset) {
        return await baseQuery.limit(filters.limit).offset(filters.offset);
      } else {
        return await baseQuery.limit(filters.limit);
      }
    }

    return await baseQuery;
  }

  async countUserNotifications(
    walletAddress: string,
    filters: {
      isRead?: boolean;
      type?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      isArchived?: boolean;
      actionRequired?: boolean;
    } = {}
  ): Promise<number> {
    const conditions = [eq(userNotifications.recipientWallet, walletAddress.toLowerCase())];
    
    if (filters.isRead !== undefined) {
      conditions.push(eq(userNotifications.isRead, filters.isRead));
    }
    if (filters.type) {
      conditions.push(eq(userNotifications.type, filters.type));
    }
    if (filters.priority) {
      conditions.push(eq(userNotifications.priority, filters.priority));
    }
    if (filters.isArchived !== undefined) {
      conditions.push(eq(userNotifications.isArchived, filters.isArchived));
    }
    if (filters.actionRequired !== undefined) {
      conditions.push(eq(userNotifications.actionRequired, filters.actionRequired));
    }

    const [result] = await db
      .select({ count: count() })
      .from(userNotifications)
      .where(and(...conditions));

    return result.count;
  }

  async getUserNotificationById(id: string): Promise<UserNotification | null> {
    const [notification] = await db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.id, id))
      .limit(1);
    return notification || null;
  }

  async markAllNotificationsAsRead(walletAddress: string): Promise<number> {
    const result = await db
      .update(userNotifications)
      .set({ 
        isRead: true, 
        updatedAt: new Date() 
      })
      .where(
        and(
          eq(userNotifications.recipientWallet, walletAddress.toLowerCase()),
          eq(userNotifications.isRead, false),
          eq(userNotifications.isArchived, false)
        )
      );

    return result.rowCount || 0;
  }

  async deleteUserNotification(id: string): Promise<boolean> {
    const result = await db
      .delete(userNotifications)
      .where(eq(userNotifications.id, id));
    
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new StorageService();