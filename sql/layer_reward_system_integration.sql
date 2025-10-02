-- 完整的Layer奖励系统集成
-- ========================================
-- 基于MarketingPlan.md和nft_membership_levels表的正确奖励机制
-- ========================================

-- 第1步：创建Layer奖励配置表
-- ========================================

CREATE TABLE layer_reward_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layer_number INTEGER NOT NULL CHECK (layer_number >= 1 AND layer_number <= 19),
    nft_level_required INTEGER NOT NULL CHECK (nft_level_required >= 1 AND nft_level_required <= 19),
    position_requirement VARCHAR(10), -- NULL表示任意位置，'R'表示只有R位置
    direct_referral_requirement INTEGER DEFAULT 0, -- 直推人数要求
    reward_source VARCHAR(20) NOT NULL DEFAULT 'nft_price', -- 奖励来源：nft_price
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(layer_number, position_requirement),
    FOREIGN KEY (nft_level_required) REFERENCES nft_membership_levels(level)
);

-- 插入Layer奖励配置（基于MarketingPlan.md规则）
INSERT INTO layer_reward_config (layer_number, nft_level_required, position_requirement, direct_referral_requirement) VALUES
(1, 1, 'L', 0),  -- Layer 1 Left位置，需要Level 1
(1, 1, 'M', 0),  -- Layer 1 Middle位置，需要Level 1  
(1, 2, 'R', 3),  -- Layer 1 Right位置，需要Level 2 + 3个直推
(2, 2, NULL, 0), -- Layer 2，需要Level 2
(3, 3, NULL, 0), -- Layer 3，需要Level 3
(4, 4, NULL, 0), -- Layer 4，需要Level 4
(5, 5, NULL, 0), -- Layer 5，需要Level 5
(6, 6, NULL, 0), -- Layer 6，需要Level 6
(7, 7, NULL, 0), -- Layer 7，需要Level 7
(8, 8, NULL, 0), -- Layer 8，需要Level 8
(9, 9, NULL, 0), -- Layer 9，需要Level 9
(10, 10, NULL, 0), -- Layer 10，需要Level 10
(11, 11, NULL, 0), -- Layer 11，需要Level 11
(12, 12, NULL, 0), -- Layer 12，需要Level 12
(13, 13, NULL, 0), -- Layer 13，需要Level 13
(14, 14, NULL, 0), -- Layer 14，需要Level 14
(15, 15, NULL, 0), -- Layer 15，需要Level 15
(16, 16, NULL, 0), -- Layer 16，需要Level 16
(17, 17, NULL, 0), -- Layer 17，需要Level 17
(18, 18, NULL, 0), -- Layer 18，需要Level 18
(19, 19, NULL, 0); -- Layer 19，需要Level 19

-- 第2步：创建Layer奖励记录表
-- ========================================

CREATE TABLE layer_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    triggering_member VARCHAR(42) NOT NULL, -- 触发奖励的成员
    reward_recipient VARCHAR(42) NOT NULL,  -- 奖励接收者（矩阵根）
    matrix_root VARCHAR(42) NOT NULL,       -- 矩阵根节点
    layer_number INTEGER NOT NULL,          -- 触发的层级
    matrix_position CHAR(1),                -- 触发位置 L/M/R
    nft_level INTEGER NOT NULL,             -- 触发的NFT等级
    reward_amount DECIMAL(18,6) NOT NULL,   -- 奖励金额（来自NFT价格）
    platform_fee DECIMAL(18,6) DEFAULT 0,  -- 平台费用
    net_reward DECIMAL(18,6) NOT NULL,      -- 净奖励（扣除平台费）
    
    -- 状态管理
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'claimable', 'claimed', 'forfeited', 'rolled_up')),
    root_level_requirement INTEGER NOT NULL, -- 根节点需要的等级
    root_current_level INTEGER NOT NULL,     -- 根节点当前等级
    direct_referral_count INTEGER DEFAULT 0, -- 根节点直推人数
    
    -- 时间管理
    pending_expires_at TIMESTAMP,           -- 待定状态过期时间（72小时）
    claimed_at TIMESTAMP,                   -- 领取时间
    rolled_up_to VARCHAR(42),               -- 滚动到的上级
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (triggering_member) REFERENCES membership(wallet_address),
    FOREIGN KEY (reward_recipient) REFERENCES membership(wallet_address),
    FOREIGN KEY (matrix_root) REFERENCES membership(wallet_address),
    FOREIGN KEY (nft_level) REFERENCES nft_membership_levels(level)
);

