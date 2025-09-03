import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, numeric, primaryKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User profiles table - simplified to essential fields only
export const users = pgTable("users", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey(),
  referrerWallet: varchar("referrer_wallet", { length: 42 }),
  username: text("username").unique(),
  email: text("email"),
  isUpgraded: boolean("is_upgraded").default(false).notNull(),
  upgradeTimerEnabled: boolean("upgrade_timer_enabled").default(false).notNull(),
  currentLevel: integer("current_level").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Members table - Replaces multiple old status tables
export const members = pgTable("members", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  isActivated: boolean("is_activated").default(false).notNull(), // 是否已激活会员
  activatedAt: timestamp("activated_at"), // 激活时间
  currentLevel: integer("current_level").default(0).notNull(), // 当前级别 (0-19)
  maxLayer: integer("max_layer").default(0).notNull(), // 作为root最深已填满层级
  levelsOwned: jsonb("levels_owned").$type<number[]>().default([]).notNull(), // 拥有的NFT级别
  hasPendingRewards: boolean("has_pending_rewards").default(false).notNull(), // 是否有待领取奖励
  upgradeReminderEnabled: boolean("upgrade_reminder_enabled").default(false).notNull(), // 升级提醒开关
  lastUpgradeAt: timestamp("last_upgrade_at"), // 最后升级时间
  lastRewardClaimAt: timestamp("last_reward_claim_at"), // 最后领取奖励时间
  totalDirectReferrals: integer("total_direct_referrals").default(0).notNull(), // 直推总数
  totalTeamSize: integer("total_team_size").default(0).notNull(), // 团队总人数
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// New referrals table - Individual member trees with 19 layers
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootWallet: varchar("root_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // Tree owner (推荐者)
  memberWallet: varchar("member_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // Placed member (被安置会员)
  layer: integer("layer").notNull(), // 1-19 (第几层)
  position: text("position").notNull(), // 'L', 'M', 'R' (位置)
  parentWallet: varchar("parent_wallet", { length: 42 }), // Direct parent in tree (直接上级)
  placerWallet: varchar("placer_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // Who placed this member (安置者)
  placementType: text("placement_type").notNull(), // 'direct' or 'spillover' (直推或滑落)
  isActive: boolean("is_active").default(true).notNull(), // 是否激活状态
  placedAt: timestamp("placed_at").defaultNow().notNull(), // 安置时间
}, (table) => ({
  // 复合索引优化查询
  rootLayerIdx: index("referrals_root_layer_idx").on(table.rootWallet, table.layer),
  memberIdx: index("referrals_member_idx").on(table.memberWallet),
  rootActiveIdx: index("referrals_root_active_idx").on(table.rootWallet, table.isActive),
}));

// User wallet table - comprehensive balance management
export const userWallet = pgTable("user_wallet", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  
  // USDT 奖励管理
  totalUSDTEarnings: integer("total_usdt_earnings").default(0).notNull(), // 奖励总额 (cents)
  withdrawnUSDT: integer("withdrawn_usdt").default(0).notNull(), // 已提现金额 (cents)
  availableUSDT: integer("available_usdt").default(0).notNull(), // 剩余可提现金额 (cents)
  
  // BCC 代币管理
  bccBalance: integer("bcc_balance").default(0).notNull(), // BCC余额 (可用于购买课程和NFT)
  bccLocked: integer("bcc_locked").default(0).notNull(), // BCC锁仓金额 (激活奖励锁仓)
  
  // 升级待领取状态
  pendingUpgradeRewards: integer("pending_upgrade_rewards").default(0).notNull(), // 待升级领取的奖励数量
  hasPendingUpgrades: boolean("has_pending_upgrades").default(false).notNull(), // 是否有待升级的状态
  
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reward rollup table - handles expired rewards
export const rewardRollups = pgTable("reward_rollups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalRecipient: varchar("original_recipient", { length: 42 }).notNull().references(() => users.walletAddress),
  rolledUpTo: varchar("rolled_up_to", { length: 42 }).notNull().references(() => users.walletAddress),
  rewardAmount: integer("reward_amount").notNull(), // USDT cents
  triggerWallet: varchar("trigger_wallet", { length: 42 }).notNull(), // Who caused the upgrade
  triggerLevel: integer("trigger_level").notNull(),
  originalNotificationId: varchar("original_notification_id").notNull(),
  rollupReason: text("rollup_reason").notNull(), // 'expired', 'not_qualified'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reward notifications with countdown timers
export const rewardNotifications = pgTable("reward_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  triggerWallet: varchar("trigger_wallet", { length: 42 }).notNull(), // Who made the purchase that triggered this
  triggerLevel: integer("trigger_level").notNull(), // Level purchased that triggered the notification
  layerNumber: integer("layer_number").notNull(), // Which layer the trigger came from (1-19)
  rewardAmount: integer("reward_amount").notNull(), // Potential reward amount in USDT cents
  status: text("status").default("pending").notNull(), // 'pending', 'claimable', 'rollup'
  expiresAt: timestamp("expires_at").notNull(), // 72 hours from creation
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Member NFT verification table
export const memberNFTVerification = pgTable("member_nft_verification", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  memberLevel: integer("member_level").notNull(), // 1-19 会员等级
  tokenId: integer("token_id").notNull(), // 1-19 根据会员等级匹配token id
  nftContractAddress: varchar("nft_contract_address", { length: 42 }).notNull(), // ERC5115合约地址
  chain: text("chain").notNull(), // 链名称 (ethereum, polygon, arbitrum, etc.)
  networkType: text("network_type").notNull(), // 'testnet', 'mainnet', 'demo'
  verificationStatus: text("verification_status").default("pending").notNull(), // 'pending', 'verified', 'failed'
  lastVerified: timestamp("last_verified"),
  verifiedAt: timestamp("verified_at"), // 验证成功时间
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// BCC unlock tracking - tracks conditional release based on activation order
export const bccUnlockHistory = pgTable("bcc_unlock_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  unlockLevel: integer("unlock_level").notNull(), // 1-19
  unlockAmount: integer("unlock_amount").notNull(), // BCC amount unlocked
  unlockTier: text("unlock_tier").notNull(), // 'full', 'half', 'quarter', 'eighth'
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
});

// Orders table for membership purchases
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  level: integer("level").notNull(),
  tokenId: integer("token_id").notNull(),
  amountUSDT: integer("amount_usdt").notNull(),
  chain: text("chain").notNull(),
  txHash: text("tx_hash"),
  payembedIntentId: text("payembed_intent_id"), // PayEmbed transaction ID
  status: text("status").default("pending").notNull(),
  // pending, paid, minting, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Reward claims tracking - pending/claimable/expired rewards
export const rewardClaims = pgTable("reward_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  rewardAmount: integer("reward_amount").notNull(), // USDT cents
  triggerWallet: varchar("trigger_wallet", { length: 42 }).notNull(), // Member who upgraded
  triggerLevel: integer("trigger_level").notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'claimable', 'rollup'
  expiresAt: timestamp("expires_at").notNull(), // 72 hours from creation
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User activity logs table
export const userActivities = pgTable("user_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  activityType: text("activity_type").notNull(), // 'reward_received', 'nft_claimed', 'new_referral', 'level_upgrade', 'payment_received', etc.
  title: text("title").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 10, scale: 2 }), // For financial activities
  amountType: text("amount_type"), // 'USDT', 'BCC', etc.
  relatedWallet: varchar("related_wallet", { length: 42 }), // For referral activities
  relatedLevel: integer("related_level"), // For level-related activities
  metadata: jsonb("metadata"), // Additional data as needed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Level progression configuration (19 levels from Warrior to Mythic Peak)
export const levelConfig = pgTable("level_config", {
  level: integer("level").primaryKey(),
  levelName: text("level_name").notNull(),
  priceUSDT: integer("price_usdt").notNull(), // Total price in USDT cents
  rewardUSDT: integer("reward_usdt").notNull(), // 100% reward to referrer (cents)
  activationFeeUSDT: integer("activation_fee_usdt").notNull(), // Platform activation fee (cents)
  bccUnlockAmount: integer("bcc_unlock_amount").notNull(), // BCC unlocked when upgrading to this level
});

// 19-layer matrix view for each root member - shows complete matrix structure
export const memberMatrixView = pgTable("member_matrix_view", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootWallet: varchar("root_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  layerData: jsonb("layer_data").$type<{
    layer: number; // 1-19
    maxPositions: number; // 3^layer
    filledPositions: number;
    positions: {
      L?: { wallet: string; placementType: 'direct' | 'spillover'; placerWallet: string; placedAt: string };
      M?: { wallet: string; placementType: 'direct' | 'spillover'; placerWallet: string; placedAt: string };
      R?: { wallet: string; placementType: 'direct' | 'spillover'; placerWallet: string; placedAt: string };
    };
    availablePositions: ('L' | 'M' | 'R')[];
    isLayerComplete: boolean;
  }[]>().notNull(),
  totalMembers: integer("total_members").default(0).notNull(),
  deepestLayer: integer("deepest_layer").default(0).notNull(),
  nextAvailableLayer: integer("next_available_layer").default(1).notNull(),
  nextAvailablePosition: text("next_available_position").default('L').notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => ({
  rootIdx: index("member_matrix_view_root_idx").on(table.rootWallet),
}));

// Merchant NFTs table
export const merchantNFTs = pgTable("merchant_nfts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  priceBCC: integer("price_bcc").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// NFT purchases table
export const nftPurchases = pgTable("nft_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  nftId: varchar("nft_id").notNull().references(() => merchantNFTs.id),
  amountBCC: integer("amount_bcc").notNull(),
  bucketUsed: text("bucket_used").notNull(), // 'restricted' or 'transferable'
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Education courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requiredLevel: integer("required_level").default(1).notNull(),
  priceBCC: integer("price_bcc").default(0).notNull(),
  isFree: boolean("is_free").default(true).notNull(),
  duration: text("duration").notNull(),
  courseType: text("course_type").default("video").notNull(), // "online" or "video"
  zoomMeetingId: text("zoom_meeting_id"), // For online courses
  zoomPassword: text("zoom_password"), // For online courses
  zoomLink: text("zoom_link"), // For online courses
  videoUrl: text("video_url"), // For video courses
  downloadLink: text("download_link"), // For video courses with downloads
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Course lessons table for video courses
export const courseLessons = pgTable("course_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url").notNull(),
  duration: text("duration").notNull(),
  lessonOrder: integer("lesson_order").notNull(),
  priceBCC: integer("price_bcc").default(0).notNull(),
  isFree: boolean("is_free").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Course activations table - replaces courseAccess and lessonAccess
export const courseActivations = pgTable("course_activations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  
  // 课程基本信息
  totalLessons: integer("total_lessons").default(0).notNull(), // lessons总数量
  courseCategory: text("course_category").notNull(), // 类别
  
  // 进度管理
  unlockedLessons: jsonb("unlocked_lessons").$type<string[]>().default([]).notNull(), // 已解锁lessons ID列表
  completedLessons: jsonb("completed_lessons").$type<string[]>().default([]).notNull(), // 已完成lessons ID列表
  overallProgress: integer("overall_progress").default(0).notNull(), // 总体进度百分比
  
  // 价格信息
  bccOriginalPrice: integer("bcc_original_price").notNull(), // BCC原价
  bccDiscountPrice: integer("bcc_discount_price").default(0).notNull(), // 折扣价格
  actualPaidBCC: integer("actual_paid_bcc").notNull(), // 实际支付BCC
  
  // 时间记录
  courseActivatedAt: timestamp("course_activated_at").defaultNow().notNull(), // 课程激活时间
  lastLessonUnlockedAt: timestamp("last_lesson_unlocked_at"), // 最后lesson解锁时间
  lastProgressUpdate: timestamp("last_progress_update").defaultNow().notNull(), // 最后进度更新
  
  // 额外信息
  zoomNickname: text("zoom_nickname"), // 在线课程昵称
  completed: boolean("completed").default(false).notNull(), // 课程是否完成
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Blog posts table for Hiveworld
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  imageUrl: text("image_url"),
  published: boolean("published").default(true).notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  views: integer("views").default(0).notNull(),
  language: text("language").default("en").notNull(),
});

// Insert schemas - simplified users table
export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
  referrerWallet: true,
  username: true,
  email: true,
  isUpgraded: true,
  upgradeTimerEnabled: true,
  currentLevel: true,
});

export const insertMemberSchema = createInsertSchema(members).pick({
  walletAddress: true,
  isActivated: true,
  activatedAt: true,
  currentLevel: true,
  maxLayer: true,
  levelsOwned: true,
  hasPendingRewards: true,
  upgradeReminderEnabled: true,
  lastUpgradeAt: true,
  totalDirectReferrals: true,
  totalTeamSize: true,
});

export const insertReferralSchema = createInsertSchema(referrals).pick({
  rootWallet: true,
  memberWallet: true,
  layer: true,
  position: true,
  parentWallet: true,
  placerWallet: true,
  placementType: true,
  isActive: true,
});

// insertMatrixLayerSummarySchema moved to after table definition

export const insertUserWalletSchema = createInsertSchema(userWallet).pick({
  walletAddress: true,
  totalUSDTEarnings: true,
  withdrawnUSDT: true,
  availableUSDT: true,
  bccBalance: true,
  bccLocked: true,
  pendingUpgradeRewards: true,
  hasPendingUpgrades: true,
});

export const insertRewardRollupSchema = createInsertSchema(rewardRollups).pick({
  originalRecipient: true,
  rolledUpTo: true,
  rewardAmount: true,
  triggerWallet: true,
  triggerLevel: true,
  originalNotificationId: true,
  rollupReason: true,
});

export const insertRewardNotificationSchema = createInsertSchema(rewardNotifications).pick({
  recipientWallet: true,
  triggerWallet: true,
  triggerLevel: true,
  layerNumber: true,
  rewardAmount: true,
  status: true,
  expiresAt: true,
});

export const insertRewardClaimSchema = createInsertSchema(rewardClaims).pick({
  recipientWallet: true,
  rewardAmount: true,
  triggerWallet: true,
  triggerLevel: true,
  status: true,
  expiresAt: true,
});

export const insertLevelConfigSchema = createInsertSchema(levelConfig).pick({
  level: true,
  levelName: true,
  priceUSDT: true,
  rewardUSDT: true,
  activationFeeUSDT: true,
  bccUnlockAmount: true,
});

export const insertMemberNFTVerificationSchema = createInsertSchema(memberNFTVerification).pick({
  walletAddress: true,
  memberLevel: true,
  tokenId: true,
  nftContractAddress: true,
  chain: true,
  networkType: true,
  verificationStatus: true,
  lastVerified: true,
  verifiedAt: true,
});

// Member activation order moved to users table

export const insertBCCUnlockHistorySchema = createInsertSchema(bccUnlockHistory).pick({
  walletAddress: true,
  unlockLevel: true,
  unlockAmount: true,
  unlockTier: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  walletAddress: true,
  level: true,
  tokenId: true,
  amountUSDT: true,
  chain: true,
  txHash: true,
  payembedIntentId: true,
  status: true,
});


export const insertMerchantNFTSchema = createInsertSchema(merchantNFTs).pick({
  title: true,
  description: true,
  imageUrl: true,
  priceBCC: true,
  active: true,
});

export const insertNFTPurchaseSchema = createInsertSchema(nftPurchases).pick({
  walletAddress: true,
  nftId: true,
  amountBCC: true,
  bucketUsed: true,
  txHash: true,
});

export const insertCourseSchema = createInsertSchema(courses).pick({
  title: true,
  description: true,
  requiredLevel: true,
  priceBCC: true,
  isFree: true,
  duration: true,
  courseType: true,
  zoomMeetingId: true,
  zoomPassword: true,
  zoomLink: true,
  videoUrl: true,
  downloadLink: true,
});

export const insertCourseLessonSchema = createInsertSchema(courseLessons).pick({
  courseId: true,
  title: true,
  description: true,
  videoUrl: true,
  duration: true,
  lessonOrder: true,
  priceBCC: true,
  isFree: true,
});

export const insertCourseActivationSchema = createInsertSchema(courseActivations).pick({
  walletAddress: true,
  courseId: true,
  totalLessons: true,
  courseCategory: true,
  unlockedLessons: true,
  completedLessons: true,
  overallProgress: true,
  bccOriginalPrice: true,
  bccDiscountPrice: true,
  actualPaidBCC: true,
  courseActivatedAt: true,
  lastLessonUnlockedAt: true,
  zoomNickname: true,
  completed: true,
});

// Advertisement NFTs table - different from merchant NFTs
export const advertisementNFTs = pgTable("advertisement_nfts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  serviceName: text("service_name").notNull(), // DApp or service name
  serviceType: text("service_type").notNull(), // 'dapp', 'banner', 'promotion'
  websiteUrl: text("website_url"), // URL to the advertised service/website
  priceBCC: integer("price_bcc").notNull(),
  codeTemplate: text("code_template").notNull(), // Template for generating active codes
  active: boolean("active").default(true).notNull(),
  totalSupply: integer("total_supply").default(1000).notNull(),
  claimedCount: integer("claimed_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Advertisement NFT Claims - BCC locked in NFTs
export const advertisementNFTClaims = pgTable("advertisement_nft_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  nftId: varchar("nft_id").notNull().references(() => advertisementNFTs.id),
  bccAmountLocked: integer("bcc_amount_locked").notNull(),
  bucketUsed: text("bucket_used").notNull(), // 'restricted' or 'transferable'
  activeCode: text("active_code").notNull(), // Generated unique code for this claim
  status: text("status").default("claimed").notNull(), // 'claimed', 'burned'
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  burnedAt: timestamp("burned_at"),
  codeUsedAt: timestamp("code_used_at"),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).pick({
  title: true,
  excerpt: true,
  content: true,
  author: true,
  imageUrl: true,
  published: true,
  tags: true,
  language: true,
});

export const insertAdvertisementNFTSchema = createInsertSchema(advertisementNFTs).pick({
  title: true,
  description: true,
  imageUrl: true,
  serviceName: true,
  serviceType: true,
  priceBCC: true,
  codeTemplate: true,
  active: true,
  totalSupply: true,
});

export const insertAdvertisementNFTClaimSchema = createInsertSchema(advertisementNFTClaims).pick({
  walletAddress: true,
  nftId: true,
  bccAmountLocked: true,
  bucketUsed: true,
  activeCode: true,
  status: true,
});

// Matrix layer summary for quick layer status queries
export const matrixLayerSummary = pgTable("matrix_layer_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootWallet: varchar("root_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  layer: integer("layer").notNull(), // 1-19
  leftPosition: varchar("left_position", { length: 42 }), // L位置的钱包地址
  middlePosition: varchar("middle_position", { length: 42 }), // M位置的钱包地址
  rightPosition: varchar("right_position", { length: 42 }), // R位置的钱包地址
  filledCount: integer("filled_count").default(0).notNull(), // 已填满位置数 (0-3)
  maxPositions: integer("max_positions").notNull(), // 该层最大位置数 (3^layer)
  isLayerComplete: boolean("is_layer_complete").default(false).notNull(), // 该层是否已满
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => ({
  rootLayerIdx: index("matrix_summary_root_layer_idx").on(table.rootWallet, table.layer),
  rootCompleteIdx: index("matrix_summary_complete_idx").on(table.rootWallet, table.isLayerComplete),
}));

// Matrix layer summary insert schema
export const insertMatrixLayerSummarySchema = createInsertSchema(matrixLayerSummary).pick({
  rootWallet: true,
  layer: true,
  leftPosition: true,
  middlePosition: true,
  rightPosition: true,
  filledCount: true,
  maxPositions: true,
  isLayerComplete: true,
});

// NFT claim records table
export const nftClaimRecords = pgTable("nft_claim_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  level: integer("level").notNull(),
  tokenId: integer("token_id").notNull(),
  sourceChain: varchar("source_chain").notNull(), // arbitrum-sepolia
  targetChain: varchar("target_chain").notNull(), // alpha-centauri
  paymentTxHash: varchar("payment_tx_hash").notNull(), // Payment transaction on Arbitrum Sepolia
  claimTxHash: varchar("claim_tx_hash"), // Claim transaction on Alpha Centauri
  bridgeWallet: varchar("bridge_wallet", { length: 42 }).notNull(),
  usdtAmount: integer("usdt_amount").notNull(), // Amount in USDT cents
  status: varchar("status").notNull().default("pending"), // pending, verified, claimed, failed
  verifiedAt: timestamp("verified_at"),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delete old member_levels table - functionality moved to members table

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

export type InsertMatrixLayerSummary = z.infer<typeof insertMatrixLayerSummarySchema>;
export type MatrixLayerSummary = typeof matrixLayerSummary.$inferSelect;

// Matrix placement helper view - for finding available positions quickly
export const availablePositions = pgTable("available_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootWallet: varchar("root_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  layer: integer("layer").notNull(),
  availablePositions: jsonb("available_positions").$type<{
    L: boolean;
    M: boolean;
    R: boolean;
  }>().notNull(),
  parentWallet: varchar("parent_wallet", { length: 42 }), // Which member this position is under
  isFirstAvailable: boolean("is_first_available").default(false).notNull(), // Mark the next position to fill
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => ({
  rootLayerIdx: index("available_positions_root_layer_idx").on(table.rootWallet, table.layer),
  firstAvailableIdx: index("available_positions_first_idx").on(table.rootWallet, table.isFirstAvailable),
}));

export type InsertRewardNotification = z.infer<typeof insertRewardNotificationSchema>;
export type RewardNotification = typeof rewardNotifications.$inferSelect;

// Matrix organization notifications - activation, upgrades, and countdown reminders
export const userNotifications = pgTable("user_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  title: text("title").notNull(),
  message: text("message").notNull(),
  
  // Notification types for matrix organization
  type: text("type").notNull(), 
  // 'member_activated', 'level_upgraded', 'upgrade_reminder', 'reward_received', 
  // 'referral_joined', 'matrix_placement', 'countdown_warning', 'system_announcement'
  
  // Related parties and amounts
  triggerWallet: varchar("trigger_wallet", { length: 42 }), // Who caused this notification
  relatedWallet: varchar("related_wallet", { length: 42 }), // Additional related member
  amount: integer("amount"), // USDT cents or BCC amount
  amountType: text("amount_type"), // 'USDT', 'BCC'
  
  // Matrix context information
  level: integer("level"), // Related member level (1-19)
  layer: integer("layer"), // Matrix layer if applicable
  position: text("position"), // 'L', 'M', 'R' for matrix positions
  
  // Priority and actions
  priority: text("priority").default("normal").notNull(), // 'low', 'normal', 'high', 'urgent'
  actionRequired: boolean("action_required").default(false).notNull(), // Requires user action
  actionType: text("action_type"), // 'upgrade_now', 'claim_reward', 'complete_profile'
  actionUrl: text("action_url"), // Deep link for action
  
  // Countdown and expiration
  expiresAt: timestamp("expires_at"), // For time-sensitive notifications
  reminderSentAt: timestamp("reminder_sent_at"), // When reminder was sent
  
  // Status tracking
  isRead: boolean("is_read").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  emailSent: boolean("email_sent").default(false).notNull(), // Email notification sent
  emailSentAt: timestamp("email_sent_at"), // When email was sent
  
  // Additional data
  metadata: jsonb("metadata").$type<{
    // Upgrade countdown info
    timeLeft?: string;
    upgradeDeadline?: string;
    // Reward details
    rewardSource?: string;
    // Matrix details
    matrixInfo?: {
      rootWallet: string;
      teamSize: number;
      directReferrals: number;
    };
    // Custom data
    [key: string]: any;
  }>(), 
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Indexes for efficient queries
  recipientIdx: index("user_notifications_recipient_idx").on(table.recipientWallet),
  typeIdx: index("user_notifications_type_idx").on(table.type),
  unreadIdx: index("user_notifications_unread_idx").on(table.recipientWallet, table.isRead),
  priorityIdx: index("user_notifications_priority_idx").on(table.priority, table.createdAt),
  expiresIdx: index("user_notifications_expires_idx").on(table.expiresAt),
}));

export const insertUserNotificationSchema = createInsertSchema(userNotifications).pick({
  recipientWallet: true,
  title: true,
  message: true,
  type: true,
  triggerWallet: true,
  relatedWallet: true,
  amount: true,
  amountType: true,
  level: true,
  layer: true,
  position: true,
  priority: true,
  actionRequired: true,
  actionType: true,
  actionUrl: true,
  expiresAt: true,
  metadata: true,
  isRead: true,
  isArchived: true,
  emailSent: true,
});

export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;
export type UserNotification = typeof userNotifications.$inferSelect;

// Old balance types replaced with user_wallet structure
// See InsertUserWallet and UserWallet types defined below

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Old earnings wallet replaced with user_wallet and reward_claims
// See InsertUserWallet and InsertRewardClaim types defined below

export type InsertLevelConfig = z.infer<typeof insertLevelConfigSchema>;
export type LevelConfig = typeof levelConfig.$inferSelect;

export type InsertMemberNFTVerification = z.infer<typeof insertMemberNFTVerificationSchema>;
export type MemberNFTVerification = typeof memberNFTVerification.$inferSelect;

export type InsertMerchantNFT = z.infer<typeof insertMerchantNFTSchema>;
export type MerchantNFT = typeof merchantNFTs.$inferSelect;

export type InsertNFTPurchase = z.infer<typeof insertNFTPurchaseSchema>;
export type NFTPurchase = typeof nftPurchases.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

export type InsertCourseLesson = z.infer<typeof insertCourseLessonSchema>;
export type CourseLesson = typeof courseLessons.$inferSelect;

export type InsertCourseActivation = z.infer<typeof insertCourseActivationSchema>;
export type CourseActivation = typeof courseActivations.$inferSelect;

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

export type InsertAdvertisementNFT = z.infer<typeof insertAdvertisementNFTSchema>;
export type AdvertisementNFT = typeof advertisementNFTs.$inferSelect;

export type InsertAdvertisementNFTClaim = z.infer<typeof insertAdvertisementNFTClaimSchema>;
export type AdvertisementNFTClaim = typeof advertisementNFTClaims.$inferSelect;

// New table insert schemas
// Old memberActivationStatus table removed - functionality moved to members table
/*
export const insertMemberActivationStatusSchema = createInsertSchema(memberActivationStatus).pick({
  walletAddress: true,
  isActivated: true,
  activationLevel: true,
  pendingUntil: true,
  upgradeTimerActive: true,
});
*/

export const insertNFTClaimRecordSchema = createInsertSchema(nftClaimRecords).pick({
  walletAddress: true,
  level: true,
  tokenId: true,
  sourceChain: true,
  targetChain: true,
  paymentTxHash: true,
  claimTxHash: true,
  bridgeWallet: true,
  usdtAmount: true,
  status: true,
});

/*
export const insertMemberLevelSchema = createInsertSchema(memberLevels).pick({
  walletAddress: true,
  currentLevel: true,
  maxLevelAchieved: true,
  levelsOwned: true,
  nftTokenIds: true,
  totalNFTsOwned: true,
});
*/

// New types
// export type InsertMemberActivationStatus = z.infer<typeof insertMemberActivationStatusSchema>;
// export type MemberActivationStatus = typeof memberActivationStatus.$inferSelect; // Removed

export type InsertNFTClaimRecord = z.infer<typeof insertNFTClaimRecordSchema>;
export type NFTClaimRecord = typeof nftClaimRecords.$inferSelect;

// export type InsertMemberLevel = z.infer<typeof insertMemberLevelSchema>; // Removed
// export type MemberLevel = typeof memberLevels.$inferSelect; // Removed

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

export type InsertAdminSession = z.infer<typeof insertAdminSessionSchema>;
export type AdminSession = typeof adminSessions.$inferSelect;

// Bridge Payment Tracking Table
export const bridgePayments = pgTable("bridge_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address").notNull(),
  sourceChain: varchar("source_chain").notNull(), // ethereum, polygon, arbitrum, optimism
  sourceTxHash: varchar("source_tx_hash").notNull().unique(),
  targetChain: varchar("target_chain").notNull().default("alpha-centauri"),
  targetTxHash: varchar("target_tx_hash"),
  usdtAmount: varchar("usdt_amount").notNull(),
  membershipLevel: integer("membership_level").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, verified, minted, failed
  bridgeWallet: varchar("bridge_wallet").notNull(),
  nftTokenId: varchar("nft_token_id"),
  verifiedAt: timestamp("verified_at"),
  mintedAt: timestamp("minted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBridgePaymentSchema = createInsertSchema(bridgePayments).pick({
  walletAddress: true,
  sourceChain: true,
  sourceTxHash: true,
  targetChain: true,
  targetTxHash: true,
  usdtAmount: true,
  membershipLevel: true,
  status: true,
  bridgeWallet: true,
  nftTokenId: true,
  verifiedAt: true,
  mintedAt: true,
});

export type InsertBridgePayment = z.infer<typeof insertBridgePaymentSchema>;
export type BridgePayment = typeof bridgePayments.$inferSelect;

// Token Purchases Table - for BCC and CTH token buying
export const tokenPurchases = pgTable("token_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  tokenType: text("token_type").notNull(), // 'BCC' or 'CTH'
  tokenAmount: integer("token_amount").notNull(), // Amount of tokens purchased (in smallest unit)
  usdtAmount: integer("usdt_amount").notNull(), // Amount paid in USDT cents (1 token = 1 cent)
  sourceChain: text("source_chain").notNull(), // ethereum, polygon, arbitrum, optimism
  txHash: text("tx_hash"), // Payment transaction hash
  payembedIntentId: text("payembed_intent_id"), // PayEmbed transaction ID
  airdropTxHash: text("airdrop_tx_hash"), // Airdrop transaction hash
  status: text("status").default("pending").notNull(),
  // pending, paid, airdropped, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// CTH Balances Table - Similar to BCC but for CTH token
export const cthBalances = pgTable("cth_balances", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  balance: integer("balance").default(0).notNull(), // CTH balance in smallest unit
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertTokenPurchaseSchema = createInsertSchema(tokenPurchases).pick({
  walletAddress: true,
  tokenType: true,
  tokenAmount: true,
  usdtAmount: true,
  sourceChain: true,
  txHash: true,
  payembedIntentId: true,
  airdropTxHash: true,
  status: true,
});

export const insertCTHBalanceSchema = createInsertSchema(cthBalances).pick({
  walletAddress: true,
  balance: true,
});

export type InsertTokenPurchase = z.infer<typeof insertTokenPurchaseSchema>;
export type TokenPurchase = typeof tokenPurchases.$inferSelect;

export type InsertCTHBalance = z.infer<typeof insertCTHBalanceSchema>;
export type CTHBalance = typeof cthBalances.$inferSelect;

// Member Activation Tracking - For pending time system
export const memberActivations = pgTable("member_activations", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  activationType: text("activation_type").notNull(), // 'nft_purchase', 'admin_activated'
  level: integer("level").notNull(), // Level activated/upgraded to
  pendingUntil: timestamp("pending_until"), // 24hr countdown for upgrades
  isPending: boolean("is_pending").default(true).notNull(),
  activatedAt: timestamp("activated_at"),
  pendingTimeoutHours: integer("pending_timeout_hours").default(24).notNull(), // Admin configurable
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reward Distribution Tracking - Matches production database
export const rewardDistributions = pgTable("reward_distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  sourceWallet: varchar("source_wallet", { length: 42 }).notNull(), // Who triggered the reward (no FK constraint to match production)
  rewardType: text("reward_type").notNull(), // 'direct_referral', 'level_bonus', 'matrix_spillover'
  rewardAmount: numeric("reward_amount", { precision: 10, scale: 2 }).notNull(),
  level: integer("level"), // Level that triggered reward (nullable to match production)
  status: text("status").default("pending").notNull(), // 'pending', 'claimable', 'rollup'
  expiresAt: timestamp("expires_at"), // When reward expires if not claimed
  pendingUntil: timestamp("pending_until"), // Timer for pending rewards
  claimedAt: timestamp("claimed_at"),
  redistributedTo: varchar("redistributed_to", { length: 42 }), // If expired, who got it
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin Settings for controlling pending times
export const adminSettings = pgTable("admin_settings", {
  settingKey: text("setting_key").primaryKey(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Platform Revenue Tracking
export const platformRevenue = pgTable("platform_revenue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: text("source_type").notNull(), // 'nft_claim', 'membership_upgrade', 'platform_fee'
  sourceWallet: varchar("source_wallet", { length: 42 }).notNull(), // User who triggered the revenue
  level: integer("level"), // Level that generated the revenue
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USDT").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"), // Store NFT ID, transaction details, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Rewards - Enhanced reward_distributions for NFT claim payouts
export const userRewards = pgTable("user_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  sourceWallet: varchar("source_wallet", { length: 42 }).notNull(), // Who claimed NFT/triggered reward
  triggerLevel: integer("trigger_level").notNull(), // Level N that was claimed
  payoutLayer: integer("payout_layer").notNull(), // Which layer this payout belongs to (1-19)
  matrixPosition: text("matrix_position"), // L, M, R position in layer
  rewardAmount: numeric("reward_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'confirmed', 'expired'
  requiresLevel: integer("requires_level"), // Required upline level for confirmation
  unlockCondition: text("unlock_condition"), // 'upgrade_to_level_X' for pending rewards
  expiresAt: timestamp("expires_at"), // 72h from creation for pending rewards
  confirmedAt: timestamp("confirmed_at"),
  expiredAt: timestamp("expired_at"),
  notes: text("notes"),
  metadata: jsonb("metadata"), // Store NFT ID, claim tx, original price, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemberActivationSchema = createInsertSchema(memberActivations).pick({
  walletAddress: true,
  activationType: true,
  level: true,
  pendingUntil: true,
  isPending: true,
  activatedAt: true,
  pendingTimeoutHours: true,
});

export const insertRewardDistributionSchema = createInsertSchema(rewardDistributions).pick({
  recipientWallet: true,
  sourceWallet: true,
  rewardType: true,
  rewardAmount: true,
  level: true,
  status: true,
  pendingUntil: true,
  claimedAt: true,
  redistributedTo: true,
});

export const insertAdminSettingSchema = createInsertSchema(adminSettings).pick({
  settingKey: true,
  settingValue: true,
  description: true,
});

export const insertPlatformRevenueSchema = createInsertSchema(platformRevenue).pick({
  sourceType: true,
  sourceWallet: true,
  level: true,
  amount: true,
  currency: true,
  description: true,
  metadata: true,
});

export const insertUserRewardSchema = createInsertSchema(userRewards).pick({
  recipientWallet: true,
  sourceWallet: true,
  triggerLevel: true,
  payoutLayer: true,
  matrixPosition: true,
  rewardAmount: true,
  status: true,
  requiresLevel: true,
  unlockCondition: true,
  expiresAt: true,
  confirmedAt: true,
  expiredAt: true,
  notes: true,
  metadata: true,
});

export type InsertMemberActivation = z.infer<typeof insertMemberActivationSchema>;
export type MemberActivation = typeof memberActivations.$inferSelect;

export type InsertRewardDistribution = z.infer<typeof insertRewardDistributionSchema>;
export type RewardDistribution = typeof rewardDistributions.$inferSelect;

export type InsertPlatformRevenue = z.infer<typeof insertPlatformRevenueSchema>;
export type PlatformRevenue = typeof platformRevenue.$inferSelect;

export type InsertUserReward = z.infer<typeof insertUserRewardSchema>;
export type UserReward = typeof userRewards.$inferSelect;

export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;
export type AdminSetting = typeof adminSettings.$inferSelect;

// Admin Panel Tables

// Admin users table for admin panel authentication
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("viewer"), // super_admin, ops_admin, creator_admin, viewer
  permissions: text("permissions").array().default([]),
  status: text("status").notNull().default("active"), // active, inactive, suspended
  fullName: text("full_name"),
  notes: text("notes"),
  createdBy: text("created_by"),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit logs for tracking all admin actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => adminUsers.id),
  action: text("action").notNull(), // create, update, delete, approve, reject, etc.
  module: text("module").notNull(), // users, nfts, blog, discover, etc.
  targetId: text("target_id"), // ID of the affected resource
  targetType: text("target_type"), // user, nft, blog_post, partner, etc.
  oldValues: jsonb("old_values"), // Previous state for updates
  newValues: jsonb("new_values"), // New state for updates
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  severity: text("severity").notNull().default("info"), // info, warning, error, critical
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Discover partners table
export const discoverPartners = pgTable("discover_partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logoUrl: text("logo_url"), // IPFS URL
  websiteUrl: text("website_url").notNull(),
  shortDescription: text("short_description").notNull(),
  longDescription: text("long_description").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  chains: jsonb("chains").$type<string[]>().default([]).notNull(),
  dappType: text("dapp_type").notNull(), // Wallet, Game, Tools, etc.
  featured: boolean("featured").default(false).notNull(),
  status: text("status").notNull().default("draft"), // draft, pending, approved, published, rejected
  submitterWallet: varchar("submitter_wallet", { length: 42 }),
  redeemCodeUsed: text("redeem_code_used"), // The redeem code that was consumed
  approvedBy: varchar("approved_by").references(() => adminUsers.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Ad slots for banner advertisements
export const adSlots = pgTable("ad_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  bannerImageUrl: text("banner_image_url").notNull(), // IPFS URL
  linkUrl: text("link_url").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("draft"), // draft, scheduled, active, expired, paused
  position: text("position").notNull().default("top"), // top, sidebar, bottom
  priority: integer("priority").default(0).notNull(),
  createdBy: varchar("created_by").notNull().references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Partner chains management
export const partnerChains = pgTable("partner_chains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  logoUrl: text("logo_url"), // IPFS URL
  explorerUrl: text("explorer_url").notNull(),
  docsUrl: text("docs_url"),
  rpcUrl: text("rpc_url"),
  chainId: integer("chain_id").unique(),
  nativeCurrency: text("native_currency").notNull(),
  status: text("status").notNull().default("active"), // active, inactive, maintenance
  featured: boolean("featured").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// DApp types for categorization
export const dappTypes = pgTable("dapp_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  iconUrl: text("icon_url"), // IPFS URL
  color: text("color").default("#FFA500").notNull(), // Hex color for UI
  displayOrder: integer("display_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Redeem codes for partner submission validation
export const redeemCodes = pgTable("redeem_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  serviceNftType: text("service_nft_type").notNull(), // "discover_listing", etc.
  generatedFromWallet: varchar("generated_from_wallet", { length: 42 }).notNull(),
  burnTxHash: text("burn_tx_hash").notNull(), // Transaction hash of the NFT burn
  used: boolean("used").default(false).notNull(),
  usedBy: varchar("used_by", { length: 42 }),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  partnerId: varchar("partner_id").references(() => discoverPartners.id), // Set when code is used
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System status monitoring
export const systemStatus = pgTable("system_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: text("service").notNull(), // rpc_ethereum, rpc_polygon, bridge_health, etc.
  status: text("status").notNull(), // healthy, degraded, down
  latency: integer("latency"), // in milliseconds
  blockHeight: varchar("block_height"),
  errorMessage: text("error_message"),
  lastChecked: timestamp("last_checked").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin session management
export const adminSessions = pgTable("admin_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => adminUsers.id),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin panel insert schemas
export const insertAdminUserSchema = createInsertSchema(adminUsers).pick({
  username: true,
  email: true,
  passwordHash: true,
  role: true,
  permissions: true,
  status: true,
  fullName: true,
  notes: true,
  createdBy: true,
});

export const insertAdminSessionSchema = createInsertSchema(adminSessions).pick({
  adminId: true,
  sessionToken: true,
  ipAddress: true,
  userAgent: true,
  expiresAt: true,
});
// User activity insert schema
export const insertUserActivitySchema = createInsertSchema(userActivities).pick({
  walletAddress: true,
  activityType: true,
  title: true,
  description: true,
  amount: true,
  amountType: true,
  relatedWallet: true,
  relatedLevel: true,
  metadata: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).pick({
  adminId: true,
  action: true,
  module: true,
  targetId: true,
  targetType: true,
  oldValues: true,
  newValues: true,
  ipAddress: true,
  userAgent: true,
  severity: true,
  description: true,
});

export const insertDiscoverPartnerSchema = createInsertSchema(discoverPartners).pick({
  name: true,
  logoUrl: true,
  websiteUrl: true,
  shortDescription: true,
  longDescription: true,
  tags: true,
  chains: true,
  dappType: true,
  featured: true,
  status: true,
  submitterWallet: true,
  redeemCodeUsed: true,
  rejectionReason: true,
});

export const insertAdSlotSchema = createInsertSchema(adSlots).pick({
  title: true,
  bannerImageUrl: true,
  linkUrl: true,
  startDate: true,
  endDate: true,
  status: true,
  position: true,
  priority: true,
  createdBy: true,
});

export const insertPartnerChainSchema = createInsertSchema(partnerChains).pick({
  name: true,
  logoUrl: true,
  explorerUrl: true,
  docsUrl: true,
  rpcUrl: true,
  chainId: true,
  nativeCurrency: true,
  status: true,
  featured: true,
  displayOrder: true,
});

export const insertDappTypeSchema = createInsertSchema(dappTypes).pick({
  name: true,
  description: true,
  iconUrl: true,
  color: true,
  displayOrder: true,
  active: true,
});

export const insertRedeemCodeSchema = createInsertSchema(redeemCodes).pick({
  code: true,
  serviceNftType: true,
  generatedFromWallet: true,
  burnTxHash: true,
  used: true,
  usedBy: true,
  expiresAt: true,
  partnerId: true,
});

export const insertSystemStatusSchema = createInsertSchema(systemStatus).pick({
  service: true,
  status: true,
  latency: true,
  blockHeight: true,
  errorMessage: true,
});


// Updated type exports for new schema
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;
export type UserWallet = typeof userWallet.$inferSelect;

export type InsertRewardRollup = z.infer<typeof insertRewardRollupSchema>;
export type RewardRollup = typeof rewardRollups.$inferSelect;

export type InsertRewardClaim = z.infer<typeof insertRewardClaimSchema>;
export type RewardClaim = typeof rewardClaims.$inferSelect;

export type InsertBCCUnlockHistory = z.infer<typeof insertBCCUnlockHistorySchema>;
export type BCCUnlockHistory = typeof bccUnlockHistory.$inferSelect;

export type MemberMatrixView = typeof memberMatrixView.$inferSelect;
export type AvailablePositions = typeof availablePositions.$inferSelect;


// Admin panel types
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertDiscoverPartner = z.infer<typeof insertDiscoverPartnerSchema>;
export type DiscoverPartner = typeof discoverPartners.$inferSelect;

export type InsertAdSlot = z.infer<typeof insertAdSlotSchema>;
export type AdSlot = typeof adSlots.$inferSelect;

export type InsertPartnerChain = z.infer<typeof insertPartnerChainSchema>;
export type PartnerChain = typeof partnerChains.$inferSelect;

export type InsertDappType = z.infer<typeof insertDappTypeSchema>;
export type DappType = typeof dappTypes.$inferSelect;

export type InsertRedeemCode = z.infer<typeof insertRedeemCodeSchema>;
export type RedeemCode = typeof redeemCodes.$inferSelect;

export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;
export type SystemStatus = typeof systemStatus.$inferSelect;

// Legacy types removed - globalMatrixPosition table deleted


// Wallet connection logs table for verification tracking
export const walletConnectionLogs = pgTable("wallet_connection_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  connectionType: text("connection_type").notNull(), // "connect", "verify", "register"
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrerUrl: text("referrer_url"),
  referralCode: text("referral_code"),
  uplineWallet: varchar("upline_wallet", { length: 42 }),
  connectionStatus: text("connection_status").default("success").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas and types for new tables
export const insertWalletConnectionLogSchema = createInsertSchema(walletConnectionLogs).omit({
  id: true,
  createdAt: true,
});


export type InsertWalletConnectionLog = z.infer<typeof insertWalletConnectionLogSchema>;
export type WalletConnectionLog = typeof walletConnectionLogs.$inferSelect;

export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type UserActivity = typeof userActivities.$inferSelect;
