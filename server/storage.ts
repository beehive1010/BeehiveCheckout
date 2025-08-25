import { 
  users,
  membershipState,
  referralNodes,
  referralLayers,
  rewardNotifications,
  globalMatrixPosition,
  bccBalances,
  orders,
  earningsWallet,
  levelConfig,
  memberNFTVerification,
  merchantNFTs,
  nftPurchases,
  courses,
  courseLessons,
  courseAccess,
  lessonAccess,
  bridgePayments,
  advertisementNFTs,
  advertisementNFTClaims,
  adminUsers,
  adminSessions,
  discoverPartners,
  dappTypes,
  partnerChains,
  memberActivations,
  rewardDistributions,
  adminSettings,
  type User, 
  type InsertUser,
  type MembershipState,
  type InsertMembershipState,
  type ReferralNode,
  type InsertReferralNode,
  type ReferralLayer,
  type InsertReferralLayer,
  type RewardNotification,
  type InsertRewardNotification,
  type GlobalMatrixPosition,
  type InsertGlobalMatrixPosition,
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
  type CourseLesson,
  type InsertCourseLesson,
  type CourseAccess,
  type InsertCourseAccess,
  type LessonAccess,
  type InsertLessonAccess,
  type BridgePayment,
  type InsertBridgePayment,
  type AdvertisementNFT,
  type InsertAdvertisementNFT,
  type AdvertisementNFTClaim,
  type InsertAdvertisementNFTClaim,
  type AdminUser,
  type InsertAdminUser,
  type AdminSession,
  type InsertAdminSession,
  tokenPurchases,
  cthBalances,
  type TokenPurchase,
  type InsertTokenPurchase,
  type CTHBalance,
  type InsertCTHBalance,
  type DiscoverPartner,
  type InsertDiscoverPartner,
  type DappType,
  type InsertDappType,
  type PartnerChain,
  walletConnectionLogs,
  type WalletConnectionLog,
  type InsertWalletConnectionLog,
  type InsertPartnerChain,
  type MemberActivation,
  type InsertMemberActivation,
  type RewardDistribution,
  type InsertRewardDistribution,
  type AdminSetting,
  type InsertAdminSetting
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, isNull, inArray, not, gt, lt } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // NFT operations
  recordNFTPurchase(purchase: InsertNFTPurchase): Promise<NFTPurchase>;
  
  // User operations
  getUser(walletAddress: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(walletAddress: string, updates: Partial<User>): Promise<User | undefined>;

  // Membership operations
  getMembershipState(walletAddress: string): Promise<MembershipState | undefined>;
  createMembershipState(membership: InsertMembershipState): Promise<MembershipState>;
  updateMembershipState(walletAddress: string, updates: Partial<MembershipState>): Promise<MembershipState | undefined>;

  // Global Matrix Position operations
  getGlobalMatrixPosition(walletAddress: string): Promise<GlobalMatrixPosition | undefined>;
  createGlobalMatrixPosition(position: InsertGlobalMatrixPosition): Promise<GlobalMatrixPosition>;
  updateGlobalMatrixPosition(walletAddress: string, updates: Partial<GlobalMatrixPosition>): Promise<GlobalMatrixPosition | undefined>;
  findGlobalMatrixPlacement(sponsorWallet: string): Promise<{ matrixLevel: number; positionIndex: number; placementSponsorWallet: string }>;

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
  getDirectReferralCount(walletAddress: string): Promise<number>;
  getGlobalStatistics(): Promise<{
    totalMembers: number;
    totalEarnings: number;
    levelDistribution: { level: number; levelName: string; count: number }[];
  }>;

  // BeeHive business logic operations
  processGlobalMatrixRewards(buyerWallet: string, level: number): Promise<void>;
  processReferralRewards(walletAddress: string, level: number): Promise<void>;
  createRewardDistribution(distribution: InsertRewardDistribution): Promise<RewardDistribution>;

  // Merchant NFT operations
  getMerchantNFTs(): Promise<MerchantNFT[]>;
  getMerchantNFT(id: string): Promise<MerchantNFT | undefined>;
  createMerchantNFT(nft: InsertMerchantNFT): Promise<MerchantNFT>;

  // NFT Purchase operations
  createNFTPurchase(purchase: InsertNFTPurchase): Promise<NFTPurchase>;
  getNFTPurchasesByWallet(walletAddress: string): Promise<(NFTPurchase & { nft: MerchantNFT })[]>;

  // Course operations
  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  getCourseLessons(courseId: string): Promise<CourseLesson[]>;

  // Course Access operations
  getCourseAccess(walletAddress: string, courseId: string): Promise<CourseAccess | undefined>;
  getCourseAccessByWallet(walletAddress: string): Promise<CourseAccess[]>;
  createCourseAccess(access: InsertCourseAccess): Promise<CourseAccess>;
  updateCourseAccess(walletAddress: string, courseId: string, updates: Partial<CourseAccess>): Promise<CourseAccess | undefined>;

  // Lesson Access operations
  getLessonAccessByCourse(walletAddress: string, courseId: string): Promise<LessonAccess[]>;

  // Referral node operations
  getReferralNode(walletAddress: string): Promise<ReferralNode | undefined>;
  createReferralNode(referralNode: InsertReferralNode): Promise<ReferralNode>;
  updateReferralNode(walletAddress: string, updates: Partial<ReferralNode>): Promise<ReferralNode | undefined>;
  
  // 19-Layer referral tracking operations
  getReferralLayers(walletAddress: string): Promise<ReferralLayer[]>;
  getReferralLayer(walletAddress: string, layerNumber: number): Promise<ReferralLayer | undefined>;
  createOrUpdateReferralLayer(layer: InsertReferralLayer): Promise<ReferralLayer>;
  calculateAndStore19Layers(walletAddress: string): Promise<void>;
  
  // Reward notification operations
  getRewardNotifications(walletAddress: string): Promise<RewardNotification[]>;
  getPendingRewardNotifications(walletAddress: string): Promise<RewardNotification[]>;
  createRewardNotification(notification: InsertRewardNotification): Promise<RewardNotification>;
  updateRewardNotification(id: string, updates: Partial<RewardNotification>): Promise<RewardNotification | undefined>;
  checkAndExpireNotifications(): Promise<void>;

  // Bridge payment operations
  createBridgePayment(bridgePayment: InsertBridgePayment): Promise<BridgePayment>;
  getBridgePayment(sourceTxHash: string): Promise<BridgePayment | undefined>;
  getBridgePaymentsByWallet(walletAddress: string): Promise<BridgePayment[]>;
  updateBridgePayment(id: string, updates: Partial<BridgePayment>): Promise<BridgePayment | undefined>;
  getPendingBridgePayments(): Promise<BridgePayment[]>;

  // Token Purchase operations
  createTokenPurchase(purchase: InsertTokenPurchase): Promise<TokenPurchase>;
  getTokenPurchase(id: string): Promise<TokenPurchase | undefined>;
  getTokenPurchasesByWallet(walletAddress: string): Promise<TokenPurchase[]>;
  updateTokenPurchase(id: string, updates: Partial<TokenPurchase>): Promise<TokenPurchase | undefined>;

  // CTH Balance operations
  getCTHBalance(walletAddress: string): Promise<CTHBalance | undefined>;
  createCTHBalance(balance: InsertCTHBalance): Promise<CTHBalance>;
  updateCTHBalance(walletAddress: string, updates: Partial<CTHBalance>): Promise<CTHBalance | undefined>;

  // User Activity operations
  getUserActivity(walletAddress: string, limit?: number): Promise<Array<{
    id: string;
    type: 'reward' | 'purchase' | 'nft_purchase' | 'token_purchase' | 'membership';
    description: string;
    amount?: string;
    timestamp: Date;
    status?: string;
  }>>;
  getUserBalances(walletAddress: string): Promise<{
    usdt?: number;
    bccTransferable: number;
    bccRestricted: number;
    cth: number;
  }>;

  // Admin User operations
  getAdminUsers(filters?: { search?: string; role?: string; status?: string }): Promise<AdminUser[]>;
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | undefined>;
  deleteAdminUser(id: string): Promise<boolean>;

  // Admin Session operations
  createAdminSession(session: InsertAdminSession): Promise<AdminSession>;
  getAdminSession(sessionToken: string): Promise<AdminSession | undefined>;
  deleteAdminSession(sessionToken: string): Promise<boolean>;
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

      // BeeHive 19-level configuration with correct pricing
      // Level 1: 130 USDT (100 NFT + 30 admin fee)
      // Level 2+: Each level adds 50 USDT (all goes to NFT price, no admin fee)
      const levels: InsertLevelConfig[] = [
        { level: 1, levelName: "Warrior", priceUSDT: 13000, nftPriceUSDT: 10000, platformFeeUSDT: 3000, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 2, levelName: "Bronze", priceUSDT: 15000, nftPriceUSDT: 15000, platformFeeUSDT: 0, requiredDirectReferrals: 3, maxMatrixCount: 9 },
        { level: 3, levelName: "Silver", priceUSDT: 20000, nftPriceUSDT: 20000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 4, levelName: "Gold", priceUSDT: 25000, nftPriceUSDT: 25000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 5, levelName: "Elite", priceUSDT: 30000, nftPriceUSDT: 30000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 6, levelName: "Platinum", priceUSDT: 35000, nftPriceUSDT: 35000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 7, levelName: "Master", priceUSDT: 40000, nftPriceUSDT: 40000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 8, levelName: "Diamond", priceUSDT: 45000, nftPriceUSDT: 45000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 9, levelName: "Grandmaster", priceUSDT: 50000, nftPriceUSDT: 50000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 10, levelName: "Star Shine", priceUSDT: 55000, nftPriceUSDT: 55000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 11, levelName: "Epic", priceUSDT: 60000, nftPriceUSDT: 60000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 12, levelName: "Hall", priceUSDT: 65000, nftPriceUSDT: 65000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 13, levelName: "The Strongest King", priceUSDT: 70000, nftPriceUSDT: 70000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 14, levelName: "The King of Kings", priceUSDT: 75000, nftPriceUSDT: 75000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 15, levelName: "Glory King", priceUSDT: 80000, nftPriceUSDT: 80000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 16, levelName: "Legendary Overlord", priceUSDT: 85000, nftPriceUSDT: 85000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 17, levelName: "Supreme Lord", priceUSDT: 90000, nftPriceUSDT: 90000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 18, levelName: "Supreme Myth", priceUSDT: 95000, nftPriceUSDT: 95000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 19, levelName: "Mythical Peak", priceUSDT: 100000, nftPriceUSDT: 100000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 }
      ];

      await db.insert(levelConfig).values(levels);
    } catch (error) {
      console.error('Error initializing level config:', error);
    }
  }

  // NFT operations
  async recordNFTPurchase(purchase: InsertNFTPurchase): Promise<NFTPurchase> {
    const [nftPurchase] = await db
      .insert(nftPurchases)
      .values({
        ...purchase,
        walletAddress: purchase.walletAddress.toLowerCase(),
      })
      .returning();
    return nftPurchase;
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
    const [state] = await db
      .insert(membershipState)
      .values({
        walletAddress: membership.walletAddress.toLowerCase(),
        levelsOwned: membership.levelsOwned || [],
        activeLevel: membership.activeLevel || 0,
        joinedAt: new Date(),
      })
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

  // Global Matrix Position operations
  async getGlobalMatrixPosition(walletAddress: string): Promise<GlobalMatrixPosition | undefined> {
    try {
      const [position] = await db.select()
        .from(globalMatrixPosition)
        .where(eq(globalMatrixPosition.walletAddress, walletAddress.toLowerCase()));
      return position || undefined;
    } catch (error) {
      console.error('Get global matrix position error:', error);
      return undefined;
    }
  }

  async createGlobalMatrixPosition(position: InsertGlobalMatrixPosition): Promise<GlobalMatrixPosition> {
    const [matrixPosition] = await db
      .insert(globalMatrixPosition)
      .values({
        ...position,
        walletAddress: position.walletAddress.toLowerCase(),
        directSponsorWallet: position.directSponsorWallet.toLowerCase(),
        placementSponsorWallet: position.placementSponsorWallet.toLowerCase(),
      })
      .returning();
    return matrixPosition;
  }

  async updateGlobalMatrixPosition(walletAddress: string, updates: Partial<GlobalMatrixPosition>): Promise<GlobalMatrixPosition | undefined> {
    try {
      const [position] = await db
        .update(globalMatrixPosition)
        .set(updates)
        .where(eq(globalMatrixPosition.walletAddress, walletAddress.toLowerCase()))
        .returning();
      return position || undefined;
    } catch (error) {
      console.error('Update global matrix position error:', error);
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

  // Simple earnings wallet operations (for compatibility) - removed duplicate

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

  async getDirectReferralCount(walletAddress: string): Promise<number> {
    const result = await db.select({
      count: sql<number>`count(*)`
    })
    .from(users)
    .where(eq(users.referrerWallet, walletAddress.toLowerCase()));
    
    return result[0]?.count || 0;
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
      total: sql<number>`coalesce(sum(${earningsWallet.totalEarnings}), 0)`
    })
    .from(earningsWallet);
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

  // BeeHive business logic operations - NEW GLOBAL MATRIX LOGIC
  // Process rewards according to EXACT specification: Layer-based rewards only
  async processGlobalMatrixRewards(buyerWallet: string, purchasedLevel: number): Promise<void> {
    const matrixPosition = await this.getGlobalMatrixPosition(buyerWallet);
    if (!matrixPosition) return;

    // Get level config for pricing
    const levelConfig = await this.getLevelConfig(purchasedLevel);
    if (!levelConfig) return;

    // SPECIFICATION: "When a member in your Layer n purchases Level n NFT, a pending reward = NFT price is created for you"
    // Find all uplines who should receive rewards when this member buys Level n NFT
    
    const uplineWallets = await this.getUplineWallets(buyerWallet, purchasedLevel);
    
    for (const uplineWallet of uplineWallets) {
      const pendingUntil = new Date();
      pendingUntil.setHours(pendingUntil.getHours() + 72); // 72-hour countdown
      
      // Check qualification based on level
      let isQualified = false;
      const uplineMembership = await this.getMembershipState(uplineWallet);
      
      if (purchasedLevel === 1) {
        // Level 1: Must own L1, 3rd reward requires L2
        const layer1Count = await this.getLayer1MemberCount(uplineWallet);
        if (layer1Count <= 2) {
          // First 2 rewards: just need L1
          isQualified = uplineMembership?.levelsOwned.includes(1) || false;
        } else {
          // 3rd reward: requires L2 upgrade
          isQualified = uplineMembership?.levelsOwned.includes(2) || false;
        }
      } else if (purchasedLevel === 2) {
        // Level 2: Must own L2 AND at least one Layer 1 member has L2
        const hasL2 = uplineMembership?.levelsOwned.includes(2) || false;
        const hasL1MemberWithL2 = await this.hasLayer1MemberWithLevel(uplineWallet, 2);
        isQualified = hasL2 && hasL1MemberWithL2;
      } else {
        // Levels 3-19: Just need to own that level or higher
        isQualified = uplineMembership?.levelsOwned.some(level => level >= purchasedLevel) || false;
      }
      
      // Create reward (rewardable price only - admin fee excluded)
      const rewardAmount = purchasedLevel === 1 ? '100.00' : levelConfig.nftPriceUSDT.toFixed(2);
      
      await this.createRewardDistribution({
        recipientWallet: uplineWallet,
        sourceWallet: buyerWallet,
        rewardType: 'level_bonus',
        rewardAmount,
        level: purchasedLevel,
        status: isQualified ? 'claimable' : 'pending',
        pendingUntil: isQualified ? undefined : pendingUntil,
      });
    }
  }

  // NEW: Global Matrix Placement Algorithm
  // BFS placement algorithm - places members by join time in first available slot
  async findGlobalMatrixPlacement(sponsorWallet: string): Promise<{ matrixLevel: number; positionIndex: number; placementSponsorWallet: string }> {
    // Level 1: exactly 3 seats (fixed cap)
    const level1Occupied = await db.select()
      .from(globalMatrixPosition)
      .where(eq(globalMatrixPosition.matrixLevel, 1))
      .orderBy(globalMatrixPosition.positionIndex);
    
    if (level1Occupied.length < 3) {
      // Place in Level 1 (positions 0, 1, 2)
      return {
        matrixLevel: 1,
        positionIndex: level1Occupied.length,
        placementSponsorWallet: sponsorWallet // Level 1 uses direct sponsor
      };
    }
    
    // Level 2+: BFS spillover placement (3^level positions each)
    for (let level = 2; level <= 19; level++) {
      const maxPositionsForLevel = Math.pow(3, level); // 9, 27, 81, 243, etc.
      
      const existingPositions = await db.select()
        .from(globalMatrixPosition)
        .where(eq(globalMatrixPosition.matrixLevel, level))
        .orderBy(globalMatrixPosition.positionIndex);
      
      if (existingPositions.length < maxPositionsForLevel) {
        // Found space in this level
        const nextPositionIndex = existingPositions.length;
        
        // BFS: Find earliest member who can place this person (by join time)
        let placementWallet = sponsorWallet;
        
        const allMembers = await db.select()
          .from(globalMatrixPosition)
          .orderBy(sql`joined_at`); // BFS by join time
        
        // Use first available member as placement sponsor (simplified BFS)
        if (allMembers.length > 0) {
          placementWallet = allMembers[0].walletAddress;
        }
        
        return {
          matrixLevel: level,
          positionIndex: nextPositionIndex,
          placementSponsorWallet: placementWallet
        };
      }
    }
    
    throw new Error('Global matrix is full (all 19 levels filled)');
  }

  // Helper: Get upline wallets who should receive rewards for this purchase
  async getUplineWallets(buyerWallet: string, purchasedLevel: number): Promise<string[]> {
    const uplines: string[] = [];
    let currentWallet = buyerWallet;
    
    // Traverse up the matrix to find uplines at each layer
    for (let layer = 1; layer <= purchasedLevel && layer <= 19; layer++) {
      const position = await this.getGlobalMatrixPosition(currentWallet);
      if (!position || position.directSponsorWallet === currentWallet) break;
      
      const uplineWallet = position.directSponsorWallet;
      if (layer === purchasedLevel) {
        uplines.push(uplineWallet); // This upline should get the reward
      }
      currentWallet = uplineWallet;
    }
    
    return uplines;
  }

  // Helper: Get count of Layer 1 members for qualification checks
  async getLayer1MemberCount(uplineWallet: string): Promise<number> {
    const layer1Members = await db.select()
      .from(globalMatrixPosition)
      .where(eq(globalMatrixPosition.directSponsorWallet, uplineWallet.toLowerCase()));
    return layer1Members.length;
  }

  // Helper: Check if upline has at least one Layer 1 member with specified level
  async hasLayer1MemberWithLevel(uplineWallet: string, requiredLevel: number): Promise<boolean> {
    const layer1Members = await db.select()
      .from(globalMatrixPosition)
      .where(eq(globalMatrixPosition.directSponsorWallet, uplineWallet.toLowerCase()));
    
    for (const member of layer1Members) {
      const membership = await this.getMembershipState(member.walletAddress);
      if (membership?.levelsOwned.includes(requiredLevel)) {
        return true;
      }
    }
    return false;
  }

  // Removed duplicate findNearestActivatedUpline function

  async processReferralRewards(walletAddress: string, level: number): Promise<void> {
    try {
      console.log(`Processing referral rewards for ${walletAddress} at level ${level}`);
      
      // Get user's referral information
      const user = await this.getUser(walletAddress);
      if (!user || !user.referrerWallet) {
        console.log('User has no referrer, skipping referral rewards');
        return;
      }

      // Direct referral reward: 100 USDT to the direct referrer
      const directRewardAmount = 100;
      
      // Create reward entry for direct referrer
      await this.createRewardDistribution({
        recipientWallet: user.referrerWallet,
        sourceWallet: walletAddress,
        rewardType: 'direct_referral',
        rewardAmount: directRewardAmount.toString(),
        level: level,
        status: 'claimable',
      });
      
      console.log(`Created direct referral reward for ${user.referrerWallet}: ${directRewardAmount} USDT`);
      
      // Update BCC balance for the referrer (40% transferable, 60% restricted)
      const referrerBCCBalance = await this.getBCCBalance(user.referrerWallet);
      if (referrerBCCBalance) {
        const bccReward = directRewardAmount; // 1:1 USDT to BCC for referral rewards
        await this.updateBCCBalance(user.referrerWallet, {
          transferable: referrerBCCBalance.transferable + Math.floor(bccReward * 0.4),
          restricted: referrerBCCBalance.restricted + Math.floor(bccReward * 0.6),
        });
        
        console.log(`Updated BCC balance for referrer ${user.referrerWallet}`);
      } else {
        // Create initial BCC balance if doesn't exist
        const bccReward = directRewardAmount;
        await this.createBCCBalance({
          walletAddress: user.referrerWallet,
          transferable: Math.floor(bccReward * 0.4),
          restricted: Math.floor(bccReward * 0.6),
        });
        
        console.log(`Created initial BCC balance for referrer ${user.referrerWallet}`);
      }
      
    } catch (error) {
      console.error('Error processing referral rewards:', error);
      throw error;
    }
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

  async getNFTPurchasesByWallet(walletAddress: string): Promise<(NFTPurchase & { nft: MerchantNFT })[]> {
    const purchases = await db
      .select({
        purchase: nftPurchases,
        nft: merchantNFTs,
      })
      .from(nftPurchases)
      .innerJoin(merchantNFTs, eq(nftPurchases.nftId, merchantNFTs.id))
      .where(eq(nftPurchases.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(nftPurchases.createdAt));
    
    return purchases.map(row => ({ ...row.purchase, nft: row.nft }));
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

  async getCourseLessons(courseId: string): Promise<CourseLesson[]> {
    return await db.select().from(courseLessons)
      .where(eq(courseLessons.courseId, courseId))
      .orderBy(courseLessons.lessonOrder);
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

  // Lesson Access operations
  async getLessonAccessByCourse(walletAddress: string, courseId: string): Promise<LessonAccess[]> {
    return await db.select().from(lessonAccess)
      .where(
        and(
          eq(lessonAccess.walletAddress, walletAddress.toLowerCase()),
          eq(lessonAccess.courseId, courseId)
        )
      );
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

    const queryStr = `UPDATE earnings_wallet SET ${setParts.join(', ')} WHERE wallet_address = $1 RETURNING *`;
    const result = await db.execute(sql.raw(queryStr));
    
    return result.rows[0];
  }

  // Level Configuration Operations (duplicate removed)

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
        const config = levelConfigs.find(cfg => cfg.level === parseInt(row.active_level as string));
        return {
          level: parseInt(row.active_level as string),
          levelName: config?.levelName || `Level ${row.active_level}`,
          count: parseInt(row.count as string)
        };
      })
    };
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
      updates.pendingRewards = amount;
    } else {
      updates.totalEarnings = amount;
      if (type === 'referral') {
        updates.referralEarnings = amount;
      } else if (type === 'level') {
        updates.levelEarnings = amount;
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
      const totalMembers = Number(totalMembersResult.rows[0]?.total || 0);

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

      const levelDistribution = levelDistributionResult.rows.map((row: any) => ({
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
      // Get user's global matrix position
      const userPosition = await this.getGlobalMatrixPosition(walletAddress);
      
      // Direct referrals count from global matrix
      const directReferralsCount = await db.select()
        .from(globalMatrixPosition)
        .where(eq(globalMatrixPosition.directSponsorWallet, walletAddress.toLowerCase()));
      const directReferrals = directReferralsCount.length;

      // Total team size - simplified for now
      const totalTeam = directReferrals; // Will expand to full recursive count later

      // User's earnings - simplified for now
      const totalEarnings = 0;
      const pendingRewards = 0;

      // Recent direct referrals with real data
      const directReferralsList = directReferralsCount.map((position) => ({
        walletAddress: position.walletAddress,
        username: 'User', // Will get from users table later
        level: position.matrixLevel,
        joinDate: position.joinedAt,
        earnings: 0 // Will be calculated from earnings table later
      }));

      // Get real downline matrix data for all 19 levels
      const downlineMatrix = [];
      for (let level = 1; level <= 19; level++) {
        try {
          // Count members at this specific level in the user's downline
          const levelMembersResult = await db.execute(sql`
            WITH RECURSIVE downline_tree AS (
              SELECT wallet_address, referrer_wallet, current_level, 1 as depth
              FROM users 
              WHERE referrer_wallet = ${walletAddress}
              
              UNION ALL
              
              SELECT u.wallet_address, u.referrer_wallet, u.current_level, dt.depth + 1
              FROM users u
              JOIN downline_tree dt ON u.referrer_wallet = dt.wallet_address
              WHERE dt.depth < 19
            )
            SELECT COUNT(*) as member_count
            FROM downline_tree 
            WHERE current_level = ${level}
          `);

          const memberCount = Number(levelMembersResult.rows[0]?.member_count || 0);
          
          // Count total placements at this level (matrix positions filled)
          const placementResult = await db.execute(sql`
            WITH RECURSIVE downline_tree AS (
              SELECT wallet_address, referrer_wallet, 1 as depth
              FROM users 
              WHERE referrer_wallet = ${walletAddress}
              
              UNION ALL
              
              SELECT u.wallet_address, u.referrer_wallet, dt.depth + 1
              FROM users u
              JOIN downline_tree dt ON u.referrer_wallet = dt.wallet_address
              WHERE dt.depth < 19
            )
            SELECT COUNT(*) as placement_count
            FROM downline_tree 
            WHERE depth = ${level}
          `);

          const placementCount = Number(placementResult.rows[0]?.placement_count || 0);

          downlineMatrix.push({
            level,
            members: memberCount,
            placements: placementCount
          });
        } catch (error) {
          console.error(`Error fetching downline data for level ${level}:`, error);
          downlineMatrix.push({
            level,
            members: 0,
            placements: 0
          });
        }
      }

      return {
        directReferrals,
        totalTeam,
        totalEarnings,
        pendingRewards,
        directReferralsList,
        downlineMatrix
      };
    } catch (error) {
      console.error('Get user referral stats error:', error);
      return {
        directReferrals: 0,
        totalTeam: 0,
        totalEarnings: 0,
        pendingRewards: 0,
        directReferralsList: [],
        downlineMatrix: Array.from({length: 19}, (_, i) => ({
          level: i + 1,
          members: 0,
          placements: 0
        }))
      };
    }
  }

  // Token Purchase operations
  async createTokenPurchase(purchase: InsertTokenPurchase): Promise<TokenPurchase> {
    const [tokenPurchase] = await db
      .insert(tokenPurchases)
      .values({
        ...purchase,
        walletAddress: purchase.walletAddress.toLowerCase(),
      })
      .returning();
    return tokenPurchase;
  }

  async getTokenPurchase(id: string): Promise<TokenPurchase | undefined> {
    const [purchase] = await db.select().from(tokenPurchases).where(eq(tokenPurchases.id, id));
    return purchase || undefined;
  }

  async getTokenPurchasesByWallet(walletAddress: string): Promise<TokenPurchase[]> {
    return await db.select().from(tokenPurchases)
      .where(eq(tokenPurchases.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(tokenPurchases.createdAt));
  }

  async updateTokenPurchase(id: string, updates: Partial<TokenPurchase>): Promise<TokenPurchase | undefined> {
    const [purchase] = await db
      .update(tokenPurchases)
      .set(updates)
      .where(eq(tokenPurchases.id, id))
      .returning();
    return purchase || undefined;
  }

  // CTH Balance operations
  async getCTHBalance(walletAddress: string): Promise<CTHBalance | undefined> {
    const [balance] = await db.select().from(cthBalances).where(eq(cthBalances.walletAddress, walletAddress.toLowerCase()));
    return balance || undefined;
  }

  async createCTHBalance(balance: InsertCTHBalance): Promise<CTHBalance> {
    const [cthBalance] = await db
      .insert(cthBalances)
      .values({
        ...balance,
        walletAddress: balance.walletAddress.toLowerCase(),
      })
      .returning();
    return cthBalance;
  }

  async updateCTHBalance(walletAddress: string, updates: Partial<CTHBalance>): Promise<CTHBalance | undefined> {
    const [balance] = await db
      .update(cthBalances)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(cthBalances.walletAddress, walletAddress.toLowerCase()))
      .returning();
    return balance || undefined;
  }

  // User Activity operations
  async getUserActivity(walletAddress: string, limit = 50): Promise<Array<{
    id: string;
    type: 'reward' | 'purchase' | 'nft_purchase' | 'token_purchase' | 'membership';
    description: string;
    amount?: string;
    timestamp: Date;
    status?: string;
  }>> {
    const activities: Array<{
      id: string;
      type: 'reward' | 'purchase' | 'nft_purchase' | 'token_purchase' | 'membership';
      description: string;
      amount?: string;
      timestamp: Date;
      status?: string;
    }> = [];

    try {
      // Get earnings summary (working with existing database structure)
      const earningsSummary = await db.select({
        walletAddress: earningsWallet.walletAddress,
        totalEarnings: earningsWallet.totalEarnings,
        referralEarnings: earningsWallet.referralEarnings,
        levelEarnings: earningsWallet.levelEarnings,
        lastRewardAt: earningsWallet.lastRewardAt,
        createdAt: earningsWallet.createdAt
      })
        .from(earningsWallet)
        .where(eq(earningsWallet.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      // Add earnings summary as activity if user has earnings
      if (earningsSummary.length > 0) {
        const summary = earningsSummary[0];
        if (summary.totalEarnings && Number(summary.totalEarnings) > 0) {
          activities.push({
            id: `earnings-${summary.walletAddress}`,
            type: 'reward',
            description: 'Total platform earnings',
            amount: `${Number(summary.totalEarnings).toFixed(2)} USDT`,
            timestamp: summary.lastRewardAt || summary.createdAt
          });
        }
      }

      // Get NFT purchases
      const userNftPurchases = await db.select({
        id: nftPurchases.id,
        amountBCC: nftPurchases.amountBCC,
        createdAt: nftPurchases.createdAt,
        nftTitle: merchantNFTs.title
      })
        .from(nftPurchases)
        .leftJoin(merchantNFTs, eq(nftPurchases.nftId, merchantNFTs.id))
        .where(eq(nftPurchases.walletAddress, walletAddress.toLowerCase()))
        .orderBy(desc(nftPurchases.createdAt))
        .limit(limit);

      userNftPurchases.forEach((purchase: any) => {
        activities.push({
          id: purchase.id,
          type: 'nft_purchase',
          description: `Purchased NFT: ${purchase.nftTitle || 'Unknown NFT'}`,
          amount: `-${purchase.amountBCC} BCC`,
          timestamp: purchase.createdAt
        });
      });

      // Get token purchases
      const userTokenPurchases = await db.select()
        .from(tokenPurchases)
        .where(eq(tokenPurchases.walletAddress, walletAddress.toLowerCase()))
        .orderBy(desc(tokenPurchases.createdAt))
        .limit(limit);

      userTokenPurchases.forEach((purchase: any) => {
        activities.push({
          id: purchase.id,
          type: 'token_purchase',
          description: `Purchased ${purchase.tokenAmount} ${purchase.tokenType} tokens`,
          amount: `${(purchase.usdtAmount / 100).toFixed(2)} USDT`,
          timestamp: purchase.createdAt,
          status: purchase.status
        });
      });

      // Get membership purchases/orders
      const userOrders = await db.select()
        .from(orders)
        .where(eq(orders.walletAddress, walletAddress.toLowerCase()))
        .orderBy(desc(orders.createdAt))
        .limit(limit);

      userOrders.forEach((order: any) => {
        activities.push({
          id: order.id,
          type: 'membership',
          description: `Level ${order.level} membership purchase`,
          amount: `${(order.amountUSDT / 100).toFixed(2)} USDT`,
          timestamp: order.createdAt,
          status: order.status
        });
      });

      // Sort all activities by timestamp and limit
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return activities.slice(0, limit);
    } catch (error) {
      console.error('Error getting user activity:', error);
      return [];
    }
  }

  async getUserBalances(walletAddress: string): Promise<{
    usdt?: number;
    bccTransferable: number;
    bccRestricted: number;
    cth: number;
  }> {
    try {
      const bccBalance = await this.getBCCBalance(walletAddress);
      const cthBalance = await this.getCTHBalance(walletAddress);

      return {
        bccTransferable: bccBalance?.transferable || 0,
        bccRestricted: bccBalance?.restricted || 0,
        cth: cthBalance?.balance || 0
      };
    } catch (error) {
      console.error('Error getting user balances:', error);
      return {
        bccTransferable: 0,
        bccRestricted: 0,
        cth: 0
      };
    }
  }

  // Admin User operations
  async getAdminUsers(filters?: { search?: string; role?: string; status?: string }): Promise<AdminUser[]> {
    let query = db.select().from(adminUsers);
    
    // Apply filters
    const conditions = [];
    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(sql`(
        LOWER(${adminUsers.username}) LIKE ${searchTerm} OR 
        LOWER(${adminUsers.email}) LIKE ${searchTerm} OR 
        LOWER(${adminUsers.fullName}) LIKE ${searchTerm}
      )`);
    }
    if (filters?.role) {
      conditions.push(eq(adminUsers.role, filters.role));
    }
    if (filters?.status) {
      conditions.push(eq(adminUsers.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(adminUsers.createdAt));
  }

  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return user || undefined;
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return user || undefined;
  }

  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const [user] = await db
      .insert(adminUsers)
      .values(adminUser)
      .returning();
    return user;
  }

  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | undefined> {
    const [user] = await db
      .update(adminUsers)
      .set(updates)
      .where(eq(adminUsers.id, id))
      .returning();
    return user || undefined;
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    const result = await db.delete(adminUsers).where(eq(adminUsers.id, id));
    return result.rowCount > 0;
  }

  // Admin Session operations
  async createAdminSession(session: InsertAdminSession): Promise<AdminSession> {
    const [adminSession] = await db
      .insert(adminSessions)
      .values(session)
      .returning();
    return adminSession;
  }

  async getAdminSession(sessionToken: string): Promise<AdminSession | undefined> {
    const [session] = await db.select().from(adminSessions).where(eq(adminSessions.sessionToken, sessionToken));
    return session || undefined;
  }

  async deleteAdminSession(sessionToken: string): Promise<boolean> {
    const result = await db.delete(adminSessions).where(eq(adminSessions.sessionToken, sessionToken));
    return result.rowCount > 0;
  }

  // Discover Partners operations
  async getDiscoverPartners(filters?: { search?: string; status?: string; type?: string }): Promise<DiscoverPartner[]> {
    let query = db.select().from(discoverPartners);
    
    const conditions = [];
    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(sql`(
        LOWER(${discoverPartners.name}) LIKE ${searchTerm} OR 
        LOWER(${discoverPartners.shortDescription}) LIKE ${searchTerm}
      )`);
    }
    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(discoverPartners.status, filters.status));
    }
    if (filters?.type && filters.type !== 'all') {
      conditions.push(eq(discoverPartners.dappType, filters.type));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(discoverPartners.createdAt));
  }

  async getDiscoverPartner(id: string): Promise<DiscoverPartner | undefined> {
    const [partner] = await db.select().from(discoverPartners).where(eq(discoverPartners.id, id));
    return partner || undefined;
  }

  async createDiscoverPartner(partner: InsertDiscoverPartner): Promise<DiscoverPartner> {
    const [createdPartner] = await db
      .insert(discoverPartners)
      .values(partner)
      .returning();
    return createdPartner;
  }

  async updateDiscoverPartner(id: string, updates: Partial<DiscoverPartner>): Promise<DiscoverPartner | undefined> {
    const [partner] = await db
      .update(discoverPartners)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(discoverPartners.id, id))
      .returning();
    return partner || undefined;
  }

  async deleteDiscoverPartner(id: string): Promise<boolean> {
    const result = await db.delete(discoverPartners).where(eq(discoverPartners.id, id));
    return result.rowCount > 0;
  }

  async approveDiscoverPartner(id: string, adminId: string): Promise<DiscoverPartner | undefined> {
    const [partner] = await db
      .update(discoverPartners)
      .set({ 
        status: 'approved',
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(discoverPartners.id, id))
      .returning();
    return partner || undefined;
  }

  async rejectDiscoverPartner(id: string, reason: string): Promise<DiscoverPartner | undefined> {
    const [partner] = await db
      .update(discoverPartners)
      .set({ 
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date()
      })
      .where(eq(discoverPartners.id, id))
      .returning();
    return partner || undefined;
  }

  async togglePartnerFeatured(id: string): Promise<DiscoverPartner | undefined> {
    const partner = await this.getDiscoverPartner(id);
    if (!partner) return undefined;
    
    const [updatedPartner] = await db
      .update(discoverPartners)
      .set({ 
        featured: !partner.featured,
        updatedAt: new Date()
      })
      .where(eq(discoverPartners.id, id))
      .returning();
    return updatedPartner || undefined;
  }

  // DApp Types operations
  async getDappTypes(): Promise<DappType[]> {
    return await db.select().from(dappTypes).where(eq(dappTypes.active, true)).orderBy(dappTypes.displayOrder);
  }

  async createDappType(dappType: InsertDappType): Promise<DappType> {
    const [created] = await db
      .insert(dappTypes)
      .values(dappType)
      .returning();
    return created;
  }

  // Partner Chains operations
  async getPartnerChains(): Promise<PartnerChain[]> {
    return await db.select().from(partnerChains).orderBy(partnerChains.displayOrder);
  }

  async createPartnerChain(chain: InsertPartnerChain): Promise<PartnerChain> {
    const [created] = await db
      .insert(partnerChains)
      .values(chain)
      .returning();
    return created;
  }

  // Member Activation operations for NFT-based activation system
  async createMemberActivation(activation: InsertMemberActivation): Promise<MemberActivation> {
    const [created] = await db
      .insert(memberActivations)
      .values({
        walletAddress: activation.walletAddress.toLowerCase(),
        activationType: activation.activationType,
        level: activation.level,
        pendingUntil: activation.pendingUntil,
        isPending: activation.isPending ?? true,
        activatedAt: activation.activatedAt,
        pendingTimeoutHours: activation.pendingTimeoutHours ?? 24,
      })
      .returning();
    return created;
  }

  async getMemberActivation(walletAddress: string): Promise<MemberActivation | undefined> {
    const [activation] = await db
      .select()
      .from(memberActivations)
      .where(eq(memberActivations.walletAddress, walletAddress.toLowerCase()));
    return activation || undefined;
  }

  async updateMemberActivation(walletAddress: string, updates: Partial<MemberActivation>): Promise<MemberActivation | undefined> {
    const [updated] = await db
      .update(memberActivations)
      .set(updates)
      .where(eq(memberActivations.walletAddress, walletAddress.toLowerCase()))
      .returning();
    return updated || undefined;
  }

  // Reward Distribution operations for 3x3 matrix spillover
  async createRewardDistribution(reward: InsertRewardDistribution): Promise<RewardDistribution> {
    const [created] = await db
      .insert(rewardDistributions)
      .values({
        recipientWallet: reward.recipientWallet.toLowerCase(),
        sourceWallet: reward.sourceWallet.toLowerCase(),
        rewardType: reward.rewardType,
        rewardAmount: reward.rewardAmount.toString(),
        level: reward.level,
        status: reward.status ?? 'pending',
        pendingUntil: reward.pendingUntil,
        claimedAt: reward.claimedAt,
        redistributedTo: reward.redistributedTo?.toLowerCase(),
      })
      .returning();
    return created;
  }

  async getPendingRewards(walletAddress: string): Promise<RewardDistribution[]> {
    return await db
      .select()
      .from(rewardDistributions)
      .where(and(
        eq(rewardDistributions.recipientWallet, walletAddress.toLowerCase()),
        eq(rewardDistributions.status, 'pending')
      ))
      .orderBy(desc(rewardDistributions.createdAt));
  }

  async getExpiredRewards(): Promise<RewardDistribution[]> {
    const now = new Date();
    return await db
      .select()
      .from(rewardDistributions)
      .where(and(
        eq(rewardDistributions.status, 'pending'),
        sql`${rewardDistributions.pendingUntil} < ${now}`
      ))
      .orderBy(desc(rewardDistributions.createdAt));
  }

  async redistributeReward(rewardId: string, newRecipientWallet: string): Promise<RewardDistribution | undefined> {
    const [updated] = await db
      .update(rewardDistributions)
      .set({
        status: 'expired_redistributed',
        redistributedTo: newRecipientWallet.toLowerCase(),
      })
      .where(eq(rewardDistributions.id, rewardId))
      .returning();

    if (updated) {
      // Create new reward for the spillover recipient
      await this.createRewardDistribution({
        recipientWallet: newRecipientWallet,
        sourceWallet: updated.sourceWallet,
        rewardType: 'matrix_spillover',
        rewardAmount: updated.rewardAmount,
        level: updated.level,
        status: 'claimable',
      });
    }

    return updated || undefined;
  }

  // Referral node operations
  async getReferralNode(walletAddress: string): Promise<ReferralNode | undefined> {
    const [node] = await db
      .select()
      .from(referralNodes)
      .where(eq(referralNodes.walletAddress, walletAddress.toLowerCase()));
    return node || undefined;
  }

  async createReferralNode(referralNode: InsertReferralNode): Promise<ReferralNode> {
    const [created] = await db
      .insert(referralNodes)
      .values({
        ...referralNode,
        walletAddress: referralNode.walletAddress.toLowerCase(),
        sponsorWallet: referralNode.sponsorWallet?.toLowerCase() || null,
        placerWallet: referralNode.placerWallet?.toLowerCase() || null,
      })
      .returning();
    return created;
  }

  async updateReferralNode(walletAddress: string, updates: Partial<ReferralNode>): Promise<ReferralNode | undefined> {
    const [updated] = await db
      .update(referralNodes)
      .set({
        ...updates,
        sponsorWallet: updates.sponsorWallet?.toLowerCase() || null,
        placerWallet: updates.placerWallet?.toLowerCase() || null,
      })
      .where(eq(referralNodes.walletAddress, walletAddress.toLowerCase()))
      .returning();
    return updated || undefined;
  }

  // 19-Layer referral tracking operations
  async getReferralLayers(walletAddress: string): Promise<ReferralLayer[]> {
    return await db
      .select()
      .from(referralLayers)
      .where(eq(referralLayers.walletAddress, walletAddress.toLowerCase()))
      .orderBy(referralLayers.layerNumber);
  }

  async getReferralLayer(walletAddress: string, layerNumber: number): Promise<ReferralLayer | undefined> {
    const [layer] = await db
      .select()
      .from(referralLayers)
      .where(
        and(
          eq(referralLayers.walletAddress, walletAddress.toLowerCase()),
          eq(referralLayers.layerNumber, layerNumber)
        )
      );
    return layer || undefined;
  }

  async createOrUpdateReferralLayer(layer: InsertReferralLayer): Promise<ReferralLayer> {
    const existing = await this.getReferralLayer(layer.walletAddress, layer.layerNumber);
    
    if (existing) {
      const [updated] = await db
        .update(referralLayers)
        .set({
          memberCount: layer.memberCount,
          members: layer.members,
          lastUpdated: new Date(),
        })
        .where(eq(referralLayers.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(referralLayers)
        .values({
          ...layer,
          walletAddress: layer.walletAddress.toLowerCase(),
        })
        .returning();
      return created;
    }
  }

  async calculateAndStore19Layers(walletAddress: string): Promise<void> {
    // Calculate all 19 layers for a user using BFS algorithm
    const visited = new Set<string>();
    const layers: Map<number, string[]> = new Map();
    
    // Initialize first layer with direct referrals
    const node = await this.getReferralNode(walletAddress);
    if (!node) return;
    
    // Use BFS to traverse the tree up to 19 layers
    let currentLayer = [walletAddress];
    visited.add(walletAddress.toLowerCase());
    
    for (let layerNum = 1; layerNum <= 19; layerNum++) {
      const nextLayer: string[] = [];
      
      for (const currentWallet of currentLayer) {
        // Get all direct referrals of current wallet
        const directReferrals = await db
          .select()
          .from(referralNodes)
          .where(eq(referralNodes.sponsorWallet, currentWallet.toLowerCase()));
        
        for (const referral of directReferrals) {
          if (!visited.has(referral.walletAddress.toLowerCase())) {
            visited.add(referral.walletAddress.toLowerCase());
            nextLayer.push(referral.walletAddress);
          }
        }
      }
      
      if (nextLayer.length > 0) {
        layers.set(layerNum, nextLayer);
      }
      
      currentLayer = nextLayer;
      if (currentLayer.length === 0) break; // No more members to process
    }
    
    // Store the calculated layers
    for (const [layerNum, members] of layers.entries()) {
      await this.createOrUpdateReferralLayer({
        walletAddress,
        layerNumber: layerNum,
        memberCount: members.length,
        members: members,
      });
    }
  }

  // Reward notification operations
  async getRewardNotifications(walletAddress: string): Promise<RewardNotification[]> {
    return await db
      .select()
      .from(rewardNotifications)
      .where(eq(rewardNotifications.recipientWallet, walletAddress.toLowerCase()))
      .orderBy(desc(rewardNotifications.createdAt));
  }

  async getPendingRewardNotifications(walletAddress: string): Promise<RewardNotification[]> {
    return await db
      .select()
      .from(rewardNotifications)
      .where(
        and(
          eq(rewardNotifications.recipientWallet, walletAddress.toLowerCase()),
          eq(rewardNotifications.status, 'pending'),
          gt(rewardNotifications.expiresAt, new Date())
        )
      )
      .orderBy(rewardNotifications.expiresAt);
  }

  async createRewardNotification(notification: InsertRewardNotification): Promise<RewardNotification> {
    const [created] = await db
      .insert(rewardNotifications)
      .values({
        ...notification,
        recipientWallet: notification.recipientWallet.toLowerCase(),
        triggerWallet: notification.triggerWallet.toLowerCase(),
      })
      .returning();
    return created;
  }

  async updateRewardNotification(id: string, updates: Partial<RewardNotification>): Promise<RewardNotification | undefined> {
    const [updated] = await db
      .update(rewardNotifications)
      .set(updates)
      .where(eq(rewardNotifications.id, id))
      .returning();
    return updated || undefined;
  }

  async checkAndExpireNotifications(): Promise<void> {
    // Update all expired notifications
    await db
      .update(rewardNotifications)
      .set({ status: 'expired' })
      .where(
        and(
          eq(rewardNotifications.status, 'pending'),
          lt(rewardNotifications.expiresAt, new Date())
        )
      );
  }

  // Admin Settings operations
  async getAdminSetting(settingKey: string): Promise<string | undefined> {
    const [setting] = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, settingKey));
    return setting?.settingValue;
  }

  async updateAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting> {
    const [updated] = await db
      .insert(adminSettings)
      .values({
        settingKey: setting.settingKey,
        settingValue: setting.settingValue,
        description: setting.description || '',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: adminSettings.settingKey,
        set: {
          settingValue: setting.settingValue,
          description: setting.description || '',
          updatedAt: new Date(),
        },
      })
      .returning();
    return updated;
  }

  // Legacy 3x3 Matrix system replaced by global matrix system - function removed

  // Helper: Find nearest activated upline who can receive rewards
  async findNearestActivatedUpline(walletAddress: string): Promise<string | null> {
    const position = await this.getGlobalMatrixPosition(walletAddress);
    if (!position || position.directSponsorWallet === walletAddress) {
      return null; // No upline or reached root
    }
    
    const uplineMembership = await this.getMembershipState(position.directSponsorWallet);
    if (uplineMembership && uplineMembership.activeLevel > 0) {
      return position.directSponsorWallet; // Found activated upline
    }
    
    // Continue searching up the chain
    return this.findNearestActivatedUpline(position.directSponsorWallet);
  }

  // Earnings wallet operations (missing implementations)
  async createEarningsWalletEntry(entry: InsertEarningsWallet): Promise<EarningsWallet> {
    const [created] = await db.insert(earningsWallet).values({
      walletAddress: entry.walletAddress.toLowerCase(),
      totalEarnings: entry.totalEarnings || "0",
      referralEarnings: entry.referralEarnings || "0", 
      levelEarnings: entry.levelEarnings || "0",
      pendingRewards: entry.pendingRewards || "0",
      withdrawnAmount: entry.withdrawnAmount || "0",
      lastRewardAt: entry.lastRewardAt || null,
    }).returning();
    return created;
  }

  async getEarningsWalletByWallet(walletAddress: string): Promise<EarningsWallet[]> {
    return await db.select()
      .from(earningsWallet)
      .where(eq(earningsWallet.walletAddress, walletAddress.toLowerCase()));
  }

  async updateEarningsWalletEntry(walletAddress: string, updates: Partial<EarningsWallet>): Promise<EarningsWallet | undefined> {
    const [updated] = await db.update(earningsWallet)
      .set({
        ...updates,
        ...(updates.walletAddress && { walletAddress: updates.walletAddress.toLowerCase() }),
      })
      .where(eq(earningsWallet.walletAddress, walletAddress.toLowerCase()))
      .returning();
    return updated;
  }

  async getPendingEarningsEntries(): Promise<EarningsWallet[]> {
    return await db.select()
      .from(earningsWallet)
      .where(sql`${earningsWallet.pendingRewards} > 0`);
  }

  async getExpiredEarningsEntries(): Promise<EarningsWallet[]> {
    return await db.select()
      .from(earningsWallet)
      .where(sql`${earningsWallet.pendingRewards} > 0 AND ${earningsWallet.lastRewardAt} < NOW() - INTERVAL '72 hours'`);
  }

  async passUpReward(originalRecipient: string, reward: EarningsWallet): Promise<void> {
    // Find the nearest activated upline for the original recipient
    const nearestUpline = await this.findNearestActivatedUpline(originalRecipient);
    
    if (nearestUpline) {
      // Transfer the reward to the upline
      const uplineEarnings = await db.select()
        .from(earningsWallet)
        .where(eq(earningsWallet.walletAddress, nearestUpline.toLowerCase()))
        .limit(1);

      if (uplineEarnings.length > 0) {
        // Update existing upline earnings
        await this.updateEarningsWalletEntry(nearestUpline, {
          totalEarnings: (parseFloat(uplineEarnings[0].totalEarnings) + parseFloat(reward.totalEarnings)).toFixed(2),
          levelEarnings: (parseFloat(uplineEarnings[0].levelEarnings) + parseFloat(reward.levelEarnings)).toFixed(2),
          lastRewardAt: new Date(),
        });
      } else {
        // Create new earnings entry for upline
        await this.createEarningsWalletEntry({
          walletAddress: nearestUpline,
          totalEarnings: reward.totalEarnings,
          levelEarnings: reward.levelEarnings,
          lastRewardAt: new Date(),
        });
      }
    }
  }

  // Wallet connection logging
  async logWalletConnection(log: InsertWalletConnectionLog): Promise<WalletConnectionLog> {
    const [connectionLog] = await db
      .insert(walletConnectionLogs)
      .values({
        ...log,
        walletAddress: log.walletAddress.toLowerCase(),
        uplineWallet: log.uplineWallet?.toLowerCase(),
      })
      .returning();
    return connectionLog;
  }


  // Set admin setting
  async setAdminSetting(settingKey: string, settingValue: string, description?: string): Promise<void> {
    await db.insert(adminSettings)
      .values({ settingKey, settingValue, description })
      .onConflictDoUpdate({
        target: adminSettings.settingKey,
        set: { settingValue, updatedAt: sql`NOW()` }
      });
  }

  // Update user registration tracking
  async updateUserRegistrationTracking(walletAddress: string, data: {
    registeredAt?: Date;
    registrationExpiresAt?: Date;
    registrationTimeoutHours?: number;
    lastWalletConnectionAt?: Date;
    walletConnectionCount?: number;
    referralCode?: string;
    isCompanyDirectReferral?: boolean;
  }): Promise<void> {
    await db.update(users)
      .set({
        ...data,
        lastUpdatedAt: new Date(),
      })
      .where(eq(users.walletAddress, walletAddress.toLowerCase()));
  }

  // Get users whose registration has expired
  async getExpiredRegistrations(): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(
        and(
          eq(users.memberActivated, false),
          not(isNull(users.registrationExpiresAt)),
          sql`${users.registrationExpiresAt} < NOW()`
        )
      );
  }

  // Delete expired unactivated users
  async deleteExpiredRegistrations(): Promise<number> {
    const expiredUsers = await this.getExpiredRegistrations();
    
    if (expiredUsers.length === 0) {
      return 0;
    }
    
    const walletAddresses = expiredUsers.map(u => u.walletAddress);
    
    // Delete from related tables first
    await db.delete(membershipState)
      .where(inArray(membershipState.walletAddress, walletAddresses));
    await db.delete(bccBalances)
      .where(inArray(bccBalances.walletAddress, walletAddresses));
    
    // Delete users
    await db.delete(users)
      .where(inArray(users.walletAddress, walletAddresses));
    
    return expiredUsers.length;
  }
}

export const storage = new DatabaseStorage();
