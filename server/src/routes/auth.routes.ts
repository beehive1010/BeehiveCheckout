import type { Express } from "express";
import { usersService } from '../services';
import crypto from "crypto";
import jwt from "jsonwebtoken";

export function registerAuthRoutes(app: Express, requireWallet: any) {
  const JWT_SECRET = process.env.JWT_SECRET || 'beehive-secret-key';
  
  // Supabase Auth integration for wallet-based users
  app.post("/api/auth/supabase-login", async (req, res) => {
    try {
      const { walletAddress, walletType } = req.body;
      const headerWallet = req.headers['x-wallet-address'] as string;
      
      if (!walletAddress || !headerWallet || walletAddress.toLowerCase() !== headerWallet.toLowerCase()) {
        return res.status(400).json({ error: 'Wallet address mismatch' });
      }
      
      // Check if user exists or create new user
      let user = await usersService.checkUserExists(walletAddress.toLowerCase());
      
      if (!user.exists) {
        // Create new user with Supabase integration
        const newUser = await usersService.createUserEnhanced({
          walletAddress: walletAddress.toLowerCase(),
          username: `user_${walletAddress.slice(-6)}`,
          email: null,
          secondaryPasswordHash: null,
          referrerWallet: null
        });
        
        console.log('🆕 New user created for Supabase auth:', newUser.walletAddress);
      }
      
      // Create session token for Supabase compatibility
      const sessionToken = jwt.sign(
        { 
          wallet: walletAddress.toLowerCase(), 
          type: 'supabase_wallet',
          walletType: walletType || 'unknown'
        }, 
        JWT_SECRET, 
        { expiresIn: '7d' } // Longer session for wallet users
      );
      
      const session = {
        access_token: sessionToken,
        token_type: 'Bearer',
        expires_in: 604800, // 7 days
        user: {
          id: walletAddress.toLowerCase(),
          wallet_address: walletAddress.toLowerCase(),
          wallet_type: walletType
        }
      };
      
      res.json({ session, user: user.user || null });
    } catch (error) {
      console.error('Supabase auth error:', error);
      res.status(500).json({ error: 'Failed to authenticate with Supabase' });
    }
  });

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

  // Membership Activation endpoint (alternative route for frontend compatibility)
  app.post("/api/membership/activate", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      const { level, txHash } = req.body;
      
      console.log('🎫 Membership activation request:', { walletAddress, level, txHash });
      
      if (!level || level !== 1) {
        return res.status(400).json({ error: 'Only Level 1 activation supported' });
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
        transactionHash: txHash
      });

      console.log('🎉 Membership activated:', updatedUser.walletAddress);

      res.json({
        success: true,
        user: updatedUser,
        message: 'Level 1 membership activated successfully'
      });
    } catch (error) {
      console.error('Membership activation error:', error);
      res.status(500).json({ 
        error: 'Failed to activate membership',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Enhanced NFT Token ID 1 Claim and Membership Activation endpoint
  app.post("/api/auth/claim-nft-token-1", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      const { claimMethod, transactionHash, mintTxHash, referrerWallet } = req.body;
      
      console.log('🎫 NFT Token ID 1 Claim request:', { 
        walletAddress, 
        claimMethod, 
        transactionHash, 
        referrerWallet 
      });
      
      // Validate claim method - including new network-specific methods
      const validClaimMethods = ['purchase', 'demo', 'referral_bonus', 'testnet_purchase', 'mainnet_purchase'];
      if (!claimMethod || !validClaimMethods.includes(claimMethod)) {
        return res.status(400).json({ 
          error: 'Invalid claim method. Must be: purchase, demo, referral_bonus, testnet_purchase, or mainnet_purchase' 
        });
      }
      
      // Get user profile
      const userProfile = await usersService.getUserProfile(walletAddress);
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found. Please register first.' });
      }
      
      // Check if already activated
      if (userProfile.isActivated && userProfile.membershipLevel >= 1) {
        return res.status(409).json({ 
          error: 'Membership already activated',
          membershipLevel: userProfile.membershipLevel 
        });
      }
      
      // Process referral placement if referrer provided
      let referralPlacement = null;
      if (referrerWallet) {
        try {
          const { matrixPlacementService } = await import('../services/matrix-placement.service');
          referralPlacement = await matrixPlacementService.placeMemberInMatrix({
            rootWallet: referrerWallet.toLowerCase(),
            memberWallet: walletAddress.toLowerCase(),
            placerWallet: referrerWallet.toLowerCase(),
            placementType: 'direct'
          });
          console.log('🎯 Referral placement successful:', referralPlacement);
        } catch (error) {
          console.warn('⚠️ Referral placement failed, continuing with activation:', error);
        }
      }
      
      // Activate membership with Token ID 1
      const updatedUser = await usersService.activateUserMembership({
        walletAddress,
        membershipLevel: 1,
        transactionHash,
        mintTxHash
      });
      
      // Record rewards and process referral bonuses
      try {
        const { layerRewardsService } = await import('../services/layer-rewards.service');
        await layerRewardsService.processNewMemberActivation({
          memberWallet: walletAddress.toLowerCase(),
          membershipLevel: 1,
          activationMethod: claimMethod,
          referrerWallet: referrerWallet?.toLowerCase() || null
        });
        console.log('💰 Rewards processed for new activation');
      } catch (error) {
        console.warn('⚠️ Rewards processing failed, continuing:', error);
      }
      
      // Determine network info for response
      const networkInfo = {
        'demo': { network: 'off-chain', description: 'Database test claim' },
        'testnet_purchase': { network: 'arbitrum-sepolia', description: 'Testnet claim with fake USDT' },
        'mainnet_purchase': { network: 'arbitrum-one', description: 'Mainnet purchase with USDC' },
        'purchase': { network: 'ethereum', description: 'Legacy purchase method' },
        'referral_bonus': { network: 'bonus', description: 'Referral bonus activation' }
      };

      const currentNetwork = networkInfo[claimMethod as keyof typeof networkInfo] || networkInfo.demo;

      console.log('🎉 NFT Token ID 1 claimed and user activated:', {
        wallet: updatedUser.walletAddress,
        method: claimMethod,
        network: currentNetwork.network
      });

      res.json({
        success: true,
        user: updatedUser,
        message: `NFT Token ID 1 claimed successfully - Membership Level 1 activated! (${currentNetwork.description})`,
        membershipLevel: 1,
        tokenId: 1,
        claimMethod,
        network: currentNetwork.network,
        networkDescription: currentNetwork.description,
        referralPlacement,
        rewards: {
          bccTransferable: 500,
          bccLocked: 10350,
          activationTier: referralPlacement?.activationTier || 'standard'
        },
        // Transaction info for blockchain claims
        ...(req.body.chainId && {
          blockchain: {
            chainId: req.body.chainId,
            tokenContract: req.body.tokenContract,
            amount: req.body.amount,
            bridgeUsed: req.body.bridgeUsed || false
          }
        })
      });
    } catch (error) {
      console.error('NFT Token ID 1 claim error:', error);
      res.status(500).json({ 
        error: 'Failed to claim NFT Token ID 1',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Legacy NFT Claim endpoint (backwards compatibility)
  app.post("/api/auth/claim-nft", requireWallet, async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      const { level, transactionHash, mintTxHash } = req.body;
      
      console.log('🎫 Legacy NFT Claim request:', { walletAddress, level, transactionHash });
      
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
      
      // Extract wallet address from header (consistent with other endpoints)
      const walletAddress = req.headers['x-wallet-address'] as string;
      const { username, email, secondaryPasswordHash, referrerWallet } = req.body;
      
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