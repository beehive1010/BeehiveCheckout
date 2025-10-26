# Comprehensive Matrix Placement & Spillover Logic Audit Report
**Date**: 2025-10-10
**Database**: Supabase (db.cvqibjcbfrwsgkvthccp.supabase.co)
**Total Members**: 4,013
**Total Matrix Placements**: 52,569
**Total Matrices**: 1,518

---

## Executive Summary

This audit reveals **CRITICAL ISSUES** in the matrix placement and spillover logic:

1. **BFS + L→M→R Ordering**: INCORRECT - All matrices use OLD logic (filling each parent's L,M,R before next parent)
2. **Recursive Spillover**: PARTIALLY WORKING - Members are placed in upline matrices, but with violations
3. **Layer Depth Constraints**: MAJOR VIOLATIONS - 33,625 cases where members are at same/lower layer as their referrer
4. **Missing Placements**: 10 members have NO matrix placements at all
5. **Disabled Trigger**: The `trigger_recursive_matrix_placement` trigger is DISABLED

---

## Issue #1: CRITICAL - Incorrect BFS + L→M→R Ordering

### Status: FAIL

### Expected Behavior:
When filling matrix layer 2 (9 positions total across 3 parents):
- Positions 1-3: Fill ALL parents' L position first
- Positions 4-6: Fill ALL parents' M position
- Positions 7-9: Fill ALL parents' R position

**Expected order**: L,L,L,M,M,M,R,R,R

### Actual Behavior:
The system fills each parent's L,M,R before moving to next parent:
- Positions 1-3: Parent1 (L,M,R)
- Positions 4-6: Parent2 (L,M,R)
- Positions 7-9: Parent3 (L,M,R)

**Actual order**: L,M,R,L,M,R,L,M,R

### Evidence:
- Analyzed 100% of matrices with 9+ layer 2 members
- ALL use pattern "L,M,R,L,M,R,L,M,R" (OLD logic)
- ZERO use pattern "L,L,L,M,M,M,R,R,R" (NEW/correct logic)

### Root Cause:
The function `find_next_bfs_position_with_depth` (lines 29-53) implements the wrong algorithm:

```sql
-- CURRENT (WRONG) LOGIC:
SELECT pos_option
FROM unnest(v_available_positions) AS pos_option  -- L, M, R
WHERE NOT EXISTS (
    SELECT 1 FROM matrix_referrals mr2
    WHERE mr2.parent_wallet = mr.member_wallet
    AND mr2.position = pos_option
)
LIMIT 1
```

This finds the FIRST available position (L, M, or R) for the FIRST parent, which is the OLD logic.

### Correct Implementation Needed:
```sql
-- NEW (CORRECT) LOGIC:
-- Loop through positions: L, then M, then R
FOR v_position IN SELECT unnest(ARRAY['L', 'M', 'R']) LOOP
    -- For this position, find first parent (by BFS order) missing it
    SELECT mr.member_wallet INTO v_parent
    FROM matrix_referrals mr
    WHERE mr.matrix_root_wallet = p_matrix_root
      AND mr.layer = v_current_layer
      AND NOT EXISTS (
          SELECT 1 FROM matrix_referrals mr2
          WHERE mr2.parent_wallet = mr.member_wallet
            AND mr2.position = v_position
      )
    ORDER BY mr.created_at ASC
    LIMIT 1;

    IF v_parent IS NOT NULL THEN
        RETURN QUERY SELECT v_position, v_parent, v_current_layer + 1;
        RETURN;
    END IF;
END LOOP;
```

**Impact**: HIGH - All matrix placements are using incorrect BFS ordering

---

## Issue #2: CRITICAL - Layer Depth Constraint Violations

### Status: FAIL

### Business Rule:
Members MUST be placed at layer > their direct referrer's layer in the same matrix.

**Example**: If Alice (referrer) is at layer 3 in Bob's matrix, then Charlie (Alice's referral) must be at layer ≥ 4 in Bob's matrix.

### Violations Found:
- **Total Violations**: 33,625
- **Affected Members**: 3,592 (89.5% of all members!)
- **Affected Matrices**: 628 (41.4% of all matrices)

