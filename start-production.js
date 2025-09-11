#!/usr/bin/env node

// Production startup script for Beehive Platform
// This serves as an alternative to the problematic 'vite preview' command

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const distPath = path.resolve('dist');

// Check if build exists
if (!fs.existsSync(distPath)) {
  console.error('❌ Error: dist directory not found. Please run "npm run build" first.');
  process.exit(1);
}

console.log('🚀 Starting production server with serve...');
console.log('📁 Serving from:', distPath);

// Start serve with correct options
const serveProcess = spawn('npx', [
  'serve',
  '-s',          // Single Page Application mode
  'dist',        // Directory to serve
  '-l',          // Listen port
  '5000',        // Port number
  '--host',      // Host option
  '0.0.0.0'      // Allow external connections
], {
  stdio: 'inherit',
  shell: true
});

serveProcess.on('error', (error) => {
  console.error('❌ Failed to start production server:', error.message);
  process.exit(1);
});

serveProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Production server exited with code ${code}`);
    process.exit(code);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('👋 Received SIGTERM, shutting down gracefully');
  serveProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('👋 Received SIGINT, shutting down gracefully');  
  serveProcess.kill('SIGINT');
});