-- Matrix System SQL Fixes - Corrected Dollar Quoting
-- 修正美元引号和SQL语法问题

-- 1. Fix the get_matrix_tree function with proper dollar quoting
DROP FUNCTION IF EXISTS get_matrix_tree CASCADE;
CREATE OR REPLACE FUNCTION get_matrix_tree(
    root_wallet_param VARCHAR(42),
    max_layers INTEGER DEFAULT 5
) RETURNS TABLE(
    layer_num INTEGER,
    member_wallet VARCHAR(42),
    position_slot TEXT,
    parent_wallet_address VARCHAR(42),
    placement_type TEXT,
    placed_at TIMESTAMP,
    is_active BOOLEAN
) 
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        r.layer as layer_num,
        r.member_wallet,
        r."position" as position_slot,
        r.parent_wallet as parent_wallet_address,
        r.placement_type,
        r.placed_at,
        r.is_active
    FROM referrals r
    WHERE r.root_wallet = root_wallet_param
    AND r.layer <= max_layers
    ORDER BY r.layer, 
             CASE r."position"
                WHEN 'L' THEN 1 
                WHEN 'M' THEN 2 
                WHEN 'R' THEN 3 
             END,
             r.placed_at;
END;
$function$;

-- 2. Fix the get_upline_chain function
DROP FUNCTION IF EXISTS get_upline_chain CASCADE;
CREATE OR REPLACE FUNCTION get_upline_chain(
    member_wallet_param VARCHAR(42),
    root_wallet_param VARCHAR(42)
) RETURNS TABLE(
    upline_wallet VARCHAR(42),
    upline_layer INTEGER,
    upline_position_slot TEXT,
    depth_from_member INTEGER
)
LANGUAGE plpgsql
AS $function$
DECLARE
    current_wallet VARCHAR(42) := member_wallet_param;
    current_record RECORD;
    depth_counter INTEGER := 1;
BEGIN
    -- Find the member's position in the matrix
    SELECT * INTO current_record
    FROM referrals 
    WHERE root_wallet = root_wallet_param 
    AND member_wallet = member_wallet_param 
    AND is_active = true;
    
    IF current_record IS NULL THEN
        RETURN;
    END IF;
    
    current_wallet := current_record.parent_wallet;
    
    -- Traverse up the chain
    WHILE current_wallet IS NOT NULL AND depth_counter <= 19 LOOP
        -- Find the current wallet's position
        SELECT * INTO current_record
        FROM referrals 
        WHERE root_wallet = root_wallet_param 
        AND member_wallet = current_wallet 
        AND is_active = true;
        
        -- Return this upline
        upline_wallet := current_wallet;
        upline_layer := COALESCE(current_record.layer, 0);
        upline_position_slot := COALESCE(current_record."position", 'ROOT');
        depth_from_member := depth_counter;
        
        RETURN NEXT;
        
        -- Move to next upline
        IF current_record IS NOT NULL THEN
            current_wallet := current_record.parent_wallet;
        ELSE
            -- Reached root
            IF current_wallet != root_wallet_param THEN
                upline_wallet := root_wallet_param;
                upline_layer := 0;
                upline_position_slot := 'ROOT';
                depth_from_member := depth_counter + 1;
                RETURN NEXT;
            END IF;
            current_wallet := NULL;
        END IF;
        
        depth_counter := depth_counter + 1;
    END LOOP;
    
    RETURN;
END;
$function$;

-- 3. Fix the get_layer_members_detailed function
DROP FUNCTION IF EXISTS get_layer_members_detailed CASCADE;
CREATE OR REPLACE FUNCTION get_layer_members_detailed(
    root_wallet_param VARCHAR(42),
    layer_param INTEGER
) RETURNS TABLE(
    member_wallet VARCHAR(42),
    username TEXT,
    position_slot TEXT,
    parent_wallet VARCHAR(42),
    placement_type TEXT,
    current_level INTEGER,
    is_activated BOOLEAN,
    placed_at TIMESTAMP
)
LANGUAGE plpgsql  
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        r.member_wallet,
        u.username,
        r."position" as position_slot,
        r.parent_wallet,
        r.placement_type,
        COALESCE(m.current_level, u.current_level, 0) as current_level,
        COALESCE(m.is_activated, false) as is_activated,
        r.placed_at
    FROM referrals r
    LEFT JOIN users u ON r.member_wallet = u.wallet_address
    LEFT JOIN members m ON r.member_wallet = m.wallet_address
    WHERE r.root_wallet = root_wallet_param
    AND r.layer = layer_param
    AND r.is_active = true
    ORDER BY 
        CASE r."position"
            WHEN 'L' THEN 1 
            WHEN 'M' THEN 2 
            WHEN 'R' THEN 3 
        END,
        r.placed_at;
