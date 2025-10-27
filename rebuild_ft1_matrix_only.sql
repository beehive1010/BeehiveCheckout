-- ============================================================================
-- Rebuild FT1 Matrix Only - Test BFS L→M→R Algorithm
-- Purpose: Rebuild just FT1's matrix to verify the algorithm works correctly
-- Date: 2025-10-27
-- ============================================================================

-- FT1 wallet address
\set FT1_WALLET '0x2B03D532faa3120826586efb00C9363F9a611b6f'

-- ===================================
-- Step 1: Backup FT1 matrix data
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '📦 Backing up FT1 matrix data...';
END $$;

CREATE TABLE IF NOT EXISTS matrix_referrals_ft1_backup AS
SELECT * FROM matrix_referrals
WHERE matrix_root_wallet = :'FT1_WALLET';

-- Delete FT1 matrix data
DELETE FROM matrix_referrals WHERE matrix_root_wallet = :'FT1_WALLET';

DO $$
DECLARE
    v_backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_backup_count FROM matrix_referrals_ft1_backup;
    RAISE NOTICE '✅ Backed up % FT1 matrix records', v_backup_count;
END $$;

-- ===================================
-- Step 2: Get all members who should be in FT1 matrix
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Finding all members in FT1''s referral chain...';
END $$;

-- Create temp table for FT1's descendants (members who have FT1 in their referrer chain)
CREATE TEMP TABLE ft1_descendants AS
WITH RECURSIVE referrer_chain AS (
    -- Start with members who have FT1 as direct referrer
    SELECT
        m.wallet_address,
        m.activation_sequence,
        m.activation_time,
        u.username,
        1 as depth_from_ft1
    FROM members m
    LEFT JOIN users u ON u.wallet_address = m.wallet_address
    WHERE m.referrer_wallet = :'FT1_WALLET'
    AND m.activation_sequence IS NOT NULL

    UNION ALL

    -- Recursively get their referrals (up to 19 levels deep)
    SELECT
        m.wallet_address,
        m.activation_sequence,
        m.activation_time,
        u.username,
        rc.depth_from_ft1 + 1
    FROM referrer_chain rc
    JOIN members m ON m.referrer_wallet = rc.wallet_address
    LEFT JOIN users u ON u.wallet_address = m.wallet_address
    WHERE rc.depth_from_ft1 < 19
    AND m.activation_sequence IS NOT NULL
)
SELECT * FROM referrer_chain
ORDER BY activation_sequence;

DO $$
DECLARE
    v_descendant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_descendant_count FROM ft1_descendants;
    RAISE NOTICE '✅ Found % members in FT1''s referral chain', v_descendant_count;
END $$;

-- ===================================
-- Step 3: Rebuild FT1 matrix using BFS L→M→R
-- ===================================

