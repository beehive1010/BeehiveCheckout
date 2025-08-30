import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, numeric, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User profiles table
export const users = pgTable("users", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey(),
  email: text("email"),
  username: text("username").unique(),
  secondaryPasswordHash: text("secondary_password_hash"),
  ipfsHash: text("ipfs_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
  referrerWallet: varchar("referrer_wallet", { length: 42 }),
  memberActivated: boolean("member_activated").default(false).notNull(),
  currentLevel: integer("current_level").default(0).notNull(),
  preferredLanguage: text("preferred_language").default("en").notNull(),
  
  // Registration wizard state
  registrationStatus: text("registration_status").default("not_started").notNull(),
  // not_started, profile_saved, ipfs_uploaded, prepared_for_purchase, paid_waiting_verification, completed
  
  // IPFS metadata for wizard
  ipfsAvatarCid: text("ipfs_avatar_cid"),
  ipfsCoverCid: text("ipfs_cover_cid"),
  ipfsProfileJsonCid: text("ipfs_profile_json_cid"),
  
  // Prepared membership data
  preparedLevel: integer("prepared_level"),
  preparedTokenId: integer("prepared_token_id"),
  preparedPrice: integer("prepared_price"), // in USDT cents
  
  // Activation tracking
  activationAt: timestamp("activation_at"),
  
  // Registration countdown tracking
  registeredAt: timestamp("registered_at"),
  registrationExpiresAt: timestamp("registration_expires_at"),
  registrationTimeoutHours: integer("registration_timeout_hours").default(48),
  
  // Connection logging
  lastWalletConnectionAt: timestamp("last_wallet_connection_at"),
  walletConnectionCount: integer("wallet_connection_count").default(0),
  
  // Referral system enhancement
  referralCode: text("referral_code"), // Special codes like "001122"
  isCompanyDirectReferral: boolean("is_company_direct_referral").default(false),
});

// Membership state table
export const membershipState = pgTable("membership_state", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  levelsOwned: jsonb("levels_owned").$type<number[]>().default([]).notNull(),
  activeLevel: integer("active_level").default(0).notNull(),
  joinedAt: timestamp("joined_at"),
  lastUpgradeAt: timestamp("last_upgrade_at"),
});

// Matrix positions table - Each member has their own L M R matrix
export const matrixPositions = pgTable("matrix_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootWallet: varchar("root_wallet", { length: 42 }).references(() => users.walletAddress).notNull(), // Member who owns this matrix
  memberWallet: varchar("member_wallet", { length: 42 }).references(() => users.walletAddress).notNull(), // Member placed in position
  position: text("position").notNull(), // "L", "M", "R"
  layer: integer("layer").default(1).notNull(), // 1-19 layers
  placementType: text("placement_type").notNull(), // "direct" or "spillover"
  placedBy: varchar("placed_by", { length: 42 }).references(() => users.walletAddress).notNull(), // Who placed this member
  isActive: boolean("is_active").default(true).notNull(),
  placedAt: timestamp("placed_at").defaultNow().notNull(),
});

