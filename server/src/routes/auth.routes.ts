import type { Express } from "express";
import { usersService } from '../services';
import crypto from "crypto";
import jwt from "jsonwebtoken";

export function registerAuthRoutes(app: Express, requireWallet: any) {
  const JWT_SECRET = process.env.JWT_SECRET || 'beehive-secret-key';

  // Check if user exists (for referral validation)
  app.get("/api/auth/check-user-exists/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress || !walletAddress.startsWith('0x')) {
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }
      
      const result = await usersService.checkUserExists(walletAddress.toLowerCase());
      
      if (!result.exists) {
        return res.status(404).json({ error: 'User not found', exists: false });
      }
      
      res.json({ 
        exists: true,
        username: result.user?.username,
        walletAddress: result.user?.walletAddress
      });
    } catch (error) {
      console.error('Failed to check user existence:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

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
        message: `Welcome to Beehive!\n\nClick to sign in and accept the Beehive Terms of Service.\n\nNonce: ${nonce}`,
        nonce,
        address: address.toLowerCase()
      };
      
      res.json(payload);
    } catch (error) {
      console.error('Login payload error:', error);
      res.status(500).json({ error: 'Failed to generate login payload' });
    }
  });

  // Verify signature and create session
  app.post("/api/auth/verify-signature", async (req, res) => {
    try {
      const { address, signature, message } = req.body;
      
      if (!address || !signature || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // In production, you would verify the signature here
      // For now, we'll create a simple JWT token
      const token = jwt.sign({ address: address.toLowerCase() }, JWT_SECRET, { expiresIn: '24h' });
      
      res.json({ token, address: address.toLowerCase() });
    } catch (error) {
      console.error('Signature verification error:', error);
      res.status(500).json({ error: 'Signature verification failed' });
    }
  });

  // Verify JWT token
  app.get("/api/auth/verify-token", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let token = authHeader?.replace('Bearer ', '');
      
      // Also check query params and x-auth-token header as fallbacks
      if (!token) {
        token = req.query.token as string || req.headers['x-auth-token'] as string;
      }
      
      if (!token || token === 'undefined' || token === 'null') {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      // Additional validation for token format
      if (!token.includes('.') || token.split('.').length !== 3) {
        return res.status(401).json({ error: 'Malformed token' });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      res.json({ valid: true, address: decoded.address });
    } catch (error: any) {
      console.error('Token verification error:', error);
      if (error?.name === 'JsonWebTokenError') {
        res.status(401).json({ error: 'Malformed token' });
      } else if (error?.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Token expired' });
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      // Since we're using stateless JWT tokens, logout is handled on the client side
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Validate referrer endpoint
  app.get("/api/auth/validate-referrer", requireWallet, async (req, res) => {
    try {
      const referrerAddress = req.query.address as string;
      const currentWallet = req.headers['x-wallet-address'] as string;
      
      if (!referrerAddress || !referrerAddress.startsWith('0x')) {
        return res.status(400).json({ error: 'Invalid referrer address format' });
      }

      // Check for self-referral
      if (referrerAddress.toLowerCase() === currentWallet.toLowerCase()) {
        return res.status(400).json({ error: 'Cannot refer yourself' });
      }

      // Check if referrer exists
      const referrerProfile = await usersService.getUserProfile(referrerAddress);
      
      if (!referrerProfile) {
        return res.status(404).json({ error: 'Referrer not found' });
      }

      res.json({
        isValid: true,
        username: referrerProfile.user.username,
        walletAddress: referrerProfile.user.walletAddress
      });
    } catch (error) {
      console.error('Referrer validation error:', error);
      res.status(500).json({ error: 'Failed to validate referrer' });
    }
  });

  // NFT Claim and Membership Activation endpoint
  app.post("/api/auth/claim-nft", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      const { level, transactionHash, mintTxHash } = req.body;
      
      console.log('🎫 NFT Claim request:', { walletAddress, level, transactionHash });
      
      if (!level || level !== 1) {
        return res.status(400).json({ error: 'Only Level 1 NFT claims supported' });
      }

      // Get user profile
      const userProfile = await usersService.getUserProfile(walletAddress);
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update user membership status
      const updatedUser = await usersService.activateUserMembership({
        walletAddress,
        membershipLevel: 1,
        transactionHash,
        mintTxHash
      });

      console.log('🎉 NFT claimed and user activated:', updatedUser.walletAddress);

      res.json({
        success: true,
        user: updatedUser,
        message: 'Level 1 NFT claimed successfully',
        rewards: {
          bccTransferable: 500,
          bccLocked: 100
        }
      });
    } catch (error) {
      console.error('NFT claim error:', error);
      res.status(500).json({ 
        error: 'Failed to claim NFT',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Enhanced user registration endpoint with referrer validation
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log('🔄 Registration request received:', req.body);
      
      const { walletAddress, username, email, secondaryPasswordHash, referrerWallet } = req.body;
      
      if (!walletAddress || !walletAddress.startsWith('0x')) {
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }

      if (!username || username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }

      // Validate referrer if provided
      if (referrerWallet) {
        // Check for self-referral
        if (referrerWallet.toLowerCase() === walletAddress.toLowerCase()) {
          return res.status(400).json({ error: 'Cannot refer yourself' });
        }

        // Check if referrer exists
        const referrer = await usersService.getUserProfile(referrerWallet);
        if (!referrer) {
          return res.status(400).json({ error: 'Referrer not found - they must be registered first' });
        }
      }

      // Create user through service with enhanced data
      const newUser = await usersService.createUserEnhanced({
        walletAddress,
        username,
        email,
        secondaryPasswordHash,
        referrerWallet
      });

      console.log('🎉 User created successfully:', newUser.walletAddress);

      res.status(201).json({
        user: newUser,
        message: 'User registered successfully'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        error: 'Registration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Enhanced user status endpoint - checks registration AND NFT ownership
  app.get("/api/auth/user", requireWallet, async (req: any, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      console.log('🔍 Getting user status for:', walletAddress);

      // Get comprehensive user status including NFT verification
      const userStatus = await usersService.getUserStatusWithNFT(walletAddress);
      
      console.log('📊 User status from service:', userStatus);
      
      if (!userStatus.isRegistered) {
        console.log('🚪 User not registered');
        return res.status(404).json({ 
          error: 'User not found',
          isRegistered: false,
          hasNFT: false,
          userFlow: 'registration'
        });
      }

      // Create enhanced response with all needed fields
      const enhancedResponse = {
        user: userStatus.user,
        isRegistered: userStatus.isRegistered,
        hasNFT: userStatus.hasNFT,
        isActivated: userStatus.isActivated,
        membershipLevel: userStatus.membershipLevel || 0,
        userFlow: userStatus.userFlow, // 🔑 Critical routing field
        membershipState: {
          activeLevel: userStatus.membershipLevel || 0
        },
        bccBalance: await (async () => {
          console.log(`🔑 BCC计算检查 isActivated: ${userStatus.isActivated}`);
          if (!userStatus.isActivated) return { transferable: 0, restricted: 0 };
          console.log(`🧮 开始动态计算BCC [${walletAddress}]`);
          const { bccCalculationService } = await import('../services/bcc-calculation.service');
          const bccData = await bccCalculationService.calculateBCCBalances(walletAddress);
          console.log(`✅ BCC动态计算完成: transferable=${bccData.transferable}, restricted=${bccData.restricted}`);
          return {
            transferable: bccData.transferable,
            restricted: bccData.restricted
          };
        })(),
        currentLevel: userStatus.membershipLevel || 0
      };

      console.log('✅ Sending enhanced response:', enhancedResponse);
      res.json(enhancedResponse);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user data' });
    }
  });
}