import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { useAdminAuth } from './useAdminAuth';
import { apiRequest } from '../lib/queryClient';

// 会员管理hook (管理员用)
export function useMemberManagement() {
  const { isAuthenticated, hasPermission } = useAdminAuth();

  // 获取所有会员列表 using Supabase API
  const membersQuery = useQuery({
    queryKey: ['/api/admin/members'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/members', { 'Cache-Control': 'no-cache' });
      return response.json();
    },
    enabled: isAuthenticated && hasPermission('members.read'),
    staleTime: 15000,
    refetchInterval: 45000,
  });

  // 激活会员mutation
  const activateMemberMutation = useMutation({
    mutationFn: async (memberData: {
      walletAddress: string;
      level: number;
      skipPayment?: boolean;
    }) => {
      return await apiRequest('POST', '/api/admin/activate-member', memberData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/company-stats'] });
    },
  });

  // 升级会员mutation
  const upgradeMemberMutation = useMutation({
    mutationFn: async (upgradeData: {
      walletAddress: string;
      newLevel: number;
      reason?: string;
    }) => {
      return await apiRequest('POST', '/api/admin/upgrade-member', upgradeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/member-levels'] });
    },
  });

  const queryClient = useQueryClient();

  return {
    // Data
    members: membersQuery.data,
    isLoadingMembers: membersQuery.isLoading,
    membersError: membersQuery.error,
    
    // Actions
    activateMember: activateMemberMutation.mutate,
    isActivatingMember: activateMemberMutation.isPending,
    
    upgradeMember: upgradeMemberMutation.mutate,
    isUpgradingMember: upgradeMemberMutation.isPending,
  };
}

// 个人会员状态hook
export function usePersonalMemberStatus() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/member/personal-status', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch('/api/member/personal-status', {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          return {
            isActivated: false,
            currentLevel: 0,
            totalMatrixMembers: 0,
            deepestLayer: 0
          };
        }
        throw new Error('Failed to fetch member status');
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}

// 会员升级mutation
export function useMemberUpgrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (upgradeData: {
      targetLevel: number;
      paymentTxHash?: string;
    }) => {
      return await apiRequest('POST', '/api/member/upgrade', upgradeData);
    },
    onSuccess: () => {
      // Invalidate member-related caches
      queryClient.invalidateQueries({ queryKey: ['/api/member/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/personal-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/balances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/user-rewards'] });
    },
  });
}