DO $$
DECLARE
    v_member RECORD;
    v_parent VARCHAR(42);
    v_position VARCHAR(1);
    v_layer INTEGER;
    v_bfs_order INTEGER := 1;
    v_total_placed INTEGER := 0;
    FT1_WALLET VARCHAR(42) := '0x2B03D532faa3120826586efb00C9363F9a611b6f';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔨 Rebuilding FT1 matrix with BFS L→M→R algorithm...';
    RAISE NOTICE '';

    -- Process members in activation_sequence order (this IS the BFS order)
    FOR v_member IN
        SELECT * FROM ft1_descendants ORDER BY activation_sequence ASC
    LOOP
        v_parent := NULL;
        v_position := NULL;
        v_layer := NULL;

        -- Step 3.1: Check Layer 1 first (FT1's direct children: L, M, R)
        FOR v_position IN SELECT unnest(ARRAY['L', 'M', 'R']::VARCHAR[]) LOOP
            IF NOT EXISTS (
                SELECT 1 FROM matrix_referrals
                WHERE matrix_root_wallet = FT1_WALLET
                AND parent_wallet = FT1_WALLET
                AND slot = v_position
            ) THEN
                v_parent := FT1_WALLET;
                v_layer := 1;
                EXIT;  -- Found available position in Layer 1
            END IF;
        END LOOP;

        -- Step 3.2: If Layer 1 is full, search Layers 2-19 using BFS
        IF v_parent IS NULL THEN
            -- Find first parent with available slot
            -- ✅ FIX: Order by layer first, then bfs_order within each layer
            -- This ensures we fill each layer completely before moving to the next
            SELECT
                mr.member_wallet,
                available_slot.slot,
                mr.layer + 1
            INTO v_parent, v_position, v_layer
            FROM matrix_referrals mr
            CROSS JOIN LATERAL (
                -- Check L, M, R in order for this parent
                SELECT slot
                FROM unnest(ARRAY['L', 'M', 'R']::VARCHAR[]) AS slot
                WHERE NOT EXISTS (
                    SELECT 1 FROM matrix_referrals child
                    WHERE child.matrix_root_wallet = FT1_WALLET
                    AND child.parent_wallet = mr.member_wallet
                    AND child.slot = slot
                )
                ORDER BY slot  -- Ensure L → M → R order
                LIMIT 1
            ) available_slot
            WHERE mr.matrix_root_wallet = FT1_WALLET
            AND mr.layer < 19
            ORDER BY mr.layer ASC, mr.bfs_order ASC  -- ✅ FIX: layer first, then bfs_order
            LIMIT 1;
        END IF;

        -- Step 3.3: If found a position, insert the record
        IF v_parent IS NOT NULL AND v_position IS NOT NULL AND v_layer IS NOT NULL THEN
            INSERT INTO matrix_referrals (
                matrix_root_wallet,
                member_wallet,
                parent_wallet,
                layer,
                position,
                slot,
                bfs_order,
                referral_type,
                activation_time,
                source,
                created_at
            ) VALUES (
                FT1_WALLET,
                v_member.wallet_address,
                v_parent,
                v_layer,
                v_position,
                v_position,  -- slot = position
                v_bfs_order,
                CASE
                    WHEN v_layer = 1 THEN 'direct'
                    ELSE 'spillover'
                END,
                v_member.activation_time,
                'bfs_rebuild_ft1_test_20251027',
                NOW()
            );

            v_bfs_order := v_bfs_order + 1;
            v_total_placed := v_total_placed + 1;

            IF v_total_placed % 10 = 0 THEN
                RAISE NOTICE '  📊 Progress: % members placed', v_total_placed;
            END IF;

        ELSE
            RAISE WARNING '  ⚠️  Could not find position for member % (seq: %)',
                v_member.username, v_member.activation_sequence;
        END IF;

    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ FT1 matrix rebuild complete!';
    RAISE NOTICE '📊 Total members placed: %', v_total_placed;

END $$;

-- ===================================
-- Step 4: Verification
-- ===================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 VERIFICATION'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- Check 1: Wrong patterns
\echo ''
\echo '❌ Check 1: Wrong Pattern Detection (should all be 0)'
SELECT
    COUNT(*) FILTER (WHERE has_L = 0 AND has_M = 1 AND has_R = 0) as "Only M",
    COUNT(*) FILTER (WHERE has_L = 0 AND has_M = 0 AND has_R = 1) as "Only R",
    COUNT(*) FILTER (WHERE has_L = 1 AND has_M = 0 AND has_R = 1) as "L+R no M",
    COUNT(*) FILTER (WHERE has_L = 0 AND has_M = 1 AND has_R = 1) as "M+R no L"
FROM (
    SELECT
        parent_wallet,
        COUNT(*) FILTER (WHERE slot = 'L') as has_L,
        COUNT(*) FILTER (WHERE slot = 'M') as has_M,
        COUNT(*) FILTER (WHERE slot = 'R') as has_R
    FROM matrix_referrals
    WHERE matrix_root_wallet = '0x2B03D532faa3120826586efb00C9363F9a611b6f'
    AND parent_wallet IS NOT NULL
    GROUP BY parent_wallet
) patterns;

-- Check 2: Correct patterns (1 child = L only, 2 children = L+M, 3 children = L+M+R)
\echo ''
\echo '✅ Check 2: Correct Pattern Distribution'
SELECT
    CASE
        WHEN has_L = 1 AND has_M = 0 AND has_R = 0 THEN 'L only (1 child)'
        WHEN has_L = 1 AND has_M = 1 AND has_R = 0 THEN 'L+M (2 children)'
        WHEN has_L = 1 AND has_M = 1 AND has_R = 1 THEN 'L+M+R (3 children)'
    END as pattern,
    COUNT(*) as parent_count
FROM (
    SELECT
        parent_wallet,
        COUNT(*) FILTER (WHERE slot = 'L') as has_L,
        COUNT(*) FILTER (WHERE slot = 'M') as has_M,
        COUNT(*) FILTER (WHERE slot = 'R') as has_R
    FROM matrix_referrals
    WHERE matrix_root_wallet = :'FT1_WALLET'
    AND parent_wallet IS NOT NULL
    GROUP BY parent_wallet
    HAVING (has_L = 1 AND has_M = 0 AND has_R = 0)
        OR (has_L = 1 AND has_M = 1 AND has_R = 0)
        OR (has_L = 1 AND has_M = 1 AND has_R = 1)
) correct_patterns
GROUP BY pattern
ORDER BY pattern;

-- Check 3: FT1 Layer 1 (should be L: FT2, M: FT3, R: FT4)
\echo ''
\echo '✅ Check 3: FT1 Layer 1 Children (Expected: FT2-L, FT3-M, FT4-R)'
SELECT
    slot,
    u.username,
    SUBSTRING(member_wallet, 39, 4) as wallet_tail,
    bfs_order,
    referral_type
FROM matrix_referrals mr
LEFT JOIN users u ON u.wallet_address = mr.member_wallet
WHERE mr.matrix_root_wallet = :'FT1_WALLET'
AND mr.layer = 1
ORDER BY slot;

-- Check 4: Slot distribution
\echo ''
\echo '📊 Check 4: Slot Distribution (should be ~33% each)'
SELECT
    slot,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM matrix_referrals
WHERE matrix_root_wallet = :'FT1_WALLET'
GROUP BY slot
ORDER BY slot;

-- Check 5: Sample tree structure (first 3 layers)
\echo ''
\echo '🌳 Check 5: Tree Structure Sample (Layers 1-3)'
SELECT
    layer,
    slot,
    u.username,
    SUBSTRING(parent_wallet, 39, 4) as parent_tail,
    bfs_order
FROM matrix_referrals mr
LEFT JOIN users u ON u.wallet_address = mr.member_wallet
WHERE mr.matrix_root_wallet = :'FT1_WALLET'
AND mr.layer <= 3
ORDER BY layer, bfs_order;

\echo ''
\echo '✅ Verification complete!'
