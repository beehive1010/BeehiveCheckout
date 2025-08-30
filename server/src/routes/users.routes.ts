import type { Express } from "express";
import { storage } from "../../storage";

export function registerUsersRoutes(app: Express, requireWallet: any) {
  // Get user activity
  app.get("/api/user/activity", requireWallet, async (req: any, res) => {
    try {
      const activities = await storage.getUserActivity(req.walletAddress);
      res.json(activities || []);
    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({ error: 'Failed to get user activity' });
    }
  });

  // Get user balances
  app.get("/api/user/balances", requireWallet, async (req: any, res) => {
    try {
      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      const usdtBalance = await storage.getUSDTBalance(req.walletAddress);
      
      res.json({
        bcc: bccBalance,
        usdt: usdtBalance
      });
    } catch (error) {
      console.error('Get user balances error:', error);
      res.status(500).json({ error: 'Failed to get user balances' });
    }
  });
}