-- 最终验证：确认奖励创建逻辑已修复

-- 1. 检查是否还有符合条件但仍 pending 的奖励
SELECT
    '1. 符合条件但仍 pending 的奖励:' as check_name,
    COUNT(*) as count
FROM layer_rewards lr
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.status = 'pending'
  AND lr.expires_at > NOW()
  AND m.current_level >= lr.recipient_required_level;

-- 2. 检查函数是否已更新（包含 referrer_current_level）
SELECT
    '2. 函数更新状态:' as check_name,
    proname as function_name,
    prosrc LIKE '%referrer_current_level%' as has_level_check
FROM pg_proc
WHERE proname = 'trigger_layer_rewards_on_upgrade';

-- 3. 检查特定钱包的所有奖励
SELECT
    '3. 钱包 0x9aAF...bE7e6 奖励总计:' as check_name,
    status,
    COUNT(*) as count,
    SUM(reward_amount) as total_amount
FROM layer_rewards
WHERE reward_recipient_wallet = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6'
GROUP BY status
ORDER BY status;

-- 4. 检查最近创建的奖励
SELECT
    '4. 最近创建的奖励:' as check_name,
    id,
    reward_recipient_wallet,
    reward_amount,
    status,
    recipient_required_level,
    recipient_current_level,
    created_at
FROM layer_rewards
ORDER BY created_at DESC
LIMIT 5;
