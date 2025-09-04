import { pgTable, foreignKey, unique, pgPolicy, varchar, text, timestamp, integer, boolean, jsonb, index, numeric, pgView, bigint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const activityTypeEnum = pgEnum("activity_type_enum", ['reward', 'purchase', 'merchant_nft_claim', 'token_purchase', 'membership', 'referral_joined', 'matrix_placement', 'course_activation', 'nft_verification'])
export const amountTypeEnum = pgEnum("amount_type_enum", ['USDT', 'BCC', 'ETH', 'MATIC'])
export const bccUnlockTypeEnum = pgEnum("bcc_unlock_type_enum", ['activation', 'upgrade', 'referral', 'bonus', 'course_completion', 'nft_claim', 'admin_grant'])
export const courseStatusEnum = pgEnum("course_status_enum", ['not_started', 'in_progress', 'completed', 'expired'])
export const languageEnum = pgEnum("language_enum", ['en', 'zh', 'th', 'my', 'ko', 'ja'])
export const matrixPositionEnum = pgEnum("matrix_position_enum", ['L', 'M', 'R'])
export const memberLevelEnum = pgEnum("member_level_enum", ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'])
export const nftStatusEnum = pgEnum("nft_status_enum", ['pending', 'verified', 'claimed', 'rejected'])
export const notificationPriorityEnum = pgEnum("notification_priority_enum", ['low', 'normal', 'high', 'urgent'])
export const notificationTypeEnum = pgEnum("notification_type_enum", ['member_activated', 'level_upgraded', 'upgrade_reminder', 'reward_received', 'referral_joined', 'matrix_placement', 'countdown_warning', 'system_announcement', 'course_unlocked', 'nft_available', 'withdrawal_processed', 'payment_confirmed'])
export const placementTypeEnum = pgEnum("placement_type_enum", ['direct', 'spillover'])
export const registrationStatusEnum = pgEnum("registration_status_enum", ['pending', 'verified', 'activated', 'expired'])
export const rewardStatusEnum = pgEnum("reward_status_enum", ['pending', 'claimable', 'claimed', 'expired', 'rollup', 'confirmed', 'paid'])
export const serviceStatusEnum = pgEnum("service_status_enum", ['online', 'offline', 'maintenance', 'degraded'])
export const transactionStatusEnum = pgEnum("transaction_status_enum", ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'])
export const walletConnectionTypeEnum = pgEnum("wallet_connection_type_enum", ['connect', 'verify', 'register', 'disconnect'])


export const adminSessions = pgTable("admin_sessions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	adminId: varchar("admin_id").notNull(),
	sessionToken: text("session_token").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [adminUsers.id],
			name: "admin_sessions_admin_id_admin_users_id_fk"
		}),
	unique("admin_sessions_session_token_unique").on(table.sessionToken),
	pgPolicy("admin_sessions_self_only", { as: "permissive", for: "all", to: ["public"], using: sql`((admin_id)::text = current_setting('app.current_admin_id'::text, true))` }),
]);

export const advertisementNftClaims = pgTable("advertisement_nft_claims", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	nftId: varchar("nft_id").notNull(),
	bccAmountLocked: integer("bcc_amount_locked").notNull(),
	bucketUsed: text("bucket_used").notNull(),
	activeCode: text("active_code").notNull(),
	status: text().default('claimed').notNull(),
	claimedAt: timestamp("claimed_at", { mode: 'string' }).defaultNow().notNull(),
	burnedAt: timestamp("burned_at", { mode: 'string' }),
	codeUsedAt: timestamp("code_used_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.walletAddress],
			foreignColumns: [users.walletAddress],
			name: "advertisement_nft_claims_wallet_address_users_wallet_address_fk"
		}),
	foreignKey({
			columns: [table.nftId],
			foreignColumns: [advertisementNfts.id],
			name: "advertisement_nft_claims_nft_id_advertisement_nfts_id_fk"
		}),
]);

export const adminSettings = pgTable("admin_settings", {
	settingKey: text("setting_key").primaryKey().notNull(),
	settingValue: text("setting_value").notNull(),
	description: text(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const advertisementNfts = pgTable("advertisement_nfts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	imageUrl: text("image_url").notNull(),
	serviceName: text("service_name").notNull(),
	serviceType: text("service_type").notNull(),
	websiteUrl: text("website_url"),
	priceBcc: integer("price_bcc").notNull(),
	codeTemplate: text("code_template").notNull(),
	active: boolean().default(true).notNull(),
	totalSupply: integer("total_supply").default(1000).notNull(),
	claimedCount: integer("claimed_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const adminUsers = pgTable("admin_users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	username: text().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	role: text().default('viewer').notNull(),
	permissions: text().array().default([""]),
	status: text().default('active').notNull(),
	fullName: text("full_name"),
	notes: text(),
	createdBy: text("created_by"),
	twoFactorSecret: text("two_factor_secret"),
	twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
	active: boolean().default(true).notNull(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("admin_users_username_unique").on(table.username),
	unique("admin_users_email_unique").on(table.email),
	pgPolicy("admin_users_super_admin_only", { as: "permissive", for: "all", to: ["public"], using: sql`((current_setting('app.is_super_admin'::text, true))::boolean = true)` }),
]);

export const auditLogs = pgTable("audit_logs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	adminId: varchar("admin_id").notNull(),
	action: text().notNull(),
	module: text().notNull(),
	targetId: text("target_id"),
	targetType: text("target_type"),
	oldValues: jsonb("old_values"),
	newValues: jsonb("new_values"),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	severity: text().default('info').notNull(),
	description: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [adminUsers.id],
			name: "audit_logs_admin_id_admin_users_id_fk"
		}),
	pgPolicy("audit_logs_admin_read_only", { as: "permissive", for: "select", to: ["public"], using: sql`((current_setting('app.is_admin'::text, true))::boolean = true)` }),
]);

export const blogPosts = pgTable("blog_posts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	title: text().notNull(),
	excerpt: text().notNull(),
	content: text().notNull(),
	author: text().notNull(),
	imageUrl: text("image_url"),
	published: boolean().default(true).notNull(),
	publishedAt: timestamp("published_at", { mode: 'string' }).defaultNow().notNull(),
	tags: jsonb().default([]).notNull(),
	views: integer().default(0).notNull(),
	language: text().default('en').notNull(),
});

