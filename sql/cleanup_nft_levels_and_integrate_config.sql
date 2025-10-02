-- 删除nft_levels表并整合nft_membership_levels为主配置表
-- ========================================
-- 绑定layer_rewards_rules配置系统
-- ========================================

-- 第1步：删除旧的nft_levels表和相关依赖
-- ========================================

-- 删除可能存在的外键约束和依赖
DROP TABLE IF EXISTS nft_levels CASCADE;
DROP VIEW IF EXISTS nft_levels_view CASCADE;

-- 第2步：创建layer_rewards_rules配置表
-- ========================================

CREATE TABLE layer_rewards_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layer_number INTEGER NOT NULL CHECK (layer_number >= 1 AND layer_number <= 19),
    matrix_position CHAR(1) CHECK (matrix_position IN ('L', 'M', 'R')), -- NULL表示任意位置
    required_nft_level INTEGER NOT NULL, -- 绑定到nft_membership_levels.level
    direct_referral_minimum INTEGER DEFAULT 0, -- 最少直推人数要求
    reward_multiplier DECIMAL(5,2) DEFAULT 1.0, -- 奖励倍数（通常为1.0，奖励=NFT价格）
    is_special_rule BOOLEAN DEFAULT false, -- 是否特殊规则（如Layer 1 R位置）
    rule_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(layer_number, matrix_position, required_nft_level),
    FOREIGN KEY (required_nft_level) REFERENCES nft_membership_levels(level) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_layer_rewards_rules_layer ON layer_rewards_rules(layer_number);
CREATE INDEX idx_layer_rewards_rules_level ON layer_rewards_rules(required_nft_level);
CREATE INDEX idx_layer_rewards_rules_position ON layer_rewards_rules(matrix_position);

-- 第3步：插入layer_rewards_rules配置数据
-- ========================================

-- Layer 1 特殊规则（基于MarketingPlan.md）
INSERT INTO layer_rewards_rules (
    layer_number, matrix_position, required_nft_level, direct_referral_minimum, 
    is_special_rule, rule_description
) VALUES 
-- Layer 1 L和M位置：需要Level 1，无直推要求
(1, 'L', 1, 0, false, 'Layer 1 Left position reward - requires Level 1 NFT'),
(1, 'M', 1, 0, false, 'Layer 1 Middle position reward - requires Level 1 NFT'),
-- Layer 1 R位置：需要Level 2 + 3个直推（特殊规则）
(1, 'R', 2, 3, true, 'Layer 1 Right position reward - requires Level 2 NFT + 3 direct referrals');

-- Layer 2-19 通用规则：每层需要对应等级
INSERT INTO layer_rewards_rules (
    layer_number, matrix_position, required_nft_level, direct_referral_minimum, 
    is_special_rule, rule_description
) 
SELECT 
    level as layer_number,
    NULL as matrix_position, -- 任意位置
    level as required_nft_level,
    0 as direct_referral_minimum,
    false as is_special_rule,
    'Layer ' || level || ' reward - requires Level ' || level || ' NFT (' || level_name || ')'
FROM nft_membership_levels
WHERE level >= 2 AND level <= 19;

-- 第4步：更新layer_rewards表结构
-- ========================================

-- 删除旧的layer_rewards表并重新创建
DROP TABLE IF EXISTS layer_rewards CASCADE;

CREATE TABLE layer_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 触发信息
    triggering_member VARCHAR(42) NOT NULL, -- 触发奖励的成员
    triggering_nft_level INTEGER NOT NULL,  -- 触发的NFT等级
    
    -- 接收信息  
    reward_recipient VARCHAR(42) NOT NULL,  -- 奖励接收者（矩阵根）
    matrix_root VARCHAR(42) NOT NULL,       -- 矩阵根节点
    
    -- 层级和位置信息
    layer_number INTEGER NOT NULL,          -- 触发的层级
    matrix_position CHAR(1),                -- 触发位置 L/M/R
    
    -- 奖励计算（基于nft_membership_levels）
    base_nft_price DECIMAL(18,6) NOT NULL,  -- 基础NFT价格
    platform_fee DECIMAL(18,6) DEFAULT 0,   -- 平台费用
    reward_multiplier DECIMAL(5,2) DEFAULT 1.0, -- 奖励倍数
    final_reward_amount DECIMAL(18,6) NOT NULL,  -- 最终奖励金额
    
    -- 资格验证
    recipient_current_level INTEGER NOT NULL,    -- 接收者当前等级
    required_nft_level INTEGER NOT NULL,         -- 需要的NFT等级
    direct_referral_count INTEGER DEFAULT 0,     -- 接收者直推人数
    required_direct_referrals INTEGER DEFAULT 0, -- 需要的直推人数
    
    -- 状态管理
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'claimable', 'claimed', 'forfeited', 'rolled_up')),
    eligibility_met BOOLEAN DEFAULT false,       -- 是否满足资格条件
    
    -- 时间管理
    pending_expires_at TIMESTAMP,              -- 待定状态过期时间（72小时）
    claimed_at TIMESTAMP,                      -- 领取时间
    rolled_up_to VARCHAR(42),                  -- 滚动到的上级
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- 外键约束
    FOREIGN KEY (triggering_member) REFERENCES membership(wallet_address),
    FOREIGN KEY (reward_recipient) REFERENCES membership(wallet_address),
    FOREIGN KEY (matrix_root) REFERENCES membership(wallet_address),
    FOREIGN KEY (triggering_nft_level) REFERENCES nft_membership_levels(level),
    FOREIGN KEY (required_nft_level) REFERENCES nft_membership_levels(level)
);

