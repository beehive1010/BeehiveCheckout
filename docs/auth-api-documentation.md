# Authentication & Registration API Documentation

## Overview

The Beehive platform uses a wallet-based authentication system with JWT tokens. Users authenticate by connecting their Web3 wallet, registering an account, and then claiming an NFT to activate their membership.

## Authentication Flow

```
1. User connects Web3 wallet (MetaMask, WalletConnect, etc.)
2. Frontend calls /api/auth/user to check registration status
3. If not registered → Registration flow
4. If registered but no NFT → NFT claiming flow  
5. If registered and has NFT → Dashboard access
```

## API Endpoints

### 1. Check User Registration Status

**GET** `/api/auth/user`

**Headers:**
- `X-Wallet-Address`: User's wallet address (required)

**Response:**
```json
{
  "user": {
    "walletAddress": "0x123...",
    "username": "john_doe",
    "currentLevel": 1,
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "isRegistered": true,
  "hasNFT": true,
  "isActivated": true,
  "membershipLevel": 1,
  "userFlow": "dashboard", // "registration" | "claim_nft" | "dashboard"
  "membershipState": {
    "activeLevel": 1
  },
  "bccBalance": {
    "transferable": 500,
    "restricted": 100
  },
  "currentLevel": 1
}
```

**Error Responses:**
- `404`: User not found (needs registration)
- `500`: Server error

---

### 2. User Registration

**POST** `/api/auth/register`

**Headers:**
- `X-Wallet-Address`: User's wallet address (required)

**Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "secondaryPasswordHash": "hashed_password",
  "referrerWallet": "0x456..." // optional
}
```

**Response:**
```json
{
  "user": {
    "walletAddress": "0x123...",
    "username": "john_doe",
    "email": "john@example.com",
    "currentLevel": 0,
    "memberActivated": false,
    "referrerWallet": "0x456...",
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "message": "User registered successfully"
}
```

**Validation Rules:**
- Username: min 3 characters, unique
- Wallet address: valid Ethereum address format (0x...)
- Referrer validation: must exist in database, cannot self-refer

**Error Responses:**
- `400`: Invalid input (wallet format, username length, self-referral, etc.)
- `409`: User already exists or username taken
- `500`: Server error

---

### 3. Validate Referrer

**GET** `/api/auth/validate-referrer?address=0x456...`

**Headers:**
- `X-Wallet-Address`: Current user's wallet address (required)

**Response:**
```json
{
  "isValid": true,
  "username": "referrer_name",
  "walletAddress": "0x456..."
}
```

**Error Responses:**
- `400`: Invalid referrer address format or self-referral
- `404`: Referrer not found
- `500`: Server error

---

### 4. Check User Exists (Public)

**GET** `/api/auth/check-user-exists/:walletAddress`

**Response:**
```json
{
  "exists": true,
  "username": "john_doe",
  "walletAddress": "0x123..."
}
```

**Error Responses:**
- `400`: Invalid wallet address format
- `404`: User not found
- `500`: Server error

---

### 5. Generate Login Payload

**POST** `/api/auth/login-payload`

**Body:**
```json
{
  "address": "0x123..."
}
```

**Response:**
```json
{
  "message": "Welcome to Beehive!\n\nClick to sign in and accept the Beehive Terms of Service.\n\nNonce: abc123...",
  "nonce": "abc123...",
  "address": "0x123..."
}
```

---

### 6. Verify Signature

**POST** `/api/auth/verify-signature`

**Body:**
```json
{
  "address": "0x123...",
  "signature": "0xsignature...",
  "message": "Welcome to Beehive!..."
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "address": "0x123..."
}
```

**Error Responses:**
- `400`: Missing required fields
- `500`: Signature verification failed

---

### 7. Verify JWT Token

**GET** `/api/auth/verify-token`

**Headers:**
- `Authorization`: Bearer token
- Or `X-Auth-Token`: token
- Or query param `?token=jwt_token`

**Response:**
```json
{
  "valid": true,
  "address": "0x123..."
}
```

**Error Responses:**
- `401`: No token provided, malformed token, token expired, or invalid token

---

### 8. Membership Activation

**POST** `/api/membership/activate`

**Headers:**
- `X-Wallet-Address`: User's wallet address (required)

**Body:**
```json
{
  "level": 1,
  "txHash": "0xhash..." // optional transaction hash
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "walletAddress": "0x123...",
    "currentLevel": 1,
    "memberActivated": true
  },
  "message": "Level 1 membership activated successfully"
}
```

**Error Responses:**
- `400`: Invalid level (only Level 1 supported)
- `404`: User not found
- `500`: Activation failed

---

### 9. NFT Claim (Alternative Activation)

**POST** `/api/auth/claim-nft`

**Headers:**
- `X-Wallet-Address`: User's wallet address (required)

**Body:**
```json
{
  "level": 1,
  "transactionHash": "0xhash...",
  "mintTxHash": "0xhash..."
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "walletAddress": "0x123...",
    "currentLevel": 1
  },
  "message": "Level 1 NFT claimed successfully",
  "rewards": {
    "bccTransferable": 500,
    "bccLocked": 100
  }
}
```

---

### 10. Logout

**POST** `/api/auth/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

