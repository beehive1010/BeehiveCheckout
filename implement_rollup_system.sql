-- 实现严格的Rollup系统
-- 执行日期: 2025-09-29
-- 
-- 规则：
-- 1. 奖励过期后不可激活，必须rollup
-- 2. Rollup时查找上层符合条件的会员
-- 3. 给符合条件的上层会员创建新的claimable奖励

-- 1. 创建rollup处理函数
CREATE OR REPLACE FUNCTION process_reward_rollup(
    expired_reward_id UUID,
    reward_type TEXT
) RETURNS TABLE(
    rollup_success BOOLEAN,
    rollup_target TEXT,
    rollup_amount NUMERIC,
    rollup_reason TEXT
) AS $$
DECLARE
    original_recipient TEXT;
    original_amount NUMERIC;
    rollup_candidate TEXT;
    candidate_level INTEGER;
    required_level INTEGER;
    original_referrer TEXT;
    referral_sequence INTEGER;
BEGIN
    -- 获取过期奖励的基本信息
    IF reward_type = 'direct_referral' THEN
        SELECT 
            drr.referrer_wallet,
            drr.reward_amount,
            drs.required_level,
            drs.referral_number
        INTO original_recipient, original_amount, required_level, referral_sequence
        FROM direct_referral_rewards drr
        JOIN direct_referral_sequence drs ON drr.referrer_wallet = drs.referrer_wallet 
            AND drr.referred_member_wallet = drs.member_wallet
        WHERE drr.id = expired_reward_id;
        
        -- 获取原始推荐人的推荐人（上层）
        SELECT referrer_wallet INTO original_referrer
        FROM members 
        WHERE wallet_address = original_recipient;
        
    ELSIF reward_type = 'layer_reward' THEN
        SELECT 
            lr.reward_recipient_wallet,
            lr.reward_amount,
            lr.matrix_layer,
            lr.matrix_root_wallet
        INTO original_recipient, original_amount, required_level, original_referrer
        FROM layer_rewards lr
        WHERE lr.id = expired_reward_id;
    END IF;
    
    -- 查找符合条件的上层会员
    -- 1. 首先查找直接上层（referrer）
    SELECT wallet_address, current_level 
    INTO rollup_candidate, candidate_level
    FROM members 
    WHERE wallet_address = original_referrer
        AND current_level >= required_level;
    
    -- 2. 如果直接上层不符合条件，查找更上层
    IF rollup_candidate IS NULL THEN
        WITH RECURSIVE upline_search AS (
            -- 起始点：原始推荐人的推荐人
            SELECT m.wallet_address, m.referrer_wallet, m.current_level, 1 as level_depth
            FROM members m
            WHERE m.wallet_address = original_referrer
            
            UNION ALL
            
            -- 递归：继续向上查找
            SELECT m.wallet_address, m.referrer_wallet, m.current_level, us.level_depth + 1
            FROM members m
            JOIN upline_search us ON m.wallet_address = us.referrer_wallet
            WHERE us.level_depth < 10  -- 限制搜索深度
                AND m.referrer_wallet IS NOT NULL
        )
        SELECT wallet_address, current_level
        INTO rollup_candidate, candidate_level
        FROM upline_search
        WHERE current_level >= required_level
        ORDER BY level_depth
        LIMIT 1;
    END IF;
    
    -- 3. 如果还是找不到，rollup给系统根节点
    IF rollup_candidate IS NULL THEN
        SELECT '0x0000000000000000000000000000000000000001', 3
        INTO rollup_candidate, candidate_level;
    END IF;
    
    -- 执行rollup
    IF reward_type = 'direct_referral' THEN
        -- 标记原奖励为已rollup
        UPDATE direct_referral_rewards 
        SET 
            status = 'expired',  -- 保持expired状态，不能恢复
            metadata = metadata || jsonb_build_object(
                'rolled_up_at', NOW(),
                'rolled_up_to', rollup_candidate,
                'rollup_reason', CONCAT('Level insufficient - required ', required_level, ', had level below requirement')
            )
        WHERE id = expired_reward_id;
        
        -- 为符合条件的上层创建新奖励
        INSERT INTO direct_referral_rewards (
            referrer_wallet,
            referred_member_wallet,
            reward_amount,
            status,
            created_at,
            metadata
        ) VALUES (
            rollup_candidate,
            (SELECT referred_member_wallet FROM direct_referral_rewards WHERE id = expired_reward_id),
            original_amount,
            'claimable',
            NOW(),
            jsonb_build_object(
                'type', 'rollup_reward',
                'rolled_up_from', original_recipient,
                'original_reward_id', expired_reward_id,
                'rollup_reason', 'Inherited from insufficient level member'
            )
        );
        
    ELSIF reward_type = 'layer_reward' THEN
        -- 标记原layer奖励为rolled_up
        UPDATE layer_rewards 
        SET 
            status = 'rolled_up',
            rolled_up_to = rollup_candidate,
            roll_up_reason = CONCAT('Level insufficient - rolled up to qualified member'),
            expires_at = NOW()
        WHERE id = expired_reward_id;
        
        -- 为符合条件的上层创建新layer奖励
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
            rollup_candidate,
            lr.matrix_root_wallet,
            lr.triggering_nft_level,
            lr.reward_amount,
            lr.matrix_layer,
            'claimable',
            lr.matrix_layer,
            candidate_level,
            false,
            0,
            0,
            NOW()
        FROM layer_rewards lr
        WHERE lr.id = expired_reward_id;
    END IF;
    
    RETURN QUERY SELECT 
        true,
        rollup_candidate,
        original_amount,
        CONCAT('Rolled up from ', original_recipient, ' to ', rollup_candidate, ' (Level ', candidate_level, ')');
