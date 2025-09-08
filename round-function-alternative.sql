-- Alternative approach: Avoid ROUND function completely
-- Use TRUNC or cast to avoid PostgreSQL ROUND function issues

BEGIN;

-- ===== Alternative 1: Use TRUNC instead of ROUND =====
CREATE OR REPLACE FUNCTION safe_round(val NUMERIC, places INTEGER)
RETURNS NUMERIC AS $$
BEGIN
    RETURN TRUNC(val * POWER(10, places)) / POWER(10, places);
END;
$$ LANGUAGE plpgsql;

-- ===== Fix matrix_statistics view without ROUND =====
DROP VIEW IF EXISTS matrix_statistics CASCADE;

CREATE OR REPLACE VIEW matrix_statistics AS
WITH root_stats AS (
    SELECT 
        r.placement_root,
        u.username as root_username,
        COUNT(*) as total_members,
        COUNT(CASE WHEN r.placement_position = 'L' THEN 1 END) as l_positions,
        COUNT(CASE WHEN r.placement_position = 'M' THEN 1 END) as m_positions,
        COUNT(CASE WHEN r.placement_position = 'R' THEN 1 END) as r_positions,
        MIN(r.placement_layer) as min_layer,
        MAX(r.placement_layer) as max_layer,
        COUNT(DISTINCT r.placement_layer) as active_layers
    FROM referrals r
    LEFT JOIN users u ON r.placement_root = u.wallet_address
    GROUP BY r.placement_root, u.username
)
SELECT 
    placement_root,
    root_username,
    total_members,
    l_positions,
    m_positions, 
    r_positions,
    min_layer,
    max_layer,
    active_layers,
    
    -- Use safe_round function
    CASE 
        WHEN max_layer = 1 THEN safe_round((total_members * 100.0 / 3.0)::NUMERIC, 2)
        WHEN max_layer = 2 THEN safe_round((total_members * 100.0 / 12.0)::NUMERIC, 2)
        WHEN max_layer = 3 THEN safe_round((total_members * 100.0 / 39.0)::NUMERIC, 2)
        ELSE safe_round((total_members * 100.0 / ((POWER(3, max_layer) - 1) * 1.5))::NUMERIC, 2)
    END as fill_percentage
    
FROM root_stats
ORDER BY total_members DESC;

-- ===== Fix layer_statistics view =====
DROP VIEW IF EXISTS layer_statistics CASCADE;

CREATE OR REPLACE VIEW layer_statistics AS
SELECT 
    r.placement_root,
    u.username as root_username,
    r.placement_layer,
    COUNT(*) as members_in_layer,
    COUNT(CASE WHEN r.placement_position = 'L' THEN 1 END) as l_count,
    COUNT(CASE WHEN r.placement_position = 'M' THEN 1 END) as m_count,
    COUNT(CASE WHEN r.placement_position = 'R' THEN 1 END) as r_count,
    
    -- Theoretical capacity
    POWER(3, r.placement_layer)::INTEGER as theoretical_capacity,
    
    -- Use safe_round function
    safe_round((COUNT(*) * 100.0 / POWER(3, r.placement_layer))::NUMERIC, 2) as layer_fill_percentage
    
FROM referrals r
LEFT JOIN users u ON r.placement_root = u.wallet_address
GROUP BY r.placement_root, u.username, r.placement_layer
ORDER BY r.placement_root, r.placement_layer;

-- ===== Fix system overview function =====
CREATE OR REPLACE FUNCTION get_matrix_system_overview()
RETURNS TABLE(
    metric_category TEXT,
    metric_name TEXT,
    value BIGINT,
    percentage NUMERIC,
    details TEXT
) AS $$
DECLARE
    total_activated BIGINT;
    total_in_matrix BIGINT;
BEGIN
    -- Get totals
    SELECT COUNT(*) INTO total_activated FROM membership WHERE activated_at IS NOT NULL AND nft_level = 1;
    SELECT COUNT(*) INTO total_in_matrix FROM referrals;
    
    -- Total activated members
    RETURN QUERY
    SELECT 
        'Members'::TEXT,
        'Total Activated Members'::TEXT,
        total_activated,
        100.0::NUMERIC,
        'Members with activated Level 1 NFT'::TEXT;
    
    -- Matrix placement stats
    RETURN QUERY
    SELECT 
        'Matrix'::TEXT,
        'Members in Matrix'::TEXT,
        total_in_matrix,
        CASE 
            WHEN total_activated > 0 THEN safe_round((total_in_matrix * 100.0 / total_activated)::NUMERIC, 2)
            ELSE 0.0::NUMERIC
        END,
        'Members placed in referral matrix'::TEXT;
    
    -- Members needing placement
    RETURN QUERY
    SELECT 
        'Sync'::TEXT,
        'Members Needing Placement'::TEXT,
        (total_activated - total_in_matrix),
        CASE 
            WHEN total_activated > 0 THEN safe_round(((total_activated - total_in_matrix) * 100.0 / total_activated)::NUMERIC, 2)
            ELSE 0.0::NUMERIC
        END,
        'Activated members not yet in matrix'::TEXT;
    
    -- Matrix root nodes
    RETURN QUERY
    SELECT 
        'Matrix'::TEXT,
        'Matrix Root Nodes'::TEXT,
        COUNT(DISTINCT placement_root),
        0.0::NUMERIC,
        'Number of separate matrix trees'::TEXT
    FROM referrals;
    
    -- Average matrix depth
    RETURN QUERY
    SELECT 
        'Matrix'::TEXT,
        'Average Matrix Depth'::TEXT,
        COALESCE(safe_round(AVG(max_layer)::NUMERIC, 0), 0)::BIGINT,
        0.0::NUMERIC,
        'Average maximum layer depth across all matrices'::TEXT
    FROM (
        SELECT placement_root, MAX(placement_layer) as max_layer
        FROM referrals
        GROUP BY placement_root
    ) matrix_depths;
