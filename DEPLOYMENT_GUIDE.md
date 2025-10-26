# Deployment Guide - Team Statistics & Direct Referrals Fix

**Date**: 2025-10-19
**Purpose**: Deploy database fixes for team statistics distinction and direct referrals count
**Status**: Ready for deployment (manual application required)

---

## Overview

Two critical fixes have been prepared to address reported issues:

1. **Team Statistics Distinction**: Separate total team count (all layers) from matrix team count (19 layers)
2. **Direct Referrals Count Fix**: Fix direct referrals to query from `referrals` table instead of `matrix_referrals` Layer 1

---

## Migration Files Created

The following migration files have been created in `supabase/migrations/`:

### 1. `20251019182600_create_v_total_team_count.sql`
**Purpose**: Create view for calculating total team count across all referral layers (unlimited depth)

**Creates**:
- View: `v_total_team_count`
- Permissions: `GRANT SELECT TO authenticated, anon`

**Provides**:
- `total_team_count`: All members via recursive referrer tree
- `activated_team_count`: Activated members across all layers
- `max_referral_depth`: Maximum depth reached
- `layer_20_plus_count`: Members beyond 19-layer matrix limit

### 2. `20251019182601_fix_referrals_stats_view.sql`
**Purpose**: Fix `referrals_stats_view` to query from `referrals` table for accurate direct referrals count

**Fixes**:
- Changes data source from `matrix_referrals` (Layer 1, max 3) to `referrals` table (unlimited)
- Adds validation script to verify fix
- Includes automated testing for wallet `0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab`

---

## Deployment Options

### Option 1: Apply Via Supabase CLI (Recommended after resolving conflicts)

**Prerequisites**:
1. Resolve migration conflict in `20251008000003_fix_bcc_release_logic.sql`
   - Error: `function name "release_bcc_on_level_upgrade" is not unique`
   - Fix: Add `DROP FUNCTION IF EXISTS` statements or ensure function signatures are unique

2. Once conflicts are resolved:
```bash
cd /home/ubuntu/WebstormProjects/BeehiveCheckout
supabase db push
```

**Note**: This will apply ALL pending migrations (60+ files). Ensure all conflicts are resolved first.

---

### Option 2: Apply Specific Migrations Manually (Immediate Fix)

If you need to deploy these fixes immediately without resolving all migration conflicts:

#### Step 1: Connect to Database
```bash
# Use Supabase dashboard SQL Editor or psql
psql "postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require"
```

#### Step 2: Apply Total Team Count View
```bash
# From project root
psql $DATABASE_URL -f supabase/migrations/20251019182600_create_v_total_team_count.sql
```

**Expected output**:
```
CREATE VIEW
COMMENT
GRANT
NOTICE:  ============================================================
NOTICE:  VIEW VALIDATION: v_total_team_count
NOTICE:  ============================================================
NOTICE:  Test Wallet: 0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab
NOTICE:  Statistics (All Layers via Referrer Tree):
NOTICE:    - Total Team Count: 4061
NOTICE:    - Activated Team Count: [number]
NOTICE:    - Max Referral Depth: [number]
NOTICE:    - Members Beyond Layer 19: 1943
NOTICE:  ✅ View created successfully with data
```

#### Step 3: Apply Direct Referrals Fix
```bash
psql $DATABASE_URL -f supabase/migrations/20251019182601_fix_referrals_stats_view.sql
```

**Expected output**:
```
DROP VIEW
CREATE VIEW
COMMENT
GRANT
NOTICE:  ============================================================
NOTICE:  VALIDATION: referrals_stats_view FIX
NOTICE:  ============================================================
NOTICE:  Test Wallet: 0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab
NOTICE:  Direct Referrals Count:
NOTICE:    - From referrals_stats_view: 50
NOTICE:    - From referrals table (correct): 50
NOTICE:    - Matrix Layer 1 positions (max 3): 3
NOTICE:  ✅ View fixed: direct_referrals matches referrals table
NOTICE:  ✅ Correct: direct_referrals (50) != matrix Layer 1 (3)
```

---

### Option 3: Supabase Dashboard SQL Editor

1. Navigate to your Supabase project dashboard
2. Go to **SQL Editor**
3. Open and run each migration file:
   - `supabase/migrations/20251019182600_create_v_total_team_count.sql`
   - `supabase/migrations/20251019182601_fix_referrals_stats_view.sql`
4. Verify the output matches the expected results above

---

## Verification Steps

After applying the migrations, verify the fixes are working:

### 1. Verify Views Created
```sql
-- Check v_total_team_count exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'v_total_team_count'
);
-- Expected: true

-- Check referrals_stats_view exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'referrals_stats_view'
);
-- Expected: true
```

### 2. Verify Data Correctness (Test Wallet)
```sql
-- Check total team count (should be > matrix count)
SELECT
    vt.total_team_count as "Total Team (All Layers)",
    vm.total_members as "Matrix Team (19 Layers)",
    vt.total_team_count - vm.total_members as "Difference (Layer 20+)"
FROM v_total_team_count vt
LEFT JOIN v_matrix_overview vm ON vm.wallet_address = vt.root_wallet
WHERE vt.root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

-- Expected:
-- Total Team: ~4061
-- Matrix Team: ~2118
-- Difference: ~1943
```

### 3. Verify Direct Referrals Fix
```sql
-- Check direct referrals count
SELECT
    rs.direct_referrals as "Direct Referrals (from referrals table)",
    (
        SELECT COUNT(*)
        FROM matrix_referrals
        WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
        AND layer = 1
    ) as "Matrix Layer 1 Positions (max 3)"
FROM referrals_stats_view rs
WHERE rs.referrer_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab';

-- Expected:
-- Direct Referrals: 50+ (actual count from referrals table)
-- Matrix Layer 1 Positions: 3 or less
```

