-- BCC 系统函数 - 基于 MarketingPlan.md 规范
-- 用于正确处理新用户激活和等级升级的 BCC 释放

-- 创建函数：获取用户的 Tier
CREATE OR REPLACE FUNCTION get_user_tier(activation_seq INTEGER)
RETURNS INTEGER AS $$
BEGIN
    CASE 
        WHEN activation_seq >= 1 AND activation_seq <= 9999 THEN
            RETURN 1;
        WHEN activation_seq >= 10000 AND activation_seq <= 29999 THEN
            RETURN 2;
        WHEN activation_seq >= 30000 AND activation_seq <= 99999 THEN
            RETURN 3;
        WHEN activation_seq >= 100000 AND activation_seq <= 268240 THEN
            RETURN 4;
        ELSE
            RETURN 4; -- 默认为 Tier 4
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：获取 Tier 的倍数
CREATE OR REPLACE FUNCTION get_tier_multiplier(tier INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    CASE tier
        WHEN 1 THEN RETURN 1.0;
        WHEN 2 THEN RETURN 0.5;
        WHEN 3 THEN RETURN 0.25;
        WHEN 4 THEN RETURN 0.125;
        ELSE RETURN 0.125;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：计算等级释放的 BCC 数量
CREATE OR REPLACE FUNCTION calculate_level_bcc_release(level INTEGER, tier INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    base_amount DECIMAL;
    multiplier DECIMAL;
BEGIN
    -- 基础释放数量（Tier 1）
    base_amount := CASE level
        WHEN 1 THEN 100
        WHEN 2 THEN 150
        WHEN 3 THEN 200
        WHEN 4 THEN 250
        WHEN 5 THEN 300
        WHEN 6 THEN 350
        WHEN 7 THEN 400
        WHEN 8 THEN 450
        WHEN 9 THEN 500
        WHEN 10 THEN 550
        WHEN 11 THEN 600
        WHEN 12 THEN 650
        WHEN 13 THEN 700
        WHEN 14 THEN 750
        WHEN 15 THEN 800
        WHEN 16 THEN 850
        WHEN 17 THEN 900
        WHEN 18 THEN 950
        WHEN 19 THEN 1000
        ELSE 0
    END;
    
    -- 获取 Tier 倍数
    multiplier := get_tier_multiplier(tier);
    
    RETURN base_amount * multiplier;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：初始化用户 BCC 余额（激活时调用）
CREATE OR REPLACE FUNCTION initialize_user_bcc_balance(wallet_addr TEXT, activation_seq INTEGER)
RETURNS JSONB AS $$
DECLARE
    user_tier INTEGER;
    tier_multiplier DECIMAL;
    level1_release DECIMAL;
    total_locked DECIMAL := 10450; -- Tier 1 总锁仓
    remaining_locked DECIMAL;
    new_activation_bonus DECIMAL := 500; -- 新激活奖励
    total_balance DECIMAL;
    result JSONB;
BEGIN
    -- 计算用户的 Tier
    user_tier := get_user_tier(activation_seq);
    tier_multiplier := get_tier_multiplier(user_tier);
    
    -- 计算 Level 1 释放数量
    level1_release := calculate_level_bcc_release(1, user_tier);
    
    -- 计算剩余锁仓
    remaining_locked := total_locked - level1_release;
    
    -- 计算总可用余额
    total_balance := new_activation_bonus + level1_release;
    
    -- 更新或插入 user_balances
    INSERT INTO user_balances (
        wallet_address,
        bcc_balance,
        bcc_locked,
        bcc_total_unlocked,
        activation_tier,
        tier_multiplier,
        last_updated
    )
    VALUES (
        LOWER(wallet_addr),
        total_balance,
        remaining_locked,
        total_balance,
        user_tier,
        tier_multiplier,
        NOW()
    )
    ON CONFLICT (wallet_address) 
    DO UPDATE SET
        bcc_balance = EXCLUDED.bcc_balance,
        bcc_locked = EXCLUDED.bcc_locked,
        bcc_total_unlocked = EXCLUDED.bcc_total_unlocked,
        activation_tier = EXCLUDED.activation_tier,
        tier_multiplier = EXCLUDED.tier_multiplier,
        last_updated = EXCLUDED.last_updated;
    
    -- 添加 BCC 释放日志
    INSERT INTO bcc_release_logs (
        wallet_address,
        from_level,
        to_level,
        bcc_released,
        bcc_remaining_locked,
        release_reason,
        created_at
    )
    VALUES (
        LOWER(wallet_addr),
        0,
        1,
        level1_release,
        remaining_locked,
        'Level 1 activation reward',
        NOW()
    );
    
    -- 返回结果
    result := jsonb_build_object(
        'success', true,
        'tier', user_tier,
        'tier_multiplier', tier_multiplier,
        'new_activation_bonus', new_activation_bonus,
        'level1_release', level1_release,
        'total_balance', total_balance,
        'remaining_locked', remaining_locked
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 创建函数：处理等级升级的 BCC 释放
CREATE OR REPLACE FUNCTION process_level_upgrade_bcc_release(
    wallet_addr TEXT, 
    from_level INTEGER, 
    to_level INTEGER
)
RETURNS JSONB AS $$
DECLARE
    user_tier INTEGER;
    release_amount DECIMAL;
    current_balance DECIMAL;
    current_locked DECIMAL;
    new_balance DECIMAL;
    new_locked DECIMAL;
    result JSONB;
BEGIN
    -- 获取用户当前的 Tier
    SELECT activation_tier INTO user_tier 
    FROM user_balances 
    WHERE LOWER(wallet_address) = LOWER(wallet_addr);
    
    IF user_tier IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User tier not found'
        );
    END IF;
    
    -- 计算释放数量
    release_amount := calculate_level_bcc_release(to_level, user_tier);
    
    -- 获取当前余额
    SELECT bcc_balance, bcc_locked 
    INTO current_balance, current_locked
    FROM user_balances 
    WHERE LOWER(wallet_address) = LOWER(wallet_addr);
    
    -- 计算新余额
    new_balance := current_balance + release_amount;
    new_locked := current_locked - release_amount;
    
    -- 确保锁仓不会变成负数
    IF new_locked < 0 THEN
        new_locked := 0;
        release_amount := current_locked;
        new_balance := current_balance + release_amount;
    END IF;
    
    -- 更新 user_balances
    UPDATE user_balances 
    SET 
        bcc_balance = new_balance,
        bcc_locked = new_locked,
        bcc_total_unlocked = bcc_total_unlocked + release_amount,
        last_updated = NOW()
    WHERE LOWER(wallet_address) = LOWER(wallet_addr);
    
    -- 添加释放日志
    INSERT INTO bcc_release_logs (
        wallet_address,
        from_level,
        to_level,
        bcc_released,
        bcc_remaining_locked,
        release_reason,
        created_at
    )
    VALUES (
        LOWER(wallet_addr),
        from_level,
        to_level,
        release_amount,
        new_locked,
        CONCAT('Level ', to_level, ' upgrade reward'),
        NOW()
    );
    
    -- 返回结果
    result := jsonb_build_object(
        'success', true,
        'tier', user_tier,
        'release_amount', release_amount,
        'new_balance', new_balance,
        'new_locked', new_locked
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 创建视图：BCC 系统概览
CREATE OR REPLACE VIEW bcc_system_overview AS
SELECT 
    ub.wallet_address,
    m.activation_sequence,
    ub.activation_tier,
    ub.tier_multiplier,
    ub.bcc_balance,
    ub.bcc_locked,
    ub.bcc_total_unlocked,
    m.current_level,
    (
        SELECT SUM(bcc_released) 
        FROM bcc_release_logs brl 
        WHERE LOWER(brl.wallet_address) = LOWER(ub.wallet_address)
    ) AS total_released,
    (
        SELECT COUNT(*) 
        FROM bcc_release_logs brl 
        WHERE LOWER(brl.wallet_address) = LOWER(ub.wallet_address)
    ) AS release_count
FROM user_balances ub
JOIN members m ON LOWER(ub.wallet_address) = LOWER(m.wallet_address)
ORDER BY m.activation_sequence;

-- 测试函数
\echo '🧪 测试 BCC 系统函数...';

-- 测试 Tier 计算
SELECT 
    get_user_tier(80) as tier_80,
    get_user_tier(10000) as tier_10000,
    get_user_tier(50000) as tier_50000,
    get_user_tier(200000) as tier_200000;

-- 测试 BCC 释放计算
SELECT 
    calculate_level_bcc_release(1, 1) as level1_tier1,
    calculate_level_bcc_release(2, 1) as level2_tier1,
    calculate_level_bcc_release(1, 2) as level1_tier2,
    calculate_level_bcc_release(19, 1) as level19_tier1;

\echo '✅ BCC 系统函数创建完成!';