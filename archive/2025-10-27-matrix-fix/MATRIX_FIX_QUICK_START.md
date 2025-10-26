# Matrix Duplicate Fix - Quick Start Guide

**Date:** 2025-10-12
**Issue:** Critical matrix position duplicates (975 records across 184 matrices)
**Status:** ✅ Ready for deployment

---

## Problem Summary

The `matrix_referrals` table has duplicate positions violating the 3×3 matrix rule:
- **Rule:** Each parent can only have 3 children (L, M, R positions)
- **Violation:** 184 matrices have multiple members in same position
- **Impact:** 975 duplicate records need relocation

**Example:** Matrix `0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab`
- Layer 1 Position R has **7 members** (should be 1)

---

## Quick Deployment

### Option 1: Automated Script (Recommended)

```bash
cd /home/ubuntu/WebstormProjects/BeehiveCheckout

# Run diagnostic only (no changes)
./scripts/deploy_matrix_fix.sh --dry-run

# Deploy the fix (includes backup)
./scripts/deploy_matrix_fix.sh

# Deploy without backup (not recommended)
./scripts/deploy_matrix_fix.sh --skip-backup
```

**Duration:** 30-60 minutes

### Option 2: Manual Deployment

```bash
export PGPASSWORD='bee8881941'
DB_URL="postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"

# 1. Run diagnostic
psql "$DB_URL" -f scripts/diagnose_matrix_duplicates.sql > pre_diagnosis.txt

# 2. Create backup
pg_dump -h db.cvqibjcbfrwsgkvthccp.supabase.co -U postgres -d postgres \
  -t matrix_referrals -t members -t referrals > backup.sql

# 3. Apply fix
psql "$DB_URL" -f supabase/migrations/20251012000000_fix_matrix_duplicate_positions.sql

# 4. Update functions
psql "$DB_URL" -f supabase/migrations/20251012010000_enforce_unique_position_constraint.sql

# 5. Validate
psql "$DB_URL" -f scripts/validate_matrix_fix.sql > validation.txt
```

---

## What the Fix Does

### 1. Adds UNIQUE Constraint
```sql
ALTER TABLE matrix_referrals
ADD CONSTRAINT uq_matrix_position
UNIQUE (matrix_root_wallet, parent_wallet, position);
```

### 2. Relocates Duplicate Members
- Keeps earliest member (by `created_at`) in each position
- Relocates others using BFS spillover algorithm
- Tries up to 20 upline matrices to find available position
- Logs all relocations in `matrix_member_relocation` table

### 3. Updates Placement Functions
- `find_next_bfs_position_with_depth()` - checks for duplicates
- `place_member_in_single_matrix()` - uses `ON CONFLICT` handling
- Adds validation trigger to prevent manual violations

### 4. Validation
- Verifies 0 duplicate positions remain
- Confirms all parents have ≤ 3 children
- Checks layer limits (≤ 19)
- Validates BFS ordering

---

## Verification After Deployment

### Quick Check: No Duplicates
```sql
SELECT COUNT(*) as duplicate_count
FROM (
    SELECT matrix_root_wallet, parent_wallet, position
    FROM matrix_referrals
    WHERE parent_wallet IS NOT NULL
    GROUP BY matrix_root_wallet, parent_wallet, position
    HAVING COUNT(*) > 1
) sub;
```
**Expected:** 0

### Quick Check: User's Example Matrix
```sql
SELECT position, COUNT(*) as count, STRING_AGG(member_wallet, ', ') as members
FROM matrix_referrals
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND layer = 1
GROUP BY position
ORDER BY position;
```
**Expected:** 3 rows (L=1, M=1, R=1)

### Check Failed Relocations
```sql
SELECT COUNT(*) as failed_count
FROM matrix_member_relocation
WHERE status = 'failed';
```
**Expected:** 0 (or very few, investigate each)

---

## Files Created

### Migrations
1. **`/home/ubuntu/WebstormProjects/BeehiveCheckout/supabase/migrations/20251012000000_fix_matrix_duplicate_positions.sql`**
   - Analyzes duplicates
   - Relocates members
   - Adds UNIQUE constraint
   - Validates results

2. **`/home/ubuntu/WebstormProjects/BeehiveCheckout/supabase/migrations/20251012010000_enforce_unique_position_constraint.sql`**
   - Updates placement functions
   - Adds validation trigger
   - Creates helper functions

### Scripts
3. **`/home/ubuntu/WebstormProjects/BeehiveCheckout/scripts/diagnose_matrix_duplicates.sql`**
   - Comprehensive diagnostic report
   - Shows all affected matrices
   - Analyzes duplicate patterns

4. **`/home/ubuntu/WebstormProjects/BeehiveCheckout/scripts/validate_matrix_fix.sql`**
   - Post-deployment validation
   - Verifies fix success
   - Checks all constraints

5. **`/home/ubuntu/WebstormProjects/BeehiveCheckout/scripts/deploy_matrix_fix.sh`**
   - Automated deployment script
   - Includes backup and validation
   - Detailed logging

### Documentation
6. **`/home/ubuntu/WebstormProjects/BeehiveCheckout/MATRIX_DUPLICATE_FIX_REPORT.md`**
   - Complete technical report
   - Detailed deployment guide
   - Rollback procedures
   - Monitoring plan

7. **`/home/ubuntu/WebstormProjects/BeehiveCheckout/MATRIX_FIX_QUICK_START.md`**
   - This quick start guide

---

## Rollback (If Needed)

### Remove Constraint Only
```sql
ALTER TABLE matrix_referrals DROP CONSTRAINT IF EXISTS uq_matrix_position;
DROP TRIGGER IF EXISTS trg_validate_matrix_position ON matrix_referrals;
```

### Full Restore
```sql
-- Restore from backup created during deployment
psql "$DB_URL" < backups/matrix_backup_YYYYMMDD_HHMMSS.sql
```

⚠️ **Warning:** Full restore loses all relocations. Use only as last resort.

---

## Monitoring (Post-Deployment)

### Daily for Week 1
```sql
-- Should always return 0
SELECT COUNT(*) as duplicates
FROM (
    SELECT matrix_root_wallet, parent_wallet, position
    FROM matrix_referrals
    WHERE parent_wallet IS NOT NULL
    GROUP BY matrix_root_wallet, parent_wallet, position
    HAVING COUNT(*) > 1
) sub;
```

### Weekly for Month 1
```sql
-- Matrix health check
SELECT
    COUNT(DISTINCT matrix_root_wallet) as total_matrices,
    MAX(layer) as max_layer,
    COUNT(CASE WHEN layer > 19 THEN 1 END) as layer_violations
FROM matrix_referrals;
```

---

## Success Criteria

✅ Zero duplicate positions
✅ Zero parents with > 3 children
✅ Zero layers > 19
✅ Unique constraint active
✅ All placement functions updated
✅ Validation checks pass

---

## Support

**For issues during deployment:**
1. Stop immediately
2. Check log files in `backups/logs/`
3. Review specific error messages
4. Do NOT proceed with rollback without consulting documentation

**Review full details:** See `MATRIX_DUPLICATE_FIX_REPORT.md`

---

## Estimated Timeline

| Step | Duration | Description |
|------|----------|-------------|
| Backup | 5 min | Create database backup |
| Diagnostic | 2 min | Analyze duplicates |
| Fix Migration | 30-60 min | Relocate members and add constraint |
| Function Update | < 1 min | Update placement logic |
| Validation | 2 min | Verify fix success |
| **Total** | **40-70 min** | Full deployment |

**Recommended:** Run during off-peak hours with maintenance window.

---

## Quick Commands Reference

```bash
# Export database password
export PGPASSWORD='bee8881941'
DB_URL="postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"

# Connect to database
psql "$DB_URL"

# Run diagnostic
psql "$DB_URL" -f scripts/diagnose_matrix_duplicates.sql

# Run deployment
./scripts/deploy_matrix_fix.sh

# Run validation
psql "$DB_URL" -f scripts/validate_matrix_fix.sql

# Check constraint exists
psql "$DB_URL" -c "SELECT conname FROM pg_constraint WHERE conname = 'uq_matrix_position';"

# Count duplicates
psql "$DB_URL" -c "SELECT COUNT(*) FROM (SELECT 1 FROM matrix_referrals WHERE parent_wallet IS NOT NULL GROUP BY matrix_root_wallet, parent_wallet, position HAVING COUNT(*) > 1) sub;"
```

---

**Ready to deploy?** Run: `./scripts/deploy_matrix_fix.sh --dry-run` to preview changes.

**Questions?** See full documentation: `MATRIX_DUPLICATE_FIX_REPORT.md`
