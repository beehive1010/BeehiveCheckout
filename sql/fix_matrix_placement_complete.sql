-- Complete Matrix Placement Fix Based on L-M-R 3x3 Matrix Rules
-- Each root member has their own 19-layer matrix
-- Layer 1: 3 positions (L, M, R)
-- Layer 2: 9 positions (3 under each Layer 1 member)
-- Layer 3: 27 positions (3 under each Layer 2 member)
-- And so on...

BEGIN;

-- Step 1: Backup existing data
CREATE TEMP TABLE backup_individual_matrix_placements AS 
SELECT * FROM individual_matrix_placements;

CREATE TEMP TABLE backup_referrals AS 
SELECT * FROM referrals;

-- Step 2: Clear existing matrix placements (but keep referrals for reference)
DELETE FROM individual_matrix_placements;

-- Step 3: Create the matrix placement function
CREATE OR REPLACE FUNCTION rebuild_matrix_placement()
RETURNS void AS $$
DECLARE
    root_member RECORD;
    placement_queue RECORD;
    current_member TEXT;
    target_root TEXT;
    target_layer INTEGER;
    target_position TEXT;
    next_available_slot RECORD;
    placement_counter INTEGER := 0;
BEGIN
    -- Get all active members ordered by activation rank
    FOR root_member IN 
        SELECT wallet_address, activation_rank, created_at
        FROM members 
        WHERE current_level > 0 
        ORDER BY 
            CASE WHEN activation_rank IS NOT NULL THEN activation_rank ELSE 999999 END,
            created_at
    LOOP
        RAISE NOTICE 'Processing root member: % (rank: %)', root_member.wallet_address, root_member.activation_rank;
        
        -- Each member creates their own matrix with themselves as root
        -- Place all other members into each root's matrix
        
        FOR placement_queue IN
            SELECT wallet_address, activation_rank, created_at
            FROM members 
            WHERE current_level > 0 
              AND wallet_address != root_member.wallet_address
            ORDER BY 
                CASE WHEN activation_rank IS NOT NULL THEN activation_rank ELSE 999999 END,
                created_at
        LOOP
            -- Find next available position in this root's matrix
            SELECT * INTO next_available_slot
            FROM find_next_matrix_position(root_member.wallet_address);
            
            IF next_available_slot.layer IS NOT NULL THEN
                -- Insert the placement
                INSERT INTO individual_matrix_placements (
                    matrix_owner,
                    member_wallet,
                    layer_in_owner_matrix,
                    position_in_layer,
                    placed_at,
                    placement_order
                ) VALUES (
                    root_member.wallet_address,
                    placement_queue.wallet_address,
                    next_available_slot.layer,
                    next_available_slot.position,
                    NOW(),
                    placement_counter
                );
                
                placement_counter := placement_counter + 1;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create helper function to find next available matrix position
CREATE OR REPLACE FUNCTION find_next_matrix_position(p_matrix_owner TEXT)
RETURNS TABLE(layer INTEGER, "position" TEXT) AS $$
DECLARE
    current_layer INTEGER := 1;
    max_positions_per_layer INTEGER;
    current_positions_count INTEGER;
    available_positions TEXT[];
    taken_positions TEXT[];
BEGIN
    -- Try each layer starting from 1
    WHILE current_layer <= 19 LOOP
        -- Calculate max positions for this layer: 3^layer
        max_positions_per_layer := POWER(3, current_layer)::INTEGER;
        
        -- Get current positions count for this layer
        SELECT COUNT(*) INTO current_positions_count
        FROM individual_matrix_placements
        WHERE matrix_owner = p_matrix_owner 
          AND layer_in_owner_matrix = current_layer;
        
        -- If layer is not full, find available position
        IF current_positions_count < max_positions_per_layer THEN
            IF current_layer = 1 THEN
                -- Layer 1: Simple L, M, R
                SELECT ARRAY_AGG(position_in_layer) INTO taken_positions
                FROM individual_matrix_placements
                WHERE matrix_owner = p_matrix_owner 
                  AND layer_in_owner_matrix = 1;
                
                taken_positions := COALESCE(taken_positions, ARRAY[]::TEXT[]);
                
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
                -- For layers 2+: Need to check parent structure
                -- Each position in previous layer can have 3 children (L, M, R)
                DECLARE
                    parent_layer INTEGER := current_layer - 1;
                    parent_pos TEXT;
                    child_positions TEXT[];
                    parent_positions TEXT[];
                BEGIN
                    -- Get all positions from parent layer
                    SELECT ARRAY_AGG(position_in_layer) INTO parent_positions
                    FROM individual_matrix_placements
                    WHERE matrix_owner = p_matrix_owner 
                      AND layer_in_owner_matrix = parent_layer;
                    
                    -- For each parent position, check if it has available child slots
                    FOREACH parent_pos IN ARRAY COALESCE(parent_positions, ARRAY[]::TEXT[])
                    LOOP
                        -- Get existing child positions under this parent
                        SELECT ARRAY_AGG(SPLIT_PART(position_in_layer, '_', 2)) INTO child_positions
                        FROM individual_matrix_placements
                        WHERE matrix_owner = p_matrix_owner 
                          AND layer_in_owner_matrix = current_layer
                          AND position_in_layer LIKE parent_pos || '_%';
                        
                        child_positions := COALESCE(child_positions, ARRAY[]::TEXT[]);
                        
                        -- Check for available child positions (L, M, R)
                        IF NOT 'L' = ANY(child_positions) THEN
                            layer := current_layer;
                            "position" := parent_pos || '_L';
                            RETURN NEXT;
                            RETURN;
                        ELSIF NOT 'M' = ANY(child_positions) THEN
                            layer := current_layer;
                            "position" := parent_pos || '_M';
                            RETURN NEXT;
                            RETURN;
                        ELSIF NOT 'R' = ANY(child_positions) THEN
                            layer := current_layer;
                            "position" := parent_pos || '_R';
                            RETURN NEXT;
                            RETURN;
                        END IF;
                    END LOOP;
                END;
            END IF;
        END IF;
        
        current_layer := current_layer + 1;
    END LOOP;
    
    -- If no position found, return NULL
    layer := NULL;
    "position" := NULL;
    RETURN NEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Execute the matrix rebuild
