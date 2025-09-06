-- =============================================
-- Beehive Platform - Complete Database Schema
-- Supabase Migration - Initial Schema
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- Core User and Authentication Tables
-- =============================================

-- Users table - Main user profiles
CREATE TABLE public.users (
    wallet_address VARCHAR(42) PRIMARY KEY,
    referrer_wallet VARCHAR(42),
    username TEXT UNIQUE,
    email TEXT,
    is_upgraded BOOLEAN DEFAULT FALSE NOT NULL,
    upgrade_timer_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    current_level INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT fk_users_referrer FOREIGN KEY (referrer_wallet) REFERENCES public.users(wallet_address)
);

-- Members table - BBC membership levels and activation status
CREATE TABLE public.members (
    wallet_address VARCHAR(42) PRIMARY KEY REFERENCES public.users(wallet_address),
    is_activated BOOLEAN DEFAULT FALSE NOT NULL,
    activated_at TIMESTAMPTZ,
    current_level INTEGER DEFAULT 0 NOT NULL,
    max_layer INTEGER DEFAULT 0 NOT NULL,
    levels_owned JSONB DEFAULT '[]'::JSONB NOT NULL,
    has_pending_rewards BOOLEAN DEFAULT FALSE NOT NULL,
    upgrade_reminder_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    last_upgrade_at TIMESTAMPTZ,
    last_reward_claim_at TIMESTAMPTZ,
    total_direct_referrals INTEGER DEFAULT 0 NOT NULL,
    total_team_size INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User wallet connection logs
CREATE TABLE public.user_wallet_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    connection_type VARCHAR(50) NOT NULL, -- 'thirdweb', 'walletconnect', etc.
    ip_address INET,
    user_agent TEXT,
    connected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    disconnected_at TIMESTAMPTZ,
    session_duration INTEGER -- in seconds
);

-- =============================================
-- Referral and Matrix System Tables
-- =============================================

-- Referral tree - 19-layer 3x3 matrix system
CREATE TABLE public.referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    root_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    member_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    layer INTEGER NOT NULL CHECK (layer >= 1 AND layer <= 19),
    position TEXT NOT NULL, -- 'L', 'M', 'R' for layer 1, 'L-L', 'L-M', etc for deeper layers
    parent_wallet VARCHAR(42) REFERENCES public.users(wallet_address),
    placer_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    placement_type TEXT NOT NULL CHECK (placement_type IN ('direct', 'spillover')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(root_wallet, member_wallet),
    UNIQUE(root_wallet, layer, position)
);

-- Matrix activity logs
CREATE TABLE public.matrix_activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    root_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    member_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    activity_type TEXT NOT NULL, -- 'placement', 'activation', 'spillover'
    layer INTEGER NOT NULL,
    position TEXT NOT NULL,
    details JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Matrix layer summaries for quick access
CREATE TABLE public.matrix_layer_summary (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    root_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    layer INTEGER NOT NULL CHECK (layer >= 1 AND layer <= 19),
    total_positions INTEGER DEFAULT 0 NOT NULL,
    filled_positions INTEGER DEFAULT 0 NOT NULL,
    active_members INTEGER DEFAULT 0 NOT NULL,
    layer_completion_rate DECIMAL(5,2) DEFAULT 0.00,
    last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(root_wallet, layer)
);

-- =============================================
-- Financial and Balance Tables
-- =============================================

-- User balances - BCC tokens and USDT earnings
CREATE TABLE public.user_balances (
    wallet_address VARCHAR(42) PRIMARY KEY REFERENCES public.users(wallet_address),
    bcc_transferable DECIMAL(18,8) DEFAULT 0 NOT NULL,
    bcc_locked DECIMAL(18,8) DEFAULT 0 NOT NULL,
    total_usdt_earned DECIMAL(18,6) DEFAULT 0 NOT NULL,
    pending_upgrade_rewards DECIMAL(18,6) DEFAULT 0 NOT NULL,
    rewards_claimed DECIMAL(18,6) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- BCC purchase orders - Track USDC to BCC purchases
CREATE TABLE public.bcc_purchase_orders (
    order_id VARCHAR(100) PRIMARY KEY,
    buyer_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    amount_usdc DECIMAL(18,6) NOT NULL,
    amount_bcc DECIMAL(18,8) NOT NULL,
    exchange_rate DECIMAL(10,6) NOT NULL,
    network VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    company_wallet VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66),
    actual_amount_received DECIMAL(18,6),
    bridge_used BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'expired', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'::JSONB NOT NULL
);

