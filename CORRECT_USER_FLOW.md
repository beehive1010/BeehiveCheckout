# Beehive Platform - Correct User Flow

## Authentication & Membership Flow

### Step 1: User Connects Wallet
- User visits platform (optionally with referral URL: `?ref=0x...`)
- User clicks "Connect Wallet"
- **InAppWallet modal opens** with all authentication options:
  - 📧 Email 
  - 🌐 Google, Apple, Facebook, Discord, etc.
  - 💻 "Use Wallet" → MetaMask, WalletConnect, etc.
  - 👤 Guest mode
- User chooses any method → Gets wallet address

### Step 2: System Records User Data
- System captures wallet address from InAppWallet
- System captures referrer from URL parameter (`?ref=0x...`)
- System calls `supabaseApi.register()` to create user record:
  ```typescript
  {
    wallet_address: '0x...',
    referrer_wallet: '0x...' || null,
    username: null, // From InAppWallet if available
    email: null, // From InAppWallet if available
    current_level: null, // No level initially
    member_activated: false, // Not a member yet
  }
  ```

### Step 3: User Status Check
- System calls `supabaseApi.getUser()` to check user status
- **Three possible states:**
  1. **Not Registered**: User record doesn't exist → Create record
  2. **Registered, Not Member**: `member_activated = false` → Go to Welcome
  3. **Registered, Is Member**: `member_activated = true` → Go to Dashboard

### Step 4: Routing Logic
```typescript
if (user.member_activated === true) {
  // User has claimed membership
  route → '/dashboard'
  level = user.current_level (1-19)
} else {
  // User needs to claim membership
  route → '/welcome' 
  level = null
}
```

### Step 5: Claim Membership (Welcome Page)
- User clicks "Claim Membership"
- System calls `supabaseApi.claimNFT()` 
- **Membership activation:**
  ```typescript
  {
    member_activated: true,
    current_level: 1, // Becomes Level 1 member
    activated_at: timestamp
  }
  ```
- User is now a **Level 1 member** → Redirect to Dashboard

## User States

### 1. New User (Not Connected)
```
Wallet: ❌ Not connected
Registration: ❌ No record
Membership: ❌ No level
Action: Connect wallet
```

### 2. Connected, Not Registered
```  
Wallet: ✅ Connected
Registration: ❌ No record  
Membership: ❌ No level
Action: Auto-register → Go to Welcome
```

### 3. Connected, Registered, Not Member
```
Wallet: ✅ Connected
Registration: ✅ Has record
Membership: ❌ member_activated = false
Action: Go to Welcome (claim membership)
```

### 4. Connected, Registered, Is Member
```
Wallet: ✅ Connected  
Registration: ✅ Has record
Membership: ✅ member_activated = true, current_level = 1-19
Action: Go to Dashboard
```

## Database Schema

### users table
```sql
- wallet_address (primary key)
- referrer_wallet (nullable)
- username (nullable)
- email (nullable) 
- current_level (nullable, 1-19 after claiming membership)
- member_activated (boolean, false by default)
- activated_at (timestamp, when membership claimed)
- created_at, updated_at
```

### Additional Features

#### Countdown Timers
- Users can have active/inactive countdown timers
- Managed via `get-countdowns` and `create-countdown` actions
- Timer status affects user privileges/access

#### Referral System
- Captured from URL: `?ref=0x123...`
- Stored in `referrer_wallet` field
- Used for referral tree/matrix building
- Processed via `create-referral-link` and `process-referral-link` actions

## Key Differences from Before

✅ **InAppWallet handles ALL authentication** (no separate Supabase Auth needed)
✅ **Users have no level initially** (null until membership claimed)  
✅ **Simple boolean for membership** (`member_activated` field)
✅ **Level progression starts after claiming** (Level 1 → 2 → 3... → 19)
✅ **Referrals tracked via URL parameters** (not separate auth flow)
✅ **Countdown timers are optional features** (can be on/off per user)

This flow is much simpler and matches your actual requirements!