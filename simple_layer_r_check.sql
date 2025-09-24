-- 简化版本的Layer R奖励规则检查
\echo '=== Layer R位置奖励规则检查汇总 ==='

-- 1. R位置奖励状态总览
SELECT 
    'Layer R Rewards Status' as check_type,
    matrix_layer,
    COUNT(*) as total_r_rewards,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed,
    COUNT(CASE WHEN status = 'rolled_up' THEN 1 END) as rolled_up,
    SUM(reward_amount) as total_value
FROM layer_rewards
WHERE layer_position = 'R'
GROUP BY matrix_layer
ORDER BY matrix_layer;

\echo ''

-- 2. 检查规则执行正确性
SELECT 
    'Rule Compliance Check' as check_type,
    matrix_layer,
    COUNT(*) as total_rewards,
    -- 正确执行规则的奖励数量
    COUNT(CASE 
        WHEN status = 'claimable' AND recipient_current_level >= (matrix_layer + 1) THEN 1
        WHEN status = 'pending' AND recipient_current_level < (matrix_layer + 1) THEN 1
        WHEN status IN ('claimed', 'rolled_up') THEN 1
        ELSE NULL
    END) as correctly_configured,
    -- 违反规则的奖励数量
    COUNT(CASE 
        WHEN status = 'claimable' AND recipient_current_level < (matrix_layer + 1) THEN 1
        WHEN status = 'pending' AND recipient_current_level >= (matrix_layer + 1) THEN 1
        ELSE NULL
    END) as rule_violations,
    -- 计算合规率
    ROUND(
        COUNT(CASE 
            WHEN status = 'claimable' AND recipient_current_level >= (matrix_layer + 1) THEN 1
            WHEN status = 'pending' AND recipient_current_level < (matrix_layer + 1) THEN 1
            WHEN status IN ('claimed', 'rolled_up') THEN 1
            ELSE NULL
        END) * 100.0 / COUNT(*), 2
    ) as compliance_rate_percent
FROM layer_rewards
WHERE layer_position = 'R'
GROUP BY matrix_layer
ORDER BY matrix_layer;

\echo ''

-- 3. Pending奖励倒计时检查
SELECT 
    'Pending Rewards Countdown Status' as check_type,
    COUNT(*) as total_pending,
    COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as has_expiry,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as not_expired,
    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_pending,
    -- 检查是否有countdown timer
    COUNT(CASE WHEN ct.id IS NOT NULL AND ct.is_active THEN 1 END) as has_active_timer
FROM layer_rewards lr
LEFT JOIN countdown_timers ct ON lr.id = ct.related_reward_id AND ct.is_active = true
WHERE lr.layer_position = 'R' AND lr.status = 'pending';

\echo ''

-- 4. 显示所有需要升级的用户
SELECT 
    'Upgrade Incentives Active' as check_type,
    lr.reward_recipient_wallet,
    lr.matrix_layer,
    lr.reward_amount,
    lr.recipient_current_level,
    (lr.matrix_layer + 1) as needed_level,
    CASE 
        WHEN lr.expires_at > NOW() THEN 
            ROUND(EXTRACT(EPOCH FROM (lr.expires_at - NOW()))/3600, 1)
        ELSE 0 
    END as hours_remaining,
    CASE 
        WHEN lr.expires_at > NOW() THEN '⏰ Active countdown'
        ELSE '❌ Expired'
    END as status_emoji
FROM layer_rewards lr
WHERE lr.layer_position = 'R'
  AND lr.status = 'pending'
ORDER BY lr.expires_at ASC NULLS LAST;

\echo ''

-- 5. 检查Rollup机制执行情况
SELECT 
    'Rollup Mechanism Status' as check_type,
    COUNT(CASE WHEN status = 'rolled_up' THEN 1 END) as total_rolled_up,
    COUNT(CASE WHEN expires_at < NOW() AND status = 'pending' THEN 1 END) as should_rollup,
    COUNT(CASE WHEN expires_at < NOW() AND status = 'rolled_up' THEN 1 END) as properly_rolled_up,
    SUM(CASE WHEN status = 'rolled_up' THEN reward_amount ELSE 0 END) as total_rolled_up_value
FROM layer_rewards
WHERE layer_position = 'R';

\echo ''

-- 6. 特定钱包检查
SELECT 
    'Specific Wallet Check' as check_type,
    lr.reward_recipient_wallet,
    lr.matrix_layer,
    lr.layer_position,
    lr.reward_amount,
    lr.status,
    lr.recipient_current_level,
    lr.recipient_required_level,
    CASE 
        WHEN lr.layer_position = 'R' AND lr.recipient_current_level >= (lr.matrix_layer + 1) THEN '✅ Can claim'
        WHEN lr.layer_position = 'R' AND lr.recipient_current_level < (lr.matrix_layer + 1) THEN '⏳ Needs upgrade'
        WHEN lr.layer_position IN ('L', 'M') AND lr.recipient_current_level >= lr.matrix_layer THEN '✅ Can claim'
        WHEN lr.layer_position IN ('L', 'M') AND lr.recipient_current_level < lr.matrix_layer THEN '⏳ Needs upgrade'
        ELSE '❓ Unknown'
    END as should_status,
    lr.expires_at
FROM layer_rewards lr
WHERE lr.reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
ORDER BY lr.matrix_layer, lr.layer_position;

\echo ''
\echo '=== 系统整体健康检查结果 ==='

-- 7. 系统整体健康状态
WITH health_check AS (
    SELECT 
        COUNT(*) as total_rewards,
        COUNT(CASE WHEN layer_position = 'R' THEN 1 END) as r_position_rewards,
        COUNT(CASE 
            WHEN layer_position = 'R' 
            AND ((status = 'claimable' AND recipient_current_level >= (matrix_layer + 1)) OR
                 (status = 'pending' AND recipient_current_level < (matrix_layer + 1)) OR
                 status IN ('claimed', 'rolled_up'))
            THEN 1 
        END) as r_position_correctly_configured,
        COUNT(CASE WHEN status = 'pending' AND expires_at IS NOT NULL AND expires_at > NOW() THEN 1 END) as active_countdowns,
        COUNT(CASE WHEN status = 'pending' AND expires_at IS NOT NULL AND expires_at <= NOW() THEN 1 END) as expired_pending
    FROM layer_rewards
)
SELECT 
    'System Health Summary' as health_check,
    total_rewards as total_layer_rewards,
    r_position_rewards,
    r_position_correctly_configured,
    ROUND(r_position_correctly_configured * 100.0 / NULLIF(r_position_rewards, 0), 2) as r_position_compliance_rate,
    active_countdowns as active_upgrade_incentives,
    expired_pending as needs_rollup_processing,
    CASE 
        WHEN expired_pending = 0 AND r_position_correctly_configured = r_position_rewards THEN '🟢 HEALTHY'
        WHEN expired_pending > 0 THEN '🟡 NEEDS ROLLUP PROCESSING'
        ELSE '🟠 NEEDS ATTENTION'
    END as overall_status
FROM health_check;