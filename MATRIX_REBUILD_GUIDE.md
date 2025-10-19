# Matrix Rebuild Guide - Branch-First BFS Implementation

## Overview

This guide explains how to execute the matrix rebuild using the new **Branch-First BFS** (Breadth-First Search) placement strategy. The rebuild process is designed to be safe, auditable, and reversible.

## Migration Files Created

The following migration files implement the Branch-First BFS system:

1. **`20251019000000_cleanup_old_matrix_system.sql`**
   - Removes old triggers and functions
   - Adds new columns to `matrix_referrals` table
   - Creates `matrix_config` configuration table
   - Creates `matrix_placement_events` audit log table

2. **`20251019000001_create_branch_bfs_placement_function.sql`**
   - Implements `fn_place_member_branch_bfs()` core placement function
   - Handles recursive placement with entry node logic
   - Supports branch-first search with global fallback

3. **`20251019000002_create_matrix_views.sql`**
   - Creates 4 core views for frontend consumption:
     - `v_matrix_layer_tree` - Full tree visualization
     - `v_matrix_layer_summary` - Layer capacity metrics
     - `v_direct_vs_layer_mismatch` - Audit view for mismatches
     - `v_matrix_next_open_slots` - Placement predictions
   - Creates `v_matrix_root_summary` for admin dashboard

4. **`20251019000003_create_data_rebuild_functions.sql`**
   - Creates shadow rebuild infrastructure
   - Implements rebuild, comparison, commit, and rollback functions
   - Provides safety checks and backup mechanisms

5. **`20251019000004_create_matrix_triggers.sql`**
   - Auto-placement trigger for new member activations
   - Validation trigger for matrix integrity
   - Layer rewards trigger (commented out by default)
   - Manual placement helper function

## Execution Steps

### Phase 1: Apply Migrations

```bash
# Navigate to project directory
cd /home/ubuntu/WebstormProjects/BeehiveCheckout

# Apply migrations using Supabase CLI
supabase db push
```

Or apply manually via Supabase Dashboard:
1. Open Supabase Dashboard → SQL Editor
2. Copy and execute each migration file in order

### Phase 2: Rebuild Matrix Data (Dry Run)

```sql
-- Execute dry run to preview changes
SELECT fn_rebuild_matrix_placements(
    p_batch_id := 'rebuild_preview_' || TO_CHAR(NOW(), 'YYYYMMDD'),
    p_dry_run := TRUE
);

-- This will return a summary:
-- {
--   "success": true,
--   "batch_id": "rebuild_preview_20251019",
--   "dry_run": true,
--   "processed_count": 1500,
--   "success_count": 1480,
--   "error_count": 20,
--   "errors": [...],
--   "duration_seconds": 45.3
-- }
```

**Review the errors** returned in the JSON response. Common errors:
- Members with no referrer
- Orphaned members
- Invalid activation timestamps

### Phase 3: Execute Actual Rebuild

```sql
-- Execute actual rebuild (writes to production matrix_referrals)
SELECT fn_rebuild_matrix_placements(
    p_batch_id := 'rebuild_production_' || TO_CHAR(NOW(), 'YYYYMMDD'),
    p_dry_run := FALSE
);

-- Monitor progress via placement events
SELECT event_type, COUNT(*)
FROM matrix_placement_events
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY event_type;
```

### Phase 4: Compare Old vs New Data

```sql
-- Generate comparison report
SELECT fn_compare_matrix_placements();

-- This returns:
-- {
--   "success": true,
--   "total_members": 1480,
--   "unchanged_count": 1120,
--   "changed_count": 360,
--   "high_impact_count": 15,
--   "medium_impact_count": 145,
--   "low_impact_count": 200,
--   "change_percentage": 24.32
-- }

-- Review high impact changes
SELECT
    member_wallet,
    matrix_root_wallet,
    old_parent_wallet || '→' || old_slot || '→L' || old_layer as old_position,
    new_parent_wallet || '→' || new_slot || '→L' || new_layer as new_position,
    change_type,
    change_details
FROM matrix_rebuild_comparison
WHERE impact_level = 'high'
ORDER BY member_wallet;
```

### Phase 5: Commit Rebuild to Production

**⚠️ WARNING: This is a destructive operation with backup**

```sql
-- Commit changes (requires force flag if high impact changes detected)
SELECT fn_commit_matrix_rebuild(p_force := TRUE);

-- This will:
-- 1. Backup current production to matrix_referrals_archive
-- 2. Delete old production data
-- 3. Copy shadow data to production
-- 4. Clear shadow table
-- 5. Return summary

-- Verify commit success
SELECT COUNT(*) as total_placements
FROM matrix_referrals;

SELECT matrix_root_wallet, COUNT(*) as member_count
FROM matrix_referrals
GROUP BY matrix_root_wallet
ORDER BY member_count DESC
LIMIT 10;
```

### Phase 6: Verify Results

```sql
-- Check tree integrity
SELECT * FROM v_matrix_layer_summary
ORDER BY matrix_root_wallet, layer;

-- Check for mismatches
SELECT COUNT(*) as mismatch_count
FROM v_direct_vs_layer_mismatch
WHERE is_mismatch = TRUE;

-- Check placement events
SELECT event_type, COUNT(*)
FROM matrix_placement_events
WHERE created_at >= NOW() - INTERVAL '2 hours'
GROUP BY event_type;

-- Verify next open slots prediction
SELECT * FROM v_matrix_next_open_slots
WHERE confidence_level = 'HIGH'
LIMIT 20;
```

## Emergency Rollback

If something goes wrong, you can rollback to the previous state:

```sql
-- Rollback to archive (emergency recovery)
SELECT fn_rollback_matrix_rebuild();

-- Verify rollback
SELECT COUNT(*) as restored_count FROM matrix_referrals;
```

