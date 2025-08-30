import { ReplitDBAdapter } from '../adapters/replit-db.adapter';

export interface User {
  walletAddress: string;
  username?: string;
  displayName?: string;
  membershipLevel: number;
  isActivated: boolean;
  referrerWallet?: string;
  registrationExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class UsersRepository {
  constructor(private db: ReplitDBAdapter) {}

  /**
   * Get user by wallet address
   */
  async getByWallet(wallet: string): Promise<User | null> {
    const key = `users:${wallet.toLowerCase()}`;
    return await this.db.get<User>(key);
  }

  /**
   * Create or update user
   */
  async set(user: User): Promise<User> {
    const wallet = user.walletAddress.toLowerCase();
    const key = `users:${wallet}`;
    
    const now = new Date().toISOString();
    const userData: User = {
      ...user,
      walletAddress: wallet,
      updatedAt: now,
      createdAt: user.createdAt || now
    };

    await this.db.set(key, userData);
    
    // Update membership level index
    const levelIndexKey = `idx:users:level:${userData.membershipLevel}`;
    await this.db.addToIndex(levelIndexKey, wallet);
    
    // Update activation status index
    const statusIndexKey = `idx:users:activated:${userData.isActivated}`;
    await this.db.addToIndex(statusIndexKey, wallet);
    
    await this.db.audit('user_upsert', { wallet, membershipLevel: userData.membershipLevel });
    
    return userData;
  }

  /**
   * Get user's membership level
   */
  async getMembershipLevel(wallet: string): Promise<number> {
    const user = await this.getByWallet(wallet);
    return user?.membershipLevel || 0;
  }

  /**
   * Update membership level
   */
  async setMembershipLevel(wallet: string, level: number): Promise<void> {
    const user = await this.getByWallet(wallet);
    if (!user) {
      throw new Error(`User not found: ${wallet}`);
    }

    // Remove from old level index
    const oldLevelIndexKey = `idx:users:level:${user.membershipLevel}`;
    await this.db.removeFromIndex(oldLevelIndexKey, wallet);
    
    // Update user
    user.membershipLevel = level;
    user.updatedAt = new Date().toISOString();
    
    await this.set(user);
  }

  /**
   * Set activation status
   */
  async setActivationStatus(wallet: string, isActivated: boolean): Promise<void> {
    const user = await this.getByWallet(wallet);
    if (!user) {
      throw new Error(`User not found: ${wallet}`);
    }

    // Remove from old status index
    const oldStatusIndexKey = `idx:users:activated:${user.isActivated}`;
    await this.db.removeFromIndex(oldStatusIndexKey, wallet);
    
    // Update user
    user.isActivated = isActivated;
    user.updatedAt = new Date().toISOString();
    
    await this.set(user);
  }

  /**
   * Get users by membership level
   */
  async getByLevel(level: number, limit: number = 50, cursor?: string): Promise<{users: User[], nextCursor?: string}> {
    const indexKey = `idx:users:level:${level}`;
    const wallets = await this.db.getIndex(indexKey);
    
    const offset = cursor ? parseInt(cursor) : 0;
    const pageWallets = wallets.slice(offset, offset + limit);
    
    const users: User[] = [];
    for (const wallet of pageWallets) {
      const user = await this.getByWallet(wallet);
      if (user) users.push(user);
    }
    
    const nextCursor = (offset + limit < wallets.length) ? String(offset + limit) : undefined;
    
    return { users, nextCursor };
  }

  /**
   * Get activated users
   */
  async getActivatedUsers(limit: number = 50, cursor?: string): Promise<{users: User[], nextCursor?: string}> {
    const indexKey = `idx:users:activated:true`;
    const wallets = await this.db.getIndex(indexKey);
    
    const offset = cursor ? parseInt(cursor) : 0;
    const pageWallets = wallets.slice(offset, offset + limit);
    
    const users: User[] = [];
    for (const wallet of pageWallets) {
      const user = await this.getByWallet(wallet);
      if (user) users.push(user);
    }
    
    const nextCursor = (offset + limit < wallets.length) ? String(offset + limit) : undefined;
    
    return { users, nextCursor };
  }

  /**
   * Check if user exists
   */
  async exists(wallet: string): Promise<boolean> {
    const user = await this.getByWallet(wallet);
    return user !== null;
  }
}