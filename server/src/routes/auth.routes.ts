import type { Express } from "express";
import { storage } from "../../storage";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { 
  insertUserSchema,
  users,
  type AdminUser,
  type AdminSession
} from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

export function registerAuthRoutes(app: Express, requireWallet: any) {
  const JWT_SECRET = process.env.JWT_SECRET || 'beehive-secret-key';

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
      
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        console.log('❌ Validation failed:', validation.error.errors);
        return res.status(400).json({ 
          error: 'Invalid input data',
          details: validation.error.errors
        });
      }

      const userData = validation.data;
      console.log('✅ Validated user data:', userData);

      // Check if user already exists
      const existingUser = await storage.getUser(userData.walletAddress.toLowerCase());
      if (existingUser) {
        console.log('👤 User already exists:', existingUser.walletAddress);
        return res.status(200).json({ 
          user: existingUser,
          message: 'User already registered'
        });
      }

      // Create new user
      const newUser = await storage.createUser(userData);
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
      const user = await storage.getUser(req.walletAddress);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user membership and balance data
      const membershipState = await storage.getMembershipState(req.walletAddress);
      const bccBalance = await storage.getBCCBalance(req.walletAddress);

      res.json({
        user,
        membershipState,
        bccBalance,
        isActivated: membershipState?.activeLevel > 0 || false,
        currentLevel: membershipState?.activeLevel || 0
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user data' });
    }
  });
}