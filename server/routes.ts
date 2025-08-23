import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { 
  insertUserSchema,
  insertMembershipStateSchema,
  insertReferralNodeSchema,
  insertBCCBalanceSchema,
  insertOrderSchema,
  insertEarningsWalletSchema,
  insertLevelConfigSchema,
  insertMemberNFTVerificationSchema,
  insertNFTPurchaseSchema,
  insertCourseAccessSchema,
  insertBridgePaymentSchema,
  insertTokenPurchaseSchema,
  insertCTHBalanceSchema,
  insertAdminUserSchema,
  insertAdminSessionSchema,
  insertAuditLogSchema,
  adminUsers,
  adminSessions,
  auditLogs,
  users,
  membershipState,
  bccBalances,
  earningsWallet,
  referralNodes,
  type AdminUser,
  type AdminSession
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { eq, and, desc, gte } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // JWT secret for authentication
  const JWT_SECRET = process.env.JWT_SECRET || 'beehive-secret-key';
  
  // Middleware to extract wallet address from auth
  const requireWallet = (req: any, res: any, next: any) => {
    const walletAddress = req.headers['x-wallet-address'];
    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }
    req.walletAddress = walletAddress.toLowerCase();
    next();
  };

  // Admin middleware variables - will be assigned after admin functions are imported
  let requireAdminAuth: (req: any, res: any, next: any) => Promise<void>;
  let requireAdminRole: (allowedRoles: string[]) => (req: any, res: any, next: any) => void;
  let requireAdminPermission: (requiredPermissions: string[]) => (req: any, res: any, next: any) => void;

  // Enhanced authentication routes for social login
  app.post("/api/auth/login-payload", async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: 'Wallet address required' });
      }
      
      // Generate a nonce for the login message
      const nonce = crypto.randomBytes(16).toString('hex');
      
      // Create login message payload
      const payload = {
        message: `Welcome to Beehive! Sign this message to authenticate.\nNonce: ${nonce}`,
        address: address.toLowerCase(),
        nonce,
        timestamp: Date.now(),
      };
      
      res.json({ payload });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate login payload' });
    }
  });

  app.post("/api/auth/verify-signature", async (req, res) => {
    try {
      const { address, signature, message } = req.body;
      
      if (!address || !signature || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // In a real implementation, you would verify the signature here
      // For now, we'll trust it and generate a JWT token
      const token = `jwt-token-${address}-${Date.now()}`;
      
      res.json({ token, address: address.toLowerCase() });
    } catch (error) {
      res.status(500).json({ error: 'Signature verification failed' });
    }
  });

  app.get("/api/auth/verify-token", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const token = authHeader.substring(7);
      
      // Basic token validation (in production, verify JWT properly)
      if (token.startsWith('jwt-token-')) {
        res.json({ valid: true });
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Token verification failed' });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    // For JWT tokens, logout is typically handled client-side
    // Here we could blacklist tokens if needed
    res.json({ success: true });
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const body = insertUserSchema.parse(req.body);
      
      // Validate required fields for registration
      if (!body.email || !body.username || !body.secondaryPasswordHash) {
        return res.status(400).json({ error: 'Email, username, and password are required' });
      }
      
      // Check if user already exists by wallet
      const existingUser = await storage.getUser(body.walletAddress);
      if (existingUser) {
        return res.status(400).json({ error: 'User already registered with this wallet address' });
      }

      // Check if username already exists
      try {
        const existingUsername = await storage.getUserByUsername(body.username);
        if (existingUsername) {
          return res.status(400).json({ error: 'Username already taken. Please choose a different username.' });
        }
      } catch (error) {
        // Username doesn't exist, continue
      }

      // Hash secondary password
      const hashedPassword = await bcrypt.hash(body.secondaryPasswordHash, 10);
      
      const user = await storage.createUser({
        ...body,
        secondaryPasswordHash: hashedPassword,
      });

      // Initialize BCC balance
      await storage.createBCCBalance({
        walletAddress: user.walletAddress,
        transferable: 0,
        restricted: 0,
      });

      // Create referral structure using existing database schema
      if (body.referrerWallet) {
        // Use direct SQL to work with existing schema
        await db.execute(sql`
          INSERT INTO referral_nodes (wallet_address, parent_wallet, children)
          VALUES (${user.walletAddress.toLowerCase()}, ${body.referrerWallet.toLowerCase()}, '[]'::jsonb)
        `);
        
        // Update parent's children array
        await db.execute(sql`
          UPDATE referral_nodes 
          SET children = jsonb_insert(children, '{999}', ${JSON.stringify(user.walletAddress.toLowerCase())}::jsonb)
          WHERE wallet_address = ${body.referrerWallet.toLowerCase()}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO referral_nodes (wallet_address, parent_wallet, children)
          VALUES (${user.walletAddress.toLowerCase()}, null, '[]'::jsonb)
        `);
      }

      res.json({ user });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: 'Registration failed' });
    }
  });

  app.get("/api/auth/user", requireWallet, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.walletAddress);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const membershipState = await storage.getMembershipState(req.walletAddress);
      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      const cthBalance = await storage.getCTHBalance(req.walletAddress);
      const referralNode = await storage.getReferralNode(req.walletAddress);

      res.json({
        user,
        membershipState,
        bccBalance,
        cthBalance,
        referralNode,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user data' });
    }
  });

  // User Activity endpoint
  app.get("/api/user/activity", requireWallet, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activity = await storage.getUserActivity(req.walletAddress, limit);
      
      res.json({ activity });
    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({ error: 'Failed to get user activity' });
    }
  });

  // User Balances endpoint
  app.get("/api/user/balances", requireWallet, async (req: any, res) => {
    try {
      const balances = await storage.getUserBalances(req.walletAddress);
      
      res.json(balances);
    } catch (error) {
      console.error('Get user balances error:', error);
      res.status(500).json({ error: 'Failed to get user balances' });
    }
  });

  // Membership routes
  app.post("/api/membership/activate", requireWallet, async (req: any, res) => {
    try {
      const { level, txHash } = req.body;
      
      // Validate level and transaction
      if (!level || level < 1 || level > 19) {
        return res.status(400).json({ error: 'Invalid level' });
      }

      // Update user activation status
      await storage.updateUser(req.walletAddress, {
        memberActivated: true,
        currentLevel: level,
      });

      // Create or update membership state
      let membershipState = await storage.getMembershipState(req.walletAddress);
      if (!membershipState) {
        membershipState = await storage.createMembershipState({
          walletAddress: req.walletAddress,
          levelsOwned: [level],
          activeLevel: level,
        });
      } else {
        const newLevels = Array.from(new Set([...membershipState.levelsOwned, level]));
        await storage.updateMembershipState(req.walletAddress, {
          levelsOwned: newLevels,
          activeLevel: level,
        });
      }

      // Credit BCC tokens based on level
      const bccReward = level * 100; // Simple formula: 100 BCC per level
      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      if (bccBalance) {
        await storage.updateBCCBalance(req.walletAddress, {
          transferable: bccBalance.transferable + Math.floor(bccReward * 0.6),
          restricted: bccBalance.restricted + Math.floor(bccReward * 0.4),
        });
      }

      // Process BeeHive referral rewards
      await storage.processReferralRewards(req.walletAddress, level);

      // Record member activation with pending time
      await storage.createMemberActivation({
        walletAddress: req.walletAddress,
        activationType: 'manual_activation',
        level: level,
        isPending: false, // Immediate activation for manual payments
        activatedAt: new Date(),
      });

      res.json({ success: true, membershipState });
    } catch (error) {
      console.error('Activation error:', error);
      res.status(500).json({ error: 'Activation failed' });
    }
  });

  // NFT-based automatic member activation
  app.post("/api/membership/nft-activate", requireWallet, async (req: any, res) => {
    try {
      const { nftContractAddress, tokenId } = req.body;
      
      // Verify this is the correct Member NFT contract
      if (nftContractAddress.toLowerCase() !== '0x6d513487bd63430ca71cd1d9a7dea5aacdbf0322') {
        return res.status(400).json({ error: 'Invalid NFT contract' });
      }

      // Check if user is already activated
      const user = await storage.getUser(req.walletAddress);
      if (user?.memberActivated) {
        return res.json({ success: true, message: 'User already activated' });
      }

      // Get admin settings for pending time
      const pendingTimeHours = await storage.getAdminSetting('member_pending_hours') || '24';
      const pendingUntil = new Date(Date.now() + parseInt(pendingTimeHours) * 60 * 60 * 1000);

      // Automatically activate member to Level 1 (勇士 - Warrior)
      await storage.updateUser(req.walletAddress, {
        memberActivated: true,
        currentLevel: 1,
        activationAt: new Date(),
      });

      // Create membership state
      let membershipState = await storage.getMembershipState(req.walletAddress);
      if (!membershipState) {
        membershipState = await storage.createMembershipState({
          walletAddress: req.walletAddress,
          levelsOwned: [1],
          activeLevel: 1,
        });
      }

      // Record activation with pending time for upgrades
      await storage.createMemberActivation({
        walletAddress: req.walletAddress,
        activationType: 'nft_purchase',
        level: 1,
        pendingUntil: pendingUntil,
        isPending: false, // Level 1 is immediate
        activatedAt: new Date(),
        pendingTimeoutHours: parseInt(pendingTimeHours),
      });

      // Credit initial BCC tokens for Level 1
      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      if (!bccBalance) {
        await storage.createBCCBalance({
          walletAddress: req.walletAddress,
          transferable: 60, // 60% of 100 BCC
          restricted: 40,   // 40% of 100 BCC
        });
      }

      // Process referral rewards (100 USDT direct referral reward)
      await storage.processReferralRewards(req.walletAddress, 1);

      // Create referral node in 3x3 matrix if not exists
      await storage.createOrUpdateReferralNode(req.walletAddress);

      res.json({ 
        success: true, 
        membershipState,
        level: 1,
        levelName: 'Warrior',
        message: 'Member activated successfully!' 
      });
    } catch (error) {
      console.error('NFT activation error:', error);
      res.status(500).json({ error: 'NFT activation failed' });
    }
  });

  // Admin controls for pending time management
  app.post("/api/admin/settings", requireWallet, async (req: any, res) => {
    try {
      // TODO: Add admin authentication here
      const { settingKey, settingValue, description } = req.body;
      
      await storage.updateAdminSetting({
        settingKey,
        settingValue,
        description: description || '',
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Admin settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Get pending rewards with countdown
  app.get("/api/rewards/pending", requireWallet, async (req: any, res) => {
    try {
      const pendingRewards = await storage.getPendingRewards(req.walletAddress);
      const memberActivation = await storage.getMemberActivation(req.walletAddress);
      
      res.json({ 
        pendingRewards,
        memberActivation,
        currentTime: new Date().toISOString()
      });
    } catch (error) {
      console.error('Pending rewards error:', error);
      res.status(500).json({ error: 'Failed to get pending rewards' });
    }
  });

  // Process reward spillovers (background job endpoint)
  app.post("/api/rewards/process-spillover", async (req, res) => {
    try {
      const expiredRewards = await storage.getExpiredRewards();
      
      for (const reward of expiredRewards) {
        // Find the nearest activated upline in 3x3 matrix
        const spilloverRecipient = await storage.findNearestActivatedUpline(reward.recipientWallet);
        
        if (spilloverRecipient) {
          // Redistribute reward to activated upline
          await storage.redistributeReward(reward.id, spilloverRecipient);
        }
      }

      res.json({ success: true, processedCount: expiredRewards.length });
    } catch (error) {
      console.error('Spillover processing error:', error);
      res.status(500).json({ error: 'Spillover processing failed' });
    }
  });

  // Tasks routes
  app.get("/api/tasks/nfts", async (req, res) => {
    try {
      const nfts = await storage.getMerchantNFTs();
      res.json(nfts);
    } catch (error) {
      console.error('Get NFTs error:', error);
      res.status(500).json({ error: 'Failed to get NFTs' });
    }
  });

  app.post("/api/tasks/claim", requireWallet, async (req: any, res) => {
    try {
      const { nftId } = req.body;
      
      if (!nftId) {
        return res.status(400).json({ error: 'NFT ID required' });
      }

      // Check if user is activated
      const user = await storage.getUser(req.walletAddress);
      if (!user?.memberActivated) {
        return res.status(403).json({ error: 'Membership activation required' });
      }

      // Get NFT details
      const nft = await storage.getMerchantNFT(nftId);
      if (!nft || !nft.active) {
        return res.status(404).json({ error: 'NFT not found or inactive' });
      }

      // Get user's BCC balance
      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      if (!bccBalance) {
        return res.status(400).json({ error: 'No BCC balance found' });
      }

      // Check if user has enough BCC
      const totalBCC = bccBalance.transferable + bccBalance.restricted;
      if (totalBCC < nft.priceBCC) {
        return res.status(400).json({ error: 'Insufficient BCC balance' });
      }

      // Deduct BCC (restricted first, then transferable)
      let deductedRestricted = 0;
      let deductedTransferable = 0;
      let remainingPrice = nft.priceBCC;

      if (bccBalance.restricted >= remainingPrice) {
        deductedRestricted = remainingPrice;
        remainingPrice = 0;
      } else {
        deductedRestricted = bccBalance.restricted;
        remainingPrice -= bccBalance.restricted;
        deductedTransferable = remainingPrice;
      }

      // Update BCC balance
      await storage.updateBCCBalance(req.walletAddress, {
        transferable: bccBalance.transferable - deductedTransferable,
        restricted: bccBalance.restricted - deductedRestricted,
      });

      // Record purchase
      const purchase = await storage.createNFTPurchase({
        walletAddress: req.walletAddress,
        nftId: nftId,
        amountBCC: nft.priceBCC,
        bucketUsed: deductedRestricted > 0 ? 'restricted' : 'transferable',
        txHash: null, // Would be set after actual NFT minting
      });

      res.json({ success: true, purchase });
    } catch (error) {
      console.error('Claim NFT error:', error);
      res.status(500).json({ error: 'Failed to claim NFT' });
    }
  });

  // Education routes
  app.get("/api/education/courses", async (req, res) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      console.error('Get courses error:', error);
      res.status(500).json({ error: 'Failed to get courses' });
    }
  });

  // Get individual course details
  app.get("/api/education/courses/:courseId", async (req, res) => {
    try {
      const { courseId } = req.params;
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      res.json(course);
    } catch (error) {
      console.error('Get course error:', error);
      res.status(500).json({ error: 'Failed to get course' });
    }
  });

  // Get course lessons (for video courses)
  app.get("/api/education/courses/:courseId/lessons", async (req, res) => {
    try {
      const { courseId } = req.params;
      
      // First check if course exists
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      const lessons = await storage.getCourseLessons(courseId);
      res.json(lessons);
    } catch (error) {
      console.error('Get course lessons error:', error);
      res.status(500).json({ error: 'Failed to get course lessons' });
    }
  });

  // Get user's course access
  app.get("/api/education/access/:courseId", requireWallet, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      
      const access = await storage.getCourseAccess(req.walletAddress, courseId);
      
      if (!access) {
        return res.status(404).json({ error: 'Course access not found' });
      }
      
      res.json(access);
    } catch (error) {
      console.error('Get course access error:', error);
      res.status(500).json({ error: 'Failed to get course access' });
    }
  });

  // Get user's lesson access for a course
  app.get("/api/education/lessons/access/:courseId", requireWallet, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      
      const lessonAccess = await storage.getLessonAccessByCourse(req.walletAddress, courseId);
      res.json(lessonAccess);
    } catch (error) {
      console.error('Get lesson access error:', error);
      res.status(500).json({ error: 'Failed to get lesson access' });
    }
  });

  app.get("/api/education/progress", requireWallet, async (req: any, res) => {
    try {
      const courseAccess = await storage.getCourseAccessByWallet(req.walletAddress);
      res.json(courseAccess);
    } catch (error) {
      console.error('Get progress error:', error);
      res.status(500).json({ error: 'Failed to get progress' });
    }
  });

  // Legacy enroll endpoint - kept for compatibility
  app.post("/api/education/enroll", requireWallet, async (req: any, res) => {
    try {
      const { courseId } = req.body;
      
      if (!courseId) {
        return res.status(400).json({ error: 'Course ID required' });
      }

      // Check if user is activated
      const user = await storage.getUser(req.walletAddress);
      if (!user?.memberActivated) {
        return res.status(403).json({ error: 'Membership activation required' });
      }

      // Get course details
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Check level requirement
      if (user.currentLevel < course.requiredLevel) {
        return res.status(403).json({ error: `Level ${course.requiredLevel} required` });
      }

      // Check if already enrolled
      const existingAccess = await storage.getCourseAccess(req.walletAddress, courseId);
      if (existingAccess) {
        return res.status(400).json({ error: 'Already enrolled in this course' });
      }

      // Handle payment for paid courses
      if (!course.isFree && course.priceBCC > 0) {
        const bccBalance = await storage.getBCCBalance(req.walletAddress);
        if (!bccBalance || bccBalance.transferable < course.priceBCC) {
          return res.status(400).json({ error: 'Insufficient BCC balance' });
        }

        // Deduct BCC
        await storage.updateBCCBalance(req.walletAddress, {
          transferable: bccBalance.transferable - course.priceBCC,
        });
      }

      // Create course access
      const access = await storage.createCourseAccess({
        walletAddress: req.walletAddress,
        courseId: courseId,
        progress: 0,
        completed: false,
      });

      res.json({ success: true, access });
    } catch (error) {
      console.error('Enroll error:', error);
      res.status(500).json({ error: 'Failed to enroll in course' });
    }
  });

  // New BCC claim endpoint for courses
  app.post("/api/education/claim", requireWallet, async (req: any, res) => {
    try {
      const { courseId, useBCCBucket } = req.body;
      
      if (!courseId || !useBCCBucket) {
        return res.status(400).json({ error: 'Course ID and BCC bucket type required' });
      }

      if (!['transferable', 'restricted'].includes(useBCCBucket)) {
        return res.status(400).json({ error: 'Invalid BCC bucket type' });
      }

      // Check if user is activated
      const user = await storage.getUser(req.walletAddress);
      if (!user?.memberActivated) {
        return res.status(403).json({ error: 'Membership activation required' });
      }

      // Get course details
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Check level requirement
      if (user.currentLevel < course.requiredLevel) {
        return res.status(403).json({ error: `Level ${course.requiredLevel} required` });
      }

      // Check if already enrolled
      const existingAccess = await storage.getCourseAccess(req.walletAddress, courseId);
      if (existingAccess) {
        return res.status(400).json({ error: 'Already enrolled in this course' });
      }

      // Handle payment for paid courses
      if (!course.isFree && course.priceBCC > 0) {
        const bccBalance = await storage.getBCCBalance(req.walletAddress);
        if (!bccBalance) {
          return res.status(400).json({ error: 'No BCC balance found' });
        }

        const availableAmount = useBCCBucket === 'transferable' ? bccBalance.transferable : bccBalance.restricted;
        if (availableAmount < course.priceBCC) {
          return res.status(400).json({ error: `Insufficient ${useBCCBucket} BCC balance` });
        }

        // Deduct BCC from specified bucket
        const updateData = useBCCBucket === 'transferable' 
          ? { transferable: bccBalance.transferable - course.priceBCC }
          : { restricted: bccBalance.restricted - course.priceBCC };

        await storage.updateBCCBalance(req.walletAddress, updateData);
      }

      // Create course access
      const access = await storage.createCourseAccess({
        walletAddress: req.walletAddress,
        courseId: courseId,
        progress: 0,
        completed: false,
      });

      res.json({ 
        success: true, 
        access,
        bucketUsed: useBCCBucket,
        amountDeducted: course.isFree ? 0 : course.priceBCC
      });
    } catch (error) {
      console.error('Course claim error:', error);
      res.status(500).json({ error: 'Failed to claim course' });
    }
  });

  // HiveWorld routes
  app.get("/api/hiveworld/matrix", requireWallet, async (req: any, res) => {
    try {
      const referralNode = await storage.getReferralNode(req.walletAddress);
      if (!referralNode) {
        return res.status(404).json({ error: 'Referral node not found' });
      }

      // Get children details using existing database structure  
      const childrenResult = await db.execute(sql`
        SELECT wallet_address FROM referral_nodes 
        WHERE parent_wallet = ${req.walletAddress.toLowerCase()}
      `);
      
      const childrenDetails = await Promise.all(
        childrenResult.rows.map(async (row: any) => {
          const childUser = await storage.getUser(row.wallet_address);
          return {
            walletAddress: row.wallet_address,
            username: childUser?.username,
            memberActivated: childUser?.memberActivated,
            currentLevel: childUser?.currentLevel,
          };
        })
      );

      // Get BeeHive earnings data instead of old reward events
      const earnings = await storage.getEarningsWalletByWallet(req.walletAddress);

      res.json({
        referralNode,
        childrenDetails,
        earnings,
      });
    } catch (error) {
      console.error('Get matrix error:', error);
      res.status(500).json({ error: 'Failed to get matrix data' });
    }
  });

  // Discover routes
  app.get("/api/discover/stats", async (req, res) => {
    try {
      // Mock blockchain stats
      const stats = {
        latestBlock: 18542891 + Math.floor(Math.random() * 1000),
        gasPrice: 15 + Math.floor(Math.random() * 20),
        tps: 12.5 + Math.random() * 5,
        recentTransactions: [
          {
            hash: "0x742d35Cc..." + Math.random().toString(36).substr(2, 4),
            type: "Transfer",
            amount: "1,250 USDT",
            timestamp: "2 minutes ago",
          },
          {
            hash: "0x891a24Ef..." + Math.random().toString(36).substr(2, 4),
            type: "NFT Mint",
            amount: "Contract Call",
            timestamp: "5 minutes ago",
          },
          {
            hash: "0x123b45Cd..." + Math.random().toString(36).substr(2, 4),
            type: "Token Swap",
            amount: "500 BCC",
            timestamp: "8 minutes ago",
          },
        ],
      };
      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to get blockchain stats' });
    }
  });

  // NOTE: Admin routes moved to after admin middleware definition
  // All admin routes will be added after admin middleware definitions

  /* TEMPORARILY COMMENTED OUT - ALL ADMIN ROUTES MOVED BELOW
  app.post("/api/admin/discover/partners", requireAdminAuth, async (req: any, res) => {
    try {
      const partner = await storage.createDiscoverPartner(req.body);
      res.json(partner);
    } catch (error) {
      console.error('Create partner error:', error);
      res.status(500).json({ error: 'Failed to create partner' });
    }
  });

  app.put("/api/admin/discover/partners/:id", requireAdminAuth, async (req: any, res) => {
    try {
      const partner = await storage.updateDiscoverPartner(req.params.id, req.body);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      res.json(partner);
    } catch (error) {
      console.error('Update partner error:', error);
      res.status(500).json({ error: 'Failed to update partner' });
    }
  });

  app.delete("/api/admin/discover/partners/:id", requireAdminAuth, async (req: any, res) => {
    try {
      const success = await storage.deleteDiscoverPartner(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Delete partner error:', error);
      res.status(500).json({ error: 'Failed to delete partner' });
    }
  });

  app.post("/api/admin/discover/partners/:id/approve", requireAdminAuth, async (req: any, res) => {
    try {
      const partner = await storage.approveDiscoverPartner(req.params.id, req.adminUser.id);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      res.json(partner);
    } catch (error) {
      console.error('Approve partner error:', error);
      res.status(500).json({ error: 'Failed to approve partner' });
    }
  });

  app.post("/api/admin/discover/partners/:id/reject", requireAdminAuth, async (req: any, res) => {
    try {
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }
      
      const partner = await storage.rejectDiscoverPartner(req.params.id, reason);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      res.json(partner);
    } catch (error) {
      console.error('Reject partner error:', error);
      res.status(500).json({ error: 'Failed to reject partner' });
    }
  });

  app.post("/api/admin/discover/partners/:id/toggle-featured", requireAdminAuth, async (req: any, res) => {
    try {
      const partner = await storage.togglePartnerFeatured(req.params.id);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
      res.json(partner);
    } catch (error) {
      console.error('Toggle featured error:', error);
      res.status(500).json({ error: 'Failed to toggle featured status' });
    }
  });

  // DApp Types routes
  app.get("/api/admin/discover/dapp-types", requireAdminAuth, async (req: any, res) => {
    try {
      const dappTypes = await storage.getDappTypes();
      res.json(dappTypes);
    } catch (error) {
      console.error('Get dapp types error:', error);
      res.status(500).json({ error: 'Failed to get dapp types' });
    }
  });

  // Partner Chains routes
  app.get("/api/admin/discover/chains", requireAdminAuth, async (req: any, res) => {
    try {
      const chains = await storage.getPartnerChains();
      res.json(chains);
    } catch (error) {
      console.error('Get chains error:', error);
      res.status(500).json({ error: 'Failed to get partner chains' });
    }
  });

  // Job endpoints for BeeHive timer processing
  app.post("/api/jobs/process-timers", async (req, res) => {
    try {
      // BeeHive system handles timer processing automatically
      // This endpoint is kept for compatibility but processing is done during purchase
      res.json({ processedCount: 0, message: 'BeeHive system handles rewards automatically' });
    } catch (error) {
      console.error('Process timers error:', error);
      res.status(500).json({ error: 'Failed to process timers' });
    }
  });

  // Membership verification endpoint
  app.post("/api/membership/verify", requireWallet, async (req: any, res) => {
    try {
      const { txHash, level } = req.body;
      
      if (!txHash || !level) {
        return res.status(400).json({ error: 'Transaction hash and level required' });
      }

      // Mock verification - in production would check on-chain
      // Check if BBC token for the level exists in wallet
      console.log(`Verifying membership L${level} for ${req.walletAddress} with tx ${txHash}`);
      
      // Simulate on-chain verification delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock verification result (in production, would call smart contract)
      const verified = true; // Would check actual BBC token ownership
      
      res.json({ 
        verified,
        txHash,
        level,
        walletAddress: req.walletAddress
      });
    } catch (error) {
      console.error('Membership verification error:', error);
      res.status(500).json({ error: 'Failed to verify membership' });
    }
  });

  // Membership claim endpoint
  app.post("/api/membership/claim", requireWallet, async (req: any, res) => {
    try {
      const { level, txHash, priceUSDT } = req.body;
      
      if (!level || !txHash || !priceUSDT) {
        return res.status(400).json({ error: 'Level, transaction hash, and price required' });
      }

      // Get user data
      const user = await storage.getUser(req.walletAddress);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check for duplicate order
      const existingOrders = await storage.getOrdersByWallet(req.walletAddress);
      const duplicateOrder = existingOrders.find(order => 
        order.txHash === txHash && order.level === level
      );
      
      if (duplicateOrder) {
        return res.status(400).json({ error: 'Order already exists' });
      }

      // Create order record
      const order = await storage.createOrder({
        walletAddress: req.walletAddress,
        level,
        tokenId: level - 1, // Level 1 = tokenId 0, Level 2 = tokenId 1, etc.
        amountUSDT: priceUSDT,
        chain: 'alpha-centauri',
        txHash,
        status: 'completed',
      });

      // Get or create membership state
      let membershipState = await storage.getMembershipState(req.walletAddress);
      
      const previousLevel = user.currentLevel;
      const isFirstLevel = !user.memberActivated && level === 1;
      
      if (!membershipState) {
        membershipState = await storage.createMembershipState({
          walletAddress: req.walletAddress,
          levelsOwned: [level],
          activeLevel: level,
        });
      } else {
        // Update membership state
        const currentLevelsOwned = membershipState.levelsOwned || [];
        if (!currentLevelsOwned.includes(level)) {
          const updatedLevelsOwned = [...currentLevelsOwned, level].sort((a, b) => a - b);
          const newActiveLevel = Math.max(membershipState.activeLevel, level);
          
          await storage.updateMembershipState(req.walletAddress, {
            levelsOwned: updatedLevelsOwned,
            activeLevel: newActiveLevel,
          });
        }
      }

      // Update user activation status and level
      const userUpdates: Partial<typeof user> = {};
      if (isFirstLevel) {
        userUpdates.memberActivated = true;
      }
      if (level > user.currentLevel) {
        userUpdates.currentLevel = level;
      }
      
      if (Object.keys(userUpdates).length > 0) {
        await storage.updateUser(req.walletAddress, userUpdates);
      }

      // Credit BCC tokens based on level
      const bccReward = calculateBCCReward(level);
      if (bccReward.total > 0) {
        let bccBalance = await storage.getBCCBalance(req.walletAddress);
        
        if (!bccBalance) {
          bccBalance = await storage.createBCCBalance({
            walletAddress: req.walletAddress,
            transferable: bccReward.transferable,
            restricted: bccReward.restricted,
          });
        } else {
          await storage.updateBCCBalance(req.walletAddress, {
            transferable: bccBalance.transferable + bccReward.transferable,
            restricted: bccBalance.restricted + bccReward.restricted,
          });
        }
      }

      // Create reward event for referral system
      if (user.referrerWallet) {
        const rewardAmount = level === 1 ? 100 : calculateRewardAmount(level);
        const eventType = level === 1 ? 'L1_direct' : 'L2plus_upgrade';
        
        // Process referral rewards using new BeeHive system
        await storage.processReferralRewards(req.walletAddress, level);
      }

      res.json({ 
        success: true,
        orderId: order.id,
        activated: isFirstLevel,
        previousLevel,
        newLevel: level,
        bccRewarded: bccReward.total
      });
    } catch (error) {
      console.error('Membership claim error:', error);
      res.status(500).json({ error: 'Failed to claim membership' });
    }
  });

  // BeeHive System API Routes
  
  // Get global dashboard statistics (visible to all members)
  app.get("/api/beehive/dashboard-stats", async (req, res) => {
    try {
      const stats = await storage.getGlobalStatisticsCustom();
      res.json(stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to get dashboard statistics' });
    }
  });

  // Get level configuration
  app.get("/api/beehive/level-configs", async (req, res) => {
    try {
      const levelConfigs = await storage.getAllLevelConfigs();
      res.json(levelConfigs);
    } catch (error) {
      console.error('Get level configs error:', error);
      res.status(500).json({ error: 'Failed to get level configurations' });
    }
  });

  // Company Stats API
  app.get("/api/beehive/company-stats", async (req, res) => {
    try {
      const stats = await storage.getCompanyStats();
      res.json(stats);
    } catch (error) {
      console.error('Company stats error:', error);
      res.status(500).json({ error: 'Failed to get company statistics' });
    }
  });

  // User referral stats API
  app.get("/api/beehive/user-stats/:walletAddress", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.params.walletAddress.toLowerCase();
      
      // Verify user can only access their own data
      if (walletAddress !== req.walletAddress.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const stats = await storage.getUserReferralStats(walletAddress);
      res.json(stats);
    } catch (error) {
      console.error('User stats error:', error);
      res.status(500).json({ error: 'Failed to get user statistics' });
    }
  });

  // Get member's earnings wallet (private - only own data)
  app.get("/api/beehive/earnings", requireWallet, async (req: any, res) => {
    try {
      const earnings = await storage.getEarningsWalletByWallet(req.walletAddress);
      res.json(earnings);
    } catch (error) {
      console.error('Get earnings error:', error);
      res.status(500).json({ error: 'Failed to get earnings' });
    }
  });

  // Get member's referral structure (private - only own data)
  app.get("/api/beehive/referral-tree", requireWallet, async (req: any, res) => {
    try {
      const referralNode = await storage.getReferralNode(req.walletAddress);
      if (!referralNode) {
        return res.status(404).json({ error: 'Referral node not found' });
      }
      res.json(referralNode);
    } catch (error) {
      console.error('Get referral tree error:', error);
      res.status(500).json({ error: 'Failed to get referral tree' });
    }
  });

  // Verify member NFT ownership
  app.post("/api/beehive/verify-nft", requireWallet, async (req: any, res) => {
    try {
      const { nftContractAddress, tokenId, chainId } = req.body;
      
      const validation = insertMemberNFTVerificationSchema.safeParse({
        walletAddress: req.walletAddress,
        nftContractAddress,
        tokenId: tokenId.toString(),
        chainId,
      });

      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid verification data' });
      }

      // In production, this would verify on-chain NFT ownership
      const verification = await storage.createNFTVerificationCustom({
        ...validation.data,
        verificationStatus: 'verified', // Would be determined by actual verification
        lastVerified: new Date(),
      });

      res.json({ success: true, verification });
    } catch (error) {
      console.error('NFT verification error:', error);
      res.status(500).json({ error: 'Failed to verify NFT' });
    }
  });

  // Process membership purchase and trigger rewards
  app.post("/api/beehive/purchase-membership", requireWallet, async (req: any, res) => {
    try {
      const { level, txHash, chainId } = req.body;
      
      if (!level || !txHash) {
        return res.status(400).json({ error: 'Level and transaction hash required' });
      }

      const user = await storage.getUser(req.walletAddress);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get level configuration
      const levelConfig = await storage.getLevelConfig(level);
      if (!levelConfig) {
        return res.status(400).json({ error: 'Invalid level' });
      }

      // Create order record
      const order = await storage.createOrder({
        walletAddress: req.walletAddress,
        level,
        tokenId: Math.floor(Math.random() * 1000000), // In production, this would be the actual NFT token ID
        amountUSDT: levelConfig.priceUSDT,
        chain: `chain-${chainId}`,
        txHash,
        status: 'completed',
      });

      // Update membership state
      let membershipState = await storage.getMembershipState(req.walletAddress);
      if (!membershipState) {
        membershipState = await storage.createMembershipState({
          walletAddress: req.walletAddress,
          levelsOwned: [level],
          activeLevel: level,
        });
      } else {
        const updatedLevels = [...(membershipState.levelsOwned || []), level];
        await storage.updateMembershipState(req.walletAddress, {
          levelsOwned: updatedLevels,
          activeLevel: Math.max(level, membershipState.activeLevel),
        });
      }

      // Activate user if first membership
      if (!user.memberActivated) {
        await storage.updateUser(req.walletAddress, {
          memberActivated: true,
          currentLevel: level,
          activationAt: new Date(),
        });
      }

      // Process referral rewards (instant + timed)
      await storage.processReferralRewards(req.walletAddress, level);

      res.json({ success: true, order, message: 'Membership purchased and rewards processed' });
    } catch (error) {
      console.error('Purchase membership error:', error);
      res.status(500).json({ error: 'Failed to process membership purchase' });
    }
  });

  // Bridge Payment Routes for Cross-Chain USDT Support

  // Start bridge payment process
  app.post("/api/bridge/payment", requireWallet, async (req, res) => {
    try {
      const result = insertBridgePaymentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }

      const bridgePayment = await storage.createBridgePayment({
        ...result.data,
        walletAddress: (req as any).walletAddress,
      });

      res.json(bridgePayment);
    } catch (error) {
      console.error('Bridge payment creation error:', error);
      res.status(500).json({ error: 'Failed to create bridge payment' });
    }
  });

  // Get bridge payment status
  app.get("/api/bridge/payment/:txHash", requireWallet, async (req, res) => {
    try {
      const { txHash } = req.params;
      const bridgePayment = await storage.getBridgePayment(txHash);
      
      if (!bridgePayment) {
        return res.status(404).json({ error: 'Bridge payment not found' });
      }

      res.json(bridgePayment);
    } catch (error) {
      console.error('Bridge payment fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch bridge payment' });
    }
  });

  // Get user's bridge payments
  app.get("/api/bridge/payments", requireWallet, async (req, res) => {
    try {
      const bridgePayments = await storage.getBridgePaymentsByWallet((req as any).walletAddress);
      res.json(bridgePayments);
    } catch (error) {
      console.error('Bridge payments fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch bridge payments' });
    }
  });

  // Update bridge payment status (webhook endpoint for monitoring)
  app.post("/api/bridge/payment/:id/update", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, targetTxHash, nftTokenId, verifiedAt, mintedAt } = req.body;

      const updatedPayment = await storage.updateBridgePayment(id, {
        status,
        targetTxHash,
        nftTokenId,
        verifiedAt: verifiedAt ? new Date(verifiedAt) : undefined,
        mintedAt: mintedAt ? new Date(mintedAt) : undefined,
        updatedAt: new Date(),
      });

      if (!updatedPayment) {
        return res.status(404).json({ error: 'Bridge payment not found' });
      }

      res.json(updatedPayment);
    } catch (error) {
      console.error('Bridge payment update error:', error);
      res.status(500).json({ error: 'Failed to update bridge payment' });
    }
  });

  // Monitor pending bridge payments
  app.get("/api/bridge/monitor", async (req, res) => {
    try {
      const pendingPayments = await storage.getPendingBridgePayments();
      res.json(pendingPayments);
    } catch (error) {
      console.error('Bridge monitoring error:', error);
      res.status(500).json({ error: 'Failed to fetch pending payments' });
    }
  });

  // ========== TOKEN PURCHASE ROUTES ==========
  
  // Purchase BCC or CTH tokens (1 token = 0.01 USDT)
  app.post("/api/tokens/purchase", requireWallet, async (req: any, res) => {
    try {
      const { tokenType, tokenAmount, sourceChain, payembedIntentId } = req.body;
      
      if (!tokenType || !tokenAmount || !sourceChain) {
        return res.status(400).json({ error: 'Token type, amount, and source chain required' });
      }

      if (!['BCC', 'CTH'].includes(tokenType)) {
        return res.status(400).json({ error: 'Invalid token type. Must be BCC or CTH' });
      }

      if (tokenAmount <= 0) {
        return res.status(400).json({ error: 'Token amount must be positive' });
      }

      // Calculate USDT amount (1 token = 0.01 USDT = 1 cent)
      const usdtAmount = tokenAmount; // tokenAmount is already in cents

      // Create token purchase record
      const purchase = await storage.createTokenPurchase({
        walletAddress: req.walletAddress,
        tokenType,
        tokenAmount,
        usdtAmount,
        sourceChain,
        payembedIntentId,
        status: 'pending'
      });

      res.json({ success: true, purchase });
    } catch (error) {
      console.error('Token purchase error:', error);
      res.status(500).json({ error: 'Failed to create token purchase' });
    }
  });

  // Confirm token purchase and trigger airdrop
  app.post("/api/tokens/confirm-purchase", requireWallet, async (req: any, res) => {
    try {
      const { purchaseId, txHash } = req.body;
      
      if (!purchaseId || !txHash) {
        return res.status(400).json({ error: 'Purchase ID and transaction hash required' });
      }

      // Get the purchase record
      const purchase = await storage.getTokenPurchase(purchaseId);
      if (!purchase) {
        return res.status(404).json({ error: 'Purchase not found' });
      }

      if (purchase.walletAddress !== req.walletAddress) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (purchase.status !== 'pending') {
        return res.status(400).json({ error: 'Purchase already processed' });
      }

      // Update purchase status
      await storage.updateTokenPurchase(purchaseId, {
        status: 'paid',
        txHash
      });

      // Trigger airdrop based on token type
      let airdropTxHash = '';
      if (purchase.tokenType === 'BCC') {
        // Airdrop BCC tokens to user's BCC balance
        const bccBalance = await storage.getBCCBalance(req.walletAddress);
        if (bccBalance) {
          // Add to transferable bucket (BCC purchased with USDT is transferable)
          await storage.updateBCCBalance(req.walletAddress, {
            transferable: bccBalance.transferable + purchase.tokenAmount
          });
        } else {
          // Create new BCC balance
          await storage.createBCCBalance({
            walletAddress: req.walletAddress,
            transferable: purchase.tokenAmount,
            restricted: 0
          });
        }
        airdropTxHash = `bcc-airdrop-${Date.now()}`;
      } else if (purchase.tokenType === 'CTH') {
        // Airdrop CTH tokens to user's CTH balance
        const cthBalance = await storage.getCTHBalance(req.walletAddress);
        if (cthBalance) {
          await storage.updateCTHBalance(req.walletAddress, {
            balance: cthBalance.balance + purchase.tokenAmount
          });
        } else {
          // Create new CTH balance
          await storage.createCTHBalance({
            walletAddress: req.walletAddress,
            balance: purchase.tokenAmount
          });
        }
        airdropTxHash = `cth-airdrop-${Date.now()}`;
      }

      // Update purchase with airdrop info
      await storage.updateTokenPurchase(purchaseId, {
        status: 'airdropped',
        airdropTxHash,
        completedAt: new Date()
      });

      const updatedPurchase = await storage.getTokenPurchase(purchaseId);
      res.json({ success: true, purchase: updatedPurchase, message: `${purchase.tokenType} tokens airdropped successfully` });
    } catch (error) {
      console.error('Token purchase confirmation error:', error);
      res.status(500).json({ error: 'Failed to confirm token purchase' });
    }
  });

  // Get user's token balances
  app.get("/api/tokens/balances", requireWallet, async (req: any, res) => {
    try {
      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      const cthBalance = await storage.getCTHBalance(req.walletAddress);

      res.json({
        BCC: {
          transferable: bccBalance?.transferable || 0,
          restricted: bccBalance?.restricted || 0,
          total: (bccBalance?.transferable || 0) + (bccBalance?.restricted || 0)
        },
        CTH: {
          balance: cthBalance?.balance || 0
        }
      });
    } catch (error) {
      console.error('Token balances error:', error);
      res.status(500).json({ error: 'Failed to get token balances' });
    }
  });

  // Get user's token purchase history
  app.get("/api/tokens/purchases", requireWallet, async (req: any, res) => {
    try {
      const purchases = await storage.getTokenPurchasesByWallet(req.walletAddress);
      res.json(purchases);
    } catch (error) {
      console.error('Token purchases error:', error);
      res.status(500).json({ error: 'Failed to get token purchases' });
    }
  });

  // Get token purchase by ID
  app.get("/api/tokens/purchase/:id", requireWallet, async (req: any, res) => {
    try {
      const { id } = req.params;
      const purchase = await storage.getTokenPurchase(id);
      
      if (!purchase) {
        return res.status(404).json({ error: 'Purchase not found' });
      }

      if (purchase.walletAddress !== req.walletAddress) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(purchase);
    } catch (error) {
      console.error('Token purchase fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch token purchase' });
    }
  });

  // Advertisement NFT endpoints
  app.get("/api/ads/nfts", async (req, res) => {
    try {
      const nfts = await storage.getAdvertisementNFTs();
      res.json(nfts);
    } catch (error) {
      console.error('Get advertisement NFTs error:', error);
      res.status(500).json({ error: 'Failed to get advertisement NFTs' });
    }
  });

  app.post("/api/ads/claim", requireWallet, async (req: any, res) => {
    try {
      const { nftId, bucketType } = req.body;
      
      if (!nftId || !bucketType) {
        return res.status(400).json({ error: 'NFT ID and bucket type required' });
      }

      if (!['transferable', 'restricted'].includes(bucketType)) {
        return res.status(400).json({ error: 'Invalid bucket type' });
      }

      // Get the NFT
      const nft = await storage.getAdvertisementNFTById(nftId);
      if (!nft) {
        return res.status(404).json({ error: 'Advertisement NFT not found' });
      }

      // Check if user has enough BCC balance
      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      if (!bccBalance) {
        return res.status(400).json({ error: 'No BCC balance found' });
      }

      const availableBalance = bucketType === 'transferable' ? bccBalance.transferable : bccBalance.restricted;
      if (availableBalance < nft.priceBCC) {
        return res.status(400).json({ error: `Insufficient ${bucketType} BCC balance` });
      }

      // Check supply limit
      if (nft.claimedCount >= nft.totalSupply) {
        return res.status(400).json({ error: 'Advertisement NFT sold out' });
      }

      // Deduct BCC balance
      const newBalance = bucketType === 'transferable' 
        ? { transferable: bccBalance.transferable - nft.priceBCC }
        : { restricted: bccBalance.restricted - nft.priceBCC };
      
      await storage.updateBCCBalance(req.walletAddress, newBalance);

      // Create the claim (BCC is locked in the NFT)
      const claim = await storage.createAdvertisementNFTClaim({
        walletAddress: req.walletAddress,
        nftId: nft.id,
        bccAmountLocked: nft.priceBCC,
        bucketUsed: bucketType,
        activeCode: '', // Generated in storage method
        status: 'claimed'
      });

      // Increment claimed count
      await storage.incrementAdvertisementNFTClaimed(nft.id);

      res.json(claim);
    } catch (error) {
      console.error('Advertisement NFT claim error:', error);
      res.status(500).json({ error: 'Failed to claim advertisement NFT' });
    }
  });

  app.get("/api/ads/my-nfts", requireWallet, async (req: any, res) => {
    try {
      const claims = await storage.getUserAdvertisementNFTClaims(req.walletAddress);
      res.json(claims);
    } catch (error) {
      console.error('Get user advertisement NFTs error:', error);
      res.status(500).json({ error: 'Failed to get your advertisement NFTs' });
    }
  });

  app.post("/api/ads/burn", requireWallet, async (req: any, res) => {
    try {
      const { claimId } = req.body;
      
      if (!claimId) {
        return res.status(400).json({ error: 'Claim ID required' });
      }

      // Burn the NFT and get the service code
      const burnedClaim = await storage.burnAdvertisementNFT(claimId, req.walletAddress);
      if (!burnedClaim) {
        return res.status(404).json({ error: 'Advertisement NFT claim not found or already burned' });
      }

      // Return the active code for the service
      res.json({
        success: true,
        serviceCode: burnedClaim.activeCode,
        message: 'Advertisement NFT burned successfully. Use the service code to activate your promotional service.'
      });
    } catch (error) {
      console.error('Advertisement NFT burn error:', error);
      res.status(500).json({ error: 'Failed to burn advertisement NFT' });
    }
  });
  */ // END OF TEMPORARILY COMMENTED ADMIN ROUTES

  // Admin Panel Authentication Routes
  const { authenticateAdmin, verifyAdminSession, logoutAdmin } = await import('./admin-auth.js');
  
  // Admin middleware definitions (now that admin functions are imported)
  requireAdminAuth = async (req: any, res: any, next: any) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: 'Admin authentication required' });
      }
      
      const session = await verifyAdminSession(sessionToken);
      
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
      
      req.adminUser = {
        id: session.id,
        username: session.username,
        email: session.email,
        role: session.role,
        permissions: session.permissions || [],
      };
      next();
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
  
  requireAdminRole = (allowedRoles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.adminUser) {
        return res.status(401).json({ error: 'Admin authentication required' });
      }
      
      if (!allowedRoles.includes(req.adminUser.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    };
  };
  
  // Permission-based middleware
  requireAdminPermission = (requiredPermissions: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.adminUser) {
        return res.status(401).json({ error: 'Admin authentication required' });
      }
      
      const userPermissions = req.adminUser.permissions || [];
      const hasPermission = requiredPermissions.some(permission => 
        userPermissions.includes(permission) || req.adminUser.role === 'super_admin'
      );
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    };
  };
  
  // Admin login
  app.post("/api/admin/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }
      
      const result = await authenticateAdmin(username, password);
      
      if (!result) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });
  
  // Admin logout
  app.post("/api/admin/auth/logout", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (sessionToken) {
        await logoutAdmin(sessionToken);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Admin logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });
  
  
  // Audit logging helper
  const logAdminAction = async (adminId: string, action: string, module: string, targetId?: string, targetType?: string, oldValues?: any, newValues?: any, description?: string) => {
    try {
      await db.insert(auditLogs).values({
        adminId,
        action,
        module,
        targetId,
        targetType,
        oldValues,
        newValues,
        description: description || `${action} ${targetType || 'resource'}`,
        severity: 'info',
      });
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  };
  
  // Admin routes (now properly placed after middleware definitions)
  
  // Admin session check
  app.get("/api/admin/auth/me", requireAdminAuth, async (req: any, res) => {
    res.json({
      id: req.adminUser.id,
      username: req.adminUser.username,
      email: req.adminUser.email,
      role: req.adminUser.role,
    });
  });

  // Admin Users routes
  app.get("/api/admin/admin-users", requireAdminAuth, requireAdminRole(['super_admin']), async (req: any, res) => {
    try {
      const { search, role, status } = req.query;
      
      let query = db.select().from(adminUsers);
      const conditions = [];
      
      if (search) {
        const searchTerm = `%${search.toLowerCase()}%`;
        conditions.push(sql`(
          LOWER(${adminUsers.username}) LIKE ${searchTerm} OR 
          LOWER(${adminUsers.email}) LIKE ${searchTerm} OR 
          LOWER(${adminUsers.fullName}) LIKE ${searchTerm}
        )`);
      }
      if (role) {
        conditions.push(eq(adminUsers.role, role));
      }
      if (status) {
        conditions.push(eq(adminUsers.status, status));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const users = await query.orderBy(desc(adminUsers.createdAt));
      
      // Don't return password hashes
      const safeUsers = users.map(user => ({
        ...user,
        passwordHash: undefined
      }));
      
      res.json(safeUsers);
    } catch (error) {
      console.error('Get admin users error:', error);
      res.status(500).json({ error: 'Failed to fetch admin users' });
    }
  });

  app.get("/api/admin/admin-users/:id", requireAdminAuth, requireAdminRole(['super_admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
      
      if (!user) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      // Don't return password hash
      const safeUser = { ...user, passwordHash: undefined };
      res.json(safeUser);
    } catch (error) {
      console.error('Get admin user error:', error);
      res.status(500).json({ error: 'Failed to fetch admin user' });
    }
  });

  app.post("/api/admin/admin-users", requireAdminAuth, requireAdminRole(['super_admin']), async (req: any, res) => {
    try {
      const { username, email, password, role, permissions, status, fullName, notes } = req.body;
      
      if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'Username, email, password, and role are required' });
      }
      
      // Check if username or email already exists
      const existingUser = await db.select().from(adminUsers)
        .where(sql`${adminUsers.username} = ${username} OR ${adminUsers.email} = ${email}`)
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create admin user
      const [newUser] = await db.insert(adminUsers).values({
        username,
        email,
        passwordHash,
        role,
        permissions: permissions || [],
        status: status || 'active',
        fullName,
        notes,
        createdBy: req.adminUser.username,
      }).returning();
      
      // Log admin action
      await logAdminAction(
        req.adminUser.id,
        'create',
        'admin_users',
        newUser.id,
        'admin_user',
        null,
        { username, email, role },
        `Created admin user: ${username}`
      );
      
      // Don't return password hash
      const safeUser = { ...newUser, passwordHash: undefined };
      res.json(safeUser);
    } catch (error) {
      console.error('Create admin user error:', error);
      res.status(500).json({ error: 'Failed to create admin user' });
    }
  });

  app.put("/api/admin/admin-users/:id", requireAdminAuth, requireAdminRole(['super_admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { username, email, password, role, permissions, status, fullName, notes } = req.body;
      
      // Get existing user
      const [existingUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
      if (!existingUser) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      // Prevent modifying the last super admin
      if (existingUser.role === 'super_admin' && role !== 'super_admin') {
        const superAdminCount = await db.select().from(adminUsers)
          .where(eq(adminUsers.role, 'super_admin'));
        if (superAdminCount.length <= 1) {
          return res.status(400).json({ error: 'Cannot modify the last super admin' });
        }
      }
      
      const updates: any = {
        username,
        email,
        role,
        permissions,
        status,
        fullName,
        notes,
      };
      
      // Hash new password if provided
      if (password) {
        updates.passwordHash = await bcrypt.hash(password, 12);
      }
      
      const [updatedUser] = await db.update(adminUsers)
        .set(updates)
        .where(eq(adminUsers.id, id))
        .returning();
      
      // Log admin action
      await logAdminAction(
        req.adminUser.id,
        'update',
        'admin_users',
        id,
        'admin_user',
        { username: existingUser.username, email: existingUser.email, role: existingUser.role },
        { username, email, role },
        `Updated admin user: ${username}`
      );
      
      // Don't return password hash
      const safeUser = { ...updatedUser, passwordHash: undefined };
      res.json(safeUser);
    } catch (error) {
      console.error('Update admin user error:', error);
      res.status(500).json({ error: 'Failed to update admin user' });
    }
  });

  app.delete("/api/admin/admin-users/:id", requireAdminAuth, requireAdminRole(['super_admin']), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get existing user
      const [existingUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
      if (!existingUser) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      // Prevent deleting the last super admin
      if (existingUser.role === 'super_admin') {
        const superAdminCount = await db.select().from(adminUsers)
          .where(eq(adminUsers.role, 'super_admin'));
        if (superAdminCount.length <= 1) {
          return res.status(400).json({ error: 'Cannot delete the last super admin' });
        }
      }
      
      // Delete user
      await db.delete(adminUsers).where(eq(adminUsers.id, id));
      
      // Log admin action
      await logAdminAction(
        req.adminUser.id,
        'delete',
        'admin_users',
        id,
        'admin_user',
        { username: existingUser.username, email: existingUser.email, role: existingUser.role },
        null,
        `Deleted admin user: ${existingUser.username}`
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete admin user error:', error);
      res.status(500).json({ error: 'Failed to delete admin user' });
    }
  });

  // Platform Users routes - For managing regular Web3 users
  app.get("/api/admin/platform-users", requireAdminAuth, requireAdminPermission(['users.read']), async (req: any, res) => {
    try {
      const { search, level, status } = req.query;
      
      // Base query with joins to get comprehensive user data
      let query = db
        .select({
          // User data
          walletAddress: users.walletAddress,
          username: users.username,
          email: users.email,
          currentLevel: users.currentLevel,
          memberActivated: users.memberActivated,
          registrationStatus: users.registrationStatus,
          createdAt: users.createdAt,
          lastUpdatedAt: users.lastUpdatedAt,
          activationAt: users.activationAt,
          referrerWallet: users.referrerWallet,
          preferredLanguage: users.preferredLanguage,
          
          // Membership data
          levelsOwned: membershipState.levelsOwned,
          activeLevel: membershipState.activeLevel,
          joinedAt: membershipState.joinedAt,
          lastUpgradeAt: membershipState.lastUpgradeAt,
          
          // BCC balances
          transferableBCC: bccBalances.transferable,
          restrictedBCC: bccBalances.restricted,
          
          // Earnings data
          totalEarnings: earningsWallet.totalEarnings,
          referralEarnings: earningsWallet.referralEarnings,
          levelEarnings: earningsWallet.levelEarnings,
          pendingRewards: earningsWallet.pendingRewards,
          withdrawnAmount: earningsWallet.withdrawnAmount,
          
          // Referral data
          directReferralCount: referralNodes.directReferralCount,
          totalTeamCount: referralNodes.totalTeamCount,
          sponsorWallet: referralNodes.sponsorWallet,
          matrixPosition: referralNodes.matrixPosition,
        })
        .from(users)
        .leftJoin(membershipState, eq(users.walletAddress, membershipState.walletAddress))
        .leftJoin(bccBalances, eq(users.walletAddress, bccBalances.walletAddress))
        .leftJoin(earningsWallet, eq(users.walletAddress, earningsWallet.walletAddress))
        .leftJoin(referralNodes, eq(users.walletAddress, referralNodes.walletAddress));
      
      const conditions = [];
      
      if (search) {
        const searchTerm = `%${search.toLowerCase()}%`;
        conditions.push(sql`(
          LOWER(${users.username}) LIKE ${searchTerm} OR 
          LOWER(${users.walletAddress}) LIKE ${searchTerm} OR 
          LOWER(${users.email}) LIKE ${searchTerm}
        )`);
      }
      
      if (level && level !== 'all') {
        if (level === '0') {
          conditions.push(eq(users.memberActivated, false));
        } else {
          conditions.push(eq(users.currentLevel, parseInt(level)));
        }
      }
      
      if (status && status !== 'all') {
        switch (status) {
          case 'activated':
            conditions.push(eq(users.memberActivated, true));
            break;
          case 'unactivated':
            conditions.push(eq(users.memberActivated, false));
            break;
          case 'completed':
            conditions.push(eq(users.registrationStatus, 'completed'));
            break;
          case 'pending':
            conditions.push(sql`${users.registrationStatus} != 'completed'`);
            break;
        }
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const platformUsers = await query.orderBy(desc(users.createdAt));
      
      // Format the data to match the frontend interface
      const formattedUsers = platformUsers.map(user => ({
        ...user,
        // Convert numeric values
        transferableBCC: user.transferableBCC || 0,
        restrictedBCC: user.restrictedBCC || 0,
        totalEarnings: parseFloat(user.totalEarnings || '0'),
        referralEarnings: parseFloat(user.referralEarnings || '0'),
        levelEarnings: parseFloat(user.levelEarnings || '0'),
        pendingRewards: parseFloat(user.pendingRewards || '0'),
        withdrawnAmount: parseFloat(user.withdrawnAmount || '0'),
        directReferralCount: user.directReferralCount || 0,
        totalTeamCount: user.totalTeamCount || 0,
        matrixPosition: user.matrixPosition || 0,
        levelsOwned: user.levelsOwned || [],
        activeLevel: user.activeLevel || 0,
      }));
      
      res.json(formattedUsers);
    } catch (error) {
      console.error('Get platform users error:', error);
      res.status(500).json({ error: 'Failed to fetch platform users' });
    }
  });

  app.get("/api/admin/platform-users/:walletAddress", requireAdminAuth, requireAdminPermission(['users.read']), async (req: any, res) => {
    try {
      const { walletAddress } = req.params;
      
      // Get comprehensive user data
      const [userData] = await db
        .select({
          // User data
          walletAddress: users.walletAddress,
          username: users.username,
          email: users.email,
          currentLevel: users.currentLevel,
          memberActivated: users.memberActivated,
          registrationStatus: users.registrationStatus,
          createdAt: users.createdAt,
          lastUpdatedAt: users.lastUpdatedAt,
          activationAt: users.activationAt,
          referrerWallet: users.referrerWallet,
          preferredLanguage: users.preferredLanguage,
          ipfsHash: users.ipfsHash,
          
          // Membership data
          levelsOwned: membershipState.levelsOwned,
          activeLevel: membershipState.activeLevel,
          joinedAt: membershipState.joinedAt,
          lastUpgradeAt: membershipState.lastUpgradeAt,
          
          // BCC balances
          transferableBCC: bccBalances.transferable,
          restrictedBCC: bccBalances.restricted,
          
          // Earnings data
          totalEarnings: earningsWallet.totalEarnings,
          referralEarnings: earningsWallet.referralEarnings,
          levelEarnings: earningsWallet.levelEarnings,
          pendingRewards: earningsWallet.pendingRewards,
          withdrawnAmount: earningsWallet.withdrawnAmount,
          
          // Referral data
          directReferralCount: referralNodes.directReferralCount,
          totalTeamCount: referralNodes.totalTeamCount,
          sponsorWallet: referralNodes.sponsorWallet,
          placerWallet: referralNodes.placerWallet,
          matrixPosition: referralNodes.matrixPosition,
          leftLeg: referralNodes.leftLeg,
          middleLeg: referralNodes.middleLeg,
          rightLeg: referralNodes.rightLeg,
        })
        .from(users)
        .leftJoin(membershipState, eq(users.walletAddress, membershipState.walletAddress))
        .leftJoin(bccBalances, eq(users.walletAddress, bccBalances.walletAddress))
        .leftJoin(earningsWallet, eq(users.walletAddress, earningsWallet.walletAddress))
        .leftJoin(referralNodes, eq(users.walletAddress, referralNodes.walletAddress))
        .where(eq(users.walletAddress, walletAddress.toLowerCase()));
      
      if (!userData) {
        return res.status(404).json({ error: 'Platform user not found' });
      }
      
      // Format the data
      const formattedUser = {
        ...userData,
        transferableBCC: userData.transferableBCC || 0,
        restrictedBCC: userData.restrictedBCC || 0,
        totalEarnings: parseFloat(userData.totalEarnings || '0'),
        referralEarnings: parseFloat(userData.referralEarnings || '0'),
        levelEarnings: parseFloat(userData.levelEarnings || '0'),
        pendingRewards: parseFloat(userData.pendingRewards || '0'),
        withdrawnAmount: parseFloat(userData.withdrawnAmount || '0'),
        directReferralCount: userData.directReferralCount || 0,
        totalTeamCount: userData.totalTeamCount || 0,
        matrixPosition: userData.matrixPosition || 0,
        levelsOwned: userData.levelsOwned || [],
        activeLevel: userData.activeLevel || 0,
        leftLeg: userData.leftLeg || [],
        middleLeg: userData.middleLeg || [],
        rightLeg: userData.rightLeg || [],
      };
      
      res.json(formattedUser);
    } catch (error) {
      console.error('Get platform user error:', error);
      res.status(500).json({ error: 'Failed to fetch platform user' });
    }
  });

  app.put("/api/admin/platform-users/:walletAddress", requireAdminAuth, requireAdminPermission(['users.update']), async (req: any, res) => {
    try {
      const { walletAddress } = req.params;
      const { username, email, currentLevel, memberActivated, registrationStatus, preferredLanguage } = req.body;
      
      // Check if user exists
      const [existingUser] = await db.select().from(users).where(eq(users.walletAddress, walletAddress.toLowerCase()));
      if (!existingUser) {
        return res.status(404).json({ error: 'Platform user not found' });
      }
      
      // Update user data
      const updates: any = {
        lastUpdatedAt: new Date(),
      };
      
      if (username !== undefined) updates.username = username;
      if (email !== undefined) updates.email = email;
      if (currentLevel !== undefined) updates.currentLevel = currentLevel;
      if (memberActivated !== undefined) updates.memberActivated = memberActivated;
      if (registrationStatus !== undefined) updates.registrationStatus = registrationStatus;
      if (preferredLanguage !== undefined) updates.preferredLanguage = preferredLanguage;
      
      const [updatedUser] = await db.update(users)
        .set(updates)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()))
        .returning();
      
      // Log admin action
      await logAdminAction(
        req.adminUser.id,
        'update',
        'users',
        walletAddress,
        'platform_user',
        { 
          username: existingUser.username, 
          email: existingUser.email, 
          currentLevel: existingUser.currentLevel,
          memberActivated: existingUser.memberActivated 
        },
        { username, email, currentLevel, memberActivated },
        `Updated platform user: ${walletAddress}`
      );
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Update platform user error:', error);
      res.status(500).json({ error: 'Failed to update platform user' });
    }
  });
  
  // Admin users management (super admin only)
  app.get("/api/admin/users", requireAdminAuth, requireAdminRole(['super_admin']), async (req: any, res) => {
    try {
      const admins = await db.select({
        id: adminUsers.id,
        username: adminUsers.username,
        email: adminUsers.email,
        role: adminUsers.role,
        active: adminUsers.active,
        twoFactorEnabled: adminUsers.twoFactorEnabled,
        lastLoginAt: adminUsers.lastLoginAt,
        createdAt: adminUsers.createdAt,
      }).from(adminUsers).orderBy(desc(adminUsers.createdAt));
      
      res.json(admins);
    } catch (error) {
      console.error('Get admin users error:', error);
      res.status(500).json({ error: 'Failed to get admin users' });
    }
  });
  
  // Create admin user (super admin only)
  app.post("/api/admin/users", requireAdminAuth, requireAdminRole(['super_admin']), async (req: any, res) => {
    try {
      const { username, email, password, role } = req.body;
      
      if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields required' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create admin user
      const [newAdmin] = await db.insert(adminUsers).values({
        username,
        email,
        passwordHash,
        role,
      }).returning({
        id: adminUsers.id,
        username: adminUsers.username,
        email: adminUsers.email,
        role: adminUsers.role,
      });
      
      // Log action
      await logAdminAction(
        req.adminUser.id,
        'create',
        'admin_users',
        newAdmin.id,
        'admin_user',
        null,
        { username, email, role },
        `Created admin user: ${username}`
      );
      
      res.json(newAdmin);
    } catch (error) {
      console.error('Create admin user error:', error);
      res.status(500).json({ error: 'Failed to create admin user' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function calculateBCCReward(level: number): { transferable: number; restricted: number; total: number } {
  // Base BCC reward calculation per level
  const baseReward = level * 50; // 50 BCC per level
  const transferable = Math.floor(baseReward * 0.3); // 30% transferable
  const restricted = baseReward - transferable; // 70% restricted
  
  return {
    transferable,
    restricted,
    total: baseReward
  };
}

function calculateRewardAmount(level: number): number {
  // Reward amount calculation for referral system
  if (level <= 5) return 50;
  if (level <= 10) return 100;
  if (level <= 15) return 200;
  return 300;
}