-- 创建索引
CREATE INDEX idx_layer_rewards_recipient ON layer_rewards(reward_recipient);
CREATE INDEX idx_layer_rewards_status ON layer_rewards(status);
CREATE INDEX idx_layer_rewards_expires ON layer_rewards(pending_expires_at);
CREATE INDEX idx_layer_rewards_layer ON layer_rewards(layer_number);
CREATE INDEX idx_layer_rewards_eligibility ON layer_rewards(eligibility_met);

-- 第5步：重新创建奖励触发函数
-- ========================================

CREATE OR REPLACE FUNCTION trigger_layer_rewards_v2(
    p_member_wallet VARCHAR(42),
    p_nft_level INTEGER
)
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    matrix_rec RECORD;
    rule_rec RECORD;
    nft_info RECORD;
    direct_count INTEGER;
    eligibility_met BOOLEAN;
    final_amount DECIMAL(18,6);
    total_rewards INTEGER := 0;
BEGIN
    -- 获取成员信息
    SELECT * INTO member_rec 
    FROM membership 
    WHERE wallet_address = p_member_wallet;
    
    IF NOT FOUND THEN
        RETURN format('成员 %s 不存在', p_member_wallet);
    END IF;
    
    -- 获取NFT等级信息
    SELECT * INTO nft_info
    FROM nft_membership_levels 
    WHERE level = p_nft_level;
    
    -- 为该成员在所有上级矩阵中触发奖励
    FOR matrix_rec IN 
        SELECT DISTINCT 
            mp.matrix_root,
            mp.matrix_layer,
            mp.matrix_position,
            m.current_level,
            m.activation_id
        FROM matrix_placements mp
        JOIN membership m ON mp.matrix_root = m.wallet_address
        WHERE mp.member_wallet = p_member_wallet
        AND mp.matrix_layer <= 19 -- 最多19层
        ORDER BY mp.matrix_layer
    LOOP
        -- 查找适用的奖励规则
        SELECT * INTO rule_rec
        FROM layer_rewards_rules
        WHERE layer_number = matrix_rec.matrix_layer
        AND (matrix_position IS NULL OR matrix_position = matrix_rec.matrix_position)
        AND required_nft_level <= p_nft_level -- 触发等级必须达到要求
        AND is_active = true
        ORDER BY 
            CASE WHEN matrix_position = matrix_rec.matrix_position THEN 1 ELSE 2 END, -- 精确位置匹配优先
            required_nft_level DESC -- 更高等级要求优先
        LIMIT 1;
        
        IF FOUND THEN
            -- 获取接收者的直推人数
            SELECT COUNT(*) INTO direct_count
            FROM matrix_placements
            WHERE matrix_root = matrix_rec.matrix_root
            AND is_direct_referral = true;
            
            -- 检查资格条件
            eligibility_met := true;
            
            -- 检查NFT等级要求
            IF matrix_rec.current_level < rule_rec.required_nft_level THEN
                eligibility_met := false;
            END IF;
            
            -- 检查直推人数要求
            IF direct_count < rule_rec.direct_referral_minimum THEN
                eligibility_met := false;
            END IF;
            
            -- 计算最终奖励金额
            final_amount := nft_info.nft_price_usdt * rule_rec.reward_multiplier;
            
            -- 创建奖励记录
            INSERT INTO layer_rewards (
                triggering_member,
                triggering_nft_level,
                reward_recipient,
                matrix_root,
                layer_number,
                matrix_position,
                base_nft_price,
                platform_fee,
                reward_multiplier,
                final_reward_amount,
                recipient_current_level,
                required_nft_level,
                direct_referral_count,
                required_direct_referrals,
                status,
                eligibility_met,
                pending_expires_at
            ) VALUES (
                p_member_wallet,
                p_nft_level,
                matrix_rec.matrix_root,
                matrix_rec.matrix_root,
                matrix_rec.matrix_layer,
                matrix_rec.matrix_position,
                nft_info.nft_price_usdt,
                nft_info.platform_fee_usdt,
                rule_rec.reward_multiplier,
                final_amount,
                matrix_rec.current_level,
                rule_rec.required_nft_level,
                direct_count,
                rule_rec.direct_referral_minimum,
                CASE WHEN eligibility_met THEN 'claimable' ELSE 'pending' END,
                eligibility_met,
                CASE WHEN NOT eligibility_met THEN NOW() + INTERVAL '72 hours' ELSE NULL END
            );
            
            total_rewards := total_rewards + 1;
            
            RAISE NOTICE 'USER_%: Level % 在 USER_% 的 Layer%-% 触发奖励 %USDT (状态: %)', 
                member_rec.activation_id, p_nft_level, matrix_rec.activation_id,
                matrix_rec.matrix_layer, COALESCE(matrix_rec.matrix_position, 'ANY'),
                final_amount, CASE WHEN eligibility_met THEN 'claimable' ELSE 'pending' END;
        END IF;
    END LOOP;
    
    RETURN format('USER_%s Level %s 升级触发了 %s 个奖励', 
                  member_rec.activation_id, p_nft_level, total_rewards);