END;
$$ LANGUAGE plpgsql;

-- 2. 创建批量处理过期奖励的函数
CREATE OR REPLACE FUNCTION process_all_expired_rewards()
RETURNS TABLE(
    processed_count INTEGER,
    rollup_summary TEXT
) AS $$
DECLARE
    expired_reward RECORD;
    total_processed INTEGER := 0;
    rollup_results TEXT := '';
    rollup_result RECORD;
BEGIN
    -- 处理所有过期的直推奖励
    FOR expired_reward IN
        SELECT id, 'direct_referral' as reward_type
        FROM direct_referral_rewards 
        WHERE status = 'expired'
            AND metadata->>'rolled_up_at' IS NULL  -- 还没有被rollup的
    LOOP
        SELECT * INTO rollup_result 
        FROM process_reward_rollup(expired_reward.id, expired_reward.reward_type);
        
        IF rollup_result.rollup_success THEN
            total_processed := total_processed + 1;
            rollup_results := rollup_results || rollup_result.rollup_reason || '; ';
        END IF;
    END LOOP;
    
    -- 处理所有需要rollup的layer奖励（等级不足的）
    FOR expired_reward IN
        SELECT lr.id, 'layer_reward' as reward_type
        FROM layer_rewards lr
        JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
        WHERE lr.status = 'claimable'
            AND lr.matrix_layer > m.current_level  -- 等级不足
            AND lr.matrix_layer >= 2
    LOOP
        SELECT * INTO rollup_result 
        FROM process_reward_rollup(expired_reward.id, expired_reward.reward_type);
        
        IF rollup_result.rollup_success THEN
            total_processed := total_processed + 1;
            rollup_results := rollup_results || rollup_result.rollup_reason || '; ';
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT total_processed, rollup_results;
END;
$$ LANGUAGE plpgsql;

-- 3. 执行rollup处理
SELECT 'Processing Expired Rewards Rollup' as section;

