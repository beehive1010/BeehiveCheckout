import { db } from '../../db';
import { 
  layerRewards, 
  rollUpRecords, 
  memberReferralTree, 
  members, 
  users, 
  userBalances,
  levelConfig 
} from '@shared/schema';
import { eq, and, sql, desc, asc, lt, gte } from 'drizzle-orm';
import { matrixPlacementService } from './matrix-placement.service';
import { NFTLevelConfigService } from './nft-level-config.service';

export interface LayerRewardTrigger {
  memberWallet: string;
  triggerLevel: number;
  upgradeAmount: number; // USDT cents
}

export interface LayerRewardDistribution {
  recipientWallet: string;
  triggerWallet: string;
  triggerLevel: number;
  layerNumber: number;
  rewardAmountUSDT: number; // USDT cents
  requiresLevel: number;
  status: 'pending' | 'claimable' | 'rollup' | 'claimed';
  pendingExpiresAt: Date;
}

export interface RollupResult {
  originalRecipient: string;
  finalRecipient: string;
  layerRolledTo: number;
  reason: 'pending_expired' | 'level_insufficient';
}

/**
 * Layer-based Rewards Service for New Matrix System
 * Handles reward distribution according to memberReferralTree structure
 */
export class LayerRewardsService {

  /**
   * Process NFT level upgrade rewards using ERC5115 configuration
   */
  async processNFTLevelUpgrade(data: {
    memberWallet: string;
    fromLevel: number;
    toLevel: number;
    upgradeAmountUSDT: number;
    tokenId: number;
  }): Promise<{ distributedRewards: LayerRewardDistribution[]; totalDistributed: number }> {
    console.log(`🎯 Processing NFT Level ${data.toLevel} upgrade rewards:`, data);

    const distributedRewards: LayerRewardDistribution[] = [];
    let totalDistributed = 0;

    try {
      // Get level configuration
      const levelConfig = NFTLevelConfigService.getLevelConfig(data.toLevel);
      if (!levelConfig) {
        throw new Error(`Invalid level configuration for level ${data.toLevel}`);
      }

      // Get member's matrix position across all trees
      const memberPositions = await db
        .select()
        .from(memberReferralTree)
        .where(eq(memberReferralTree.memberWallet, data.memberWallet.toLowerCase()));

      console.log(`📊 Member is in ${memberPositions.length} matrix positions`);

      // Process rewards for each matrix position
      for (const position of memberPositions) {
        const uplineRewards = await this.calculateUplineRewards({
          rootWallet: position.rootWallet,
          triggerWallet: data.memberWallet,
          triggerLevel: data.toLevel,
          upgradeAmount: data.upgradeAmountUSDT,
          maxLayers: 19 // All 19 layers for comprehensive reward distribution
        });

        console.log(`💰 Calculated ${uplineRewards.length} upline rewards for root ${position.rootWallet}`);

        // Filter rewards based on recipient's NFT level
        for (const reward of uplineRewards) {
          const recipientMember = await db
            .select()
            .from(members)
            .where(eq(members.walletAddress, reward.recipientWallet))
            .limit(1);

          const recipientLevel = recipientMember[0]?.currentLevel || 0;
          
          // Check if recipient can receive rewards from this layer
          if (NFTLevelConfigService.canReceiveLayerRewards(recipientLevel, reward.layerNumber)) {
            // Calculate actual reward amount based on recipient's level
            const actualRewardAmount = NFTLevelConfigService.calculateLayerRewardPercentage(
              recipientLevel,
              reward.layerNumber,
              reward.rewardAmountUSDT
            );

            if (actualRewardAmount > 0) {
              const rewardRecord = await this.createLayerReward({
                ...reward,
                rewardAmountUSDT: actualRewardAmount,
                requiresLevel: recipientLevel // They already have required level
              });

              distributedRewards.push(reward);
              totalDistributed += actualRewardAmount;

              console.log(`✅ Reward created: ${actualRewardAmount} USDT for ${reward.recipientWallet} (Level ${recipientLevel}, Layer ${reward.layerNumber})`);
            }
          } else {
            console.log(`⏭️ Skipping reward for ${reward.recipientWallet} - Level ${recipientLevel} cannot claim Layer ${reward.layerNumber} rewards`);
          }
        }
      }

      // Special case: Level 19 upgrade gets 100% reward to root
      if (data.toLevel === 19) {
        await this.processLevel19MasterReward(data);
      }

      console.log(`🎉 NFT Level ${data.toLevel} upgrade processing complete: ${distributedRewards.length} rewards, ${totalDistributed} USDT total`);
      
      return { distributedRewards, totalDistributed };

    } catch (error) {
      console.error(`❌ Error processing NFT level ${data.toLevel} upgrade:`, error);
      throw error;
    }
  }