END;
$function$;

-- 4. Fix the find_next_matrix_position function
DROP FUNCTION IF EXISTS find_next_matrix_position CASCADE;
CREATE OR REPLACE FUNCTION find_next_matrix_position(
    root_wallet_param VARCHAR(42),
    start_layer INTEGER DEFAULT 1
) RETURNS TABLE(
    layer_num INTEGER,
    position_slot TEXT,
    parent_wallet_address VARCHAR(42)
)
LANGUAGE plpgsql
AS $function$
DECLARE
    current_layer INTEGER := start_layer;
    max_layer INTEGER := 19;
    layer_capacity INTEGER;
    current_count INTEGER;
    pos TEXT;
    potential_parents RECORD;
BEGIN
    -- Check each layer starting from start_layer
    WHILE current_layer <= max_layer LOOP
        layer_capacity := power(3, current_layer);
        
        -- Count current members in this layer
        SELECT COUNT(*) INTO current_count
        FROM referrals 
        WHERE root_wallet = root_wallet_param 
        AND layer = current_layer 
        AND is_active = true;
        
        -- If layer has space, find the exact position
        IF current_count < layer_capacity THEN
            -- For layer 1, parent is the root
            IF current_layer = 1 THEN
                -- Check L, M, R positions in order
                FOR pos IN SELECT * FROM unnest(ARRAY['L', 'M', 'R']) LOOP
                    IF NOT EXISTS (
                        SELECT 1 FROM referrals 
                        WHERE root_wallet = root_wallet_param 
                        AND layer = current_layer 
                        AND "position" = pos
                        AND is_active = true
                    ) THEN
                        layer_num := current_layer;
                        position_slot := pos;
                        parent_wallet_address := root_wallet_param;
                        RETURN NEXT;
                        RETURN;
                    END IF;
                END LOOP;
            ELSE
                -- For layers > 1, find available positions under existing parents
                FOR potential_parents IN
                    SELECT member_wallet, "position" as parent_position
                    FROM referrals 
                    WHERE root_wallet = root_wallet_param 
                    AND layer = current_layer - 1 
                    AND is_active = true
                    ORDER BY 
                        CASE "position"
                            WHEN 'L' THEN 1 
                            WHEN 'M' THEN 2 
                            WHEN 'R' THEN 3 
                        END
                LOOP
                    -- Check if this parent has available slots
                    FOR pos IN SELECT * FROM unnest(ARRAY['L', 'M', 'R']) LOOP
                        IF NOT EXISTS (
                            SELECT 1 FROM referrals 
                            WHERE root_wallet = root_wallet_param 
                            AND layer = current_layer 
                            AND parent_wallet = potential_parents.member_wallet 
                            AND "position" = pos
                            AND is_active = true
                        ) THEN
                            layer_num := current_layer;
                            position_slot := pos;
                            parent_wallet_address := potential_parents.member_wallet;
                            RETURN NEXT;
                            RETURN;
                        END IF;
                    END LOOP;
                END LOOP;
            END IF;
        END IF;
        
        current_layer := current_layer + 1;
    END LOOP;
    
    -- If no position found, return null
    RETURN;
END;
$function$;

-- 5. Fix the place_in_matrix function
DROP FUNCTION IF EXISTS place_in_matrix CASCADE;
CREATE OR REPLACE FUNCTION place_in_matrix(
    member_wallet_param VARCHAR(42),
    root_wallet_param VARCHAR(42),
    placer_wallet_param VARCHAR(42) DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    layer_num INTEGER,
    position_slot TEXT,
    parent_wallet_address VARCHAR(42),
    placement_type TEXT,
    message TEXT
)
LANGUAGE plpgsql
AS $function$
DECLARE
    next_position RECORD;
    actual_placer VARCHAR(42);
    placement_type_val TEXT;
