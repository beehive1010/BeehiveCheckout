// Configuration API client for level configurations and system settings
import { supabaseApi } from '../lib/supabase';

export interface LevelConfiguration {
  level: number;
  levelName: string;
  priceUSDT: number; // Total price in USDT cents
  rewardUSDT: number; // Reward to referrer in cents
  activationFeeUSDT: number; // Platform fee in cents
  baseBccUnlockAmount: number; // Base BCC unlock amount
  description: string;
  directReferrals: number;
}

export interface DiscoverPartner {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl: string;
  shortDescription: string;
  longDescription: string;
  tags: string[];
  chains: string[];
  dappType: string;
  featured: boolean;
  status: string;
  submitterWallet?: string;
  redeemCodeUsed?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

class ConfigAPI {
  
  // Get all level configurations (now using Supabase NFT upgrade API)
  async getAllLevelConfigurations(walletAddress?: string): Promise<LevelConfiguration[]> {
    try {
      if (walletAddress) {
        const result = await supabaseApi.getLevelInfo(walletAddress);
        if (result.success && result.allLevels) {
          return result.allLevels.map((level: any) => ({
            level: level.level,
            levelName: `Level ${level.level}`,
            priceUSDT: level.price * 100, // Convert to cents
            rewardUSDT: level.price * 100, // Full price as reward for simplicity
            activationFeeUSDT: 0, // No separate activation fee
            baseBccUnlockAmount: level.level === 1 ? 10950 : 0, // Only Level 1 gets BCC
            description: level.description,
            directReferrals: level.directReferrals
          }));
        }
      }
      
      // Fallback to hardcoded config if no wallet or API fails
      return this.getHardcodedLevelConfigurations();
    } catch (error) {
      console.warn('Failed to fetch level configurations from API, using fallback:', error);
      return this.getHardcodedLevelConfigurations();
    }
  }

  // Get specific level configuration
  async getLevelConfiguration(level: number, walletAddress?: string): Promise<LevelConfiguration> {
    try {
      if (walletAddress) {
        const result = await supabaseApi.getLevelInfo(walletAddress, level);
        if (result.success) {
          return {
            level: result.level,
            levelName: `Level ${result.level}`,
            priceUSDT: result.price * 100,
            rewardUSDT: result.price * 100,
            activationFeeUSDT: 0,
            baseBccUnlockAmount: result.level === 1 ? 10950 : 0,
            description: result.description,
            directReferrals: result.directReferrals
          };
        }
      }
      
      const allConfigs = await this.getAllLevelConfigurations(walletAddress);
      const config = allConfigs.find(c => c.level === level);
      if (!config) {
        throw new Error(`Level ${level} configuration not found`);
      }
      return config;
    } catch (error) {
      console.error(`Failed to fetch level ${level} configuration:`, error);
      throw error;
    }
  }

  // Hardcoded fallback configuration
  private getHardcodedLevelConfigurations(): LevelConfiguration[] {
    const configs: LevelConfiguration[] = [];
    
    // Level 1-19 configuration from the NFT upgrade system
    const levelData = [
      { level: 1, price: 100, directReferrals: 0, description: 'Membership Activation' },
      { level: 2, price: 100, directReferrals: 3, description: 'Layer 2 Unlock' },
      { level: 3, price: 150, directReferrals: 5, description: 'Layer 3 Unlock' },
      { level: 4, price: 150, directReferrals: 7, description: 'Layer 4 Unlock' },
      { level: 5, price: 200, directReferrals: 9, description: 'Layer 5 Unlock' },
      { level: 6, price: 200, directReferrals: 11, description: 'Layer 6 Unlock' },
      { level: 7, price: 250, directReferrals: 13, description: 'Layer 7 Unlock' },
      { level: 8, price: 250, directReferrals: 15, description: 'Layer 8 Unlock' },
      { level: 9, price: 300, directReferrals: 17, description: 'Layer 9 Unlock' },
      { level: 10, price: 300, directReferrals: 19, description: 'Layer 10 Unlock' },
      { level: 11, price: 350, directReferrals: 21, description: 'Layer 11 Unlock' },
      { level: 12, price: 350, directReferrals: 23, description: 'Layer 12 Unlock' },
      { level: 13, price: 400, directReferrals: 25, description: 'Layer 13 Unlock' },
      { level: 14, price: 400, directReferrals: 27, description: 'Layer 14 Unlock' },
      { level: 15, price: 450, directReferrals: 29, description: 'Layer 15 Unlock' },
      { level: 16, price: 450, directReferrals: 31, description: 'Layer 16 Unlock' },
      { level: 17, price: 500, directReferrals: 33, description: 'Layer 17 Unlock' },
      { level: 18, price: 750, directReferrals: 35, description: 'Layer 18 Unlock' },
      { level: 19, price: 1000, directReferrals: 37, description: 'Elite Level - 100% Root Reward' }
    ];
    
    return levelData.map(data => ({
      level: data.level,
      levelName: `Level ${data.level}`,
      priceUSDT: data.price * 100,
      rewardUSDT: data.price * 100,
      activationFeeUSDT: 0,
      baseBccUnlockAmount: data.level === 1 ? 10950 : 0,
      description: data.description,
      directReferrals: data.directReferrals
    }));
  }

  // Get discover partners (keeping this for compatibility, but could be moved to Supabase later)
  async getDiscoverPartners(): Promise<DiscoverPartner[]> {
    // For now, return empty array as this feature may not be migrated yet
    // TODO: Implement discover partners in Supabase if needed
    return [];
  }
}

export const configApi = new ConfigAPI();