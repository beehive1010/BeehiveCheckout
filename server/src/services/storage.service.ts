import { 
  userService,
  memberService,
  walletService,
  referralService,
  rewardService,
  nftService,
  courseService,
  adminService,
  configService
} from './index';
import { 
  userActivities,
  type UserActivity,
  type InsertUserActivity
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, sql } from "drizzle-orm";

export class StorageService {
  // Delegate all operations to specific services
  
  // User operations
  getUser = userService.getUser.bind(userService);
  getUserByUsername = userService.getUserByUsername.bind(userService);
  createUser = userService.createUser.bind(userService);
  updateUser = userService.updateUser.bind(userService);

  // Member operations
  getMember = memberService.getMember.bind(memberService);
  createMember = memberService.createMember.bind(memberService);
  updateMember = memberService.updateMember.bind(memberService);
  getTotalMemberCount = memberService.getTotalMemberCount.bind(memberService);
  getMemberCountByLevel = memberService.getMemberCountByLevel.bind(memberService);
  getDirectReferralCount = memberService.getDirectReferralCount.bind(memberService);

  // Wallet operations
  getUserWallet = walletService.getUserWallet.bind(walletService);
  createUserWallet = walletService.createUserWallet.bind(walletService);
  updateUserWallet = walletService.updateUserWallet.bind(walletService);
  getUserBalances = walletService.getUserBalances.bind(walletService);

  // Referral operations
  getReferrals = referralService.getReferrals.bind(referralService);
  getReferralsByMember = referralService.getReferralsByMember.bind(referralService);
  createReferral = referralService.createReferral.bind(referralService);
  updateReferral = referralService.updateReferral.bind(referralService);
  findAvailablePosition = referralService.findAvailablePosition.bind(referralService);

  // Reward operations
  getRewardClaims = rewardService.getRewardClaims.bind(rewardService);
  createRewardClaim = rewardService.createRewardClaim.bind(rewardService);
  updateRewardClaim = rewardService.updateRewardClaim.bind(rewardService);
  getPendingRewardClaims = rewardService.getPendingRewardClaims.bind(rewardService);
  getExpiredRewardClaims = rewardService.getExpiredRewardClaims.bind(rewardService);
  getRewardRollups = rewardService.getRewardRollups.bind(rewardService);
  createRewardRollup = rewardService.createRewardRollup.bind(rewardService);
  createUserReward = rewardService.createUserReward.bind(rewardService);
  getUserRewardsByRecipient = rewardService.getUserRewardsByRecipient.bind(rewardService);
  getUserRewardsBySource = rewardService.getUserRewardsBySource.bind(rewardService);
  getPendingUserRewards = rewardService.getPendingUserRewards.bind(rewardService);
  updateUserRewardStatus = rewardService.updateUserRewardStatus.bind(rewardService);
  getUserRewardsExpiredBefore = rewardService.getUserRewardsExpiredBefore.bind(rewardService);
  unlockPendingRewards = rewardService.unlockPendingRewards.bind(rewardService);
  processMatrixRewards = rewardService.processMatrixRewards.bind(rewardService);
  processReferralRewards = rewardService.processReferralRewards.bind(rewardService);
  createRewardWithdrawal = rewardService.createRewardWithdrawal.bind(rewardService);

  // NFT operations
  getMemberNFTVerification = nftService.getMemberNFTVerification.bind(nftService);
  createNFTVerification = nftService.createNFTVerification.bind(nftService);
  updateNFTVerification = nftService.updateNFTVerification.bind(nftService);
  getMerchantNFTs = nftService.getMerchantNFTs.bind(nftService);
  getMerchantNFT = nftService.getMerchantNFT.bind(nftService);
  createMerchantNFT = nftService.createMerchantNFT.bind(nftService);
  createMerchantNFTClaim = nftService.createMerchantNFTClaim.bind(nftService);
  getMerchantNFTClaimsByWallet = nftService.getMerchantNFTClaimsByWallet.bind(nftService);
  processNFTClaimRewards = nftService.processNFTClaimRewards.bind(nftService);

  // Course operations
  getCourses = courseService.getCourses.bind(courseService);
  getCourse = courseService.getCourse.bind(courseService);
  createCourse = courseService.createCourse.bind(courseService);
  updateCourse = courseService.updateCourse.bind(courseService);
  getCourseActivation = courseService.getCourseActivation.bind(courseService);
  getCourseActivationsByWallet = courseService.getCourseActivationsByWallet.bind(courseService);
  createCourseActivation = courseService.createCourseActivation.bind(courseService);
  updateCourseActivation = courseService.updateCourseActivation.bind(courseService);

  // Admin operations
  getAdminUsers = adminService.getAdminUsers.bind(adminService);
  getAdminUser = adminService.getAdminUser.bind(adminService);
  getAdminUserByUsername = adminService.getAdminUserByUsername.bind(adminService);
  createAdminUser = adminService.createAdminUser.bind(adminService);
  updateAdminUser = adminService.updateAdminUser.bind(adminService);
  deleteAdminUser = adminService.deleteAdminUser.bind(adminService);
  createAdminSession = adminService.createAdminSession.bind(adminService);
  getAdminSession = adminService.getAdminSession.bind(adminService);
  deleteAdminSession = adminService.deleteAdminSession.bind(adminService);
  createPlatformRevenue = adminService.createPlatformRevenue.bind(adminService);
  getPlatformRevenueByDate = adminService.getPlatformRevenueByDate.bind(adminService);
  getPlatformRevenueBySourceWallet = adminService.getPlatformRevenueBySourceWallet.bind(adminService);

  // Config operations
  getLevelConfig = configService.getLevelConfig.bind(configService);
  getAllLevelConfigs = configService.getAllLevelConfigs.bind(configService);
  createOrUpdateLevelConfig = configService.createOrUpdateLevelConfig.bind(configService);
  createTokenPurchase = configService.createTokenPurchase.bind(configService);
  getTokenPurchase = configService.getTokenPurchase.bind(configService);
  getTokenPurchasesByWallet = configService.getTokenPurchasesByWallet.bind(configService);
  updateTokenPurchase = configService.updateTokenPurchase.bind(configService);

  // User Activity operations - implemented directly here
  async getUserActivity(walletAddress: string, limit: number = 50): Promise<Array<{
    id: string;
    type: 'reward' | 'purchase' | 'merchant_nft_claim' | 'token_purchase' | 'membership';
    description: string;
    amount?: string;
    timestamp: Date;
    status?: string;
  }>> {
    const activities = await db
      .select()
      .from(userActivities)
      .where(eq(userActivities.walletAddress, walletAddress))
      .orderBy(desc(userActivities.createdAt))
      .limit(limit);

    return activities.map(activity => ({
      id: activity.id,
      type: activity.activityType as any,
      description: activity.description || activity.title,
      amount: activity.amount?.toString(),
      timestamp: activity.createdAt,
      status: 'completed'
    }));
  }

  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const [newActivity] = await db
      .insert(userActivities)
      .values(activity)
      .returning();
    return newActivity;
  }
}

export const storage = new StorageService();