export const bridgePayments = pgTable("bridge_payments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address").notNull(),
	sourceChain: varchar("source_chain").notNull(),
	sourceTxHash: varchar("source_tx_hash").notNull(),
	targetChain: varchar("target_chain").default('alpha-centauri').notNull(),
	targetTxHash: varchar("target_tx_hash"),
	usdtAmount: varchar("usdt_amount").notNull(),
	membershipLevel: integer("membership_level").notNull(),
	status: varchar().default('pending').notNull(),
	bridgeWallet: varchar("bridge_wallet").notNull(),
	nftTokenId: varchar("nft_token_id"),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	mintedAt: timestamp("minted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("bridge_payments_source_tx_hash_unique").on(table.sourceTxHash),
]);

export const courses = pgTable("courses", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	requiredLevel: integer("required_level").default(1).notNull(),
	priceBcc: integer("price_bcc").default(0).notNull(),
	isFree: boolean("is_free").default(true).notNull(),
	duration: text().notNull(),
	courseType: text("course_type").default('video').notNull(),
	zoomMeetingId: text("zoom_meeting_id"),
	zoomPassword: text("zoom_password"),
	zoomLink: text("zoom_link"),
	videoUrl: text("video_url"),
	downloadLink: text("download_link"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const courseLessons = pgTable("course_lessons", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	courseId: varchar("course_id").notNull(),
	title: text().notNull(),
	description: text().notNull(),
	videoUrl: text("video_url").notNull(),
	duration: text().notNull(),
	lessonOrder: integer("lesson_order").notNull(),
	priceBcc: integer("price_bcc").default(0).notNull(),
	isFree: boolean("is_free").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "course_lessons_course_id_courses_id_fk"
		}),
]);

export const memberNftVerification = pgTable("member_nft_verification", {
	walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().notNull(),
	nftContractAddress: varchar("nft_contract_address", { length: 42 }).notNull(),
	tokenId: varchar("token_id").notNull(),
	chainId: integer("chain_id").notNull(),
	verificationStatus: text("verification_status").default('pending').notNull(),
	lastVerified: timestamp("last_verified", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.walletAddress],
			foreignColumns: [users.walletAddress],
			name: "member_nft_verification_wallet_address_users_wallet_address_fk"
		}),
]);

export const levelConfig = pgTable("level_config", {
	level: integer().primaryKey().notNull(),
	levelName: text("level_name").notNull(),
	priceUsdt: integer("price_usdt").notNull(),
	nftPriceUsdt: integer("nft_price_usdt").notNull(),
	platformFeeUsdt: integer("platform_fee_usdt").notNull(),
	requiredDirectReferrals: integer("required_direct_referrals").default(1).notNull(),
	maxMatrixCount: integer("max_matrix_count").default(9).notNull(),
	baseBccUnlockAmount: integer("base_bcc_unlock_amount"),
});

export const discoverPartners = pgTable("discover_partners", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	logoUrl: text("logo_url"),
	websiteUrl: text("website_url").notNull(),
	shortDescription: text("short_description").notNull(),
	longDescription: text("long_description").notNull(),
	tags: jsonb().default([]).notNull(),
	chains: jsonb().default([]).notNull(),
	dappType: text("dapp_type").notNull(),
	featured: boolean().default(false).notNull(),
	status: text().default('draft').notNull(),
	submitterWallet: varchar("submitter_wallet", { length: 42 }),
	redeemCodeUsed: text("redeem_code_used"),
	approvedBy: varchar("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [adminUsers.id],
			name: "discover_partners_approved_by_admin_users_id_fk"
		}),
]);

export const memberActivations = pgTable("member_activations", {
	walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().notNull(),
	activationType: text("activation_type").notNull(),
	level: integer().notNull(),
	pendingUntil: timestamp("pending_until", { mode: 'string' }),
	isPending: boolean("is_pending").default(true).notNull(),
	activatedAt: timestamp("activated_at", { mode: 'string' }),
	pendingTimeoutHours: integer("pending_timeout_hours").default(24).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.walletAddress],
			foreignColumns: [users.walletAddress],
			name: "member_activations_wallet_address_users_wallet_address_fk"
		}),
]);

