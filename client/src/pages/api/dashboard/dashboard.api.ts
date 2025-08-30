import { httpClient } from '../../../lib/http';

export interface DashboardStats {
  totalEarnings: number;
  referralCount: number;
  matrixLevel: number;
  bccBalance: {
    transferable: number;
    restricted: number;
  };
  membershipLevel: number;
  isActivated: boolean;
}

export interface RecentActivity {
  id: string;
  type: 'referral' | 'reward' | 'upgrade' | 'claim';
  description: string;
  amount?: number;
  timestamp: string;
}

export const dashboardApi = {
  async getStats(walletAddress: string): Promise<DashboardStats> {
    return httpClient.get<DashboardStats>('/dashboard/stats', walletAddress);
  },

  async getRecentActivity(walletAddress: string): Promise<RecentActivity[]> {
    return httpClient.get<RecentActivity[]>('/dashboard/activity', walletAddress);
  },

  async refreshStats(walletAddress: string): Promise<DashboardStats> {
    return httpClient.post<DashboardStats>('/dashboard/refresh', {}, walletAddress);
  }
};