// Referral nodes table - Enhanced for 3x3 matrix system (Legacy support)
export const referralNodes = pgTable("referral_nodes", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  sponsorWallet: varchar("sponsor_wallet", { length: 42 }), // Direct sponsor (upline)
  placerWallet: varchar("placer_wallet", { length: 42 }), // Who placed this member (for spillover)
  matrixPosition: integer("matrix_position").default(0).notNull(), // 0-8 position in 3x3 matrix
  leftLeg: jsonb("left_leg").$type<string[]>().default([]).notNull(), // Left leg positions 0,1,2
  middleLeg: jsonb("middle_leg").$type<string[]>().default([]).notNull(), // Middle leg positions 3,4,5  
  rightLeg: jsonb("right_leg").$type<string[]>().default([]).notNull(), // Right leg positions 6,7,8
  directReferralCount: integer("direct_referral_count").default(0).notNull(),
  totalTeamCount: integer("total_team_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Organization activity feed for referral notifications
export const organizationActivity = pgTable("organization_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationWallet: varchar("organization_wallet", { length: 42 }).notNull(), // Who this activity is for
  activityType: text("activity_type").notNull(), // "direct_referral", "placement", "downline_referral", "spillover"
  actorWallet: varchar("actor_wallet", { length: 42 }).notNull(), // Who performed the action
  actorUsername: text("actor_username"),
  targetWallet: varchar("target_wallet", { length: 42 }), // Who was affected (for placements)
  targetUsername: text("target_username"),
  message: text("message").notNull(), // Human readable message
  metadata: jsonb("metadata").$type<{
    level?: number;
    position?: string;
    amount?: number;
    referralCode?: string;
  }>().default({}).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 19-Layer referral tree tracking for each user
// Matrix layers for each member (as root) - New structure
export const memberMatrixLayers = pgTable("member_matrix_layers", {
  rootWallet: varchar("root_wallet", { length: 42 }).references(() => users.walletAddress).notNull(),
  layer: integer("layer").notNull(), // 1-19
  leftPosition: varchar("left_position", { length: 42 }), // Wallet in L position
  middlePosition: varchar("middle_position", { length: 42 }), // Wallet in M position  
  rightPosition: varchar("right_position", { length: 42 }), // Wallet in R position
  leftPlacementType: text("left_placement_type"), // "direct" or "spillover"
  middlePlacementType: text("middle_placement_type"), // "direct" or "spillover"
  rightPlacementType: text("right_placement_type"), // "direct" or "spillover"
  leftPlacedBy: varchar("left_placed_by", { length: 42 }),
  middlePlacedBy: varchar("middle_placed_by", { length: 42 }),
  rightPlacedBy: varchar("right_placed_by", { length: 42 }),
  totalMembers: integer("total_members").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.rootWallet, table.layer] })
  };
});

export const referralLayers = pgTable("referral_layers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  layerNumber: integer("layer_number").notNull(), // 1-19
  memberCount: integer("member_count").default(0).notNull(),
  members: jsonb("members").$type<string[]>().default([]).notNull(), // Array of wallet addresses in this layer
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  placementTypes: text("placement_types"), // Track placement type information
});

// Matrix layers table - tracks the matrix structure
export const matrixLayers = pgTable("matrix_layers", {
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  layer: integer("layer").notNull(),
  members: jsonb("members").$type<string[]>().default([]),
  memberCount: integer("member_count").default(0),
  maxMembers: integer("max_members"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.walletAddress, table.layer] }),
}));

