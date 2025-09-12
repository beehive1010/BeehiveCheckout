-- 创建会员余额系统和BCC分层释放机制
-- ========================================
-- 基于激活序号的BCC锁定分配和等级释放系统
-- ========================================

-- 第1步：创建members_balance表
-- ========================================

CREATE TABLE members_balance (
    wallet_address VARCHAR(42) PRIMARY KEY,
    
    -- USDT奖励余额
    reward_balance DECIMAL(18,6) DEFAULT 0 CHECK (reward_balance >= 0),
    reward_claimed DECIMAL(18,6) DEFAULT 0 CHECK (reward_claimed >= 0),
    total_reward DECIMAL(18,6) DEFAULT 0 CHECK (total_reward >= 0),
    
    -- BCC余额系统
    bcc_locked DECIMAL(18,6) DEFAULT 0 CHECK (bcc_locked >= 0),      -- 锁定的BCC（根据激活序号分层分配）
    bcc_balance DECIMAL(18,6) DEFAULT 500 CHECK (bcc_balance >= 0),   -- 可用BCC余额（初始500）
    bcc_used DECIMAL(18,6) DEFAULT 0 CHECK (bcc_used >= 0),          -- 已使用的BCC
    bcc_total_unlocked DECIMAL(18,6) DEFAULT 0 CHECK (bcc_total_unlocked >= 0), -- 累计已解锁的BCC
    
    -- 分层信息
    activation_tier INTEGER CHECK (activation_tier >= 1 AND activation_tier <= 4), -- BCC分层（1-4）
    tier_multiplier DECIMAL(4,3) DEFAULT 1.000, -- 分层乘数（1.0, 0.5, 0.25, 0.125）
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 外键约束
    FOREIGN KEY (wallet_address) REFERENCES membership(wallet_address) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_members_balance_tier ON members_balance(activation_tier);
CREATE INDEX idx_members_balance_bcc_locked ON members_balance(bcc_locked);
CREATE INDEX idx_members_balance_updated ON members_balance(updated_at);

-- 第2步：创建BCC交易记录表
-- ========================================

CREATE TABLE bcc_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('unlock', 'spend', 'bonus', 'transfer')),
    
    -- 交易金额
    amount DECIMAL(18,6) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(18,6) NOT NULL,
    balance_after DECIMAL(18,6) NOT NULL,
    
    -- 解锁相关信息（仅unlock类型）
    unlock_level INTEGER CHECK (unlock_level >= 1 AND unlock_level <= 19),
    unlock_base_amount DECIMAL(18,6), -- 基础解锁数量（Level 1=100, Level 2=150...）
    tier_multiplier DECIMAL(4,3), -- 当时的分层乘数
    
    -- 交易描述和引用
    description TEXT,
    reference_id UUID, -- 引用其他表的ID（如NFT claim ID）
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- 外键约束
    FOREIGN KEY (wallet_address) REFERENCES membership(wallet_address) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_bcc_transactions_wallet ON bcc_transactions(wallet_address);
CREATE INDEX idx_bcc_transactions_type ON bcc_transactions(transaction_type);
CREATE INDEX idx_bcc_transactions_level ON bcc_transactions(unlock_level);
CREATE INDEX idx_bcc_transactions_created ON bcc_transactions(created_at);

-- 第3步：创建BCC分层配置表
-- ========================================

CREATE TABLE bcc_tier_config (
    tier INTEGER PRIMARY KEY CHECK (tier >= 1 AND tier <= 4),
    activation_range_start INTEGER NOT NULL,
    activation_range_end INTEGER NOT NULL,
    tier_name VARCHAR(50) NOT NULL,
    multiplier DECIMAL(4,3) NOT NULL,
    total_pool_bcc DECIMAL(18,6) NOT NULL,
    description TEXT,
    
    UNIQUE(activation_range_start, activation_range_end),
    CHECK (activation_range_start <= activation_range_end)
);

-- 插入BCC分层配置
INSERT INTO bcc_tier_config (tier, activation_range_start, activation_range_end, tier_name, multiplier, total_pool_bcc, description) VALUES
(1, 1, 9999, 'Tier 1 - Foundation', 1.000, 10450, '1st - 9,999th members: Full BCC unlock amounts'),
(2, 10000, 29999, 'Tier 2 - Growth', 0.500, 5225, '10,000th - 29,999th members: Half BCC unlock amounts'),
(3, 30000, 99999, 'Tier 3 - Expansion', 0.250, 2612.5, '30,000th - 99,999th members: Quarter BCC unlock amounts'),
(4, 100000, 268240, 'Tier 4 - Mass Adoption', 0.125, 1306.25, '100,000th - 268,240th members: Eighth BCC unlock amounts');