END;
$$ LANGUAGE plpgsql;

-- 第6步：创建综合配置视图
-- ========================================

CREATE OR REPLACE VIEW nft_layer_rewards_config AS
SELECT 
    lrr.layer_number as 层级,
    COALESCE(lrr.matrix_position, 'ANY') as 位置要求,
    nml.level as NFT等级,
    nml.level_name as NFT等级名称,
    nml.nft_price_usdt as NFT价格USDT,
    nml.tier as 等级档次,
    lrr.direct_referral_minimum as 最少直推要求,
    lrr.reward_multiplier as 奖励倍数,
    (nml.nft_price_usdt * lrr.reward_multiplier) as 奖励金额USDT,
    lrr.is_special_rule as 是否特殊规则,
    lrr.rule_description as 规则描述,
    lrr.is_active as 是否激活
FROM layer_rewards_rules lrr
JOIN nft_membership_levels nml ON lrr.required_nft_level = nml.level
WHERE lrr.is_active = true
ORDER BY lrr.layer_number, lrr.matrix_position, lrr.required_nft_level;

-- 第7步：创建奖励统计视图
-- ========================================

CREATE OR REPLACE VIEW member_rewards_summary AS
WITH reward_stats AS (
    SELECT 
        reward_recipient,
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'claimable') as claimable_count,
        COUNT(*) FILTER (WHERE status = 'claimed') as claimed_count,
        COUNT(*) FILTER (WHERE status = 'forfeited') as forfeited_count,
        COUNT(*) FILTER (WHERE status = 'rolled_up') as rolled_up_count,
        COUNT(*) FILTER (WHERE eligibility_met = true) as eligible_count,
        COUNT(*) FILTER (WHERE eligibility_met = false) as ineligible_count,
        SUM(final_reward_amount) FILTER (WHERE status = 'claimable') as claimable_amount,
        SUM(final_reward_amount) FILTER (WHERE status = 'claimed') as claimed_amount,
        SUM(final_reward_amount) FILTER (WHERE status = 'pending') as pending_amount
    FROM layer_rewards
    GROUP BY reward_recipient
)
SELECT 
    m.activation_id as 激活序号,
    'USER_' || m.activation_id as 用户键,
    SUBSTRING(m.wallet_address, 1, 12) || '...' as 钱包地址,
    nml.level_name as 当前等级名称,
    m.current_level as 当前等级,
    nml.nft_price_usdt as 当前等级价格USDT,
    COALESCE(rs.total_rewards, 0) as 总奖励数,
    COALESCE(rs.eligible_count, 0) as 符合条件奖励,
    COALESCE(rs.ineligible_count, 0) as 不符合条件奖励,
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

-- 第8步：更新升级触发器
-- ========================================

CREATE OR REPLACE FUNCTION membership_level_upgrade_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果等级提升，触发Layer奖励
    IF OLD.current_level IS NULL OR NEW.current_level > OLD.current_level THEN
        -- 使用新版本的奖励触发函数
        PERFORM trigger_layer_rewards_v2(NEW.wallet_address, NEW.current_level);
        
        -- 检查待定奖励是否可以升级为可领取
        UPDATE layer_rewards 
        SET status = 'claimable',
            eligibility_met = true,
            pending_expires_at = NULL,
            recipient_current_level = NEW.current_level
        WHERE reward_recipient = NEW.wallet_address
        AND status = 'pending'
        AND required_nft_level <= NEW.current_level
        AND direct_referral_count >= required_direct_referrals;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 重新创建触发器
DROP TRIGGER IF EXISTS membership_level_update_trigger ON membership;
CREATE TRIGGER membership_level_update_trigger
    AFTER UPDATE ON membership
    FOR EACH ROW
    EXECUTE FUNCTION membership_level_upgrade_trigger();

-- 第9步：显示系统状态
-- ========================================

SELECT '=== nft_levels已删除，nft_membership_levels集成完成 ===' as status;
SELECT COUNT(*) || '条奖励规则配置' as rules_count FROM layer_rewards_rules;
SELECT COUNT(*) || '个NFT等级配置' as nft_levels_count FROM nft_membership_levels;

-- 显示整合后的配置
SELECT '=== NFT等级和Layer奖励规则配置 ===' as section;
SELECT * FROM nft_layer_rewards_config ORDER BY 层级, 位置要求, NFT等级;

-- 显示成员奖励统计预览
SELECT '=== 成员奖励统计预览 ===' as section;
SELECT * FROM member_rewards_summary WHERE 总奖励数 > 0 ORDER BY 激活序号 LIMIT 5;