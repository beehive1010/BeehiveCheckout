-- 实现奖励延迟和升级验证系统
-- 执行日期: 2025-09-29
-- 
-- 功能：
-- 1. 不符合等级要求的奖励设为pending状态，启动15分钟倒计时
-- 2. 升级后奖励立即变为claimable
-- 3. 超时后执行rollup，记录rollup和给接收者claimable
-- 4. 同步更新member_balance

-- 1. 创建奖励计时器表
CREATE TABLE IF NOT EXISTS reward_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('direct_referral', 'layer_reward')),
    reward_id UUID NOT NULL,
    recipient_wallet TEXT NOT NULL,
    required_level INTEGER NOT NULL,
    current_level INTEGER NOT NULL,
    timer_start TIMESTAMP DEFAULT NOW(),
    timer_end TIMESTAMP DEFAULT (NOW() + INTERVAL '15 minutes'),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'upgraded', 'expired')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_reward_timers_status_end ON reward_timers(status, timer_end);
CREATE INDEX IF NOT EXISTS idx_reward_timers_recipient ON reward_timers(recipient_wallet);

-- 2. 创建奖励升级验证函数
CREATE OR REPLACE FUNCTION check_and_activate_pending_rewards(wallet_address TEXT)
RETURNS TABLE(
    activated_count INTEGER,
    activated_amount NUMERIC
) AS $$
DECLARE
    timer_record RECORD;
    total_activated INTEGER := 0;
    total_amount NUMERIC := 0;
BEGIN
    -- 检查该地址的所有pending奖励
    FOR timer_record IN
        SELECT 
            rt.id as timer_id,
            rt.reward_type,
            rt.reward_id,
            rt.required_level,
            m.current_level
        FROM reward_timers rt
        JOIN members m ON rt.recipient_wallet = m.wallet_address
        WHERE rt.recipient_wallet = wallet_address
            AND rt.status = 'active'
            AND m.current_level >= rt.required_level
    LOOP
        -- 更新计时器状态
        UPDATE reward_timers 
        SET 
            status = 'upgraded',
            updated_at = NOW(),
            metadata = metadata || jsonb_build_object('upgrade_time', NOW())
        WHERE id = timer_record.timer_id;
        
        -- 激活相应的奖励
        IF timer_record.reward_type = 'direct_referral' THEN
            UPDATE direct_referral_rewards 
            SET status = 'claimable'
            WHERE id = timer_record.reward_id;
            
            SELECT reward_amount INTO total_amount 
            FROM direct_referral_rewards 
            WHERE id = timer_record.reward_id;
            
        ELSIF timer_record.reward_type = 'layer_reward' THEN
            UPDATE layer_rewards 
            SET status = 'claimable'
            WHERE id = timer_record.reward_id;
            
            SELECT reward_amount INTO total_amount 
            FROM layer_rewards 
            WHERE id = timer_record.reward_id;
        END IF;
        
        total_activated := total_activated + 1;
    END LOOP;
    
    RETURN QUERY SELECT total_activated, total_amount;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建超时处理函数
CREATE OR REPLACE FUNCTION process_expired_reward_timers()
RETURNS TABLE(
    expired_count INTEGER,
    rollup_count INTEGER,
    total_rolled_amount NUMERIC
) AS $$
DECLARE
    timer_record RECORD;
    rollup_target TEXT;
    total_expired INTEGER := 0;
    total_rollups INTEGER := 0;
    total_amount NUMERIC := 0;
    reward_amount NUMERIC;
