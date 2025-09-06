import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Bell, 
  BellOff,
  Check,
  X,
  Gift,
  TrendingUp,
  Users,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Settings,
  Trash2,
  MarkAsRead
} from 'lucide-react';
import { useToast } from '../ui/toast-system';
import { LoadingSpinner } from '../ui/loading-spinner';
import { FadeTransition, StaggeredList, ScaleTransition } from '../ui/transitions';
import { cn } from '../../lib/utils';

export type NotificationType = 
  | 'reward_claim' 
  | 'level_upgrade' 
  | 'referral_join' 
  | 'system_update' 
  | 'payment_success' 
  | 'payment_failed'
  | 'matrix_full'
  | 'reward_expiry';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, any>;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  reward_notifications: boolean;
  referral_notifications: boolean;
  system_notifications: boolean;
  marketing_notifications: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Mock notification data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'reward_claim',
    priority: 'high',
    title: 'Layer Reward Available',
    message: 'You have a $50 USDT layer reward ready to claim from Layer 1.',
    is_read: false,
    created_at: '2024-09-06T08:30:00Z',
    expires_at: '2024-09-09T08:30:00Z',
    action_url: '/rewards',
    action_label: 'Claim Now',
    metadata: { layer: 1, amount: 50 }
  },
  {
    id: '2',
    type: 'referral_join',
    priority: 'medium',
    title: 'New Referral Joined',
    message: 'Alice has joined your network and activated Level 1 membership.',
    is_read: false,
    created_at: '2024-09-05T14:20:00Z',
    action_url: '/referrals',
    action_label: 'View Network',
    metadata: { referred_user: 'Alice', level: 1 }
  },
  {
    id: '3',
    type: 'level_upgrade',
    priority: 'high',
    title: 'Level 2 Unlocked!',
    message: 'Congratulations! You can now upgrade to Level 2 membership.',
    is_read: true,
    created_at: '2024-09-04T16:45:00Z',
    action_url: '/upgrade',
    action_label: 'Upgrade Now',
    metadata: { new_level: 2 }
  },
  {
    id: '4',
    type: 'reward_expiry',
    priority: 'urgent',
    title: 'Reward Expiring Soon',
    message: 'Your $100 layer reward will expire in 24 hours. Claim it now to avoid losing it.',
    is_read: false,
    created_at: '2024-09-06T06:00:00Z',
    expires_at: '2024-09-07T06:00:00Z',
    action_url: '/rewards',
    action_label: 'Claim Before Expiry',
    metadata: { layer: 2, amount: 100, expires_in_hours: 24 }
  },
  {
    id: '5',
    type: 'payment_success',
    priority: 'medium',
    title: 'Payment Confirmed',
    message: 'Your NFT Level 2 purchase has been confirmed on the blockchain.',
    is_read: true,
    created_at: '2024-09-05T10:32:00Z',
    metadata: { transaction_hash: '0xabc123...', level: 2 }
  },
  {
    id: '6',
    type: 'matrix_full',
    priority: 'medium',
    title: 'Matrix Layer Filled',
    message: 'Your Layer 1 matrix is now completely filled with active members.',
    is_read: false,
    created_at: '2024-09-03T12:15:00Z',
    action_url: '/matrix',
    action_label: 'View Matrix',
    metadata: { layer: 1, filled_positions: 2 }
  }
];

