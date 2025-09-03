import { httpClient } from '../../../lib/http';

export interface ReferralSubmission {
  referralCode: string;
  walletAddress: string;
}

export interface ReferralInfo {
  isValid: boolean;
  referrerAddress?: string;
  referrerName?: string;
}

export const landingApi = {
  async validateReferralCode(code: string): Promise<ReferralInfo> {
    return httpClient.get<ReferralInfo>(`/referrals/validate/${code}`);
  },

  async submitReferral(data: ReferralSubmission): Promise<{ success: boolean; message: string }> {
    return httpClient.post('/referrals/submit', data);
  },

  async getStats(): Promise<{ totalUsers: number; totalRewards: string; activeReferrals: number }> {
    return httpClient.get('/landing/stats');
  }
};