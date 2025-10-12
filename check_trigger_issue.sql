-- 检查触发器定义
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'members'
  AND trigger_name LIKE '%level_upgrade%';

-- 检查函数定义是否正确
SELECT 
    proname,
    prosrc LIKE '%auto_promoted_pending_rewards%' as has_auto_promote_logic
FROM pg_proc
WHERE proname = 'trigger_level_upgrade_rewards';

-- 检查最新创建的 pending reward 是在会员升级之前还是之后
SELECT
    '最新的 pending reward:' as label,
    lr.id,
    lr.reward_recipient_wallet,
    lr.created_at as reward_created_at,
    m.current_level
FROM layer_rewards lr
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.id = '06e42f43-4511-4c23-a8d4-ce4440f521f3';

-- 检查这个会员最近的升级记录
SELECT
    '会员升级记录:' as label,
    user_wallet,
    created_at as upgrade_time,
    new_values->>'from_level' as from_level,
    new_values->>'to_level' as to_level,
    new_values->>'auto_promoted_pending_rewards' as auto_promoted
FROM audit_logs
WHERE user_wallet = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6'
  AND action = 'member_level_upgraded'
ORDER BY created_at DESC
LIMIT 5;