  /**
   * Process Level 19 master reward (100% to root)
   */
  private async processLevel19MasterReward(data: {
    memberWallet: string;
    upgradeAmountUSDT: number;
    tokenId: number;
  }): Promise<void> {
    console.log(`👑 Processing Level 19 master reward: ${data.upgradeAmountUSDT} USDT`);

    try {
      // Find all matrices this member is in
      const memberPositions = await db
        .select()
        .from(memberReferralTree)
        .where(eq(memberReferralTree.memberWallet, data.memberWallet.toLowerCase()));

      for (const position of memberPositions) {
        // Check if root member has Level 19
        const rootMember = await db
          .select()
          .from(members)
          .where(eq(members.walletAddress, position.rootWallet))
          .limit(1);

        const rootLevel = rootMember[0]?.currentLevel || 0;
        
        if (rootLevel >= 19) {
          // Root gets 100% of the 1000 USDT
          await this.createLayerReward({
            recipientWallet: position.rootWallet,
            triggerWallet: data.memberWallet,
            triggerLevel: 19,
            layerNumber: 19,
            rewardAmountUSDT: data.upgradeAmountUSDT, // Full 1000 USDT
            requiresLevel: 19,
            status: 'claimable', // Immediately claimable for Level 19 holders
            pendingExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours
          });

          console.log(`👑 Level 19 master reward: ${data.upgradeAmountUSDT} USDT → ${position.rootWallet}`);
        }
      }
    } catch (error) {
      console.error('❌ Error processing Level 19 master reward:', error);
      throw error;
    }
  }

  /**
   * Process rewards when a member upgrades to a new level
   * Distributes rewards to all 19 layers in their matrices
   */
  async processLevelUpgradeRewards(trigger: LayerRewardTrigger): Promise<LayerRewardDistribution[]> {
    const { memberWallet, triggerLevel, upgradeAmount } = trigger;
    const member = memberWallet.toLowerCase();

    console.log(`🎯 Processing Layer Rewards for L${triggerLevel} upgrade: ${member}`);

    // Get level configuration for reward amount
    const [levelConfig] = await db
      .select()
      .from(levelConfig)
      .where(eq(levelConfig.level, triggerLevel));

    if (!levelConfig) {
      throw new Error(`Level ${triggerLevel} configuration not found`);
    }

    const rewardAmount = levelConfig.rewardAmountUSDT; // USDT cents
    const createdRewards: LayerRewardDistribution[] = [];

    // Find all matrices where this member exists and distribute rewards
    const memberMatrices = await db
      .selectDistinct({ rootWallet: memberReferralTree.rootWallet })
      .from(memberReferralTree)
      .where(eq(memberReferralTree.memberWallet, member));

    console.log(`💰 Distributing L${triggerLevel} rewards (${rewardAmount/100} USDT) across ${memberMatrices.length} matrices`);

    for (const matrix of memberMatrices) {
      const matrixRewards = await this.processMatrixRewards(
        member,
        matrix.rootWallet,
        triggerLevel,
        rewardAmount
      );
      createdRewards.push(...matrixRewards);
    }

    // Update member's activation status if this was their first activation
    if (triggerLevel === 1) {
      await this.activateMember(member);
    }

    console.log(`✅ Created ${createdRewards.length} layer rewards for L${triggerLevel} upgrade`);
    return createdRewards;
  }

