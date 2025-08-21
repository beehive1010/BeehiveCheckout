import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
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
});

// Membership state table
export const membershipState = pgTable("membership_state", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  levelsOwned: jsonb("levels_owned").$type<number[]>().default([]).notNull(),
  activeLevel: integer("active_level").default(0).notNull(),
  joinedAt: timestamp("joined_at"),
  lastUpgradeAt: timestamp("last_upgrade_at"),
});

// Referral nodes table - Enhanced for 3x3 matrix system
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  rewardType: text("reward_type").notNull(), // 'instant_referral', 'level_reward', 'passup_reward'
  amount: integer("amount").notNull(), // Amount in USDT cents
  sourceWallet: varchar("source_wallet", { length: 42 }).notNull(), // Who triggered this reward
  fromLevel: integer("from_level").notNull(), // Level that triggered reward
  status: text("status").default("pending").notNull(), // 'pending', 'paid', 'expired'
  
  // Timer tracking for 72-hour countdown rewards
  timerStartAt: timestamp("timer_start_at"),
  timerExpireAt: timestamp("timer_expire_at"),
  
  // Pass-up tracking
  passedUpFrom: varchar("passed_up_from", { length: 42 }), // Original recipient who passed it up
  passUpReason: text("pass_up_reason"), // 'under_leveled', 'max_count_reached'
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Level progression configuration (19 levels from Warrior to Mythic Peak)
export const levelConfig = pgTable("level_config", {
  level: integer("level").primaryKey(),
  levelName: text("level_name").notNull(),
  priceUSDT: integer("price_usdt").notNull(), // Price in USDT cents
  rewardAmount: integer("reward_amount").notNull(), // Reward amount in USDT cents
  adminFee: integer("admin_fee").notNull(), // Admin fee in USDT cents
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

// Course access table
export const courseAccess = pgTable("course_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => users.walletAddress),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  progress: integer("progress").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
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

export const insertEarningsWalletSchema = createInsertSchema(earningsWallet).pick({
  walletAddress: true,
  rewardType: true,
  amount: true,
  sourceWallet: true,
  fromLevel: true,
  status: true,
  timerStartAt: true,
  timerExpireAt: true,
  passedUpFrom: true,
  passUpReason: true,
});

export const insertLevelConfigSchema = createInsertSchema(levelConfig).pick({
  level: true,
  levelName: true,
  priceUSDT: true,
  rewardAmount: true,
  adminFee: true,
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

export const insertCourseAccessSchema = createInsertSchema(courseAccess).pick({
  walletAddress: true,
  courseId: true,
  progress: true,
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMembershipState = z.infer<typeof insertMembershipStateSchema>;
export type MembershipState = typeof membershipState.$inferSelect;

export type InsertReferralNode = z.infer<typeof insertReferralNodeSchema>;
export type ReferralNode = typeof referralNodes.$inferSelect;

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

export type InsertCourseAccess = z.infer<typeof insertCourseAccessSchema>;
export type CourseAccess = typeof courseAccess.$inferSelect;

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

export type InsertAdvertisementNFT = z.infer<typeof insertAdvertisementNFTSchema>;
export type AdvertisementNFT = typeof advertisementNFTs.$inferSelect;

export type InsertAdvertisementNFTClaim = z.infer<typeof insertAdvertisementNFTClaimSchema>;
export type AdvertisementNFTClaim = typeof advertisementNFTClaims.$inferSelect;

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
