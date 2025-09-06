# Thirdweb + Supabase Configuration Guide

## Overview
Your Supabase Edge Functions now use Thirdweb SDK for secure wallet signature verification. This ensures that InAppWallet authentication is properly validated on the server side.

## Required Configuration

### 1. Thirdweb Dashboard Settings

#### **InAppWallet Configuration:**

1. **Go to Thirdweb Dashboard:** https://thirdweb.com/dashboard
2. **Navigate to:** Your Project → Wallets → In-App Wallets
3. **Configure Authentication:**

```typescript
// Authentication Settings
Auth Methods: ✅ Email ✅ Google ✅ Apple ✅ Facebook
Auth Mode: Popup (recommended) or Redirect
Custom Domain: beehive-lifestyle.io
```

4. **JWT Configuration (Advanced):**
```typescript
// Custom JWT endpoint (CONFIGURED)
JWKS URI: https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth?jwks=true
AUD Value: beehive-platform
JWT Signing Algorithm: ES256
Token Expiry: 3600 (1 hour)
```

5. **Callback URLs:**
```
Production:
- https://beehive-lifestyle.io
- https://beehive-lifestyle.io/auth/callback
- https://beehive-lifestyle.io/dashboard

Development:
- http://localhost:5000
- http://localhost:5000/auth/callback
```

### 2. Supabase Environment Variables

In your Supabase Dashboard:

1. **Go to Settings → Edge Functions**
2. **Add Environment Variables:**

```bash
THIRDWEB_CLIENT_ID=your-thirdweb-client-id
SUPABASE_URL=https://cvqibjcbfrwsgkvthccp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Get Your Thirdweb Client ID

1. **Visit Thirdweb Dashboard:** https://thirdweb.com/dashboard
2. **Select or Create Your Project**
3. **Go to Settings → API Keys**
4. **Copy your Client ID** (starts with a long string)
5. **Add to Supabase Environment Variables**

### 3. Frontend Environment Variables

In your `.env` file:

```bash
# Thirdweb
VITE_THIRDWEB_CLIENT_ID=your-thirdweb-client-id

# Supabase
VITE_SUPABASE_URL=https://cvqibjcbfrwsgkvthccp.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## What's Been Added

### Enhanced Auth Function

The auth Supabase Edge Function now includes:

✅ **Thirdweb SDK Integration**
```typescript
import { createThirdwebClient, verifySignature } from 'thirdweb@5'

const thirdwebClient = createThirdwebClient({
  clientId: Deno.env.get('THIRDWEB_CLIENT_ID')
})
```

✅ **Signature Verification**
```typescript
const isValid = await verifySignature({
  message,
  signature, 
  address: walletAddress,
  client: thirdwebClient,
})
```

✅ **Secure Authentication Flow**
1. User signs message with InAppWallet
2. Frontend sends signature + message + wallet address
3. Supabase function verifies signature with Thirdweb
4. Only valid signatures create authenticated sessions

## Authentication Flow

### Frontend (InAppWallet)
```typescript
// 1. Connect InAppWallet
await connectWallet()

// 2. Sign authentication message  
const message = "Sign in to Beehive Platform..."
const signature = await wallet.signMessage(message)

// 3. Send to Supabase function
const result = await supabaseApi.login(walletAddress, signature, message)
```

### Backend (Supabase Function)
```typescript
// 1. Receive authentication request
// 2. Verify signature with Thirdweb SDK
// 3. Create authenticated session if valid
// 4. Return user data and session
```

## Security Benefits

✅ **Cryptographic Verification:** All wallet signatures verified server-side
✅ **Replay Attack Prevention:** Messages include timestamps
✅ **Address Validation:** Ensures signature matches claimed wallet address
✅ **InAppWallet Support:** Works with social auth (email, Google, etc.)
✅ **No Private Keys:** Signatures only, never expose private keys

## Testing Configuration

### 1. Test Signature Verification
```bash
# In Supabase Edge Functions logs, you should see:
✅ Signature verified for wallet: 0x...
✅ User authenticated successfully
```

### 2. Test Failed Authentication
Invalid signatures should return:
```json
{
  "error": "Invalid signature"
}
```

### 3. Monitor Function Logs
```bash
# View logs in Supabase Dashboard → Edge Functions → auth
# Look for verification success/failure messages
```

## Troubleshooting

