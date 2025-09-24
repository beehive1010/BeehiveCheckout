-- 全面检查所有会员的Layer奖励，特别是第三个奖励(R位置)的规则执行
-- 检查是否正确进入pending状态、倒数、rollup机制

\echo '=== 全面检查所有Layer R位置奖励规则执行情况 ==='

-- 1. 检查所有Layer R位置奖励的状态分布
SELECT 
    'R Position Rewards Overview' as section,
    matrix_layer,
    COUNT(*) as total_r_rewards,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_count,
    COUNT(CASE WHEN status = 'rolled_up' THEN 1 END) as rolled_up_count,
    -- 检查规则执行正确性
    COUNT(CASE 
        WHEN layer_position = 'R' AND recipient_current_level < (matrix_layer + 1) AND status != 'pending' AND status != 'rolled_up' AND status != 'claimed'
        THEN 1 
    END) as incorrectly_claimable,
    COUNT(CASE 
        WHEN layer_position = 'R' AND recipient_current_level >= (matrix_layer + 1) AND status = 'pending'
        THEN 1 
    END) as incorrectly_pending
FROM layer_rewards
WHERE layer_position = 'R'
GROUP BY matrix_layer
ORDER BY matrix_layer;

\echo ''
\echo '=== 检查违反规则的R位置奖励 ==='

-- 2. 找出违反规则的R位置奖励（应该pending但是claimable的）
SELECT 
    'Rule Violations - Should be Pending' as issue_type,
    lr.id,
    lr.reward_recipient_wallet,
    lr.matrix_layer,
    lr.layer_position,
    lr.reward_amount,
    lr.status as current_status,
    lr.recipient_current_level,
    lr.recipient_required_level,
    (lr.matrix_layer + 1) as should_require_level,
    CASE 
        WHEN lr.recipient_current_level < (lr.matrix_layer + 1) THEN '❌ Should be PENDING'
        ELSE '✅ Status correct'
    END as rule_check,
    lr.expires_at IS NOT NULL as has_expiry,
    m.username as recipient_username
FROM layer_rewards lr
LEFT JOIN members m ON LOWER(lr.reward_recipient_wallet) = LOWER(m.wallet_address)
WHERE lr.layer_position = 'R'
  AND lr.status = 'claimable'
  AND lr.recipient_current_level < (lr.matrix_layer + 1)
ORDER BY lr.matrix_layer, lr.created_at;

\echo ''

-- 3. 找出应该claimable但是pending的奖励
SELECT 
    'Rule Violations - Should be Claimable' as issue_type,
    lr.id,
    lr.reward_recipient_wallet,
    lr.matrix_layer,
    lr.layer_position,
    lr.reward_amount,
    lr.status as current_status,
    lr.recipient_current_level,
    lr.recipient_required_level,
    (lr.matrix_layer + 1) as should_require_level,
    CASE 
        WHEN lr.recipient_current_level >= (lr.matrix_layer + 1) THEN '❌ Should be CLAIMABLE'
        ELSE '✅ Status correct'
    END as rule_check,
    lr.expires_at,
    m.username as recipient_username
FROM layer_rewards lr
LEFT JOIN members m ON LOWER(lr.reward_recipient_wallet) = LOWER(m.wallet_address)
WHERE lr.layer_position = 'R'
  AND lr.status = 'pending'
  AND lr.recipient_current_level >= (lr.matrix_layer + 1)
ORDER BY lr.matrix_layer, lr.created_at;

\echo ''
\echo '=== 检查Pending奖励的倒计时机制 ==='

-- 4. 检查pending奖励是否有对应的countdown timers
SELECT 
    'Pending Rewards Timer Status' as check_type,
    lr.id as reward_id,
    lr.reward_recipient_wallet,
    lr.matrix_layer,
    lr.layer_position,
    lr.reward_amount,
    lr.status,
    lr.expires_at,
    CASE 
        WHEN lr.expires_at IS NOT NULL AND lr.expires_at > NOW() THEN 
            EXTRACT(EPOCH FROM (lr.expires_at - NOW()))/3600
        ELSE 0 
    END as hours_remaining,
    ct.id as timer_id,
    ct.is_active as timer_active,
    ct.end_time as timer_end,
    CASE 
        WHEN lr.status = 'pending' AND ct.id IS NULL THEN '❌ Missing timer'
        WHEN lr.status = 'pending' AND ct.id IS NOT NULL AND ct.is_active THEN '✅ Timer active'
        WHEN lr.status = 'pending' AND ct.id IS NOT NULL AND NOT ct.is_active THEN '⚠️ Timer inactive'
        WHEN lr.status != 'pending' THEN '➖ Not pending'
        ELSE '❓ Unknown state'
    END as timer_status,
    m.username as recipient_username
FROM layer_rewards lr
LEFT JOIN countdown_timers ct ON lr.id = ct.related_reward_id AND ct.is_active = true
LEFT JOIN members m ON LOWER(lr.reward_recipient_wallet) = LOWER(m.wallet_address)
WHERE lr.layer_position = 'R'
  AND (lr.status = 'pending' OR ct.id IS NOT NULL)
ORDER BY lr.matrix_layer, lr.expires_at NULLS LAST;

\echo ''
\echo '=== 检查过期但未Rollup的奖励 ==='

-- 5. 找出已过期但未rollup的奖励
SELECT 
    'Expired Rewards Not Rolled Up' as issue_type,
    lr.id as reward_id,
    lr.reward_recipient_wallet,
    lr.matrix_layer,
    lr.layer_position,
    lr.reward_amount,
    lr.status,
    lr.expires_at,
    EXTRACT(EPOCH FROM (NOW() - lr.expires_at))/3600 as hours_expired,
    CASE 
        WHEN lr.expires_at < NOW() AND lr.status = 'pending' THEN '❌ Should be rolled up'
        WHEN lr.expires_at < NOW() AND lr.status = 'rolled_up' THEN '✅ Properly rolled up'
        ELSE '➖ Not expired'
    END as rollup_status,
    m.username as recipient_username
