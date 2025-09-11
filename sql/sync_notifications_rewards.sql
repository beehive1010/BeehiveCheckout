-- 同步user_notifications和reward_records表以支持新的BCC释放和奖励系统

BEGIN;

SELECT '=== 同步user_notifications和reward_records表 ===' as step;

-- 1. 更新user_notifications表以支持BCC释放通知
-- 添加新的通知类型和字段（如果不存在）
DO $$
BEGIN
    -- 检查并添加新的通知类型支持
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' AND column_name = 'priority'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN priority integer DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' AND column_name = 'category'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN category character varying(50) DEFAULT 'general';
    END IF;
END$$;

-- 2. 更新reward_records表以支持新的奖励类型
DO $$
BEGIN
    -- 添加BCC释放相关字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reward_records' AND column_name = 'bcc_released'
    ) THEN
        ALTER TABLE reward_records ADD COLUMN bcc_released numeric(20,8) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reward_records' AND column_name = 'nft_level'
    ) THEN
        ALTER TABLE reward_records ADD COLUMN nft_level integer;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reward_records' AND column_name = 'upgrade_from_level'
    ) THEN
        ALTER TABLE reward_records ADD COLUMN upgrade_from_level integer;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reward_records' AND column_name = 'upgrade_to_level'
    ) THEN
        ALTER TABLE reward_records ADD COLUMN upgrade_to_level integer;
    END IF;
END$$;

-- 3. 创建BCC释放通知功能
CREATE OR REPLACE FUNCTION create_bcc_release_notification(
    p_wallet_address TEXT,
    p_from_level INTEGER,
    p_to_level INTEGER,
    p_bcc_released NUMERIC
)
RETURNS void AS $$
BEGIN
    INSERT INTO user_notifications (
        wallet_address,
        title,
        message,
        type,
        category,
        priority,
        is_read,
        metadata,
        created_at
    ) VALUES (
        p_wallet_address,
        '🎉 BCC锁仓释放',
        '恭喜！您升级到Level ' || p_to_level || ' 成功释放了 ' || p_bcc_released || ' BCC到可转账余额。',
        'bcc_release',
        'rewards',
        2, -- 高优先级
        false,
        jsonb_build_object(
            'from_level', p_from_level,
            'to_level', p_to_level,
            'bcc_released', p_bcc_released,
            'release_type', 'level_upgrade'
        ),
        now()
    );
END;
$$ LANGUAGE plpgsql;

-- 4. 创建Matrix奖励通知功能
CREATE OR REPLACE FUNCTION create_matrix_reward_notification(
    p_recipient_wallet TEXT,
    p_reward_amount NUMERIC,
    p_reward_layer INTEGER,
    p_triggered_by_wallet TEXT,
    p_nft_level INTEGER,
    p_is_pending BOOLEAN
)
RETURNS void AS $$
DECLARE
    notification_title TEXT;
    notification_message TEXT;
    notification_type TEXT;
BEGIN
    IF p_is_pending THEN
        notification_title := '⏳ Matrix奖励待处理';
        notification_message := '您获得了Layer ' || p_reward_layer || ' 的 ' || p_reward_amount || ' USDC奖励，但需要升级到Level ' || p_nft_level || ' 才能领取。72小时内升级即可获得奖励。';
        notification_type := 'matrix_reward_pending';
    ELSE
        notification_title := '💰 Matrix奖励到账';
        notification_message := '恭喜！您从Layer ' || p_reward_layer || ' 获得了 ' || p_reward_amount || ' USDC奖励！';
        notification_type := 'matrix_reward_claimed';
    END IF;
    
    INSERT INTO user_notifications (
        wallet_address,
        title,
        message,
        type,
        category,
        priority,
        is_read,
        metadata,
        created_at
    ) VALUES (
        p_recipient_wallet,
        notification_title,
        notification_message,
        notification_type,
        'rewards',
        CASE WHEN p_is_pending THEN 3 ELSE 2 END, -- pending=最高优先级
        false,
        jsonb_build_object(
            'reward_amount', p_reward_amount,
            'reward_layer', p_reward_layer,
            'triggered_by_wallet', p_triggered_by_wallet,
            'nft_level', p_nft_level,
            'is_pending', p_is_pending
        ),
        now()
    );
END;
$$ LANGUAGE plpgsql;

-- 5. 创建奖励记录功能
CREATE OR REPLACE FUNCTION create_reward_record(
    p_recipient_wallet TEXT,
    p_reward_type TEXT,
    p_reward_amount NUMERIC,
    p_triggered_by_wallet TEXT,
    p_layer_number INTEGER DEFAULT NULL,
    p_nft_level INTEGER DEFAULT NULL,
    p_bcc_released NUMERIC DEFAULT 0,
    p_upgrade_from_level INTEGER DEFAULT NULL,
    p_upgrade_to_level INTEGER DEFAULT NULL,
    p_is_pending BOOLEAN DEFAULT false
)
RETURNS uuid AS $$
DECLARE
    record_id uuid;
    expire_time timestamp with time zone;
