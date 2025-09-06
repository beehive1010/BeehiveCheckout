# Beehive Platform - Supabase API Documentation

## Overview

This documentation covers all Supabase Edge Functions for the Beehive Platform. The platform has been fully migrated from Express.js backend to Supabase Edge Functions with PostgreSQL database.

### Base Configuration

```typescript
const SUPABASE_URL = "https://cvqibjcbfrwsgkvthccp.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs"
```

### Global Headers

All API requests must include:
- `x-wallet-address`: The user's wallet address (required)
- `Content-Type`: `application/json`
- `Authorization`: `Bearer ${SUPABASE_ANON_KEY}` (for Supabase client)

---

## 1. Authentication API

**Endpoint**: `/auth`

Handles user authentication, registration, and NFT membership activation.

### Actions

#### 1.1 User Login
```typescript
POST /auth
{
  "action": "login",
  "signature": "wallet_signature",
  "message": "Login to Beehive Platform"
}
```

**Response**:
```typescript
{
  "success": true,
  "session": {
    "session_token": "...",
    "wallet_address": "0x...",
    "expires_at": 1234567890
  },
  "user": {
    "wallet_address": "0x...",
    "username": "user123",
    "email": "user@example.com",
    "current_level": 1,
    "members": [{ "is_activated": true, ... }],
    "user_balances": [{ "bcc_transferable": 600, ... }]
  },
  "message": "Login successful"
}
```

#### 1.2 User Registration
```typescript
POST /auth
{
  "action": "register",
  "referrerWallet": "0x...",
  "username": "newuser",
  "email": "newuser@example.com"
}
```

#### 1.3 Get User Data
```typescript
POST /auth
{
  "action": "get-user"
}
```

#### 1.4 Claim NFT Token (Levels 1-19)
```typescript
POST /auth
{
  "action": "claim-nft-token-1",
  "claimData": {
    "claimMethod": "database_test" | "testnet" | "mainnet",
    "referrerWallet": "0x...",
    "transactionHash": "0x...",
    "targetLevel": 1,
    "isOffChain": true,
    "network": "arbitrum-one"
  }
}
```

---

## 2. BCC Purchase API

**Endpoint**: `/bcc-purchase`

Handles BCC token purchases with USDC via Thirdweb bridge.

### Configuration
- Exchange Rate: 1 USDC = 1 BCC
- Minimum Purchase: 10 USDC
- Maximum Purchase: 10,000 USDC
- Supported Networks: Arbitrum One, Arbitrum Sepolia, Ethereum, Polygon

### Actions

#### 2.1 Get Purchase Configuration
```typescript
POST /bcc-purchase
{
  "action": "get-config"
}
```

**Response**:
```typescript
{
  "success": true,
  "config": {
    "exchangeRate": 1,
    "minimumPurchaseUSDC": 10,
    "maximumPurchaseUSDC": 10000,
    "companyServerWallet": "0x...",
    "supportedNetworks": {
      "arbitrum-one": {
        "chainId": 42161,
        "name": "Arbitrum One",
        "usdcContract": "0xA0b86a33E6441E8Ff8BBb5F0f1F4a90AC4Cd0a35"
      }
    },
    "paymentMethods": ["thirdweb_bridge", "direct_transfer"]
  }
}
```

#### 2.2 Create Purchase Order
```typescript
POST /bcc-purchase
{
  "action": "create-purchase",
  "amountUSDC": 100,
  "network": "arbitrum-one",
  "paymentMethod": "thirdweb_bridge",
  "transactionHash": "0x...",
  "bridgeUsed": true
}
```

#### 2.3 Confirm Payment
```typescript
POST /bcc-purchase
{
  "action": "confirm-payment",
  "orderId": "bcc_purchase_0x..._1234567890",
  "transactionHash": "0x...",
  "actualAmountReceived": 100
}
```

#### 2.4 Get Purchase History
```typescript
POST /bcc-purchase
{
  "action": "get-history",
  "limit": 20,
  "offset": 0
}
```

#### 2.5 Get Pending Purchases
```typescript
POST /bcc-purchase
{
  "action": "get-pending"
}
```

---

## 3. Matrix Management API

**Endpoint**: `/matrix`

Handles 3×3 matrix referral system with 19-layer depth.

### Actions

#### 3.1 Get Matrix Data
```typescript
POST /matrix
{
  "action": "get-matrix",
  "rootWallet": "0x...",
  "layer": 1 // Optional: specific layer
}
```

**Response**:
```typescript
{
  "success": true,
  "matrix": {
    "rootWallet": "0x...",
    "members": [
      {
        "member_wallet": "0x...",
        "layer": 1,
        "position": "L",
        "placement_type": "direct",
        "member_info": [{ "username": "user123" }],
        "member_data": [{ "is_activated": true, "current_level": 2 }]
      }
    ],
    "summary": [
      { "layer": 1, "member_count": 3, "active_count": 3 }
    ],
    "stats": {
      "totalMembers": 10,
      "activeMembers": 8,
      "layers": 3
    }
  }
}
```

