import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { callEdgeFunction } from '../../lib/supabaseClient';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Bell, 
  BellRing
} from 'lucide-react';
import { useLocation } from 'wouter';
import NotificationInbox from './NotificationInbox';

interface NotificationStats {
  unreadCount: number;
  totalCount: number;
  urgentCount: number;
  actionRequiredCount: number;
}

interface NotificationButtonProps {
  walletAddress: string;
  variant?: 'icon' | 'button';
  showCompactInbox?: boolean;
  className?: string;
}

export default function NotificationButton({ 
  walletAddress,
  variant = 'icon',
  showCompactInbox = true,
  className = ''
}: NotificationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();

  // Fetch notification stats
  const { data: stats } = useQuery<NotificationStats>({
    queryKey: ['notifications', 'stats', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 30000, // Refresh every 30 seconds
    queryFn: async () => {
      try {
        const response = await callEdgeFunction('notifications', { action: 'stats' }, walletAddress);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch notification stats');
        }
        return response.data;
      } catch (error) {
        console.warn('Notifications Edge Function not deployed yet, using fallback data');
        // Return fallback data until the function is deployed
        return {
          unreadCount: 0,
          totalCount: 0,
          urgentCount: 0,
          actionRequiredCount: 0
        };
      }
    }
  });

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  const handleNotificationClick = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  const hasUnread = stats && stats.unreadCount > 0;
  const hasUrgent = stats && stats.urgentCount > 0;

  if (variant === 'button') {
    return (
      <Button
        onClick={() => navigate('/notifications')}
        variant="outline"
        className={`relative ${className}`}
        data-testid="notification-button"
      >
        {hasUrgent ? (
          <BellRing className="w-4 h-4 mr-2 text-red-400" />
        ) : (
          <Bell className="w-4 h-4 mr-2" />
        )}
        Notifications
        {hasUnread && (
          <Badge 
            variant="destructive" 
            className="ml-2 bg-red-500"
            data-testid="notification-badge"
          >
            {stats.unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative p-2 ${className}`}
          data-testid="notification-icon-button"
        >
          {hasUrgent ? (
            <BellRing className="w-5 h-5 text-red-400" />
          ) : hasUnread ? (
            <BellRing className="w-5 h-5 text-yellow-400" />
          ) : (
            <Bell className="w-5 h-5 text-gray-400" />
          )}
          
          {hasUnread && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500"
              data-testid="notification-badge"
            >
              {stats.unreadCount > 99 ? '99+' : stats.unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      {showCompactInbox && (
        <PopoverContent 
          className="w-96 p-0 bg-gray-900 border-yellow-500/20" 
          align="end"
          data-testid="notification-popover"
        >
          <div className="max-h-96 overflow-hidden">
            <NotificationInbox
              walletAddress={walletAddress}
              onNotificationClick={handleNotificationClick}
              compact={true}
            />
            
            {stats && stats.totalCount > 5 && (
              <div className="p-3 border-t border-gray-700">
                <Button
                  onClick={handleViewAll}
                  variant="outline"
                  className="w-full"
                  size="sm"
                  data-testid="view-all-notifications"
                >
                  View All Notifications ({stats.totalCount})
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}