-- 第4步：创建BCC解锁配置表
-- ========================================

CREATE TABLE bcc_unlock_config (
    level INTEGER PRIMARY KEY CHECK (level >= 1 AND level <= 19),
    level_name VARCHAR(50) NOT NULL,
    base_unlock_amount DECIMAL(18,6) NOT NULL,
    description TEXT,
    
    FOREIGN KEY (level) REFERENCES nft_membership_levels(level) ON DELETE RESTRICT
);

-- 插入BCC解锁配置（基础数量，会根据分层乘以multiplier）
INSERT INTO bcc_unlock_config (level, level_name, base_unlock_amount, description) VALUES
(1, 'Warrior', 100, 'Level 1 unlock: 100 BCC base amount'),
(2, 'Bronze', 150, 'Level 2 unlock: 150 BCC base amount'),
(3, 'Silver', 200, 'Level 3 unlock: 200 BCC base amount'),
(4, 'Gold', 250, 'Level 4 unlock: 250 BCC base amount'),
(5, 'Elite', 300, 'Level 5 unlock: 300 BCC base amount'),
(6, 'Platinum', 350, 'Level 6 unlock: 350 BCC base amount'),
(7, 'Master', 400, 'Level 7 unlock: 400 BCC base amount'),
(8, 'Diamond', 450, 'Level 8 unlock: 450 BCC base amount'),
(9, 'Grandmaster', 500, 'Level 9 unlock: 500 BCC base amount'),
(10, 'Star Shine', 550, 'Level 10 unlock: 550 BCC base amount'),
(11, 'Epic', 600, 'Level 11 unlock: 600 BCC base amount'),
(12, 'Hall', 650, 'Level 12 unlock: 650 BCC base amount'),
(13, 'The Strongest King', 700, 'Level 13 unlock: 700 BCC base amount'),
(14, 'The King of Kings', 750, 'Level 14 unlock: 750 BCC base amount'),
(15, 'Glory King', 800, 'Level 15 unlock: 800 BCC base amount'),
(16, 'Legendary Overlord', 850, 'Level 16 unlock: 850 BCC base amount'),
(17, 'Supreme Lord', 900, 'Level 17 unlock: 900 BCC base amount'),
(18, 'Supreme Myth', 950, 'Level 18 unlock: 950 BCC base amount'),
(19, 'Mythical Peak', 1000, 'Level 19 unlock: 1000 BCC base amount');

-- 第5步：创建初始化会员余额的函数
-- ========================================

CREATE OR REPLACE FUNCTION initialize_member_balance(p_wallet_address VARCHAR(42))
RETURNS TEXT AS $$
DECLARE
    member_info RECORD;
    tier_info RECORD;
    initial_locked DECIMAL(18,6);
    result_msg TEXT;
