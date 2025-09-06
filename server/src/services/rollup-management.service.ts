import { db } from '../../db';
import { 
  layerRewards, 
  rollUpRecords, 
  memberReferralTree, 
  members,
  pendingUpgradeTimers
} from '@shared/schema';
import { eq, and, lt, gte, sql, desc } from 'drizzle-orm';
import { layerRewardsService } from './layer-rewards.service';

export interface TimerConfiguration {
  pendingTimeout: number;      // Hours before pending reward expires
  upgradeGracePeriod: number;  // Hours after member activation to upgrade
  rollupSearchDepth: number;   // How many layers up to search for qualified recipients
  maxRollupAttempts: number;   // Maximum rollup attempts per reward
}

export interface RollupAnalytics {
  totalExpiredRewards: number;
  successfulRollups: number;
  failedRollups: number;
  platformReallocation: number;
  averageRollupLayer: number;
  rollupEfficiencyRate: number;
}

export interface UpgradeTimer {
  memberWallet: string;
  currentLevel: number;
  targetLevel: number;
  gracePeriodEndsAt: Date;
  pendingRewardCount: number;
  potentialRewardValue: number; // USDT cents
}

/**
 * Rollup and Timeout Management Service
 * Handles reward expiration, rollup logic, and upgrade timers
 */
export class RollupManagementService {

  private defaultConfig: TimerConfiguration = {
    pendingTimeout: 72,        // 72 hours for pending rewards
    upgradeGracePeriod: 168,   // 7 days to upgrade after activation
    rollupSearchDepth: 19,     // Search all layers
    maxRollupAttempts: 3       // Try rollup 3 times max
  };

  /**
   * Main processing function - called by cron job
   * Handles both expired rewards and upgrade timers
   */
  async processAllTimeouts(): Promise<{
    expiredRewards: { rolledUp: number; expired: number };
    upgradeTimers: { processed: number; expired: number };
    analytics: RollupAnalytics;
  }> {
    console.log('🔄 Starting timeout processing...');

    // Process expired pending rewards
    const expiredResults = await this.processExpiredRewards();
    
    // Process upgrade timers
    const timerResults = await this.processUpgradeTimers();
    
    // Generate analytics
    const analytics = await this.generateRollupAnalytics();

    console.log(`✅ Timeout processing complete:`, {
      expiredRewards: expiredResults,
      upgradeTimers: timerResults,
      analytics
    });

    return {
      expiredRewards: expiredResults,
      upgradeTimers: timerResults,
      analytics
    };
  }

  /**
   * Process expired pending rewards with intelligent rollup
   */
  async processExpiredRewards(): Promise<{ rolledUp: number; expired: number }> {
    const now = new Date();
    
    // Get all expired pending rewards
    const expiredRewards = await db
      .select()
      .from(layerRewards)
      .where(and(
        eq(layerRewards.status, 'pending'),
        lt(layerRewards.pendingExpiresAt, now)
      ));

    let rolledUp = 0;
    let expired = 0;

    console.log(`⏰ Processing ${expiredRewards.length} expired pending rewards`);

    for (const reward of expiredRewards) {
      try {
        const rollupResult = await this.attemptIntelligentRollup(reward);
        
        if (rollupResult.success) {
          await this.executeSuccessfulRollup(reward, rollupResult);
          rolledUp++;
          
          console.log(`✅ Rolled up: ${reward.rewardAmountUSDT/100} USDT to ${rollupResult.finalRecipient} (L${rollupResult.finalLayer})`);
        } else {
          await this.handleFailedRollup(reward, rollupResult.reason);
          expired++;
          
          console.log(`❌ Expired: ${reward.rewardAmountUSDT/100} USDT - ${rollupResult.reason}`);
        }
      } catch (error) {
        console.error(`Error processing reward ${reward.id}:`, error);
        expired++;
      }
    }

    return { rolledUp, expired };
  }