export const nftClaimRecords = pgTable("nft_claim_records", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	level: integer().notNull(),
	tokenId: integer("token_id").notNull(),
	sourceChain: varchar("source_chain").notNull(),
	targetChain: varchar("target_chain").notNull(),
	paymentTxHash: varchar("payment_tx_hash").notNull(),
	claimTxHash: varchar("claim_tx_hash"),
	bridgeWallet: varchar("bridge_wallet", { length: 42 }).notNull(),
	usdtAmount: integer("usdt_amount").notNull(),
	status: varchar().default('pending').notNull(),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	claimedAt: timestamp("claimed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.walletAddress],
			foreignColumns: [users.walletAddress],
			name: "nft_claim_records_wallet_address_users_wallet_address_fk"
		}),
]);

export const merchantNfts = pgTable("merchant_nfts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	imageUrl: text("image_url").notNull(),
	priceBcc: integer("price_bcc").notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const redeemCodes = pgTable("redeem_codes", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	serviceNftType: text("service_nft_type").notNull(),
	generatedFromWallet: varchar("generated_from_wallet", { length: 42 }).notNull(),
	burnTxHash: text("burn_tx_hash").notNull(),
	used: boolean().default(false).notNull(),
	usedBy: varchar("used_by", { length: 42 }),
	usedAt: timestamp("used_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	partnerId: varchar("partner_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.partnerId],
			foreignColumns: [discoverPartners.id],
			name: "redeem_codes_partner_id_discover_partners_id_fk"
		}),
	unique("redeem_codes_code_unique").on(table.code),
]);

export const systemStatus = pgTable("system_status", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	service: text().notNull(),
	status: text().notNull(),
	latency: integer(),
	blockHeight: varchar("block_height"),
	errorMessage: text("error_message"),
	lastChecked: timestamp("last_checked", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const members = pgTable("members", {
	walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().notNull(),
	isActivated: boolean("is_activated").default(false).notNull(),
	activatedAt: timestamp("activated_at", { mode: 'string' }),
	currentLevel: integer("current_level").default(0).notNull(),
	maxLayer: integer("max_layer").default(0).notNull(),
	levelsOwned: jsonb("levels_owned").default([]).notNull(),
	hasPendingRewards: boolean("has_pending_rewards").default(false).notNull(),
	upgradeReminderEnabled: boolean("upgrade_reminder_enabled").default(false).notNull(),
	lastUpgradeAt: timestamp("last_upgrade_at", { mode: 'string' }),
	lastRewardClaimAt: timestamp("last_reward_claim_at", { mode: 'string' }),
	totalDirectReferrals: integer("total_direct_referrals").default(0).notNull(),
	totalTeamSize: integer("total_team_size").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("members_self_access", { as: "permissive", for: "all", to: ["public"], using: sql`((wallet_address)::text = current_setting('app.current_wallet'::text, true))` }),
	pgPolicy("members_admin_access", { as: "permissive", for: "all", to: ["public"] }),
	pgPolicy("members_referrer_read", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("members_tree_read", { as: "permissive", for: "select", to: ["public"] }),
]);

export const referrals = pgTable("referrals", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	rootWallet: varchar("root_wallet", { length: 42 }).notNull(),
	memberWallet: varchar("member_wallet", { length: 42 }).notNull(),
	layer: integer().notNull(),
	position: text().notNull(),
	parentWallet: varchar("parent_wallet", { length: 42 }),
	placerWallet: varchar("placer_wallet", { length: 42 }).notNull(),
	placementType: text("placement_type").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	placedAt: timestamp("placed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_referrals_member_layer").using("btree", table.memberWallet.asc().nullsLast().op("int4_ops"), table.layer.asc().nullsLast().op("text_ops")),
	index("idx_referrals_performance_member_root_active").using("btree", table.memberWallet.asc().nullsLast().op("bool_ops"), table.rootWallet.asc().nullsLast().op("text_ops"), table.isActive.asc().nullsLast().op("text_ops")).where(sql`(is_active = true)`),
	index("idx_referrals_performance_root_layer_active").using("btree", table.rootWallet.asc().nullsLast().op("bool_ops"), table.layer.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("text_ops")).where(sql`(is_active = true)`),
	index("idx_referrals_root_layer").using("btree", table.rootWallet.asc().nullsLast().op("int4_ops"), table.layer.asc().nullsLast().op("text_ops")),
	index("referrals_member_idx").using("btree", table.memberWallet.asc().nullsLast().op("text_ops")),
	index("referrals_root_active_idx").using("btree", table.rootWallet.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("bool_ops")),
	index("referrals_root_layer_idx").using("btree", table.rootWallet.asc().nullsLast().op("text_ops"), table.layer.asc().nullsLast().op("int4_ops")),
	pgPolicy("referrals_tree_owner_access", { as: "permissive", for: "all", to: ["public"], using: sql`((root_wallet)::text = current_setting('app.current_wallet'::text, true))` }),
	pgPolicy("referrals_member_read", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("referrals_admin_access", { as: "permissive", for: "all", to: ["public"] }),
	pgPolicy("referrals_placer_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("referrals_integrity_check", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const walletConnectionLogs = pgTable("wallet_connection_logs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	connectionType: text("connection_type").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	referrerUrl: text("referrer_url"),
	referralCode: text("referral_code"),
	uplineWallet: varchar("upline_wallet", { length: 42 }),
	connectionStatus: text("connection_status").default('success').notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const adSlots = pgTable("ad_slots", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	title: text().notNull(),
	bannerImageUrl: text("banner_image_url").notNull(),
	linkUrl: text("link_url").notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	status: text().default('draft').notNull(),
	position: text().default('top').notNull(),
	priority: integer().default(0).notNull(),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [adminUsers.id],
			name: "ad_slots_created_by_admin_users_id_fk"
		}),
]);

export const tokenPurchases = pgTable("token_purchases", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	tokenType: text("token_type").notNull(),
	tokenAmount: integer("token_amount").notNull(),
	usdtAmount: integer("usdt_amount").notNull(),
	sourceChain: text("source_chain").notNull(),
	txHash: text("tx_hash"),
	payembedIntentId: text("payembed_intent_id"),
	airdropTxHash: text("airdrop_tx_hash"),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.walletAddress],
			foreignColumns: [users.walletAddress],
			name: "token_purchases_wallet_address_users_wallet_address_fk"
		}),
	pgPolicy("token_purchases_owner_access", { as: "permissive", for: "all", to: ["public"], using: sql`((wallet_address)::text = current_setting('app.current_wallet'::text, true))` }),
	pgPolicy("token_purchases_admin_access", { as: "permissive", for: "all", to: ["public"] }),
]);

