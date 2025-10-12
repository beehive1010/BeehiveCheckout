#!/bin/bash

DATABASE_URL="postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"

echo "🔄 Starting Matrix rebuild with CORRECT L→M→R priority..."

# Clear matrix data
psql "$DATABASE_URL" << 'EOF'
DELETE FROM matrix_referrals;
SELECT 'Matrix cleared' as status;
EOF

# Get all matrix roots
ROOTS=$(psql "$DATABASE_URL" -t -A -c "
SELECT DISTINCT referrer_wallet
FROM members_v2
WHERE referrer_wallet IS NOT NULL
  AND referrer_wallet != ''
  AND referrer_wallet != wallet_address
ORDER BY referrer_wallet;
")

TOTAL=0
BATCH_NUM=0

for ROOT in $ROOTS; do
    BATCH_NUM=$((BATCH_NUM + 1))

    echo "Processing root $BATCH_NUM: $ROOT"

    # Process this single root with CORRECT L→M→R priority
    RESULT=$(psql "$DATABASE_URL" -t -A << EOF
WITH RECURSIVE
downlines AS (
    -- Direct referrals (generation 1)
    SELECT
        '$ROOT' as matrix_root,
        m.wallet_address,
        m.referrer_wallet as natural_parent,
        m.activation_sequence,
        m.activation_time,
        1 as generation
    FROM members_v2 m
    WHERE m.referrer_wallet = '$ROOT'
      AND m.wallet_address != m.referrer_wallet

    UNION ALL

    -- Recursive downlines (no depth limit)
    SELECT
        d.matrix_root,
        m.wallet_address,
        m.referrer_wallet,
        m.activation_sequence,
        m.activation_time,
        d.generation + 1
    FROM downlines d
    INNER JOIN members_v2 m ON m.referrer_wallet = d.wallet_address
    WHERE m.wallet_address != m.referrer_wallet
),
ranked_by_generation AS (
    -- Order by activation time WITHIN each generation (referral depth)
    SELECT
        matrix_root,
        wallet_address,
        natural_parent,
        activation_sequence,
        activation_time,
        generation,
        ROW_NUMBER() OVER (PARTITION BY generation ORDER BY activation_time, activation_sequence) as position_in_generation
    FROM downlines
),
with_parent_count AS (
    SELECT
        r.*,
        -- Parent count = number of members in previous generation
        COALESCE(
            (SELECT COUNT(*)
             FROM ranked_by_generation r2
             WHERE r2.generation = r.generation - 1),
            1  -- For generation 1, parent is the root (count = 1)
        ) as parent_count
    FROM ranked_by_generation r
),
with_lmr_position AS (
    SELECT
        wpc.*,
        wpc.generation as layer,  -- Layer = referral depth (generation)
        -- L→M→R priority: slot_type_index = (position_in_generation - 1) / parent_count
        CASE ((wpc.position_in_generation - 1) / wpc.parent_count)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            ELSE 'R'
        END as position,
        -- Parent index in previous generation
        (wpc.position_in_generation - 1) % wpc.parent_count as parent_index_in_prev_gen
    FROM with_parent_count wpc
),
with_parent AS (
    SELECT
        wlp.*,
        CASE
            WHEN wlp.layer = 1 THEN '$ROOT'
            ELSE (
                SELECT r2.wallet_address
                FROM ranked_by_generation r2
                WHERE r2.generation = wlp.layer - 1
                ORDER BY r2.activation_time, r2.activation_sequence
                OFFSET wlp.parent_index_in_prev_gen
                LIMIT 1
            )
        END as parent_wallet
    FROM with_lmr_position wlp
)
INSERT INTO matrix_referrals (
    matrix_root_wallet,
    member_wallet,
    parent_wallet,
    parent_depth,
    layer,
    position,
    referral_type,
    source,
    created_at
)
SELECT
    wp.matrix_root,
    wp.wallet_address,
    wp.parent_wallet,
    wp.layer as parent_depth,
    wp.layer,
    wp.position,
    CASE
        WHEN wp.parent_wallet = wp.natural_parent THEN 'direct'
        ELSE 'spillover'
    END as referral_type,
    'correct_lmr_priority' as source,
    wp.activation_time
FROM with_parent wp
RETURNING 1;
SELECT COUNT(*) FROM matrix_referrals WHERE matrix_root_wallet = '$ROOT';
EOF
)

    COUNT=$(echo "$RESULT" | tail -1)
    TOTAL=$((TOTAL + COUNT))

    echo "  ✓ Placed $COUNT members (Total: $TOTAL)"

    # Progress report every 50 roots
    if [ $((BATCH_NUM % 50)) -eq 0 ]; then
        echo "📊 Progress: $BATCH_NUM roots processed, $TOTAL total placements"
    fi

    # Small delay to avoid overwhelming the database
    sleep 0.05
done

echo "✅ Matrix rebuild complete with L→M→R priority!"
echo "📊 Final stats:"
psql "$DATABASE_URL" -c "
SELECT
    COUNT(*) as total_placements,
    COUNT(DISTINCT member_wallet) as unique_members,
    COUNT(DISTINCT matrix_root_wallet) as unique_roots,
    MAX(layer) as max_layer
FROM matrix_referrals;
"

echo ""
echo "📊 Checking 0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab:"
psql "$DATABASE_URL" -c "
SELECT
    layer,
    COUNT(*) as members,
    COUNT(CASE WHEN position = 'L' THEN 1 END) as L_count,
    COUNT(CASE WHEN position = 'M' THEN 1 END) as M_count,
    COUNT(CASE WHEN position = 'R' THEN 1 END) as R_count
FROM matrix_referrals
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
GROUP BY layer
ORDER BY layer
LIMIT 10;
"
            WHEN r.bfs_pos <= 39 THEN 3
            WHEN r.bfs_pos <= 120 THEN 4
            WHEN r.bfs_pos <= 363 THEN 5
            WHEN r.bfs_pos <= 1092 THEN 6
            WHEN r.bfs_pos <= 3279 THEN 7
            WHEN r.bfs_pos <= 9840 THEN 8
            WHEN r.bfs_pos <= 29523 THEN 9
            WHEN r.bfs_pos <= 88572 THEN 10
            WHEN r.bfs_pos <= 265719 THEN 11
            WHEN r.bfs_pos <= 797160 THEN 12
            WHEN r.bfs_pos <= 2391483 THEN 13
            WHEN r.bfs_pos <= 7174452 THEN 14
            WHEN r.bfs_pos <= 21523359 THEN 15
            WHEN r.bfs_pos <= 64570080 THEN 16
            WHEN r.bfs_pos <= 193710243 THEN 17
            WHEN r.bfs_pos <= 581130732 THEN 18
            ELSE 19
        END as layer,
        -- Layer start position for calculating relative position
        CASE
            WHEN r.bfs_pos <= 3 THEN 1
            WHEN r.bfs_pos <= 12 THEN 4
            WHEN r.bfs_pos <= 39 THEN 13
            WHEN r.bfs_pos <= 120 THEN 40
            WHEN r.bfs_pos <= 363 THEN 121
            WHEN r.bfs_pos <= 1092 THEN 364
            WHEN r.bfs_pos <= 3279 THEN 1093
            WHEN r.bfs_pos <= 9840 THEN 3280
            WHEN r.bfs_pos <= 29523 THEN 9841
            WHEN r.bfs_pos <= 88572 THEN 29524
            WHEN r.bfs_pos <= 265719 THEN 88573
            WHEN r.bfs_pos <= 797160 THEN 265720
            WHEN r.bfs_pos <= 2391483 THEN 797161
            WHEN r.bfs_pos <= 7174452 THEN 2391484
            WHEN r.bfs_pos <= 21523359 THEN 7174453
            WHEN r.bfs_pos <= 64570080 THEN 21523360
            WHEN r.bfs_pos <= 193710243 THEN 64570081
            WHEN r.bfs_pos <= 581130732 THEN 193710244
            ELSE 581130733
        END as layer_start_pos,
        -- Parent count in previous layer (3^(layer-1))
        CASE
            WHEN r.bfs_pos <= 3 THEN 1
            WHEN r.bfs_pos <= 12 THEN 3
            WHEN r.bfs_pos <= 39 THEN 9
            WHEN r.bfs_pos <= 120 THEN 27
            WHEN r.bfs_pos <= 363 THEN 81
            WHEN r.bfs_pos <= 1092 THEN 243
            WHEN r.bfs_pos <= 3279 THEN 729
            WHEN r.bfs_pos <= 9840 THEN 2187
            WHEN r.bfs_pos <= 29523 THEN 6561
            WHEN r.bfs_pos <= 88572 THEN 19683
            WHEN r.bfs_pos <= 265719 THEN 59049
            WHEN r.bfs_pos <= 797160 THEN 177147
            WHEN r.bfs_pos <= 2391483 THEN 531441
            WHEN r.bfs_pos <= 7174452 THEN 1594323
            WHEN r.bfs_pos <= 21523359 THEN 4782969
            WHEN r.bfs_pos <= 64570080 THEN 14348907
            WHEN r.bfs_pos <= 193710243 THEN 43046721
            WHEN r.bfs_pos <= 581130732 THEN 129140163
            ELSE 387420489
        END as parent_count
    FROM ranked_bfs r
),
with_lmr_position AS (
    SELECT
        wl.*,
        -- Position within current layer (0-based)
        wl.bfs_pos - wl.layer_start_pos as position_in_layer,
        -- L→M→R priority: slot_type_index = position_in_layer / parent_count
        CASE ((wl.bfs_pos - wl.layer_start_pos) / wl.parent_count)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            ELSE 'R'
        END as position,
        -- Parent index in previous layer
        (wl.bfs_pos - wl.layer_start_pos) % wl.parent_count as parent_index_in_prev_layer
    FROM with_layer wl
),
with_parent AS (
    SELECT
        wlp.*,
        CASE
            WHEN wlp.layer = 1 THEN '$ROOT'
            ELSE (
                SELECT r2.wallet_address
                FROM ranked_bfs r2
                WHERE r2.bfs_pos >= (wlp.layer_start_pos - (wlp.parent_count * 3))
                  AND r2.bfs_pos < wlp.layer_start_pos
                ORDER BY r2.bfs_pos
                OFFSET wlp.parent_index_in_prev_layer
                LIMIT 1
            )
        END as parent_wallet
    FROM with_lmr_position wlp
)
INSERT INTO matrix_referrals (
    matrix_root_wallet,
    member_wallet,
    parent_wallet,
    parent_depth,
    layer,
    position,
    referral_type,
    source,
    created_at
)
SELECT
    wp.matrix_root,
    wp.wallet_address,
    wp.parent_wallet,
    wp.layer as parent_depth,
    wp.layer,
    wp.position,
    CASE
        WHEN wp.parent_wallet = wp.natural_parent THEN 'direct'
        ELSE 'spillover'
    END as referral_type,
    'correct_lmr_priority' as source,
    wp.activation_time
