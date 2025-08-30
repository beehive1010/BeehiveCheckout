import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  primaryKey,
} from "drizzle-orm/pg-core";
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
  registrationStatus: text("registration_status")
    .default("not_started")
    .notNull(),
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

// V1 DEPRECATED - Use membership_nfts_v2 instead
// membershipState table kept for backward compatibility only

// V1 DEPRECATED - Use matrix_tree_v2 instead
// referralNodes table kept for backward compatibility only

// V1 DEPRECATED - Use matrix_tree_v2 with layer tracking instead
// referralLayers table kept for backward compatibility only

// V1 DEPRECATED - Use matrix_tree_v2 instead
// matrixLayers table kept for backward compatibility only

// V1 DEPRECATED - Use layer_rewards_v2 instead
// rewardNotifications table kept for backward compatibility only

// Member NFT verification table
export const memberNFTVerification = pgTable("member_nft_verification", {
  walletAddress: varchar("wallet_address", { length: 42 })
    .primaryKey()
    .references(() => users.walletAddress),
  nftContractAddress: varchar("nft_contract_address", { length: 42 }).notNull(),
  tokenId: varchar("token_id").notNull(),
  chainId: integer("chain_id").notNull(),
  verificationStatus: text("verification_status").default("pending").notNull(), // 'pending', 'verified', 'failed'
  lastVerified: timestamp("last_verified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// BCC balances table
export const bccBalances = pgTable("bcc_balances", {
  walletAddress: varchar("wallet_address", { length: 42 })
    .primaryKey()
    .references(() => users.walletAddress),
  transferable: integer("transferable").default(0).notNull(),
  restricted: integer("restricted").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Orders table for membership purchases
export const orders = pgTable("orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 })
    .notNull()
    .references(() => users.walletAddress),
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
  walletAddress: varchar("wallet_address", { length: 42 })
    .primaryKey()
    .references(() => users.walletAddress),
  totalEarnings: numeric("total_earnings", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  referralEarnings: numeric("referral_earnings", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  levelEarnings: numeric("level_earnings", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  pendingRewards: numeric("pending_rewards", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  withdrawnAmount: numeric("withdrawn_amount", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  lastRewardAt: timestamp("last_reward_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User activity logs table
export const userActivities = pgTable("user_activities", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 })
    .notNull()
    .references(() => users.walletAddress),
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
  requiredDirectReferrals: integer("required_direct_referrals")
    .default(1)
    .notNull(),
  maxMatrixCount: integer("max_matrix_count").default(9).notNull(), // 3x3 = 9 max
});

// Merchant NFTs table
export const merchantNFTs = pgTable("merchant_nfts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  priceBCC: integer("price_bcc").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// NFT purchases table
export const nftPurchases = pgTable("nft_purchases", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 })
    .notNull()
    .references(() => users.walletAddress),
  nftId: varchar("nft_id")
    .notNull()
    .references(() => merchantNFTs.id),
  amountBCC: integer("amount_bcc").notNull(),
  bucketUsed: text("bucket_used").notNull(), // 'restricted' or 'transferable'
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Education courses table
export const courses = pgTable("courses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  courseId: varchar("course_id")
    .notNull()
    .references(() => courses.id),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 })
    .notNull()
    .references(() => users.walletAddress),
  courseId: varchar("course_id")
    .notNull()
    .references(() => courses.id),
  progress: integer("progress").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  zoomNickname: text("zoom_nickname"), // For online courses, generated nickname + 3 digits
});

// Lesson access table for tracking individual lesson unlocks
export const lessonAccess = pgTable("lesson_access", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 })
    .notNull()
    .references(() => users.walletAddress),
  lessonId: varchar("lesson_id")
    .notNull()
    .references(() => courseLessons.id),
  courseId: varchar("course_id")
    .notNull()
    .references(() => courses.id),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  watchProgress: integer("watch_progress").default(0).notNull(), // Percentage watched
  completed: boolean("completed").default(false).notNull(),
});

// Blog posts table for Hiveworld
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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

// V1 DEPRECATED - insertMembershipStateSchema

// V1 DEPRECATED - insertReferralNodeSchema

// V1 DEPRECATED - insertReferralLayerSchema

// V1 DEPRECATED - insertMatrixLayerSchema

// V1 DEPRECATED - insertRewardNotificationSchema

export const insertEarningsWalletSchema = createInsertSchema(
  earningsWallet,
).pick({
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

export const insertMemberNFTVerificationSchema = createInsertSchema(
  memberNFTVerification,
).pick({
  walletAddress: true,
  nftContractAddress: true,
  tokenId: true,
  chainId: true,
  verificationStatus: true,
  lastVerified: true,
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 })
    .notNull()
    .references(() => users.walletAddress),
  nftId: varchar("nft_id")
    .notNull()
    .references(() => advertisementNFTs.id),
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

export const insertAdvertisementNFTSchema = createInsertSchema(
  advertisementNFTs,
).pick({
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

export const insertAdvertisementNFTClaimSchema = createInsertSchema(
  advertisementNFTClaims,
).pick({
  walletAddress: true,
  nftId: true,
  bccAmountLocked: true,
  bucketUsed: true,
  activeCode: true,
  status: true,
});

// V1 DEPRECATED - Use membership_nfts_v2 with status field instead
// memberActivationStatus table kept for backward compatibility only

// NFT claim records table
export const nftClaimRecords = pgTable("nft_claim_records", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 })
    .notNull()
    .references(() => users.walletAddress),
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

// V1 DEPRECATED - Use membership_nfts_v2 to track levels
// memberLevels table kept for backward compatibility only

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// V1 DEPRECATED - MembershipState types

// V1 DEPRECATED - ReferralNode types

// V1 DEPRECATED - ReferralLayer types

// V1 DEPRECATED - MatrixLayer types

// V1 DEPRECATED - RewardNotification types

// User inbox notifications for BCC, upgrades, and other activities
export const userNotifications = pgTable("user_notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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

export const insertUserNotificationSchema = createInsertSchema(
  userNotifications,
).pick({
  walletAddress: true,
  title: true,
  message: true,
  type: true,
  relatedWallet: true,
  amount: true,
  metadata: true,
  isRead: true,
});

export type InsertUserNotification = z.infer<
  typeof insertUserNotificationSchema
>;
export type UserNotification = typeof userNotifications.$inferSelect;

export type InsertBCCBalance = z.infer<typeof insertBCCBalanceSchema>;
export type BCCBalance = typeof bccBalances.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertEarningsWallet = z.infer<typeof insertEarningsWalletSchema>;
export type EarningsWallet = typeof earningsWallet.$inferSelect;

export type InsertLevelConfig = z.infer<typeof insertLevelConfigSchema>;
export type LevelConfig = typeof levelConfig.$inferSelect;

export type InsertMemberNFTVerification = z.infer<
  typeof insertMemberNFTVerificationSchema
>;
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

export type InsertAdvertisementNFT = z.infer<
  typeof insertAdvertisementNFTSchema
>;
export type AdvertisementNFT = typeof advertisementNFTs.$inferSelect;

export type InsertAdvertisementNFTClaim = z.infer<
  typeof insertAdvertisementNFTClaimSchema
>;
export type AdvertisementNFTClaim = typeof advertisementNFTClaims.$inferSelect;

// New table insert schemas
// V1 DEPRECATED - insertMemberActivationStatusSchema

export const insertNFTClaimRecordSchema = createInsertSchema(
  nftClaimRecords,
).pick({
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

// V1 DEPRECATED - insertMemberLevelSchema

// New types
// V1 DEPRECATED - MemberActivationStatus types

export type InsertNFTClaimRecord = z.infer<typeof insertNFTClaimRecordSchema>;
export type NFTClaimRecord = typeof nftClaimRecords.$inferSelect;

// V1 DEPRECATED - MemberLevel types

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

export type InsertAdminSession = z.infer<typeof insertAdminSessionSchema>;
export type AdminSession = typeof adminSessions.$inferSelect;

// Bridge Payment Tracking Table
export const bridgePayments = pgTable("bridge_payments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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

export const insertBridgePaymentSchema = createInsertSchema(
  bridgePayments,
).pick({
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 })
    .notNull()
    .references(() => users.walletAddress),
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
  walletAddress: varchar("wallet_address", { length: 42 })
    .primaryKey()
    .references(() => users.walletAddress),
  balance: integer("balance").default(0).notNull(), // CTH balance in smallest unit
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertTokenPurchaseSchema = createInsertSchema(
  tokenPurchases,
).pick({
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

// V1 DEPRECATED - Use membership_nfts_v2 with status and activated_at fields
// memberActivations table kept for backward compatibility only

// V1 DEPRECATED - Use layer_rewards_v2 instead
// rewardDistributions table kept for backward compatibility only

// Admin Settings for controlling pending times
export const adminSettings = pgTable("admin_settings", {
  settingKey: text("setting_key").primaryKey(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// V1 DEPRECATED - insertMemberActivationSchema

// V1 DEPRECATED - insertRewardDistributionSchema

export const insertAdminSettingSchema = createInsertSchema(adminSettings).pick({
  settingKey: true,
  settingValue: true,
  description: true,
});

// V1 DEPRECATED - MemberActivation types

// V1 DEPRECATED - RewardDistribution types

export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;
export type AdminSetting = typeof adminSettings.$inferSelect;

// Admin Panel Tables

// Admin users table for admin panel authentication
export const adminUsers = pgTable("admin_users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id")
    .notNull()
    .references(() => adminUsers.id),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  bannerImageUrl: text("banner_image_url").notNull(), // IPFS URL
  linkUrl: text("link_url").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("draft"), // draft, scheduled, active, expired, paused
  position: text("position").notNull().default("top"), // top, sidebar, bottom
  priority: integer("priority").default(0).notNull(),
  createdBy: varchar("created_by")
    .notNull()
    .references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Partner chains management
export const partnerChains = pgTable("partner_chains", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  serviceNftType: text("service_nft_type").notNull(), // "discover_listing", etc.
  generatedFromWallet: varchar("generated_from_wallet", {
    length: 42,
  }).notNull(),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id")
    .notNull()
    .references(() => adminUsers.id),
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
export const insertUserActivitySchema = createInsertSchema(userActivities).pick(
  {
    walletAddress: true,
    activityType: true,
    title: true,
    description: true,
    amount: true,
    amountType: true,
    relatedWallet: true,
    relatedLevel: true,
    metadata: true,
  },
);

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

export const insertDiscoverPartnerSchema = createInsertSchema(
  discoverPartners,
).pick({
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

// V1 DEPRECATED - Use global_matrix_positions_v2 instead
// globalMatrixPosition table kept for backward compatibility only

// V1 DEPRECATED - insertGlobalMatrixPositionSchema

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

// V1 DEPRECATED - GlobalMatrixPosition types

// Wallet connection logs table for verification tracking
export const walletConnectionLogs = pgTable("wallet_connection_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
export const insertWalletConnectionLogSchema = createInsertSchema(
  walletConnectionLogs,
).omit({
  id: true,
  createdAt: true,
});

export type InsertWalletConnectionLog = z.infer<
  typeof insertWalletConnectionLogSchema
>;
export type WalletConnectionLog = typeof walletConnectionLogs.$inferSelect;

// =============================================================================
// V2 MATRIX MEMBERSHIP & REWARD SYSTEM TABLES
// Based on 1×3 Matrix Structure with Layer-Based Rewards
// =============================================================================

// V2: Global Matrix Positions - 1×3 Structure (Left, Middle, Right)
export const globalMatrixPositionsV2 = pgTable("global_matrix_positions_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  globalPosition: integer("global_position").notNull(), // Global position in entire matrix (0-based)
  layer: integer("layer").notNull(), // Which layer they're in (1-19)
  positionInLayer: integer("position_in_layer").notNull(), // Position within their layer (0, 1, 2 = Left, Middle, Right)
  parentWallet: varchar("parent_wallet", { length: 42 }), // Direct parent in matrix tree
  rootWallet: varchar("root_wallet", { length: 42 }).notNull(), // Root of their tree (for reward tracking)
  directSponsorWallet: varchar("direct_sponsor_wallet", { length: 42 }).notNull(), // Who referred them
  placementSponsorWallet: varchar("placement_sponsor_wallet", { length: 42 }).notNull(), // Who placed them (spillover)
  activatedAt: timestamp("activated_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
});

// V2: NFT Membership Levels - Individual NFT Ownership (1-19)
export const membershipNFTsV2 = pgTable("membership_nfts_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  level: integer("level").notNull(), // 1-19
  levelName: text("level_name").notNull(), // Warrior, Guardian, etc.
  pricePaidUSDT: integer("price_paid_usdt").notNull(), // Price paid in USDT cents
  nftTokenId: integer("nft_token_id"), // NFT token ID if minted
  contractAddress: varchar("contract_address", { length: 42 }), // NFT contract address
  txHash: text("tx_hash"), // Purchase transaction hash
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"), // When member was activated into matrix
  status: text("status").default("active").notNull(), // active, pending, expired
});

// V2: Matrix Tree Structure - Each member's 19-layer downline tree
export const matrixTreeV2 = pgTable("matrix_tree_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootWallet: varchar("root_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  layer: integer("layer").notNull(), // 1-19
  memberWallet: varchar("member_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  position: integer("position").notNull(), // Position in layer: 0, 1, 2 (Left, Middle, Right for Layer 1)
  parentWallet: varchar("parent_wallet", { length: 42 }), // Direct parent in this tree
  joinedTreeAt: timestamp("joined_tree_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// V2: Layer-Based Rewards - Rewards triggered by layer position upgrades
export const layerRewardsV2 = pgTable("layer_rewards_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootWallet: varchar("root_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // Who receives reward
  triggerWallet: varchar("trigger_wallet", { length: 42 }).notNull().references(() => users.walletAddress), // Who triggered reward
  triggerLevel: integer("trigger_level").notNull(), // Level purchased that triggered reward (1-19)
  triggerLayer: integer("trigger_layer").notNull(), // Layer position of trigger member (1-19)
  triggerPosition: integer("trigger_position").notNull(), // Position in layer (0=Left, 1=Middle, 2=Right)
  rewardAmountUSDT: integer("reward_amount_usdt").notNull(), // Reward amount in USDT cents (100% of NFT price)
  requiredLevel: integer("required_level").notNull(), // Level root must own to qualify
  qualified: boolean("qualified").notNull(), // Whether root qualified at time of trigger
  status: text("status").default("pending").notNull(), // pending, confirmed, expired, reallocated
  specialRule: text("special_rule"), // "layer_1_right_needs_level_2" or null
  createdAt: timestamp("created_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
  expiredAt: timestamp("expired_at"),
});

// V2: Pending Rewards - 72h timeout and reallocation system
export const pendingRewardsV2 = pgTable("pending_rewards_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalRewardId: varchar("original_reward_id").notNull().references(() => layerRewardsV2.id),
  currentRecipientWallet: varchar("current_recipient_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  originalRecipientWallet: varchar("original_recipient_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  rewardAmountUSDT: integer("reward_amount_usdt").notNull(),
  requiredLevel: integer("required_level").notNull(),
  timeoutHours: integer("timeout_hours").default(72).notNull(), // Configurable timeout
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").default("pending").notNull(), // pending, claimed, expired, reallocated
  reallocationAttempts: integer("reallocation_attempts").default(0).notNull(),
  claimedAt: timestamp("claimed_at"),
  reallocatedAt: timestamp("reallocated_at"),
  reallocatedToWallet: varchar("reallocated_to_wallet", { length: 42 }),
});

// V2: Platform Revenue - Level 1 +30 USDT fees and admin configurable fees
export const platformRevenueV2 = pgTable("platform_revenue_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  triggerWallet: varchar("trigger_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  triggerLevel: integer("trigger_level").notNull(), // Level purchased
  revenueAmountUSDT: integer("revenue_amount_usdt").notNull(), // Platform fee in USDT cents
  revenueType: text("revenue_type").notNull(), // "level_1_fixed_fee", "admin_configurable_fee"
  nftPriceUSDT: integer("nft_price_usdt").notNull(), // Original NFT price for reference
  txHash: text("tx_hash"), // Purchase transaction hash
  createdAt: timestamp("created_at").defaultNow().notNull(),
  collectedAt: timestamp("collected_at"),
  status: text("status").default("pending").notNull(), // pending, collected
});

// V2: Reward Distribution Records - Track all reward distributions
export const rewardDistributionsV2 = pgTable("reward_distributions_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull().references(() => users.walletAddress),
  rewardType: text("reward_type").notNull(), // "layer_reward", "direct_referral", "spillover"
  amountUSDT: integer("amount_usdt").notNull(),
  sourceRewardId: varchar("source_reward_id"), // References layerRewardsV2.id if applicable
  triggerWallet: varchar("trigger_wallet", { length: 42 }).notNull(),
  triggerLevel: integer("trigger_level").notNull(),
  triggerLayer: integer("trigger_layer"), // For layer rewards
  distributionMethod: text("distribution_method").notNull(), // "direct", "reallocation", "spillover"
  txHash: text("tx_hash"), // Distribution transaction hash
  status: text("status").default("pending").notNull(), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
});

// Insert schemas for V2 tables
export const insertGlobalMatrixPositionV2Schema = createInsertSchema(globalMatrixPositionsV2).omit({
  id: true,
  activatedAt: true,
  lastActiveAt: true,
});

export const insertMembershipNFTV2Schema = createInsertSchema(membershipNFTsV2).omit({
  id: true,
  purchasedAt: true,
});

export const insertMatrixTreeV2Schema = createInsertSchema(matrixTreeV2).omit({
  id: true,
  joinedTreeAt: true,
  lastUpdated: true,
});

export const insertLayerRewardV2Schema = createInsertSchema(layerRewardsV2).omit({
  id: true,
  createdAt: true,
});

export const insertPendingRewardV2Schema = createInsertSchema(pendingRewardsV2).omit({
  id: true,
  createdAt: true,
});

export const insertPlatformRevenueV2Schema = createInsertSchema(platformRevenueV2).omit({
  id: true,
  createdAt: true,
});

export const insertRewardDistributionV2Schema = createInsertSchema(rewardDistributionsV2).omit({
  id: true,
  createdAt: true,
});

// V2 Types
export type InsertGlobalMatrixPositionV2 = z.infer<typeof insertGlobalMatrixPositionV2Schema>;
export type GlobalMatrixPositionV2 = typeof globalMatrixPositionsV2.$inferSelect;

export type InsertMembershipNFTV2 = z.infer<typeof insertMembershipNFTV2Schema>;
export type MembershipNFTV2 = typeof membershipNFTsV2.$inferSelect;

export type InsertMatrixTreeV2 = z.infer<typeof insertMatrixTreeV2Schema>;
export type MatrixTreeV2 = typeof matrixTreeV2.$inferSelect;

export type InsertLayerRewardV2 = z.infer<typeof insertLayerRewardV2Schema>;
export type LayerRewardV2 = typeof layerRewardsV2.$inferSelect;

export type InsertPendingRewardV2 = z.infer<typeof insertPendingRewardV2Schema>;
export type PendingRewardV2 = typeof pendingRewardsV2.$inferSelect;

export type InsertPlatformRevenueV2 = z.infer<typeof insertPlatformRevenueV2Schema>;
export type PlatformRevenueV2 = typeof platformRevenueV2.$inferSelect;

export type InsertRewardDistributionV2 = z.infer<typeof insertRewardDistributionV2Schema>;
export type RewardDistributionV2 = typeof rewardDistributionsV2.$inferSelect;

// =============================================================================
// END V2 MATRIX MEMBERSHIP & REWARD SYSTEM TABLES
// =============================================================================

export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type UserActivity = typeof userActivities.$inferSelect;
