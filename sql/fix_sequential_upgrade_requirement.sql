-- 修复升级系统，确保必须按顺序升级（不能跳级）

BEGIN;

SELECT '=== 修复顺序升级要求 ===' as step;

-- 1. 更新升级函数，添加顺序检查
CREATE OR REPLACE FUNCTION process_member_level_upgrade_with_notifications(
    p_wallet_address TEXT,
    p_new_level INTEGER
)
RETURNS TABLE(
    upgrade_success BOOLEAN,
    bcc_released NUMERIC,
    bcc_remaining_locked NUMERIC,
    notifications_created INTEGER,
    upgrade_message TEXT
) AS $$
DECLARE
    current_user_level INTEGER;
    current_bcc_locked NUMERIC;
    release_amount NUMERIC;
    new_bcc_locked NUMERIC;
    notification_count INTEGER := 0;
    upgrade_msg TEXT := '';
    notification_id uuid;
BEGIN
    -- 获取用户当前级别
    SELECT COALESCE(current_level, 1) INTO current_user_level
    FROM members WHERE wallet_address = p_wallet_address;
    
    IF current_user_level IS NULL THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 0, 'Member not found'::TEXT;
        RETURN;
    END IF;
    
    -- 检查是否按顺序升级（必须逐级升级）
    IF p_new_level != (current_user_level + 1) THEN
        RETURN QUERY SELECT 
            false, 
            0::NUMERIC, 
            0::NUMERIC, 
            0, 
            ('Invalid upgrade: Must upgrade sequentially from Level ' || current_user_level || ' to Level ' || (current_user_level + 1) || ', cannot skip to Level ' || p_new_level)::TEXT;
        RETURN;
    END IF;
    
    -- 检查级别范围
    IF p_new_level < 1 OR p_new_level > 19 THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 0, 'Invalid level: Must be between 1 and 19'::TEXT;
        RETURN;
    END IF;
    
    -- 更新会员级别
    UPDATE members 
    SET current_level = p_new_level, updated_at = now()
    WHERE wallet_address = p_wallet_address;
    
    -- 处理BCC释放（只释放当前级别对应的BCC）
    SELECT COALESCE(bcc_locked, 0) INTO current_bcc_locked
    FROM user_balances WHERE wallet_address = p_wallet_address;
    
    IF current_bcc_locked > 0 THEN
        -- 计算当前级别应释放的BCC数量（当前级别的NFT价格）
        release_amount := get_nft_price(p_new_level);
        
        -- 确保不超过锁仓数量
        IF release_amount > current_bcc_locked THEN
            release_amount := current_bcc_locked;
        END IF;
        
        new_bcc_locked := current_bcc_locked - release_amount;
        
        -- 更新余额
        UPDATE user_balances 
        SET 
            bcc_locked = new_bcc_locked,
            bcc_transferable = bcc_transferable + release_amount,
            updated_at = now()
        WHERE wallet_address = p_wallet_address;
        
        -- 记录释放日志
        INSERT INTO bcc_release_logs (
            wallet_address, from_level, to_level, bcc_released, 
            bcc_remaining_locked, release_reason
        ) VALUES (
            p_wallet_address, current_user_level, p_new_level, 
            release_amount, new_bcc_locked,
            'Sequential upgrade from Level ' || current_user_level || ' to Level ' || p_new_level
        );
        
        -- 创建BCC释放通知
        notification_id := notify_bcc_release(
            p_wallet_address, current_user_level, p_new_level, release_amount
        );
        notification_count := notification_count + 1;
        
        upgrade_msg := upgrade_msg || 'Released ' || release_amount || ' BCC for Level ' || p_new_level || '; ';
    ELSE
        release_amount := 0;
        new_bcc_locked := 0;
        upgrade_msg := upgrade_msg || 'No BCC locked to release; ';
    END IF;
    
    -- 触发Matrix奖励
    BEGIN
        PERFORM trigger_matrix_rewards_on_level_up(p_wallet_address, p_new_level);
        upgrade_msg := upgrade_msg || 'Matrix rewards triggered; ';
    EXCEPTION WHEN OTHERS THEN
        upgrade_msg := upgrade_msg || 'Matrix rewards failed; ';
    END;
    
    RETURN QUERY SELECT 
        true,
        COALESCE(release_amount, 0),
        COALESCE(new_bcc_locked, 0),
        notification_count,
        upgrade_msg;