END;
$$ LANGUAGE plpgsql;

-- ===== Fix health check function =====
CREATE OR REPLACE FUNCTION check_matrix_health()
RETURNS TABLE(
    health_metric TEXT,
    status TEXT,
    value NUMERIC,
    recommendation TEXT
) AS $$
DECLARE
    total_activated BIGINT;
    total_in_matrix BIGINT;
    avg_depth NUMERIC;
    roots_count BIGINT;
    placement_rate NUMERIC;
BEGIN
    -- Get statistics
    SELECT COUNT(*) INTO total_activated FROM membership WHERE activated_at IS NOT NULL AND nft_level = 1;
    SELECT COUNT(*) INTO total_in_matrix FROM referrals;
    SELECT COUNT(DISTINCT placement_root) INTO roots_count FROM referrals;
    
    -- Calculate placement rate
    IF total_activated > 0 THEN
        placement_rate := safe_round((total_in_matrix * 100.0 / total_activated)::NUMERIC, 2);
    ELSE
        placement_rate := 0;
    END IF;
    
    -- Calculate average depth
    SELECT COALESCE(safe_round(AVG(max_layer)::NUMERIC, 1), 0) INTO avg_depth
    FROM (SELECT placement_root, MAX(placement_layer) as max_layer FROM referrals GROUP BY placement_root) t;
    
    -- Placement rate health
    RETURN QUERY SELECT 
        'Placement Rate'::TEXT,
        CASE 
            WHEN total_activated = 0 THEN 'No Data'
            WHEN placement_rate > 95 THEN 'Excellent'
            WHEN placement_rate > 80 THEN 'Good'
            WHEN placement_rate > 50 THEN 'Fair'
            ELSE 'Poor'
        END,
        placement_rate,
        CASE 
            WHEN total_activated = 0 THEN 'Need members to activate'
            WHEN placement_rate < 80 THEN 'Run matrix sync to improve placement'
            ELSE 'Matrix placement is healthy'
        END;
    
    -- Matrix depth health
    RETURN QUERY SELECT 
        'Matrix Depth'::TEXT,
        CASE 
            WHEN avg_depth = 0 THEN 'No Matrix'
            WHEN avg_depth <= 3 THEN 'Shallow'
            WHEN avg_depth <= 6 THEN 'Moderate'
            WHEN avg_depth <= 12 THEN 'Deep'
            ELSE 'Very Deep'
        END,
        avg_depth,
        CASE 
            WHEN avg_depth = 0 THEN 'No matrix structure exists'
            WHEN avg_depth > 10 THEN 'Consider matrix rebalancing'
            ELSE 'Matrix depth is normal'
        END;
    
    -- Matrix distribution health
    RETURN QUERY SELECT 
        'Matrix Distribution'::TEXT,
        CASE 
            WHEN roots_count = 0 THEN 'No Matrix'
            WHEN total_in_matrix > 0 AND (total_in_matrix::NUMERIC / GREATEST(roots_count, 1)) > 50 THEN 'Concentrated'
            WHEN total_in_matrix > 0 AND (total_in_matrix::NUMERIC / GREATEST(roots_count, 1)) > 10 THEN 'Balanced'
            ELSE 'Scattered'
        END,
        CASE WHEN roots_count > 0 THEN safe_round((total_in_matrix::NUMERIC / roots_count), 2) ELSE 0 END,
        CASE 
            WHEN roots_count = 0 THEN 'No matrix roots found'
            WHEN total_in_matrix > 0 AND (total_in_matrix::NUMERIC / GREATEST(roots_count, 1)) < 5 THEN 'Too many small matrices - consider consolidation'
            WHEN total_in_matrix > 0 AND (total_in_matrix::NUMERIC / GREATEST(roots_count, 1)) > 100 THEN 'Very large matrices - monitor for balance'
            ELSE 'Matrix distribution looks healthy'
        END;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
SELECT 'Testing functions without ROUND...' as test_status;

SELECT 'safe_round function:' as test;
SELECT safe_round(123.456789::NUMERIC, 2) as test_result;

SELECT 'get_matrix_system_overview:' as test;
SELECT * FROM get_matrix_system_overview();

SELECT 'check_matrix_health:' as test;
SELECT * FROM check_matrix_health();

SELECT 'matrix_statistics view:' as test;
SELECT COUNT(*) as view_count FROM matrix_statistics;

COMMIT;

SELECT '✅ All ROUND function issues resolved!' as final_status;