### Sample Violations:
| Matrix Root | Member | Member Layer | Referrer | Referrer Layer | Violation |
|-------------|--------|--------------|----------|----------------|-----------|
| 0xd47BE...C046 | 0x0015...362C | 3 | 0x7f82...eE79 | 3 | Same layer |
| 0xFC5afb...395e | 0x0015...362C | 3 | 0x7f82...eE79 | 3 | Same layer |
| 0x3C1FF5...E242 | 0x0015...362C | 7 | 0x7f82...eE79 | 7 | Same layer |

### Root Cause:
The `find_next_bfs_position_with_depth` function has logic to respect `p_min_layer` parameter, but:
1. The min_layer calculation may be incorrect
2. The function doesn't enforce strict "referrer_layer + 1" constraint
3. Historical data was created without this constraint

### Remediation Required:
1. Fix the min_layer enforcement in `find_next_bfs_position_with_depth`
2. Add database constraint to prevent future violations
3. **Rebuild all matrix_referrals data** to fix existing violations

**Impact**: CRITICAL - Violates core business rules, affects reward calculations

---

## Issue #3: HIGH - Disabled Recursive Matrix Placement Trigger

### Status: FAIL

### Finding:
The trigger `trigger_recursive_matrix_placement` is **DISABLED** on the `members` table.

```sql
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'members'::regclass AND tgname LIKE '%matrix%';

-- Result: tgenabled = 'D' (disabled)
```

### Impact:
- New members activated since trigger was disabled are NOT being placed in matrices automatically
- Manual placement is required via other functions
- Creates inconsistency in data sources (see `source` field: recursive_placement vs depth_aware_placement)

### Evidence:
- 51,949 placements with source='recursive_placement' (old data, created 2025-10-06)
- 458 placements with source='depth_aware_placement' (new data, created 2025-10-10)
- Different source = different placement logic was used