-- 创建索引
CREATE INDEX idx_layer_rewards_recipient ON layer_rewards(reward_recipient);
CREATE INDEX idx_layer_rewards_status ON layer_rewards(status);
CREATE INDEX idx_layer_rewards_expires ON layer_rewards(pending_expires_at);
CREATE INDEX idx_layer_rewards_matrix_root ON layer_rewards(matrix_root);

-- 第3步：创建奖励触发函数
-- ========================================

CREATE OR REPLACE FUNCTION trigger_layer_rewards(
    p_member_wallet VARCHAR(42),
    p_nft_level INTEGER
)
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    matrix_rec RECORD;
    config_rec RECORD;
    reward_amount DECIMAL(18,6);
    platform_fee DECIMAL(18,6);
    net_reward DECIMAL(18,6);
    direct_count INTEGER;
    root_level INTEGER;
    can_receive BOOLEAN;
    total_rewards INTEGER := 0;
BEGIN
    -- 获取成员信息
    SELECT * INTO member_rec 
    FROM membership 
    WHERE wallet_address = p_member_wallet;
    
    IF NOT FOUND THEN
        RETURN format('成员 %s 不存在', p_member_wallet);
    END IF;
    
    -- 获取NFT等级对应的奖励金额
    SELECT nft_price_usdt, platform_fee_usdt 
    INTO reward_amount, platform_fee
    FROM nft_membership_levels 
    WHERE level = p_nft_level;
    
    net_reward := reward_amount - COALESCE(platform_fee, 0);
    
    -- 为该成员在所有上级矩阵中触发奖励
    FOR matrix_rec IN 
        SELECT DISTINCT 
            mp.matrix_root,
            mp.matrix_layer,
            mp.matrix_position,
            m.current_level
        FROM matrix_placements mp
        JOIN membership m ON mp.matrix_root = m.wallet_address
        WHERE mp.member_wallet = p_member_wallet
        ORDER BY mp.matrix_layer
    LOOP
        -- 获取Layer奖励配置
        SELECT * INTO config_rec
        FROM layer_reward_config
        WHERE layer_number = matrix_rec.matrix_layer
        AND (position_requirement IS NULL OR position_requirement = matrix_rec.matrix_position)
        AND nft_level_required = p_nft_level
        AND is_active = true;
        
        IF FOUND THEN
            -- 获取根节点的当前等级和直推人数
            root_level := matrix_rec.current_level;
            
            SELECT COUNT(*) INTO direct_count
            FROM matrix_placements
            WHERE matrix_root = matrix_rec.matrix_root
            AND is_direct_referral = true;
            
            -- 检查是否满足奖励条件
            can_receive := true;
            
            -- 检查等级要求
            IF root_level < config_rec.nft_level_required THEN
                can_receive := false;
            END IF;
            
            -- 检查直推人数要求
            IF config_rec.direct_referral_requirement > 0 AND direct_count < config_rec.direct_referral_requirement THEN
                can_receive := false;
            END IF;
            
            -- 创建奖励记录
            INSERT INTO layer_rewards (
                triggering_member,
                reward_recipient,
                matrix_root,
                layer_number,
                matrix_position,
                nft_level,
                reward_amount,
                platform_fee,
                net_reward,
                status,
                root_level_requirement,
                root_current_level,
                direct_referral_count,
                pending_expires_at
            ) VALUES (
                p_member_wallet,
                matrix_rec.matrix_root,
                matrix_rec.matrix_root,
                matrix_rec.matrix_layer,
                matrix_rec.matrix_position,
                p_nft_level,
                reward_amount,
                platform_fee,
                net_reward,
                CASE WHEN can_receive THEN 'claimable' ELSE 'pending' END,
                config_rec.nft_level_required,
                root_level,
                direct_count,
                CASE WHEN NOT can_receive THEN NOW() + INTERVAL '72 hours' ELSE NULL END
            );
            
            total_rewards := total_rewards + 1;
        END IF;
    END LOOP;
    
    RETURN format('为成员 %s 的Level %s升级触发了 %s 个奖励', 
                  SUBSTRING(p_member_wallet, 1, 8), p_nft_level, total_rewards);
END;
$$ LANGUAGE plpgsql;

