# Deployment Guide: Registration Flow Critical Fix

**Date**: 2025-10-12
**Priority**: P0 - CRITICAL
**Estimated Time**: 30 minutes
**Downtime Required**: No (hot-fix compatible)

---

## Overview

This deployment fixes a critical bug where new member registrations fail to create matrix placements and direct rewards. The root cause is the `place_new_member_in_matrix_correct()` function attempting to insert into a non-existent table `referrals_new`.

**Impact if not deployed**:
- 14.5% of new registrations fail matrix placement
- ~1,100 USDT per day in missing rewards
- Referrers not receiving credited rewards
- Matrix structure incomplete

---

## Pre-Deployment Checklist

### Prerequisites
- [ ] Database access with SUPERUSER privileges
- [ ] Ability to connect to: `db.cvqibjcbfrwsgkvthccp.supabase.co`
- [ ] Backup taken (automatic via Supabase, but verify)
- [ ] All stakeholders notified (Platform, Finance, Support teams)

### Environment Verification
```sql
-- Connect to database
psql -h db.cvqibjcbfrwsgkvthccp.supabase.co -p 5432 -U postgres -d postgres

-- Verify current state
SELECT COUNT(*) AS members_missing_placement
FROM members m
LEFT JOIN matrix_referrals mr ON m.wallet_address = mr.member_wallet
WHERE m.activation_time >= NOW() - INTERVAL '7 days'
  AND mr.member_wallet IS NULL;

-- Expected result: ~10 missing placements
```

---

## Deployment Steps

### Step 1: Deploy Critical Fix (5 minutes)

**File**: `/home/ubuntu/WebstormProjects/BeehiveCheckout/fix_registration_flow_critical.sql`

```bash
# Execute the fix
psql -h db.cvqibjcbfrwsgkvthccp.supabase.co -p 5432 -U postgres -d postgres \
  -f fix_registration_flow_critical.sql
```

**What this does**:
1. Replaces `place_new_member_in_matrix_correct()` to call working function
2. Updates `trigger_membership_processing()` to raise errors on failure (no silent errors)
3. Creates monitoring view `v_members_missing_matrix_placement`
4. Creates backfill utility function `backfill_missing_matrix_placements()`

**Expected output**:
```
✅ CRITICAL FIX APPLIED: Registration Flow Matrix Placement
...
Next Steps:
  1. Test new registration flow with test wallet
  2. Run: SELECT * FROM v_members_missing_matrix_placement;
  3. Run dry-run: SELECT * FROM backfill_missing_matrix_placements(TRUE);
  4. Execute backfill: SELECT * FROM backfill_missing_matrix_placements(FALSE);
```

### Step 2: Validate Fix Deployment (2 minutes)

```sql
-- Check function was updated
SELECT pg_get_functiondef((
  SELECT oid FROM pg_proc
  WHERE proname = 'place_new_member_in_matrix_correct'
  LIMIT 1
)) LIKE '%place_member_matrix_complete%' AS fix_applied;

-- Expected result: true
```

```sql
-- Check monitoring view exists
SELECT COUNT(*) FROM v_members_missing_matrix_placement;

-- Expected result: ~10 members
```

### Step 3: Test New Registration Flow (5 minutes)

**Option A: Use test wallet (recommended)**

```sql
-- Create test user (or use existing test wallet)
INSERT INTO users (wallet_address, referrer_wallet, role)
VALUES ('0xTEST_WALLET_ADDRESS', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', 'user')
ON CONFLICT (wallet_address) DO NOTHING;

-- Simulate membership claim
INSERT INTO membership (wallet_address, nft_level, claim_price, claimed_at)
VALUES ('0xTEST_WALLET_ADDRESS', 1, 100.000000, NOW());

-- Verify placement created
SELECT * FROM matrix_referrals
WHERE member_wallet = '0xTEST_WALLET_ADDRESS';

-- Expected: At least 1 placement record

-- Clean up test (optional)
-- DELETE FROM matrix_referrals WHERE member_wallet = '0xTEST_WALLET_ADDRESS';
-- DELETE FROM membership WHERE wallet_address = '0xTEST_WALLET_ADDRESS';
-- DELETE FROM members WHERE wallet_address = '0xTEST_WALLET_ADDRESS';
-- DELETE FROM users WHERE wallet_address = '0xTEST_WALLET_ADDRESS';
```

**Option B: Monitor next real registration**

```sql
-- Watch audit_logs in real-time
SELECT
    user_wallet,
    action,
    new_values->>'placement_success' AS placement_success,
    new_values->>'placement_result' AS result,
    created_at
FROM audit_logs
WHERE action = 'membership_nft_claimed'
  AND created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 5;
```