export const rewardNotifications = pgTable("reward_notifications", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull(),
	triggerWallet: varchar("trigger_wallet", { length: 42 }).notNull(),
	triggerLevel: integer("trigger_level").notNull(),
	layerNumber: integer("layer_number").notNull(),
	rewardAmount: integer("reward_amount").notNull(),
	status: text().default('pending').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	claimedAt: timestamp("claimed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.recipientWallet],
			foreignColumns: [users.walletAddress],
			name: "reward_notifications_recipient_wallet_users_wallet_address_fk"
		}),
]);

export const users = pgTable("users", {
	walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().notNull(),
	email: text(),
	username: text(),
	secondaryPasswordHash: text("secondary_password_hash"),
	ipfsHash: text("ipfs_hash"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	lastUpdatedAt: timestamp("last_updated_at", { mode: 'string' }).defaultNow().notNull(),
	referrerWallet: varchar("referrer_wallet", { length: 42 }),
	memberActivated: boolean("member_activated").default(false).notNull(),
	currentLevel: integer("current_level").default(0).notNull(),
	preferredLanguage: text("preferred_language").default('en').notNull(),
	registrationStatus: text("registration_status").default('not_started').notNull(),
	ipfsAvatarCid: text("ipfs_avatar_cid"),
	ipfsCoverCid: text("ipfs_cover_cid"),
	ipfsProfileJsonCid: text("ipfs_profile_json_cid"),
	preparedLevel: integer("prepared_level"),
	preparedTokenId: integer("prepared_token_id"),
	preparedPrice: integer("prepared_price"),
	activationAt: timestamp("activation_at", { mode: 'string' }),
	registeredAt: timestamp("registered_at", { mode: 'string' }),
	registrationExpiresAt: timestamp("registration_expires_at", { mode: 'string' }),
	registrationTimeoutHours: integer("registration_timeout_hours").default(48),
	lastWalletConnectionAt: timestamp("last_wallet_connection_at", { mode: 'string' }),
	walletConnectionCount: integer("wallet_connection_count").default(0),
	referralCode: text("referral_code"),
	isCompanyDirectReferral: boolean("is_company_direct_referral").default(false),
	isUpgraded: boolean("is_upgraded").default(false).notNull(),
	upgradeTimerEnabled: boolean("upgrade_timer_enabled").default(false).notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	pgPolicy("users_self_access", { as: "permissive", for: "all", to: ["public"], using: sql`((wallet_address)::text = current_setting('app.current_wallet'::text, true))` }),
	pgPolicy("users_admin_access", { as: "permissive", for: "all", to: ["public"] }),
	pgPolicy("users_public_read", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("referrals_upline_read", { as: "permissive", for: "select", to: ["public"] }),
]);

export const bccStakingTiers = pgTable("bcc_staking_tiers", {
	tierId: integer("tier_id").primaryKey().notNull(),
	tierName: text("tier_name").notNull(),
	maxActivations: integer("max_activations").notNull(),
	currentActivations: integer("current_activations").default(0).notNull(),
	unlockMultiplier: numeric("unlock_multiplier", { precision: 5, scale:  4 }).default('1.0000').notNull(),
	totalLockMultiplier: numeric("total_lock_multiplier", { precision: 5, scale:  4 }).default('1.0000').notNull(),
	phase: text().notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userRewards = pgTable("user_rewards", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull(),
	sourceWallet: varchar("source_wallet", { length: 42 }).notNull(),
	triggerLevel: integer("trigger_level").notNull(),
	payoutLayer: integer("payout_layer").notNull(),
	matrixPosition: text("matrix_position"),
	rewardAmount: numeric("reward_amount", { precision: 10, scale:  2 }).notNull(),
	status: text().default('pending').notNull(),
	requiresLevel: integer("requires_level"),
	unlockCondition: text("unlock_condition"),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
	expiredAt: timestamp("expired_at", { mode: 'string' }),
	notes: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }),
	amount: varchar({ length: 20 }),
	rewardType: text("reward_type"),
	layer: integer(),
	level: integer(),
}, (table) => [
	index("idx_user_rewards_recipient").using("btree", table.recipientWallet.asc().nullsLast().op("text_ops")),
	index("idx_user_rewards_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.recipientWallet],
			foreignColumns: [users.walletAddress],
			name: "user_rewards_recipient_wallet_users_wallet_address_fk"
		}),
	pgPolicy("user_rewards_recipient_access", { as: "permissive", for: "all", to: ["public"], using: sql`((recipient_wallet)::text = current_setting('app.current_wallet'::text, true))` }),
	pgPolicy("user_rewards_admin_access", { as: "permissive", for: "all", to: ["public"] }),
]);