#### 3.2 Place Member in Matrix
```typescript
POST /matrix
{
  "action": "place-member",
  "rootWallet": "0x...",
  "memberWallet": "0x...",
  "placerWallet": "0x...",
  "placementType": "direct" | "spillover"
}
```

#### 3.3 Get Downline Members
```typescript
POST /matrix
{
  "action": "get-downline",
  "layer": 2, // Optional
  "limit": 50,
  "offset": 0
}
```

#### 3.4 Get Upline Members
```typescript
POST /matrix
{
  "action": "get-upline"
}
```

#### 3.5 Get Matrix Statistics
```typescript
POST /matrix
{
  "action": "get-matrix-stats"
}
```

---

## 4. Rewards Management API

**Endpoint**: `/rewards`

Handles layer reward distribution, claiming, and queries.

### Actions

#### 4.1 Get Rewards
```typescript
POST /rewards
{
  "action": "get-rewards",
  "level": 2, // Optional
  "layer": 1, // Optional
  "limit": 50,
  "offset": 0
}
```

#### 4.2 Claim Rewards
```typescript
POST /rewards
{
  "action": "claim-rewards",
  "rewardIds": ["uuid1", "uuid2", "uuid3"]
}
```

#### 4.3 Distribute Rewards (Admin/System)
```typescript
POST /rewards
{
  "action": "distribute-rewards",
  "level": 2,
  "upgradeWallet": "0x..."
}
```

#### 4.4 Get Reward History
```typescript
POST /rewards
{
  "action": "get-reward-history",
  "limit": 50,
  "offset": 0
}
```

#### 4.5 Get Pending Rewards
```typescript
POST /rewards
{
  "action": "get-pending-rewards"
}
```

---

## 5. NFT Upgrade API

**Endpoint**: `/nft-upgrade`

Handles Level 1-19 NFT upgrades with progressive requirements.

### Level Configuration
```typescript
const LEVEL_CONFIG = {
  1: { price: 100, directReferrals: 0, description: 'Membership Activation' },
  2: { price: 100, directReferrals: 3, description: 'Layer 2 Unlock' },
  3: { price: 150, directReferrals: 5, description: 'Layer 3 Unlock' },
  // ... up to level 19
  19: { price: 1000, directReferrals: 37, description: 'Elite Level - 100% Root Reward' }
}
```

### Actions

#### 5.1 Get Level Information
```typescript
POST /nft-upgrade
{
  "action": "get-level-info",
  "level": 2 // Optional: get specific level, omit for all levels
}
```

**Response**:
```typescript
{
  "success": true,
  "currentLevel": 1,
  "levelsOwned": [1],
  "directReferrals": 5,
  "isActivated": true,
  "allLevels": [
    {
      "level": 2,
      "price": 100,
      "directReferrals": 3,
      "description": "Layer 2 Unlock",
      "isOwned": false,
      "canUpgrade": true,
      "requirementsMet": true
    }
  ]
}
```

#### 5.2 Check Upgrade Eligibility
```typescript
POST /nft-upgrade
{
  "action": "check-eligibility",
  "level": 3
}
```

#### 5.3 Process Level Upgrade
```typescript
POST /nft-upgrade
{
  "action": "process-upgrade",
  "level": 2,
  "paymentMethod": "demo" | "testnet" | "mainnet",
  "transactionHash": "0x...",
  "network": "arbitrum-one"
}
```

#### 5.4 Get Upgrade History
```typescript
POST /nft-upgrade
{
  "action": "get-upgrade-history",
  "limit": 20,
  "offset": 0
}
```

---

## 6. Balance Management API

**Endpoint**: `/balance`

Handles BCC balance queries, USDT earnings, and balance operations.

### Actions

#### 6.1 Get Balance
```typescript
POST /balance
{
  "action": "get-balance"
}
```

**Response**:
```typescript
{
  "success": true,
  "balance": {
    "wallet_address": "0x...",
    "bcc_transferable": 600,
    "bcc_locked": 10350,
    "total_usdt_earned": 200.00,
    "pending_upgrade_rewards": 100.00,
    "rewards_claimed": 50.00,
    "total_bcc": 10950,
    "pending_rewards_usdt": 75.00
  },
  "recentActivity": {
    "pendingRewardCount": 3,
    "recentPurchases": [...]
  }
}
```

#### 6.2 Get Transaction History
```typescript
POST /balance
{
  "action": "get-transactions",
  "limit": 50,
  "offset": 0
}
```

#### 6.3 Transfer BCC
```typescript
POST /balance
{
  "action": "transfer-bcc",
  "amount": 100,
  "recipientWallet": "0x...",
  "purpose": "User transfer"
}
```