### "Missing Thirdweb Client ID"
- Ensure `THIRDWEB_CLIENT_ID` is set in Supabase environment variables
- Verify the client ID is correct (no extra spaces/characters)

### "Signature Verification Failed" 
- Check that message format matches between frontend and backend
- Ensure wallet address is lowercase
- Verify timestamp is recent (prevent replay attacks)

### "Function Import Error"
- Thirdweb SDK v5 should auto-import in Deno
- Check Supabase function logs for import errors

## Production Deployment

1. **Deploy Updated Auth Function:**
```bash
supabase functions deploy auth
```

2. **Set Production Environment Variables:**
```bash
supabase secrets set THIRDWEB_CLIENT_ID=your-production-client-id
```

3. **Test Authentication Flow:**
   - Connect wallet on production site
   - Verify signature verification in function logs
   - Confirm successful authentication

## Advanced InAppWallet Configuration

### Custom JWT Integration (Optional)

If you want to use custom JWT tokens for enhanced integration:

#### **1. Create Custom Auth Endpoint**

Add to your Supabase auth function:

```typescript
// In supabase/functions/auth/index.ts
case 'jwt-verify':
  return await handleJWTVerification(supabase, requestData)

async function handleJWTVerification(supabase: any, data: any) {
  try {
    const { token, walletAddress } = data
    
    // Verify JWT token with your custom logic
    const isValid = await verifyJWTToken(token)
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid JWT token' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Return user data for JWT verification
    return new Response(
      JSON.stringify({
        success: true,
        walletAddress,
        user: { /* user data */ }
      }),
      { headers: corsHeaders }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'JWT verification failed' }),
      { status: 500, headers: corsHeaders }
    )
  }
}
```

#### **2. Configure InAppWallet with Custom Auth**

```typescript
// In your Web3Context
const wallet = inAppWallet({
  auth: {
    options: ['email', 'google', 'apple', 'facebook'],
    // Enable custom authentication
    authUrl: 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth',
    mode: 'popup',
    customAuthEndpoint: {
      authenticate: '/jwt-verify',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_JWT_TOKEN'
      }
    }
  },
  metadata: {
    name: "Beehive Platform",
    description: "Web3 Membership and Learning Platform",
    logoUrl: "https://beehive-lifestyle.io/logo.png",
    url: "https://beehive-lifestyle.io",
  }
})
```

#### **3. JWT Token Management**

```typescript
// JWT utilities for InAppWallet
export const jwtUtils = {
  // Generate JWT for wallet authentication
  async generateWalletJWT(walletAddress: string): Promise<string> {
    const payload = {
      wallet: walletAddress,
      iss: 'beehive-platform',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      iat: Math.floor(Date.now() / 1000)
    }
    
    // Sign with your secret key (server-side only)
    return signJWT(payload, process.env.JWT_SECRET_KEY)
  },
  
  // Verify JWT token
  async verifyWalletJWT(token: string): Promise<any> {
    try {
      return verifyJWT(token, process.env.JWT_SECRET_KEY)
    } catch (error) {
      throw new Error('Invalid JWT token')
    }
  }
}
```

### Environment Variables for JWT

Add to your `.env`:

```bash
# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key
JWT_ISSUER=beehive-platform
JWT_EXPIRY=3600

# Thirdweb Advanced
THIRDWEB_SECRET_KEY=your-thirdweb-secret-key (server-side only)
THIRDWEB_CLIENT_ID=your-thirdweb-client-id
```

## Production Recommendations

### For Basic Setup (Recommended):
- ✅ Use default Thirdweb authentication (no custom JWT needed)
- ✅ Configure callback URLs and auth methods
- ✅ Use signature verification for security

### For Advanced Setup (Optional):
- ✅ Implement custom JWT endpoints if you need custom user metadata
- ✅ Use custom authentication flows for enterprise requirements
- ✅ Integrate with existing authentication systems

## Quick Setup Steps

1. **Thirdweb Dashboard:** Configure InAppWallet auth methods and callbacks
2. **Supabase:** Add `THIRDWEB_CLIENT_ID` environment variable
3. **Frontend:** Update wallet configuration with metadata and styling
4. **Deploy:** Deploy updated auth function with Thirdweb integration

This configuration ensures your Beehive platform has enterprise-grade Web3 authentication security with Thirdweb + Supabase integration.