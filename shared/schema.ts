import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User profiles table
export const users = pgTable("users", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey(),
  email: text("email").notNull(),
  username: text("username").notNull().unique(),
  secondaryPasswordHash: text("secondary_password_hash").notNull(),
  ipfsHash: text("ipfs_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  referrerWallet: varchar("referrer_wallet", { length: 42 }),
  memberActivated: boolean("member_activated").default(false).notNull(),
  currentLevel: integer("current_level").default(0).notNull(),
  preferredLanguage: text("preferred_language").default("en").notNull(),
});

// Membership state table
export const membershipState = pgTable("membership_state", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  levelsOwned: jsonb("levels_owned").$type<number[]>().default([]).notNull(),
  activeLevel: integer("active_level").default(0).notNull(),
  joinedAt: timestamp("joined_at"),
  lastUpgradeAt: timestamp("last_upgrade_at"),
});

// Referral nodes table
export const referralNodes = pgTable("referral_nodes", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().references(() => users.walletAddress),
  parentWallet: varchar("parent_wallet", { length: 42 }),
  children: jsonb("children").$type<string[]>().default([]).notNull(),
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
  amountUSDT: integer("amount_usdt").notNull(),
  chain: text("chain").notNull(),
  txHash: text("tx_hash"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Reward events table
export const rewardEvents = pgTable("reward_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerWallet: varchar("buyer_wallet", { length: 42 }).notNull(),
  sponsorWallet: varchar("sponsor_wallet", { length: 42 }).notNull(),
  eventType: text("event_type").notNull(), // 'L1_direct', 'L2plus_upgrade', 'rollup'
  level: integer("level").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'completed', 'expired'
  timerStartAt: timestamp("timer_start_at"),
  timerExpireAt: timestamp("timer_expire_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
  email: true,
  username: true,
  secondaryPasswordHash: true,
  ipfsHash: true,
  referrerWallet: true,
  preferredLanguage: true,
});

export const insertMembershipStateSchema = createInsertSchema(membershipState).pick({
  walletAddress: true,
  levelsOwned: true,
  activeLevel: true,
});

export const insertReferralNodeSchema = createInsertSchema(referralNodes).pick({
  walletAddress: true,
  parentWallet: true,
  children: true,
});

export const insertBCCBalanceSchema = createInsertSchema(bccBalances).pick({
  walletAddress: true,
  transferable: true,
  restricted: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  walletAddress: true,
  level: true,
  amountUSDT: true,
  chain: true,
  txHash: true,
  status: true,
});

export const insertRewardEventSchema = createInsertSchema(rewardEvents).pick({
  buyerWallet: true,
  sponsorWallet: true,
  eventType: true,
  level: true,
  amount: true,
  status: true,
  timerStartAt: true,
  timerExpireAt: true,
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

export type InsertRewardEvent = z.infer<typeof insertRewardEventSchema>;
export type RewardEvent = typeof rewardEvents.$inferSelect;

export type InsertMerchantNFT = z.infer<typeof insertMerchantNFTSchema>;
export type MerchantNFT = typeof merchantNFTs.$inferSelect;

export type InsertNFTPurchase = z.infer<typeof insertNFTPurchaseSchema>;
export type NFTPurchase = typeof nftPurchases.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

export type InsertCourseAccess = z.infer<typeof insertCourseAccessSchema>;
export type CourseAccess = typeof courseAccess.$inferSelect;

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
