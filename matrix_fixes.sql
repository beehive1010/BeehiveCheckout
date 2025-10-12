-- ============================================================================
-- Matrix Placement Bug Fixes
-- Date: 2025-10-10
-- Purpose: Fix BFS ordering and layer depth constraint violations
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BACKUP EXISTING DATA FIRST
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS matrix_referrals_backup_20251010;
CREATE TABLE matrix_referrals_backup_20251010 AS SELECT * FROM matrix_referrals;

DROP TABLE IF EXISTS referrals_backup_20251010;
CREATE TABLE referrals_backup_20251010 AS SELECT * FROM referrals;

-- ----------------------------------------------------------------------------
-- FIX #1: Correct the BFS Position Finding Logic
-- Issue: Current function uses "first available position for first parent"
-- Fix: Change to "first parent with this specific position available, for L then M then R"
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- FIX #2: Update find_next_bfs_position (non-depth-aware version)
-- This is used by recursive_matrix_placement
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION find_next_bfs_position(
    p_matrix_root VARCHAR(42),
    p_member_wallet VARCHAR(42)
)
RETURNS TABLE(pos VARCHAR(10), parent VARCHAR(42), layer INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_position VARCHAR(1);
    v_parent VARCHAR(42);
    v_current_layer INTEGER;
BEGIN
    -- Check Layer 1 first with explicit L→M→R ordering
    FOR v_position IN
        SELECT t.pos
        FROM unnest(ARRAY['L', 'M', 'R']) WITH ORDINALITY AS t(pos, ord)
        ORDER BY t.ord
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM matrix_referrals
            WHERE matrix_root_wallet = p_matrix_root
              AND parent_wallet = p_matrix_root
              AND position = v_position
        ) THEN
            RETURN QUERY SELECT v_position::VARCHAR(10), p_matrix_root, 1;
            RETURN;
        END IF;
    END LOOP;

    -- ✅ CORRECTED LOGIC: For each layer, check ALL parents' L positions first,
    -- then ALL parents' M positions, then ALL parents' R positions
    FOR v_current_layer IN 1..18 LOOP
        -- Loop through positions in L→M→R order
        FOR v_position IN
            SELECT t.pos
            FROM unnest(ARRAY['L', 'M', 'R']) WITH ORDINALITY AS t(pos, ord)
            ORDER BY t.ord
        LOOP
            -- For this position, find the first parent (in BFS order) that doesn't have it filled
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

