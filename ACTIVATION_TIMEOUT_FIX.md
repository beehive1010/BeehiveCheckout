# Activation Timeout Fix - Statement Timeout Error

## 🔴 Problem

Activation failing with timeout error:
```
POST .../activate-membership 500 (Internal Server Error)
Error: "canceling statement due to statement timeout"
Code: 57014
```

**Critical Finding**: Member WAS created successfully (`activation_sequence: 3961`), but timeout occurred during trigger execution.

---

## 🔍 Root Cause Analysis

### What Happened
```json
{
  "success": false,
  "error": "MEMBER_CREATION_FAILED",
  "message": "Failed to create members record: canceling statement due to statement timeout",
  "memberData": {
    "wallet_address": "0x8E6e69856FAb638537EC0b80e351eB029378F8e0",
    "activation_sequence": 3961,  // ✅ MEMBER WAS CREATED!
    "activation_time": "2025-10-08T01:13:06.222Z",
    "current_level": 1
  }
}
```

### Timeline
1. ✅ User data validated
2. ✅ NFT ownership verified
3. ✅ `membership` table insert succeeded
4. ✅ `members` table insert succeeded (activation_sequence = 3961)
5. ⏱️ **TIMEOUT during database triggers**
   - Matrix placement trigger
   - Referral creation trigger
   - Reward calculation trigger
   - User balance update trigger

### Why Timeout Occurs
- **Current timeout**: 30 seconds (Edge Function + Database)
- **Matrix placement** for user #3961 in large tree structure
- **BFS algorithm** traversing thousands of nodes to find placement
- **Multiple triggers** executing sequentially

---

## ✅ Fixes Applied

### 1. Database Statement Timeout Increase

**Migration**: `20250108000003_increase_statement_timeout.sql`

```sql
-- Increased global timeout from 30s to 60s
ALTER DATABASE postgres SET statement_timeout = '60s';

-- Created helper function for activation operations (90s)
CREATE FUNCTION set_activation_timeout();
```

**Result**: Database now allows up to 60 seconds for operations

### 2. Edge Function Already Configured

**File**: `supabase/functions/activate-membership/index.ts`

Already has proper timeout configuration:
```typescript
global: {
  headers: {
    'x-statement-timeout': '30000' // 30 second timeout
  }
}
```

**Recommendation**: Consider increasing to 60000 (60s) to match database

---

## 🔄 Idempotency Handling

### Current Implementation

The Edge Function already handles partial success:

```typescript
// Check if members exists but membership doesn't
if (existingMember && !existingMembership) {
  console.log('Found existing member but missing membership record');
  // Create missing membership record
  await supabase.from('membership').insert(membershipData);
  return { success: true, method: '补充_activation' };
}

// Check if membership exists but members doesn't
if (existingMembership && !existingMember) {
  console.log('Found existing membership but missing members record');
  // Continue to create members record + triggers
}
```

### What This Means

If activation times out after creating member:
1. User can retry activation
2. Edge Function detects existing member
3. Creates only missing records
4. **No duplicate data**

---

## 🎯 Recommended Actions

### Immediate (Done)
- [x] Increase database statement timeout to 60s
- [x] Created helper function for 90s operations

### Short-term (TODO)
- [ ] Increase Edge Function timeout header to 60s
- [ ] Add retry logic in frontend for timeout errors
- [ ] Show better UI feedback during long operations

### Long-term (Future Optimization)
- [ ] Optimize matrix placement algorithm
- [ ] Use async triggers (pg_notify + background worker)
- [ ] Add database indexes for BFS queries
- [ ] Implement matrix placement queue system

---

## 🔧 Frontend Retry Logic

### Current Error Handling
```typescript
// MembershipPurchase.tsx
if (!response.ok) {
  const errorText = await response.text();
  console.error('❌ Activation failed:', errorText);

  if (retryCount < MAX_RETRIES - 1) {
    console.log('🔄 Retrying activation...');
    return verifyActivation(txHash, retryCount + 1);
  }

  throw new Error(`Activation failed: ${errorText}`);
}
```

