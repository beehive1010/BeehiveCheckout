import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema,
  insertMembershipStateSchema,
  insertReferralNodeSchema,
  insertBCCBalanceSchema,
  insertOrderSchema,
  insertRewardEventSchema,
  insertNFTPurchaseSchema,
  insertCourseAccessSchema,
  insertBridgePaymentSchema
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";

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
      
      
      // Check if user already exists
      const existingUser = await storage.getUser(body.walletAddress);
      if (existingUser) {
        return res.status(400).json({ error: 'User already registered' });
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

      // Create referral node if referrer exists
      if (body.referrerWallet) {
        await storage.createReferralNode({
          walletAddress: user.walletAddress,
          parentWallet: body.referrerWallet,
          children: [],
        });

        // Add to parent's children
        const parentNode = await storage.getReferralNode(body.referrerWallet);
        if (parentNode) {
          await storage.updateReferralNode(body.referrerWallet, {
            children: [...parentNode.children, user.walletAddress],
          });
        }
      } else {
        await storage.createReferralNode({
          walletAddress: user.walletAddress,
          parentWallet: null,
          children: [],
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
      const user = await storage.getUser(req.walletAddress);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const membershipState = await storage.getMembershipState(req.walletAddress);
      const bccBalance = await storage.getBCCBalance(req.walletAddress);
      const referralNode = await storage.getReferralNode(req.walletAddress);

      res.json({
        user,
        membershipState,
        bccBalance,
        referralNode,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user data' });
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

      // Process referral rewards
      const referralNode = await storage.getReferralNode(req.walletAddress);
      if (referralNode?.parentWallet && level === 1) {
        // L1 direct bonus (immediate)
        await storage.createRewardEvent({
          buyerWallet: req.walletAddress,
          sponsorWallet: referralNode.parentWallet,
          eventType: 'L1_direct',
          level: 1,
          amount: 100,
          status: 'completed',
          timerStartAt: null,
          timerExpireAt: null,
        });
      } else if (referralNode?.parentWallet && level > 1) {
        // L2+ upgrade reward (with timer)
        const timerStart = new Date();
        const timerExpire = new Date(timerStart.getTime() + 48 * 60 * 60 * 1000); // 48 hours
        
        await storage.createRewardEvent({
          buyerWallet: req.walletAddress,
          sponsorWallet: referralNode.parentWallet,
          eventType: 'L2plus_upgrade',
          level: level,
          amount: level * 50, // Escalating rewards
          status: 'pending',
          timerStartAt: timerStart,
          timerExpireAt: timerExpire,
        });
      }

      res.json({ success: true, membershipState });
    } catch (error) {
      console.error('Activation error:', error);
      res.status(500).json({ error: 'Activation failed' });
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

      // Get children details
      const childrenDetails = await Promise.all(
        referralNode.children.map(async (childWallet) => {
          const childUser = await storage.getUser(childWallet);
          const childNode = await storage.getReferralNode(childWallet);
          return {
            walletAddress: childWallet,
            username: childUser?.username,
            memberActivated: childUser?.memberActivated,
            currentLevel: childUser?.currentLevel,
            children: childNode?.children || [],
          };
        })
      );

      // Get reward events
      const rewardEvents = await storage.getRewardEventsByWallet(req.walletAddress);

      res.json({
        referralNode,
        childrenDetails,
        rewardEvents,
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

  // Job endpoints for background processing
  app.post("/api/jobs/process-timers", async (req, res) => {
    try {
      // Get all pending reward events with expired timers
      // This won't work with DatabaseStorage - we need to implement a proper query
      // For now, return empty result since we're using database storage
      const expiredEvents: any[] = [];

      let processedCount = 0;
      
      for (const event of expiredEvents) {
        try {
          // Check if sponsor has required level
          const sponsor = await storage.getUser(event.sponsorWallet);
          const sponsorMembership = await storage.getMembershipState(event.sponsorWallet);
          
          if (sponsor && sponsorMembership && sponsorMembership.activeLevel >= event.level) {
            // Sponsor qualified - award reward
            await storage.updateRewardEvent(event.id, { status: 'completed' });
          } else {
            // Roll up to next qualified upline
            const sponsorNode = await storage.getReferralNode(event.sponsorWallet);
            if (sponsorNode?.parentWallet) {
              const uplineUser = await storage.getUser(sponsorNode.parentWallet);
              const uplineMembership = await storage.getMembershipState(sponsorNode.parentWallet);
              
              if (uplineUser && uplineMembership && uplineMembership.activeLevel >= event.level) {
                // Award to upline
                await storage.createRewardEvent({
                  buyerWallet: event.buyerWallet,
                  sponsorWallet: sponsorNode.parentWallet,
                  eventType: 'rollup',
                  level: event.level,
                  amount: event.amount,
                  status: 'completed',
                  timerStartAt: null,
                  timerExpireAt: null,
                });
              }
            }
            
            await storage.updateRewardEvent(event.id, { status: 'expired' });
          }
          
          processedCount++;
        } catch (err) {
          console.error('Error processing reward event:', err);
        }
      }

      res.json({ processedCount });
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
        
        await storage.createRewardEvent({
          buyerWallet: req.walletAddress,
          sponsorWallet: user.referrerWallet,
          eventType,
          level,
          amount: rewardAmount,
          status: level === 1 ? 'completed' : 'pending',
          timerStartAt: level > 1 ? new Date() : undefined,
          timerExpireAt: level > 1 ? new Date(Date.now() + 48 * 60 * 60 * 1000) : undefined,
        });
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
