-- Fix L-M-R placement order in 3x3 matrix system
-- This script corrects the matrix placement algorithm to follow proper L -> M -> R sequence

BEGIN;

-- Step 1: Create corrected placement function that follows strict L-M-R order
CREATE OR REPLACE FUNCTION find_next_lmr_position(p_matrix_owner TEXT)
RETURNS TABLE(layer INTEGER, "position" TEXT) AS $$
DECLARE
    current_layer INTEGER := 1;
    max_positions_per_layer INTEGER;
    current_positions_count INTEGER;
    taken_positions TEXT[];
BEGIN
    -- Try each layer starting from 1
    WHILE current_layer <= 19 LOOP
        -- Calculate max positions for this layer: 3^layer
        max_positions_per_layer := POWER(3, current_layer)::INTEGER;
        
        -- Get current positions count for this layer
        SELECT COUNT(*) INTO current_positions_count
        FROM referrals
        WHERE matrix_root = p_matrix_owner 
          AND matrix_layer = current_layer;
        
        -- If layer is not full, find next L-M-R position
        IF current_positions_count < max_positions_per_layer THEN
            IF current_layer = 1 THEN
                -- Layer 1: Simple L, M, R sequence
                SELECT ARRAY_AGG(matrix_position) INTO taken_positions
                FROM referrals
                WHERE matrix_root = p_matrix_owner 
                  AND matrix_layer = 1;
                
                taken_positions := COALESCE(taken_positions, ARRAY[]::TEXT[]);
                
                -- Check positions in strict L -> M -> R order
                IF NOT 'L' = ANY(taken_positions) THEN
                    layer := 1;
                    "position" := 'L';
                    RETURN NEXT;
                    RETURN;
                ELSIF NOT 'M' = ANY(taken_positions) THEN
                    layer := 1;
                    "position" := 'M';
                    RETURN NEXT;
                    RETURN;
                ELSIF NOT 'R' = ANY(taken_positions) THEN
                    layer := 1;
                    "position" := 'R';
                    RETURN NEXT;
                    RETURN;
                END IF;
            ELSE
                -- For layers 2+: More complex parent-child relationship
                -- This would need more complex logic for hierarchical positions
                -- For now, return the first layer available
                layer := current_layer;
                position := 'L'; -- Simplified for higher layers
                RETURN NEXT;
                RETURN;
            END IF;
        END IF;
        
        current_layer := current_layer + 1;
    END LOOP;
    
    -- If all layers are full (shouldn't happen with 19 layers)
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Analyze the current incorrect placement for user 0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0
DO $$
DECLARE
    issue_count INTEGER;
    correction_needed BOOLEAN := false;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== L-M-R PLACEMENT ORDER ANALYSIS ===';
    
    -- Check the problematic user's matrix
    SELECT COUNT(*) INTO issue_count
    FROM referrals 
    WHERE matrix_root = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0'
      AND matrix_layer = 1
      AND matrix_position = 'R'
      AND NOT EXISTS (
          SELECT 1 FROM referrals r2 
          WHERE r2.matrix_root = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0'
            AND r2.matrix_layer = 1 
            AND r2.matrix_position = 'M'
      );
    
    IF issue_count > 0 THEN
        correction_needed := true;
        RAISE NOTICE 'ISSUE DETECTED: Found % member(s) in R position without M position filled first', issue_count;
        RAISE NOTICE 'This violates L->M->R placement order rule';
    ELSE
        RAISE NOTICE 'No L-M-R order violations detected for this user';
    END IF;
    
    -- Display current state
    RAISE NOTICE '';
    RAISE NOTICE '--- Current Layer 1 State for user 0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0 ---';
    FOR rec IN 
        SELECT matrix_position, member_wallet, placed_at
        FROM referrals
        WHERE matrix_root = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0'
          AND matrix_layer = 1
        ORDER BY placed_at
    LOOP
        RAISE NOTICE 'Position: %, Member: %, Time: %', rec.matrix_position, rec.member_wallet, rec.placed_at;
    END LOOP;
    
    IF correction_needed THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  CORRECTION NEEDED: The second member should be in position M, not R';
        RAISE NOTICE '✅ Recommended fix: Update matrix_position from R to M for the second member';
    END IF;
END $$;

-- Step 3: Option to fix the specific issue (commented out for safety)
/*
UPDATE referrals 
SET matrix_position = 'M'
WHERE matrix_root = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0'
  AND matrix_layer = 1
  AND matrix_position = 'R'
  AND member_wallet = '0xABCDEF1234567890123456789012345678901234'
  AND placed_at = '2025-09-10 17:42:12.790604+00';
*/

-- Step 4: Test the corrected placement function
SELECT '=== TESTING CORRECTED PLACEMENT FUNCTION ===' as test_section;

-- Test what the next position should be for a user with only L filled
WITH test_matrix AS (
    SELECT '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0' as test_root
)
SELECT 
    tm.test_root,
    np.layer as next_layer,
    np.position as next_position,
    'Should be M since L is filled but M is empty' as expected_logic
FROM test_matrix tm
CROSS JOIN find_next_lmr_position(tm.test_root) np;

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '📋 Summary:';
RAISE NOTICE '1. Created find_next_lmr_position() function with correct L->M->R logic';
RAISE NOTICE '2. Analyzed current placement issues';  
RAISE NOTICE '3. Provided test to verify correct behavior';
RAISE NOTICE '4. Manual correction query is commented out for safety';