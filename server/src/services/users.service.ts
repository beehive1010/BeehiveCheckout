import { usersRepo, type User } from '../repositories';

export interface CreateUserRequest {
  walletAddress: string;
  username?: string;
  referrerWallet?: string;
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