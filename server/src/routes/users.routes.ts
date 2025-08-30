import type { Express } from "express";
import { usersService } from '../services';

export function registerUsersRoutes(app: Express, requireWallet: any) {
  // Get user activity
  app.get("/api/user/activity", requireWallet, async (req: any, res) => {
    try {
      // Mock activity data - would implement activity service
      const activities = [
        {
          id: 1,
          type: 'level_upgrade',
          description: 'Upgraded to Level 1',
          timestamp: new Date().toISOString()
        }
      ];
      res.json(activities);
    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({ error: 'Failed to get user activity' });
    }
  });

  // Get user balances
  app.get("/api/user/balances", requireWallet, async (req: any, res) => {
    try {
      // Mock balance data - would implement balance service
      const balances = {
        bcc: {
          transferable: 0,
          restricted: 0
        },
        usdt: {
          balance: 0
        }
      };
      
      res.json(balances);
    } catch (error) {
      console.error('Get user balances error:', error);
      res.status(500).json({ error: 'Failed to get user balances' });
    }
  });
}