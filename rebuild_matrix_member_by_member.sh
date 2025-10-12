#!/bin/bash

DATABASE_URL="postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"

echo "🔄 Starting Matrix rebuild using member-by-member placement logic..."

# Clear matrix data
psql "$DATABASE_URL" << 'EOF'
DELETE FROM matrix_referrals;
SELECT 'Matrix cleared' as status;
EOF

# Create a SQL function to place one member in all upline matrices
psql "$DATABASE_URL" << 'EOF'
CREATE OR REPLACE FUNCTION fn_place_member_in_upline_matrices_bfs(
    p_member_wallet VARCHAR,
    p_activation_seq INTEGER,
    p_activation_time TIMESTAMP
)
RETURNS TABLE(
    upline_wallet VARCHAR,
    layer_placed INTEGER,
    slot_placed VARCHAR,
    bfs_position INTEGER
) AS $$
DECLARE
    v_upline_record RECORD;
    v_bfs_pos INTEGER;
    v_layer INTEGER;
    v_slot VARCHAR(1);
    v_parent VARCHAR(42);
BEGIN
    -- Get upline chain (up to 19 levels)
    FOR v_upline_record IN
        WITH RECURSIVE upline_chain AS (
            SELECT
                wallet_address as upline,
                referrer_wallet,
                1 as depth
            FROM members
            WHERE wallet_address = (
                SELECT referrer_wallet FROM members WHERE wallet_address = p_member_wallet
            )

            UNION ALL

            SELECT
                m.wallet_address,
                m.referrer_wallet,
                uc.depth + 1
            FROM upline_chain uc
            JOIN members m ON m.wallet_address = uc.referrer_wallet
            WHERE uc.depth < 19
              AND m.referrer_wallet IS NOT NULL
              AND m.referrer_wallet != ''
              AND m.referrer_wallet != m.wallet_address
        )
        SELECT * FROM upline_chain ORDER BY depth
    LOOP
        -- For this upline's matrix, find next available BFS position
        -- Get current max BFS position in this upline's matrix
        SELECT COALESCE(MAX(
            CASE
                WHEN layer_index = 1 THEN slot_num_seq
                WHEN layer_index = 2 THEN 3 + slot_num_seq
                WHEN layer_index = 3 THEN 12 + slot_num_seq
                WHEN layer_index = 4 THEN 39 + slot_num_seq
                WHEN layer_index = 5 THEN 120 + slot_num_seq
                WHEN layer_index = 6 THEN 363 + slot_num_seq
                WHEN layer_index = 7 THEN 1092 + slot_num_seq
                WHEN layer_index = 8 THEN 3279 + slot_num_seq
                WHEN layer_index = 9 THEN 9840 + slot_num_seq
                WHEN layer_index = 10 THEN 29523 + slot_num_seq
                WHEN layer_index = 11 THEN 88572 + slot_num_seq
                WHEN layer_index = 12 THEN 265719 + slot_num_seq
                WHEN layer_index = 13 THEN 797160 + slot_num_seq
                WHEN layer_index = 14 THEN 2391483 + slot_num_seq
                WHEN layer_index = 15 THEN 7174452 + slot_num_seq
                WHEN layer_index = 16 THEN 21523359 + slot_num_seq
                WHEN layer_index = 17 THEN 64570080 + slot_num_seq
                WHEN layer_index = 18 THEN 193710243 + slot_num_seq
                ELSE 581130732 + slot_num_seq
            END
        ), 0) INTO v_bfs_pos
        FROM matrix_referrals
        WHERE matrix_root_wallet = v_upline_record.upline;

        -- Next position
        v_bfs_pos := v_bfs_pos + 1;

        -- Calculate layer from BFS position
        v_layer := CASE
            WHEN v_bfs_pos <= 3 THEN 1
            WHEN v_bfs_pos <= 12 THEN 2
            WHEN v_bfs_pos <= 39 THEN 3
            WHEN v_bfs_pos <= 120 THEN 4
            WHEN v_bfs_pos <= 363 THEN 5
            WHEN v_bfs_pos <= 1092 THEN 6
            WHEN v_bfs_pos <= 3279 THEN 7
            WHEN v_bfs_pos <= 9840 THEN 8
            WHEN v_bfs_pos <= 29523 THEN 9
            WHEN v_bfs_pos <= 88572 THEN 10
            WHEN v_bfs_pos <= 265719 THEN 11
            WHEN v_bfs_pos <= 797160 THEN 12
            WHEN v_bfs_pos <= 2391483 THEN 13
            WHEN v_bfs_pos <= 7174452 THEN 14
            WHEN v_bfs_pos <= 21523359 THEN 15
            WHEN v_bfs_pos <= 64570080 THEN 16
            WHEN v_bfs_pos <= 193710243 THEN 17
            WHEN v_bfs_pos <= 581130732 THEN 18
            ELSE 19
        END;

        -- Calculate slot (L/M/R)
        v_slot := CASE ((v_bfs_pos - 1) % 3)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            ELSE 'R'
        END;

        -- Calculate parent
        IF v_bfs_pos <= 3 THEN
            v_parent := v_upline_record.upline;
        ELSE
            SELECT member_wallet INTO v_parent
            FROM matrix_referrals
            WHERE matrix_root_wallet = v_upline_record.upline
              AND CASE
                    WHEN layer_index = 1 THEN slot_num_seq
                    WHEN layer_index = 2 THEN 3 + slot_num_seq
                    WHEN layer_index = 3 THEN 12 + slot_num_seq
                    WHEN layer_index = 4 THEN 39 + slot_num_seq
                    WHEN layer_index = 5 THEN 120 + slot_num_seq
                    WHEN layer_index = 6 THEN 363 + slot_num_seq
                    WHEN layer_index = 7 THEN 1092 + slot_num_seq
                    WHEN layer_index = 8 THEN 3279 + slot_num_seq
                    WHEN layer_index = 9 THEN 9840 + slot_num_seq
                    WHEN layer_index = 10 THEN 29523 + slot_num_seq
                    WHEN layer_index = 11 THEN 88572 + slot_num_seq
                    WHEN layer_index = 12 THEN 265719 + slot_num_seq
                    WHEN layer_index = 13 THEN 797160 + slot_num_seq
                    WHEN layer_index = 14 THEN 2391483 + slot_num_seq
                    WHEN layer_index = 15 THEN 7174452 + slot_num_seq
                    WHEN layer_index = 16 THEN 21523359 + slot_num_seq
                    WHEN layer_index = 17 THEN 64570080 + slot_num_seq
                    WHEN layer_index = 18 THEN 193710243 + slot_num_seq
                    ELSE 581130732 + slot_num_seq
                END = ((v_bfs_pos - 1 - 1) / 3)
            LIMIT 1;
        END IF;

        -- Get natural parent (direct referrer)
        DECLARE
            v_natural_parent VARCHAR(42);
            v_ref_type VARCHAR(20);
        BEGIN
            SELECT referrer_wallet INTO v_natural_parent
            FROM members
            WHERE wallet_address = p_member_wallet;

            v_ref_type := CASE WHEN v_parent = v_natural_parent THEN 'direct' ELSE 'spillover' END;
        END;

        -- Insert placement record
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
        ) VALUES (
            v_upline_record.upline,
            p_member_wallet,
            v_parent,
            v_layer,
            v_slot,
            (v_bfs_pos - CASE
                WHEN v_layer = 1 THEN 0
                WHEN v_layer = 2 THEN 3
                WHEN v_layer = 3 THEN 12
                WHEN v_layer = 4 THEN 39
                WHEN v_layer = 5 THEN 120
                WHEN v_layer = 6 THEN 363
                WHEN v_layer = 7 THEN 1092
                WHEN v_layer = 8 THEN 3279
                WHEN v_layer = 9 THEN 9840
                WHEN v_layer = 10 THEN 29523
                WHEN v_layer = 11 THEN 88572
                WHEN v_layer = 12 THEN 265719
                WHEN v_layer = 13 THEN 797160
                WHEN v_layer = 14 THEN 2391483
                WHEN v_layer = 15 THEN 7174452
                WHEN v_layer = 16 THEN 21523359
                WHEN v_layer = 17 THEN 64570080
                WHEN v_layer = 18 THEN 193710243
                ELSE 581130732
            END),
            p_activation_seq,
            v_ref_type,
            p_activation_time
        );

        RETURN QUERY SELECT
            v_upline_record.upline::VARCHAR,
            v_layer::INTEGER,
            v_slot::VARCHAR,
            v_bfs_pos::INTEGER;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT 'Function created' as status;
