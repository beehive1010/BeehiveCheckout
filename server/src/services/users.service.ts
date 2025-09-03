import { storage } from './storage.service';
import type { User } from '@shared/schema';

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
    const existingUser = await storage.getUser(walletAddress.toLowerCase());
    if (existingUser) {
      return existingUser;
    }

    // Validate referrer exists if provided
    if (referrerWallet) {
      const referrer = await storage.getUser(referrerWallet.toLowerCase());
      if (!referrer) {
        throw new Error('Referrer wallet not found');
      }
    }

    // Create new user
    const newUser = {
      walletAddress: walletAddress.toLowerCase(),
      username: username || `User_${walletAddress.slice(-6)}`,
      currentLevel: 0,
      memberActivated: false,
      referrerWallet: referrerWallet?.toLowerCase() || null,
    };

    return await storage.createUser(newUser);
  }

  /**
   * Get user profile with membership and stats
   */
  async getUserProfile(walletAddress: string): Promise<UserProfile | null> {
    const user = await storage.getUser(walletAddress.toLowerCase());
    if (!user) {
      return null;
    }

    return {
      user,
      membershipLevel: user.currentLevel,
      isActivated: user.memberActivated
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
    
    // Check user directly in Supabase database
    let user = await storage.getUser(walletAddress.toLowerCase());
    console.log(`📊 Supabase lookup result:`, user ? 'FOUND' : 'NOT_FOUND');
    
    if (!user) {
      return {
        isRegistered: false,
        hasNFT: false,
        userFlow: 'registration'
      };
    }

    // User is registered - check if they have Level 1 NFT (activated member)
    const hasNFT = user.memberActivated && user.currentLevel >= 1;
    
    return {
      isRegistered: true,
      hasNFT,
      userFlow: hasNFT ? 'dashboard' : 'claim_nft',
      user,
      membershipLevel: user.currentLevel,
      isActivated: user.memberActivated
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
    const existingUser = await storage.getUser(walletAddress.toLowerCase());
    if (existingUser) {
      throw new Error('User already registered');
    }

    // Check if username is taken
    if (username) {
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        throw new Error('Username already taken');
      }
    }

    // Validate referrer exists if provided
    if (referrerWallet) {
      const referrer = await storage.getUser(referrerWallet.toLowerCase());
      if (!referrer) {
        throw new Error('Referrer wallet not found');
      }
    }

    // Create new user with enhanced data
    const newUser = {
      walletAddress: walletAddress.toLowerCase(),
      username: username,
      email: email || null,
      secondaryPasswordHash: secondaryPasswordHash || null,
      currentLevel: 0,
      memberActivated: false,
      referrerWallet: referrerWallet?.toLowerCase() || null,
    };

    return await storage.createUser(newUser);
  }

  /**
   * Activate user membership after NFT claim
   */
  async activateUserMembership(request: ActivateUserMembershipRequest): Promise<User> {
    const { walletAddress, membershipLevel, transactionHash, mintTxHash } = request;
    
    // Get existing user
    const existingUser = await storage.getUser(walletAddress.toLowerCase());
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Update user with membership level
    const updatedUser = await storage.updateUser(walletAddress.toLowerCase(), {
      currentLevel: membershipLevel
    });

    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    // Create/update member activation record
    await storage.createOrUpdateMember(walletAddress.toLowerCase(), {
      isActivated: true,
      activatedAt: new Date(),
      currentLevel: membershipLevel,
      levelsOwned: [membershipLevel]
    });

    return updatedUser;
  }

  /**
   * Check if user exists
   */
  async checkUserExists(walletAddress: string): Promise<{exists: boolean, user?: User}> {
    const user = await storage.getUser(walletAddress.toLowerCase());
    return {
      exists: user !== undefined,
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

    await storage.updateUser(walletAddress.toLowerCase(), {
      currentLevel: level
    });
  }

  /**
   * Activate user membership
   */
  async activateUser(walletAddress: string, level: number = 1): Promise<void> {
    const user = await storage.getUser(walletAddress.toLowerCase());
    if (!user) {
      throw new Error('User not found');
    }

    // Set activation status and membership level
    await storage.updateUser(walletAddress.toLowerCase(), {
      memberActivated: true,
      currentLevel: Math.max(level, user.currentLevel)
    });
  }

  /**
   * Get users by membership level (admin function)
   */
  async getUsersByLevel(level: number, limit: number = 50, cursor?: string) {
    // Note: This would need a new method in storage interface for pagination
    // For now, return empty array or implement basic filtering
    return [];
  }

  /**
   * Get all activated users (admin function)
   */
  async getActivatedUsers(limit: number = 50, cursor?: string) {
    // Note: This would need a new method in storage interface for pagination
    // For now, return empty array or implement basic filtering
    return [];
  }

  /**
   * Update user display name
   */
  async updateDisplayName(walletAddress: string, displayName: string): Promise<void> {
    const user = await storage.getUser(walletAddress.toLowerCase());
    if (!user) {
      throw new Error('User not found');
    }

    await storage.updateUser(walletAddress.toLowerCase(), {
      username: displayName,
      lastUpdatedAt: new Date()
    });
  }

  /**
   * Set user registration expiration
   */
  async setRegistrationExpiration(walletAddress: string, expiresAt: Date): Promise<void> {
    const user = await storage.getUser(walletAddress.toLowerCase());
    if (!user) {
      throw new Error('User not found');
    }

    await storage.updateUser(walletAddress.toLowerCase(), {
      registrationExpiresAt: expiresAt,
      lastUpdatedAt: new Date()
    });
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
    const user = await storage.getUser(walletAddress.toLowerCase());
    
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
      expiresAt: user.registrationExpiresAt.toISOString(),
      timeRemaining
    };
  }
}