### Step 4: Backfill Missing Placements (10 minutes)

**File**: `/home/ubuntu/WebstormProjects/BeehiveCheckout/backfill_missing_placements.sql`

#### 4a. Dry-Run First (ALWAYS)

```bash
# Execute dry-run
psql -h db.cvqibjcbfrwsgkvthccp.supabase.co -p 5432 -U postgres -d postgres \
  -f backfill_missing_placements.sql
```

**Review the dry-run results carefully**:
- Check all 10 members are listed
- Verify referrer_wallet values are correct
- Confirm placement_message indicates success

#### 4b. Execute Actual Backfill

**Edit the file** to uncomment the backfill execution section:

```sql
-- Find this section in backfill_missing_placements.sql (around line 90)
-- Uncomment the block:

DO $$
BEGIN
    RAISE NOTICE 'EXECUTING BACKFILL...';
END $$;

SELECT * FROM backfill_missing_matrix_placements(FALSE);
```

**Then run**:
```bash
psql -h db.cvqibjcbfrwsgkvthccp.supabase.co -p 5432 -U postgres -d postgres \
  -f backfill_missing_placements.sql
```

**Expected output**:
```
10 rows showing:
  wallet_address | placement_success | created_reward
  ---------------+-------------------+---------------
  0x5868...     | t                 | t
  ...
```

### Step 5: Create Missing Direct Rewards (5 minutes)

After successful backfill, **uncomment the reward creation section** in `backfill_missing_placements.sql` (around line 150):

```sql
DO $$
DECLARE
    v_member RECORD;
    ...
BEGIN
    -- For each backfilled member, create direct reward
    ...
END $$;
```

**Run the reward creation**:
```bash
psql -h db.cvqibjcbfrwsgkvthccp.supabase.co -p 5432 -U postgres -d postgres \
  -f backfill_missing_placements.sql
```

### Step 6: Update Member Balances (3 minutes)

**Uncomment the balance update section** in `backfill_missing_placements.sql` (around line 200):

```sql
DO $$
DECLARE
    v_referrer RECORD;
BEGIN
    -- Update member_balances for claimable rewards
    UPDATE member_balances
    SET available_usd = available_usd + ...
    ...
END $$;
```

**Run the balance update**:
```bash
psql -h db.cvqibjcbfrwsgkvthccp.supabase.co -p 5432 -U postgres -d postgres \
  -f backfill_missing_placements.sql
```

---

## Post-Deployment Validation

### Validation Queries

```sql
-- 1. Verify no members are missing placement
SELECT COUNT(*) AS still_missing
FROM v_members_missing_matrix_placement;
-- Expected: 0

-- 2. Verify all recent members have placements
SELECT
    COUNT(*) AS total_members,
    COUNT(mr.member_wallet) AS with_placement,
    COUNT(*) - COUNT(mr.member_wallet) AS without_placement
FROM members m
LEFT JOIN matrix_referrals mr ON m.wallet_address = mr.member_wallet
WHERE m.activation_time >= NOW() - INTERVAL '7 days';
-- Expected: without_placement = 0

-- 3. Verify rewards created
SELECT
    COUNT(*) AS total_rewards,
    SUM(reward_amount) AS total_amount
FROM direct_referral_rewards
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND metadata->>'backfilled' = 'true';
-- Expected: ~10 rewards, ~1000 USDT

-- 4. Check for duplicate positions (should be 0)
SELECT
    matrix_root_wallet,
    parent_wallet,
    position,
    COUNT(*) AS duplicate_count
FROM matrix_referrals
GROUP BY matrix_root_wallet, parent_wallet, position
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- 5. Check for orphaned nodes (should be 0)
SELECT COUNT(*) AS orphaned_nodes
FROM matrix_referrals mr
WHERE mr.layer > 0
  AND NOT EXISTS (
      SELECT 1 FROM matrix_referrals parent
      WHERE parent.member_wallet = mr.parent_wallet
        AND parent.matrix_root_wallet = mr.matrix_root_wallet
  );
-- Expected: 0

-- 6. Verify audit logs show successful placements
SELECT
    COUNT(*) AS recent_claims,
    COUNT(CASE WHEN new_values->>'placement_success' = 'true' THEN 1 END) AS successful_placements
FROM audit_logs
WHERE action = 'membership_nft_claimed'
  AND created_at >= NOW() - INTERVAL '1 hour';
-- Expected: successful_placements = recent_claims
```

