import { 
  users,
  membershipState,
  referralNodes,
  referralLayers,
  matrixLayers,
  rewardNotifications,
  userActivities,
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
  type MatrixLayer,
  type InsertMatrixLayer,
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

      // BeeHive 19-level configuration matching frontend membershipLevels.ts exactly
      // All prices in dollars (matching frontend values exactly)
      // Matrix count: 3^(level-1) × 3 pattern
      const levels: InsertLevelConfig[] = [
        { level: 1, levelName: "Warrior", priceUSDT: 130, nftPriceUSDT: 100, platformFeeUSDT: 30, requiredDirectReferrals: 1, maxMatrixCount: 3 },
        { level: 2, levelName: "Bronze", priceUSDT: 150, nftPriceUSDT: 150, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
        { level: 3, levelName: "Silver", priceUSDT: 200, nftPriceUSDT: 200, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 27 },
        { level: 4, levelName: "Gold", priceUSDT: 250, nftPriceUSDT: 250, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 81 },
        { level: 5, levelName: "Elite", priceUSDT: 300, nftPriceUSDT: 300, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 243 },
        { level: 6, levelName: "Platinum", priceUSDT: 350, nftPriceUSDT: 350, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 729 },
        { level: 7, levelName: "Master", priceUSDT: 400, nftPriceUSDT: 400, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 2187 },
        { level: 8, levelName: "Diamond", priceUSDT: 450, nftPriceUSDT: 450, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 6561 },
        { level: 9, levelName: "Grandmaster", priceUSDT: 500, nftPriceUSDT: 500, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 19683 },
        { level: 10, levelName: "Star Shine", priceUSDT: 550, nftPriceUSDT: 550, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 59049 },
        { level: 11, levelName: "Epic", priceUSDT: 600, nftPriceUSDT: 600, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 177147 },
        { level: 12, levelName: "Hall", priceUSDT: 650, nftPriceUSDT: 650, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 531441 },
        { level: 13, levelName: "The Strongest King", priceUSDT: 700, nftPriceUSDT: 700, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 1594323 },
        { level: 14, levelName: "The King of Kings", priceUSDT: 750, nftPriceUSDT: 750, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 4782969 },
        { level: 15, levelName: "Glory King", priceUSDT: 800, nftPriceUSDT: 800, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 14348907 },
        { level: 16, levelName: "Legendary Overlord", priceUSDT: 850, nftPriceUSDT: 850, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 43046721 },
        { level: 17, levelName: "Supreme Lord", priceUSDT: 900, nftPriceUSDT: 900, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 129140163 },
        { level: 18, levelName: "Supreme Myth", priceUSDT: 950, nftPriceUSDT: 950, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 387420489 },
        { level: 19, levelName: "Mythical Peak", priceUSDT: 1000, nftPriceUSDT: 1000, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 1162261467 }
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
        // Level 1: 每个奖励100 USDT，第三个需要升级Level2才能拿
        // 计算这是第几个Level 1奖励（基于已获得的奖励数量）
        const existingLevel1Rewards = await db.select()
          .from(rewardDistributions)
          .where(
            and(
              eq(rewardDistributions.recipientWallet, uplineWallet),
              eq(rewardDistributions.level, 1),
              eq(rewardDistributions.rewardType, 'level_bonus')
            )
          );
          
        const rewardSequenceNumber = existingLevel1Rewards.length + 1;
        
        if (rewardSequenceNumber <= 2) {
          // 前2个奖励：只需要拥有L1就可以拿
          isQualified = uplineMembership?.levelsOwned.includes(1) || false;
        } else {
          // 第3个及以后的奖励：需要升级到Level 2才能拿，不然72小时roll up
          isQualified = uplineMembership?.levelsOwned.includes(2) || false;
        }
      } else if (purchasedLevel === 2) {
        // Level 2: 第二层成员升级Level 2，第二层上线获得150 USDT（NFT价格）
        // 上线必须拥有Level 2才有资格获得奖励
        isQualified = uplineMembership?.levelsOwned.includes(2) || false;
      } else {
        // Levels 3-19: Just need to own that level or higher
        isQualified = uplineMembership?.levelsOwned.some(level => level >= purchasedLevel) || false;
      }
      
      // Create reward (100% of NFT price - rewards equal NFT price)
      const rewardAmount = (levelConfig.nftPriceUSDT / 100).toFixed(2); // Convert cents to dollars
      
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

  // NEW: 3×3 Global Matrix Placement Algorithm with Spillover
  async findGlobalMatrixPlacement(sponsorWallet: string): Promise<{ matrixLevel: number; positionIndex: number; placementSponsorWallet: string }> {
    // 检查sponsor是否还有直推空位（最多3个）
    const sponsorDirectReferrals = await db.select()
      .from(globalMatrixPosition)
      .where(eq(globalMatrixPosition.directSponsorWallet, sponsorWallet.toLowerCase()));
    
    if (sponsorDirectReferrals.length < 3) {
      // Sponsor还有直推空位，直接分配给sponsor
      return {
        matrixLevel: 1,
        positionIndex: sponsorDirectReferrals.length + 1, // position 1, 2, 3
        placementSponsorWallet: sponsorWallet
      };
    }
    
    // Sponsor满了（3个直推），需要spillover - 使用BFS找最早的有空位的成员
    return await this.findSpilloverPlacement(sponsorWallet);
  }

  // BFS spillover placement - 找到最早加入且还有空位的成员
  async findSpilloverPlacement(originalSponsorWallet: string): Promise<{ matrixLevel: number; positionIndex: number; placementSponsorWallet: string }> {
    // 获取所有成员，按加入时间排序
    const allMembers = await db.select()
      .from(globalMatrixPosition)
      .orderBy(globalMatrixPosition.joinedAt);
    
    // BFS：从最早的成员开始查找有空位的位置
    for (const member of allMembers) {
      const memberDirectReferrals = await db.select()
        .from(globalMatrixPosition)
        .where(eq(globalMatrixPosition.directSponsorWallet, member.walletAddress));
      
      if (memberDirectReferrals.length < 3) {
        // 找到有空位的成员
        return {
          matrixLevel: member.matrixLevel + 1, // 比placement sponsor低一层
          positionIndex: memberDirectReferrals.length + 1,
          placementSponsorWallet: member.walletAddress
        };
      }
    }
    
    // 如果所有现有成员都满了，创建新的层级
    const maxLevel = Math.max(...allMembers.map(m => m.matrixLevel));
    return {
      matrixLevel: maxLevel + 1,
      positionIndex: 1,
      placementSponsorWallet: originalSponsorWallet // fallback
    };
  }

  // Helper: Get upline wallets who should receive rewards for this purchase
  async getUplineWallets(buyerWallet: string, purchasedLevel: number): Promise<string[]> {
    const uplines: string[] = [];
    let currentWallet = buyerWallet;
    
    // 特殊处理: Level 2购买时，奖励给第二层的上线（跳过第一层）
    if (purchasedLevel === 2) {
      // 找到第二层上线：先找第一层，再找第二层
      const firstLayerPosition = await this.getGlobalMatrixPosition(currentWallet);
      if (firstLayerPosition && firstLayerPosition.directSponsorWallet !== currentWallet) {
        const secondLayerPosition = await this.getGlobalMatrixPosition(firstLayerPosition.directSponsorWallet);
        if (secondLayerPosition && secondLayerPosition.directSponsorWallet !== firstLayerPosition.directSponsorWallet) {
          uplines.push(secondLayerPosition.directSponsorWallet); // 第二层上线获得奖励
        }
      }
    } else {
      // 其他级别：正常遍历找对应层级的上线
      for (let layer = 1; layer <= purchasedLevel && layer <= 19; layer++) {
        const position = await this.getGlobalMatrixPosition(currentWallet);
        if (!position || position.directSponsorWallet === currentWallet) break;
        
        const uplineWallet = position.directSponsorWallet;
        if (layer === purchasedLevel) {
          uplines.push(uplineWallet); // 对应层级的上线获得奖励
        }
        currentWallet = uplineWallet;
      }
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

  // Helper: Get Level 1 reward count for qualification checking
  async getLevel1RewardCount(uplineWallet: string): Promise<number> {
    const level1Rewards = await db.select()
      .from(rewardDistributions)
      .where(
        and(
          eq(rewardDistributions.recipientWallet, uplineWallet.toLowerCase()),
          eq(rewardDistributions.level, 1),
          eq(rewardDistributions.rewardType, 'level_bonus')
        )
      );
    return level1Rewards.length;
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

      // Direct referral reward: 100% of NFT price (Level 1 = $100, Level N = $50 + N×$50)
      const directRewardAmount = level === 1 ? 100 : (50 + (level * 50));
      
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


  async createEarningsWallet(data: InsertEarningsWallet): Promise<EarningsWallet> {
    const [result] = await db
      .insert(earningsWallet)
      .values({
        walletAddress: data.walletAddress.toLowerCase(),
        totalEarnings: data.totalEarnings || "0",
        referralEarnings: data.referralEarnings || "0",
        levelEarnings: data.levelEarnings || "0",
        pendingRewards: data.pendingRewards || "0",
        withdrawnAmount: data.withdrawnAmount || "0",
        lastRewardAt: data.lastRewardAt || null
      })
      .returning();
    return result;
  }

  async updateEarningsWallet(walletAddress: string, updates: Partial<EarningsWallet>): Promise<EarningsWallet | undefined> {
    const [updated] = await db
      .update(earningsWallet)
      .set({
        ...updates,
        lastRewardAt: updates.lastRewardAt || new Date()
      })
      .where(eq(earningsWallet.walletAddress, walletAddress.toLowerCase()))
      .returning();
    
    return updated || undefined;
  }

  // Level Configuration Operations (duplicate removed)

  // NFT Verification Operations (using custom table structure)
  async createNFTVerificationCustom(data: any): Promise<any> {
    const [result] = await db
      .insert(memberNFTVerification)
      .values({
        walletAddress: data.walletAddress.toLowerCase(),
        nftContractAddress: data.nftContractAddress,
        tokenId: data.tokenId,
        chainId: data.chainId,
        verificationStatus: data.verificationStatus,
        lastVerified: data.lastVerified
      })
      .returning();
    return result;
  }

  async getNFTVerificationCustom(walletAddress: string): Promise<any[]> {
    const result = await db
      .select()
      .from(memberNFTVerification)
      .where(eq(memberNFTVerification.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(memberNFTVerification.createdAt));
    return result;
  }

  // Global Statistics (updated to work with current structure)
  async getGlobalStatisticsCustom(): Promise<any> {
    const totalMembersResult = await db
      .select({ totalMembers: sql<number>`COUNT(*)` })
      .from(users)
      .where(eq(users.memberActivated, true));
    
    const levelDistributionResult = await db
      .select({
        activeLevel: membershipState.activeLevel,
        count: sql<number>`COUNT(*)`
      })
      .from(membershipState)
      .where(gt(membershipState.activeLevel, 0))
      .groupBy(membershipState.activeLevel)
      .orderBy(membershipState.activeLevel);

    const levelConfigs = await this.getAllLevelConfigs();

    return {
      totalMembers: totalMembersResult[0]?.totalMembers || 0,
      levelDistribution: levelDistributionResult.map(row => {
        const config = levelConfigs.find(cfg => cfg.level === row.activeLevel);
        return {
          level: row.activeLevel,
          levelName: config?.levelName || `Level ${row.activeLevel}`,
          count: row.count
        };
      })
    };
  }


  // Enhanced earnings reward method that syncs with reward distribution system
  async addEarningsReward(walletAddress: string, amount: number, type: 'referral' | 'level' | 'matrix_spillover', isPending = false): Promise<void> {
    // Get or create earnings wallet
    let earnings = await this.getEarningsWalletByWallet(walletAddress);
    
    if (!earnings || earnings.length === 0) {
      earnings = [await this.createEarningsWallet({
        walletAddress,
        totalEarnings: "0",
        referralEarnings: "0", 
        levelEarnings: "0",
        pendingRewards: "0",
        withdrawnAmount: "0",
      })];
    }

    const currentEarnings = earnings[0];
    const amountStr = amount.toFixed(2);

    const updates: Partial<EarningsWallet> = {
      lastRewardAt: new Date()
    };

    if (isPending) {
      // Add to pending rewards
      const currentPending = parseFloat(currentEarnings.pendingRewards);
      updates.pendingRewards = (currentPending + amount).toFixed(2);
    } else {
      // Add to total and category-specific earnings
      const currentTotal = parseFloat(currentEarnings.totalEarnings);
      updates.totalEarnings = (currentTotal + amount).toFixed(2);
      
      if (type === 'referral') {
        const currentReferral = parseFloat(currentEarnings.referralEarnings);
        updates.referralEarnings = (currentReferral + amount).toFixed(2);
      } else if (type === 'level') {
        const currentLevel = parseFloat(currentEarnings.levelEarnings);
        updates.levelEarnings = (currentLevel + amount).toFixed(2);
      }
    }

    await this.updateEarningsWallet(walletAddress, updates);
  }

  // Process claimed reward - move from pending to total
  async processClaimedReward(walletAddress: string, rewardAmount: number, rewardType: 'referral' | 'level' | 'matrix_spillover'): Promise<void> {
    const earnings = await this.getEarningsWalletByWallet(walletAddress);
    if (!earnings || earnings.length === 0) return;

    const currentEarnings = earnings[0];
    const currentPending = parseFloat(currentEarnings.pendingRewards);
    const currentTotal = parseFloat(currentEarnings.totalEarnings);

    const updates: Partial<EarningsWallet> = {
      pendingRewards: Math.max(0, currentPending - rewardAmount).toFixed(2),
      totalEarnings: (currentTotal + rewardAmount).toFixed(2),
      lastRewardAt: new Date()
    };

    // Update category-specific earnings
    if (rewardType === 'referral') {
      const currentReferral = parseFloat(currentEarnings.referralEarnings);
      updates.referralEarnings = (currentReferral + rewardAmount).toFixed(2);
    } else if (rewardType === 'level') {
      const currentLevel = parseFloat(currentEarnings.levelEarnings);
      updates.levelEarnings = (currentLevel + rewardAmount).toFixed(2);
    }

    await this.updateEarningsWallet(walletAddress, updates);
  }

  // Calculate real earnings from reward distributions
  async calculateRealEarnings(walletAddress: string): Promise<{
    totalEarnings: number;
    referralEarnings: number;
    levelEarnings: number;
    pendingRewards: number;
  }> {
    // Get claimed rewards
    const claimedRewards = await db
      .select()
      .from(rewardDistributions)
      .where(
        and(
          eq(rewardDistributions.recipientWallet, walletAddress.toLowerCase()),
          eq(rewardDistributions.status, 'claimed')
        )
      );

    // Get pending rewards  
    const pendingRewards = await db
      .select()
      .from(rewardDistributions)
      .where(
        and(
          eq(rewardDistributions.recipientWallet, walletAddress.toLowerCase()),
          eq(rewardDistributions.status, 'claimable')
        )
      );

    let totalEarnings = 0;
    let referralEarnings = 0;
    let levelEarnings = 0;
    let totalPending = 0;

    // Calculate claimed earnings by type
    for (const reward of claimedRewards) {
      const amount = parseFloat(reward.rewardAmount);
      totalEarnings += amount;
      
      if (reward.rewardType === 'direct_referral') {
        referralEarnings += amount;
      } else if (reward.rewardType === 'level_bonus') {
        levelEarnings += amount;
      }
    }

    // Calculate pending rewards
    for (const reward of pendingRewards) {
      totalPending += parseFloat(reward.rewardAmount);
    }

    return {
      totalEarnings,
      referralEarnings,
      levelEarnings,
      pendingRewards: totalPending
    };
  }

  // Company-wide statistics
  async getCompanyStats(): Promise<any> {
    try {
      // Total members (activated users)
      const totalMembersResult = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(users)
        .where(eq(users.memberActivated, true));
      const totalMembers = totalMembersResult[0]?.total || 0;

      // Members by level
      const levelDistributionResult = await db
        .select({
          activeLevel: membershipState.activeLevel,
          count: sql<number>`COUNT(*)`
        })
        .from(membershipState)
        .innerJoin(users, eq(membershipState.walletAddress, users.walletAddress))
        .where(eq(users.memberActivated, true))
        .groupBy(membershipState.activeLevel)
        .orderBy(membershipState.activeLevel);

      // Calculate total rewards from earnings_wallet
      const totalRewardsResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${earningsWallet.totalEarnings} AS NUMERIC)), 0)`
        })
        .from(earningsWallet);
      const totalRewards = totalRewardsResult[0]?.total || 0;

      // Calculate pending rewards from earnings_wallet
      const pendingRewardsResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${earningsWallet.pendingRewards} AS NUMERIC)), 0)`
        })
        .from(earningsWallet);
      const pendingRewards = pendingRewardsResult[0]?.total || 0;

      const levelDistribution = levelDistributionResult.map((row) => ({
        level: row.activeLevel,
        count: row.count
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

      // User's real earnings from earnings_wallet
      const userEarnings = await this.calculateRealEarnings(walletAddress);
      const totalEarnings = userEarnings.totalEarnings;
      const pendingRewards = userEarnings.pendingRewards;

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
    const baseQuery = db.select().from(adminUsers);
    
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
      return await baseQuery.where(and(...conditions)).orderBy(desc(adminUsers.createdAt));
    }
    
    return await baseQuery.orderBy(desc(adminUsers.createdAt));
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
    return (result.rowCount ?? 0) > 0;
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
    return (result.rowCount ?? 0) > 0;
  }

  // Discover Partners operations
  async getDiscoverPartners(filters?: { search?: string; status?: string; type?: string }): Promise<DiscoverPartner[]> {
    const baseQuery = db.select().from(discoverPartners);
    
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
      return await baseQuery.where(and(...conditions)).orderBy(desc(discoverPartners.createdAt));
    }
    
    return await baseQuery.orderBy(desc(discoverPartners.createdAt));
  }

  async getDiscoverPartner(id: string): Promise<DiscoverPartner | undefined> {
    const [partner] = await db.select().from(discoverPartners).where(eq(discoverPartners.id, id));
    return partner || undefined;
  }

  async createDiscoverPartner(partner: InsertDiscoverPartner): Promise<DiscoverPartner> {
    const insertData = {
      name: partner.name,
      logoUrl: partner.logoUrl,
      websiteUrl: partner.websiteUrl,
      shortDescription: partner.shortDescription,
      longDescription: partner.longDescription,
      tags: partner.tags || [],
      chains: partner.chains || [],
      dappType: partner.dappType,
      featured: partner.featured || false,
      status: partner.status || 'draft',
      submitterWallet: partner.submitterWallet,
      redeemCodeUsed: partner.redeemCodeUsed,
      rejectionReason: partner.rejectionReason,
    };
    const [createdPartner] = await db
      .insert(discoverPartners)
      .values(insertData)
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
    return (result.rowCount ?? 0) > 0;
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
    // Validate that both recipient and source wallets exist in users table
    const recipientWallet = reward.recipientWallet.toLowerCase();
    const sourceWallet = reward.sourceWallet.toLowerCase();
    
    // Check if recipient wallet exists
    const recipientUser = await this.getUser(recipientWallet);
    if (!recipientUser) {
      console.error(`Cannot create reward distribution: recipient wallet ${recipientWallet} does not exist in users table`);
      throw new Error(`Recipient wallet ${recipientWallet} not found`);
    }
    
    // Check if source wallet exists
    const sourceUser = await this.getUser(sourceWallet);
    if (!sourceUser) {
      console.error(`Cannot create reward distribution: source wallet ${sourceWallet} does not exist in users table`);
      throw new Error(`Source wallet ${sourceWallet} not found`);
    }
    
    const [created] = await db
      .insert(rewardDistributions)
      .values({
        recipientWallet,
        sourceWallet,
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
    const insertData = {
      walletAddress: referralNode.walletAddress.toLowerCase(),
      sponsorWallet: referralNode.sponsorWallet?.toLowerCase() || null,
      placerWallet: referralNode.placerWallet?.toLowerCase() || null,
      matrixPosition: referralNode.matrixPosition || 0,
      leftLeg: referralNode.leftLeg || [],
      middleLeg: referralNode.middleLeg || [],
      rightLeg: referralNode.rightLeg || [],
      directReferralCount: referralNode.directReferralCount || 0,
      totalTeamCount: referralNode.totalTeamCount || 0,
    };
    const [created] = await db
      .insert(referralNodes)
      .values(insertData)
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

  // Sync user level with membership state and update layers
  async syncUserLevelWithMembership(walletAddress: string): Promise<void> {
    const membership = await this.getMembershipState(walletAddress);
    if (!membership) return;

    // Update user's current level to match membership active level
    await this.updateUser(walletAddress, {
      currentLevel: membership.activeLevel
    });

    // Recalculate referral layers if user has an active level
    if (membership.activeLevel > 0) {
      await this.calculateAndStore19Layers(walletAddress);
    }
  }

  // Initialize referral matrix structure for a new member
  async initializeReferralMatrix(walletAddress: string, sponsorWallet?: string): Promise<ReferralNode> {
    let matrixPosition = 0;
    let placerWallet = sponsorWallet;

    // Find placement position in sponsor's matrix if sponsor exists
    if (sponsorWallet) {
      const sponsorNode = await this.getReferralNode(sponsorWallet);
      if (sponsorNode) {
        // Find next available position in sponsor's matrix (0-8)
        const totalPositions = sponsorNode.leftLeg.length + sponsorNode.middleLeg.length + sponsorNode.rightLeg.length;
        matrixPosition = totalPositions % 9;
        
        // Update sponsor's matrix legs
        await this.addToSponsorMatrix(sponsorWallet, walletAddress, matrixPosition);
        
        // Update sponsor's direct referral count
        await this.updateReferralNode(sponsorWallet, {
          directReferralCount: sponsorNode.directReferralCount + 1,
          totalTeamCount: sponsorNode.totalTeamCount + 1
        });
      }
    }

    // Create the referral node
    return await this.createReferralNode({
      walletAddress,
      sponsorWallet: sponsorWallet || null,
      placerWallet,
      matrixPosition,
      leftLeg: [],
      middleLeg: [],
      rightLeg: [],
      directReferralCount: 0,
      totalTeamCount: 0
    });
  }

  // Add member to sponsor's matrix structure
  async addToSponsorMatrix(sponsorWallet: string, memberWallet: string, position: number): Promise<void> {
    const sponsorNode = await this.getReferralNode(sponsorWallet);
    if (!sponsorNode) return;

    let updatedLeg;
    if (position <= 2) {
      // Left leg (positions 0,1,2)
      updatedLeg = { leftLeg: [...sponsorNode.leftLeg, memberWallet] };
    } else if (position <= 5) {
      // Middle leg (positions 3,4,5)
      updatedLeg = { middleLeg: [...sponsorNode.middleLeg, memberWallet] };
    } else {
      // Right leg (positions 6,7,8)
      updatedLeg = { rightLeg: [...sponsorNode.rightLeg, memberWallet] };
    }

    await this.updateReferralNode(sponsorWallet, updatedLeg);
  }

  // Update team counts up the referral chain
  async updateTeamCountsUpline(walletAddress: string): Promise<void> {
    const node = await this.getReferralNode(walletAddress);
    if (!node || !node.sponsorWallet) return;

    // Update sponsor's team count
    const sponsorNode = await this.getReferralNode(node.sponsorWallet);
    if (sponsorNode) {
      await this.updateReferralNode(node.sponsorWallet, {
        totalTeamCount: sponsorNode.totalTeamCount + 1
      });

      // Recursively update upline
      await this.updateTeamCountsUpline(node.sponsorWallet);
    }
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
          members: (layer.members || []) as string[],
          lastUpdated: new Date(),
        })
        .where(eq(referralLayers.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(referralLayers)
        .values({
          walletAddress: layer.walletAddress.toLowerCase(),
          layerNumber: layer.layerNumber,
          memberCount: layer.memberCount || 0,
          members: (layer.members || []) as string[],
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
    for (const layerEntry of Array.from(layers.entries())) {
      const [layerNum, members] = layerEntry;
      await this.createOrUpdateReferralLayer({
        walletAddress,
        layerNumber: layerNum,
        memberCount: members.length,
        members: members,
      });
    }
  }

  // Reward notification operations (removed duplicate - keeping enhanced version below)

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

  async updateEarningsWalletEntry(id: string, updates: Partial<EarningsWallet>): Promise<EarningsWallet | undefined> {
    const [wallet] = await db
      .update(earningsWallet)
      .set(updates)
      .where(eq(earningsWallet.walletAddress, id))
      .returning();
    return wallet || undefined;
  }


  async getPendingEarningsEntries(): Promise<EarningsWallet[]> {
    return await db.select()
      .from(earningsWallet)
      .where(gt(sql`CAST(${earningsWallet.pendingRewards} AS NUMERIC)`, sql`0`));
  }

  async getExpiredEarningsEntries(): Promise<EarningsWallet[]> {
    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() - 72);
    
    return await db.select()
      .from(earningsWallet)
      .where(
        and(
          gt(sql`CAST(${earningsWallet.pendingRewards} AS NUMERIC)`, sql`0`),
          lt(earningsWallet.lastRewardAt, expiredDate)
        )
      );
  }

  async passUpReward(originalRecipient: string, rewardAmount: number, rewardType: 'referral' | 'level' | 'matrix_spillover'): Promise<void> {
    // Find the nearest activated upline for the original recipient
    const nearestUpline = await this.findNearestActivatedUpline(originalRecipient);
    
    if (nearestUpline) {
      // Add the reward to upline's earnings
      await this.addEarningsReward(nearestUpline, rewardAmount, rewardType, false);
      
      // Also create a reward distribution record for the upline
      await this.createRewardDistribution({
        recipientWallet: nearestUpline,
        sourceWallet: originalRecipient,
        rewardType: 'matrix_spillover',
        rewardAmount: rewardAmount.toString(),
        level: 1, // Default level for spillover
        status: 'claimed', // Immediately available since it's a spillover
        claimedAt: new Date()
      });
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
        set: { settingValue, updatedAt: new Date() }
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
          lt(users.registrationExpiresAt, new Date())
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
  async getLayerMembersData(walletAddress: string): Promise<any[]> {
    const layers = await db
      .select()
      .from(referralLayers)
      .where(eq(referralLayers.walletAddress, walletAddress))
      .orderBy(referralLayers.layerNumber);
    
    // Get member details for each layer
    const layersWithMembers = await Promise.all(
      layers.map(async (layer) => {
        const memberDetails = await Promise.all(
          layer.members.map(async (memberWallet) => {
            const [user] = await db.select({
              walletAddress: users.walletAddress,
              username: users.username,
              currentLevel: users.currentLevel,
              memberActivated: users.memberActivated,
              createdAt: users.createdAt
            }).from(users).where(eq(users.walletAddress, memberWallet));
            
            return user || {
              walletAddress: memberWallet,
              username: `User_${memberWallet.slice(-4)}`,
              currentLevel: 1,
              memberActivated: true,
              createdAt: new Date()
            };
          })
        );
        
        // Calculate upgrade statistics
        const upgradedCount = memberDetails.filter(member => member.currentLevel > 1).length;
        const activatedCount = memberDetails.filter(member => member.memberActivated).length;
        
        return {
          ...layer,
          memberDetails,
          upgradedMembers: upgradedCount,
          activatedMembers: activatedCount,
          layerNumber: layer.layerNumber,
          memberCount: layer.memberCount
        };
      })
    );
    
    return layersWithMembers;
  }

  async getRewardNotifications(walletAddress: string): Promise<RewardNotification[]> {
    return await db
      .select()
      .from(rewardNotifications)
      .where(eq(rewardNotifications.recipientWallet, walletAddress.toLowerCase()))
      .orderBy(desc(rewardNotifications.createdAt));
  }

  async getRewardNotificationsWithDetails(walletAddress: string): Promise<any[]> {
    const notifications = await db
      .select({
        id: rewardNotifications.id,
        recipientWallet: rewardNotifications.recipientWallet,
        triggerWallet: rewardNotifications.triggerWallet,
        triggerLevel: rewardNotifications.triggerLevel,
        layerNumber: rewardNotifications.layerNumber,
        rewardAmount: rewardNotifications.rewardAmount,
        status: rewardNotifications.status,
        expiresAt: rewardNotifications.expiresAt,
        claimedAt: rewardNotifications.claimedAt,
        createdAt: rewardNotifications.createdAt
      })
      .from(rewardNotifications)
      .where(eq(rewardNotifications.recipientWallet, walletAddress.toLowerCase()))
      .orderBy(desc(rewardNotifications.createdAt));
    
    // Add trigger user details
    const notificationsWithDetails = await Promise.all(
      notifications.map(async (notif) => {
        const [triggerUser] = await db.select({
          walletAddress: users.walletAddress,
          username: users.username
        }).from(users).where(eq(users.walletAddress, notif.triggerWallet));
        
        return {
          ...notif,
          triggerUser: triggerUser || {
            walletAddress: notif.triggerWallet,
            username: `User_${notif.triggerWallet.slice(-4)}`
          },
          timeRemaining: Math.max(0, new Date(notif.expiresAt).getTime() - Date.now())
        };
      })
    );
    
    return notificationsWithDetails;
  }

  // Complete memberNFT claiming process - populates all related tables
  async claimMemberNFTComplete(data: {
    walletAddress: string;
    nftContractAddress: string;
    tokenId: string;
    chainId: number;
    sponsorWallet?: string;
    membershipLevel: number;
    nftPrice: number;
    paymentTxHash?: string;
  }): Promise<{
    user: User;
    membershipState: MembershipState;
    referralNode: ReferralNode;
    earningsWallet: EarningsWallet;
    bccBalance: BCCBalance;
    nftVerification: MemberNFTVerification;
    memberActivation: MemberActivation;
    globalMatrixPosition: GlobalMatrixPosition;
    order: Order;
  }> {
    const { walletAddress, nftContractAddress, tokenId, chainId, sponsorWallet, membershipLevel, nftPrice, paymentTxHash } = data;
    const lowerWalletAddress = walletAddress.toLowerCase();
    const now = new Date();

    // 1. Create or update user record
    let user = await this.getUser(lowerWalletAddress);
    if (!user) {
      user = await this.createUser({
        walletAddress: lowerWalletAddress,
        username: `User${lowerWalletAddress.slice(-6)}`,
        memberActivated: true,
        referrerWallet: sponsorWallet?.toLowerCase() || null,
      });
    } else {
      // Update existing user
      user = await this.updateUser(lowerWalletAddress, {
        memberActivated: true,
        referrerWallet: sponsorWallet?.toLowerCase() || user.referrerWallet,
      }) || user;
    }

    // 2. Create membership state
    let membershipState = await this.getMembershipState(lowerWalletAddress);
    if (!membershipState) {
      membershipState = await this.createMembershipState({
        walletAddress: lowerWalletAddress,
        levelsOwned: [membershipLevel],
        activeLevel: membershipLevel,
      });
    } else {
      // Update membership to include new level
      const newLevelsOwned = Array.from(new Set([...membershipState.levelsOwned, membershipLevel]));
      membershipState = await this.updateMembershipState(lowerWalletAddress, {
        levelsOwned: newLevelsOwned,
        activeLevel: Math.max(membershipState.activeLevel, membershipLevel),
        lastUpgradeAt: now,
      }) || membershipState;
    }

    // 3. Initialize referral matrix structure
    let referralNode = await this.getReferralNode(lowerWalletAddress);
    if (!referralNode) {
      referralNode = await this.initializeReferralMatrix(lowerWalletAddress, sponsorWallet);
    }

    // 4. Calculate and store 19-layer referral structure
    await this.calculateAndStore19Layers(lowerWalletAddress);

    // 5. Create earnings wallet
    let earningsWallet = await this.getEarningsWalletByWallet(lowerWalletAddress);
    if (!earningsWallet || earningsWallet.length === 0) {
      const newEarningsWallet = await this.createEarningsWallet({
        walletAddress: lowerWalletAddress,
        totalEarnings: "0",
        referralEarnings: "0",
        levelEarnings: "0",
        pendingRewards: "0",
        withdrawnAmount: "0",
        lastRewardAt: now,
      });
      earningsWallet = [newEarningsWallet];
    }

    // 6. Create BCC balance record with correct rewards
    let bccBalance = await this.getBCCBalance(lowerWalletAddress);
    if (!bccBalance) {
      // New member: Always gets Level 1 rewards (500 transferable + 100 restricted)
      bccBalance = await this.createBCCBalance({
        walletAddress: lowerWalletAddress,
        transferable: 500,
        restricted: 100,
      });
    } else {
      // Existing member upgrading: Add upgrade bonus
      const currentMembershipState = await this.getMembershipState(lowerWalletAddress);
      const isNewLevel = !currentMembershipState?.levelsOwned.includes(membershipLevel);
      
      if (isNewLevel && membershipLevel > 1) {
        // Calculate upgrade bonus: Level 2 = 150 BCC, Level 3 = 200 BCC, etc.
        const upgradeBonusBCC = 50 + (membershipLevel * 50);
        
        bccBalance = await this.updateBCCBalance(lowerWalletAddress, {
          transferable: bccBalance.transferable + upgradeBonusBCC,
        }) || bccBalance;
      }
    }

    // 7. Create NFT verification record
    const nftVerification = await this.createNFTVerification({
      walletAddress: lowerWalletAddress,
      nftContractAddress,
      tokenId,
      chainId,
      verificationStatus: 'verified',
      lastVerified: now,
    });

    // 8. Create member activation record
    const memberActivation = await this.createMemberActivation({
      walletAddress: lowerWalletAddress,
      activationType: 'nft_purchase',
      level: membershipLevel,
      pendingUntil: undefined, // NFT purchase activates immediately
      isPending: false,
      activatedAt: now,
      pendingTimeoutHours: 0,
    });

    // 9. Create global matrix position
    let globalMatrixPosition = await this.getGlobalMatrixPosition(lowerWalletAddress);
    if (!globalMatrixPosition) {
      globalMatrixPosition = await this.createGlobalMatrixPosition({
        walletAddress: lowerWalletAddress,
        matrixLevel: membershipLevel,
        positionIndex: await this.getNextGlobalMatrixPosition(),
        directSponsorWallet: sponsorWallet?.toLowerCase() || '',
        placementSponsorWallet: sponsorWallet?.toLowerCase() || '',
      });
    }

    // 10. Create order record
    const order = await this.createOrder({
      walletAddress: lowerWalletAddress,
      level: membershipLevel,
      tokenId: 1,
      amountUSDT: nftPrice,
      chain: 'ethereum',
      status: 'completed',
      txHash: paymentTxHash || null,
      payembedIntentId: null,
    });

    // 11. Update team counts up the referral chain
    if (sponsorWallet) {
      await this.updateTeamCountsUpline(lowerWalletAddress);
    }

    // 12. Trigger sponsor rewards if there's a sponsor
    if (sponsorWallet) {
      await this.triggerSponsorRewards(lowerWalletAddress, sponsorWallet, membershipLevel, nftPrice);
    }

    // 13. Sync all reward system tables
    await this.syncRewardSystemTables(lowerWalletAddress);

    return {
      user,
      membershipState,
      referralNode,
      earningsWallet: earningsWallet[0],
      bccBalance,
      nftVerification,
      memberActivation,
      globalMatrixPosition,
      order,
    };
  }

  // Trigger rewards for sponsor and upline when new member claims NFT
  async triggerSponsorRewards(
    newMemberWallet: string, 
    sponsorWallet: string, 
    membershipLevel: number, 
    nftPrice: number
  ): Promise<void> {
    try {
      const directReferralReward = nftPrice * 0.1; // 10% direct referral reward
      const levelBonus = nftPrice * 0.05; // 5% level bonus
      
      // 1. Create direct referral reward for sponsor
      await this.createUpgradeAndRewardRecords({
        walletAddress: sponsorWallet,
        triggerWallet: newMemberWallet,
        level: membershipLevel,
        layerNumber: 1,
        rewardAmount: directReferralReward,
        rewardType: 'direct_referral'
      });

      // 2. Create level bonus rewards for upline (up to 19 levels)
      const uplineChain = await this.getUplineChain(sponsorWallet, 19);
      
      for (let i = 0; i < uplineChain.length; i++) {
        const uplineWallet = uplineChain[i];
        const layerNumber = i + 2; // Start from layer 2 (layer 1 is direct sponsor)
        
        // Check if upline member is activated and has required level
        const uplineMembership = await this.getMembershipState(uplineWallet);
        if (uplineMembership && uplineMembership.activeLevel >= membershipLevel) {
          await this.createUpgradeAndRewardRecords({
            walletAddress: uplineWallet,
            triggerWallet: newMemberWallet,
            level: membershipLevel,
            layerNumber,
            rewardAmount: levelBonus / (i + 1), // Decreasing reward amount up the chain
            rewardType: 'level_bonus'
          });
        }
      }

      // 3. Update sponsor's direct referral count
      const sponsorNode = await this.getReferralNode(sponsorWallet);
      if (sponsorNode) {
        await this.updateReferralNode(sponsorWallet, {
          directReferralCount: sponsorNode.directReferralCount + 1
        });
      }

    } catch (error) {
      console.error('Error triggering sponsor rewards:', error);
    }
  }

  // Get upline chain for reward distribution
  async getUplineChain(walletAddress: string, maxLevels: number = 19): Promise<string[]> {
    const uplineChain: string[] = [];
    let currentWallet = walletAddress;
    
    for (let i = 0; i < maxLevels; i++) {
      const user = await this.getUser(currentWallet);
      if (!user || !user.referrerWallet) break;
      
      uplineChain.push(user.referrerWallet);
      currentWallet = user.referrerWallet;
    }
    
    return uplineChain;
  }

  // Bulk initialization for existing users (migration helper)
  async initializeExistingUserData(walletAddress: string, membershipLevel: number = 1): Promise<void> {
    try {
      await this.claimMemberNFTComplete({
        walletAddress,
        nftContractAddress: "0x0000000000000000000000000000000000000000", // Placeholder for existing users
        tokenId: "0",
        chainId: 1,
        membershipLevel,
        nftPrice: 0, // Free for existing users
        paymentTxHash: "migration",
      });
    } catch (error) {
      console.error(`Error initializing data for ${walletAddress}:`, error);
    }
  }

  // Helper method to get next available global matrix position
  async getNextGlobalMatrixPosition(): Promise<number> {
    const lastPosition = await db
      .select({ maxPosition: sql<number>`COALESCE(MAX(${globalMatrixPosition.positionIndex}), 0)` })
      .from(globalMatrixPosition);
    
    return (lastPosition[0]?.maxPosition || 0) + 1;
  }

  // Verify memberNFT ownership and activate member across all tables
  async verifyAndActivateMemberNFT(
    walletAddress: string, 
    nftContractAddress: string, 
    tokenId: string, 
    sponsorWallet?: string
  ): Promise<boolean> {
    try {
      // For now, assume verification passes (in real implementation, verify on-chain)
      const isVerified = true; // Replace with actual NFT ownership verification
      
      if (isVerified) {
        // Determine membership level based on NFT (this would be based on your NFT tier system)
        const membershipLevel = 1; // Default to level 1, adjust based on NFT type
        const nftPrice = 100; // Default price, adjust based on NFT type
        
        await this.claimMemberNFTComplete({
          walletAddress,
          nftContractAddress,
          tokenId,
          chainId: 1, // Ethereum mainnet, adjust as needed
          sponsorWallet,
          membershipLevel,
          nftPrice,
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying and activating memberNFT:', error);
      return false;
    }
  }

  // Synchronized notification and reward methods
  async createUpgradeAndRewardRecords(data: {
    walletAddress: string;
    triggerWallet: string;
    level: number;
    layerNumber: number;
    rewardAmount: number;
    rewardType: 'direct_referral' | 'level_bonus' | 'matrix_spillover';
  }): Promise<{
    rewardNotification: RewardNotification;
    memberActivation: any;
    rewardDistribution: RewardDistribution;
  }> {
    const { walletAddress, triggerWallet, level, layerNumber, rewardAmount, rewardType } = data;
    
    // Create reward notification (72-hour countdown)
    const rewardNotification = await this.createRewardNotification({
      recipientWallet: walletAddress.toLowerCase(),
      triggerWallet: triggerWallet.toLowerCase(),
      triggerLevel: level,
      layerNumber,
      rewardAmount: Math.round(rewardAmount * 100), // Convert to cents
      status: 'pending',
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
    });

    // Create member activation record (24-hour countdown for upgrade)
    const memberActivation = await this.createMemberActivation({
      walletAddress: walletAddress.toLowerCase(),
      activationType: 'upgrade_triggered' as any,
      level,
      pendingUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isPending: true,
      pendingTimeoutHours: 24,
    });

    // Create reward distribution record (72-hour countdown)
    const rewardDistribution = await this.createRewardDistribution({
      recipientWallet: walletAddress.toLowerCase(),
      sourceWallet: triggerWallet.toLowerCase(),
      rewardType,
      rewardAmount: rewardAmount.toString(),
      level,
      status: 'pending',
      pendingUntil: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
    });

    return {
      rewardNotification,
      memberActivation,
      rewardDistribution
    };
  }

  // Sync notification statuses across all related tables
  async syncNotificationStatuses(walletAddress: string): Promise<void> {
    const now = new Date();
    
    // Get all pending notifications that should expire
    const expiredRewardNotifications = await db
      .select()
      .from(rewardNotifications)
      .where(
        and(
          eq(rewardNotifications.recipientWallet, walletAddress.toLowerCase()),
          eq(rewardNotifications.status, 'pending'),
          lt(rewardNotifications.expiresAt, now)
        )
      );

    const expiredMemberActivations = await db
      .select()
      .from(memberActivations)
      .where(
        and(
          eq(memberActivations.walletAddress, walletAddress.toLowerCase()),
          eq(memberActivations.isPending, true),
          lt(memberActivations.pendingUntil, now)
        )
      );

    const expiredRewardDistributions = await db
      .select()
      .from(rewardDistributions)
      .where(
        and(
          eq(rewardDistributions.recipientWallet, walletAddress.toLowerCase()),
          eq(rewardDistributions.status, 'pending'),
          lt(rewardDistributions.pendingUntil, now)
        )
      );

    // Update expired reward notifications
    for (const notification of expiredRewardNotifications) {
      await this.updateRewardNotification(notification.id, { status: 'expired' });
    }

    // Update expired member activations
    for (const activation of expiredMemberActivations) {
      await this.updateMemberActivation(activation.walletAddress, { isPending: false });
    }

    // Redistribute expired rewards
    for (const distribution of expiredRewardDistributions) {
      const uplineWallet = await this.findNearestActivatedUpline(walletAddress);
      if (uplineWallet) {
        await this.redistributeReward(distribution.id, uplineWallet);
      } else {
        // Mark as expired if no upline found
        await this.updateRewardDistribution(distribution.id, { status: 'expired_redistributed' });
      }
    }
  }

  // Claim reward across all related tables including earnings_wallet
  async claimRewardAcrossTables(walletAddress: string, notificationId: string): Promise<void> {
    const now = new Date();
    
    // Get the reward notification to get reward details
    const notifications = await this.getRewardNotifications(walletAddress);
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    const rewardAmount = notification.rewardAmount / 100; // Convert from cents
    
    // Update reward notification as claimed
    await this.updateRewardNotification(notificationId, {
      status: 'claimed',
      claimedAt: now
    });

    // Update member activation as activated
    await this.updateMemberActivation(walletAddress, {
      isPending: false,
      activatedAt: now
    });

    // Find corresponding reward distribution and mark as claimed
    const rewardDistribution = await db
      .select()
      .from(rewardDistributions)
      .where(
        and(
          eq(rewardDistributions.recipientWallet, walletAddress.toLowerCase()),
          eq(rewardDistributions.status, 'pending')
        )
      )
      .limit(1);

    if (rewardDistribution.length > 0) {
      const distribution = rewardDistribution[0];
      await this.updateRewardDistribution(distribution.id, {
        status: 'claimed',
        claimedAt: now
      });

      // Update earnings wallet - move from pending to claimed
      await this.processClaimedReward(
        walletAddress, 
        parseFloat(distribution.rewardAmount),
        distribution.rewardType as 'referral' | 'level' | 'matrix_spillover'
      );
    }
  }

  // Enhanced sync that includes earnings wallet
  async syncRewardSystemTables(walletAddress: string): Promise<void> {
    // First sync notifications, activations, and distributions
    await this.syncNotificationStatuses(walletAddress);
    
    // Then recalculate and sync earnings wallet with actual reward data
    const realEarnings = await this.calculateRealEarnings(walletAddress);
    
    // Update earnings wallet with calculated values
    const existingEarnings = await this.getEarningsWalletByWallet(walletAddress);
    if (existingEarnings && existingEarnings.length > 0) {
      await this.updateEarningsWallet(walletAddress, {
        totalEarnings: realEarnings.totalEarnings.toFixed(2),
        referralEarnings: realEarnings.referralEarnings.toFixed(2),
        levelEarnings: realEarnings.levelEarnings.toFixed(2),
        pendingRewards: realEarnings.pendingRewards.toFixed(2),
        lastRewardAt: new Date()
      });
    } else {
      // Create new earnings wallet with calculated values
      await this.createEarningsWallet({
        walletAddress,
        totalEarnings: realEarnings.totalEarnings.toFixed(2),
        referralEarnings: realEarnings.referralEarnings.toFixed(2),
        levelEarnings: realEarnings.levelEarnings.toFixed(2),
        pendingRewards: realEarnings.pendingRewards.toFixed(2),
        withdrawnAmount: "0",
        lastRewardAt: new Date()
      });
    }
  }

  async updateRewardDistribution(id: string, updates: Partial<RewardDistribution>): Promise<RewardDistribution | undefined> {
    const [updated] = await db
      .update(rewardDistributions)
      .set(updates)
      .where(eq(rewardDistributions.id, id))
      .returning();
    return updated || undefined;
  }

  // User Activity Methods
  async logUserActivity(
    walletAddress: string,
    activityType: string,
    title: string,
    description?: string,
    amount?: number,
    amountType?: string,
    relatedWallet?: string,
    relatedLevel?: number,
    metadata?: any
  ): Promise<void> {
    await db.insert(userActivities).values({
      walletAddress: walletAddress.toLowerCase(),
      activityType,
      title,
      description,
      amount: amount?.toString(),
      amountType,
      relatedWallet: relatedWallet?.toLowerCase(),
      relatedLevel,
      metadata
    });
  }

  async getUserRecentActivities(walletAddress: string, limit: number = 10): Promise<any[]> {
    const activities = await db
      .select()
      .from(userActivities)
      .where(eq(userActivities.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(userActivities.createdAt))
      .limit(limit);
    
    return activities.map(activity => ({
      ...activity,
      amount: activity.amount ? parseFloat(activity.amount) : null
    }));
  }
}

export const storage = new DatabaseStorage();
