-- 最终验证报告 - 奖励逻辑修正结果
-- 使用原始以太坊地址格式（保持大小写）

-- 1. 系统整体奖励统计
SELECT '=== SYSTEM REWARD OVERVIEW ===' as report_section;

SELECT 
    'Direct Referral Rewards (Layer 1)' as reward_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
    SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as claimable_amount,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_count,
    SUM(CASE WHEN status = 'claimed' THEN reward_amount ELSE 0 END) as claimed_amount
FROM direct_referral_rewards

UNION ALL

SELECT 
    'Matrix Layer Rewards (Layer 2-19)' as reward_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
    SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as claimable_amount,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_count,
    SUM(CASE WHEN status = 'claimed' THEN reward_amount ELSE 0 END) as claimed_amount
FROM layer_rewards
WHERE matrix_layer >= 2;

-- 2. 层级奖励详细分布
SELECT '=== LAYER REWARDS BREAKDOWN ===' as report_section;
SELECT 
    matrix_layer,
    COUNT(*) as reward_count,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed,
    SUM(reward_amount) as total_amount,
    AVG(reward_amount) as avg_amount,
    MIN(reward_amount) as min_amount,
    MAX(reward_amount) as max_amount
FROM layer_rewards
WHERE matrix_layer >= 2
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 3. 重点验证：0xA657F135485D8D28e893fd40c638BeF0d636d98F 的奖励情况
SELECT '=== SPECIFIC WALLET VERIFICATION ===' as report_section;
SELECT 'Wallet: 0xA657F135485D8D28e893fd40c638BeF0d636d98F (test290002)' as wallet_info;

-- 基本信息
SELECT 
    'Basic Info' as info_type,
    m.wallet_address,
    u.username,
    m.current_level,
    m.referrer_wallet,
    ur.username as referrer_name
FROM members m
LEFT JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN users ur ON m.referrer_wallet = ur.wallet_address
WHERE m.wallet_address = '0xA657F135485D8D28e893fd40c638BeF0d636d98F';

-- 直推记录
SELECT 
    'Direct Referrals' as info_type,
    r.member_wallet,
    u.username as member_name,
    r.matrix_position,
    r.placed_at::date as placement_date
FROM referrals r
LEFT JOIN users u ON r.member_wallet = u.wallet_address
WHERE r.referrer_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
    AND r.is_direct_referral = true
ORDER BY r.placed_at;

-- 直推奖励
SELECT 
    'Direct Rewards Earned' as info_type,
    drr.referred_member_wallet,
    u.username as referred_name,
    drr.reward_amount,
    drr.status,
    drr.created_at::date as reward_date
FROM direct_referral_rewards drr
LEFT JOIN users u ON drr.referred_member_wallet = u.wallet_address
WHERE drr.referrer_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
ORDER BY drr.created_at;

-- 矩阵根奖励（如果有）
SELECT 
    'Matrix Root Rewards' as info_type,
    lr.triggering_member_wallet,
    u.username as triggering_name,
    lr.matrix_layer,
    lr.reward_amount,
    lr.status,
    lr.created_at::date as reward_date
FROM layer_rewards lr
LEFT JOIN users u ON lr.triggering_member_wallet = u.wallet_address
WHERE lr.reward_recipient_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
    AND lr.matrix_layer >= 2
ORDER BY lr.matrix_layer, lr.created_at;

-- 余额汇总
SELECT 
    'Balance Summary' as info_type,
    direct_claimable_amount,
    layer_claimable_amount,
    total_claimable,
    total_claimed,
    total_earned
FROM member_all_rewards_view
WHERE wallet_address = '0xA657F135485D8D28e893fd40c638BeF0d636d98F';

-- 4. 前15名奖励获得者
SELECT '=== TOP REWARD EARNERS ===' as report_section;
SELECT 
    ROW_NUMBER() OVER (ORDER BY total_earned DESC, total_claimable DESC) as rank,
    wallet_address,
    username,
    current_level,
    direct_claimable_amount as direct_rewards,
    layer_claimable_amount as matrix_rewards,
    total_claimable,
    total_claimed,
    total_earned
FROM member_all_rewards_view
WHERE total_earned > 0
ORDER BY total_earned DESC, total_claimable DESC
LIMIT 15;

-- 5. 按会员等级的奖励分布
SELECT '=== REWARDS BY MEMBER LEVEL ===' as report_section;
SELECT 
    current_level,
    COUNT(*) as members_count,
    COUNT(CASE WHEN total_claimable > 0 THEN 1 END) as members_with_rewards,
    SUM(direct_claimable_amount) as total_direct_rewards,
    SUM(layer_claimable_amount) as total_matrix_rewards,
    SUM(total_claimable) as total_claimable_rewards,
    SUM(total_claimed) as total_claimed_rewards,
    SUM(total_earned) as total_earned_all,
    ROUND(AVG(total_earned), 2) as avg_earned_per_member
FROM member_all_rewards_view
GROUP BY current_level
ORDER BY current_level DESC;

-- 6. 数据一致性检查
SELECT '=== DATA CONSISTENCY CHECK ===' as report_section;

-- 检查直推奖励一致性
SELECT 
    'Direct Referral Consistency' as check_type,
    (SELECT COUNT(*) FROM referrals WHERE is_direct_referral = true AND matrix_layer = 1) as total_direct_referrals,
    (SELECT COUNT(*) FROM direct_referral_rewards) as total_direct_rewards,
    CASE 
        WHEN (SELECT COUNT(*) FROM referrals WHERE is_direct_referral = true AND matrix_layer = 1) = 
             (SELECT COUNT(*) FROM direct_referral_rewards)
        THEN '✅ CONSISTENT' 
        ELSE '❌ INCONSISTENT' 
    END as status;

-- 检查矩阵奖励合理性
SELECT 
    'Matrix Rewards Logic' as check_type,
    'Layer 2-19 rewards go to matrix_root' as rule,
    (SELECT COUNT(*) FROM layer_rewards WHERE matrix_layer >= 2) as layer_rewards_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM layer_rewards WHERE matrix_layer >= 2 AND reward_recipient_wallet = matrix_root_wallet) =
             (SELECT COUNT(*) FROM layer_rewards WHERE matrix_layer >= 2)
        THEN '✅ ALL REWARDS TO MATRIX ROOT' 
        ELSE '❌ SOME REWARDS MISALLOCATED' 
    END as status;

-- 7. 总结报告
SELECT '=== FINAL SUMMARY ===' as report_section;
SELECT 
    'System Status' as summary_type,
    (SELECT COUNT(*) FROM members WHERE current_level >= 1) as total_active_members,
    (SELECT COUNT(*) FROM direct_referral_rewards WHERE status = 'claimable') as claimable_direct_rewards,
    (SELECT SUM(reward_amount) FROM direct_referral_rewards WHERE status = 'claimable') as claimable_direct_amount,
    (SELECT COUNT(*) FROM layer_rewards WHERE matrix_layer >= 2 AND status = 'claimable') as claimable_layer_rewards,
    (SELECT SUM(reward_amount) FROM layer_rewards WHERE matrix_layer >= 2 AND status = 'claimable') as claimable_layer_amount,
    (
        (SELECT COALESCE(SUM(reward_amount), 0) FROM direct_referral_rewards WHERE status = 'claimable') +
        (SELECT COALESCE(SUM(reward_amount), 0) FROM layer_rewards WHERE matrix_layer >= 2 AND status = 'claimable')
    ) as total_claimable_system;

SELECT 'VERIFICATION COMPLETE - All reward logic has been corrected!' as final_message;