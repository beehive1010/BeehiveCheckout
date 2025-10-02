-- Create optimized matrix view for better component performance
-- This view pre-calculates matrix relationships and layer statistics

-- Drop existing view if it exists
DROP VIEW IF EXISTS matrix_view CASCADE;

-- Create comprehensive matrix view
CREATE VIEW matrix_view AS
WITH matrix_members AS (
  -- Get all matrix members with their details
  SELECT 
    r.id as referral_id,
    r.member_wallet as wallet_address,
    r.referrer_wallet,
    r.matrix_root_wallet,
    r.matrix_layer,
    r.matrix_position,
    r.placed_at as joined_at,
    
    -- Member details
    m.current_level,
    m.activation_sequence,
    m.activation_time,
    (m.current_level > 0) as is_activated,
    
    -- User details  
    u.username,
    u.email
    
  FROM referrals r
  LEFT JOIN members m ON r.member_wallet = m.wallet_address
  LEFT JOIN users u ON r.member_wallet = u.wallet_address
  WHERE r.matrix_root_wallet IS NOT NULL
),

layer_stats AS (
  -- Calculate statistics for each layer of each matrix root
  SELECT 
    matrix_root_wallet,
    matrix_layer,
    COUNT(*) as total_members,
    COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) as left_members,
    COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) as middle_members,
    COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) as right_members,
    COUNT(CASE WHEN is_activated = true THEN 1 END) as active_members,
    POWER(3, matrix_layer) as max_capacity,
    (COUNT(*) * 100.0 / POWER(3, matrix_layer)) as fill_percentage,
    (COUNT(CASE WHEN is_activated = true THEN 1 END) * 100.0 / GREATEST(COUNT(*), 1)) as completion_percentage
  FROM matrix_members
  GROUP BY matrix_root_wallet, matrix_layer
),

root_summary AS (
  -- Calculate summary stats for each matrix root
  SELECT 
    matrix_root_wallet,
    COUNT(*) as total_team_size,
    COUNT(CASE WHEN is_activated = true THEN 1 END) as total_active_members,
    MAX(matrix_layer) as deepest_layer,
    COUNT(DISTINCT matrix_layer) as active_layers,
    MIN(joined_at) as first_referral_date,
    MAX(joined_at) as last_referral_date
  FROM matrix_members
  GROUP BY matrix_root_wallet
)

-- Final view combining all data
SELECT 
  mm.*,
  ls.total_members as layer_total,
  ls.left_members as layer_left,
  ls.middle_members as layer_middle, 
  ls.right_members as layer_right,
  ls.active_members as layer_active,
  ls.max_capacity as layer_capacity,
  ls.fill_percentage as layer_fill_rate,
  ls.completion_percentage as layer_completion_rate,
  rs.total_team_size,
  rs.total_active_members,
  rs.deepest_layer,
  rs.active_layers,
  rs.first_referral_date,
  rs.last_referral_date
FROM matrix_members mm
LEFT JOIN layer_stats ls ON mm.matrix_root_wallet = ls.matrix_root_wallet 
  AND mm.matrix_layer = ls.matrix_layer
LEFT JOIN root_summary rs ON mm.matrix_root_wallet = rs.matrix_root_wallet
ORDER BY mm.matrix_root_wallet, mm.matrix_layer, mm.matrix_position;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matrix_view_root_layer ON matrix_view USING btree (matrix_root_wallet, matrix_layer);
CREATE INDEX IF NOT EXISTS idx_matrix_view_wallet ON matrix_view USING btree (wallet_address);

-- Create helper view for layer statistics only
DROP VIEW IF EXISTS matrix_layer_stats_view CASCADE;

CREATE VIEW matrix_layer_stats_view AS
SELECT DISTINCT
  matrix_root_wallet,
  matrix_layer,
  layer_total as total_members,
  layer_left as left_members,
  layer_middle as middle_members,
  layer_right as right_members, 
  layer_active as active_members,
  layer_capacity as max_capacity,
  layer_fill_rate as fill_percentage,
  layer_completion_rate as completion_percentage
FROM matrix_view
WHERE layer_total IS NOT NULL
ORDER BY matrix_root_wallet, matrix_layer;

-- Grant permissions
GRANT SELECT ON matrix_view TO authenticated;
GRANT SELECT ON matrix_view TO anon;
GRANT SELECT ON matrix_layer_stats_view TO authenticated;
GRANT SELECT ON matrix_layer_stats_view TO anon;

-- Add helpful comments
COMMENT ON VIEW matrix_view IS 'Optimized view providing complete matrix hierarchy data with pre-calculated statistics';
COMMENT ON VIEW matrix_layer_stats_view IS 'Layer-specific statistics for matrix visualization components';