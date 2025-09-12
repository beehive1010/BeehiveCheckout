-- 重新计算正确的Layer奖励（排除Super Root）
-- ========================================
-- 基于修复后的Matrix结构重新计算层级奖励
-- ========================================

SELECT '=== 重新计算正确的Layer奖励 ===' as status;

-- 为每个正常会员重新计算层级奖励（排除Super Root）
DO $$
DECLARE
    member_rec RECORD;
    calculation_result JSONB;
    total_processed INTEGER := 0;
    total_rewards_created INTEGER := 0;
BEGIN
    RAISE NOTICE '开始为正常会员重新计算层级奖励（排除Super Root）...';
    
    -- 遍历所有正常会员的referral记录，排除Super Root
    FOR member_rec IN 
        SELECT 
            r.member_wallet,
            r.member_activation_sequence,
            m.current_level
        FROM referrals r
        JOIN members m ON r.member_wallet = m.wallet_address
        WHERE m.activation_sequence > 0  -- 排除Super Root
        AND r.matrix_layer > 0           -- 只处理正常Matrix层级
        ORDER BY r.member_activation_sequence
    LOOP
        -- 为每个会员计算层级奖励
        SELECT calculate_layer_rewards_3x3_enhanced(
            member_rec.member_wallet,
            member_rec.current_level
        ) INTO calculation_result;
        
        total_processed := total_processed + 1;
        
        -- 检查是否成功创建奖励
        IF calculation_result->>'success' = 'true' THEN
            total_rewards_created := total_rewards_created + (calculation_result->>'total_layers_processed')::INTEGER;
            RAISE NOTICE 'Member % (Sequence %): Created % layer rewards', 
                LEFT(member_rec.member_wallet, 10) || '...', 
                member_rec.member_activation_sequence,
                calculation_result->>'total_layers_processed';
        ELSE
            RAISE WARNING 'Member % (Sequence %): Failed - %', 
                LEFT(member_rec.member_wallet, 10) || '...', 
                member_rec.member_activation_sequence,
                calculation_result->>'error';
        END IF;
    END LOOP;
    
    RAISE NOTICE '重新计算完成: 处理了%个正常会员, 创建了%个层级奖励记录', total_processed, total_rewards_created;
END $$;

-- 验证重新计算后的结果
SELECT '=== 重新计算后验证 ===' as section;

-- 显示层级奖励统计
SELECT 
    'Layer奖励记录总数' as stat_name, COUNT(*) as count FROM layer_rewards
UNION ALL
SELECT 
    '- Pending状态', COUNT(*) FROM layer_rewards WHERE status = 'pending'
UNION ALL  
SELECT 
    '- Claimable状态', COUNT(*) FROM layer_rewards WHERE status = 'claimable'
UNION ALL
SELECT 
    '总奖励金额(USDT)', SUM(reward_amount) FROM layer_rewards;

-- 显示每个会员的奖励分布（确认Super Root没有奖励）
SELECT '=== 会员奖励分布（排除Super Root后）===' as section;
SELECT 
    m.activation_sequence,
    u.username,
    m.current_level,
    COALESCE(recipient_stats.rewards_received, 0) as rewards_received,
    COALESCE(recipient_stats.claimable_amount, 0) as claimable_amount,
    COALESCE(recipient_stats.pending_amount, 0) as pending_amount
FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN (
    SELECT 
        lr.reward_recipient_wallet,
        COUNT(*) as rewards_received,
        SUM(lr.reward_amount) FILTER (WHERE lr.status = 'claimable') as claimable_amount,
        SUM(lr.reward_amount) FILTER (WHERE lr.status = 'pending') as pending_amount
    FROM layer_rewards lr
    GROUP BY lr.reward_recipient_wallet
) recipient_stats ON m.wallet_address = recipient_stats.reward_recipient_wallet
ORDER BY m.activation_sequence;

-- 显示Matrix根节点的奖励情况
SELECT '=== Matrix根节点奖励情况 ===' as section;
SELECT 
    root_m.activation_sequence as root_sequence,
    root_u.username as root_username,
    COUNT(DISTINCT r.member_wallet) as downstream_members,
    COALESCE(reward_stats.rewards_received, 0) as rewards_received,
    COALESCE(reward_stats.total_amount, 0) as total_reward_amount
FROM members root_m
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
LEFT JOIN referrals r ON root_m.wallet_address = r.matrix_root_wallet AND r.matrix_layer > 0
LEFT JOIN (
    SELECT 
        lr.reward_recipient_wallet,
        COUNT(*) as rewards_received,
        SUM(lr.reward_amount) as total_amount
    FROM layer_rewards lr
    GROUP BY lr.reward_recipient_wallet
) reward_stats ON root_m.wallet_address = reward_stats.reward_recipient_wallet
GROUP BY root_m.activation_sequence, root_u.username, root_m.wallet_address, reward_stats.rewards_received, reward_stats.total_amount
HAVING COUNT(DISTINCT r.member_wallet) > 0 OR reward_stats.rewards_received > 0
ORDER BY root_m.activation_sequence;

-- 最终系统状态
SELECT '=== 最终系统状态 ===' as final_section;
WITH system_summary AS (
    SELECT 
        (SELECT COUNT(*) FROM members) as total_members,
        (SELECT COUNT(*) FROM members WHERE activation_sequence = 0) as super_root_count,
        (SELECT COUNT(*) FROM members WHERE activation_sequence > 0) as normal_members,
        (SELECT COUNT(*) FROM referrals WHERE matrix_layer > 0) as matrix_participants,
        (SELECT COUNT(*) FROM layer_rewards) as total_rewards,
        (SELECT SUM(reward_amount) FROM layer_rewards) as total_reward_amount,
        (SELECT COUNT(DISTINCT reward_recipient_wallet) FROM layer_rewards) as members_with_rewards
)
SELECT 
    '总会员数: ' || total_members as stat1,
    'Super Root: ' || super_root_count as stat2,
    '正常会员数: ' || normal_members as stat3,
    'Matrix参与者: ' || matrix_participants as stat4,
    '层级奖励数: ' || total_rewards as stat5,
    '奖励总额: ' || total_reward_amount || ' USDT' as stat6,
    '有奖励会员数: ' || members_with_rewards as stat7
FROM system_summary;

SELECT '=== 数据修复最终确认 ===' as confirmation;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM layer_rewards lr
            JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
            WHERE m.activation_sequence = 0
        ) THEN '❌ Super Root仍有奖励记录'
        ELSE '✅ Super Root已正确排除'
    END as super_root_check,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM referrals WHERE matrix_layer > 0) = 
             (SELECT COUNT(*) FROM members WHERE activation_sequence > 0)
        THEN '✅ Matrix结构完整'
        ELSE '⚠️  Matrix结构可能有问题'
    END as matrix_check,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM layer_rewards) > 0
        THEN '✅ 层级奖励已重新计算'
        ELSE '❌ 层级奖励计算失败'
    END as rewards_check;