BEGIN
    -- 获取会员信息
    SELECT activation_id, username, current_level 
    INTO member_info
    FROM membership 
    WHERE wallet_address = p_wallet_address;
    
    IF NOT FOUND THEN
        RETURN format('会员 %s 不存在', p_wallet_address);
    END IF;
    
    -- 检查余额记录是否已存在
    IF EXISTS (SELECT 1 FROM members_balance WHERE wallet_address = p_wallet_address) THEN
        RETURN format('会员 %s 的余额记录已存在', member_info.username);
    END IF;
    
    -- 根据激活序号确定BCC分层
    SELECT * INTO tier_info
    FROM bcc_tier_config
    WHERE member_info.activation_id >= activation_range_start 
    AND member_info.activation_id <= activation_range_end;
    
    IF NOT FOUND THEN
        -- 超出范围的激活序号，不分配锁定BCC
        tier_info.tier := 5;
        tier_info.multiplier := 0;
        tier_info.tier_name := 'No BCC Pool';
        initial_locked := 0;
    ELSE
        -- 计算初始锁定的BCC数量（总池/该分层的会员数量范围）
        initial_locked := tier_info.total_pool_bcc / (tier_info.activation_range_end - tier_info.activation_range_start + 1);
    END IF;
    
    -- 创建余额记录
    INSERT INTO members_balance (
        wallet_address,
        reward_balance,
        reward_claimed,
        total_reward,
        bcc_locked,
        bcc_balance,
        bcc_used,
        bcc_total_unlocked,
        activation_tier,
        tier_multiplier
    ) VALUES (
        p_wallet_address,
        0,     -- reward_balance
        0,     -- reward_claimed
        0,     -- total_reward
        initial_locked, -- bcc_locked
        500,   -- bcc_balance (初始赠送500 BCC)
        0,     -- bcc_used
        0,     -- bcc_total_unlocked
        COALESCE(tier_info.tier, 5),
        COALESCE(tier_info.multiplier, 0)
    );
    
    -- 记录初始BCC赠送交易
    INSERT INTO bcc_transactions (
        wallet_address,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description
    ) VALUES (
        p_wallet_address,
        'bonus',
        500,
        0,
        500,
        format('新会员激活奖励: 500 BCC (激活序号: %s, 分层: %s)', 
               member_info.activation_id, COALESCE(tier_info.tier_name, 'No BCC Pool'))
    );
    
    result_msg := format('会员 %s (激活序号: %s) 余额初始化完成: BCC余额 500, 锁定BCC %.2f (%s)', 
                        member_info.username, member_info.activation_id, 
                        initial_locked, COALESCE(tier_info.tier_name, 'No BCC Pool'));
    
    RETURN result_msg;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN format('初始化失败: %s', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 第6步：创建BCC解锁函数（NFT升级时触发）
-- ========================================

CREATE OR REPLACE FUNCTION unlock_bcc_for_level(
    p_wallet_address VARCHAR(42),
    p_nft_level INTEGER,
    p_reference_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    member_balance RECORD;
    unlock_config RECORD;
    actual_unlock_amount DECIMAL(18,6);
    result_msg TEXT;
BEGIN
    -- 获取会员余额信息
    SELECT * INTO member_balance
    FROM members_balance
    WHERE wallet_address = p_wallet_address;
    
    IF NOT FOUND THEN
        RETURN format('会员余额记录不存在: %s', p_wallet_address);
    END IF;
    
    -- 获取BCC解锁配置
    SELECT * INTO unlock_config
    FROM bcc_unlock_config
    WHERE level = p_nft_level;
    
    IF NOT FOUND THEN
        RETURN format('NFT Level %s 的BCC解锁配置不存在', p_nft_level);
    END IF;
    
    -- 计算实际解锁数量（基础数量 × 分层乘数）
    actual_unlock_amount := unlock_config.base_unlock_amount * member_balance.tier_multiplier;
    
    -- 检查锁定BCC是否足够
    IF member_balance.bcc_locked < actual_unlock_amount THEN
        actual_unlock_amount := member_balance.bcc_locked; -- 只能解锁剩余的全部
    END IF;
    
    -- 如果没有可解锁的BCC，直接返回
    IF actual_unlock_amount <= 0 THEN
        RETURN format('NFT Level %s: 没有可解锁的BCC (分层乘数: %.3f)', p_nft_level, member_balance.tier_multiplier);
    END IF;
    
    -- 更新会员余额
    UPDATE members_balance 
    SET bcc_locked = bcc_locked - actual_unlock_amount,
        bcc_balance = bcc_balance + actual_unlock_amount,
        bcc_total_unlocked = bcc_total_unlocked + actual_unlock_amount,
        updated_at = NOW()
    WHERE wallet_address = p_wallet_address;
    
    -- 记录BCC解锁交易
    INSERT INTO bcc_transactions (
        wallet_address,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        unlock_level,
        unlock_base_amount,
        tier_multiplier,
        description,
        reference_id
    ) VALUES (
        p_wallet_address,
        'unlock',
        actual_unlock_amount,
        member_balance.bcc_balance,
        member_balance.bcc_balance + actual_unlock_amount,
        p_nft_level,
        unlock_config.base_unlock_amount,
        member_balance.tier_multiplier,
        format('NFT %s (%s) 升级解锁: %.2f BCC (基础 %.0f × %.3f)', 
               p_nft_level, unlock_config.level_name, 
               actual_unlock_amount, unlock_config.base_unlock_amount, member_balance.tier_multiplier),
        p_reference_id
    );
    
    result_msg := format('NFT Level %s 解锁成功: %.2f BCC (基础 %.0f × 分层乘数 %.3f)', 
                        p_nft_level, actual_unlock_amount, 
                        unlock_config.base_unlock_amount, member_balance.tier_multiplier);
    
    RETURN result_msg;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN format('BCC解锁失败: %s', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 第7步：创建批量初始化现有会员余额的函数
-- ========================================

CREATE OR REPLACE FUNCTION initialize_all_members_balance()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    result_msg TEXT;
BEGIN
    -- 为所有还没有余额记录的会员初始化余额
    FOR member_rec IN 
        SELECT wallet_address, username, activation_id
        FROM membership m
        WHERE NOT EXISTS (
            SELECT 1 FROM members_balance mb 
            WHERE mb.wallet_address = m.wallet_address
        )
        ORDER BY activation_id
    LOOP
        BEGIN
            PERFORM initialize_member_balance(member_rec.wallet_address);
            success_count := success_count + 1;
            
            RAISE NOTICE '已初始化: % (激活序号: %)', member_rec.username, member_rec.activation_id;
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE WARNING '初始化失败: % - %', member_rec.username, SQLERRM;
        END;
    END LOOP;
    
    result_msg := format('批量初始化完成: 成功 %s 个, 失败 %s 个', success_count, error_count);
    RETURN result_msg;
END;
$$ LANGUAGE plpgsql;

-- 第8步：创建会员余额查询视图
-- ========================================

CREATE OR REPLACE VIEW members_balance_view AS
SELECT 
    m.activation_id,
    m.username,
    m.wallet_address,
    m.current_level,
    nml.level_name,
    
    -- USDT奖励
    mb.reward_balance,
    mb.reward_claimed,
    mb.total_reward,
    
    -- BCC余额
    mb.bcc_balance,
    mb.bcc_locked,
    mb.bcc_used,
    mb.bcc_total_unlocked,
    mb.bcc_balance + mb.bcc_locked as bcc_total_available,
    
    -- 分层信息
    mb.activation_tier,
    btc.tier_name,
    mb.tier_multiplier,
    btc.total_pool_bcc as tier_total_pool,
    
    -- 时间信息
    mb.created_at as balance_created,
    mb.updated_at as balance_updated
    
FROM membership m
LEFT JOIN members_balance mb ON m.wallet_address = mb.wallet_address
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN bcc_tier_config btc ON mb.activation_tier = btc.tier
ORDER BY m.activation_id;

-- 第9步：创建BCC交易历史视图
-- ========================================

CREATE OR REPLACE VIEW bcc_transaction_history AS
SELECT 
    bt.id,
    m.activation_id,
    m.username,
    bt.wallet_address,
    bt.transaction_type,
    bt.amount,
    bt.balance_before,
    bt.balance_after,
    bt.unlock_level,
    CASE WHEN bt.unlock_level IS NOT NULL 
         THEN nml.level_name 
         ELSE NULL END as unlock_level_name,
    bt.unlock_base_amount,
    bt.tier_multiplier,
    bt.description,
    bt.created_at
FROM bcc_transactions bt
JOIN membership m ON bt.wallet_address = m.wallet_address
LEFT JOIN nft_membership_levels nml ON bt.unlock_level = nml.level
ORDER BY bt.created_at DESC;

-- 第10步：创建会员升级触发器（自动解锁BCC）
-- ========================================

CREATE OR REPLACE FUNCTION trigger_bcc_unlock_on_level_up()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果等级提升，触发BCC解锁
    IF OLD.current_level IS NULL OR NEW.current_level > OLD.current_level THEN
        -- 为新等级解锁BCC
        PERFORM unlock_bcc_for_level(NEW.wallet_address, NEW.current_level);
        
        RAISE NOTICE '会员 % 升级到Level %, 已触发BCC解锁', 
                     NEW.username, NEW.current_level;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_bcc_unlock_on_membership_upgrade ON membership;
CREATE TRIGGER trigger_bcc_unlock_on_membership_upgrade
    AFTER UPDATE ON membership
    FOR EACH ROW
    EXECUTE FUNCTION trigger_bcc_unlock_on_level_up();

-- 第11步：显示系统状态和配置
-- ========================================

SELECT '=== BCC余额系统创建完成 ===' as status;

-- 显示BCC分层配置
SELECT '=== BCC分层配置 ===' as section;
SELECT tier, tier_name, 
       activation_range_start || ' - ' || activation_range_end as activation_range,
       multiplier, total_pool_bcc
FROM bcc_tier_config 
ORDER BY tier;

-- 显示BCC解锁配置
SELECT '=== BCC解锁配置 ===' as section;
SELECT level, level_name, base_unlock_amount as base_bcc,
       CASE 
           WHEN level <= 5 THEN base_unlock_amount || ' (Tier1) / ' || (base_unlock_amount * 0.5) || ' (Tier2) / ' || (base_unlock_amount * 0.25) || ' (Tier3) / ' || (base_unlock_amount * 0.125) || ' (Tier4)'
           ELSE base_unlock_amount::TEXT
       END as tier_amounts
FROM bcc_unlock_config 
ORDER BY level 
LIMIT 10;

-- 执行批量初始化（如果有现有会员）
SELECT '=== 批量初始化现有会员余额 ===' as section;
SELECT initialize_all_members_balance() as initialization_result;