-- Layer rewards tracking
CREATE TABLE public.layer_rewards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    payer_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    layer INTEGER NOT NULL CHECK (layer >= 1 AND layer <= 19),
    reward_type TEXT NOT NULL, -- 'direct', 'matrix', 'spillover', 'upgrade'
    amount_usdt DECIMAL(18,6) NOT NULL,
    amount_bcc DECIMAL(18,8) DEFAULT 0,
    source_transaction_id TEXT,
    nft_level INTEGER,
    is_claimed BOOLEAN DEFAULT FALSE NOT NULL,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- USDT withdrawals
CREATE TABLE public.usdt_withdrawals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    amount DECIMAL(18,6) NOT NULL,
    withdrawal_address VARCHAR(42) NOT NULL,
    network VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    transaction_hash VARCHAR(66),
    fee_amount DECIMAL(18,6) DEFAULT 0,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMPTZ,
    failure_reason TEXT
);

-- =============================================
-- NFT and Marketplace Tables
-- =============================================

-- Orders for membership purchases
CREATE TABLE public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    order_type VARCHAR(50) NOT NULL, -- 'membership', 'nft', 'course'
    item_id TEXT NOT NULL,
    amount_usdt DECIMAL(18,6) NOT NULL,
    amount_bcc DECIMAL(18,8) DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    transaction_hash VARCHAR(66),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Merchant NFTs
CREATE TABLE public.merchant_nfts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    price_usdt DECIMAL(18,6) NOT NULL,
    price_bcc DECIMAL(18,8) NOT NULL,
    category TEXT NOT NULL,
    supply_total INTEGER,
    supply_available INTEGER,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    creator_wallet VARCHAR(42) REFERENCES public.users(wallet_address),
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Advertisement NFTs
CREATE TABLE public.advertisement_nfts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    price_usdt DECIMAL(18,6) NOT NULL,
    price_bcc DECIMAL(18,8) NOT NULL,
    category TEXT NOT NULL,
    advertiser_wallet VARCHAR(42) REFERENCES public.users(wallet_address),
    click_url TEXT,
    impressions_target INTEGER DEFAULT 0,
    impressions_current INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- NFT purchases
CREATE TABLE public.nft_purchases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    buyer_wallet VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    nft_id UUID NOT NULL,
    nft_type TEXT NOT NULL, -- 'merchant', 'advertisement'
    price_usdt DECIMAL(18,6) NOT NULL,
    price_bcc DECIMAL(18,8) DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL, -- 'usdt', 'bcc_tokens', 'mixed'
    transaction_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'completed' NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- =============================================
-- Education System Tables
-- =============================================

-- Courses
CREATE TABLE public.courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    price_usdt DECIMAL(18,6) NOT NULL,
    price_bcc DECIMAL(18,8) NOT NULL,
    category TEXT NOT NULL,
    difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    duration_hours INTEGER DEFAULT 0,
    instructor_name TEXT,
    instructor_wallet VARCHAR(42) REFERENCES public.users(wallet_address),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    required_level INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Course lessons
CREATE TABLE public.course_lessons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    lesson_order INTEGER NOT NULL,
    content_type TEXT DEFAULT 'video' CHECK (content_type IN ('video', 'text', 'quiz', 'assignment')),
    content_url TEXT,
    duration_minutes INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(course_id, lesson_order)
);

-- Course activations (user course access)
CREATE TABLE public.course_activations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    course_id UUID NOT NULL REFERENCES public.courses(id),
    activation_type VARCHAR(50) NOT NULL, -- 'purchase', 'bcc_purchase', 'membership_bonus'
    activated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB,
    
    UNIQUE(wallet_address, course_id)
);

-- Course progress tracking
CREATE TABLE public.course_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    course_id UUID NOT NULL REFERENCES public.courses(id),
    lesson_id UUID NOT NULL REFERENCES public.course_lessons(id),
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    time_spent_minutes INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    
    UNIQUE(wallet_address, course_id, lesson_id)
);

