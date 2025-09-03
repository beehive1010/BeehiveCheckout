import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { apiRequest } from '../lib/queryClient';

// 用户通知hook
export function useUserNotifications() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/notifications', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch('/api/notifications', {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 3000,
    refetchInterval: 10000, // Real-time notifications
  });
}

// 未读通知数量hook
export function useUnreadNotificationCount() {
  const { walletAddress } = useWallet();

  return useQuery({
    queryKey: ['/api/notifications/unread-count', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch('/api/notifications/unread-count', {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 2000,
    refetchInterval: 5000, // Very frequent for notification badge
  });
}

// 标记通知为已读mutation
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest('POST', '/api/notifications/mark-read', { notificationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
}

// 标记所有通知为已读mutation
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/notifications/mark-all-read', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
}