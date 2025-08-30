import { httpClient } from '../../../lib/http';

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  matrixLevel: number;
  recentReferrals: Array<{
    walletAddress: string;
    joinedAt: string;
    activated: boolean;
  }>;
}

export interface ClaimableReward {
  id: string;
  type: 'referral' | 'matrix' | 'bonus';
  amount: number;
  description: string;
  availableAt: string;
  expiresAt?: string;
}

export interface MatrixNode {
  id: string;
  walletAddress: string;
  level: number;
  position: number;
  isActive: boolean;
  joinedAt: string;
}

export const referralsApi = {
  async getStats(walletAddress: string): Promise<ReferralStats> {
    return httpClient.get<ReferralStats>('/referrals/stats', walletAddress);
  },

  async getClaimableRewards(walletAddress: string): Promise<ClaimableReward[]> {
    return httpClient.get<ClaimableReward[]>('/referrals/rewards/claimable', walletAddress);
  },

  async claimReward(rewardId: string, walletAddress: string): Promise<{ success: boolean; newBalance: number }> {
    return httpClient.post('/referrals/rewards/claim', { rewardId }, walletAddress);
  },

  async getMatrixNetwork(walletAddress: string): Promise<MatrixNode[]> {
    return httpClient.get<MatrixNode[]>('/referrals/matrix', walletAddress);
  },

  async generateReferralLink(walletAddress: string): Promise<{ link: string }> {
    return httpClient.post('/referrals/link', {}, walletAddress);
  }
};