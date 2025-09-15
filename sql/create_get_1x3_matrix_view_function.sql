-- Create get_1x3_matrix_view function to return matrix data with proper 3x3 distribution
-- This function replaces the missing function that frontend calls

CREATE OR REPLACE FUNCTION get_1x3_matrix_view(
    p_wallet_address VARCHAR(42),
    p_levels INTEGER DEFAULT 3
)
RETURNS TABLE(
    wallet_address VARCHAR(42),
    username VARCHAR(50),
    current_level INTEGER,
    total_downline BIGINT,
    matrix_layer INTEGER,
    matrix_position CHAR(1),
    activation_sequence INTEGER,
    is_activated BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH matrix_roots AS (
        -- Find all matrices where the user is the root
        SELECT DISTINCT 
            r.matrix_root,
            u.username as root_username,
            m.current_level as root_level
        FROM recursive_matrix_complete r
        JOIN users u ON u.wallet_address = r.matrix_root
        LEFT JOIN members m ON m.wallet_address = r.matrix_root
        WHERE r.matrix_root = p_wallet_address
    ),
    matrix_members AS (
        -- Get all members in user's matrices with proper 3x3 matrix structure
        SELECT 
            rmc.member_wallet,
            rmc.member_name,
            rmc.matrix_layer as layer,
            -- Use existing position from recursive_matrix_complete which already has correct L-M-R pattern
            rmc.matrix_position as position,
            rmc.activation_sequence as seq,
            true as member_activated,
            COALESCE(mem.current_level, 1) as member_level,
            -- Add row number within each layer and position for 3x3 limitation
            ROW_NUMBER() OVER (
                PARTITION BY rmc.matrix_layer, rmc.matrix_position 
                ORDER BY rmc.activation_sequence
            ) as position_rank
        FROM recursive_matrix_complete rmc
        LEFT JOIN members mem ON mem.wallet_address = rmc.member_wallet
        WHERE rmc.matrix_root = p_wallet_address
        AND rmc.matrix_layer <= p_levels
    ),
    filtered_matrix AS (
        -- Limit to proper 3x3 matrix structure: max 3 members per position per layer
        SELECT 
            member_wallet,
            member_name,
            layer as matrix_layer,
            position,
            seq as activation_sequence,
            member_activated,
            member_level
        FROM matrix_members
        WHERE (matrix_members.layer = 1 AND position_rank <= 1) -- Layer 1: only 1 per position (total 3)
           OR (matrix_members.layer = 2 AND position_rank <= 3) -- Layer 2: up to 3 per position (total 9)
           OR (matrix_members.layer >= 3 AND position_rank <= 9) -- Layer 3+: up to 9 per position
    ),
    downline_counts AS (
        -- Count total downline for each member
        SELECT 
            fm.member_wallet,
            COUNT(*) as downline_count
        FROM filtered_matrix fm
        GROUP BY fm.member_wallet
    )
    SELECT 
        fm.member_wallet::VARCHAR(42),
        fm.member_name::VARCHAR(50),
        fm.member_level::INTEGER,
        COALESCE(dc.downline_count, 0)::BIGINT,
        fm.matrix_layer::INTEGER,
        fm.position::CHAR(1),
        fm.activation_sequence::INTEGER,
        fm.member_activated::BOOLEAN
    FROM filtered_matrix fm
    LEFT JOIN downline_counts dc ON dc.member_wallet = fm.member_wallet
    ORDER BY fm.matrix_layer, fm.activation_sequence;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_1x3_matrix_view(VARCHAR(42), INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_1x3_matrix_view(VARCHAR(42), INTEGER) TO anon;