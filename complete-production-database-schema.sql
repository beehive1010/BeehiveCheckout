-- 完整的生产数据库Schema - 包含所有表、视图、索引和触发器
-- Complete Production Database Schema - All tables, views, indexes and triggers

-- ================================
-- 核心用户和会员表 (Core User & Member Tables)
-- ================================

-- 用户档案表 - 存储基本用户信息
CREATE TABLE IF NOT EXISTS users (
    wallet_address VARCHAR(42) PRIMARY KEY,
    referrer_wallet VARCHAR(42),
    username TEXT UNIQUE,
    email TEXT,
    is_upgraded BOOLEAN NOT NULL DEFAULT false,
    upgrade_timer_enabled BOOLEAN NOT NULL DEFAULT false,
    current_level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 会员状态表 - 替代多个旧状态表
CREATE TABLE IF NOT EXISTS members (
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

-- 推荐关系表 - 19层矩阵系统
CREATE TABLE IF NOT EXISTS referrals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    root_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    member_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    layer INTEGER NOT NULL,
    position TEXT NOT NULL,
    parent_wallet VARCHAR(42),
    placer_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    placement_type TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    placed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- 等级配置表 (Level Configuration)
-- ================================

CREATE TABLE IF NOT EXISTS level_config (
    level INTEGER PRIMARY KEY,
    level_name TEXT NOT NULL,
    token_id INTEGER NOT NULL,
    
    -- 定价结构
    nft_price INTEGER NOT NULL,
    platform_fee INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    
    -- 兼容旧字段
    price_usdt INTEGER NOT NULL,
    activation_fee_usdt INTEGER NOT NULL,
    total_price_usdt INTEGER NOT NULL,
    reward_usdt INTEGER NOT NULL,
    
    -- BCC层级释放系统
    tier_1_release DECIMAL(10,2) NOT NULL,
    tier_2_release DECIMAL(10,2) NOT NULL,
    tier_3_release DECIMAL(10,2) NOT NULL,
    tier_4_release DECIMAL(10,2) NOT NULL,
    
    -- 层级奖励系统
    layer_level INTEGER NOT NULL,
    total_activated_seats INTEGER NOT NULL,
    max_active_positions INTEGER NOT NULL DEFAULT 3,
    max_referral_depth INTEGER NOT NULL DEFAULT 12,
    can_earn_commissions BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- 钱包和余额管理 (Wallet & Balance Management)
-- ================================

-- 用户钱包表 - 综合余额管理
CREATE TABLE IF NOT EXISTS user_wallet (
    wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
    
    -- USDT奖励管理
    total_usdt_earnings INTEGER NOT NULL DEFAULT 0,
    withdrawn_usdt INTEGER NOT NULL DEFAULT 0,
    available_usdt INTEGER NOT NULL DEFAULT 0,
    
    -- BCC代币管理
    bcc_balance INTEGER NOT NULL DEFAULT 0,
    bcc_locked INTEGER NOT NULL DEFAULT 0,
    
    -- 升级待领取状态
    pending_upgrade_rewards INTEGER NOT NULL DEFAULT 0,
    has_pending_upgrades BOOLEAN NOT NULL DEFAULT false,
    
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 用户余额表
CREATE TABLE IF NOT EXISTS user_balances (
    wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
    transferable_bcc DECIMAL(18,8) NOT NULL DEFAULT 0,
    restricted_bcc DECIMAL(18,8) NOT NULL DEFAULT 0,
    total_bcc_earned DECIMAL(18,8) NOT NULL DEFAULT 0,
    total_bcc_spent DECIMAL(18,8) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CTH余额表
CREATE TABLE IF NOT EXISTS cth_balances (
    wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
    balance DECIMAL(18,8) NOT NULL DEFAULT 0,
    total_earned DECIMAL(18,8) NOT NULL DEFAULT 0,
    total_spent DECIMAL(18,8) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- BCC全球池表
CREATE TABLE IF NOT EXISTS bcc_global_pool (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_type TEXT NOT NULL,
    total_pool_amount DECIMAL(18,8) NOT NULL DEFAULT 0,
    current_pool_amount DECIMAL(18,8) NOT NULL DEFAULT 0,
    distribution_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0100,
    min_stake_amount DECIMAL(18,8) NOT NULL DEFAULT 100.0,
    lock_period_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- BCC质押层级表
CREATE TABLE IF NOT EXISTS bcc_staking_tiers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT NOT NULL,
    min_amount DECIMAL(18,8) NOT NULL,
    max_amount DECIMAL(18,8),
    apr_rate DECIMAL(5,4) NOT NULL,
    lock_period_days INTEGER NOT NULL,
    max_participants INTEGER,
    current_participants INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- 奖励和通知系统 (Reward & Notification System)
-- ================================

-- 奖励汇总表 - 处理过期奖励
CREATE TABLE IF NOT EXISTS reward_rollups (
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

-- 奖励通知表 - 带倒计时器
CREATE TABLE IF NOT EXISTS reward_notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    trigger_wallet VARCHAR(42) NOT NULL,
    trigger_level INTEGER NOT NULL,
    layer_number INTEGER NOT NULL,
    reward_amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 奖励索赔表
CREATE TABLE IF NOT EXISTS reward_claims (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    reward_amount INTEGER NOT NULL,
    trigger_wallet VARCHAR(42) NOT NULL,
    trigger_level INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 用户通知表
CREATE TABLE IF NOT EXISTS user_notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN NOT NULL DEFAULT false,
    priority TEXT NOT NULL DEFAULT 'normal',
    expires_at TIMESTAMP,
    trigger_wallet VARCHAR(42),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- NFT和商品系统 (NFT & Merchant System)
-- ================================

-- 会员NFT验证表
CREATE TABLE IF NOT EXISTS member_nft_verification (
    wallet_address VARCHAR(42) PRIMARY KEY REFERENCES users(wallet_address),
    member_level INTEGER NOT NULL,
    token_id INTEGER NOT NULL,
    nft_contract_address VARCHAR(42) NOT NULL,
    chain TEXT NOT NULL,
    network_type TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'pending',
    last_verified TIMESTAMP,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 商户NFT表
CREATE TABLE IF NOT EXISTS merchant_nfts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    price_bcc INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- NFT购买表
CREATE TABLE IF NOT EXISTS nft_purchases (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    nft_id VARCHAR NOT NULL REFERENCES merchant_nfts(id),
    price_paid INTEGER NOT NULL,
    purchased_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 广告NFT表
CREATE TABLE IF NOT EXISTS advertisement_nfts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    click_url TEXT,
    required_level INTEGER NOT NULL DEFAULT 1,
    reward_bcc INTEGER NOT NULL DEFAULT 0,
    max_claims INTEGER,
    current_claims INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 广告NFT声明表
CREATE TABLE IF NOT EXISTS advertisement_nft_claims (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    ad_nft_id VARCHAR NOT NULL REFERENCES advertisement_nfts(id),
    reward_amount INTEGER NOT NULL,
    claimed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- NFT索赔记录表
CREATE TABLE IF NOT EXISTS nft_claim_records (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    level INTEGER NOT NULL,
    token_id INTEGER NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66),
    chain TEXT NOT NULL,
    network_type TEXT NOT NULL DEFAULT 'testnet',
    mint_status TEXT NOT NULL DEFAULT 'pending',
    verification_status TEXT NOT NULL DEFAULT 'pending',
    mint_attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    expires_at TIMESTAMP,
    minted_at TIMESTAMP,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- 订单和支付系统 (Order & Payment System)
-- ================================

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    level INTEGER NOT NULL,
    token_id INTEGER NOT NULL,
    amount_usdt INTEGER NOT NULL,
    chain TEXT NOT NULL,
    tx_hash VARCHAR(66),
    payembed_intent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 桥接支付表
CREATE TABLE IF NOT EXISTS bridge_payments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    from_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    to_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    amount_usdt DECIMAL(10,2) NOT NULL,
    bridge_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    from_chain TEXT NOT NULL,
    to_chain TEXT NOT NULL,
    tx_hash_from VARCHAR(66),
    tx_hash_to VARCHAR(66),
    bridge_status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 代币购买表
CREATE TABLE IF NOT EXISTS token_purchases (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    token_type TEXT NOT NULL,
    amount_purchased DECIMAL(18,8) NOT NULL,
    price_usdt DECIMAL(10,2) NOT NULL,
    tx_hash VARCHAR(66),
    chain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    purchased_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- USDT提现表
CREATE TABLE IF NOT EXISTS usdt_withdrawals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    amount INTEGER NOT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    chain TEXT NOT NULL,
    tx_hash VARCHAR(66),
    fee INTEGER NOT NULL DEFAULT 0,
    net_amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    admin_notes TEXT,
    processed_by VARCHAR,
    rejected_reason TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- ================================
-- 教育和课程系统 (Education & Course System)
-- ================================

-- 课程表
CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    thumbnail_url TEXT,
    price_bcc INTEGER NOT NULL DEFAULT 0,
    required_level INTEGER NOT NULL DEFAULT 1,
    duration_minutes INTEGER,
    instructor TEXT,
    category TEXT,
    difficulty TEXT NOT NULL DEFAULT 'beginner',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 课程课时表
CREATE TABLE IF NOT EXISTS course_lessons (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id VARCHAR NOT NULL REFERENCES courses(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    video_url TEXT,
    order_index INTEGER NOT NULL,
    duration_minutes INTEGER,
    is_free BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 课程激活表
CREATE TABLE IF NOT EXISTS course_activations (
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    course_id VARCHAR NOT NULL REFERENCES courses(id),
    activated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP,
    PRIMARY KEY (wallet_address, course_id)
);

-- ================================
-- 博客和内容系统 (Blog & Content System)
-- ================================

-- 博客文章表
CREATE TABLE IF NOT EXISTS blog_posts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image TEXT,
    slug TEXT UNIQUE NOT NULL,
    author TEXT NOT NULL,
    category TEXT,
    tags TEXT[],
    status TEXT NOT NULL DEFAULT 'draft',
    view_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    meta_title TEXT,
    meta_description TEXT,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- 服务和管理系统 (Service & Admin System)
-- ================================

-- 服务请求表
CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'normal',
    assigned_to VARCHAR,
    internal_notes TEXT,
    resolution_notes TEXT,
    estimated_completion TIMESTAMP,
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- 管理员用户表
CREATE TABLE IF NOT EXISTS admin_users (
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

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- 管理员设置表
CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 管理员会话表
CREATE TABLE IF NOT EXISTS admin_sessions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id VARCHAR NOT NULL REFERENCES admin_users(id),
    session_token TEXT UNIQUE NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- 发现和合作伙伴系统 (Discovery & Partner System)
-- ================================

-- 发现合作伙伴表
CREATE TABLE IF NOT EXISTS discover_partners (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    chains JSONB NOT NULL DEFAULT '[]'::jsonb,
    dapp_type TEXT NOT NULL,
    featured BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'draft',
    submitter_wallet VARCHAR(42),
    redeem_code_used TEXT,
    approved_by VARCHAR REFERENCES admin_users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    click_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 广告位表
CREATE TABLE IF NOT EXISTS ad_slots (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    dimensions TEXT NOT NULL,
    location TEXT NOT NULL,
    max_partners INTEGER NOT NULL DEFAULT 1,
    current_partners INTEGER NOT NULL DEFAULT 0,
    price_per_month INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 合作伙伴链表
CREATE TABLE IF NOT EXISTS partner_chains (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id VARCHAR NOT NULL REFERENCES discover_partners(id),
    chain_name TEXT NOT NULL,
    chain_id INTEGER,
    rpc_url TEXT,
    explorer_url TEXT,
    is_supported BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- DApp类型表
CREATE TABLE IF NOT EXISTS dapp_types (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 兑换码表
CREATE TABLE IF NOT EXISTS redeem_codes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    value JSONB NOT NULL,
    usage_limit INTEGER,
    current_usage INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- 系统和监控表 (System & Monitoring Tables)
-- ================================

-- 系统状态表
CREATE TABLE IF NOT EXISTS system_status (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    component TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    details JSONB,
    last_check TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 钱包连接日志表
CREATE TABLE IF NOT EXISTS wallet_connection_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
    connection_type TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    session_duration INTEGER,
    connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMP
);

-- ================================
-- 高级功能表 (Advanced Feature Tables)
-- ================================

-- BCC解锁历史表
CREATE TABLE IF NOT EXISTS bcc_unlock_history (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    unlock_level INTEGER NOT NULL,
    unlock_amount INTEGER NOT NULL,
    unlock_tier TEXT NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 用户活动表
CREATE TABLE IF NOT EXISTS user_activities (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    activity_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10,2),
    amount_type TEXT,
    related_wallet VARCHAR(42),
    related_level INTEGER,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 会员矩阵视图表
CREATE TABLE IF NOT EXISTS member_matrix_view (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    root_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    layer_data JSONB NOT NULL,
    total_members INTEGER NOT NULL DEFAULT 0,
    deepest_layer INTEGER NOT NULL DEFAULT 0,
    next_available_layer INTEGER NOT NULL DEFAULT 1,
    next_available_position TEXT NOT NULL DEFAULT 'L',
    last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 矩阵层摘要表
CREATE TABLE IF NOT EXISTS matrix_layer_summary (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    root_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    layer INTEGER NOT NULL,
    total_positions INTEGER NOT NULL DEFAULT 3,
    filled_positions INTEGER NOT NULL DEFAULT 0,
    available_positions TEXT[] NOT NULL DEFAULT ARRAY['L', 'M', 'R']::TEXT[],
    layer_complete BOOLEAN NOT NULL DEFAULT false,
    completion_rewards_paid BOOLEAN NOT NULL DEFAULT false,
    layer_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 会员激活表
CREATE TABLE IF NOT EXISTS member_activations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    level INTEGER NOT NULL,
    activation_type TEXT NOT NULL DEFAULT 'upgrade',
    activated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 奖励分配表
CREATE TABLE IF NOT EXISTS reward_distributions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    source_wallet VARCHAR(42) NOT NULL,
    amount INTEGER NOT NULL,
    level INTEGER,
    distribution_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    distributed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 平台收入表
CREATE TABLE IF NOT EXISTS platform_revenue (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL,
    source_wallet VARCHAR(42) NOT NULL,
    level INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 用户奖励表
CREATE TABLE IF NOT EXISTS user_rewards (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    source_wallet VARCHAR(42) NOT NULL,
    trigger_level INTEGER NOT NULL,
    payout_layer INTEGER NOT NULL,
    matrix_position TEXT,
    reward_amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
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
-- 索引创建 (Index Creation)
-- ================================

-- 推荐关系索引
CREATE INDEX IF NOT EXISTS idx_referrals_root_layer ON referrals(root_wallet, layer);
CREATE INDEX IF NOT EXISTS idx_referrals_member ON referrals(member_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_root_active ON referrals(root_wallet, is_active);

-- 用户和会员索引
CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_members_level ON members(current_level);
CREATE INDEX IF NOT EXISTS idx_members_activated ON members(is_activated);

-- 等级配置索引
CREATE INDEX IF NOT EXISTS idx_level_config_level ON level_config(level);
CREATE INDEX IF NOT EXISTS idx_level_config_layer ON level_config(layer_level);

-- 奖励系统索引
CREATE INDEX IF NOT EXISTS idx_reward_notifications_recipient ON reward_notifications(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_reward_notifications_status ON reward_notifications(status);
CREATE INDEX IF NOT EXISTS idx_reward_notifications_expires ON reward_notifications(expires_at);

-- NFT相关索引
CREATE INDEX IF NOT EXISTS idx_nft_verification_level ON member_nft_verification(member_level);
CREATE INDEX IF NOT EXISTS idx_nft_purchases_wallet ON nft_purchases(wallet_address);

-- 订单和支付索引
CREATE INDEX IF NOT EXISTS idx_orders_wallet ON orders(wallet_address);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- 课程系统索引
CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_activations_wallet ON course_activations(wallet_address);

-- 管理系统索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- 矩阵视图索引
CREATE INDEX IF NOT EXISTS idx_member_matrix_view_root ON member_matrix_view(root_wallet);
CREATE INDEX IF NOT EXISTS idx_matrix_layer_summary_root ON matrix_layer_summary(root_wallet);

-- ================================
-- 触发器创建 (Trigger Creation)
-- ================================

-- 更新会员updated_at字段的触发器
CREATE OR REPLACE FUNCTION update_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_members_updated_at();

-- 更新课程updated_at字段的触发器
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();

-- 更新博客文章updated_at字段的触发器
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_blog_posts_updated_at();

-- 更新发现合作伙伴updated_at字段的触发器
CREATE OR REPLACE FUNCTION update_discover_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_discover_partners_updated_at
    BEFORE UPDATE ON discover_partners
    FOR EACH ROW
    EXECUTE FUNCTION update_discover_partners_updated_at();

-- 更新矩阵层摘要updated_at字段的触发器
CREATE OR REPLACE FUNCTION update_matrix_layer_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_matrix_layer_summary_updated_at
    BEFORE UPDATE ON matrix_layer_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_matrix_layer_summary_updated_at();

-- ================================
-- 数据视图创建 (View Creation)
-- ================================

-- 会员统计视图
CREATE OR REPLACE VIEW member_stats_view AS
SELECT 
    u.wallet_address,
    u.username,
    m.current_level,
    m.is_activated,
    m.total_direct_referrals,
    m.total_team_size,
    uw.available_usdt,
    ub.transferable_bcc + ub.restricted_bcc as total_bcc,
    m.activated_at,
    m.last_upgrade_at
FROM users u
LEFT JOIN members m ON u.wallet_address = m.wallet_address
LEFT JOIN user_wallet uw ON u.wallet_address = uw.wallet_address
LEFT JOIN user_balances ub ON u.wallet_address = ub.wallet_address;

-- 奖励总览视图
CREATE OR REPLACE VIEW reward_overview_view AS
SELECT 
    rn.recipient_wallet,
    COUNT(CASE WHEN rn.status = 'pending' THEN 1 END) as pending_rewards,
    COUNT(CASE WHEN rn.status = 'claimable' THEN 1 END) as claimable_rewards,
    COALESCE(SUM(CASE WHEN rn.status = 'claimable' THEN rn.reward_amount END), 0) as total_claimable_amount,
    COUNT(*) as total_notifications
FROM reward_notifications rn
GROUP BY rn.recipient_wallet;

-- 矩阵进度视图
CREATE OR REPLACE VIEW matrix_progress_view AS
SELECT 
    r.root_wallet,
    r.layer,
    COUNT(*) as filled_positions,
    3 as total_positions,
    ROUND((COUNT(*)::DECIMAL / 3) * 100, 2) as completion_percentage,
    CASE WHEN COUNT(*) = 3 THEN true ELSE false END as layer_complete
FROM referrals r
WHERE r.is_active = true
GROUP BY r.root_wallet, r.layer
ORDER BY r.root_wallet, r.layer;

-- 平台统计视图
CREATE OR REPLACE VIEW platform_stats_view AS
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM members WHERE is_activated = true) as activated_members,
    (SELECT COUNT(*) FROM orders WHERE status = 'completed') as completed_orders,
    (SELECT COALESCE(SUM(amount_usdt), 0) FROM orders WHERE status = 'completed') as total_revenue_cents,
    (SELECT COUNT(*) FROM blog_posts WHERE status = 'published') as published_blog_posts,
    (SELECT COUNT(*) FROM courses WHERE is_active = true) as active_courses,
    (SELECT COUNT(*) FROM merchant_nfts WHERE active = true) as active_nfts;

-- ================================
-- 初始数据插入 (Initial Data Insertion)
-- ================================

-- 插入19级等级配置数据
INSERT INTO level_config (
    level, level_name, token_id, 
    nft_price, platform_fee, total_price,
    price_usdt, activation_fee_usdt, total_price_usdt, reward_usdt,
    tier_1_release, tier_2_release, tier_3_release, tier_4_release,
    layer_level, total_activated_seats
) VALUES
(1, 'Warrior', 1, 10000, 3000, 13000, 10000, 3000, 13000, 10000, 100.00, 50.00, 25.00, 12.50, 1, 3),
(2, 'Guardian', 2, 15000, 0, 15000, 15000, 0, 15000, 15000, 150.00, 75.00, 37.50, 18.75, 2, 9),
(3, 'Sentinel', 3, 20000, 0, 20000, 20000, 0, 20000, 20000, 200.00, 100.00, 50.00, 25.00, 3, 27),
(4, 'Protector', 4, 25000, 0, 25000, 25000, 0, 25000, 25000, 250.00, 125.00, 62.50, 31.25, 4, 81),
(5, 'Defender', 5, 30000, 0, 30000, 30000, 0, 30000, 30000, 300.00, 150.00, 75.00, 37.50, 5, 243),
(6, 'Champion', 6, 35000, 0, 35000, 35000, 0, 35000, 35000, 350.00, 175.00, 87.50, 43.75, 6, 729),
(7, 'Vanquisher', 7, 40000, 0, 40000, 40000, 0, 40000, 40000, 400.00, 200.00, 100.00, 50.00, 7, 2187),
(8, 'Conqueror', 8, 45000, 0, 45000, 45000, 0, 45000, 45000, 450.00, 225.00, 112.50, 56.25, 8, 6561),
(9, 'Overlord', 9, 50000, 0, 50000, 50000, 0, 50000, 50000, 500.00, 250.00, 125.00, 62.50, 9, 19683),
(10, 'Sovereign', 10, 55000, 0, 55000, 55000, 0, 55000, 55000, 550.00, 275.00, 137.50, 68.75, 10, 59049),
(11, 'Emperor', 11, 60000, 0, 60000, 60000, 0, 60000, 60000, 600.00, 300.00, 150.00, 75.00, 11, 177147),
(12, 'Titan', 12, 65000, 0, 65000, 65000, 0, 65000, 65000, 650.00, 325.00, 162.50, 81.25, 12, 531441),
(13, 'Colossus', 13, 70000, 0, 70000, 70000, 0, 70000, 70000, 700.00, 350.00, 175.00, 87.50, 13, 1594323),
(14, 'Behemoth', 14, 75000, 0, 75000, 75000, 0, 75000, 75000, 750.00, 375.00, 187.50, 93.75, 14, 4782969),
(15, 'Leviathan', 15, 80000, 0, 80000, 80000, 0, 80000, 80000, 800.00, 400.00, 200.00, 100.00, 15, 14348907),
(16, 'Apex Predator', 16, 85000, 0, 85000, 85000, 0, 85000, 85000, 850.00, 425.00, 212.50, 106.25, 16, 43046721),
(17, 'Legendary Beast', 17, 90000, 0, 90000, 90000, 0, 90000, 90000, 900.00, 450.00, 225.00, 112.50, 17, 129140163),
(18, 'Mythic Entity', 18, 95000, 0, 95000, 95000, 0, 95000, 95000, 950.00, 475.00, 237.50, 118.75, 18, 387420489),
(19, 'Mythic Peak', 19, 100000, 0, 100000, 100000, 0, 100000, 100000, 1000.00, 500.00, 250.00, 125.00, 19, 1162261467)
ON CONFLICT (level) DO UPDATE SET
    level_name = EXCLUDED.level_name,
    token_id = EXCLUDED.token_id,
    nft_price = EXCLUDED.nft_price,
    platform_fee = EXCLUDED.platform_fee,
    total_price = EXCLUDED.total_price,
    tier_1_release = EXCLUDED.tier_1_release,
    tier_2_release = EXCLUDED.tier_2_release,
    tier_3_release = EXCLUDED.tier_3_release,
    tier_4_release = EXCLUDED.tier_4_release,
    layer_level = EXCLUDED.layer_level,
    total_activated_seats = EXCLUDED.total_activated_seats;

-- 插入基本系统设置
INSERT INTO admin_settings (key, value, description) VALUES
('platform_fee_percentage', '"3.0"', 'Platform fee percentage'),
('max_withdrawal_daily', '"10000"', 'Maximum daily withdrawal in USDT'),
('reward_expiry_hours', '"72"', 'Hours before rewards expire'),
('matrix_max_layers', '"19"', 'Maximum matrix layers'),
('bcc_unlock_tiers', '"4"', 'Number of BCC unlock tiers')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- ================================
-- 完成消息 (Completion Message)
-- ================================

-- 验证表的创建
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 显示完成信息
SELECT 'Complete Production Database Schema Created Successfully!' as status;