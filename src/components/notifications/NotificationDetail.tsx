import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Users, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  DollarSign,
  X,
  ExternalLink,
  Eye,
  Archive,
  Trash2,
  Calendar,
  User,
  Target,
  MapPin
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useI18n } from '@/contexts/I18nContext';

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
  layer?: number;
  position?: 'L' | 'M' | 'R';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionRequired: boolean;
  actionType?: string;
  actionUrl?: string;
  expiresAt?: string;
  reminderSentAt?: string;
  isRead: boolean;
  isArchived: boolean;
  emailSent: boolean;
  emailSentAt?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface NotificationDetailProps {
  notification: Notification;
  onClose?: () => void;
  onUpdate?: () => void;
  compact?: boolean;
}

export default function NotificationDetail({ 
  notification, 
  onClose, 
  onUpdate,
  compact = false 
}: NotificationDetailProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/notifications/${notification.id}/read`, {
        method: 'PATCH',
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/stats'] });
      onUpdate?.();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/notifications/${notification.id}/archive`, {
        method: 'PATCH',
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/stats'] });
      onUpdate?.();
      onClose?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/notifications/${notification.id}`, {
        method: 'DELETE',
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/stats'] });
      onUpdate?.();
      onClose?.();
    },
  });

  // Get notification icon and styling
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'member_activated':
        return { icon: <Users className="w-6 h-6" />, color: 'text-green-500', bg: 'bg-green-500/10' };
      case 'level_upgraded':
        return { icon: <TrendingUp className="w-6 h-6" />, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'upgrade_reminder':
        return { icon: <Clock className="w-6 h-6" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
      case 'countdown_warning':
        return { icon: <AlertCircle className="w-6 h-6" />, color: 'text-red-500', bg: 'bg-red-500/10' };
      case 'reward_received':
        return { icon: <DollarSign className="w-6 h-6" />, color: 'text-green-500', bg: 'bg-green-500/10' };
      case 'referral_joined':
        return { icon: <Users className="w-6 h-6" />, color: 'text-purple-500', bg: 'bg-purple-500/10' };
      case 'matrix_placement':
        return { icon: <MapPin className="w-6 h-6" />, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'system_announcement':
        return { icon: <Bell className="w-6 h-6" />, color: 'text-gray-500', bg: 'bg-gray-500/10' };
      default:
        return { icon: <Bell className="w-6 h-6" />, color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  const getPriorityBadge = () => {
    switch (notification.priority) {
      case 'urgent':
        return <Badge className="bg-red-500 text-white">{t('notifications.priority.urgent')}</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">{t('notifications.priority.high')}</Badge>;
      case 'normal':
        return <Badge variant="secondary">{t('notifications.priority.normal')}</Badge>;
      case 'low':
        return <Badge variant="outline">{t('notifications.priority.low')}</Badge>;
      default:
        return null;
    }
  };

  const getTypeLabel = () => {
    switch (notification.type) {
      case 'member_activated':
        return t('notifications.types.membership_activation');
      case 'level_upgraded':
        return t('notifications.types.level_unlock');
      case 'upgrade_reminder':
        return t('notifications.types.upgrade_reminder');
      case 'countdown_warning':
        return t('notifications.types.countdown_warning');
      case 'reward_received':
        return t('notifications.types.reward_claim');
      case 'referral_joined':
        return t('notifications.types.referral_bonus');
      case 'matrix_placement':
        return t('notifications.types.matrix_placement');
      case 'system_announcement':
        return t('notifications.types.system_update');
      default:
        return t('notifications.types.notification');
    }
  };

  const iconConfig = getNotificationIcon();

  const handleTakeAction = () => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${iconConfig.bg}`}>
              <div className={iconConfig.color}>
                {iconConfig.icon}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-white text-lg">
                  {notification.title}
                </CardTitle>
                {!notification.isRead && (
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                    {t('notifications.new')}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {getPriorityBadge()}
                <Badge variant="outline" className="text-gray-300">
                  {getTypeLabel()}
                </Badge>
                {notification.actionRequired && (
                  <Badge className="bg-yellow-500/20 text-yellow-400">
                    {t('notifications.actionRequired')}
                  </Badge>
                )}
                {notification.isArchived && (
                  <Badge variant="outline" className="text-gray-500">
                    {t('notifications.archived')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="close-notification-detail"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Message */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">{t('notifications.message')}</h4>
          <p className="text-white leading-relaxed">
            {notification.message}
          </p>
        </div>

        {/* Amount Information */}
        {notification.amount && notification.amountType && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">
                {t('notifications.amount')}: {notification.amount} {notification.amountType}
              </span>
            </div>
          </div>
        )}

        {/* Matrix Information */}
        {(notification.level || notification.layer || notification.position) && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">{t('notifications.matrixInfo')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {notification.level && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-300">{t('notifications.level')}</span>
                  </div>
                  <p className="text-white font-medium mt-1">
                    {t('notifications.levelValue', { level: notification.level })}
                  </p>
                </div>
              )}
              
              {notification.layer && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-300">{t('notifications.layer')}</span>
                  </div>
                  <p className="text-white font-medium mt-1">
                    {t('notifications.layerValue', { layer: notification.layer })}
                  </p>
                </div>
              )}
              
              {notification.position && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-300">{t('notifications.position')}</span>
                  </div>
                  <p className="text-white font-medium mt-1">
                    {t('notifications.positionValue', { position: notification.position })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Related Wallets */}
        {(notification.triggerWallet || notification.relatedWallet) && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">{t('notifications.relatedMembers')}</h4>
            <div className="space-y-2">
              {notification.triggerWallet && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">{t('notifications.triggeredBy')}:</span>
                  <code className="bg-gray-800 px-2 py-1 rounded text-blue-400">
                    {notification.triggerWallet.slice(0, 6)}...{notification.triggerWallet.slice(-4)}
                  </code>
                </div>
              )}
              
              {notification.relatedWallet && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300">{t('notifications.relatedMember')}:</span>
                  <code className="bg-gray-800 px-2 py-1 rounded text-purple-400">
                    {notification.relatedWallet.slice(0, 6)}...{notification.relatedWallet.slice(-4)}
                  </code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timing Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">{t('notifications.timing')}</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">{t('notifications.created')}:</span>
              <span className="text-white">
                {notification.createdAt && !isNaN(new Date(notification.createdAt).getTime()) 
                  ? format(new Date(notification.createdAt), 'PPP p')
                  : t('notifications.time.recently')
                }
              </span>
              <span className="text-gray-400">
                ({notification.createdAt && !isNaN(new Date(notification.createdAt).getTime()) 
                  ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                  : t('notifications.time.recently')
                })
              </span>
            </div>
            
            {notification.expiresAt && !isNaN(new Date(notification.expiresAt).getTime()) && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300">{t('notifications.expires')}:</span>
                <span className="text-yellow-400">
                  {format(new Date(notification.expiresAt), 'PPP p')}
                </span>
                <span className="text-yellow-300">
                  ({formatDistanceToNow(new Date(notification.expiresAt), { addSuffix: true })})
                </span>
              </div>
            )}
            
            {notification.emailSent && notification.emailSentAt && !isNaN(new Date(notification.emailSentAt).getTime()) && (
              <div className="flex items-center gap-2 text-sm">
                <Bell className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">{t('notifications.emailSent')}:</span>
                <span className="text-green-400">
                  {format(new Date(notification.emailSentAt), 'PPP p')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">{t('notifications.additionalInfo')}</h4>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(notification.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <Separator className="bg-gray-700" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2">
            {notification.actionRequired && notification.actionUrl && (
              <Button
                onClick={handleTakeAction}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
                data-testid="take-action-button"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {notification.actionType || t('notifications.takeAction')}
              </Button>
            )}
            
            {!notification.isRead && (
              <Button
                onClick={() => markAsReadMutation.mutate()}
                disabled={markAsReadMutation.isPending}
                variant="outline"
                data-testid="mark-read-button"
              >
                <Eye className="w-4 h-4 mr-2" />
                {t('notifications.actions.markAsRead')}
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {!notification.isArchived && (
              <Button
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
                variant="outline"
                data-testid="archive-button"
              >
                <Archive className="w-4 h-4 mr-2" />
                {t('notifications.actions.archive')}
              </Button>
            )}
            
            <Button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              variant="destructive"
              data-testid="delete-button"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('notifications.actions.delete')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}