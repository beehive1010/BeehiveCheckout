# Database Integration Complete - PayEmbed System

## ✅ Status: Connected to Production Database

The PayEmbed membership system is now **fully integrated** with the actual Supabase database structure.

---

## 📊 Database Tables & Views Used

### Core Tables

#### 1. `users` Table
- **Purpose**: Store registered user information
- **Key Fields**:
  - `wallet_address` (VARCHAR(42)) - Primary key
  - `username` - Display name
  - `referrer_wallet` - Who referred this user
  - `created_at` - Registration timestamp

#### 2. `members` Table
- **Purpose**: Track membership activation and levels
- **Key Fields**:
  - `wallet_address` (VARCHAR(42))
  - `current_level` (INTEGER) - 0-19
  - `activation_sequence` - Activation order
  - `referrer_wallet` - Original referrer

#### 3. `referrals` Table
- **Purpose**: Track direct referral relationships
- **Key Fields**:
  - `referrer_wallet` (VARCHAR(42))
  - `member_wallet` (VARCHAR(42))
  - `is_direct_referral` (BOOLEAN) - **Critical filter**
  - `placed_at` (TIMESTAMP)

#### 4. `membership` Table
- **Purpose**: Track NFT ownership by level
- **Key Fields**:
  - `wallet_address` (VARCHAR(42))
  - `nft_level` (INTEGER) - 1-19
  - `unlock_membership_level`

### Database Views

#### 1. `direct_referral_sequence` View
```sql
CREATE OR REPLACE VIEW direct_referral_sequence AS
WITH referral_seq AS (
  SELECT
    r.referrer_wallet,
    r.member_wallet,
    r.placed_at,
    ROW_NUMBER() OVER (PARTITION BY r.referrer_wallet ORDER BY r.placed_at) AS referral_number
  FROM referrals r
  WHERE r.is_direct_referral = true  -- Only direct referrals!
)
SELECT
  referrer_wallet,
  member_wallet,
  placed_at,
  referral_number,
  CASE
    WHEN referral_number <= 2 THEN 1
    ELSE 2
  END AS required_level
FROM referral_seq rs;
```

**Purpose**: Tracks direct referrals in order, determines Level 2 eligibility

#### 2. `v_member_overview` View
**Purpose**: Comprehensive member data including current level and stats

#### 3. `v_reward_overview` View
**Purpose**: Reward tracking and balance calculations

---

## 🔧 Frontend Integration Points

### 1. Direct Referral Count Service
**File**: `src/lib/services/directReferralService.ts`

**Key Function**: `getDirectReferralCount()`
```typescript
export async function getDirectReferralCount(referrerWallet: string): Promise<number> {
  const { count } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .ilike('referrer_wallet', referrerWallet)  // Case-insensitive!
    .eq('is_direct_referral', true);           // Only direct referrals!

  return count || 0;
}
```

**Critical Points**:
- ✅ Uses `.ilike()` for case-insensitive wallet matching
- ✅ Filters by `is_direct_referral = true`
- ✅ Matches `direct_referral_sequence` view logic

### 2. User Registration Check
**Component**: `ClaimMembershipNFTButton.tsx`

**Edge Function**: `/auth` with action `get-user`
```typescript
const response = await fetch(`${API_BASE}/auth`, {
  method: 'POST',
  headers: { 'x-wallet-address': account.address },
  body: JSON.stringify({ action: 'get-user' }),
});

const userStatus = await response.json();
// Returns: { isRegistered, membershipLevel, ... }
```

### 3. Membership Activation
**Page**: `MembershipPurchase.tsx`

**Edge Functions**:
- Level 1: `activate-membership`
- Level 2+: `level-upgrade`

```typescript
await fetch(`${API_BASE}/${activationEndpoint}`, {
  method: 'POST',
  body: JSON.stringify({
    walletAddress: account.address,
    level,
    transactionHash: txHash,
    referrerWallet,
  }),
});
```

**Database Operations**:
1. Create/update `members` record
2. Create `membership` record for NFT level
3. Create `referrals` record (if new referral)
4. Create `rewards` records (direct + layer rewards)
5. Place in matrix (`matrix_referrals` table)

---

## 🔐 RLS Policies Applied

**Migration**: `20250108000001_fix_rls_policies_for_members.sql`

```sql
-- Allow public read access to members table
CREATE POLICY "Allow read access to members"
ON members FOR SELECT TO public USING (true);

-- Allow public read access to referrals table
CREATE POLICY "Allow read access to referrals"
ON referrals FOR SELECT TO public USING (true);

-- Grant permissions to views
GRANT SELECT ON v_reward_overview TO anon, authenticated;
GRANT SELECT ON v_member_overview TO anon, authenticated;
```

**Why**: Frontend needs to query user status, referral counts, and membership levels without authentication.

---

## 📝 Case Sensitivity Handling

### Problem
Wallet addresses in database may be stored with **mixed case** (e.g., `0x479ABda...`), but user wallets may provide lowercase or checksum format.

### Solution
Use **`.ilike()`** instead of **`.eq()`** for all wallet address queries:

```typescript
// ❌ Wrong (case-sensitive)
.eq('wallet_address', walletAddress.toLowerCase())

// ✅ Correct (case-insensitive)
.ilike('wallet_address', walletAddress)
```

**Applied to**:
- ✅ `directReferralService.ts` - All referral queries
- ✅ `Membership.tsx` - User referrer lookup
- ✅ All member data queries

---

## 🎯 Level 2 Requirements

### Database Logic
```sql
SELECT COUNT(*) FROM referrals
WHERE referrer_wallet ILIKE '0x...'
AND is_direct_referral = true;
```

