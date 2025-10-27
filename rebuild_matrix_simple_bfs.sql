-- ============================================================================
-- Simple Matrix Rebuild Script - Correct BFS L→M→R Order
-- Purpose: Rebuild matrix using simple iterative BFS algorithm
-- Date: 2025-10-27
-- ============================================================================

-- ===================================
-- Step 1: Backup and clear
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '📦 Creating backup...';
END $$;

-- Backup
CREATE TABLE IF NOT EXISTS matrix_referrals_backup_20251027_v2 AS
SELECT * FROM matrix_referrals;

-- Clear
TRUNCATE TABLE matrix_referrals CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ Backup created, table cleared';
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 2: Rebuild using simple BFS
-- ===================================

DO $$
DECLARE
    v_member RECORD;
    v_matrix_root VARCHAR(42);
    v_parent VARCHAR(42);
    v_position VARCHAR(1);
    v_layer INTEGER;
    v_bfs_order INTEGER;
    v_total_placed INTEGER := 0;
    v_referrer VARCHAR(42);
    v_ref_chain VARCHAR(42)[];
    v_depth INTEGER;
BEGIN
    RAISE NOTICE '🔨 Starting matrix rebuild with BFS L→M→R algorithm...';
    RAISE NOTICE '';

    -- Process all members in activation_sequence order
    FOR v_member IN
        SELECT
            wallet_address,
            referrer_wallet,
            activation_sequence,
            activation_time
        FROM members
        WHERE activation_sequence IS NOT NULL
        AND referrer_wallet IS NOT NULL
        ORDER BY activation_sequence ASC
    LOOP
        RAISE NOTICE '👤 Processing member % (seq: %)', SUBSTRING(v_member.wallet_address, 39, 4), v_member.activation_sequence;

        -- Build referrer chain (up to 19 levels)
        v_ref_chain := ARRAY[v_member.referrer_wallet];
        v_referrer := v_member.referrer_wallet;
        v_depth := 1;

        WHILE v_depth < 19 AND v_referrer IS NOT NULL LOOP
            SELECT referrer_wallet INTO v_referrer
            FROM members
            WHERE wallet_address = v_referrer;

            IF v_referrer IS NOT NULL THEN
                v_ref_chain := v_ref_chain || v_referrer;
                v_depth := v_depth + 1;
            END IF;
        END LOOP;

        -- Place member in each ancestor's matrix
        FOREACH v_matrix_root IN ARRAY v_ref_chain LOOP

            -- Check if already placed in this matrix
            IF EXISTS (
                SELECT 1 FROM matrix_referrals
                WHERE matrix_root_wallet = v_matrix_root
                AND member_wallet = v_member.wallet_address
            ) THEN
                CONTINUE;
            END IF;

            -- Find next available BFS position in this matrix
            v_parent := NULL;
            v_position := NULL;
            v_layer := NULL;

            -- Check Layer 1 first (root's direct children: L, M, R)
            FOR v_position IN SELECT unnest(ARRAY['L', 'M', 'R']::VARCHAR[]) LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM matrix_referrals
                    WHERE matrix_root_wallet = v_matrix_root
                    AND parent_wallet = v_matrix_root
                    AND slot = v_position
                ) THEN
                    v_parent := v_matrix_root;
                    v_layer := 1;
                    EXIT;  -- Found position, exit loop
                END IF;
            END LOOP;

            -- If Layer 1 is full, search Layer 2-19 using BFS
            IF v_parent IS NULL THEN
                -- Find first parent with available slot using BFS order (bfs_order ASC)
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
                        WHERE child.matrix_root_wallet = v_matrix_root
                        AND child.parent_wallet = mr.member_wallet
                        AND child.slot = slot
                    )
                    LIMIT 1  -- Return first available slot (L → M → R order)
                ) available_slot
                WHERE mr.matrix_root_wallet = v_matrix_root
                AND mr.layer < 19
                ORDER BY mr.bfs_order ASC  -- BFS order: earliest placed members first
                LIMIT 1;
            END IF;

            -- If found a position, insert the record
            IF v_parent IS NOT NULL AND v_position IS NOT NULL THEN
                -- Calculate bfs_order for this matrix
                SELECT COALESCE(MAX(bfs_order), 0) + 1 INTO v_bfs_order
                FROM matrix_referrals
                WHERE matrix_root_wallet = v_matrix_root;

                -- Insert into matrix_referrals
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
                    v_matrix_root,
                    v_member.wallet_address,
                    v_parent,
                    v_layer,
                    v_position,
                    v_position,  -- slot = position
                    v_bfs_order,
                    CASE
                        WHEN v_matrix_root = v_member.referrer_wallet THEN 'direct'
                        ELSE 'spillover'
                    END,
                    v_member.activation_time,
                    'bfs_rebuild_simple_20251027',
                    NOW()
                );

                v_total_placed := v_total_placed + 1;

                RAISE NOTICE '  ✅ Placed in % matrix: Layer %, Slot %, Parent: %',
                    SUBSTRING(v_matrix_root, 39, 4),
                    v_layer,
                    v_position,
                    SUBSTRING(v_parent, 39, 4);
            ELSE
                RAISE NOTICE '  ⚠️  No available position in % matrix (full to layer 19)',
                    SUBSTRING(v_matrix_root, 39, 4);
            END IF;

        END LOOP;  -- End of matrix_root loop

        -- Progress update every 10 members
        IF v_total_placed % 10 = 0 THEN
            RAISE NOTICE '';
            RAISE NOTICE '📊 Progress: % placements completed', v_total_placed;
            RAISE NOTICE '';
        END IF;

    END LOOP;  -- End of member loop

    RAISE NOTICE '';
    RAISE NOTICE '✅ Matrix rebuild completed!';
    RAISE NOTICE '📊 Total placements: %', v_total_placed;

