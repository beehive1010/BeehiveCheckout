import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  X, 
  Users, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  DollarSign,
  ExternalLink,
  Eye,
  Archive
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  recipientWallet: string;
  title: string;
  message: string;
  type: string;
  triggerWallet?: string;
  relatedWallet?: string;
  amount?: number;
  amountType?: 'USDT' | 'BCC';
  level?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionRequired: boolean;
  actionType?: string;
  actionUrl?: string;
  expiresAt?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationPopupProps {
  walletAddress: string;
  maxNotifications?: number;
  autoHideDelay?: number; // milliseconds
  onNotificationClick?: (notification: Notification) => void;
  className?: string;
}

export default function NotificationPopup({ 
  walletAddress,
  maxNotifications = 3,
  autoHideDelay = 8000,
  onNotificationClick,
  className = ''
}: NotificationPopupProps) {
  const { t } = useI18n();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);
  const queryClient = useQueryClient();

  // Fetch only unread urgent and high priority notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['/api/notifications', 'popup', walletAddress],
    queryFn: async () => {
      const response = await apiRequest('/api/notifications?' + new URLSearchParams({
        isRead: 'false',
        priority: 'urgent,high', // Filter for urgent and high priority
        limit: maxNotifications.toString(),
      }));
      return await response.json();
    },
    enabled: !!walletAddress && isVisible,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Extract notifications array from response with safe fallback
  const notifications = React.useMemo(() => {
    if (!notificationsData) return [];
    if (Array.isArray(notificationsData)) return notificationsData;
    if (Array.isArray(notificationsData.notifications)) return notificationsData.notifications;
    if (Array.isArray(notificationsData.data)) return notificationsData.data;
    if (Array.isArray(notificationsData.result)) return notificationsData.result;
    console.warn('NotificationPopup: Expected array but got:', notificationsData);
    return [];
  }, [notificationsData]);

  // Filter out dismissed notifications
  const visibleNotifications = React.useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    return notifications.filter(notification => 
      notification && notification.id && !dismissedIds.has(notification.id)
    );
  }, [notifications, dismissedIds]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Auto-hide notifications after delay
  useEffect(() => {
    if (visibleNotifications.length > 0 && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        visibleNotifications.forEach(notification => {
          setDismissedIds(prev => new Set(prev).add(notification.id));
        });
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [visibleNotifications, autoHideDelay]);

  // Get notification icon
  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'member_activated':
        return <Users className="w-5 h-5 text-green-400" />;
      case 'level_upgraded':
        return <TrendingUp className="w-5 h-5 text-blue-400" />;
      case 'upgrade_reminder':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'countdown_warning':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'reward_received':
        return <DollarSign className="w-5 h-5 text-green-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  // Get priority styling
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          border: 'border-red-500/50',
          bg: 'bg-gradient-to-r from-red-900/20 to-red-800/20',
          accent: 'border-l-red-500',
        };
      case 'high':
        return {
          border: 'border-orange-500/50',
          bg: 'bg-gradient-to-r from-orange-900/20 to-orange-800/20',
          accent: 'border-l-orange-500',
        };
      default:
        return {
          border: 'border-gray-500/50',
          bg: 'bg-gradient-to-r from-gray-900/20 to-gray-800/20',
          accent: 'border-l-gray-500',
        };
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    } else if (onNotificationClick) {
      onNotificationClick(notification);
    }
    
    // Dismiss after click
    setDismissedIds(prev => new Set(prev).add(notification.id));
  };

  // Handle dismiss
  const handleDismiss = (notificationId: string) => {
    setDismissedIds(prev => new Set(prev).add(notificationId));
  };

  // Handle mark as read without dismissing
  const handleMarkAsRead = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  // Don't render if no visible notifications
  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full ${className}`}>
      {visibleNotifications.map((notification, index) => {
        const priorityStyle = getPriorityStyle(notification.priority);
        
        return (
          <Card
            key={notification.id}
            className={`
              ${priorityStyle.bg} ${priorityStyle.border} ${priorityStyle.accent}
              border-l-4 shadow-lg backdrop-blur-sm
              animate-in slide-in-from-right duration-300
              cursor-pointer hover:shadow-xl transition-all
            `}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
            onClick={() => handleNotificationClick(notification)}
            data-testid={`notification-popup-${notification.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white text-sm truncate">
                        {notification.title}
                      </h4>
                      {notification.priority === 'urgent' && (
                        <Badge className="bg-red-500 text-white text-xs px-1 py-0">
                          Urgent
                        </Badge>
                      )}
                      {notification.priority === 'high' && (
                        <Badge className="bg-orange-500 text-white text-xs px-1 py-0">
                          High
                        </Badge>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(notification.id);
                      }}
                      data-testid={`dismiss-popup-${notification.id}`}
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </Button>
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed line-clamp-2 mb-3">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      {notification.amount && notification.amountType && (
                        <span className="text-green-400 text-sm font-medium">
                          {notification.amount} {notification.amountType}
                        </span>
                      )}
                      
                      <span className="text-gray-400 text-xs">
                        {notification.createdAt && !isNaN(new Date(notification.createdAt).getTime())
                          ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                          : t('notifications.time.recently')
                        }
                      </span>
                    </div>
                    
                    <div className="flex gap-1">
                      {notification.actionRequired && (
                        <Button
                          size="sm"
                          className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs px-2 py-1 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (notification.actionUrl) {
                              window.location.href = notification.actionUrl;
                            }
                          }}
                          data-testid={`action-popup-${notification.id}`}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          {notification.actionType || 'Act'}
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white text-xs px-2 py-1 h-auto"
                        onClick={(e) => handleMarkAsRead(e, notification.id)}
                        data-testid={`mark-read-popup-${notification.id}`}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {notification.expiresAt && !isNaN(new Date(notification.expiresAt).getTime()) && (
                    <div className="mt-2 flex items-center gap-1 text-yellow-400 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>
                        Expires {formatDistanceToNow(new Date(notification.expiresAt), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}