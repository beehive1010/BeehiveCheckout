-- ============================================================================
-- Clean Matrix Rebuild Script
-- Purpose: Rebuild matrix with correct BFS L→M→R order
-- Date: 2025-10-27
-- ============================================================================

\timing on

-- Step 1: Clear existing data
TRUNCATE TABLE matrix_referrals CASCADE;

-- Step 2: Rebuild using inline BFS algorithm
DO $$
DECLARE
    v_member RECORD;
    v_matrix_root VARCHAR(42);
    v_parent VARCHAR(42);
    v_position VARCHAR(1);
    v_layer INTEGER;
    v_bfs_order INTEGER;
    v_referrer VARCHAR(42);
    v_ref_chain VARCHAR(42)[];
    v_depth INTEGER;
    v_total_placed INTEGER := 0;
    v_batch_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔨 Starting clean matrix rebuild...';

    -- Process all members in activation_sequence order
    FOR v_member IN
        SELECT
            wallet_address,
            referrer_wallet,
            activation_sequence,
            activation_time
        FROM members
        WHERE activation_sequence > 0
          AND referrer_wallet IS NOT NULL
        ORDER BY activation_sequence ASC
    LOOP
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
            -- Check if already placed
            IF EXISTS (
                SELECT 1 FROM matrix_referrals
                WHERE matrix_root_wallet = v_matrix_root
                AND member_wallet = v_member.wallet_address
            ) THEN
                CONTINUE;
            END IF;

            -- Find next available BFS position
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
                    EXIT;
                END IF;
            END LOOP;

            -- If Layer 1 is full, search Layer 2-19 using BFS
            IF v_parent IS NULL THEN
                SELECT
                    mr.member_wallet,
                    available_slot.slot,
                    mr.layer + 1
                INTO v_parent, v_position, v_layer
                FROM matrix_referrals mr
                CROSS JOIN LATERAL (
                    SELECT slot
                    FROM unnest(ARRAY['L', 'M', 'R']::VARCHAR[]) AS slot
                    WHERE NOT EXISTS (
                        SELECT 1 FROM matrix_referrals child
                        WHERE child.matrix_root_wallet = v_matrix_root
                        AND child.parent_wallet = mr.member_wallet
                        AND child.slot = slot
                    )
                    LIMIT 1
                ) available_slot
                WHERE mr.matrix_root_wallet = v_matrix_root
                AND mr.layer < 19
                ORDER BY mr.bfs_order ASC
                LIMIT 1;
            END IF;

            -- If found a position, insert the record
            IF v_parent IS NOT NULL AND v_position IS NOT NULL THEN
                -- Calculate bfs_order
                SELECT COALESCE(MAX(bfs_order), 0) + 1 INTO v_bfs_order
                FROM matrix_referrals
                WHERE matrix_root_wallet = v_matrix_root;

                -- Insert
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
                    v_position,
                    v_bfs_order,
                    CASE
                        WHEN v_matrix_root = v_member.referrer_wallet THEN 'direct'
                        ELSE 'spillover'
                    END,
                    v_member.activation_time,
                    'clean_rebuild_20251027',
                    NOW()
                );

                v_total_placed := v_total_placed + 1;
            END IF;
        END LOOP;

        -- Progress update every 100 members
        v_batch_count := v_batch_count + 1;
        IF v_batch_count % 100 = 0 THEN
            RAISE NOTICE '📊 Progress: Processed % members, % placements', v_batch_count, v_total_placed;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Matrix rebuild completed!';
    RAISE NOTICE '📊 Total placements: %', v_total_placed;
END $$;

-- Step 3: Verification
SELECT
    '📊 Total Placements' as metric,
    COUNT(*) as value
FROM matrix_referrals;

SELECT
    '📊 L→M→R Violations' as metric,
    COALESCE(SUM(violations), 0) as value
FROM (
    SELECT COUNT(*) as violations
    FROM (
        SELECT
            parent_wallet,
            COUNT(*) FILTER (WHERE slot = 'L') as has_L,
            COUNT(*) FILTER (WHERE slot = 'M') as has_M,
            COUNT(*) FILTER (WHERE slot = 'R') as has_R
        FROM matrix_referrals
        WHERE parent_wallet IS NOT NULL
        GROUP BY parent_wallet
    ) patterns
    WHERE (has_L = 0 AND has_M = 1) OR
          (has_L = 0 AND has_R = 1) OR
          (has_L = 1 AND has_M = 0 AND has_R = 1) OR
          (has_M = 1 AND has_R = 1 AND has_L = 0)
) violations;

SELECT
    '📊 Slot Distribution' as metric,
    slot || ': ' || COUNT(*) || ' (' || ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) || '%)' as value
FROM matrix_referrals
WHERE slot IS NOT NULL
GROUP BY slot
ORDER BY slot;
