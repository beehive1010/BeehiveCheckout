import { 
  userActivities,
  type UserActivity,
  type InsertUserActivity
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, sql } from "drizzle-orm";

// Simplified StorageService without service delegation to avoid initialization issues
export class StorageService {
  
  // User Activity operations - implemented directly here
  async getUserActivity(walletAddress: string, limit: number = 50): Promise<Array<{
    id: string;
    type: 'reward' | 'purchase' | 'merchant_nft_claim' | 'token_purchase' | 'membership';
    description: string;
    amount?: string;
    timestamp: Date;
    status?: string;
  }>> {
    const activities = await db
      .select()
      .from(userActivities)
      .where(eq(userActivities.walletAddress, walletAddress))
      .orderBy(desc(userActivities.createdAt))
      .limit(limit);

    return activities.map(activity => ({
      id: activity.id,
      type: activity.activityType as any,
      description: activity.description || activity.title,
      amount: activity.amount?.toString(),
      timestamp: activity.createdAt,
      status: 'completed'
    }));
  }

  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const [newActivity] = await db
      .insert(userActivities)
      .values(activity)
      .returning();
    return newActivity;
  }

  // Placeholder methods to maintain compatibility - these can be implemented as needed
  async getUser(walletAddress: string) {
    throw new Error('StorageService.getUser not implemented - use userService directly');
  }
  
  async createUser(userData: any) {
    throw new Error('StorageService.createUser not implemented - use userService directly');
  }
  
  async updateUser(walletAddress: string, updates: any) {
    throw new Error('StorageService.updateUser not implemented - use userService directly');
  }
}

export const storage = new StorageService();