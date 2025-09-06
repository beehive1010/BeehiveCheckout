// ERC5115 Thirdweb Drop Contract - 19 Level NFT System Configuration
export interface NFTLevelConfig {
  level: number;
  tokenId: number;
  priceUSDT: number;
  requiredDirectReferrals: number;
  requiredPreviousLevel: number | null;
  layerRewardsUnlocked: number[];
  rewardPercentage: number;
  levelName: string;
  description: string;
}

// Progressive pricing: Level 1 = 100 USDT, increases by 50 USDT per level until Level 19 = 1000 USDT
export const NFT_LEVEL_CONFIGS: NFTLevelConfig[] = [
  {
    level: 1,
    tokenId: 1,
    priceUSDT: 100,
    requiredDirectReferrals: 0,
    requiredPreviousLevel: null,
    layerRewardsUnlocked: [1],
    rewardPercentage: 100,
    levelName: "Bronze Member",
    description: "Entry level membership - Access to Layer 1 rewards"
  },
  {
    level: 2,
    tokenId: 2,
    priceUSDT: 150,
    requiredDirectReferrals: 3,
    requiredPreviousLevel: 1,
    layerRewardsUnlocked: [1, 2],
    rewardPercentage: 100,
    levelName: "Silver Member",
    description: "Unlock Layer 2 rewards - Requires 3 direct referrals"
  },
  {
    level: 3,
    tokenId: 3,
    priceUSDT: 200,
    requiredDirectReferrals: 5,
    requiredPreviousLevel: 2,
    layerRewardsUnlocked: [1, 2, 3],
    rewardPercentage: 100,
    levelName: "Gold Member",
    description: "Unlock Layer 3 rewards - Requires 5 direct referrals"
  },
  {
    level: 4,
    tokenId: 4,
    priceUSDT: 250,
    requiredDirectReferrals: 7,
    requiredPreviousLevel: 3,
    layerRewardsUnlocked: [1, 2, 3, 4],
    rewardPercentage: 100,
    levelName: "Platinum Member",
    description: "Unlock Layer 4 rewards - Requires 7 direct referrals"
  },
  {
    level: 5,
    tokenId: 5,
    priceUSDT: 300,
    requiredDirectReferrals: 10,
    requiredPreviousLevel: 4,
    layerRewardsUnlocked: [1, 2, 3, 4, 5],
    rewardPercentage: 100,
    levelName: "Diamond Member",
    description: "Unlock Layer 5 rewards - Requires 10 direct referrals"
  },
  // Continue pattern for levels 6-18
  ...Array.from({ length: 13 }, (_, i) => {
    const level = i + 6;
    return {
      level,
      tokenId: level,
      priceUSDT: 100 + (level - 1) * 50, // Progressive pricing
      requiredDirectReferrals: level === 6 ? 12 : (level - 6) * 2 + 12, // Increasing requirements
      requiredPreviousLevel: level - 1,
      layerRewardsUnlocked: Array.from({ length: level }, (_, j) => j + 1),
      rewardPercentage: 100,
      levelName: `Elite Level ${level}`,
      description: `Unlock Layer ${level} rewards - Advanced membership tier`
    };
  }),
  {
    level: 19,
    tokenId: 19,
    priceUSDT: 1000,
    requiredDirectReferrals: 50,
    requiredPreviousLevel: 18,
    layerRewardsUnlocked: Array.from({ length: 19 }, (_, i) => i + 1),
    rewardPercentage: 100,
    levelName: "Master Level",
    description: "Ultimate membership - 100% Layer 19 rewards (1000 USDT per upgrade)"
  }
];

export class NFTLevelConfigService {
  /**
   * Get configuration for a specific level
   */
  static getLevelConfig(level: number): NFTLevelConfig | null {
    return NFT_LEVEL_CONFIGS.find(config => config.level === level) || null;
  }

  /**
   * Get configuration for a specific token ID
   */
  static getTokenConfig(tokenId: number): NFTLevelConfig | null {
    return NFT_LEVEL_CONFIGS.find(config => config.tokenId === tokenId) || null;
  }

