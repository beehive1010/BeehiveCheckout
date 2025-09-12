-- ========================================
-- 创建奖励系统RPC函数
-- 用于前端和API调用的标准化接口
-- ========================================

-- 1. 触发会员升级奖励的RPC函数 (包装现有函数)
CREATE OR REPLACE FUNCTION rpc_trigger_upgrade_rewards(
    wallet_address VARCHAR(42),
    level INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
    result_data JSON;
    reward_summary RECORD;
BEGIN
    -- 调用现有的奖励触发函数
    SELECT * INTO reward_summary 
    FROM trigger_member_upgrade_rewards(wallet_address, level);
    
    -- 返回标准化JSON结果
    result_data := json_build_object(
        'success', true,
        'upgraded_member', wallet_address,
        'new_level', level,
        'summary', reward_summary.summary,
        'total_rewards', reward_summary.total_rewards,
        'immediate_rewards', reward_summary.immediate_rewards,
        'pending_rewards', reward_summary.pending_rewards,
        'timers_created', reward_summary.timers_created,
        'processed_at', NOW()
    );
    
    RETURN result_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 获取会员奖励状态的RPC函数
CREATE OR REPLACE FUNCTION rpc_get_member_reward_status(
    wallet_address VARCHAR(42)
)
RETURNS JSON AS $$
DECLARE
    result_data JSON;
    rewards_data JSON[];
    timers_data JSON[];
    summary_data JSON;
BEGIN
    -- 获取奖励记录
    SELECT COALESCE(
        array_agg(
            json_build_object(
                'reward_id', reward_id,
                'recipient_wallet', recipient_wallet,
                'matrix_position', matrix_position,
                'amount_usdt', amount_usdt,
                'status', status,
                'status_chinese', status_chinese,
                'qualification_check', qualification_check,
                'timer_active', timer_active,
                'qualification_deadline', qualification_deadline,
                'created_at', created_at
            )
        ), 
        '{}'::JSON[]
    ) INTO rewards_data
    FROM member_upgrade_rewards_status 
    WHERE upgraded_member = wallet_address;
    
    -- 获取活跃计时器
    SELECT COALESCE(
        array_agg(
            json_build_object(
                'timer_id', id,
                'title', title,
                'description', description,
                'end_time', end_time,
                'is_active', is_active,
                'metadata', metadata
            )
        ),
        '{}'::JSON[]
    ) INTO timers_data
    FROM countdown_timers 
    WHERE wallet_address = rpc_get_member_reward_status.wallet_address
    AND timer_type = 'r_position_qualification'
    AND is_active = true;
    
    -- 计算汇总信息
    WITH reward_summary AS (
        SELECT 
            COUNT(*) as total_rewards,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_rewards,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_rewards,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN amount_usdt END), 0) as total_approved_amount,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_usdt END), 0) as total_pending_amount
        FROM member_upgrade_rewards_status 
        WHERE upgraded_member = rpc_get_member_reward_status.wallet_address
    )
    SELECT json_build_object(
        'total_rewards', total_rewards,
        'approved_rewards', approved_rewards, 
        'pending_rewards', pending_rewards,
        'total_approved_amount', total_approved_amount,
        'total_pending_amount', total_pending_amount,
        'active_timers', array_length(timers_data, 1)
    ) INTO summary_data
    FROM reward_summary;
    
    -- 构建最终结果
    result_data := json_build_object(
        'success', true,
        'wallet_address', wallet_address,
        'summary', summary_data,
        'rewards', rewards_data,
        'active_timers', timers_data,
        'queried_at', NOW()
    );
    
    RETURN result_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 检查单个R位置考核的RPC函数
