-- ============================================================================
-- Rebuild All Matrices Using Existing Placement Functions
-- Purpose: Clear and rebuild all matrix_referrals data using the fixed
--          place_member_in_single_matrix and batch_place_member_in_matrices
-- Date: 2025-10-27
-- ============================================================================

-- ===================================
-- Step 1: Backup existing data
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📦 Step 1: Creating backup...';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Drop old backup if exists
DROP TABLE IF EXISTS matrix_referrals_backup_final;

-- Create new backup
CREATE TABLE matrix_referrals_backup_final AS
SELECT * FROM matrix_referrals;

DO $$
DECLARE
    v_backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_backup_count FROM matrix_referrals_backup_final;
    RAISE NOTICE '✅ Backed up % records to matrix_referrals_backup_final', v_backup_count;
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 2: Clear existing data
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🗑️  Step 2: Clearing matrix_referrals table...';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

TRUNCATE TABLE matrix_referrals CASCADE;

RAISE NOTICE '✅ Cleared all matrix_referrals records';
RAISE NOTICE '';

-- ===================================
-- Step 3: Clear placement progress table
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🧹 Step 3: Clearing placement progress table...';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

TRUNCATE TABLE matrix_placement_progress CASCADE;

RAISE NOTICE '✅ Cleared placement progress';
RAISE NOTICE '';

-- ===================================
-- Step 4: Rebuild matrices for all members
-- ===================================

DO $$
DECLARE
    v_member RECORD;
    v_result RECORD;
    v_total_members INTEGER;
    v_processed INTEGER := 0;
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_total_placements INTEGER := 0;
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔨 Step 4: Rebuilding matrices for all members...';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';

    -- Get total member count
    SELECT COUNT(*) INTO v_total_members
    FROM members
    WHERE activation_sequence IS NOT NULL
    AND referrer_wallet IS NOT NULL;

    RAISE NOTICE '📊 Total members to process: %', v_total_members;
    RAISE NOTICE '';

    -- Process each member in activation_sequence order
    FOR v_member IN
        SELECT
            m.wallet_address,
            m.referrer_wallet,
            m.activation_sequence,
            u.username
        FROM members m
        LEFT JOIN users u ON u.wallet_address = m.wallet_address
        WHERE m.activation_sequence IS NOT NULL
        AND m.referrer_wallet IS NOT NULL
        ORDER BY m.activation_sequence ASC
    LOOP
        v_processed := v_processed + 1;

        -- Call batch_place_member_in_matrices to place this member in all ancestor matrices
        BEGIN
            SELECT * INTO v_result
            FROM batch_place_member_in_matrices(
                v_member.wallet_address,
                v_member.referrer_wallet,
                19  -- Process all 19 levels at once
            );

            IF v_result.status IN ('completed', 'partial') THEN
                v_success_count := v_success_count + 1;
                v_total_placements := v_total_placements + v_result.succeeded;

                -- Progress reporting every 50 members
                IF v_processed % 50 = 0 THEN
                    RAISE NOTICE '📊 Progress: %/% members (%.1f%%) | Placements: % | Success: %',
                        v_processed,
                        v_total_members,
                        (v_processed * 100.0 / v_total_members),
                        v_total_placements,
                        v_success_count;
                END IF;

                -- Detailed logging every 100 members
                IF v_processed % 100 = 0 THEN
                    RAISE NOTICE '';
                    RAISE NOTICE '  ✅ Member: % (seq: %)', v_member.username, v_member.activation_sequence;
                    RAISE NOTICE '     Placed in % ancestor matrices', v_result.succeeded;
                    RAISE NOTICE '';
                END IF;

            ELSE
                v_failed_count := v_failed_count + 1;
                RAISE WARNING '  ❌ Failed to place member % (seq: %): %',
                    v_member.username,
                    v_member.activation_sequence,
                    v_result.status;
            END IF;

        EXCEPTION
            WHEN OTHERS THEN
                v_failed_count := v_failed_count + 1;
                RAISE WARNING '  ⚠️  Exception placing member % (seq: %): %',
                    v_member.username,
                    v_member.activation_sequence,
                    SQLERRM;
        END;

    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ Step 4 Complete: Matrix Rebuild Summary';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '   Total members processed: %', v_processed;
    RAISE NOTICE '   Successful: %', v_success_count;
    RAISE NOTICE '   Failed: %', v_failed_count;
    RAISE NOTICE '   Total matrix placements: %', v_total_placements;
    RAISE NOTICE '';

END $$;

-- ===================================
-- Step 5: Comprehensive Verification
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔍 Step 5: Verification';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
END $$;

-- Verification 1: Total records
SELECT
    '✅ V1: Total Records' as check_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT matrix_root_wallet) as unique_matrices,
    COUNT(DISTINCT member_wallet) as unique_members
FROM matrix_referrals;

-- Verification 2: Position/Slot consistency
SELECT
    '✅ V2: Position/Slot Consistency' as check_name,
    COUNT(*) FILTER (WHERE position != slot) as mismatched,
    COUNT(*) FILTER (WHERE position IS NULL OR slot IS NULL) as null_values,
    COUNT(*) as total_records
