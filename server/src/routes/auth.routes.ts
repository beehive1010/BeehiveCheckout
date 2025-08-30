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
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      res.json({ valid: true, address: decoded.address });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ error: 'Invalid token' });
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

  // User registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log('🔄 Registration request received:', req.body);
      
      const { walletAddress, username, referrerWallet } = req.body;
      
      if (!walletAddress || !walletAddress.startsWith('0x')) {
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }

      // Create user through service
      const newUser = await usersService.createUser({
        walletAddress,
        username,
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

  // Get authenticated user data
  app.get("/api/auth/user", requireWallet, async (req: any, res) => {
    try {
      const userProfile = await usersService.getUserProfile(req.walletAddress);
      
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: userProfile.user,
        membershipState: {
          activeLevel: userProfile.membershipLevel
        },
        bccBalance: {
          transferable: 0, // Would be fetched from balance service
          restricted: 0
        },
        isActivated: userProfile.isActivated,
        currentLevel: userProfile.membershipLevel
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user data' });
    }
  });
}