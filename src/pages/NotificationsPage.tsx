import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Bell, 
  ArrowLeft,
  Settings,
  Filter
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useI18n } from '@/contexts/I18nContext';
import { useWallet } from '@/hooks/useWallet';
import NotificationInbox from '@/components/notifications/NotificationInbox';
import NotificationDetail from '@/components/notifications/NotificationDetail';
import NotificationPopup from '@/components/notifications/NotificationPopup';

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

interface NotificationStats {
  unreadCount: number;
  totalCount: number;
  urgentCount: number;
  actionRequiredCount: number;
}

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useI18n();
  const { walletAddress } = useWallet();

  // Fetch notification stats
  const { data: statsData } = useQuery({
    queryKey: ['/api/notifications/stats', walletAddress],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/notifications/stats', undefined, walletAddress);
      return await response.json();
    },
    enabled: !!walletAddress,
  });

  // Extract stats from response
  const stats = statsData?.stats || statsData?.data || statsData;

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
  };

  const handleCloseDetail = () => {
    setSelectedNotification(null);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      {/* Notification Popup */}
      <NotificationPopup
        walletAddress={walletAddress}
        onNotificationClick={handleNotificationClick}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-yellow-500/20">
          <CardHeader className="p-4 lg:p-6">
            <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
              {/* Top Row - Back Button and Title */}
              <div className="flex items-center gap-2 lg:gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToDashboard}
                  data-testid="back-to-dashboard"
                  className="p-1 lg:p-2"
                >
                  <ArrowLeft className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">{t('notificationsPage.backToDashboard')}</span>
                </Button>
                
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="p-1.5 lg:p-2 bg-yellow-500/20 rounded-full">
                    <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg lg:text-2xl">
                      {t('notificationsPage.title')}
                    </CardTitle>
                    <p className="text-gray-400 mt-1 text-sm lg:text-base hidden lg:block">
                      {t('notificationsPage.subtitle')}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Stats and Settings */}
              <div className="flex items-center justify-between lg:gap-4">
                {/* Stats - Mobile: Horizontal scroll, Desktop: Normal */}
                {stats && (
                  <div className="flex items-center gap-3 lg:gap-4 overflow-x-auto lg:overflow-visible">
                    <div className="text-center flex-shrink-0">
                      <p className="text-lg lg:text-2xl font-bold text-white">{stats.totalCount}</p>
                      <p className="text-xs lg:text-sm text-gray-400">{t('notificationsPage.stats.total')}</p>
                    </div>
                    
                    {stats.unreadCount > 0 && (
                      <div className="text-center flex-shrink-0">
                        <p className="text-lg lg:text-2xl font-bold text-yellow-400">{stats.unreadCount}</p>
                        <p className="text-xs lg:text-sm text-gray-400">{t('notificationsPage.stats.unread')}</p>
                      </div>
                    )}
                    
                    {stats.urgentCount > 0 && (
                      <div className="text-center flex-shrink-0">
                        <p className="text-lg lg:text-2xl font-bold text-red-400">{stats.urgentCount}</p>
                        <p className="text-xs lg:text-sm text-gray-400">{t('notificationsPage.stats.urgent')}</p>
                      </div>
                    )}
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  data-testid="notification-settings"
                  className="flex-shrink-0"
                >
                  <Settings className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">{t('notificationsPage.settings')}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Notification List */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <NotificationInbox
              walletAddress={walletAddress}
              onNotificationClick={handleNotificationClick}
              compact={false}
            />
          </div>
          
          {/* Detail Panel */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            {selectedNotification ? (
              <div className="lg:sticky lg:top-4">
                <NotificationDetail
                  notification={selectedNotification}
                  onClose={handleCloseDetail}
                  onUpdate={() => {
                    // Refresh notifications list
                    setSelectedNotification(null);
                  }}
                />
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20 h-64 lg:h-96 hidden lg:block">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Bell className="w-8 h-8 lg:w-12 lg:h-12 text-gray-600 mx-auto mb-2 lg:mb-4" />
                    <p className="text-gray-400 text-sm lg:text-base">
                      {t('notificationsPage.detail.selectNotification')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-yellow-400 text-lg lg:text-xl">{t('notificationsPage.quickActions.title')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              <Button
                variant="outline"
                className="h-14 lg:h-16 flex flex-col items-center justify-center gap-1 lg:gap-2 text-sm lg:text-base"
                data-testid="quick-action-urgent"
              >
                <Badge className="bg-red-500 text-xs lg:text-sm">
                  {stats?.urgentCount || 0}
                </Badge>
                <span className="text-center leading-tight">{t('notificationsPage.quickActions.urgentNotifications')}</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-14 lg:h-16 flex flex-col items-center justify-center gap-1 lg:gap-2 text-sm lg:text-base"
                data-testid="quick-action-action-required"
              >
                <Badge className="bg-yellow-500 text-black text-xs lg:text-sm">
                  {stats?.actionRequiredCount || 0}
                </Badge>
                <span className="text-center leading-tight">{t('notificationsPage.quickActions.actionRequired')}</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-14 lg:h-16 flex flex-col items-center justify-center gap-1 lg:gap-2 text-sm lg:text-base sm:col-span-2 lg:col-span-1"
                onClick={() => navigate('/dashboard/matrix')}
                data-testid="quick-action-matrix"
              >
                <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="text-center leading-tight">{t('notificationsPage.quickActions.matrixDashboard')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-gray-900 border-yellow-500/20 max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 text-lg lg:text-xl">{t('notificationsPage.settingsDialog.title')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 lg:space-y-6">
            <div className="space-y-3 lg:space-y-4">
              <h4 className="text-white font-medium text-sm lg:text-base">{t('notificationsPage.settingsDialog.emailNotifications')}</h4>
              <div className="space-y-2 lg:space-y-3">
                <label className="flex items-center gap-2 lg:gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
                  <span className="text-gray-300 text-sm lg:text-base">{t('notificationsPage.settingsDialog.memberActivations')}</span>
                </label>
                <label className="flex items-center gap-2 lg:gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
                  <span className="text-gray-300 text-sm lg:text-base">{t('notificationsPage.settingsDialog.levelUpgrades')}</span>
                </label>
                <label className="flex items-center gap-2 lg:gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
                  <span className="text-gray-300 text-sm lg:text-base">{t('notificationsPage.settingsDialog.upgradeReminders')}</span>
                </label>
                <label className="flex items-center gap-2 lg:gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
                  <span className="text-gray-300 text-sm lg:text-base">{t('notificationsPage.settingsDialog.rewardNotifications')}</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-3 lg:space-y-4">
              <h4 className="text-white font-medium text-sm lg:text-base">{t('notificationsPage.settingsDialog.pushNotifications')}</h4>
              <div className="space-y-2 lg:space-y-3">
                <label className="flex items-center gap-2 lg:gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
                  <span className="text-gray-300 text-sm lg:text-base">{t('notificationsPage.settingsDialog.urgentNotifications')}</span>
                </label>
                <label className="flex items-center gap-2 lg:gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
                  <span className="text-gray-300 text-sm lg:text-base">{t('notificationsPage.settingsDialog.highPriorityOnly')}</span>
                </label>
                <label className="flex items-center gap-2 lg:gap-3 cursor-pointer">
                  <input type="checkbox" className="rounded w-4 h-4" />
                  <span className="text-gray-300 text-sm lg:text-base">{t('notificationsPage.settingsDialog.allNotifications')}</span>
                </label>
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 lg:gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowSettings(false)}
                className="w-full sm:w-auto"
              >
                {t('notificationsPage.settingsDialog.cancel')}
              </Button>
              <Button 
                className="bg-yellow-500 hover:bg-yellow-600 text-black w-full sm:w-auto"
                onClick={() => setShowSettings(false)}
              >
                {t('notificationsPage.settingsDialog.saveSettings')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}