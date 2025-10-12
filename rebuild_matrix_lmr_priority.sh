#!/bin/bash

DATABASE_URL="postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"

echo "🔄 Starting Matrix rebuild with L→M→R priority BFS..."

# Backup current data
psql "$DATABASE_URL" << 'EOF'
CREATE TABLE IF NOT EXISTS matrix_referrals_backup_lmr AS
SELECT * FROM matrix_referrals;
SELECT 'Backed up' as status;
EOF

# Clear and rebuild
psql "$DATABASE_URL" << 'EOF'
DELETE FROM matrix_referrals;

-- Rebuild with correct L→M→R priority BFS logic
WITH RECURSIVE
downlines AS (
    SELECT
        m.referrer_wallet as matrix_root,
        m.wallet_address,
        m.referrer_wallet as natural_parent,
        m.activation_sequence,
        m.activation_time
    FROM members_v2 m
    WHERE m.referrer_wallet IS NOT NULL
      AND m.referrer_wallet != ''
      AND m.referrer_wallet != m.wallet_address

    UNION ALL

    SELECT
        d.matrix_root,
        m.wallet_address,
        m.referrer_wallet,
        m.activation_sequence,
        m.activation_time
    FROM downlines d
    JOIN members_v2 m ON m.referrer_wallet = d.wallet_address
    WHERE m.wallet_address != m.referrer_wallet
),
ranked AS (
    SELECT
        matrix_root,
        wallet_address,
        natural_parent,
        activation_sequence,
        activation_time,
        ROW_NUMBER() OVER (PARTITION BY matrix_root ORDER BY activation_time, activation_sequence) as bfs_pos
    FROM downlines
),
with_structure AS (
    SELECT
        r.*,
        -- Calculate layer from BFS position
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
        END as layer,
        -- Calculate layer start position
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
        -- Calculate parent count in previous layer
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
    FROM ranked r
),
with_lmr_position AS (
    SELECT
        ws.*,
        -- Position in current layer (0-based)
        ws.bfs_pos - ws.layer_start_pos as position_in_layer,
        -- L→M→R priority: position_type_index = position_in_layer / parent_count
        ((ws.bfs_pos - ws.layer_start_pos) / ws.parent_count) as position_type_index,
        -- Parent index in previous layer = position_in_layer % parent_count
        ((ws.bfs_pos - ws.layer_start_pos) % ws.parent_count) as parent_index_in_prev_layer,
        -- Convert position_type_index to L/M/R
        CASE ((ws.bfs_pos - ws.layer_start_pos) / ws.parent_count)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            ELSE 'R'
        END as position
    FROM with_structure ws
),
with_parent AS (
    SELECT
        wlp.*,
        -- Find parent: if layer=1, parent=root; else find in previous layer
        CASE
            WHEN wlp.layer = 1 THEN wlp.matrix_root
            ELSE (
                SELECT r2.wallet_address
                FROM ranked r2
                WHERE r2.matrix_root = wlp.matrix_root
                  AND r2.bfs_pos >= (wlp.layer_start_pos - (wlp.parent_count * 3))
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
    'rebuild_lmr_priority' as source,
    wp.activation_time
FROM with_parent wp;

SELECT
    COUNT(*) as total_placements,
    COUNT(DISTINCT matrix_root_wallet) as unique_roots,
    MAX(layer) as max_layer
FROM matrix_referrals;
EOF

echo "✅ Matrix rebuild complete!"