CREATE OR REPLACE FUNCTION rpc_check_r_qualification(
    timer_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    result_text TEXT;
    result_data JSON;
BEGIN
    -- 调用现有的检查函数
    result_text := check_r_position_qualification(timer_uuid);
    
    -- 返回标准化结果
    result_data := json_build_object(
        'success', true,
        'timer_id', timer_uuid,
        'result', result_text,
        'is_approved', result_text LIKE '%考核通过%',
        'checked_at', NOW()
    );
    
    RETURN result_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 批量检查所有待定奖励的RPC函数
CREATE OR REPLACE FUNCTION rpc_batch_check_pending()
RETURNS JSON AS $$
DECLARE
    result_data JSON;
    check_summary RECORD;
BEGIN
    -- 调用现有的批量检查函数
    SELECT * INTO check_summary 
    FROM check_all_pending_r_rewards();
    
    -- 返回标准化结果
    result_data := json_build_object(
        'success', true,
        'checked_count', check_summary.checked_count,
        'approved_count', check_summary.approved_count,
        'still_pending', check_summary.still_pending,
        'processed_at', NOW()
    );
    
    RETURN result_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 获取奖励相关计时器的RPC函数
CREATE OR REPLACE FUNCTION rpc_get_reward_timers(
    wallet_address VARCHAR(42) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result_data JSON;
    timers_data JSON[];
    summary_data JSON;
BEGIN
    -- 获取计时器数据
    IF wallet_address IS NOT NULL THEN
        SELECT COALESCE(
            array_agg(
                json_build_object(
                    'timer_id', id,
                    'wallet_address', ct.wallet_address,
                    'timer_type', timer_type,
                    'title', title,
                    'description', description,
                    'start_time', start_time,
                    'end_time', end_time,
                    'is_active', is_active,
                    'auto_action_data', auto_action_data,
                    'metadata', metadata,
                    'time_remaining_hours', CASE 
                        WHEN end_time > NOW() THEN 
                            EXTRACT(EPOCH FROM (end_time - NOW())) / 3600
                        ELSE 0 
                    END,
                    'is_expired', end_time <= NOW()
                ) ORDER BY created_at DESC
            ),
            '{}'::JSON[]
        ) INTO timers_data
        FROM countdown_timers ct
        WHERE ct.wallet_address = rpc_get_reward_timers.wallet_address
        AND timer_type = 'r_position_qualification';
    ELSE
        -- 获取所有奖励相关计时器
        SELECT COALESCE(
            array_agg(
                json_build_object(
                    'timer_id', id,
                    'wallet_address', ct.wallet_address,
                    'timer_type', timer_type,
                    'title', title,
                    'description', description,
                    'start_time', start_time,
                    'end_time', end_time,
                    'is_active', is_active,
                    'auto_action_data', auto_action_data,
                    'metadata', metadata,
                    'time_remaining_hours', CASE 
                        WHEN end_time > NOW() THEN 
                            EXTRACT(EPOCH FROM (end_time - NOW())) / 3600
                        ELSE 0 
                    END,
                    'is_expired', end_time <= NOW()
                ) ORDER BY created_at DESC
            ),
            '{}'::JSON[]
        ) INTO timers_data
        FROM countdown_timers ct
        WHERE timer_type = 'r_position_qualification';
    END IF;
    
    -- 计算汇总信息
    WITH timer_summary AS (
        SELECT 
            COUNT(*) as total_timers,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_timers,
            COUNT(CASE WHEN end_time <= NOW() THEN 1 END) as expired_timers
        FROM countdown_timers
        WHERE (wallet_address IS NULL OR countdown_timers.wallet_address = rpc_get_reward_timers.wallet_address)
        AND timer_type = 'r_position_qualification'
    )
    SELECT json_build_object(
        'total_timers', total_timers,
        'active_timers', active_timers,
        'expired_timers', expired_timers
    ) INTO summary_data
    FROM timer_summary;
    
    -- 构建最终结果
    result_data := json_build_object(
        'success', true,
        'wallet_address', wallet_address,
        'summary', summary_data,
        'timers', timers_data,
        'queried_at', NOW()
    );
    
    RETURN result_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 获取奖励系统统计信息的RPC函数
CREATE OR REPLACE FUNCTION rpc_get_reward_system_stats()
RETURNS JSON AS $$
DECLARE
    result_data JSON;
    stats_data JSON;
BEGIN
    -- 计算系统统计信息
    WITH system_stats AS (
        SELECT 
            COUNT(*) as total_rewards,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_rewards,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_rewards,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN amount_usdt END), 0) as total_approved_amount,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_usdt END), 0) as total_pending_amount,
            COUNT(DISTINCT recipient_wallet) as unique_recipients
        FROM member_upgrade_rewards_status
    ),
    timer_stats AS (
        SELECT 
            COUNT(*) as total_timers,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_timers,
            COUNT(CASE WHEN end_time <= NOW() THEN 1 END) as expired_timers
        FROM countdown_timers
        WHERE timer_type = 'r_position_qualification'
    )
    SELECT json_build_object(
        'reward_stats', json_build_object(
            'total_rewards', s.total_rewards,
            'approved_rewards', s.approved_rewards,
            'pending_rewards', s.pending_rewards,
            'total_approved_amount', s.total_approved_amount,
            'total_pending_amount', s.total_pending_amount,
            'unique_recipients', s.unique_recipients
        ),
        'timer_stats', json_build_object(
            'total_timers', t.total_timers,
            'active_timers', t.active_timers,
            'expired_timers', t.expired_timers
        )
    ) INTO stats_data
    FROM system_stats s, timer_stats t;
    
    -- 构建最终结果
    result_data := json_build_object(
        'success', true,
        'stats', stats_data,
        'generated_at', NOW()
    );
    
    RETURN result_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 手动批准待定奖励的RPC函数 (管理员功能)