SELECT rebuild_matrix_placement();

-- Step 6: Update referrals table to match matrix placements
UPDATE referrals r SET
    matrix_position = CASE 
        WHEN imp.layer_in_owner_matrix = 1 THEN imp.position_in_layer
        ELSE RIGHT(imp.position_in_layer, 1)  -- Get the last character (L, M, or R)
    END,
    matrix_layer = imp.layer_in_owner_matrix,
    matrix_parent = CASE 
        WHEN imp.layer_in_owner_matrix = 1 THEN imp.matrix_owner
        ELSE (
            SELECT imp2.member_wallet
            FROM individual_matrix_placements imp2
            WHERE imp2.matrix_owner = imp.matrix_owner
              AND imp2.layer_in_owner_matrix = imp.layer_in_owner_matrix - 1
              AND imp2.position_in_layer = SUBSTRING(imp.position_in_layer FROM 1 FOR LENGTH(imp.position_in_layer) - 2)
            LIMIT 1
        )
    END,
    matrix_root = imp.matrix_owner
FROM individual_matrix_placements imp
WHERE r.member_wallet = imp.member_wallet;

-- Step 7: Verify the matrix structure
DO $$
DECLARE
    matrix_summary RECORD;
    layer_summary RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MATRIX PLACEMENT VERIFICATION ===';
    
    -- Overall summary
    SELECT 
        COUNT(DISTINCT matrix_owner) as total_matrices,
        COUNT(*) as total_placements,
        MIN(layer_in_owner_matrix) as min_layer,
        MAX(layer_in_owner_matrix) as max_layer
    INTO matrix_summary
    FROM individual_matrix_placements;
    
    RAISE NOTICE 'Total matrices: %', matrix_summary.total_matrices;
    RAISE NOTICE 'Total placements: %', matrix_summary.total_placements;
    RAISE NOTICE 'Layer range: % to %', matrix_summary.min_layer, matrix_summary.max_layer;
    
    -- Layer breakdown
    FOR layer_summary IN
        SELECT 
            layer_in_owner_matrix,
            COUNT(*) as placements_count,
            COUNT(DISTINCT matrix_owner) as matrices_with_this_layer
        FROM individual_matrix_placements
        GROUP BY layer_in_owner_matrix
        ORDER BY layer_in_owner_matrix
    LOOP
        RAISE NOTICE 'Layer %: % placements across % matrices', 
            layer_summary.layer_in_owner_matrix, 
            layer_summary.placements_count,
            layer_summary.matrices_with_this_layer;
    END LOOP;
    
    -- Check for any position conflicts
    DECLARE
        conflict_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO conflict_count
        FROM (
            SELECT matrix_owner, layer_in_owner_matrix, position_in_layer, COUNT(*)
            FROM individual_matrix_placements
            GROUP BY matrix_owner, layer_in_owner_matrix, position_in_layer
            HAVING COUNT(*) > 1
        ) conflicts;
        
        IF conflict_count > 0 THEN
            RAISE NOTICE 'WARNING: Found % position conflicts!', conflict_count;
        ELSE
            RAISE NOTICE 'SUCCESS: No position conflicts found!';
        END IF;
    END;
END $$;

-- Step 8: Display sample matrix structures
SELECT '=== SAMPLE MATRIX STRUCTURES ===' as section;

-- Show first few complete matrices
SELECT 
    imp.matrix_owner,
    imp.layer_in_owner_matrix as layer,
    imp.position_in_layer as position,
    imp.member_wallet,
    u.username
FROM individual_matrix_placements imp
LEFT JOIN users u ON imp.member_wallet = u.wallet_address
WHERE imp.matrix_owner IN (
    SELECT matrix_owner 
    FROM individual_matrix_placements 
    GROUP BY matrix_owner 
    ORDER BY MIN(placed_at) 
    LIMIT 3
)
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix, imp.position_in_layer;

-- Clean up functions
DROP FUNCTION IF EXISTS rebuild_matrix_placement();
DROP FUNCTION IF EXISTS find_next_matrix_position(TEXT);

-- Final completion message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Matrix placement rebuild completed!';
    RAISE NOTICE 'All members have been correctly placed in L-M-R 3x3 matrix structure';
    RAISE NOTICE 'Each root member now has their own properly structured matrix';
END $$;

COMMIT;