export const userWallet = pgTable("user_wallet", {
	walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().notNull(),
	totalUsdtEarnings: integer("total_usdt_earnings").default(0).notNull(),
	withdrawnUsdt: integer("withdrawn_usdt").default(0).notNull(),
	availableUsdt: integer("available_usdt").default(0).notNull(),
	bccBalance: integer("bcc_balance").default(0).notNull(),
	bccLocked: integer("bcc_locked").default(0).notNull(),
	pendingUpgradeRewards: integer("pending_upgrade_rewards").default(0).notNull(),
	hasPendingUpgrades: boolean("has_pending_upgrades").default(false).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	usdtBalance: integer("usdt_balance").default(0),
	usdtPending: integer("usdt_pending").default(0),
	usdtTotalEarned: integer("usdt_total_earned").default(0),
});

export const rewardClaims = pgTable("reward_claims", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	amount: integer().notNull(),
	status: text().default('pending').notNull(),
	claimedAt: timestamp("claimed_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("reward_claims_owner_access", { as: "permissive", for: "all", to: ["public"], using: sql`((wallet_address)::text = current_setting('app.current_wallet'::text, true))` }),
	pgPolicy("reward_claims_admin_access", { as: "permissive", for: "all", to: ["public"] }),
]);

export const userNotifications = pgTable("user_notifications", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	title: varchar().notNull(),
	message: text().notNull(),
	type: varchar().notNull(),
	relatedWallet: varchar("related_wallet", { length: 42 }),
	amount: varchar(),
	metadata: jsonb(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("user_notifications_recipient_access", { as: "permissive", for: "all", to: ["public"], using: sql`((wallet_address)::text = current_setting('app.current_wallet'::text, true))` }),
	pgPolicy("user_notifications_admin_access", { as: "permissive", for: "all", to: ["public"] }),
]);

export const userBalances = pgTable("user_balances", {
	walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().notNull(),
	bccTransferable: integer("bcc_transferable").default(500).notNull(),
	bccRestricted: integer("bcc_restricted").default(0).notNull(),
	bccLocked: integer("bcc_locked").default(0).notNull(),
	totalUsdtEarned: integer("total_usdt_earned").default(0).notNull(),
	availableUsdtRewards: integer("available_usdt_rewards").default(0).notNull(),
	totalUsdtWithdrawn: integer("total_usdt_withdrawn").default(0).notNull(),
	activationTier: integer("activation_tier"),
	activationOrder: integer("activation_order"),
	cthBalance: integer("cth_balance").default(0).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const usdtWithdrawals = pgTable("usdt_withdrawals", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	amountUsdt: integer("amount_usdt").notNull(),
	targetChain: text("target_chain").notNull(),
	targetWalletAddress: varchar("target_wallet_address", { length: 42 }).notNull(),
	gasFeePercentage: numeric("gas_fee_percentage", { precision: 5, scale:  2 }).notNull(),
	gasFeeAmount: integer("gas_fee_amount").notNull(),
	netAmount: integer("net_amount").notNull(),
	status: text().default('pending').notNull(),
	serverWalletTxHash: text("server_wallet_tx_hash"),
	targetChainTxHash: text("target_chain_tx_hash"),
	processedBy: text("processed_by"),
	failureReason: text("failure_reason"),
	requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
});

export const bccGlobalPool = pgTable("bcc_global_pool", {
	id: integer().default(1).primaryKey().notNull(),
	totalBccLocked: integer("total_bcc_locked").default(0).notNull(),
	totalMembersActivated: integer("total_members_activated").default(0).notNull(),
	currentTier: integer("current_tier").default(1).notNull(),
	tier1Activations: integer("tier1_activations").default(0).notNull(),
	tier2Activations: integer("tier2_activations").default(0).notNull(),
	tier3Activations: integer("tier3_activations").default(0).notNull(),
	tier4Activations: integer("tier4_activations").default(0).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
});

export const bccUnlockHistory = pgTable("bcc_unlock_history", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	unlockType: text("unlock_type").notNull(),
	amount: integer().notNull(),
	triggeredByLevel: integer("triggered_by_level"),
	unlockedAt: timestamp("unlocked_at", { mode: 'string' }).defaultNow().notNull(),
	metadata: jsonb(),
}, (table) => [
	pgPolicy("bcc_unlock_history_owner_access", { as: "permissive", for: "all", to: ["public"], using: sql`((wallet_address)::text = current_setting('app.current_wallet'::text, true))` }),
	pgPolicy("bcc_unlock_history_admin_access", { as: "permissive", for: "all", to: ["public"] }),
]);