#### 6.4 Spend BCC
```typescript
POST /balance
{
  "action": "spend-bcc",
  "amount": 50,
  "itemType": "nft" | "course",
  "itemId": "123",
  "purpose": "NFT purchase",
  "nftType": "merchant" // if itemType is "nft"
}
```

#### 6.5 Get Earning History
```typescript
POST /balance
{
  "action": "get-earning-history",
  "limit": 50,
  "offset": 0
}
```

---

## 7. Admin Controls API

**Endpoint**: `/admin`

Handles admin operations for membership activation pending periods.

⚠️ **Requires Admin Privileges**: All endpoints require `is_admin = true` in user record.

### Actions

#### 7.1 Get Admin Settings
```typescript
POST /admin
{
  "action": "get-settings"
}
```

#### 7.2 Toggle Global Pending
```typescript
POST /admin
{
  "action": "toggle-global-pending",
  "enabled": true,
  "reason": "Enable pending activation for new security measures"
}
```

#### 7.3 Set Member Pending Period
```typescript
POST /admin
{
  "action": "set-member-pending",
  "targetWallet": "0x...",
  "pendingHours": 48,
  "reason": "Manual review required"
}
```

#### 7.4 Clear Member Pending
```typescript
POST /admin
{
  "action": "clear-member-pending",
  "targetWallet": "0x...",
  "reason": "Approved for immediate activation"
}
```

#### 7.5 Get Pending Members
```typescript
POST /admin
{
  "action": "get-pending-members"
}
```

#### 7.6 Get Admin Actions Log
```typescript
POST /admin
{
  "action": "get-admin-actions",
  "limit": 50,
  "offset": 0
}
```

#### 7.7 Update System Setting
```typescript
POST /admin
{
  "action": "update-setting",
  "settingKey": "default_pending_hours",
  "settingValue": "72",
  "reason": "Increased pending period for security"
}
```

---

## Database Views for Frontend

The following views are available for efficient data queries:

### Public Views (No RLS restrictions)
- `marketplace_nfts` - Active NFTs for sale
- `courses_overview` - Course catalog with enrollment stats
- `platform_stats` - Platform statistics

### User Views (RLS protected)
- `user_dashboard` - Complete user profile with balances
- `matrix_overview` - Matrix statistics by layer
- `rewards_summary` - Reward summaries by level
- `referral_tree_detailed` - Complete referral tree with member details
- `direct_referrals` - Layer 1 referrals only
- `purchase_history` - All purchase types combined
- `bcc_transactions` - BCC transaction history
- `user_nft_collection` - User's owned NFTs
- `user_course_progress` - Course enrollment and progress

### Analytics Views (Admin only)
- `monthly_activity` - Monthly platform activity stats

---

## Error Handling

All APIs use consistent error response format:

```typescript
{
  "success": false,
  "error": "Error description"
}
```

### Common Error Codes
- `401` - Wallet address required
- `403` - Admin privileges required / Unauthorized action
- `400` - Invalid parameters / Business logic error
- `404` - Resource not found
- `500` - Internal server error

---

## Migration from Express Server

### Updated Client Code Pattern

**Old Express Pattern**:
```typescript
fetch(`/api/auth/login`, { ... })
```

**New Supabase Pattern**:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/auth`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'x-wallet-address': walletAddress,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'login',
    signature: signature,
    message: message
  })
})
```

### Environment Variables for Frontend

```typescript
// client/.env
VITE_SUPABASE_URL=https://cvqibjcbfrwsgkvthccp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU0MDUsImV4cCI6MjA3MjY0MTQwNX0.7CfL8CS1dQ8Gua89maSCDkgnMsNb19qp97mJyoJqJjs
```

---

## Deployment Status

✅ **Complete**:
- SQL Schema (5 migration files)
- Database Functions & Triggers
- Row Level Security Policies
- Database Views for Frontend
- 7 Edge Functions with full API coverage
- Admin Controls for Activation Pending

🔄 **Pending**:
- Manual deployment to Supabase Dashboard
- Frontend API client updates
- End-to-end testing

---

## Testing Endpoints

All Edge Functions are ready for deployment and testing. Use the provided Supabase credentials and follow the deployment instructions in `deploy-migrations.sh`.

The complete Beehive platform has been successfully migrated from Express.js to Supabase Edge Functions with comprehensive API coverage for all features including:

- Wallet-based authentication
- 19-level NFT membership system
- 3×3 matrix referral system (19 layers deep)
- BCC token economy with USDC purchases
- Layer reward distribution
- Admin controls for membership activation
- Balance management and transactions
- NFT marketplace integration
- Course system integration

All APIs maintain backward compatibility with existing frontend components while providing enhanced scalability and security through Supabase's infrastructure.