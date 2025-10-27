-- ============================================================================
-- Place Missing Members in Matrix
-- Purpose: Place the 60 members that were skipped during initial rebuild
-- Date: 2025-10-27
-- ============================================================================

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
BEGIN
    RAISE NOTICE '🔨 Placing missing members in matrix...';
    RAISE NOTICE '';

    -- Process missing members in activation_sequence order
    FOR v_member IN
        SELECT
            m.wallet_address,
            m.referrer_wallet,
            m.activation_sequence,
            m.activation_time,
            u.username
        FROM members m
        JOIN users u ON u.wallet_address = m.wallet_address
        WHERE m.activation_sequence > 0
          AND m.referrer_wallet IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM matrix_referrals mr
            WHERE mr.member_wallet = m.wallet_address
          )
        ORDER BY m.activation_sequence ASC
    LOOP
        RAISE NOTICE '👤 Processing % (seq: %)', v_member.username, v_member.activation_sequence;

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
                    v_position,
                    v_bfs_order,
                    CASE
                        WHEN v_matrix_root = v_member.referrer_wallet THEN 'direct'
                        ELSE 'spillover'
                    END,
                    v_member.activation_time,
                    'missing_member_placement_20251027',
                    NOW()
                );

                v_total_placed := v_total_placed + 1;

                RAISE NOTICE '  ✅ Placed in % matrix: Layer %, Slot %',
                    SUBSTRING(v_matrix_root, 39, 4),
                    v_layer,
                    v_position;
            ELSE
                RAISE NOTICE '  ⚠️  No available position in % matrix',
                    SUBSTRING(v_matrix_root, 39, 4);
            END IF;

        END LOOP;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Missing member placement completed!';
    RAISE NOTICE '📊 Total placements: %', v_total_placed;

END $$;

-- Verification
SELECT
  '🔍 Verification' as info,
  COUNT(*) FILTER (
    WHERE NOT EXISTS (
      SELECT 1 FROM matrix_referrals mr
      WHERE mr.member_wallet = m.wallet_address
    )
    AND m.activation_sequence > 0
  ) as still_missing
FROM members m;
