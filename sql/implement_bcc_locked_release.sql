-- 实现BCC锁仓释放机制
-- 根据MarketingPlan: 每激活一个等级释放对应NFT价格的BCC
-- Level 1: 100 BCC, Level 2: 150 BCC, ..., Level 19: 1000 BCC

BEGIN;

SELECT '=== 实现BCC锁仓释放系统 ===' as step;

-- 1. 创建BCC释放记录表
CREATE TABLE IF NOT EXISTS bcc_release_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address character varying(42) NOT NULL,
    from_level integer NOT NULL,
    to_level integer NOT NULL,
    bcc_released numeric(20,8) NOT NULL,
    bcc_remaining_locked numeric(20,8) NOT NULL,
    release_reason text DEFAULT 'Level Up',
    created_at timestamp with time zone DEFAULT now()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_bcc_release_logs_wallet ON bcc_release_logs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_bcc_release_logs_created_at ON bcc_release_logs(created_at);

-- 2. 创建BCC释放计算函数
CREATE OR REPLACE FUNCTION calculate_bcc_release_amount(
    p_from_level INTEGER,
    p_to_level INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
    total_release NUMERIC := 0;
    current_level INTEGER;
BEGIN
    -- 确保级别范围有效
    IF p_from_level >= p_to_level OR p_from_level < 1 OR p_to_level > 19 THEN
        RETURN 0;
    END IF;
    
    -- 计算从from_level+1到to_level的累积释放量
    FOR current_level IN (p_from_level + 1)..p_to_level LOOP
        total_release := total_release + get_nft_price(current_level);
    END LOOP;
    
    RETURN total_release;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建BCC释放执行函数
CREATE OR REPLACE FUNCTION release_bcc_on_level_up(
    p_wallet_address TEXT,
    p_new_level INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    bcc_released NUMERIC,
    bcc_remaining_locked NUMERIC,
    message TEXT
) AS $$
DECLARE
    current_user_level INTEGER;
    current_bcc_locked NUMERIC;
    current_bcc_transferable NUMERIC;
    release_amount NUMERIC;
    new_bcc_locked NUMERIC;
    new_bcc_transferable NUMERIC;
BEGIN
    -- 获取用户当前信息
    SELECT 
        COALESCE(current_level, 1),
        COALESCE(bcc_locked, 0),
        COALESCE(bcc_transferable, 0)
    INTO current_user_level, current_bcc_locked, current_bcc_transferable
    FROM members m
    LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
    WHERE m.wallet_address = p_wallet_address;
    
    -- 检查用户是否存在
    IF current_user_level IS NULL THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    -- 检查是否有锁仓BCC可释放
    IF current_bcc_locked <= 0 THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 'No locked BCC to release'::TEXT;
        RETURN;
    END IF;
    
    -- 检查新级别是否有效
    IF p_new_level <= current_user_level OR p_new_level > 19 THEN
        RETURN QUERY SELECT false, 0::NUMERIC, current_bcc_locked, 'Invalid level upgrade'::TEXT;
        RETURN;
    END IF;
    
    -- 计算应释放的BCC数量
    release_amount := calculate_bcc_release_amount(current_user_level, p_new_level);
    
    -- 确保不超过锁仓数量
    IF release_amount > current_bcc_locked THEN
        release_amount := current_bcc_locked;
    END IF;
    
    -- 计算新的余额
    new_bcc_locked := current_bcc_locked - release_amount;
    new_bcc_transferable := current_bcc_transferable + release_amount;
    
    -- 更新用户余额
    UPDATE user_balances 
    SET 
        bcc_locked = new_bcc_locked,
        bcc_transferable = new_bcc_transferable,
        updated_at = now()
    WHERE wallet_address = p_wallet_address;
    
    -- 如果user_balances中没有记录，则插入
    IF NOT FOUND THEN
        INSERT INTO user_balances (
            wallet_address, 
            bcc_transferable, 
            bcc_locked, 
            bcc_total_initial,
            current_tier,
            tier_multiplier,
            created_at,
            updated_at
        ) VALUES (
            p_wallet_address,
            release_amount,
            0,
            release_amount,
            1,
            1.0,
            now(),
            now()
        );
        new_bcc_transferable := release_amount;
        new_bcc_locked := 0;
    END IF;
    
    -- 记录释放日志
    INSERT INTO bcc_release_logs (
        wallet_address,
        from_level,
        to_level,
        bcc_released,
        bcc_remaining_locked,
        release_reason
    ) VALUES (
        p_wallet_address,
        current_user_level,
        p_new_level,
        release_amount,
        new_bcc_locked,
        'Level ' || current_user_level || ' to Level ' || p_new_level || ' upgrade'
    );
    
    RETURN QUERY SELECT 
        true, 
        release_amount, 
        new_bcc_locked,
        'Released ' || release_amount || ' BCC for Level ' || current_user_level || ' to ' || p_new_level || ' upgrade'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建综合升级函数（同时处理奖励和BCC释放）
CREATE OR REPLACE FUNCTION process_member_level_upgrade(
    p_wallet_address TEXT,
    p_new_level INTEGER
)
RETURNS TABLE(
    upgrade_success BOOLEAN,
    matrix_rewards_triggered BOOLEAN,
    bcc_released NUMERIC,
    bcc_remaining_locked NUMERIC,
    upgrade_message TEXT
) AS $$
DECLARE
    bcc_result RECORD;
    rewards_result RECORD;
    upgrade_msg TEXT := '';
BEGIN
    -- 1. 更新会员级别
    UPDATE members 
    SET 
        current_level = p_new_level,
        updated_at = now()
    WHERE wallet_address = p_wallet_address;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false, 
            false, 
            0::NUMERIC, 
            0::NUMERIC, 
            'Member not found'::TEXT;
        RETURN;
    END IF;
    
    -- 2. 处理BCC释放
    SELECT * INTO bcc_result FROM release_bcc_on_level_up(p_wallet_address, p_new_level);
    
    IF bcc_result.success THEN
        upgrade_msg := upgrade_msg || 'BCC Release: ' || bcc_result.message || '; ';
    END IF;
    
    -- 3. 触发matrix奖励
    BEGIN
        PERFORM trigger_matrix_rewards_on_level_up(p_wallet_address, p_new_level);
        upgrade_msg := upgrade_msg || 'Matrix rewards triggered for Level ' || p_new_level || '; ';
    EXCEPTION WHEN OTHERS THEN
        upgrade_msg := upgrade_msg || 'Matrix rewards failed: ' || SQLERRM || '; ';
    END;
    
    RETURN QUERY SELECT 
        true,
        true,
        COALESCE(bcc_result.bcc_released, 0),
        COALESCE(bcc_result.bcc_remaining_locked, 0),
        upgrade_msg;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建BCC释放查询函数
CREATE OR REPLACE FUNCTION get_bcc_release_history(
    p_wallet_address TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    release_date timestamp with time zone,
    from_level INTEGER,
    to_level INTEGER,
    bcc_released NUMERIC,
    bcc_remaining_locked NUMERIC,
    release_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        brl.created_at,
        brl.from_level,
        brl.to_level,
        brl.bcc_released,
        brl.bcc_remaining_locked,
        brl.release_reason
    FROM bcc_release_logs brl
    WHERE brl.wallet_address = p_wallet_address
    ORDER BY brl.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 6. 测试BCC释放计算
SELECT '=== 测试BCC释放计算 ===' as test_step;

-- 测试Level 1 到 Level 2: 应释放150 BCC
SELECT 'Level 1->2' as upgrade, calculate_bcc_release_amount(1, 2) as bcc_release;

-- 测试Level 1 到 Level 3: 应释放150+200=350 BCC  
SELECT 'Level 1->3' as upgrade, calculate_bcc_release_amount(1, 3) as bcc_release;

-- 测试Level 2 到 Level 5: 应释放200+250+300=750 BCC
SELECT 'Level 2->5' as upgrade, calculate_bcc_release_amount(2, 5) as bcc_release;

SELECT '=== BCC释放系统实现完成 ===' as final_status;

COMMIT;