-- 先手动处理0xA657F135485D8D28e893fd40c638BeF0d636d98F的过期奖励
SELECT 
    'Manual Rollup for Test Address' as subsection,
    drr.id,
    drr.referrer_wallet,
    drr.referred_member_wallet,
    drr.reward_amount,
    drr.status
FROM direct_referral_rewards drr
WHERE drr.referrer_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
    AND drr.status = 'expired';

-- 获取过期奖励的ID并执行rollup
DO $$
DECLARE
    expired_id UUID;
    rollup_result RECORD;
BEGIN
    -- 获取过期的第3个直推奖励ID
    SELECT id INTO expired_id
    FROM direct_referral_rewards 
    WHERE referrer_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
        AND status = 'expired'
    LIMIT 1;
    
    IF expired_id IS NOT NULL THEN
        SELECT * INTO rollup_result 
        FROM process_reward_rollup(expired_id, 'direct_referral');
        
        RAISE NOTICE 'Rollup Result: %', rollup_result.rollup_reason;
    END IF;
END $$;

-- 4. 执行全系统rollup处理
SELECT 'System-wide Rollup Processing' as section;
SELECT * FROM process_all_expired_rewards();

-- 5. 验证rollup结果
SELECT 'Rollup Validation' as section;

-- 检查原始地址的状态（应该还是2个claimable，1个expired且已rollup）
SELECT 
    'Original Address Status After Rollup' as subsection,
    drr.referrer_wallet,
    COUNT(*) as total_rewards,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_count,
    COUNT(CASE WHEN metadata->>'rolled_up_at' IS NOT NULL THEN 1 END) as rolled_up_count
FROM direct_referral_rewards drr
WHERE drr.referrer_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
GROUP BY drr.referrer_wallet;

-- 检查新创建的rollup奖励
SELECT 
    'New Rollup Rewards Created' as subsection,
    drr.referrer_wallet,
    ur.username as new_recipient,
    drr.referred_member_wallet,
    um.username as referred_name,
    drr.reward_amount,
    drr.status,
    drr.metadata->>'rollup_reason' as rollup_reason
FROM direct_referral_rewards drr
LEFT JOIN users ur ON drr.referrer_wallet = ur.wallet_address
LEFT JOIN users um ON drr.referred_member_wallet = um.wallet_address
WHERE drr.metadata->>'type' = 'rollup_reward'
ORDER BY drr.created_at DESC;

-- 6. 更新member_balance以反映rollup结果
UPDATE member_balance mb
SET 
    claimable_amount_usdt = COALESCE(reward_stats.claimable_amount, 0),
    claimable_rewards = COALESCE(reward_stats.claimable_count, 0),
    balance_updated = NOW()
FROM (
    SELECT 
        wallet_addr,
        SUM(claimable_amount) as claimable_amount,
        SUM(claimable_count) as claimable_count
    FROM (
        -- 直推奖励
        SELECT 
            drr.referrer_wallet as wallet_addr,
            SUM(CASE WHEN drr.status = 'claimable' THEN drr.reward_amount ELSE 0 END) as claimable_amount,
            COUNT(CASE WHEN drr.status = 'claimable' THEN 1 END) as claimable_count
        FROM direct_referral_rewards drr
        GROUP BY drr.referrer_wallet
        
        UNION ALL
        
        -- 层级奖励
        SELECT 
            lr.reward_recipient_wallet as wallet_addr,
            SUM(CASE WHEN lr.status = 'claimable' THEN lr.reward_amount ELSE 0 END) as claimable_amount,
            COUNT(CASE WHEN lr.status = 'claimable' THEN 1 END) as claimable_count
        FROM layer_rewards lr
        WHERE lr.matrix_layer >= 2
        GROUP BY lr.reward_recipient_wallet
    ) all_rewards
    GROUP BY wallet_addr
) reward_stats
WHERE mb.wallet_address = reward_stats.wallet_addr;

SELECT 'Rollup系统实现完成！过期奖励已严格rollup给上层符合条件的会员。' as final_status;