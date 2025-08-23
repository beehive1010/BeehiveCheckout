// Temporary admin authentication module to bypass storage.ts compilation issues
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

export async function authenticateAdmin(username: string, password: string) {
  try {
    // Direct SQL query to avoid schema compilation issues
    const result = await db.execute(sql`
      SELECT id, username, email, role, password_hash, active 
      FROM admin_users 
      WHERE username = ${username} AND active = true
    `);

    if (result.rows.length === 0) {
      return null;
    }

    const admin = result.rows[0] as any;
    
    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return null;
    }

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

    // Store session
    await db.execute(sql`
      INSERT INTO admin_sessions (admin_id, session_token, expires_at, created_at)
      VALUES (${admin.id}, ${sessionToken}, ${expiresAt}, ${new Date()})
    `);

    // Update last login
    await db.execute(sql`
      UPDATE admin_users SET last_login_at = ${new Date()} WHERE id = ${admin.id}
    `);

    return {
      sessionToken,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
      expiresAt,
    };
  } catch (error) {
    console.error('Admin authentication error:', error);
    return null;
  }
}

export async function verifyAdminSession(sessionToken: string) {
  try {
    const result = await db.execute(sql`
      SELECT 
        s.admin_id, s.expires_at,
        u.id, u.username, u.email, u.role, u.active
      FROM admin_sessions s
      JOIN admin_users u ON u.id = s.admin_id
      WHERE s.session_token = ${sessionToken} AND s.expires_at > ${new Date()} AND u.active = true
    `);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as any;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

export async function logoutAdmin(sessionToken: string) {
  try {
    await db.execute(sql`
      DELETE FROM admin_sessions WHERE session_token = ${sessionToken}
    `);
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}