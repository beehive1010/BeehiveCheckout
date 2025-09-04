import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

  // Get wallet address from context/auth (you'll need to implement this)
  const walletAddress = "0x1234567890123456789012345678901234567890"; // Replace with actual wallet address

  // Fetch notification stats
  const { data: stats } = useQuery<NotificationStats>({
    queryKey: ['/api/notifications/stats'],
    enabled: !!walletAddress,
  });

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
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToDashboard}
                  data-testid="back-to-dashboard"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('notificationsPage.backToDashboard')}
                </Button>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-full">
                    <Bell className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-2xl">
                      {t('notificationsPage.title')}
                    </CardTitle>
                    <p className="text-gray-400 mt-1">
                      {t('notificationsPage.subtitle')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {stats && (
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{stats.totalCount}</p>
                      <p className="text-sm text-gray-400">{t('notificationsPage.stats.total')}</p>
                    </div>
                    
                    {stats.unreadCount > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-400">{stats.unreadCount}</p>
                        <p className="text-sm text-gray-400">{t('notificationsPage.stats.unread')}</p>
                      </div>
                    )}
                    
                    {stats.urgentCount > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-400">{stats.urgentCount}</p>
                        <p className="text-sm text-gray-400">{t('notificationsPage.stats.urgent')}</p>
                      </div>
                    )}
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  data-testid="notification-settings"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {t('notificationsPage.settings')}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notification List */}
          <div className="lg:col-span-2">
            <NotificationInbox
              walletAddress={walletAddress}
              onNotificationClick={handleNotificationClick}
              compact={false}
            />
          </div>
          
          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedNotification ? (
              <div className="sticky top-4">
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
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20 h-96">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
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
          <CardHeader>
            <CardTitle className="text-yellow-400">{t('notificationsPage.quickActions.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-16 flex flex-col items-center justify-center gap-2"
                data-testid="quick-action-urgent"
              >
                <Badge className="bg-red-500">
                  {stats?.urgentCount || 0}
                </Badge>
                <span>{t('notificationsPage.quickActions.urgentNotifications')}</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-16 flex flex-col items-center justify-center gap-2"
                data-testid="quick-action-action-required"
              >
                <Badge className="bg-yellow-500 text-black">
                  {stats?.actionRequiredCount || 0}
                </Badge>
                <span>{t('notificationsPage.quickActions.actionRequired')}</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-16 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate('/dashboard/matrix')}
                data-testid="quick-action-matrix"
              >
                <Bell className="w-5 h-5" />
                <span>{t('notificationsPage.quickActions.matrixDashboard')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-gray-900 border-yellow-500/20">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">{t('notificationsPage.settingsDialog.title')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-4">
              <h4 className="text-white font-medium">{t('notificationsPage.settingsDialog.emailNotifications')}</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-300">{t('notificationsPage.settingsDialog.memberActivations')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-300">{t('notificationsPage.settingsDialog.levelUpgrades')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-300">{t('notificationsPage.settingsDialog.upgradeReminders')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-300">{t('notificationsPage.settingsDialog.rewardNotifications')}</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white font-medium">{t('notificationsPage.settingsDialog.pushNotifications')}</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-300">{t('notificationsPage.settingsDialog.urgentNotifications')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-gray-300">{t('notificationsPage.settingsDialog.highPriorityOnly')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-gray-300">{t('notificationsPage.settingsDialog.allNotifications')}</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                {t('notificationsPage.settingsDialog.cancel')}
              </Button>
              <Button 
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
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