-- 创建pending奖励倒计时系统
-- ========================================
-- 为pending状态的奖励创建倒计时管理和定时任务
-- ========================================

SELECT '=== 创建Pending奖励倒计时系统 ===' as timer_system_section;

-- 第1步：创建奖励倒计时表
-- ========================================

CREATE TABLE IF NOT EXISTS reward_timers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reward_id UUID NOT NULL REFERENCES layer_rewards(id) ON DELETE CASCADE,
    recipient_wallet VARCHAR(42) NOT NULL,
    timer_type VARCHAR(20) NOT NULL, -- 'super_root_upgrade', 'qualification_wait'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    time_remaining_seconds INTEGER GENERATED ALWAYS AS (
        GREATEST(0, EXTRACT(EPOCH FROM (expires_at - NOW()))::INTEGER)
    ) STORED,
    is_active BOOLEAN DEFAULT true,
    is_expired BOOLEAN GENERATED ALWAYS AS (NOW() > expires_at) STORED,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_reward_timers_recipient ON reward_timers(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_reward_timers_active ON reward_timers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reward_timers_expires ON reward_timers(expires_at);

-- 第2步：创建倒计时管理函数
-- ========================================

CREATE OR REPLACE FUNCTION create_reward_timer(
    p_reward_id UUID,
    p_recipient_wallet VARCHAR(42),
    p_timer_type VARCHAR(20),
    p_duration_hours INTEGER DEFAULT 72
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    timer_id UUID;
    expires_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 计算过期时间
    expires_time := NOW() + (p_duration_hours || ' hours')::INTERVAL;
    
    -- 创建倒计时记录
    INSERT INTO reward_timers (
        reward_id,
        recipient_wallet,
        timer_type,
        expires_at
    ) VALUES (
        p_reward_id,
        p_recipient_wallet,
        p_timer_type,
        expires_time
    ) RETURNING id INTO timer_id;
    
    RETURN json_build_object(
        'success', true,
        'timer_id', timer_id,
        'expires_at', expires_time,
        'duration_hours', p_duration_hours
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Timer creation failed: ' || SQLERRM
    );
END;
$$;

-- 第3步：创建获取用户倒计时函数
-- ========================================

CREATE OR REPLACE FUNCTION get_user_pending_rewards(
    p_wallet_address VARCHAR(42)
)
RETURNS TABLE (
    reward_id UUID,
    reward_amount DECIMAL(18,6),
    triggering_member_username VARCHAR(50),
    timer_type VARCHAR(20),
    time_remaining_seconds INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    status_description TEXT,
    can_claim BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lr.id as reward_id,
        lr.reward_amount,
        trigger_u.username as triggering_member_username,
        rt.timer_type,
        rt.time_remaining_seconds,
        rt.expires_at,
        CASE 
            WHEN rt.is_expired THEN '倒计时已结束，检查资格'
            WHEN rt.timer_type = 'super_root_upgrade' THEN '等待Super Root升级到Level 2'
            WHEN rt.timer_type = 'qualification_wait' THEN '等待资格条件满足'
            ELSE '等待中...'
        END as status_description,
        (lr.status = 'claimable' OR rt.is_expired) as can_claim
    FROM layer_rewards lr
    JOIN reward_timers rt ON lr.id = rt.reward_id
    JOIN members trigger_m ON lr.triggering_member_wallet = trigger_m.wallet_address
    JOIN users trigger_u ON trigger_m.wallet_address = trigger_u.wallet_address
    WHERE lr.reward_recipient_wallet = p_wallet_address
    AND lr.status = 'pending'
    AND rt.is_active = true
    ORDER BY rt.expires_at ASC;
END;
$$;

-- 第4步：创建倒计时检查和更新函数
-- ========================================

CREATE OR REPLACE FUNCTION process_expired_timers()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_timer RECORD;
    processed_count INTEGER := 0;
    updated_count INTEGER := 0;
BEGIN
    -- 处理过期的倒计时
    FOR expired_timer IN 
        SELECT 
            rt.id as timer_id,
            rt.reward_id,
            rt.recipient_wallet,
            rt.timer_type,
            lr.reward_recipient_wallet,
            root_m.activation_sequence,
            root_m.current_level
        FROM reward_timers rt
        JOIN layer_rewards lr ON rt.reward_id = lr.id
        JOIN members root_m ON lr.reward_recipient_wallet = root_m.wallet_address
        WHERE rt.is_expired = true
        AND rt.is_active = true
        AND lr.status = 'pending'
    LOOP
        processed_count := processed_count + 1;
        
        -- 检查奖励是否可以变为claimable
        IF expired_timer.timer_type = 'super_root_upgrade' AND expired_timer.current_level >= 2 THEN
            -- Super Root已升级，奖励变为可领取
            UPDATE layer_rewards 
            SET status = 'claimable',
                updated_at = NOW()
            WHERE id = expired_timer.reward_id;
            
            updated_count := updated_count + 1;
            
        ELSIF expired_timer.timer_type = 'qualification_wait' THEN
            -- 检查其他资格条件（直推等）
            DECLARE
                direct_refs INTEGER;
            BEGIN
                SELECT COUNT(*) INTO direct_refs
                FROM referrals
                WHERE referrer_wallet = expired_timer.recipient_wallet
                AND is_direct_referral = true;
                
                IF direct_refs >= 3 AND expired_timer.current_level >= 2 THEN
                    UPDATE layer_rewards 
                    SET status = 'claimable',
                        updated_at = NOW()
                    WHERE id = expired_timer.reward_id;
                    
                    updated_count := updated_count + 1;
                END IF;
            END;
        END IF;
        
        -- 标记倒计时为非活跃状态
        UPDATE reward_timers 
        SET is_active = false,
            updated_at = NOW()
        WHERE id = expired_timer.timer_id;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'processed_timers', processed_count,
        'updated_rewards', updated_count,
        'processed_at', NOW()
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Timer processing failed: ' || SQLERRM
    );
END;
$$;

-- 第5步：为现有的pending奖励创建倒计时
-- ========================================

DO $$
DECLARE
    pending_reward RECORD;
    timer_result JSON;
    created_count INTEGER := 0;
BEGIN
    RAISE NOTICE '为现有pending奖励创建倒计时...';
    
    FOR pending_reward IN
        SELECT 
            lr.id as reward_id,
            lr.reward_recipient_wallet,
            root_m.activation_sequence,
            lr.expires_at
        FROM layer_rewards lr
        JOIN members root_m ON lr.reward_recipient_wallet = root_m.wallet_address
        WHERE lr.status = 'pending'
        AND NOT EXISTS (
            SELECT 1 FROM reward_timers rt 
            WHERE rt.reward_id = lr.id AND rt.is_active = true
        )
    LOOP
        -- 为Super Root创建72小时倒计时，其他创建30天倒计时
        SELECT create_reward_timer(
            pending_reward.reward_id,
            pending_reward.reward_recipient_wallet,
            CASE WHEN pending_reward.activation_sequence = 0 
                 THEN 'super_root_upgrade' 
                 ELSE 'qualification_wait' END,
            CASE WHEN pending_reward.activation_sequence = 0 
                 THEN 72 
                 ELSE 720 END -- 30天
        ) INTO timer_result;
        
        created_count := created_count + 1;
        
        RAISE NOTICE '创建倒计时: 奖励ID %, 钱包 %, 类型 %',
            pending_reward.reward_id,
            pending_reward.reward_recipient_wallet,
            CASE WHEN pending_reward.activation_sequence = 0 THEN 'super_root_upgrade' ELSE 'qualification_wait' END;
    END LOOP;
    
    RAISE NOTICE '倒计时创建完成: 总计创建了%个倒计时', created_count;
END $$;

-- 第6步：创建RLS策略
-- ========================================

ALTER TABLE reward_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reward timers" ON reward_timers
    FOR SELECT USING (recipient_wallet::text = get_current_wallet_address()::text);

CREATE POLICY "System can manage reward timers" ON reward_timers
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access reward_timers" ON reward_timers
    FOR ALL USING (true) WITH CHECK (true);

-- 第7步：验证倒计时系统
-- ========================================

SELECT '=== 倒计时系统验证 ===' as verification_section;

-- 显示所有活跃的倒计时
SELECT 
    rt.recipient_wallet,
    u.username,
    rt.timer_type,
    rt.time_remaining_seconds,
    rt.expires_at,
    lr.reward_amount,
    lr.status
FROM reward_timers rt
JOIN users u ON rt.recipient_wallet = u.wallet_address
JOIN layer_rewards lr ON rt.reward_id = lr.id
WHERE rt.is_active = true
ORDER BY rt.expires_at;

-- 统计信息
SELECT 
    COUNT(*) as total_timers,
    COUNT(*) FILTER (WHERE is_active = true) as active_timers,
    COUNT(*) FILTER (WHERE is_expired = true) as expired_timers,
    COUNT(*) FILTER (WHERE timer_type = 'super_root_upgrade') as super_root_timers,
    COUNT(*) FILTER (WHERE timer_type = 'qualification_wait') as qualification_timers
FROM reward_timers;

SELECT '✅ Pending奖励倒计时系统创建完成' as completion_message;