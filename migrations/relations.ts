import { relations } from "drizzle-orm/relations";
import { adminUsers, adminSessions, users, advertisementNftClaims, advertisementNfts, auditLogs, courses, courseLessons, memberNftVerification, discoverPartners, memberActivations, nftClaimRecords, redeemCodes, adSlots, tokenPurchases, rewardNotifications, userRewards } from "./schema";

export const adminSessionsRelations = relations(adminSessions, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [adminSessions.adminId],
		references: [adminUsers.id]
	}),
}));

export const adminUsersRelations = relations(adminUsers, ({many}) => ({
	adminSessions: many(adminSessions),
	auditLogs: many(auditLogs),
	discoverPartners: many(discoverPartners),
	adSlots: many(adSlots),
}));

export const advertisementNftClaimsRelations = relations(advertisementNftClaims, ({one}) => ({
	user: one(users, {
		fields: [advertisementNftClaims.walletAddress],
		references: [users.walletAddress]
	}),
	advertisementNft: one(advertisementNfts, {
		fields: [advertisementNftClaims.nftId],
		references: [advertisementNfts.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	advertisementNftClaims: many(advertisementNftClaims),
	memberNftVerifications: many(memberNftVerification),
	memberActivations: many(memberActivations),
	nftClaimRecords: many(nftClaimRecords),
	tokenPurchases: many(tokenPurchases),
	rewardNotifications: many(rewardNotifications),
	userRewards: many(userRewards),
}));

export const advertisementNftsRelations = relations(advertisementNfts, ({many}) => ({
	advertisementNftClaims: many(advertisementNftClaims),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [auditLogs.adminId],
		references: [adminUsers.id]
	}),
}));

export const courseLessonsRelations = relations(courseLessons, ({one}) => ({
	course: one(courses, {
		fields: [courseLessons.courseId],
		references: [courses.id]
	}),
}));

export const coursesRelations = relations(courses, ({many}) => ({
	courseLessons: many(courseLessons),
}));

export const memberNftVerificationRelations = relations(memberNftVerification, ({one}) => ({
	user: one(users, {
		fields: [memberNftVerification.walletAddress],
		references: [users.walletAddress]
	}),
}));

export const discoverPartnersRelations = relations(discoverPartners, ({one, many}) => ({
	adminUser: one(adminUsers, {
		fields: [discoverPartners.approvedBy],
		references: [adminUsers.id]
	}),
	redeemCodes: many(redeemCodes),
}));

export const memberActivationsRelations = relations(memberActivations, ({one}) => ({
	user: one(users, {
		fields: [memberActivations.walletAddress],
		references: [users.walletAddress]
	}),
}));

export const nftClaimRecordsRelations = relations(nftClaimRecords, ({one}) => ({
	user: one(users, {
		fields: [nftClaimRecords.walletAddress],
		references: [users.walletAddress]
	}),
}));

export const redeemCodesRelations = relations(redeemCodes, ({one}) => ({
	discoverPartner: one(discoverPartners, {
		fields: [redeemCodes.partnerId],
		references: [discoverPartners.id]
	}),
}));

export const adSlotsRelations = relations(adSlots, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [adSlots.createdBy],
		references: [adminUsers.id]
	}),
}));

export const tokenPurchasesRelations = relations(tokenPurchases, ({one}) => ({
	user: one(users, {
		fields: [tokenPurchases.walletAddress],
		references: [users.walletAddress]
	}),
}));

export const rewardNotificationsRelations = relations(rewardNotifications, ({one}) => ({
	user: one(users, {
		fields: [rewardNotifications.recipientWallet],
		references: [users.walletAddress]
	}),
}));

export const userRewardsRelations = relations(userRewards, ({one}) => ({
	user: one(users, {
		fields: [userRewards.recipientWallet],
		references: [users.walletAddress]
	}),
}));