### Recommendation:
1. Fix the BFS ordering bug first (Issue #1)
2. Fix the layer depth constraint bug (Issue #2)
3. Re-enable the trigger
4. Rebuild all matrix data

**Impact**: HIGH - New members not being placed correctly

---

## Issue #4: MEDIUM - Missing Matrix Placements

### Status: FAIL

### Members with NO Matrix Placements:
10 members who have referrers and current_level > 0 but have ZERO matrix placements:

| Wallet | Activation Seq | Referrer | Activation Date |
|--------|----------------|----------|-----------------|
| 0x5e8a...339 | 3978 | 0xA12A...1bd | 2025-10-09 08:43 |
| 0x02bC...5Df | 3979 | 0x5e8a...339 | 2025-10-09 08:52 |
| 0xBee9...101 | 3980 | 0x02bC...5Df | 2025-10-09 08:58 |
| 0x1FA0...aFC | 3981 | 0xBee9...101 | 2025-10-09 09:03 |
| 0x2083...a27 | 3982 | 0x1FA0...aFC | 2025-10-09 09:09 |
| 0x86d4...8c2 | 3983 | 0x2083...a27 | 2025-10-09 09:13 |
| 0x9ccB...9d4 | 3984 | 0x86d4...8c2 | 2025-10-09 09:26 |
| 0xeDa2...291 | 3985 | 0x9ccB...9d4 | 2025-10-09 09:30 |
| 0xde44...D3C4 | 3986 | 0xeDa2...291 | 2025-10-09 09:34 |
| 0x47Db...6B2F | 3987 | 0xde44...D3C4 | 2025-10-09 09:38 |

All activated on 2025-10-09, likely when the trigger was disabled.

### Members Missing SOME Upline Matrices:
- Member 0x18c2...C8f (seq 4002): Missing 1 matrix (19th level upline - VALID, matrix full)
- Member 0x7F44...7Db (seq 3994): Missing 1 matrix

### Recommendation:
Run recursive placement function for these 10 members manually.

**Impact**: MEDIUM - Affects 10 members, prevents proper reward distribution

---

## Issue #5: PASS - Recursive Spillover Logic (When Working)

### Status: PARTIAL PASS

### Verified Correctly:
- Members ARE being placed in multiple upline matrices (up to 19 levels)
- Example: Member activation_seq=4010 appears in 19 different matrices (depth 1-19)
- The `recursive_matrix_placement` function correctly collects upline chain
- The `parent_depth` field correctly reflects position in upline chain

### Sample Verification:
Member 0xC812...de2 (activation_seq=4010):
- Total matrices: 19
- Depth levels: {1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19}
- All layer constraints respected (member_layer > referrer_layer in each matrix)

**However**: This only works when the trigger is enabled and placement functions are called.

---

## Issue #6: PASS - No Duplicate Placements

### Status: PASS

No members appear in the same matrix twice (unique constraint working correctly).

---

## Summary Table

| Issue | Severity | Status | Affected Records | Fix Priority |
|-------|----------|--------|------------------|--------------|
| BFS + L→M→R Ordering | CRITICAL | FAIL | 52,569 (100%) | P0 |
| Layer Depth Violations | CRITICAL | FAIL | 33,625 | P0 |
| Disabled Trigger | HIGH | FAIL | All new members | P0 |
| Missing Placements | MEDIUM | FAIL | 10 members | P1 |
| Recursive Spillover | MEDIUM | PARTIAL | N/A | P1 |
| Duplicate Check | LOW | PASS | 0 | N/A |

---

## Recommendations

### Immediate Actions (P0 - Critical)

1. **Fix BFS Ordering Logic**
   - Update `find_next_bfs_position_with_depth` function (lines 28-62)
   - Change from "find first available position for first parent"
   - To "find first parent with this specific position available, for L then M then R"
   - Use the corrected code provided in Issue #1

2. **Fix Layer Depth Constraint**
   - Update `place_member_in_single_matrix` to enforce strict referrer_layer + 1 minimum
   - Add validation: `v_min_layer := GREATEST(v_min_layer, v_direct_referrer_layer + 1)`
   - Consider adding database CHECK constraint

3. **Rebuild Matrix Data**
   - **CRITICAL**: All 52,569 existing placements are using wrong logic
   - Must truncate `matrix_referrals` and rebuild from scratch
   - Use corrected functions
   - Backup current data first

4. **Re-enable Trigger**
   - Only after fixing BFS and layer depth bugs
   - Test on staging environment first
   ```sql
   ALTER TABLE members ENABLE TRIGGER trigger_recursive_matrix_placement;
   ```

### Follow-up Actions (P1 - High)

5. **Backfill Missing Members**
   - Run placement for 10 members (activation_seq 3978-3987)
   - Verify they appear in all expected upline matrices

6. **Add Monitoring**
   - Create scheduled job to check for violations
   - Alert on: missing placements, layer violations, BFS ordering issues

7. **Add Tests**
   - Unit test for BFS ordering (verify L,L,L,M,M,M,R,R,R pattern)
   - Integration test for layer depth constraint
   - Test recursive spillover for member chains of length 1-19

---

## SQL Fixes

### Fix #1: Update find_next_bfs_position_with_depth

```sql
CREATE OR REPLACE FUNCTION find_next_bfs_position_with_depth(
    p_matrix_root VARCHAR(42),
    p_member_wallet VARCHAR(42),
    p_min_layer INTEGER DEFAULT 1
)
RETURNS TABLE(pos VARCHAR(10), parent VARCHAR(42), layer INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_position VARCHAR(1);
    v_parent VARCHAR(42);
    v_current_layer INTEGER;
    v_max_layer INTEGER := 19;
    v_search_start_layer INTEGER;
BEGIN
    -- Check Layer 1 first with explicit L→M→R ordering
    IF p_min_layer = 1 THEN
        FOR v_position IN SELECT unnest(ARRAY['L', 'M', 'R']) LOOP
            IF NOT EXISTS (
                SELECT 1 FROM matrix_referrals
                WHERE matrix_root_wallet = p_matrix_root
                  AND parent_wallet = p_matrix_root
                  AND position = v_position
                LIMIT 1
            ) THEN
                RETURN QUERY SELECT v_position::VARCHAR(10), p_matrix_root, 1;
                RETURN;
            END IF;
        END LOOP;
        v_search_start_layer := 1;
    ELSE
        v_search_start_layer := p_min_layer - 1;
    END IF;

    -- ✅ CORRECTED LOGIC: For each layer, fill ALL L's, then ALL M's, then ALL R's
    FOR v_current_layer IN v_search_start_layer..v_max_layer-1 LOOP
        -- Loop through positions in L→M→R order
        FOR v_position IN SELECT unnest(ARRAY['L', 'M', 'R']) LOOP
            -- For THIS position, find the first parent (in BFS order) that doesn't have it filled
            SELECT mr.member_wallet
            INTO v_parent
            FROM matrix_referrals mr
            WHERE mr.matrix_root_wallet = p_matrix_root
              AND mr.layer = v_current_layer
              AND NOT EXISTS (
                  SELECT 1 FROM matrix_referrals mr2
                  WHERE mr2.matrix_root_wallet = p_matrix_root
                    AND mr2.parent_wallet = mr.member_wallet
                    AND mr2.position = v_position
              )
            ORDER BY mr.created_at ASC
            LIMIT 1;

            -- If we found a parent with this position available, return it
            IF v_parent IS NOT NULL THEN
                RETURN QUERY SELECT v_position::VARCHAR(10), v_parent, v_current_layer + 1;
                RETURN;
            END IF;
        END LOOP;
    END LOOP;

    -- No available position found
    RETURN QUERY SELECT NULL::VARCHAR(10), NULL::VARCHAR(42), NULL::INTEGER;
END;
$$;
```

### Fix #2: Enforce Strict Layer Depth Constraint

```sql
-- In place_member_in_single_matrix, update lines 40-51:

IF v_direct_referrer_layer IS NOT NULL THEN
    -- ✅ ENFORCE: Member must be at MINIMUM referrer_layer + 1
    v_min_layer := v_direct_referrer_layer + 1;
    RAISE NOTICE '  📍 Referrer (%) is at layer %, setting min_layer = %',
        v_ref_wallet, v_direct_referrer_layer, v_min_layer;
ELSE
    v_min_layer := 1;
    RAISE NOTICE '  ⚠️ Referrer not found in matrix, using min_layer = 1';
END IF;
```

### Fix #3: Re-enable Trigger

```sql
-- Only run AFTER fixing functions above
ALTER TABLE members ENABLE TRIGGER trigger_recursive_matrix_placement;
```

### Fix #4: Rebuild All Matrix Data

```sql
-- BACKUP FIRST
CREATE TABLE matrix_referrals_backup_20251010 AS SELECT * FROM matrix_referrals;

-- Truncate and rebuild
TRUNCATE TABLE matrix_referrals;

-- Rebuild for all members (run in batches if needed)
DO $$
DECLARE
    v_member RECORD;
BEGIN
    FOR v_member IN
        SELECT wallet_address, referrer_wallet, activation_sequence
        FROM members
        WHERE referrer_wallet IS NOT NULL
          AND current_level > 0
          AND wallet_address != referrer_wallet
        ORDER BY activation_sequence
    LOOP
        PERFORM recursive_matrix_placement(
            v_member.wallet_address,
            v_member.referrer_wallet
        );

        -- Log progress every 100 members
        IF v_member.activation_sequence % 100 = 0 THEN
            RAISE NOTICE 'Processed member % (seq %)',
                v_member.wallet_address, v_member.activation_sequence;
        END IF;
    END LOOP;
END $$;
```

---

## Testing Checklist

After implementing fixes, verify:

- [ ] Layer 2 positions follow "L,L,L,M,M,M,R,R,R" pattern
- [ ] Layer 3 positions follow "L,L,L,L,L,L,L,L,L,M,M,M,M,M,M,M,M,M,R,R,R,R,R,R,R,R,R" pattern
- [ ] No member is at same/lower layer as their referrer in any matrix
- [ ] All members with referrers have matrix placements
- [ ] Members appear in correct number of upline matrices (up to 19)
- [ ] New member activation triggers matrix placement automatically
- [ ] `parent_depth` values range from 1 to 19
- [ ] No duplicate placements (member appears in same matrix twice)
- [ ] Layer values range from 1 to 19 only

---

## Conclusion

The matrix placement system has **CRITICAL BUGS** that affect 100% of placements:

1. **Wrong BFS ordering** - All 52,569 placements use incorrect per-parent L,M,R logic
2. **Layer violations** - 33,625 cases violate the "member must be deeper than referrer" rule
3. **Disabled trigger** - New members not being placed automatically

**Required Action**: Complete system rebuild with corrected logic.

**Estimated Effort**:
- Fix functions: 2-4 hours
- Test fixes: 2-3 hours
- Rebuild data: 4-8 hours (depending on database size/performance)
- Validation: 2-4 hours

**Total**: 10-19 hours

---

**Report Generated**: 2025-10-10
**Auditor**: Claude Code (Database Auditor Agent)
