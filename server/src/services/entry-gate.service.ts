import { usersRepo } from '../repositories';
import { db } from '../../db';
import { users, membershipState, referralNodes } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface UserStatusCheck {
  walletAddress: string;
  isRegistered: boolean;
  isReferred: boolean;
  isMembershipActivated: boolean;
  hasLevelOneNFT: boolean;
  currentLevel: number;
  registrationStatus: string;
  referrerWallet?: string;
  routeTo: 'registration' | 'welcome' | 'dashboard';
}

export interface WalletConnectionInput {
  activeWallet: string;
  referrerWallet?: string; // From referral link
}

/**
 * A) Entry & Status Gate Service
 * Handles wallet connection and routing logic
 */
export class EntryGateService {
  
  /**
   * Main entry point: Check wallet status and determine routing
   */
  async onWalletConnect(input: WalletConnectionInput): Promise<UserStatusCheck> {
    const wallet = input.activeWallet.toLowerCase();
    const referrer = input.referrerWallet?.toLowerCase();

    // 1. Check if user is registered
    const [user] = await db.select().from(users).where(eq(users.walletAddress, wallet));
    const isRegistered = !!user;

    // 2. Check if user has valid referral
    let isReferred = false;
    let referrerWallet: string | undefined;
    
    if (referrer) {
      const [referrerUser] = await db.select().from(users).where(eq(users.walletAddress, referrer));
      if (referrerUser && referrerUser.memberActivated) {
        isReferred = true;
        referrerWallet = referrer;
      }
    }

    // 3. Check membership activation status
    let isMembershipActivated = false;
    let hasLevelOneNFT = false;
    let currentLevel = 0;
    
    if (user) {
      isMembershipActivated = user.memberActivated;
      currentLevel = user.currentLevel;
      hasLevelOneNFT = currentLevel >= 1;
    }

    // 4. Determine routing logic
    let routeTo: 'registration' | 'welcome' | 'dashboard';
    
    if (!isRegistered) {
      routeTo = 'registration';
    } else if (isRegistered && !isMembershipActivated) {
      routeTo = 'welcome';
    } else {
      routeTo = 'dashboard';
    }

    return {
      walletAddress: wallet,
      isRegistered,
      isReferred,
      isMembershipActivated,
      hasLevelOneNFT,
      currentLevel,
      registrationStatus: user?.registrationStatus || 'not_started',
      referrerWallet,
      routeTo
    };
  }

  /**
   * Validate referral link and referrer eligibility
   */
  async validateReferrer(referrerWallet: string): Promise<{
    isValid: boolean;
    referrer?: any;
    reason?: string;
  }> {
    const wallet = referrerWallet.toLowerCase();
    
    try {
      const [referrer] = await db.select().from(users).where(eq(users.walletAddress, wallet));
      
      if (!referrer) {
        return { isValid: false, reason: 'Referrer not found' };
      }
      
      if (!referrer.memberActivated) {
        return { isValid: false, reason: 'Referrer not activated' };
      }
      
      if (referrer.currentLevel < 1) {
        return { isValid: false, reason: 'Referrer has no Level 1 NFT' };
      }
      
      return { isValid: true, referrer };
    } catch (error) {
      return { isValid: false, reason: 'Database error' };
    }
  }

  /**
   * Check if wallet has any Level 1+ NFT (for membership verification)
   */
  async checkNFTOwnership(walletAddress: string, level: number = 1): Promise<boolean> {
    // This would integrate with your NFT contract checking logic
    // For now, we'll check the database membership state
    try {
      const [membership] = await db.select()
        .from(membershipState)
        .where(eq(membershipState.walletAddress, walletAddress.toLowerCase()));
      
      return membership?.activeLevel >= level;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's matrix position and referral status
   */
  async getUserMatrixInfo(walletAddress: string): Promise<{
    hasMatrixPosition: boolean;
    sponsorWallet?: string;
    matrixPosition?: number;
    directReferralCount: number;
    totalTeamCount: number;
  }> {
    try {
      const [referralNode] = await db.select()
        .from(referralNodes)
        .where(eq(referralNodes.walletAddress, walletAddress.toLowerCase()));
      
      if (!referralNode) {
        return {
          hasMatrixPosition: false,
          directReferralCount: 0,
          totalTeamCount: 0
        };
      }
      
      return {
        hasMatrixPosition: true,
        sponsorWallet: referralNode.sponsorWallet || undefined,
        matrixPosition: referralNode.matrixPosition,
        directReferralCount: referralNode.directReferralCount,
        totalTeamCount: referralNode.totalTeamCount
      };
    } catch (error) {
      return {
        hasMatrixPosition: false,
        directReferralCount: 0,
        totalTeamCount: 0
      };
    }
  }
}

export const entryGateService = new EntryGateService();