### Frontend Validation
**Component**: `ClaimMembershipNFTButton.tsx`

```typescript
// Level 2 special requirement
if (level === 2 && directReferralsCount < 3) {
  return { can: false, reason: 'needs_referrals', needed: 3 - directReferralsCount };
}
```

**UI Display**:
```typescript
{directReferralsCount >= 3 ? (
  <span className="text-emerald-600">✅ {directReferralsCount}/3+ referrals</span>
) : (
  <span className="text-orange-600">⚠️ Need {3 - directReferralsCount} more</span>
)}
```

---

## 🔄 Complete Data Flow

### Welcome2 / Membership2 Pages

```
1. User connects wallet
   ↓
2. Query user status (auth Edge Function)
   - Tables: users, members
   - Returns: isRegistered, membershipLevel
   ↓
3. Query direct referrals count
   - Table: referrals
   - Filter: is_direct_referral = true
   - Uses: .ilike() for case-insensitive match
   ↓
4. Display levels with status:
   - Owned (current level)
   - Available (next level, meets requirements)
   - Needs Referrals (Level 2, < 3 referrals)
   - Locked (future levels)
   ↓
5. User selects level → clicks Claim button
   ↓
6. ClaimMembershipNFTButton validation:
   - Check registration ✓
   - Check sequential upgrade ✓
   - Check Level 2 referrals (if applicable) ✓
   - Approve USDT (if needed) ✓
   ↓
7. Navigate to /membership-purchase
   ↓
8. PayEmbed payment flow
   ↓
9. Transaction confirmation
   ↓
10. Edge Function activation
    - Creates database records:
      * members (if new)
      * membership (NFT level)
      * referrals (if has referrer)
      * rewards (direct + layer)
      * matrix_referrals (placement)
   ↓
11. Redirect to /dashboard
    ✅ Complete!
```

---

## 🧪 Testing Queries

### Test Direct Referral Count
```sql
SELECT COUNT(*)
FROM referrals
WHERE referrer_wallet ILIKE '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
AND is_direct_referral = true;
-- Result: 3 referrals
```

### Test Direct Referral Sequence View
```sql
SELECT *
FROM direct_referral_sequence
WHERE referrer_wallet ILIKE '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';
-- Returns ordered list with referral_number and required_level
```

### Test Member Status
```sql
SELECT
  m.wallet_address,
  m.current_level,
  m.referrer_wallet,
  u.username
FROM members m
LEFT JOIN users u ON m.wallet_address = u.wallet_address
WHERE m.wallet_address ILIKE '0x380Fd6A5...'
LIMIT 1;
```

---

## 🎨 UI Components Using Database

### `BeehiveMembershipClaimList.tsx`
**Queries**:
1. User status → `auth` Edge Function
2. Direct referrals → `directReferralService.getDirectReferralCount()`

**Data Usage**:
- Current level → Card highlighting
- Direct referral count → Level 2 gate display
- Registration status → Show/hide claim buttons

### `ClaimMembershipNFTButton.tsx`
**Queries**:
1. Registration check → `auth` Edge Function
2. Direct referral validation → Props from parent

**Logic**:
- Sequential upgrade validation
- Level 2 referral requirement check
- USDT approval handling
- Purchase page navigation

### `MembershipPurchase.tsx`
**Queries**:
1. Transaction status polling → Thirdweb API
2. Activation call → `activate-membership` / `level-upgrade` Edge Function

**Database Updates** (via Edge Function):
- Insert `members` record
- Insert `membership` record
- Insert `referrals` record (if applicable)
- Insert `rewards` records
- Insert `matrix_referrals` placement

---

## ✅ Verification Checklist

- [x] Direct referral count queries use `is_direct_referral = true`
- [x] All wallet queries use `.ilike()` for case-insensitive matching
- [x] User status check via `auth` Edge Function
- [x] Level 2 requires 3+ direct referrals
- [x] Sequential upgrade validation
- [x] RLS policies allow public read access
- [x] Edge Functions create all required database records
- [x] PayEmbed transaction → database activation flow complete
- [x] Build successful with no errors

---

## 📚 Related Files

### Frontend
- `src/lib/services/directReferralService.ts` - Direct referral queries
- `src/components/membership/claim/BeehiveMembershipClaimList.tsx` - Main list component
- `src/components/membership/claim/ClaimMembershipNFTButton.tsx` - Claim button with validation
- `src/pages/Welcome2.tsx` - Level 1 activation page
- `src/pages/Membership2.tsx` - Level 2-19 upgrade page
- `src/pages/MembershipPurchase.tsx` - PayEmbed payment page

### Backend (Supabase)
- `supabase/migrations/20250108000001_fix_rls_policies_for_members.sql` - RLS policies
- `supabase/functions/auth/index.ts` - User registration/status check
- `supabase/functions/activate-membership/index.ts` - Level 1 activation
- `supabase/functions/level-upgrade/index.ts` - Level 2+ upgrades

### Database
- `sql/create_correct_referral_views.sql` - Referral views definition
- Tables: `users`, `members`, `referrals`, `membership`, `rewards`, `matrix_referrals`

---

## 🎉 Summary

The PayEmbed membership system is **fully connected** to the production Supabase database:

✅ **Case-insensitive wallet queries** - Using `.ilike()` throughout
✅ **Direct referral tracking** - Filtering by `is_direct_referral = true`
✅ **Level 2 requirements** - Validating 3+ direct referrals
✅ **RLS policies** - Public read access configured
✅ **Edge Functions** - Complete activation flow
✅ **Database views** - Using `direct_referral_sequence` view logic
✅ **Build successful** - No errors

**Ready for production testing!** 🚀
