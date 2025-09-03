import { z } from 'zod';
import { organizationActivity } from '@shared/schema';
import { db } from '../../db';
import { desc, eq } from 'drizzle-orm';

export function registerOrganizationRoutes(app: any, requireWallet: any) {
  // Get organization activity for a user
  app.get('/api/organization/activity', requireWallet, async (req: any, res: any) => {
    try {
      const walletAddress = req.walletAddress;
      const limit = parseInt(req.query.limit as string) || 20;

      const activities = await db
        .select()
        .from(organizationActivity)
        .where(eq(organizationActivity.organizationWallet, walletAddress))
        .orderBy(desc(organizationActivity.createdAt))
        .limit(limit);

      res.json(activities);
    } catch (error) {
      console.error('Error fetching organization activity:', error);
      res.status(500).json({ error: 'Failed to fetch organization activity' });
    }
  });

  // Mark activities as read
  app.post('/api/organization/activity/mark-read', requireWallet, async (req: any, res: any) => {
    try {
      const walletAddress = req.walletAddress;
      const { activityIds } = z.object({
        activityIds: z.array(z.string())
      }).parse(req.body);

      // For now, just return success
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking activities as read:', error);
      res.status(500).json({ error: 'Failed to mark activities as read' });
    }
  });
}

// Create organization activity (internal use)
export async function createOrganizationActivity(data: {
  organizationWallet: string;
  activityType: 'direct_referral' | 'placement' | 'downline_referral' | 'spillover';
  actorWallet: string;
  actorUsername?: string;
  targetWallet?: string;
  targetUsername?: string;
  message: string;
  metadata?: {
    level?: number;
    position?: string;
    amount?: number;
    referralCode?: string;
  };
}) {
  try {
    const [activity] = await db
      .insert(organizationActivity)
      .values({
        organizationWallet: data.organizationWallet,
        activityType: data.activityType,
        actorWallet: data.actorWallet,
        actorUsername: data.actorUsername,
        targetWallet: data.targetWallet,
        targetUsername: data.targetUsername,
        message: data.message,
        metadata: data.metadata || {},
        isRead: false,
      })
      .returning();

    return activity;
  } catch (error) {
    console.error('Error creating organization activity:', error);
    throw error;
  }
}

