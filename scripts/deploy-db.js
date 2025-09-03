#!/usr/bin/env node

/**
 * Production Database Deployment Script
 * This script handles database schema deployment for production environments
 */

import { execSync } from 'child_process';

// Environment detection
const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";
const environment = isProduction ? "production" : "development";

console.log(`🚀 Starting database deployment for ${environment} environment`);

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Sanitized database URL for logging (hide credentials)
const sanitizedUrl = process.env.DATABASE_URL.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
console.log(`🔗 Target database: ${sanitizedUrl}`);

try {
  console.log('📋 Pushing database schema...');
  
  // Use --force for production to ensure schema is pushed
  const pushCommand = isProduction ? 'npm run db:push --force' : 'npm run db:push';
  execSync(pushCommand, { stdio: 'inherit' });
  
  console.log('✅ Database schema deployed successfully!');
  
  if (isProduction) {
    console.log('🔒 Production database is ready');
    console.log('📊 Schema has been synchronized with production environment');
  } else {
    console.log('🛠️  Development database is ready');
  }
  
} catch (error) {
  console.error('❌ Database deployment failed:', error.message);
  process.exit(1);
}