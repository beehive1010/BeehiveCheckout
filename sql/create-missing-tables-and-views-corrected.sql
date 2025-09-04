-- ================================================================================================
-- BEEHIVE PLATFORM - CREATE MISSING TABLES AND VIEWS (CORRECTED)
-- ================================================================================================
-- This script creates missing tables and views with correct column names
-- Fixed: member_matrix_view uses correct referrals table structure
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for user_activities
CREATE INDEX IF NOT EXISTS idx_user_activities_wallet ON user_activities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_status ON user_activities(status);

-- ================================================================================================
-- SECTION 2: CREATE MEMBER_MATRIX_VIEW (WITH CORRECT COLUMN NAMES)
-- ================================================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS member_matrix_view;

-- Create member_matrix_view using correct referrals table structure
CREATE VIEW member_matrix_view AS
SELECT 
    r.id,
    r.root_wallet,           -- Tree owner (推荐者)
    r.member_wallet,         -- Placed member (被安置会员) 
    r.layer,                 -- Layer in matrix (1-19)
    r.position,              -- Position ('L', 'M', 'R')
    r.parent_wallet,         -- Direct parent in tree
    r.placer_wallet,         -- Who placed this member
    r.placement_type::TEXT,  -- Cast enum to TEXT: 'direct' or 'spillover'
    r.is_active,             -- Whether position is active
    r.placed_at,             -- When member was placed
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
        WHEN m.is_activated = TRUE AND r.is_active = TRUE THEN 'active'
        WHEN r.is_active = FALSE THEN 'inactive'
        ELSE 'pending'
    END as status
FROM referrals r
LEFT JOIN members m ON r.member_wallet = m.wallet_address  -- CORRECTED: member_wallet
WHERE r.layer IS NOT NULL AND r.position IS NOT NULL;

-- ================================================================================================
-- SECTION 3: CREATE ADDITIONAL MISSING TABLES
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create system_settings table if missing
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
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
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_platform_revenue_source ON platform_revenue(source_wallet);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_type ON platform_revenue(source_type);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_notifications_wallet ON notifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- ================================================================================================
-- SECTION 4: INSERT SAMPLE DATA FOR TESTING
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

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('platform_fee_percentage', '10', 'Platform fee percentage for transactions'),
('max_referral_depth', '19', 'Maximum referral depth for rewards'),
('bcc_unlock_enabled', 'true', 'Whether BCC token unlocking is enabled'),
('direct_referrer_requirement_enabled', 'true', 'Whether direct referrer requirements are enforced'),
('upgrade_countdown_hours', '72', 'Hours to wait for upgrade countdown')
ON CONFLICT (setting_key) DO NOTHING;

-- ================================================================================================
-- SECTION 5: CREATE HELPER FUNCTIONS (CORRECTED)
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
    created_at TIMESTAMP
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

