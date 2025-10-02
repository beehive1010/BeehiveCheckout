import { useQuery } from '@tanstack/react-query';
import { useAdminAuth } from './useAdminAuth';
import { apiRequest } from '../lib/queryClient';
import { useWallet } from './useWallet';

// 公司整体统计hook
export function useCompanyStats() {
  const { isAuthenticated, hasPermission } = useAdminAuth();
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/admin/company-stats'],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await apiRequest('POST', '/api/admin-stats/company', {
        action: 'get-company-stats'
      }, walletAddress);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch company stats');
      }
      
      return result.data;
    },
    enabled: isAuthenticated && hasPermission('stats.read') && !!walletAddress,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}

// 会员等级分布hook
export function useMemberLevelStats() {
  const { isAuthenticated, hasPermission } = useAdminAuth();
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/admin/member-levels'],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await apiRequest('POST', '/api/admin-stats/members', {
        action: 'get-member-levels'
      }, walletAddress);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch member level stats');
      }
      
      return result.data;
    },
    enabled: isAuthenticated && hasPermission('members.read') && !!walletAddress,
    staleTime: 30000,
    refetchInterval: 120000, // 2 minutes
  });
}

// 公司财务统计hook
export function useCompanyFinancialStats() {
  const { isAuthenticated, hasPermission } = useAdminAuth();
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/admin/financial-stats'],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await apiRequest('POST', '/api/admin-stats/financial', {
        action: 'get-financial-stats'
      }, walletAddress);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch financial stats');
      }
      
      return result.data;
    },
    enabled: isAuthenticated && hasPermission('finances.read') && !!walletAddress,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });
}