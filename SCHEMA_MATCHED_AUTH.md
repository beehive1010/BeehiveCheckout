# Schema-Matched Authentication Flow

## Database Schema Reality

Based on your actual migration file `001_initial_schema.sql`:

### Tables Structure:
```sql
-- users table (basic user info)
users {
  wallet_address (PK),
  referrer_wallet,
  username,
  email, 
  current_level (0 = no level),
  is_upgraded (boolean),
  upgrade_timer_enabled (boolean) -- acts as "pending"
}

-- members table (membership status)  
members {
  wallet_address (PK, FK to users),
  is_activated (boolean), -- TRUE = can access referrals
  current_level (0-19),
  levels_owned (JSONB array),
  has_pending_rewards (boolean)
}

-- user_balances table (BCC tokens)
user_balances {
  wallet_address (PK, FK to users),
  bcc_transferable,
  bcc_locked,
  total_usdt_earned
}
```

## Updated Auth Function Logic

### 1. User Registration (`register` action):
```typescript
// Creates records in 3 tables:
- users (basic info)
- members (is_activated = false)  
- user_balances (all zeros)
```

### 2. Get User (`get-user` action):
```typescript
// Returns joined data with proper member status:
{
  user: userData,
  isMember: members.is_activated,
  isPending: users.upgrade_timer_enabled, 
  canAccessReferrals: isMember && !isPending
}
```

### 3. Activate Membership (`activate-membership` action):
```typescript
// Updates members table:
members.is_activated = true
members.activated_at = now()
```

### 4. Toggle Pending (`toggle-pending` action):
```typescript  
// Updates users table:
users.upgrade_timer_enabled = true/false
// When true = blocks referral access
```

## User States & Referral Access

### State 1: Not Registered
```
users: ❌ No record
members: ❌ No record
Referrals: ❌ Cannot access
```

### State 2: Registered, Not Member
```
users: ✅ Has record
members: ✅ is_activated = false
Referrals: ❌ Cannot access (not activated)
```

### State 3: Active Member
```
users: ✅ Has record  
members: ✅ is_activated = true
users.upgrade_timer_enabled: false
Referrals: ✅ Full access
```

### State 4: Member with Pending Active
```
users: ✅ Has record
members: ✅ is_activated = true  
users.upgrade_timer_enabled: true
Referrals: ❌ Temporarily blocked
```

## API Response Structure

### supabaseApi.getUser() returns:
```typescript
{
  success: true,
  user: {
    wallet_address: "0x...",
    referrer_wallet: "0x..." | null,
    username: string | null,
    current_level: 0-19,
    upgrade_timer_enabled: boolean,
    members: [{
      is_activated: boolean,
      current_level: 0-19,
      levels_owned: number[]
    }],
    user_balances: [{
      bcc_transferable: number,
      bcc_locked: number
    }]
  },
  isRegistered: boolean,
  isMember: boolean,              // from members.is_activated
  canAccessReferrals: boolean,    // isMember && !isPending
  isPending: boolean,             // from users.upgrade_timer_enabled
  memberData: object | null
}
```

## Key Schema Mappings

| Concept | Database Field |
|---------|---------------|
| User exists | `users.wallet_address` exists |
| Is member | `members.is_activated = true` |
| Pending active | `users.upgrade_timer_enabled = true` |
| Current level | `members.current_level` (0-19) |
| Referral access | `isMember && !isPending` |

## Web3Context Integration

```typescript
const checkMembershipStatus = async () => {
  // Requires both wallet + Supabase auth
  if (!account?.address || !isSupabaseAuthenticated) return
  
  const result = await supabaseApi.getUser(walletAddress)
  
  if (result.isMember) {
    route → '/dashboard' 
    // Note: canAccessReferrals tells if referrals work
  } else {
    route → '/welcome' // Activate membership  
  }
}
```

## Level Progression Flow

1. **User registers** → `members.is_activated = false`, `current_level = 0`
2. **User activates** → `members.is_activated = true`, still `current_level = 0`  
3. **User upgrades** → Use `nft-upgrade` function → `members.current_level = 1+`
4. **Special users** → Can have `users.upgrade_timer_enabled = true` to block referrals

This matches your actual database schema and eliminates the 500 errors!