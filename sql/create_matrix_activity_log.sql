-- 创建matrix_activity_log表来记录所有matrix相关活动

BEGIN;

SELECT '=== 创建matrix_activity_log表 ===' as step;

-- 创建matrix活动日志表
CREATE TABLE matrix_activity_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address character varying(42) NOT NULL,
    activity_type character varying(50) NOT NULL, -- 'level_upgrade', 'matrix_placement', 'bcc_release', 'reward_trigger'
    activity_description text NOT NULL,
    old_level integer,
    new_level integer,
    matrix_root character varying(42),
    matrix_layer integer,
    matrix_position character varying(1),
    bcc_amount numeric(20,8),
    reward_amount numeric(20,8),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    
    -- 外键约束
    CONSTRAINT fk_matrix_activity_wallet FOREIGN KEY (wallet_address) REFERENCES members(wallet_address),
    CONSTRAINT fk_matrix_activity_root FOREIGN KEY (matrix_root) REFERENCES members(wallet_address)
);

-- 创建索引
CREATE INDEX idx_matrix_activity_wallet ON matrix_activity_log(wallet_address);
CREATE INDEX idx_matrix_activity_type ON matrix_activity_log(activity_type);
CREATE INDEX idx_matrix_activity_created_at ON matrix_activity_log(created_at);
CREATE INDEX idx_matrix_activity_matrix_root ON matrix_activity_log(matrix_root);

