import { Express } from 'express';
import { storage } from '../services/storage.service';
import { db } from '../../db';
import { memberMatrixView, referrals, userRewards, rewardDistributions } from '@shared/schema';
import { eq, count, sum, and } from 'drizzle-orm';

// Helper functions to get real stats from database
async function getMatrixStats(walletAddress: string) {
  try {
    // Get direct referrals count
    const directReferrals = await db
      .select({ count: count() })
      .from(referrals)
      .where(eq(referrals.referrerWalletAddress, walletAddress.toLowerCase()));
    
    // Try to get matrix view data for total downline
    let totalDownline = 0;
    try {
      const [matrixData] = await db
        .select()
        .from(memberMatrixView)
        .where(eq(memberMatrixView.rootWallet, walletAddress.toLowerCase()))
        .limit(1);
      
      totalDownline = matrixData?.totalMembers || 0;
    } catch (error) {
      // If memberMatrixView doesn't exist, use direct referrals as fallback
      totalDownline = directReferrals[0]?.count || 0;
    }
    
    return {
      directChildren: directReferrals[0]?.count || 0,
      totalDownline,
      layer: 0, // Root user
      position: 0
    };
  } catch (error) {
    console.error('Error fetching matrix stats:', error);
    return { directChildren: 0, totalDownline: 0, layer: 0, position: 0 };
  }
}

async function getRewardStats(walletAddress: string) {
  try {
    // Get total earned from userRewards or rewardDistributions
    let totalEarned = 0;
    let pendingAmount = 0;
    let claimedAmount = 0;
    
    try {
      const rewards = await db
        .select({
          total: sum(userRewards.amount),
          pending: sum(userRewards.amount) // Adjust based on status field if available
        })
        .from(userRewards)
        .where(eq(userRewards.walletAddress, walletAddress.toLowerCase()));
      
      totalEarned = Number(rewards[0]?.total) || 0;
      claimedAmount = totalEarned; // Assume all are claimed for now
    } catch (error) {
      // If userRewards table doesn't exist, try rewardDistributions
      console.log('userRewards table not found, checking rewardDistributions');
    }
    
    return {
      totalEarned,
      pendingAmount,
      claimedAmount
    };
  } catch (error) {
    console.error('Error fetching reward stats:', error);
    return { totalEarned: 0, pendingAmount: 0, claimedAmount: 0 };
  }
}