// Reward notifications with countdown timers
export const rewardNotifications = pgTable("reward_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  triggerWallet: varchar("trigger_wallet", { length: 42 }).notNull(), // Who made the purchase that triggered this
  triggerLevel: integer("trigger_level").notNull(), // Level purchased that triggered the notification
  layerNumber: integer("layer_number").notNull(), // Which layer the trigger came from (1-19)
  rewardAmount: integer("reward_amount").notNull(), // Potential reward amount in USDT cents
  status: text("status").default("pending").notNull(), // pending, claimed, expired
  expiresAt: timestamp("expires_at").notNull(), // 72 hours from creation
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Member NFT verification table
export const memberNFTVerification = pgTable("member_nft_verification", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  nftContractAddress: varchar("nft_contract_address", { length: 42 }).notNull(),
  tokenId: varchar("token_id").notNull(),
  chainId: integer("chain_id").notNull(),
  verificationStatus: text("verification_status").default("pending").notNull(), // 'pending', 'verified', 'failed'
  lastVerified: timestamp("last_verified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// USDT balances table
export const usdtBalances = pgTable("usdt_balances", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  balance: integer("balance").default(0).notNull(), // USDT balance in cents (e.g., $100 = 10000 cents)
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// BCC balances table
export const bccBalances = pgTable("bcc_balances", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  transferable: integer("transferable").default(0).notNull(),
  restricted: integer("restricted").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
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

// Earnings wallet table - tracks all member earnings and rewards
export const earningsWallet = pgTable("earnings_wallet", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  totalEarnings: numeric("total_earnings", { precision: 10, scale: 2 }).default("0").notNull(),
  referralEarnings: numeric("referral_earnings", { precision: 10, scale: 2 }).default("0").notNull(),
  levelEarnings: numeric("level_earnings", { precision: 10, scale: 2 }).default("0").notNull(),
  pendingRewards: numeric("pending_rewards", { precision: 10, scale: 2 }).default("0").notNull(),
  withdrawnAmount: numeric("withdrawn_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  lastRewardAt: timestamp("last_reward_at"),
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
  nftPriceUSDT: integer("nft_price_usdt").notNull(), // NFT price portion in USDT cents (what sponsor gets as reward)
  platformFeeUSDT: integer("platform_fee_usdt").notNull(), // Platform fee in USDT cents
  requiredDirectReferrals: integer("required_direct_referrals").default(1).notNull(),
  maxMatrixCount: integer("max_matrix_count").default(9).notNull(), // 3x3 = 9 max
});

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

// Course access table
export const courseAccess = pgTable("course_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  progress: integer("progress").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  zoomNickname: text("zoom_nickname"), // For online courses, generated nickname + 3 digits
});

// Lesson access table for tracking individual lesson unlocks
export const lessonAccess = pgTable("lesson_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  lessonId: varchar("lesson_id").notNull().references(() => courseLessons.id),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  watchProgress: integer("watch_progress").default(0).notNull(), // Percentage watched
  completed: boolean("completed").default(false).notNull(),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
  email: true,
  username: true,
  secondaryPasswordHash: true,
  ipfsHash: true,
  referrerWallet: true,
  preferredLanguage: true,
  registrationStatus: true,
  ipfsAvatarCid: true,
  ipfsCoverCid: true,
  ipfsProfileJsonCid: true,
  preparedLevel: true,
  preparedTokenId: true,
  preparedPrice: true,
  registeredAt: true,
  registrationExpiresAt: true,
  registrationTimeoutHours: true,
  memberActivated: true,
});

// Registration wizard schemas for step-by-step updates
export const profileStepSchema = createInsertSchema(users).pick({
  walletAddress: true,
  email: true,
  username: true,
  secondaryPasswordHash: true,
  referrerWallet: true,
  preferredLanguage: true,
  registrationStatus: true,
});

export const ipfsStepSchema = createInsertSchema(users).pick({
  walletAddress: true,
  ipfsAvatarCid: true,
  ipfsCoverCid: true,
  ipfsProfileJsonCid: true,
  registrationStatus: true,
});

export const preparationStepSchema = createInsertSchema(users).pick({
  walletAddress: true,
  preparedLevel: true,
  preparedTokenId: true,
  preparedPrice: true,
  registrationStatus: true,
});

export const insertMembershipStateSchema = createInsertSchema(membershipState).pick({
  walletAddress: true,
  levelsOwned: true,
  activeLevel: true,
});

export const insertMatrixPositionSchema = createInsertSchema(matrixPositions).pick({
  rootWallet: true,
  memberWallet: true,
  position: true,
  layer: true,
  placementType: true,
  placedBy: true,
  isActive: true,
});

export const insertMemberMatrixLayerSchema = createInsertSchema(memberMatrixLayers).pick({
  rootWallet: true,
  layer: true,
  leftPosition: true,
  middlePosition: true,
  rightPosition: true,
  leftPlacementType: true,
  middlePlacementType: true,
  rightPlacementType: true,
  leftPlacedBy: true,
  middlePlacedBy: true,
  rightPlacedBy: true,
  totalMembers: true,
});

export const insertReferralNodeSchema = createInsertSchema(referralNodes).pick({
  walletAddress: true,
  sponsorWallet: true,
  placerWallet: true,
  matrixPosition: true,
  leftLeg: true,
  middleLeg: true,
  rightLeg: true,
  directReferralCount: true,
  totalTeamCount: true,
});

export const insertReferralLayerSchema = createInsertSchema(referralLayers).pick({
  walletAddress: true,
  layerNumber: true,
  memberCount: true,
  members: true,
  placementTypes: true,
});

export const insertMatrixLayerSchema = createInsertSchema(matrixLayers).pick({
  walletAddress: true,
  layer: true,
  members: true,
  memberCount: true,
  maxMembers: true,
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

export const insertEarningsWalletSchema = createInsertSchema(earningsWallet).pick({
  walletAddress: true,
  totalEarnings: true,
  referralEarnings: true,
  levelEarnings: true,
  pendingRewards: true,
  withdrawnAmount: true,
  lastRewardAt: true,
});

export const insertLevelConfigSchema = createInsertSchema(levelConfig).pick({
  level: true,
  levelName: true,
  priceUSDT: true,
  nftPriceUSDT: true,
  platformFeeUSDT: true,
  requiredDirectReferrals: true,
  maxMatrixCount: true,
});

export const insertMemberNFTVerificationSchema = createInsertSchema(memberNFTVerification).pick({
  walletAddress: true,
  nftContractAddress: true,
  tokenId: true,
  chainId: true,
  verificationStatus: true,
  lastVerified: true,
});

export const insertUSDTBalanceSchema = createInsertSchema(usdtBalances).pick({
  walletAddress: true,
  balance: true,
});

export const insertBCCBalanceSchema = createInsertSchema(bccBalances).pick({
  walletAddress: true,
  transferable: true,
  restricted: true,
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

export const insertLessonAccessSchema = createInsertSchema(lessonAccess).pick({
  walletAddress: true,
  lessonId: true,
  courseId: true,
  watchProgress: true,
  completed: true,
});

export const insertCourseAccessSchema = createInsertSchema(courseAccess).pick({
  walletAddress: true,
  courseId: true,
  progress: true,
  completed: true,
  zoomNickname: true,
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

// Member activation status table
export const memberActivationStatus = pgTable("member_activation_status", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  isActivated: boolean("is_activated").default(false).notNull(),
  activationLevel: integer("activation_level").default(0).notNull(),
  activatedAt: timestamp("activated_at"),
  pendingUntil: timestamp("pending_until"), // 24-72 hour countdown for upgrades
  upgradeTimerActive: boolean("upgrade_timer_active").default(false).notNull(),
  lastUpgradeAttempt: timestamp("last_upgrade_attempt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// Member levels table
export const memberLevels = pgTable("member_levels", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  currentLevel: integer("current_level").default(0).notNull(),
  maxLevelAchieved: integer("max_level_achieved").default(0).notNull(),
  levelsOwned: jsonb("levels_owned").$type<number[]>().default([]).notNull(),
  nftTokenIds: jsonb("nft_token_ids").$type<number[]>().default([]).notNull(), // Token IDs owned
  totalNFTsOwned: integer("total_nfts_owned").default(0).notNull(),
  firstActivationAt: timestamp("first_activation_at"),
  lastLevelUpgradeAt: timestamp("last_level_upgrade_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMembershipState = z.infer<typeof insertMembershipStateSchema>;
export type MembershipState = typeof membershipState.$inferSelect;

export type InsertMatrixPosition = z.infer<typeof insertMatrixPositionSchema>;
export type MatrixPosition = typeof matrixPositions.$inferSelect;

export type InsertMemberMatrixLayer = z.infer<typeof insertMemberMatrixLayerSchema>;
export type MemberMatrixLayer = typeof memberMatrixLayers.$inferSelect;

export type InsertReferralNode = z.infer<typeof insertReferralNodeSchema>;
export type ReferralNode = typeof referralNodes.$inferSelect;

export type InsertReferralLayer = z.infer<typeof insertReferralLayerSchema>;
export type ReferralLayer = typeof referralLayers.$inferSelect;

export type InsertMatrixLayer = z.infer<typeof insertMatrixLayerSchema>;
export type MatrixLayer = typeof matrixLayers.$inferSelect;

export type InsertRewardNotification = z.infer<typeof insertRewardNotificationSchema>;
export type RewardNotification = typeof rewardNotifications.$inferSelect;

// User inbox notifications for BCC, upgrades, and other activities
export const userNotifications = pgTable("user_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(), // 'bcc_reward', 'level_upgrade', 'referral_joined', 'matrix_placement', 'earnings'
  relatedWallet: varchar("related_wallet", { length: 42 }), // wallet of person who triggered the notification
  amount: varchar("amount"), // BCC amount, earnings amount, etc.
  metadata: jsonb("metadata"), // additional data like level, layer, etc.
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserNotificationSchema = createInsertSchema(userNotifications).pick({
  walletAddress: true,
  title: true,
  message: true,
  type: true,
  relatedWallet: true,
  amount: true,
  metadata: true,
  isRead: true,
});

export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;
export type UserNotification = typeof userNotifications.$inferSelect;

export type InsertUSDTBalance = z.infer<typeof insertUSDTBalanceSchema>;
export type USDTBalance = typeof usdtBalances.$inferSelect;

export type InsertBCCBalance = z.infer<typeof insertBCCBalanceSchema>;
export type BCCBalance = typeof bccBalances.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertEarningsWallet = z.infer<typeof insertEarningsWalletSchema>;
export type EarningsWallet = typeof earningsWallet.$inferSelect;

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

export type InsertLessonAccess = z.infer<typeof insertLessonAccessSchema>;
export type LessonAccess = typeof lessonAccess.$inferSelect;

export type InsertCourseAccess = z.infer<typeof insertCourseAccessSchema>;
export type CourseAccess = typeof courseAccess.$inferSelect;

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

export type InsertAdvertisementNFT = z.infer<typeof insertAdvertisementNFTSchema>;
export type AdvertisementNFT = typeof advertisementNFTs.$inferSelect;

export type InsertAdvertisementNFTClaim = z.infer<typeof insertAdvertisementNFTClaimSchema>;
export type AdvertisementNFTClaim = typeof advertisementNFTClaims.$inferSelect;

// New table insert schemas
export const insertMemberActivationStatusSchema = createInsertSchema(memberActivationStatus).pick({
  walletAddress: true,
  isActivated: true,
  activationLevel: true,
  pendingUntil: true,
  upgradeTimerActive: true,
});

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

export const insertMemberLevelSchema = createInsertSchema(memberLevels).pick({
  walletAddress: true,
  currentLevel: true,
  maxLevelAchieved: true,
  levelsOwned: true,
  nftTokenIds: true,
  totalNFTsOwned: true,
});

// New types
export type InsertMemberActivationStatus = z.infer<typeof insertMemberActivationStatusSchema>;
export type MemberActivationStatus = typeof memberActivationStatus.$inferSelect;

export type InsertNFTClaimRecord = z.infer<typeof insertNFTClaimRecordSchema>;
export type NFTClaimRecord = typeof nftClaimRecords.$inferSelect;

export type InsertMemberLevel = z.infer<typeof insertMemberLevelSchema>;
export type MemberLevel = typeof memberLevels.$inferSelect;

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
  status: text("status").default("pending").notNull(), // 'pending', 'claimable', 'claimed', 'expired'
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

// Global Matrix Position Table - Single company-wide matrix structure
export const globalMatrixPosition = pgTable("global_matrix_position", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  sponsorWallet: varchar("sponsor_wallet", { length: 42 }), // Original sponsor (production column)
  directSponsorWallet: varchar("direct_sponsor_wallet", { length: 42 }).notNull(), // Who invited them (gets direct rewards)
  matrixLevel: integer("matrix_level").notNull(), // 1-19 (Level 1=3 positions, Level 2=9, Level 3=27, etc.)
  positionIndex: integer("position_index").notNull(), // 1, 2, 3 for L, M, R respectively
  matrixPosition: varchar("matrix_position", { length: 1 }).notNull(), // 'L', 'M', 'R' - Left, Middle, Right in 1×3 matrix
  placementSponsorWallet: varchar("placement_sponsor_wallet", { length: 42 }).notNull(), // Where they were placed in matrix
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastUpgradeAt: timestamp("last_upgrade_at"),
});

export const insertGlobalMatrixPositionSchema = createInsertSchema(globalMatrixPosition).pick({
  walletAddress: true,
  sponsorWallet: true,
  directSponsorWallet: true,
  matrixLevel: true,
  positionIndex: true,
  matrixPosition: true,
  placementSponsorWallet: true,
});


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

export type InsertGlobalMatrixPosition = z.infer<typeof insertGlobalMatrixPositionSchema>;
export type GlobalMatrixPosition = typeof globalMatrixPosition.$inferSelect;


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
