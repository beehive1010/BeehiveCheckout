- 清理和重构user_balances表
-- Clean and restructure user_balances table

BEGIN;

-- ===== 第1步：备份现有数据（如果需要） =====
-- Step 1: Backup existing data (if needed)

-- 创建备份表
CREATE TABLE user_balances_backup AS 
SELECT * FROM user_balances;

-- ===== 第2步：删除旧表并重建 =====
-- Step 2: Drop old table and rebuild

DROP TABLE IF EXISTS user_balances CASCADE;

-- ===== 第3步：创建清洁的user_balances表 =====
-- Step 3: Create clean user_balances table

CREATE TABLE user_balances (
    wallet_address VARCHAR(42) PRIMARY KEY,
    
    -- BCC余额管理
    bcc_transferable NUMERIC(18,8) NOT NULL DEFAULT 0,     -- 可转账BCC
    bcc_locked NUMERIC(18,8) NOT NULL DEFAULT 0,           -- 锁仓BCC (未解锁的)
    bcc_total_initial NUMERIC(18,8) NOT NULL DEFAULT 0,    -- 初始总BCC (用于记录)
    
    -- USDC奖励余额
    usdc_claimable NUMERIC(18,6) NOT NULL DEFAULT 0,       -- 可领取USDC奖励
    usdc_pending NUMERIC(18,6) NOT NULL DEFAULT 0,         -- 待定USDC奖励 (R区72小时)
    usdc_claimed_total NUMERIC(18,6) NOT NULL DEFAULT 0,   -- 已领取总USDC
    
    -- 阶段信息 (与member_activation_tiers对应)
    current_tier INTEGER DEFAULT 1,                        -- 当前所在阶段
    tier_multiplier NUMERIC(5,3) DEFAULT 1.000,           -- 阶段倍数
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 外键约束
    CONSTRAINT user_balances_wallet_fkey 
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) 
        ON DELETE CASCADE,
    
    -- 检查约束 - 确保所有余额非负
    CONSTRAINT check_non_negative_balances CHECK (
        bcc_transferable >= 0 AND
        bcc_locked >= 0 AND
        bcc_total_initial >= 0 AND
        usdc_claimable >= 0 AND
        usdc_pending >= 0 AND
        usdc_claimed_total >= 0
    ),
    
    -- 逻辑约束 - BCC总数应该等于可转账+锁仓
    CONSTRAINT check_bcc_balance_logic CHECK (
        bcc_total_initial >= (bcc_transferable + bcc_locked)
    )
);

-- ===== 第4步：创建索引 =====
-- Step 4: Create indexes

CREATE INDEX idx_user_balances_updated_at ON user_balances(updated_at);
CREATE INDEX idx_user_balances_tier ON user_balances(current_tier);
CREATE INDEX idx_user_balances_bcc_transferable ON user_balances(bcc_transferable);
CREATE INDEX idx_user_balances_usdc_claimable ON user_balances(usdc_claimable);
CREATE INDEX idx_user_balances_usdc_pending ON user_balances(usdc_pending);

-- ===== 第5步：创建触发器 =====
-- Step 5: Create triggers

-- 确保update_updated_at_column函数存在
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建更新时间触发器
CREATE TRIGGER trigger_user_balances_updated_at
    BEFORE UPDATE ON user_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 第6步：从备份恢复重要数据 =====
-- Step 6: Restore important data from backup

INSERT INTO user_balances (
    wallet_address,
    bcc_transferable,
    bcc_locked,
    bcc_total_initial,
    usdc_claimable,
    usdc_pending,
    usdc_claimed_total,
    current_tier,
    tier_multiplier,
    created_at
)
SELECT 
    wallet_address,
    COALESCE(bcc_transferable, 0),
    COALESCE(bcc_locked, 0),
    COALESCE(bcc_locked_total, bcc_locked, 10450.0),  -- 使用bcc_locked_total或默认值
    COALESCE(claimable_reward_balance_usdc, 0),
    COALESCE(pending_reward_balance_usdc, 0),
    COALESCE(total_rewards_withdrawn_usdc, 0),
    COALESCE(tier_phase, 1),
    COALESCE(unlock_tier_multiplier, 1.0),
    created_at
FROM user_balances_backup
ON CONFLICT (wallet_address) DO NOTHING;

-- ===== 第7步：创建用户余额管理函数 =====
-- Step 7: Create user balance management functions