FROM layer_rewards lr
LEFT JOIN members m ON LOWER(lr.reward_recipient_wallet) = LOWER(m.wallet_address)
WHERE lr.layer_position = 'R'
  AND lr.expires_at IS NOT NULL 
  AND lr.expires_at < NOW()
ORDER BY lr.expires_at DESC;

\echo ''
\echo '=== 修复违反规则的R位置奖励 ==='

-- 6. 修复应该pending但是claimable的R位置奖励
UPDATE layer_rewards
SET 
    status = 'pending',
    recipient_required_level = matrix_layer + 1,  -- R位置需要layer+1等级
    expires_at = NOW() + INTERVAL '72 hours',
    requires_direct_referrals = false,
    direct_referrals_required = 0,
    updated_at = NOW()
WHERE layer_position = 'R'
  AND status = 'claimable'
  AND recipient_current_level < (matrix_layer + 1)
  AND expires_at IS NULL;  -- 只更新没有expiry的

-- 7. 修复应该claimable但是pending的R位置奖励
UPDATE layer_rewards
SET 
    status = 'claimable',
    expires_at = NULL,  -- 移除过期时间
    updated_at = NOW()
WHERE layer_position = 'R'
  AND status = 'pending'
  AND recipient_current_level >= (matrix_layer + 1);

\echo ''
\echo '=== 为新的Pending奖励创建倒计时器 ==='

-- 8. 为缺少倒计时器的pending R位置奖励创建倒计时器
INSERT INTO countdown_timers (
    wallet_address,
    timer_type,
    title,
    description,
    start_time,
    end_time,
    is_active,
    auto_action,
    metadata,
    related_reward_id
)
SELECT 
    lr.reward_recipient_wallet,
    'pending_reward',
    format('Layer %s R Position Upgrade Incentive', lr.matrix_layer),
    format('Layer %s R Position: Upgrade to Level %s+ to claim this %s USDT reward! You currently have Level %s. This reward will expire and rollup if not claimed in time.',
           lr.matrix_layer, 
           lr.matrix_layer + 1, 
           lr.reward_amount, 
           lr.recipient_current_level),
    NOW(),
    lr.expires_at,
    true,
    'expire_reward',
    json_build_object(
        'reward_id', lr.id,
        'reward_amount', lr.reward_amount,
        'reward_layer', lr.matrix_layer,
        'layer_position', lr.layer_position,
        'required_level', lr.matrix_layer + 1,
        'current_level', lr.recipient_current_level,
        'is_r_position_upgrade_incentive', true,
        'upgrade_message', format('Upgrade to Level %s+ to claim this Layer %s R reward!', lr.matrix_layer + 1, lr.matrix_layer),
        'rollup_warning', 'This reward will rollup to qualified upline members if not claimed before expiry'
    ),
    lr.id
FROM layer_rewards lr
WHERE lr.layer_position = 'R'
  AND lr.status = 'pending'
  AND lr.expires_at IS NOT NULL
  AND lr.expires_at > NOW()
  AND NOT EXISTS (
    SELECT 1 FROM countdown_timers ct 
    WHERE ct.related_reward_id = lr.id 
    AND ct.is_active = true
  );

\echo ''
\echo '=== 最终状态检查 ==='

-- 9. 显示修复后的状态汇总
SELECT 
    'Final Status Summary' as section,
    matrix_layer,
    COUNT(*) as total_r_rewards,
    COUNT(CASE WHEN status = 'claimable' AND recipient_current_level >= (matrix_layer + 1) THEN 1 END) as correctly_claimable,
    COUNT(CASE WHEN status = 'pending' AND recipient_current_level < (matrix_layer + 1) AND expires_at > NOW() THEN 1 END) as correctly_pending,
    COUNT(CASE WHEN status = 'rolled_up' THEN 1 END) as rolled_up,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed,
    -- 检查是否还有规则违反
    COUNT(CASE 
        WHEN (status = 'claimable' AND recipient_current_level < (matrix_layer + 1)) OR
             (status = 'pending' AND recipient_current_level >= (matrix_layer + 1))
        THEN 1 
    END) as rule_violations,
    SUM(reward_amount) as total_value
FROM layer_rewards
WHERE layer_position = 'R'
GROUP BY matrix_layer
ORDER BY matrix_layer;

\echo ''

-- 10. 显示需要用户关注的升级激励奖励
SELECT 
    'Active Upgrade Incentives' as section,
    lr.reward_recipient_wallet,
    lr.matrix_layer,
    lr.reward_amount,
    lr.recipient_current_level as current_level,
    (lr.matrix_layer + 1) as needed_level,
    CASE 
        WHEN lr.expires_at > NOW() THEN 
            EXTRACT(EPOCH FROM (lr.expires_at - NOW()))/3600
        ELSE 0 
    END as hours_remaining,
    format('Upgrade to Level %s+ to claim %s USDT', 
           lr.matrix_layer + 1, 
           lr.reward_amount) as upgrade_message,
    m.username as recipient_name
FROM layer_rewards lr
LEFT JOIN members m ON LOWER(lr.reward_recipient_wallet) = LOWER(m.wallet_address)
WHERE lr.layer_position = 'R'
  AND lr.status = 'pending'
  AND lr.expires_at > NOW()
ORDER BY lr.expires_at ASC
LIMIT 20;