---

## Rollback Plan

If issues are detected after deployment:

### Rollback Step 1: Identify backfilled records

```sql
-- Find backfilled matrix placements
SELECT * FROM matrix_referrals
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Find backfilled rewards
SELECT * FROM direct_referral_rewards
WHERE metadata->>'backfilled' = 'true'
  AND created_at >= NOW() - INTERVAL '1 hour';
```

### Rollback Step 2: Remove backfilled data (if needed)

```sql
BEGIN;

-- Remove backfilled rewards
DELETE FROM direct_referral_rewards
WHERE metadata->>'backfilled' = 'true'
  AND created_at >= NOW() - INTERVAL '1 hour';

-- Remove backfilled placements (CAREFUL - verify IDs first)
DELETE FROM matrix_referrals
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND member_wallet IN (
      SELECT wallet_address FROM v_members_missing_matrix_placement
  );

COMMIT;
```

### Rollback Step 3: Restore old function (if needed)

```sql
-- Contact DBA team to restore from backup or provide previous function definition
```

---

## Monitoring & Alerts

### Daily Monitoring Query

```sql
-- Add to daily monitoring dashboard
SELECT
    COUNT(*) AS members_missing_placement,
    MAX(activation_time) AS most_recent_failure
FROM v_members_missing_matrix_placement;

-- Alert if count > 0
```

### Real-Time Monitoring

```sql
-- Monitor recent registrations
SELECT
    m.wallet_address,
    m.activation_time,
    mr.matrix_root_wallet IS NOT NULL AS has_placement,
    drr.id IS NOT NULL AS has_reward
FROM members m
LEFT JOIN matrix_referrals mr ON m.wallet_address = mr.member_wallet
LEFT JOIN direct_referral_rewards drr ON drr.referred_member_wallet = m.wallet_address
WHERE m.activation_time >= NOW() - INTERVAL '1 hour'
ORDER BY m.activation_time DESC;
```

---

## Success Criteria

Deployment is successful when:

- [ ] `fix_registration_flow_critical.sql` executes without errors
- [ ] Test registration creates matrix placement
- [ ] All 10 missing members backfilled successfully
- [ ] All 10 direct rewards created (total 1,000 USDT)
- [ ] `v_members_missing_matrix_placement` shows 0 rows
- [ ] No duplicate positions in matrix_referrals
- [ ] No orphaned nodes in matrix_referrals
- [ ] New registrations (after fix) create placements automatically
- [ ] Audit logs show `placement_success: true` for new claims
- [ ] Member balances updated correctly

---

## Communication Plan

### Before Deployment
- [ ] Notify Platform team of deployment window
- [ ] Notify Finance team of reward backfill amount (1,000 USDT)
- [ ] Notify Support team to monitor user inquiries

### During Deployment
- [ ] Post status updates in #engineering channel
- [ ] Monitor error logs and user reports

### After Deployment
- [ ] Send deployment summary to stakeholders
- [ ] Update affected users (if identifiable)
- [ ] Document lessons learned

---

## Troubleshooting

### Issue: Backfill fails with "duplicate position" error

**Cause**: Position already filled in matrix
**Solution**:
```sql
-- Check existing positions for the member
SELECT * FROM matrix_referrals
WHERE member_wallet = '<FAILING_WALLET>';

-- If already placed, skip backfill for this member
```

### Issue: Rewards not created after backfill

**Cause**: Reward creation logic not triggered automatically
**Solution**: Manually create rewards using the reward creation section in backfill script

### Issue: New registrations still failing

**Cause**: Fix not deployed correctly or cached function
**Solution**:
```sql
-- Force function reload
SELECT pg_reload_conf();

-- Verify function definition
SELECT pg_get_functiondef((
    SELECT oid FROM pg_proc
    WHERE proname = 'place_new_member_in_matrix_correct'
));
```

---

## Contact Information

- **Database Team**: [Contact Info]
- **Platform Team**: [Contact Info]
- **On-Call Engineer**: [Contact Info]
- **Deployment Lead**: [Your Name]

---

## Files Included

1. `REGISTRATION_FLOW_VALIDATION_REPORT.md` - Comprehensive validation report
2. `fix_registration_flow_critical.sql` - Critical fix deployment script
3. `backfill_missing_placements.sql` - Backfill utility script
4. `DEPLOYMENT_GUIDE_REGISTRATION_FIX.md` - This file

---

**Deployment Author**: Database Audit Agent
**Deployment Date**: 2025-10-12
**Deployment Priority**: P0 - CRITICAL
