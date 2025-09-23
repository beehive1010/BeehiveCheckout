import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { callEdgeFunction } from '../../lib/supabaseClient';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useI18n } from '../../contexts/I18nContext';
import type { NotificationStats } from '../../types/notification';

interface NotificationPreviewProps {
  walletAddress: string;
  onNotificationClick: () => void;
}

export default function NotificationPreview({ 
  walletAddress, 
  onNotificationClick 
}: NotificationPreviewProps) {
  const { t } = useI18n();
  // Simple query for recent notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'preview', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        params.set('action', 'get-notifications');
        params.set('limit', '3'); // Only show 3 recent notifications
        
        const response = await callEdgeFunction('notification', Object.fromEntries(params), walletAddress);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch notifications');
        }
        return response.data;
      } catch (error) {
        console.warn('Notification Edge Function not available, showing empty state');
        return {
          notifications: [],
          count: 0,
          hasMore: false
        };
      }
    }
  });

  const notifications = notificationsData?.notifications || [];

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-yellow-400" />
        <h3 className="text-white font-semibold">{t('notifications.recentNotifications')}</h3>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4 text-gray-400">
          {t('common.loading')}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          {t('notifications.noNotificationsYet')}
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification: any, index: number) => (
            <div
              key={notification.id || index}
              className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-700/50 ${
                notification.isRead || notification.is_read
                  ? 'border-gray-600 bg-gray-800/50' 
                  : 'border-yellow-500/30 bg-yellow-500/5'
              }`}
              onClick={onNotificationClick}
            >
              <div className="flex items-start gap-3">
                <Bell className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {notification.title || t('notifications.defaultTitle')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {notification.message || t('notifications.noMessage')}
                  </p>
                  {notification.created_at && !isNaN(new Date(notification.created_at).getTime()) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}