BEGIN
    -- 处理所有过期的计时器
    FOR timer_record IN
        SELECT 
            rt.id as timer_id,
            rt.reward_type,
            rt.reward_id,
            rt.recipient_wallet,
            rt.metadata
        FROM reward_timers rt
        WHERE rt.status = 'active'
            AND rt.timer_end < NOW()
    LOOP
        -- 标记计时器为过期
        UPDATE reward_timers 
        SET 
            status = 'expired',
            updated_at = NOW(),
            metadata = metadata || jsonb_build_object('expired_time', NOW())
        WHERE id = timer_record.timer_id;
        
        total_expired := total_expired + 1;
        
        -- 执行rollup逻辑
        IF timer_record.reward_type = 'direct_referral' THEN
            -- 直推奖励过期，设为expired
            UPDATE direct_referral_rewards 
            SET status = 'expired'
            WHERE id = timer_record.reward_id;
            
        ELSIF timer_record.reward_type = 'layer_reward' THEN
            -- 获取奖励信息
            SELECT lr.reward_amount, lr.matrix_root_wallet 
            INTO reward_amount, rollup_target
            FROM layer_rewards lr
            WHERE id = timer_record.reward_id;
            
            -- 将layer奖励rollup给matrix root
            UPDATE layer_rewards 
            SET 
                status = 'rolled_up',
                rolled_up_to = rollup_target,
                roll_up_reason = 'Timer expired - insufficient level',
                expires_at = NOW()
            WHERE id = timer_record.reward_id;
            
            -- 创建新的奖励记录给matrix root
            INSERT INTO layer_rewards (
                triggering_member_wallet,
                reward_recipient_wallet,
                matrix_root_wallet,
                triggering_nft_level,
                reward_amount,
                matrix_layer,
                status,
                recipient_required_level,
                recipient_current_level,
                requires_direct_referrals,
                direct_referrals_required,
                direct_referrals_current,
                created_at
            )
            SELECT 
                lr.triggering_member_wallet,
                rollup_target as reward_recipient_wallet,
                lr.matrix_root_wallet,
                lr.triggering_nft_level,
                lr.reward_amount,
                lr.matrix_layer,
                'claimable' as status,
                lr.matrix_layer as recipient_required_level,
                COALESCE(mr.current_level, 0) as recipient_current_level,
                false as requires_direct_referrals,
                0 as direct_referrals_required,
                0 as direct_referrals_current,
                NOW() as created_at
            FROM layer_rewards lr
            LEFT JOIN members mr ON rollup_target = mr.wallet_address
            WHERE lr.id = timer_record.reward_id;
            
            total_rollups := total_rollups + 1;
            total_amount := total_amount + reward_amount;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT total_expired, total_rollups, total_amount;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建奖励状态同步函数
CREATE OR REPLACE FUNCTION sync_member_balance(wallet_address TEXT DEFAULT NULL)
RETURNS TABLE(
    updated_wallets INTEGER,
    total_claimable NUMERIC
) AS $$
DECLARE
    updated_count INTEGER := 0;
    total_amount NUMERIC := 0;
    wallet_filter TEXT;
BEGIN
    -- 如果指定了地址，则只更新该地址
    wallet_filter := COALESCE(wallet_address, '%');
    
    -- 更新member_balance表
    UPDATE member_balance mb
    SET 
        claimable_rewards = COALESCE(combined_stats.total_claimable_count, 0),
        claimable_amount_usdt = COALESCE(combined_stats.total_claimable_amount, 0),
        pending_rewards = COALESCE(combined_stats.total_pending_count, 0),
        reward_balance = COALESCE(combined_stats.total_claimable_amount, 0),
        available_balance = COALESCE(combined_stats.total_claimable_amount, 0),
        balance_updated = NOW()
    FROM (
        SELECT 
            wallet_addr,
            SUM(claimable_count) as total_claimable_count,
            SUM(claimable_amount) as total_claimable_amount,
            SUM(pending_count) as total_pending_count
        FROM (
            -- 直推奖励统计
            SELECT 
                drr.referrer_wallet as wallet_addr,
                COUNT(CASE WHEN drr.status = 'claimable' THEN 1 END) as claimable_count,
                SUM(CASE WHEN drr.status = 'claimable' THEN drr.reward_amount ELSE 0 END) as claimable_amount,
                COUNT(CASE WHEN drr.status = 'pending' THEN 1 END) as pending_count
            FROM direct_referral_rewards drr
            WHERE drr.referrer_wallet LIKE wallet_filter
            GROUP BY drr.referrer_wallet
            
            UNION ALL
            
            -- 层级奖励统计
            SELECT 
                lr.reward_recipient_wallet as wallet_addr,
                COUNT(CASE WHEN lr.status = 'claimable' THEN 1 END) as claimable_count,
                SUM(CASE WHEN lr.status = 'claimable' THEN lr.reward_amount ELSE 0 END) as claimable_amount,
                COUNT(CASE WHEN lr.status = 'pending' THEN 1 END) as pending_count
            FROM layer_rewards lr
            WHERE lr.matrix_layer >= 2
                AND lr.reward_recipient_wallet LIKE wallet_filter
            GROUP BY lr.reward_recipient_wallet
        ) reward_stats
        GROUP BY wallet_addr
    ) combined_stats
    WHERE mb.wallet_address = combined_stats.wallet_addr
        AND mb.wallet_address LIKE wallet_filter;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    SELECT COALESCE(SUM(claimable_amount_usdt), 0) INTO total_amount
    FROM member_balance 
    WHERE wallet_address LIKE wallet_filter;
    
    RETURN QUERY SELECT updated_count, total_amount;
END;
$$ LANGUAGE plpgsql;

-- 5. 重新处理当前不符合等级要求的奖励
SELECT 'Setting up Reward Timer System' as section;

