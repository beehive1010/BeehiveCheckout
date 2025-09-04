-- Advanced Matrix System Triggers for Supabase
-- These triggers ensure data consistency and automate matrix operations

-- 1. Trigger to prevent invalid matrix placements
CREATE OR REPLACE FUNCTION validate_matrix_placement()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent duplicate positions in same matrix layer
    IF EXISTS (
        SELECT 1 FROM referrals 
        WHERE root_wallet = NEW.root_wallet 
        AND layer = NEW.layer 
        AND position = NEW.position 
        AND member_wallet != NEW.member_wallet
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Position % in layer % is already occupied in matrix %', 
            NEW.position, NEW.layer, NEW.root_wallet;
    END IF;
    
    -- Ensure layer sequence is valid (can't skip layers)
    IF NEW.layer > 1 AND NOT EXISTS (
        SELECT 1 FROM referrals 
        WHERE root_wallet = NEW.root_wallet 
        AND layer = NEW.layer - 1 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Cannot place in layer % without members in layer %', 
            NEW.layer, NEW.layer - 1;
    END IF;
    
    -- Validate position values
    IF NEW.position NOT IN ('L', 'M', 'R') THEN
        RAISE EXCEPTION 'Invalid position %. Must be L, M, or R', NEW.position;
    END IF;
    
    -- Validate layer bounds
    IF NEW.layer < 1 OR NEW.layer > 19 THEN
        RAISE EXCEPTION 'Invalid layer %. Must be between 1 and 19', NEW.layer;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_matrix_placement ON referrals;
CREATE TRIGGER trigger_validate_matrix_placement
    BEFORE INSERT OR UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION validate_matrix_placement();

-- 2. Trigger to update member max_layer when new placements occur
CREATE OR REPLACE FUNCTION update_member_max_layer()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the root member's max_layer
    UPDATE members 
    SET 
        max_layer = (
            SELECT COALESCE(MAX(layer), 0)
            FROM referrals 
            WHERE root_wallet = NEW.root_wallet 
            AND is_active = true
        ),
        updated_at = NOW()
    WHERE wallet_address = NEW.root_wallet;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_member_max_layer ON referrals;
CREATE TRIGGER trigger_update_member_max_layer
    AFTER INSERT OR UPDATE OF is_active ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_member_max_layer();

-- 3. Function to automatically place user using spillover logic
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
) AS $$
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
$$ LANGUAGE plpgsql;

-- 4. Function to get complete upline chain for rewards calculation
CREATE OR REPLACE FUNCTION get_upline_chain(
    member_wallet_param VARCHAR(42),
    root_wallet_param VARCHAR(42)
) RETURNS TABLE(
    upline_wallet VARCHAR(42),
    upline_layer INTEGER,
    upline_position TEXT,
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
        upline_position := COALESCE(current_record.position, 'ROOT');
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
                upline_position := 'ROOT';
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

-- 5. Function to get layer members with details
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
        r.position,
        r.parent_wallet,
        r.placement_type,
        u.current_level,
        u.member_activated as is_activated,
        r.placed_at
    FROM referrals r
    LEFT JOIN users u ON r.member_wallet = u.wallet_address
    WHERE r.root_wallet = root_wallet_param
    AND r.layer = layer_param
    AND r.is_active = true
    ORDER BY 
        CASE r.position 
            WHEN 'L' THEN 1 
            WHEN 'M' THEN 2 
            WHEN 'R' THEN 3 
        END,
        r.placed_at;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to log matrix activities for debugging
CREATE TABLE IF NOT EXISTS matrix_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    root_wallet VARCHAR(42) NOT NULL,
    member_wallet VARCHAR(42) NOT NULL,
    action_type TEXT NOT NULL, -- 'placement', 'removal', 'activation'
    layer INTEGER,
    position_slot TEXT,
    placement_type TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_matrix_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO matrix_activity_log (
            root_wallet,
            member_wallet,
            action_type,
            layer,
            position,
            placement_type,
            details
        ) VALUES (
            NEW.root_wallet,
            NEW.member_wallet,
            'placement',
            NEW.layer,
            NEW.position,
            NEW.placement_type,
            jsonb_build_object(
                'parent_wallet', NEW.parent_wallet,
                'placer_wallet', NEW.placer_wallet,
                'is_active', NEW.is_active
            )
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO matrix_activity_log (
            root_wallet,
            member_wallet,
            action_type,
            layer,
            position,
            placement_type,
            details
        ) VALUES (
            NEW.root_wallet,
            NEW.member_wallet,
            CASE 
                WHEN OLD.is_active != NEW.is_active THEN 
                    CASE WHEN NEW.is_active THEN 'activation' ELSE 'deactivation' END
                ELSE 'update'
            END,
            NEW.layer,
            NEW.position,
            NEW.placement_type,
            jsonb_build_object(
                'old_active', OLD.is_active,
                'new_active', NEW.is_active,
                'parent_wallet', NEW.parent_wallet
            )
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO matrix_activity_log (
            root_wallet,
            member_wallet,
            action_type,
            layer,
            position,
            placement_type,
            details
        ) VALUES (
            OLD.root_wallet,
            OLD.member_wallet,
            'removal',
            OLD.layer,
            OLD.position,
            OLD.placement_type,
            jsonb_build_object('removed_at', NOW())
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_matrix_activity ON referrals;
CREATE TRIGGER trigger_log_matrix_activity
    AFTER INSERT OR UPDATE OR DELETE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION log_matrix_activity();

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_place_user TO authenticated;
GRANT EXECUTE ON FUNCTION get_upline_chain TO authenticated;
GRANT EXECUTE ON FUNCTION get_layer_members_detailed TO authenticated;
GRANT SELECT ON matrix_activity_log TO authenticated;

-- Create helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_matrix_activity_log_root ON matrix_activity_log(root_wallet);
CREATE INDEX IF NOT EXISTS idx_matrix_activity_log_member ON matrix_activity_log(member_wallet);
CREATE INDEX IF NOT EXISTS idx_matrix_activity_log_created ON matrix_activity_log(created_at DESC);

-- Add row level security policies (if using RLS)
ALTER TABLE matrix_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs related to their matrices
CREATE POLICY "Users can view their matrix activity logs" ON matrix_activity_log
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE raw_user_meta_data->>'wallet_address' IN (root_wallet, member_wallet)
        )
    );

COMMENT ON TABLE matrix_activity_log IS 'Logs all matrix placement activities for debugging and auditing';
COMMENT ON FUNCTION auto_place_user IS 'Automatically places a user in the referrer matrix using proper spillover logic';
COMMENT ON FUNCTION get_upline_chain IS 'Returns the complete upline chain for reward calculations';
COMMENT ON FUNCTION get_layer_members_detailed IS 'Returns detailed member information for a specific matrix layer';