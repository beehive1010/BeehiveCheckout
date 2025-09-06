# Beehive Platform - Final User Flow with NFT-Upgrades

## Complete Architecture

### Supabase Edge Functions:
1. **`auth`** - User registration, basic membership activation, referrals, countdowns
2. **`nft-upgrade`** - Level upgrades and membership progression (Level 1-19)
3. **`balance`** - BCC token management
4. **`matrix`** - Referral matrix operations
5. **`rewards`** - Reward distribution

## Step-by-Step User Journey

### Step 1: Connect Wallet
- User connects via **InAppWallet** (all auth methods available)
- System captures wallet address + referrer from URL

### Step 2: User Registration
- `supabaseApi.register()` → **auth function**
- Creates user record:
  ```typescript
  {
    wallet_address: '0x...',
    referrer_wallet: '0x...' || null,
    member_activated: false, // Not activated yet
    current_level: null // No level yet
  }
  ```

### Step 3: Check User Status
- `supabaseApi.getUser()` → **auth function**
- Returns user status and routing decision

### Step 4: Membership Flow

#### Option A: Free Activation (Basic Member)
- `supabaseApi.activateMembership()` → **auth function**
- Sets `member_activated: true` (but no level yet)
- User can access basic member features but has no NFT level

#### Option B: Purchase Level 1 (Full Member)
- `supabaseApi.upgradeToLevel(address, 1, 100, txHash)` → **nft-upgrade function**
- Calls `process_nft_purchase_with_requirements()` database function
- Sets `current_level: 1` and activates full membership
- Triggers reward distribution to referrers

### Step 5: Level Progression (1-19)
- `supabaseApi.upgradeToLevel(address, level, amount, txHash)` → **nft-upgrade function**
- Each level upgrade:
  - Validates payment
  - Updates user level
  - Distributes layer rewards
  - Activates new privileges

## User States

### 1. New User
```
Wallet: ❌ Not connected
Status: Need to connect wallet
```

### 2. Connected, Not Registered
```
Wallet: ✅ Connected
Registration: ❌ No record
Action: Auto-register via auth function
```

### 3. Registered, Not Activated
```
Wallet: ✅ Connected
Registration: ✅ Has record
Member: ❌ member_activated = false
Level: ❌ current_level = null
Action: Choose activation path
```

### 4. Activated, No Level (Basic Member)
```
Wallet: ✅ Connected
Registration: ✅ Has record
Member: ✅ member_activated = true
Level: ❌ current_level = null
Access: Basic member features only
Action: Purchase Level 1 via nft-upgrade function
```

### 5. Full Member (Level 1-19)
```
Wallet: ✅ Connected
Registration: ✅ Has record
Member: ✅ member_activated = true
Level: ✅ current_level = 1-19
Access: Full features based on level
Action: Upgrade to higher levels via nft-upgrade function
```

## Function Responsibilities

### Auth Function (`/functions/v1/auth`)
- `register` - Create user record
- `get-user` - Check user status
- `activate-membership` - Basic membership activation (no level)
- `create-referral-link` - Generate referral links
- `process-referral-link` - Handle referral claims
- `get-countdowns` / `create-countdown` - Timer management

### NFT-Upgrade Function (`/functions/v1/nft-upgrade`)
- Level purchases (1-19)
- Payment validation
- Reward distribution
- Level progression logic
- Calls `process_nft_purchase_with_requirements()` database function

## Routing Logic

```typescript
// In Web3Context.tsx
const checkMembershipStatus = async () => {
  const result = await supabaseApi.getUser(walletAddress)
  
  if (!result.user) {
    // User not registered
    route → '/welcome' (register)
    return
  }
  
  if (!result.user.member_activated) {
    // User registered but not activated
    route → '/welcome' (activate membership)
    return
  }
  
  if (!result.user.current_level) {
    // Basic member, no level
    route → '/upgrade' (purchase Level 1)
    return
  }
  
  // Full member with level
  route → '/dashboard'
}
```

## API Usage Examples

### Basic Flow:
```typescript
// 1. Register user
await supabaseApi.register(walletAddress, referrerWallet)

// 2. Activate basic membership
await supabaseApi.activateMembership(walletAddress)

// 3. Upgrade to Level 1
await supabaseApi.upgradeToLevel(walletAddress, 1, 100, txHash)
```

### Level Progression:
```typescript
// Upgrade from Level 1 to Level 2
await supabaseApi.upgradeToLevel(walletAddress, 2, 200, txHash)

// Upgrade to any level (1-19)
await supabaseApi.upgradeToLevel(walletAddress, targetLevel, amount, txHash)
```

## Benefits of This Architecture

✅ **Separation of Concerns**: Auth vs Level Management  
✅ **Flexible Membership**: Basic vs Full members  
✅ **Proper Level Progression**: Via dedicated nft-upgrade function  
✅ **Reward Distribution**: Handled by database procedures  
✅ **Countdown Timers**: Can be activated/deactivated per user  
✅ **Referral System**: Full matrix support with proper reward triggers  

This architecture properly separates user management from level progression while maintaining the correct reward distribution flow!