import { db } from '../../db';
import { referrals } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export interface ReferralChainNode {
  upline: string;
  depth: number;
  slot: 'left' | 'middle' | 'right';
}

export interface ReferralStats {
  directCount: number;
  totalCount: number;
  byDepth: Record<number, number>;
}

export class ReferralsPostgreSQLRepository {
  
  /**
   * Get referral chain for a child wallet from PostgreSQL
   */
  async getChain(childWallet: string): Promise<ReferralChainNode[]> {
    const wallet = childWallet.toLowerCase();
    
    // Build chain by traversing up parent relationships
    const chain: ReferralChainNode[] = [];
    let currentWallet = wallet;
    let depth = 1;
    
    while (depth <= 19) {
      const [node] = await db
        .select({ placerWallet: referrals.placerWallet })
        .from(referrals)
        .where(eq(referrals.memberWallet, currentWallet));
        
      if (!node?.placerWallet) break;
      
      chain.push({
        upline: node.placerWallet,
        depth: depth,
        slot: 'middle' // Simplified for now
      });
      
      currentWallet = node.placerWallet;
      depth++;
    }
    
    return chain;
  }

  /**
   * Get all direct referrals for an upline from PostgreSQL
   */
  async getDirectReferrals(uplineWallet: string): Promise<string[]> {
    const wallet = uplineWallet.toLowerCase();
    
    const directReferrals = await db
      .select({ memberWallet: referrals.memberWallet })
      .from(referrals)
      .where(eq(referrals.placerWallet, wallet));
      
    return directReferrals.map(r => r.memberWallet);
  }

  /**
   * Get referrals at a specific depth for an upline from PostgreSQL
   */
  async getReferralsAtDepth(uplineWallet: string, depth: number): Promise<string[]> {
    const wallet = uplineWallet.toLowerCase();
    
    if (depth === 1) {
      return this.getDirectReferrals(wallet);
    }
    
    // For deeper levels, we need to traverse the tree
    const allReferrals = await this.getAllReferrals(wallet);
    return allReferrals.get(depth) || [];
  }

  /**
   * Get all referrals across all depths for an upline from PostgreSQL
   */
  async getAllReferrals(uplineWallet: string, maxDepth: number = 19): Promise<Map<number, string[]>> {
    const wallet = uplineWallet.toLowerCase();
    const referralsByDepth = new Map<number, string[]>();
    
    // Get direct referrals (depth 1)
    const directReferrals = await this.getDirectReferrals(wallet);
    if (directReferrals.length > 0) {
      referralsByDepth.set(1, directReferrals);
    }
    
    // Recursively get deeper levels
    for (let currentDepth = 2; currentDepth <= maxDepth; currentDepth++) {
      const previousLevel = referralsByDepth.get(currentDepth - 1) || [];
      const currentLevel: string[] = [];
      
      for (const parentWallet of previousLevel) {
        const childReferrals = await this.getDirectReferrals(parentWallet);
        currentLevel.push(...childReferrals);
      }
      
      if (currentLevel.length > 0) {
        referralsByDepth.set(currentDepth, currentLevel);
      } else {
        break; // No more referrals at this depth
      }
    }
    
    return referralsByDepth;
  }

  /**
   * Get referral statistics from PostgreSQL
   */
  async getReferralStats(wallet: string): Promise<ReferralStats> {
    const stats: ReferralStats = {
      directCount: 0,
      totalCount: 0,
      byDepth: {}
    };
    
    // Get direct referral count from referrals table
    const [directCountResult] = await db
      .select({ 
        count: sql<number>`cast(count(*) as int)`
      })
      .from(referrals)
      .where(eq(referrals.placerWallet, wallet.toLowerCase()));
    
    // Use the counted referrals
    if (directCountResult) {
      stats.directCount = directCountResult.count || 0;
      stats.totalCount = 0; // Will be calculated below
    }
    
    // If no stored counts, calculate from relationships
    if (stats.totalCount === 0) {
      const allReferrals = await this.getAllReferrals(wallet);
      
      // Convert Map to array for iteration
      const entries = Array.from(allReferrals.entries());
      for (const [depth, referrals] of entries) {
        const count = referrals.length;
        stats.byDepth[depth] = count;
        stats.totalCount += count;
        
        if (depth === 1) {
          stats.directCount = count;
        }
      }
    } else {
      // Set byDepth based on stored data
      if (stats.directCount > 0) {
        stats.byDepth[1] = stats.directCount;
      }
    }
    
    return stats;
  }

  /**
   * Set referral chain (stub implementation for compatibility)
   */
  async setChain(childWallet: string, chain: ReferralChainNode[]): Promise<void> {
    // For now, just ensure the user exists in referrals table
    // The actual chain is built dynamically from placer relationships
    console.log(`Setting chain for ${childWallet} with ${chain.length} nodes`);
  }

  /**
   * Find next available slot (stub implementation)
   */
  async findNextAvailableSlot(referrerWallet: string): Promise<{ slot: 'left' | 'middle' | 'right' } | null> {
    // Simplified: always return middle slot for now
    return { slot: 'middle' };
  }

  /**
   * Remove referral (stub implementation)
   */
  async removeReferral(childWallet: string): Promise<void> {
    console.log(`Remove referral called for ${childWallet} - not implemented`);
  }

  /**
   * Get referral node data directly from PostgreSQL
   */
  async getReferralNode(walletAddress: string): Promise<any> {
    const wallet = walletAddress.toLowerCase();
    
    const [node] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.memberWallet, wallet));
      
    return node;
  }
}