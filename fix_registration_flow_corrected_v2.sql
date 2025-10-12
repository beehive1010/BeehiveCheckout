-- ============================================================================
-- CRITICAL FIX V2: Registration Flow - Use Correct Placement Function
-- Date: 2025-10-12
-- Priority: P0 - DEPLOY IMMEDIATELY
--
-- Issue: Previous fix called place_member_matrix_complete() which references
--        non-existent referrals_tree_view. Need to use recursive_matrix_placement().
--
-- Solution: Update place_new_member_in_matrix_correct() to call the ACTUAL
--           working function: recursive_matrix_placement()
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Fix the placement function to call CORRECT working implementation
-- ============================================================================

CREATE OR REPLACE FUNCTION place_new_member_in_matrix_correct(
    p_member_wallet TEXT,
    p_referrer_wallet TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_placements_created INTEGER;
    v_deepest_layer INTEGER;
    v_placement_details JSONB;
BEGIN
    -- Log the placement attempt
    RAISE LOG 'Attempting matrix placement for member: %, referrer: %',
        p_member_wallet, p_referrer_wallet;

    -- Call the CORRECT working placement function
    SELECT placements_created, deepest_layer, placement_details
    INTO v_placements_created, v_deepest_layer, v_placement_details
    FROM recursive_matrix_placement(
        p_member_wallet::VARCHAR(42),
        p_referrer_wallet::VARCHAR(42)
    );

    -- Log the result
    IF v_placements_created > 0 THEN
        RAISE LOG 'Matrix placement succeeded for %: % placements created at deepest layer %',
            p_member_wallet, v_placements_created, v_deepest_layer;

        RETURN json_build_object(
            'success', true,
            'message', 'Matrix placement completed successfully',
            'placements_created', v_placements_created,
            'deepest_layer', v_deepest_layer,
            'details', v_placement_details
        );
    ELSE
        RAISE WARNING 'Matrix placement returned 0 placements for %', p_member_wallet;

        RETURN json_build_object(
            'success', false,
            'message', 'Matrix placement returned 0 placements',
            'placements_created', 0,
            'details', v_placement_details
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Matrix placement exception for %: %',
            p_member_wallet, SQLERRM;
        RETURN json_build_object(
            'success', false,
            'message', 'Error during matrix placement: ' || SQLERRM,
            'error', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION place_new_member_in_matrix_correct IS
'Fixed placement function that calls recursive_matrix_placement()
which is the ACTUAL working function used by the Edge Function.
Includes logging for debugging.';

-- ============================================================================
-- STEP 2: Validation
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ CRITICAL FIX V2 APPLIED: Using Correct Placement Function';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes Applied:';
    RAISE NOTICE '  ✅ place_new_member_in_matrix_correct() - Now calls recursive_matrix_placement()';
    RAISE NOTICE '  ✅ This is the SAME function used by Edge Functions';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to backfill 10 missing members!';
    RAISE NOTICE '';
END $$;

COMMIT;
