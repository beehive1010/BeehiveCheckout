import { db } from '../../db';
import { users, userBalances, platformRevenue, members } from '@shared/schema';
import { matrixPlacementService } from './matrix-placement.service';
import { rewardDistributionService } from './reward-distribution.service';
import { eq } from 'drizzle-orm';

export interface RegistrationInput {
  walletAddress: string;
  username: string;
  email: string;
  referrerWallet?: string;
  secondaryPassword?: string;
}

export interface ActivationInput {
  walletAddress: string;
  level: number;
  txHash: string;
  tokenId?: number;
}

/**
 * B) Registration → Activation Service
 * Handles user registration and Level 1 NFT claiming
 */
export class RegistrationService {

  /**
   * Edge function: on-register
   * Create users row with status: registered
   */
  async registerUser(input: RegistrationInput): Promise<{
    success: boolean;
    user?: any;
    message: string;
  }> {
    const wallet = input.walletAddress.toLowerCase();
    
    try {
      // Check if user already exists
      const [existingUser] = await db.select().from(users).where(eq(users.walletAddress, wallet));
      if (existingUser) {
        return { success: false, message: 'User already registered' };
      }

      // Validate referrer if provided
      let referrerWallet: string | undefined;
      if (input.referrerWallet) {
        const [referrer] = await db.select().from(users).where(eq(users.walletAddress, input.referrerWallet.toLowerCase()));
        if (referrer && referrer.memberActivated) {
          referrerWallet = input.referrerWallet.toLowerCase();
        }
      }

      // Create user record
      const now = new Date();
      const [newUser] = await db.insert(users).values({
        walletAddress: wallet,
        username: input.username,
        email: input.email,
        secondaryPasswordHash: input.secondaryPassword ? this.hashPassword(input.secondaryPassword) : undefined,
        referrerWallet,
        registrationStatus: 'completed',
        registeredAt: now,
        createdAt: now,
        lastUpdatedAt: now,
        memberActivated: false,
        currentLevel: 0
      }).returning();

      // Initialize member state
      await db.insert(members).values({
        walletAddress: wallet,
        isActivated: false,
        currentLevel: 0,
        maxLayer: 0,
        levelsOwned: [],
        hasPendingRewards: false,
        upgradeReminderEnabled: false,
        totalDirectReferrals: 0,
        totalTeamSize: 0,
        createdAt: now,
        updatedAt: now
      });

      // Initialize user balance
      await db.insert(userBalances).values({
        walletAddress: wallet,
        bccTransferable: 500, // Default 500 BCC for new users
        bccRestricted: 0,
        bccLocked: 0,
        totalUsdtEarned: 0,
        availableUsdtRewards: 0,
        totalUsdtWithdrawn: 0,
        cthBalance: 0,
        lastUpdated: now
      });

      console.log(`✅ User registered: ${wallet} with referrer: ${referrerWallet || 'none'}`);

      return {
        success: true,
        user: newUser,
        message: 'User registered successfully'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  /**
   * Edge function: on-claim-membership (Level 1 = activation)
   * Handles L1 NFT claiming and matrix placement
   */
  async activateMembership(input: ActivationInput): Promise<{
    success: boolean;
    message: string;
    matrixPosition?: any;
    rewards?: {
      ancestorReward?: number;
      platformRevenue?: number;
    };
  }> {
    const wallet = input.walletAddress.toLowerCase();
    
    try {
      // 1. Verify user exists and is not already activated
      const [user] = await db.select().from(users).where(eq(users.walletAddress, wallet));
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      if (user.memberActivated) {
        return { success: false, message: 'User already activated' };
      }

      // 2. Activate membership (users.membership_level ≥ 1)
      const now = new Date();
      await db.update(users)
        .set({
          memberActivated: true,
          currentLevel: Math.max(input.level, 1),
          activationAt: now,
          lastUpdatedAt: now
        })
        .where(eq(users.walletAddress, wallet));

      // Update member state
      await db.update(members)
        .set({
          isActivated: true,
          activatedAt: now,
          currentLevel: input.level,
          levelsOwned: [input.level],
          lastUpgradeAt: now,
          updatedAt: now
        })
        .where(eq(members.walletAddress, wallet));

      // 3. Matrix placement under referrer
      let matrixPosition;
      if (user.referrerWallet) {
        matrixPosition = await matrixPlacementService.placeInMatrix(wallet, user.referrerWallet);
        console.log(`📍 Matrix placement: ${wallet} → Layer ${matrixPosition.layer} ${matrixPosition.position} (${matrixPosition.placementType})`);
      }

      // 4. Reward distribution
      const rewards = await this.distributeActivationRewards(wallet, input.level, input.txHash);

      console.log(`🎉 Membership activated: ${wallet} at Level ${input.level}`);

      return {
        success: true,
        message: `Level ${input.level} membership activated successfully`,
        matrixPosition,
        rewards
      };
    } catch (error) {
      console.error('Activation error:', error);
      return { success: false, message: 'Activation failed' };
    }
  }

  /**
   * Distribute rewards for new Level 1 activation
   */
  private async distributeActivationRewards(memberWallet: string, level: number, txHash: string): Promise<{
    ancestorReward?: number;
    platformRevenue?: number;
  }> {
    try {
      const rewards: any = {};

      // Get the member's placement info to find direct upline
      const [user] = await db.select().from(users).where(eq(users.walletAddress, memberWallet));
      let ancestor = null;
      
      if (user?.referrerWallet) {
        // Get placement position to find direct upline (parent)
        const placement = await matrixPlacementService.getMatrixPosition(memberWallet, user.referrerWallet);
        if (placement && placement.parentWallet) {
          ancestor = { walletAddress: placement.parentWallet };
        }
      }
      
      if (ancestor) {
        // Pay 100 USDT to 1st ancestor
        const rewardAmount = 100;
        await rewardDistributionService.distributeReward({
          recipientWallet: ancestor.walletAddress,
          sourceWallet: memberWallet,
          triggerLevel: level,
          rewardAmount,
          rewardType: 'activation',
          txHash
        });
        rewards.ancestorReward = rewardAmount;
        
        console.log(`💰 Ancestor reward: ${rewardAmount} USDT → ${ancestor.walletAddress}`);
      }

      // Platform revenue (Level 1 only)
      if (level === 1) {
        const platformAmount = 30;
        await rewardDistributionService.recordPlatformRevenue({
          sourceWallet: memberWallet,
          level: level,
          amount: platformAmount,
          revenueType: 'nft_claim',
          txHash,
          notes: `Level ${level} activation platform revenue`
        });
        rewards.platformRevenue = platformAmount;
        
        console.log(`🏢 Platform revenue: ${platformAmount} USDT`);
      }

      return rewards;
    } catch (error) {
      console.error('Reward distribution error:', error);
      return {};
    }
  }

  /**
   * Simple password hashing (use bcrypt in production)
   */
  private hashPassword(password: string): string {
    // This is a simplified hash - use bcrypt or similar in production
    return Buffer.from(password).toString('base64');
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const [existingUser] = await db.select().from(users).where(eq(users.username, username));
      return !existingUser;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get registration status for a wallet
   */
  async getRegistrationStatus(walletAddress: string): Promise<{
    isRegistered: boolean;
    registrationStatus: string;
    user?: any;
  }> {
    try {
      const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress.toLowerCase()));
      
      return {
        isRegistered: !!user,
        registrationStatus: user?.registrationStatus || 'not_started',
        user
      };
    } catch (error) {
      return {
        isRegistered: false,
        registrationStatus: 'not_started'
      };
    }
  }
}

export const registrationService = new RegistrationService();