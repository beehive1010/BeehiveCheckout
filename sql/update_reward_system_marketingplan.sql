-- 更新奖励系统以符合MarketingPlan规范
-- NFT价格: Level 1=100 USDC, Level 2=150 USDC, Level 3=200 USDC, ..., Level 19=1000 USDC
-- 每级递增50 USDC

-- 1. 创建NFT价格计算函数
CREATE OR REPLACE FUNCTION get_nft_price(level_num INTEGER)
RETURNS NUMERIC AS $$
BEGIN
    IF level_num < 1 OR level_num > 19 THEN
        RETURN 0;
    END IF;
    
    -- Level 1: 100 USDC, 每级递增50 USDC
    -- Level N: 100 + (N-1) * 50 = 50 + N * 50
    RETURN 50 + (level_num * 50);
END;
$$ LANGUAGE plpgsql;

-- 2. 更新calculate_matrix_rewards函数以使用正确的NFT价格
CREATE OR REPLACE FUNCTION calculate_matrix_rewards(
    p_new_member_wallet TEXT,
    p_new_member_level INTEGER,  -- 新成员达到的级别
    p_matrix_root TEXT
)
RETURNS TABLE(
    reward_recipient TEXT,
    recipient_name TEXT,
    reward_type TEXT,
    reward_layer INTEGER,
    reward_amount NUMERIC,
    is_pending BOOLEAN,
    pending_reason TEXT
) AS $$
DECLARE
    matrix_root_level INTEGER;
BEGIN
    -- 获取matrix_root的当前级别
    SELECT COALESCE(current_level, 1) INTO matrix_root_level
    FROM members 
    WHERE wallet_address = p_matrix_root;
    
    -- 如果找不到会员信息，默认为Level 1
    IF matrix_root_level IS NULL THEN
        matrix_root_level := 1;
    END IF;
    
    RETURN QUERY
    WITH member_position AS (
        SELECT matrix_layer, matrix_position
        FROM spillover_matrix
        WHERE member_wallet = p_new_member_wallet
        AND matrix_root = p_matrix_root
    ),
    reward_calculation AS (
        SELECT 
            p_matrix_root as calc_recipient_wallet,
            COALESCE(u.username, 'Member_' || RIGHT(p_matrix_root, 4)) as calc_recipient_name,
            'Level ' || p_new_member_level || ' Achievement Reward (Layer ' || mp.matrix_layer || ')' as calc_reward_type,
            mp.matrix_layer as calc_reward_layer,
            -- 奖励 = 新成员达到级别的NFT价格
            get_nft_price(p_new_member_level) as calc_amount,
            -- 检查是否需要进入pending状态
            CASE 
                WHEN matrix_root_level >= p_new_member_level THEN false  -- 合格，立即可领取
                ELSE true  -- 不合格，进入pending状态
            END as calc_is_pending,
            CASE 
                WHEN matrix_root_level >= p_new_member_level THEN ''
                ELSE 'Root member level (' || matrix_root_level || ') < required level (' || p_new_member_level || '), reward pending for 72 hours'
            END as calc_pending_reason
        FROM member_position mp
        LEFT JOIN users u ON u.wallet_address = p_matrix_root
    )
    SELECT 
        calc_recipient_wallet,
        calc_recipient_name,
        calc_reward_type,
        calc_reward_layer,
        calc_amount,
        calc_is_pending,
        calc_pending_reason
    FROM reward_calculation;
END;
$$ LANGUAGE plpgsql;

-- 3. 更新触发奖励函数
CREATE OR REPLACE FUNCTION trigger_matrix_rewards_on_level_up(
    p_member_wallet TEXT,
    p_new_level INTEGER
)
RETURNS void AS $$
DECLARE
    matrix_record RECORD;
    reward_record RECORD;
BEGIN
    RAISE NOTICE '为会员 % 升级到Level % 触发matrix奖励...', 
        (SELECT COALESCE(username, 'Member_' || RIGHT(p_member_wallet, 4)) FROM users WHERE wallet_address = p_member_wallet),
        p_new_level;
    
    -- 为该会员在所有matrix中的位置计算奖励
    FOR matrix_record IN 
        SELECT DISTINCT matrix_root 
        FROM spillover_matrix 
        WHERE member_wallet = p_member_wallet
    LOOP
        -- 计算并记录奖励
        FOR reward_record IN 
            SELECT * FROM calculate_matrix_rewards(p_member_wallet, p_new_level, matrix_record.matrix_root)
        LOOP
            RAISE NOTICE '  奖励触发: % 获得 % 奖励金额: % USDC (Pending: %)',
                reward_record.recipient_name,
                reward_record.reward_type,
                reward_record.reward_amount,
                reward_record.is_pending;
                
            -- 这里可以插入到实际的reward_claims表
            -- INSERT INTO reward_claims (...)
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Layer 1 Right位置特殊奖励规则（需要升级到Level 2）
CREATE OR REPLACE FUNCTION trigger_layer1_right_reward(
    p_new_member_wallet TEXT,
    p_matrix_root TEXT
)
RETURNS void AS $$
DECLARE
    matrix_root_level INTEGER;
    direct_referrals_count INTEGER;
BEGIN
    -- 获取matrix_root的当前级别
    SELECT COALESCE(current_level, 1) INTO matrix_root_level
    FROM members 
    WHERE wallet_address = p_matrix_root;
    
    -- 检查直接推荐数量（来自referrals原始表）
    SELECT COUNT(*) INTO direct_referrals_count
    FROM referrals
    WHERE referrer_wallet = p_matrix_root
    AND is_active = true;
    
    -- Layer 1 Right位置奖励的特殊规则
    -- 1. Root必须升级到Level 2
    -- 2. Level 2升级需要至少3个直接推荐的活跃会员
    
    IF matrix_root_level >= 2 AND direct_referrals_count >= 3 THEN
        RAISE NOTICE 'Layer 1 Right位置奖励: % 符合条件 (Level: %, 直接推荐: %)', 
            (SELECT COALESCE(username, 'Member_' || RIGHT(p_matrix_root, 4)) FROM users WHERE wallet_address = p_matrix_root),
            matrix_root_level, 
            direct_referrals_count;
        -- 触发奖励
    ELSE
        RAISE NOTICE 'Layer 1 Right位置奖励: % 不符合条件 (Level: %, 直接推荐: %, 需要: Level 2 + 3直接推荐)', 
            (SELECT COALESCE(username, 'Member_' || RIGHT(p_matrix_root, 4)) FROM users WHERE wallet_address = p_matrix_root),
            matrix_root_level, 
            direct_referrals_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. 测试新的奖励系统
SELECT '=== 测试NFT价格计算 ===' as test_step;
SELECT level, get_nft_price(level) as nft_price 
FROM generate_series(1, 19) as level;

SELECT '=== 测试奖励计算 ===' as test_step;
-- 假设TestABC001升级到Level 2，为TestUser001的matrix触发奖励
SELECT * FROM calculate_matrix_rewards(
    'TestABC001', 
    2,  -- 升级到Level 2
    'TestUser001'
);