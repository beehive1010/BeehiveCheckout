-- 最终奖励系统修复脚本（大小写不敏感）
-- 执行日期: 2025-09-29

-- 1. 创建缺失奖金的修复函数
CREATE OR REPLACE FUNCTION fix_missing_rewards() 
RETURNS TABLE(wallet_address TEXT, missing_rewards_count INTEGER, total_missing_amount NUMERIC) 
AS $$
BEGIN
    -- 为所有有直推但没有相应奖金的会员补发奖金
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
    SELECT DISTINCT
        r.member_wallet as triggering_member_wallet,
        r.referrer_wallet as reward_recipient_wallet,
        r.matrix_root_wallet,
        1 as triggering_nft_level,
        100.00 as reward_amount,
        r.matrix_layer,
        'claimable' as status,
        1 as recipient_required_level,
        COALESCE(m.current_level, 1) as recipient_current_level,
        false as requires_direct_referrals,
        0 as direct_referrals_required,
        0 as direct_referrals_current,
        r.placed_at as created_at
    FROM referrals r
    JOIN members m ON LOWER(r.referrer_wallet) = LOWER(m.wallet_address)
    LEFT JOIN layer_rewards lr ON (
        LOWER(lr.triggering_member_wallet) = LOWER(r.member_wallet) 
        AND LOWER(lr.reward_recipient_wallet) = LOWER(r.referrer_wallet)
        AND lr.matrix_layer = r.matrix_layer
    )
    WHERE r.is_direct_referral = true
        AND m.current_level >= 1
        AND lr.id IS NULL  -- 没有现有的奖金记录
        AND r.placed_at IS NOT NULL;

    -- 返回修复统计
    RETURN QUERY
    SELECT 
        m.wallet_address::TEXT,
        COUNT(lr.id)::INTEGER as missing_rewards_count,
        COALESCE(SUM(lr.reward_amount), 0) as total_missing_amount
    FROM members m
    LEFT JOIN layer_rewards lr ON LOWER(lr.reward_recipient_wallet) = LOWER(m.wallet_address)
    WHERE m.current_level >= 1
        AND lr.created_at >= CURRENT_DATE - INTERVAL '1 hour'  -- 刚刚创建的奖金
    GROUP BY m.wallet_address
    HAVING COUNT(lr.id) > 0;
END;
$$ LANGUAGE plpgsql;

-- 2. 执行缺失奖金修复
SELECT 'Missing Rewards Fix' as section;
SELECT * FROM fix_missing_rewards();

-- 3. 创建大小写不敏感的会员余额更新
UPDATE member_balance 
SET 
    claimable_rewards = lr_stats.claimable_count,
    claimable_amount_usdt = lr_stats.claimable_amount,
    claimed_rewards = COALESCE(rc_stats.claimed_count, 0),
    claimed_amount_usdt = COALESCE(rc_stats.claimed_amount, 0),
    total_earned = lr_stats.total_earned + COALESCE(rc_stats.claimed_amount, 0),
    reward_balance = lr_stats.claimable_amount,
    available_balance = lr_stats.claimable_amount,
    balance_updated = NOW()
FROM (
    SELECT 
        reward_recipient_wallet,
        COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
        SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as claimable_amount,
        SUM(CASE WHEN status IN ('claimable', 'claimed') THEN reward_amount ELSE 0 END) as total_earned
    FROM layer_rewards 
    GROUP BY reward_recipient_wallet
) lr_stats 
LEFT JOIN (
    SELECT 
        root_wallet,
        COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_count,
        SUM(CASE WHEN status = 'claimed' THEN reward_amount_usdc ELSE 0 END) as claimed_amount
    FROM reward_claims 
    GROUP BY root_wallet
) rc_stats ON LOWER(lr_stats.reward_recipient_wallet) = LOWER(rc_stats.root_wallet)
WHERE LOWER(member_balance.wallet_address) = LOWER(lr_stats.reward_recipient_wallet);

-- 4. 检查特定地址的修复结果
SELECT 'Specific Address Check: 0xA657F135485D8D28e893fd40c638BeF0d636d98F' as section;

-- 会员信息
SELECT 
    'Member Info' as subsection,
    m.wallet_address,
    u.username,
    m.current_level,
    COUNT(DISTINCT r.member_wallet) as direct_referrals_count
