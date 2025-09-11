import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, BellRing, Coins, TrendingUp, Users, Star } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useI18n } from '@/contexts/I18nContext';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: 'bcc_reward' | 'level_upgrade' | 'referral_joined' | 'matrix_placement' | 'earnings';
  relatedWallet?: string;
  amount?: string;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'bcc_reward':
      return <Coins className="h-4 w-4 text-honey" />;
    case 'level_upgrade':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'referral_joined':
      return <Users className="h-4 w-4 text-blue-500" />;
    case 'matrix_placement':
      return <Star className="h-4 w-4 text-purple-500" />;
    case 'earnings':
      return <TrendingUp className="h-4 w-4 text-honey" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const getNotificationBadgeColor = (type: string) => {
  switch (type) {
    case 'bcc_reward':
      return 'bg-honey text-black';
    case 'level_upgrade':
      return 'bg-green-500 text-white';
    case 'referral_joined':
      return 'bg-blue-500 text-white';
    case 'matrix_placement':
      return 'bg-purple-500 text-white';
    case 'earnings':
      return 'bg-honey text-black';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function Notifications() {
  const { walletAddress } = useWallet();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  const { data: notifications = [], isLoading } = useQuery<UserNotification[]>({
    queryKey: ['/api/notifications', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const response = await fetch(`/api/notifications?t=${Date.now()}`, {
        credentials: 'include',
        headers: { 
          'X-Wallet-Address': walletAddress,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!walletAddress,
    refetchInterval: 5000, // Check for new notifications every 5 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { 'X-Wallet-Address': walletAddress! }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'X-Wallet-Address': walletAddress! }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const displayNotifications = showAll ? notifications : notifications.slice(0, 5);

  if (isLoading) {
    return (
      <Card className="bg-secondary border-border glow-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('notifications.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary border-border glow-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5 text-honey" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {t('notifications.title')}
            {unreadCount > 0 && (
              <Badge className="bg-honey text-black ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t('notifications.empty.title')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('notifications.empty.description')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-muted/30 rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  !notification.isRead ? 'border-l-4 border-l-honey' : ''
                }`}
                onClick={() => !notification.isRead && markAsReadMutation.mutate(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-medium text-sm truncate ${
                        !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {notification.title}
                      </h4>
                      <Badge 
                        className={`text-xs px-2 py-0 ${getNotificationBadgeColor(notification.type)}`}
                        variant="secondary"
                      >
                        {notification.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <p className={`text-xs ${
                      !notification.isRead ? 'text-muted-foreground' : 'text-muted-foreground/70'
                    }`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {notification.createdAt && !isNaN(new Date(notification.createdAt).getTime())
                          ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                          : 'Recently'
                        }
                      </span>
                      {notification.amount && (
                        <span className="text-xs font-medium text-honey">
                          {notification.amount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {notifications.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="w-full"
              >
                {showAll ? t('notifications.showLess') : t('notifications.showAll', { count: notifications.length })}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}