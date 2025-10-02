-- 修复现有数据 - 为已有会员计算Layer奖励
-- ========================================
-- 为所有现有referrals记录计算层级奖励
-- ========================================

-- 第1步：检查现有数据状态
-- ========================================

SELECT '=== 修复现有Layer奖励数据 ===' as status;

-- 显示当前referrals记录
SELECT '=== 现有referrals记录 ===' as section;
SELECT 
    r.member_activation_sequence,
    LEFT(r.member_wallet, 10) || '...' as member_short,
    LEFT(r.matrix_root_wallet, 10) || '...' as matrix_root_short,
    r.matrix_layer,
    r.matrix_position,
    r.is_direct_referral,
    r.is_spillover_placement,
    m.current_level as member_level
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
ORDER BY r.member_activation_sequence;

-- 第2步：为每个现有referral计算层级奖励
-- ========================================

DO $$
DECLARE
    referral_rec RECORD;
    calculation_result JSONB;
    total_processed INTEGER := 0;
    total_rewards_created INTEGER := 0;
BEGIN
    RAISE NOTICE '开始为现有referral记录计算层级奖励...';
    
    -- 遍历所有referral记录，按激活序号顺序处理
    FOR referral_rec IN 
        SELECT 
            r.member_wallet,
            r.member_activation_sequence,
            m.current_level
        FROM referrals r
        JOIN members m ON r.member_wallet = m.wallet_address
        ORDER BY r.member_activation_sequence
    LOOP
        -- 为每个会员计算层级奖励
        SELECT calculate_layer_rewards_3x3_enhanced(
            referral_rec.member_wallet,
            referral_rec.current_level
        ) INTO calculation_result;
        
        total_processed := total_processed + 1;
        
        -- 检查是否成功创建奖励
        IF calculation_result->>'success' = 'true' THEN
            total_rewards_created := total_rewards_created + (calculation_result->>'total_layers_processed')::INTEGER;
            RAISE NOTICE 'Member % (Sequence %): Created % layer rewards', 
                LEFT(referral_rec.member_wallet, 10) || '...', 
                referral_rec.member_activation_sequence,
                calculation_result->>'total_layers_processed';
        ELSE
            RAISE WARNING 'Member % (Sequence %): Failed - %', 
                LEFT(referral_rec.member_wallet, 10) || '...', 
                referral_rec.member_activation_sequence,
                calculation_result->>'error';
        END IF;
    END LOOP;
    
    RAISE NOTICE '数据修复完成: 处理了%个会员, 创建了%个层级奖励记录', total_processed, total_rewards_created;
END $$;

-- 第3步：验证修复后的数据
-- ========================================

SELECT '=== 修复后数据验证 ===' as section;

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

-- 显示每个会员的奖励分布
SELECT '=== 会员奖励分布 ===' as section;
SELECT 
    m.activation_sequence,
    u.username,
    m.current_level,
    
    -- 作为触发者的奖励
    COALESCE(trigger_stats.rewards_triggered, 0) as rewards_triggered,
    COALESCE(trigger_stats.total_triggered_amount, 0) as total_triggered_amount,
    
    -- 作为接收者的奖励
    COALESCE(recipient_stats.rewards_received, 0) as rewards_received,
    COALESCE(recipient_stats.claimable_amount, 0) as claimable_amount,
    COALESCE(recipient_stats.pending_amount, 0) as pending_amount
    
FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN (
    -- 作为触发者统计
    SELECT 
        lr.triggering_member_wallet,
        COUNT(*) as rewards_triggered,
        SUM(lr.reward_amount) as total_triggered_amount
    FROM layer_rewards lr
    GROUP BY lr.triggering_member_wallet
) trigger_stats ON m.wallet_address = trigger_stats.triggering_member_wallet
LEFT JOIN (
    -- 作为接收者统计
    SELECT 
        lr.reward_recipient_wallet,
        COUNT(*) as rewards_received,
        SUM(lr.reward_amount) FILTER (WHERE lr.status = 'claimable') as claimable_amount,
        SUM(lr.reward_amount) FILTER (WHERE lr.status = 'pending') as pending_amount
    FROM layer_rewards lr
    GROUP BY lr.reward_recipient_wallet
) recipient_stats ON m.wallet_address = recipient_stats.reward_recipient_wallet
ORDER BY m.activation_sequence
LIMIT 10;

-- 显示层级分布统计
SELECT '=== 层级奖励分布统计 ===' as section;
SELECT 
    lr.matrix_layer as layer_number,
    lr.status,
    COUNT(*) as reward_count,
    COUNT(DISTINCT lr.reward_recipient_wallet) as unique_recipients,
    SUM(lr.reward_amount) as total_amount,
    AVG(lr.reward_amount) as avg_amount
FROM layer_rewards lr
GROUP BY lr.matrix_layer, lr.status
ORDER BY lr.matrix_layer, lr.status;

-- 显示资格检查统计
SELECT '=== 资格检查统计 ===' as section;
SELECT 
    CASE WHEN lr.recipient_current_level >= lr.recipient_required_level THEN '符合Level要求' ELSE '不符合Level要求' END as level_status,
    CASE WHEN lr.direct_referrals_current >= lr.direct_referrals_required THEN '符合直推要求' ELSE '不符合直推要求' END as referral_status,
    lr.status,
    COUNT(*) as count
FROM layer_rewards lr
GROUP BY 
    (lr.recipient_current_level >= lr.recipient_required_level),
    (lr.direct_referrals_current >= lr.direct_referrals_required),
    lr.status
ORDER BY level_status, referral_status, lr.status;

-- 第4步：测试自动更新功能
-- ========================================

SELECT '=== 测试72小时Timer更新功能 ===' as section;

-- 模拟运行timer更新函数
SELECT update_reward_status_by_timer() as timer_update_result;

-- 显示更新后的状态分布
SELECT 
    status,
    COUNT(*) as count,
    SUM(reward_amount) as total_amount
FROM layer_rewards
GROUP BY status
ORDER BY status;

-- 第5步：显示使用示例
-- ========================================

SELECT '=== 数据修复完成总结 ===' as summary_section;

-- 系统状态总览
WITH system_stats AS (
    SELECT 
        COUNT(DISTINCT m.wallet_address) as total_members,
        COUNT(DISTINCT r.id) as total_referrals,
        COUNT(DISTINCT lr.id) as total_layer_rewards,
        SUM(lr.reward_amount) as total_reward_amount,
        COUNT(DISTINCT lr.reward_recipient_wallet) as members_with_rewards
    FROM members m
    LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
    LEFT JOIN layer_rewards lr ON m.wallet_address = lr.reward_recipient_wallet
)
SELECT 
    '会员总数: ' || total_members as stat1,
    '推荐记录数: ' || total_referrals as stat2,
    '层级奖励记录数: ' || total_layer_rewards as stat3,
    '奖励总金额: ' || total_reward_amount || ' USDT' as stat4,
    '有奖励的会员数: ' || members_with_rewards as stat5
FROM system_stats;

SELECT '=== Layer奖励系统现已就绪 ===' as final_status;
SELECT 'Layer奖励系统功能:' as features,
       '✓ 自动计算19层奖励' as feature1,
       '✓ 资格条件检查' as feature2,
       '✓ 72小时Timer机制' as feature3,
       '✓ Pending/Claimable状态管理' as feature4,
       '✓ 自动触发器(新会员激活时)' as feature5;