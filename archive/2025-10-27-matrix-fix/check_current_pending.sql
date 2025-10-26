-- 检查当前所有 pending 的直推奖励详情
SELECT
    lr.id,
    lr.reward_recipient_wallet,
    lr.triggering_member_wallet,
    lr.reward_amount,
    lr.status,
    lr.matrix_layer,
    lr.recipient_required_level,
    lr.recipient_current_level,
    m.current_level as member_actual_level,
    lr.created_at,
    lr.expires_at,
    EXTRACT(EPOCH FROM (lr.expires_at - NOW())) / 3600 as hours_until_expiry,
    CASE 
        WHEN m.current_level >= lr.recipient_required_level THEN 'SHOULD_BE_CLAIMABLE'
        ELSE 'CORRECTLY_PENDING'
    END as should_be_status
FROM layer_rewards lr
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.status = 'pending'
  AND lr.expires_at > NOW()
ORDER BY lr.created_at DESC
LIMIT 20;

-- 检查最近的会员升级记录
SELECT
    user_wallet,
    action,
    new_values->>'from_level' as from_level,
    new_values->>'to_level' as to_level,
    new_values->>'auto_promoted_pending_rewards' as auto_promoted,
    created_at
FROM audit_logs
WHERE action = 'member_level_upgraded'
ORDER BY created_at DESC
LIMIT 10;

-- 检查 reward_timers
SELECT
    rt.id,
    rt.reward_id,
    rt.recipient_wallet,
    rt.timer_type,
    rt.is_active,
    rt.expires_at,
    lr.status as reward_status
FROM reward_timers rt
JOIN layer_rewards lr ON rt.reward_id = lr.id
WHERE rt.is_active = true
  AND lr.status = 'pending'
ORDER BY rt.expires_at DESC
LIMIT 10;