FROM with_parent wp
RETURNING 1;
SELECT COUNT(*) FROM matrix_referrals WHERE matrix_root_wallet = '$ROOT';
EOF
)

    COUNT=$(echo "$RESULT" | tail -1)
    TOTAL=$((TOTAL + COUNT))

    echo "  ✓ Placed $COUNT members (Total: $TOTAL)"

    # Progress report every 50 roots
    if [ $((BATCH_NUM % 50)) -eq 0 ]; then
        echo "📊 Progress: $BATCH_NUM roots processed, $TOTAL total placements"
    fi

    # Small delay to avoid overwhelming the database
    sleep 0.05
done

echo "✅ Matrix rebuild complete with L→M→R priority!"
echo "📊 Final stats:"
psql "$DATABASE_URL" -c "
SELECT
    COUNT(*) as total_placements,
    COUNT(DISTINCT member_wallet) as unique_members,
    COUNT(DISTINCT matrix_root_wallet) as unique_roots,
    MAX(layer) as max_layer
FROM matrix_referrals;
"

echo ""
echo "📊 Checking 0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab:"
psql "$DATABASE_URL" -c "
SELECT
    layer,
    COUNT(*) as members,
    COUNT(CASE WHEN position = 'L' THEN 1 END) as L_count,
    COUNT(CASE WHEN position = 'M' THEN 1 END) as M_count,
    COUNT(CASE WHEN position = 'R' THEN 1 END) as R_count
FROM matrix_referrals
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
GROUP BY layer
ORDER BY layer
LIMIT 10;
"