## Post-Deployment Validation

### Validation Checklist

- [ ] All active members have matrix placements
- [ ] No duplicate placements (each member appears once per matrix_root)
- [ ] Layer 1 members have parent = matrix_root and referral_type = 'direct'
- [ ] All other members have referral_type = 'spillover'
- [ ] Parent-child relationships are valid (layer = parent_layer + 1)
- [ ] Each parent has max 3 children (L, M, R)
- [ ] BFS order is sequential within each matrix
- [ ] Views return correct data

### Validation Queries

```sql
-- 1. Check for missing placements
SELECT m.wallet_address, m.membership_status
FROM members m
LEFT JOIN matrix_referrals mr ON mr.member_wallet = m.wallet_address
WHERE m.membership_status = 'active'
AND mr.member_wallet IS NULL;

-- 2. Check for duplicate placements
SELECT member_wallet, matrix_root_wallet, COUNT(*)
FROM matrix_referrals
GROUP BY member_wallet, matrix_root_wallet
HAVING COUNT(*) > 1;

-- 3. Validate layer 1 rules
SELECT member_wallet, parent_wallet, matrix_root_wallet, referral_type
FROM matrix_referrals
WHERE layer = 1
AND (parent_wallet != matrix_root_wallet OR referral_type != 'direct');

-- 4. Validate parent-child layer relationship
SELECT
    child.member_wallet,
    child.layer as child_layer,
    parent.layer as parent_layer
FROM matrix_referrals child
JOIN matrix_referrals parent ON child.parent_wallet = parent.member_wallet
    AND child.matrix_root_wallet = parent.matrix_root_wallet
WHERE child.layer != parent.layer + 1;

-- 5. Check parent slot overflow
SELECT parent_wallet, matrix_root_wallet, COUNT(*) as children_count
FROM matrix_referrals
GROUP BY parent_wallet, matrix_root_wallet
HAVING COUNT(*) > 3;

-- 6. Validate BFS order
SELECT matrix_root_wallet, COUNT(DISTINCT bfs_order) as unique_orders, COUNT(*) as total_members
FROM matrix_referrals
GROUP BY matrix_root_wallet;
```

## Configuration

The system behavior is controlled via `matrix_config` table:

```sql
-- View current configuration
SELECT * FROM matrix_config;

-- Update configuration (example)
UPDATE matrix_config
SET config_value = '15'
WHERE config_key = 'max_layer_depth';

-- Add layer reward configuration
INSERT INTO matrix_config (config_key, config_value, description)
VALUES (
    'layer_reward_amounts',
    '{"1": 10, "2": 5, "3": 3, "4": 2, "5": 1, "default": 0.5}',
    'Reward amounts by generation level'
)
ON CONFLICT (config_key) DO UPDATE
SET config_value = EXCLUDED.config_value;
```

## Monitoring

Monitor system health via placement events:

```sql
-- Recent placement events
SELECT
    event_type,
    member_wallet,
    matrix_root_wallet,
    error_message,
    created_at
FROM matrix_placement_events
ORDER BY created_at DESC
LIMIT 50;

-- Failure rate
SELECT
    event_type,
    COUNT(*) as count,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM matrix_placement_events) * 100, 2) as percentage
FROM matrix_placement_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type;
```

## New Member Auto-Placement

After migrations are applied, new members will automatically be placed in the matrix when their membership is activated:

```sql
-- The trigger handles this automatically
-- Manual placement (if needed):
SELECT fn_manual_place_member('0x1234...');
```

## Frontend Integration

The following views are available for frontend queries:

### Matrix Tree View
```typescript
const { data: treeData } = await supabase
  .from('v_matrix_layer_tree')
  .select('*')
  .eq('matrix_root_wallet', rootWallet)
  .order('bfs_order');
```

### Layer Summary
```typescript
const { data: layerStats } = await supabase
  .from('v_matrix_layer_summary')
  .select('*')
  .eq('matrix_root_wallet', rootWallet)
  .order('layer');
```

### Next Open Slots
```typescript
const { data: nextSlots } = await supabase
  .from('v_matrix_next_open_slots')
  .select('*')
  .eq('matrix_root_wallet', rootWallet)
  .eq('confidence_level', 'HIGH')
  .limit(10);
```

## Troubleshooting

### Issue: Rebuild fails with errors

**Solution**: Review error details in the returned JSON:
```sql
SELECT fn_rebuild_matrix_placements(p_dry_run := TRUE);
```

Check for members without referrers:
```sql
SELECT m.wallet_address
FROM members m
LEFT JOIN referrals r ON r.referred_wallet = m.wallet_address
WHERE m.membership_status = 'active'
AND r.referrer_wallet IS NULL;
```

### Issue: High impact changes detected

**Solution**: Review comparison table:
```sql
SELECT * FROM matrix_rebuild_comparison
WHERE impact_level = 'high';
```

Use force flag if changes are acceptable:
```sql
SELECT fn_commit_matrix_rebuild(p_force := TRUE);
```

### Issue: Performance slow during rebuild

**Solution**: Process in batches or add indexes:
```sql
CREATE INDEX CONCURRENTLY idx_members_activation_seq ON members(activation_sequence);
CREATE INDEX CONCURRENTLY idx_referrals_referred ON referrals(referred_wallet);
```

## Support

For issues or questions:
1. Check `matrix_placement_events` table for detailed logs
2. Review `matrix_rebuild_comparison` table for impact analysis
3. Use `fn_rollback_matrix_rebuild()` for emergency recovery
4. Contact system administrator

---

**Last Updated**: 2025-10-19
**Version**: 1.0 - Branch-First BFS Implementation
