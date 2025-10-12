#!/bin/bash

DATABASE_URL="postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"

echo "🔄 Starting BFS Matrix rebuild with BFS POSITION based layers..."

# Clear matrix data
psql "$DATABASE_URL" << 'EOF'
DELETE FROM matrix_referrals;
SELECT 'Matrix cleared' as status;
EOF

# Get all matrix roots
ROOTS=$(psql "$DATABASE_URL" -t -A -c "
SELECT DISTINCT referrer_wallet
FROM members
WHERE referrer_wallet IS NOT NULL
  AND referrer_wallet != ''
  AND referrer_wallet != wallet_address
ORDER BY referrer_wallet;
")

BATCH_SIZE=10
TOTAL=0
BATCH_NUM=0

for ROOT in $ROOTS; do
    BATCH_NUM=$((BATCH_NUM + 1))

    echo "Processing root $BATCH_NUM: $ROOT"

    # Process this single root
    RESULT=$(psql "$DATABASE_URL" -t -A << EOF
WITH RECURSIVE
downlines AS (
    -- Direct referrals
    SELECT
        '$ROOT' as matrix_root,
        m.wallet_address,
        m.referrer_wallet as natural_parent,
        m.activation_sequence,
        m.activation_time,
        1 as generation
    FROM members m
    WHERE m.referrer_wallet = '$ROOT'
      AND m.wallet_address != m.referrer_wallet

    UNION ALL

    -- Recursive downlines
    SELECT
        d.matrix_root,
        m.wallet_address,
        m.referrer_wallet,
        m.activation_sequence,
        m.activation_time,
        d.generation + 1
    FROM downlines d
    INNER JOIN members m ON m.referrer_wallet = d.wallet_address
    WHERE m.wallet_address != m.referrer_wallet
      AND d.generation < 19
),
ranked AS (
    SELECT
        matrix_root,
        wallet_address,
        natural_parent,
        activation_sequence,
        activation_time,
        generation,
        ROW_NUMBER() OVER (ORDER BY activation_time, activation_sequence) as bfs_pos
    FROM downlines
),
with_structure AS (
    SELECT
        r.*,
        CASE
            WHEN r.bfs_pos <= 3 THEN '$ROOT'
            ELSE (
                SELECT r2.wallet_address
                FROM ranked r2
                WHERE r2.bfs_pos = ((r.bfs_pos - 1 - 1) / 3)
                LIMIT 1
            )
        END as parent_wallet,
        CASE ((r.bfs_pos - 1) % 3)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            ELSE 'R'
        END as slot_index,
        -- Calculate layer based on BFS position ranges
        CASE
            WHEN r.bfs_pos <= 3 THEN 1
            WHEN r.bfs_pos <= 12 THEN 2
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
        END as bfs_layer
    FROM ranked r
)
INSERT INTO matrix_referrals (
    matrix_root_wallet,
    member_wallet,
    parent_wallet,
    layer_index,
    slot_index,
    slot_num_seq,
    member_activation_sequence,
    referral_type,
    placed_at
)
SELECT
    ws.matrix_root,
    ws.wallet_address,
    ws.parent_wallet,
    ws.bfs_layer as layer_index,  -- ✅ Use BFS position-based layer
    ws.slot_index,
    ROW_NUMBER() OVER (PARTITION BY ws.bfs_layer ORDER BY ws.bfs_pos) as slot_num_seq,
    ws.activation_sequence,
    CASE
        WHEN ws.parent_wallet = ws.natural_parent THEN 'direct'
        ELSE 'spillover'
    END as referral_type,
    ws.activation_time
FROM with_structure ws
RETURNING 1;
SELECT COUNT(*) FROM matrix_referrals WHERE matrix_root_wallet = '$ROOT';
EOF
)

    COUNT=$(echo "$RESULT" | tail -1)
    TOTAL=$((TOTAL + COUNT))

    echo "  ✓ Placed $COUNT members (Total: $TOTAL)"

    # Progress report every 100 roots
    if [ $((BATCH_NUM % 100)) -eq 0 ]; then
        echo "📊 Progress: $BATCH_NUM roots processed, $TOTAL total placements"
    fi

    # Small delay to avoid overwhelming the database
    sleep 0.1
done

echo "✅ BFS matrix rebuild complete!"
echo "📊 Final stats:"
psql "$DATABASE_URL" -c "
SELECT
    COUNT(*) as total_placements,
    COUNT(DISTINCT member_wallet) as unique_members,
    COUNT(DISTINCT matrix_root_wallet) as unique_roots,
    MAX(layer_index) as max_layer
FROM matrix_referrals;
"