### 4. Frontend Verification

After database deployment, verify the frontend displays correct data:

1. **Navigate to Referrals Page**
   - URL: `/referrals`
   - Connect wallet: `0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab`

2. **Check Statistics Display**:
   ```
   Expected UI Layout:
   ┌─────────────────────────────────────────────────────────────┐
   │ Direct  | Total Team  | Matrix Team | Max Layer | L1 Slots │
   │ 50+     | 4061        | 2118        | 19        | 3/3      │
   │         | All Layers  | 19 Layers   |           |          │
   └─────────────────────────────────────────────────────────────┘
   ```

3. **Verify Team Breakdown Card**:
   - Total Team (All Layers): Should show ~4061
   - Matrix Team (19 Layers): Should show ~2118
   - Difference note: "+1943 members beyond 19-layer matrix"

---

## Rollback Plan

If issues occur, you can rollback by recreating the old view:

### Rollback referrals_stats_view (not recommended)
```sql
-- WARNING: This restores the INCORRECT behavior
DROP VIEW IF EXISTS referrals_stats_view CASCADE;

CREATE VIEW referrals_stats_view AS
SELECT
    matrix_root_wallet AS referrer_wallet,
    COUNT(*) FILTER (WHERE layer = 1) AS direct_referrals,  -- Wrong! Max 3
    -- ... other fields
FROM matrix_referrals
GROUP BY matrix_root_wallet;

GRANT SELECT ON referrals_stats_view TO authenticated, anon;
```

### Remove v_total_team_count
```sql
DROP VIEW IF EXISTS v_total_team_count CASCADE;
```

---

## Impact Analysis

### Database Impact
- **New View**: `v_total_team_count` (adds recursive query, may impact performance for users with large teams)
- **Modified View**: `referrals_stats_view` (changes data source, improves accuracy)
- **Performance**: Recursive queries may be slower for users with 1000+ team members
- **Storage**: Views do not store data, minimal impact

### Frontend Impact
- **Automatic**: Components already query from these views
- **No Code Deploy Required**: Frontend code is already compatible
- **Data Change**: Users will see updated statistics immediately after DB deployment

### User-Visible Changes
- **Direct Referrals**: Will show actual count (can be 10, 50, 100+) instead of max 3
- **Team Statistics**: Will distinguish between "Total Team" (all layers) and "Matrix Team" (19 layers)
- **New Information**: Users can see how many team members are beyond the 19-layer matrix

---

## Post-Deployment Tasks

After successful deployment:

- [ ] Monitor database performance (check slow query logs for recursive CTE)
- [ ] Verify frontend displays correct data for multiple wallets
- [ ] Add monitoring/alerting for view query performance
- [ ] Update user documentation explaining the distinction
- [ ] Consider adding caching/materialized view if performance issues arise

---

## Known Issues & Limitations

### Performance Considerations
1. **Recursive CTE Performance**:
   - `v_total_team_count` uses recursive CTE which can be slow for large teams
   - For users with 5000+ team members, queries may take 2-5 seconds
   - **Mitigation**: Consider materialized view with refresh trigger if needed

2. **Frontend Fallback Logic**:
   - Components have JavaScript recursion fallback (less efficient)
   - **Recommendation**: Update `useBeeHiveStats` to query `v_total_team_count` view directly

### Data Consistency
- Views are computed on-demand, no caching
- Real-time data, but may have slight delays during high load
- No eventual consistency issues (PostgreSQL is ACID-compliant)

---

## Alternative Migration Path

If you prefer to resolve all migration conflicts first:

### Step 1: Fix Function Name Conflict
Edit `supabase/migrations/20251008000003_fix_bcc_release_logic.sql`:

```sql
-- Add at the beginning of the file
DROP FUNCTION IF EXISTS release_bcc_on_level_upgrade(VARCHAR, INTEGER, INTEGER) CASCADE;

-- Then the existing function definition
CREATE OR REPLACE FUNCTION release_bcc_on_level_upgrade(...)
...
```

### Step 2: Apply All Migrations
```bash
supabase db push
```

This will apply all 62 pending migrations including the two new fixes.

---

## Support & Troubleshooting

### Issue: View creation fails with permission error
**Solution**: Ensure you're connected as a superuser or role with CREATE VIEW permission

### Issue: Recursive query timeout
**Solution**: Increase `statement_timeout` or add depth limit to recursive CTE

### Issue: Data mismatch after deployment
**Solution**:
1. Verify view definitions: `\d+ v_total_team_count` in psql
2. Check for stale connections/caching
3. Clear frontend query cache: Hard refresh browser

### Issue: Frontend still shows old data
**Solution**:
1. Check React Query cache (staleTime: 5000ms)
2. Wait 10 seconds for automatic refetch
3. Hard refresh browser (Ctrl+Shift+R)

---

## Related Documentation

- **Fix Details**: `FIXES_SUMMARY.md`
- **Direct Referrals Fix**: `DIRECT_REFERRALS_VS_MATRIX_L1_FIX.md`
- **Validation Report**: `TEAM_STATISTICS_VALIDATION_REPORT.md`
- **Task List**: `TEAM_STATISTICS_FIX_TASKS.md`

---

**Created**: 2025-10-19
**Status**: ✅ Migration files ready, awaiting deployment
**Next Action**: Choose deployment option and apply migrations
**Estimated Deployment Time**: 5-10 minutes (Option 2 or 3)
