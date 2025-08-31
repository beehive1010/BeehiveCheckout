import { 
  // Core tables
  users,
  userActivities,
  userNotifications,
  bccBalances,
  orders,
  earningsWallet,
  levelConfig,
  memberNFTVerification,
  
  // V1 tables (for backwards compatibility)
  membershipState,
  referralNodes,
  globalMatrixPosition,
  rewardDistributions,
  
  // V2 Matrix tables
  globalMatrixPositionsV2,
  membershipNFTsV2,
  matrixTreeV2,
  layerRewardsV2,
  pendingRewardsV2,
  platformRevenueV2,
  rewardDistributionsV2,
  
  // NFT and marketplace
  merchantNFTs,
  nftPurchases,
  advertisementNFTs,
  advertisementNFTClaims,
  
  // Education
  courses,
  courseLessons,
  courseAccess,
  lessonAccess,
  
  // Admin
  adminUsers,
  adminSessions,
  adminSettings,
  discoverPartners,
  dappTypes,
  partnerChains,
  
  // Bridge and tokens
  bridgePayments,
  tokenPurchases,
  cthBalances,
  walletConnectionLogs,
  
  // Types - Core
  type User, 
  type InsertUser,
  type UserNotification,
  type InsertUserNotification,
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
  
  // Types - V2 Matrix
  type GlobalMatrixPositionV2,
  type InsertGlobalMatrixPositionV2,
  type MembershipNFTV2,
  type InsertMembershipNFTV2,
  type MatrixTreeV2,
  type InsertMatrixTreeV2,
  type LayerRewardV2,
  type InsertLayerRewardV2,
  type PendingRewardV2,
  type InsertPendingRewardV2,
  type PlatformRevenueV2,
  type InsertPlatformRevenueV2,
  type RewardDistributionV2,
  type InsertRewardDistributionV2,
  
  // Types - NFT and marketplace
  type MerchantNFT,
  type InsertMerchantNFT,
  type NFTPurchase,
  type InsertNFTPurchase,
  type AdvertisementNFT,
  type InsertAdvertisementNFT,
  type AdvertisementNFTClaim,
  type InsertAdvertisementNFTClaim,
  
  // Types - Education
  type Course,
  type InsertCourse,
  type CourseLesson,
  type InsertCourseLesson,
  type CourseAccess,
  type InsertCourseAccess,
  type LessonAccess,
  type InsertLessonAccess,
  
  // Types - Admin
  type AdminUser,
  type InsertAdminUser,
  type AdminSession,
  type InsertAdminSession,
  type AdminSetting,
  type InsertAdminSetting,
  type DiscoverPartner,
  type InsertDiscoverPartner,
  type DappType,
  type InsertDappType,
  type PartnerChain,
  type InsertPartnerChain,
  
  // Types - Bridge and tokens
  type BridgePayment,
  type InsertBridgePayment,
  type TokenPurchase,
  type InsertTokenPurchase,
  type CTHBalance,
  type InsertCTHBalance,
  type WalletConnectionLog,
  type InsertWalletConnectionLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, isNull, inArray, not, gt, lt } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(walletAddress: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(walletAddress: string, updates: Partial<User>): Promise<User | undefined>;

  // V2 Matrix Position operations
  getGlobalMatrixPositionV2(walletAddress: string): Promise<GlobalMatrixPositionV2 | undefined>;
  createGlobalMatrixPositionV2(position: InsertGlobalMatrixPositionV2): Promise<GlobalMatrixPositionV2>;
  updateGlobalMatrixPositionV2(walletAddress: string, updates: Partial<GlobalMatrixPositionV2>): Promise<GlobalMatrixPositionV2 | undefined>;
  
  // V2 Membership NFT operations
  getMembershipNFTV2(walletAddress: string, level?: number): Promise<MembershipNFTV2 | undefined>;
  getMembershipNFTsV2(walletAddress: string): Promise<MembershipNFTV2[]>;
  createMembershipNFTV2(nft: InsertMembershipNFTV2): Promise<MembershipNFTV2>;
  updateMembershipNFTV2(id: string, updates: Partial<MembershipNFTV2>): Promise<MembershipNFTV2 | undefined>;
  
  // V2 Matrix Tree operations
  getMatrixTreeV2(rootWallet: string, layer?: number): Promise<MatrixTreeV2[]>;
  createMatrixTreeNodeV2(node: InsertMatrixTreeV2): Promise<MatrixTreeV2>;
  
  // V2 Layer Rewards operations
  getLayerRewardsV2(rootWallet: string): Promise<LayerRewardV2[]>;
  createLayerRewardV2(reward: InsertLayerRewardV2): Promise<LayerRewardV2>;
  updateLayerRewardV2(id: string, updates: Partial<LayerRewardV2>): Promise<LayerRewardV2 | undefined>;
  
  // V2 Platform Revenue operations
  createPlatformRevenueV2(revenue: InsertPlatformRevenueV2): Promise<PlatformRevenueV2>;
  getPlatformRevenueV2(): Promise<PlatformRevenueV2[]>;
  
  // NFT operations
  recordNFTPurchase(purchase: InsertNFTPurchase): Promise<NFTPurchase>;
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

  // BeeHive business logic operations
  processGlobalMatrixRewards(buyerWallet: string, level: number): Promise<void>;
  processReferralRewards(walletAddress: string, level: number): Promise<void>;
  createRewardDistributionV2(distribution: InsertRewardDistributionV2): Promise<RewardDistributionV2>;

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

  // V2 Pending Rewards operations
  getPendingRewardsV2(walletAddress: string): Promise<PendingRewardV2[]>;
  createPendingRewardV2(reward: InsertPendingRewardV2): Promise<PendingRewardV2>;
  updatePendingRewardV2(id: string, updates: Partial<PendingRewardV2>): Promise<PendingRewardV2 | undefined>;
  checkAndExpirePendingRewardsV2(): Promise<void>;

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
  
  // User notifications methods
  getUserNotifications(walletAddress: string): Promise<UserNotification[]>;
  createUserNotification(notification: InsertUserNotification): Promise<UserNotification>;
  markNotificationAsRead(notificationId: string, walletAddress: string): Promise<UserNotification | undefined>;
  markAllNotificationsAsRead(walletAddress: string): Promise<void>;
  getUnreadNotificationCount(walletAddress: string): Promise<number>;
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
      levelsOwned: (membership.levelsOwned as number[]) || ([] as number[]),
      activeLevel: membership.activeLevel || 0,
    };
    const [state] = await db
      .insert(membershipState)
      .values([insertData])
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
    
    for (const { wallet: uplineWallet, layer } of uplineWallets) {
      const pendingUntil = new Date();
      pendingUntil.setHours(pendingUntil.getHours() + 72); // 72-hour countdown
      
      // Check qualification based on level purchased and upline's level ownership
      let isQualified = false;
      const uplineMembership = await this.getMembershipState(uplineWallet);
      
      // SPECIFICATION: Member gets rewards only by each Layer upgrade to same level and member >= this level
      // Layer 1: 3 members × $100 = $300 max (3rd reward requires Level 2)
      // Layer 2: 9 members × $150 = $1350 max
      
      if (purchasedLevel === 1) {
        // Layer 1 members buying Level 1: $100 each
        // Count existing Level 1 rewards for this upline
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
          // First 2 rewards: Need Level 1
          isQualified = uplineMembership?.levelsOwned.includes(1) || false;
        } else {
          // 3rd+ rewards: Need Level 2
          isQualified = uplineMembership?.levelsOwned.includes(2) || false;
        }
      } else {
        // Level 2+: Upline must own the same level or higher
        isQualified = uplineMembership?.levelsOwned.some(level => level >= purchasedLevel) || false;
      }
      
      // Determine reward amount based on purchased level
      // Level 1 = $100, Level 2 = $150, Level 3 = $200, etc.
      let rewardAmount: string;
      if (purchasedLevel === 1) {
        rewardAmount = "100.00"; // $100 USDT
      } else if (purchasedLevel === 2) {
        rewardAmount = "150.00"; // $150 USDT
      } else {
        // Level 3+ = Base price + $50 increments
        const basePrice = 150; // Level 2 price
        const incrementalPrice = basePrice + ((purchasedLevel - 2) * 50);
        rewardAmount = incrementalPrice.toFixed(2);
      }
      
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
  async getUplineWallets(buyerWallet: string, purchasedLevel: number): Promise<Array<{wallet: string, layer: number}>> {
    const uplines: Array<{wallet: string, layer: number}> = [];
    let currentWallet = buyerWallet;
    
    // Walk up the tree to find uplines in each layer
    for (let layer = 1; layer <= 19; layer++) {
      const position = await this.getGlobalMatrixPosition(currentWallet);
      if (!position || position.directSponsorWallet === currentWallet) break;
      
      const uplineWallet = position.directSponsorWallet;
      
      // SPECIFICATION: When member buys Level N, all uplines in all layers get rewards
      // But qualification depends on their level ownership
      uplines.push({ wallet: uplineWallet, layer });
      
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

      // Direct referral reward: 100% of NFT price based on membershipLevels config
      const levelConfig = await this.getLevelConfig(level);
      if (!levelConfig) {
        console.error(`Level config not found for level ${level}`);
        return;
      }
      const directRewardAmount = Number(levelConfig.nftPriceUSDT) || 0; // Ensure it's a number
      
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
      // Add reward distributions as activities
      const userRewardDistributions = await db.select()
        .from(rewardDistributions)
        .where(eq(rewardDistributions.recipientWallet, walletAddress.toLowerCase()))
        .orderBy(desc(rewardDistributions.createdAt))
        .limit(limit);
      
      userRewardDistributions.forEach((reward: any) => {
        activities.push({
          id: reward.id,
          type: 'reward',
          description: reward.rewardType === 'direct_referral' ? 'Direct referral bonus earned' : `Level ${reward.level} bonus reward`,
          amount: `+${Number(reward.rewardAmount).toFixed(2)} USDT`,
          timestamp: reward.createdAt,
          status: reward.status
        });
      });

      // Add BCC balance creation as activity
      const bccBalance = await this.getBCCBalance(walletAddress);
      if (bccBalance && bccBalance.transferable > 0) {
        activities.push({
          id: `bcc-credit-${walletAddress}`,
          type: 'membership',
          description: 'BCC tokens credited to account',
          amount: `+${bccBalance.transferable} BCC`,
          timestamp: bccBalance.lastUpdated
        });
      }

      // Add membership activation as activity
      const membershipState = await this.getMembershipState(walletAddress);
      if (membershipState && membershipState.activeLevel > 0) {
        activities.push({
          id: `membership-${walletAddress}`,
          type: 'membership',
          description: `Level ${membershipState.activeLevel} membership activated`,
          amount: undefined,
          timestamp: membershipState.lastUpgradeAt || membershipState.joinedAt || new Date()
        });
      }
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
      tags: (partner.tags as string[]) || ([] as string[]),
      chains: (partner.chains as string[]) || ([] as string[]),
      dappType: partner.dappType,
      featured: partner.featured || false,
      status: partner.status || 'draft',
      submitterWallet: partner.submitterWallet,
      redeemCodeUsed: partner.redeemCodeUsed,
      rejectionReason: partner.rejectionReason,
    };
    const [createdPartner] = await db
      .insert(discoverPartners)
      .values([insertData])
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
      leftLeg: (referralNode.leftLeg as string[]) || ([] as string[]),
      middleLeg: (referralNode.middleLeg as string[]) || ([] as string[]),
      rightLeg: (referralNode.rightLeg as string[]) || ([] as string[]),
      directReferralCount: referralNode.directReferralCount || 0,
      totalTeamCount: referralNode.totalTeamCount || 0,
    };
    const [created] = await db
      .insert(referralNodes)
      .values([insertData])
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
            
            // Also get levels owned for upgrade verification
            const [membershipData] = await db.select({
              levelsOwned: membershipState.levelsOwned
            }).from(membershipState).where(eq(membershipState.walletAddress, memberWallet));
            
            return user ? {
              ...user,
              levelsOwned: membershipData?.levelsOwned || [1]
            } : {
              walletAddress: memberWallet,
              username: `User_${memberWallet.slice(-4)}`,
              currentLevel: 1,
              memberActivated: true,
              createdAt: new Date(),
              levelsOwned: [1]
            };
          })
        );
        
        // Calculate upgrade statistics - for Layer 2, only count members who own Level 2
        const requiredLevelForLayer = layer.layerNumber; // Layer 2 requires Level 2, etc.
        const upgradedCount = memberDetails.filter(member => {
          const levelsOwned = member.levelsOwned || [1];
          return levelsOwned.includes(requiredLevelForLayer);
        }).length;
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
  // User notifications methods
  async getUserNotifications(walletAddress: string): Promise<UserNotification[]> {
    return await db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(userNotifications.createdAt));
  }

  async createUserNotification(notification: InsertUserNotification): Promise<UserNotification> {
    const [created] = await db
      .insert(userNotifications)
      .values({
        ...notification,
        walletAddress: notification.walletAddress.toLowerCase(),
        relatedWallet: notification.relatedWallet?.toLowerCase() || null,
      })
      .returning();
    return created;
  }

  async markNotificationAsRead(notificationId: string, walletAddress: string): Promise<UserNotification | undefined> {
    const [updated] = await db
      .update(userNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(userNotifications.id, notificationId),
          eq(userNotifications.walletAddress, walletAddress.toLowerCase())
        )
      )
      .returning();
    return updated || undefined;
  }

  async markAllNotificationsAsRead(walletAddress: string): Promise<void> {
    await db
      .update(userNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(userNotifications.walletAddress, walletAddress.toLowerCase()),
          eq(userNotifications.isRead, false)
        )
      );
  }

  async getUnreadNotificationCount(walletAddress: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.walletAddress, walletAddress.toLowerCase()),
          eq(userNotifications.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }
}

