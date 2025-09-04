-- Matrix System Fixes for 3x3 Forced Matrix
-- This migration ensures proper matrix placement logic and team statistics

-- Drop existing inconsistent tables if they exist
DROP TABLE IF EXISTS referral_nodes CASCADE;
DROP TABLE IF EXISTS matrix_layers CASCADE;

-- Ensure referrals table has correct structure for 3x3 matrix
-- The table should already exist from schema.ts, but we'll ensure indexes are optimized

-- Add indexes for matrix performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_referrals_root_layer ON referrals(root_wallet, layer);
CREATE INDEX IF NOT EXISTS idx_referrals_member ON referrals(member_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_parent ON referrals(parent_wallet) WHERE parent_wallet IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_active ON referrals(root_wallet, is_active) WHERE is_active = true;

-- Function to update team statistics when new referral is added
CREATE OR REPLACE FUNCTION update_team_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the root member's team statistics
    UPDATE members 
    SET 
        total_team_size = (
            SELECT COUNT(*) 
            FROM referrals 
            WHERE root_wallet = NEW.root_wallet 
            AND is_active = true
        ),
        total_direct_referrals = (
            SELECT COUNT(*) 
            FROM referrals 
            WHERE root_wallet = NEW.root_wallet 
            AND layer = 1 
            AND is_active = true
        ),
        updated_at = NOW()
    WHERE wallet_address = NEW.root_wallet;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update team statistics
DROP TRIGGER IF EXISTS trigger_update_team_stats ON referrals;
CREATE TRIGGER trigger_update_team_stats
    AFTER INSERT OR UPDATE OF is_active ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_team_statistics();

-- Function to find next available position in matrix (L -> M -> R priority)
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
                        AND position = pos 
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
                    SELECT member_wallet, position as parent_position
                    FROM referrals 
                    WHERE root_wallet = root_wallet_param 
                    AND layer = current_layer - 1 
                    AND is_active = true
                    ORDER BY 
                        CASE position 
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
                            AND position = pos 
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

-- Function to place user in matrix with proper L->M->R spillover logic
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
) AS $$
DECLARE
    next_position RECORD;
    actual_placer VARCHAR(42);
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
        placement_type := 'direct';
    ELSE
        actual_placer := next_position.parent_wallet_address;
        placement_type := 'spillover';
    END IF;
    
    -- Insert the placement
    INSERT INTO referrals (
        root_wallet,
        member_wallet,
        layer,
        position,
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
        placement_type,
        true,
        NOW()
    );
    
    -- Return success info
    success := true;
    layer_num := next_position.layer_num;
    position_slot := next_position.position_slot;
    parent_wallet_address := next_position.parent_wallet_address;
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
$$ LANGUAGE plpgsql;

-- Function to get team statistics for a root wallet
CREATE OR REPLACE FUNCTION get_team_statistics(
    root_wallet_param VARCHAR(42)
) RETURNS TABLE(
    total_team_size BIGINT,
    direct_referrals BIGINT,
    layer_counts JSONB
) AS $$
DECLARE
    layer_data JSONB := '{}';
    layer_record RECORD;
BEGIN
    -- Get total team size
    SELECT COUNT(*) INTO total_team_size
    FROM referrals 
    WHERE root_wallet = root_wallet_param 
    AND is_active = true;
    
    -- Get direct referrals count
    SELECT COUNT(*) INTO direct_referrals
    FROM referrals 
    WHERE root_wallet = root_wallet_param 
    AND layer = 1 
    AND is_active = true;
    
    -- Build layer counts JSON
    FOR layer_record IN
        SELECT layer, COUNT(*) as member_count
        FROM referrals 
        WHERE root_wallet = root_wallet_param 
        AND is_active = true 
        GROUP BY layer 
        ORDER BY layer
    LOOP
        layer_data := layer_data || jsonb_build_object(
            layer_record.layer::text, 
            layer_record.member_count
        );
    END LOOP;
    
    layer_counts := layer_data;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get matrix tree structure
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
        r.layer,
        r.member_wallet,
        r.position,
        r.parent_wallet,
        r.placement_type,
        r.placed_at,
        r.is_active
    FROM referrals r
    WHERE r.root_wallet = root_wallet_param
    AND r.layer <= max_layers
    ORDER BY r.layer, 
             CASE r.position 
                WHEN 'L' THEN 1 
                WHEN 'M' THEN 2 
                WHEN 'R' THEN 3 
             END,
             r.placed_at;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments to the referrals table
COMMENT ON TABLE referrals IS '3x3 Forced Matrix System - stores matrix placement relationships';
COMMENT ON COLUMN referrals.root_wallet IS 'The root/referrer wallet who owns this matrix tree';
COMMENT ON COLUMN referrals.member_wallet IS 'The member placed in this matrix position';
COMMENT ON COLUMN referrals.layer IS 'Matrix layer/depth (1-19)';
COMMENT ON COLUMN referrals.position IS 'Position in layer: L (Left), M (Middle), R (Right)';
COMMENT ON COLUMN referrals.parent_wallet IS 'Direct parent in the matrix tree';
COMMENT ON COLUMN referrals.placer_wallet IS 'Who actually placed this member (for spillover tracking)';
COMMENT ON COLUMN referrals.placement_type IS 'direct (layer 1) or spillover (layers 2+)';

-- Ensure proper permissions for the functions
GRANT EXECUTE ON FUNCTION find_next_matrix_position TO authenticated;
GRANT EXECUTE ON FUNCTION place_in_matrix TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_matrix_tree TO authenticated;

-- Create view for easy matrix visualization
CREATE OR REPLACE VIEW matrix_overview AS
SELECT 
    r.root_wallet,
    r.layer,
    r.position,
    r.member_wallet,
    u.username,
    u.current_level,
    m.is_activated,
    m.current_level as member_level,
    r.placement_type,
    r.placed_at
FROM referrals r
LEFT JOIN users u ON r.member_wallet = u.wallet_address
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.is_active = true
ORDER BY r.root_wallet, r.layer, 
         CASE r.position 
            WHEN 'L' THEN 1 
            WHEN 'M' THEN 2 
            WHEN 'R' THEN 3 
         END;

-- Grant access to the view
GRANT SELECT ON matrix_overview TO authenticated;