// Repository exports
export { ReplitDBAdapter } from '../adapters/replit-db.adapter';
export { UsersRepository, type User } from './users.repository';
export { ReferralsRepository, type ReferralChainNode, type ReferralNode } from './referrals.repository';
export { RewardsRepository, type UserReward } from './rewards.repository';

// Create repository instances
import { ReplitDBAdapter } from '../adapters/replit-db.adapter';
import { UsersRepository } from './users.repository';
import { ReferralsRepository } from './referrals.repository';
import { RewardsRepository } from './rewards.repository';

// Single DB adapter instance
const dbAdapter = new ReplitDBAdapter();

// Repository instances
export const usersRepo = new UsersRepository(dbAdapter);
export const referralsRepo = new ReferralsRepository(dbAdapter);
export const rewardsRepo = new RewardsRepository(dbAdapter);

// Debug endpoint helper
export async function debugKeys(prefix: string, limit: number = 100) {
  return await dbAdapter.debugKeys(prefix, limit);
}