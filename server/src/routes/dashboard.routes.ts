import { Express } from 'express';
import { storage } from '../../storage';

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

      // Get real user data from database
      const [
        userBalances,
        userActivity,
        referralStats,
        referralNode,
        referralLayers
      ] = await Promise.all([
        storage.getUserBalances(walletAddress),
        storage.getUserActivity(walletAddress, 10),
        storage.getUserReferralStats(walletAddress),
        storage.getReferralNode(walletAddress),
        storage.getReferralLayers(walletAddress)
      ]);

      // Calculate real matrix stats from referral data
      const matrixStats = {
        directChildren: referralNode?.directReferralCount || 0,
        totalDownline: referralStats?.totalTeam || 0,
        layer: 0, // User's position in global matrix
        position: referralNode?.matrixPosition || null
      };

      // Real NFT stats from membership data
      const membershipState = await storage.getMembershipState(walletAddress);
      const nftStats = {
        ownedLevels: membershipState?.levelsOwned || [],
        highestLevel: membershipState?.activeLevel || 0,
        totalNFTs: (membershipState?.levelsOwned || []).length
      };

      // Real earnings data
      const earningsData = await storage.calculateRealEarnings(walletAddress);
      const rewardStats = {
        totalEarned: Number(earningsData.totalEarnings || 0),
        pendingAmount: Number(earningsData.pendingRewards || 0),
        claimedAmount: Number(earningsData.totalEarnings || 0) - Number(earningsData.pendingRewards || 0)
      };

      // Real referral stats
      const realReferralStats = {
        directReferrals: referralStats?.directReferrals || 0,
        totalTeam: referralStats?.totalTeam || 0
      };

      const dashboardData = {
        matrixStats,
        nftStats,
        rewardStats,
        referralStats: realReferralStats,
        recentActivity: userActivity || [],
        userBalances: {
          bccTransferable: userBalances?.bccTransferable || 0,
          bccRestricted: userBalances?.bccRestricted || 0,
          cth: userBalances?.cth || 0
        }
      };

      console.log('✅ Sending real dashboard data:', dashboardData);
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

      // Get real referral layers (1-19)
      const referralLayers = await storage.getReferralLayers(walletAddress);
      const referralNode = await storage.getReferralNode(walletAddress);

      // Transform into matrix visualization format
      const matrixData = {
        userPosition: {
          layer: 0, // Root user
          position: referralNode?.matrixPosition || 0
        },
        directChildren: referralNode?.directReferralCount || 0,
        totalDownline: referralLayers.reduce((total: number, layer: any) => total + layer.memberCount, 0),
        downlineLayers: referralLayers.map((layer: any) => ({
          layer: layer.layerNumber,
          totalMembers: layer.memberCount,
          maxCapacity: Math.pow(3, layer.layerNumber), // 3^n for each layer
          members: layer.members || []
        }))
      };

      console.log('✅ Sending real matrix data:', matrixData);
      res.json(matrixData);
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

      const referralStats = await storage.getUserReferralStats(walletAddress);
      
      console.log('✅ Sending real referral stats:', referralStats);
      res.json(referralStats);
    } catch (error) {
      console.error('Referral stats error:', error);
      res.status(500).json({ error: 'Failed to fetch referral stats' });
    }
  });

  // Get user activity feed
  app.get("/api/dashboard/activity", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      const limit = parseInt(req.query.limit as string) || 20;
      
      console.log('📋 Fetching activity for:', walletAddress);

      const activities = await storage.getUserActivity(walletAddress, limit);
      
      console.log('✅ Sending real activities:', activities.length, 'items');
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

      const balances = await storage.getUserBalances(walletAddress);
      
      console.log('✅ Sending real balances:', balances);
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

      // Create BCC balance record with preserved amounts (500 + 100 locked)
      await storage.createBCCBalance({
        walletAddress: walletAddress.toLowerCase(),
        transferable: 500,
        restricted: 100,
        lastUpdated: new Date()
      });

      // Create membership state record
      await storage.createMembershipState({
        walletAddress: walletAddress.toLowerCase(),
        activeLevel: 1,
        levelsOwned: [1],
        joinedAt: new Date(),
        lastUpgradeAt: new Date()
      });

      // Create earnings wallet record
      await storage.createEarningsWallet({
        walletAddress: walletAddress.toLowerCase(),
        totalEarnings: 0,
        referralEarnings: 0,
        levelEarnings: 0,
        lastRewardAt: null,
        createdAt: new Date()
      });

      console.log('✅ User data initialized successfully');
      res.json({ success: true, message: 'User data initialized' });
    } catch (error) {
      console.error('Data initialization error:', error);
      res.status(500).json({ error: 'Failed to initialize user data' });
    }
  });
}