const defaultSettings: NotificationSettings = {
  email_notifications: true,
  push_notifications: true,
  reward_notifications: true,
  referral_notifications: true,
  system_notifications: true,
  marketing_notifications: false
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      settings,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      updateSettings
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationSystemProps {
  className?: string;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ className }) => {
  const { 
    notifications, 
    unreadCount, 
    settings,
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    updateSettings
  } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'reward_claim': return <Gift className="h-5 w-5" />;
      case 'level_upgrade': return <TrendingUp className="h-5 w-5" />;
      case 'referral_join': return <Users className="h-5 w-5" />;
      case 'system_update': return <Info className="h-5 w-5" />;
      case 'payment_success': return <CheckCircle className="h-5 w-5" />;
      case 'payment_failed': return <AlertTriangle className="h-5 w-5" />;
      case 'matrix_full': return <Users className="h-5 w-5" />;
      case 'reward_expiry': return <Clock className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: NotificationType, priority: NotificationPriority) => {
    if (priority === 'urgent') return 'text-red-600 dark:text-red-400';
    if (priority === 'high') return 'text-orange-600 dark:text-orange-400';
    
    switch (type) {
      case 'reward_claim': return 'text-green-600 dark:text-green-400';
      case 'level_upgrade': return 'text-blue-600 dark:text-blue-400';
      case 'referral_join': return 'text-purple-600 dark:text-purple-400';
      case 'payment_success': return 'text-green-600 dark:text-green-400';
      case 'payment_failed': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    const variants = {
      low: { variant: 'outline' as const, color: 'text-muted-foreground' },
      medium: { variant: 'secondary' as const, color: 'text-blue-600' },
      high: { variant: 'default' as const, color: 'text-orange-600' },
      urgent: { variant: 'destructive' as const, color: 'text-red-600' }
    };

    const config = variants[priority];
    return (
      <Badge variant={config.variant} className="text-xs">
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const handleAction = (notification: Notification) => {
    if (notification.action_url) {
      // In a real app, this would navigate to the action URL
      toast.info('Navigation', `Navigating to ${notification.action_label || 'action'}`);
      markAsRead(notification.id);
    }
  };

  const renderNotification = (notification: Notification, index: number) => (
    <ScaleTransition key={notification.id} show={true}>
      <div
        className={cn(
          'p-4 border rounded-lg transition-all duration-200',
          !notification.is_read ? 'bg-primary/5 border-primary/20' : 'bg-muted/20 border-muted',
          'hover:shadow-md cursor-pointer'
        )}
        onClick={() => !notification.is_read && markAsRead(notification.id)}
      >
        <div className="flex items-start space-x-4">
          <div className={cn(
            'p-2 rounded-full flex-shrink-0',
            notification.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/20' :
            notification.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/20' :
            'bg-muted'
          )}>
            <div className={getNotificationColor(notification.type, notification.priority)}>
              {getNotificationIcon(notification.type)}
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <h4 className={cn(
                'font-medium',
                !notification.is_read && 'font-semibold'
              )}>
                {notification.title}
              </h4>
              <div className="flex items-center space-x-2">
                {getPriorityBadge(notification.priority)}
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {notification.message}
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(notification.created_at).toLocaleString()}</span>
              {notification.expires_at && (
                <span className="text-orange-600 dark:text-orange-400">
                  Expires: {new Date(notification.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {notification.action_url && (
              <div className="flex items-center space-x-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(notification);
                  }}
                >
                  {notification.action_label || 'View'}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ScaleTransition>
  );

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-honey" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={markAllAsRead}>
              <MarkAsRead className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <StaggeredList show={true} staggerDelay={50}>
                  {notifications.map((notification, index) => 
                    renderNotification(notification, index)
                  )}
                </StaggeredList>
              )}
            </div>
          </TabsContent>

          <TabsContent value="unread" className="mt-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {unreadNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No unread notifications</p>
                  <p className="text-sm">You're all up to date!</p>
                </div>
              ) : (
                <StaggeredList show={true} staggerDelay={50}>
                  {unreadNotifications.map((notification, index) => 
                    renderNotification(notification, index)
                  )}
                </StaggeredList>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Notification Preferences</span>
                </h3>
                
                <div className="space-y-3">
                  {Object.entries(settings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-sm font-medium capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <Button
                        size="sm"
                        variant={value ? "default" : "outline"}
                        onClick={() => updateSettings({ [key]: !value })}
                      >
                        {value ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => toast.success('Settings Saved', 'Your notification preferences have been updated.')}
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NotificationSystem;