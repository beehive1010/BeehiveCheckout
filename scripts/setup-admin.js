#!/usr/bin/env node

// Setup script for admin panel
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';

// Set up neon config
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin panel...');
    
    // Create admin_users table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        two_factor_secret TEXT,
        two_factor_enabled BOOLEAN DEFAULT false NOT NULL,
        active BOOLEAN DEFAULT true NOT NULL,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    console.log('✅ Admin users table created');

    // Create admin_sessions table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id VARCHAR NOT NULL REFERENCES admin_users(id),
        session_token TEXT NOT NULL UNIQUE,
        ip_address TEXT,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    console.log('✅ Admin sessions table created');

    // Create audit_logs table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id VARCHAR NOT NULL REFERENCES admin_users(id),
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        target_id TEXT,
        target_type TEXT,
        old_values JSONB,
        new_values JSONB,
        ip_address TEXT,
        user_agent TEXT,
        severity TEXT NOT NULL DEFAULT 'info',
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    console.log('✅ Audit logs table created');

    // Check if admin user already exists
    const existingAdmin = await db.execute(`
      SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1;
    `);

    if (existingAdmin.rows.length === 0) {
      // Create initial admin user
      const passwordHash = await bcrypt.hash('admin123', 12);
      
      await db.execute(`
        INSERT INTO admin_users (username, email, password_hash, role, active)
        VALUES ('admin', 'admin@beehive.com', '${passwordHash}', 'super_admin', true);
      `);
      
      console.log('🔐 Initial admin user created:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Role: super_admin');
      console.log('   Email: admin@beehive.com');
      console.log('');
      console.log('⚠️  IMPORTANT: Please change the default password after first login!');
    } else {
      console.log('ℹ️  Admin user already exists, skipping creation');
    }

    console.log('🎉 Admin panel setup complete!');
    console.log('📍 Admin panel URL: /admin/login');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupAdmin();