# Database Cleanup Plan - 2025-10-14

## 📊 Current Status

### Production Tables (Active)
- ✅ `members` - 4,024 records - **PRIMARY TABLE**
- ✅ `matrix_referrals` - 42,453 records - **PRIMARY TABLE**
- ✅ All triggers configured on production tables only

### Frontend Usage
- ✅ Frontend uses production tables exclusively (`members`, `matrix_referrals`)
- ✅ Frontend uses views: `v_matrix_direct_children`, `v_matrix_overview`, etc.
- ❌ Frontend does NOT use any `_v2` tables

### Issues Found
1. ⚠️ **View using wrong table**: `v_matrix_direct_children` references `members_v2` instead of `members`
2. ⚠️ **20 backup tables** consuming storage unnecessarily
3. ⚠️ **10 v2 functions** that may no longer be needed
4. ⚠️ **53 migration files** including many historical rebuild scripts

---

## ✅ Actions Taken

### 1. Created Migration: Fix Views (20251014000000)
**File**: `supabase/migrations/20251014000000_fix_views_use_members_table.sql`

**Purpose**: Update `v_matrix_direct_children` to use production `members` table instead of `members_v2`

**Impact**:
- Views will now reflect latest production data
- No data inconsistency between views and production

### 2. Created Migration: Cleanup Backup Tables (20251014000001)
**File**: `supabase/migrations/20251014000001_cleanup_backup_tables.sql`

**Purpose**: Remove 17 unnecessary backup tables:
- `members_v2` ❌
- `membership_v2` ❌
- `matrix_rebuild_progress_v2` ❌
- `matrix_orphaned_members_backup` ❌
- `matrix_referrals_backup` (×8 old versions) ❌
- `referrals_backup_*` (×3 old versions) ❌
- `direct_rewards_backup_20251008` ❌
- `layer_rewards_backup_20251008` ❌
- `members_backup_20251012` ❌

**Retained**:
- ✅ `matrix_referrals_backup_20251012` (most recent backup as safety)
- ✅ `v_matrix_layers_v2` (view, not a table)

---

## 🗂️ Migration Files Cleanup Recommendations

### High Priority - Archive These (One-Time Rebuild Scripts)
These were used for historical data migration and are no longer needed:

```bash
# Matrix rebuild scripts (completed, can archive)
20251009090000_repair_recent_50_members_matrix.sql
20251009095000_iterative_repair_last_50_members.sql
20251009130000_rebuild_complete_matrix_system.sql
20251010030000_rebuild_matrix_placements.sql
20251010040000_rebuild_matrix_in_temp_table.sql
20251010050000_rebuild_matrix_safe.sql
20251010170000_rebuild_with_referrer_tree.sql
20251010190000_rebuild_complete_with_overflow.sql
20251010191000_optimized_rebuild_function.sql
20251011000000_complete_matrix_rebuild_v2.sql

# Repair scripts (completed, can archive)
20251009120001_repair_existing_bcc_balances.sql
20251010060000_merge_incremental_data.sql

# Duplicate/superseded fixes (can archive)
20251008000003_fix_bcc_release_logic.sql  # Superseded by 20251009040000
20251008000004_cleanup_duplicate_bcc_functions.sql
20251009120003_cleanup_duplicate_bcc_unlock_logic.sql
```

### Medium Priority - Consider Archiving (Old Fixes)
These fixed issues that are now resolved:

```bash
20251009020000_sync_referrals_from_matrix.sql
20251009030000_fix_duplicate_level1_rewards.sql
20251009080000_fix_matrix_placement_referral_depth.sql
20251012000000_fix_matrix_duplicate_positions.sql
20251012010000_enforce_unique_position_constraint.sql
20251012020000_remove_orphaned_matrix_branches.sql
```

### Keep (Active Functionality)
These define current system behavior:

```bash
✅ 20251012140000_fix_19_layer_limit_enforcement.sql
✅ 20251012141000_fix_frontend_views.sql
✅ 20251012142000_add_view_field_aliases.sql
✅ 20251012030000_fix_matrix_direct_children_view.sql
✅ 20251012040000_fix_direct_referrals_exclude_self.sql
✅ 20251010140000_fix_pending_rewards_auto_promotion.sql
✅ 20251010141500_fix_reward_creation_check_level.sql
✅ 20251010180000_add_overflow_logic.sql
✅ 20251010181000_update_production_placement_with_overflow.sql
✅ 20251012000000_generation_based_placement.sql
```

---

## 🔧 V2 Functions Cleanup

### Functions to Review (May be obsolete)
```sql
check_reward_qualification_v2
fn_find_next_slot_v2
fn_process_rebuild_batch_v2
fn_rebuild_matrix_v2
fn_rebuild_v2_layer_distribution
fn_rebuild_v2_overflow_stats
fn_rebuild_v2_status
place_member_in_matrix_recursive_v2
process_rebuild_batch_v2
trigger_set_layer_v2
```

**Recommendation**: Check if these are called by any production code. If not, create a migration to drop them.

---

## 📋 Next Steps

### Immediate Actions (Run migrations)
```bash
# 1. Apply view fix migration
psql $DATABASE_URL -f supabase/migrations/20251014000000_fix_views_use_members_table.sql

# 2. Apply cleanup migration
psql $DATABASE_URL -f supabase/migrations/20251014000001_cleanup_backup_tables.sql
```

### Archive Old Migrations
```bash
# Move historical rebuild/repair scripts to .archive folder
mkdir -p supabase/migrations/.archive_rebuild_scripts
mv supabase/migrations/20251009090000_repair_recent_50_members_matrix.sql supabase/migrations/.archive_rebuild_scripts/
# ... (move other rebuild scripts)
```

### Drop V2 Functions (After verification)
Create migration to drop unused v2 functions after confirming they're not referenced.

---

## 📈 Expected Outcomes

### Storage Savings
- Remove ~17 backup tables
- Archive ~15-20 migration files
- Drop ~10 unused functions

### Consistency Improvements
- ✅ All views use production tables
- ✅ No data sync issues between views and tables
- ✅ Cleaner migration history

### Maintenance Benefits
- 🧹 Clearer migration history
- 🎯 Easier to identify current vs historical migrations
- 🚀 Faster migration application in new environments