-- ----------------------------------------------------------------------------
-- FIX #3: Add Layer Depth Constraint Enforcement
-- Update place_member_in_single_matrix to enforce strict referrer_layer + 1
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION place_member_in_single_matrix(
    p_member_wallet VARCHAR(42),
    p_matrix_root VARCHAR(42),
    p_parent_depth INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    layer INTEGER,
    "position" VARCHAR(10),
    parent_wallet VARCHAR(42),
    error_msg TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_position VARCHAR(10);
    v_parent_wallet VARCHAR(42);
    v_layer INTEGER;
    v_ref_wallet VARCHAR(42);
    v_min_layer INTEGER;
    v_direct_referrer_layer INTEGER;
BEGIN
    -- Check if already exists
    IF EXISTS (
        SELECT 1 FROM matrix_referrals
        WHERE matrix_root_wallet = p_matrix_root
          AND member_wallet = p_member_wallet
        LIMIT 1
    ) THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::VARCHAR, NULL::VARCHAR(42),
            'Already placed in this matrix'::TEXT;
        RETURN;
    END IF;

    -- ✅ Calculate minimum layer
    IF p_parent_depth = 1 THEN
        v_min_layer := 1;
        RAISE NOTICE '  📍 Direct referral (depth=1), min_layer = 1';
    ELSE
        -- Get member's referrer
        SELECT referrer_wallet INTO v_ref_wallet
        FROM members
        WHERE wallet_address = p_member_wallet;

        IF v_ref_wallet IS NOT NULL THEN
            -- ✅ Find direct referrer's layer in this matrix
            SELECT mr.layer INTO v_direct_referrer_layer
            FROM matrix_referrals mr
            WHERE mr.matrix_root_wallet = p_matrix_root
              AND mr.member_wallet = v_ref_wallet
            LIMIT 1;

            IF v_direct_referrer_layer IS NOT NULL THEN
                -- ✅ ENFORCE: Member must be at MINIMUM referrer_layer + 1
                v_min_layer := v_direct_referrer_layer + 1;
                RAISE NOTICE '  📍 Referrer (%) is at layer %, setting min_layer = %',
                    v_ref_wallet, v_direct_referrer_layer, v_min_layer;
            ELSE
                v_min_layer := 1;
                RAISE NOTICE '  ⚠️ Referrer not found in matrix, using min_layer = 1';
            END IF;
        ELSE
            v_min_layer := 1;
        END IF;
    END IF;

    -- ✅ Use corrected BFS position finding function
    SELECT result.pos, result.parent, result.layer
    INTO v_position, v_parent_wallet, v_layer
    FROM find_next_bfs_position_with_depth(p_matrix_root, p_member_wallet, v_min_layer) AS result;

    -- If no position found or exceeds max layer
    IF v_position IS NULL OR v_layer IS NULL OR v_layer > 19 THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::VARCHAR, NULL::VARCHAR(42),
            'No available position or exceeds max layer'::TEXT;
        RETURN;
    END IF;

    -- Insert matrix_referrals
    INSERT INTO matrix_referrals (
        matrix_root_wallet,
        member_wallet,
        parent_wallet,
        parent_depth,
        layer,
        position,
        referral_type,
        source
    ) VALUES (
        p_matrix_root,
        p_member_wallet,
        v_parent_wallet,
        p_parent_depth,
        v_layer,
        v_position,
        CASE WHEN p_parent_depth = 1 THEN 'is_direct' ELSE 'is_spillover' END,
        'depth_aware_placement'
    );

    -- Sync to referrals table (if direct referrer matrix)
    IF p_parent_depth = 1 THEN
        IF NOT EXISTS (
            SELECT 1 FROM referrals
            WHERE matrix_root_wallet = p_matrix_root
              AND member_wallet = p_member_wallet
        ) THEN
            INSERT INTO referrals (
                member_wallet,
                referrer_wallet,
                matrix_root_wallet,
                matrix_root_sequence,
                matrix_layer,
                matrix_position,
                member_activation_sequence,
                is_direct_referral,
                is_spillover_placement,
                placed_at
            ) VALUES (
                p_member_wallet,
                p_matrix_root,
                p_matrix_root,
                (SELECT activation_sequence FROM members WHERE wallet_address = p_matrix_root),
                v_layer,
                v_position,
                (SELECT activation_sequence FROM members WHERE wallet_address = p_member_wallet),
                (v_layer = 1),
                (v_layer > 1),
                NOW()
            );
        END IF;
    END IF;

    RETURN QUERY SELECT TRUE, v_layer, v_position, v_parent_wallet, NULL::TEXT;
END;
$$;

-- ----------------------------------------------------------------------------
-- VERIFICATION QUERIES
-- Run these after applying fixes but BEFORE rebuilding data
-- ----------------------------------------------------------------------------

-- Test 1: Verify BFS logic returns correct positions
SELECT * FROM find_next_bfs_position_with_depth(
    '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab',
    'test_wallet',
    1
);

-- Test 2: Verify function handles min_layer correctly
SELECT * FROM find_next_bfs_position_with_depth(
    '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab',
    'test_wallet',
    5  -- Should skip to layer 5+
);

-- ----------------------------------------------------------------------------
-- DATA REBUILD SCRIPT
-- WARNING: Only run AFTER testing fixes on staging environment
-- ----------------------------------------------------------------------------

-- Step 1: Clear existing matrix data
-- TRUNCATE TABLE matrix_referrals;
-- DELETE FROM referrals WHERE matrix_root_wallet IS NOT NULL;

-- Step 2: Rebuild matrix placements for all members
-- This will take 4-8 hours for 4000+ members
-- Consider running in batches or background job

/*
DO $$
DECLARE
    v_member RECORD;
    v_result RECORD;
    v_processed INTEGER := 0;
    v_failed INTEGER := 0;
BEGIN
    FOR v_member IN
        SELECT wallet_address, referrer_wallet, activation_sequence
        FROM members
        WHERE referrer_wallet IS NOT NULL
          AND current_level > 0
          AND wallet_address != referrer_wallet
        ORDER BY activation_sequence
    LOOP
        BEGIN
            -- Call recursive matrix placement
            SELECT * INTO v_result
            FROM recursive_matrix_placement(
                v_member.wallet_address,
                v_member.referrer_wallet
            );

            v_processed := v_processed + 1;

            -- Log progress every 50 members
            IF v_member.activation_sequence % 50 = 0 THEN
                RAISE NOTICE '[%] Processed member % (seq %), placements: %, deepest: %',
                    now()::time,
                    v_member.wallet_address,
                    v_member.activation_sequence,
                    v_result.placements_created,
                    v_result.deepest_layer;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
            RAISE WARNING 'Failed to place member % (seq %): %',
                v_member.wallet_address,
                v_member.activation_sequence,
                SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Rebuild complete: % processed, % failed', v_processed, v_failed;
END $$;
*/

-- ----------------------------------------------------------------------------
-- POST-REBUILD VALIDATION QUERIES
-- Run these AFTER rebuilding to verify correctness
-- ----------------------------------------------------------------------------

-- Validation 1: Check BFS ordering for random matrices
WITH layer2_check AS (
    SELECT
        matrix_root_wallet,
        string_agg(position, ',' ORDER BY m.activation_sequence) as fill_order,
        COUNT(*) as total
    FROM matrix_referrals mr
    INNER JOIN members m ON mr.member_wallet = m.wallet_address
    WHERE mr.layer = 2
    GROUP BY matrix_root_wallet
    HAVING COUNT(*) = 9
)
SELECT
    COUNT(*) as total_matrices,
    COUNT(CASE WHEN fill_order = 'L,L,L,M,M,M,R,R,R' THEN 1 END) as correct_order,
    COUNT(CASE WHEN fill_order = 'L,M,R,L,M,R,L,M,R' THEN 1 END) as old_order,
    COUNT(CASE WHEN fill_order NOT IN ('L,L,L,M,M,M,R,R,R', 'L,M,R,L,M,R,L,M,R') THEN 1 END) as other_order
FROM layer2_check;

-- Expected: correct_order = 100%, old_order = 0%

-- Validation 2: Check for layer depth violations
WITH member_layers AS (
    SELECT
        mr.matrix_root_wallet,
        mr.member_wallet,
        mr.layer,
        m.referrer_wallet
    FROM matrix_referrals mr
    INNER JOIN members m ON mr.member_wallet = m.wallet_address
    WHERE m.referrer_wallet IS NOT NULL
),
referrer_layers AS (
    SELECT
        ml.matrix_root_wallet,
        ml.member_wallet,
        ml.layer as member_layer,
        ml.referrer_wallet,
        mr2.layer as referrer_layer
    FROM member_layers ml
    LEFT JOIN matrix_referrals mr2
        ON ml.matrix_root_wallet = mr2.matrix_root_wallet
        AND ml.referrer_wallet = mr2.member_wallet
)
SELECT
    COUNT(*) as total_placements_with_referrer,
    COUNT(CASE WHEN referrer_layer IS NOT NULL AND member_layer <= referrer_layer THEN 1 END) as violations,
    COUNT(CASE WHEN referrer_layer IS NOT NULL AND member_layer > referrer_layer THEN 1 END) as correct
FROM referrer_layers;

-- Expected: violations = 0

-- Validation 3: Check all members have placements
SELECT
    COUNT(*) as members_missing_placements
FROM members m
WHERE m.referrer_wallet IS NOT NULL
  AND m.current_level > 0
  AND m.wallet_address != m.referrer_wallet
  AND NOT EXISTS (
      SELECT 1 FROM matrix_referrals mr
      WHERE mr.member_wallet = m.wallet_address
  );

-- Expected: 0 (except members where upline matrix is full at layer 19)

-- Validation 4: Check upline placement count
WITH upline_count AS (
    SELECT
        member_wallet,
        COUNT(DISTINCT matrix_root_wallet) as actual_matrices
    FROM matrix_referrals
    GROUP BY member_wallet
)
SELECT
    MIN(actual_matrices) as min_matrices,
    AVG(actual_matrices)::NUMERIC(10,2) as avg_matrices,
    MAX(actual_matrices) as max_matrices
FROM upline_count;

-- Expected: max = 19 (or less if some uplines' matrices are full)

-- ----------------------------------------------------------------------------
-- ENABLE TRIGGER (only after validation passes)
-- ----------------------------------------------------------------------------

-- ALTER TABLE members ENABLE TRIGGER trigger_recursive_matrix_placement;

-- ----------------------------------------------------------------------------
-- ROLLBACK INSTRUCTIONS (if needed)
-- ----------------------------------------------------------------------------

/*
-- To rollback to backup:
TRUNCATE TABLE matrix_referrals;
INSERT INTO matrix_referrals SELECT * FROM matrix_referrals_backup_20251010;

TRUNCATE TABLE referrals;
INSERT INTO referrals SELECT * FROM referrals_backup_20251010;
*/

-- ============================================================================
-- END OF FIXES
-- ============================================================================
