# Edge Functions Compatibility Report - Branch-First BFS Migration

## 📋 Overview

This report analyzes the compatibility of existing Edge Functions with the new **Branch-First BFS matrix placement system** and identifies required updates.

**Analyzed Functions:**
1. `activate-membership/index.ts` - Level 1 membership activation
2. `level-upgrade/index.ts` - Level 2-19 upgrades

**Report Date:** 2025-10-19
**Status:** ⚠️ **Updates Required**

---

## 🔴 Critical Issues Found

### Issue 1: Outdated Matrix Placement Function Call

**Location:** `activate-membership/index.ts:659-663`

**Current Code:**
```typescript
const { data: placementResult, error: placementError } = await supabase
  .rpc('place_new_member_in_matrix_correct', {
    p_member_wallet: walletAddress,
    p_referrer_wallet: normalizedReferrerWallet
  });
```

**Problem:**
- Uses **old function** `place_new_member_in_matrix_correct`
- This function will be **DROPPED** by migration `20251019000000_cleanup_old_matrix_system.sql`
- Will cause runtime errors after migration

**Impact:** 🔴 **CRITICAL** - Level 1 activations will fail completely

**Required Fix:**
```typescript
// ✅ NEW: Use Branch-First BFS placement function
const { data: placementResult, error: placementError } = await supabase
  .rpc('fn_place_member_branch_bfs', {
    p_member_wallet: walletAddress,
    p_referrer_wallet: normalizedReferrerWallet,
    p_activation_time: new Date().toISOString(),
    p_tx_hash: transactionHash || null
  });
```

**Return Value Changes:**
- Old function returns: `{ success, placements_created, deepest_layer, message }`
- New function returns: `{ success, message, matrix_root, parent_wallet, slot, layer, referral_type, entry_anchor, bfs_order }`

**Code Updates Required:**
- Update result handling logic (lines 673-681)
- Update success message formatting

---

### Issue 2: New Trigger Should Auto-Place Members

**Location:** `activate-membership/index.ts:648-699`

**Current Behavior:**
- Manually calls matrix placement function after creating members record

**New System Behavior:**
- Trigger `trg_member_activation_matrix_placement` (from `20251019000004_create_matrix_triggers.sql`)
- **Automatically places members** when `membership_status = 'active'`

**Recommendation:** 🟡 **OPTIONAL OPTIMIZATION**

Two approaches:

**Option A: Keep Manual Call (Safer for Now)**
- Pros: Explicit control, clearer error handling
- Cons: Redundant with trigger (but trigger is idempotent)

**Option B: Remove Manual Call (Trust Trigger)**
- Pros: Simpler code, single source of truth
- Cons: Less explicit error feedback

**Suggested Approach:** Keep manual call initially, remove after validating trigger works correctly in production.

---

### Issue 3: Matrix Placement Function Parameters

**Current Parameters:**
```typescript
rpc('place_new_member_in_matrix_correct', {
  p_member_wallet: string,
  p_referrer_wallet: string
})
```

**New Function Parameters:**
```typescript
rpc('fn_place_member_branch_bfs', {
  p_member_wallet: VARCHAR(42),
  p_referrer_wallet: VARCHAR(42),
  p_activation_time: TIMESTAMP DEFAULT NOW(),
  p_tx_hash: VARCHAR(66) DEFAULT NULL
})
```

**Additional Parameters:**
- `p_activation_time` - Should pass `memberRecord.activation_time` or `new Date().toISOString()`
- `p_tx_hash` - Should pass `transactionHash` if available (for audit trail)

---

## 🟢 Correctly Implemented Features

### ✅ Level 1 Direct Referral Rewards

**Location:** `activate-membership/index.ts:704-736`

**Code:**
```typescript
if (level === 1 && normalizedReferrerWallet && memberRecord) {
  const { data: directReward, error: directRewardError } = await supabase
    .rpc('trigger_direct_referral_rewards', {
      p_upgrading_member_wallet: walletAddress,
      p_new_level: 1,
      p_nft_price: 100  // Base price without platform fee
    });
}
```

**Status:** ✅ **CORRECT**
- Uses `trigger_direct_referral_rewards` for Level 1
- Only creates direct rewards (not layer rewards)
- Follows the business rule: Level 1 = direct rewards only

---

### ✅ Level 2-19 Matrix Layer Rewards

**Location:** `level-upgrade/index.ts:522-526` and `level-upgrade/index.ts:830-837`

