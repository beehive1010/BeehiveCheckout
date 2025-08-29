import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { 
  insertUserSchema,
  insertMembershipStateSchema,
  insertReferralNodeSchema,
  insertUSDTBalanceSchema,
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
  usdtBalances,
  bccBalances,
  earningsWallet,
  rewardDistributions,
  userRewards,
  advertisementNFTs,
  type AdminUser,
  type AdminSession
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { eq, and, or, desc, gte } from "drizzle-orm";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { ethereum, polygon, arbitrum, optimism } from "thirdweb/chains";

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

      // Initialize referral matrix structure properly
      if (body.referrerWallet) {
        console.log(`Initializing referral matrix for ${user.walletAddress} under sponsor ${body.referrerWallet}`);
        await storage.initializeReferralMatrix(user.walletAddress, body.referrerWallet);
        console.log('✅ Referral matrix initialized successfully');
        
        // Calculate 19 layers for both the new user and their sponsor
        console.log('🔄 Calculating 19 layers for sponsor upline...');
        await storage.calculateAndStore19Layers(body.referrerWallet);
        console.log('✅ Sponsor 19 layers updated');
      } else {
        // Create root node for users without referrers
        await storage.createReferralNode({
          walletAddress: user.walletAddress,
          sponsorWallet: null,
          placerWallet: null,
          matrixPosition: 0,
          leftLeg: [],
          middleLeg: [],
          rightLeg: [],
          directReferralCount: 0,
          totalTeamCount: 0
        });
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

      // Process BeeHive referral rewards
      console.log('Processing referral rewards for level', level);
      await storage.processReferralRewards(req.walletAddress, level);

      // CRITICAL: Update matrix layers after member activation
      console.log('🔄 Starting matrix layer recalculation for:', req.walletAddress);
      try {
        await storage.calculateAndStore19Layers(req.walletAddress);
        console.log('✅ Matrix layers updated successfully');
        
        // Also update layers for the user's sponsor to reflect new member in their downline
        const user = await storage.getUser(req.walletAddress);
        if (user?.referrerWallet) {
          console.log('🔄 Updating sponsor layers:', user.referrerWallet);
          await storage.calculateAndStore19Layers(user.referrerWallet);
          console.log('✅ Sponsor layers updated');
        }
      } catch (error) {
        console.error('❌ Matrix layer calculation failed:', error);
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

  // DEBUG: Test matrix layer calculation directly
  app.post("/api/debug/test-layers", requireWallet, async (req: any, res) => {
    try {
      console.log('🧪 DEBUG: Testing layer calculation for:', req.walletAddress);
      
      // Check if function exists
      if (typeof storage.calculateAndStore19Layers !== 'function') {
        console.error('❌ calculateAndStore19Layers function does not exist!');
        return res.status(500).json({ error: 'Function not found' });
      }
      
      console.log('✅ Function exists, calling it...');
      await storage.calculateAndStore19Layers(req.walletAddress);
      console.log('🎉 Layer calculation completed successfully');
      
      // Also get and return current layers
      const layers = await storage.getReferralLayers(req.walletAddress);
      console.log('📊 Current layers after calculation:', layers.map(l => `Layer ${l.layerNumber}: ${l.memberCount} members`));
      
      res.json({ 
        success: true, 
        message: 'Layer calculation completed',
        layers: layers.map(l => ({
          layer: l.layerNumber,
          members: l.memberCount,
          memberWallets: l.members
        }))
      });
    } catch (error) {
      console.error('💥 Layer calculation error:', error);
      res.status(500).json({ error: error.message });
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

      // Credit initial BCC tokens for Level 1 (500 BCC total: 400 transferable + 100 locked)
      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      if (!bccBalance) {
        await storage.createBCCBalance({
          walletAddress: req.walletAddress,
          transferable: 400, // 400 transferable BCC
          restricted: 100,   // 100 locked BCC
        });
      }

      // Process referral rewards (100 USDT direct referral reward)
      await storage.processReferralRewards(req.walletAddress, 1);

      // Place member in global 3x3 matrix
      const existingPosition = await storage.getGlobalMatrixPosition(req.walletAddress);
      if (!existingPosition) {
        const sponsorWallet = user?.referrerWallet || '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
        const placement = await storage.findGlobalMatrixPlacement(sponsorWallet);
        await storage.createGlobalMatrixPosition({
          walletAddress: req.walletAddress,
          matrixLevel: placement.matrixLevel,
          positionIndex: placement.positionIndex,
          matrixPosition: placement.matrixPosition,
          directSponsorWallet: sponsorWallet,
          placementSponsorWallet: placement.placementSponsorWallet,
        });
      }
      
      // Calculate 19-layer tree for the new member and their sponsor  
      console.log('🔄 Calculating 19 layers for new member:', req.walletAddress);
      await storage.calculateAndStore19Layers(req.walletAddress);
      console.log('✅ New member layers calculated');
      
      // Also calculate for sponsor to reflect new member in their downline
      if (referrerWallet) {
        console.log('🔄 Updating sponsor downline layers:', referrerWallet);
        await storage.calculateAndStore19Layers(referrerWallet);
        console.log('✅ Sponsor downline layers updated');
      }
      
      // Generate notifications for all upline members in 19 layers
      // referrerWallet already defined above
      if (referrerWallet) {
        // Get all upline users in the 19 layers
        const uplineLayers = await storage.getReferralLayers(referrerWallet);
        
        for (const layer of uplineLayers) {
          for (const uplineWallet of layer.members) {
            // Check if upline already qualifies for this reward
            const uplineMembership = await storage.getMembershipState(uplineWallet);
            
            // For Level 1 purchases: upline needs Level 1 for first rewards, Level 2 for 3rd+ rewards
            // Since this is activation, treat as first reward so Level 1 qualifies
            const isQualified = uplineMembership?.levelsOwned.includes(1) || false;
            const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
            
            await storage.createRewardNotification({
              recipientWallet: uplineWallet,
              triggerWallet: req.walletAddress,
              triggerLevel: 1,
              layerNumber: layer.layerNumber,
              rewardAmount: 10000, // 100 USDT in cents
              status: isQualified ? 'waiting_claim' : 'pending',
              expiresAt: isQualified ? undefined : expiresAt
            });
          }
        }
      }

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

  // BeeHive API routes - NEW GLOBAL MATRIX
  app.get("/api/beehive/matrix", requireWallet, async (req: any, res) => {
    try {
      const matrixPosition = await storage.getGlobalMatrixPosition(req.walletAddress);
      if (!matrixPosition) {
        return res.status(404).json({ error: 'Matrix position not found' });
      }

      // Get direct referrals (people this user sponsored)
      const directReferrals = await db.select({
        walletAddress: globalMatrixPosition.walletAddress,
        matrixLevel: globalMatrixPosition.matrixLevel,
        positionIndex: globalMatrixPosition.positionIndex,
        joinedAt: globalMatrixPosition.joinedAt
      })
      .from(globalMatrixPosition)
      .where(eq(globalMatrixPosition.directSponsorWallet, req.walletAddress.toLowerCase()));
      
      const referralDetails = await Promise.all(
        directReferrals.map(async (referral) => {
          const childUser = await storage.getUser(referral.walletAddress);
          const childMembership = await storage.getMembershipState(referral.walletAddress);
          return {
            walletAddress: referral.walletAddress,
            username: childUser?.username,
            memberActivated: childUser?.memberActivated,
            currentLevel: childUser?.currentLevel,
            matrixLevel: referral.matrixLevel,
            positionIndex: referral.positionIndex,
            activeLevel: childMembership?.activeLevel || 0,
            joinedAt: referral.joinedAt,
          };
        })
      );

      // Get user rewards instead of old earnings
      const rewards = await db.select()
        .from(userRewards)
        .where(eq(userRewards.recipientWallet, req.walletAddress.toLowerCase()))
        .orderBy(desc(userRewards.createdAt))
        .limit(20);

      res.json({
        matrixPosition,
        directReferrals: referralDetails,
        rewards,
        totalDirectReferrals: referralDetails.length,
      });
    } catch (error) {
      console.error('Get matrix error:', error);
      res.status(500).json({ error: 'Failed to get matrix data' });
    }
  });

  // User stats endpoint for referral dashboard - NEW GLOBAL MATRIX
  app.get("/api/beehive/user-stats/:walletAddress?", requireWallet, async (req: any, res) => {
    try {
      // Disable caching for real-time updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const walletAddress = req.params.walletAddress || req.walletAddress;
      
      const matrixPosition = await storage.getGlobalMatrixPosition(walletAddress);
      const user = await storage.getUser(walletAddress);
      const membership = await storage.getMembershipState(walletAddress);
      
      // Get direct referral count from referral nodes (actual downline members)
      const directReferralResult = await db.select()
        .from(referralNodes)
        .where(eq(referralNodes.sponsorWallet, walletAddress.toLowerCase()));
      const directReferralCount = directReferralResult.length;
      
      console.log('📊 Direct referrals for', walletAddress, ':', directReferralCount);
      
      // Get total team count from referral layers (all downline members across all layers)
      const allTeamMembers = new Set<string>();
      const userLayers = await storage.getReferralLayers(walletAddress);
      userLayers.forEach(layer => {
        layer.members.forEach(member => allTeamMembers.add(member.toLowerCase()));
      });
      const totalTeamCount = allTeamMembers.size;
      
      console.log('📊 Total team count for', walletAddress, ':', totalTeamCount);
      
      // Calculate earnings from userRewards table
      const rewards = await db.select()
        .from(userRewards)
        .where(eq(userRewards.recipientWallet, walletAddress.toLowerCase()));
      
      // Calculate total and pending earnings using proper database queries
      const totalEarningsResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(reward_amount AS DECIMAL)), 0) as total_claimed
        FROM user_rewards 
        WHERE recipient_wallet = ${walletAddress.toLowerCase()}
        AND status = 'claimed'
      `);
      
      const pendingRewardsResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(reward_amount AS DECIMAL)), 0) as total_pending
        FROM user_rewards 
        WHERE recipient_wallet = ${walletAddress.toLowerCase()}
        AND status IN ('pending', 'confirmed')
      `);
      
      const totalEarnings = Number(totalEarningsResult.rows[0]?.total_claimed || 0); // Already in dollars
      const pendingRewards = Number(pendingRewardsResult.rows[0]?.total_pending || 0); // Already in dollars
      
      // Calculate monthly earnings using proper database query
      const monthlyEarningsResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(reward_amount AS DECIMAL)), 0) as monthly_total
        FROM user_rewards 
        WHERE recipient_wallet = ${walletAddress.toLowerCase()}
        AND status = 'claimed'
        AND confirmed_at >= DATE_TRUNC('month', CURRENT_DATE)
      `);
      
      const monthlyEarnings = Number(monthlyEarningsResult.rows[0]?.monthly_total || 0); // Already in dollars

      // Get actual downline matrix data from referral layers
      console.log('🔄 Getting referral layers for:', walletAddress);
      const layersData = await storage.getReferralLayers(walletAddress);
      console.log('📊 Found layers data:', layersData.map(l => `Layer ${l.layerNumber}: ${l.memberCount} members`));
      
      const downlineMatrix = [];
      
      // Process each level from 1 to 19
      for (let layerLevel = 1; layerLevel <= 19; layerLevel++) {
        const layerData = layersData.find(layer => layer.layerNumber === layerLevel);
        
        if (layerData && layerData.memberCount > 0) {
          // Get member details for this layer to count upgrades
          const memberDetails = await Promise.all(
            layerData.members.map(async (memberWallet) => {
              const user = await db.select({
                currentLevel: users.currentLevel,
                memberActivated: users.memberActivated
              }).from(users).where(eq(users.walletAddress, memberWallet));
              
              return user[0] || { currentLevel: 0, memberActivated: false };
            })
          );
          
          const upgradedCount = memberDetails.filter(member => member.memberActivated && member.currentLevel >= 1).length;
          
          console.log(`Layer ${layerLevel}: ${layerData.memberCount} members, ${upgradedCount} upgraded`);
          
          downlineMatrix.push({
            level: layerLevel,
            members: layerData.memberCount,
            upgraded: upgradedCount,
            placements: layerData.memberCount
          });
        } else {
          downlineMatrix.push({
            level: layerLevel,
            members: 0,
            upgraded: 0,
            placements: 0
          });
        }
      }
      
      console.log('📈 Final downlineMatrix:', downlineMatrix.filter(l => l.members > 0));

      res.json({
        directReferralCount,
        totalTeamCount,
        totalEarnings: totalEarnings.toFixed(2),
        monthlyEarnings: monthlyEarnings.toFixed(2),
        pendingCommissions: pendingRewards.toFixed(2),
        nextPayout: 'TBA', // Could be calculated from pending rewards
        currentLevel: user?.currentLevel || 0,
        memberActivated: user?.memberActivated || false,
        matrixLevel: matrixPosition?.matrixLevel || 0,
        positionIndex: matrixPosition?.positionIndex || 0,
        levelsOwned: membership?.levelsOwned || [],
        downlineMatrix
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: 'Failed to get user stats' });
    }
  });

  // Get user's 19-layer referral tree
  app.get("/api/referrals/layers/:walletAddress?", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.params.walletAddress || req.walletAddress;
      
      // Get all layers for the user
      const layers = await storage.getReferralLayers(walletAddress);
      
      // Get pending notifications
      const notifications = await storage.getPendingRewardNotifications(walletAddress);
      
      res.json({
        layers: layers.map(layer => ({
          layerNumber: layer.layerNumber,
          memberCount: layer.memberCount,
          members: layer.members,
          lastUpdated: layer.lastUpdated
        })),
        notifications: notifications.map(notif => ({
          id: notif.id,
          triggerWallet: notif.triggerWallet,
          triggerLevel: notif.triggerLevel,
          layerNumber: notif.layerNumber,
          rewardAmount: notif.rewardAmount,
          expiresAt: notif.expiresAt,
          timeRemaining: Math.max(0, new Date(notif.expiresAt).getTime() - Date.now()),
          status: notif.status
        }))
      });
    } catch (error) {
      console.error('Get referral layers error:', error);
      res.status(500).json({ error: 'Failed to get referral layers' });
    }
  });

  // Calculate and update 19-layer tree for a user
  app.post("/api/referrals/calculate-layers", requireWallet, async (req: any, res) => {
    try {
      console.log('🔄 Manual layer calculation triggered for:', req.walletAddress);
      await storage.calculateAndStore19Layers(req.walletAddress);
      console.log('✅ Manual layer calculation completed');
      
      // Also get current layers to return updated data
      const layers = await storage.getReferralLayers(req.walletAddress);
      console.log('📊 Current layers:', layers.map(l => `Layer ${l.layerNumber}: ${l.memberCount} members`));
      
      res.json({ 
        success: true, 
        message: '19-layer tree calculated successfully',
        layers: layers.length
      });
    } catch (error) {
      console.error('Calculate layers error:', error);
      res.status(500).json({ error: 'Failed to calculate layers' });
    }
  });

  // CLAIMABLE REWARDS API ENDPOINTS
  
  // Get user's claimable and pending rewards
  app.get("/api/rewards/claimable", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.walletAddress.toLowerCase();
      
      // Get confirmed (claimable) rewards from user_rewards table
      const claimableRewards = await db.select()
        .from(userRewards)
        .where(and(
          eq(userRewards.recipientWallet, walletAddress),
          eq(userRewards.status, 'confirmed')
        ))
        .orderBy(desc(userRewards.createdAt));
      
      // Get pending rewards (with countdown)
      const pendingRewards = await db.select()
        .from(userRewards)
        .where(and(
          eq(userRewards.recipientWallet, walletAddress),
          eq(userRewards.status, 'pending')
        ))
        .orderBy(desc(userRewards.createdAt));
      
      // Calculate totals
      const totalClaimable = claimableRewards.reduce((sum, reward) => {
        return sum + parseFloat(reward.rewardAmount.toString());
      }, 0);
      
      const totalPending = pendingRewards.reduce((sum, reward) => {
        return sum + parseFloat(reward.rewardAmount.toString());
      }, 0);
      
      res.json({
        claimableRewards: claimableRewards.map(reward => ({
          id: reward.id,
          rewardAmount: Math.round(parseFloat(reward.rewardAmount.toString()) * 100), // Convert to cents
          triggerLevel: reward.triggerLevel,
          payoutLayer: reward.payoutLayer,
          matrixPosition: reward.matrixPosition,
          sourceWallet: reward.sourceWallet,
          status: reward.status,
          expiresAt: reward.expiresAt,
          createdAt: reward.createdAt,
          metadata: reward.metadata
        })),
        pendingRewards: pendingRewards.map(reward => ({
          id: reward.id,
          rewardAmount: Math.round(parseFloat(reward.rewardAmount.toString()) * 100), // Convert to cents
          triggerLevel: reward.triggerLevel,
          payoutLayer: reward.payoutLayer,
          matrixPosition: reward.matrixPosition,
          sourceWallet: reward.sourceWallet,
          status: reward.status,
          requiresLevel: reward.requiresLevel,
          unlockCondition: reward.unlockCondition,
          expiresAt: reward.expiresAt,
          createdAt: reward.createdAt,
          metadata: reward.metadata
        })),
        totalClaimable: Math.round(totalClaimable * 100), // Convert to cents
        totalPending: Math.round(totalPending * 100)
      });
    } catch (error) {
      console.error('Get claimable rewards error:', error);
      res.status(500).json({ error: 'Failed to fetch claimable rewards' });
    }
  });
  
  // Claim a single reward
  app.post("/api/rewards/claim/:rewardId", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.walletAddress.toLowerCase();
      const { rewardId } = req.params;
      
      // Get the reward and verify ownership
      const [reward] = await db.select()
        .from(userRewards)
        .where(and(
          eq(userRewards.id, rewardId),
          eq(userRewards.recipientWallet, walletAddress),
          eq(userRewards.status, 'confirmed')
        ));
      
      if (!reward) {
        return res.status(404).json({ error: 'Reward not found or not claimable' });
      }
      
      // Mark reward as claimed
      await db.update(userRewards)
        .set({
          status: 'claimed',
          confirmedAt: new Date()
        })
        .where(eq(userRewards.id, rewardId));
      
      // Update earnings wallet
      const rewardAmount = parseFloat(reward.rewardAmount.toString());
      await storage.updateEarningsWallet(walletAddress, {
        totalEarnings: sql`${earningsWallet.totalEarnings} + ${rewardAmount}`,
        referralEarnings: sql`${earningsWallet.referralEarnings} + ${rewardAmount}`, // All matrix rewards count as referral earnings
        pendingRewards: sql`${earningsWallet.pendingRewards} - ${rewardAmount}`,
        lastRewardAt: new Date()
      });
      
      // Log the activity
      await storage.createUserActivity({
        walletAddress,
        activityType: 'reward_claimed',
        title: 'Reward Claimed',
        description: `Claimed L${reward.triggerLevel}→L${reward.payoutLayer} matrix reward of $${rewardAmount.toFixed(2)} USDT`,
        amount: rewardAmount.toString(),
        amountType: 'USDT',
        relatedWallet: reward.sourceWallet,
        relatedLevel: reward.triggerLevel
      });
      
      res.json({
        success: true,
        amount: Math.round(rewardAmount * 100), // Convert to cents for frontend
        triggerLevel: reward.triggerLevel,
        payoutLayer: reward.payoutLayer,
        matrixPosition: reward.matrixPosition,
        message: `Successfully claimed $${rewardAmount.toFixed(2)} USDT`
      });
    } catch (error) {
      console.error('Claim reward error:', error);
      res.status(500).json({ error: 'Failed to claim reward' });
    }
  });
  
  // Claim all claimable rewards
  app.post("/api/rewards/claim-all", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.walletAddress.toLowerCase();
      
      // Get all claimable rewards
      const claimableRewards = await db.select()
        .from(userRewards)
        .where(and(
          eq(userRewards.recipientWallet, walletAddress),
          eq(userRewards.status, 'confirmed')
        ));
      
      if (claimableRewards.length === 0) {
        return res.status(404).json({ error: 'No claimable rewards found' });
      }
      
      // Calculate total amount
      const totalAmount = claimableRewards.reduce((sum, reward) => {
        return sum + parseFloat(reward.rewardAmount.toString());
      }, 0);
      
      // Mark all as claimed
      const rewardIds = claimableRewards.map(r => r.id);
      await db.update(userRewards)
        .set({
          status: 'claimed',
          confirmedAt: new Date()
        })
        .where(inArray(userRewards.id, rewardIds));
      
      // Update earnings wallet with bulk amounts
      await storage.updateEarningsWallet(walletAddress, {
        totalEarnings: sql`${earningsWallet.totalEarnings} + ${totalAmount}`,
        referralEarnings: sql`${earningsWallet.referralEarnings} + ${totalAmount}`, // All matrix rewards count as referral earnings
        pendingRewards: sql`${earningsWallet.pendingRewards} - ${totalAmount}`,
        lastRewardAt: new Date()
      });
      
      // Log the activity
      await storage.createUserActivity({
        walletAddress,
        activityType: 'rewards_bulk_claimed',
        title: 'Bulk Rewards Claimed',
        description: `Claimed ${claimableRewards.length} rewards totaling $${totalAmount.toFixed(2)} USDT`,
        amount: totalAmount.toString(),
        amountType: 'USDT',
        metadata: {
          rewardCount: claimableRewards.length,
          matrixPositions: [...new Set(claimableRewards.map(r => r.matrixPosition))]
        }
      });
      
      res.json({
        success: true,
        totalAmount: Math.round(totalAmount * 100), // Convert to cents
        rewardCount: claimableRewards.length,
        message: `Successfully claimed ${claimableRewards.length} rewards totaling $${totalAmount.toFixed(2)} USDT`
      });
    } catch (error) {
      console.error('Claim all rewards error:', error);
      res.status(500).json({ error: 'Failed to claim all rewards' });
    }
  });

  // NEW: Claim rewards with thirdweb server wallet and chain confirmation
  app.post("/api/rewards/claim-with-transfer/:rewardId", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.walletAddress.toLowerCase();
      const { rewardId } = req.params;
      const { targetChain, gasConfirmed } = req.body;
      
      if (!gasConfirmed) {
        return res.status(400).json({ error: 'Gas fee confirmation required' });
      }

      // Get the reward and verify ownership
      const [reward] = await db.select()
        .from(userRewards)
        .where(and(
          eq(userRewards.id, rewardId),
          eq(userRewards.recipientWallet, walletAddress),
          eq(userRewards.status, 'confirmed')
        ));
      
      if (!reward) {
        return res.status(404).json({ error: 'Reward not found or not claimable' });
      }

      // Initialize thirdweb client and server wallet
      const client = createThirdwebClient({
        clientId: process.env.THIRDWEB_CLIENT_ID!,
      });
      
      const serverWallet = privateKeyToAccount({
        client,
        privateKey: process.env.THIRDWEB_SERVER_WALLET_PRIVATE_KEY!,
      });

      // Chain configuration
      const chainMap = {
        'ethereum': ethereum,
        'polygon': polygon,
        'arbitrum': arbitrum,
        'optimism': optimism
      };

      const selectedChain = chainMap[targetChain as keyof typeof chainMap];
      if (!selectedChain) {
        return res.status(400).json({ error: 'Unsupported chain' });
      }

      // USDT contract addresses for different chains
      const usdtContracts = {
        'ethereum': '0xA0b86a33E6Dfa6F6e95c4b73E936f5e1e7Ad1e5b', // Replace with actual USDT contract
        'polygon': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        'arbitrum': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        'optimism': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
      };

      const usdtContract = getContract({
        client,
        chain: selectedChain,
        address: usdtContracts[targetChain as keyof typeof usdtContracts],
      });

      // Convert reward amount to USDT wei (6 decimals for USDT)
      const rewardAmount = parseFloat(reward.rewardAmount.toString());
      const amountInWei = BigInt(Math.round(rewardAmount * 1000000)); // 6 decimals for USDT

      // Prepare transfer transaction
      const transferTx = prepareContractCall({
        contract: usdtContract,
        method: "transfer",
        params: [walletAddress, amountInWei]
      });

      // Send transaction from server wallet
      const transactionResult = await sendTransaction({
        transaction: transferTx,
        account: serverWallet,
      });

      // Mark reward as claimed
      await db.update(userRewards)
        .set({
          status: 'claimed',
          confirmedAt: new Date(),
          notes: `Claimed via ${targetChain} transfer - TX: ${transactionResult.transactionHash}`
        })
        .where(eq(userRewards.id, rewardId));

      // Create user activity log
      await storage.createUserActivity({
        walletAddress,
        activityType: 'reward_claimed',
        title: 'Reward Claimed',
        description: `Claimed $${rewardAmount.toFixed(2)} USDT via ${targetChain} transfer`,
        amount: rewardAmount.toString(),
        amountType: 'USDT',
        relatedWallet: reward.sourceWallet,
        relatedLevel: reward.triggerLevel
      });

      res.json({
        success: true,
        amount: Math.round(rewardAmount * 100), // Convert to cents for frontend
        chain: targetChain,
        transactionHash: transactionResult.transactionHash,
        message: `Successfully claimed $${rewardAmount.toFixed(2)} USDT on ${targetChain}`
      });
    } catch (error) {
      console.error('Claim with transfer error:', error);
      res.status(500).json({ error: 'Failed to claim reward with transfer' });
    }
  });

  // Get supported chains for claiming
  app.get("/api/rewards/supported-chains", requireWallet, async (req: any, res) => {
    try {
      const supportedChains = [
        { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: '⟠' },
        { id: 'polygon', name: 'Polygon', symbol: 'MATIC', icon: '🔺' },
        { id: 'arbitrum', name: 'Arbitrum', symbol: 'ETH', icon: '🔵' },
        { id: 'optimism', name: 'Optimism', symbol: 'ETH', icon: '🔴' }
      ];

      res.json({ supportedChains });
    } catch (error) {
      console.error('Get supported chains error:', error);
      res.status(500).json({ error: 'Failed to get supported chains' });
    }
  });

  // Individual user's 3x3 matrix view (L1-L19) - NEW ENDPOINT
  app.get("/api/matrix/individual/:walletAddress?", requireWallet, async (req: any, res) => {
    try {
      const targetWallet = (req.params.walletAddress || req.walletAddress).toLowerCase();
      
      // Get user's referral layers (L1-L19)
      const referralLayers = await storage.getReferralLayers(targetWallet);
      
      if (!referralLayers || referralLayers.length === 0) {
        return res.json({
          layers: [],
          totalMembers: 0,
          totalLevels: 0
        });
      }
      
      // Process each layer and organize into Left/Middle/Right legs
      const processedLayers = await Promise.all(
        referralLayers.map(async (layer) => {
          // Get member details for this layer
          const memberDetails = await Promise.all(
            layer.members.map(async (memberWallet) => {
              const user = await storage.getUser(memberWallet);
              
              // Determine placement based on referral tree position
              // For now, use simple round-robin: L/M/R cycling
              const memberIndex = layer.members.indexOf(memberWallet);
              let placement: 'left' | 'middle' | 'right';
              
              // Layer 1: Direct placements (max 3)
              if (layer.layerNumber === 1) {
                placement = memberIndex === 0 ? 'left' : memberIndex === 1 ? 'middle' : 'right';
              } else {
                // Layer 2+: Fill left leg first, then middle, then right
                const membersPerLeg = Math.pow(3, layer.layerNumber - 1);
                if (memberIndex < membersPerLeg) {
                  placement = 'left';
                } else if (memberIndex < membersPerLeg * 2) {
                  placement = 'middle';
                } else {
                  placement = 'right';
                }
              }
              
              return {
                walletAddress: memberWallet,
                username: user?.username || 'Unknown User',
                currentLevel: user?.currentLevel || 0,
                memberActivated: user?.memberActivated || false,
                placement,
                joinedAt: user?.createdAt?.toISOString() || new Date().toISOString()
              };
            })
          );
          
          // Organize members by leg
          const leftLeg = memberDetails.filter(m => m.placement === 'left');
          const middleLeg = memberDetails.filter(m => m.placement === 'middle');
          const rightLeg = memberDetails.filter(m => m.placement === 'right');
          
          return {
            layerNumber: layer.layerNumber,
            maxMembers: Math.pow(3, layer.layerNumber), // 3^n pattern
            members: memberDetails,
            leftLeg,
            middleLeg,
            rightLeg
          };
        })
      );
      
      // Calculate totals
      const totalMembers = referralLayers.reduce((sum, layer) => sum + layer.memberCount, 0);
      const totalLevels = referralLayers.length;
      
      console.log(`🔥 Individual matrix for ${targetWallet}: ${totalMembers} members across ${totalLevels} levels`);
      
      res.json({
        layers: processedLayers,
        totalMembers,
        totalLevels
      });
    } catch (error) {
      console.error('Individual matrix error:', error);
      res.status(500).json({ error: 'Failed to get individual matrix' });
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

  // Referral tree endpoint - NEW GLOBAL MATRIX
  app.get("/api/beehive/referral-tree", requireWallet, async (req: any, res) => {
    try {
      const matrixPosition = await storage.getGlobalMatrixPosition(req.walletAddress);
      if (!matrixPosition) {
        return res.status(404).json({ error: 'Matrix position not found' });
      }

      // Get all direct referrals (people sponsored by this user)
      const directReferrals = await db.select()
        .from(globalMatrixPosition)
        .where(eq(globalMatrixPosition.directSponsorWallet, req.walletAddress.toLowerCase()))
        .orderBy(globalMatrixPosition.joinedAt);

      const referralDetails = await Promise.all(
        directReferrals.map(async (referral) => {
          const user = await storage.getUser(referral.walletAddress);
          const membership = await storage.getMembershipState(referral.walletAddress);
          
          // Calculate earnings from user rewards
          const userRewardsData = await db.select()
            .from(userRewards)
            .where(eq(userRewards.recipientWallet, referral.walletAddress));
          
          const totalEarnings = userRewardsData
            .filter(r => r.status === 'claimed')
            .reduce((sum, r) => sum + parseFloat(r.rewardAmount), 0);
          
          return {
            walletAddress: referral.walletAddress,
            username: user?.username || 'Unknown',
            level: user?.currentLevel || 0,
            matrixLevel: referral.matrixLevel,
            positionIndex: referral.positionIndex,
            joinDate: referral.joinedAt?.toISOString() || new Date().toISOString(),
            earnings: totalEarnings,
            memberActivated: user?.memberActivated || false,
            levelsOwned: membership?.levelsOwned || [],
            activeLevel: membership?.activeLevel || 0,
          };
        })
      );

      // Get matrix tree visualization data (showing layers)
      const matrixLevels = [];
      for (let level = 1; level <= 19; level++) {
        const levelPositions = await db.select()
          .from(globalMatrixPosition)
          .where(eq(globalMatrixPosition.matrixLevel, level))
          .limit(Math.pow(3, level)); // 3^level positions per level
        
        matrixLevels.push({
          level,
          maxPositions: Math.pow(3, level),
          filledPositions: levelPositions.length,
          positions: levelPositions.slice(0, 10), // Limit for performance
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
        
        // Process referral rewards using new GLOBAL MATRIX system
        await storage.processGlobalMatrixRewards(req.walletAddress, level);
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
        
        // Place member in global 3x3 matrix when first activated
        const existingPosition = await storage.getGlobalMatrixPosition(req.walletAddress);
        if (!existingPosition) {
          const sponsorWallet = user?.referrerWallet || '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
          const placement = await storage.findGlobalMatrixPlacement(sponsorWallet);
          await storage.createGlobalMatrixPosition({
            walletAddress: req.walletAddress,
            matrixLevel: placement.matrixLevel,
            positionIndex: placement.positionIndex,
            matrixPosition: placement.matrixPosition,
            directSponsorWallet: sponsorWallet,
            placementSponsorWallet: placement.placementSponsorWallet,
            joinedAt: new Date(),
          });
        }
      }

      // Process referral rewards (instant + timed)
      await storage.processReferralRewards(req.walletAddress, level);
      
      // Process global matrix rewards for levels > 1
      if (level > 1) {
        await storage.processGlobalMatrixRewards(req.walletAddress, level);
      }

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

  // Thirdweb server wallet configuration
  const thirdwebClient = createThirdwebClient({
    secretKey: process.env.THIRDWEB_SECRET_KEY || 'your-secret-key',
  });
  
  const serverWallet = privateKeyToAccount({
    client: thirdwebClient,
    privateKey: process.env.SERVER_WALLET_PRIVATE_KEY || '0x...', // Your server wallet private key
  });

  // USDT contract addresses for each chain
  const USDT_CONTRACTS = {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    bsc: '0x55d398326f99059fF775485246999027B3197955',
  };

  const CHAIN_MAP = {
    ethereum,
    polygon,
    arbitrum,
    optimism,
    bsc,
  };

  // Get user USDT balance from earnings wallet
  app.get("/api/usdt/balance", requireWallet, async (req: any, res) => {
    try {
      const earningsWallet = await storage.getEarningsWallet(req.walletAddress);
      const pendingRewards = earningsWallet?.pendingRewards || "0";
      const balanceUSD = parseFloat(pendingRewards);
      
      res.json({
        balance: Math.round(balanceUSD * 100), // Convert to cents for consistency
        balanceUSD: balanceUSD.toFixed(2),
        lastUpdated: earningsWallet?.lastRewardAt,
      });
    } catch (error) {
      console.error('Get USDT balance error:', error);
      res.status(500).json({ error: 'Failed to get USDT balance' });
    }
  });

  // Initiate USDT withdrawal
  app.post("/api/usdt/withdraw", requireWallet, async (req: any, res) => {
    try {
      const { amount, chain, recipientAddress } = req.body;
      
      // Validate input
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid withdrawal amount' });
      }
      
      if (!chain || !CHAIN_MAP[chain as keyof typeof CHAIN_MAP]) {
        return res.status(400).json({ error: 'Unsupported chain' });
      }
      
      if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
        return res.status(400).json({ error: 'Invalid recipient address' });
      }

      // Check user balance in earnings wallet
      const earningsWallet = await storage.getEarningsWallet(req.walletAddress);
      if (!earningsWallet) {
        return res.status(400).json({ error: 'Earnings wallet not found' });
      }
      
      const pendingRewards = parseFloat(earningsWallet.pendingRewards || "0");
      const balanceInCents = Math.round(pendingRewards * 100);
      
      if (balanceInCents < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Create withdrawal record
      const withdrawalId = crypto.randomUUID();
      
      res.json({
        withdrawalId,
        amount,
        amountUSD: (amount / 100).toFixed(2),
        chain,
        recipientAddress,
        status: 'pending_signature',
        message: `Withdraw ${(amount / 100).toFixed(2)} USDT to ${chain}`,
      });
      
    } catch (error) {
      console.error('Initiate withdrawal error:', error);
      res.status(500).json({ error: 'Failed to initiate withdrawal' });
    }
  });

  // Confirm USDT withdrawal with signature
  app.post("/api/usdt/withdraw/confirm", requireWallet, async (req: any, res) => {
    try {
      const { withdrawalId, signature, amount, chain, recipientAddress } = req.body;
      
      if (!withdrawalId || !signature || !amount || !chain || !recipientAddress) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify user still has sufficient balance in earnings wallet
      const earningsWallet = await storage.getEarningsWallet(req.walletAddress);
      if (!earningsWallet) {
        return res.status(400).json({ error: 'Earnings wallet not found' });
      }
      
      const pendingRewards = parseFloat(earningsWallet.pendingRewards || "0");
      const balanceInCents = Math.round(pendingRewards * 100);
      
      if (balanceInCents < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Get chain and contract
      const targetChain = CHAIN_MAP[chain as keyof typeof CHAIN_MAP];
      const usdtContractAddress = USDT_CONTRACTS[chain as keyof typeof USDT_CONTRACTS];
      
      if (!targetChain || !usdtContractAddress) {
        return res.status(400).json({ error: 'Unsupported chain' });
      }

      // Create USDT contract instance
      const usdtContract = getContract({
        client: thirdwebClient,
        address: usdtContractAddress,
        chain: targetChain,
      });

      // Execute withdrawal transaction
      const transaction = transfer({
        contract: usdtContract,
        to: recipientAddress,
        amount: amount.toString(), // Amount in wei/smallest unit
      });

      // Send transaction with server wallet
      const result = await transaction({
        account: serverWallet,
      });

      // Update earnings wallet (deduct withdrawn amount and add to withdrawn total)
      const newPendingRewards = (pendingRewards - (amount / 100)).toFixed(2);
      const newWithdrawnAmount = (parseFloat(earningsWallet.withdrawnAmount || "0") + (amount / 100)).toFixed(2);
      
      await storage.updateEarningsWallet(req.walletAddress, {
        pendingRewards: newPendingRewards,
        withdrawnAmount: newWithdrawnAmount,
      });

      // Log withdrawal activity
      await storage.createUserActivity({
        walletAddress: req.walletAddress,
        activityType: 'usdt_withdrawal',
        title: 'USDT Withdrawal',
        description: `Withdrawn ${(amount / 100).toFixed(2)} USDT to ${chain}`,
        amount: (amount / 100).toFixed(2),
        amountType: 'USDT',
        metadata: {
          txHash: result.transactionHash,
          chain,
          recipientAddress,
          withdrawalId,
        },
      });

      res.json({
        success: true,
        txHash: result.transactionHash,
        amount: (amount / 100).toFixed(2),
        chain,
        recipientAddress,
        explorerUrl: getExplorerUrl(chain, result.transactionHash),
      });

    } catch (error) {
      console.error('Confirm withdrawal error:', error);
      res.status(500).json({ 
        error: 'Withdrawal failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Helper function to get blockchain explorer URL
  function getExplorerUrl(chain: string, txHash: string): string {
    const explorers = {
      ethereum: 'https://etherscan.io',
      polygon: 'https://polygonscan.com',
      arbitrum: 'https://arbiscan.io',
      optimism: 'https://optimistic.etherscan.io',
      bsc: 'https://bscscan.com',
    };
    
    const explorer = explorers[chain as keyof typeof explorers];
    return explorer ? `${explorer}/tx/${txHash}` : '';
  }

  // Test NFT Claim Reward Distribution (simplified for testing)
  app.post("/api/test-nft-claim-rewards", async (req, res) => {
    try {
      const { sourceWallet, triggerLevel, nftId, claimTx } = req.body;

      if (!sourceWallet || !triggerLevel || triggerLevel < 1 || triggerLevel > 19) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }

      console.log(`Testing NFT claim rewards for ${sourceWallet} at level ${triggerLevel}`);
      
      await storage.processNFTClaimRewards(sourceWallet, triggerLevel, nftId, claimTx);
      
      res.json({ 
        success: true, 
        message: `Test NFT claim rewards processed for level ${triggerLevel}`,
        data: {
          sourceWallet,
          triggerLevel,
          nftPrice: triggerLevel === 1 ? 100 : 100 + (triggerLevel - 1) * 50,
          rewardAmount: triggerLevel === 1 ? 100 : 100 + (triggerLevel - 1) * 50,
          platformRevenue: triggerLevel === 1 ? 30 : 0
        }
      });
    } catch (error) {
      console.error('Test NFT claim rewards error:', error);
      res.status(500).json({ error: 'Failed to process test NFT claim rewards' });
    }
  });

  // NFT Claim Reward Distribution
  app.post("/api/nft-claim-rewards", requireAuth, async (req, res) => {
    try {
      const { triggerLevel, nftId, claimTx } = req.body;
      const walletAddress = req.walletAddress!;

      if (!triggerLevel || triggerLevel < 1 || triggerLevel > 19) {
        return res.status(400).json({ error: 'Invalid trigger level' });
      }

      console.log(`Processing NFT claim rewards for ${walletAddress} at level ${triggerLevel}`);
      
      await storage.processNFTClaimRewards(walletAddress, triggerLevel, nftId, claimTx);
      
      res.json({ 
        success: true, 
        message: `NFT claim rewards processed for level ${triggerLevel}` 
      });
    } catch (error) {
      console.error('NFT claim rewards error:', error);
      res.status(500).json({ error: 'Failed to process NFT claim rewards' });
    }
  });

  // Get user rewards (for testing/viewing)
  app.get("/api/user-rewards", requireAuth, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const rewards = await storage.getUserRewardsByRecipient(walletAddress);
      res.json({ rewards });
    } catch (error) {
      console.error('Get user rewards error:', error);
      res.status(500).json({ error: 'Failed to get user rewards' });
    }
  });

  // Get platform revenue (admin only)
  app.get("/api/admin/platform-revenue", requireAdminAuth, async (req, res) => {
    try {
      const { startDate, endDate, sourceWallet } = req.query;
      
      let revenue: any[] = [];
      
      if (sourceWallet) {
        revenue = await storage.getPlatformRevenueBySourceWallet(sourceWallet as string);
      } else if (startDate && endDate) {
        revenue = await storage.getPlatformRevenueByDate(
          new Date(startDate as string),
          new Date(endDate as string)
        );
      } else {
        // Default: last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        revenue = await storage.getPlatformRevenueByDate(thirtyDaysAgo, new Date());
      }
      
      res.json({ revenue });
    } catch (error) {
      console.error('Get platform revenue error:', error);
      res.status(500).json({ error: 'Failed to get platform revenue' });
    }
  });

  // Process pending rewards (cron job endpoint)
  app.post("/api/admin/process-pending-rewards", requireAdminAuth, async (req, res) => {
    try {
      const result = await storage.processPendingUserRewards();
      res.json({ 
        success: true, 
        message: `Processed ${result.processed} rewards: ${result.confirmed} confirmed, ${result.expired} expired, ${result.reallocated} reallocated`,
        result 
      });
    } catch (error) {
      console.error('Process pending rewards error:', error);
      res.status(500).json({ error: 'Failed to process pending rewards' });
    }
  });

  return httpServer;
}

// Helper functions
function calculateBCCReward(level: number): { transferable: number; restricted: number; total: number } {
  // Correct BCC reward structure:
  // - New members Level 1: 400 transferable + 100 restricted = 500 BCC total
  // - Level upgrades: 50 + (level × 50) BCC (all transferable)
  
  if (level === 1) {
    // New member Level 1: Gets the base 500 BCC
    return {
      transferable: 400,
      restricted: 100,
      total: 500
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
