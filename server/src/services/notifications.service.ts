import { storage } from './storage.service';
import type { 
  InsertUserNotification, 
  UserNotification 
} from '@shared/schema';
import { eq, desc, and, isNull, not } from 'drizzle-orm';

export interface NotificationFilters {
  isRead?: boolean;
  type?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  isArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  unreadCount: number;
  totalCount: number;
  urgentCount: number;
  actionRequiredCount: number;
}

export interface CreateNotificationRequest {
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
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionRequired?: boolean;
  actionType?: string;
  actionUrl?: string;
  expiresAt?: Date;
  metadata?: any;
  sendEmail?: boolean; // Whether to send email notification
}

export class NotificationsService {
  
  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationRequest): Promise<UserNotification> {
    const notification = await storage.createUserNotification({
      recipientWallet: data.recipientWallet,
      title: data.title,
      message: data.message,
      type: data.type,
      triggerWallet: data.triggerWallet,
      relatedWallet: data.relatedWallet,
      amount: data.amount,
      amountType: data.amountType,
      level: data.level,
      layer: data.layer,
      position: data.position,
      priority: data.priority || 'normal',
      actionRequired: data.actionRequired || false,
      actionType: data.actionType,
      actionUrl: data.actionUrl,
      expiresAt: data.expiresAt,
      metadata: data.metadata,
      isRead: false,
      isArchived: false,
      emailSent: false,
    });

    // Send email notification if requested
    if (data.sendEmail && data.recipientWallet) {
      try {
        await this.sendEmailNotification(notification);
        await storage.updateUserNotification(notification.id, { 
          emailSent: true, 
          emailSentAt: new Date() 
        });
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }

    return notification;
  }

  /**
   * Get notifications for a user with filters
   */
  async getUserNotifications(
    walletAddress: string, 
    filters: NotificationFilters = {}
  ): Promise<UserNotification[]> {
    return storage.getUserNotifications(walletAddress, filters);
  }

  /**
   * Get notification stats for a user
   */
  async getNotificationStats(walletAddress: string): Promise<NotificationStats> {
    const [unread, total, urgent, actionRequired] = await Promise.all([
      storage.countUserNotifications(walletAddress, { isRead: false, isArchived: false }),
      storage.countUserNotifications(walletAddress, { isArchived: false }),
      storage.countUserNotifications(walletAddress, { 
        priority: 'urgent', 
        isRead: false, 
        isArchived: false 
      }),
      storage.countUserNotifications(walletAddress, { 
        actionRequired: true, 
        isRead: false, 
        isArchived: false 
      }),
    ]);

    return {
      unreadCount: unread,
      totalCount: total,
      urgentCount: urgent,
      actionRequiredCount: actionRequired,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, walletAddress: string): Promise<boolean> {
    // Verify ownership before updating
    const notification = await storage.getUserNotificationById(notificationId);
    if (!notification || notification.recipientWallet !== walletAddress) {
      return false;
    }

    await storage.updateUserNotification(notificationId, { 
      isRead: true, 
      updatedAt: new Date() 
    });
    return true;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(walletAddress: string): Promise<number> {
    return await storage.markAllNotificationsAsRead(walletAddress);
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string, walletAddress: string): Promise<boolean> {
    // Verify ownership before updating
    const notification = await storage.getUserNotificationById(notificationId);
    if (!notification || notification.recipientWallet !== walletAddress) {
      return false;
    }

    await storage.updateUserNotification(notificationId, { 
      isArchived: true, 
      updatedAt: new Date() 
    });
    return true;
  }

  /**
   * Delete notification (only if owned by user)
   */
  async deleteNotification(notificationId: string, walletAddress: string): Promise<boolean> {
    // Verify ownership before deleting
    const notification = await storage.getUserNotificationById(notificationId);
    if (!notification || notification.recipientWallet !== walletAddress) {
      return false;
    }

    return storage.deleteUserNotification(notificationId);
  }

  /**
   * Send email notification using SendGrid
   */
  private async sendEmailNotification(notification: UserNotification): Promise<void> {
    // Get user email
    const user = await storage.getUser(notification.recipientWallet);
    if (!user?.email) {
      throw new Error('User email not found');
    }

    // Import SendGrid service
    const { sendEmail } = await import('../../../sendgrid');

    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    // Create email content
    const emailSubject = `[BeeHive] ${notification.title}`;
    const emailHtml = this.generateEmailTemplate(notification);

    // Send email
    await sendEmail(process.env.SENDGRID_API_KEY, {
      to: user.email,
      from: 'notifications@beehive.com', // Configure your verified sender
      subject: emailSubject,
      html: emailHtml,
      text: notification.message,
    });
  }

  /**
   * Generate email template for notifications
   */
  private generateEmailTemplate(notification: UserNotification): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const actionButton = notification.actionRequired && notification.actionUrl 
      ? `<a href="${baseUrl}${notification.actionUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">
           ${notification.actionType || 'Take Action'}
         </a>`
      : '';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 24px; border-radius: 8px;">
          <h1 style="color: #f59e0b; margin: 0 0 16px 0;">🐝 BeeHive Notification</h1>
          <h2 style="margin: 0 0 16px 0;">${notification.title}</h2>
          <p style="margin: 0 0 16px 0; line-height: 1.6;">${notification.message}</p>
          
          ${notification.amount && notification.amountType ? `
            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 16px 0;">
              <strong>Amount: ${notification.amount} ${notification.amountType}</strong>
            </div>
          ` : ''}
          
          ${actionButton}
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #444; font-size: 14px; color: #888;">
            <p>Best regards,<br>The BeeHive Team</p>
            <p><a href="${baseUrl}/notifications" style="color: #f59e0b;">View all notifications</a></p>
          </div>
        </div>
      </div>
    `;
  }

  // ==================== Matrix Organization Specific Methods ====================

  /**
   * Create member activation notification
   */
  async createMemberActivationNotification(
    recipientWallet: string,
    activatedMemberWallet: string,
    level: number,
    sendEmail: boolean = true
  ): Promise<UserNotification> {
    const user = await storage.getUser(activatedMemberWallet);
    const username = user?.username || activatedMemberWallet.slice(0, 8) + '...';

    return this.createNotification({
      recipientWallet,
      title: '🎉 New Member Activated!',
      message: `${username} has successfully activated their Level ${level} membership in your matrix organization!`,
      type: 'member_activated',
      triggerWallet: activatedMemberWallet,
      level,
      priority: 'normal',
      actionRequired: false,
      metadata: {
        activatedMember: {
          wallet: activatedMemberWallet,
          username,
          level,
        }
      },
      sendEmail,
    });
  }

  /**
   * Create level upgrade notification
   */
  async createLevelUpgradeNotification(
    recipientWallet: string,
    upgradedMemberWallet: string,
    fromLevel: number,
    toLevel: number,
    rewardAmount?: number,
    sendEmail: boolean = true
  ): Promise<UserNotification> {
    const user = await storage.getUser(upgradedMemberWallet);
    const username = user?.username || upgradedMemberWallet.slice(0, 8) + '...';

    const rewardText = rewardAmount 
      ? ` You've earned ${rewardAmount} USDT in rewards!`
      : '';

    return this.createNotification({
      recipientWallet,
      title: '🚀 Member Upgraded!',
      message: `${username} has upgraded from Level ${fromLevel} to Level ${toLevel}!${rewardText}`,
      type: 'level_upgraded',
      triggerWallet: upgradedMemberWallet,
      level: toLevel,
      amount: rewardAmount,
      amountType: rewardAmount ? 'USDT' : undefined,
      priority: rewardAmount ? 'high' : 'normal',
      actionRequired: !!rewardAmount,
      actionType: rewardAmount ? 'claim_reward' : undefined,
      actionUrl: rewardAmount ? '/dashboard/rewards' : undefined,
      metadata: {
        upgradedMember: {
          wallet: upgradedMemberWallet,
          username,
          fromLevel,
          toLevel,
        },
        reward: rewardAmount ? {
          amount: rewardAmount,
          type: 'USDT'
        } : undefined
      },
      sendEmail,
    });
  }

  /**
   * Create upgrade reminder notification
   */
  async createUpgradeReminderNotification(
    recipientWallet: string,
    currentLevel: number,
    hoursLeft: number,
    sendEmail: boolean = true
  ): Promise<UserNotification> {
    const urgency = hoursLeft <= 24 ? 'urgent' : hoursLeft <= 48 ? 'high' : 'normal';
    const timeText = hoursLeft <= 24 
      ? `${hoursLeft} hours` 
      : `${Math.ceil(hoursLeft / 24)} days`;

    return this.createNotification({
      recipientWallet,
      title: '⏰ Upgrade Reminder',
      message: `Your upgrade timer expires in ${timeText}! Upgrade to Level ${currentLevel + 1} now to avoid losing your matrix position.`,
      type: 'upgrade_reminder',
      level: currentLevel + 1,
      priority: urgency,
      actionRequired: true,
      actionType: 'upgrade_now',
      actionUrl: `/dashboard/upgrade?level=${currentLevel + 1}`,
      expiresAt: new Date(Date.now() + hoursLeft * 60 * 60 * 1000),
      metadata: {
        currentLevel,
        targetLevel: currentLevel + 1,
        timeLeft: `${timeText}`,
        hoursLeft,
      },
      sendEmail,
    });
  }

  /**
   * Create countdown warning notification
   */
  async createCountdownWarningNotification(
    recipientWallet: string,
    currentLevel: number,
    hoursLeft: number,
    sendEmail: boolean = true
  ): Promise<UserNotification> {
    return this.createNotification({
      recipientWallet,
      title: '🚨 Urgent: Upgrade Deadline Approaching',
      message: `FINAL WARNING: Only ${hoursLeft} hours left to upgrade to Level ${currentLevel + 1}! Your matrix position will be lost if you don't upgrade in time.`,
      type: 'countdown_warning',
      level: currentLevel + 1,
      priority: 'urgent',
      actionRequired: true,
      actionType: 'upgrade_now',
      actionUrl: `/dashboard/upgrade?level=${currentLevel + 1}&urgent=true`,
      expiresAt: new Date(Date.now() + hoursLeft * 60 * 60 * 1000),
      metadata: {
        currentLevel,
        targetLevel: currentLevel + 1,
        timeLeft: `${hoursLeft} hours`,
        isUrgent: true,
      },
      sendEmail,
    });
  }
}

export const notificationsService = new NotificationsService();