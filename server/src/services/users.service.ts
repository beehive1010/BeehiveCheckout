import { usersRepo, type User } from '../repositories';

export interface CreateUserRequest {
  walletAddress: string;
  username?: string;
  referrerWallet?: string;
}

export interface CreateUserEnhancedRequest {
  walletAddress: string;
  username: string;
  email?: string;
  secondaryPasswordHash?: string;
  referrerWallet?: string;
}

export interface ActivateUserMembershipRequest {
  walletAddress: string;
  membershipLevel: number;
  transactionHash?: string;
  mintTxHash?: string;
}

export interface UserProfile {
  user: User;
  membershipLevel: number;
  isActivated: boolean;
  referralStats?: {
    directCount: number;
    totalCount: number;
  };
}

export class UsersService {
  /**
   * Create a new user with validation
   */
  async createUser(request: CreateUserRequest): Promise<User> {
    const { walletAddress, username, referrerWallet } = request;
    
    // Validate wallet address format
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      throw new Error('Invalid wallet address format');
    }

    // Check if user already exists
    const existingUser = await usersRepo.getByWallet(walletAddress);
    if (existingUser) {
      return existingUser;
    }

    // Validate referrer exists if provided
    if (referrerWallet) {
      const referrer = await usersRepo.getByWallet(referrerWallet);
      if (!referrer) {
        throw new Error('Referrer wallet not found');
      }
    }

    // Create new user
    const newUser: User = {
      walletAddress: walletAddress.toLowerCase(),
      username: username || `User_${walletAddress.slice(-6)}`,
      membershipLevel: 0,
      isActivated: false,
      referrerWallet: referrerWallet?.toLowerCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await usersRepo.set(newUser);
  }

  /**
   * Get user profile with membership and stats
   */
  async getUserProfile(walletAddress: string): Promise<UserProfile | null> {
    const user = await usersRepo.getByWallet(walletAddress);
    if (!user) {
      return null;
    }

    return {
      user,
      membershipLevel: user.membershipLevel,
      isActivated: user.isActivated
    };
  }

