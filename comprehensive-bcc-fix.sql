-- 综合BCC系统修复 - 基于实际表结构
-- Comprehensive BCC system fix - based on actual table structures

BEGIN;

-- ===== 第1步：删除所有有问题的视图和函数 =====
-- Step 1: Drop all problematic views and functions

DROP VIEW IF EXISTS bcc_unlock_details CASCADE;
DROP VIEW IF EXISTS member_activation_summary CASCADE;
DROP FUNCTION IF EXISTS calculate_level_bcc_unlock(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS calculate_total_bcc_locked(INTEGER) CASCADE;

-- ===== 第2步：重建BCC计算函数 - 基于member_activation_tiers表 =====
-- Step 2: Rebuild BCC calculation function based on member_activation_tiers table

CREATE OR REPLACE FUNCTION calculate_level_bcc_unlock(
    p_level INTEGER,
    p_tier INTEGER DEFAULT 1
) RETURNS NUMERIC AS $$
DECLARE
    tier_unlock_per_level NUMERIC;
    tier_multiplier NUMERIC;
    base_unlock NUMERIC;
BEGIN
    -- 从member_activation_tiers表获取每级解锁数量基数
    SELECT 
        unlock_per_level,
        CASE tier
            WHEN 1 THEN 1.000    -- 100%
            WHEN 2 THEN 0.500    -- 50%
            WHEN 3 THEN 0.250    -- 25%
            WHEN 4 THEN 0.125    -- 12.5%
            ELSE 1.000
        END as multiplier
    INTO tier_unlock_per_level, tier_multiplier
    FROM member_activation_tiers 
    WHERE tier = p_tier
    AND is_active = TRUE;
    
    -- 如果找不到阶段，使用Tier 1的默认值
    IF tier_unlock_per_level IS NULL THEN
        SELECT unlock_per_level INTO tier_unlock_per_level
        FROM member_activation_tiers 
        WHERE tier = 1 AND is_active = TRUE;
        tier_multiplier := 1.0;
    END IF;
    
    -- 如果仍然找不到，返回0
    IF tier_unlock_per_level IS NULL THEN
        RETURN 0;
    END IF;
    
    -- 计算基础解锁数量：使用tier的unlock_per_level作为Level 1的基数
    -- Level 1 = unlock_per_level, Level 2 = unlock_per_level + 50, Level 3 = unlock_per_level + 100, 等等
    base_unlock := tier_unlock_per_level + (p_level - 1) * 50.0;
    
    -- 应用阶段倍数
    RETURN base_unlock * tier_multiplier;
END;
$$ LANGUAGE plpgsql;

-- ===== 第3步：创建总BCC计算函数 =====
-- Step 3: Create total BCC calculation function

CREATE OR REPLACE FUNCTION calculate_total_bcc_locked(p_tier INTEGER DEFAULT 1)
RETURNS NUMERIC AS $$
DECLARE
    tier_base_bcc NUMERIC;
BEGIN
    -- 从member_activation_tiers表直接获取base_bcc_locked
    SELECT base_bcc_locked INTO tier_base_bcc
    FROM member_activation_tiers 
    WHERE tier = p_tier
    AND is_active = TRUE;
    
    -- 如果找不到，返回Tier 1的值
    IF tier_base_bcc IS NULL THEN
        SELECT base_bcc_locked INTO tier_base_bcc
        FROM member_activation_tiers 
        WHERE tier = 1 AND is_active = TRUE;
    END IF;
    
    -- 如果仍然找不到，返回0
    RETURN COALESCE(tier_base_bcc, 0);
END;
$$ LANGUAGE plpgsql;

-- ===== 第4步：重建BCC解锁详情视图 =====
-- Step 4: Rebuild BCC unlock details view

CREATE OR REPLACE VIEW bcc_unlock_details AS
SELECT 
    lc.level,
    lc.level_name,
    lc.base_bcc_unlock_amount,
    lc.price_usdt,
    lc.nft_price_usdt,
    lc.platform_fee_usdt,
    
    -- 各阶段的实际解锁数量（基于member_activation_tiers的计算）
    calculate_level_bcc_unlock(lc.level, 1) as tier1_unlock,
    calculate_level_bcc_unlock(lc.level, 2) as tier2_unlock, 
    calculate_level_bcc_unlock(lc.level, 3) as tier3_unlock,
    calculate_level_bcc_unlock(lc.level, 4) as tier4_unlock
    
FROM level_config lc
ORDER BY lc.level;

-- ===== 第5步：重建会员激活汇总视图 =====
-- Step 5: Rebuild member activation summary view

CREATE OR REPLACE VIEW member_activation_summary AS
SELECT 
    mat.tier,
    mat.tier_name,
    mat.min_activation_rank,
    mat.max_activation_rank,
    mat.base_bcc_locked,
    mat.unlock_per_level,
    
    -- 当前激活数量
    (SELECT COUNT(*) FROM membership m 
     WHERE m.activated_at IS NOT NULL 
     AND m.nft_level = 1) as current_activations,
    
    -- 各级别的BCC解锁数量（前几级作为示例）
    calculate_level_bcc_unlock(1, mat.tier) as level1_unlock,
    calculate_level_bcc_unlock(2, mat.tier) as level2_unlock,
    calculate_level_bcc_unlock(3, mat.tier) as level3_unlock,
    calculate_level_bcc_unlock(4, mat.tier) as level4_unlock,
    calculate_level_bcc_unlock(5, mat.tier) as level5_unlock,
    calculate_level_bcc_unlock(10, mat.tier) as level10_unlock,
    calculate_level_bcc_unlock(15, mat.tier) as level15_unlock,
    calculate_level_bcc_unlock(19, mat.tier) as level19_unlock,
    
    -- 总锁仓BCC（从表中直接获取）
    mat.base_bcc_locked as total_bcc_locked,
    
    -- 阶段状态
    CASE 
        WHEN (SELECT COUNT(*) FROM membership WHERE activated_at IS NOT NULL AND nft_level = 1) < mat.max_activation_rank THEN 'active'
        WHEN mat.tier = 4 THEN 'active' -- Tier 4永远活跃
        ELSE 'completed'
    END as tier_status,
    
    mat.is_active,
    mat.created_at
FROM member_activation_tiers mat
WHERE mat.is_active = TRUE
ORDER BY mat.tier;

-- ===== 第6步：更新动态阶段分配函数 =====
-- Step 6: Update dynamic tier assignment function

CREATE OR REPLACE FUNCTION get_current_activation_tier()
RETURNS TABLE(
    tier INTEGER,
    tier_name VARCHAR(100),
    bcc_multiplier NUMERIC,
    current_activations BIGINT,
    next_milestone INTEGER
) AS $$
DECLARE
    total_activated_members BIGINT;
    current_tier_record RECORD;
BEGIN
    -- 计算当前已激活的会员总数
    SELECT COUNT(*) INTO total_activated_members
    FROM membership 
    WHERE activated_at IS NOT NULL 
    AND nft_level = 1;
    
    -- 根据激活数量确定当前阶段
    SELECT * INTO current_tier_record
    FROM member_activation_tiers mat
    WHERE mat.is_active = TRUE
    AND (
        total_activated_members BETWEEN mat.min_activation_rank AND mat.max_activation_rank
        OR (mat.tier = 4 AND total_activated_members >= mat.min_activation_rank) -- Tier 4没有上限
    )
    ORDER BY mat.tier
    LIMIT 1;
    
    -- 如果没有找到，默认返回Tier 1
    IF current_tier_record IS NULL THEN
        SELECT * INTO current_tier_record
        FROM member_activation_tiers 
        WHERE tier = 1 AND is_active = TRUE;
    END IF;
    
    RETURN QUERY SELECT 
        current_tier_record.tier,
        current_tier_record.tier_name,
        CASE current_tier_record.tier
            WHEN 1 THEN 1.000::NUMERIC
            WHEN 2 THEN 0.500::NUMERIC
            WHEN 3 THEN 0.250::NUMERIC
            WHEN 4 THEN 0.125::NUMERIC
            ELSE 1.000::NUMERIC
        END,
        total_activated_members,
        current_tier_record.max_activation_rank;
END;
$$ LANGUAGE plpgsql;

-- ===== 第7步：更新会员激活处理函数 =====
-- Step 7: Update member activation processing function

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
    current_tier RECORD;
    membership_record RECORD;
    member_placement RECORD;
    total_bcc_locked NUMERIC;
    activation_fee NUMERIC := 30.00;
    layer1_reward NUMERIC := 100.00;
    total_payment NUMERIC := 130.00;
BEGIN
    -- 获取当前激活阶段
    SELECT * INTO current_tier 
    FROM get_current_activation_tier();
    
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
            platform_activation_fee = activation_fee,
            activation_tier = current_tier.tier,
            tier_multiplier = current_tier.bcc_multiplier
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
            platform_activation_fee,
            activation_tier,
            tier_multiplier
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
            activation_fee,
            current_tier.tier,
            current_tier.bcc_multiplier
        ) RETURNING activation_rank INTO new_activation_rank;
    END IF;
    
    -- 计算总锁仓BCC（从member_activation_tiers表获取）
    total_bcc_locked := calculate_total_bcc_locked(current_tier.tier);
    
    -- 更新membership的BCC信息
    UPDATE membership 
    SET bcc_locked_amount = total_bcc_locked
    WHERE wallet_address = p_wallet_address AND nft_level = 1;
    
    -- 创建或更新members记录
    INSERT INTO members (
        wallet_address,
        referrer_wallet,
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
        1,
        '[1]'::jsonb,
        new_activation_rank,
        current_tier.tier,
        total_bcc_locked,
        total_bcc_locked - calculate_level_bcc_unlock(1, current_tier.tier),
        0,
        NOW(),
        NOW()
    ) ON CONFLICT (wallet_address) DO UPDATE SET
        current_level = GREATEST(members.current_level, 1),
        levels_owned = CASE 
            WHEN members.levels_owned ? '1' THEN members.levels_owned
            ELSE members.levels_owned || '[1]'::jsonb
        END,
        activation_rank = new_activation_rank,
        tier_level = current_tier.tier,
        bcc_locked_initial = total_bcc_locked,
        bcc_locked_remaining = total_bcc_locked - calculate_level_bcc_unlock(1, current_tier.tier),
        updated_at = NOW();
    
    -- 更新user_balances
    INSERT INTO user_balances (
        wallet_address,
        bcc_transferable,
        bcc_locked,
        created_at,
        updated_at
    ) VALUES (
        p_wallet_address,
        calculate_level_bcc_unlock(1, current_tier.tier),
        total_bcc_locked - calculate_level_bcc_unlock(1, current_tier.tier),
        NOW(),
        NOW()
    ) ON CONFLICT (wallet_address) DO UPDATE SET
        bcc_transferable = user_balances.bcc_transferable + calculate_level_bcc_unlock(1, current_tier.tier),
        bcc_locked = user_balances.bcc_locked + (total_bcc_locked - calculate_level_bcc_unlock(1, current_tier.tier)),
        updated_at = NOW();
    
    -- 处理矩阵安置（如果有推荐人）
    IF p_referrer_wallet IS NOT NULL THEN
        -- 检查推荐人是否是激活会员
        IF EXISTS (
            SELECT 1 FROM membership 
            WHERE wallet_address = p_referrer_wallet 
            AND activated_at IS NOT NULL
        ) THEN
            -- 调用矩阵激活系统
            SELECT * INTO member_placement 
            FROM process_membership_activation(p_wallet_address, p_referrer_wallet);
            
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
        format('Level 1 NFT activated! Rank: %s, Tier: %s (%s), Total Payment: %s USDC (Fee: %s, Reward: %s)', 
               new_activation_rank, current_tier.tier, current_tier.tier_name, 
               total_payment, activation_fee, layer1_reward) as message,
        new_activation_rank,
        jsonb_build_object(
            'tier', current_tier.tier,
            'tier_name', current_tier.tier_name,
            'bcc_multiplier', current_tier.bcc_multiplier,
            'total_bcc_locked', total_bcc_locked,
            'level1_unlock', calculate_level_bcc_unlock(1, current_tier.tier),
            'current_activations', current_tier.current_activations,
            'next_milestone', current_tier.next_milestone
        ) as tier_info,
        COALESCE(
            jsonb_build_object(
                'matrix_placement', member_placement.success,
                'placement_info', member_placement.placement_info,
                'reward_info', member_placement.reward_info
            ),
            jsonb_build_object('matrix_placement', false, 'reason', 'No referrer or referrer not activated')
        ) as placement_info;