-- 首先恢复之前设为expired的直推奖励到pending状态
-- 并创建计时器记录
WITH expired_direct_rewards AS (
    SELECT 
        drr.id,
        drr.referrer_wallet,
        drs.referral_number,
        drs.required_level,
        m.current_level
    FROM direct_referral_rewards drr
    JOIN direct_referral_sequence drs ON drr.referrer_wallet = drs.referrer_wallet 
        AND drr.referred_member_wallet = drs.member_wallet
    JOIN members m ON drr.referrer_wallet = m.wallet_address
    WHERE drr.status = 'expired'
        AND m.current_level < drs.required_level
)
UPDATE direct_referral_rewards 
SET status = 'pending'
WHERE id IN (SELECT id FROM expired_direct_rewards);

-- 为pending的直推奖励创建计时器
INSERT INTO reward_timers (
    reward_type,
    reward_id,
    recipient_wallet,
    required_level,
    current_level,
    metadata
)
SELECT 
    'direct_referral' as reward_type,
    drr.id as reward_id,
    drr.referrer_wallet as recipient_wallet,
    drs.required_level,
    m.current_level,
    jsonb_build_object(
        'referral_number', drs.referral_number,
        'reason', 'Level insufficient for direct referral position'
    )
FROM direct_referral_rewards drr
JOIN direct_referral_sequence drs ON drr.referrer_wallet = drs.referrer_wallet 
    AND drr.referred_member_wallet = drs.member_wallet
JOIN members m ON drr.referrer_wallet = m.wallet_address
WHERE drr.status = 'pending'
    AND m.current_level < drs.required_level;

-- 处理layer奖励的pending状态
UPDATE layer_rewards lr
SET status = 'pending'
FROM member_trigger_sequence mts
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.triggering_member_wallet = mts.triggering_member_wallet
    AND lr.reward_recipient_wallet = mts.reward_recipient_wallet
    AND lr.matrix_layer = mts.matrix_layer
    AND lr.status = 'claimable'
    AND lr.matrix_layer >= 2
    AND m.current_level < mts.required_level;

-- 为pending的layer奖励创建计时器
INSERT INTO reward_timers (
    reward_type,
    reward_id,
    recipient_wallet,
    required_level,
    current_level,
    metadata
)
SELECT 
    'layer_reward' as reward_type,
    lr.id as reward_id,
    lr.reward_recipient_wallet as recipient_wallet,
    mts.required_level,
    m.current_level,
    jsonb_build_object(
        'matrix_layer', lr.matrix_layer,
        'trigger_sequence', mts.trigger_sequence,
        'reason', 'Level insufficient for layer reward'
    )
FROM layer_rewards lr
JOIN member_trigger_sequence mts ON lr.triggering_member_wallet = mts.triggering_member_wallet
    AND lr.reward_recipient_wallet = mts.reward_recipient_wallet
    AND lr.matrix_layer = mts.matrix_layer
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.status = 'pending'
    AND m.current_level < mts.required_level;

-- 6. 立即同步member_balance
SELECT 'Syncing Member Balances' as section;
SELECT * FROM sync_member_balance();

-- 7. 验证结果
SELECT 'Timer System Validation' as section;

-- 检查计时器统计
SELECT 
    'Timer Statistics' as subsection,
    reward_type,
    status,
    COUNT(*) as count,
    ROUND(AVG(EXTRACT(EPOCH FROM (timer_end - NOW()))/60), 2) as avg_remaining_minutes
FROM reward_timers 
GROUP BY reward_type, status
ORDER BY reward_type, status;

-- 检查pending奖励
SELECT 
    'Pending Rewards Summary' as subsection,
    'Direct Referral' as reward_type,
    COUNT(*) as pending_count,
    SUM(reward_amount) as pending_amount
FROM direct_referral_rewards 
WHERE status = 'pending'

UNION ALL

SELECT 
    'Pending Rewards Summary' as subsection,
    'Layer Reward' as reward_type,
    COUNT(*) as pending_count,
    SUM(reward_amount) as pending_amount
FROM layer_rewards 
WHERE status = 'pending' AND matrix_layer >= 2;

-- 检查特定地址的状态
SELECT 
    'Test Address Status After Timer Setup' as subsection,
    mb.wallet_address,
    mb.username,
    mb.current_level,
    mb.claimable_amount_usdt,
    mb.pending_rewards,
    COUNT(rt.id) as active_timers
FROM member_balance mb
LEFT JOIN reward_timers rt ON mb.wallet_address = rt.recipient_wallet AND rt.status = 'active'
WHERE mb.wallet_address = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
GROUP BY mb.wallet_address, mb.username, mb.current_level, mb.claimable_amount_usdt, mb.pending_rewards;

SELECT '奖励计时器系统实现完成！' as final_status;