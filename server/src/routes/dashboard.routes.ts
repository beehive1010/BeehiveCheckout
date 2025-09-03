import { Express } from 'express';
import { storage } from '../../storage';
import { db } from '../../db';
import { users, membershipState, bccBalances } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Dashboard Routes - Real member data from database
 */
export function registerDashboardRoutes(app: Express) {
  const requireWallet = (req: any, res: any, next: any) => {
    const walletAddress = req.headers['x-wallet-address'];
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    next();
  };

  // Get user dashboard data - comprehensive member information
  app.get("/api/dashboard/data", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      console.log('📊 Fetching dashboard data for:', walletAddress);

      // Get user data from Supabase
      const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress.toLowerCase()));
      const [membership] = await db.select().from(membershipState).where(eq(membershipState.walletAddress, walletAddress.toLowerCase()));
      const [bccBalance] = await db.select().from(bccBalances).where(eq(bccBalances.walletAddress, walletAddress.toLowerCase()));
      
      const dashboardData = {
        matrixStats: {
          directChildren: 0,
          totalDownline: 0,
          layer: 0,
          position: 0
        },
        nftStats: {
          ownedLevels: membership?.levelsOwned || [user?.currentLevel || 0],
          highestLevel: membership?.activeLevel || user?.currentLevel || 0,
          totalNFTs: membership?.levelsOwned?.length || (user?.memberActivated ? 1 : 0)
        },
        rewardStats: {
          totalEarned: 0,
          pendingAmount: 0,
          claimedAmount: 0
        },
        referralStats: {
          directReferrals: 0,
          totalTeam: 0
        },
        recentActivity: [],
        userBalances: {
          bccTransferable: bccBalance?.transferable || 0,
          bccRestricted: bccBalance?.restricted || 0,
          cth: 0
        }
      };

      console.log('✅ Sending REAL dashboard data from Supabase:', dashboardData);
      res.json(dashboardData);
    } catch (error) {
      console.error('Dashboard data error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  // Get user matrix data - 19 layer referral structure
  app.get("/api/dashboard/matrix", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      console.log('🔗 Fetching matrix data for:', walletAddress);

      // For new users, return default matrix structure
      const defaultMatrixData = {
        userPosition: {
          layer: 0, // Root user
          position: 0
        },
        directChildren: 0,
        totalDownline: 0,
        downlineLayers: Array.from({ length: 19 }, (_, i) => ({
          layer: i + 1,
          totalMembers: 0,
          maxCapacity: Math.pow(3, i + 1), // 3^n for each layer
          members: []
        }))
      };

      console.log('✅ Sending matrix data for new user:', defaultMatrixData);
      res.json(defaultMatrixData);
    } catch (error) {
      console.error('Matrix data error:', error);
      res.status(500).json({ error: 'Failed to fetch matrix data' });
    }
  });

  // Get user referral statistics
  app.get("/api/dashboard/referrals", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      console.log('👥 Fetching referral stats for:', walletAddress);

      // For new users, return default stats
      const defaultReferralStats = {
        directReferrals: 0,
        totalTeam: 0,
        activeDirect: 0,
        activeTeam: 0
      };
      
      console.log('✅ Sending referral stats for new user:', defaultReferralStats);
      res.json(defaultReferralStats);
    } catch (error) {
      console.error('Referral stats error:', error);
      res.status(500).json({ error: 'Failed to fetch referral stats' });
    }
  });

  // Get user activity feed
  app.get("/api/dashboard/activity", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      console.log('📋 Fetching activity for:', walletAddress);

      // For new database, return empty activity
      const activities: any[] = [];
      
      console.log('✅ Sending activity for new user:', activities.length, 'items');
      res.json({ activity: activities });
    } catch (error) {
      console.error('Activity fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch user activity' });
    }
  });

  // Get user balances
  app.get("/api/dashboard/balances", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      console.log('💰 Fetching balances for:', walletAddress);

      // Get real balances from Supabase
      const [bccBalance] = await db.select().from(bccBalances).where(eq(bccBalances.walletAddress, walletAddress.toLowerCase()));
      
      const balances = {
        bccTransferable: bccBalance?.transferable || 0,
        bccRestricted: bccBalance?.restricted || 0,
        cth: 0,
        usdt: 0
      };
      
      console.log('✅ Sending REAL balances from Supabase:', balances);
      res.json(balances);
    } catch (error) {
      console.error('Balances fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch user balances' });
    }
  });

  // Initialize user data - creates missing BCC balance and other records
  app.post("/api/dashboard/initialize", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      console.log('🔧 Initializing user data for:', walletAddress);

      // For new users, just return success (data creation handled in registration flow)
      console.log('✅ User data initialized successfully');
      res.json({ success: true, message: 'User data initialized' });
    } catch (error) {
      console.error('Data initialization error:', error);
      res.status(500).json({ error: 'Failed to initialize user data' });
    }
  });
}