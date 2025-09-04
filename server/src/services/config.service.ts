import { 
  levelConfig,
  tokenPurchases,
  walletConnectionLogs,
  discoverPartners,
  type LevelConfig,
  type InsertLevelConfig,
  type TokenPurchase,
  type InsertTokenPurchase,
  type WalletConnectionLog,
  type InsertWalletConnectionLog,
  type DiscoverPartner,
  type InsertDiscoverPartner
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc } from "drizzle-orm";

export class ConfigService {
  // Level configuration operations
  async getLevelConfig(level: number): Promise<LevelConfig | undefined> {
    const [config] = await db
      .select()
      .from(levelConfig)
      .where(eq(levelConfig.level, level));
    return config || undefined;
  }

  async getAllLevelConfigs(): Promise<LevelConfig[]> {
    return await db
      .select()
      .from(levelConfig)
      .orderBy(levelConfig.level);
  }

  async createOrUpdateLevelConfig(config: InsertLevelConfig): Promise<LevelConfig> {
    const existing = await this.getLevelConfig(config.level);
    
    if (existing) {
      const [updated] = await db
        .update(levelConfig)
        .set(config)
        .where(eq(levelConfig.level, config.level))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(levelConfig)
        .values(config)
        .returning();
      return created;
    }
  }

  // BCC Token Purchase operations - only BCC purchases
  async createTokenPurchase(purchase: InsertTokenPurchase): Promise<TokenPurchase> {
    const [newPurchase] = await db
      .insert(tokenPurchases)
      .values(purchase)
      .returning();
    return newPurchase;
  }

  async getTokenPurchase(id: string): Promise<TokenPurchase | undefined> {
    const [purchase] = await db
      .select()
      .from(tokenPurchases)
      .where(eq(tokenPurchases.id, id));
    return purchase || undefined;
  }

  async getTokenPurchasesByWallet(walletAddress: string): Promise<TokenPurchase[]> {
    return await db
      .select()
      .from(tokenPurchases)
      .where(eq(tokenPurchases.walletAddress, walletAddress))
      .orderBy(desc(tokenPurchases.createdAt));
  }

  async updateTokenPurchase(id: string, updates: Partial<TokenPurchase>): Promise<TokenPurchase | undefined> {
    const [updated] = await db
      .update(tokenPurchases)
      .set(updates)
      .where(eq(tokenPurchases.id, id))
      .returning();
    return updated || undefined;
  }

  // Wallet connection logs
  async createWalletConnectionLog(log: InsertWalletConnectionLog): Promise<WalletConnectionLog> {
    const [newLog] = await db
      .insert(walletConnectionLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getWalletConnectionLogs(walletAddress: string): Promise<WalletConnectionLog[]> {
    return await db
      .select()
      .from(walletConnectionLogs)
      .where(eq(walletConnectionLogs.walletAddress, walletAddress))
      .orderBy(desc(walletConnectionLogs.createdAt));
  }

  // Discover partners operations
  async getDiscoverPartners(): Promise<DiscoverPartner[]> {
    return await db
      .select()
      .from(discoverPartners)
      .where(eq(discoverPartners.status, 'published'))
      .orderBy(discoverPartners.createdAt);
  }

  async createDiscoverPartner(partner: InsertDiscoverPartner): Promise<DiscoverPartner> {
    const [newPartner] = await db
      .insert(discoverPartners)
      .values(partner)
      .returning();
    return newPartner;
  }

  async updateDiscoverPartner(id: string, updates: Partial<DiscoverPartner>): Promise<DiscoverPartner | undefined> {
    const [updated] = await db
      .update(discoverPartners)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(discoverPartners.id, id))
      .returning();
    return updated || undefined;
  }
}

export const configService = new ConfigService();