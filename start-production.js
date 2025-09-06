#!/usr/bin/env node

// Production startup script for Beehive Platform
// This ensures the app starts on port 3000 for deployment compatibility

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Beehive Platform in production mode...');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.PORT = '3000';

// Start the Express server
const serverPath = join(__dirname, 'server', 'index.ts');
const server = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🛑 Server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('📡 Shutting down server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('📡 Shutting down server...');
  server.kill('SIGTERM');
});