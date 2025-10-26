-- Fix Matrix Positions Script V2
-- Correctly assigns L/M/R positions based on parent_wallet, not just layer
-- Position should be unique per (matrix_root_wallet, parent_wallet, position)

DO $$
DECLARE
    fixed_count INTEGER := 0;
    current_layer INTEGER;
BEGIN
    RAISE NOTICE 'Starting matrix position fix...';

    -- Loop through each layer from 1 to 19
    FOR current_layer IN 1..19 LOOP
        RAISE NOTICE 'Processing Layer %...', current_layer;

        -- Update positions for this layer, grouped by parent_wallet
        WITH ranked_members AS (
            SELECT
                mr.id,
                mr.matrix_root_wallet,
                mr.parent_wallet,
                mr.layer,
                m.activation_sequence,
                -- Calculate position based on order within each parent
                -- Position cycles through L, M, R for every 3 children under same parent
                CASE
                    WHEN (ROW_NUMBER() OVER (
                        PARTITION BY mr.matrix_root_wallet, mr.parent_wallet
                        ORDER BY m.activation_sequence
                    ) - 1) % 3 = 0 THEN 'L'
                    WHEN (ROW_NUMBER() OVER (
                        PARTITION BY mr.matrix_root_wallet, mr.parent_wallet
                        ORDER BY m.activation_sequence
                    ) - 1) % 3 = 1 THEN 'M'
                    WHEN (ROW_NUMBER() OVER (
                        PARTITION BY mr.matrix_root_wallet, mr.parent_wallet
                        ORDER BY m.activation_sequence
                    ) - 1) % 3 = 2 THEN 'R'
                END as new_position
            FROM matrix_referrals mr
            JOIN members m ON m.wallet_address = mr.member_wallet
            WHERE mr.layer = current_layer
                AND mr.position IS NULL  -- Only update NULL positions
        )
        UPDATE matrix_referrals mr
        SET position = rm.new_position
        FROM ranked_members rm
        WHERE mr.id = rm.id;

        GET DIAGNOSTICS fixed_count = ROW_COUNT;
        RAISE NOTICE 'Layer % - Fixed % records', current_layer, fixed_count;
    END LOOP;

    RAISE NOTICE 'Matrix position fix completed!';
END $$;

-- Verify the results
SELECT
    layer,
    COUNT(*) as total_records,
    COUNT(position) as has_position,
    COUNT(*) - COUNT(position) as null_positions,
    SUM(CASE WHEN position = 'L' THEN 1 ELSE 0 END) as L_count,
    SUM(CASE WHEN position = 'M' THEN 1 ELSE 0 END) as M_count,
    SUM(CASE WHEN position = 'R' THEN 1 ELSE 0 END) as R_count
FROM matrix_referrals
GROUP BY layer
ORDER BY layer;

-- Check for any constraint violations
SELECT
    'Constraint Check' as check_type,
    matrix_root_wallet,
    parent_wallet,
    position,
    COUNT(*) as count
FROM matrix_referrals
WHERE position IS NOT NULL
GROUP BY matrix_root_wallet, parent_wallet, position
HAVING COUNT(*) > 1;
