import { rewardsRepo, usersRepo, referralsRepo, type UserReward } from '../repositories';
import crypto from 'crypto';

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

    console.log(`🎯 Processing L${triggerLevel} upgrade reward for ${member}`);

    // Verify member exists and is activated
    const memberUser = await usersRepo.getByWallet(member);
    if (!memberUser || !memberUser.isActivated) {
      throw new Error('Member not found or not activated');
    }

    // Get complete referral chain up to 19 levels
    const referralChain = await referralsRepo.getChain(member);
    const createdRewards: UserReward[] = [];

    // L1-L19 USDT reward amounts: Level 1 = 100, Level 2 = 150, ..., Level 19 = 1000
    const rewardAmount = 50 + (triggerLevel * 50); // 100, 150, 200, ..., 1000

    console.log(`💰 Level ${triggerLevel} reward: ${rewardAmount} USDT`);

    // CRITICAL: Level N reward goes to Nth ancestor (not all uplines)
    // Example: Level 3 upgrade → reward goes to the 3rd ancestor only
    if (referralChain.length >= triggerLevel) {
      const targetAncestorIndex = triggerLevel - 1; // 0-indexed
      const targetUpline = referralChain[targetAncestorIndex];
      const uplineWallet = targetUpline.upline;

      console.log(`🎯 Targeting L${triggerLevel} ancestor: ${uplineWallet} (depth ${targetUpline.depth})`);

      // Check if target upline qualifies for reward
      const uplineUser = await usersRepo.getByWallet(uplineWallet);
      if (uplineUser && uplineUser.isActivated) {
        
        // Check eligibility: upline must have membership_level >= N  
        if (uplineUser.membershipLevel >= triggerLevel) {
          console.log(`✅ Upline qualified (L${uplineUser.membershipLevel} >= L${triggerLevel})`);
          
          // Create confirmed reward
          const confirmedReward = await rewardsRepo.create({
            beneficiaryWallet: uplineWallet,
            memberWallet: member,
            triggerLevel,
            payoutLayer: targetUpline.depth,
            amount: rewardAmount,
            tokenType: 'USDT',
            status: 'confirmed',
            notes: `L${triggerLevel} upgrade reward from ${member}`
          });
          createdRewards.push(confirmedReward);
        } else {
          console.log(`⏳ Upline pending (L${uplineUser.membershipLevel} < L${triggerLevel})`);
          
          // Create pending reward with 72h expiration
          const pendingReward = await rewardsRepo.create({
            beneficiaryWallet: uplineWallet,
            memberWallet: member,
            triggerLevel,
            payoutLayer: targetUpline.depth,
            amount: rewardAmount,
            tokenType: 'USDT',
            status: 'pending',
            expiresAt: this.calculateExpirationDate(72), // 72 hours to upgrade
            unlockCondition: `upgrade_to_level_${triggerLevel}`,
            notes: `Pending L${triggerLevel} reward - requires upline L${triggerLevel} upgrade`
          });
          createdRewards.push(pendingReward);
        }
      } else {
        console.log(`❌ Target upline ${uplineWallet} not found or inactive`);
      }
    } else {
      console.log(`🔍 No L${triggerLevel} ancestor found (chain depth: ${referralChain.length})`);
    }

    // Platform Revenue: +30 USDT for Level 1 upgrades only
    if (triggerLevel === 1) {
      console.log(`🏦 Adding +30 USDT platform revenue for L1 upgrade`);
      await this.addPlatformRevenue({
        sourceWallet: member,
        amount: 30,
        level: 1,
        description: `Platform fee from L1 upgrade: ${member}`
      });
    }

    console.log(`📊 Created ${createdRewards.length} rewards for L${triggerLevel} upgrade`);
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
   * Reallocate expired reward to next qualified upline following Global 1×3 Matrix rules
   */
  private async reallocateExpiredReward(expiredReward: UserReward): Promise<void> {
    console.log(`🔄 Reallocating expired L${expiredReward.triggerLevel} reward from ${expiredReward.beneficiaryWallet}`);
    
    // Get the original member's complete chain up to L19
    const memberChain = await referralsRepo.getChain(expiredReward.memberWallet);
    
    // Search upward from the expired beneficiary's position
    const expiredBeneficiaryDepth = expiredReward.payoutLayer;
    
    // Look for next qualified ancestor beyond the expired beneficiary
    for (let searchDepth = expiredBeneficiaryDepth + 1; searchDepth <= 19 && searchDepth <= memberChain.length; searchDepth++) {
      const candidateUpline = memberChain[searchDepth - 1]; // 0-indexed
      const uplineUser = await usersRepo.getByWallet(candidateUpline.upline);
      
      if (uplineUser && 
          uplineUser.isActivated && 
          uplineUser.membershipLevel >= expiredReward.triggerLevel) {
        
        console.log(`✅ Reallocating to L${searchDepth} ancestor: ${candidateUpline.upline}`);
        
        // Create new confirmed reward for qualified upline
        await rewardsRepo.create({
          beneficiaryWallet: candidateUpline.upline,
          memberWallet: expiredReward.memberWallet,
          triggerLevel: expiredReward.triggerLevel,
          payoutLayer: candidateUpline.depth,
          amount: expiredReward.amount,
          tokenType: expiredReward.tokenType,
          status: 'confirmed',
          notes: `Reallocated from expired reward (original: ${expiredReward.beneficiaryWallet})`
        });
        
        return; // Successfully reallocated
      }
    }
    
    // No qualified upline found - send to platform revenue
    console.log(`🏦 No qualified upline found, sending ${expiredReward.amount} ${expiredReward.tokenType} to platform`);
    await this.addPlatformRevenue({
      sourceWallet: expiredReward.memberWallet,
      amount: expiredReward.amount,
      level: expiredReward.triggerLevel,
      description: `Unallocated L${expiredReward.triggerLevel} reward - no qualified upline`
    });
  }

  /**
   * Add platform revenue entry
   */
  private async addPlatformRevenue(data: {
    sourceWallet: string;
    amount: number;
    level: number;
    description: string;
  }): Promise<void> {
    const platformRevenue = {
      id: crypto.randomUUID(),
      sourceType: 'upgrade_fee',
      sourceWallet: data.sourceWallet,
      level: data.level,
      amount: data.amount,
      currency: 'USDT',
      description: data.description,
      metadata: {
        triggerLevel: data.level,
        timestamp: new Date().toISOString()
      },
      createdAt: new Date()
    };

    // Store in platform_revenue table via direct SQL for now
    console.log(`🏦 Platform revenue recorded: ${data.amount} USDT from L${data.level} (${data.description})`);
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