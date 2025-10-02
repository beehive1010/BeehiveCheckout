-- 修复通知系统，完成user_notifications和reward_records同步

BEGIN;

SELECT '=== 修复通知系统 ===' as step;

-- 1. 确保user_notifications表有必要的字段
DO $$
BEGIN
    -- 添加priority字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' AND column_name = 'priority'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN priority integer DEFAULT 1;
    END IF;
    
    -- 添加category字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' AND column_name = 'category'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN category character varying(50) DEFAULT 'general';
    END IF;
END$$;

-- 2. 确保reward_records表有BCC释放相关字段
DO $$
BEGIN
    -- 添加BCC释放字段（如果不存在）
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

-- 3. 创建简化的通知功能
CREATE OR REPLACE FUNCTION create_notification(
    p_wallet_address TEXT,
    p_title TEXT,
    p_message TEXT,
    p_type character varying DEFAULT 'info',
    p_category character varying DEFAULT 'general',
    p_priority INTEGER DEFAULT 1,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
    notification_id uuid;
BEGIN
    notification_id := gen_random_uuid();
    
    INSERT INTO user_notifications (
        id,
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
        notification_id,
        p_wallet_address,
        p_title,
        p_message,
        p_type,
        p_category,
        p_priority,
        false,
        p_metadata,
        now()
    );
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建BCC释放通知
CREATE OR REPLACE FUNCTION notify_bcc_release(
    p_wallet_address TEXT,
    p_from_level INTEGER,
    p_to_level INTEGER,
    p_bcc_released NUMERIC
)
RETURNS uuid AS $$
BEGIN
    RETURN create_notification(
        p_wallet_address,
        '🎉 BCC锁仓释放',
        '恭喜！您升级到Level ' || p_to_level || ' 成功释放了 ' || p_bcc_released || ' BCC到可转账余额。',
        'bcc_release',
        'rewards',
        2,
        jsonb_build_object(
            'from_level', p_from_level,
            'to_level', p_to_level,
            'bcc_released', p_bcc_released,
            'action', 'level_upgrade'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 5. 创建Matrix奖励通知
CREATE OR REPLACE FUNCTION notify_matrix_reward(
    p_recipient_wallet TEXT,
    p_reward_amount NUMERIC,
    p_layer INTEGER,
    p_triggered_by TEXT,
    p_is_pending BOOLEAN DEFAULT false
)
RETURNS uuid AS $$
DECLARE
    title_text TEXT;
    message_text TEXT;
    type_text character varying;
BEGIN
    IF p_is_pending THEN
        title_text := '⏳ Matrix奖励待处理';
        message_text := 'Layer ' || p_layer || ' 奖励 ' || p_reward_amount || ' USDC 待处理，需要升级对应级别才能领取。';
        type_text := 'matrix_reward_pending';
    ELSE
        title_text := '💰 Matrix奖励到账';
        message_text := '恭喜！Layer ' || p_layer || ' 奖励 ' || p_reward_amount || ' USDC 已到账！';
        type_text := 'matrix_reward_claimed';
    END IF;
    
    RETURN create_notification(
        p_recipient_wallet,
        title_text,
        message_text,
        type_text,
        'rewards',
        CASE WHEN p_is_pending THEN 3 ELSE 2 END,
        jsonb_build_object(
            'reward_amount', p_reward_amount,
            'layer', p_layer,
            'triggered_by', p_triggered_by,
            'is_pending', p_is_pending
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 6. 更新综合升级函数，加入通知
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
    
    -- 更新会员级别
    UPDATE members 
    SET current_level = p_new_level, updated_at = now()
    WHERE wallet_address = p_wallet_address;
    
    -- 处理BCC释放
    SELECT bcc_locked INTO current_bcc_locked
    FROM user_balances WHERE wallet_address = p_wallet_address;
    
    IF current_bcc_locked > 0 THEN
        -- 计算释放量
        release_amount := calculate_bcc_release_amount(current_user_level, p_new_level);
        
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
            'Level ' || current_user_level || ' to Level ' || p_new_level || ' upgrade'
        );
        
        -- 创建BCC释放通知
        notification_id := notify_bcc_release(
            p_wallet_address, current_user_level, p_new_level, release_amount
        );
        notification_count := notification_count + 1;
        
        upgrade_msg := upgrade_msg || 'Released ' || release_amount || ' BCC; ';
    ELSE
        release_amount := 0;
        new_bcc_locked := 0;
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

-- 7. 创建获取用户通知的函数（修复类型问题）
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_wallet_address TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    id uuid,
    title TEXT,
    message TEXT,
    notification_type character varying,
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
    ORDER BY un.priority DESC, un.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 8. 测试通知系统
SELECT '=== 测试修复后的通知系统 ===' as test_step;

-- 测试创建通知
SELECT notify_bcc_release(
    '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0',
    1, 3, 350
) as test_notification_id;

-- 测试获取通知
SELECT * FROM get_user_notifications('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0', 5);

SELECT '=== 通知系统修复完成 ===' as final_status;

COMMIT;