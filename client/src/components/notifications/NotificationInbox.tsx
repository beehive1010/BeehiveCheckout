import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellRing, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  DollarSign,
  Archive,
  Trash2,
  Eye,
  ExternalLink,
  Filter,
  Search
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
  layer?: number;
  position?: 'L' | 'M' | 'R';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionRequired: boolean;
  actionType?: string;
  actionUrl?: string;
  expiresAt?: string;
  isRead: boolean;
  isArchived: boolean;
  emailSent: boolean;
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

interface NotificationInboxProps {
  walletAddress: string;
  onNotificationClick?: (notification: Notification) => void;
  compact?: boolean;
}

export default function NotificationInbox({ 
  walletAddress, 
  onNotificationClick,
  compact = false 
}: NotificationInboxProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch notification stats
  const { data: stats } = useQuery<NotificationStats>({
    queryKey: ['/api/notifications/stats'],
    enabled: !!walletAddress,
  });

  // Fetch notifications with filters
  const getNotificationsFilters = () => {
    const filters: any = {};
    
    switch (activeTab) {
      case 'unread':
        filters.isRead = false;
        break;
      case 'urgent':
        filters.priority = 'urgent';
        break;
      case 'action':
        filters.actionRequired = true;
        break;
      case 'archived':
        filters.isArchived = true;
        break;
      default:
        filters.isArchived = false;
    }
    
    if (compact) {
      filters.limit = 5;
    }
    
    return filters;
  };

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', activeTab, walletAddress],
    queryParams: getNotificationsFilters(),
    enabled: !!walletAddress,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/stats'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/notifications/read-all', {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/stats'] });
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest(`/api/notifications/${notificationId}/archive`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/stats'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/stats'] });
    },
  });

  // Get notification icon
  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'member_activated':
        return <Users className="w-4 h-4 text-green-500" />;
      case 'level_upgraded':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'upgrade_reminder':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'countdown_warning':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'reward_received':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'normal':
        return 'bg-blue-500';
      case 'low':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
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
  };

  // Filter notifications by search term
  const filteredNotifications = notifications.filter(notification =>
    searchTerm === '' ||
    notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            {stats && stats.unreadCount > 0 && (
              <Badge variant="destructive" className="bg-red-500">
                {stats.unreadCount}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {isLoading ? (
              <div className="text-center py-4 text-gray-400">
                Loading notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                No notifications
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-700/50 ${
                      notification.isRead 
                        ? 'border-gray-600 bg-gray-800/50' 
                        : 'border-yellow-500/30 bg-yellow-500/5'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">
                            {notification.title}
                          </p>
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {notification.actionRequired && (
                        <ExternalLink className="w-3 h-3 text-yellow-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalCount}</p>
                  <p className="text-sm text-blue-200">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BellRing className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.unreadCount}</p>
                  <p className="text-sm text-yellow-200">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.urgentCount}</p>
                  <p className="text-sm text-red-200">Urgent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.actionRequiredCount}</p>
                  <p className="text-sm text-green-200">Action Required</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Actions */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:border-yellow-500 focus:outline-none flex-1"
                data-testid="search-notifications"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending || stats?.unreadCount === 0}
                variant="outline"
                size="sm"
                data-testid="mark-all-read-button"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
        <CardHeader>
          <CardTitle className="text-yellow-400">Inbox</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 bg-gray-800">
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="unread" data-testid="tab-unread">
                Unread {stats?.unreadCount ? `(${stats.unreadCount})` : ''}
              </TabsTrigger>
              <TabsTrigger value="urgent" data-testid="tab-urgent">
                Urgent {stats?.urgentCount ? `(${stats.urgentCount})` : ''}
              </TabsTrigger>
              <TabsTrigger value="action" data-testid="tab-action">
                Action {stats?.actionRequiredCount ? `(${stats.actionRequiredCount})` : ''}
              </TabsTrigger>
              <TabsTrigger value="archived" data-testid="tab-archived">Archived</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="text-center py-8 text-gray-400">
                  Loading notifications...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No notifications found
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {filteredNotifications.map((notification, index) => (
                      <div key={notification.id}>
                        <div
                          className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                            notification.isRead 
                              ? 'border-gray-600 bg-gray-800/50' 
                              : 'border-yellow-500/30 bg-yellow-500/5 shadow-yellow-500/10'
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                          data-testid={`notification-item-${notification.id}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              {getNotificationIcon(notification)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-white">
                                      {notification.title}
                                    </h3>
                                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`} />
                                    {notification.actionRequired && (
                                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                                        Action Required
                                      </Badge>
                                    )}
                                    {!notification.isRead && (
                                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                                        New
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <p className="text-gray-300 mb-3">
                                    {notification.message}
                                  </p>
                                  
                                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                    <span>
                                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                    </span>
                                    
                                    {notification.amount && notification.amountType && (
                                      <span className="text-green-400">
                                        {notification.amount} {notification.amountType}
                                      </span>
                                    )}
                                    
                                    {notification.level && (
                                      <span>Level {notification.level}</span>
                                    )}
                                    
                                    {notification.expiresAt && (
                                      <span className="text-yellow-400">
                                        Expires {formatDistanceToNow(new Date(notification.expiresAt), { addSuffix: true })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {notification.actionUrl && (
                                    <Button
                                      size="sm"
                                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = notification.actionUrl!;
                                      }}
                                      data-testid={`action-button-${notification.id}`}
                                    >
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      {notification.actionType || 'Take Action'}
                                    </Button>
                                  )}
                                  
                                  {!notification.isRead && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsReadMutation.mutate(notification.id);
                                      }}
                                      data-testid={`mark-read-button-${notification.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  )}
                                  
                                  {activeTab !== 'archived' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        archiveMutation.mutate(notification.id);
                                      }}
                                      data-testid={`archive-button-${notification.id}`}
                                    >
                                      <Archive className="w-4 h-4" />
                                    </Button>
                                  )}
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteMutation.mutate(notification.id);
                                    }}
                                    data-testid={`delete-button-${notification.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {index < filteredNotifications.length - 1 && (
                          <Separator className="my-4 bg-gray-700" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}