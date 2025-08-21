import { 
  users,
  membershipState,
  referralNodes,
  bccBalances,
  orders,
  earningsWallet,
  levelConfig,
  memberNFTVerification,
  merchantNFTs,
  nftPurchases,
  courses,
  courseAccess,
  bridgePayments,
  advertisementNFTs,
  advertisementNFTClaims,
  type User, 
  type InsertUser,
  type MembershipState,
  type InsertMembershipState,
  type ReferralNode,
  type InsertReferralNode,
  type BCCBalance,
  type InsertBCCBalance,
  type Order,
  type InsertOrder,
  type EarningsWallet,
  type InsertEarningsWallet,
  type LevelConfig,
  type InsertLevelConfig,
  type MemberNFTVerification,
  type InsertMemberNFTVerification,
  type MerchantNFT,
  type InsertMerchantNFT,
  type NFTPurchase,
  type InsertNFTPurchase,
  type Course,
  type InsertCourse,
  type CourseAccess,
  type InsertCourseAccess,
  type BridgePayment,
  type InsertBridgePayment,
  type AdvertisementNFT,
  type InsertAdvertisementNFT,
  type AdvertisementNFTClaim,
  type InsertAdvertisementNFTClaim
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(walletAddress: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(walletAddress: string, updates: Partial<User>): Promise<User | undefined>;

  // Membership operations
  getMembershipState(walletAddress: string): Promise<MembershipState | undefined>;
  createMembershipState(membership: InsertMembershipState): Promise<MembershipState>;
  updateMembershipState(walletAddress: string, updates: Partial<MembershipState>): Promise<MembershipState | undefined>;

  // Referral operations
  getReferralNode(walletAddress: string): Promise<ReferralNode | undefined>;
  createReferralNode(node: InsertReferralNode): Promise<ReferralNode>;
  updateReferralNode(walletAddress: string, updates: Partial<ReferralNode>): Promise<ReferralNode | undefined>;

  // BCC Balance operations
  getBCCBalance(walletAddress: string): Promise<BCCBalance | undefined>;
  createBCCBalance(balance: InsertBCCBalance): Promise<BCCBalance>;
  updateBCCBalance(walletAddress: string, updates: Partial<BCCBalance>): Promise<BCCBalance | undefined>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByWallet(walletAddress: string): Promise<Order[]>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;

  // Earnings wallet operations
  createEarningsWalletEntry(entry: InsertEarningsWallet): Promise<EarningsWallet>;
  getEarningsWalletByWallet(walletAddress: string): Promise<EarningsWallet[]>;
  updateEarningsWalletEntry(id: string, updates: Partial<EarningsWallet>): Promise<EarningsWallet | undefined>;
  getPendingEarningsEntries(): Promise<EarningsWallet[]>;
  getExpiredEarningsEntries(): Promise<EarningsWallet[]>;

  // Level configuration operations
  getLevelConfig(level: number): Promise<LevelConfig | undefined>;
  getAllLevelConfigs(): Promise<LevelConfig[]>;
  createOrUpdateLevelConfig(config: InsertLevelConfig): Promise<LevelConfig>;

  // NFT verification operations
  getMemberNFTVerification(walletAddress: string): Promise<MemberNFTVerification | undefined>;
  createNFTVerification(verification: InsertMemberNFTVerification): Promise<MemberNFTVerification>;
  updateNFTVerification(walletAddress: string, updates: Partial<MemberNFTVerification>): Promise<MemberNFTVerification | undefined>;

  // Dashboard statistics
  getTotalMemberCount(): Promise<number>;
  getMemberCountByLevel(): Promise<{ level: number; count: number }[]>;
  getGlobalStatistics(): Promise<{
    totalMembers: number;
    totalEarnings: number;
    levelDistribution: { level: number; levelName: string; count: number }[];
  }>;

  // BeeHive business logic operations
  processReferralRewards(buyerWallet: string, level: number): Promise<void>;
  findMatrixPlacement(sponsorWallet: string): Promise<{ placerWallet: string; position: number }>;
  passUpReward(originalRecipient: string, reward: EarningsWallet): Promise<void>;

  // Merchant NFT operations
  getMerchantNFTs(): Promise<MerchantNFT[]>;
  getMerchantNFT(id: string): Promise<MerchantNFT | undefined>;
  createMerchantNFT(nft: InsertMerchantNFT): Promise<MerchantNFT>;

  // NFT Purchase operations
  createNFTPurchase(purchase: InsertNFTPurchase): Promise<NFTPurchase>;
  getNFTPurchasesByWallet(walletAddress: string): Promise<NFTPurchase[]>;

  // Course operations
  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;

  // Course Access operations
  getCourseAccess(walletAddress: string, courseId: string): Promise<CourseAccess | undefined>;
  getCourseAccessByWallet(walletAddress: string): Promise<CourseAccess[]>;
  createCourseAccess(access: InsertCourseAccess): Promise<CourseAccess>;
  updateCourseAccess(walletAddress: string, courseId: string, updates: Partial<CourseAccess>): Promise<CourseAccess | undefined>;

  // Bridge payment operations
  createBridgePayment(bridgePayment: InsertBridgePayment): Promise<BridgePayment>;
  getBridgePayment(sourceTxHash: string): Promise<BridgePayment | undefined>;
  getBridgePaymentsByWallet(walletAddress: string): Promise<BridgePayment[]>;
  updateBridgePayment(id: string, updates: Partial<BridgePayment>): Promise<BridgePayment | undefined>;
  getPendingBridgePayments(): Promise<BridgePayment[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeSeedData();
  }

  private async initializeSeedData() {
    try {
      // Initialize the 19-level BeeHive configuration first
      await this.initializeLevelConfig();
      
      // Check if sample data already exists
      const existingNFTs = await db.select().from(merchantNFTs).limit(1);
      if (existingNFTs.length > 0) return; // Data already seeded

      // Initialize some sample merchant NFTs
      const sampleNFTs: InsertMerchantNFT[] = [
        {
          title: "Digital Art Collection #001",
          description: "Exclusive geometric art piece with rare attributes",
          imageUrl: "https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          priceBCC: 150,
          active: true,
        },
        {
          title: "Legendary Weapon",
          description: "Rare gaming asset with special abilities",
          imageUrl: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          priceBCC: 300,
          active: true,
        },
        {
          title: "Crystal Collection",
          description: "Limited edition crystal with unique properties",
          imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          priceBCC: 75,
          active: true,
        },
        {
          title: "Access Pass",
          description: "Premium access to exclusive platform features",
          imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          priceBCC: 500,
          active: true,
        },
        {
          title: "Audio Track #1",
          description: "Exclusive electronic music composition",
          imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          priceBCC: 200,
          active: true,
        },
        {
          title: "Character Avatar",
          description: "Unique character for metaverse experiences",
          imageUrl: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          priceBCC: 400,
          active: true,
        },
      ];

      await db.insert(merchantNFTs).values(sampleNFTs);

      // Initialize sample courses
      const sampleCourses: InsertCourse[] = [
        {
          title: "Blockchain Basics",
          description: "Learn the fundamentals of blockchain technology and cryptocurrencies",
          requiredLevel: 1,
          priceBCC: 0,
          isFree: true,
          duration: "4 hours",
        },
        {
          title: "DeFi Strategies",
          description: "Advanced strategies for decentralized finance and yield farming",
          requiredLevel: 2,
          priceBCC: 50,
          isFree: false,
          duration: "4 hours",
        },
        {
          title: "NFT Creation",
          description: "Create, mint, and sell your own NFTs on various platforms",
          requiredLevel: 1,
          priceBCC: 0,
          isFree: true,
          duration: "3 hours",
        },
        {
          title: "Trading Masterclass",
          description: "Professional trading techniques and risk management",
          requiredLevel: 3,
          priceBCC: 150,
          isFree: false,
          duration: "8 hours",
        },
        {
          title: "Web3 Development",
          description: "Build decentralized applications with Solidity and Web3",
          requiredLevel: 2,
          priceBCC: 200,
          isFree: false,
          duration: "12 hours",
        },
        {
          title: "Live Workshops",
          description: "Interactive sessions with industry experts",
          requiredLevel: 1,
          priceBCC: 0,
          isFree: true,
          duration: "2 hours",
        },
      ];

      await db.insert(courses).values(sampleCourses);
    } catch (error) {
      console.error('Error initializing seed data:', error);
    }
  }

  private async initializeLevelConfig() {
    try {
      // Check if level config already exists
      const existingLevels = await db.select().from(levelConfig).limit(1);
      if (existingLevels.length > 0) return;

      // BeeHive 19-level configuration
      const levels: InsertLevelConfig[] = [
        { level: 1, levelName: "Warrior", priceUSDT: 13000, rewardAmount: 10000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 2, levelName: "Bronze", priceUSDT: 13000, rewardAmount: 10000, adminFee: 3000, requiredDirectReferrals: 3, maxMatrixCount: 9 },
        { level: 3, levelName: "Silver", priceUSDT: 16000, rewardAmount: 13000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 4, levelName: "Gold", priceUSDT: 24000, rewardAmount: 21000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 5, levelName: "Platinum", priceUSDT: 40000, rewardAmount: 37000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 6, levelName: "Diamond", priceUSDT: 72000, rewardAmount: 69000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 7, levelName: "Master", priceUSDT: 136000, rewardAmount: 133000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 8, levelName: "Grandmaster", priceUSDT: 264000, rewardAmount: 261000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 9, levelName: "Elite", priceUSDT: 520000, rewardAmount: 517000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 10, levelName: "Supreme", priceUSDT: 1032000, rewardAmount: 1029000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 11, levelName: "Legendary", priceUSDT: 2056000, rewardAmount: 2053000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 12, levelName: "Mythical", priceUSDT: 4104000, rewardAmount: 4101000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 13, levelName: "Immortal", priceUSDT: 8200000, rewardAmount: 8197000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 14, levelName: "Celestial", priceUSDT: 16392000, rewardAmount: 16389000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 15, levelName: "Transcendent", priceUSDT: 32776000, rewardAmount: 32773000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 16, levelName: "Divine", priceUSDT: 65544000, rewardAmount: 65541000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 17, levelName: "Cosmic", priceUSDT: 131080000, rewardAmount: 131077000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 18, levelName: "Universal", priceUSDT: 262152000, rewardAmount: 262149000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 19, levelName: "Mythic Peak", priceUSDT: 100000000, rewardAmount: 99997000, adminFee: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 }
      ];

      await db.insert(levelConfig).values(levels);
    } catch (error) {
      console.error('Error initializing level config:', error);
    }
  }

  // User operations
  async getUser(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress.toLowerCase()));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        walletAddress: insertUser.walletAddress.toLowerCase(),
      })
      .returning();
    return user;
  }

  async updateUser(walletAddress: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .returning();
    return user || undefined;
  }

  // Membership operations
  async getMembershipState(walletAddress: string): Promise<MembershipState | undefined> {
    const [state] = await db.select().from(membershipState).where(eq(membershipState.walletAddress, walletAddress.toLowerCase()));
    return state || undefined;
  }

  async createMembershipState(membership: InsertMembershipState): Promise<MembershipState> {
    const insertData = {
      walletAddress: membership.walletAddress.toLowerCase(),
      levelsOwned: membership.levelsOwned || [],
      activeLevel: membership.activeLevel || 0,
    };
    const [state] = await db
      .insert(membershipState)
      .values(insertData)
      .returning();
    return state;
  }

  async updateMembershipState(walletAddress: string, updates: Partial<MembershipState>): Promise<MembershipState | undefined> {
    const [state] = await db
      .update(membershipState)
      .set({ ...updates, lastUpgradeAt: new Date() })
      .where(eq(membershipState.walletAddress, walletAddress.toLowerCase()))
      .returning();
    return state || undefined;
  }

  // Referral operations
  async getReferralNode(walletAddress: string): Promise<any> {
    try {
      // Work directly with existing database structure
      const result = await db.execute(sql`
        SELECT wallet_address, parent_wallet, children, created_at 
        FROM referral_nodes 
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Get referral node error:', error);
      return null;
    }
  }

  async createReferralNode(node: InsertReferralNode): Promise<ReferralNode> {
    // Work with existing database structure (parent_wallet, children)
    const insertData = {
      walletAddress: node.walletAddress.toLowerCase(),
      parentWallet: node.sponsorWallet || null,
      children: [], // Start with empty children array for existing structure
    };
    const [referralNode] = await db
      .insert(referralNodes)
      .values(insertData)
      .returning();
    return referralNode;
  }

  async updateReferralNode(walletAddress: string, updates: Partial<ReferralNode>): Promise<ReferralNode | undefined> {
    try {
      const [node] = await db
        .update(referralNodes)
        .set(updates)
        .where(eq(referralNodes.walletAddress, walletAddress.toLowerCase()))
        .returning();
      return node || undefined;
    } catch (error) {
      console.log('Working with existing referral_nodes structure for updates');
      return undefined;
    }
  }

  // BCC Balance operations
  async getBCCBalance(walletAddress: string): Promise<BCCBalance | undefined> {
    const [balance] = await db.select().from(bccBalances).where(eq(bccBalances.walletAddress, walletAddress.toLowerCase()));
    return balance || undefined;
  }

  async createBCCBalance(balance: InsertBCCBalance): Promise<BCCBalance> {
    const [bccBalance] = await db
      .insert(bccBalances)
      .values({
        ...balance,
        walletAddress: balance.walletAddress.toLowerCase(),
      })
      .returning();
    return bccBalance;
  }

  async updateBCCBalance(walletAddress: string, updates: Partial<BCCBalance>): Promise<BCCBalance | undefined> {
    const [balance] = await db
      .update(bccBalances)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(bccBalances.walletAddress, walletAddress.toLowerCase()))
      .returning();
    return balance || undefined;
  }

  // Order operations
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values({
        ...insertOrder,
        walletAddress: insertOrder.walletAddress.toLowerCase(),
      })
      .returning();
    return order;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByWallet(walletAddress: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.walletAddress, walletAddress.toLowerCase()));
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const updateData = { ...updates };
    if (updates.status === 'completed') {
      updateData.completedAt = new Date();
    }
    const [order] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  // Earnings wallet operations
  async createEarningsWalletEntry(entry: InsertEarningsWallet): Promise<EarningsWallet> {
    const [earnings] = await db
      .insert(earningsWallet)
      .values({
        ...entry,
        walletAddress: entry.walletAddress.toLowerCase(),
        sourceWallet: entry.sourceWallet.toLowerCase(),
      })
      .returning();
    return earnings;
  }

  async getEarningsWalletByWallet(walletAddress: string): Promise<EarningsWallet[]> {
    return await db.select().from(earningsWallet)
      .where(eq(earningsWallet.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(earningsWallet.createdAt));
  }

  async updateEarningsWalletEntry(id: string, updates: Partial<EarningsWallet>): Promise<EarningsWallet | undefined> {
    const [entry] = await db
      .update(earningsWallet)
      .set(updates)
      .where(eq(earningsWallet.id, id))
      .returning();
    return entry || undefined;
  }

  async getPendingEarningsEntries(): Promise<EarningsWallet[]> {
    return await db.select().from(earningsWallet)
      .where(eq(earningsWallet.status, 'pending'))
      .orderBy(desc(earningsWallet.createdAt));
  }

  async getExpiredEarningsEntries(): Promise<EarningsWallet[]> {
    const now = new Date();
    return await db.select().from(earningsWallet)
      .where(and(
        eq(earningsWallet.status, 'pending'),
        sql`${earningsWallet.timerExpireAt} < ${now}`
      ))
      .orderBy(desc(earningsWallet.createdAt));
  }

  // Level configuration operations
  async getLevelConfig(level: number): Promise<LevelConfig | undefined> {
    const [config] = await db.select().from(levelConfig).where(eq(levelConfig.level, level));
    return config || undefined;
  }

  async getAllLevelConfigs(): Promise<LevelConfig[]> {
    return await db.select().from(levelConfig).orderBy(levelConfig.level);
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

  // NFT verification operations
  async getMemberNFTVerification(walletAddress: string): Promise<MemberNFTVerification | undefined> {
    const [verification] = await db.select().from(memberNFTVerification)
      .where(eq(memberNFTVerification.walletAddress, walletAddress.toLowerCase()));
    return verification || undefined;
  }

  async createNFTVerification(verification: InsertMemberNFTVerification): Promise<MemberNFTVerification> {
    const [nftVerification] = await db
      .insert(memberNFTVerification)
      .values({
        ...verification,
        walletAddress: verification.walletAddress.toLowerCase(),
      })
      .returning();
    return nftVerification;
  }

  async updateNFTVerification(walletAddress: string, updates: Partial<MemberNFTVerification>): Promise<MemberNFTVerification | undefined> {
    const [verification] = await db
      .update(memberNFTVerification)
      .set(updates)
      .where(eq(memberNFTVerification.walletAddress, walletAddress.toLowerCase()))
      .returning();
    return verification || undefined;
  }

  // Dashboard statistics
  async getTotalMemberCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.memberActivated, true));
    return result.count || 0;
  }

  async getMemberCountByLevel(): Promise<{ level: number; count: number }[]> {
    const results = await db.select({
      level: membershipState.activeLevel,
      count: sql<number>`count(*)`
    })
    .from(membershipState)
    .groupBy(membershipState.activeLevel)
    .orderBy(membershipState.activeLevel);
    
    return results.map(r => ({ level: r.level, count: r.count || 0 }));
  }

  async getGlobalStatistics(): Promise<{
    totalMembers: number;
    totalEarnings: number;
    levelDistribution: { level: number; levelName: string; count: number }[];
  }> {
    // Get total members
    const totalMembers = await this.getTotalMemberCount();

    // Get total earnings paid out
    const [earningsResult] = await db.select({
      total: sql<number>`coalesce(sum(${earningsWallet.amount}), 0)`
    })
    .from(earningsWallet)
    .where(eq(earningsWallet.status, 'paid'));
    const totalEarnings = earningsResult?.total || 0;

    // Get level distribution with names
    const levelCounts = await db.select({
      level: membershipState.activeLevel,
      count: sql<number>`count(*)`
    })
    .from(membershipState)
    .where(sql`${membershipState.activeLevel} > 0`)
    .groupBy(membershipState.activeLevel)
    .orderBy(membershipState.activeLevel);

    const levelConfigs = await this.getAllLevelConfigs();
    const levelDistribution = levelCounts.map(lc => {
      const config = levelConfigs.find(cfg => cfg.level === lc.level);
      return {
        level: lc.level,
        levelName: config?.levelName || `Level ${lc.level}`,
        count: lc.count || 0
      };
    });

    return {
      totalMembers,
      totalEarnings,
      levelDistribution
    };
  }

  // BeeHive business logic operations
  async processReferralRewards(buyerWallet: string, level: number): Promise<void> {
    const levelConfig = await this.getLevelConfig(level);
    if (!levelConfig) return;

    const buyer = await this.getUser(buyerWallet);
    if (!buyer) return;

    const referralNode = await this.getReferralNode(buyerWallet);
    if (!referralNode || !referralNode.sponsorWallet) return;

    // 1. Process instant 100 USDT referral bonus to sponsor
    await this.createEarningsWalletEntry({
      walletAddress: referralNode.sponsorWallet,
      rewardType: 'instant_referral',
      amount: 10000, // 100 USDT in cents
      sourceWallet: buyerWallet,
      fromLevel: level,
      status: 'paid', // Instant payment
    });

    // 2. Process level reward with 72-hour timer
    const now = new Date();
    const expiryTime = new Date(now.getTime() + (72 * 60 * 60 * 1000)); // 72 hours

    const sponsorMembership = await this.getMembershipState(referralNode.sponsorWallet);
    
    // Check if sponsor is qualified for level reward (must have same or higher level)
    if (sponsorMembership && sponsorMembership.activeLevel >= level) {
      // Check for Bronze special rule (Level 2 requires 3 direct referrals)
      if (level === 2) {
        if (referralNode.directReferralCount < 3) {
          // Pass up the reward
          await this.passUpReward(referralNode.sponsorWallet, {
            walletAddress: referralNode.sponsorWallet,
            rewardType: 'level_reward',
            amount: levelConfig.rewardAmount,
            sourceWallet: buyerWallet,
            fromLevel: level,
            status: 'pending',
            timerStartAt: now,
            timerExpireAt: expiryTime,
            passUpReason: 'bronze_direct_referral_requirement',
          } as EarningsWallet);
          return;
        }
      }

      // Sponsor qualifies for level reward
      await this.createEarningsWalletEntry({
        walletAddress: referralNode.sponsorWallet,
        rewardType: 'level_reward',
        amount: levelConfig.rewardAmount,
        sourceWallet: buyerWallet,
        fromLevel: level,
        status: 'pending',
        timerStartAt: now,
        timerExpireAt: expiryTime,
      });
    } else {
      // Sponsor is under-leveled, pass up the reward
      await this.passUpReward(referralNode.sponsorWallet, {
        walletAddress: referralNode.sponsorWallet,
        rewardType: 'level_reward',
        amount: levelConfig.rewardAmount,
        sourceWallet: buyerWallet,
        fromLevel: level,
        status: 'pending',
        timerStartAt: now,
        timerExpireAt: expiryTime,
        passUpReason: 'under_leveled',
      } as EarningsWallet);
    }
  }

  async findMatrixPlacement(sponsorWallet: string): Promise<{ placerWallet: string; position: number }> {
    // Simple 3x3 matrix placement algorithm
    // First, try to place under direct sponsor
    const sponsorNode = await this.getReferralNode(sponsorWallet);
    if (!sponsorNode) {
      return { placerWallet: sponsorWallet, position: 0 };
    }

    // Calculate total children across all legs
    const totalChildren = sponsorNode.leftLeg.length + sponsorNode.middleLeg.length + sponsorNode.rightLeg.length;
    
    if (totalChildren < 9) {
      // Space available under sponsor
      if (sponsorNode.leftLeg.length < 3) {
        return { placerWallet: sponsorWallet, position: sponsorNode.leftLeg.length };
      } else if (sponsorNode.middleLeg.length < 3) {
        return { placerWallet: sponsorWallet, position: 3 + sponsorNode.middleLeg.length };
      } else if (sponsorNode.rightLeg.length < 3) {
        return { placerWallet: sponsorWallet, position: 6 + sponsorNode.rightLeg.length };
      }
    }

    // Sponsor's matrix is full, look for spillover placement
    // Check children of sponsor for available spots
    const allChildren = [...sponsorNode.leftLeg, ...sponsorNode.middleLeg, ...sponsorNode.rightLeg];
    
    for (const childWallet of allChildren) {
      const childNode = await this.getReferralNode(childWallet);
      if (childNode) {
        const childTotal = childNode.leftLeg.length + childNode.middleLeg.length + childNode.rightLeg.length;
        if (childTotal < 9) {
          // Found space under this child
          if (childNode.leftLeg.length < 3) {
            return { placerWallet: childWallet, position: childNode.leftLeg.length };
          } else if (childNode.middleLeg.length < 3) {
            return { placerWallet: childWallet, position: 3 + childNode.middleLeg.length };
          } else if (childNode.rightLeg.length < 3) {
            return { placerWallet: childWallet, position: 6 + childNode.rightLeg.length };
          }
        }
      }
    }

    // If no space found, place under sponsor at position 0 (this shouldn't happen with proper matrix management)
    return { placerWallet: sponsorWallet, position: 0 };
  }

  async passUpReward(originalRecipient: string, reward: EarningsWallet): Promise<void> {
    // Find the next qualified upline member
    let currentNode = await this.getReferralNode(originalRecipient);
    let passUpCount = 0;
    const maxPassUps = 10; // Prevent infinite loops

    while (currentNode && currentNode.sponsorWallet && passUpCount < maxPassUps) {
      const uplineMembership = await this.getMembershipState(currentNode.sponsorWallet);
      
      if (uplineMembership && uplineMembership.activeLevel >= reward.fromLevel) {
        // Found qualified upline member
        await this.createEarningsWalletEntry({
          ...reward,
          walletAddress: currentNode.sponsorWallet,
          rewardType: 'passup_reward',
          passedUpFrom: originalRecipient,
          passUpReason: reward.passUpReason,
        });
        return;
      }

      // Move up the chain
      currentNode = await this.getReferralNode(currentNode.sponsorWallet);
      passUpCount++;
    }

    // If no qualified upline found, the reward is forfeited (admin keeps it)
    console.log(`Reward of ${reward.amount} cents from ${reward.sourceWallet} forfeited - no qualified upline found`);
  }

  // Merchant NFT operations
  async getMerchantNFTs(): Promise<MerchantNFT[]> {
    return await db.select().from(merchantNFTs).where(eq(merchantNFTs.active, true));
  }

  async getMerchantNFT(id: string): Promise<MerchantNFT | undefined> {
    const [nft] = await db.select().from(merchantNFTs).where(eq(merchantNFTs.id, id));
    return nft || undefined;
  }

  async createMerchantNFT(insertNFT: InsertMerchantNFT): Promise<MerchantNFT> {
    const [nft] = await db
      .insert(merchantNFTs)
      .values(insertNFT)
      .returning();
    return nft;
  }

  // NFT Purchase operations
  async createNFTPurchase(insertPurchase: InsertNFTPurchase): Promise<NFTPurchase> {
    const [purchase] = await db
      .insert(nftPurchases)
      .values({
        ...insertPurchase,
        walletAddress: insertPurchase.walletAddress.toLowerCase(),
      })
      .returning();
    return purchase;
  }

  async getNFTPurchasesByWallet(walletAddress: string): Promise<NFTPurchase[]> {
    return await db.select().from(nftPurchases).where(eq(nftPurchases.walletAddress, walletAddress.toLowerCase()));
  }

  // Course operations
  async getCourses(): Promise<Course[]> {
    return await db.select().from(courses);
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course || undefined;
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const [course] = await db
      .insert(courses)
      .values(insertCourse)
      .returning();
    return course;
  }

  // Course Access operations
  async getCourseAccess(walletAddress: string, courseId: string): Promise<CourseAccess | undefined> {
    const [access] = await db.select().from(courseAccess).where(
      and(
        eq(courseAccess.walletAddress, walletAddress.toLowerCase()),
        eq(courseAccess.courseId, courseId)
      )
    );
    return access || undefined;
  }

  async getCourseAccessByWallet(walletAddress: string): Promise<CourseAccess[]> {
    return await db.select().from(courseAccess).where(eq(courseAccess.walletAddress, walletAddress.toLowerCase()));
  }

  async createCourseAccess(insertAccess: InsertCourseAccess): Promise<CourseAccess> {
    const [access] = await db
      .insert(courseAccess)
      .values({
        ...insertAccess,
        walletAddress: insertAccess.walletAddress.toLowerCase(),
      })
      .returning();
    return access;
  }

  async updateCourseAccess(walletAddress: string, courseId: string, updates: Partial<CourseAccess>): Promise<CourseAccess | undefined> {
    const [access] = await db
      .update(courseAccess)
      .set(updates)
      .where(
        and(
          eq(courseAccess.walletAddress, walletAddress.toLowerCase()),
          eq(courseAccess.courseId, courseId)
        )
      )
      .returning();
    return access || undefined;
  }

  // Bridge Payment Methods
  async createBridgePayment(bridgePayment: InsertBridgePayment): Promise<BridgePayment> {
    const [payment] = await db.insert(bridgePayments)
      .values({
        ...bridgePayment,
        walletAddress: bridgePayment.walletAddress.toLowerCase(),
      })
      .returning();
    return payment;
  }

  async getBridgePayment(sourceTxHash: string): Promise<BridgePayment | undefined> {
    const [payment] = await db.select()
      .from(bridgePayments)
      .where(eq(bridgePayments.sourceTxHash, sourceTxHash));
    return payment || undefined;
  }

  async getBridgePaymentsByWallet(walletAddress: string): Promise<BridgePayment[]> {
    return await db.select()
      .from(bridgePayments)
      .where(eq(bridgePayments.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(bridgePayments.createdAt));
  }

  async updateBridgePayment(id: string, updates: Partial<BridgePayment>): Promise<BridgePayment | undefined> {
    const [updated] = await db.update(bridgePayments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bridgePayments.id, id))
      .returning();
    return updated || undefined;
  }

  async getPendingBridgePayments(): Promise<BridgePayment[]> {
    return await db.select()
      .from(bridgePayments)
      .where(eq(bridgePayments.status, 'pending'))
      .orderBy(desc(bridgePayments.createdAt));
  }

  // Advertisement NFT methods
  async getAdvertisementNFTs(): Promise<AdvertisementNFT[]> {
    return await db.select().from(advertisementNFTs).where(eq(advertisementNFTs.active, true)).orderBy(desc(advertisementNFTs.createdAt));
  }

  async getAdvertisementNFTById(id: string): Promise<AdvertisementNFT | undefined> {
    const [nft] = await db.select().from(advertisementNFTs).where(eq(advertisementNFTs.id, id));
    return nft || undefined;
  }

  async createAdvertisementNFTClaim(claim: InsertAdvertisementNFTClaim): Promise<AdvertisementNFTClaim> {
    // Generate unique active code
    const activeCode = `${claim.nftId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const [newClaim] = await db
      .insert(advertisementNFTClaims)
      .values({
        ...claim,
        walletAddress: claim.walletAddress.toLowerCase(),
        activeCode,
      })
      .returning();
    return newClaim;
  }

  async getUserAdvertisementNFTClaims(walletAddress: string): Promise<(AdvertisementNFTClaim & { nft: AdvertisementNFT })[]> {
    const claims = await db
      .select({
        claim: advertisementNFTClaims,
        nft: advertisementNFTs,
      })
      .from(advertisementNFTClaims)
      .innerJoin(advertisementNFTs, eq(advertisementNFTClaims.nftId, advertisementNFTs.id))
      .where(eq(advertisementNFTClaims.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(advertisementNFTClaims.claimedAt));

    return claims.map(row => ({ ...row.claim, nft: row.nft }));
  }

  async burnAdvertisementNFT(claimId: string, walletAddress: string): Promise<AdvertisementNFTClaim | undefined> {
    const [claim] = await db
      .update(advertisementNFTClaims)
      .set({
        status: 'burned',
        burnedAt: new Date(),
        codeUsedAt: new Date(),
      })
      .where(and(
        eq(advertisementNFTClaims.id, claimId),
        eq(advertisementNFTClaims.walletAddress, walletAddress.toLowerCase()),
        eq(advertisementNFTClaims.status, 'claimed')
      ))
      .returning();
    return claim || undefined;
  }

  async incrementAdvertisementNFTClaimed(nftId: string): Promise<void> {
    await db
      .update(advertisementNFTs)
      .set({
        claimedCount: sql`${advertisementNFTs.claimedCount} + 1`
      })
      .where(eq(advertisementNFTs.id, nftId));
  }

  // BeeHive System Methods

  // Earnings Wallet Operations  
  async getEarningsWalletByWallet(walletAddress: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM earnings_wallet 
      WHERE wallet_address = ${walletAddress.toLowerCase()}
    `);
    return result.rows[0] || null;
  }

  async createEarningsWallet(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO earnings_wallet (
        wallet_address, total_earnings, referral_earnings, level_earnings, 
        pending_rewards, withdrawn_amount, last_reward_at
      ) VALUES (
        ${data.walletAddress.toLowerCase()}, ${data.totalEarnings || 0}, 
        ${data.referralEarnings || 0}, ${data.levelEarnings || 0},
        ${data.pendingRewards || 0}, ${data.withdrawnAmount || 0}, 
        ${data.lastRewardAt || null}
      ) 
      RETURNING *
    `);
    return result.rows[0];
  }

  async updateEarningsWallet(walletAddress: string, updates: any): Promise<any> {
    const setParts = [];
    const values = [walletAddress.toLowerCase()];
    let paramIndex = 2;

    if (updates.totalEarnings !== undefined) {
      setParts.push(`total_earnings = $${paramIndex++}`);
      values.push(updates.totalEarnings);
    }
    if (updates.referralEarnings !== undefined) {
      setParts.push(`referral_earnings = $${paramIndex++}`);
      values.push(updates.referralEarnings);
    }
    if (updates.levelEarnings !== undefined) {
      setParts.push(`level_earnings = $${paramIndex++}`);
      values.push(updates.levelEarnings);
    }
    if (updates.pendingRewards !== undefined) {
      setParts.push(`pending_rewards = $${paramIndex++}`);
      values.push(updates.pendingRewards);
    }
    if (updates.lastRewardAt !== undefined) {
      setParts.push(`last_reward_at = $${paramIndex++}`);
      values.push(updates.lastRewardAt);
    }

    if (setParts.length === 0) return null;

    const result = await db.execute(sql.raw(`
      UPDATE earnings_wallet 
      SET ${setParts.join(', ')} 
      WHERE wallet_address = $1 
      RETURNING *
    `, values));
    
    return result.rows[0];
  }

  // Level Configuration Operations
  async getLevelConfig(level: number): Promise<any> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM level_config WHERE level = ${level}
      `);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Get level config error:', error);
      return null;
    }
  }

  async getAllLevelConfigs(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM level_config ORDER BY level
      `);
      return result.rows;
    } catch (error) {
      console.error('Get all level configs error:', error);
      return [];
    }
  }

  // NFT Verification Operations (using custom table structure)
  async createNFTVerificationCustom(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO member_nft_verification (
        wallet_address, nft_contract_address, token_id, chain_id, 
        verification_status, last_verified
      ) VALUES (
        ${data.walletAddress.toLowerCase()}, ${data.nftContractAddress}, 
        ${data.tokenId}, ${data.chainId}, ${data.verificationStatus}, 
        ${data.lastVerified}
      ) 
      RETURNING *
    `);
    return result.rows[0];
  }

  async getNFTVerificationCustom(walletAddress: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM member_nft_verification 
      WHERE wallet_address = ${walletAddress.toLowerCase()}
      ORDER BY created_at DESC
    `);
    return result.rows;
  }

  // Global Statistics (updated to work with current structure)
  async getGlobalStatisticsCustom(): Promise<any> {
    const totalMembersResult = await db.execute(sql`
      SELECT COUNT(*) as total_members FROM users WHERE member_activated = true
    `);
    
    const levelDistributionResult = await db.execute(sql`
      SELECT active_level, COUNT(*) as count 
      FROM membership_state 
      WHERE active_level > 0 
      GROUP BY active_level 
      ORDER BY active_level
    `);

    const levelConfigs = await this.getAllLevelConfigs();

    return {
      totalMembers: parseInt(totalMembersResult.rows[0]?.total_members || '0'),
      levelDistribution: levelDistributionResult.rows.map(row => {
        const config = levelConfigs.find(cfg => cfg.level === parseInt(row.active_level));
        return {
          level: parseInt(row.active_level),
          levelName: config?.level_name || `Level ${row.active_level}`,
          count: parseInt(row.count)
        };
      })
    };
  }

  // BeeHive Reward Processing (adapted for existing database structure)
  async processReferralRewards(buyerWallet: string, level: number): Promise<void> {
    try {
      const buyer = await this.getUser(buyerWallet);
      if (!buyer?.referrerWallet) return;

      // Level 1 - Instant 100 USDT reward
      if (level === 1) {
        await this.addEarningsReward(buyer.referrerWallet, 100, 'referral');
        return;
      }

      // Level 2+ - Check if sponsor has the level, if not pass up
      const sponsorMembership = await this.getMembershipState(buyer.referrerWallet);
      const sponsorHasLevel = sponsorMembership?.levelsOwned?.includes(level);

      if (sponsorHasLevel) {
        // Sponsor qualifies - add to pending rewards with timer
        const levelConfig = await this.getLevelConfig(level);
        if (levelConfig) {
          await this.addEarningsReward(buyer.referrerWallet, parseFloat(levelConfig.reward_amount), 'level', true);
        }
      } else {
        // Pass up using existing parent_wallet structure
        const sponsorNode = await this.getReferralNode(buyer.referrerWallet);
        if (sponsorNode?.parent_wallet) {
          await this.processReferralRewards(buyerWallet, level);
        }
      }
    } catch (error) {
      console.error('Process referral rewards error:', error);
    }
  }

  async addEarningsReward(walletAddress: string, amount: number, type: string, isPending = false): Promise<void> {
    let earnings = await this.getEarningsWalletByWallet(walletAddress);
    
    if (!earnings) {
      earnings = await this.createEarningsWallet({
        walletAddress,
        totalEarnings: 0,
        referralEarnings: 0,
        levelEarnings: 0,
        pendingRewards: 0,
        withdrawnAmount: 0,
      });
    }

    const updates: any = {
      lastRewardAt: new Date()
    };

    if (isPending) {
      updates.pendingRewards = (parseFloat(earnings.pending_rewards || '0') + amount);
    } else {
      updates.totalEarnings = (parseFloat(earnings.total_earnings || '0') + amount);
      if (type === 'referral') {
        updates.referralEarnings = (parseFloat(earnings.referral_earnings || '0') + amount);
      } else if (type === 'level') {
        updates.levelEarnings = (parseFloat(earnings.level_earnings || '0') + amount);
      }
    }

    await this.updateEarningsWallet(walletAddress, updates);
  }

  // Company-wide statistics
  async getCompanyStats(): Promise<any> {
    try {
      // Total members (activated users)
      const totalMembersResult = await db.execute(sql`
        SELECT COUNT(*) as total FROM users WHERE member_activated = true
      `);
      const totalMembers = Number(totalMembersResult[0]?.total || 0);

      // Members by level
      const levelDistributionResult = await db.execute(sql`
        SELECT m.active_level, COUNT(*) as count 
        FROM membership_state m 
        INNER JOIN users u ON m.wallet_address = u.wallet_address 
        WHERE u.member_activated = true
        GROUP BY m.active_level 
        ORDER BY m.active_level
      `);

      // Total rewards paid out - simplified for now
      const totalRewards = 0; // Will be calculated from actual earnings data later

      // Pending rewards - simplified for now  
      const pendingRewards = 0; // Will be calculated from actual pending data later

      const levelDistribution = Array.from(levelDistributionResult).map((row: any) => ({
        level: Number(row.active_level),
        count: Number(row.count)
      }));

      return {
        totalMembers,
        levelDistribution,
        totalRewards,
        pendingRewards,
      };
    } catch (error) {
      console.error('Get company stats error:', error);
      return {
        totalMembers: 0,
        levelDistribution: [],
        totalRewards: 0,
        pendingRewards: 0,
      };
    }
  }

  // User-specific referral statistics
  async getUserReferralStats(walletAddress: string): Promise<any> {
    try {
      // Get user's referral node
      const userNode = await this.getReferralNode(walletAddress);
      
      // Direct referrals count
      const directReferrals = userNode?.children ? JSON.parse(userNode.children as any).length : 0;

      // Total team size - simplified for now
      const totalTeam = directReferrals; // Will expand to full recursive count later

      // User's earnings - simplified for now
      const totalEarnings = 0;
      const pendingRewards = 0;

      // Recent direct referrals with real data
      const directReferralsResult = await db.execute(sql`
        SELECT u.wallet_address, u.username, u.current_level, u.created_at
        FROM users u
        WHERE u.referrer_wallet = ${walletAddress} AND u.member_activated = true
        ORDER BY u.created_at DESC
        LIMIT 10
      `);

      const directReferralsList = Array.from(directReferralsResult).map((row: any) => ({
        walletAddress: row.wallet_address,
        username: row.username,
        level: row.current_level,
        joinDate: row.created_at,
        earnings: 0 // Will be calculated from earnings table later
      }));

      return {
        directReferrals,
        totalTeam,
        totalEarnings,
        pendingRewards,
        directReferralsList
      };
    } catch (error) {
      console.error('Get user referral stats error:', error);
      return {
        directReferrals: 0,
        totalTeam: 0,
        totalEarnings: 0,
        pendingRewards: 0,
        directReferralsList: []
      };
    }
  }
}

export const storage = new DatabaseStorage();
