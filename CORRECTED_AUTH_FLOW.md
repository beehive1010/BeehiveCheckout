# Beehive Platform - Corrected Authentication Flow

## Dual Authentication System

### User Types:
1. **Non-members** - Cannot access referral system
2. **Members** - Can access referral system  
3. **Special Members** - Can have pending time activated (temporarily blocks referrals)

## Step-by-Step Flow

### Step 1: User Connects Wallet
- InAppWallet modal with all authentication options
- System captures wallet address + referrer from URL

### Step 2: User Completes Supabase Auth
- **Traditional Supabase authentication** (email/password, social login)
- **NOT InAppWallet authentication** - separate traditional auth
- System links Supabase user to wallet address

### Step 3: Dual Authentication Check
- **Both required**: Wallet connected + Supabase authenticated
- System calls `supabaseApi.getUser()` to check status

### Step 4: Routing Logic

```typescript
// Web3Context.tsx routing logic
const checkMembershipStatus = async () => {
  // Require BOTH wallet + Supabase auth
  if (!account?.address || !isSupabaseAuthenticated) {
    return // Wait for both
  }
  
  const result = await supabaseApi.getUser(walletAddress)
  
  if (!result.user) {
    route → '/welcome' // Not registered
    return
  }
  
  if (!result.isMember) {
    route → '/welcome' // Not a member, can't access referrals
    return
  }
  
  // User is a member
  route → '/dashboard' // Full access
}
```

## User States & Routing

### 1. No Wallet Connected
```
Wallet: ❌ Not connected
Supabase: ❌ Not authenticated
Action: User needs to connect wallet
Route: Landing page
```

### 2. Wallet Only
```
Wallet: ✅ Connected  
Supabase: ❌ Not authenticated
Action: User needs Supabase authentication
Route: Register/Login page
```

### 3. Supabase Only
```
Wallet: ❌ Not connected
Supabase: ✅ Authenticated  
Action: User needs to connect wallet
Route: Connect wallet page
```

### 4. Both Connected, Not Member
```
Wallet: ✅ Connected
Supabase: ✅ Authenticated
Member: ❌ member_activated = false
Referrals: ❌ Cannot access
Action: Claim membership
Route: /welcome
```

### 5. Member, Active
```
Wallet: ✅ Connected
Supabase: ✅ Authenticated
Member: ✅ member_activated = true
Pending: ❌ No pending time
Referrals: ✅ Full access
Route: /dashboard
```

### 6. Member, Pending Active
```
Wallet: ✅ Connected
Supabase: ✅ Authenticated  
Member: ✅ member_activated = true
Pending: ⏳ pending_enabled = true, pending_until > now
Referrals: ❌ Temporarily blocked
Route: /dashboard (with pending notice)
```

## Referral System Access

### Rules:
- **Only members** can access referral system
- **Pending blocks referrals** temporarily
- **Non-members cannot participate** in referrals

### Access Check:
```typescript
const canAccessReferrals = result.isMember && !result.isPending
```

## Pending System (Special Users)

### Purpose:
Some special users can have pending time activated to temporarily block their referral access.

### API Methods:
```typescript
// Activate pending for 48 hours
await supabaseApi.togglePending(walletAddress, true, 48)

// Deactivate pending  
await supabaseApi.togglePending(walletAddress, false)

// Check pending status
await supabaseApi.checkPending(walletAddress)
```

### Database Fields:
```sql
-- users table additions
pending_enabled: boolean
pending_until: timestamp
```

## API Response Structure

### supabaseApi.getUser() Response:
```typescript
{
  success: true,
  user: {
    wallet_address: '0x...',
    referrer_wallet: '0x...',
    member_activated: boolean,
    current_level: number | null,
    pending_enabled: boolean,
    pending_until: string | null
  },
  isRegistered: boolean,
  isMember: boolean,           // member_activated
  canAccessReferrals: boolean, // isMember && !isPending
  isPending: boolean,          // pending active right now
  pendingUntil: string | null  // when pending expires
}
```

## Key Differences from Previous Versions

✅ **Dual authentication required** (Wallet + Supabase Auth)  
✅ **Member-only referrals** (non-members excluded)  
✅ **Pending system** for special user management  
✅ **Traditional Supabase Auth** (not InAppWallet auth)  
✅ **Clear routing logic** based on both auth states  
✅ **Member status controls access** to referral features  

## Authentication Methods

### For Wallet Connection:
- InAppWallet (email, social, external wallets, guest mode)

### For Traditional Auth:
- Supabase Auth (email/password, social login providers)

This creates a **dual-gate system** where users need both wallet AND traditional account to access member features, but only members can participate in the referral system.