END;
$$ LANGUAGE plpgsql;

-- 2. 创建正确的顺序升级函数
CREATE OR REPLACE FUNCTION upgrade_member_to_next_level(
    p_wallet_address TEXT
)
RETURNS TABLE(
    upgrade_success BOOLEAN,
    old_level INTEGER,
    new_level INTEGER,
    bcc_released NUMERIC,
    upgrade_message TEXT
) AS $$
DECLARE
    member_current_level INTEGER;
    next_level INTEGER;
    upgrade_result RECORD;
BEGIN
    -- 获取当前级别
    SELECT COALESCE(m.current_level, 1) INTO member_current_level
    FROM members m WHERE m.wallet_address = p_wallet_address;
    
    IF member_current_level IS NULL THEN
        RETURN QUERY SELECT false, 0, 0, 0::NUMERIC, 'Member not found'::TEXT;
        RETURN;
    END IF;
    
    -- 计算下一级别
    next_level := member_current_level + 1;
    
    -- 检查是否已达到最高级别
    IF member_current_level >= 19 THEN
        RETURN QUERY SELECT false, member_current_level, member_current_level, 0::NUMERIC, 'Already at maximum level 19'::TEXT;
        RETURN;
    END IF;
    
    -- 执行升级
    SELECT * INTO upgrade_result 
    FROM process_member_level_upgrade_with_notifications(p_wallet_address, next_level);
    
    RETURN QUERY SELECT 
        upgrade_result.upgrade_success,
        member_current_level,
        next_level,
        upgrade_result.bcc_released,
        upgrade_result.upgrade_message;
END;
$$ LANGUAGE plpgsql;

-- 3. 重置之前错误升级的会员数据
SELECT '=== 重置错误升级的会员 ===' as reset_step;

-- 重置TestCC从Level 4 回到 Level 1
UPDATE members 
SET current_level = 1, updated_at = now()
WHERE wallet_address = '0x377d26f6aDcC433db10c9b0257cD75c0bB675A8f';

-- 重置TestABC001从Level 4 回到 Level 1 （需要恢复BCC）
UPDATE members 
SET current_level = 1, updated_at = now()
WHERE wallet_address = '0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501';

-- 恢复TestABC001的BCC锁仓（将已释放的750 BCC重新锁定）
UPDATE user_balances 
SET 
    bcc_locked = bcc_locked + 750,
    bcc_transferable = bcc_transferable - 750,
    updated_at = now()
WHERE wallet_address = '0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501';

-- 4. 测试正确的顺序升级
SELECT '=== 测试正确的顺序升级 ===' as test_step;

-- 测试TestCC顺序升级：Level 1 → Level 2
SELECT 'TestCC Level 1→2' as test_case, * FROM upgrade_member_to_next_level('0x377d26f6aDcC433db10c9b0257cD75c0bB675A8f');

-- 测试跳级升级（应该失败）
SELECT 'TestBB Level 3→5 (应该失败)' as test_case, * FROM process_member_level_upgrade_with_notifications('0x310053286b025De2a0816faEcBCaeB61B5f17aa1', 5);

-- 5. 验证当前状态
SELECT '=== 验证当前Members状态 ===' as verify_step;
SELECT 
    m.wallet_address,
    COALESCE(u.username, 'Member_' || RIGHT(m.wallet_address, 4)) as name,
    m.current_level,
    COALESCE(ub.bcc_transferable, 0) as bcc_transferable,
    COALESCE(ub.bcc_locked, 0) as bcc_locked
FROM members m 
LEFT JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
WHERE m.current_level > 1 OR m.wallet_address IN (
    '0x377d26f6aDcC433db10c9b0257cD75c0bB675A8f',
    '0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501'
)
ORDER BY m.current_level DESC, m.created_at;

SELECT '=== 顺序升级修复完成 ===' as final_status;

COMMIT;