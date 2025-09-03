// Configuration API client for level configurations and system settings

export interface LevelConfiguration {
  level: number;
  levelName: string;
  priceUSDT: number; // Total price in USDT cents
  rewardUSDT: number; // Reward to referrer in cents
  activationFeeUSDT: number; // Platform fee in cents
  baseBccUnlockAmount: number; // Base BCC unlock amount
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
  verified: boolean;
  active: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

class ConfigAPI {
  
  // Get all level configurations
  async getAllLevelConfigurations(): Promise<LevelConfiguration[]> {
    const response = await fetch('/api/config/levels');
    if (!response.ok) {
      throw new Error('Failed to fetch level configurations');
    }
    return response.json();
  }

  // Get specific level configuration
  async getLevelConfiguration(level: number): Promise<LevelConfiguration> {
    const response = await fetch(`/api/config/levels/${level}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch level ${level} configuration`);
    }
    return response.json();
  }

  // Get discover partners  
  async getDiscoverPartners(): Promise<DiscoverPartner[]> {
    const response = await fetch('/api/discover/partners');
    if (!response.ok) {
      throw new Error('Failed to fetch discover partners');
    }
    return response.json();
  }
}

export const configApi = new ConfigAPI();