END;
$$ LANGUAGE plpgsql;

-- ===== 完成信息 =====
SELECT '🎉 Comprehensive BCC System Fixed Successfully!' as status;
SELECT 'System Features:' as features_header;
SELECT '✅ Uses member_activation_tiers.base_bcc_locked for total amounts' as feature1;
SELECT '✅ Uses member_activation_tiers.unlock_per_level for level calculations' as feature2;
SELECT '✅ Dynamic tier assignment: T1(100%), T2(50%), T3(25%), T4(12.5%)' as feature3;
SELECT '✅ All functions now work with correct table structures' as feature4;

-- 测试当前阶段
SELECT 'Current Activation Tier:' as current_tier_header;
SELECT * FROM get_current_activation_tier();

-- 测试BCC计算
SELECT 'BCC Calculation Test (Levels 1-5):' as bcc_test_header;
SELECT 
    'Level ' || i as level,
    calculate_level_bcc_unlock(i, 1) as tier1,
    calculate_level_bcc_unlock(i, 2) as tier2,
    calculate_level_bcc_unlock(i, 3) as tier3,
    calculate_level_bcc_unlock(i, 4) as tier4
FROM generate_series(1, 5) as i;

-- 显示member_activation_summary
SELECT 'Member Activation Summary:' as summary_header;
SELECT * FROM member_activation_summary;

COMMIT;