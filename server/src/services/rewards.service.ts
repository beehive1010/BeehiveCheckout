import { rewardsRepo, usersRepo, referralsRepo, type UserReward } from '../repositories';

export interface ClaimableReward {
  id: string;
  amount: number;
  tokenType: 'BCC' | 'USDT';
  triggerLevel: number;
  memberWallet: string;
  createdAt: string;
  expiresAt?: string;
}

export interface RewardDistributionRequest {
  memberWallet: string;
  triggerLevel: number;
  upgradeAmount: number;
}

export class RewardsService {
  /**
   * Process reward distribution for level upgrade
   */
  async processLevelUpgradeRewards(request: RewardDistributionRequest): Promise<UserReward[]> {
    const { memberWallet, triggerLevel, upgradeAmount } = request;
    const member = memberWallet.toLowerCase();

    // Verify member exists and is activated
    const memberUser = await usersRepo.getByWallet(member);
    if (!memberUser || !memberUser.isActivated) {
      throw new Error('Member not found or not activated');
    }

    // Get referral chain for reward distribution
    const referralChain = await referralsRepo.getChain(member);
    const createdRewards: UserReward[] = [];

    // Standard reward amounts: 500 BCC + 100 BCC locked
    const baseRewardAmount = 500;
    const lockedRewardAmount = 100;

    // Distribute rewards up the chain
    for (let i = 0; i < Math.min(referralChain.length, 5); i++) {
      const uplineNode = referralChain[i];
      const uplineWallet = uplineNode.upline;
      
      // Check if upline qualifies for reward
      const uplineUser = await usersRepo.getByWallet(uplineWallet);
      if (!uplineUser || !uplineUser.isActivated) {
        continue; // Skip inactive uplines
      }

      // Check if upline has required level for this trigger
      if (uplineUser.membershipLevel < triggerLevel) {
        // Create pending reward that will unlock when they upgrade
        const pendingReward = await rewardsRepo.create({
          beneficiaryWallet: uplineWallet,
          memberWallet: member,
          triggerLevel,
          payoutLayer: uplineNode.depth,
          amount: lockedRewardAmount,
          tokenType: 'BCC',
          status: 'pending',
          expiresAt: this.calculateExpirationDate(72) // 72 hours to upgrade
        });
        createdRewards.push(pendingReward);
      } else {
        // Immediate confirmed reward
        const confirmedReward = await rewardsRepo.create({
          beneficiaryWallet: uplineWallet,
          memberWallet: member,
          triggerLevel,
          payoutLayer: uplineNode.depth,
          amount: i === 0 ? baseRewardAmount : lockedRewardAmount,
          tokenType: 'BCC',
          status: 'confirmed'
        });
        createdRewards.push(confirmedReward);
      }
    }

    return createdRewards;
  }

  /**
   * Get claimable rewards for a user
   */
  async getClaimableRewards(walletAddress: string): Promise<ClaimableReward[]> {
    const wallet = walletAddress.toLowerCase();
    
    const { rewards } = await rewardsRepo.listByBeneficiary(wallet, { 
      status: 'confirmed',
      limit: 100 
    });

    return rewards.map(reward => ({
      id: reward.id,
      amount: reward.amount,
      tokenType: reward.tokenType,
      triggerLevel: reward.triggerLevel,
      memberWallet: reward.memberWallet,
      createdAt: reward.createdAt,
      expiresAt: reward.expiresAt
    }));
  }

  /**
   * Get pending rewards (waiting for level upgrade)
   */
  async getPendingRewards(walletAddress: string): Promise<UserReward[]> {
    const wallet = walletAddress.toLowerCase();
    
    const { rewards } = await rewardsRepo.listByBeneficiary(wallet, { 
      status: 'pending',
      limit: 100 
    });

    return rewards;
  }

  /**
   * Claim a specific reward
   */
  async claimReward(rewardId: string, claimerWallet: string): Promise<{success: boolean, txHash?: string}> {
    const reward = await rewardsRepo.getById(rewardId);
    
    if (!reward) {
      throw new Error('Reward not found');
    }

    if (reward.beneficiaryWallet !== claimerWallet.toLowerCase()) {
      throw new Error('Not authorized to claim this reward');
    }

    if (reward.status !== 'confirmed') {
      throw new Error('Reward is not confirmed and claimable');
    }

    // In real implementation, this would trigger blockchain transaction
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    // Mark as claimed
    await rewardsRepo.setStatus(rewardId, 'claimed');
    await rewardsRepo.markSettled([rewardId], mockTxHash);

    return { success: true, txHash: mockTxHash };
  }