-- Function to get member matrix for a wallet (CORRECTED column names)
CREATE OR REPLACE FUNCTION get_member_matrix(user_wallet VARCHAR(42))
RETURNS TABLE(
    root_wallet VARCHAR(42),
    member_wallet VARCHAR(42),
    matrix_layer INTEGER,
    matrix_position TEXT,
    position_name TEXT,
    is_activated BOOLEAN,
    current_level INTEGER,
    activated_at TIMESTAMP,
    placement_type TEXT,
    placed_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mmv.root_wallet,
        mmv.member_wallet,
        mmv.matrix_layer,
        mmv.matrix_position,
        mmv.position_name,
        mmv.is_activated,
        mmv.current_level,
        mmv.activated_at,
        mmv.placement_type,
        mmv.placed_at
    FROM member_matrix_view mmv
    WHERE mmv.root_wallet = user_wallet  -- CORRECTED: root_wallet
    ORDER BY mmv.matrix_layer, mmv.matrix_position;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get member's position in someone's matrix
CREATE OR REPLACE FUNCTION get_member_position_in_matrix(member_wallet_param VARCHAR(42))
RETURNS TABLE(
    root_wallet VARCHAR(42),
    layer INTEGER,
    matrix_position TEXT,
    position_name TEXT,
    parent_wallet VARCHAR(42),
    placer_wallet VARCHAR(42),
    placement_type TEXT,
    placed_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mmv.root_wallet,
        mmv.layer,
        mmv.matrix_position,
        mmv.position_name,
        mmv.parent_wallet,
        mmv.placer_wallet,
        mmv.placement_type,
        mmv.placed_at
    FROM member_matrix_view mmv
    WHERE mmv.member_wallet = member_wallet_param  -- CORRECTED: member_wallet
    ORDER BY mmv.layer;
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================================================================
-- SECTION 6: VERIFICATION AND TESTING
-- ================================================================================================

DO $$
DECLARE
    user_activities_count INTEGER;
    matrix_view_count INTEGER;
    settings_count INTEGER;
    test_view_works BOOLEAN := FALSE;
BEGIN
    -- Check user_activities table
    SELECT COUNT(*) INTO user_activities_count FROM user_activities;
    
    -- Check system_settings
    SELECT COUNT(*) INTO settings_count FROM system_settings;
    
    -- Test if member_matrix_view works
    BEGIN
        SELECT COUNT(*) INTO matrix_view_count FROM member_matrix_view;
        test_view_works := TRUE;
    EXCEPTION WHEN OTHERS THEN
        matrix_view_count := -1;
        test_view_works := FALSE;
        RAISE WARNING 'member_matrix_view test failed: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICATION RESULTS:';
    RAISE NOTICE '';
    RAISE NOTICE '✅ user_activities table created with % records', user_activities_count;
    
    IF test_view_works THEN
        RAISE NOTICE '✅ member_matrix_view created successfully with % records', matrix_view_count;
    ELSE
        RAISE NOTICE '❌ member_matrix_view creation failed - check referrals table structure';
    END IF;
    
    RAISE NOTICE '✅ system_settings table created with % settings', settings_count;
    RAISE NOTICE '✅ platform_revenue table created';
    RAISE NOTICE '✅ notifications table created';
    
    -- Test the functions
    DECLARE
        test_activities INTEGER;
        test_matrix INTEGER;
        test_positions INTEGER;
    BEGIN
        SELECT COUNT(*) INTO test_activities 
        FROM get_user_activities('0x1234567890123456789012345678901234567890', 5);
        
        SELECT COUNT(*) INTO test_matrix 
        FROM get_member_matrix('0x1234567890123456789012345678901234567890');
        
        SELECT COUNT(*) INTO test_positions 
        FROM get_member_position_in_matrix('0x1234567890123456789012345678901234567890');
        
        RAISE NOTICE '';
        RAISE NOTICE '🧪 FUNCTION TESTS:';
        RAISE NOTICE '✅ get_user_activities() returned % records', test_activities;
        RAISE NOTICE '✅ get_member_matrix() returned % records', test_matrix;
        RAISE NOTICE '✅ get_member_position_in_matrix() returned % records', test_positions;
    END;
    
    RAISE NOTICE '';
    IF test_view_works THEN
        RAISE NOTICE '🎉 ALL MISSING TABLES AND VIEWS CREATED SUCCESSFULLY!';
        RAISE NOTICE '';
        RAISE NOTICE 'The following errors should now be resolved:';
        RAISE NOTICE '• "member_matrix_view" does not exist ✅ FIXED';
        RAISE NOTICE '• "user_activities" does not exist ✅ FIXED';
    ELSE
        RAISE NOTICE '⚠️  PARTIAL SUCCESS - user_activities created, member_matrix_view may need adjustment';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Check if referrals table exists and has the expected columns';
        RAISE NOTICE '2. Verify column names: root_wallet, member_wallet, layer, position';
    END IF;
END $$;