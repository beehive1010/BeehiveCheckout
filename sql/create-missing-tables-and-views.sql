-- ================================================================================================
-- BEEHIVE PLATFORM - CREATE MISSING TABLES AND VIEWS
-- ================================================================================================
-- This script creates missing tables and views that the application expects
-- Based on the error messages: member_matrix_view, user_activities
-- ================================================================================================

SET search_path TO public;
SET client_min_messages TO NOTICE;

-- ================================================================================================
-- SECTION 1: CREATE MISSING TABLES
-- ================================================================================================

-- Create user_activities table
CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    amount DECIMAL(20,8) DEFAULT 0,
    level INTEGER,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_activities
CREATE INDEX IF NOT EXISTS idx_user_activities_wallet ON user_activities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_status ON user_activities(status);

-- ================================================================================================
-- SECTION 2: CREATE MEMBER_MATRIX_VIEW
-- ================================================================================================

-- Create member_matrix_view based on referrals table structure
CREATE OR REPLACE VIEW member_matrix_view AS
SELECT 
    r.id,
    r.referrer_wallet,
    r.referred_wallet,
    r.layer,
    r.position,
    r.created_at,
    r.updated_at,
    -- Member information from members table
    m.current_level,
    m.is_activated,
    m.activated_at,
    -- Matrix position calculations
    CASE 
        WHEN r.position = 'L' THEN 'Left'
        WHEN r.position = 'M' THEN 'Middle' 
        WHEN r.position = 'R' THEN 'Right'
        ELSE 'Unknown'
    END as position_name,
    -- Layer-based matrix information
    r.layer as matrix_layer,
    r.position as matrix_position,
    -- Status information
    CASE 
        WHEN m.is_activated = TRUE THEN 'active'
        ELSE 'inactive'
    END as status
FROM referrals r
LEFT JOIN members m ON r.referred_wallet = m.wallet_address
WHERE r.layer IS NOT NULL AND r.position IS NOT NULL;

-- ================================================================================================
-- SECTION 3: INSERT SAMPLE DATA FOR TESTING
-- ================================================================================================

-- Insert sample user activities for testing
INSERT INTO user_activities (
    wallet_address,
    activity_type,
    description,
    amount,
    level,
    activity_data
) VALUES 
-- Sample activities for the test wallet
('0x1234567890123456789012345678901234567890', 'nft_claim', 'Claimed Level 1 NFT', 0, 1, '{"nft_level": 1, "transaction_hash": "demo_tx_001"}'::jsonb),
('0x1234567890123456789012345678901234567890', 'bcc_unlock', 'Unlocked 100 BCC tokens', 100, 1, '{"bcc_amount": 100, "tier": 1}'::jsonb),
('0x1234567890123456789012345678901234567890', 'level_upgrade', 'Upgraded to Level 1', 0, 1, '{"previous_level": 0, "new_level": 1}'::jsonb)
ON CONFLICT DO NOTHING;

-- ================================================================================================
-- SECTION 4: CREATE ADDITIONAL MISSING TABLES (COMMONLY NEEDED)
-- ================================================================================================

