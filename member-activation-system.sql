-- 创建完整的会员激活和BCC锁仓系统
-- Complete member activation and BCC staking system

BEGIN;

-- ===== 第1步：创建member_activation_tiers表 =====
-- Step 1: Create member_activation_tiers table

CREATE TABLE IF NOT EXISTS member_activation_tiers (
    tier INTEGER NOT NULL PRIMARY KEY,
    min_activation_rank INTEGER NOT NULL,
    max_activation_rank INTEGER NOT NULL,
    base_bcc_locked NUMERIC(18,8) NOT NULL, -- 基础锁仓BCC总量
    unlock_per_level NUMERIC(18,8) NOT NULL, -- 每级别解锁BCC
    tier_name VARCHAR(100) NOT NULL,
    tier_multiplier NUMERIC(5,4) NOT NULL DEFAULT 1.0, -- 阶段倍数
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入BCC锁仓阶段数据
-- 第一阶段：完整释放 (10450 BCC总量)
-- Level 1: 100, Level 2: 150, Level 3: 200, ..., Level 19: 1000
-- 计算公式：Level n释放 = 100 + (n-1)*50，到Level 19 = 1000
-- 总计：100+150+200+...+1000 = 10450 BCC
INSERT INTO member_activation_tiers (
    tier, min_activation_rank, max_activation_rank, 
    base_bcc_locked, unlock_per_level, tier_name, tier_multiplier
) VALUES
    (1, 1, 99999, 10450.0, 100.0, 'Tier 1: Full Release', 1.0),
    (2, 100000, 299999, 5225.0, 50.0, 'Tier 2: 50% Release', 0.5),
    (3, 300000, 999999, 2612.5, 25.0, 'Tier 3: 25% Release', 0.25),
    (4, 1000000, 2680000, 1306.25, 12.5, 'Tier 4: 12.5% Release', 0.125)
ON CONFLICT (tier) DO UPDATE SET
    min_activation_rank = EXCLUDED.min_activation_rank,
    max_activation_rank = EXCLUDED.max_activation_rank,
    base_bcc_locked = EXCLUDED.base_bcc_locked,
    unlock_per_level = EXCLUDED.unlock_per_level,
    tier_name = EXCLUDED.tier_name,
    tier_multiplier = EXCLUDED.tier_multiplier;

-- ===== 第2步：更新membership表结构 =====
-- Step 2: Update membership table structure

-- 确保membership表有正确的列
ALTER TABLE membership 
ADD COLUMN IF NOT EXISTS platform_activation_fee NUMERIC(10,2) DEFAULT 30.00,
ADD COLUMN IF NOT EXISTS member_created BOOLEAN DEFAULT FALSE;

-- 修复外键绑定 - referrer_wallet应该绑定到members表
ALTER TABLE membership DROP CONSTRAINT IF EXISTS membership_referrer_wallet_fkey;
ALTER TABLE membership 
ADD CONSTRAINT membership_referrer_wallet_fkey 
FOREIGN KEY (referrer_wallet) REFERENCES members(wallet_address) 
ON DELETE SET NULL;

-- ===== 第3步：创建BCC解锁计算函数 =====
-- Step 3: Create BCC unlock calculation functions

-- 根据激活等级计算每级别的BCC解锁数量
CREATE OR REPLACE FUNCTION calculate_level_bcc_unlock(
    p_level INTEGER,
    p_tier INTEGER DEFAULT 1
) RETURNS NUMERIC AS $$
DECLARE
    base_unlock NUMERIC;
    multiplier NUMERIC;
BEGIN
    -- 获取阶段倍数
    SELECT tier_multiplier INTO multiplier
    FROM member_activation_tiers 
    WHERE tier = p_tier;
    
    IF multiplier IS NULL THEN
        multiplier := 1.0;
    END IF;
    
    -- 计算基础解锁数量：Level n = 100 + (n-1) * 50
    -- Level 1: 100, Level 2: 150, Level 3: 200, ..., Level 19: 1000
    base_unlock := 100.0 + (p_level - 1) * 50.0;
    
    -- 应用阶段倍数
    RETURN base_unlock * multiplier;
END;
$$ LANGUAGE plpgsql;

-- 根据激活排名确定BCC阶段
CREATE OR REPLACE FUNCTION get_activation_tier_by_rank(p_activation_rank BIGINT)
RETURNS TABLE(
    tier INTEGER,
    tier_name VARCHAR(100),
    tier_multiplier NUMERIC,
    base_bcc_locked NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mat.tier,
        mat.tier_name,
        mat.tier_multiplier,
        mat.base_bcc_locked
    FROM member_activation_tiers mat
    WHERE p_activation_rank BETWEEN mat.min_activation_rank AND mat.max_activation_rank
    AND mat.is_active = TRUE
    ORDER BY mat.tier
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ===== 第4步：创建会员激活处理函数 =====
-- Step 4: Create member activation processing function

CREATE OR REPLACE FUNCTION process_level1_nft_activation(
    p_wallet_address VARCHAR(42),
    p_referrer_wallet VARCHAR(42) DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    activation_rank BIGINT,
    tier_info JSONB,
    placement_info JSONB
) AS $$
DECLARE
    new_activation_rank BIGINT;
    tier_data RECORD;
    membership_record RECORD;
    member_placement RECORD;
    total_bcc_locked NUMERIC;
    activation_fee NUMERIC := 30.00; -- 平台激活费
    layer1_reward NUMERIC := 100.00; -- Layer 1奖励
    total_payment NUMERIC := 130.00; -- 总支付 = 100 + 30
BEGIN
    -- 检查用户是否已经有Level 1激活记录
    SELECT * INTO membership_record 
    FROM membership 
    WHERE wallet_address = p_wallet_address 
    AND nft_level = 1;
    
    IF membership_record.id IS NOT NULL THEN
        -- 更新现有记录为已激活状态
        UPDATE membership 
        SET 
            activated_at = NOW(),
            claim_status = 'completed',
            member_created = TRUE,
            platform_activation_fee = activation_fee
        WHERE id = membership_record.id
        RETURNING activation_rank INTO new_activation_rank;
    ELSE
        -- 创建新的激活记录
        INSERT INTO membership (
            wallet_address,
            referrer_wallet,
            nft_level,
            claim_status,
            activated_at,
            member_created,
            platform_activation_fee
        ) VALUES (
            p_wallet_address,
            CASE 
                WHEN p_referrer_wallet IS NOT NULL THEN p_referrer_wallet
                ELSE (SELECT pre_referrer FROM users WHERE wallet_address = p_wallet_address)
            END,
            1,
            'completed',
            NOW(),
            TRUE,
            activation_fee
        ) RETURNING activation_rank INTO new_activation_rank;
    END IF;
    
    -- 获取激活阶段信息
    SELECT * INTO tier_data 
    FROM get_activation_tier_by_rank(new_activation_rank);
    
    -- 计算总锁仓BCC
    total_bcc_locked := tier_data.base_bcc_locked;
    
    -- 更新membership的阶段和BCC信息
    UPDATE membership 
    SET 
        activation_tier = tier_data.tier,
        bcc_locked_amount = total_bcc_locked,
        tier_multiplier = tier_data.tier_multiplier
    WHERE wallet_address = p_wallet_address AND nft_level = 1;
    
    -- 创建或更新members记录
    INSERT INTO members (
        wallet_address,
        referrer_wallet,
        is_activated,
        current_level,
        levels_owned,
        activation_rank,
        tier_level,
        bcc_locked_initial,
        bcc_locked_remaining,
        total_direct_referrals,
        created_at,
        updated_at
    ) VALUES (
        p_wallet_address,
        CASE 
            WHEN p_referrer_wallet IS NOT NULL THEN p_referrer_wallet
            ELSE (SELECT pre_referrer FROM users WHERE wallet_address = p_wallet_address)
        END,
        TRUE,
        1,
        '[1]'::jsonb,
        new_activation_rank,
        tier_data.tier,
        total_bcc_locked,
        total_bcc_locked - calculate_level_bcc_unlock(1, tier_data.tier),
        0,
        NOW(),
        NOW()
    ) ON CONFLICT (wallet_address) DO UPDATE SET
        is_activated = TRUE,
        current_level = GREATEST(members.current_level, 1),
        levels_owned = CASE 
            WHEN members.levels_owned ? '1' THEN members.levels_owned
            ELSE members.levels_owned || '[1]'::jsonb
        END,
        activation_rank = new_activation_rank,
        tier_level = tier_data.tier,
        bcc_locked_initial = total_bcc_locked,
        bcc_locked_remaining = total_bcc_locked - calculate_level_bcc_unlock(1, tier_data.tier),
        updated_at = NOW();
    
    -- 更新user_balances - 添加可转账BCC (Level 1解锁的部分)
    INSERT INTO user_balances (
        wallet_address,
        bcc_transferable,
        bcc_locked,
        created_at,
        updated_at
    ) VALUES (
        p_wallet_address,
        calculate_level_bcc_unlock(1, tier_data.tier), -- Level 1解锁的BCC
        total_bcc_locked - calculate_level_bcc_unlock(1, tier_data.tier), -- 剩余锁仓BCC
        NOW(),
        NOW()
    ) ON CONFLICT (wallet_address) DO UPDATE SET
        bcc_transferable = user_balances.bcc_transferable + calculate_level_bcc_unlock(1, tier_data.tier),
        bcc_locked = user_balances.bcc_locked + (total_bcc_locked - calculate_level_bcc_unlock(1, tier_data.tier)),
        updated_at = NOW();
    
    -- 处理推荐矩阵安置（如果有推荐人）
    IF p_referrer_wallet IS NOT NULL THEN
        -- 检查推荐人是否是激活会员
        IF EXISTS (SELECT 1 FROM members WHERE wallet_address = p_referrer_wallet AND is_activated = TRUE) THEN
            -- 使用现有的矩阵安置函数
            SELECT * INTO member_placement 
            FROM add_referral(p_referrer_wallet, p_wallet_address, 'direct');
            
            -- 更新推荐人的直推数量
            UPDATE members 
            SET 
                total_direct_referrals = total_direct_referrals + 1,
                updated_at = NOW()
            WHERE wallet_address = p_referrer_wallet;
        END IF;
    END IF;
    
    -- 返回结果
    RETURN QUERY SELECT 
        TRUE as success,
        format('Level 1 NFT activated! Rank: %s, Tier: %s, Total Payment: %s USDC (Activation Fee: %s, Layer Reward: %s)', 
               new_activation_rank, tier_data.tier_name, total_payment, activation_fee, layer1_reward) as message,
        new_activation_rank,
        jsonb_build_object(
            'tier', tier_data.tier,
            'tier_name', tier_data.tier_name,
            'tier_multiplier', tier_data.tier_multiplier,
            'base_bcc_locked', tier_data.base_bcc_locked,
            'level1_unlock', calculate_level_bcc_unlock(1, tier_data.tier)
        ) as tier_info,
        COALESCE(
            jsonb_build_object(
                'placement_success', member_placement.success,
                'placement_layer', member_placement.layer,
                'placement_position', member_placement.pos,
                'placement_parent', member_placement.parent_wallet
            ),
            jsonb_build_object('placement_success', false, 'reason', 'No referrer or referrer not activated')
        ) as placement_info;
END;
$$ LANGUAGE plpgsql;

-- ===== 第5步：创建索引优化 =====
-- Step 5: Create index optimizations

CREATE INDEX IF NOT EXISTS idx_member_activation_tiers_rank_range 
ON member_activation_tiers(min_activation_rank, max_activation_rank);

CREATE INDEX IF NOT EXISTS idx_membership_platform_fee 
ON membership(platform_activation_fee);

CREATE INDEX IF NOT EXISTS idx_membership_member_created 
ON membership(member_created);

-- ===== 第6步：创建激活费用和BCC分布视图 =====
-- Step 6: Create activation fee and BCC distribution views

CREATE OR REPLACE VIEW member_activation_summary AS
SELECT 
    mat.tier,
    mat.tier_name,
    mat.min_activation_rank,
    mat.max_activation_rank,
    mat.tier_multiplier,
    mat.base_bcc_locked,
    
    -- 每级别的解锁数量（前5级作为示例）
    calculate_level_bcc_unlock(1, mat.tier) as level1_unlock,
    calculate_level_bcc_unlock(2, mat.tier) as level2_unlock,
    calculate_level_bcc_unlock(3, mat.tier) as level3_unlock,
      calculate_level_bcc_unlock(4, mat.tier) as level4_unlock,
      calculate_level_bcc_unlock(5, mat.tier) as level5_unlock,
      calculate_level_bcc_unlock(6, mat.tier) as level6_unlock,
      calculate_level_bcc_unlock(7, mat.tier) as level7_unlock,
    calculate_level_bcc_unlock(8, mat.tier) as level8_unlock,
    calculate_level_bcc_unlock(9, mat.tier) as level9_unlock,
    calculate_level_bcc_unlock(10, mat.tier) as level10_unlock,
    calculate_level_bcc_unlock(11, mat.tier) as level11_unlock,
    calculate_level_bcc_unlock(12, mat.tier) as level12_unlock,
    calculate_level_bcc_unlock(13, mat.tier) as level13_unlock,
      calculate_level_bcc_unlock(14, mat.tier) as level14_unlock,
      calculate_level_bcc_unlock(15, mat.tier) as level15_unlock,
      calculate_level_bcc_unlock(16, mat.tier) as level16_unlock,
      calculate_level_bcc_unlock(17, mat.tier) as level17_unlock,
    calculate_level_bcc_unlock(18, mat.tier) as level18_unlock,
    calculate_level_bcc_unlock(19, mat.tier) as level19_unlock,
    
    -- 当前阶段的激活会员数量
    (SELECT COUNT(*) FROM membership m 
     WHERE m.activation_tier = mat.tier 
     AND m.activated_at IS NOT NULL) as current_activations,
    
    -- 剩余容量
    (mat.max_activation_rank - mat.min_activation_rank + 1) as tier_capacity,
    
    mat.is_active
FROM member_activation_tiers mat
WHERE mat.is_active = TRUE
ORDER BY mat.tier;

-- 显示激活费用结构
CREATE OR REPLACE VIEW activation_fee_structure AS
SELECT 
    'Level 1 NFT Activation' as service,
    100.00 as layer_reward_usdc,
    30.00 as platform_fee_usdc,
    130.00 as total_payment_usdc,
    'One-time activation fee, no fee for subsequent upgrades' as notes

UNION ALL

SELECT 
    'Subsequent Level Upgrades' as service,
    0.00 as layer_reward_usdc,
    0.00 as platform_fee_usdc,
    0.00 as total_payment_usdc,
    'No activation fees for Level 2-19 upgrades' as notes;

-- ===== 完成信息 =====
SELECT 'Member Activation System Created Successfully!' as status;
SELECT 'Key Features:' as features_header;
SELECT '✅ 4-tier BCC unlock system based on activation order' as feature1;
SELECT '✅ Level 1 NFT activation: 130 USDC (100 reward + 30 platform fee)' as feature2;
SELECT '✅ Automatic BCC calculation and distribution' as feature3;
SELECT '✅ Matrix placement integration' as feature4;
SELECT '✅ Referral and direct referral tracking' as feature5;

-- 显示BCC解锁示例
SELECT 'BCC Unlock Examples by Tier:' as unlock_header;
SELECT * FROM member_activation_summary;

COMMIT;