FROM members m
LEFT JOIN users u ON LOWER(m.wallet_address) = LOWER(u.wallet_address)
LEFT JOIN referrals r ON LOWER(r.referrer_wallet) = LOWER(m.wallet_address) 
    AND r.is_direct_referral = true
WHERE LOWER(m.wallet_address) = LOWER('0xA657F135485D8D28e893fd40c638BeF0d636d98F')
GROUP BY m.wallet_address, u.username, m.current_level;

-- 直推记录
SELECT 
    'Direct Referrals' as subsection,
    r.member_wallet,
    u.username as member_name,
    r.matrix_position,
    r.placed_at
FROM referrals r
LEFT JOIN users u ON LOWER(r.member_wallet) = LOWER(u.wallet_address)
WHERE LOWER(r.referrer_wallet) = LOWER('0xA657F135485D8D28e893fd40c638BeF0d636d98F')
    AND r.is_direct_referral = true
ORDER BY r.placed_at;

-- 奖金记录
SELECT 
    'Rewards Received' as subsection,
    lr.triggering_member_wallet,
    ut.username as triggering_name,
    lr.matrix_layer,
    lr.reward_amount,
    lr.status,
    lr.created_at
FROM layer_rewards lr
LEFT JOIN users ut ON LOWER(lr.triggering_member_wallet) = LOWER(ut.wallet_address)
WHERE LOWER(lr.reward_recipient_wallet) = LOWER('0xA657F135485D8D28e893fd40c638BeF0d636d98F')
ORDER BY lr.created_at DESC;

-- 余额信息
SELECT 
    'Balance Info' as subsection,
    wallet_address,
    username,
    claimable_amount_usdt,
    claimed_amount_usdt,
    total_earned,
    claimable_rewards,
    claimed_rewards
FROM member_balance 
WHERE LOWER(wallet_address) = LOWER('0xA657F135485D8D28e893fd40c638BeF0d636d98F');

-- 5. 全系统验证报告
SELECT 'System-wide Verification' as section;

-- 总体统计
SELECT 
    'Overall Stats' as subsection,
    COUNT(*) as total_members,
    SUM(CASE WHEN claimable_amount_usdt > 0 THEN 1 ELSE 0 END) as members_with_claimable,
    SUM(claimable_amount_usdt) as total_claimable,
    SUM(claimed_amount_usdt) as total_claimed,
    SUM(total_earned) as total_system_earned,
    ROUND(AVG(claimable_amount_usdt), 2) as avg_claimable_per_member
FROM member_balance 
WHERE current_level >= 1;

-- 按等级统计
SELECT 
    'By Level Stats' as subsection,
    current_level,
    COUNT(*) as members,
    SUM(claimable_amount_usdt) as level_claimable,
    SUM(claimed_amount_usdt) as level_claimed,
    ROUND(AVG(claimable_amount_usdt), 2) as avg_claimable
FROM member_balance 
WHERE current_level >= 1
GROUP BY current_level
ORDER BY current_level DESC;

-- 前10名奖金获得者
SELECT 
    'Top 10 Earners' as subsection,
    wallet_address,
    username,
    current_level,
    claimable_amount_usdt,
    claimed_amount_usdt,
    total_earned,
    claimable_rewards
FROM member_balance 
WHERE current_level >= 1
ORDER BY total_earned DESC, claimable_amount_usdt DESC
LIMIT 10;

-- 6. 数据一致性验证
SELECT 'Data Consistency Check' as section;
SELECT 
    'Layer Rewards vs Member Balance' as check_type,
    (SELECT COUNT(*) FROM layer_rewards WHERE status = 'claimable') as lr_claimable_count,
    (SELECT SUM(reward_amount) FROM layer_rewards WHERE status = 'claimable') as lr_claimable_amount,
    (SELECT SUM(claimable_rewards) FROM member_balance WHERE current_level >= 1) as mb_claimable_count,
    (SELECT SUM(claimable_amount_usdt) FROM member_balance WHERE current_level >= 1) as mb_claimable_amount;

-- 记录修复完成
INSERT INTO reward_fix_log (wallet_address, fix_type, new_value, reason)
VALUES ('SYSTEM', 'final_fix_completed', 
    (SELECT SUM(claimable_amount_usdt) FROM member_balance WHERE current_level >= 1), 
    CONCAT('Final rewards fix completed at ', NOW()));

SELECT 'All rewards and balance fixes completed successfully!' as final_status;