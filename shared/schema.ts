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

// Member referral tree - 19层3x3矩阵推荐树系统
export const memberReferralTree = pgTable("member_referral_tree", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootWallet: varchar("root_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // 树的根用户(拥有者)
  memberWallet: varchar("member_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // 被安置的会员
  layer: integer("layer").notNull(), // 1-19层
  position: integer("position").notNull(), // 在该层的位置编号 (0-based: 0,1,2 for layer 1; 0-8 for layer 2, etc.)
  zone: text("zone").notNull(), // 'L'(左区), 'M'(中区), 'R'(右区)
  parentWallet: varchar("parent_wallet", { length: 42 }), // 直接上级 (layer n-1的父节点)
  parentPosition: integer("parent_position"), // 父节点在其层的位置
  placerWallet: varchar("placer_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // 执行安置的用户
  placementType: text("placement_type").notNull(), // 'direct'(直推), 'spillover'(滑落)
  isActivePosition: boolean("is_active_position").default(true).notNull(), // 位置是否激活
  memberActivated: boolean("member_activated").default(false).notNull(), // 会员是否已激活
  registrationOrder: integer("registration_order").notNull(), // 注册顺序号
  placedAt: timestamp("placed_at").defaultNow().notNull(), // 安置时间
  activatedAt: timestamp("activated_at"), // 会员激活时间
}, (table) => ({
  // 关键索引优化查询性能
  rootLayerIdx: index("member_referral_tree_root_layer_idx").on(table.rootWallet, table.layer),
  memberIdx: index("member_referral_tree_member_idx").on(table.memberWallet),
  rootActiveIdx: index("member_referral_tree_root_active_idx").on(table.rootWallet, table.isActivePosition),
  layerPositionIdx: index("member_referral_tree_layer_position_idx").on(table.rootWallet, table.layer, table.position),
  placementOrderIdx: index("member_referral_tree_placement_order_idx").on(table.rootWallet, table.registrationOrder),
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

// Roll up records - 记录奖励上滚历史
export const rollUpRecords = pgTable("roll_up_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalRecipient: varchar("original_recipient", { length: 42 }).notNull().references(() => users.walletAddress), // 原始受益人
  finalRecipient: varchar("final_recipient", { length: 42 }).notNull().references(() => users.walletAddress), // 最终受益人
  triggerWallet: varchar("trigger_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // 触发升级的会员
  triggerLevel: integer("trigger_level").notNull(), // 触发的等级
  rewardAmountUSDT: integer("reward_amount_usdt").notNull(), // 奖励金额 (cents)
  rollupReason: text("rollup_reason").notNull(), // 'pending_expired'(72小时超时), 'level_insufficient'(等级不够)
  originalPendingId: varchar("original_pending_id"), // 原始pending奖励记录ID
  rollupPath: jsonb("rollup_path").$type<{wallet: string, level: number, reason: string}[]>().notNull(), // 上滚路径
  rollupLayer: integer("rollup_layer").notNull(), // 上滚到第几层
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  originalIdx: index("roll_up_records_original_idx").on(table.originalRecipient),
  finalIdx: index("roll_up_records_final_idx").on(table.finalRecipient),
  triggerIdx: index("roll_up_records_trigger_idx").on(table.triggerWallet, table.triggerLevel),
}));

// Layer rewards - 层级奖励分配记录
export const layerRewards = pgTable("layer_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootWallet: varchar("root_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // 推荐树根用户
  recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // 奖励接收人
  triggerWallet: varchar("trigger_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // 触发奖励的会员
  triggerLevel: integer("trigger_level").notNull(), // 触发的等级
  layerNumber: integer("layer_number").notNull(), // 层级号 (1-19)
  rewardAmountUSDT: integer("reward_amount_usdt").notNull(), // 奖励金额 (cents)
  status: text("status").notNull().default("pending"), // 'pending'(待升级), 'claimable'(可领取), 'rollup'(已上滚), 'claimed'(已领取)
  requiresLevel: integer("requires_level").notNull(), // 需要达到的等级才能领取
  currentRecipientLevel: integer("current_recipient_level").notNull(), // 当前接收人等级
  pendingExpiresAt: timestamp("pending_expires_at").notNull(), // 72小时超时时间
  claimedAt: timestamp("claimed_at"), // 领取时间
  rolledUpAt: timestamp("rolled_up_at"), // 上滚时间
  rollupToWallet: varchar("rollup_to_wallet", { length: 42 }), // 上滚到哪个钱包
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  rootIdx: index("layer_rewards_root_idx").on(table.rootWallet),
  recipientIdx: index("layer_rewards_recipient_idx").on(table.recipientWallet),
  statusIdx: index("layer_rewards_status_idx").on(table.status),
  expiresIdx: index("layer_rewards_expires_idx").on(table.pendingExpiresAt),
  triggerIdx: index("layer_rewards_trigger_idx").on(table.triggerWallet, table.triggerLevel),
}));

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

// Level progression configuration (19 levels) - 100-950 USDT递增50每级
export const levelConfig = pgTable("level_config", {
  level: integer("level").primaryKey(), // 1-19
  levelName: text("level_name").notNull(),
  tokenId: integer("token_id").notNull(), // NFT token ID (1-19)
  
  // 价格结构 (cents) - Level 1: 100 USDT = 10000 cents
  nftPriceUSDT: integer("nft_price_usdt").notNull(), // NFT价格 cents
  rewardAmountUSDT: integer("reward_amount_usdt").notNull(), // 100%奖励金额 (等于nft_price_usdt)
  
  // 层级矩阵配置
  layerNumber: integer("layer_number").notNull(), // 对应的层级号 (level = layer)
  maxPositionsInLayer: integer("max_positions_in_layer").notNull(), // 该层最大位置数 (3^layer)
  leftZonePositions: jsonb("left_zone_positions").$type<number[]>().notNull(), // 左区位置编号数组
  middleZonePositions: jsonb("middle_zone_positions").$type<number[]>().notNull(), // 中区位置编号数组
  rightZonePositions: jsonb("right_zone_positions").$type<number[]>().notNull(), // 右区位置编号数组
  
  // 奖励资格要求
  rewardRequiresLevel: integer("reward_requires_level").notNull(), // 获得奖励需要的最低等级
  pendingTimeoutHours: integer("pending_timeout_hours").notNull().default(72), // 72小时待升级超时
  canEarnRewards: boolean("can_earn_rewards").notNull().default(true),
  
  // BCC解锁数量配置
  tier1ReleaseAmount: integer("tier_1_release_amount").notNull(), // BCC解锁数量
  tier2ReleaseAmount: integer("tier_2_release_amount").notNull(),
  tier3ReleaseAmount: integer("tier_3_release_amount").notNull(),
  tier4ReleaseAmount: integer("tier_4_release_amount").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Matrix summary view - 每个root用户的矩阵概览
export const memberMatrixSummary = pgTable("member_matrix_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootWallet: varchar("root_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  
  // 层级统计
  totalMembers: integer("total_members").default(0).notNull(), // 总成员数
  activatedMembers: integer("activated_members").default(0).notNull(), // 已激活成员数
  deepestLayer: integer("deepest_layer").default(0).notNull(), // 最深层级
  
  // 各层填充情况 - 完全匹配SQL设计
  layerStats: jsonb("layer_stats").$type<{
    layer: number; // 1-19
    maxPositions: number; // 3^layer
    filledPositions: number;
    activatedPositions: number;
    leftZoneFilled: number;
    middleZoneFilled: number;
    rightZoneFilled: number;
    availablePositions: number[];
    nextZone: 'L' | 'M' | 'R'; // 下一个可用区域
  }[]>().notNull().default([]),
  
  // 下次安置信息
  nextPlacementLayer: integer("next_placement_layer").default(1).notNull(),
  nextPlacementPosition: integer("next_placement_position").default(0).notNull(),
  nextPlacementZone: text("next_placement_zone").default('L').notNull(),
  
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => ({
  rootIdx: index("member_matrix_summary_root_idx").on(table.rootWallet),
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

// BCC Token Purchase Orders - Track USDC to BCC purchases via Thirdweb bridge
export const bccPurchaseOrders = pgTable("bcc_purchase_orders", {
  orderId: varchar("order_id", { length: 100 }).primaryKey(),
  buyerWallet: varchar("buyer_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  amountUSDC: numeric("amount_usdc", { precision: 18, scale: 6 }).notNull(), // USDC amount (6 decimals)
  amountBCC: numeric("amount_bcc", { precision: 18, scale: 8 }).notNull(), // BCC amount to credit (8 decimals)
  exchangeRate: numeric("exchange_rate", { precision: 10, scale: 6 }).notNull(), // USDC to BCC rate
  network: varchar("network", { length: 50 }).notNull(), // arbitrum-one, arbitrum-sepolia, ethereum, polygon
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // thirdweb_bridge, direct_transfer
  companyWallet: varchar("company_wallet", { length: 42 }).notNull(), // Company receiving wallet
  transactionHash: varchar("transaction_hash", { length: 66 }), // Blockchain transaction hash
  actualAmountReceived: numeric("actual_amount_received", { precision: 18, scale: 6 }), // Actual USDC received
  bridgeUsed: boolean("bridge_used").default(false).notNull(), // Whether Thirdweb bridge was used
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, processing, completed, expired, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Order expiry time
  completedAt: timestamp("completed_at"), // When the order was completed
  failureReason: text("failure_reason"), // Reason for failure if status is failed
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}).notNull() // Additional data
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

// 插入 schemas
export const insertMemberReferralTreeSchema = createInsertSchema(memberReferralTree).pick({
  rootWallet: true,
  memberWallet: true,
  layer: true,
  position: true,
  zone: true,
  parentWallet: true,
  parentPosition: true,
  placerWallet: true,
  placementType: true,
  isActivePosition: true,
  memberActivated: true,
  registrationOrder: true,
  activatedAt: true,
});

export const insertRollUpRecordSchema = createInsertSchema(rollUpRecords).pick({
  originalRecipient: true,
  finalRecipient: true,
  triggerWallet: true,
  triggerLevel: true,
  rewardAmountUSDT: true,
  rollupReason: true,
  originalPendingId: true,
  rollupPath: true,
  rollupLayer: true,
  processedAt: true,
});

export const insertLayerRewardSchema = createInsertSchema(layerRewards).pick({
  rootWallet: true,
  recipientWallet: true,
  triggerWallet: true,
  triggerLevel: true,
  layerNumber: true,
  rewardAmountUSDT: true,
  status: true,
  requiresLevel: true,
  currentRecipientLevel: true,
  pendingExpiresAt: true,
  claimedAt: true,
  rolledUpAt: true,
  rollupToWallet: true,
});

export const insertMemberMatrixSummarySchema = createInsertSchema(memberMatrixSummary).pick({
  rootWallet: true,
  totalMembers: true,
  activatedMembers: true,
  deepestLayer: true,
  layerStats: true,
  nextPlacementLayer: true,
  nextPlacementPosition: true,
  nextPlacementZone: true,
});

export type InsertMemberMatrixSummary = z.infer<typeof insertMemberMatrixSummarySchema>;

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
  tokenId: true,
  nftPriceUSDT: true,
  rewardAmountUSDT: true,
  layerNumber: true,
  maxPositionsInLayer: true,
  leftZonePositions: true,
  middleZonePositions: true,
  rightZonePositions: true,
  rewardRequiresLevel: true,
  pendingTimeoutHours: true,
  canEarnRewards: true,
  tier1ReleaseAmount: true,
  tier2ReleaseAmount: true,
  tier3ReleaseAmount: true,
  tier4ReleaseAmount: true,
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

// Service requests table - tracks user service applications with 4-state workflow
export const serviceRequests = pgTable("service_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  nftId: varchar("nft_id").notNull().references(() => advertisementNFTs.id), // Which NFT/service
  serviceName: text("service_name").notNull(), // Service name from NFT
  serviceType: text("service_type").notNull(), // Service type from NFT
  
  // Application data
  applicationData: jsonb("application_data").$type<Record<string, any>>().notNull(), // User submitted form data
  requestTitle: text("request_title").notNull(), // User's request title
  requestDescription: text("request_description").notNull(), // User's request description
  
  // 4-state workflow: 新申请, 处理中, 等待反馈, 处理完毕
  status: text("status").default("new_application").notNull(), // 'new_application', 'processing', 'awaiting_feedback', 'completed'
  
  // Admin processing
  assignedAdmin: varchar("assigned_admin", { length: 42 }), // Admin wallet handling this
  adminNotes: text("admin_notes"), // Internal admin notes
  responseData: jsonb("response_data").$type<Record<string, any>>(), // Admin response/results
  
  // Status tracking
  statusHistory: jsonb("status_history").$type<Array<{status: string, timestamp: string, notes?: string}>>().default([]).notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"), // When marked as completed
}, (table) => ({
  walletIdx: index("service_requests_wallet_idx").on(table.walletAddress),
  statusIdx: index("service_requests_status_idx").on(table.status),
  nftIdx: index("service_requests_nft_idx").on(table.nftId),
}));

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

// Global BCC staking tiers - defines unlock amounts for different activation phases
export const bccStakingTiers = pgTable("bcc_staking_tiers", {
  tierId: integer("tier_id").primaryKey(),
  tierName: text("tier_name").notNull(), // 'phase_1', 'phase_2', 'phase_3', 'phase_4'
  maxActivations: integer("max_activations").notNull(), // Max members in this tier (9999, 19999, etc.)
  currentActivations: integer("current_activations").default(0).notNull(), // Current members activated
  unlockMultiplier: numeric("unlock_multiplier", { precision: 5, scale: 4 }).default('1.0000').notNull(), // BCC unlock multiplier (1.0, 0.5, 0.25, 0.125)
  totalLockMultiplier: numeric("total_lock_multiplier", { precision: 5, scale: 4 }).default('1.0000').notNull(), // Total pool lock multiplier
  totalLockedBCC: numeric("total_locked_bcc", { precision: 12, scale: 2 }).notNull(), // Total BCC locked across all levels for this tier
  phase: text("phase").notNull(), // 'active', 'completed', 'upcoming'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User balance details with staking tier tracking
export const userBalances = pgTable("user_balances", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  
  // BCC balance management
  bccTransferable: integer("bcc_transferable").default(500).notNull(), // Transferable BCC (initial: 500)
  bccRestricted: integer("bcc_restricted").default(0).notNull(), // Restricted BCC from rewards
  bccLocked: integer("bcc_locked").default(0).notNull(), // Locked BCC from staking system
  
  // USDT reward management
  totalUsdtEarned: integer("total_usdt_earned").default(0).notNull(), // Total USDT earned (cents)
  availableUsdtRewards: integer("available_usdt_rewards").default(0).notNull(), // Available for withdrawal (cents)
  totalUsdtWithdrawn: integer("total_usdt_withdrawn").default(0).notNull(), // Total withdrawn (cents)
  
  // Staking tier when user activated
  activationTier: integer("activation_tier"), // Which tier user activated in (1,2,3,4)
  activationOrder: integer("activation_order"), // User's position in activation queue
  
  // CTH balance (hidden from UI as requested)
  cthBalance: integer("cth_balance").default(0).notNull(), // CTH balance (not displayed)
  
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// USDT withdrawal claims table
export const usdtWithdrawals = pgTable("usdt_withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  
  // Withdrawal details
  amountUsdt: integer("amount_usdt").notNull(), // Amount in cents
  targetChain: text("target_chain").notNull(), // Chain to withdraw to
  targetWalletAddress: varchar("target_wallet_address", { length: 42 }).notNull(), // User's wallet on target chain
  
  // Fee and processing
  gasFeePercentage: numeric("gas_fee_percentage", { precision: 5, scale: 2 }).notNull(), // Fee percentage
  gasFeeAmount: integer("gas_fee_amount").notNull(), // Fee amount in cents
  netAmount: integer("net_amount").notNull(), // Net amount after fees (cents)
  
  // Status tracking
  status: text("status").default("pending").notNull(), // 'pending', 'processing', 'completed', 'failed'
  serverWalletTxHash: text("server_wallet_tx_hash"), // ThirdWeb ServerWallet transaction hash
  targetChainTxHash: text("target_chain_tx_hash"), // Final transaction on target chain
  
  // Processing details
  processedBy: text("processed_by"), // Server wallet address that processed this
  failureReason: text("failure_reason"), // If failed, reason
  
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
});

// Global BCC pool tracking - tracks total locked BCC across all users
export const bccGlobalPool = pgTable("bcc_global_pool", {
  id: integer("id").primaryKey().default(1), // Single row table
  totalBccLocked: integer("total_bcc_locked").default(0).notNull(), // Total BCC locked in system
  totalMembersActivated: integer("total_members_activated").default(0).notNull(), // Total activated members
  currentTier: integer("current_tier").default(1).notNull(), // Current activation tier (1-4)
  
  // Per-tier tracking
  tier1Activations: integer("tier1_activations").default(0).notNull(), // 1-9999
  tier2Activations: integer("tier2_activations").default(0).notNull(), // 10000-19999
  tier3Activations: integer("tier3_activations").default(0).notNull(), // 20000-39999
  tier4Activations: integer("tier4_activations").default(0).notNull(), // 40000+
  
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
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

export const insertBccPurchaseOrderSchema = createInsertSchema(bccPurchaseOrders).pick({
  orderId: true,
  buyerWallet: true,
  amountUSDC: true,
  amountBCC: true,
  exchangeRate: true,
  network: true,
  paymentMethod: true,
  companyWallet: true,
  transactionHash: true,
  actualAmountReceived: true,
  bridgeUsed: true,
  status: true,
  expiresAt: true,
  completedAt: true,
  failureReason: true,
  metadata: true,
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

export const insertBccStakingTierSchema = createInsertSchema(bccStakingTiers).pick({
  tierId: true,
  tierName: true,
  maxActivations: true,
  currentActivations: true,
  unlockMultiplier: true,
  totalLockMultiplier: true,
  totalLockedBCC: true,
  phase: true,
  startedAt: true,
  completedAt: true,
});

export const insertUserBalancesSchema = createInsertSchema(userBalances).pick({
  walletAddress: true,
  bccTransferable: true,
  bccRestricted: true,
  bccLocked: true,
  totalUsdtEarned: true,
  availableUsdtRewards: true,
  totalUsdtWithdrawn: true,
  activationTier: true,
  activationOrder: true,
  cthBalance: true,
});

export const insertUsdtWithdrawalSchema = createInsertSchema(usdtWithdrawals).pick({
  walletAddress: true,
  amountUsdt: true,
  targetChain: true,
  targetWalletAddress: true,
  gasFeePercentage: true,
  gasFeeAmount: true,
  netAmount: true,
  status: true,
  serverWalletTxHash: true,
  targetChainTxHash: true,
  processedBy: true,
  failureReason: true,
});

export const insertBccGlobalPoolSchema = createInsertSchema(bccGlobalPool).pick({
  totalBccLocked: true,
  totalMembersActivated: true,
  currentTier: true,
  tier1Activations: true,
  tier2Activations: true,
  tier3Activations: true,
  tier4Activations: true,
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
// TEMPORARILY COMMENTED FOR MIGRATION
// export const availablePositions = pgTable("available_positions", {
//   id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
//   rootWallet: varchar("root_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
//   layer: integer("layer").notNull(),
//   availablePositions: jsonb("available_positions").$type<{
//     L: boolean;
//     M: boolean;
//     R: boolean;
//   }>().notNull(),
//   parentWallet: varchar("parent_wallet", { length: 42 }), // Which member this position is under
//   isFirstAvailable: boolean("is_first_available").default(false).notNull(), // Mark the next position to fill
//   lastUpdated: timestamp("last_updated").defaultNow().notNull(),
// }, (table) => ({
//   rootLayerIdx: index("available_positions_root_layer_idx").on(table.rootWallet, table.layer),
//   firstAvailableIdx: index("available_positions_first_idx").on(table.rootWallet, table.isFirstAvailable),
// }));


// Matrix organization notifications - activation, upgrades, and countdown reminders
export const userNotifications = pgTable("user_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  relatedWallet: varchar("related_wallet", { length: 42 }),
  amount: text("amount"),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  walletIdx: index("idx_user_notifications_wallet").on(table.walletAddress),
  unreadIdx: index("idx_user_notifications_unread").on(table.walletAddress, table.isRead),
}));

export const insertUserNotificationSchema = createInsertSchema(userNotifications).pick({
  walletAddress: true,
  title: true,
  message: true,
  type: true,
  relatedWallet: true,
  amount: true,
  metadata: true,
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

export type InsertBccPurchaseOrder = z.infer<typeof insertBccPurchaseOrderSchema>;
export type BccPurchaseOrder = typeof bccPurchaseOrders.$inferSelect;

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

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).pick({
  walletAddress: true,
  nftId: true,
  serviceName: true,
  serviceType: true,
  applicationData: true,
  requestTitle: true,
  requestDescription: true,
  status: true,
  assignedAdmin: true,
  adminNotes: true,
  responseData: true,
  statusHistory: true,
});


// 新的类型导出 - 与SQL设计完全对应
export type InsertMemberReferralTree = z.infer<typeof insertMemberReferralTreeSchema>;
export type MemberReferralTree = typeof memberReferralTree.$inferSelect;

export type InsertRollUpRecord = z.infer<typeof insertRollUpRecordSchema>;
export type RollUpRecord = typeof rollUpRecords.$inferSelect;

export type InsertLayerReward = z.infer<typeof insertLayerRewardSchema>;
export type LayerReward = typeof layerRewards.$inferSelect;

export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;
export type UserWallet = typeof userWallet.$inferSelect;


export type InsertRewardClaim = z.infer<typeof insertRewardClaimSchema>;
export type RewardClaim = typeof rewardClaims.$inferSelect;

export type InsertBCCUnlockHistory = z.infer<typeof insertBCCUnlockHistorySchema>;
export type BCCUnlockHistory = typeof bccUnlockHistory.$inferSelect;

export type MemberMatrixSummary = typeof memberMatrixSummary.$inferSelect;
// export type AvailablePositions = typeof availablePositions.$inferSelect; // TEMPORARILY COMMENTED


// Admin panel types
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertDiscoverPartner = z.infer<typeof insertDiscoverPartnerSchema>;
export type DiscoverPartner = typeof discoverPartners.$inferSelect;

export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;

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

// Member upgrade pending table for 72-hour countdown system
export const memberUpgradePending = pgTable("member_upgrade_pending", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  targetLevel: integer("target_level").notNull(),
  currentLevel: integer("current_level").notNull(),
  upgradeFeePaid: integer("upgrade_fee_paid").notNull(), // USDT cents paid
  directReferrersCount: integer("direct_referrers_count").notNull().default(0),
  directReferrersRequired: integer("direct_referrers_required").notNull().default(0),
  countdownExpiresAt: timestamp("countdown_expires_at").notNull(), // 72 hours from payment
  status: text("status").notNull().default("pending"), // 'pending', 'qualified', 'expired', 'activated'
  paymentTxHash: text("payment_tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  walletIdx: index("member_upgrade_pending_wallet_idx").on(table.walletAddress),
  expiresIdx: index("member_upgrade_pending_expires_idx").on(table.countdownExpiresAt),
  statusIdx: index("member_upgrade_pending_status_idx").on(table.status),
}));

// Matrix activity log table for tracking matrix actions
export const matrixActivityLog = pgTable("matrix_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberWallet: varchar("member_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  rootWallet: varchar("root_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  actionType: text("action_type").notNull(),
  layer: integer("layer"),
  placementType: text("placement_type"),
  positionSlot: text("position_slot"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas and types for new tables
export const insertWalletConnectionLogSchema = createInsertSchema(walletConnectionLogs).omit({
  id: true,
  createdAt: true,
});

export const insertMemberUpgradePendingSchema = createInsertSchema(memberUpgradePending).pick({
  walletAddress: true,
  targetLevel: true,
  currentLevel: true,
  upgradeFeePaid: true,
  directReferrersCount: true,
  directReferrersRequired: true,
  countdownExpiresAt: true,
  status: true,
  paymentTxHash: true,
});


export const insertMatrixActivityLogSchema = createInsertSchema(matrixActivityLog).omit({
  id: true,
  createdAt: true,
});

export type InsertMatrixActivityLog = z.infer<typeof insertMatrixActivityLogSchema>;
export type MatrixActivityLog = typeof matrixActivityLog.$inferSelect;

export type InsertWalletConnectionLog = z.infer<typeof insertWalletConnectionLogSchema>;
export type WalletConnectionLog = typeof walletConnectionLogs.$inferSelect;

export type InsertMemberUpgradePending = z.infer<typeof insertMemberUpgradePendingSchema>;
export type MemberUpgradePending = typeof memberUpgradePending.$inferSelect;

export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type UserActivity = typeof userActivities.$inferSelect;
