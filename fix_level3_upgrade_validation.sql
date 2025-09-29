-- 修复3级奖励升级验证脚本
-- 执行日期: 2025-09-29

-- 1. 检查需要升级验证的3级奖励
SELECT 'Level 3 Upgrade Validation Fix' as section;

-- 找出所有等级不够的奖励接收者
SELECT 
    'Rewards Requiring Level Upgrade' as subsection,
    lr.id,
    lr.triggering_member_wallet,
    ut.username as triggering_name,
    lr.matrix_layer as required_level,
    lr.reward_recipient_wallet,
    ur.username as recipient_name,
    lr.recipient_current_level as recorded_level,
    COALESCE(mr.current_level, 0) as actual_current_level,
    lr.reward_amount,
    lr.status,
    CASE 
        WHEN COALESCE(mr.current_level, 0) < lr.matrix_layer THEN 'ROLL_UP_NEEDED'
        WHEN COALESCE(mr.current_level, 0) >= lr.matrix_layer THEN 'LEVEL_SUFFICIENT'
        ELSE 'CHECK_REQUIRED'
    END as validation_result
FROM layer_rewards lr
LEFT JOIN users ut ON lr.triggering_member_wallet = ut.wallet_address
LEFT JOIN users ur ON lr.reward_recipient_wallet = ur.wallet_address
LEFT JOIN members mr ON lr.reward_recipient_wallet = mr.wallet_address
WHERE lr.matrix_layer >= 3 
    AND lr.status = 'claimable'
ORDER BY lr.matrix_layer, lr.created_at;

-- 2. 创建升级验证函数
CREATE OR REPLACE FUNCTION validate_and_rollup_rewards() 
RETURNS TABLE(
    reward_id UUID,
    original_recipient TEXT,
    new_recipient TEXT,
    reward_amount NUMERIC,
    rollup_reason TEXT
) AS $$
DECLARE
    reward_record RECORD;
    rollup_target TEXT;
BEGIN
    -- 处理所有等级不够的奖励
    FOR reward_record IN
        SELECT 
            lr.id,
            lr.reward_recipient_wallet,
            lr.matrix_layer,
            lr.reward_amount,
            lr.matrix_root_wallet,
            COALESCE(mr.current_level, 0) as recipient_level
        FROM layer_rewards lr
        LEFT JOIN members mr ON lr.reward_recipient_wallet = mr.wallet_address
        WHERE lr.status = 'claimable'
            AND lr.matrix_layer >= 2
            AND COALESCE(mr.current_level, 0) < lr.matrix_layer
    LOOP
        -- 找到有足够等级的上级或滚回给系统
        SELECT m.wallet_address INTO rollup_target
        FROM members m
        WHERE m.current_level >= reward_record.matrix_layer
            AND m.wallet_address != reward_record.reward_recipient_wallet
        ORDER BY m.current_level ASC
        LIMIT 1;
        
        -- 如果找不到合适的接收者，滚回给matrix root
        IF rollup_target IS NULL THEN
            rollup_target := reward_record.matrix_root_wallet;
        END IF;
        
        -- 更新奖励记录
        UPDATE layer_rewards 
        SET 
            status = 'rolled_up',
            rolled_up_to = rollup_target,
            roll_up_reason = CONCAT('Level insufficient: has ', reward_record.recipient_level, ', requires ', reward_record.matrix_layer),
            expires_at = NOW()
        WHERE id = reward_record.id;
        
        -- 创建新的奖励记录给合适的接收者
        IF rollup_target IS NOT NULL AND rollup_target != reward_record.reward_recipient_wallet THEN
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
                created_at,
                metadata
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
                COALESCE(mt.current_level, 0) as recipient_current_level,
                false as requires_direct_referrals,
                0 as direct_referrals_required,
                0 as direct_referrals_current,
                NOW() as created_at,
                jsonb_build_object(
                    'rolled_up_from', reward_record.reward_recipient_wallet,
                    'rollup_reason', 'Level upgrade validation',
                    'original_reward_id', reward_record.id
                ) as metadata
            FROM layer_rewards lr
            LEFT JOIN members mt ON rollup_target = mt.wallet_address
            WHERE lr.id = reward_record.id;
        END IF;
        
        -- 返回处理结果
        RETURN QUERY SELECT 
            reward_record.id,
            reward_record.reward_recipient_wallet,
            rollup_target,
            reward_record.reward_amount,
            CONCAT('Level insufficient: has ', reward_record.recipient_level, ', requires ', reward_record.matrix_layer);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. 执行升级验证和滚回
SELECT 'Executing Level Validation and Rollup' as action;
SELECT * FROM validate_and_rollup_rewards();

-- 4. 验证修复结果
SELECT 'Post-Fix Validation' as section;

-- 检查所有奖励是否都有合适的等级
SELECT 
    'Final Level Validation Check' as subsection,
    lr.matrix_layer as required_level,
    COUNT(*) as total_rewards,
    COUNT(CASE WHEN COALESCE(mr.current_level, 0) >= lr.matrix_layer THEN 1 END) as valid_recipients,
    COUNT(CASE WHEN COALESCE(mr.current_level, 0) < lr.matrix_layer THEN 1 END) as invalid_recipients,
    COUNT(CASE WHEN lr.status = 'rolled_up' THEN 1 END) as rolled_up_count
FROM layer_rewards lr
LEFT JOIN members mr ON lr.reward_recipient_wallet = mr.wallet_address
WHERE lr.matrix_layer >= 2
GROUP BY lr.matrix_layer
ORDER BY lr.matrix_layer;

-- 显示滚回的奖励
SELECT 
    'Rolled Up Rewards' as subsection,
    lr.triggering_member_wallet,
    ut.username as triggering_name,
    lr.matrix_layer,
    lr.reward_recipient_wallet as original_recipient,
    ur.username as original_name,
    lr.rolled_up_to,
    urt.username as rollup_target_name,
    lr.reward_amount,
    lr.roll_up_reason
FROM layer_rewards lr
LEFT JOIN users ut ON lr.triggering_member_wallet = ut.wallet_address
LEFT JOIN users ur ON lr.reward_recipient_wallet = ur.wallet_address
LEFT JOIN users urt ON lr.rolled_up_to = urt.wallet_address
WHERE lr.status = 'rolled_up'
    AND lr.roll_up_reason LIKE '%Level insufficient%'
ORDER BY lr.matrix_layer, lr.created_at;

SELECT '3级奖励升级验证修复完成!' as final_status;