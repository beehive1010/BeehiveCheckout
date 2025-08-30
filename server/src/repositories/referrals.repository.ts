import { ReplitDBAdapter } from '../adapters/replit-db.adapter';

export interface ReferralChainNode {
  upline: string;
  depth: number;
  slot: 'left' | 'middle' | 'right';
}

export interface ReferralNode {
  childWallet: string;
  chain: ReferralChainNode[];
  createdAt: string;
  updatedAt: string;
}

export class ReferralsRepository {
  constructor(private db: ReplitDBAdapter) {}

  /**
   * Get referral chain for a child wallet
   */
  async getChain(childWallet: string): Promise<ReferralChainNode[]> {
    const key = `referral_nodes:${childWallet.toLowerCase()}`;
    const node = await this.db.get<ReferralNode>(key);
    return node?.chain || [];
  }

  /**
   * Set referral chain for a child wallet
   */
  async setChain(childWallet: string, chain: ReferralChainNode[]): Promise<void> {
    const wallet = childWallet.toLowerCase();
    const key = `referral_nodes:${wallet}`;
    
    const now = new Date().toISOString();
    const existingNode = await this.db.get<ReferralNode>(key);
    
    const node: ReferralNode = {
      childWallet: wallet,
      chain,
      createdAt: existingNode?.createdAt || now,
      updatedAt: now
    };

    await this.db.set(key, node);
    
    // Update indexes for each upline in the chain
    for (const chainNode of chain) {
      const uplineIndexKey = `idx:referrals:upline:${chainNode.upline}:depth:${chainNode.depth}`;
      await this.db.addToIndex(uplineIndexKey, wallet);
    }
    
    await this.db.audit('referral_chain_set', { childWallet: wallet, chainLength: chain.length });
  }

  /**
   * Get all direct referrals for an upline
   */
  async getDirectReferrals(uplineWallet: string): Promise<string[]> {
    const indexKey = `idx:referrals:upline:${uplineWallet.toLowerCase()}:depth:1`;
    return await this.db.getIndex(indexKey);
  }

  /**
   * Get referrals at a specific depth for an upline
   */
  async getReferralsAtDepth(uplineWallet: string, depth: number): Promise<string[]> {
    const indexKey = `idx:referrals:upline:${uplineWallet.toLowerCase()}:depth:${depth}`;
    return await this.db.getIndex(indexKey);
  }

  /**
   * Get all referrals across all depths for an upline
   */
  async getAllReferrals(uplineWallet: string, maxDepth: number = 19): Promise<Map<number, string[]>> {
    const referralsByDepth = new Map<number, string[]>();
    
    for (let depth = 1; depth <= maxDepth; depth++) {
      const referrals = await this.getReferralsAtDepth(uplineWallet, depth);
      if (referrals.length > 0) {
        referralsByDepth.set(depth, referrals);
      }
    }
    
    return referralsByDepth;
  }

  /**
   * Add a single referral relationship
   */
  async addReferral(uplineWallet: string, childWallet: string, depth: number, slot: 'left' | 'middle' | 'right'): Promise<void> {
    const existingChain = await this.getChain(childWallet);
    
    const newChainNode: ReferralChainNode = {
      upline: uplineWallet.toLowerCase(),
      depth,
      slot
    };
    
    // Add to existing chain or create new one
    const updatedChain = [...existingChain, newChainNode];
    await this.setChain(childWallet, updatedChain);
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(wallet: string): Promise<{
    directCount: number;
    totalCount: number;
    byDepth: Record<number, number>;
  }> {
    const stats = {
      directCount: 0,
      totalCount: 0,
      byDepth: {} as Record<number, number>
    };
    
    const allReferrals = await this.getAllReferrals(wallet);
    
    for (const [depth, referrals] of allReferrals) {
      const count = referrals.length;
      stats.byDepth[depth] = count;
      stats.totalCount += count;
      
      if (depth === 1) {
        stats.directCount = count;
      }
    }
    
    return stats;
  }

  /**
   * Find next available slot in 1x3 matrix for an upline
   */
  async findNextAvailableSlot(uplineWallet: string): Promise<'left' | 'middle' | 'right' | null> {
    const directReferrals = await this.getDirectReferrals(uplineWallet);
    
    // In 1x3 matrix, each user can have max 3 direct referrals
    if (directReferrals.length >= 3) {
      return null; // Matrix full at this level
    }
    
    // Get existing slots used
    const usedSlots = new Set<string>();
    for (const childWallet of directReferrals) {
      const chain = await this.getChain(childWallet);
      const directRelation = chain.find(node => node.upline === uplineWallet.toLowerCase() && node.depth === 1);
      if (directRelation) {
        usedSlots.add(directRelation.slot);
      }
    }
    
    // Return first available slot
    const slots: Array<'left' | 'middle' | 'right'> = ['left', 'middle', 'right'];
    for (const slot of slots) {
      if (!usedSlots.has(slot)) {
        return slot;
      }
    }
    
    return null;
  }

  /**
   * Remove referral relationship (for testing/admin)
   */
  async removeReferral(childWallet: string): Promise<void> {
    const wallet = childWallet.toLowerCase();
    const key = `referral_nodes:${wallet}`;
    const node = await this.db.get<ReferralNode>(key);
    
    if (node) {
      // Remove from all upline indexes
      for (const chainNode of node.chain) {
        const uplineIndexKey = `idx:referrals:upline:${chainNode.upline}:depth:${chainNode.depth}`;
        await this.db.removeFromIndex(uplineIndexKey, wallet);
      }
      
      await this.db.delete(key);
      await this.db.audit('referral_removed', { childWallet: wallet });
    }
  }
}