  /**
   * Get comprehensive user status including NFT verification for routing decisions
   */
  async getUserStatusWithNFT(walletAddress: string): Promise<{
    isRegistered: boolean;
    hasNFT: boolean;
    userFlow: 'registration' | 'claim_nft' | 'dashboard';
    user?: User;
    membershipLevel?: number;
    isActivated?: boolean;
  }> {
    console.log(`🔍 Checking user status for: ${walletAddress}`);
    
    // Check if user is registered in ReplitDB
    let user = await usersRepo.getByWallet(walletAddress);
    console.log(`📁 ReplitDB lookup result:`, user ? 'FOUND' : 'NOT_FOUND');
    
    // If not in ReplitDB, check PostgreSQL and sync if needed
    if (!user) {
      console.log(`🔄 Checking PostgreSQL database...`);
      try {
        // Import to avoid circular dependency 
        const { storage } = await import('../../storage');
        const pgUser = await storage.getUser(walletAddress.toLowerCase());
        
        if (pgUser && pgUser.memberActivated) {
          console.log(`✅ Found activated user in PostgreSQL, syncing to auth system...`);
          
          // Create ReplitDB user from PostgreSQL data
          const syncedUser = {
            walletAddress: pgUser.walletAddress,
            username: pgUser.username || '',
            isActivated: pgUser.memberActivated,
            membershipLevel: pgUser.currentLevel || 1,
            registeredAt: pgUser.registeredAt?.toISOString() || pgUser.createdAt?.toISOString() || new Date().toISOString(),
            referrerWallet: pgUser.referrerWallet || '',
            createdAt: pgUser.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await usersRepo.set(syncedUser);
          user = syncedUser;
          console.log(`🔄 User data synced successfully!`);
        } else {
          console.log(`❌ User not found in PostgreSQL or not activated`);
        }
      } catch (error) {
        console.error(`🚨 PostgreSQL sync failed:`, error);
      }
    }
    
    if (!user) {
      return {
        isRegistered: false,
        hasNFT: false,
        userFlow: 'registration'
      };
    }

    // User is registered - now check if they have Level 1 NFT
    // For now, we'll check memberActivated status as a proxy for NFT ownership
    // In production, you'd query the memberNFTVerification table or blockchain directly
    const hasNFT = user.isActivated && user.membershipLevel >= 1;
    
    return {
      isRegistered: true,
      hasNFT,
      userFlow: hasNFT ? 'dashboard' : 'claim_nft',
      user,
      membershipLevel: user.membershipLevel,
      isActivated: user.isActivated
    };
  }

  /**
   * Create a new user with enhanced data and validation
   */
  async createUserEnhanced(request: CreateUserEnhancedRequest): Promise<User> {
    const { walletAddress, username, email, secondaryPasswordHash, referrerWallet } = request;
    
    // Validate wallet address format
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      throw new Error('Invalid wallet address format');
    }

    // Check if user already exists
    const existingUser = await usersRepo.getByWallet(walletAddress);
    if (existingUser) {
      throw new Error('User already registered');
    }

    // Check if username is taken
    if (username) {
      const existingUsername = await usersRepo.getByUsername(username);
      if (existingUsername) {
        throw new Error('Username already taken');
      }
    }

    // Validate referrer exists if provided
    if (referrerWallet) {
      const referrer = await usersRepo.getByWallet(referrerWallet);
      if (!referrer) {
        throw new Error('Referrer wallet not found');
      }
    }

    // Create new user with enhanced data
    const newUser: User = {
      walletAddress: walletAddress.toLowerCase(),
      username: username,
      email: email || undefined,
      secondaryPasswordHash: secondaryPasswordHash || undefined, // Should be hashed on frontend
      membershipLevel: 0,
      isActivated: false,
      referrerWallet: referrerWallet?.toLowerCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await usersRepo.set(newUser);
  }

  /**
   * Activate user membership after NFT claim
   */
  async activateUserMembership(request: ActivateUserMembershipRequest): Promise<User> {
    const { walletAddress, membershipLevel, transactionHash, mintTxHash } = request;
    
    // Get existing user
    const existingUser = await usersRepo.getByWallet(walletAddress);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Update user with membership activation
    const updatedUser: User = {
      ...existingUser,
      membershipLevel,
      isActivated: true,
      updatedAt: new Date().toISOString()
    };

    return await usersRepo.set(updatedUser);
  }

  /**
   * Check if user exists
   */
  async checkUserExists(walletAddress: string): Promise<{exists: boolean, user?: User}> {
    const user = await usersRepo.getByWallet(walletAddress);
    return {
      exists: user !== null,
      user: user || undefined
    };
  }

  /**
   * Update user membership level
   */
  async updateMembershipLevel(walletAddress: string, level: number): Promise<void> {
    if (level < 0 || level > 19) {
      throw new Error('Invalid membership level. Must be between 0 and 19.');
    }

    await usersRepo.setMembershipLevel(walletAddress, level);
  }

  /**
   * Activate user membership
   */
  async activateUser(walletAddress: string, level: number = 1): Promise<void> {
    const user = await usersRepo.getByWallet(walletAddress);
    if (!user) {
      throw new Error('User not found');
    }

    // Set activation status and membership level
    await usersRepo.setActivationStatus(walletAddress, true);
    if (level > user.membershipLevel) {
      await usersRepo.setMembershipLevel(walletAddress, level);
    }
  }

  /**
   * Get users by membership level (admin function)
   */
  async getUsersByLevel(level: number, limit: number = 50, cursor?: string) {
    return await usersRepo.getByLevel(level, limit, cursor);
  }

  /**
   * Get all activated users (admin function)
   */
  async getActivatedUsers(limit: number = 50, cursor?: string) {
    return await usersRepo.getActivatedUsers(limit, cursor);
  }

  /**
   * Update user display name
   */
  async updateDisplayName(walletAddress: string, displayName: string): Promise<void> {
    const user = await usersRepo.getByWallet(walletAddress);
    if (!user) {
      throw new Error('User not found');
    }

    user.displayName = displayName;
    user.updatedAt = new Date().toISOString();
    
    await usersRepo.set(user);
  }

  /**
   * Set user registration expiration
   */
  async setRegistrationExpiration(walletAddress: string, expiresAt: Date): Promise<void> {
    const user = await usersRepo.getByWallet(walletAddress);
    if (!user) {
      throw new Error('User not found');
    }

    user.registrationExpiresAt = expiresAt.toISOString();
    user.updatedAt = new Date().toISOString();
    
    await usersRepo.set(user);
  }

  /**
   * Check registration status
   */
  async getRegistrationStatus(walletAddress: string): Promise<{
    isRegistered: boolean;
    isExpired: boolean;
    expiresAt?: string;
    timeRemaining?: number;
  }> {
    const user = await usersRepo.getByWallet(walletAddress);
    
    if (!user) {
      return { isRegistered: false, isExpired: false };
    }

    if (!user.registrationExpiresAt) {
      return { isRegistered: true, isExpired: false };
    }

    const expiresAt = new Date(user.registrationExpiresAt);
    const now = new Date();
    const isExpired = expiresAt < now;
    const timeRemaining = Math.max(0, expiresAt.getTime() - now.getTime());

    return {
      isRegistered: true,
      isExpired,
      expiresAt: user.registrationExpiresAt,
      timeRemaining
    };
  }
}