*Note: Since JWT tokens are stateless, logout is primarily handled on the client side by removing the token.*

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  wallet_address VARCHAR(42) PRIMARY KEY,
  referrer_wallet VARCHAR(42),
  username TEXT UNIQUE,
  email TEXT,
  current_level INTEGER DEFAULT 0 NOT NULL,
  is_upgraded BOOLEAN DEFAULT FALSE NOT NULL,
  upgrade_timer_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Members Table
```sql
CREATE TABLE members (
  wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
  is_activated BOOLEAN DEFAULT FALSE NOT NULL,
  activated_at TIMESTAMP,
  current_level INTEGER DEFAULT 0 NOT NULL,
  max_layer INTEGER DEFAULT 0 NOT NULL,
  levels_owned JSONB DEFAULT '[]' NOT NULL,
  has_pending_rewards BOOLEAN DEFAULT FALSE NOT NULL,
  upgrade_reminder_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  last_upgrade_at TIMESTAMP,
  last_reward_claim_at TIMESTAMP,
  total_direct_referrals INTEGER DEFAULT 0 NOT NULL,
  total_team_size INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## Authentication Middleware

The `requireWallet` middleware validates that:
1. `X-Wallet-Address` header is present
2. Wallet address format is valid (42 characters, starts with 0x)
3. User exists in database (for protected endpoints)

## Security Considerations

1. **JWT Secret**: Use environment variable `JWT_SECRET` (fallback to 'beehive-secret-key' for development)
2. **Token Expiry**: JWT tokens expire after 24 hours
3. **Wallet Validation**: All wallet addresses are normalized to lowercase
4. **SQL Injection**: Using Drizzle ORM with parameterized queries
5. **Rate Limiting**: Consider implementing rate limiting for registration and login endpoints

## Error Handling

All endpoints follow consistent error response format:
```json
{
  "error": "Error message",
  "details": "Optional detailed error information"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created (registration)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `404`: Not Found (user/referrer not found)
- `409`: Conflict (user already exists)
- `500`: Internal Server Error

## Frontend Integration

### useWallet Hook Usage
```typescript
const { 
  isConnected, 
  walletAddress,
  isNewUser,           // needs registration
  needsNFTClaim,       // needs NFT activation
  isFullyActivated,    // ready for dashboard
  register,            // registration function
  activateMembership   // activation function
} = useWallet();
```

### Registration Flow
```typescript
await register({
  walletAddress: '0x123...',
  username: 'john_doe',
  email: 'john@example.com',
  referrerWallet: '0x456...' // optional
});
```

### Activation Flow
```typescript
await activateMembership({
  level: 1,
  txHash: '0xhash...' // optional
});
```

## Testing

### Manual Testing Endpoints
```bash
# Check user status
curl -H "X-Wallet-Address: 0x123..." http://localhost:5000/api/auth/user

# Register new user
curl -X POST -H "Content-Type: application/json" -H "X-Wallet-Address: 0x123..." \
  -d '{"username":"testuser","email":"test@example.com"}' \
  http://localhost:5000/api/auth/register

# Activate membership
curl -X POST -H "Content-Type: application/json" -H "X-Wallet-Address: 0x123..." \
  -d '{"level":1}' \
  http://localhost:5000/api/membership/activate
```

### Database Verification
```sql
-- Check registered users
SELECT wallet_address, username, current_level, created_at FROM users;

-- Check activated members
SELECT wallet_address, is_activated, current_level, activated_at FROM members;
```

This documentation provides a complete reference for the authentication and registration system, including API endpoints, database schema, security considerations, and integration examples.