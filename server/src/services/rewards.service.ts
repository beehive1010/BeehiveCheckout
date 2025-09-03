import { usersRepo, referralsRepo } from '../repositories';
import { RewardsPostgreSQLRepository, type UserReward } from '../repositories/rewards-pg.repository';
import { db } from '../../db';
import { adminSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Use PostgreSQL-based rewards repository
const rewardsRepo = new RewardsPostgreSQLRepository();

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

export interface PendingRewardInfo {
  id: string;
  amount: number;
  tokenType: 'USDT';
  requiresLevel: number;
  unlockCondition: string;
  expiresAt: Date;
  hoursLeft: number;
  recipientWallet: string;
  sourceWallet: string;
  triggerLevel: number;
}

export class RewardsService {
  
  /**
   * Get admin setting for pending timeout hours
   */
  private async getPendingTimeoutHours(): Promise<number> {
    const [setting] = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, 'reward_pending_timeout_hours'));
    
    return setting ? parseInt(setting.settingValue) : 72; // Default 72 hours
  }

  /**
   * Get reward amount for specific layer
   */
  private async getRewardAmount(layer: number): Promise<number> {
    if (layer === 1) {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, 'layer1_reward_amount'));
      return setting ? parseInt(setting.settingValue) : 100;
    } else if (layer === 2) {
      const [setting] = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, 'layer2_reward_amount'));
      return setting ? parseInt(setting.settingValue) : 150;
    }
    
    // For other layers: Level 1 = 100, Level 2 = 150, Level 3 = 200, etc.
    return 50 + (layer * 50);
  }

  /**
   * Process reward distribution for level upgrade with pending logic
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

    console.log(`📊 Referral chain length: ${referralChain.length}`);

    // CRITICAL: Level N reward goes to Nth ancestor only
    if (referralChain.length >= triggerLevel) {
      const targetAncestorIndex = triggerLevel - 1; // 0-indexed
      const targetUpline = referralChain[targetAncestorIndex];
      const uplineWallet = targetUpline.upline;

      console.log(`🎯 Targeting L${triggerLevel} ancestor: ${uplineWallet} (depth ${targetUpline.depth})`);

      // Check if target upline qualifies for reward
      const uplineUser = await usersRepo.getByWallet(uplineWallet);
      if (uplineUser && uplineUser.isActivated) {
        
        const rewardAmount = await this.getRewardAmount(triggerLevel);
        console.log(`💰 Level ${triggerLevel} reward: ${rewardAmount} USDT`);

        // NEW LOGIC: Check pending requirements
        const requiresUpgrade = this.checkRequiresUpgrade(triggerLevel, uplineUser.membershipLevel);
        
        if (requiresUpgrade.isPending) {
          console.log(`⏳ Creating pending reward - upline needs L${requiresUpgrade.requiredLevel}`);
          
          // Create pending reward with countdown timer
          const timeoutHours = await this.getPendingTimeoutHours();
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + timeoutHours);
          
          const pendingReward = await rewardsRepo.create({
            recipientWallet: uplineWallet,
            sourceWallet: member,
            triggerLevel,
            payoutLayer: targetUpline.depth,
            rewardAmount: rewardAmount,
            status: 'pending',
            requiresLevel: requiresUpgrade.requiredLevel,
            expiresAt: expiresAt,
            notes: `L${triggerLevel} upgrade reward - pending until upline upgrades to L${requiresUpgrade.requiredLevel}`
          });

          createdRewards.push(pendingReward);
          console.log(`✅ Pending reward created: ${pendingReward.id} (expires in ${timeoutHours}h)`);
          
        } else {
          console.log(`✅ Upline qualified (L${uplineUser.membershipLevel} >= L${triggerLevel})`);
          
          // Create confirmed reward
          const confirmedReward = await rewardsRepo.create({
            recipientWallet: uplineWallet,
            sourceWallet: member,
            triggerLevel,
            payoutLayer: targetUpline.depth,
            rewardAmount: rewardAmount,
            status: 'confirmed',
            notes: `L${triggerLevel} upgrade reward - confirmed`
          });

          createdRewards.push(confirmedReward);
          console.log(`✅ Confirmed reward created: ${confirmedReward.id}`);
        }
      } else {
        console.log(`❌ Upline ${uplineWallet} not qualified (not activated)`);
      }
    } else {
      console.log(`❌ No upline at L${triggerLevel} depth (chain length: ${referralChain.length})`);
    }

    return createdRewards;
  }

  /**
   * Check if reward should be pending based on upline membership level
   */
  private checkRequiresUpgrade(triggerLevel: number, uplineMembershipLevel: number): {
    isPending: boolean;
    requiredLevel: number;
  } {
    // Layer 1 rewards: require upline to have level 2+
    if (triggerLevel === 1 && uplineMembershipLevel < 2) {
      return { isPending: true, requiredLevel: 2 };
    }
    
    // Layer 2 rewards: require upline to have level 2+
    if (triggerLevel === 2 && uplineMembershipLevel < 2) {
      return { isPending: true, requiredLevel: 2 };
    }
    
    // For other layers: require upline to have at least the trigger level
    if (uplineMembershipLevel < triggerLevel) {
      return { isPending: true, requiredLevel: triggerLevel };
    }
    
    return { isPending: false, requiredLevel: 0 };
  }

  /**
   * Get pending rewards for a user
   */
  async getPendingRewards(walletAddress: string): Promise<PendingRewardInfo[]> {
    const rewards = await rewardsRepo.getUserRewards(walletAddress.toLowerCase());
    const pendingRewards = rewards.filter(r => r.status === 'pending' && r.expiresAt);
    
    return pendingRewards.map(reward => {
      const now = new Date();
      const expiresAt = reward.expiresAt!;
      const hoursLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
      
      return {
        id: reward.id,
        amount: reward.rewardAmount,
        tokenType: 'USDT' as const,
        requiresLevel: reward.requiresLevel || 2,
        unlockCondition: `Upgrade to Level ${reward.requiresLevel || 2}`,
        expiresAt: expiresAt,
        hoursLeft: hoursLeft,
        recipientWallet: reward.recipientWallet,
        sourceWallet: reward.sourceWallet,
        triggerLevel: reward.triggerLevel
      };
    });
  }

  /**
   * Process upgrade event - check if any pending rewards can be confirmed
   */
  async processMemberUpgrade(walletAddress: string, newLevel: number): Promise<UserReward[]> {
    console.log(`🚀 Processing member upgrade: ${walletAddress} to L${newLevel}`);
    
    const pendingRewards = await this.getPendingRewards(walletAddress);
    const confirmedRewards: UserReward[] = [];
    
    for (const pending of pendingRewards) {
      if (newLevel >= pending.requiresLevel) {
        console.log(`✅ Confirming pending reward ${pending.id}`);
        
        const confirmed = await rewardsRepo.updateStatus(pending.id, 'confirmed');
        if (confirmed) {
          confirmedRewards.push(confirmed);
        }
      }
    }
    
    console.log(`🎉 Confirmed ${confirmedRewards.length} pending rewards`);
    return confirmedRewards;
  }

  /**
   * Expire old pending rewards (called by cron)
   */
  async expirePendingRewards(): Promise<number> {
    console.log('🕒 Running cron: Expiring old pending rewards');
    
    const now = new Date();
    const expiredCount = await rewardsRepo.expireOldRewards(now);
    
    console.log(`⏰ Expired ${expiredCount} pending rewards`);
    return expiredCount;
  }

  /**
   * Get user reward summary
   */
  async getUserRewardSummary(walletAddress: string): Promise<{
    claimableRewards: ClaimableReward[];
    pendingRewards: PendingRewardInfo[];
    totalClaimable: number;
    totalPending: number;
  }> {
    const rewards = await rewardsRepo.getUserRewards(walletAddress.toLowerCase());
    
    const claimableRewards: ClaimableReward[] = rewards
      .filter(r => r.status === 'confirmed')
      .map(r => ({
        id: r.id,
        amount: r.rewardAmount,
        tokenType: 'USDT' as const,
        triggerLevel: r.triggerLevel,
        memberWallet: r.sourceWallet,
        createdAt: r.createdAt.toISOString()
      }));
    
    const pendingRewards = await this.getPendingRewards(walletAddress);
    
    const totalClaimable = claimableRewards.reduce((sum, r) => sum + r.amount, 0);
    const totalPending = pendingRewards.reduce((sum, r) => sum + r.amount, 0);
    
    return {
      claimableRewards,
      pendingRewards,
      totalClaimable,
      totalPending
    };
  }

  /**
   * Claim rewards
   */
  async claimRewards(walletAddress: string, rewardIds: string[]): Promise<number> {
    let totalClaimed = 0;
    
    for (const rewardId of rewardIds) {
      const claimed = await rewardsRepo.claimReward(rewardId, walletAddress.toLowerCase());
      if (claimed) {
        totalClaimed += claimed.rewardAmount;
      }
    }
    
    console.log(`🎉 Claimed ${totalClaimed} USDT in rewards`);
    return totalClaimed;
  }
}

export const rewardsService = new RewardsService();