-- 检查剩余的 pending 奖励详情
SELECT
    lr.id,
    lr.reward_recipient_wallet,
    lr.triggering_member_wallet,
    lr.reward_amount,
    lr.status,
    lr.recipient_required_level,
    lr.recipient_current_level,
    m.current_level as member_actual_level,
    lr.expires_at,
    EXTRACT(EPOCH FROM (lr.expires_at - NOW())) / 3600 as hours_until_expiry,
    CASE 
        WHEN m.current_level >= lr.recipient_required_level THEN 'SHOULD_PROMOTE'
        ELSE 'CORRECTLY_PENDING'
    END as should_be_status
FROM layer_rewards lr
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.status = 'pending'
  AND lr.expires_at > NOW()
  AND m.current_level >= lr.recipient_required_level;

-- 如果有需要修复的，立即修复
UPDATE layer_rewards lr
SET 
    status = 'claimable',
    recipient_current_level = m.current_level,
    expires_at = NULL
FROM members m
WHERE lr.reward_recipient_wallet = m.wallet_address
  AND lr.status = 'pending'
  AND lr.expires_at > NOW()
  AND m.current_level >= lr.recipient_required_level
RETURNING 
    lr.id,
    lr.reward_recipient_wallet,
    lr.reward_amount,
    'PROMOTED' as action;

-- 停用相关 timer
UPDATE reward_timers rt
SET is_active = false
WHERE rt.is_active = true
  AND EXISTS (
      SELECT 1 FROM layer_rewards lr
      WHERE lr.id = rt.reward_id
        AND lr.status = 'claimable'
  );
