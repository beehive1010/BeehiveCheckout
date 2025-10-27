-- ============================================================================
-- Matrix Data Fix Script
-- Purpose: Fix duplicate slots and data inconsistencies in matrix_referrals
-- Date: 2025-10-27
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Starting matrix data fix...';
END $$;

-- Step 1: Remove duplicate slots (keep the oldest record by created_at)
WITH duplicates AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY matrix_root_wallet, parent_wallet, slot
            ORDER BY created_at ASC, id ASC
        ) as rn
    FROM matrix_referrals
)
DELETE FROM matrix_referrals
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Removed % duplicate slot records', v_deleted_count;
END $$;

-- Step 2: Update bfs_order for all records
-- Calculate BFS order based on layer and created_at within each matrix
WITH bfs_numbered AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY matrix_root_wallet
            ORDER BY layer ASC, created_at ASC
        ) as new_bfs_order
    FROM matrix_referrals
)
UPDATE matrix_referrals mr
SET bfs_order = bn.new_bfs_order
FROM bfs_numbered bn
WHERE mr.id = bn.id;

DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Updated bfs_order for % records', v_updated_count;
END $$;

-- Step 3: Recreate unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_matrix_parent_slot
ON matrix_referrals(matrix_root_wallet, parent_wallet, slot);

RAISE NOTICE '✅ Recreated unique index idx_matrix_parent_slot';

-- Step 4: Verify fix for FT1 matrix
DO $$
DECLARE
    v_ft1_count INTEGER;
    v_duplicate_count INTEGER;
BEGIN
    -- Count FT1 matrix members
    SELECT COUNT(*) INTO v_ft1_count
    FROM matrix_referrals
    WHERE matrix_root_wallet = '0x2B03D532faa3120826586efb00C9363F9a611b6f';

    -- Count remaining duplicates
    SELECT COUNT(*) INTO v_duplicate_count
    FROM (
        SELECT matrix_root_wallet, parent_wallet, slot, COUNT(*)
        FROM matrix_referrals
        GROUP BY matrix_root_wallet, parent_wallet, slot
        HAVING COUNT(*) > 1
    ) dups;

    RAISE NOTICE '';
    RAISE NOTICE '📊 Verification Results:';
    RAISE NOTICE '   FT1 matrix members: %', v_ft1_count;
    RAISE NOTICE '   Remaining duplicates: %', v_duplicate_count;

    IF v_duplicate_count = 0 THEN
        RAISE NOTICE '✅ All duplicates removed successfully!';
    ELSE
        RAISE WARNING '⚠️  Still have % duplicate slots', v_duplicate_count;
    END IF;
END $$;

-- Step 5: Show sample of corrected data
SELECT
    'Sample corrected data' as info,
    mr.layer,
    mr.slot,
    u.username,
    parent_u.username as parent,
    mr.bfs_order
FROM matrix_referrals mr
LEFT JOIN users u ON u.wallet_address = mr.member_wallet
LEFT JOIN users parent_u ON parent_u.wallet_address = mr.parent_wallet
WHERE mr.matrix_root_wallet = '0x2B03D532faa3120826586efb00C9363F9a611b6f'
ORDER BY mr.layer, mr.bfs_order
LIMIT 20;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Matrix data fix completed!';
    RAISE NOTICE '   Next step: Verify frontend display shows correct L/M/R positions';
END $$;