-- =============================================
-- Platform Management Tables
-- =============================================

-- Blog posts
CREATE TABLE public.blog_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    author_wallet VARCHAR(42) REFERENCES public.users(wallet_address),
    image_url TEXT,
    published BOOLEAN DEFAULT TRUE NOT NULL,
    published_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    tags JSONB DEFAULT '[]'::JSONB NOT NULL,
    views INTEGER DEFAULT 0 NOT NULL,
    language VARCHAR(5) DEFAULT 'en' NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User notifications
CREATE TABLE public.user_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'info', 'success', 'warning', 'error', 'reward'
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    read_at TIMESTAMPTZ
);

-- System settings
CREATE TABLE public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by VARCHAR(42) REFERENCES public.users(wallet_address)
);

-- Audit logs
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_wallet VARCHAR(42) REFERENCES public.users(wallet_address),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- Users table indexes
CREATE INDEX idx_users_referrer ON public.users(referrer_wallet);
CREATE INDEX idx_users_created ON public.users(created_at);
CREATE INDEX idx_users_level ON public.users(current_level);

-- Members table indexes
CREATE INDEX idx_members_activated ON public.members(is_activated);
CREATE INDEX idx_members_level ON public.members(current_level);
CREATE INDEX idx_members_activated_at ON public.members(activated_at);

-- Referrals table indexes
CREATE INDEX idx_referrals_root ON public.referrals(root_wallet);
CREATE INDEX idx_referrals_member ON public.referrals(member_wallet);
CREATE INDEX idx_referrals_layer ON public.referrals(layer);
CREATE INDEX idx_referrals_active ON public.referrals(is_active);
CREATE INDEX idx_referrals_root_layer ON public.referrals(root_wallet, layer);

-- Balance table indexes
CREATE INDEX idx_balances_updated ON public.user_balances(updated_at);

-- Order table indexes
CREATE INDEX idx_orders_wallet ON public.orders(wallet_address);
CREATE INDEX idx_orders_type ON public.orders(order_type);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at);

-- BCC purchase orders indexes
CREATE INDEX idx_bcc_orders_buyer ON public.bcc_purchase_orders(buyer_wallet);
CREATE INDEX idx_bcc_orders_status ON public.bcc_purchase_orders(status);
CREATE INDEX idx_bcc_orders_created ON public.bcc_purchase_orders(created_at);
CREATE INDEX idx_bcc_orders_expires ON public.bcc_purchase_orders(expires_at);

-- Layer rewards indexes
CREATE INDEX idx_layer_rewards_recipient ON public.layer_rewards(recipient_wallet);
CREATE INDEX idx_layer_rewards_layer ON public.layer_rewards(layer);
CREATE INDEX idx_layer_rewards_created ON public.layer_rewards(created_at);
CREATE INDEX idx_layer_rewards_unclaimed ON public.layer_rewards(recipient_wallet, is_claimed);

-- Course indexes
CREATE INDEX idx_courses_category ON public.courses(category);
CREATE INDEX idx_courses_active ON public.courses(is_active);
CREATE INDEX idx_course_activations_wallet ON public.course_activations(wallet_address);
CREATE INDEX idx_course_progress_wallet ON public.course_progress(wallet_address);

-- Notification indexes
CREATE INDEX idx_notifications_wallet ON public.user_notifications(wallet_address);
CREATE INDEX idx_notifications_unread ON public.user_notifications(wallet_address, is_read, created_at);

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE public.users IS 'Main user profiles with wallet addresses as primary keys';
COMMENT ON TABLE public.members IS 'BBC membership levels and activation status';
COMMENT ON TABLE public.referrals IS '19-layer 3x3 matrix referral system';
COMMENT ON TABLE public.user_balances IS 'BCC token balances and USDT earnings';
COMMENT ON TABLE public.bcc_purchase_orders IS 'USDC to BCC token purchase tracking';
COMMENT ON TABLE public.layer_rewards IS 'Matrix layer-based reward distributions';
COMMENT ON TABLE public.courses IS 'Educational courses available for purchase';
COMMENT ON TABLE public.merchant_nfts IS 'Merchant NFTs purchasable with BCC tokens';
COMMENT ON TABLE public.advertisement_nfts IS 'Advertisement NFTs for platform promotion';

-- End of initial schema migration