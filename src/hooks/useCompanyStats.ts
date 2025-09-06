import { useQuery } from '@tanstack/react-query';
import { useAdminAuth } from './useAdminAuth';

// 公司整体统计hook
export function useCompanyStats() {
  const { isAuthenticated, hasPermission } = useAdminAuth();

  return useQuery({
    queryKey: ['/api/admin/company-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/company-stats', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch company stats');
      }
      return response.json();
    },
    enabled: isAuthenticated && hasPermission('stats.read'),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}

// 会员等级分布hook
export function useMemberLevelStats() {
  const { isAuthenticated, hasPermission } = useAdminAuth();

  return useQuery({
    queryKey: ['/api/admin/member-levels'],
    queryFn: async () => {
      const response = await fetch('/api/admin/member-levels', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch member level stats');
      }
      return response.json();
    },
    enabled: isAuthenticated && hasPermission('members.read'),
    staleTime: 30000,
    refetchInterval: 120000, // 2 minutes
  });
}

// 公司财务统计hook
export function useCompanyFinancialStats() {
  const { isAuthenticated, hasPermission } = useAdminAuth();

  return useQuery({
    queryKey: ['/api/admin/financial-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/financial-stats', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch financial stats');
      }
      return response.json();
    },
    enabled: isAuthenticated && hasPermission('finances.read'),
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });
}