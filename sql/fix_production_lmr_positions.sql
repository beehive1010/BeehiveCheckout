-- Fix L→M→R position distribution in production individual_matrix_placements table
-- Current issue: All members are assigned to 'L' position, should be distributed L→M→R

-- Step 1: Create function to reassign positions in L→M→R order
CREATE OR REPLACE FUNCTION fix_lmr_positions()
RETURNS VOID AS $$
DECLARE
    matrix_rec RECORD;
    member_rec RECORD;
    current_position TEXT;
    position_counter INTEGER;
    max_per_position INTEGER;
BEGIN
    -- For each matrix owner and layer combination
    FOR matrix_rec IN 
        SELECT 
            matrix_owner, 
            layer_in_owner_matrix,
            COUNT(*) as total_members
        FROM individual_matrix_placements 
        WHERE is_active = true
        GROUP BY matrix_owner, layer_in_owner_matrix
        ORDER BY matrix_owner, layer_in_owner_matrix
    LOOP
        -- Calculate max positions per position type for this layer
        -- Layer 1: max 1 per position (L,M,R) = 3 total
        -- Layer 2: max 3 per position (L,M,R) = 9 total
        max_per_position := POWER(3, matrix_rec.layer_in_owner_matrix - 1);
        
        RAISE NOTICE 'Processing matrix_owner: %, layer: %, total_members: %, max_per_position: %', 
            (SELECT COALESCE(username, 'Unknown') FROM users WHERE wallet_address = matrix_rec.matrix_owner),
            matrix_rec.layer_in_owner_matrix, 
            matrix_rec.total_members,
            max_per_position;
        
        position_counter := 0;
        
        -- Get all members in this matrix/layer ordered by placed_at (chronological order)
        FOR member_rec IN 
            SELECT id, member_wallet, placed_at
            FROM individual_matrix_placements 
            WHERE matrix_owner = matrix_rec.matrix_owner 
            AND layer_in_owner_matrix = matrix_rec.layer_in_owner_matrix
            AND is_active = true
            ORDER BY placed_at, id  -- Use ID as tiebreaker for consistent ordering
        LOOP
            position_counter := position_counter + 1;
            
            -- Determine position based on L→M→R filling order
            IF position_counter <= max_per_position THEN
                current_position := 'L';
            ELSIF position_counter <= max_per_position * 2 THEN
                current_position := 'M';
            ELSE
                current_position := 'R';
            END IF;
            
            -- Update the position
            UPDATE individual_matrix_placements 
            SET position_in_layer = current_position
            WHERE id = member_rec.id;
            
            RAISE NOTICE '  Member % assigned to position % (order: %)', 
                (SELECT COALESCE(username, SUBSTRING(member_rec.member_wallet, 1, 10)) FROM users WHERE wallet_address = member_rec.member_wallet),
                current_position, 
                position_counter;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'L→M→R position reassignment completed!';
END;
$$ LANGUAGE plpgsql;

-- Step 2: Add placement_order column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'individual_matrix_placements' 
        AND column_name = 'placement_order'
    ) THEN
        ALTER TABLE individual_matrix_placements 
        ADD COLUMN placement_order INTEGER;
        
        -- Set placement_order based on current data
        WITH ordered_placements AS (
            SELECT 
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY matrix_owner, layer_in_owner_matrix 
                    ORDER BY placed_at, id
                ) as order_num
            FROM individual_matrix_placements
            WHERE is_active = true
        )
        UPDATE individual_matrix_placements 
        SET placement_order = op.order_num
        FROM ordered_placements op
        WHERE individual_matrix_placements.id = op.id;
        
        RAISE NOTICE 'Added placement_order column and populated with chronological order';
    END IF;
END $$;

-- Step 3: Execute the fix
SELECT fix_lmr_positions();

-- Step 4: Verify the results
SELECT 
    '=== VERIFICATION: L→M→R Distribution ===' as section;

-- Show the corrected distribution
SELECT 
    COALESCE(u.username, 'Unknown') as matrix_owner_name,
    imp.matrix_owner,
    imp.layer_in_owner_matrix,
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'L') as L_positions,
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'M') as M_positions,
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'R') as R_positions,
    COUNT(*) as total_positions,
    POWER(3, imp.layer_in_owner_matrix - 1)::integer as max_per_position
FROM individual_matrix_placements imp
LEFT JOIN users u ON imp.matrix_owner = u.wallet_address
WHERE imp.is_active = true
GROUP BY imp.matrix_owner, u.username, imp.layer_in_owner_matrix
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix;

-- Show detailed member assignments
SELECT 
    '=== DETAILED MEMBER ASSIGNMENTS ===' as section;

SELECT 
    COALESCE(owner_u.username, 'Unknown') as matrix_owner_name,
    'Layer ' || imp.layer_in_owner_matrix as layer,
    imp.position_in_layer as position,
    COALESCE(member_u.username, SUBSTRING(imp.member_wallet, 1, 10)) as member_name,
    imp.placement_order as order_in_layer,
    imp.placed_at
FROM individual_matrix_placements imp
LEFT JOIN users owner_u ON imp.matrix_owner = owner_u.wallet_address
LEFT JOIN users member_u ON imp.member_wallet = member_u.wallet_address
WHERE imp.is_active = true
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix, imp.placement_order;

-- Final summary
DO $$
DECLARE
    total_l INTEGER;
    total_m INTEGER;
    total_r INTEGER;
    total_members INTEGER;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE position_in_layer = 'L'),
        COUNT(*) FILTER (WHERE position_in_layer = 'M'),
        COUNT(*) FILTER (WHERE position_in_layer = 'R'),
        COUNT(*)
    INTO total_l, total_m, total_r, total_members
    FROM individual_matrix_placements 
    WHERE is_active = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== FINAL SUMMARY ===';
    RAISE NOTICE 'Total L positions: %', total_l;
    RAISE NOTICE 'Total M positions: %', total_m;
    RAISE NOTICE 'Total R positions: %', total_r;
    RAISE NOTICE 'Total members: %', total_members;
    RAISE NOTICE '';
    RAISE NOTICE '✅ L→M→R position distribution has been corrected!';
    RAISE NOTICE 'Members are now properly distributed in L→M→R order based on chronological placement.';
END $$;