  /**
   * Intelligent rollup algorithm
   * Searches for the best qualified recipient using multiple strategies
   */
  private async attemptIntelligentRollup(expiredReward: any): Promise<{
    success: boolean;
    finalRecipient?: string;
    finalLayer?: number;
    rollupPath?: Array<{wallet: string, layer: number, reason: string}>;
    reason?: string;
  }> {
    const { recipientWallet, triggerWallet, triggerLevel, rewardAmountUSDT } = expiredReward;

    // Get all matrices where the trigger member exists
    const triggerPositions = await db
      .select()
      .from(memberReferralTree)
      .where(eq(memberReferralTree.memberWallet, triggerWallet));

    // Strategy 1: Look in same matrix, higher layers
    for (const position of triggerPositions) {
      const sameMatrixResult = await this.searchSameMatrix(
        position.rootWallet,
        position.layer,
        triggerLevel,
        expiredReward
      );
      
      if (sameMatrixResult.success) {
        return sameMatrixResult;
      }
    }

    // Strategy 2: Look in other matrices where trigger member exists
    for (const position of triggerPositions) {
      const crossMatrixResult = await this.searchCrossMatrix(
        position.rootWallet,
        triggerLevel,
        expiredReward
      );
      
      if (crossMatrixResult.success) {
        return crossMatrixResult;
      }
    }

    // Strategy 3: Look for any qualified member in the platform (last resort)
    const globalResult = await this.searchGlobalFallback(triggerLevel, expiredReward);
    
    if (globalResult.success) {
      return globalResult;
    }

    return {
      success: false,
      reason: 'No qualified recipient found after exhaustive search'
    };
  }

  /**
   * Search same matrix for qualified recipient
   */
  private async searchSameMatrix(
    rootWallet: string,
    triggerLayer: number,
    requiredLevel: number,
    expiredReward: any
  ): Promise<{
    success: boolean;
    finalRecipient?: string;
    finalLayer?: number;
    rollupPath?: Array<any>;
  }> {
    // Search upward through layers (closer to root = higher priority)
    for (let searchLayer = triggerLayer - 1; searchLayer >= 1; searchLayer--) {
      const layerMembers = await db
        .select()
        .from(memberReferralTree)
        .where(and(
          eq(memberReferralTree.rootWallet, rootWallet),
          eq(memberReferralTree.layer, searchLayer),
          eq(memberReferralTree.isActivePosition, true)
        ));

      for (const member of layerMembers) {
        const [memberStatus] = await db
          .select()
          .from(members)
          .where(eq(members.walletAddress, member.memberWallet));

        if (memberStatus?.isActivated && memberStatus.currentLevel >= requiredLevel) {
          return {
            success: true,
            finalRecipient: member.memberWallet,
            finalLayer: searchLayer,
            rollupPath: [{
              wallet: expiredReward.recipientWallet,
              layer: 'expired',
              reason: 'timeout'
            }, {
              wallet: member.memberWallet,
              layer: searchLayer,
              reason: 'qualified_upline'
            }]
          };
        }
      }
    }

    // Check root wallet
    const [rootMember] = await db
      .select()
      .from(members)
      .where(eq(members.walletAddress, rootWallet));

    if (rootMember?.isActivated && rootMember.currentLevel >= requiredLevel) {
      return {
        success: true,
        finalRecipient: rootWallet,
        finalLayer: 0,
        rollupPath: [{
          wallet: expiredReward.recipientWallet,
          layer: 'expired',
          reason: 'timeout'
        }, {
          wallet: rootWallet,
          layer: 0,
          reason: 'qualified_root'
        }]
      };
    }

    return { success: false };
  }

  /**
   * Search other matrices for qualified recipients
   */
  private async searchCrossMatrix(
    excludeRootWallet: string,
    requiredLevel: number,
    expiredReward: any
  ): Promise<{ success: boolean; finalRecipient?: string; finalLayer?: number; rollupPath?: Array<any> }> {
    // Get qualified members from other matrices
    const qualifiedMembers = await db
      .select()
      .from(members)
      .where(and(
        eq(members.isActivated, true),
        gte(members.currentLevel, requiredLevel)
      ))
      .limit(10); // Limit to prevent excessive queries

    for (const qualifiedMember of qualifiedMembers) {
      // Skip if it's the same matrix root we already checked
      if (qualifiedMember.walletAddress === excludeRootWallet) continue;

      // Find their position in their own matrix
      const [memberPosition] = await db
        .select()
        .from(memberReferralTree)
        .where(and(
          eq(memberReferralTree.memberWallet, qualifiedMember.walletAddress),
          eq(memberReferralTree.rootWallet, qualifiedMember.walletAddress)
        ));

      if (memberPosition) {
        return {
          success: true,
          finalRecipient: qualifiedMember.walletAddress,
          finalLayer: 0, // They are root of their own matrix
          rollupPath: [{
            wallet: expiredReward.recipientWallet,
            layer: 'expired',
            reason: 'timeout'
          }, {
            wallet: qualifiedMember.walletAddress,
            layer: 0,
            reason: 'cross_matrix_qualified'
          }]
        };
      }
    }

    return { success: false };
  }