  /**
   * Process rewards for a specific matrix
   * Distributes rewards up to 19 layers for qualifying uplines
   */
  private async processMatrixRewards(
    triggerMember: string,
    rootWallet: string,
    triggerLevel: number,
    rewardAmount: number
  ): Promise<LayerRewardDistribution[]> {
    const rewards: LayerRewardDistribution[] = [];

    // Get the trigger member's position in this matrix
    const [memberPosition] = await db
      .select()
      .from(memberReferralTree)
      .where(and(
        eq(memberReferralTree.memberWallet, triggerMember),
        eq(memberReferralTree.rootWallet, rootWallet)
      ));

    if (!memberPosition) {
      console.log(`⚠️ Member ${triggerMember} not found in matrix ${rootWallet}`);
      return rewards;
    }

    // Calculate rewards for each layer above this member
    const memberLayer = memberPosition.layer;
    
    // Distribute rewards to layers above (closer to root)
    for (let targetLayer = 1; targetLayer < memberLayer && targetLayer <= 19; targetLayer++) {
      const layerReward = await this.calculateLayerReward(
        rootWallet,
        targetLayer,
        triggerMember,
        triggerLevel,
        rewardAmount,
        memberLayer - targetLayer // Layer distance
      );

      if (layerReward) {
        rewards.push(layerReward);
      }
    }

    // Also consider root wallet if trigger member is not the root
    if (rootWallet !== triggerMember) {
      const rootReward = await this.calculateRootReward(
        rootWallet,
        triggerMember,
        triggerLevel,
        rewardAmount,
        memberLayer
      );

      if (rootReward) {
        rewards.push(rootReward);
      }
    }

    return rewards;
  }

  /**
   * Calculate reward for a specific layer
   */
  private async calculateLayerReward(
    rootWallet: string,
    targetLayer: number,
    triggerMember: string,
    triggerLevel: number,
    rewardAmount: number,
    layerDistance: number
  ): Promise<LayerRewardDistribution | null> {
    // Get members in the target layer
    const layerMembers = await db
      .select()
      .from(memberReferralTree)
      .where(and(
        eq(memberReferralTree.rootWallet, rootWallet),
        eq(memberReferralTree.layer, targetLayer),
        eq(memberReferralTree.isActivePosition, true)
      ));

    if (layerMembers.length === 0) {
      return null;
    }

    // For simplicity, distribute to the first qualified member in this layer
    // In a real implementation, you might want more sophisticated logic
    for (const layerMember of layerMembers) {
      const recipientWallet = layerMember.memberWallet;
      
      // Get recipient's member status
      const [recipient] = await db
        .select()
        .from(members)
        .where(eq(members.walletAddress, recipientWallet));

      if (!recipient || !recipient.isActivated) {
        continue;
      }

      // Check if recipient qualifies for this level reward
      const requiresLevel = triggerLevel;
      const currentRecipientLevel = recipient.currentLevel;
      
      // Calculate reward amount based on layer distance
      const layerRewardAmount = Math.floor(rewardAmount / Math.pow(2, layerDistance - 1));
      
      if (currentRecipientLevel >= requiresLevel) {
        // Create claimable reward
        const reward = await this.createLayerReward({
          recipientWallet,
          triggerWallet: triggerMember,
          triggerLevel,
          layerNumber: targetLayer,
          rewardAmountUSDT: layerRewardAmount,
          requiresLevel,
          status: 'claimable',
          currentRecipientLevel
        });

        return reward;
      } else {
        // Create pending reward with 72-hour timeout
        const expirationDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
        
        const reward = await this.createLayerReward({
          recipientWallet,
          triggerWallet: triggerMember,
          triggerLevel,
          layerNumber: targetLayer,
          rewardAmountUSDT: layerRewardAmount,
          requiresLevel,
          status: 'pending',
          currentRecipientLevel,
          pendingExpiresAt: expirationDate
        });

        return reward;
      }
    }

    return null;
  }

  /**
   * Calculate reward for root wallet
   */
  private async calculateRootReward(
    rootWallet: string,
    triggerMember: string,
    triggerLevel: number,
    rewardAmount: number,
    memberLayer: number
  ): Promise<LayerRewardDistribution | null> {
    // Get root member status
    const [rootMember] = await db
      .select()
      .from(members)
      .where(eq(members.walletAddress, rootWallet));

    if (!rootMember || !rootMember.isActivated) {
      return null;
    }

    const requiresLevel = triggerLevel;
    const currentRootLevel = rootMember.currentLevel;
    
    // Root gets full reward amount
    const rootRewardAmount = rewardAmount;

    if (currentRootLevel >= requiresLevel) {
      return await this.createLayerReward({
        recipientWallet: rootWallet,
        triggerWallet: triggerMember,
        triggerLevel,
        layerNumber: 0, // Root layer
        rewardAmountUSDT: rootRewardAmount,
        requiresLevel,
        status: 'claimable',
        currentRecipientLevel: currentRootLevel
      });
    } else {
      const expirationDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
      
      return await this.createLayerReward({
        recipientWallet: rootWallet,
        triggerWallet: triggerMember,
        triggerLevel,
        layerNumber: 0,
        rewardAmountUSDT: rootRewardAmount,
        requiresLevel,
        status: 'pending',
        currentRecipientLevel: currentRootLevel,
        pendingExpiresAt: expirationDate
      });
    }
  }

