#!/usr/bin/env node

// Production startup script for Beehive deployment
// This runs our Express server on port 3000

console.log('🚀 Starting Beehive Platform for deployment...');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.PORT = '3000';

// Use tsx to run TypeScript server
import { spawn } from 'child_process';

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
  }
  process.exit(code);
});