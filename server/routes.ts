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
  globalMatrixPosition,
  referralNodes,
  bccBalances,
  earningsWallet,
  rewardDistributions,
  advertisementNFTs,
  type AdminUser,
  type AdminSession
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { eq, and, or, desc, gte } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // JWT secret for authentication
  const JWT_SECRET = process.env.JWT_SECRET || 'beehive-secret-key';
  
  // API Route Protection - Force JSON response for API calls  
  app.use('/api', (req, res, next) => {
    console.log(`🔍 API Route Hit: ${req.method} ${req.originalUrl}`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-API-Route', 'true');
    next();
  });
  
  // Middleware to extract wallet address from auth
  const requireWallet = (req: any, res: any, next: any) => {
    const walletAddress = req.headers['x-wallet-address'];
    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }
    req.walletAddress = walletAddress.toLowerCase();
    next();
  };

  // Demo NFT minting endpoint - Placed early to ensure proper routing
  app.post("/api/demo/claim-nft", requireWallet, async (req: any, res) => {
    console.log('🎯 Demo NFT endpoint called!', req.body);
    res.json({ 
      success: true, 
      txHash: `demo_nft_${Date.now()}`,
      message: `Level 1 NFT claimed successfully!`,
      realNFT: false
    });
  });
  
  // Check if user exists (for referral validation)
  app.get("/api/auth/check-user-exists/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress || !walletAddress.startsWith('0x')) {
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }
      
      const user = await storage.getUser(walletAddress.toLowerCase());
      
      if (!user) {
        return res.status(404).json({ error: 'User not found', exists: false });
      }
      
      res.json({ 
        exists: true,
        username: user.username,
        walletAddress: user.walletAddress
      });
    } catch (error) {
      console.error('Failed to check user existence:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

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

  // Wallet connection logging endpoint with referral backup
  app.post("/api/wallet/log-connection", async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const { connectionType, userAgent, referrerUrl, referralCode, uplineWallet } = req.body;
      
      // Log referral information for backup
      if (referralCode && referralCode.startsWith('0x')) {
        console.log(`[REFERRAL BACKUP] Wallet ${walletAddress} connected with referrer: ${referralCode}`);
        
        // Store in a simple in-memory backup (could be enhanced with database storage)
        if (!(global as any).referralBackup) {
          (global as any).referralBackup = new Map();
        }
        (global as any).referralBackup.set(walletAddress.toLowerCase(), {
          referrer: referralCode.toLowerCase(),
          timestamp: new Date().toISOString(),
          userAgent,
          referrerUrl
        });
      }
      
      // Update user connection tracking if user exists
      const existingUser = await storage.getUser(walletAddress);
      if (existingUser) {
        await storage.updateUserRegistrationTracking(walletAddress, {
          lastWalletConnectionAt: new Date(),
          walletConnectionCount: (existingUser.walletConnectionCount || 0) + 1
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Wallet connection logging error:', error);
      res.status(500).json({ error: 'Failed to log wallet connection' });
    }
  });

  // Get referral backup information
  app.get("/api/wallet/referral-backup", async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const backup = (global as any).referralBackup?.get(walletAddress.toLowerCase());
      res.json({ 
        referrer: backup?.referrer || null,
        timestamp: backup?.timestamp || null
      });
    } catch (error) {
      console.error('Referral backup retrieval error:', error);
      res.status(500).json({ error: 'Failed to get referral backup' });
    }
  });

  // Check wallet registration status and referral detection
  app.get("/api/wallet/registration-status", async (req, res) => {
    try {
      // Disable caching for real-time updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const walletAddress = req.headers['x-wallet-address'] as string;
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      // Extract referral info from query params
      const { ref, code } = req.query;
      
      // Check if wallet is already registered
      const existingUser = await storage.getUser(walletAddress);
      
      let registrationRequired = false;
      let uplineWallet = null;
      let isCompanyDirectReferral = false;
      let referralCode = null;
      
      if (!existingUser) {
        registrationRequired = true;
        
        // Handle special code "001122" for company direct referral
        if (code === '001122') {
          isCompanyDirectReferral = true;
          referralCode = code;
          // Set company wallet as upline (you may need to configure this)
          uplineWallet = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0'; // Company wallet
        } else if (ref) {
          // Validate referrer wallet
          const referrer = await storage.getUser(ref as string);
          if (referrer && referrer.memberActivated) {
            uplineWallet = ref as string;
          }
        }
        
        // If no valid referral link and no special code, require form
        if (!uplineWallet && !isCompanyDirectReferral) {
          return res.json({
            registered: false,
            registrationRequired: true,
            needsReferralForm: true,
            message: 'Registration form required - no valid referral link detected'
          });
        }
      }
      
      res.json({
        registered: !!existingUser,
        activated: existingUser?.memberActivated || false,
        registrationRequired,
        uplineWallet,
        isCompanyDirectReferral,
        referralCode,
        registrationExpiresAt: existingUser?.registrationExpiresAt,
        registrationTimeoutHours: existingUser?.registrationTimeoutHours || 48
      });
    } catch (error) {
      console.error('Registration status check error:', error);
      res.status(500).json({ error: 'Failed to check registration status' });
    }
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
      
      // Get registration timeout from admin settings (default 48 hours)
      const timeoutHours = parseInt(await storage.getAdminSetting('registration_timeout_hours') || '48');
      const registrationExpiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000);
      
      const user = await storage.createUser({
        ...body,
        secondaryPasswordHash: hashedPassword,
        referrerWallet: body.referrerWallet, // Ensure referrer wallet is saved
        registrationExpiresAt: registrationExpiresAt,
        registrationTimeoutHours: timeoutHours,
        memberActivated: false // Explicitly set as inactive
      });

      // Initialize BCC balance
      await storage.createBCCBalance({
        walletAddress: user.walletAddress,
        transferable: 0,
        restricted: 0,
      });

      // V2 Matrix: Initialize position in global matrix
      if (body.referrerWallet) {
        console.log(`Initializing V2 global matrix position for ${user.walletAddress} under sponsor ${body.referrerWallet}`);
        await storage.createGlobalMatrixPositionV2({
          memberWallet: user.walletAddress,
          directSponsorWallet: body.referrerWallet,
          position: await storage.getNextGlobalMatrixPosition(),
          layer: 1,
          joinedAt: new Date()
        });
        console.log('✅ V2 Global matrix position initialized successfully');
      }

      res.json({ user });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: 'Registration failed' });
    }
  });

  app.get("/api/auth/user", requireWallet, async (req: any, res) => {
    try {
      // Disable caching for real-time updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const user = await storage.getUser(req.walletAddress);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      const cthBalance = await storage.getCTHBalance(req.walletAddress);
      const membershipNFTsV2 = await storage.getMembershipNFTV2ByWallet(req.walletAddress);
      const globalMatrixPosition = await storage.getGlobalMatrixPositionV2(req.walletAddress);

      res.json({
        user,
        bccBalance,
        cthBalance,
        membershipNFTsV2,
        globalMatrixPosition,
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

      // V2: Create membership NFT record
      await storage.createMembershipNFTV2({
        walletAddress: req.walletAddress,
        level: level,
        status: 'activated',
        nftTokenId: null, // Will be set when actual NFT is minted
        contractAddress: null,
        txHash: txHash || null,
        purchasedAt: new Date(),
        pricePaidUSDT: 0, // Will be updated when payment is processed
        levelName: `Level ${level}`
      });

      // Set user as verified member FIRST (before any BCC rewards)
      await storage.updateUser(req.walletAddress, {
        memberActivated: true,
        currentLevel: level
      });
      console.log(`✅ User verified as Level ${level} member`);

      // ONLY AFTER becoming verified member, give BCC rewards
      const bccReward = calculateBCCReward(level);
      console.log(`💰 Verified member reward: ${bccReward.total} BCC for Level ${level} (all transferable)`);
      
      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      if (bccBalance) {
        await storage.updateBCCBalance(req.walletAddress, {
          transferable: bccBalance.transferable + bccReward.transferable,
          restricted: bccBalance.restricted + bccReward.restricted,
        });
      } else {
        // Create new BCC balance for verified members only
        await storage.createBCCBalance({
          walletAddress: req.walletAddress,
          transferable: bccReward.transferable,
          restricted: bccReward.restricted,
        });
      }

      // V2 Matrix Placement & Rewards
      console.log('🔄 V2: Activating user in global matrix for level', level);
      try {
        // Create level configuration object for V2 system
        const levelConfig = {
          level: level,
          level_name: `Level ${level}`,
          price_usdt: level === 1 ? 10000 : (5000 + (level * 5000)) // $100 for L1, scaling for others
        };
        
        await activateUserInMatrix(req.walletAddress, levelConfig);
        console.log('✅ V2: User activated in global matrix successfully');
      } catch (error) {
        console.error('❌ V2: Matrix activation failed:', error);
        // Don't throw error to prevent blocking user activation
      }

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

  // DEBUG: Test V2 matrix system
  app.post("/api/debug/test-v2-matrix", requireWallet, async (req: any, res) => {
    try {
      console.log('🧪 DEBUG: Testing V2 matrix system for:', req.walletAddress);
      
      // Get V2 matrix position
      const position = await storage.getGlobalMatrixPositionV2(req.walletAddress);
      const membershipNFTs = await storage.getMembershipNFTV2ByWallet(req.walletAddress);
      const layerRewards = await storage.getLayerRewardsV2ByWallet(req.walletAddress);
      
      res.json({ 
        success: true, 
        message: 'V2 matrix data retrieved successfully',
        position,
        membershipNFTs,
        layerRewards
      });
    } catch (error) {
      console.error('💥 V2 matrix test error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'V2 matrix test failed' });
    }
  });

  // NFT-based automatic member activation
  app.post("/api/membership/nft-activate", requireWallet, async (req: any, res) => {
    try {
      const { nftContractAddress, tokenId } = req.body;
      
      // Verify this is the correct Member NFT contract (updated demo address)
      const validContracts = [
        '0x6d513487bd63430ca71cd1d9a7dea5aacdbf0322', // Original
        '0x99265477249389469929CEA07c4a337af9e12cdA'.toLowerCase() // Demo Beehive Member NFT
      ];
      if (!validContracts.includes(nftContractAddress.toLowerCase())) {
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

      // V2: Create membership NFT record for Level 1
      await storage.createMembershipNFTV2({
        walletAddress: req.walletAddress,
        level: 1,
        status: 'activated',
        nftTokenId: parseInt(tokenId) || null,
        contractAddress: nftContractAddress,
        txHash: null, // Will be set when blockchain transaction occurs
        purchasedAt: new Date(),
        pricePaidUSDT: 0, // NFT-based activation is free
        levelName: 'Warrior'
      });

      // Credit initial BCC tokens for Level 1 (600 BCC total: 100 transferable + 500 locked)
      const bccReward = calculateBCCReward(1);
      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      if (!bccBalance) {
        await storage.createBCCBalance({
          walletAddress: req.walletAddress,
          transferable: bccReward.transferable, // 100 transferable BCC
          restricted: bccReward.restricted,     // 500 locked BCC
        });
      }

      // V2 Matrix Placement & Rewards for NFT activation  
      console.log('🔄 V2: Activating user in global matrix via NFT claim');
      try {
        // Create level configuration object for V2 system
        const levelConfig = {
          level: 1,
          level_name: 'Warrior',
          price_usdt: 10000 // $100 for Level 1
        };
        
        await activateUserInMatrix(req.walletAddress, levelConfig);
        console.log('✅ V2: User activated in global matrix via NFT successfully');
      } catch (error) {
        console.error('❌ V2: NFT matrix activation failed:', error);
        // Don't throw error to prevent blocking user activation
      }
      
      // V2 system automatically handles layer rewards through activateUserInMatrix
      console.log('✅ V2 system will automatically process upline rewards based on matrix placement');

      res.json({ 
        success: true, 
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

  // Process V2 reward timeouts (background job endpoint)
  app.post("/api/rewards/process-v2-timeouts", async (req, res) => {
    try {
      // V2 system: Process expired layer rewards and redistribute
      const expiredRewards = await storage.getExpiredLayerRewardsV2();
      let processedCount = 0;

      for (const reward of expiredRewards) {
        try {
          // Update status to expired and reallocate to next eligible recipient
          await storage.updateLayerRewardV2(reward.id, {
            status: 'expired_reallocated',
            expiredAt: new Date()
          });
          processedCount++;
        } catch (error) {
          console.error('Failed to process expired reward:', reward.id, error);
        }
      }

      res.json({ success: true, processedCount });
    } catch (error) {
      console.error('V2 timeout processing error:', error);
      res.status(500).json({ error: 'V2 timeout processing failed' });
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

  // BeeHive API routes - V2 GLOBAL MATRIX
  app.get("/api/beehive/matrix", requireWallet, async (req: any, res) => {
    try {
      const matrixPosition = await storage.getGlobalMatrixPositionV2(req.walletAddress);
      if (!matrixPosition) {
        return res.status(404).json({ error: 'V2 Matrix position not found' });
      }

      // Get direct referrals from users table
      const directReferrals = await db.select()
        .from(users)
        .where(eq(users.referrerWallet, req.walletAddress.toLowerCase()));
      
      const referralDetails = await Promise.all(
        directReferrals.map(async (referral) => {
          const membershipNFTs = await storage.getMembershipNFTV2ByWallet(referral.walletAddress);
          const highestLevel = membershipNFTs.reduce((max, nft) => Math.max(max, nft.level), 0);
          
          return {
            walletAddress: referral.walletAddress,
            username: referral.username,
            memberActivated: referral.memberActivated,
            currentLevel: referral.currentLevel,
            highestNFTLevel: highestLevel,
            joinedAt: referral.createdAt,
          };
        })
      );

      // Get V2 layer rewards instead of old reward distributions
      const layerRewards = await storage.getLayerRewardsV2ByWallet(req.walletAddress);

      res.json({
        matrixPosition,
        directReferrals: referralDetails,
        layerRewards,
        totalDirectReferrals: referralDetails.length,
      });
    } catch (error) {
      console.error('Get V2 matrix error:', error);
      res.status(500).json({ error: 'Failed to get V2 matrix data' });
    }
  });

  // User stats endpoint for referral dashboard - V2 SYSTEM
  app.get("/api/beehive/user-stats/:walletAddress?", requireWallet, async (req: any, res) => {
    try {
      // Disable caching for real-time updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const walletAddress = req.params.walletAddress || req.walletAddress;
      
      const matrixPosition = await storage.getGlobalMatrixPositionV2(walletAddress);
      const user = await storage.getUser(walletAddress);
      const membershipNFTs = await storage.getMembershipNFTV2ByWallet(walletAddress);
      
      // Get direct referral count from users table
      const directReferralResult = await db.select()
        .from(users)
        .where(eq(users.referrerWallet, walletAddress.toLowerCase()));
      const directReferralCount = directReferralResult.length;
      
      console.log('📊 V2: Direct referrals for', walletAddress, ':', directReferralCount);
      
      // For total team count, we'll use a simple recursive query to count all downline members
      const totalTeamCount = directReferralCount; // Simplified - can be expanded to full recursive count
      
      // Get V2 layer rewards for earnings calculation
      const layerRewards = await storage.getLayerRewardsV2ByWallet(walletAddress);
      
      // Calculate total and pending earnings from V2 layer rewards
      const totalEarnings = layerRewards
        .filter(reward => reward.status === 'claimed')
        .reduce((sum, reward) => sum + reward.rewardAmountUSDT, 0);
      
      const pendingRewards = layerRewards
        .filter(reward => ['pending', 'claimable'].includes(reward.status))
        .reduce((sum, reward) => sum + reward.rewardAmountUSDT, 0);
      
      // Calculate monthly earnings from this month's rewards
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      const monthlyEarnings = layerRewards
        .filter(reward => 
          reward.status === 'claimed' && 
          reward.claimedAt && 
          new Date(reward.claimedAt) >= currentMonth
        )
        .reduce((sum, reward) => sum + reward.rewardAmountUSDT, 0);

      // Build simplified downline matrix using V2 data
      const downlineMatrix = [];
      for (let level = 1; level <= 19; level++) {
        downlineMatrix.push({
          level,
          members: 0, // Will be calculated when we implement full recursive counting
          upgrades: 0,
          earnings: 0
        });
      }

      // Return V2 stats response
      res.json({
        user,
        matrixPosition,
        membershipNFTs,
        directReferrals: directReferralCount,
        totalTeam: totalTeamCount,
        totalEarnings,
        pendingRewards,
        monthlyEarnings,
        downlineMatrix,
        layerRewards
      });
    } catch (error) {
      console.error('Get V2 user stats error:', error);
      res.status(500).json({ error: 'Failed to get V2 user stats' });
    }
  });

  // Get user's V2 matrix tree data
  app.get("/api/referrals/v2-matrix/:walletAddress?", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.params.walletAddress || req.walletAddress;
      
      // Get V2 matrix data
      const matrixPosition = await storage.getGlobalMatrixPositionV2(walletAddress);
      const layerRewards = await storage.getLayerRewardsV2ByWallet(walletAddress);
      const matrixTree = await storage.getMatrixTreeV2ByRoot(walletAddress);
      
      res.json({
        matrixPosition,
        layerRewards,
        matrixTree,
        totalRewards: layerRewards.length,
        totalEarnings: layerRewards.reduce((sum, reward) => sum + reward.rewardAmountUSDT, 0)
      });
    } catch (error) {
      console.error('Get V2 matrix tree error:', error);
      res.status(500).json({ error: 'Failed to get V2 matrix tree' });
    }
  });

  // V2: Process matrix placement and rewards
  app.post("/api/referrals/v2-process-placement", requireWallet, async (req: any, res) => {
    try {
      console.log('🔄 V2: Processing matrix placement for:', req.walletAddress);
      
      // Get user's V2 position and process any pending actions
      const position = await storage.getGlobalMatrixPositionV2(req.walletAddress);
      const rewards = await storage.getLayerRewardsV2ByWallet(req.walletAddress);
      
      res.json({ 
        success: true, 
        message: 'V2 matrix placement processed successfully',
        position,
        rewards: rewards.length
      });
    } catch (error) {
      console.error('V2 matrix placement error:', error);
      res.status(500).json({ error: 'Failed to process V2 matrix placement' });
    }
  });

  // Get layer members data for Matrix Layer Management
  app.get("/api/referrals/layer-members", requireWallet, async (req: any, res) => {
    try {
      // Disable caching for real-time updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const layersWithMembers = await storage.getLayerMembersData(req.walletAddress);
      
      // Get upgrade notifications using direct database query
      const notificationsResult = await db.execute(sql`
        SELECT 
          un.*,
          u.username as trigger_username
        FROM upgrade_notifications un
        LEFT JOIN users u ON u.wallet_address = un.trigger_wallet
        WHERE un.wallet_address = ${req.walletAddress}
        ORDER BY un.created_at DESC
      `);
      
      res.json({ 
        layers: layersWithMembers,
        notifications: notificationsResult.rows || []
      });
    } catch (error) {
      console.error('Get layer members error:', error);
      res.status(500).json({ error: 'Failed to get layer members data' });
    }
  });

  // Get user recent activities
  app.get("/api/user/activities", requireWallet, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getUserRecentActivities(req.walletAddress, limit);
      res.json({ activities });
    } catch (error) {
      console.error('Get user activities error:', error);
      res.status(500).json({ error: 'Failed to get user activities' });
    }
  });

  // Add activity logging endpoint
  app.post("/api/user/activity", requireWallet, async (req: any, res) => {
    try {
      const { activityType, title, description, amount, amountType, relatedWallet, relatedLevel, metadata } = req.body;
      await storage.logUserActivity(
        req.walletAddress,
        activityType,
        title,
        description,
        amount,
        amountType,
        relatedWallet,
        relatedLevel,
        metadata
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Log user activity error:', error);
      res.status(500).json({ error: 'Failed to log activity' });
    }
  });

  // Get all reward notifications for a user
  app.get("/api/notifications/rewards", requireWallet, async (req: any, res) => {
    try {
      // Disable caching for real-time updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const notifications = await storage.getRewardNotifications(req.walletAddress);
      
      res.json({
        notifications: notifications.map(notif => ({
          id: notif.id,
          triggerWallet: notif.triggerWallet,
          triggerLevel: notif.triggerLevel,
          layerNumber: notif.layerNumber,
          rewardAmount: notif.rewardAmount,
          status: notif.status,
          expiresAt: notif.expiresAt,
          timeRemaining: notif.status === 'pending' ? Math.max(0, new Date(notif.expiresAt).getTime() - Date.now()) : 0,
          claimedAt: notif.claimedAt,
          createdAt: notif.createdAt
        }))
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  });

  // Get user's global matrix position and direct referrals - NEW ENDPOINT
  app.get("/api/beehive/global-matrix-position/:walletAddress", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.params.walletAddress || req.walletAddress;
      
      // Get user's matrix position
      const position = await db.select()
        .from(globalMatrixPosition)
        .where(eq(globalMatrixPosition.walletAddress, walletAddress))
        .limit(1);
        
      // Get user's direct referrals (users they directly sponsored)
      const directReferrals = await db.select({
        walletAddress: globalMatrixPosition.walletAddress,
        matrixLevel: globalMatrixPosition.matrixLevel,
        positionIndex: globalMatrixPosition.positionIndex,
        joinedAt: globalMatrixPosition.joinedAt,
        username: users.username,
        currentLevel: users.currentLevel
      })
      .from(globalMatrixPosition)
      .leftJoin(users, eq(globalMatrixPosition.walletAddress, users.walletAddress))
      .where(eq(globalMatrixPosition.directSponsorWallet, walletAddress))
      .orderBy(globalMatrixPosition.joinedAt);
      
      res.json({
        position: position[0] || null,
        directReferrals,
        totalDirectReferrals: directReferrals.length
      });
    } catch (error) {
      console.error('Global matrix position error:', error);
      res.status(500).json({ error: 'Failed to get global matrix position' });
    }
  });

  // V2 Referral tree endpoint
  app.get("/api/beehive/referral-tree", requireWallet, async (req: any, res) => {
    try {
      const matrixPosition = await storage.getGlobalMatrixPositionV2(req.walletAddress);
      if (!matrixPosition) {
        return res.status(404).json({ error: 'V2 Matrix position not found' });
      }

      // Get all direct referrals from users table
      const directReferrals = await db.select()
        .from(users)
        .where(eq(users.referrerWallet, req.walletAddress.toLowerCase()))
        .orderBy(users.createdAt);

      const referralDetails = await Promise.all(
        directReferrals.map(async (referral) => {
          const membershipNFTs = await storage.getMembershipNFTV2ByWallet(referral.walletAddress);
          const layerRewards = await storage.getLayerRewardsV2ByWallet(referral.walletAddress);
          
          const totalEarnings = layerRewards
            .filter(r => r.status === 'claimed')
            .reduce((sum, r) => sum + r.rewardAmountUSDT, 0);
          
          const highestLevel = membershipNFTs.reduce((max, nft) => Math.max(max, nft.level), 0);
          
          return {
            walletAddress: referral.walletAddress,
            username: referral.username || 'Unknown',
            level: referral.currentLevel || 0,
            highestNFTLevel: highestLevel,
            joinDate: referral.createdAt?.toISOString() || new Date().toISOString(),
            earnings: totalEarnings,
            memberActivated: referral.memberActivated || false,
            membershipNFTs: membershipNFTs.length,
          };
        })
      );

      // Get V2 matrix tree levels
      const matrixLevels = [];
      for (let level = 1; level <= 19; level++) {
        const layerRewards = await storage.getLayerRewardsV2ByLayer(level);
        
        matrixLevels.push({
          level,
          totalRewards: layerRewards.length,
          claimedRewards: layerRewards.filter(r => r.status === 'claimed').length,
          pendingRewards: layerRewards.filter(r => r.status === 'pending').length,
        });
      }

      res.json({
        userPosition: matrixPosition,
        directReferrals: referralDetails,
        matrixLevels: matrixLevels.slice(0, 5), // First 5 levels for display
        totalDirectReferrals: referralDetails.length,
      });
    } catch (error) {
      console.error('Get referral tree error:', error);
      res.status(500).json({ error: 'Failed to get referral tree' });
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

      // V2: Create membership NFT record
      await storage.createMembershipNFTV2({
        walletAddress: req.walletAddress,
        level: level,
        status: 'activated',
        nftTokenId: level - 1, // Level 1 = tokenId 0, etc.
        contractAddress: null, // Will be set when NFT is minted
        txHash: txHash,
        purchasedAt: new Date(),
        pricePaidUSDT: priceUSDT,
        levelName: `Level ${level}`
      });
      
      const previousLevel = user.currentLevel;
      const isFirstLevel = !user.memberActivated && level === 1;

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
        
        // V2: Process referral rewards using V2 matrix system automatically
        console.log(`🔄 V2: Global matrix rewards for Level ${level} will be processed automatically by the V2 system`);
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


  // Get reward notifications (real upgrade rewards)
  app.get("/api/notifications/rewards", requireWallet, async (req: any, res) => {
    try {
      const notifications = await storage.getPendingRewardNotifications(req.walletAddress);
      res.json({
        notifications: notifications.map(notif => ({
          id: notif.id,
          layerNumber: notif.layerNumber,
          triggerLevel: notif.triggerLevel,
          rewardAmount: notif.rewardAmount,
          triggerWallet: notif.triggerWallet,
          status: notif.status,
          expiresAt: notif.expiresAt,
          createdAt: notif.createdAt
        }))
      });
    } catch (error) {
      console.error('Get reward notifications error:', error);
      res.status(500).json({ error: 'Failed to get reward notifications' });
    }
  });

  // Removed duplicate user-stats endpoint to prevent routing conflicts

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

      // V2: Create membership NFT record
      await storage.createMembershipNFTV2({
        walletAddress: req.walletAddress,
        level: level,
        status: 'activated',
        nftTokenId: Math.floor(Math.random() * 1000000), // Temporary, will be actual NFT token ID
        contractAddress: null,
        txHash: txHash,
        purchasedAt: new Date(),
        pricePaidUSDT: levelConfig.priceUSDT,
        levelName: `Level ${level}`
      });

      // Activate user if first membership
      if (!user.memberActivated) {
        await storage.updateUser(req.walletAddress, {
          memberActivated: true,
          currentLevel: level,
          activationAt: new Date(),
        });
        
        // V2: Place member in global matrix when first activated
        const existingPosition = await storage.getGlobalMatrixPositionV2(req.walletAddress);
        if (!existingPosition) {
          const sponsorWallet = user?.referrerWallet || '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
          await storage.createGlobalMatrixPositionV2({
            memberWallet: req.walletAddress,
            directSponsorWallet: sponsorWallet,
            position: await storage.getNextGlobalMatrixPosition(),
            layer: 1,
            joinedAt: new Date()
          });
        }
      }

      // V2: Process layer rewards through matrix system
      console.log(`🔄 V2: Processing layer rewards for Level ${level} purchase by ${req.walletAddress}`);
      // Layer rewards are automatically processed by the V2 matrix system when NFTs are created

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

  // Merchant NFT endpoints
  app.get("/api/merchant/nfts", async (req, res) => {
    try {
      const nfts = await storage.getMerchantNFTs();
      res.json(nfts);
    } catch (error) {
      console.error('Get merchant NFTs error:', error);
      res.status(500).json({ error: 'Failed to get merchant NFTs' });
    }
  });

  app.post("/api/merchant/purchase", requireWallet, async (req: any, res) => {
    try {
      const { nftId, bucketType } = req.body;
      
      // Get NFT details
      const nft = await storage.getMerchantNFT(nftId);
      if (!nft) {
        return res.status(404).json({ error: 'NFT not found' });
      }

      // Get user's BCC balance
      const balance = await storage.getBCCBalance(req.walletAddress);
      const availableBalance = bucketType === 'restricted' ? balance.restricted : balance.transferable;
      
      if (availableBalance < nft.priceBCC) {
        return res.status(400).json({ error: `Insufficient ${bucketType} BCC balance` });
      }

      // Deduct BCC from user's balance
      if (bucketType === 'restricted') {
        await storage.updateBCCBalance(req.walletAddress, {
          restricted: balance.restricted - nft.priceBCC
        });
      } else {
        await storage.updateBCCBalance(req.walletAddress, {
          transferable: balance.transferable - nft.priceBCC
        });
      }

      // Create purchase record
      const purchase = await storage.createNFTPurchase({
        walletAddress: req.walletAddress,
        nftId,
        amountBCC: nft.priceBCC,
        bucketUsed: bucketType,
      });

      res.json(purchase);
    } catch (error) {
      console.error('Merchant NFT purchase error:', error);
      res.status(500).json({ error: 'Failed to purchase merchant NFT' });
    }
  });

  app.get("/api/merchant/my-nfts", requireWallet, async (req: any, res) => {
    try {
      const purchases = await storage.getNFTPurchasesByWallet(req.walletAddress);
      res.json(purchases);
    } catch (error) {
      console.error('Get user merchant NFTs error:', error);
      res.status(500).json({ error: 'Failed to get your merchant NFTs' });
    }
  });

  // Advertisement NFT endpoints - Explicit route handling
  app.get("/api/ads/nfts", (req, res, next) => {
    console.log('🔍 NFT endpoint hit directly!');
    
    // Disable caching for real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    storage.getAdvertisementNFTs()
      .then(nfts => {
        console.log('✅ Found NFTs:', nfts?.length || 0);
        res.setHeader('Content-Type', 'application/json');
        res.json(nfts || []);
      })
      .catch(error => {
        console.error('Get advertisement NFTs error:', error);
        res.status(500).json({ error: 'Failed to get advertisement NFTs' });
      });
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
      // Disable caching for real-time updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
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

  // Admin NFT Management Routes (for populating data)
  app.post("/api/admin/create-merchant-nft", requireWallet, async (req: any, res) => {
    try {
      // Check if user is admin (you can add proper admin check later)
      const user = await storage.getUser(req.walletAddress);
      if (!user || user.currentLevel < 1) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { title, description, imageUrl, priceBCC } = req.body;
      
      const nft = await storage.createMerchantNFT({
        title,
        description,
        imageUrl,
        priceBCC,
        active: true
      });

      res.json({ success: true, nft });
    } catch (error) {
      console.error('Create merchant NFT error:', error);
      res.status(500).json({ error: 'Failed to create merchant NFT' });
    }
  });

  app.post("/api/admin/create-advertisement-nft", requireWallet, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.walletAddress);
      if (!user || user.currentLevel < 1) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { title, description, imageUrl, serviceName, serviceType, priceBCC, codeTemplate } = req.body;
      
      const [nft] = await db
        .insert(advertisementNFTs)
        .values({
          title,
          description,
          imageUrl,
          serviceName,
          serviceType,
          priceBCC,
          codeTemplate: codeTemplate || `SERVICE-${Date.now()}`,
          totalSupply: 1000,
          claimedCount: 0,
          active: true
        })
        .returning();

      res.json({ success: true, nft });
    } catch (error) {
      console.error('Create advertisement NFT error:', error);
      res.status(500).json({ error: 'Failed to create advertisement NFT' });
    }
  });

  // Admin Panel Authentication Routes
  const { authenticateAdmin, verifyAdminSession, logoutAdmin } = await import('./admin-auth');
  
  // Admin middleware definitions (now that admin functions are imported)
  requireAdminAuth = async (req: any, res: any, next: any) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: 'Admin authentication required' });
      }
      
      const session = await verifyAdminSession(sessionToken);
      
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session token' });
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

  // Admin endpoint to get all referral nodes
  app.get("/api/admin/referrals", requireAdminAuth, async (req, res) => {
    try {
      const { search } = req.query;
      
      // Get all referral nodes
      const allNodes = await db.select({
        walletAddress: referralNodes.walletAddress,
        sponsorWallet: referralNodes.sponsorWallet,
        placerWallet: referralNodes.placerWallet,
        matrixPosition: referralNodes.matrixPosition,
        leftLeg: referralNodes.leftLeg,
        middleLeg: referralNodes.middleLeg,
        rightLeg: referralNodes.rightLeg,
        directReferralCount: referralNodes.directReferralCount,
        totalTeamCount: referralNodes.totalTeamCount,
        createdAt: referralNodes.createdAt,
      }).from(referralNodes);

      // Get user details for each node
      const referralsWithDetails = await Promise.all(
        allNodes.map(async (node) => {
          const user = await storage.getUser(node.walletAddress);
          const earnings = await storage.getEarningsWalletByWallet(node.walletAddress);
          
          return {
            ...node,
            username: user?.username,
            memberActivated: user?.memberActivated,
            currentLevel: user?.currentLevel,
            totalEarnings: earnings.reduce((sum, e) => sum + parseFloat(e.totalEarnings), 0),
          };
        })
      );

      // Filter by search term if provided
      let filteredReferrals = referralsWithDetails;
      if (search) {
        const searchTerm = search.toString().toLowerCase();
        filteredReferrals = referralsWithDetails.filter(referral =>
          (referral.username?.toLowerCase().includes(searchTerm)) ||
          referral.walletAddress.toLowerCase().includes(searchTerm)
        );
      }

      res.json({ referrals: filteredReferrals });
    } catch (error) {
      console.error('Get admin referrals error:', error);
      res.status(500).json({ error: 'Failed to get referral data' });
    }
  });

  // Admin global matrix endpoint - NEW GLOBAL MATRIX SYSTEM
  app.get("/api/admin/global-matrix", requireAdminAuth, async (req, res) => {
    try {
      const { search, level } = req.query;
      const targetLevel = level ? parseInt(level as string) : 1;
      
      let baseQuery = db.select({
        walletAddress: globalMatrixPosition.walletAddress,
        matrixLevel: globalMatrixPosition.matrixLevel,
        positionIndex: globalMatrixPosition.positionIndex,
        directSponsorWallet: globalMatrixPosition.directSponsorWallet,
        placementSponsorWallet: globalMatrixPosition.placementSponsorWallet,
        joinedAt: globalMatrixPosition.joinedAt,
        lastUpgradeAt: globalMatrixPosition.lastUpgradeAt,
        username: users.username,
        memberActivated: users.memberActivated,
        currentLevel: users.currentLevel
      })
      .from(globalMatrixPosition)
      .leftJoin(users, eq(globalMatrixPosition.walletAddress, users.walletAddress));
      
      // Apply search filter if provided
      let finalQuery;
      if (search && typeof search === 'string' && search.trim().length > 0) {
        const searchTerm = search.trim().toLowerCase();
        finalQuery = baseQuery.where(
          and(
            eq(globalMatrixPosition.matrixLevel, targetLevel),
            or(
              sql`LOWER(${users.username}) LIKE ${`%${searchTerm}%`}`,
              sql`LOWER(${globalMatrixPosition.walletAddress}) LIKE ${`%${searchTerm}%`}`
            )
          )
        );
      } else {
        finalQuery = baseQuery.where(eq(globalMatrixPosition.matrixLevel, targetLevel));
      }
      
      const positions = await finalQuery
        .orderBy(globalMatrixPosition.positionIndex)
        .limit(100);
      
      // Get matrix level statistics and positions for each level
      const matrixLevels = [];
      
      // Calculate overall upgrade statistics
      const [upgradeStats] = await db.select({
        totalUpgraded: sql<number>`COUNT(CASE WHEN ${users.currentLevel} > 1 THEN 1 END)`,
        totalActivated: sql<number>`COUNT(CASE WHEN ${users.memberActivated} = true THEN 1 END)`,
        totalUsers: sql<number>`COUNT(*)`
      })
      .from(globalMatrixPosition)
      .leftJoin(users, eq(globalMatrixPosition.walletAddress, users.walletAddress));
      
      // Process levels sequentially to avoid race conditions
      const levels = [1, 2, 3, 4, 5];
      for (const level of levels) {
        try {
          // Get count for this level with upgrade statistics
          const [countResult] = await db.select({ 
            count: sql<number>`count(*)`,
            upgradedCount: sql<number>`COUNT(CASE WHEN ${users.currentLevel} > 1 THEN 1 END)`,
            activatedCount: sql<number>`COUNT(CASE WHEN ${users.memberActivated} = true THEN 1 END)`
          })
            .from(globalMatrixPosition)
            .leftJoin(users, eq(globalMatrixPosition.walletAddress, users.walletAddress))
            .where(eq(globalMatrixPosition.matrixLevel, level));
          
          const filledCount = countResult?.count || 0;
          const upgradedCount = countResult?.upgradedCount || 0;
          const activatedCount = countResult?.activatedCount || 0;
          
          // Get positions for this level (but only if there are any)
          let levelPositions: any[] = [];
          if (filledCount > 0) {
            levelPositions = await db.select({
              walletAddress: globalMatrixPosition.walletAddress,
              matrixLevel: globalMatrixPosition.matrixLevel,
              positionIndex: globalMatrixPosition.positionIndex,
              directSponsorWallet: globalMatrixPosition.directSponsorWallet,
              placementSponsorWallet: globalMatrixPosition.placementSponsorWallet,
              joinedAt: globalMatrixPosition.joinedAt,
              lastUpgradeAt: globalMatrixPosition.lastUpgradeAt,
              username: users.username,
              memberActivated: users.memberActivated,
              currentLevel: users.currentLevel
            })
            .from(globalMatrixPosition)
            .leftJoin(users, eq(globalMatrixPosition.walletAddress, users.walletAddress))
            .where(eq(globalMatrixPosition.matrixLevel, level))
            .orderBy(globalMatrixPosition.positionIndex)
            .limit(50);
          }
          
          const maxPositions = Math.pow(3, level);
          matrixLevels.push({
            level,
            maxPositions,
            filledPositions: filledCount,
            upgradedPositions: upgradedCount,
            activatedPositions: activatedCount,
            positions: levelPositions
          });
          
          console.log(`Level ${level}: ${filledCount} filled, ${levelPositions.length} positions returned`);
        } catch (levelError) {
          console.error(`Error processing level ${level}:`, levelError);
          // Add empty level data to maintain structure
          const maxPositions = Math.pow(3, level);
          matrixLevels.push({
            level,
            maxPositions,
            filledPositions: 0,
            positions: []
          });
        }
      }
      
      res.json({
        positions,
        matrixLevels,
        currentLevel: targetLevel,
        total: positions.length,
        upgradeStats: {
          totalUpgraded: upgradeStats?.totalUpgraded || 0,
          totalActivated: upgradeStats?.totalActivated || 0,
          totalUsers: upgradeStats?.totalUsers || 0
        }
      });
    } catch (error) {
      console.error('Admin global matrix error:', error);
      res.status(500).json({ error: 'Failed to get global matrix data' });
    }
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
      
      const finalQuery = conditions.length > 0 
        ? query.where(and(...conditions))
        : query;
      
      const users = await finalQuery.orderBy(desc(adminUsers.createdAt));
      
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
      console.log('Platform users request received');
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
      
      // Build the full query based on conditions
      const finalQuery = conditions.length > 0 
        ? query.where(and(...conditions))
        : query;
      
      const platformUsers = await finalQuery.orderBy(desc(users.createdAt));
      
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
    } catch (error: any) {
      console.error('Get platform users error:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to fetch platform users', details: error.message });
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
  
  // Routes registered successfully (verbose logging disabled)
  
  // User notifications endpoints
  app.get("/api/notifications", requireWallet, async (req: any, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.walletAddress);
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  });
  
  app.post("/api/notifications/:id/read", requireWallet, async (req: any, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id, req.walletAddress);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.json(notification);
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });
  
  app.post("/api/notifications/read-all", requireWallet, async (req: any, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.walletAddress);
      res.json({ success: true });
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // ====================================
  // V2 MATRIX SYSTEM API ROUTES 
  // 1×3 Matrix with Layer-Based Rewards
  // ====================================

  // V2 Matrix Routes
  app.get("/api/v2/matrix/stats/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const matrixPositionResult = await db.execute(sql`
        SELECT 
          global_position,
          layer as matrix_layer,
          position_in_layer,
          CASE 
            WHEN position_in_layer = 0 THEN 'Left'
            WHEN position_in_layer = 1 THEN 'Middle'
            WHEN position_in_layer = 2 THEN 'Right'
            ELSE 'Position ' || position_in_layer
          END as matrix_position_name,
          activated_at
        FROM global_matrix_positions_v2 
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `);
      
      const layerStatsResult = await db.execute(sql`
        SELECT 
          COUNT(*) as total_layer_positions,
          COUNT(DISTINCT root_wallet) as direct_referrals,
          SUM(CASE WHEN layer <= 3 THEN 1 ELSE 0 END) as team_size
        FROM matrix_tree_v2 
        WHERE member_wallet = ${walletAddress.toLowerCase()}
      `);
      
      const matrixPosition = matrixPositionResult.rows[0] || {};
      const layerStats = layerStatsResult.rows[0] || {};
      
      res.json({
        ...matrixPosition,
        ...layerStats
      });
    } catch (error) {
      console.error('V2 Matrix stats error:', error);
      res.status(500).json({ error: 'Failed to fetch matrix stats' });
    }
  });

  app.get("/api/v2/matrix/layers/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const layersResult = await db.execute(sql`
        SELECT * FROM member_layer_view
        WHERE member_wallet = ${walletAddress.toLowerCase()}
        ORDER BY layer, position
      `);
      
      res.json(layersResult.rows);
    } catch (error) {
      console.error('V2 Matrix layers error:', error);
      res.status(500).json({ error: 'Failed to fetch matrix layers' });
    }
  });

  app.get("/api/v2/matrix/member-layers/:rootWallet", async (req, res) => {
    try {
      const { rootWallet } = req.params;
      
      const memberLayersResult = await db.execute(sql`
        SELECT * FROM member_layer_view
        WHERE root_wallet = ${rootWallet.toLowerCase()}
        ORDER BY layer, position
      `);
      
      res.json(memberLayersResult.rows);
    } catch (error) {
      console.error('V2 Member layers error:', error);
      res.status(500).json({ error: 'Failed to fetch member layers' });
    }
  });

  // V2 Rewards Routes
  app.get("/api/v2/rewards/pending/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const pendingRewardsResult = await db.execute(sql`
        SELECT * FROM pending_rewards_view
        WHERE current_recipient_wallet = ${walletAddress.toLowerCase()}
        ORDER BY expires_at ASC
      `);
      
      res.json(pendingRewardsResult.rows);
    } catch (error) {
      console.error('V2 Pending rewards error:', error);
      res.status(500).json({ error: 'Failed to fetch pending rewards' });
    }
  });

  app.get("/api/v2/rewards/claimable/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const claimableRewardsResult = await db.execute(sql`
        SELECT * FROM claimable_rewards_view
        WHERE root_wallet = ${walletAddress.toLowerCase()}
        ORDER BY created_at ASC
      `);
      
      res.json(claimableRewardsResult.rows);
    } catch (error) {
      console.error('V2 Claimable rewards error:', error);
      res.status(500).json({ error: 'Failed to fetch claimable rewards' });
    }
  });

  app.get("/api/v2/rewards/summary/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const summaryResult = await db.execute(sql`
        SELECT * FROM reward_summary_view
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `);
      
      res.json(summaryResult.rows[0] || {
        wallet_address: walletAddress.toLowerCase(),
        username: null,
        member_activated: false,
        current_level: 0,
        owned_nft_levels: [],
        pending_rewards_count: 0,
        claimable_rewards_count: 0,
        expired_rewards_count: 0,
        pending_rewards_usd: 0,
        claimable_rewards_usd: 0,
        total_earned_usd: 0,
        active_layer_positions: 0,
        global_position: null,
        matrix_layer: null,
        position_in_layer: null,
        matrix_position_name: null
      });
    } catch (error) {
      console.error('V2 Reward summary error:', error);
      res.status(500).json({ error: 'Failed to fetch reward summary' });
    }
  });

  app.post("/api/v2/rewards/claim/:rewardId", requireWallet, async (req: any, res) => {
    try {
      const { rewardId } = req.params;
      const walletAddress = req.walletAddress;
      
      // Check if reward exists and is claimable
      const rewardResult = await db.execute(sql`
        SELECT * FROM claimable_rewards_view
        WHERE reward_id = ${rewardId} 
          AND root_wallet = ${walletAddress}
          AND has_required_nft = true
      `);
      
      const reward = rewardResult.rows[0];
      if (!reward) {
        return res.status(404).json({ error: 'Reward not found or not claimable' });
      }
      
      // Update reward status to claimed
      await db.execute(sql`
        UPDATE layer_rewards_v2 
        SET status = 'confirmed', confirmed_at = NOW()
        WHERE id = ${rewardId}
      `);
      
      // Create distribution record
      await db.execute(sql`
        INSERT INTO reward_distributions_v2 (
          recipient_wallet, reward_type, amount_usdt, source_reward_id,
          trigger_wallet, trigger_level, trigger_layer, distribution_method,
          status, completed_at
        ) VALUES (
          ${walletAddress}, 'layer_reward', ${reward.reward_amount_usdt}, ${rewardId},
          ${reward.trigger_wallet}, ${reward.trigger_level}, ${reward.trigger_layer}, 'direct',
          'completed', NOW()
        )
      `);
      
      res.json({ 
        success: true, 
        message: 'Reward claimed successfully',
        amount: reward.reward_amount_usdt / 100 // Convert cents to dollars
      });
    } catch (error) {
      console.error('V2 Claim reward error:', error);
      res.status(500).json({ error: 'Failed to claim reward' });
    }
  });

  // V2 Membership Routes
  app.get("/api/v2/membership/nfts/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const nftsResult = await db.execute(sql`
        SELECT * FROM membership_nfts_v2
        WHERE wallet_address = ${walletAddress.toLowerCase()}
        ORDER BY level ASC
      `);
      
      res.json(nftsResult.rows);
    } catch (error) {
      console.error('V2 Membership NFTs error:', error);
      res.status(500).json({ error: 'Failed to fetch membership NFTs' });
    }
  });

  app.get("/api/v2/membership/stats/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const statsResult = await db.execute(sql`
        SELECT 
          u.wallet_address,
          u.username,
          u.member_activated,
          COALESCE(MAX(mn.level), 0) as current_highest_level,
          COALESCE(array_agg(mn.level ORDER BY mn.level) FILTER (WHERE mn.level IS NOT NULL), ARRAY[]::INTEGER[]) as owned_levels,
          COUNT(mn.id) as total_nfts_owned,
          COALESCE(SUM(mn.price_paid_usdt), 0) as total_spent_usdt,
          MIN(mn.purchased_at) as member_since,
          MAX(mn.purchased_at) as last_purchase_at
        FROM users u
        LEFT JOIN membership_nfts_v2 mn ON u.wallet_address = mn.wallet_address AND mn.status = 'active'
        WHERE u.wallet_address = ${walletAddress.toLowerCase()}
        GROUP BY u.wallet_address, u.username, u.member_activated
      `);
      
      res.json(statsResult.rows[0] || {
        wallet_address: walletAddress.toLowerCase(),
        username: null,
        member_activated: false,
        current_highest_level: 0,
        owned_levels: [],
        total_nfts_owned: 0,
        total_spent_usdt: 0,
        member_since: null,
        last_purchase_at: null
      });
    } catch (error) {
      console.error('V2 Membership stats error:', error);
      res.status(500).json({ error: 'Failed to fetch membership stats' });
    }
  });

  app.get("/api/v2/membership/pricing", async (req, res) => {
    try {
      const pricingResult = await db.execute(sql`
        SELECT 
          level,
          level_name,
          price_usdt,
          nft_price_usdt as reward_amount_usdt,
          platform_fee_usdt,
          CONCAT('Level ', level, ' - ', level_name) as description,
          true as is_available,
          CASE WHEN level > 1 THEN true ELSE false END as requires_previous_level
        FROM level_config
        ORDER BY level ASC
      `);
      
      res.json(pricingResult.rows);
    } catch (error) {
      console.error('V2 Membership pricing error:', error);
      res.status(500).json({ error: 'Failed to fetch membership pricing' });
    }
  });

  app.post("/api/v2/membership/purchase", requireWallet, async (req: any, res) => {
    try {
      const { level, txHash, chainId } = req.body;
      const walletAddress = req.walletAddress;
      
      // Get level configuration
      const levelConfigResult = await db.execute(sql`
        SELECT * FROM level_config WHERE level = ${level}
      `);
      
      const levelConfig = levelConfigResult.rows[0];
      if (!levelConfig) {
        return res.status(400).json({ error: 'Invalid level' });
      }
      
      // Check if user already owns this level
      const existingResult = await db.execute(sql`
        SELECT id FROM membership_nfts_v2 
        WHERE wallet_address = ${walletAddress} AND level = ${level}
      `);
      
      const existing = existingResult.rows[0];
      if (existing) {
        return res.status(400).json({ error: 'Level already owned' });
      }
      
      // Create NFT record
      const nftId = crypto.randomUUID();
      await db.execute(sql`
        INSERT INTO membership_nfts_v2 (
          id, wallet_address, level, level_name, price_paid_usdt,
          nft_token_id, tx_hash, purchased_at, activated_at, status
        ) VALUES (
          ${nftId}, ${walletAddress}, ${level}, ${levelConfig.level_name}, 
          ${levelConfig.price_usdt}, ${level}, ${txHash}, NOW(), NOW(), 'active'
        )
      `);
      
      // Implement matrix placement logic (Level 1 activation only)
      if (level === 1) {
        await activateUserInMatrix(walletAddress, levelConfig);
      }
      
      // Create platform revenue record for Level 1 only
      if (level === 1) {
        await db.execute(sql`
          INSERT INTO platform_revenue_v2 (
            id, trigger_wallet, trigger_level, revenue_amount_usdt, 
            revenue_type, nft_price_usdt, created_at, status
          ) VALUES (
            ${crypto.randomUUID()}, ${walletAddress}, 1, 3000, 
            'level_1_fixed_fee', ${levelConfig.price_usdt}, NOW(), 'pending'
          )
        `);
      }
      
      res.json({ 
        success: true, 
        message: 'Level purchased successfully',
        nftId,
        level,
        levelName: levelConfig.level_name
      });
    } catch (error) {
      console.error('V2 Purchase error:', error);
      res.status(500).json({ error: 'Failed to purchase level' });
    }
  });

  return httpServer;
}

// ====================================
// V2 MATRIX PLACEMENT & REWARD LOGIC
// Global 1×3 Spillover System
// ====================================

async function activateUserInMatrix(walletAddress: string, levelConfig: any) {
  try {
    // 1. Find next available global position (Left → Middle → Right → Next Layer)
    const nextPosition = await findNextGlobalPosition();
    
    // 2. Determine root wallet and parent for this position
    const { rootWallet, parentWallet, directSponsor, placementSponsor } = await calculatePlacement(nextPosition, walletAddress);
    
    // 3. Place user in global matrix
    await db.execute(sql`
      INSERT INTO global_matrix_positions_v2 (
        id, wallet_address, global_position, layer, position_in_layer,
        parent_wallet, root_wallet, direct_sponsor_wallet, placement_sponsor_wallet,
        activated_at, last_active_at
      ) VALUES (
        ${crypto.randomUUID()}, ${walletAddress}, ${nextPosition.global}, 
        ${nextPosition.layer}, ${nextPosition.position},
        ${parentWallet}, ${rootWallet}, ${directSponsor}, ${placementSponsor},
        NOW(), NOW()
      )
    `);
    
    // 4. Add to root's matrix tree
    await db.execute(sql`
      INSERT INTO matrix_tree_v2 (
        id, root_wallet, layer, member_wallet, position, parent_wallet, 
        joined_tree_at, last_updated
      ) VALUES (
        ${crypto.randomUUID()}, ${rootWallet}, ${nextPosition.layer}, 
        ${walletAddress}, ${nextPosition.position}, ${parentWallet},
        NOW(), NOW()
      )
    `);
    
    // 5. GOLDEN RULE: Level N upgrade pays N-th ancestor
    // For Level 1: Pay the direct parent (1st ancestor)
    if (parentWallet && parentWallet !== walletAddress) {
      console.log(`💰 Level 1 activation: ${walletAddress} → ${parentWallet} gets $100`);
      await createLayerReward(parentWallet, walletAddress, 1, 1, nextPosition.position);
    }
    
    console.log(`✅ User ${walletAddress} activated in global position ${nextPosition.global} (Layer ${nextPosition.layer}, Position ${nextPosition.position})`);
  } catch (error) {
    console.error('Matrix activation error:', error);
    throw error;
  }
}

async function findNextGlobalPosition() {
  // Find the next available position following strict Left → Middle → Right → Next Layer
  const maxPositionResult = await db.execute(sql`
    SELECT COALESCE(MAX(global_position), -1) as max_global_position
    FROM global_matrix_positions_v2
  `);
  
  const maxPosition = maxPositionResult.rows[0];
  const nextGlobalPosition = (maxPosition?.max_global_position || -1) + 1;
  
  // Calculate layer and position from global position
  // Layer 1: positions 0,1,2 (3 positions)
  // Layer 2: positions 3,4,5,6,7,8,9,10,11 (9 positions)  
  // Layer N: 3^N positions
  
  let layer = 1;
  let layerStartPosition = 0;
  let layerSize = 3;
  
  while (nextGlobalPosition >= layerStartPosition + layerSize) {
    layerStartPosition += layerSize;
    layer++;
    layerSize = Math.pow(3, layer);
  }
  
  const positionInLayer = nextGlobalPosition - layerStartPosition;
  
  return {
    global: nextGlobalPosition,
    layer: layer,
    position: positionInLayer
  };
}

async function calculatePlacement(position: any, newUserWallet: string) {
  // For global spillover placement
  if (position.layer === 1) {
    // Layer 1: First user is root of their own tree
    if (position.global === 0) {
      return {
        rootWallet: newUserWallet,
        parentWallet: null,
        directSponsor: newUserWallet, // Self-sponsored (first user)
        placementSponsor: newUserWallet // Self-placed (first user)
      };
    } else {
      // Subsequent Layer 1 users go under the first user (position 0)
      const rootUserResult = await db.execute(sql`
        SELECT wallet_address FROM global_matrix_positions_v2 
        WHERE global_position = 0
      `);
      
      const rootUser = rootUserResult.rows[0];
      return {
        rootWallet: rootUser?.wallet_address || newUserWallet,
        parentWallet: rootUser?.wallet_address || null,
        directSponsor: rootUser?.wallet_address || newUserWallet, // For demo, root sponsors all
        placementSponsor: rootUser?.wallet_address || newUserWallet
      };
    }
  } else {
    // Layer 2+: Find parent based on 1×3 tree structure
    const parentGlobalPosition = Math.floor((position.global - Math.pow(3, position.layer-1)) / 3);
    
    const parentUserResult = await db.execute(sql`
      SELECT wallet_address, root_wallet FROM global_matrix_positions_v2 
      WHERE global_position = ${parentGlobalPosition}
    `);
    
    const parentUser = parentUserResult.rows[0];
    return {
      rootWallet: parentUser?.root_wallet || newUserWallet,
      parentWallet: parentUser?.wallet_address || null,
      directSponsor: parentUser?.root_wallet || newUserWallet, // Root sponsors spillover
      placementSponsor: parentUser?.wallet_address || newUserWallet
    };
  }
}

async function createLayerReward(rootWallet: string, triggerWallet: string, triggerLevel: number, triggerLayer: number, triggerPosition: number) {
  // Skip self-rewards (root can't reward themselves)
  if (rootWallet === triggerWallet) {
    return;
  }
  
  // CORRECTED: Get reward amount based on trigger level (what level the trigger user bought)
  // Level 1 = $100, Level 2 = $150, Level 3 = $200, etc.
  const rewardAmount = triggerLevel === 1 ? 10000 : (10000 + (triggerLevel - 1) * 5000);
  const requiredLevel = triggerLevel; // Root needs to have >= trigger level to qualify
  
  // Check if root has required level
  const rootLevelResult = await db.execute(sql`
    SELECT MAX(level) as max_level FROM membership_nfts_v2 
    WHERE wallet_address = ${rootWallet} AND status = 'active'
  `);
  
  const rootLevel = rootLevelResult.rows[0];
  const isQualified = (rootLevel?.max_level || 0) >= requiredLevel;
  
  // Special rule: Layer 1 Right position requires Level 2
  let specialRule = null;
  let finalQualified = isQualified;
  
  if (triggerLayer === 1 && triggerPosition === 2) { // Layer 1 Right
    specialRule = 'layer_1_right_needs_level_2';
    finalQualified = (rootLevel?.max_level || 0) >= 2; // Requires Level 2, not Level 1
  }
  
  // Add 72-hour timeout for pending rewards (admin configurable)
  const timeoutHours = 72; // Could be pulled from admin_config_v2 table
  
  // Create layer reward with timeout
  await db.execute(sql`
    INSERT INTO layer_rewards_v2 (
      id, root_wallet, trigger_wallet, trigger_level, trigger_layer, trigger_position,
      reward_amount_usdt, required_level, qualified, status, special_rule, created_at,
      expires_at
    ) VALUES (
      ${crypto.randomUUID()}, ${rootWallet}, ${triggerWallet}, ${triggerLevel}, 
      ${triggerLayer}, ${triggerPosition}, ${rewardAmount}, ${requiredLevel}, 
      ${finalQualified}, 'pending', ${specialRule}, NOW(),
      NOW() + INTERVAL '${timeoutHours} hours'
    )
  `);
  
  console.log(`💰 Layer reward created: ${triggerWallet} (L${triggerLevel}) → ${rootWallet} (Layer ${triggerLayer}, Pos ${triggerPosition}) = $${rewardAmount/100} ${finalQualified ? '✅' : '⏳'} (expires in ${timeoutHours}h)`);
}

// REMOVED: createUplineReward function - this was incorrect double-rewarding
// The GOLDEN RULE is: Level N upgrade pays N-th ancestor only

// Helper functions
function calculateBCCReward(level: number): { transferable: number; restricted: number; total: number } {
  // Correct BCC reward structure:
  // - New members Level 1: 100 transferable + 500 restricted = 600 BCC total
  // - Level upgrades: 50 + (level × 50) BCC (all transferable)
  
  if (level === 1) {
    // New member Level 1: Gets 500 locked + 100 transferable = 600 BCC total
    return {
      transferable: 100,
      restricted: 500,
      total: 600
    };
  } else {
    // Level upgrade (Level 2+): Gets upgrade bonus BCC
    const upgradeBCC = 50 + (level * 50);
    return {
      transferable: upgradeBCC,
      restricted: 0,
      total: upgradeBCC
    };
  }
}

function calculateRewardAmount(level: number): number {
  // Reward amount = 100% of NFT price
  // Level 1: $100, Level N: $50 + (N × $50)
  if (level === 1) {
    return 100; // Level 1 = $100 USDT
  } else {
    return 50 + (level * 50); // Level N = $50 + (N × $50) USDT
  }
}