  /**
   * Create a layer reward record
   */
  private async createLayerReward(params: {
    recipientWallet: string;
    triggerWallet: string;
    triggerLevel: number;
    layerNumber: number;
    rewardAmountUSDT: number;
    requiresLevel: number;
    status: 'pending' | 'claimable' | 'rollup' | 'claimed';
    currentRecipientLevel: number;
    pendingExpiresAt?: Date;
  }): Promise<LayerRewardDistribution> {
    const [reward] = await db
      .insert(layerRewards)
      .values({
        recipientWallet: params.recipientWallet,
        triggerWallet: params.triggerWallet,
        triggerLevel: params.triggerLevel,
        layerNumber: params.layerNumber,
        rewardAmountUSDT: params.rewardAmountUSDT,
        requiresLevel: params.requiresLevel,
        currentRecipientLevel: params.currentRecipientLevel,
        status: params.status,
        pendingExpiresAt: params.pendingExpiresAt || new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdAt: new Date()
      })
      .returning();

    console.log(`💎 Created ${params.status} reward: ${params.rewardAmountUSDT/100} USDT for ${params.recipientWallet} (L${params.layerNumber})`);

    return {
      recipientWallet: params.recipientWallet,
      triggerWallet: params.triggerWallet,
      triggerLevel: params.triggerLevel,
      layerNumber: params.layerNumber,
      rewardAmountUSDT: params.rewardAmountUSDT,
      requiresLevel: params.requiresLevel,
      status: params.status,
      pendingExpiresAt: params.pendingExpiresAt || new Date(Date.now() + 72 * 60 * 60 * 1000)
    };
  }

  /**
   * Get claimable rewards for a wallet
   */
  async getClaimableRewards(walletAddress: string): Promise<any[]> {
    const wallet = walletAddress.toLowerCase();

    const claimableRewards = await db
      .select()
      .from(layerRewards)
      .where(and(
        eq(layerRewards.recipientWallet, wallet),
        eq(layerRewards.status, 'claimable')
      ))
      .orderBy(desc(layerRewards.createdAt));

    return claimableRewards.map(reward => ({
      id: reward.id,
      rewardAmount: reward.rewardAmountUSDT / 100, // Convert cents to dollars
      triggerLevel: reward.triggerLevel,
      layerNumber: reward.layerNumber,
      triggerWallet: reward.triggerWallet,
      status: 'claimable',
      createdAt: reward.createdAt.toISOString()
    }));
  }

  /**
   * Get pending rewards for a wallet
   */
  async getPendingRewards(walletAddress: string): Promise<any[]> {
    const wallet = walletAddress.toLowerCase();

    const pendingRewards = await db
      .select()
      .from(layerRewards)
      .where(and(
        eq(layerRewards.recipientWallet, wallet),
        eq(layerRewards.status, 'pending'),
        gte(layerRewards.pendingExpiresAt, new Date())
      ))
      .orderBy(asc(layerRewards.pendingExpiresAt));

    return pendingRewards.map(reward => ({
      id: reward.id,
      rewardAmount: reward.rewardAmountUSDT / 100,
      triggerLevel: reward.triggerLevel,
      layerNumber: reward.layerNumber,
      triggerWallet: reward.triggerWallet,
      requiresLevel: reward.requiresLevel,
      currentRecipientLevel: reward.currentRecipientLevel,
      status: 'pending',
      expiresAt: reward.pendingExpiresAt.toISOString(),
      unlockCondition: `Upgrade to Level ${reward.requiresLevel}`,
      timeRemaining: this.calculateTimeRemaining(reward.pendingExpiresAt),
      createdAt: reward.createdAt.toISOString()
    }));
  }