END $$;

-- ===================================
-- Step 3: Verification
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔍 VERIFICATION';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Check 1: Wrong patterns (should all be 0)
SELECT
    '❌ Wrong Pattern Check' as check_name,
    COUNT(*) FILTER (
        WHERE has_L = 0 AND has_M = 1 AND has_R = 0
    ) as "Only M (WRONG)",
    COUNT(*) FILTER (
        WHERE has_L = 0 AND has_M = 0 AND has_R = 1
    ) as "Only R (WRONG)",
    COUNT(*) FILTER (
        WHERE has_L = 1 AND has_M = 0 AND has_R = 1
    ) as "L+R no M (WRONG)",
    COUNT(*) FILTER (
        WHERE has_L = 0 AND has_M = 1 AND has_R = 1
    ) as "M+R no L (WRONG)"
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

-- Check 2: FT1 Layer 1 children
SELECT
    '✅ FT1 Layer 1 Children' as info,
    slot,
    u.username,
    SUBSTRING(member_wallet, 39, 4) as wallet_tail,
    bfs_order
FROM matrix_referrals mr
LEFT JOIN users u ON u.wallet_address = mr.member_wallet
WHERE matrix_root_wallet = '0x2B03D532faa3120826586efb00C9363F9a611b6f'
AND layer = 1
ORDER BY slot;

-- Check 3: Slot distribution (should be ~33% each)
SELECT
    '📊 Slot Distribution' as info,
    slot,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM matrix_referrals
WHERE slot IS NOT NULL
GROUP BY slot
ORDER BY slot;

-- Check 4: Total records
SELECT
    '📊 Total Records' as info,
    COUNT(*) as total_records,
    COUNT(DISTINCT matrix_root_wallet) as unique_matrices,
    COUNT(DISTINCT member_wallet) as unique_members
FROM matrix_referrals;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Verification complete!';
    RAISE NOTICE '   All parents should now have children in L→M→R order';
    RAISE NOTICE '   No parent should have M without L, or R without L and M';
END $$;
