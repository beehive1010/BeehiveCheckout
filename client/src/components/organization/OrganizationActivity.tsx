import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Users, UserPlus, ArrowRight, Mail, Clock } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';

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
}

export function OrganizationActivity({ 
  walletAddress, 
  maxItems = 5, 
  showHeader = true,
  className = '' 
}: OrganizationActivityProps) {
  const [, setLocation] = useLocation();
  
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

  const activityData = activities as OrganizationActivityItem[] || [];
  const recentActivities = activityData.slice(0, maxItems);
  const unreadCount = activityData.filter(item => !item.isRead).length;

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`;
    } else {
      return `${Math.floor(diffInHours / 24)}天前`;
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
        return <ArrowRight className="w-4 h-4 text-orange-400" />;
      default:
        return <Users className="w-4 h-4 text-gray-400" />;
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

  return (
    <Card className={`bg-secondary border-border ${className}`}>
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-honey flex items-center gap-2">
              <Users className="w-5 h-5" />
              组织动态
            </CardTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount} 未读
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/inbox')}
                className="text-xs"
                data-testid="button-view-all"
              >
                <Mail className="w-3 h-3 mr-1" />
                查看全部
              </Button>
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
                    <p className="text-sm text-gray-200">{activity.message}</p>
                    
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
                onClick={() => setLocation('/inbox')}
                className="w-full text-honey hover:text-honey/80"
                data-testid="button-view-more"
              >
                查看更多 ({activityData.length - maxItems} 条)
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              referrals.noReferrals
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              当您的团队有新活动时，这里会显示通知
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OrganizationActivity;