EOF

# Get all members ordered by activation_time
echo "📊 Processing members in activation order..."

TOTAL=0
BATCH_NUM=0

psql "$DATABASE_URL" -t -A -c "
SELECT wallet_address, activation_sequence, activation_time
FROM members
WHERE referrer_wallet IS NOT NULL
  AND referrer_wallet != ''
  AND referrer_wallet != wallet_address
ORDER BY activation_time, activation_sequence;
" | while IFS='|' read -r WALLET SEQ TIMESTAMP; do
    BATCH_NUM=$((BATCH_NUM + 1))

    # Process this member
    psql "$DATABASE_URL" -t -A << EOF > /dev/null 2>&1
SELECT fn_place_member_in_upline_matrices_bfs(
    '$WALLET',
    $SEQ,
    '$TIMESTAMP'::TIMESTAMP
);
EOF

    TOTAL=$((TOTAL + 1))

    # Progress report every 100 members
    if [ $((BATCH_NUM % 100)) -eq 0 ]; then
        echo "📊 Progress: $BATCH_NUM members processed"
    fi
done

echo "✅ Matrix rebuild complete!"
echo "📊 Final stats:"
psql "$DATABASE_URL" -c "
SELECT
    COUNT(*) as total_placements,
    COUNT(DISTINCT member_wallet) as unique_members,
    COUNT(DISTINCT matrix_root_wallet) as unique_roots,
    MAX(layer_index) as max_layer
FROM matrix_referrals;
"
