import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserPlus, ArrowRight, ArrowDown, Mail, Clock, MoreHorizontal, X, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useI18n } from '@/contexts/I18nContext';

interface OrganizationActivityItem {
  id: string;
  activityType: 'direct_referral' | 'placement' | 'downline_referral' | 'spillover';
  actorWallet: string;
  actorUsername?: string;
  targetWallet?: string;
  targetUsername?: string;
  message: string;
  metadata: {
    level?: number;
    position?: string;
    amount?: number;
    referralCode?: string;
  };
  isRead: boolean;
  createdAt: string;
}

interface OrganizationActivityProps {
  walletAddress: string;
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
  isPopup?: boolean;
  onClose?: () => void;
}

export function OrganizationActivity({ 
  walletAddress, 
  maxItems = 3, 
  showHeader = true,
  className = '',
  isPopup = false,
  onClose
}: OrganizationActivityProps) {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [showAllDialog, setShowAllDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [readItems, setReadItems] = useState<Set<string>>(new Set());
  
  const { data: activities, isLoading, refetch } = useQuery({
    queryKey: ['/api/organization/activity', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      const response = await fetch(`/api/organization/activity?limit=${maxItems * 2}`, {
        headers: {
          'x-wallet-address': walletAddress
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch organization activity');
      }
      return response.json();
    }
  });

  // Query for all activities (for dialog)
  const { data: allActivities, isLoading: isLoadingAll } = useQuery({
    queryKey: ['/api/organization/activity', walletAddress, 'all'],
    enabled: !!walletAddress && showAllDialog,
    queryFn: async () => {
      const response = await fetch(`/api/organization/activity?limit=50`, {
        headers: {
          'x-wallet-address': walletAddress
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch all organization activity');
      }
      return response.json();
    }
  });

  const activityData = activities as OrganizationActivityItem[] || [];
  
  // 去重逻辑：基于用户钱包地址 + 活动类型 + 时间范围去重
  const deduplicatedActivities = activityData.reduce((acc, current) => {
    const timeWindow = 60 * 60 * 1000; // 1小时时间窗口
    const currentTime = new Date(current.createdAt).getTime();
    
    // 检查是否有相似的活动（同一用户，同一类型，1小时内）
    const isDuplicate = acc.some(existing => 
      existing.actorWallet === current.actorWallet &&
      existing.activityType === current.activityType &&
      Math.abs(new Date(existing.createdAt).getTime() - currentTime) < timeWindow
    );
    
    if (!isDuplicate) {
      acc.push(current);
    }
    
    return acc;
  }, [] as OrganizationActivityItem[]);
  
  const displayLimit = isExpanded ? deduplicatedActivities.length : maxItems;
  const recentActivities = deduplicatedActivities.slice(0, displayLimit);
  const unreadCount = deduplicatedActivities.filter(item => !item.isRead && !readItems.has(item.id)).length;
  const hasMore = deduplicatedActivities.length > maxItems;

  // 标记单个消息为已读
  const markAsRead = (activityId: string) => {
    setReadItems(prev => new Set(prev).add(activityId));
  };

  // 标记所有消息为已读
  const markAllAsRead = () => {
    const allIds = deduplicatedActivities.map(item => item.id);
    setReadItems(new Set(allIds));
  };

  // 切换展开状态
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return t('referrals.organization.activities.timeAgo.minutes', { count: Math.max(1, Math.floor(diffInHours * 60)) });
    } else if (diffInHours < 24) {
      return t('referrals.organization.activities.timeAgo.hours', { count: Math.floor(diffInHours) });
    } else {
      return t('referrals.organization.activities.timeAgo.days', { count: Math.floor(diffInHours / 24) });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'direct_referral':
        return <UserPlus className="w-4 h-4 text-green-400" />;
      case 'placement':
        return <ArrowRight className="w-4 h-4 text-blue-400" />;
      case 'downline_referral':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'spillover':
        return <ArrowDown className="w-4 h-4 text-orange-400" />;
      default:
        return <Users className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'direct_referral':
        return t('referrals.organization.activities.direct_referral');
      case 'placement':
        return t('referrals.organization.activities.placement');
      case 'downline_referral':
        return t('referrals.organization.activities.upgrade');
      case 'spillover':
        return t('referrals.organization.activities.upgrade');
      default:
        return t('referrals.organization.activities.upgrade');
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'direct_referral':
        return 'border-green-500/20 bg-green-950/20';
      case 'placement':
        return 'border-blue-500/20 bg-blue-950/20';
      case 'downline_referral':
        return 'border-purple-500/20 bg-purple-950/20';
      case 'spillover':
        return 'border-orange-500/20 bg-orange-950/20';
      default:
        return 'border-gray-500/20 bg-gray-950/20';
    }
  };

  if (isLoading) {
    return (
      <Card className={`bg-secondary border-border ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 弹出式消息组件样式
  if (isPopup) {
    return (
      <div className={`fixed top-4 right-4 max-w-md w-full bg-secondary border border-honey/30 rounded-lg shadow-lg z-50 ${className}`}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-honey" />
            <span className="text-sm font-medium text-honey">{t('referrals.organization.title')}</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-6 px-2 text-xs text-green-400 hover:text-green-300"
                data-testid="mark-all-read"
              >
                <Check className="w-3 h-3 mr-1" />
                全部已读
              </Button>
            )}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                className="h-6 px-2 text-xs text-honey hover:text-honey/80"
                data-testid="toggle-expand"
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-300"
                data-testid="close-notifications"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* 消息列表 */}
        <div className="max-h-80 overflow-y-auto">
          {recentActivities.length > 0 ? (
            <div className="p-2">
              {recentActivities.map((activity) => {
                const isUnread = !activity.isRead && !readItems.has(activity.id);
                return (
                  <div
                    key={activity.id}
                    className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all ${
                      isUnread 
                        ? 'bg-honey/5 border-honey/30 hover:bg-honey/10' 
                        : 'bg-muted/30 border-transparent hover:bg-muted/50'
                    }`}
                    onClick={() => markAsRead(activity.id)}
                    data-testid={`activity-item-${activity.id}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.activityType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {activity.actorUsername || formatAddress(activity.actorWallet)}
                          </span>
                          {isUnread && (
                            <div className="w-2 h-2 bg-honey rounded-full"></div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getActivityTypeLabel(activity.activityType)} · {formatDate(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('referrals.organization.noActivity')}</p>
            </div>
          )}
        </div>

        {/* 底部 */}
        {hasMore && !isExpanded && (
          <div className="p-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="w-full text-xs text-honey hover:text-honey/80"
              data-testid="view-more-popup"
            >
              {t('referrals.organization.viewMore', { count: deduplicatedActivities.length - maxItems })}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 原有的卡片样式（非弹出模式）
  return (
    <Card className={`bg-secondary border-border ${className}`}>
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-honey flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('referrals.organization.title')}
            </CardTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
              <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    data-testid="button-view-all"
                  >
                    <MoreHorizontal className="w-3 h-3 mr-1" />
                    {t('referrals.organization.viewMore', { count: Math.max(0, deduplicatedActivities.length - maxItems) })}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="text-honey flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {t('referrals.organization.title')}
                    </DialogTitle>
                    <DialogDescription>
                      {t('referrals.organization.noActivityDesc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
                    {isLoadingAll ? (
                      <div className="animate-pulse space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-3/4"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (allActivities as OrganizationActivityItem[] || []).length > 0 ? (
                      (allActivities as OrganizationActivityItem[]).map((activity) => (
                        <div
                          key={activity.id}
                          className={`p-3 rounded-lg border ${getActivityColor(activity.activityType)} ${
                            !activity.isRead ? 'ring-1 ring-honey/30' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getActivityIcon(activity.activityType)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {getActivityTypeLabel(activity.activityType)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(activity.createdAt)}
                                </span>
                              </div>
                              
                              <p className="text-sm text-foreground mb-2">
                                {activity.actorUsername || formatAddress(activity.actorWallet)}
                              </p>
                              
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(activity.createdAt)}</span>
                                {activity.metadata.level && (
                                  <Badge variant="outline" className="text-xs">
                                    Level {activity.metadata.level}
                                  </Badge>
                                )}
                                {activity.metadata.position && (
                                  <Badge variant="secondary" className="text-xs">
                                    {activity.metadata.position}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        {t('referrals.organization.noActivity')}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="space-y-3">
        {recentActivities.length > 0 ? (
          <>
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className={`p-3 rounded-lg border ${getActivityColor(activity.activityType)} ${
                  !activity.isRead ? 'ring-1 ring-honey/30' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.activityType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {getActivityTypeLabel(activity.activityType)}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">{activity.actorUsername || formatAddress(activity.actorWallet)}</p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(activity.createdAt)}</span>
                        {activity.metadata.level && (
                          <Badge variant="outline" className="text-xs">
                            Level {activity.metadata.level}
                          </Badge>
                        )}
                        {activity.metadata.position && (
                          <Badge variant="secondary" className="text-xs">
                            {activity.metadata.position}
                          </Badge>
                        )}
                      </div>
                      
                      {!activity.isRead && (
                        <div className="w-2 h-2 bg-honey rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {activityData.length > maxItems && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllDialog(true)}
                className="w-full text-honey hover:text-honey/80"
                data-testid="button-view-more"
              >
                {t('referrals.organization.viewMore', { count: activityData.length - maxItems })}
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {t('referrals.organization.noActivity')}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('referrals.organization.noActivityDesc')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OrganizationActivity;