  /**
   * Global fallback search (platform-wide)
   */
  private async searchGlobalFallback(
    requiredLevel: number,
    expiredReward: any
  ): Promise<{ success: boolean; finalRecipient?: string; finalLayer?: number; rollupPath?: Array<any> }> {
    // Find any qualified member in the entire platform
    const [anyQualifiedMember] = await db
      .select()
      .from(members)
      .where(and(
        eq(members.isActivated, true),
        gte(members.currentLevel, requiredLevel)
      ))
      .orderBy(desc(members.currentLevel), desc(members.totalTeamSize))
      .limit(1);

    if (anyQualifiedMember) {
      return {
        success: true,
        finalRecipient: anyQualifiedMember.walletAddress,
        finalLayer: -1, // Special indicator for global fallback
        rollupPath: [{
          wallet: expiredReward.recipientWallet,
          layer: 'expired',
          reason: 'timeout'
        }, {
          wallet: anyQualifiedMember.walletAddress,
          layer: -1,
          reason: 'global_fallback'
        }]
      };
    }

    return { success: false };
  }

  /**
   * Execute successful rollup
   */
  private async executeSuccessfulRollup(originalReward: any, rollupResult: any): Promise<void> {
    // Create rollup record
    await db
      .insert(rollUpRecords)
      .values({
        originalRecipient: originalReward.recipientWallet,
        finalRecipient: rollupResult.finalRecipient,
        triggerWallet: originalReward.triggerWallet,
        triggerLevel: originalReward.triggerLevel,
        rewardAmountUSDT: originalReward.rewardAmountUSDT,
        rollupReason: 'pending_expired',
        rollupPath: rollupResult.rollupPath,
        rollupLayer: rollupResult.finalLayer,
        processedAt: new Date()
      });

    // Mark original as rolled up
    await db
      .update(layerRewards)
      .set({
        status: 'rollup',
        rollupToWallet: rollupResult.finalRecipient,
        rolledUpAt: new Date()
      })
      .where(eq(layerRewards.id, originalReward.id));

    // Create new claimable reward for final recipient
    await db
      .insert(layerRewards)
      .values({
        recipientWallet: rollupResult.finalRecipient,
        triggerWallet: originalReward.triggerWallet,
        triggerLevel: originalReward.triggerLevel,
        layerNumber: rollupResult.finalLayer,
        rewardAmountUSDT: originalReward.rewardAmountUSDT,
        requiresLevel: originalReward.triggerLevel,
        currentRecipientLevel: rollupResult.finalLayer,
        status: 'claimable',
        pendingExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours to claim
        rollupFromRewardId: originalReward.id
      });
  }

  /**
   * Handle failed rollup (send to platform)
   */
  private async handleFailedRollup(originalReward: any, reason: string): Promise<void> {
    // Create rollup record showing failure
    await db
      .insert(rollUpRecords)
      .values({
        originalRecipient: originalReward.recipientWallet,
        finalRecipient: 'platform',
        triggerWallet: originalReward.triggerWallet,
        triggerLevel: originalReward.triggerLevel,
        rewardAmountUSDT: originalReward.rewardAmountUSDT,
        rollupReason: 'no_qualified_recipient',
        rollupPath: [{ wallet: 'platform', layer: -1, reason }],
        rollupLayer: -1,
        processedAt: new Date()
      });

    // Mark original as expired
    await db
      .update(layerRewards)
      .set({
        status: 'rollup',
        rollupToWallet: 'platform',
        rolledUpAt: new Date()
      })
      .where(eq(layerRewards.id, originalReward.id));
  }

  /**
   * Process upgrade timers
   */
  async processUpgradeTimers(): Promise<{ processed: number; expired: number }> {
    const now = new Date();
    
    // Get expired upgrade timers
    const expiredTimers = await db
      .select()
      .from(pendingUpgradeTimers)
      .where(and(
        eq(pendingUpgradeTimers.status, 'active'),
        lt(pendingUpgradeTimers.expiresAt, now)
      ));

    let processed = 0;
    let expired = 0;

    for (const timer of expiredTimers) {
      try {
        // Check if member upgraded in time
        const [member] = await db
          .select()
          .from(members)
          .where(eq(members.walletAddress, timer.memberWallet));

        if (member && member.currentLevel >= timer.targetLevel) {
          // Member upgraded successfully
          await db
            .update(pendingUpgradeTimers)
            .set({
              status: 'completed',
              completedAt: now
            })
            .where(eq(pendingUpgradeTimers.id, timer.id));
          
          processed++;
        } else {
          // Member failed to upgrade - expire their pending rewards
          await this.expireMemberPendingRewards(timer.memberWallet);
          
          await db
            .update(pendingUpgradeTimers)
            .set({
              status: 'expired',
              expiredAt: now
            })
            .where(eq(pendingUpgradeTimers.id, timer.id));
          
          expired++;
        }
      } catch (error) {
        console.error(`Error processing upgrade timer for ${timer.memberWallet}:`, error);
        expired++;
      }
    }

    return { processed, expired };
  }

