-- 修复奖励等级要求脚本
-- 执行日期: 2025-09-29
-- 
-- 规则：
-- 直推奖励：1st、2nd最小等级=1，3rd+最小等级=2
-- Layer奖励：1st、2nd最小等级=layer，3rd+最小等级=layer+1

-- 1. 创建触发序号视图
CREATE OR REPLACE VIEW member_trigger_sequence AS
WITH member_triggers AS (
    SELECT 
        lr.triggering_member_wallet,
        lr.reward_recipient_wallet,
        lr.matrix_layer,
        lr.created_at,
        ROW_NUMBER() OVER (
            PARTITION BY lr.reward_recipient_wallet, lr.matrix_layer 
            ORDER BY lr.created_at
        ) as trigger_sequence
    FROM layer_rewards lr
    WHERE lr.matrix_layer >= 2
)
SELECT 
    mt.*,
    CASE 
        WHEN mt.trigger_sequence <= 2 THEN mt.matrix_layer
        ELSE mt.matrix_layer + 1
    END as required_level
FROM member_triggers mt;

-- 2. 修复直推奖励等级要求
SELECT 'Fixing Direct Referral Level Requirements' as section;

-- 创建直推序号视图
CREATE OR REPLACE VIEW direct_referral_sequence AS
WITH referral_seq AS (
    SELECT 
        r.referrer_wallet,
        r.member_wallet,
        r.placed_at,
        ROW_NUMBER() OVER (PARTITION BY r.referrer_wallet ORDER BY r.placed_at) as referral_number
    FROM referrals r
    WHERE r.is_direct_referral = true
)
SELECT 
    rs.*,
    CASE 
        WHEN rs.referral_number <= 2 THEN 1
        ELSE 2
    END as required_level
FROM referral_seq rs;

-- 检查需要回滚的直推奖励
SELECT 
    'Direct Referrals Requiring Rollback' as subsection,
    drr.id,
    drr.referrer_wallet,
    ur.username as referrer_name,
    m_ref.current_level as referrer_level,
    drr.referred_member_wallet,
    um.username as referred_name,
    drs.referral_number,
    drs.required_level,
    drr.reward_amount,
    CASE 
        WHEN m_ref.current_level >= drs.required_level THEN 'VALID'
        ELSE 'NEEDS_ROLLBACK'
    END as action_needed
FROM direct_referral_rewards drr
JOIN direct_referral_sequence drs ON drr.referrer_wallet = drs.referrer_wallet 
    AND drr.referred_member_wallet = drs.member_wallet
JOIN members m_ref ON drr.referrer_wallet = m_ref.wallet_address
LEFT JOIN users ur ON drr.referrer_wallet = ur.wallet_address
LEFT JOIN users um ON drr.referred_member_wallet = um.wallet_address
WHERE drr.status = 'claimable'
    AND m_ref.current_level < drs.required_level
ORDER BY drr.referrer_wallet, drs.referral_number;

-- 回滚不符合等级要求的直推奖励
UPDATE direct_referral_rewards 
SET 
    status = 'rolled_up',
    metadata = metadata || jsonb_build_object(
        'rollback_reason', 'Insufficient level for direct referral position',
        'rollback_date', NOW(),
        'required_level', drs.required_level,
        'actual_level', m_ref.current_level
    )
FROM direct_referral_sequence drs
JOIN members m_ref ON direct_referral_rewards.referrer_wallet = m_ref.wallet_address
WHERE direct_referral_rewards.referrer_wallet = drs.referrer_wallet 
    AND direct_referral_rewards.referred_member_wallet = drs.member_wallet
    AND direct_referral_rewards.status = 'claimable'
    AND m_ref.current_level < drs.required_level;

-- 3. 修复Layer奖励等级要求
SELECT 'Fixing Layer Reward Level Requirements' as subsection;

-- 检查需要回滚的Layer奖励
SELECT 
    'Layer Rewards Requiring Rollback' as subsection,
    lr.id,
    lr.triggering_member_wallet,
    ut.username as triggering_name,
    lr.reward_recipient_wallet,
    ur.username as recipient_name,
    m_rec.current_level as recipient_level,
    lr.matrix_layer,
    mts.trigger_sequence,
    mts.required_level,
    lr.reward_amount,
    CASE 
        WHEN m_rec.current_level >= mts.required_level THEN 'VALID'
        ELSE 'NEEDS_ROLLBACK'
    END as action_needed
FROM layer_rewards lr
JOIN member_trigger_sequence mts ON lr.triggering_member_wallet = mts.triggering_member_wallet
    AND lr.reward_recipient_wallet = mts.reward_recipient_wallet
    AND lr.matrix_layer = mts.matrix_layer
JOIN members m_rec ON lr.reward_recipient_wallet = m_rec.wallet_address
LEFT JOIN users ut ON lr.triggering_member_wallet = ut.wallet_address
LEFT JOIN users ur ON lr.reward_recipient_wallet = ur.wallet_address
WHERE lr.status = 'claimable'
    AND lr.matrix_layer >= 2
    AND m_rec.current_level < mts.required_level
