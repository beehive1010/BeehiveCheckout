-- 修复新创建的 pending reward (06e42f43-4511-4c23-a8d4-ce4440f521f3)
-- 这个奖励是在会员已经达到 Level 2 后创建的，应该是 claimable

-- 1. 确认当前状态
SELECT
    '修复前状态:' as label,
    lr.id,
    lr.reward_recipient_wallet,
    lr.reward_amount,
    lr.status,
    lr.recipient_required_level,
    lr.recipient_current_level,
    m.current_level as member_actual_level,
    CASE
        WHEN m.current_level >= lr.recipient_required_level THEN 'SHOULD_PROMOTE'
        ELSE 'CORRECTLY_PENDING'
    END as should_be_status
FROM layer_rewards lr
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.id = '06e42f43-4511-4c23-a8d4-ce4440f521f3';

-- 2. 更新奖励状态
UPDATE layer_rewards
SET
    status = 'claimable',
    recipient_current_level = (
        SELECT current_level
        FROM members
        WHERE wallet_address = reward_recipient_wallet
    ),
    expires_at = NULL
WHERE id = '06e42f43-4511-4c23-a8d4-ce4440f521f3'
RETURNING
    id,
    reward_recipient_wallet,
    reward_amount,
    status as new_status,
    recipient_current_level as updated_level;

-- 3. 停用相关的 reward_timer
UPDATE reward_timers
SET is_active = false
WHERE reward_id = '06e42f43-4511-4c23-a8d4-ce4440f521f3'
  AND is_active = true
RETURNING id, timer_type, 'STOPPED' as action;

-- 4. 确认修复后状态
SELECT
    '修复后状态:' as label,
    lr.id,
    lr.reward_recipient_wallet,
    lr.reward_amount,
    lr.status,
    lr.recipient_current_level,
    m.current_level as member_actual_level
FROM layer_rewards lr
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.id = '06e42f43-4511-4c23-a8d4-ce4440f521f3';

-- 5. 检查该钱包所有 claimable 奖励
SELECT
    '该钱包所有 claimable 奖励:' as label,
    id,
    reward_amount,
    status,
    created_at
FROM layer_rewards
WHERE reward_recipient_wallet = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6'
  AND status = 'claimable'
ORDER BY created_at DESC;