FROM matrix_referrals;

-- Verification 3: BFS Order completeness
SELECT
    '✅ V3: BFS Order' as check_name,
    COUNT(*) FILTER (WHERE bfs_order IS NULL) as null_bfs_order,
    COUNT(*) FILTER (WHERE bfs_order IS NOT NULL) as valid_bfs_order
FROM matrix_referrals;

-- Verification 4: Wrong slot patterns (should all be 0)
SELECT
    '❌ V4: Wrong Patterns (should be 0)' as check_name,
    COUNT(*) FILTER (WHERE has_L = 0 AND has_M = 1 AND has_R = 0) as only_M,
    COUNT(*) FILTER (WHERE has_L = 0 AND has_M = 0 AND has_R = 1) as only_R,
    COUNT(*) FILTER (WHERE has_L = 1 AND has_M = 0 AND has_R = 1) as L_and_R_no_M,
    COUNT(*) FILTER (WHERE has_L = 0 AND has_M = 1 AND has_R = 1) as M_and_R_no_L
FROM (
    SELECT
        parent_wallet,
        COUNT(*) FILTER (WHERE slot = 'L') as has_L,
        COUNT(*) FILTER (WHERE slot = 'M') as has_M,
        COUNT(*) FILTER (WHERE slot = 'R') as has_R
    FROM matrix_referrals
    WHERE parent_wallet IS NOT NULL
    GROUP BY parent_wallet
) patterns;

-- Verification 5: Correct patterns distribution
SELECT
    '✅ V5: Correct Patterns' as check_name,
    COUNT(*) FILTER (WHERE has_L = 1 AND has_M = 0 AND has_R = 0) as "1_child_L_only",
    COUNT(*) FILTER (WHERE has_L = 1 AND has_M = 1 AND has_R = 0) as "2_children_L_M",
    COUNT(*) FILTER (WHERE has_L = 1 AND has_M = 1 AND has_R = 1) as "3_children_L_M_R"
FROM (
    SELECT
        parent_wallet,
        COUNT(*) FILTER (WHERE slot = 'L') as has_L,
        COUNT(*) FILTER (WHERE slot = 'M') as has_M,
        COUNT(*) FILTER (WHERE slot = 'R') as has_R
    FROM matrix_referrals
    WHERE parent_wallet IS NOT NULL
    GROUP BY parent_wallet
) patterns;

-- Verification 6: Slot distribution
SELECT
    '📊 V6: Slot Distribution' as check_name,
    COUNT(*) FILTER (WHERE slot = 'L') as L_count,
    ROUND(COUNT(*) FILTER (WHERE slot = 'L') * 100.0 / COUNT(*), 1) as L_pct,
    COUNT(*) FILTER (WHERE slot = 'M') as M_count,
    ROUND(COUNT(*) FILTER (WHERE slot = 'M') * 100.0 / COUNT(*), 1) as M_pct,
    COUNT(*) FILTER (WHERE slot = 'R') as R_count,
    ROUND(COUNT(*) FILTER (WHERE slot = 'R') * 100.0 / COUNT(*), 1) as R_pct
FROM matrix_referrals
WHERE slot IS NOT NULL;

-- Verification 7: FT1 Matrix Layer 1 (should be FT2-L, FT3-M, FT4-R)
SELECT
    '🔍 V7: FT1 Layer 1 Children' as info,
    slot,
    u.username,
    SUBSTRING(member_wallet, 39, 4) as wallet_tail,
    bfs_order,
    referral_type
FROM matrix_referrals mr
LEFT JOIN users u ON u.wallet_address = mr.member_wallet
WHERE matrix_root_wallet = '0x2B03D532faa3120826586efb00C9363F9a611b6f'
AND layer = 1
ORDER BY slot;

-- Verification 8: Layer distribution for FT1 matrix
SELECT
    '📊 V8: FT1 Matrix Layer Distribution' as info,
    layer,
    COUNT(*) as member_count,
    COUNT(*) FILTER (WHERE slot = 'L') as L_count,
    COUNT(*) FILTER (WHERE slot = 'M') as M_count,
    COUNT(*) FILTER (WHERE slot = 'R') as R_count
FROM matrix_referrals
WHERE matrix_root_wallet = '0x2B03D532faa3120826586efb00C9363F9a611b6f'
GROUP BY layer
ORDER BY layer
LIMIT 10;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ Matrix Rebuild Complete!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '   • All matrices rebuilt using batch_place_member_in_matrices()';
    RAISE NOTICE '   • Members processed in activation_sequence order';
    RAISE NOTICE '   • Each member placed in up to 19 ancestor matrices';
    RAISE NOTICE '   • BFS L→M→R slot filling algorithm applied';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Review verification results above:';
    RAISE NOTICE '   • V4 (Wrong Patterns) should all be 0';
    RAISE NOTICE '   • V6 (Slot Distribution) should be roughly 33% each';
    RAISE NOTICE '   • V7 (FT1 L1) should show FT2-L, FT3-M, FT4-R';
    RAISE NOTICE '';
END $$;