**Code:**
```typescript
if (targetLevel >= 2 && targetLevel <= 19) {
  const { data, error } = await supabase.rpc('trigger_matrix_layer_rewards', {
    p_upgrading_member_wallet: walletAddress,
    p_new_level: targetLevel,
    p_nft_price: nftPrice
  });
}
```

**Status:** ✅ **CORRECT**
- Uses `trigger_matrix_layer_rewards` for Level 2-19 upgrades
- Creates layer rewards based on matrix position
- Follows business rule: Level 2+ = matrix layer rewards only

---

### ✅ Sequential Upgrade Validation

**Location:** `level-upgrade/index.ts:1005-1029`

**Code:**
```typescript
const expectedNextLevel = currentLevel + 1
const isSequential = targetLevel === expectedNextLevel

if (!isSequential) {
  return {
    success: false,
    message: `SEQUENTIAL UPGRADE REQUIRED: Must upgrade one level at a time.`
  }
}
```

**Status:** ✅ **CORRECT**
- Enforces sequential upgrades (Level 1 → 2 → 3...)
- Prevents level skipping

---

### ✅ Level 2 Direct Referrals Requirement

**Location:** `level-upgrade/index.ts:1082-1145`

**Code:**
```typescript
if (targetLevel === 2) {
  const { data: referralsStatsData } = await supabase
    .from('referrals_stats_view')
    .select('direct_referrals_count')
    .ilike('wallet_address', walletAddress)
    .maybeSingle()

  const requiredReferrals = 3
  if (directReferrals < requiredReferrals) {
    return { success: false, message: 'Level 2 requires 3 direct referrals' }
  }
}
```

**Status:** ✅ **CORRECT**
- Validates 3 direct referrals required for Level 2
- Follows business rules

---

## 📊 Rewards Logic Verification

### Level 1 Activation Rewards

| Action | Reward Type | Function | Table | Amount | Recipient |
|--------|------------|----------|-------|--------|-----------|
| Activate L1 | Direct Referral | `trigger_direct_referral_rewards` | `direct_rewards` | 10% of 100 USDC = 10 USDC | Direct referrer |

**Status:** ✅ **CORRECT**

---

### Level 2-19 Upgrade Rewards

| Level | Reward Type | Function | Table | Amount | Recipient |
|-------|------------|----------|-------|--------|-----------|
| 2 | Matrix Layer | `trigger_matrix_layer_rewards` | `layer_rewards` | 150 USDC | Matrix root at layer 2 |
| 3 | Matrix Layer | `trigger_matrix_layer_rewards` | `layer_rewards` | 200 USDC | Matrix root at layer 3 |
| 4-19 | Matrix Layer | `trigger_matrix_layer_rewards` | `layer_rewards` | Variable | Matrix root at corresponding layer |

**Status:** ✅ **CORRECT**

**Business Rule Verification:**
- ✅ Level 2 upgrade → Reward to matrix root who has member at layer 2
- ✅ Level 3 upgrade → Reward to matrix root who has member at layer 3
- ✅ Each upgrade only triggers ONE layer reward (to the matrix root at that specific layer)

---

## 🔧 Required Code Changes

### Change 1: Update Matrix Placement Function Call

**File:** `activate-membership/index.ts`

**Line:** 659-663

**Before:**
```typescript
const { data: placementResult, error: placementError } = await supabase
  .rpc('place_new_member_in_matrix_correct', {
    p_member_wallet: walletAddress,
    p_referrer_wallet: normalizedReferrerWallet
  });
```

**After:**
```typescript
const { data: placementResult, error: placementError } = await supabase
  .rpc('fn_place_member_branch_bfs', {
    p_member_wallet: walletAddress,
    p_referrer_wallet: normalizedReferrerWallet,
    p_activation_time: memberRecord.activation_time || new Date().toISOString(),
    p_tx_hash: transactionHash || null
  });
```

---

### Change 2: Update Result Handling

**File:** `activate-membership/index.ts`

**Lines:** 673-681

**Before:**
```typescript
matrixResult = {
  success: placementResult.success,
  ...placementResult,
  message: placementResult.success
    ? `Placed in ${placementResult.placements_created} matrices (deepest layer: ${placementResult.deepest_layer})`
    : `Matrix placement failed: ${placementResult.message}`
};
```

**After:**
```typescript
matrixResult = {
  success: placementResult.success,
  ...placementResult,
  message: placementResult.success
    ? `Placed in matrix: ${placementResult.matrix_root} at layer ${placementResult.layer}, slot ${placementResult.slot} (${placementResult.referral_type})`
    : `Matrix placement failed: ${placementResult.message}`
};
```

---

