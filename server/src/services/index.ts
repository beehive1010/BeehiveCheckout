// Service exports
export { UsersService, type CreateUserRequest, type UserProfile } from './users.service';
export { ReferralsService, type ReferralStats } from './referrals.service';
export { RewardsService, type ClaimableReward, type RewardDistributionRequest } from './rewards.service';

// Service instances
import { UsersService } from './users.service';
import { ReferralsService } from './referrals.service';
import { RewardsService } from './rewards.service';

export const usersService = new UsersService();
export const referralsService = new ReferralsService();
export const rewardsService = new RewardsService();