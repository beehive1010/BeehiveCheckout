-- 批量修复所有已经符合条件但仍是 pending 的奖励

BEGIN;

-- 更新所有符合条件的 pending 奖励
WITH updated_rewards AS (
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
    RETURNING lr.id, lr.reward_recipient_wallet, lr.reward_amount, m.current_level
)
SELECT 
    reward_recipient_wallet,
    COUNT(*) as updated_count,
    SUM(reward_amount) as total_amount
FROM updated_rewards
GROUP BY reward_recipient_wallet;

-- 停用所有已经 claimable 的奖励的 timers
UPDATE reward_timers rt
SET is_active = false
WHERE rt.is_active = true
  AND EXISTS (
      SELECT 1 FROM layer_rewards lr
      WHERE lr.id = rt.reward_id
        AND lr.status = 'claimable'
        AND rt.is_active = true
  );

COMMIT;

-- 验证修复结果
SELECT
    '✅ Fixed pending rewards summary:' as summary;

SELECT
    lr.reward_recipient_wallet,
    COUNT(*) as total_rewards,
    SUM(CASE WHEN lr.status = 'claimable' THEN 1 ELSE 0 END) as claimable_count,
    SUM(CASE WHEN lr.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    SUM(lr.reward_amount) as total_amount
FROM layer_rewards lr
WHERE lr.reward_recipient_wallet IN (
    '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6',
    '0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242'
)
GROUP BY lr.reward_recipient_wallet;