  /**
   * Validate if user can upgrade to specific level
   */
  static async canUpgradeToLevel(
    walletAddress: string, 
    targetLevel: number,
    currentLevel: number,
    directReferralCount: number
  ): Promise<{ canUpgrade: boolean; reason?: string; requirements?: any }> {
    
    const levelConfig = this.getLevelConfig(targetLevel);
    if (!levelConfig) {
      return { canUpgrade: false, reason: `Invalid level: ${targetLevel}` };
    }

    // Check if user has required previous level
    if (levelConfig.requiredPreviousLevel && currentLevel < levelConfig.requiredPreviousLevel) {
      return { 
        canUpgrade: false, 
        reason: `Must own Level ${levelConfig.requiredPreviousLevel} NFT first`,
        requirements: { requiredLevel: levelConfig.requiredPreviousLevel }
      };
    }

    // Check direct referral requirements
    if (directReferralCount < levelConfig.requiredDirectReferrals) {
      return {
        canUpgrade: false,
        reason: `Need ${levelConfig.requiredDirectReferrals} direct referrals (you have ${directReferralCount})`,
        requirements: { 
          requiredReferrals: levelConfig.requiredDirectReferrals,
          currentReferrals: directReferralCount,
          missing: levelConfig.requiredDirectReferrals - directReferralCount
        }
      };
    }

    // Check if user already has this level
    if (currentLevel >= targetLevel) {
      return {
        canUpgrade: false,
        reason: `You already own Level ${targetLevel} or higher`,
        requirements: { currentLevel }
      };
    }

    return { 
      canUpgrade: true,
      requirements: {
        priceUSDT: levelConfig.priceUSDT,
        layerRewardsUnlocked: levelConfig.layerRewardsUnlocked,
        tokenId: levelConfig.tokenId
      }
    };
  }

  /**
   * Get all levels user can claim rewards from
   */
  static getClaimableLayers(userLevel: number): number[] {
    const config = this.getLevelConfig(userLevel);
    return config ? config.layerRewardsUnlocked : [1];
  }

  /**
   * Calculate layer reward percentage for specific level holder
   */
  static calculateLayerRewardPercentage(
    holderLevel: number,
    layerNumber: number,
    totalRewardAmount: number
  ): number {
    const config = this.getLevelConfig(holderLevel);
    if (!config) return 0;

    // Only get rewards from layers you have unlocked
    if (!config.layerRewardsUnlocked.includes(layerNumber)) {
      return 0;
    }

    // Special case: Level 19 gets 100% of Layer 19 rewards
    if (holderLevel === 19 && layerNumber === 19) {
      return totalRewardAmount; // Full 1000 USDT
    }

    // Progressive reward sharing based on layer depth
    const baseReward = totalRewardAmount / Math.pow(2, layerNumber - 1);
    return Math.floor(baseReward * (config.rewardPercentage / 100));
  }

  /**
   * Get upgrade path for user
   */
  static getUpgradePath(currentLevel: number): NFTLevelConfig[] {
    return NFT_LEVEL_CONFIGS.filter(config => config.level > currentLevel);
  }

  /**
   * Get total cost to reach specific level from current level
   */
  static calculateUpgradeCost(fromLevel: number, toLevel: number): number {
    if (toLevel <= fromLevel) return 0;
    
    return NFT_LEVEL_CONFIGS
      .filter(config => config.level > fromLevel && config.level <= toLevel)
      .reduce((total, config) => total + config.priceUSDT, 0);
  }

  /**
   * Check if level can receive specific layer rewards
   */
  static canReceiveLayerRewards(holderLevel: number, layerNumber: number): boolean {
    const config = this.getLevelConfig(holderLevel);
    return config ? config.layerRewardsUnlocked.includes(layerNumber) : false;
  }

  /**
   * Get ERC5115 contract configuration
   */
  static getContractConfig() {
    return {
      contractType: "ERC5115",
      totalTokens: 19,
      dropContract: true,
      thirdwebEditor: true,
      tokens: NFT_LEVEL_CONFIGS.map(config => ({
        tokenId: config.tokenId,
        name: config.levelName,
        description: config.description,
        price: config.priceUSDT,
        maxSupply: 10000, // Sufficient for platform growth
        claimConditions: {
          requiredLevel: config.requiredPreviousLevel,
          requiredReferrals: config.requiredDirectReferrals
        }
      }))
    };
  }
}

export const nftLevelConfigService = new NFTLevelConfigService();