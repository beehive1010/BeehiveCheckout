#!/usr/bin/env node

// Production startup script for Beehive Platform
// This ensures the app starts on port 3000 for deployment compatibility

console.log('🚀 Starting Beehive Platform in production mode...');

// Set production environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = '3000';

// Direct import and start of our Express server
import('./server/index.ts')
  .then(() => {
    console.log('✅ Server module loaded successfully');
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });