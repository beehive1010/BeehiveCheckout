import type { Express } from "express";
import { storage } from "../../storage";

export function registerWalletRoutes(app: Express) {
  // Log wallet connection
  app.post("/api/wallet/log-connection", async (req, res) => {
    try {
      const { walletAddress, chainId, timestamp } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      console.log(`🔗 Wallet connected: ${walletAddress} on chain ${chainId}`);
      
      // Here you could log the connection to analytics or database
      // For now, we'll just acknowledge the connection
      
      res.json({ 
        success: true, 
        message: 'Connection logged',
        walletAddress: walletAddress.toLowerCase(),
        timestamp: timestamp || new Date().toISOString()
      });
    } catch (error) {
      console.error('Wallet connection logging error:', error);
      res.status(500).json({ error: 'Failed to log connection' });
    }
  });

  // Get referral backup data
  app.get("/api/wallet/referral-backup", async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required in headers' });
      }

      // Get stored referral data for backup
      const referralData = await storage.getReferralBackup?.(walletAddress.toLowerCase());
      
      res.json({
        success: true,
        walletAddress: walletAddress.toLowerCase(),
        referralData: referralData || null
      });
    } catch (error) {
      console.error('Referral backup error:', error);
      res.status(500).json({ error: 'Failed to get referral backup' });
    }
  });

  // Check registration status and expiration
  app.get("/api/wallet/registration-status", async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required in headers' });
      }

      const user = await storage.getUser(walletAddress.toLowerCase());
      
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          isRegistered: false 
        });
      }

      // Check if user has an expiration time set
      const registrationExpiresAt = user.registrationExpiresAt;
      const now = new Date();
      const isExpired = registrationExpiresAt && new Date(registrationExpiresAt) < now;

      res.json({
        isRegistered: true,
        walletAddress: user.walletAddress,
        registrationExpiresAt,
        isExpired: isExpired || false,
        timeRemaining: registrationExpiresAt ? 
          Math.max(0, new Date(registrationExpiresAt).getTime() - now.getTime()) : null
      });
    } catch (error) {
      console.error('Registration status error:', error);
      res.status(500).json({ error: 'Failed to check registration status' });
    }
  });
}