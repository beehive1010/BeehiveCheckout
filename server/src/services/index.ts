// Legacy service exports for backwards compatibility
export { UsersService, type CreateUserRequest, type UserProfile } from './users.service';
export { ReferralsService, type ReferralStats } from './referrals.service';
export { RewardsService, type ClaimableReward, type RewardDistributionRequest } from './rewards.service';

// New modular service exports
export * from './user.service';
export * from './member.service';
export * from './wallet.service';
export * from './referral.service';
export * from './reward.service';
export * from './nft.service';
export * from './course.service';
export * from './admin.service';
export * from './config.service';
export * from './notifications.service';

// Legacy service instances
import { UsersService } from './users.service';
import { ReferralsService } from './referrals.service';
import { RewardsService } from './rewards.service';

export const usersService = new UsersService();
export const referralsService = new ReferralsService();
export const rewardsService = new RewardsService();

// New service instances
import { userService } from './user.service';
import { memberService } from './member.service';
import { walletService } from './wallet.service';
import { referralService } from './referral.service';
import { rewardService } from './reward.service';
import { nftService } from './nft.service';
import { courseService } from './course.service';
import { adminService } from './admin.service';
import { configService } from './config.service';

// Export service instances for easy access
export {
  userService,
  memberService,
  walletService,
  referralService,
  rewardService,
  nftService,
  courseService,
  adminService,
  configService
};