// MemStorage: In-memory storage for local development
export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private membershipStates = new Map<string, MembershipState>();
  private referralNodes = new Map<string, ReferralNode>();
  private globalMatrixPositions = new Map<string, GlobalMatrixPosition>();
  private globalMatrixPositionsV2Map = new Map<string, GlobalMatrixPositionV2>();
  private membershipNFTsV2Map = new Map<string, MembershipNFTV2[]>();
  private matrixTreeV2Map = new Map<string, MatrixTreeV2[]>();
  private layerRewardsV2Map = new Map<string, LayerRewardV2[]>();
  private pendingRewardsV2Map = new Map<string, PendingRewardV2[]>();
  private platformRevenueV2List: PlatformRevenueV2[] = [];
  private rewardDistributions = new Map<string, RewardDistribution[]>();
  private bccBalances = new Map<string, BCCBalance>();
  private orders = new Map<string, Order>();
  private earningsWallet = new Map<string, EarningsWallet[]>();
  private levelConfigs = new Map<number, LevelConfig>();
  private memberNFTVerifications = new Map<string, MemberNFTVerification>();
  private adminSettings = new Map<string, string>();
  private memberActivations = new Map<string, any>();
  private pendingRewards = new Map<string, any>();
  private userActivities = new Map<string, UserActivity[]>();
  private notifications = new Map<string, UserNotification[]>();
  private nftPurchases = new Map<string, NFTPurchase>();
  private merchantNFTs = new Map<string, MerchantNFT>();
  private courses: Course[] = [];
  private courseAccess = new Map<string, CourseAccess[]>();
  private lessonAccess = new Map<string, LessonAccess[]>();
  private bridgePayments = new Map<string, BridgePayment>();
  private tokenPurchases = new Map<string, TokenPurchase[]>();
  private cthBalances = new Map<string, CTHBalance>();
  private adminUsers = new Map<string, AdminUser>();
  private adminSessions = new Map<string, AdminSession>();
  private userNotifications = new Map<string, UserNotification[]>();

  constructor() {
    this.initializeSeedData();
  }

  private initializeSeedData() {
    // Initialize level configs
    this.initializeLevelConfig();
    
    // Initialize sample merchant NFTs
    const sampleNFTs: MerchantNFT[] = [
      {
        id: "nft1",
        title: "Digital Art Collection #001",
        description: "Exclusive geometric art piece with rare attributes",
        imageUrl: "https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        priceBCC: 150,
        active: true,
        createdAt: new Date(),
      },
      {
        id: "nft2", 
        title: "Legendary Weapon",
        description: "Rare gaming asset with special abilities",
        imageUrl: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        priceBCC: 300,
        active: true,
        createdAt: new Date(),
      },
    ];
    this.merchantNFTs = sampleNFTs;

    // Initialize sample courses
    const sampleCourses: Course[] = [
      {
        id: "course1",
        title: "Blockchain Basics",
        description: "Learn the fundamentals of blockchain technology",
        requiredLevel: 1,
        priceBCC: 0,
        isFree: true,
        duration: "4 hours",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "course2",
        title: "DeFi Strategies", 
        description: "Advanced DeFi strategies",
        requiredLevel: 2,
        priceBCC: 50,
        isFree: false,
        duration: "4 hours",
        isActive: true,
        createdAt: new Date(),
      },
    ];
    this.courses = sampleCourses;
  }

  private initializeLevelConfig() {
    const levels = [
      { level: 1, levelName: "Warrior", priceUSDT: 130, nftPriceUSDT: 100, platformFeeUSDT: 30, requiredDirectReferrals: 1, maxMatrixCount: 3 },
      { level: 2, levelName: "Bronze", priceUSDT: 150, nftPriceUSDT: 150, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 9 },
      { level: 3, levelName: "Silver", priceUSDT: 200, nftPriceUSDT: 200, platformFeeUSDT: 0, requiredDirectReferrals: 1, maxMatrixCount: 27 },
    ];
    
    levels.forEach(config => {
      this.levelConfigs.set(config.level, config as LevelConfig);
    });
  }

  // User operations
  async getUser(walletAddress: string): Promise<User | undefined> {
    return this.users.get(walletAddress.toLowerCase());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      walletAddress: user.walletAddress.toLowerCase(),
      memberActivated: user.memberActivated || false,
      currentLevel: user.currentLevel || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;
    this.users.set(newUser.walletAddress, newUser);
    return newUser;
  }

  async updateUser(walletAddress: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(walletAddress.toLowerCase());
    if (!user) return undefined;
    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(walletAddress.toLowerCase(), updated);
    return updated;
  }

  // V2 Matrix operations
  async getGlobalMatrixPositionV2(walletAddress: string): Promise<GlobalMatrixPositionV2 | undefined> {
    return this.globalMatrixPositionsV2Map.get(walletAddress.toLowerCase());
  }

  async createGlobalMatrixPositionV2(position: InsertGlobalMatrixPositionV2): Promise<GlobalMatrixPositionV2> {
    const newPosition: GlobalMatrixPositionV2 = {
      id: `pos_${Date.now()}`,
      ...position,
      walletAddress: position.walletAddress.toLowerCase(),
      activatedAt: new Date(),
      lastActiveAt: new Date(),
    } as GlobalMatrixPositionV2;
    this.globalMatrixPositionsV2Map.set(newPosition.walletAddress, newPosition);
    return newPosition;
  }

  async updateGlobalMatrixPositionV2(walletAddress: string, updates: Partial<GlobalMatrixPositionV2>): Promise<GlobalMatrixPositionV2 | undefined> {
    const position = this.globalMatrixPositionsV2Map.get(walletAddress.toLowerCase());
    if (!position) return undefined;
    const updated = { ...position, ...updates, lastActiveAt: new Date() };
    this.globalMatrixPositionsV2Map.set(walletAddress.toLowerCase(), updated);
    return updated;
  }

  // V2 Membership NFT operations
  async getMembershipNFTV2(walletAddress: string, level?: number): Promise<MembershipNFTV2 | undefined> {
    const nfts = this.membershipNFTsV2Map.get(walletAddress.toLowerCase()) || [];
    return level ? nfts.find(n => n.level === level) : nfts[0];
  }

  async getMembershipNFTsV2(walletAddress: string): Promise<MembershipNFTV2[]> {
    return this.membershipNFTsV2Map.get(walletAddress.toLowerCase()) || [];
  }

  async createMembershipNFTV2(nft: InsertMembershipNFTV2): Promise<MembershipNFTV2> {
    const newNFT: MembershipNFTV2 = {
      id: `nft_${Date.now()}`,
      ...nft,
      walletAddress: nft.walletAddress.toLowerCase(),
      purchasedAt: new Date(),
      status: nft.status || 'pending',
    } as MembershipNFTV2;
    
    const existing = this.membershipNFTsV2Map.get(newNFT.walletAddress) || [];
    existing.push(newNFT);
    this.membershipNFTsV2Map.set(newNFT.walletAddress, existing);
    return newNFT;
  }

  async updateMembershipNFTV2(id: string, updates: Partial<MembershipNFTV2>): Promise<MembershipNFTV2 | undefined> {
    for (const [wallet, nfts] of this.membershipNFTsV2Map.entries()) {
      const index = nfts.findIndex(n => n.id === id);
      if (index >= 0) {
        nfts[index] = { ...nfts[index], ...updates };
        return nfts[index];
      }
    }
    return undefined;
  }

  // V2 Matrix Tree operations
  async getMatrixTreeV2(rootWallet: string, layer?: number): Promise<MatrixTreeV2[]> {
    const trees = this.matrixTreeV2Map.get(rootWallet.toLowerCase()) || [];
    return layer !== undefined ? trees.filter(t => t.layer === layer) : trees;
  }

  async createMatrixTreeNodeV2(node: InsertMatrixTreeV2): Promise<MatrixTreeV2> {
    const newNode: MatrixTreeV2 = {
      id: `tree_${Date.now()}`,
      ...node,
      rootWallet: node.rootWallet.toLowerCase(),
      memberWallet: node.memberWallet.toLowerCase(),
      parentWallet: node.parentWallet?.toLowerCase(),
      addedAt: new Date(),
    } as MatrixTreeV2;
    
    const existing = this.matrixTreeV2Map.get(newNode.rootWallet) || [];
    existing.push(newNode);
    this.matrixTreeV2Map.set(newNode.rootWallet, existing);
    return newNode;
  }

  // V2 Layer Rewards operations
  async getLayerRewardsV2(rootWallet: string): Promise<LayerRewardV2[]> {
    return this.layerRewardsV2Map.get(rootWallet.toLowerCase()) || [];
  }

  async createLayerRewardV2(reward: InsertLayerRewardV2): Promise<LayerRewardV2> {
    const newReward: LayerRewardV2 = {
      id: `reward_${Date.now()}`,
      ...reward,
      rootWallet: reward.rootWallet.toLowerCase(),
      triggerWallet: reward.triggerWallet.toLowerCase(),
      createdAt: new Date(),
      status: reward.status || 'pending',
    } as LayerRewardV2;
    
    const existing = this.layerRewardsV2Map.get(newReward.rootWallet) || [];
    existing.push(newReward);
    this.layerRewardsV2Map.set(newReward.rootWallet, existing);
    return newReward;
  }

  async updateLayerRewardV2(id: string, updates: Partial<LayerRewardV2>): Promise<LayerRewardV2 | undefined> {
    for (const [wallet, rewards] of this.layerRewardsV2Map.entries()) {
      const index = rewards.findIndex(r => r.id === id);
      if (index >= 0) {
        rewards[index] = { ...rewards[index], ...updates };
        return rewards[index];
      }
    }
    return undefined;
  }

  // V2 Platform Revenue operations
  async createPlatformRevenueV2(revenue: InsertPlatformRevenueV2): Promise<PlatformRevenueV2> {
    const newRevenue: PlatformRevenueV2 = {
      id: `rev_${Date.now()}`,
      ...revenue,
      triggerWallet: revenue.triggerWallet.toLowerCase(),
      createdAt: new Date(),
      status: revenue.status || 'pending',
    } as PlatformRevenueV2;
    
    this.platformRevenueV2List.push(newRevenue);
    return newRevenue;
  }

  async getPlatformRevenueV2(): Promise<PlatformRevenueV2[]> {
    return this.platformRevenueV2List;
  }

  // V2 Pending Rewards operations
  async getPendingRewardsV2(walletAddress: string): Promise<PendingRewardV2[]> {
    return this.pendingRewardsV2Map.get(walletAddress.toLowerCase()) || [];
  }

  async createPendingRewardV2(reward: InsertPendingRewardV2): Promise<PendingRewardV2> {
    const newReward: PendingRewardV2 = {
      id: `pending_${Date.now()}`,
      ...reward,
      recipientWallet: reward.recipientWallet.toLowerCase(),
      createdAt: new Date(),
      status: reward.status || 'pending',
    } as PendingRewardV2;
    
    const existing = this.pendingRewardsV2Map.get(newReward.recipientWallet) || [];
    existing.push(newReward);
    this.pendingRewardsV2Map.set(newReward.recipientWallet, existing);
    return newReward;
  }

  async updatePendingRewardV2(id: string, updates: Partial<PendingRewardV2>): Promise<PendingRewardV2 | undefined> {
    for (const [wallet, rewards] of this.pendingRewardsV2Map.entries()) {
      const index = rewards.findIndex(r => r.id === id);
      if (index >= 0) {
        rewards[index] = { ...rewards[index], ...updates };
        return rewards[index];
      }
    }
    return undefined;
  }

  async checkAndExpirePendingRewardsV2(): Promise<void> {
    const now = new Date();
    for (const [wallet, rewards] of this.pendingRewardsV2Map.entries()) {
      rewards.forEach(reward => {
        if (reward.expiresAt && reward.expiresAt < now && reward.status === 'pending') {
          reward.status = 'expired';
        }
      });
    }
  }

  // V1 Membership operations (for backwards compatibility)
  async getMembershipState(walletAddress: string): Promise<MembershipState | undefined> {
    return this.membershipStates.get(walletAddress.toLowerCase());
  }

  async createMembershipState(membership: InsertMembershipState): Promise<MembershipState> {
    const newState: MembershipState = {
      walletAddress: membership.walletAddress.toLowerCase(),
      levelsOwned: membership.levelsOwned || [],
      activeLevel: membership.activeLevel || 0,
      joinedAt: membership.joinedAt || new Date(),
      lastUpgradeAt: membership.lastUpgradeAt,
    } as MembershipState;
    this.membershipStates.set(newState.walletAddress, newState);
    return newState;
  }

  async updateMembershipState(walletAddress: string, updates: Partial<MembershipState>): Promise<MembershipState | undefined> {
    const state = this.membershipStates.get(walletAddress.toLowerCase());
    if (!state) return undefined;
    const updated = { ...state, ...updates, lastUpgradeAt: new Date() };
    this.membershipStates.set(walletAddress.toLowerCase(), updated);
    return updated;
  }

  // V1 Global Matrix Position operations
  async getGlobalMatrixPosition(walletAddress: string): Promise<GlobalMatrixPosition | undefined> {
    return this.globalMatrixPositions.get(walletAddress.toLowerCase());
  }

  async createGlobalMatrixPosition(position: InsertGlobalMatrixPosition): Promise<GlobalMatrixPosition> {
    const newPosition: GlobalMatrixPosition = {
      walletAddress: position.walletAddress.toLowerCase(),
      matrixLevel: position.matrixLevel,
      positionIndex: position.positionIndex,
      directSponsorWallet: position.directSponsorWallet.toLowerCase(),
      placementSponsorWallet: position.placementSponsorWallet.toLowerCase(),
      joinedAt: new Date(),
      lastUpgradeAt: position.lastUpgradeAt,
    } as GlobalMatrixPosition;
    this.globalMatrixPositions.set(newPosition.walletAddress, newPosition);
    return newPosition;
  }

  async updateGlobalMatrixPosition(walletAddress: string, updates: Partial<GlobalMatrixPosition>): Promise<GlobalMatrixPosition | undefined> {
    const position = this.globalMatrixPositions.get(walletAddress.toLowerCase());
    if (!position) return undefined;
    const updated = { ...position, ...updates, lastUpgradeAt: new Date() };
    this.globalMatrixPositions.set(walletAddress.toLowerCase(), updated);
    return updated;
  }

  // V1 Referral Node operations
  async getReferralNode(walletAddress: string): Promise<ReferralNode | undefined> {
    return this.referralNodes.get(walletAddress.toLowerCase());
  }

  async createReferralNode(referralNode: InsertReferralNode): Promise<ReferralNode> {
    const newNode: ReferralNode = {
      walletAddress: referralNode.walletAddress.toLowerCase(),
      sponsorWallet: referralNode.sponsorWallet?.toLowerCase(),
      placerWallet: referralNode.placerWallet?.toLowerCase(),
      matrixPosition: referralNode.matrixPosition || 0,
      leftLeg: referralNode.leftLeg || [],
      middleLeg: referralNode.middleLeg || [],
      rightLeg: referralNode.rightLeg || [],
      directReferralCount: referralNode.directReferralCount || 0,
      totalTeamCount: referralNode.totalTeamCount || 0,
      createdAt: new Date(),
    } as ReferralNode;
    this.referralNodes.set(newNode.walletAddress, newNode);
    return newNode;
  }

  async updateReferralNode(walletAddress: string, updates: Partial<ReferralNode>): Promise<ReferralNode | undefined> {
    const node = this.referralNodes.get(walletAddress.toLowerCase());
    if (!node) return undefined;
    const updated = { ...node, ...updates };
    this.referralNodes.set(walletAddress.toLowerCase(), updated);
    return updated;
  }

  // User referral statistics
  async getUserReferralStats(walletAddress: string): Promise<any> {
    const directReferrals = Array.from(this.globalMatrixPositions.values())
      .filter(p => p.directSponsorWallet === walletAddress.toLowerCase()).length;
    
    const teamMembers = Array.from(this.globalMatrixPositions.values())
      .filter(p => p.placementSponsorWallet === walletAddress.toLowerCase()).length;
    
    return {
      directReferrals,
      teamMembers,
      totalReferrals: directReferrals + teamMembers,
    };
  }

  // Admin settings operations
  async getAdminSetting(key: string): Promise<string | undefined> {
    return this.adminSettings.get(key);
  }

  async updateAdminSetting(key: string, value: string): Promise<void> {
    this.adminSettings.set(key, value);
  }

  // Referral matrix initialization
  async initializeReferralMatrix(walletAddress: string, sponsorWallet: string): Promise<void> {
    // Basic matrix initialization for in-memory storage
    const position = await this.createGlobalMatrixPosition({
      walletAddress,
      matrixLevel: 1,
      positionIndex: this.globalMatrixPositions.size + 1,
      directSponsorWallet: sponsorWallet,
      placementSponsorWallet: sponsorWallet,
    });
    
    // Also create referral node
    await this.createReferralNode({
      walletAddress,
      sponsorWallet,
      placerWallet: sponsorWallet,
      matrixPosition: position.positionIndex,
      leftLeg: [],
      middleLeg: [],
      rightLeg: [],
      directReferralCount: 0,
      totalTeamCount: 0,
    });
  }

  // Layer calculation (simplified for in-memory)
  async calculateAndStore19Layers(walletAddress: string): Promise<void> {
    // For in-memory storage, just store basic layer info
    console.log(`Calculating layers for ${walletAddress} (in-memory mode)`);
  }

  // Member activation operations
  async createMemberActivation(activation: any): Promise<any> {
    const newActivation = {
      id: `activation_${Date.now()}`,
      ...activation,
      createdAt: new Date(),
    };
    this.memberActivations.set(activation.walletAddress.toLowerCase(), newActivation);
    return newActivation;
  }

  async getMemberActivation(walletAddress: string): Promise<any> {
    return this.memberActivations.get(walletAddress.toLowerCase());
  }

  // Referral layers (simplified)
  async getReferralLayers(walletAddress: string): Promise<any[]> {
    // Return basic layer structure for in-memory mode
    return [];
  }

  // Reward operations
  async getPendingRewards(walletAddress: string): Promise<any[]> {
    return Array.from(this.pendingRewards.values())
      .filter(r => r.recipientWallet === walletAddress.toLowerCase());
  }

  async getExpiredRewards(): Promise<any[]> {
    const now = new Date();
    return Array.from(this.pendingRewards.values())
      .filter(r => r.expiresAt && new Date(r.expiresAt) < now);
  }

  async findNearestActivatedUpline(walletAddress: string): Promise<string | null> {
    const position = this.globalMatrixPositions.get(walletAddress.toLowerCase());
    if (!position) return null;
    
    const membership = this.membershipStates.get(position.directSponsorWallet);
    if (membership && membership.activeLevel > 0) {
      return position.directSponsorWallet;
    }
    
    return null;
  }

  async redistributeReward(rewardId: string, newRecipient: string): Promise<void> {
    const reward = this.pendingRewards.get(rewardId);
    if (reward) {
      reward.recipientWallet = newRecipient.toLowerCase();
      this.pendingRewards.set(rewardId, reward);
    }
  }

  // Notification operations
  async createRewardNotification(notification: any): Promise<any> {
    return this.createUserNotification(notification);
  }

  async getRewardNotifications(walletAddress: string): Promise<any[]> {
    return this.getUserNotifications(walletAddress);
  }

  async getPendingRewardNotifications(walletAddress: string): Promise<any[]> {
    return this.getUserNotifications(walletAddress);
  }

  // User tracking
  async updateUserRegistrationTracking(walletAddress: string, data: any): Promise<void> {
    const user = this.users.get(walletAddress.toLowerCase());
    if (user) {
      Object.assign(user, data);
      this.users.set(walletAddress.toLowerCase(), user);
    }
  }

  // Activity operations
  async getUserRecentActivities(walletAddress: string, limit: number = 10): Promise<any[]> {
    return this.getUserActivity(walletAddress, limit);
  }

  async logUserActivity(activity: any): Promise<void> {
    const newActivity = {
      id: `activity_${Date.now()}`,
      ...activity,
      timestamp: new Date(),
    };
    
    if (!this.userActivities.has(activity.walletAddress.toLowerCase())) {
      this.userActivities.set(activity.walletAddress.toLowerCase(), []);
    }
    
    this.userActivities.get(activity.walletAddress.toLowerCase())?.push(newActivity);
  }

  // Layer members data
  async getLayerMembersData(walletAddress: string): Promise<any> {
    return {
      layers: [],
      totalMembers: 0,
      activatedMembers: 0,
    };
  }

  // Implement remaining required methods with basic in-memory logic
  async recordNFTPurchase(purchase: InsertNFTPurchase): Promise<NFTPurchase> {
    const newPurchase: NFTPurchase = {
      id: `purchase_${Date.now()}`,
      ...purchase,
      walletAddress: purchase.walletAddress.toLowerCase(),
      purchasedAt: new Date(),
    } as NFTPurchase;
    this.nftPurchases.push(newPurchase);
    return newPurchase;
  }

  async findGlobalMatrixPlacement(sponsorWallet: string): Promise<{ matrixLevel: number; positionIndex: number; placementSponsorWallet: string }> {
    return { matrixLevel: 1, positionIndex: 0, placementSponsorWallet: sponsorWallet };
  }

  async getBCCBalance(walletAddress: string): Promise<BCCBalance | undefined> {
    return this.bccBalances.get(walletAddress.toLowerCase());
  }

  async createBCCBalance(balance: InsertBCCBalance): Promise<BCCBalance> {
    const newBalance: BCCBalance = {
      ...balance,
      walletAddress: balance.walletAddress.toLowerCase(),
      transferable: balance.transferable || 0,
      restricted: balance.restricted || 0,
      lastUpdated: new Date(),
    } as BCCBalance;
    this.bccBalances.set(newBalance.walletAddress, newBalance);
    return newBalance;
  }

  async updateBCCBalance(walletAddress: string, updates: Partial<BCCBalance>): Promise<BCCBalance | undefined> {
    const balance = this.bccBalances.get(walletAddress.toLowerCase());
    if (!balance) return undefined;
    const updated = { ...balance, ...updates, lastUpdated: new Date() };
    this.bccBalances.set(walletAddress.toLowerCase(), updated);
    return updated;
  }

  // Add stubs for remaining methods to satisfy interface
  async createOrder(order: InsertOrder): Promise<Order> {
    const newOrder: Order = {
      id: `order_${Date.now()}`,
      ...order,
      walletAddress: order.walletAddress.toLowerCase(),
      createdAt: new Date(),
      status: order.status || 'pending',
    } as Order;
    this.orders.set(newOrder.id, newOrder);
    return newOrder;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByWallet(walletAddress: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(o => o.walletAddress === walletAddress.toLowerCase());
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, ...updates };
    this.orders.set(id, updated);
    return updated;
  }

  async createEarningsWalletEntry(entry: InsertEarningsWallet): Promise<EarningsWallet> {
    const newEntry: EarningsWallet = {
      id: `earn_${Date.now()}`,
      ...entry,
      walletAddress: entry.walletAddress.toLowerCase(),
      createdAt: new Date(),
      status: entry.status || 'pending',
    } as EarningsWallet;
    
    const existing = this.earningsWallet.get(newEntry.walletAddress) || [];
    existing.push(newEntry);
    this.earningsWallet.set(newEntry.walletAddress, existing);
    return newEntry;
  }

  async getEarningsWalletByWallet(walletAddress: string): Promise<EarningsWallet[]> {
    return this.earningsWallet.get(walletAddress.toLowerCase()) || [];
  }

  async updateEarningsWalletEntry(id: string, updates: Partial<EarningsWallet>): Promise<EarningsWallet | undefined> {
    for (const [wallet, entries] of this.earningsWallet.entries()) {
      const index = entries.findIndex(e => e.id === id);
      if (index >= 0) {
        entries[index] = { ...entries[index], ...updates };
        return entries[index];
      }
    }
    return undefined;
  }

  async getPendingEarningsEntries(): Promise<EarningsWallet[]> {
    const result: EarningsWallet[] = [];
    for (const entries of this.earningsWallet.values()) {
      result.push(...entries.filter(e => e.status === 'pending'));
    }
    return result;
  }

  async getExpiredEarningsEntries(): Promise<EarningsWallet[]> {
    const result: EarningsWallet[] = [];
    const now = new Date();
    for (const entries of this.earningsWallet.values()) {
      result.push(...entries.filter(e => e.expiresAt && e.expiresAt < now));
    }
    return result;
  }

  async getLevelConfig(level: number): Promise<LevelConfig | undefined> {
    return this.levelConfigs.get(level);
  }

  async getAllLevelConfigs(): Promise<LevelConfig[]> {
    return Array.from(this.levelConfigs.values()).sort((a, b) => a.level - b.level);
  }

  async createOrUpdateLevelConfig(config: InsertLevelConfig): Promise<LevelConfig> {
    const levelConfig = config as LevelConfig;
    this.levelConfigs.set(levelConfig.level, levelConfig);
    return levelConfig;
  }

  async getMemberNFTVerification(walletAddress: string): Promise<MemberNFTVerification | undefined> {
    return this.memberNFTVerifications.get(walletAddress.toLowerCase());
  }

  async createNFTVerification(verification: InsertMemberNFTVerification): Promise<MemberNFTVerification> {
    const newVerification: MemberNFTVerification = {
      ...verification,
      walletAddress: verification.walletAddress.toLowerCase(),
      createdAt: new Date(),
    } as MemberNFTVerification;
    this.memberNFTVerifications.set(newVerification.walletAddress, newVerification);
    return newVerification;
  }

  async updateNFTVerification(walletAddress: string, updates: Partial<MemberNFTVerification>): Promise<MemberNFTVerification | undefined> {
    const verification = this.memberNFTVerifications.get(walletAddress.toLowerCase());
    if (!verification) return undefined;
    const updated = { ...verification, ...updates };
    this.memberNFTVerifications.set(walletAddress.toLowerCase(), updated);
    return updated;
  }

  async getTotalMemberCount(): Promise<number> {
    return this.users.size;
  }

  async getMemberCountByLevel(): Promise<{ level: number; count: number }[]> {
    const counts = new Map<number, number>();
    for (const user of this.users.values()) {
      const level = user.currentLevel || 0;
      counts.set(level, (counts.get(level) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([level, count]) => ({ level, count }));
  }

  async getDirectReferralCount(walletAddress: string): Promise<number> {
    return Array.from(this.referralNodes.values()).filter(n => n.sponsorWallet === walletAddress.toLowerCase()).length;
  }

  async processGlobalMatrixRewards(buyerWallet: string, level: number): Promise<void> {
    // Stub implementation
  }

  async processReferralRewards(walletAddress: string, level: number): Promise<void> {
    // Stub implementation
  }

  async createRewardDistributionV2(distribution: InsertRewardDistributionV2): Promise<RewardDistributionV2> {
    const newDistribution: RewardDistributionV2 = {
      id: `dist_${Date.now()}`,
      ...distribution,
      recipientWallet: distribution.recipientWallet.toLowerCase(),
      triggerWallet: distribution.triggerWallet.toLowerCase(),
      createdAt: new Date(),
      status: distribution.status || 'pending',
    } as RewardDistributionV2;
    return newDistribution;
  }

  async getMerchantNFTs(): Promise<MerchantNFT[]> {
    return this.merchantNFTs;
  }

  async getMerchantNFT(id: string): Promise<MerchantNFT | undefined> {
    return this.merchantNFTs.find(n => n.id === id);
  }

  async createMerchantNFT(nft: InsertMerchantNFT): Promise<MerchantNFT> {
    const newNFT: MerchantNFT = {
      id: `merchant_${Date.now()}`,
      ...nft,
      active: nft.active ?? true,
      createdAt: new Date(),
    } as MerchantNFT;
    this.merchantNFTs.push(newNFT);
    return newNFT;
  }

  async createNFTPurchase(purchase: InsertNFTPurchase): Promise<NFTPurchase> {
    return this.recordNFTPurchase(purchase);
  }

  async getNFTPurchasesByWallet(walletAddress: string): Promise<(NFTPurchase & { nft: MerchantNFT })[]> {
    const purchases = this.nftPurchases.filter(p => p.walletAddress === walletAddress.toLowerCase());
    return purchases.map(p => {
      const nft = this.merchantNFTs.find(n => n.id === p.nftId);
      return { ...p, nft: nft! };
    }).filter(p => p.nft);
  }

  async getCourses(): Promise<Course[]> {
    return this.courses;
  }

  async getCourse(id: string): Promise<Course | undefined> {
    return this.courses.find(c => c.id === id);
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const newCourse: Course = {
      id: `course_${Date.now()}`,
      ...course,
      isActive: course.isActive ?? true,
      createdAt: new Date(),
    } as Course;
    this.courses.push(newCourse);
    return newCourse;
  }

  async getCourseLessons(courseId: string): Promise<CourseLesson[]> {
    return [];
  }

  async getCourseAccess(walletAddress: string, courseId: string): Promise<CourseAccess | undefined> {
    const accesses = this.courseAccess.get(walletAddress.toLowerCase()) || [];
    return accesses.find(a => a.courseId === courseId);
  }

  async getCourseAccessByWallet(walletAddress: string): Promise<CourseAccess[]> {
    return this.courseAccess.get(walletAddress.toLowerCase()) || [];
  }

  async createCourseAccess(access: InsertCourseAccess): Promise<CourseAccess> {
    const newAccess: CourseAccess = {
      id: `access_${Date.now()}`,
      ...access,
      walletAddress: access.walletAddress.toLowerCase(),
      grantedAt: new Date(),
    } as CourseAccess;
    
    const existing = this.courseAccess.get(newAccess.walletAddress) || [];
    existing.push(newAccess);
    this.courseAccess.set(newAccess.walletAddress, existing);
    return newAccess;
  }

  async updateCourseAccess(walletAddress: string, courseId: string, updates: Partial<CourseAccess>): Promise<CourseAccess | undefined> {
    const accesses = this.courseAccess.get(walletAddress.toLowerCase()) || [];
    const index = accesses.findIndex(a => a.courseId === courseId);
    if (index >= 0) {
      accesses[index] = { ...accesses[index], ...updates };
      return accesses[index];
    }
    return undefined;
  }

  async getLessonAccessByCourse(walletAddress: string, courseId: string): Promise<LessonAccess[]> {
    const accesses = this.lessonAccess.get(walletAddress.toLowerCase()) || [];
    return accesses.filter(a => a.courseId === courseId);
  }

  async createBridgePayment(bridgePayment: InsertBridgePayment): Promise<BridgePayment> {
    const newPayment: BridgePayment = {
      id: `bridge_${Date.now()}`,
      ...bridgePayment,
      walletAddress: bridgePayment.walletAddress.toLowerCase(),
      createdAt: new Date(),
      status: bridgePayment.status || 'pending',
    } as BridgePayment;
    this.bridgePayments.set(newPayment.id, newPayment);
    return newPayment;
  }

  async getBridgePayment(sourceTxHash: string): Promise<BridgePayment | undefined> {
    return Array.from(this.bridgePayments.values()).find(p => p.sourceTxHash === sourceTxHash);
  }

  async getBridgePaymentsByWallet(walletAddress: string): Promise<BridgePayment[]> {
    return Array.from(this.bridgePayments.values()).filter(p => p.walletAddress === walletAddress.toLowerCase());
  }

  async updateBridgePayment(id: string, updates: Partial<BridgePayment>): Promise<BridgePayment | undefined> {
    const payment = this.bridgePayments.get(id);
    if (!payment) return undefined;
    const updated = { ...payment, ...updates };
    this.bridgePayments.set(id, updated);
    return updated;
  }

  async getPendingBridgePayments(): Promise<BridgePayment[]> {
    return Array.from(this.bridgePayments.values()).filter(p => p.status === 'pending');
  }

  async createTokenPurchase(purchase: InsertTokenPurchase): Promise<TokenPurchase> {
    const newPurchase: TokenPurchase = {
      id: `token_${Date.now()}`,
      ...purchase,
      walletAddress: purchase.walletAddress.toLowerCase(),
      createdAt: new Date(),
      status: purchase.status || 'pending',
    } as TokenPurchase;
    
    const existing = this.tokenPurchases.get(newPurchase.walletAddress) || [];
    existing.push(newPurchase);
    this.tokenPurchases.set(newPurchase.walletAddress, existing);
    return newPurchase;
  }

  async getTokenPurchase(id: string): Promise<TokenPurchase | undefined> {
    for (const purchases of this.tokenPurchases.values()) {
      const purchase = purchases.find(p => p.id === id);
      if (purchase) return purchase;
    }
    return undefined;
  }

  async getTokenPurchasesByWallet(walletAddress: string): Promise<TokenPurchase[]> {
    return this.tokenPurchases.get(walletAddress.toLowerCase()) || [];
  }

  async updateTokenPurchase(id: string, updates: Partial<TokenPurchase>): Promise<TokenPurchase | undefined> {
    for (const [wallet, purchases] of this.tokenPurchases.entries()) {
      const index = purchases.findIndex(p => p.id === id);
      if (index >= 0) {
        purchases[index] = { ...purchases[index], ...updates };
        return purchases[index];
      }
    }
    return undefined;
  }

  async getCTHBalance(walletAddress: string): Promise<CTHBalance | undefined> {
    return this.cthBalances.get(walletAddress.toLowerCase());
  }

  async createCTHBalance(balance: InsertCTHBalance): Promise<CTHBalance> {
    const newBalance: CTHBalance = {
      ...balance,
      walletAddress: balance.walletAddress.toLowerCase(),
      balance: balance.balance || 0,
      lastUpdated: new Date(),
    } as CTHBalance;
    this.cthBalances.set(newBalance.walletAddress, newBalance);
    return newBalance;
  }

  async updateCTHBalance(walletAddress: string, updates: Partial<CTHBalance>): Promise<CTHBalance | undefined> {
    const balance = this.cthBalances.get(walletAddress.toLowerCase());
    if (!balance) return undefined;
    const updated = { ...balance, ...updates, lastUpdated: new Date() };
    this.cthBalances.set(walletAddress.toLowerCase(), updated);
    return updated;
  }

  async getUserActivity(walletAddress: string, limit?: number): Promise<Array<{
    id: string;
    type: 'reward' | 'purchase' | 'nft_purchase' | 'token_purchase' | 'membership';
    description: string;
    amount?: string;
    timestamp: Date;
    status?: string;
  }>> {
    return [];
  }

  async getUserBalances(walletAddress: string): Promise<{
    usdt?: number;
    bccTransferable: number;
    bccRestricted: number;
    cth: number;
  }> {
    const bcc = this.bccBalances.get(walletAddress.toLowerCase());
    const cth = this.cthBalances.get(walletAddress.toLowerCase());
    return {
      bccTransferable: bcc?.transferable || 0,
      bccRestricted: bcc?.restricted || 0,
      cth: cth?.balance || 0,
    };
  }

  async getAdminUsers(filters?: { search?: string; role?: string; status?: string }): Promise<AdminUser[]> {
    let users = Array.from(this.adminUsers.values());
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(u => u.username.toLowerCase().includes(search));
    }
    if (filters?.role) {
      users = users.filter(u => u.role === filters.role);
    }
    if (filters?.status) {
      users = users.filter(u => u.status === filters.status);
    }
    return users;
  }

  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    return this.adminUsers.get(id);
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    return Array.from(this.adminUsers.values()).find(u => u.username === username);
  }

  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const newAdmin: AdminUser = {
      id: `admin_${Date.now()}`,
      ...adminUser,
      status: adminUser.status || 'active',
      createdAt: new Date(),
      lastLogin: null,
    } as AdminUser;
    this.adminUsers.set(newAdmin.id, newAdmin);
    return newAdmin;
  }

  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | undefined> {
    const admin = this.adminUsers.get(id);
    if (!admin) return undefined;
    const updated = { ...admin, ...updates };
    this.adminUsers.set(id, updated);
    return updated;
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    return this.adminUsers.delete(id);
  }

  async createAdminSession(session: InsertAdminSession): Promise<AdminSession> {
    const newSession: AdminSession = {
      ...session,
      sessionToken: session.sessionToken,
      createdAt: new Date(),
      expiresAt: session.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
    } as AdminSession;
    this.adminSessions.set(newSession.sessionToken, newSession);
    return newSession;
  }

  async getAdminSession(sessionToken: string): Promise<AdminSession | undefined> {
    return this.adminSessions.get(sessionToken);
  }

  async deleteAdminSession(sessionToken: string): Promise<boolean> {
    return this.adminSessions.delete(sessionToken);
  }

  async getUserNotifications(walletAddress: string): Promise<UserNotification[]> {
    return this.userNotifications.get(walletAddress.toLowerCase()) || [];
  }

  async createUserNotification(notification: InsertUserNotification): Promise<UserNotification> {
    const newNotification: UserNotification = {
      id: `notif_${Date.now()}`,
      ...notification,
      walletAddress: notification.walletAddress.toLowerCase(),
      isRead: notification.isRead || false,
      createdAt: new Date(),
    } as UserNotification;
    
    const existing = this.userNotifications.get(newNotification.walletAddress) || [];
    existing.push(newNotification);
    this.userNotifications.set(newNotification.walletAddress, existing);
    return newNotification;
  }

  async markNotificationAsRead(notificationId: string, walletAddress: string): Promise<UserNotification | undefined> {
    const notifications = this.userNotifications.get(walletAddress.toLowerCase()) || [];
    const notif = notifications.find(n => n.id === notificationId);
    if (notif) {
      notif.isRead = true;
      return notif;
    }
    return undefined;
  }

  async markAllNotificationsAsRead(walletAddress: string): Promise<void> {
    const notifications = this.userNotifications.get(walletAddress.toLowerCase()) || [];
    notifications.forEach(n => n.isRead = true);
  }

  async getUnreadNotificationCount(walletAddress: string): Promise<number> {
    const notifications = this.userNotifications.get(walletAddress.toLowerCase()) || [];
    return notifications.filter(n => !n.isRead).length;
  }
}

// Use MemStorage for local development, DatabaseStorage for production
export const storage = new MemStorage();
// export const storage = new DatabaseStorage();