  /**
   * Claim a specific reward
   */
  async claimReward(rewardId: string, claimerWallet: string): Promise<{
    success: boolean;
    amountClaimed: number;
    txHash?: string;
  }> {
    const wallet = claimerWallet.toLowerCase();

    // Get the reward
    const [reward] = await db
      .select()
      .from(layerRewards)
      .where(eq(layerRewards.id, rewardId));

    if (!reward) {
      throw new Error('Reward not found');
    }

    if (reward.recipientWallet !== wallet) {
      throw new Error('Not authorized to claim this reward');
    }

    if (reward.status !== 'claimable') {
      throw new Error(`Reward status is ${reward.status}, not claimable`);
    }

    // Update reward status
    await db
      .update(layerRewards)
      .set({
        status: 'claimed',
        claimedAt: new Date()
      })
      .where(eq(layerRewards.id, rewardId));

    // Add to user balance
    await this.addToUserBalance(wallet, reward.rewardAmountUSDT);

    const amountInDollars = reward.rewardAmountUSDT / 100;
    console.log(`✅ Reward claimed: ${amountInDollars} USDT by ${wallet}`);

    return {
      success: true,
      amountClaimed: amountInDollars,
      txHash: `reward_claim_${Date.now()}`
    };
  }

  /**
   * Process expired pending rewards (rollup logic)
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

    for (const reward of expiredRewards) {
      const rollupResult = await this.rollupExpiredReward(reward);
      
      if (rollupResult) {
        rolledUp++;
      } else {
        // Mark as expired if no rollup possible
        await db
          .update(layerRewards)
          .set({
            status: 'rollup',
            rolledUpAt: now
          })
          .where(eq(layerRewards.id, reward.id));
        expired++;
      }
    }

    console.log(`⏰ Processed expired rewards: ${rolledUp} rolled up, ${expired} expired`);
    return { rolledUp, expired };
  }

  /**
   * Rollup expired reward to next qualified upline
   */
  private async rollupExpiredReward(expiredReward: any): Promise<RollupResult | null> {
    const { recipientWallet, triggerWallet, rewardAmountUSDT, triggerLevel, layerNumber } = expiredReward;

    // Find the matrix where this reward originated
    const matrixPositions = await db
      .select()
      .from(memberReferralTree)
      .where(eq(memberReferralTree.memberWallet, triggerWallet));

    for (const position of matrixPositions) {
      const rootWallet = position.rootWallet;
      
      // Look for qualified recipients in layers closer to root
      for (let searchLayer = layerNumber - 1; searchLayer >= 1; searchLayer--) {
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

          if (memberStatus?.isActivated && memberStatus.currentLevel >= triggerLevel) {
            // Found qualified recipient - create rollup record and new reward
            await this.executeRollup(expiredReward, member.memberWallet, searchLayer);
            
            return {
              originalRecipient: recipientWallet,
              finalRecipient: member.memberWallet,
              layerRolledTo: searchLayer,
              reason: 'level_insufficient'
            };
          }
        }
      }

      // Check root wallet
      const [rootMember] = await db
        .select()
        .from(members)
        .where(eq(members.walletAddress, rootWallet));

      if (rootMember?.isActivated && rootMember.currentLevel >= triggerLevel) {
        await this.executeRollup(expiredReward, rootWallet, 0);
        
        return {
          originalRecipient: recipientWallet,
          finalRecipient: rootWallet,
          layerRolledTo: 0,
          reason: 'level_insufficient'
        };
      }
    }