BEGIN
    -- Check if user is already placed in this matrix
    IF EXISTS (
        SELECT 1 FROM referrals 
        WHERE root_wallet = root_wallet_param 
        AND member_wallet = member_wallet_param
    ) THEN
        success := false;
        message := 'User already placed in this matrix';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Find next available position
    SELECT * INTO next_position 
    FROM find_next_matrix_position(root_wallet_param, 1) 
    LIMIT 1;
    
    IF next_position IS NULL THEN
        success := false;
        message := 'Matrix is full - no available positions';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Determine placer and placement type
    IF next_position.layer_num = 1 THEN
        actual_placer := COALESCE(placer_wallet_param, root_wallet_param);
        placement_type_val := 'direct';
    ELSE
        actual_placer := next_position.parent_wallet_address;
        placement_type_val := 'spillover';
    END IF;
    
    -- Insert the placement
    INSERT INTO referrals (
        root_wallet,
        member_wallet,
        layer,
        "position",
        parent_wallet,
        placer_wallet,
        placement_type,
        is_active,
        placed_at
    ) VALUES (
        root_wallet_param,
        member_wallet_param,
        next_position.layer_num,
        next_position.position_slot,
        next_position.parent_wallet_address,
        actual_placer,
        placement_type_val,
        true,
        NOW()
    );
    
    -- Return success info
    success := true;
    layer_num := next_position.layer_num;
    position_slot := next_position.position_slot;
    parent_wallet_address := next_position.parent_wallet_address;
    placement_type := placement_type_val;
    message := 'Successfully placed in matrix';
    
    RETURN NEXT;
    RETURN;
    
EXCEPTION
    WHEN OTHERS THEN
        success := false;
        message := 'Error placing in matrix: ' || SQLERRM;
        RETURN NEXT;
        RETURN;
END;
$function$;

-- 6. Fix the auto_place_user function
DROP FUNCTION IF EXISTS auto_place_user CASCADE;
CREATE OR REPLACE FUNCTION auto_place_user(
    member_wallet_param VARCHAR(42),
    referrer_wallet_param VARCHAR(42)
) RETURNS TABLE(
    success BOOLEAN,
    layer_result INTEGER,
    position_result TEXT,
    parent_result VARCHAR(42),
    placement_type_result TEXT,
    message_result TEXT
)
LANGUAGE plpgsql
AS $function$
DECLARE
    placement_result RECORD;
BEGIN
    -- Validate inputs
    IF member_wallet_param IS NULL OR referrer_wallet_param IS NULL THEN
        success := false;
        message_result := 'Invalid wallet addresses provided';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Check if users exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE wallet_address = member_wallet_param) THEN
        success := false;
        message_result := 'Member wallet not found in users table';
        RETURN NEXT;
        RETURN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE wallet_address = referrer_wallet_param) THEN
        success := false;
        message_result := 'Referrer wallet not found in users table';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Use the place_in_matrix function
    SELECT * INTO placement_result
    FROM place_in_matrix(member_wallet_param, referrer_wallet_param)
    LIMIT 1;
    
    -- Return the result
    success := placement_result.success;
    layer_result := placement_result.layer_num;
    position_result := placement_result.position_slot;
    parent_result := placement_result.parent_wallet_address;
    placement_type_result := placement_result.placement_type;
    message_result := placement_result.message;
    
    RETURN NEXT;
    RETURN;
    
EXCEPTION
    WHEN OTHERS THEN
        success := false;
        message_result := 'Error in auto_place_user: ' || SQLERRM;
        RETURN NEXT;
        RETURN;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_matrix_tree TO authenticated;
GRANT EXECUTE ON FUNCTION get_upline_chain TO authenticated;
GRANT EXECUTE ON FUNCTION get_layer_members_detailed TO authenticated;
GRANT EXECUTE ON FUNCTION find_next_matrix_position TO authenticated;
GRANT EXECUTE ON FUNCTION place_in_matrix TO authenticated;
GRANT EXECUTE ON FUNCTION auto_place_user TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_matrix_tree IS 'Returns matrix tree structure with corrected syntax';
COMMENT ON FUNCTION get_upline_chain IS 'Returns upline chain for reward calculations';
COMMENT ON FUNCTION get_layer_members_detailed IS 'Returns detailed member info for matrix layer';
COMMENT ON FUNCTION find_next_matrix_position IS 'Finds next available position in matrix';
COMMENT ON FUNCTION place_in_matrix IS 'Places user in matrix with proper validation';
COMMENT ON FUNCTION auto_place_user IS 'Automatically places user using spillover logic';