ORDER BY lr.matrix_layer, mts.trigger_sequence;

-- 回滚不符合等级要求的Layer奖励
UPDATE layer_rewards 
SET 
    status = 'rolled_up',
    roll_up_reason = CONCAT(
        'Trigger sequence ', mts.trigger_sequence, 
        ' requires level ', mts.required_level, 
        ' but recipient has level ', m_rec.current_level
    ),
    rolled_up_to = lr.matrix_root_wallet,
    expires_at = NOW()
FROM member_trigger_sequence mts
JOIN members m_rec ON layer_rewards.reward_recipient_wallet = m_rec.wallet_address
WHERE layer_rewards.triggering_member_wallet = mts.triggering_member_wallet
    AND layer_rewards.reward_recipient_wallet = mts.reward_recipient_wallet
    AND layer_rewards.matrix_layer = mts.matrix_layer
    AND layer_rewards.status = 'claimable'
    AND layer_rewards.matrix_layer >= 2
    AND m_rec.current_level < mts.required_level;

-- 为被回滚的Layer奖励创建新的奖励记录给matrix root
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
    lr.matrix_root_wallet as reward_recipient_wallet,
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
    NOW() as created_at,
    jsonb_build_object(
        'rolled_up_from', lr.reward_recipient_wallet,
        'rollup_reason', 'Level requirement validation',
        'original_reward_id', lr.id,
        'trigger_sequence_rule', 'applied'
    ) as metadata
FROM layer_rewards lr
LEFT JOIN members mr ON lr.matrix_root_wallet = mr.wallet_address
WHERE lr.status = 'rolled_up'
    AND lr.roll_up_reason LIKE '%Trigger sequence%'
    AND lr.matrix_root_wallet != lr.reward_recipient_wallet
    AND COALESCE(mr.current_level, 0) >= lr.matrix_layer;

-- 4. 验证修复结果
SELECT 'Validation Results' as section;

-- 直推奖励验证
SELECT 
    'Direct Referral Validation Summary' as subsection,
    COUNT(*) as total_direct_rewards,
    COUNT(CASE WHEN drr.status = 'claimable' THEN 1 END) as valid_rewards,
    COUNT(CASE WHEN drr.status = 'rolled_up' THEN 1 END) as rolled_back_rewards,
    SUM(CASE WHEN drr.status = 'claimable' THEN drr.reward_amount ELSE 0 END) as valid_amount,
    SUM(CASE WHEN drr.status = 'rolled_up' THEN drr.reward_amount ELSE 0 END) as rolled_back_amount
FROM direct_referral_rewards drr;

-- Layer奖励验证
SELECT 
    'Layer Reward Validation Summary' as subsection,
    lr.matrix_layer,
    COUNT(*) as total_rewards,
    COUNT(CASE WHEN lr.status = 'claimable' THEN 1 END) as valid_rewards,
    COUNT(CASE WHEN lr.status = 'rolled_up' THEN 1 END) as rolled_back_rewards,
    SUM(CASE WHEN lr.status = 'claimable' THEN lr.reward_amount ELSE 0 END) as valid_amount,
    SUM(CASE WHEN lr.status = 'rolled_up' THEN lr.reward_amount ELSE 0 END) as rolled_back_amount
FROM layer_rewards lr
WHERE lr.matrix_layer >= 2
GROUP BY lr.matrix_layer
ORDER BY lr.matrix_layer;

-- 显示前10名有效奖励获得者
SELECT 
    'Top Valid Reward Earners After Fix' as subsection,
    reward_recipient AS wallet_address,
    recipient_name AS username,
    SUM(direct_rewards) as total_direct_rewards,
    SUM(layer_rewards) as total_layer_rewards,
    SUM(direct_rewards + layer_rewards) as total_valid_rewards
FROM (
    SELECT 
        drr.referrer_wallet as reward_recipient,
        ur.username as recipient_name,
        SUM(CASE WHEN drr.status = 'claimable' THEN drr.reward_amount ELSE 0 END) as direct_rewards,
        0 as layer_rewards
    FROM direct_referral_rewards drr
    LEFT JOIN users ur ON drr.referrer_wallet = ur.wallet_address
    GROUP BY drr.referrer_wallet, ur.username
    
    UNION ALL
    
    SELECT 
        lr.reward_recipient_wallet as reward_recipient,
        ur.username as recipient_name,
        0 as direct_rewards,
        SUM(CASE WHEN lr.status = 'claimable' THEN lr.reward_amount ELSE 0 END) as layer_rewards
    FROM layer_rewards lr
    LEFT JOIN users ur ON lr.reward_recipient_wallet = ur.wallet_address
    WHERE lr.matrix_layer >= 2
    GROUP BY lr.reward_recipient_wallet, ur.username
) combined_rewards
GROUP BY reward_recipient, recipient_name
HAVING SUM(direct_rewards + layer_rewards) > 0
ORDER BY total_valid_rewards DESC
LIMIT 10;

SELECT '奖励等级要求修复完成！' as final_status;