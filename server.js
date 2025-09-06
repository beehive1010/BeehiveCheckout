#!/usr/bin/env node

// Force production deployment to use our Express server on port 3000
// This file will be used instead of vite preview

process.env.NODE_ENV = 'production';
process.env.PORT = '3000';

import('./start-production.js');