## 🧪 Testing Checklist

After applying changes, verify:

### Level 1 Activation Tests

- [ ] **Test 1:** New member with referrer
  - Expected: Creates members record, places in matrix using Branch-First BFS, creates direct reward
  - Verify: `matrix_referrals` has record with `source = 'branch_bfs'`
  - Verify: `direct_rewards` has 10 USDC reward for referrer

- [ ] **Test 2:** New member without referrer (root)
  - Expected: Creates members record, skips matrix placement, no direct reward
  - Verify: No matrix_referrals record

- [ ] **Test 3:** Idempotency - duplicate activation
  - Expected: Returns existing placement, no duplicate records
  - Verify: `already_placed = true` in response

### Level 2-19 Upgrade Tests

- [ ] **Test 4:** Level 1 → Level 2 upgrade
  - Expected: Creates membership, updates members.current_level, triggers matrix layer reward
  - Verify: `layer_rewards` has reward for matrix root at layer 2

- [ ] **Test 5:** Level 2 → Level 3 upgrade
  - Expected: Similar to Test 4, but layer 3 reward
  - Verify: `layer_rewards` has reward for matrix root at layer 3

- [ ] **Test 6:** Sequential validation
  - Expected: Level 1 → Level 3 (skip Level 2) is rejected
  - Verify: Error message about sequential upgrades

- [ ] **Test 7:** Level 2 direct referrals requirement
  - Expected: Level 1 → Level 2 with < 3 direct referrals is rejected
  - Verify: Error message about insufficient direct referrals

### Matrix Placement Tests

- [ ] **Test 8:** Branch-First BFS placement
  - Given: Member A (root), Member B (referrer under A)
  - When: Member C activates with B as referrer
  - Expected: C placed in B's subtree before A's other subtrees
  - Verify: `entry_anchor = B`, `matrix_root = A`

- [ ] **Test 9:** Global fallback
  - Given: Member A (root), Member B's subtree is full (layer 19 deep)
  - When: Member C activates with B as referrer
  - Expected: C placed in A's tree using global BFS (not in B's subtree)
  - Verify: `matrix_placement_events` shows fallback_used = true

---

## 📝 Migration Execution Order

1. ✅ **Apply database migrations** (already created):
   - `20251019000000_cleanup_old_matrix_system.sql`
   - `20251019000001_create_branch_bfs_placement_function.sql`
   - `20251019000002_create_matrix_views.sql`
   - `20251019000003_create_data_rebuild_functions.sql`
   - `20251019000004_create_matrix_triggers.sql`

2. ⚠️ **Update Edge Functions** (THIS STEP):
   - Update `activate-membership/index.ts` (Changes 1 & 2 above)

3. 🧪 **Test in development/staging**:
   - Run all tests from testing checklist
   - Verify no errors in logs

4. 🚀 **Deploy to production**:
   - Deploy updated Edge Function
   - Monitor placement events for first 100 activations

---

## 🎯 Summary

### Critical Changes Required

1. ✅ **Update matrix placement function call** in `activate-membership/index.ts`
   - Change from `place_new_member_in_matrix_correct` to `fn_place_member_branch_bfs`
   - Add new parameters: `p_activation_time`, `p_tx_hash`
   - Update result handling to match new return value structure

### Already Correct

1. ✅ Level 1 direct referral rewards logic
2. ✅ Level 2-19 matrix layer rewards logic
3. ✅ Sequential upgrade validation
4. ✅ Level 2 direct referrals requirement

### Impact Assessment

| Component | Impact Level | Status | Action Required |
|-----------|-------------|--------|-----------------|
| `activate-membership` | 🔴 **CRITICAL** | ⚠️ **Needs Update** | Update function call |
| `level-upgrade` | 🟢 **LOW** | ✅ **Compatible** | No changes needed |
| Database triggers | 🟡 **MEDIUM** | ✅ **Compatible** | Monitor after deployment |
| Rewards system | 🟢 **LOW** | ✅ **Compatible** | Already correct |

---

## 🔍 Next Steps

1. **Immediate:** Update `activate-membership/index.ts` with Changes 1 & 2
2. **Before deployment:** Run full test suite in staging environment
3. **After deployment:** Monitor `matrix_placement_events` table for errors
4. **Week 1:** Review placement statistics and validate BFS ordering
5. **Week 2:** Consider removing manual placement call if trigger proves reliable

---

**Document Version:** 1.0
**Last Updated:** 2025-10-19
**Prepared By:** Claude Code
**Status:** ⚠️ **Action Required Before Migration**
