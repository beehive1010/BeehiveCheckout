-- ================================
-- BEEHIVE COMPLETE DATABASE SCHEMA
-- Web3 Membership and Learning Platform
-- ================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================
-- ENUMS (Custom Types)
-- ================================

-- Activity types for user activities
CREATE TYPE activity_type_enum AS ENUM (
    'reward', 'purchase', 'merchant_nft_claim', 'token_purchase', 
    'membership', 'referral_joined', 'matrix_placement', 'course_activation', 'nft_verification'
);

-- Amount/currency types  
CREATE TYPE amount_type_enum AS ENUM ('USDT', 'BCC', 'ETH', 'MATIC');

-- BCC unlock reasons
CREATE TYPE bcc_unlock_type_enum AS ENUM (
    'activation', 'upgrade', 'referral', 'bonus', 
    'course_completion', 'nft_claim', 'admin_grant'
);

-- Course completion status
CREATE TYPE course_status_enum AS ENUM ('not_started', 'in_progress', 'completed', 'expired');

-- Supported languages
CREATE TYPE language_enum AS ENUM ('en', 'zh', 'th', 'my', 'ko', 'ja');

-- Matrix positions (3x3 matrix)
CREATE TYPE matrix_position_enum AS ENUM ('L', 'M', 'R');

-- Member levels (0-19)
CREATE TYPE member_level_enum AS ENUM (
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19'
);

-- NFT verification status
CREATE TYPE nft_status_enum AS ENUM ('pending', 'verified', 'claimed', 'rejected');

-- Notification priorities
CREATE TYPE notification_priority_enum AS ENUM ('low', 'normal', 'high', 'urgent');

-- Notification types
CREATE TYPE notification_type_enum AS ENUM (
    'member_activated', 'level_upgraded', 'upgrade_reminder', 'reward_received',
    'referral_joined', 'matrix_placement', 'countdown_warning', 'system_announcement',
    'course_unlocked', 'nft_available', 'withdrawal_processed', 'payment_confirmed'
);

-- Referral placement types
CREATE TYPE placement_type_enum AS ENUM ('direct', 'spillover');

-- Registration status
CREATE TYPE registration_status_enum AS ENUM ('pending', 'verified', 'activated', 'expired');

-- Reward status with rollup
CREATE TYPE reward_status_enum AS ENUM ('pending', 'claimable', 'claimed', 'expired', 'rollup');

-- Service status
CREATE TYPE service_status_enum AS ENUM ('online', 'offline', 'maintenance', 'degraded');

-- Transaction status
CREATE TYPE transaction_status_enum AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
);

-- Wallet connection types
CREATE TYPE wallet_connection_type_enum AS ENUM ('connect', 'verify', 'register', 'disconnect');

-- ================================
-- CORE TABLES
-- ================================