export const cthBalances = pgTable("cth_balances", {
	walletAddress: varchar("wallet_address", { length: 42 }).primaryKey().notNull(),
	balance: integer().default(0).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
});

export const dappTypes = pgTable("dapp_types", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	iconUrl: text("icon_url"),
	color: text().default('#FFA500').notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("dapp_types_name_unique").on(table.name),
]);

export const matrixLayerSummary = pgTable("matrix_layer_summary", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	rootWallet: varchar("root_wallet", { length: 42 }).notNull(),
	layer: integer().notNull(),
	leftPosition: varchar("left_position", { length: 42 }),
	middlePosition: varchar("middle_position", { length: 42 }),
	rightPosition: varchar("right_position", { length: 42 }),
	filledCount: integer("filled_count").default(0).notNull(),
	maxPositions: integer("max_positions").notNull(),
	isLayerComplete: boolean("is_layer_complete").default(false).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
});

export const memberMatrixView = pgTable("member_matrix_view", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	rootWallet: varchar("root_wallet", { length: 42 }).notNull(),
	layerData: jsonb("layer_data").notNull(),
	totalMembers: integer("total_members").default(0).notNull(),
	deepestLayer: integer("deepest_layer").default(0).notNull(),
	nextAvailableLayer: integer("next_available_layer").default(1).notNull(),
	nextAvailablePosition: text("next_available_position").default('L').notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
});

export const nftPurchases = pgTable("nft_purchases", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	nftId: varchar("nft_id").notNull(),
	amountBcc: integer("amount_bcc").notNull(),
	bucketUsed: text("bucket_used").notNull(),
	txHash: text("tx_hash"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	level: integer().notNull(),
	tokenId: integer("token_id").notNull(),
	amountUsdt: integer("amount_usdt").notNull(),
	chain: text().notNull(),
	txHash: text("tx_hash"),
	payembedIntentId: text("payembed_intent_id"),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
});

export const partnerChains = pgTable("partner_chains", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	logoUrl: text("logo_url"),
	explorerUrl: text("explorer_url").notNull(),
	docsUrl: text("docs_url"),
	rpcUrl: text("rpc_url"),
	chainId: integer("chain_id"),
	nativeCurrency: text("native_currency").notNull(),
	status: text().default('active').notNull(),
	featured: boolean().default(false).notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("partner_chains_name_unique").on(table.name),
	unique("partner_chains_chain_id_unique").on(table.chainId),
]);

