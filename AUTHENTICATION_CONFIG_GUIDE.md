# Authentication Configuration Guide

This guide covers configuring Thirdweb InAppWallet with Supabase Auth for the Beehive platform.

## Architecture Overview

The platform uses **dual authentication**:
- **Regular Users**: Thirdweb InAppWallet (social auth) + wallet-based authentication
- **Admin Users**: Traditional Supabase Auth (email/password) - NO wallet required

## 1. Thirdweb Configuration

### Dashboard Settings (https://thirdweb.com/dashboard)

1. **Create/Access Your Project**
   - Go to https://thirdweb.com/dashboard
   - Select your Beehive project or create new one

2. **Configure InAppWallet**
   - Navigate to "Wallets" → "In-App Wallets"
   - Enable the following auth methods:
     - ✅ Email
     - ✅ Google
     - ✅ Apple  
     - ✅ Facebook

3. **Set Redirect URLs**
   Add these redirect URLs in your Thirdweb project:
   ```
   Production:
   - https://beehive-lifestyle.io
   - https://beehive-lifestyle.io/auth/callback
   - https://beehive-lifestyle.io/dashboard
   
   Development:
   - http://localhost:5000
   - http://localhost:5000/auth/callback
   - http://localhost:5000/dashboard
   
   Replit:
   - https://your-replit-url.replit.dev
   - https://your-replit-url.replit.dev/auth/callback
   ```

4. **Get API Keys**
   - Copy your Client ID
   - Add to `.env` as `VITE_THIRDWEB_CLIENT_ID`

## 2. Supabase Configuration

### Dashboard Settings (https://supabase.com/dashboard)

1. **Authentication Settings**
   - Go to Authentication → Settings
   - Enable "Confirm email" = OFF (for admin users)
   - Enable "Secure email change" = ON

2. **Site URL Configuration**
   ```
   Site URL: https://beehive-lifestyle.io
   
   Additional Redirect URLs:
   - https://beehive-lifestyle.io/auth/callback
   - https://beehive-lifestyle.io/admin/dashboard
   - http://localhost:5000/auth/callback (dev)
   - http://localhost:5000/admin/dashboard (dev)
   ```

3. **Auth Providers (for Admin)**
   - Email: ✅ Enabled
   - Google: ❌ Disabled (use Thirdweb for regular users)
   - Other providers: ❌ Disabled

4. **JWT Settings**
   - JWT expiry: 3600 (1 hour)
   - Refresh token expiry: 604800 (7 days)

5. **Environment Variables**
   Add to your `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## 3. Database Schema for Admin Users

Run this SQL in Supabase SQL Editor:

```sql
-- Create admin_users table for traditional auth
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can read their own data
CREATE POLICY "Admin users can read own data" ON admin_users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Service role can manage all admin users
CREATE POLICY "Service role can manage admin users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');
```

## 4. Environment Variables Setup

Create/update your `.env` file:

```env
# Supabase
VITE_SUPABASE_URL=https://cvqibjcbfrwsgkvthccp.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Thirdweb
VITE_THIRDWEB_CLIENT_ID=your-client-id

# Database (for local development)
DATABASE_URL=your-database-url

# Production
PRODUCTION_DATABASE_URL=your-production-database-url
```

## 5. User Registration Flow

### Regular Users (Wallet-based):
1. User connects via Thirdweb InAppWallet (social auth)
2. InAppWallet creates a smart wallet address
3. User signs authentication message with wallet
4. Backend verifies signature and creates user record
5. User completes registration form (username, email, password)
6. User proceeds to claim Level 1 NFT

### Admin Users (Traditional):
1. Admin logs in via Supabase Auth (email/password)
2. No wallet connection required
3. Access admin panel directly
4. Session managed by Supabase Auth

## 6. Authentication Callbacks

### Thirdweb Callbacks:
- Success: Auto-redirect to `/dashboard` or current page
- Error: Show error message, stay on current page

### Supabase Callbacks:
- Admin login success: Redirect to `/admin/dashboard`
- Admin login error: Show error, stay on `/admin/login`

## 7. Route Protection

### Regular User Routes (require wallet):
- `/dashboard`
- `/education`
- `/referrals`
- `/me`
- `/nft-center`

### Admin Routes (require Supabase auth):
- `/admin/login` (public)
- `/admin/dashboard` (protected)
- `/admin/*` (protected with role-based access)

### Public Routes (no auth):
- `/` (landing)
- `/hiveworld`
- `/register`

## 8. Testing Authentication

### Test Regular User Flow:
1. Visit landing page
2. Click "Connect Wallet"
3. Choose social auth method (Google, Email, etc.)
4. Complete InAppWallet flow
5. Fill registration form
6. Verify redirect to dashboard

### Test Admin Flow:
1. Visit `/admin/login`
2. Enter admin email/password
3. Verify redirect to admin dashboard
4. Test admin functions

## 9. Security Considerations

1. **Wallet Address Validation**: Always validate wallet addresses on backend
2. **Message Signing**: Use timestamp and nonce to prevent replay attacks
3. **Session Management**: Implement proper session timeouts
4. **CORS**: Ensure proper CORS setup for your domains
5. **Rate Limiting**: Implement rate limiting on auth endpoints

## 10. Production Deployment

### Before going live:
1. Update all redirect URLs to production domains
2. Test authentication flows in staging
3. Verify CORS configuration
4. Test admin access
5. Backup authentication settings

This configuration provides a robust dual-authentication system suitable for a Web3 platform with administrative capabilities.