-- Create platform_revenue table if missing
CREATE TABLE IF NOT EXISTS platform_revenue (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    source_wallet VARCHAR(42),
    level INTEGER,
    amount DECIMAL(20,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDT',
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table if missing
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table if missing
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    notification_type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_platform_revenue_source ON platform_revenue(source_wallet);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_type ON platform_revenue(source_type);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_notifications_wallet ON notifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- ================================================================================================
-- SECTION 5: INSERT DEFAULT SYSTEM SETTINGS
-- ================================================================================================

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('platform_fee_percentage', '10', 'Platform fee percentage for transactions'),
('max_referral_depth', '19', 'Maximum referral depth for rewards'),
('bcc_unlock_enabled', 'true', 'Whether BCC token unlocking is enabled'),
('direct_referrer_requirement_enabled', 'true', 'Whether direct referrer requirements are enforced'),
('upgrade_countdown_hours', '72', 'Hours to wait for upgrade countdown')
ON CONFLICT (setting_key) DO NOTHING;

-- ================================================================================================
-- SECTION 6: CREATE HELPER FUNCTIONS FOR THE NEW VIEWS/TABLES
-- ================================================================================================

-- Function to get user activities
CREATE OR REPLACE FUNCTION get_user_activities(user_wallet VARCHAR(42), activity_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    id INTEGER,
    activity_type VARCHAR(50),
    description TEXT,
    amount DECIMAL(20,8),
    level INTEGER,
    activity_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.id,
        ua.activity_type,
        ua.description,
        ua.amount,
        ua.level,
        ua.activity_data,
        ua.created_at
    FROM user_activities ua
    WHERE ua.wallet_address = user_wallet
    ORDER BY ua.created_at DESC
    LIMIT activity_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get member matrix for a wallet
CREATE OR REPLACE FUNCTION get_member_matrix(user_wallet VARCHAR(42))
RETURNS TABLE(
    referrer_wallet VARCHAR(42),
    referred_wallet VARCHAR(42),
    matrix_layer INTEGER,
    matrix_position VARCHAR(10),
    position_name TEXT,
    is_activated BOOLEAN,
    current_level INTEGER,
    activated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mmv.referrer_wallet,
        mmv.referred_wallet,
        mmv.matrix_layer,
        mmv.matrix_position,
        mmv.position_name,
        mmv.is_activated,
        mmv.current_level,
        mmv.activated_at
    FROM member_matrix_view mmv
    WHERE mmv.referrer_wallet = user_wallet
    ORDER BY mmv.matrix_layer, mmv.matrix_position;
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================================================================
-- SECTION 7: VERIFICATION AND TESTING
-- ================================================================================================

DO $$
DECLARE
    user_activities_count INTEGER;
    matrix_view_count INTEGER;
    settings_count INTEGER;
BEGIN
    -- Check user_activities table
    SELECT COUNT(*) INTO user_activities_count FROM user_activities;
    
    -- Check member_matrix_view
    SELECT COUNT(*) INTO matrix_view_count FROM member_matrix_view;
    
    -- Check system_settings
    SELECT COUNT(*) INTO settings_count FROM system_settings;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICATION RESULTS:';
    RAISE NOTICE '';
    RAISE NOTICE '✅ user_activities table created with % records', user_activities_count;
    RAISE NOTICE '✅ member_matrix_view created with % records', matrix_view_count;
    RAISE NOTICE '✅ system_settings table created with % settings', settings_count;
    RAISE NOTICE '✅ platform_revenue table created';
    RAISE NOTICE '✅ notifications table created';
    
    -- Test the view and functions
    DECLARE
        test_activities INTEGER;
        test_matrix INTEGER;
    BEGIN
        SELECT COUNT(*) INTO test_activities 
        FROM get_user_activities('0x1234567890123456789012345678901234567890', 5);
        
        SELECT COUNT(*) INTO test_matrix 
        FROM get_member_matrix('0x1234567890123456789012345678901234567890');
        
        RAISE NOTICE '';
        RAISE NOTICE '🧪 FUNCTION TESTS:';
        RAISE NOTICE '✅ get_user_activities() returned % records', test_activities;
        RAISE NOTICE '✅ get_member_matrix() returned % records', test_matrix;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ALL MISSING TABLES AND VIEWS CREATED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'The following errors should now be resolved:';
    RAISE NOTICE '• "member_matrix_view" does not exist ✅';
    RAISE NOTICE '• "user_activities" does not exist ✅';
    RAISE NOTICE '';
    RAISE NOTICE 'Additional tables created for future use:';
    RAISE NOTICE '• platform_revenue (for tracking platform earnings)';
    RAISE NOTICE '• system_settings (for configuration management)';
    RAISE NOTICE '• notifications (for user notifications)';
END $$;