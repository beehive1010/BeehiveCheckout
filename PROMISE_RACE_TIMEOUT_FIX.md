# Promise.race Timeout Fix - Critical Bug Fix

## 🐛 Bug Discovered

While testing the MobileMatrixView timeout issue, we discovered that `Promise.race` timeout errors were not being caught properly.

### The Problem

```typescript
// ❌ WRONG: When timeout promise rejects, Promise.race throws uncaught exception
const { data, error } = await Promise.race([
  supabasePromise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
]) as any;
```

**What happens:**
1. `timeoutPromise` rejects first (after 8 seconds)
2. `Promise.race` returns the rejected promise
3. Code tries to destructure `{ data, error }` from the rejection
4. **Uncaught exception:** `Error: RPC fn_get_user_total_referral_stats timeout`
5. Component crashes or stays in loading state

### The Fix

```typescript
// ✅ CORRECT: Wrap in try-catch to handle timeout gracefully
let data = null;
let error = null;

try {
  const result = await Promise.race([
    supabasePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000))
  ]);
  data = result.data;
  error = result.error;

  if (error) {
    console.error('Error:', error);
  }
} catch (timeoutError) {
  console.error('Timeout or error:', timeoutError.message);
  // Continue with null values - component handles gracefully
}

// Use data with null fallbacks
const teamSize = data?.total_team_members || 0;
```

## 📊 Impact

**Files Fixed:**
- `src/hooks/useBeeHiveStats.ts` - 4 Promise.race locations

**Queries Fixed:**
1. `fn_get_user_total_referral_stats` (Line 102-127)
2. `v_referral_statistics` (Line 248-270)
3. `fn_get_user_layer_stats` (Line 277-299)
4. `members` table (Line 307-329)

**Before Fix:**
- ❌ Timeout causes uncaught exception
- ❌ Component crashes or stuck in loading state
- ❌ User sees blank screen or loading spinner forever

**After Fix:**
- ✅ Timeout caught gracefully
- ✅ Component continues with default/cached values
- ✅ User sees partial data instead of error

## 🔍 Testing

### Database Performance (Direct SQL)
```sql
SELECT * FROM fn_get_user_total_referral_stats('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab');
-- Time: 116.131 ms ✅
```

### Frontend Behavior
**Before:**
```
🔍 Calling fn_get_user_total_referral_stats...
💥 Exception in useUserReferralStats: Error: RPC fn_get_user_total_referral_stats timeout
(Component stuck loading)
```

**After:**
```
🔍 Calling fn_get_user_total_referral_stats...
❌ RPC timeout or error: RPC fn_get_user_total_referral_stats timeout
📊 Team Statistics: {totalTeamMembers: 0, activeMatrixMembers: 0, ...}
(Component renders with default values)
```

## 💡 Lessons Learned

1. **Always wrap Promise.race in try-catch** when dealing with timeout promises
2. **Promise.race returns the first settled promise** (resolved OR rejected)
3. **Destructuring only works on resolved promises**, not rejections
4. **Graceful degradation** is better than crashing

## ✅ Verification Checklist

- [x] Fixed all Promise.race calls in useBeeHiveStats.ts
- [x] Added try-catch error handling
- [x] Tested with slow network conditions
- [x] Verified component renders with defaults on timeout
- [x] Updated timeout values (8s → 15-20s)
- [x] Database function optimized (8s → 116ms)
- [x] Built and deployed successfully

---

**Fixed by:** Claude Code
**Date:** 2025-11-03
**Build:** ✅ Successful