-- 第4步：创建奖励状态管理函数
-- ========================================

-- 处理过期的pending奖励（滚动到上级）
CREATE OR REPLACE FUNCTION process_expired_rewards()
RETURNS TEXT AS $$
DECLARE
    expired_rec RECORD;
    next_recipient VARCHAR(42);
    processed_count INTEGER := 0;
BEGIN
    -- 处理所有过期的pending奖励
    FOR expired_rec IN 
        SELECT * 
        FROM layer_rewards 
        WHERE status = 'pending' 
        AND pending_expires_at < NOW()
    LOOP
        -- 查找上级矩阵根节点作为滚动目标
        SELECT mp.matrix_root INTO next_recipient
        FROM matrix_placements mp
        JOIN membership m ON mp.matrix_root = m.wallet_address
        WHERE mp.member_wallet = expired_rec.matrix_root
        AND m.current_level >= expired_rec.root_level_requirement
        ORDER BY mp.matrix_layer
        LIMIT 1;
        
        IF next_recipient IS NOT NULL THEN
            -- 滚动给上级
            UPDATE layer_rewards 
            SET status = 'rolled_up',
                rolled_up_to = next_recipient,
                reward_recipient = next_recipient
            WHERE id = expired_rec.id;
        ELSE
            -- 没有符合条件的上级，标记为forfeited
            UPDATE layer_rewards 
            SET status = 'forfeited'
            WHERE id = expired_rec.id;
        END IF;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN format('处理了 %s 个过期奖励', processed_count);
END;
$$ LANGUAGE plpgsql;

-- 升级时检查pending奖励是否可以变为claimable
CREATE OR REPLACE FUNCTION check_pending_rewards_on_upgrade(
    p_wallet_address VARCHAR(42),
    p_new_level INTEGER
)
RETURNS TEXT AS $$
DECLARE
    updated_count INTEGER := 0;
    direct_count INTEGER;
BEGIN
    -- 获取直推人数
    SELECT COUNT(*) INTO direct_count
    FROM matrix_placements
    WHERE matrix_root = p_wallet_address
    AND is_direct_referral = true;
    
    -- 更新符合条件的pending奖励为claimable
    UPDATE layer_rewards 
    SET status = 'claimable',
        pending_expires_at = NULL,
        root_current_level = p_new_level,
        direct_referral_count = direct_count
    WHERE reward_recipient = p_wallet_address
    AND status = 'pending'
    AND root_level_requirement <= p_new_level
    AND (
        SELECT direct_referral_requirement 
        FROM layer_reward_config 
        WHERE layer_number = layer_rewards.layer_number
        AND (position_requirement IS NULL OR position_requirement = layer_rewards.matrix_position)
        AND nft_level_required = layer_rewards.nft_level
    ) <= direct_count;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN format('升级到Level %s后，%s 个奖励变为可领取', p_new_level, updated_count);
END;
$$ LANGUAGE plpgsql;

-- 第5步：创建综合奖励视图
-- ========================================

CREATE OR REPLACE VIEW layer_rewards_summary AS
WITH reward_stats AS (
    SELECT 
        reward_recipient,
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'claimable') as claimable_count,
        COUNT(*) FILTER (WHERE status = 'claimed') as claimed_count,
        COUNT(*) FILTER (WHERE status = 'forfeited') as forfeited_count,
        COUNT(*) FILTER (WHERE status = 'rolled_up') as rolled_up_count,
        SUM(net_reward) FILTER (WHERE status = 'claimable') as claimable_amount,
        SUM(net_reward) FILTER (WHERE status = 'claimed') as claimed_amount,
        SUM(net_reward) FILTER (WHERE status = 'pending') as pending_amount
    FROM layer_rewards
    GROUP BY reward_recipient
)
SELECT 
    m.activation_id as 激活序号,
    'USER_' || m.activation_id as 用户键,
    SUBSTRING(m.wallet_address, 1, 12) || '...' as 钱包地址,
    nml.level_name as 当前等级名称,
    m.current_level as 当前等级,
    COALESCE(rs.total_rewards, 0) as 总奖励数,
    COALESCE(rs.pending_count, 0) as 待定奖励,
    COALESCE(rs.claimable_count, 0) as 可领取奖励,
    COALESCE(rs.claimed_count, 0) as 已领取奖励,
    COALESCE(rs.forfeited_count, 0) as 失效奖励,
    COALESCE(rs.rolled_up_count, 0) as 滚动奖励,
    COALESCE(rs.claimable_amount, 0) as 可领取金额USDT,
    COALESCE(rs.claimed_amount, 0) as 已领取金额USDT,
    COALESCE(rs.pending_amount, 0) as 待定金额USDT