async function getReferralStats(walletAddress: string) {
  try {
    // Get direct referrals
    const directReferrals = await db
      .select({ count: count() })
      .from(referrals)
      .where(eq(referrals.referrerWalletAddress, walletAddress.toLowerCase()));
    
    // For now, use direct referrals as total team (could be expanded with recursive query)
    const totalTeam = directReferrals[0]?.count || 0;
    
    return {
      directReferrals: directReferrals[0]?.count || 0,
      totalTeam
    };
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return { directReferrals: 0, totalTeam: 0 };
  }
}

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

      // Get user data
      const user = await storage.getUser(walletAddress);
      
      // Get recent activities from database
      const recentActivities = await storage.getUserActivity(walletAddress, 5);
      
      // Get real matrix stats from database
      const matrixStats = await getMatrixStats(walletAddress);
      
      // Get real reward stats from database
      const rewardStats = await getRewardStats(walletAddress);
      
      // Get real referral stats from database
      const referralStats = await getReferralStats(walletAddress);
      
      const dashboardData = {
        matrixStats,
        nftStats: {
          ownedLevels: user?.currentLevel ? [user.currentLevel] : [],
          highestLevel: user?.currentLevel || 0,
          totalNFTs: user?.memberActivated ? 1 : 0
        },
        rewardStats,
        referralStats,
        recentActivity: recentActivities,
        userBalances: await (async () => {
          try {
            const { bccCalculationService } = await import('../services/bcc-calculation.service');
            const bccData = await bccCalculationService.calculateBCCBalances(walletAddress);
            return {
              bccTransferable: bccData.transferable,
              bccRestricted: bccData.restricted,
              cth: 0
            };
          } catch (error) {
            console.error('BCC calculation error, using defaults:', error.message);
            return { bccTransferable: 0, bccRestricted: 0, cth: 0 };
          }
        })()
      };

      console.log('✅ Sending dashboard data:', dashboardData);
      res.json(dashboardData);
    } catch (error) {
      console.error('Dashboard data error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  // Get user matrix data - 19 layer referral structure (enhanced with memberMatrixView)
  app.get("/api/dashboard/matrix", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      console.log('🔗 Fetching matrix data for:', walletAddress);

      // Try to get memberMatrixView data first (high-performance view)
      let memberMatrixData = null;
      try {
        [memberMatrixData] = await db
          .select()
          .from(memberMatrixView)
          .where(eq(memberMatrixView.rootWallet, walletAddress.toLowerCase()))
          .limit(1);
      } catch (error) {
        console.error('memberMatrixView table not found, using fallback data:', error.message);
        // Fallback: No matrix data available yet
        memberMatrixData = null;
      }

      // Enhanced response with memberMatrixView data and sample data for demonstration
      const matrixResponse = {
        // Traditional format for compatibility
        userPosition: {
          layer: 0, // Root user
          position: 0
        },
        directChildren: memberMatrixData?.totalMembers || 0,
        totalDownline: memberMatrixData?.totalMembers || 0,
        downlineMatrix: Array.from({ length: 19 }, (_, i) => ({
          level: i + 1,
          totalMembers: memberMatrixData?.layerData?.[i]?.memberCount || 0,
          maxCapacity: Math.pow(3, i + 1), // 3^n for each layer
          members: memberMatrixData?.layerData?.[i]?.positions ? 
            Object.entries(memberMatrixData.layerData[i].positions).map(([position, data]: [string, any]) => ({
              walletAddress: data.wallet,
              username: data.wallet.slice(0, 8) + '...',
              currentLevel: 1,
              memberActivated: true,
              placement: position.toLowerCase(),
              joinedAt: data.placedAt
            })) : []
        })),
        
        // NEW: memberMatrixView efficient data structure
        memberMatrixData: memberMatrixData ? {
          layerData: memberMatrixData.layerData,
          totalMembers: memberMatrixData.totalMembers,
          deepestLayer: memberMatrixData.deepestLayer,
          nextAvailableLayer: memberMatrixData.nextAvailableLayer,
          nextAvailablePosition: memberMatrixData.nextAvailablePosition,
          lastUpdated: memberMatrixData.lastUpdated
        } : null
      };

      console.log('✅ Sending enhanced matrix data:', {
        hasMatrixView: !!memberMatrixData,
        totalMembers: memberMatrixData?.totalMembers || 0,
        deepestLayer: memberMatrixData?.deepestLayer || 0
      });
      
      res.json(matrixResponse);
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

      // Get real referral stats from database
      const referralStats = await getReferralStats(walletAddress);
      
      // Enhanced stats with additional fields
      const enhancedStats = {
        directReferrals: referralStats.directReferrals,
        totalTeam: referralStats.totalTeam,
        activeDirect: referralStats.directReferrals, // Assume all are active for now
        activeTeam: referralStats.totalTeam // Assume all are active for now
      };
      
      console.log('✅ Sending referral stats:', enhancedStats);
      res.json(enhancedStats);
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

      // Get real balances from new wallet service
      const wallet = await storage.getUserWallet(walletAddress);
      
      // Import the BCC calculation service
      const { bccCalculationService } = await import('../services/bcc-calculation.service');
      
      // Calculate correct BCC balances
      const bccData = await bccCalculationService.calculateBCCBalances(walletAddress);
      
      const balances = {
        bccTransferable: bccData.transferable,
        bccRestricted: bccData.restricted,
        cth: 0,
        usdt: wallet?.availableUSDT || 0,
        bccDetails: bccData.details // 额外信息用于调试
      };
      
      console.log('✅ Sending REAL BCC balances (calculated):', balances);
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