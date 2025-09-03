// Configuration API client for level configurations and system settings

export interface LevelConfiguration {
  level: number;
  levelName: string;
  priceUSDT: number; // Total price in USDT cents
  rewardUSDT: number; // Reward to referrer in cents
  activationFeeUSDT: number; // Platform fee in cents
  baseBccUnlockAmount: number; // Base BCC unlock amount
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
  async getDiscoverPartners(): Promise<any[]> {
    const response = await fetch('/api/discover/partners');
    if (!response.ok) {
      throw new Error('Failed to fetch discover partners');
    }
    return response.json();
  }
}

export const configApi = new ConfigAPI();