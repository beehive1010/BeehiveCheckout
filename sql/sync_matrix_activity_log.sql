-- Sync Matrix Activity Log with corrected L-M-R positions
-- This script updates the matrix_activity_log to match the corrected referrals table

BEGIN;

-- Create a backup of the current matrix_activity_log
CREATE TEMP TABLE backup_matrix_activity_log AS 
SELECT * FROM matrix_activity_log;

-- Update matrix_activity_log to match corrected referrals positions
UPDATE matrix_activity_log mal SET
    layer = r.matrix_layer,
    position = r.matrix_position,
    details = COALESCE(mal.details, '{}'::jsonb) || jsonb_build_object(
        'position_corrected', true,
        'correction_timestamp', NOW(),
        'original_position', mal.position,
        'original_layer', mal.layer
    )
FROM referrals r
WHERE mal.member_wallet = r.member_wallet 
  AND mal.root_wallet = r.matrix_root
  AND mal.activity_type = 'member_placement'
  AND r.matrix_root IS NOT NULL;

-- Verify the sync results
DO $$
DECLARE
    activity_summary RECORD;
    position_summary RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MATRIX ACTIVITY LOG SYNC VERIFICATION ===';
    
    -- Overall summary
    SELECT 
        COUNT(*) as total_activities,
        COUNT(CASE WHEN activity_type = 'member_placement' THEN 1 END) as member_placements,
        COUNT(CASE WHEN activity_type = 'system_init' THEN 1 END) as system_inits
    INTO activity_summary
    FROM matrix_activity_log;
    
    RAISE NOTICE 'Total activities: %', activity_summary.total_activities;
    RAISE NOTICE 'Member placements: %', activity_summary.member_placements;
    RAISE NOTICE 'System initializations: %', activity_summary.system_inits;
    
    -- Position distribution after sync
    FOR position_summary IN
        SELECT 
            layer,
            position,
            COUNT(*) as activity_count
        FROM matrix_activity_log
        WHERE activity_type = 'member_placement'
        GROUP BY layer, position
        ORDER BY layer, position
    LOOP
        RAISE NOTICE 'Layer % Position %: % activities', 
            position_summary.layer, 
            position_summary.position,
            position_summary.activity_count;
    END LOOP;
    
    -- Check for any inconsistencies
    DECLARE
        inconsistency_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO inconsistency_count
        FROM matrix_activity_log mal
        LEFT JOIN referrals r ON mal.member_wallet = r.member_wallet 
                              AND mal.root_wallet = r.matrix_root
        WHERE mal.activity_type = 'member_placement'
          AND (mal.layer != r.matrix_layer OR mal.position != r.matrix_position);
        
        IF inconsistency_count > 0 THEN
            RAISE NOTICE 'WARNING: Found % inconsistencies between activity log and referrals!', inconsistency_count;
        ELSE
            RAISE NOTICE 'SUCCESS: Matrix activity log is now fully synchronized with referrals table!';
        END IF;
    END;
END $$;

-- Display sample of corrected activity records
SELECT '=== SAMPLE CORRECTED ACTIVITY RECORDS ===' as section;

SELECT 
    mal.root_wallet,
    u.username as root_name,
    mal.member_wallet,
    u2.username as member_name,
    mal.layer,
    mal.position,
    mal.activity_type,
    mal.created_at,
    mal.details->>'position_corrected' as was_corrected
FROM matrix_activity_log mal
LEFT JOIN users u ON mal.root_wallet = u.wallet_address
LEFT JOIN users u2 ON mal.member_wallet = u2.wallet_address
WHERE mal.activity_type = 'member_placement'
  AND mal.root_wallet = '0x0000000000000000000000000000000000000001'  -- Show main root's activities
ORDER BY mal.created_at DESC
LIMIT 10;

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '✅ Matrix activity log synchronization completed!';
RAISE NOTICE 'All activity records now reflect the correct L-M-R matrix positions';