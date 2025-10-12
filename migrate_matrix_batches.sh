#!/bin/bash

# Migrate matrix data in batches to avoid timeout
# Each batch processes 200 members

DATABASE_URL="postgresql://postgres:bee8881941@db.cvqibjcbfrwsgkvthccp.supabase.co:5432/postgres?sslmode=require"
BATCH_SIZE=200

# Start from sequence 211 (already processed 0-210)
START_SEQ=211
# Total members is around 4016, process until 4500 to be safe
END_SEQ=4500

for ((seq=$START_SEQ; seq<$END_SEQ; seq+=$BATCH_SIZE)); do
    batch_end=$((seq + BATCH_SIZE))
    echo "Processing batch: $seq to $batch_end"

    psql "$DATABASE_URL" << EOF
DO \$\$
DECLARE
    v_member_record RECORD;
    v_result RECORD;
    v_total_placements INTEGER := 0;
    v_batch_count INTEGER := 0;
BEGIN
    FOR v_member_record IN (
        SELECT wallet_address, referrer_wallet, activation_sequence
        FROM members
        WHERE referrer_wallet IS NOT NULL
          AND referrer_wallet != ''
          AND referrer_wallet != wallet_address
          AND activation_sequence >= $seq
          AND activation_sequence < $batch_end
        ORDER BY activation_sequence
    ) LOOP
        SELECT * INTO v_result
        FROM fn_place_member_recursively(
            v_member_record.wallet_address,
            v_member_record.referrer_wallet,
            v_member_record.activation_sequence
        );

        v_total_placements := v_total_placements + v_result.placements_made;
        v_batch_count := v_batch_count + 1;
    END LOOP;

    RAISE NOTICE 'Batch $seq-$batch_end complete. Processed % members with % placements', v_batch_count, v_total_placements;
END;
\$\$;
EOF

    if [ $? -ne 0 ]; then
        echo "Error processing batch $seq-$batch_end"
        exit 1
    fi

    echo "Batch complete, sleeping 2 seconds..."
    sleep 2
done

echo "All batches complete!"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as total_placements, COUNT(DISTINCT member_wallet) as unique_members, MAX(layer_index) as deepest_layer FROM matrix_referrals_v2;"