CREATE OR REPLACE FUNCTION rpc_approve_pending_reward(
    reward_uuid UUID,
    admin_wallet VARCHAR(42)
)
RETURNS JSON AS $$
DECLARE
    result_data JSON;
    affected_rows INTEGER;
BEGIN
    -- 检查是否存在待定奖励
    IF NOT EXISTS (
        SELECT 1 FROM layer_rewards 
        WHERE id = reward_uuid AND status = 'pending'
    ) THEN
        result_data := json_build_object(
            'success', false,
            'error', 'Reward not found or not in pending status'
        );
        RETURN result_data;
    END IF;
    
    -- 批准奖励
    UPDATE layer_rewards 
    SET 
        status = 'approved',
        qualification_check = true,
        updated_at = NOW()
    WHERE id = reward_uuid AND status = 'pending';
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- 如果有相关计时器，也要完成它
    UPDATE countdown_timers 
    SET 
        is_active = false,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE related_reward_id = reward_uuid;
    
    result_data := json_build_object(
        'success', true,
        'reward_id', reward_uuid,
        'approved_by', admin_wallet,
        'approved_at', NOW(),
        'affected_rewards', affected_rows
    );
    
    RETURN result_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权RPC函数给认证用户
GRANT EXECUTE ON FUNCTION rpc_trigger_upgrade_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_member_reward_status TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_check_r_qualification TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_batch_check_pending TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_reward_timers TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_reward_system_stats TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_approve_pending_reward TO authenticated;

-- 创建使用说明的view
CREATE OR REPLACE VIEW reward_system_rpc_guide AS
SELECT 
    'RPC Function Usage Guide' as title,
    json_build_object(
        'trigger_upgrade_rewards', json_build_object(
            'function', 'rpc_trigger_upgrade_rewards(wallet_address, level)',
            'description', 'Trigger Level upgrade rewards for a member',
            'example', 'SELECT rpc_trigger_upgrade_rewards(''0x123...'', 1)'
        ),
        'get_reward_status', json_build_object(
            'function', 'rpc_get_member_reward_status(wallet_address)',
            'description', 'Get reward status for a member',
            'example', 'SELECT rpc_get_member_reward_status(''0x123...'')'
        ),
        'check_r_qualification', json_build_object(
            'function', 'rpc_check_r_qualification(timer_uuid)',
            'description', 'Check R position qualification for a timer',
            'example', 'SELECT rpc_check_r_qualification(''uuid-here'')'
        ),
        'batch_check', json_build_object(
            'function', 'rpc_batch_check_pending()',
            'description', 'Check all pending R position rewards',
            'example', 'SELECT rpc_batch_check_pending()'
        ),
        'get_timers', json_build_object(
            'function', 'rpc_get_reward_timers(wallet_address)',
            'description', 'Get reward timers (optional wallet filter)',
            'example', 'SELECT rpc_get_reward_timers() or rpc_get_reward_timers(''0x123...'')'
        ),
        'system_stats', json_build_object(
            'function', 'rpc_get_reward_system_stats()',
            'description', 'Get reward system statistics',
            'example', 'SELECT rpc_get_reward_system_stats()'
        ),
        'approve_reward', json_build_object(
            'function', 'rpc_approve_pending_reward(reward_uuid, admin_wallet)',
            'description', 'Manually approve pending reward (admin)',
            'example', 'SELECT rpc_approve_pending_reward(''reward-uuid'', ''0xadmin...'')'
        )
    ) as usage_examples;

-- 测试RPC函数
SELECT '=== Testing RPC Functions ===' as test_section;

-- 测试系统统计
SELECT '=== System Stats ===' as section;
SELECT rpc_get_reward_system_stats() as system_stats;

-- 测试获取计时器
SELECT '=== All Reward Timers ===' as section;
SELECT rpc_get_reward_timers() as all_timers;