-- Users table - primary identity table
CREATE TABLE users (
    wallet_address VARCHAR(42) PRIMARY KEY,
    referrer_wallet VARCHAR(42),
    username TEXT UNIQUE,
    email TEXT,
    is_upgraded BOOLEAN NOT NULL DEFAULT false,
    upgrade_timer_enabled BOOLEAN NOT NULL DEFAULT false,
    current_level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Members table - membership status and stats
CREATE TABLE members (
    wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
    is_activated BOOLEAN NOT NULL DEFAULT false,
    activated_at TIMESTAMP,
    current_level INTEGER NOT NULL DEFAULT 0,
    max_layer INTEGER NOT NULL DEFAULT 0,
    levels_owned JSONB NOT NULL DEFAULT '[]'::jsonb,
    has_pending_rewards BOOLEAN NOT NULL DEFAULT false,
    upgrade_reminder_enabled BOOLEAN NOT NULL DEFAULT false,
    last_upgrade_at TIMESTAMP,
    last_reward_claim_at TIMESTAMP,
    total_direct_referrals INTEGER NOT NULL DEFAULT 0,
    total_team_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Referral matrix system (19 layers, 3x3 positions)
CREATE TABLE referrals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    root_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    member_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    layer INTEGER NOT NULL CHECK (layer BETWEEN 1 AND 19),
    position TEXT NOT NULL CHECK (position IN ('L', 'M', 'R')),
    parent_wallet VARCHAR(42),
    placer_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    placement_type placement_type_enum NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    placed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Level configuration (19 levels with BCC unlock tiers)
CREATE TABLE level_config (
    level INTEGER PRIMARY KEY,
    level_name TEXT NOT NULL,
    token_id INTEGER NOT NULL,
    
    -- Pricing structure
    nft_price INTEGER NOT NULL,
    platform_fee INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    
    -- Legacy pricing fields
    price_usdt INTEGER NOT NULL,
    activation_fee_usdt INTEGER NOT NULL,
    total_price_usdt INTEGER NOT NULL,
    reward_usdt INTEGER NOT NULL,
    
    -- BCC release system for 4 tiers
    tier_1_release DECIMAL(10,2) NOT NULL,
    tier_2_release DECIMAL(10,2) NOT NULL,
    tier_3_release DECIMAL(10,2) NOT NULL,
    tier_4_release DECIMAL(10,2) NOT NULL,
    
    -- Layer reward system
    layer_level INTEGER NOT NULL,
    total_activated_seats INTEGER NOT NULL,
    max_active_positions INTEGER NOT NULL DEFAULT 3,
    max_referral_depth INTEGER NOT NULL DEFAULT 19,
    direct_referrers_required INTEGER NOT NULL DEFAULT 0,
    upgrade_countdown_hours INTEGER NOT NULL DEFAULT 72,
    reward_requires_level_match BOOLEAN NOT NULL DEFAULT true,
    can_earn_commissions BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- BCC staking tiers with total locked amounts
CREATE TABLE bcc_staking_tiers (
    tier_id INTEGER PRIMARY KEY,
    tier_name TEXT NOT NULL,
    max_activations INTEGER NOT NULL,
    current_activations INTEGER NOT NULL DEFAULT 0,
    unlock_multiplier NUMERIC(5,4) NOT NULL DEFAULT 1.0000,
    total_lock_multiplier NUMERIC(5,4) NOT NULL DEFAULT 1.0000,
    total_locked_bcc NUMERIC(12,2) NOT NULL DEFAULT 0, -- NEW: Total BCC locked for this tier
    phase TEXT NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User balances with tier tracking
CREATE TABLE user_balances (
    wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
    
    -- BCC balance management
    bcc_transferable INTEGER NOT NULL DEFAULT 500,
    bcc_restricted INTEGER NOT NULL DEFAULT 0,
    bcc_locked INTEGER NOT NULL DEFAULT 0,
    
    -- USDT reward management
    total_usdt_earned INTEGER NOT NULL DEFAULT 0,
    available_usdt_rewards INTEGER NOT NULL DEFAULT 0,
    total_usdt_withdrawn INTEGER NOT NULL DEFAULT 0,
    
    -- Staking tier info
    activation_tier INTEGER,
    activation_order INTEGER,
    
    -- CTH balance (hidden)
    cth_balance INTEGER NOT NULL DEFAULT 0,
    
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- REWARD SYSTEM TABLES
-- ================================

-- Reward notifications with 72-hour countdown
CREATE TABLE reward_notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    trigger_wallet VARCHAR(42) NOT NULL,
    trigger_level INTEGER NOT NULL,
    layer_number INTEGER NOT NULL,
    reward_amount INTEGER NOT NULL,
    status reward_status_enum NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL, -- 72 hours from creation
    claimed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Reward rollups for expired rewards
CREATE TABLE reward_rollups (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    original_recipient VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    rolled_up_to VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    reward_amount INTEGER NOT NULL,
    trigger_wallet VARCHAR(42) NOT NULL,
    trigger_level INTEGER NOT NULL,
    original_notification_id VARCHAR NOT NULL,
    rollup_reason TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User rewards with detailed tracking
CREATE TABLE user_rewards (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    source_wallet VARCHAR(42) NOT NULL,
    trigger_level INTEGER NOT NULL,
    payout_layer INTEGER NOT NULL,
    matrix_position TEXT,
    reward_amount NUMERIC(10,2) NOT NULL,
    status reward_status_enum NOT NULL DEFAULT 'pending',
    requires_level INTEGER,
    unlock_condition TEXT,
    expires_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    expired_at TIMESTAMP,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- NFT AND MARKETPLACE TABLES  
-- ================================

-- Member NFT verification
CREATE TABLE member_nft_verification (
    wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
    member_level INTEGER NOT NULL,
    token_id INTEGER NOT NULL,
    nft_contract_address VARCHAR(42) NOT NULL,
    chain TEXT NOT NULL,
    network_type TEXT NOT NULL,
    verification_status nft_status_enum NOT NULL DEFAULT 'pending',
    last_verified TIMESTAMP,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Merchant NFTs
CREATE TABLE merchant_nfts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    price_bcc INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- NFT claims/purchases
CREATE TABLE merchant_nft_claims (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    nft_id VARCHAR NOT NULL REFERENCES merchant_nfts(id),
    amount_bcc INTEGER NOT NULL,
    bucket_used TEXT NOT NULL,
    tx_hash TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- LEARNING SYSTEM TABLES
-- ================================

-- Courses
CREATE TABLE courses (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    required_level INTEGER NOT NULL DEFAULT 1,
    price_bcc INTEGER NOT NULL DEFAULT 0,
    is_free BOOLEAN NOT NULL DEFAULT true,
    duration TEXT NOT NULL,
    course_type TEXT NOT NULL DEFAULT 'video',
    zoom_meeting_id TEXT,
    zoom_password TEXT,
    zoom_link TEXT,
    video_url TEXT,
    download_link TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Course lessons
CREATE TABLE course_lessons (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id VARCHAR NOT NULL REFERENCES courses(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    video_url TEXT NOT NULL,
    duration TEXT NOT NULL,
    lesson_order INTEGER NOT NULL,
    price_bcc INTEGER NOT NULL DEFAULT 0,
    is_free BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Course activations (user progress)
CREATE TABLE course_activations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    course_id VARCHAR NOT NULL REFERENCES courses(id),
    
    total_lessons INTEGER NOT NULL DEFAULT 0,
    course_category TEXT NOT NULL,
    
    -- Progress tracking
    unlocked_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
    overall_progress INTEGER NOT NULL DEFAULT 0,
    
    -- Pricing
    bcc_original_price INTEGER NOT NULL,
    bcc_discount_price INTEGER NOT NULL DEFAULT 0,
    actual_paid_bcc INTEGER NOT NULL,
    
    -- Timestamps
    course_activated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_lesson_unlocked_at TIMESTAMP,
    last_progress_update TIMESTAMP NOT NULL DEFAULT NOW(),
    
    zoom_nickname TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- ADMIN AND SYSTEM TABLES
-- ================================

-- Admin users
CREATE TABLE admin_users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    permissions TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    full_name TEXT,
    notes TEXT,
    created_by TEXT,
    two_factor_secret TEXT,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Admin sessions
CREATE TABLE admin_sessions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id VARCHAR NOT NULL REFERENCES admin_users(id),
    session_token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id VARCHAR NOT NULL REFERENCES admin_users(id),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    target_id TEXT,
    target_type TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    severity TEXT NOT NULL DEFAULT 'info',
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User notifications
CREATE TABLE user_notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type_enum NOT NULL,
    trigger_wallet VARCHAR(42),
    related_wallet VARCHAR(42),
    amount INTEGER,
    amount_type amount_type_enum,
    level INTEGER,
    layer INTEGER,
    position matrix_position_enum,
    priority notification_priority_enum NOT NULL DEFAULT 'normal',
    action_required BOOLEAN NOT NULL DEFAULT false,
    action_type TEXT,
    action_url TEXT,
    expires_at TIMESTAMP,
    reminder_sent_at TIMESTAMP,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    email_sent BOOLEAN NOT NULL DEFAULT false,
    email_sent_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- ADDITIONAL SYSTEM TABLES
-- ================================

-- BCC unlock history
CREATE TABLE bcc_unlock_history (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    unlock_level INTEGER NOT NULL,
    unlock_amount INTEGER NOT NULL,
    unlock_tier TEXT NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Platform revenue tracking
CREATE TABLE platform_revenue (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL,
    source_wallet VARCHAR(42) NOT NULL,
    level INTEGER,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Token purchases (BCC/CTH)
CREATE TABLE token_purchases (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    token_type TEXT NOT NULL,
    token_amount INTEGER NOT NULL,
    usdt_amount INTEGER NOT NULL,
    source_chain TEXT NOT NULL,
    tx_hash TEXT,
    payembed_intent_id TEXT,
    airdrop_tx_hash TEXT,
    status transaction_status_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- USDT withdrawals
CREATE TABLE usdt_withdrawals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    amount_usdt INTEGER NOT NULL,
    target_chain TEXT NOT NULL,
    target_wallet_address VARCHAR(42) NOT NULL,
    gas_fee_percentage NUMERIC(5,2) NOT NULL,
    gas_fee_amount INTEGER NOT NULL,
    net_amount INTEGER NOT NULL,
    status transaction_status_enum NOT NULL DEFAULT 'pending',
    server_wallet_tx_hash TEXT,
    target_chain_tx_hash TEXT,
    processed_by TEXT,
    failure_reason TEXT,
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Member activations (pending system)
CREATE TABLE member_activations (
    wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
    activation_type TEXT NOT NULL,
    level INTEGER NOT NULL,
    pending_until TIMESTAMP,
    is_pending BOOLEAN NOT NULL DEFAULT true,
    activated_at TIMESTAMP,
    pending_timeout_hours INTEGER NOT NULL DEFAULT 24,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Member upgrade pending table for 72-hour countdown
CREATE TABLE member_upgrade_pending (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    target_level INTEGER NOT NULL,
    current_level INTEGER NOT NULL,
    upgrade_fee_paid INTEGER NOT NULL,  -- USDT cents paid
    direct_referrers_count INTEGER NOT NULL DEFAULT 0,
    direct_referrers_required INTEGER NOT NULL DEFAULT 0,
    countdown_expires_at TIMESTAMP NOT NULL,  -- 72 hours from payment
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'qualified', 'expired', 'activated'
    payment_tx_hash TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- System settings
CREATE TABLE admin_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- BCC global pool tracking
CREATE TABLE bcc_global_pool (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_bcc_locked INTEGER NOT NULL DEFAULT 0,
    total_members_activated INTEGER NOT NULL DEFAULT 0,
    current_tier INTEGER NOT NULL DEFAULT 1,
    tier1_activations INTEGER NOT NULL DEFAULT 0,
    tier2_activations INTEGER NOT NULL DEFAULT 0,
    tier3_activations INTEGER NOT NULL DEFAULT 0,
    tier4_activations INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wallet connection logs
CREATE TABLE wallet_connection_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
    connection_type wallet_connection_type_enum NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    referrer_url TEXT,
    referral_code TEXT,
    upline_wallet VARCHAR(42),
    connection_status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Referral system indexes
CREATE INDEX idx_referrals_root_layer ON referrals(root_wallet, layer);
CREATE INDEX idx_referrals_member ON referrals(member_wallet);
CREATE INDEX idx_referrals_placer ON referrals(placer_wallet);
CREATE INDEX idx_referrals_parent ON referrals(parent_wallet);

-- Reward system indexes
CREATE INDEX idx_reward_notifications_recipient ON reward_notifications(recipient_wallet);
CREATE INDEX idx_reward_notifications_expires ON reward_notifications(expires_at);
CREATE INDEX idx_reward_notifications_status ON reward_notifications(status);
CREATE INDEX idx_user_rewards_recipient ON user_rewards(recipient_wallet);
CREATE INDEX idx_user_rewards_expires ON user_rewards(expires_at);

-- User activity indexes
CREATE INDEX idx_users_referrer ON users(referrer_wallet);
CREATE INDEX idx_members_activated ON members(is_activated);
CREATE INDEX idx_members_level ON members(current_level);

-- Notification indexes
CREATE INDEX idx_user_notifications_wallet ON user_notifications(wallet_address);
CREATE INDEX idx_user_notifications_unread ON user_notifications(wallet_address, is_read);
CREATE INDEX idx_user_notifications_expires ON user_notifications(expires_at);

-- Course system indexes
CREATE INDEX idx_course_activations_wallet ON course_activations(wallet_address);
CREATE INDEX idx_course_activations_course ON course_activations(course_id);

-- ================================
-- VIEWS FOR ANALYTICS
-- ================================

-- Available matrix placement positions
CREATE VIEW available_placement_positions AS
SELECT 
    r.root_wallet,
    r.layer,
    CASE 
        WHEN NOT EXISTS(SELECT 1 FROM referrals WHERE root_wallet = r.root_wallet AND layer = r.layer AND position = 'L') THEN 'L'
        WHEN NOT EXISTS(SELECT 1 FROM referrals WHERE root_wallet = r.root_wallet AND layer = r.layer AND position = 'M') THEN 'M'  
        WHEN NOT EXISTS(SELECT 1 FROM referrals WHERE root_wallet = r.root_wallet AND layer = r.layer AND position = 'R') THEN 'R'
        ELSE NULL
    END as next_position
FROM (
    SELECT DISTINCT root_wallet, generate_series(1, 19) as layer
    FROM referrals
) r
WHERE EXISTS(SELECT 1 FROM members WHERE wallet_address = r.root_wallet AND is_activated = true);

-- User matrix layers summary
CREATE VIEW user_matrix_layers AS
SELECT 
    root_wallet,
    layer,
    COUNT(*) as filled_positions,
    POWER(3, layer) as max_positions,
    ARRAY_AGG(position ORDER BY position) as positions,
    ARRAY_AGG(member_wallet ORDER BY position) as members,
    (COUNT(*) = POWER(3, layer)) as is_complete
FROM referrals 
GROUP BY root_wallet, layer
ORDER BY root_wallet, layer;

-- Company member statistics
CREATE VIEW company_member_stats AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN m.is_activated THEN 1 END) as activated_members,
    COUNT(CASE WHEN m.current_level > 0 THEN 1 END) as paid_members,
    AVG(m.current_level) as avg_member_level,
    MAX(m.current_level) as highest_level,
    COUNT(CASE WHEN m.created_at > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_members_30d
FROM users u
LEFT JOIN members m ON u.wallet_address = m.wallet_address;

-- Company financial statistics  
CREATE VIEW company_financial_stats AS
SELECT 
    SUM(ub.total_usdt_earned) as total_usdt_distributed,
    SUM(ub.available_usdt_rewards) as pending_usdt_rewards,
    SUM(ub.total_usdt_withdrawn) as total_usdt_withdrawn,
    SUM(ub.bcc_transferable + ub.bcc_restricted + ub.bcc_locked) as total_bcc_in_circulation,
    AVG(ub.bcc_transferable + ub.bcc_restricted + ub.bcc_locked) as avg_bcc_per_user,
    COUNT(CASE WHEN ub.available_usdt_rewards > 0 THEN 1 END) as users_with_pending_rewards
FROM user_balances ub;

-- Member level breakdown
CREATE VIEW member_level_breakdown AS
SELECT 
    current_level,
    COUNT(*) as member_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM members 
WHERE is_activated = true
GROUP BY current_level
ORDER BY current_level;

-- User referral statistics
CREATE VIEW user_referral_stats AS
SELECT 
    u.wallet_address,
    m.total_direct_referrals,
    m.total_team_size,
    COUNT(r.member_wallet) as matrix_members,
    MAX(r.layer) as deepest_layer,
    COUNT(CASE WHEN rm.is_activated THEN 1 END) as activated_referrals
FROM users u
LEFT JOIN members m ON u.wallet_address = m.wallet_address
LEFT JOIN referrals r ON u.wallet_address = r.root_wallet
LEFT JOIN members rm ON r.member_wallet = rm.wallet_address
GROUP BY u.wallet_address, m.total_direct_referrals, m.total_team_size;

-- User reward statistics
CREATE VIEW user_reward_stats AS
SELECT 
    recipient_wallet,
    COUNT(*) as total_rewards,
    SUM(reward_amount) as total_reward_amount,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_rewards,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_rewards,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_rewards,
    AVG(reward_amount) as avg_reward_amount
FROM user_rewards
GROUP BY recipient_wallet;

-- User personal matrix view
CREATE VIEW user_personal_matrix AS
SELECT 
    r.root_wallet,
    r.layer,
    r.position,
    r.member_wallet,
    u.username as member_username,
    m.current_level as member_level,
    m.is_activated as member_activated,
    r.placement_type,
    r.placed_at
FROM referrals r
JOIN users u ON r.member_wallet = u.wallet_address
LEFT JOIN members m ON r.member_wallet = m.wallet_address
ORDER BY r.root_wallet, r.layer, r.position;

-- Optimal placement positions (considers spillover rules)
CREATE VIEW optimal_placement_positions AS
SELECT 
    root_wallet,
    layer,
    position,
    member_wallet,
    CASE 
        WHEN layer < 19 AND position IS NOT NULL THEN 'available'
        WHEN layer = 19 THEN 'max_depth'
        ELSE 'full'
    END as availability_status
FROM (
    SELECT 
        u.wallet_address as root_wallet,
        l.layer_num as layer,
        CASE 
            WHEN NOT EXISTS(SELECT 1 FROM referrals WHERE root_wallet = u.wallet_address AND layer = l.layer_num AND position = 'L') THEN 'L'
            WHEN NOT EXISTS(SELECT 1 FROM referrals WHERE root_wallet = u.wallet_address AND layer = l.layer_num AND position = 'M') THEN 'M'
            WHEN NOT EXISTS(SELECT 1 FROM referrals WHERE root_wallet = u.wallet_address AND layer = l.layer_num AND position = 'R') THEN 'R'
            ELSE NULL
        END as position,
        NULL as member_wallet
    FROM users u
    CROSS JOIN (SELECT generate_series(1, 19) as layer_num) l
    WHERE EXISTS(SELECT 1 FROM members WHERE wallet_address = u.wallet_address AND is_activated = true)
) available_spots;

-- ================================
-- ROW LEVEL SECURITY POLICIES
-- ================================

-- Enable RLS on sensitive tables
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcc_unlock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Admin session policies
CREATE POLICY admin_sessions_self_only ON admin_sessions
    FOR ALL TO public
    USING (admin_id::text = current_setting('app.current_admin_id', true));

-- Admin user policies  
CREATE POLICY admin_users_super_admin_only ON admin_users
    FOR ALL TO public
    USING (current_setting('app.is_super_admin', true)::boolean = true);

-- Audit log policies
CREATE POLICY audit_logs_admin_read_only ON audit_logs
    FOR SELECT TO public
    USING (current_setting('app.is_admin', true)::boolean = true);

-- BCC unlock history policies
CREATE POLICY bcc_unlock_history_admin_access ON bcc_unlock_history
    FOR ALL TO public
    USING (current_setting('app.is_admin', true)::boolean = true);

CREATE POLICY bcc_unlock_history_owner_access ON bcc_unlock_history
    FOR ALL TO public
    USING (wallet_address::text = current_setting('app.current_wallet', true));

-- Course activation policies
CREATE POLICY course_activations_admin_access ON course_activations
    FOR ALL TO public
    USING (current_setting('app.is_admin', true)::boolean = true);

CREATE POLICY course_activations_owner_access ON course_activations
    FOR ALL TO public
    USING (wallet_address::text = current_setting('app.current_wallet', true));

-- Member policies
CREATE POLICY members_admin_access ON members
    FOR ALL TO public
    USING (current_setting('app.is_admin', true)::boolean = true);

CREATE POLICY members_self_access ON members
    FOR ALL TO public
    USING (wallet_address::text = current_setting('app.current_wallet', true));

CREATE POLICY members_referrer_read ON members
    FOR SELECT TO public
    USING (wallet_address::text IN (
        SELECT member_wallet FROM referrals 
        WHERE root_wallet::text = current_setting('app.current_wallet', true)
    ));

CREATE POLICY members_tree_read ON members
    FOR SELECT TO public
    USING (wallet_address::text IN (
        SELECT member_wallet FROM referrals 
        WHERE root_wallet::text = current_setting('app.current_wallet', true)
    ));

-- Platform revenue policies
CREATE POLICY platform_revenue_high_admin_only ON platform_revenue
    FOR ALL TO public
    USING (current_setting('app.admin_level', true)::integer >= 3);

-- Referral policies
CREATE POLICY referrals_admin_access ON referrals
    FOR ALL TO public
    USING (current_setting('app.is_admin', true)::boolean = true);

CREATE POLICY referrals_tree_owner_access ON referrals
    FOR ALL TO public
    USING (root_wallet::text = current_setting('app.current_wallet', true));

CREATE POLICY referrals_member_read ON referrals
    FOR SELECT TO public
    USING (member_wallet::text = current_setting('app.current_wallet', true));

CREATE POLICY referrals_placer_insert ON referrals
    FOR INSERT TO public
    WITH CHECK (placer_wallet::text = current_setting('app.current_wallet', true));

CREATE POLICY referrals_integrity_check ON referrals
    FOR INSERT TO public
    WITH CHECK (
        EXISTS(SELECT 1 FROM members WHERE wallet_address = placer_wallet AND is_activated = true) 
        AND position IN ('L', 'M', 'R') 
        AND layer BETWEEN 1 AND 19
    );

-- Token purchase policies
CREATE POLICY token_purchases_admin_access ON token_purchases
    FOR ALL TO public
    USING (current_setting('app.is_admin', true)::boolean = true);

CREATE POLICY token_purchases_owner_access ON token_purchases
    FOR ALL TO public
    USING (wallet_address::text = current_setting('app.current_wallet', true));

-- User notification policies
CREATE POLICY user_notifications_admin_access ON user_notifications
    FOR ALL TO public
    USING (current_setting('app.is_admin', true)::boolean = true);

CREATE POLICY user_notifications_recipient_access ON user_notifications
    FOR ALL TO public
    USING (wallet_address::text = current_setting('app.current_wallet', true));

-- User reward policies
CREATE POLICY user_rewards_admin_access ON user_rewards
    FOR ALL TO public
    USING (current_setting('app.is_admin', true)::boolean = true);

CREATE POLICY user_rewards_recipient_access ON user_rewards
    FOR ALL TO public
    USING (recipient_wallet::text = current_setting('app.current_wallet', true));

-- User policies
CREATE POLICY users_admin_access ON users
    FOR ALL TO public
    USING (current_setting('app.is_admin', true)::boolean = true);

CREATE POLICY users_self_access ON users
    FOR ALL TO public
    USING (wallet_address::text = current_setting('app.current_wallet', true));

CREATE POLICY users_public_read ON users
    FOR SELECT TO public
    USING (true);

CREATE POLICY referrals_upline_read ON users
    FOR SELECT TO public
    USING (wallet_address::text IN (
        SELECT wallet_address FROM users 
        WHERE referrer_wallet::text = current_setting('app.current_wallet', true)
    ));

-- ================================
-- TRIGGERS
-- ================================