  /**
   * Expire all pending rewards for a member who failed to upgrade
   */
  private async expireMemberPendingRewards(memberWallet: string): Promise<void> {
    const pendingRewards = await db
      .select()
      .from(layerRewards)
      .where(and(
        eq(layerRewards.recipientWallet, memberWallet),
        eq(layerRewards.status, 'pending')
      ));

    for (const reward of pendingRewards) {
      // Try to rollup each reward
      const rollupResult = await this.attemptIntelligentRollup(reward);
      
      if (rollupResult.success) {
        await this.executeSuccessfulRollup(reward, rollupResult);
      } else {
        await this.handleFailedRollup(reward, 'member_upgrade_timeout');
      }
    }

    console.log(`⏰ Expired ${pendingRewards.length} pending rewards for ${memberWallet} due to upgrade timeout`);
  }

  /**
   * Generate rollup analytics
   */
  async generateRollupAnalytics(): Promise<RollupAnalytics> {
    // Get rollup statistics from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const rollupRecords = await db
      .select()
      .from(rollUpRecords)
      .where(gte(rollUpRecords.processedAt, thirtyDaysAgo));

    const totalExpiredRewards = rollupRecords.length;
    const successfulRollups = rollupRecords.filter(r => r.finalRecipient !== 'platform').length;
    const failedRollups = rollupRecords.filter(r => r.finalRecipient === 'platform').length;
    const platformReallocation = rollupRecords
      .filter(r => r.finalRecipient === 'platform')
      .reduce((sum, r) => sum + r.rewardAmountUSDT, 0) / 100;

    const validRollups = rollupRecords.filter(r => r.rollupLayer >= 0);
    const averageRollupLayer = validRollups.length > 0 
      ? validRollups.reduce((sum, r) => sum + r.rollupLayer, 0) / validRollups.length 
      : 0;

    const rollupEfficiencyRate = totalExpiredRewards > 0 
      ? (successfulRollups / totalExpiredRewards) * 100 
      : 0;

    return {
      totalExpiredRewards,
      successfulRollups,
      failedRollups,
      platformReallocation,
      averageRollupLayer,
      rollupEfficiencyRate
    };
  }

  /**
   * Create upgrade timer for a member
   */
  async createUpgradeTimer(
    memberWallet: string,
    currentLevel: number,
    targetLevel: number,
    gracePeriodHours: number = 168
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);

    await db
      .insert(pendingUpgradeTimers)
      .values({
        memberWallet: memberWallet.toLowerCase(),
        currentLevel,
        targetLevel,
        status: 'active',
        createdAt: new Date(),
        expiresAt
      });

    console.log(`⏲️  Created upgrade timer: ${memberWallet} has ${gracePeriodHours}h to upgrade L${currentLevel}→L${targetLevel}`);
  }

  /**
   * Get active upgrade timers for a member
   */
  async getUpgradeTimers(memberWallet: string): Promise<UpgradeTimer[]> {
    const timers = await db
      .select()
      .from(pendingUpgradeTimers)
      .where(and(
        eq(pendingUpgradeTimers.memberWallet, memberWallet.toLowerCase()),
        eq(pendingUpgradeTimers.status, 'active')
      ));

    const results: UpgradeTimer[] = [];
    
    for (const timer of timers) {
      // Count pending rewards for this member
      const [pendingCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(layerRewards)
        .where(and(
          eq(layerRewards.recipientWallet, memberWallet.toLowerCase()),
          eq(layerRewards.status, 'pending')
        ));

      // Calculate potential reward value
      const [rewardValue] = await db
        .select({ value: sql<number>`COALESCE(sum(${layerRewards.rewardAmountUSDT}), 0)` })
        .from(layerRewards)
        .where(and(
          eq(layerRewards.recipientWallet, memberWallet.toLowerCase()),
          eq(layerRewards.status, 'pending')
        ));

      results.push({
        memberWallet: timer.memberWallet,
        currentLevel: timer.currentLevel,
        targetLevel: timer.targetLevel,
        gracePeriodEndsAt: timer.expiresAt,
        pendingRewardCount: pendingCount?.count || 0,
        potentialRewardValue: rewardValue?.value || 0
      });
    }

    return results;
  }
}

export const rollupManagementService = new RollupManagementService();