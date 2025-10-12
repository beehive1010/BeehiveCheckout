-- 修复特定钱包的 pending 奖励
-- 该会员当前 Level 2，符合条件的奖励应该变成 claimable

BEGIN;

-- 更新符合条件的 pending 奖励
UPDATE layer_rewards
SET 
    status = 'claimable',
    recipient_current_level = 2,
    expires_at = NULL
WHERE reward_recipient_wallet = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6'
  AND status = 'pending'
  AND id = '5c59d966-cb1c-4bc8-bfa4-c9a1912219c2'
RETURNING 
    id,
    reward_amount,
    status,
    recipient_required_level,
    recipient_current_level;

-- 停用相关的 reward_timer
UPDATE reward_timers
SET is_active = false
WHERE reward_id = '5c59d966-cb1c-4bc8-bfa4-c9a1912219c2'
  AND is_active = true
RETURNING 
    id,
    reward_id,
    timer_type,
    is_active;

COMMIT;

-- 验证修复结果
SELECT
    lr.id,
    lr.reward_amount,
    lr.status,
    lr.recipient_required_level,
    lr.recipient_current_level,
    m.current_level as member_actual_level
FROM layer_rewards lr
LEFT JOIN members m ON m.wallet_address = lr.reward_recipient_wallet
WHERE lr.id = '5c59d966-cb1c-4bc8-bfa4-c9a1912219c2';
