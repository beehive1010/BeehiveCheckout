#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Handle client-side routing - serve index.html for all routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  // Check if dist directory and index.html exist
  if (!fs.existsSync(path.join(__dirname, 'dist'))) {
    return res.status(500).send(`
      <h1>Build Error</h1>
      <p>The 'dist' directory does not exist. Please run 'npm run build' first.</p>
      <p>Current directory: ${__dirname}</p>
    `);
  }
  
  if (!fs.existsSync(indexPath)) {
    return res.status(500).send(`
      <h1>Build Error</h1>
      <p>index.html not found in dist directory. Please run 'npm run build' first.</p>
      <p>Looking for: ${indexPath}</p>
    `);
  }
  
  res.sendFile(indexPath);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send(`
    <h1>Server Error</h1>
    <p>An error occurred while serving the application.</p>
    <pre>${err.message}</pre>
  `);
});

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Production server running at http://${HOST}:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  process.exit(0);
});