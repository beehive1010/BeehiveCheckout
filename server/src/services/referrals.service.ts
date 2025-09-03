import { usersRepo, type ReferralChainNode } from '../repositories';
import { ReferralsPostgreSQLRepository, type ReferralStats as PgReferralStats } from '../repositories/referrals-pg.repository';

// Use PostgreSQL-based referrals repository instead of ReplitDB
const referralsRepo = new ReferralsPostgreSQLRepository();

export interface ReferralStats {
  directReferralCount: number;
  totalTeamCount: number;
  downlineMatrix: Array<{
    level: number;
    members: number;
    upgraded: number;
    placements: number;
  }>;
}

export class ReferralsService {
  /**
   * Place user in 1x3 matrix under their referrer
   */
  async placeUserInMatrix(childWallet: string, referrerWallet: string): Promise<void> {
    const child = childWallet.toLowerCase();
    const referrer = referrerWallet.toLowerCase();

    // Verify both users exist
    const [childUser, referrerUser] = await Promise.all([
      usersRepo.getByWallet(child),
      usersRepo.getByWallet(referrer)
    ]);

    if (!childUser) {
      throw new Error('Child user not found');
    }
    if (!referrerUser) {
      throw new Error('Referrer user not found');
    }

    // Check if user is already placed
    const existingChain = await referralsRepo.getChain(child);
    if (existingChain.length > 0) {
      throw new Error('User already placed in matrix');
    }

    // Find available slot under referrer
    const availableSlot = await referralsRepo.findNextAvailableSlot(referrer);
    
    if (!availableSlot) {
      // Referrer's direct level is full, need to find spillover placement
      await this.placeWithSpillover(child, referrer);
    } else {
      // Place directly under referrer
      await this.placeDirectly(child, referrer, availableSlot.slot);
    }
  }

  /**
   * Place user directly under referrer in available slot
   */
  private async placeDirectly(childWallet: string, referrerWallet: string, slot: 'left' | 'middle' | 'right'): Promise<void> {
    // Build complete referral chain
    const referrerChain = await referralsRepo.getChain(referrerWallet);
    const childChain: ReferralChainNode[] = [
      // Direct connection to referrer
      { upline: referrerWallet, depth: 1, slot },
      // Add all of referrer's uplines with incremented depth
      ...referrerChain.map(node => ({
        upline: node.upline,
        depth: node.depth + 1,
        slot: node.slot
      }))
    ];

    await referralsRepo.setChain(childWallet, childChain);
  }

