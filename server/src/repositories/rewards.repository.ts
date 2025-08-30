import { ReplitDBAdapter } from '../adapters/replit-db.adapter';

export interface UserReward {
  id: string;
  beneficiaryWallet: string;
  memberWallet: string;
  triggerLevel: number;
  payoutLayer: number;
  amount: number;
  tokenType: 'BCC' | 'USDT';
  status: 'pending' | 'confirmed' | 'expired' | 'claimed';
  expiresAt?: string;
  confirmedAt?: string;
  claimedAt?: string;
  txHash?: string;
  createdAt: string;
  updatedAt: string;
}

export class RewardsRepository {
  constructor(private db: ReplitDBAdapter) {}

  /**
   * Create a new reward
   */
  async create(reward: Omit<UserReward, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserReward> {
    const id = await this.db.nextId('user_rewards');
    const now = new Date().toISOString();
    
    const newReward: UserReward = {
      ...reward,
      id,
      beneficiaryWallet: reward.beneficiaryWallet.toLowerCase(),
      memberWallet: reward.memberWallet.toLowerCase(),
      createdAt: now,
      updatedAt: now
    };

    const key = `user_rewards:${id}`;
    await this.db.set(key, newReward);
    
    // Update indexes
    await this.db.addToIndex(`idx:user_rewards:beneficiary:${newReward.beneficiaryWallet}`, id);
    await this.db.addToIndex(`idx:user_rewards:member:${newReward.memberWallet}`, id);
    await this.db.addToIndex(`idx:user_rewards:status:${newReward.status}`, id);
    
    await this.db.audit('reward_created', { 
      id, 
      beneficiaryWallet: newReward.beneficiaryWallet,
      amount: newReward.amount,
      tokenType: newReward.tokenType
    });
    
    return newReward;
  }

  /**
   * Get reward by ID
   */
  async getById(id: string): Promise<UserReward | null> {
    const key = `user_rewards:${id}`;
    return await this.db.get<UserReward>(key);
  }

  /**
   * Update reward status
   */
  async setStatus(id: string, newStatus: UserReward['status']): Promise<void> {
    const reward = await this.getById(id);
    if (!reward) {
      throw new Error(`Reward not found: ${id}`);
    }

    const oldStatus = reward.status;
    
    // Move between status indexes
    await this.db.moveIndexEntry(
      `idx:user_rewards:status:${oldStatus}`,
      `idx:user_rewards:status:${newStatus}`,
      id
    );
    
    // Update reward
    reward.status = newStatus;
    reward.updatedAt = new Date().toISOString();
    
    // Set timestamps based on status
    if (newStatus === 'confirmed') {
      reward.confirmedAt = reward.updatedAt;
    } else if (newStatus === 'claimed') {
      reward.claimedAt = reward.updatedAt;
    }
    
    const key = `user_rewards:${id}`;
    await this.db.set(key, reward);
    
    await this.db.audit('reward_status_changed', { 
      id, 
      oldStatus, 
      newStatus,
      beneficiaryWallet: reward.beneficiaryWallet
    });
  }

  /**
   * List rewards by beneficiary
   */
  async listByBeneficiary(
    beneficiaryWallet: string, 
    options: {
      status?: UserReward['status'];
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{rewards: UserReward[], nextCursor?: string}> {
    const { status, limit = 50, cursor } = options;
    const wallet = beneficiaryWallet.toLowerCase();
    
    let indexKey: string;
    if (status) {
      // Get intersection of beneficiary rewards and status
      const beneficiaryIndex = await this.db.getIndex(`idx:user_rewards:beneficiary:${wallet}`);
      const statusIndex = await this.db.getIndex(`idx:user_rewards:status:${status}`);
      const intersection = beneficiaryIndex.filter(id => statusIndex.includes(id));
      
      const offset = cursor ? parseInt(cursor) : 0;
      const pageIds = intersection.slice(offset, offset + limit);
      
      const rewards: UserReward[] = [];
      for (const id of pageIds) {
        const reward = await this.getById(id);
        if (reward) rewards.push(reward);
      }
      
      const nextCursor = (offset + limit < intersection.length) ? String(offset + limit) : undefined;
      return { rewards, nextCursor };
    } else {
      indexKey = `idx:user_rewards:beneficiary:${wallet}`;
      const ids = await this.db.getIndex(indexKey);
      
      const offset = cursor ? parseInt(cursor) : 0;
      const pageIds = ids.slice(offset, offset + limit);
      
      const rewards: UserReward[] = [];
      for (const id of pageIds) {
        const reward = await this.getById(id);
        if (reward) rewards.push(reward);
      }
      
      const nextCursor = (offset + limit < ids.length) ? String(offset + limit) : undefined;
      return { rewards, nextCursor };
    }
  }

  /**
   * List pending rewards before a timestamp
   */
  async listPendingBefore(timestamp: string, limit: number = 100): Promise<UserReward[]> {
    const pendingIds = await this.db.getIndex('idx:user_rewards:status:pending');
    const rewards: UserReward[] = [];
    
    for (const id of pendingIds.slice(0, limit)) {
      const reward = await this.getById(id);
      if (reward && reward.createdAt < timestamp) {
        rewards.push(reward);
      }
    }
    
    return rewards;
  }

  /**
   * Mark multiple rewards as settled with transaction hash
   */
  async markSettled(ids: string[], txHash: string): Promise<void> {
    for (const id of ids) {
      const reward = await this.getById(id);
      if (reward) {
        reward.status = 'claimed';
        reward.txHash = txHash;
        reward.claimedAt = new Date().toISOString();
        reward.updatedAt = reward.claimedAt;
        
        // Move to claimed status index
        await this.db.moveIndexEntry(
          `idx:user_rewards:status:${reward.status}`,
          'idx:user_rewards:status:claimed',
          id
        );
        
        const key = `user_rewards:${id}`;
        await this.db.set(key, reward);
      }
    }
    
    await this.db.audit('rewards_batch_settled', { ids, txHash });
  }

  /**
   * Get reward statistics for a beneficiary
   */
  async getStats(beneficiaryWallet: string): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    claimed: number;
    expired: number;
    totalAmount: number;
    claimedAmount: number;
  }> {
    const wallet = beneficiaryWallet.toLowerCase();
    const allRewards = await this.listByBeneficiary(wallet, { limit: 1000 });
    
    const stats = {
      total: 0,
      pending: 0,
      confirmed: 0,
      claimed: 0,
      expired: 0,
      totalAmount: 0,
      claimedAmount: 0
    };
    
    for (const reward of allRewards.rewards) {
      stats.total++;
      stats.totalAmount += reward.amount;
      
      switch (reward.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'confirmed':
          stats.confirmed++;
          break;
        case 'claimed':
          stats.claimed++;
          stats.claimedAmount += reward.amount;
          break;
        case 'expired':
          stats.expired++;
          break;
      }
    }
    
    return stats;
  }
}