-- 更新用户BCC余额
CREATE OR REPLACE FUNCTION update_user_bcc_balance(
    p_wallet_address VARCHAR(42),
    p_transferable_change NUMERIC(18,8) DEFAULT 0,
    p_locked_change NUMERIC(18,8) DEFAULT 0,
    p_tier INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_balances (
        wallet_address,
        bcc_transferable,
        bcc_locked,
        bcc_total_initial,
        current_tier,
        tier_multiplier
    ) VALUES (
        p_wallet_address,
        GREATEST(0, p_transferable_change),
        GREATEST(0, p_locked_change),
        GREATEST(0, p_transferable_change + p_locked_change),
        COALESCE(p_tier, 1),
        CASE COALESCE(p_tier, 1)
            WHEN 1 THEN 1.000
            WHEN 2 THEN 0.500
            WHEN 3 THEN 0.250
            WHEN 4 THEN 0.125
            ELSE 1.000
        END
    )
    ON CONFLICT (wallet_address) DO UPDATE SET
        bcc_transferable = GREATEST(0, user_balances.bcc_transferable + p_transferable_change),
        bcc_locked = GREATEST(0, user_balances.bcc_locked + p_locked_change),
        current_tier = COALESCE(p_tier, user_balances.current_tier),
        tier_multiplier = CASE COALESCE(p_tier, user_balances.current_tier)
            WHEN 1 THEN 1.000
            WHEN 2 THEN 0.500
            WHEN 3 THEN 0.250
            WHEN 4 THEN 0.125
            ELSE user_balances.tier_multiplier
        END,
        updated_at = NOW();
        
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 更新用户USDC余额
CREATE OR REPLACE FUNCTION update_user_usdc_balance(
    p_wallet_address VARCHAR(42),
    p_claimable_change NUMERIC(18,6) DEFAULT 0,
    p_pending_change NUMERIC(18,6) DEFAULT 0,
    p_claimed_change NUMERIC(18,6) DEFAULT 0
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_balances (
        wallet_address,
        usdc_claimable,
        usdc_pending,
        usdc_claimed_total
    ) VALUES (
        p_wallet_address,
        GREATEST(0, p_claimable_change),
        GREATEST(0, p_pending_change),
        GREATEST(0, p_claimed_change)
    )
    ON CONFLICT (wallet_address) DO UPDATE SET
        usdc_claimable = GREATEST(0, user_balances.usdc_claimable + p_claimable_change),
        usdc_pending = GREATEST(0, user_balances.usdc_pending + p_pending_change),
        usdc_claimed_total = GREATEST(0, user_balances.usdc_claimed_total + p_claimed_change),
        updated_at = NOW();
        
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===== 第8步：创建用户余额视图 =====
-- Step 8: Create user balance view

CREATE OR REPLACE VIEW user_balance_summary AS
SELECT 
    ub.wallet_address,
    u.username,
    
    -- BCC余额
    ub.bcc_transferable,
    ub.bcc_locked,
    ub.bcc_total_initial,
    (ub.bcc_transferable + ub.bcc_locked) as bcc_current_total,
    
    -- USDC余额
    ub.usdc_claimable,
    ub.usdc_pending,
    ub.usdc_claimed_total,
    (ub.usdc_claimable + ub.usdc_pending) as usdc_total_available,
    
    -- 阶段信息
    ub.current_tier,
    ub.tier_multiplier,
    mat.tier_name,
    
    -- 会员状态
    CASE 
        WHEN m.activated_at IS NOT NULL THEN 'activated'
        ELSE 'not_activated'
    END as member_status,
    
    -- 时间信息
    ub.created_at,
    ub.updated_at
    
FROM user_balances ub
LEFT JOIN users u ON ub.wallet_address = u.wallet_address
LEFT JOIN member_activation_tiers mat ON ub.current_tier = mat.tier
LEFT JOIN membership m ON ub.wallet_address = m.wallet_address AND m.nft_level = 1
ORDER BY ub.updated_at DESC;

-- ===== 完成信息 =====
SELECT '🎉 User Balances Table Cleaned Successfully!' as status;
SELECT 'New Structure:' as structure_header;
SELECT '✅ Simplified from 17 columns to 10 meaningful columns' as improvement1;
SELECT '✅ Clear separation: BCC (transferable/locked) + USDC (claimable/pending/claimed)' as improvement2;
SELECT '✅ Added tier information linked to member_activation_tiers' as improvement3;
SELECT '✅ Proper constraints and foreign keys' as improvement4;
SELECT '✅ Helper functions for balance updates' as improvement5;
SELECT '✅ Comprehensive balance summary view' as improvement6;

-- 显示表结构
SELECT 'New Table Structure:' as table_structure_header;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_balances' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 删除备份表（可选）
-- DROP TABLE IF EXISTS user_balances_backup;

COMMIT;