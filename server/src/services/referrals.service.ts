import { db } from '../../db';
import { referrals, users, members } from '@shared/schema';
import { matrixPlacementService } from './matrix-placement.service';
import { eq, and } from 'drizzle-orm';

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

export interface ReferralChainNode {
  upline: string;
  depth: number;
  slot: 'L' | 'M' | 'R';
}

export class ReferralsService {
  /**
   * Place user in 3×3 matrix under their referrer
   * Delegates to the matrix placement service
   */
  async placeUserInMatrix(childWallet: string, referrerWallet: string): Promise<void> {
    try {
      const placement = await matrixPlacementService.placeInMatrix(childWallet, referrerWallet);
      console.log(`✅ Matrix placement successful: ${childWallet} → Layer ${placement.layer} ${placement.position}`);
    } catch (error) {
      console.error('Matrix placement failed:', error);
      throw error;
    }
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(walletAddress: string): Promise<ReferralStats> {
    const wallet = walletAddress.toLowerCase();
    
    try {
      // Get team statistics from matrix placement service
      const teamStats = await matrixPlacementService.getTeamStats(wallet);
      
      // Build downline matrix view (levels 1-19)
      const downlineMatrix: Array<{
        level: number;
        members: number;
        upgraded: number;
        placements: number;
      }> = [];

      for (let level = 1; level <= 19; level++) {
        const levelMembers = await matrixPlacementService.getLayerMembers(wallet, level);
        let upgradedCount = 0;

        // Count how many at this level are activated/upgraded
        for (const member of levelMembers) {
          const [user] = await db.select().from(users).where(eq(users.walletAddress, member.memberWallet));
          if (user && user.memberActivated && user.currentLevel >= level) {
            upgradedCount++;
          }
        }

        const memberCount = levelMembers.length;
        downlineMatrix.push({
          level,
          members: memberCount,
          upgraded: upgradedCount,
          placements: memberCount // Same as members in matrix system
        });
      }

      return {
        directReferralCount: teamStats.directReferrals,
        totalTeamCount: teamStats.totalTeamSize,
        downlineMatrix
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return {
        directReferralCount: 0,
        totalTeamCount: 0,
        downlineMatrix: []
      };
    }
  }

  /**
   * Get referral chain for a user (upline hierarchy)
   * Returns chain of uplines up to 19 levels
   */
  async getReferralChain(walletAddress: string): Promise<ReferralChainNode[]> {
    const wallet = walletAddress.toLowerCase();
    const chain: ReferralChainNode[] = [];

    try {
      // Get all referral records for this user across different roots
      const userReferrals = await db
        .select()
        .from(referrals)
        .where(eq(referrals.memberWallet, wallet));

      // For each placement, build upline chain
      for (const referral of userReferrals) {
        // Get this user's position
        const position = await matrixPlacementService.getMatrixPosition(wallet, referral.rootWallet);
        if (position) {
          // Build chain by traversing up the tree
          let currentParent = position.parentWallet;
          let depth = 1;

          while (currentParent && depth <= 19) {
            const parentPosition = await matrixPlacementService.getMatrixPosition(currentParent, referral.rootWallet);
            
            chain.push({
              upline: currentParent,
              depth: depth,
              slot: parentPosition ? parentPosition.position : 'L'
            });

            if (parentPosition && parentPosition.parentWallet && parentPosition.parentWallet !== referral.rootWallet) {
              currentParent = parentPosition.parentWallet;
              depth++;
            } else {
              // Reached root
              if (currentParent !== referral.rootWallet) {
                chain.push({
                  upline: referral.rootWallet,
                  depth: depth + 1,
                  slot: 'L' // Root position
                });
              }
              break;
            }
          }
          break; // Use the first (primary) referral chain
        }
      }

      return chain;
    } catch (error) {
      console.error('Error getting referral chain:', error);
      return [];
    }
  }

  /**
   * Get all referrals for a user at specific depth
   */
  async getReferralsAtLevel(walletAddress: string, level: number): Promise<string[]> {
    try {
      const levelMembers = await matrixPlacementService.getLayerMembers(walletAddress, level);
      return levelMembers.map(member => member.memberWallet);
    } catch (error) {
      console.error('Error getting referrals at level:', error);
      return [];
    }
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
    try {
      const directReferrals = await this.getReferralsAtLevel(walletAddress, 1);
      const referralDetails = [];

      for (const referralWallet of directReferrals) {
        const [user] = await db.select().from(users).where(eq(users.walletAddress, referralWallet));
        if (user) {
          referralDetails.push({
            wallet: user.walletAddress,
            username: user.username || undefined,
            membershipLevel: user.currentLevel || 0,
            isActivated: user.memberActivated || false,
            joinedAt: user.createdAt?.toISOString() || new Date().toISOString()
          });
        }
      }

      return referralDetails;
    } catch (error) {
      console.error('Error getting direct referrals with details:', error);
      return [];
    }
  }

  /**
   * Calculate matrix rewards for level upgrades
   * Uses the standard BeeHive reward structure
   */
  async calculateMatrixRewards(memberWallet: string, newLevel: number): Promise<Array<{
    beneficiaryWallet: string;
    amount: number;
    layer: number;
  }>> {
    const rewards = [];
    
    try {
      const chain = await this.getReferralChain(memberWallet);

      // Standard BCC rewards: Different amounts per layer
      const rewardStructure = {
        1: 500,  // Direct upline gets 500 BCC
        2: 300,  // Layer 2 gets 300 BCC
        3: 200,  // Layer 3 gets 200 BCC
        4: 100,  // Layer 4 gets 100 BCC
        5: 100   // Layer 5 gets 100 BCC
      };

      // Distribute rewards up the chain (up to 5 layers)
      for (let i = 0; i < Math.min(chain.length, 5); i++) {
        const uplineNode = chain[i];
        const [uplineUser] = await db.select().from(users).where(eq(users.walletAddress, uplineNode.upline));
        
        // Only reward if upline is activated and has required level
        if (uplineUser && uplineUser.memberActivated && (uplineUser.currentLevel || 0) >= newLevel) {
          const layer = uplineNode.depth;
          const amount = rewardStructure[layer as keyof typeof rewardStructure] || 50;
          
          rewards.push({
            beneficiaryWallet: uplineNode.upline,
            amount,
            layer
          });
        }
      }

      return rewards;
    } catch (error) {
      console.error('Error calculating matrix rewards:', error);
      return [];
    }
  }

  /**
   * Get matrix tree structure for visualization
   */
  async getMatrixTree(walletAddress: string, maxLayers: number = 5): Promise<any> {
    try {
      return await matrixPlacementService.getMatrixTree(walletAddress, maxLayers);
    } catch (error) {
      console.error('Error getting matrix tree:', error);
      return { root: walletAddress, layers: {} };
    }
  }

  /**
   * Remove user from matrix (admin function)
   */
  async removeFromMatrix(walletAddress: string): Promise<void> {
    try {
      await db.delete(referrals).where(eq(referrals.memberWallet, walletAddress.toLowerCase()));
      console.log(`🗑️ Removed ${walletAddress} from all matrices`);
    } catch (error) {
      console.error('Error removing from matrix:', error);
      throw error;
    }
  }

  /**
   * Validate matrix integrity (admin/debug function)
   */
  async validateMatrixIntegrity(walletAddress: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      // Get all referral records for this user
      const userReferrals = await db
        .select()
        .from(referrals)
        .where(eq(referrals.memberWallet, walletAddress.toLowerCase()));

      // Check for duplicate placements in same matrix
      const matrixPlacements = new Map<string, number>();
      for (const referral of userReferrals) {
        const key = `${referral.rootWallet}-${referral.layer}-${referral.position}`;
        if (matrixPlacements.has(key)) {
          issues.push(`Duplicate placement: ${key}`);
        }
        matrixPlacements.set(key, 1);
      }

      // Check if parent wallets exist
      for (const referral of userReferrals) {
        if (referral.parentWallet) {
          const [parentUser] = await db.select().from(users).where(eq(users.walletAddress, referral.parentWallet));
          if (!parentUser) {
            issues.push(`Parent wallet ${referral.parentWallet} does not exist`);
          }
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Error validating matrix integrity:', error);
      return {
        isValid: false,
        issues: [`Validation error: ${error}`]
      };
    }
  }
}

export const referralsService = new ReferralsService();