    return null; // No qualified recipient found
  }

  /**
   * Execute rollup to new recipient
   */
  private async executeRollup(originalReward: any, newRecipient: string, newLayer: number): Promise<void> {
    // Create rollup record
    await db
      .insert(rollUpRecords)
      .values({
        originalRecipient: originalReward.recipientWallet,
        finalRecipient: newRecipient,
        triggerWallet: originalReward.triggerWallet,
        triggerLevel: originalReward.triggerLevel,
        rewardAmountUSDT: originalReward.rewardAmountUSDT,
        rollupReason: 'pending_expired',
        rollupPath: [{
          wallet: originalReward.recipientWallet,
          level: originalReward.currentRecipientLevel,
          reason: 'expired'
        }, {
          wallet: newRecipient,
          level: newLayer,
          reason: 'qualified'
        }],
        rollupLayer: newLayer,
        processedAt: new Date()
      });

    // Mark original as rolled up
    await db
      .update(layerRewards)
      .set({
        status: 'rollup',
        rollupToWallet: newRecipient,
        rolledUpAt: new Date()
      })
      .where(eq(layerRewards.id, originalReward.id));

    // Create new claimable reward for recipient
    await db
      .insert(layerRewards)
      .values({
        recipientWallet: newRecipient,
        triggerWallet: originalReward.triggerWallet,
        triggerLevel: originalReward.triggerLevel,
        layerNumber: newLayer,
        rewardAmountUSDT: originalReward.rewardAmountUSDT,
        requiresLevel: originalReward.triggerLevel,
        currentRecipientLevel: newLayer,
        status: 'claimable',
        pendingExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours to claim
      });

    console.log(`🔄 Rolled up reward: ${originalReward.rewardAmountUSDT/100} USDT from ${originalReward.recipientWallet} to ${newRecipient}`);
  }

  /**
   * Activate member when they first upgrade
   */
  private async activateMember(walletAddress: string): Promise<void> {
    const wallet = walletAddress.toLowerCase();

    // Update member activation status
    await db
      .update(members)
      .set({
        isActivated: true,
        activatedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(members.walletAddress, wallet));

    // Update matrix positions to show member as activated
    await db
      .update(memberReferralTree)
      .set({
        memberActivated: true,
        activatedAt: new Date()
      })
      .where(eq(memberReferralTree.memberWallet, wallet));

    console.log(`🎉 Member activated: ${wallet}`);
  }

  /**
   * Add reward to user balance
   */
  private async addToUserBalance(walletAddress: string, amountCents: number): Promise<void> {
    const wallet = walletAddress.toLowerCase();

    // Check if balance record exists
    const [existingBalance] = await db
      .select()
      .from(userBalances)
      .where(eq(userBalances.walletAddress, wallet));

    if (existingBalance) {
      // Update existing balance
      await db
        .update(userBalances)
        .set({
          totalUsdtEarned: existingBalance.totalUsdtEarned + amountCents,
          availableUsdtRewards: existingBalance.availableUsdtRewards + amountCents,
          lastUpdated: new Date()
        })
        .where(eq(userBalances.walletAddress, wallet));
    } else {
      // Create new balance record
      await db
        .insert(userBalances)
        .values({
          walletAddress: wallet,
          bccTransferable: 500, // Initial BCC
          bccRestricted: 0,
          bccLocked: 0,
          totalUsdtEarned: amountCents,
          availableUsdtRewards: amountCents,
          totalUsdtWithdrawn: 0,
          activationTier: 1,
          activationOrder: 1,
          cthBalance: 0,
          lastUpdated: new Date(),
          createdAt: new Date()
        });
    }

    console.log(`💰 Added ${amountCents/100} USDT to ${wallet} balance`);
  }

  /**
   * Calculate time remaining until expiration
   */
  private calculateTimeRemaining(expiresAt: Date): string {
    const now = new Date();
    const timeLeft = expiresAt.getTime() - now.getTime();
    
    if (timeLeft <= 0) {
      return 'Expired';
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  /**
   * Get reward history for a wallet
   */
  async getRewardHistory(walletAddress: string, limit: number = 50): Promise<any[]> {
    const wallet = walletAddress.toLowerCase();

    const rewards = await db
      .select()
      .from(layerRewards)
      .where(eq(layerRewards.recipientWallet, wallet))
      .orderBy(desc(layerRewards.createdAt))
      .limit(limit);

    return rewards.map(reward => ({
      id: reward.id,
      amount: reward.rewardAmountUSDT / 100,
      triggerLevel: reward.triggerLevel,
      layerNumber: reward.layerNumber,
      triggerWallet: reward.triggerWallet,
      status: reward.status,
      createdAt: reward.createdAt.toISOString(),
      claimedAt: reward.claimedAt?.toISOString(),
      expiresAt: reward.pendingExpiresAt?.toISOString()
    }));
  }
}

export const layerRewardsService = new LayerRewardsService();