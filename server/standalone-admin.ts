// Standalone admin authentication server using shared database connection
import express from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export function setupAdminRoutes(app: express.Application) {
  // Admin login
  app.post("/api/admin/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }
      
      // Direct SQL query to avoid schema compilation issues  
      const result = await db.execute(sql`
        SELECT id, username, email, role, password_hash, active 
        FROM admin_users 
        WHERE username = ${username} AND active = true
      `);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const admin = result.rows[0] as any;
      
      // Verify password
      const isValid = await bcrypt.compare(password, admin.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

      // Use transaction for atomic operations
      await db.transaction(async (tx) => {
        // Store session
        await tx.execute(sql`
          INSERT INTO admin_sessions (admin_id, session_token, expires_at, created_at)
          VALUES (${admin.id}, ${sessionToken}, ${expiresAt}, ${new Date()})
        `);

        // Update last login
        await tx.execute(sql`
          UPDATE admin_users SET last_login_at = ${new Date()} WHERE id = ${admin.id}
        `);
      });

      res.json({
        sessionToken,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
        expiresAt,
      });
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
        await db.execute(sql`
          DELETE FROM admin_sessions WHERE session_token = ${sessionToken}
        `);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Admin logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Admin session check
  app.get("/api/admin/auth/me", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: 'Admin authentication required' });
      }
      
      const result = await db.execute(sql`
        SELECT 
          s.admin_id, s.expires_at,
          u.id, u.username, u.email, u.role, u.active
        FROM admin_sessions s
        JOIN admin_users u ON u.id = s.admin_id
        WHERE s.session_token = ${sessionToken} AND s.expires_at > ${new Date()} AND u.active = true
      `);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      const session = result.rows[0] as any;
      
      res.json({
        id: session.id,
        username: session.username,
        email: session.email,
        role: session.role,
      });
    } catch (error) {
      console.error('Session verification error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });
}