  /**
   * Place user with spillover when referrer's direct level is full
   */
  private async placeWithSpillover(childWallet: string, originalReferrer: string): Promise<void> {
    // In 1x3 matrix spillover, find the next available position in the downline
    const directReferrals = await referralsRepo.getDirectReferrals(originalReferrer);
    
    // Try to place under each direct referral
    for (const directChild of directReferrals) {
      const availableSlot = await referralsRepo.findNextAvailableSlot(directChild);
      if (availableSlot) {
        await this.placeDirectly(childWallet, directChild, availableSlot.slot);
        return;
      }
    }

    // If all direct slots are full, go to next level
    const secondLevelReferrals = await referralsRepo.getReferralsAtDepth(originalReferrer, 2);
    for (const secondLevelChild of secondLevelReferrals) {
      const availableSlot = await referralsRepo.findNextAvailableSlot(secondLevelChild);
      if (availableSlot) {
        await this.placeDirectly(childWallet, secondLevelChild, availableSlot.slot);
        return;
      }
    }

    throw new Error('No available matrix positions found in spillover');
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(walletAddress: string): Promise<ReferralStats> {
    const wallet = walletAddress.toLowerCase();
    
    // Get basic referral counts from PostgreSQL
    const pgStats = await referralsRepo.getReferralStats(wallet);
    const stats = {
      directCount: pgStats.directCount,
      totalCount: pgStats.totalCount,
      byDepth: pgStats.byDepth
    };
    
    // Build downline matrix view (levels 1-19)
    const downlineMatrix: Array<{
      level: number;
      members: number;
      upgraded: number;
      placements: number;
    }> = [];

    for (let level = 1; level <= 19; level++) {
      const referralsAtLevel = await referralsRepo.getReferralsAtDepth(wallet, level);
      let upgradedCount = 0;

      // Count how many at this level are activated/upgraded
      for (const referralWallet of referralsAtLevel) {
        const user = await usersRepo.getByWallet(referralWallet);
        if (user && user.isActivated && user.membershipLevel >= level) {
          upgradedCount++;
        }
      }

      downlineMatrix.push({
        level,
        members: referralsAtLevel.length,
        upgraded: upgradedCount,
        placements: referralsAtLevel.length // Same as members in this simplified model
      });
    }

    return {
      directReferralCount: stats.directCount,
      totalTeamCount: stats.totalCount,
      downlineMatrix
    };
  }

  /**
   * Get referral chain for a user (upline hierarchy)
   */
  async getReferralChain(walletAddress: string): Promise<ReferralChainNode[]> {
    return await referralsRepo.getChain(walletAddress);
  }

  /**
   * Get all referrals for a user at specific depth
   */
  async getReferralsAtLevel(walletAddress: string, level: number): Promise<string[]> {
    return await referralsRepo.getReferralsAtDepth(walletAddress, level);
  }

  /**
   * Get direct referrals with user details
   */
  async getDirectReferralsWithDetails(walletAddress: string): Promise<Array<{
    wallet: string;
    username?: string;
    membershipLevel: number;
    isActivated: boolean;
    joinedAt: string;
  }>> {
    const directReferrals = await referralsRepo.getDirectReferrals(walletAddress);
    const referralDetails = [];

    for (const referralWallet of directReferrals) {
      const user = await usersRepo.getByWallet(referralWallet);
      if (user) {
        referralDetails.push({
          wallet: user.walletAddress,
          username: user.username,
          membershipLevel: user.membershipLevel,
          isActivated: user.isActivated,
          joinedAt: user.createdAt
        });
      }
    }

    return referralDetails;
  }

  /**
   * Calculate matrix rewards for level upgrades
   */
  async calculateMatrixRewards(memberWallet: string, newLevel: number): Promise<Array<{
    beneficiaryWallet: string;
    amount: number;
    layer: number;
  }>> {
    const rewards = [];
    const chain = await referralsRepo.getChain(memberWallet);

    // Standard BCC rewards: 500 BCC + 100 BCC locked per level upgrade
    const baseReward = 500;
    const lockedReward = 100;

    // Distribute rewards up the chain (simplified model)
    for (let i = 0; i < Math.min(chain.length, 5); i++) {
      const uplineNode = chain[i];
      const uplineUser = await usersRepo.getByWallet(uplineNode.upline);
      
      // Only reward if upline is activated and has required level
      if (uplineUser && uplineUser.isActivated && uplineUser.membershipLevel >= newLevel) {
        rewards.push({
          beneficiaryWallet: uplineNode.upline,
          amount: i === 0 ? baseReward : lockedReward, // Direct sponsor gets base, others get locked
          layer: uplineNode.depth
        });
      }
    }

    return rewards;
  }

  /**
   * Remove user from matrix (admin function)
   */
  async removeFromMatrix(walletAddress: string): Promise<void> {
    await referralsRepo.removeReferral(walletAddress);
  }

  /**
   * Validate matrix integrity (admin/debug function)
   */
  async validateMatrixIntegrity(walletAddress: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const chain = await referralsRepo.getChain(walletAddress);

    // Check chain continuity
    for (let i = 0; i < chain.length - 1; i++) {
      const currentNode = chain[i];
      const nextNode = chain[i + 1];
      
      if (nextNode.depth !== currentNode.depth + 1) {
        issues.push(`Depth gap between layer ${currentNode.depth} and ${nextNode.depth}`);
      }
    }

    // Check if all uplines exist
    for (const node of chain) {
      const uplineExists = await usersRepo.exists(node.upline);
      if (!uplineExists) {
        issues.push(`Upline ${node.upline} at depth ${node.depth} does not exist`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}