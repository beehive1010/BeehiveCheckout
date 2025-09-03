import { Router, Request, Response } from 'express';
import { notificationsService } from '../services/notifications.service';
import { z } from 'zod';

const router = Router();

// Middleware to extract wallet address from request
const extractWalletAddress = (req: Request): string => {
  const walletAddress = req.headers['x-wallet-address'] as string;
  if (!walletAddress) {
    throw new Error('Wallet address required');
  }
  return walletAddress.toLowerCase();
};

// Validation schemas
const createNotificationSchema = z.object({
  recipientWallet: z.string().length(42),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.string(),
  triggerWallet: z.string().length(42).optional(),
  relatedWallet: z.string().length(42).optional(),
  amount: z.number().optional(),
  amountType: z.enum(['USDT', 'BCC']).optional(),
  level: z.number().min(1).max(19).optional(),
  layer: z.number().min(1).max(19).optional(),
  position: z.enum(['L', 'M', 'R']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  actionRequired: z.boolean().optional(),
  actionType: z.string().optional(),
  actionUrl: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.any().optional(),
  sendEmail: z.boolean().optional(),
});

const notificationFiltersSchema = z.object({
  isRead: z.coerce.boolean().optional(),
  type: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  isArchived: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// Routes

/**
 * GET /api/notifications
 * Get user notifications with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const walletAddress = extractWalletAddress(req);
    const filters = notificationFiltersSchema.parse(req.query);
    
    const notifications = await notificationsService.getUserNotifications(walletAddress, filters);
    
    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notifications',
    });
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics for user
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const walletAddress = extractWalletAddress(req);
    
    const stats = await notificationsService.getNotificationStats(walletAddress);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notification stats',
    });
  }
});

/**
 * GET /api/notifications/:id
 * Get single notification by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const walletAddress = extractWalletAddress(req);
    const notificationId = req.params.id;
    
    const notification = await notificationsService.getUserNotifications(walletAddress, { limit: 1 });
    const found = notification.find(n => n.id === notificationId);
    
    if (!found) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }
    
    res.json({
      success: true,
      data: found,
    });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notification',
    });
  }
});

/**
 * POST /api/notifications
 * Create a new notification (admin/system use)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createNotificationSchema.parse(req.body);
    
    const notification = await notificationsService.createNotification({
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
    
    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create notification',
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const walletAddress = extractWalletAddress(req);
    const notificationId = req.params.id;
    
    const success = await notificationsService.markAsRead(notificationId, walletAddress);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or not owned by user',
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark notification as read',
    });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const walletAddress = extractWalletAddress(req);
    
    const count = await notificationsService.markAllAsRead(walletAddress);
    
    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      count,
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
    });
  }
});

/**
 * PATCH /api/notifications/:id/archive
 * Archive notification
 */
router.patch('/:id/archive', async (req: Request, res: Response) => {
  try {
    const walletAddress = extractWalletAddress(req);
    const notificationId = req.params.id;
    
    const success = await notificationsService.archiveNotification(notificationId, walletAddress);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or not owned by user',
      });
    }
    
    res.json({
      success: true,
      message: 'Notification archived',
    });
  } catch (error) {
    console.error('Archive notification error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive notification',
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const walletAddress = extractWalletAddress(req);
    const notificationId = req.params.id;
    
    const success = await notificationsService.deleteNotification(notificationId, walletAddress);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or not owned by user',
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete notification',
    });
  }
});

/**
 * POST /api/notifications/matrix/activation
 * Create member activation notification (system use)
 */
router.post('/matrix/activation', async (req: Request, res: Response) => {
  try {
    const { recipientWallet, activatedMemberWallet, level, sendEmail } = req.body;
    
    if (!recipientWallet || !activatedMemberWallet || !level) {
      return res.status(400).json({
        success: false,
        error: 'recipientWallet, activatedMemberWallet, and level are required',
      });
    }
    
    const notification = await notificationsService.createMemberActivationNotification(
      recipientWallet,
      activatedMemberWallet,
      level,
      sendEmail ?? true
    );
    
    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Create activation notification error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create activation notification',
    });
  }
});

/**
 * POST /api/notifications/matrix/upgrade
 * Create level upgrade notification (system use)
 */
router.post('/matrix/upgrade', async (req: Request, res: Response) => {
  try {
    const { recipientWallet, upgradedMemberWallet, fromLevel, toLevel, rewardAmount, sendEmail } = req.body;
    
    if (!recipientWallet || !upgradedMemberWallet || !fromLevel || !toLevel) {
      return res.status(400).json({
        success: false,
        error: 'recipientWallet, upgradedMemberWallet, fromLevel, and toLevel are required',
      });
    }
    
    const notification = await notificationsService.createLevelUpgradeNotification(
      recipientWallet,
      upgradedMemberWallet,
      fromLevel,
      toLevel,
      rewardAmount,
      sendEmail ?? true
    );
    
    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Create upgrade notification error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create upgrade notification',
    });
  }
});

/**
 * POST /api/notifications/matrix/reminder
 * Create upgrade reminder notification (system use)
 */
router.post('/matrix/reminder', async (req: Request, res: Response) => {
  try {
    const { recipientWallet, currentLevel, hoursLeft, sendEmail } = req.body;
    
    if (!recipientWallet || !currentLevel || !hoursLeft) {
      return res.status(400).json({
        success: false,
        error: 'recipientWallet, currentLevel, and hoursLeft are required',
      });
    }
    
    const notification = await notificationsService.createUpgradeReminderNotification(
      recipientWallet,
      currentLevel,
      hoursLeft,
      sendEmail ?? true
    );
    
    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Create reminder notification error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create reminder notification',
    });
  }
});

/**
 * POST /api/notifications/matrix/countdown-warning
 * Create countdown warning notification (system use)
 */
router.post('/matrix/countdown-warning', async (req: Request, res: Response) => {
  try {
    const { recipientWallet, currentLevel, hoursLeft, sendEmail } = req.body;
    
    if (!recipientWallet || !currentLevel || !hoursLeft) {
      return res.status(400).json({
        success: false,
        error: 'recipientWallet, currentLevel, and hoursLeft are required',
      });
    }
    
    const notification = await notificationsService.createCountdownWarningNotification(
      recipientWallet,
      currentLevel,
      hoursLeft,
      sendEmail ?? true
    );
    
    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Create countdown warning error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create countdown warning',
    });
  }
});

export function registerNotificationsRoutes(app: any, requireWallet: any) {
  app.use('/api/notifications', requireWallet, router);
}

export default router;