  /**
   * Claim all confirmed rewards for a user
   */
  async claimAllRewards(walletAddress: string): Promise<{success: boolean, txHash?: string, claimedCount: number}> {
    const claimableRewards = await this.getClaimableRewards(walletAddress);
    
    if (claimableRewards.length === 0) {
      throw new Error('No claimable rewards found');
    }

    // In real implementation, this would be a batch blockchain transaction
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    // Mark all as claimed
    const rewardIds = claimableRewards.map(r => r.id);
    await rewardsRepo.markSettled(rewardIds, mockTxHash);

    return { 
      success: true, 
      txHash: mockTxHash, 
      claimedCount: claimableRewards.length 
    };
  }

  /**
   * Process pending reward confirmations (cron job)
   */
  async processPendingRewards(): Promise<{confirmed: number, expired: number}> {
    const now = new Date().toISOString();
    const pendingRewards = await rewardsRepo.listPendingBefore(now, 500);
    
    let confirmed = 0;
    let expired = 0;

    for (const reward of pendingRewards) {
      const beneficiary = await usersRepo.getByWallet(reward.beneficiaryWallet);
      
      if (!beneficiary) {
        continue;
      }

      // Check if beneficiary now qualifies
      if (beneficiary.isActivated && beneficiary.membershipLevel >= reward.triggerLevel) {
        await rewardsRepo.setStatus(reward.id, 'confirmed');
        confirmed++;
      } else if (reward.expiresAt && reward.expiresAt < now) {
        // Reward expired, reallocate upward
        await this.reallocateExpiredReward(reward);
        await rewardsRepo.setStatus(reward.id, 'expired');
        expired++;
      }
    }

    return { confirmed, expired };
  }

  /**
   * Reallocate expired reward to next qualified upline
   */
  private async reallocateExpiredReward(expiredReward: UserReward): Promise<void> {
    const memberChain = await referralsRepo.getChain(expiredReward.memberWallet);
    
    // Find next qualified ancestor above the expired beneficiary
    const expiredBeneficiaryChain = await referralsRepo.getChain(expiredReward.beneficiaryWallet);
    
    for (const uplineNode of expiredBeneficiaryChain) {
      const uplineUser = await usersRepo.getByWallet(uplineNode.upline);
      
      if (uplineUser && 
          uplineUser.isActivated && 
          uplineUser.membershipLevel >= expiredReward.triggerLevel) {
        
        // Create new reward for qualified upline
        await rewardsRepo.create({
          beneficiaryWallet: uplineNode.upline,
          memberWallet: expiredReward.memberWallet,
          triggerLevel: expiredReward.triggerLevel,
          payoutLayer: uplineNode.depth,
          amount: expiredReward.amount,
          tokenType: expiredReward.tokenType,
          status: 'confirmed'
        });
        
        break; // Only reallocate to first qualified upline
      }
    }
  }

  /**
   * Get reward statistics for a user
   */
  async getRewardStats(walletAddress: string): Promise<{
    totalEarnings: number;
    claimableAmount: number;
    pendingAmount: number;
    claimedAmount: number;
    rewardCount: {
      total: number;
      pending: number;
      confirmed: number;
      claimed: number;
      expired: number;
    };
  }> {
    const stats = await rewardsRepo.getStats(walletAddress);
    const claimableRewards = await this.getClaimableRewards(walletAddress);
    const pendingRewards = await this.getPendingRewards(walletAddress);
    
    const claimableAmount = claimableRewards.reduce((sum, reward) => sum + reward.amount, 0);
    const pendingAmount = pendingRewards.reduce((sum, reward) => sum + reward.amount, 0);

    return {
      totalEarnings: stats.totalAmount,
      claimableAmount,
      pendingAmount,
      claimedAmount: stats.claimedAmount,
      rewardCount: {
        total: stats.total,
        pending: stats.pending,
        confirmed: stats.confirmed,
        claimed: stats.claimed,
        expired: stats.expired
      }
    };
  }

  /**
   * Calculate expiration date
   */
  private calculateExpirationDate(hours: number): string {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hours);
    return expiration.toISOString();
  }

  /**
   * Admin function: manually confirm reward
   */
  async manuallyConfirmReward(rewardId: string): Promise<void> {
    await rewardsRepo.setStatus(rewardId, 'confirmed');
  }

  /**
   * Admin function: expire reward manually
   */
  async manuallyExpireReward(rewardId: string): Promise<void> {
    const reward = await rewardsRepo.getById(rewardId);
    if (reward) {
      await this.reallocateExpiredReward(reward);
      await rewardsRepo.setStatus(rewardId, 'expired');
    }
  }
}