BEGIN
    record_id := gen_random_uuid();
    
    -- Pending奖励72小时后过期
    IF p_is_pending THEN
        expire_time := now() + interval '72 hours';
    END IF;
    
    INSERT INTO reward_records (
        id,
        recipient_wallet,
        reward_type,
        reward_amount,
        reward_status,
        triggered_by_wallet,
        layer_number,
        nft_level,
        bcc_released,
        upgrade_from_level,
        upgrade_to_level,
        created_at,
        expires_at
    ) VALUES (
        record_id,
        p_recipient_wallet,
        p_reward_type,
        p_reward_amount,
        CASE WHEN p_is_pending THEN 'pending' ELSE 'available' END,
        p_triggered_by_wallet,
        p_layer_number,
        p_nft_level,
        p_bcc_released,
        p_upgrade_from_level,
        p_upgrade_to_level,
        now(),
        expire_time
    );
    
    RETURN record_id;
END;
$$ LANGUAGE plpgsql;

-- 6. 更新BCC释放函数以包含通知和记录
CREATE OR REPLACE FUNCTION release_bcc_on_level_up_with_notifications(
    p_wallet_address TEXT,
    p_new_level INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    bcc_released NUMERIC,
    bcc_remaining_locked NUMERIC,
    message TEXT,
    notification_created BOOLEAN,
    record_created uuid
) AS $$
DECLARE
    current_user_level INTEGER;
    current_bcc_locked NUMERIC;
    current_bcc_transferable NUMERIC;
    release_amount NUMERIC;
    new_bcc_locked NUMERIC;
    new_bcc_transferable NUMERIC;
    new_record_id uuid;
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
        RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 'User not found'::TEXT, false, NULL::uuid;
        RETURN;
    END IF;
    
    -- 检查是否有锁仓BCC可释放
    IF current_bcc_locked <= 0 THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 'No locked BCC to release'::TEXT, false, NULL::uuid;
        RETURN;
    END IF;
    
    -- 检查新级别是否有效
    IF p_new_level <= current_user_level OR p_new_level > 19 THEN
        RETURN QUERY SELECT false, 0::NUMERIC, current_bcc_locked, 'Invalid level upgrade'::TEXT, false, NULL::uuid;
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
    
    -- 创建奖励记录
    new_record_id := create_reward_record(
        p_wallet_address,
        'bcc_release',
        release_amount,
        p_wallet_address,
        NULL,
        p_new_level,
        release_amount,
        current_user_level,
        p_new_level,
        false
    );
    
    -- 创建通知
    PERFORM create_bcc_release_notification(
        p_wallet_address,
        current_user_level,
        p_new_level,
        release_amount
    );
    
    RETURN QUERY SELECT 
        true, 
        release_amount, 
        new_bcc_locked,
        'Released ' || release_amount || ' BCC for Level ' || current_user_level || ' to ' || p_new_level || ' upgrade'::TEXT,
        true,
        new_record_id;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建获取用户通知的函数
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_wallet_address TEXT,
    p_limit INTEGER DEFAULT 20,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id uuid,
    title TEXT,
    message TEXT,
    type character varying,
    category character varying,
    priority INTEGER,
    is_read BOOLEAN,
    metadata JSONB,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        un.id,
        un.title,
        un.message,
        un.type,
        un.category,
        un.priority,
        un.is_read,
        un.metadata,
        un.created_at
    FROM user_notifications un
    WHERE un.wallet_address = p_wallet_address
    AND (NOT p_unread_only OR un.is_read = false)
    ORDER BY un.priority DESC, un.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 8. 测试新的通知和记录系统
SELECT '=== 测试通知和记录系统 ===' as test_step;

-- 测试创建BCC释放通知
SELECT create_bcc_release_notification(
    '0x0000000000000000000000000000000000000001',
    1,
    2,
    150
) as bcc_notification_created;

-- 测试创建Matrix奖励通知
SELECT create_matrix_reward_notification(
    '0x0000000000000000000000000000000000000001',
    200,
    2,
    '0x0000000000000000000000000000000000000002',
    2,
    false
) as matrix_notification_created;

-- 检查创建的通知
SELECT '=== 验证通知创建 ===' as verify_step;
SELECT * FROM get_user_notifications('0x0000000000000000000000000000000000000001', 5);

SELECT '=== 同步完成 ===' as final_status;

COMMIT;