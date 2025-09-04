-- 核心缺失表格 - 仅包含可能缺失的重要表格
-- Core Missing Tables - Only essential tables that might be missing

-- 检查当前表数量
SELECT 'Current table count:' as info, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- ================================
-- 等级配置表 (更新版本) - Level Configuration (Updated)
-- ================================

CREATE TABLE IF NOT EXISTS level_config (
    level INTEGER PRIMARY KEY,
    level_name TEXT NOT NULL,
    token_id INTEGER NOT NULL,
    
    -- 新定价结构
    nft_price INTEGER NOT NULL,
    platform_fee INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    
    -- 兼容旧字段
    price_usdt INTEGER NOT NULL,
    activation_fee_usdt INTEGER NOT NULL,
    total_price_usdt INTEGER NOT NULL,
    reward_usdt INTEGER NOT NULL,
    
    -- BCC层级释放系统 (Tier 1 = NFT价格，每层减半)
    tier_1_release DECIMAL(10,2) NOT NULL,
    tier_2_release DECIMAL(10,2) NOT NULL,
    tier_3_release DECIMAL(10,2) NOT NULL,
    tier_4_release DECIMAL(10,2) NOT NULL,
    
    -- 层级奖励系统 (level n = layer n, 3^n 总激活席位)
    layer_level INTEGER NOT NULL,
    total_activated_seats INTEGER NOT NULL,
    max_active_positions INTEGER NOT NULL DEFAULT 3,
    max_referral_depth INTEGER NOT NULL DEFAULT 12,
    can_earn_commissions BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- 可能缺失的核心表格
-- ================================

-- 用户余额表
CREATE TABLE IF NOT EXISTS user_balances (
    wallet_address VARCHAR(42) PRIMARY KEY,
    transferable_bcc DECIMAL(18,8) NOT NULL DEFAULT 0,
    restricted_bcc DECIMAL(18,8) NOT NULL DEFAULT 0,
    total_bcc_earned DECIMAL(18,8) NOT NULL DEFAULT 0,
    total_bcc_spent DECIMAL(18,8) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CTH余额表
CREATE TABLE IF NOT EXISTS cth_balances (
    wallet_address VARCHAR(42) PRIMARY KEY,
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

-- 矩阵层摘要表
CREATE TABLE IF NOT EXISTS matrix_layer_summary (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    root_wallet VARCHAR(42) NOT NULL,
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

-- NFT索赔记录表
CREATE TABLE IF NOT EXISTS nft_claim_records (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
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
    wallet_address VARCHAR(42) NOT NULL,
    ad_nft_id VARCHAR NOT NULL,
    reward_amount INTEGER NOT NULL,
    claimed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 服务请求表
CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
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

-- USDT提现表
CREATE TABLE IF NOT EXISTS usdt_withdrawals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
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

-- 桥接支付表
CREATE TABLE IF NOT EXISTS bridge_payments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    from_wallet VARCHAR(42) NOT NULL,
    to_wallet VARCHAR(42) NOT NULL,
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
    wallet_address VARCHAR(42) NOT NULL,
    token_type TEXT NOT NULL,
    amount_purchased DECIMAL(18,8) NOT NULL,
    price_usdt DECIMAL(10,2) NOT NULL,
    tx_hash VARCHAR(66),
    chain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    purchased_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 会员激活表
CREATE TABLE IF NOT EXISTS member_activations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
    level INTEGER NOT NULL,
    activation_type TEXT NOT NULL DEFAULT 'upgrade',
    activated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 奖励分配表
CREATE TABLE IF NOT EXISTS reward_distributions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_wallet VARCHAR(42) NOT NULL,
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
    recipient_wallet VARCHAR(42) NOT NULL,
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

-- 管理员设置表
CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================
-- 基本索引
-- ================================

CREATE INDEX IF NOT EXISTS idx_level_config_level ON level_config(level);
CREATE INDEX IF NOT EXISTS idx_level_config_layer ON level_config(layer_level);
CREATE INDEX IF NOT EXISTS idx_user_balances_wallet ON user_balances(wallet_address);
CREATE INDEX IF NOT EXISTS idx_matrix_layer_summary_root ON matrix_layer_summary(root_wallet);
CREATE INDEX IF NOT EXISTS idx_nft_claim_records_wallet ON nft_claim_records(wallet_address);
CREATE INDEX IF NOT EXISTS idx_advertisement_nft_claims_wallet ON advertisement_nft_claims(wallet_address);
CREATE INDEX IF NOT EXISTS idx_service_requests_wallet ON service_requests(wallet_address);
CREATE INDEX IF NOT EXISTS idx_usdt_withdrawals_wallet ON usdt_withdrawals(wallet_address);

-- ================================
-- 插入/更新level_config数据
-- ================================

DELETE FROM level_config;

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
(19, 'Mythic Peak', 19, 100000, 0, 100000, 100000, 0, 100000, 100000, 1000.00, 500.00, 250.00, 125.00, 19, 1162261467);

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
-- 验证创建的表
-- ================================

SELECT 'Tables created successfully!' as status;

SELECT 'Final table count:' as info, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public';

SELECT 'Level config data:' as info, COUNT(*) as levels_configured
FROM level_config;