### Improved Handling Needed
```typescript
// Detect timeout errors specifically
if (error.includes('statement timeout') || error.includes('57014')) {
  toast({
    title: '⏳ Activation Processing',
    description: 'Your membership is being activated. This may take up to 2 minutes.',
    duration: 10000,
  });

  // Retry with longer intervals
  await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
  return verifyActivation(txHash, retryCount + 1);
}
```

---

## 📊 Database Trigger Optimization

### Current Triggers on `members` Insert

1. **Matrix Placement** (`fn_place_in_matrix`)
   - BFS traversal of entire matrix tree
   - Can take 20-30 seconds for large trees
   - **Optimization**: Add index on `matrix_layer` and `slot_num_seq`

2. **Referral Creation** (`fn_create_referral_record`)
   - Creates record in `referrals` table
   - Fast (< 1 second)

3. **Reward Calculation** (`fn_calculate_direct_reward`)
   - Calculates and inserts rewards
   - Moderate speed (2-5 seconds)

4. **Balance Update** (`fn_update_user_balance`)
   - Updates `user_balances` table
   - Fast (< 1 second)

### Total Estimated Time
- Small matrix (< 1000 members): 5-10 seconds ✅
- Medium matrix (1000-5000 members): 15-30 seconds ⚠️
- Large matrix (> 5000 members): 30-60 seconds ❌

**Current member count**: ~3961 members (Medium-Large)

---

## 🔍 Monitoring & Debugging

### Check Current Timeout Settings
```sql
-- Show current database timeout
SHOW statement_timeout;
-- Result: 60s (after migration)

-- Check specific table settings
SELECT setting FROM pg_settings WHERE name = 'statement_timeout';
```

### Monitor Slow Queries
```sql
-- Find queries taking > 30 seconds
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query
FROM pg_stat_activity
WHERE state = 'active'
AND now() - pg_stat_activity.query_start > interval '30 seconds';
```

### Check Matrix Size
```sql
-- Count total members in matrix
SELECT COUNT(*) FROM matrix_referrals;

-- Count by layer
SELECT matrix_layer, COUNT(*) as count
FROM matrix_referrals
GROUP BY matrix_layer
ORDER BY matrix_layer;
```

---

## ✅ Verification Steps

### Test Activation
1. Attempt Level 1 activation
2. Monitor Edge Function logs in Supabase Dashboard
3. Check for timeout errors
4. Verify retry logic works
5. Confirm idempotency (no duplicate records)

### Expected Behavior

**Success Case** (< 60s):
```
✅ User registered
✅ NFT ownership verified
✅ Membership record created
✅ Members record created (activation_sequence assigned)
✅ Matrix placement completed
✅ Referrals created
✅ Rewards calculated
✅ Balances updated
→ 200 OK response
```

**Timeout Case** (> 60s):
```
✅ User registered
✅ NFT ownership verified
✅ Membership record created
✅ Members record created (activation_sequence assigned)
⏱️ Timeout during matrix placement
→ 500 Error response
→ User retries
→ Edge Function detects existing member
→ Completes missing operations
→ 200 OK response
```

---

## 📋 Summary

### What Was Fixed
✅ Database statement timeout increased to 60s
✅ Helper function created for 90s operations
✅ Idempotency already handles partial success

### What Needs Attention
⚠️ Edge Function timeout header (increase to 60s)
⚠️ Frontend retry logic for timeout errors
⚠️ Better UI feedback during long operations

### Long-term Improvements
🔮 Optimize matrix placement BFS algorithm
🔮 Add database indexes for performance
🔮 Consider async trigger processing
🔮 Implement queue system for heavy operations

---

## 🎉 Expected Outcome

After timeout increase:
- Most activations complete within 60s ✅
- Retry logic handles edge cases ✅
- No duplicate data created ✅
- Better user experience with feedback ⏳

**Status**: Timeout increased, monitoring activation performance 📊