FROM membership m
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN reward_stats rs ON m.wallet_address = rs.reward_recipient
ORDER BY m.activation_id;

-- 第6步：创建奖励详情视图
-- ========================================

CREATE OR REPLACE VIEW layer_rewards_details AS
SELECT 
    lr.id,
    m1.activation_id as 触发者激活序号,
    'USER_' || m1.activation_id as 触发者用户键,
    SUBSTRING(lr.triggering_member, 1, 10) || '...' as 触发者地址,
    m2.activation_id as 接收者激活序号,
    'USER_' || m2.activation_id as 接收者用户键,
    SUBSTRING(lr.reward_recipient, 1, 10) || '...' as 接收者地址,
    lr.layer_number as 层级,
    lr.matrix_position as 位置,
    nml.level_name as NFT等级名称,
    lr.nft_level as NFT等级,
    lr.reward_amount as 奖励金额,
    lr.platform_fee as 平台费,
    lr.net_reward as 净奖励,
    lr.status as 状态,
    lr.root_level_requirement as 需要等级,
    lr.root_current_level as 当前等级,
    lr.direct_referral_count as 直推人数,
    CASE 
        WHEN lr.pending_expires_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (lr.pending_expires_at - NOW())) / 3600 
        ELSE NULL 
    END as 剩余小时,
    lr.created_at as 创建时间,
    lr.claimed_at as 领取时间
FROM layer_rewards lr
JOIN membership m1 ON lr.triggering_member = m1.wallet_address
JOIN membership m2 ON lr.reward_recipient = m2.wallet_address
JOIN nft_membership_levels nml ON lr.nft_level = nml.level
ORDER BY lr.created_at DESC;

-- 第7步：创建自动触发器
-- ========================================

-- 当membership的current_level更新时，自动触发相关操作
CREATE OR REPLACE FUNCTION membership_level_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果等级提升，触发Layer奖励
    IF OLD.current_level IS NULL OR NEW.current_level > OLD.current_level THEN
        -- 触发Layer奖励
        PERFORM trigger_layer_rewards(NEW.wallet_address, NEW.current_level);
        
        -- 检查pending奖励是否可以变为claimable
        PERFORM check_pending_rewards_on_upgrade(NEW.wallet_address, NEW.current_level);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS membership_level_update_trigger ON membership;
CREATE TRIGGER membership_level_update_trigger
    AFTER UPDATE ON membership
    FOR EACH ROW
    EXECUTE FUNCTION membership_level_trigger();

-- 第8步：创建定期任务函数（需要手动调用或设置cron）
-- ========================================

CREATE OR REPLACE FUNCTION daily_reward_maintenance()
RETURNS TEXT AS $$
BEGIN
    -- 处理过期的pending奖励
    PERFORM process_expired_rewards();
    
    RETURN '每日奖励维护完成：' || NOW()::text;
END;
$$ LANGUAGE plpgsql;

-- 第9步：显示系统状态
-- ========================================

SELECT '=== Layer奖励系统集成完成 ===' as status;
SELECT COUNT(*) || '条Layer奖励配置' as config_count FROM layer_reward_config;
SELECT COUNT(*) || '条奖励记录' as rewards_count FROM layer_rewards;

-- 显示奖励配置
SELECT '=== Layer奖励配置 ===' as section;
SELECT 
    lrc.layer_number as 层级,
    lrc.position_requirement as 位置要求,
    nml.level_name as 需要等级名称,
    lrc.nft_level_required as 需要等级,
    lrc.direct_referral_requirement as 直推要求,
    nml.nft_price_usdt as 奖励金额USDT
FROM layer_reward_config lrc
JOIN nft_membership_levels nml ON lrc.nft_level_required = nml.level
WHERE lrc.is_active = true
ORDER BY lrc.layer_number, lrc.position_requirement;

-- 显示奖励统计
SELECT '=== 奖励统计预览 ===' as section;
SELECT * FROM layer_rewards_summary WHERE 总奖励数 > 0 ORDER BY 激活序号 LIMIT 5;