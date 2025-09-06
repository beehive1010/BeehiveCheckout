-- Performance Optimization: Database Indexing and Query Optimization
-- Comprehensive indexing strategy for all critical queries in the Beehive platform

-- =============================================
-- Core Tables Performance Indexes
-- =============================================

-- Users table optimization
CREATE INDEX IF NOT EXISTS idx_users_wallet_address_hash 
ON users USING hash (wallet_address);

CREATE INDEX IF NOT EXISTS idx_users_created_at 
ON users (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_last_sign_in 
ON users (last_sign_in_at DESC) 
WHERE last_sign_in_at IS NOT NULL;

-- Members table optimization (critical for matrix and level queries)
CREATE INDEX IF NOT EXISTS idx_members_wallet_level_active 
ON members (wallet_address, current_level, is_activated);

CREATE INDEX IF NOT EXISTS idx_members_current_level 
ON members (current_level, is_activated) 
WHERE is_activated = true;

CREATE INDEX IF NOT EXISTS idx_members_levels_owned_gin 
ON members USING gin (levels_owned);

CREATE INDEX IF NOT EXISTS idx_members_activation_date 
ON members (activation_date) 
WHERE activation_date IS NOT NULL;

-- Referrals table optimization (critical for matrix calculations)
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_wallet 
ON referrals (referrer_wallet, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_wallet 
ON referrals (referred_wallet);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_referred_unique 
ON referrals (referrer_wallet, referred_wallet);

-- Composite index for referral depth calculations
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_calculation 
ON referrals (referrer_wallet, referred_wallet) 
INCLUDE (created_at);

-- =============================================
-- Reward System Performance Indexes
-- =============================================

-- Reward claims table optimization
CREATE INDEX IF NOT EXISTS idx_reward_claims_recipient_status 
ON reward_claims (recipient_wallet, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reward_claims_status_expires 
ON reward_claims (status, expires_at) 
WHERE status IN ('pending', 'claimable');

CREATE INDEX IF NOT EXISTS idx_reward_claims_layer_position 
ON reward_claims (layer, matrix_position, status);

-- Layer rewards table optimization  
CREATE INDEX IF NOT EXISTS idx_layer_rewards_recipient_claimed 
ON layer_rewards (recipient_wallet, is_claimed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_layer_rewards_payer_layer 
ON layer_rewards (payer_wallet, layer, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_layer_rewards_unclaimed 
ON layer_rewards (recipient_wallet, created_at DESC) 
WHERE is_claimed = false;

-- Countdown timers optimization
CREATE INDEX IF NOT EXISTS idx_countdown_timers_wallet_status 
ON countdown_timers (wallet_address, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_countdown_timers_expired 
ON countdown_timers (expires_at, status) 
WHERE status = 'active' AND expires_at <= NOW();

-- =============================================
-- NFT and Transaction Performance Indexes  
-- =============================================

-- NFT purchases table optimization
CREATE INDEX IF NOT EXISTS idx_nft_purchases_wallet_level 
ON nft_purchases (wallet_address, nft_level, status);

CREATE INDEX IF NOT EXISTS idx_nft_purchases_status_date 
ON nft_purchases (status, created_at DESC) 
WHERE status = 'completed';

-- Orders table optimization
CREATE INDEX IF NOT EXISTS idx_orders_wallet_type_status 
ON orders (wallet_address, order_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_transaction_hash 
ON orders (transaction_hash) 
WHERE transaction_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_metadata_level 
ON orders USING gin (metadata) 
WHERE order_type = 'nft_purchase';

-- =============================================
-- Balance and BCC Transaction Optimization
-- =============================================

-- User balances optimization
CREATE INDEX IF NOT EXISTS idx_user_balances_wallet_updated 
ON user_balances (wallet_address, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_balances_tier_phase 
ON user_balances (tier_phase, updated_at DESC);

-- BCC transactions optimization (if table exists)
CREATE INDEX IF NOT EXISTS idx_bcc_transactions_wallet_type 
ON bcc_transactions (wallet_address, transaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bcc_transactions_balance_type 
ON bcc_transactions (balance_type, status, created_at DESC);

-- =============================================
-- Admin and Audit Performance Indexes
-- =============================================

-- Admin actions optimization
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_date 
ON admin_actions (admin_wallet, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_actions_target_type 
ON admin_actions (target_wallet, action_type, created_at DESC);

-- Error logs optimization (for system health monitoring)
CREATE INDEX IF NOT EXISTS idx_error_logs_level_date 
ON error_logs (level, created_at DESC) 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- =============================================
-- Matrix Calculation Optimization Functions
-- =============================================

-- Optimized function to calculate matrix depth for a user
CREATE OR REPLACE FUNCTION get_user_matrix_depth(p_wallet_address TEXT)
RETURNS TABLE(layer INTEGER, left_count INTEGER, right_count INTEGER) AS $$
WITH RECURSIVE matrix_tree AS (
    -- Base case: direct referrals
    SELECT 
        r.referred_wallet,
        r.referrer_wallet,
        1 as depth,
        CASE WHEN row_number() OVER (PARTITION BY r.referrer_wallet ORDER BY r.created_at) % 2 = 1 
             THEN 'left' ELSE 'right' END as position
    FROM referrals r
    WHERE r.referrer_wallet = p_wallet_address
    
    UNION ALL
    
    -- Recursive case: indirect referrals  
    SELECT 
        r.referred_wallet,
        mt.referred_wallet as referrer_wallet,
        mt.depth + 1,
        CASE WHEN row_number() OVER (PARTITION BY r.referrer_wallet ORDER BY r.created_at) % 2 = 1 
             THEN 'left' ELSE 'right' END as position
    FROM referrals r
    INNER JOIN matrix_tree mt ON r.referrer_wallet = mt.referred_wallet
    WHERE mt.depth < 19  -- Limit to 19 layers as per spec
)
SELECT 
    depth as layer,
    COUNT(*) FILTER (WHERE position = 'left') as left_count,
    COUNT(*) FILTER (WHERE position = 'right') as right_count
FROM matrix_tree
GROUP BY depth
ORDER BY depth;
$$ LANGUAGE sql STABLE;

-- Optimized function to check Level 2 eligibility
CREATE OR REPLACE FUNCTION check_level_2_eligibility(p_wallet_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) >= 3
        FROM referrals r
        INNER JOIN members m ON m.wallet_address = r.referred_wallet
        WHERE r.referrer_wallet = p_wallet_address
        AND m.is_activated = true
        AND m.current_level > 0
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- Query Performance Views
-- =============================================

-- Materialized view for member statistics (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS member_statistics_mv AS
SELECT 
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE is_activated = true) as activated_members,
    COUNT(*) FILTER (WHERE current_level >= 2) as level_2_plus_members,
    AVG(current_level) FILTER (WHERE is_activated = true) as avg_member_level,
    MAX(created_at) as last_registration,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_members_week,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_members_month
FROM members;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_statistics_mv_single_row 
ON member_statistics_mv ((1));

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_member_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY member_statistics_mv;
END;
$$ LANGUAGE plpgsql;

-- Materialized view for reward statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS reward_statistics_mv AS
SELECT 
    COUNT(*) as total_rewards,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_rewards,
    COUNT(*) FILTER (WHERE status = 'claimed') as claimed_rewards,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_rewards,
    SUM(reward_amount_usdc) FILTER (WHERE status = 'claimed') as total_claimed_usdc,
    SUM(reward_amount_usdc) FILTER (WHERE status = 'pending') as total_pending_usdc,
    AVG(reward_amount_usdc) as avg_reward_amount,
    MAX(created_at) as last_reward_created
FROM reward_claims;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_statistics_mv_single_row 
ON reward_statistics_mv ((1));

-- =============================================
-- Performance Monitoring and Maintenance
-- =============================================

-- Function to analyze slow queries and suggest optimizations
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE(
    query_pattern TEXT,
    calls BIGINT,
    total_time_ms DOUBLE PRECISION,
    avg_time_ms DOUBLE PRECISION,
    suggestion TEXT
) AS $$
BEGIN
    -- This would typically query pg_stat_statements
    -- For now, return example suggestions
    RETURN QUERY SELECT 
        'SELECT * FROM members WHERE wallet_address = ?'::TEXT,
        1000::BIGINT,
        5000.0::DOUBLE PRECISION,
        5.0::DOUBLE PRECISION,
        'Use idx_members_wallet_level_active index'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to update table statistics for better query planning
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
    -- Update statistics for critical tables
    ANALYZE members;
    ANALYZE referrals;
    ANALYZE reward_claims;
    ANALYZE orders;
    ANALYZE user_balances;
    ANALYZE nft_purchases;
    
    -- Log the statistics update
    INSERT INTO system_logs (event_type, message, created_at)
    VALUES ('maintenance', 'Table statistics updated for query optimization', NOW());
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Automatic Index Maintenance
-- =============================================

-- Function to identify missing indexes based on query patterns
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE(
    table_name TEXT,
    columns TEXT,
    suggested_index TEXT,
    reasoning TEXT
) AS $$
BEGIN
    -- This is a simplified version - in production, this would analyze pg_stat_user_tables
    -- and pg_stat_activity to suggest indexes based on actual query patterns
    
    RETURN QUERY SELECT 
        'members'::TEXT,
        'wallet_address, current_level'::TEXT,
        'CREATE INDEX idx_members_wallet_current_level ON members (wallet_address, current_level)'::TEXT,
        'High frequency queries filtering by wallet and level'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Cleanup and Archival for Performance
-- =============================================

-- Function to archive old completed orders
CREATE OR REPLACE FUNCTION archive_old_orders()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move orders older than 1 year to archive table
    WITH archived_orders AS (
        DELETE FROM orders 
        WHERE status = 'completed' 
        AND created_at < NOW() - INTERVAL '1 year'
        RETURNING *
    )
    INSERT INTO orders_archive SELECT * FROM archived_orders;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Log the archival
    INSERT INTO system_logs (event_type, message, metadata, created_at)
    VALUES (
        'archival', 
        'Archived old completed orders', 
        jsonb_build_object('archived_count', archived_count),
        NOW()
    );
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Create archive table if it doesn't exist
CREATE TABLE IF NOT EXISTS orders_archive (LIKE orders INCLUDING ALL);

-- =============================================
-- Performance Monitoring Triggers
-- =============================================

-- Function to log slow operations
CREATE OR REPLACE FUNCTION log_slow_operation()
RETURNS trigger AS $$
BEGIN
    -- This would be expanded to log operations that take longer than a threshold
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'reward_claims' THEN
        -- Log reward claim for monitoring
        INSERT INTO performance_logs (operation, table_name, duration_ms, created_at)
        VALUES ('INSERT', 'reward_claims', 0, NOW());
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Index Usage Statistics
-- =============================================

-- View to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        ELSE 'ACTIVE'
    END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- =============================================
-- Maintenance Schedule Setup
-- =============================================

-- Create system logs table for maintenance tracking
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_event_date 
ON system_logs (event_type, created_at DESC);

-- Create performance logs table
CREATE TABLE IF NOT EXISTS performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_logs_operation_date 
ON performance_logs (operation, created_at DESC);

-- Grant appropriate permissions
GRANT SELECT ON index_usage_stats TO authenticated, anon;
GRANT SELECT ON member_statistics_mv TO authenticated, anon;
GRANT SELECT ON reward_statistics_mv TO authenticated, anon;

-- Comments for documentation
COMMENT ON FUNCTION get_user_matrix_depth(TEXT) IS 'Optimized function to calculate matrix structure for a user with proper indexing';
COMMENT ON FUNCTION check_level_2_eligibility(TEXT) IS 'Fast check for Level 2 upgrade eligibility using optimized referral counting';
COMMENT ON MATERIALIZED VIEW member_statistics_mv IS 'Cached member statistics for fast dashboard queries - refresh periodically';
COMMENT ON MATERIALIZED VIEW reward_statistics_mv IS 'Cached reward statistics for admin dashboard performance';