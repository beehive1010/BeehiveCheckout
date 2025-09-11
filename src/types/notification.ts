// Shared notification types for the Beehive platform

export interface Notification {
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
  // Additional fields from Edge Function response
  source?: 'user' | 'reward';
}

export interface NotificationStats {
  unreadCount: number;
  totalCount: number;
  urgentCount: number;
  actionRequiredCount: number;
}

export interface NotificationListResponse {
  notifications: Notification[];
  count: number;
  hasMore: boolean;
}

export type NotificationAction = 'stats' | 'get-notifications' | 'mark-read' | 'mark-all-read';