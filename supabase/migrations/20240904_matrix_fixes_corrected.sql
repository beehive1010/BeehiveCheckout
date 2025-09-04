-- Matrix System Fixes - Corrected Version
-- Fixes field name issues and PostgreSQL reserved keywords

-- 1. Fix the get_layer_members_detailed function
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
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.member_wallet,
        u.username,
        r."position" as position_slot,  -- Use quotes for reserved keyword
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
        CASE r."position"  -- Use quotes for reserved keyword
            WHEN 'L' THEN 1 
            WHEN 'M' THEN 2 
            WHEN 'R' THEN 3 
        END,
        r.placed_at;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix the get_matrix_tree function
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
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.layer as layer_num,
        r.member_wallet,
        r."position" as position_slot,  -- Use quotes for reserved keyword
        r.parent_wallet as parent_wallet_address,
        r.placement_type,
        r.placed_at,
        r.is_active
    FROM referrals r
    WHERE r.root_wallet = root_wallet_param
    AND r.layer <= max_layers
    ORDER BY r.layer, 
             CASE r."position"  -- Use quotes for reserved keyword
                WHEN 'L' THEN 1 
                WHEN 'M' THEN 2 
                WHEN 'R' THEN 3 
             END,
             r.placed_at;
END;
$$ LANGUAGE plpgsql;

-- 3. Fix the get_upline_chain function
CREATE OR REPLACE FUNCTION get_upline_chain(
    member_wallet_param VARCHAR(42),
    root_wallet_param VARCHAR(42)
) RETURNS TABLE(
    upline_wallet VARCHAR(42),
    upline_layer INTEGER,
    upline_position_slot TEXT,
    depth_from_member INTEGER
) AS $$
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
        upline_position_slot := COALESCE(current_record."position", 'ROOT');  -- Use quotes for reserved keyword
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
$$ LANGUAGE plpgsql;

-- 4. Update the find_next_matrix_position function to handle reserved keywords
CREATE OR REPLACE FUNCTION find_next_matrix_position(
    root_wallet_param VARCHAR(42),
    start_layer INTEGER DEFAULT 1
) RETURNS TABLE(
    layer_num INTEGER,
    position_slot TEXT,
    parent_wallet_address VARCHAR(42)
) AS $$
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
                        AND "position" = pos  -- Use quotes for reserved keyword
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
                    SELECT member_wallet, "position" as parent_position  -- Use quotes for reserved keyword
                    FROM referrals 
                    WHERE root_wallet = root_wallet_param 
                    AND layer = current_layer - 1 
                    AND is_active = true
                    ORDER BY 
                        CASE "position"  -- Use quotes for reserved keyword
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
                            AND "position" = pos  -- Use quotes for reserved keyword
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
$$ LANGUAGE plpgsql;

-- 5. Update the matrix_activity_log table structure (if not created properly)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matrix_activity_log') THEN
        CREATE TABLE matrix_activity_log (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            root_wallet VARCHAR(42) NOT NULL,
            member_wallet VARCHAR(42) NOT NULL,
            action_type TEXT NOT NULL,
            layer INTEGER,
            position_slot TEXT,  -- Renamed to avoid reserved keyword
            placement_type TEXT,
            details JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END $$;

-- 6. Update matrix_overview view to handle field names correctly
DROP VIEW IF EXISTS matrix_overview CASCADE;
CREATE VIEW matrix_overview AS
SELECT 
    r.root_wallet,
    r.layer,
    r."position" as position_slot,  -- Use quotes and alias for reserved keyword
    r.member_wallet,
    u.username,
    u.current_level,
    COALESCE(m.is_activated, false) as is_activated,
    COALESCE(m.current_level, 0) as member_level,
    r.placement_type,
    r.placed_at
FROM referrals r
LEFT JOIN users u ON r.member_wallet = u.wallet_address
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.is_active = true
ORDER BY r.root_wallet, r.layer, 
         CASE r."position"  -- Use quotes for reserved keyword
            WHEN 'L' THEN 1 
            WHEN 'M' THEN 2 
            WHEN 'R' THEN 3 
         END;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_layer_members_detailed TO authenticated;
GRANT EXECUTE ON FUNCTION get_matrix_tree TO authenticated;
GRANT EXECUTE ON FUNCTION get_upline_chain TO authenticated;
GRANT EXECUTE ON FUNCTION find_next_matrix_position TO authenticated;
GRANT SELECT ON matrix_overview TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_layer_members_detailed IS 'Returns detailed member information for a specific matrix layer with proper field mappings';
COMMENT ON FUNCTION get_matrix_tree IS 'Returns matrix tree structure with corrected field names';
COMMENT ON FUNCTION get_upline_chain IS 'Returns upline chain for reward calculations with proper field handling';
COMMENT ON VIEW matrix_overview IS 'Matrix visualization view with corrected field mappings between users and members tables';