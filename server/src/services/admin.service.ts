import { 
  adminUsers,
  adminSessions,
  adminSettings,
  platformRevenue,
  type AdminUser,
  type InsertAdminUser,
  type AdminSession,
  type InsertAdminSession,
  type AdminSetting,
  type InsertAdminSetting,
  type PlatformRevenue,
  type InsertPlatformRevenue
} from "@shared/schema";
import { db } from "../../db";
import { eq, and, gte, lte, like, or } from "drizzle-orm";

export class AdminService {
  // Admin User operations
  async getAdminUsers(filters?: { 
    search?: string; 
    role?: string; 
    status?: string 
  }): Promise<AdminUser[]> {
    let query = db.select().from(adminUsers);

    if (filters?.search) {
      query = query.where(
        or(
          like(adminUsers.username, `%${filters.search}%`),
          like(adminUsers.email, `%${filters.search}%`)
        )
      );
    }

    if (filters?.role) {
      query = query.where(eq(adminUsers.role, filters.role));
    }

    if (filters?.status) {
      query = query.where(eq(adminUsers.status, filters.status));
    }

    return await query.orderBy(adminUsers.createdAt);
  }

  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, id));
    return admin || undefined;
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username));
    return admin || undefined;
  }

  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db
      .insert(adminUsers)
      .values(adminUser)
      .returning();
    return newAdmin;
  }

  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | undefined> {
    const [updatedAdmin] = await db
      .update(adminUsers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
      .returning();
    return updatedAdmin || undefined;
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    const result = await db
      .delete(adminUsers)
      .where(eq(adminUsers.id, id));
    return result.rowCount > 0;
  }

  // Admin Session operations
  async createAdminSession(session: InsertAdminSession): Promise<AdminSession> {
    const [newSession] = await db
      .insert(adminSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getAdminSession(sessionToken: string): Promise<AdminSession | undefined> {
    const [session] = await db
      .select()
      .from(adminSessions)
      .where(eq(adminSessions.sessionToken, sessionToken));
    return session || undefined;
  }

  async deleteAdminSession(sessionToken: string): Promise<boolean> {
    const result = await db
      .delete(adminSessions)
      .where(eq(adminSessions.sessionToken, sessionToken));
    return result.rowCount > 0;
  }

  // Admin Settings operations
  async getAdminSettings(): Promise<AdminSetting[]> {
    return await db
      .select()
      .from(adminSettings)
      .orderBy(adminSettings.category, adminSettings.key);
  }

  async getAdminSetting(key: string): Promise<AdminSetting | undefined> {
    const [setting] = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.key, key));
    return setting || undefined;
  }

  async createOrUpdateAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting> {
    const existing = await this.getAdminSetting(setting.key);
    
    if (existing) {
      const [updated] = await db
        .update(adminSettings)
        .set({ ...setting, updatedAt: new Date() })
        .where(eq(adminSettings.key, setting.key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(adminSettings)
        .values(setting)
        .returning();
      return created;
    }
  }

  // Platform Revenue methods
  async createPlatformRevenue(data: InsertPlatformRevenue): Promise<PlatformRevenue> {
    const [revenue] = await db
      .insert(platformRevenue)
      .values(data)
      .returning();
    return revenue;
  }

  async getPlatformRevenueByDate(startDate: Date, endDate: Date): Promise<PlatformRevenue[]> {
    return await db
      .select()
      .from(platformRevenue)
      .where(and(
        gte(platformRevenue.createdAt, startDate),
        lte(platformRevenue.createdAt, endDate)
      ))
      .orderBy(platformRevenue.createdAt);
  }

  async getPlatformRevenueBySourceWallet(sourceWallet: string): Promise<PlatformRevenue[]> {
    return await db
      .select()
      .from(platformRevenue)
      .where(eq(platformRevenue.sourceWallet, sourceWallet))
      .orderBy(platformRevenue.createdAt);
  }
}

export const adminService = new AdminService();