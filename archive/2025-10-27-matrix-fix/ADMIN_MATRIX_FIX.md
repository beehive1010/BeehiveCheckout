# Admin Matrix Page Fix

**Date**: 2025-10-18
**Issue**: Column 'referrals.member_wallet' does not exist

---

## Problem

AdminMatrix page was querying the wrong table (`referrals` instead of `matrix_referrals`), causing database errors:

```
❌ Error loading matrix data:
{code: '42703', message: 'column referrals.member_wallet does not exist'}
```

---

## Root Cause

The `referrals` table has a different structure focused on simple referral relationships:
- `referred_wallet` - Person who was referred
- `referrer_wallet` - Person who made the referral
- `referral_depth` - Depth in referral tree

The `matrix_referrals` table has the matrix placement structure:
- `member_wallet` - Member in the matrix
- `matrix_root_wallet` - Root of the matrix
- `layer` - Layer number
- `position` - Position (L/M/R)
- `referral_type` - Type of referral
- `source` - Source of placement

---

## Fix Applied

### File: `src/pages/admin/AdminMatrix.tsx`

**Changed Table Name**:
```tsx
// Before
.from('referrals')

// After
.from('matrix_referrals')
```

**Column Mapping**:
```tsx
// Before
matrix_layer
matrix_position
member_activation_sequence
is_direct_referral
is_spillover_placement
placed_at

// After
layer
position
memberSequenceMap.get(matrix.member_wallet)  // Query from members table
referral_type === 'direct'
source === 'spillover' || referral_type === 'spillover'
created_at
```

**Query Changes**:
```tsx
const { data: matrixData } = await supabase
  .from('matrix_referrals')  // Changed from 'referrals'
  .select(`
    member_wallet,
    matrix_root_wallet,
    layer,              // Changed from matrix_layer
    position,           // Changed from matrix_position
    referral_type,      // New field
    source,             // New field
    created_at          // Changed from placed_at
  `)
  .order('created_at', { ascending: true });

// Added direct query for member sequences
const { data: membersData } = await supabase
  .from('members')
  .select('wallet_address, activation_sequence');
```

---

## Result

✅ AdminMatrix page now loads successfully
✅ Matrix data displays correctly
✅ Member sequences properly mapped
✅ Direct referrals vs spillover correctly identified
✅ No more database column errors

---

## Testing Checklist

- [x] Page loads without errors
- [x] Matrix relationships display
- [x] Member data loads (1000 members)
- [x] Matrix statistics calculate correctly
- [x] Layer information shows correctly (L/M/R positions)
- [x] Direct vs spillover placement identified
- [x] Export CSV works

---

## Database Tables Used

1. **matrix_referrals** - Main matrix placement data
2. **members** - Member activation sequences
3. **users** - Username mappings

---

**Status**: ✅ Fixed and Verified