-- 创建记录matrix活动的函数
CREATE OR REPLACE FUNCTION log_matrix_activity(
    p_wallet_address TEXT,
    p_activity_type TEXT,
    p_description TEXT,
    p_old_level INTEGER DEFAULT NULL,
    p_new_level INTEGER DEFAULT NULL,
    p_matrix_root TEXT DEFAULT NULL,
    p_matrix_layer INTEGER DEFAULT NULL,
    p_matrix_position TEXT DEFAULT NULL,
    p_bcc_amount NUMERIC DEFAULT NULL,
    p_reward_amount NUMERIC DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
    activity_id uuid;
BEGIN
    activity_id := gen_random_uuid();
    
    INSERT INTO matrix_activity_log (
        id,
        wallet_address,
        activity_type,
        activity_description,
        old_level,
        new_level,
        matrix_root,
        matrix_layer,
        matrix_position,
        bcc_amount,
        reward_amount,
        metadata,
        created_at
    ) VALUES (
        activity_id,
        p_wallet_address,
        p_activity_type,
        p_description,
        p_old_level,
        p_new_level,
        p_matrix_root,
        p_matrix_layer,
        p_matrix_position,
        p_bcc_amount,
        p_reward_amount,
        p_metadata,
        now()
    );
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- 更新升级函数，添加活动日志
CREATE OR REPLACE FUNCTION process_member_level_upgrade_with_logs(
    p_wallet_address TEXT,
    p_new_level INTEGER
)
RETURNS TABLE(
    upgrade_success BOOLEAN,
    bcc_released NUMERIC,
    bcc_remaining_locked NUMERIC,
    notifications_created INTEGER,
    activity_logs_created INTEGER,
    upgrade_message TEXT
) AS $$
DECLARE
    current_user_level INTEGER;
    current_bcc_locked NUMERIC;
    release_amount NUMERIC;
    new_bcc_locked NUMERIC;
    notification_count INTEGER := 0;
    activity_count INTEGER := 0;
    upgrade_msg TEXT := '';
    notification_id uuid;
    activity_id uuid;
BEGIN
    -- 获取用户当前级别
    SELECT COALESCE(current_level, 1) INTO current_user_level
    FROM members WHERE wallet_address = p_wallet_address;
    
    IF current_user_level IS NULL THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 0, 0, 'Member not found'::TEXT;
        RETURN;
    END IF;
    
    -- 检查是否按顺序升级
    IF p_new_level != (current_user_level + 1) THEN
        RETURN QUERY SELECT 
            false, 
            0::NUMERIC, 
            0::NUMERIC, 
            0, 
            0,
            ('Invalid upgrade: Must upgrade sequentially from Level ' || current_user_level || ' to Level ' || (current_user_level + 1))::TEXT;
        RETURN;
    END IF;
    
    -- 记录升级活动
    activity_id := log_matrix_activity(
        p_wallet_address,
        'level_upgrade',
        'Member upgraded from Level ' || current_user_level || ' to Level ' || p_new_level,
        current_user_level,
        p_new_level,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        jsonb_build_object('upgrade_type', 'sequential', 'nft_price', get_nft_price(p_new_level))
    );
    activity_count := activity_count + 1;
    
    -- 更新会员级别
    UPDATE members 
    SET current_level = p_new_level, updated_at = now()
    WHERE wallet_address = p_wallet_address;
    
    -- 处理BCC释放
    SELECT COALESCE(bcc_locked, 0) INTO current_bcc_locked
    FROM user_balances WHERE wallet_address = p_wallet_address;
    
    IF current_bcc_locked > 0 THEN
        -- 计算释放量
        release_amount := get_nft_price(p_new_level);
        
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
        
        -- 记录BCC释放日志
        INSERT INTO bcc_release_logs (
            wallet_address, from_level, to_level, bcc_released, 
            bcc_remaining_locked, release_reason
        ) VALUES (
            p_wallet_address, current_user_level, p_new_level, 
            release_amount, new_bcc_locked,
            'Sequential upgrade from Level ' || current_user_level || ' to Level ' || p_new_level
        );
        
        -- 记录BCC释放活动
        activity_id := log_matrix_activity(
            p_wallet_address,
            'bcc_release',
            'Released ' || release_amount || ' BCC for Level ' || p_new_level || ' upgrade',
            current_user_level,
            p_new_level,
            NULL,
            NULL,
            NULL,
            release_amount,
            NULL,
            jsonb_build_object('bcc_locked_before', current_bcc_locked, 'bcc_locked_after', new_bcc_locked)
        );
        activity_count := activity_count + 1;
        
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
        
        -- 记录奖励触发活动
        activity_id := log_matrix_activity(
            p_wallet_address,
            'reward_trigger',
            'Matrix rewards triggered for Level ' || p_new_level || ' upgrade',
            current_user_level,
            p_new_level,
            NULL,
            NULL,
            NULL,
            NULL,
            get_nft_price(p_new_level),
            jsonb_build_object('reward_type', 'matrix_level_reward')
        );
        activity_count := activity_count + 1;
        
        upgrade_msg := upgrade_msg || 'Matrix rewards triggered; ';
    EXCEPTION WHEN OTHERS THEN
        upgrade_msg := upgrade_msg || 'Matrix rewards failed; ';
    END;
    
    RETURN QUERY SELECT 
        true,
        COALESCE(release_amount, 0),
        COALESCE(new_bcc_locked, 0),
        notification_count,
        activity_count,
        upgrade_msg;
END;
$$ LANGUAGE plpgsql;

-- 创建查询matrix活动的函数
CREATE OR REPLACE FUNCTION get_matrix_activities(
    p_wallet_address TEXT DEFAULT NULL,
    p_activity_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    id uuid,
    wallet_address character varying,
    member_name TEXT,
    activity_type character varying,
    activity_description TEXT,
    old_level INTEGER,
    new_level INTEGER,
    matrix_root character varying,
    matrix_layer INTEGER,
    matrix_position character varying,
    bcc_amount NUMERIC,
    reward_amount NUMERIC,
    metadata JSONB,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mal.id,
        mal.wallet_address,
        COALESCE(u.username, 'Member_' || RIGHT(mal.wallet_address, 4)) as member_name,
        mal.activity_type,
        mal.activity_description,
        mal.old_level,
        mal.new_level,
        mal.matrix_root,
        mal.matrix_layer,
        mal.matrix_position,
        mal.bcc_amount,
        mal.reward_amount,
        mal.metadata,
        mal.created_at
    FROM matrix_activity_log mal
    LEFT JOIN users u ON mal.wallet_address = u.wallet_address
    WHERE (p_wallet_address IS NULL OR mal.wallet_address = p_wallet_address)
    AND (p_activity_type IS NULL OR mal.activity_type = p_activity_type)
    ORDER BY mal.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 测试matrix活动日志
SELECT '=== 测试matrix活动日志 ===' as test_step;

-- 记录一个测试活动
SELECT log_matrix_activity(
    '0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501',
    'test_activity',
    'Test matrix activity log creation',
    3,
    4,
    NULL,
    NULL,
    NULL,
    250,
    250,
    '{"test": true}'::jsonb
) as test_activity_id;

-- 查询活动日志
SELECT * FROM get_matrix_activities('0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501', NULL, 5);

SELECT '=== matrix_activity_log创建完成 ===' as final_status;

COMMIT;