export const rewardDistributions = pgTable("reward_distributions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	recipientWallet: varchar("recipient_wallet", { length: 42 }).notNull(),
	sourceWallet: varchar("source_wallet", { length: 42 }).notNull(),
	rewardType: text("reward_type").notNull(),
	rewardAmount: numeric("reward_amount", { precision: 10, scale:  2 }).notNull(),
	level: integer(),
	status: text().default('pending').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	pendingUntil: timestamp("pending_until", { mode: 'string' }),
	claimedAt: timestamp("claimed_at", { mode: 'string' }),
	redistributedTo: varchar("redistributed_to", { length: 42 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const rewardRollups = pgTable("reward_rollups", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	originalRecipient: varchar("original_recipient", { length: 42 }).notNull(),
	rolledUpTo: varchar("rolled_up_to", { length: 42 }).notNull(),
	rewardAmount: integer("reward_amount").notNull(),
	triggerWallet: varchar("trigger_wallet", { length: 42 }).notNull(),
	triggerLevel: integer("trigger_level").notNull(),
	originalNotificationId: varchar("original_notification_id").notNull(),
	rollupReason: text("rollup_reason").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const serviceRequests = pgTable("service_requests", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	nftId: varchar("nft_id").notNull(),
	serviceName: text("service_name").notNull(),
	serviceType: text("service_type").notNull(),
	applicationData: jsonb("application_data").notNull(),
	requestTitle: text("request_title").notNull(),
	requestDescription: text("request_description").notNull(),
	status: text().default('new_application').notNull(),
	assignedAdmin: varchar("assigned_admin", { length: 42 }),
	adminNotes: text("admin_notes"),
	responseData: jsonb("response_data"),
	statusHistory: jsonb("status_history").default([]).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
});

export const userActivities = pgTable("user_activities", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	activityType: text("activity_type").notNull(),
	title: text().notNull(),
	description: text(),
	amount: numeric({ precision: 10, scale:  2 }),
	amountType: text("amount_type"),
	relatedWallet: varchar("related_wallet", { length: 42 }),
	relatedLevel: integer("related_level"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const courseActivations = pgTable("course_activations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
	courseId: varchar("course_id").notNull(),
	activatedAt: timestamp("activated_at", { mode: 'string' }).defaultNow().notNull(),
	progress: integer().default(0).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	pgPolicy("course_activations_owner_access", { as: "permissive", for: "all", to: ["public"], using: sql`((wallet_address)::text = current_setting('app.current_wallet'::text, true))` }),
	pgPolicy("course_activations_admin_access", { as: "permissive", for: "all", to: ["public"] }),
]);

export const platformRevenue = pgTable("platform_revenue", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	sourceType: text("source_type").notNull(),
	sourceWallet: varchar("source_wallet", { length: 42 }).notNull(),
	level: integer(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: text().default('USDT').notNull(),
	description: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("platform_revenue_high_admin_only", { as: "permissive", for: "all", to: ["public"], using: sql`((current_setting('app.admin_level'::text, true))::integer >= 3)` }),
]);
export const userMatrixSummary = pgView("user_matrix_summary", {	rootWallet: varchar("root_wallet", { length: 42 }),
	rootUsername: text("root_username"),
	rootLevel: integer("root_level"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalMembers: bigint("total_members", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	layer1Members: bigint("layer_1_members", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	layer2Members: bigint("layer_2_members", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	layer3Members: bigint("layer_3_members", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	activeMembers: bigint("active_members", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	activatedMembers: bigint("activated_members", { mode: "number" }),
	layer1FillRate: numeric("layer_1_fill_rate"),
	layer2FillRate: numeric("layer_2_fill_rate"),
	layer3FillRate: numeric("layer_3_fill_rate"),
}).as(sql`SELECT r.root_wallet, root_user.username AS root_username, COALESCE(root_member.current_level, 0) AS root_level, count(DISTINCT r.member_wallet) AS total_members, count(DISTINCT CASE WHEN r.layer = 1 THEN r.member_wallet ELSE NULL::character varying END) AS layer_1_members, count(DISTINCT CASE WHEN r.layer = 2 THEN r.member_wallet ELSE NULL::character varying END) AS layer_2_members, count(DISTINCT CASE WHEN r.layer = 3 THEN r.member_wallet ELSE NULL::character varying END) AS layer_3_members, count(DISTINCT CASE WHEN r.is_active = true THEN r.member_wallet ELSE NULL::character varying END) AS active_members, count(DISTINCT CASE WHEN m.is_activated = true THEN r.member_wallet ELSE NULL::character varying END) AS activated_members, round( CASE WHEN count(DISTINCT CASE WHEN r.layer = 1 THEN r.member_wallet ELSE NULL::character varying END) > 0 THEN count(DISTINCT CASE WHEN r.layer = 1 THEN r.member_wallet ELSE NULL::character varying END)::numeric * 100.0 / 3.0 ELSE 0::numeric END, 2) AS layer_1_fill_rate, round( CASE WHEN count(DISTINCT CASE WHEN r.layer = 2 THEN r.member_wallet ELSE NULL::character varying END) > 0 THEN count(DISTINCT CASE WHEN r.layer = 2 THEN r.member_wallet ELSE NULL::character varying END)::numeric * 100.0 / 9.0 ELSE 0::numeric END, 2) AS layer_2_fill_rate, round( CASE WHEN count(DISTINCT CASE WHEN r.layer = 3 THEN r.member_wallet ELSE NULL::character varying END) > 0 THEN count(DISTINCT CASE WHEN r.layer = 3 THEN r.member_wallet ELSE NULL::character varying END)::numeric * 100.0 / 27.0 ELSE 0::numeric END, 2) AS layer_3_fill_rate FROM referrals r LEFT JOIN users root_user ON r.root_wallet::text = root_user.wallet_address::text LEFT JOIN members root_member ON r.root_wallet::text = root_member.wallet_address::text LEFT JOIN members m ON r.member_wallet::text = m.wallet_address::text WHERE r.layer >= 1 AND r.layer <= 19 GROUP BY r.root_wallet, root_user.username, root_member.current_level`);

export const matrixPositionDetails = pgView("matrix_position_details", {	rootWallet: varchar("root_wallet", { length: 42 }),
	rootUsername: text("root_username"),
	layer: integer(),
	position: text(),
	memberWallet: varchar("member_wallet", { length: 42 }),
	memberUsername: text("member_username"),
	memberIsActivated: boolean("member_is_activated"),
	memberLevel: integer("member_level"),
	parentWallet: varchar("parent_wallet", { length: 42 }),
	placementType: text("placement_type"),
	placedAt: timestamp("placed_at", { mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	positionOrderInLayer: bigint("position_order_in_layer", { mode: "number" }),
	downlineCount: integer("downline_count"),
	hasDownline: boolean("has_downline"),
}).as(sql`SELECT r.root_wallet, u_root.username AS root_username, r.layer, r."position", r.member_wallet, u_member.username AS member_username, COALESCE(m.is_activated, false) AS member_is_activated, COALESCE(m.current_level, u_member.current_level, 0) AS member_level, r.parent_wallet, r.placement_type, r.placed_at, row_number() OVER (PARTITION BY r.root_wallet, r.layer ORDER BY ( CASE r."position" WHEN 'L'::text THEN 1 WHEN 'M'::text THEN 2 WHEN 'R'::text THEN 3 ELSE NULL::integer END), r.placed_at) AS position_order_in_layer, (( SELECT count(*) AS count FROM referrals r2 WHERE r2.root_wallet::text = r.root_wallet::text AND r2.parent_wallet::text = r.member_wallet::text AND r2.is_active = true))::integer AS downline_count, (EXISTS ( SELECT 1 FROM referrals r3 WHERE r3.root_wallet::text = r.root_wallet::text AND r3.parent_wallet::text = r.member_wallet::text AND r3.is_active = true)) AS has_downline FROM referrals r LEFT JOIN users u_root ON r.root_wallet::text = u_root.wallet_address::text LEFT JOIN users u_member ON r.member_wallet::text = u_member.wallet_address::text LEFT JOIN members m ON r.member_wallet::text = m.wallet_address::text WHERE r.is_active = true ORDER BY r.root_wallet, r.layer, ( CASE r."position" WHEN 'L'::text THEN 1 WHEN 'M'::text THEN 2 WHEN 'R'::text THEN 3 ELSE NULL::integer END)`);

export const userUsdtSummary = pgView("user_usdt_summary", {	walletAddress: varchar("wallet_address", { length: 42 }),
	username: text(),
	totalUsdtEarned: numeric("total_usdt_earned", { precision: 10, scale:  2 }),
	availableUsdtRewards: numeric("available_usdt_rewards", { precision: 10, scale:  2 }),
	totalUsdtWithdrawn: numeric("total_usdt_withdrawn", { precision: 10, scale:  2 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalRewardsCount: bigint("total_rewards_count", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	confirmedRewardsCount: bigint("confirmed_rewards_count", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	directRewardsCount: bigint("direct_rewards_count", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rollupRewardsCount: bigint("rollup_rewards_count", { mode: "number" }),
	totalRewardAmount: numeric("total_reward_amount"),
	currentLevel: integer("current_level"),
	isActivated: boolean("is_activated"),
}).as(sql`SELECT ub.wallet_address, u.username, (COALESCE(ub.total_usdt_earned, 0)::numeric / 100.0)::numeric(10,2) AS total_usdt_earned, (COALESCE(ub.available_usdt_rewards, 0)::numeric / 100.0)::numeric(10,2) AS available_usdt_rewards, (COALESCE(ub.total_usdt_withdrawn, 0)::numeric / 100.0)::numeric(10,2) AS total_usdt_withdrawn, COALESCE(ur_stats.total_rewards_count, 0::bigint) AS total_rewards_count, COALESCE(ur_stats.confirmed_rewards_count, 0::bigint) AS confirmed_rewards_count, COALESCE(ur_stats.direct_rewards_count, 0::bigint) AS direct_rewards_count, COALESCE(ur_stats.rollup_rewards_count, 0::bigint) AS rollup_rewards_count, COALESCE(ur_stats.total_reward_amount, 0::numeric) AS total_reward_amount, COALESCE(m.current_level, 0) AS current_level, COALESCE(m.is_activated, false) AS is_activated FROM user_balances ub LEFT JOIN users u ON ub.wallet_address::text = u.wallet_address::text LEFT JOIN members m ON ub.wallet_address::text = m.wallet_address::text LEFT JOIN ( SELECT ur.recipient_wallet AS wallet_address, count(ur.id) AS total_rewards_count, count( CASE WHEN ur.status = 'confirmed'::text THEN 1 ELSE NULL::integer END) AS confirmed_rewards_count, count( CASE WHEN ur.reward_type = 'DIRECT_REWARD'::text THEN 1 ELSE NULL::integer END) AS direct_rewards_count, count( CASE WHEN ur.reward_type = 'ROLLUP_REWARD'::text THEN 1 ELSE NULL::integer END) AS rollup_rewards_count, sum(ur.reward_amount)::numeric(10,2) AS total_reward_amount FROM user_rewards ur WHERE (ur.metadata ->> 'currency'::text) = 'USDT'::text GROUP BY ur.recipient_wallet) ur_stats ON ub.wallet_address::text = ur_stats.wallet_address::text WHERE COALESCE(ub.total_usdt_earned, 0) > 0 OR COALESCE(ub.available_usdt_rewards, 0) > 0 OR ur_stats.wallet_address IS NOT NULL ORDER BY (COALESCE(ub.total_usdt_earned, 0)) DESC`);

export const userMatrixPositions = pgView("user_matrix_positions", {	rootWallet: varchar("root_wallet", { length: 42 }),
	memberWallet: varchar("member_wallet", { length: 42 }),
	layer: integer(),
	position: text(),
	isActive: boolean("is_active"),
	placedAt: timestamp("placed_at", { mode: 'string' }),
	username: text(),
	memberLevel: integer("member_level"),
	isActivated: boolean("is_activated"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	layerFillCount: bigint("layer_fill_count", { mode: "number" }),
	layerCapacity: integer("layer_capacity"),
}).as(sql`SELECT DISTINCT r.root_wallet, r.member_wallet, r.layer, r."position", r.is_active, r.placed_at, u.username, COALESCE(m.current_level, 0) AS member_level, COALESCE(m.is_activated, false) AS is_activated, CASE WHEN r.layer <= 19 THEN ( SELECT count(*) AS count FROM referrals r2 WHERE r2.root_wallet::text = r.root_wallet::text AND r2.layer = r.layer AND r2.is_active = true) ELSE 0::bigint END AS layer_fill_count, CASE WHEN r.layer <= 19 THEN power(3::double precision, r.layer::double precision)::integer ELSE 0 END AS layer_capacity FROM referrals r LEFT JOIN users u ON r.member_wallet::text = u.wallet_address::text LEFT JOIN members m ON r.member_wallet::text = m.wallet_address::text WHERE r.layer >= 1 AND r.layer <= 19 ORDER BY r.root_wallet, r.layer, r."position"`);