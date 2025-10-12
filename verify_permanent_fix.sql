-- 验证永久性修复

-- 1. 检查是否还有符合条件但仍 pending 的奖励
SELECT 
    '1. Qualified but still pending:' as check_name,
    COUNT(*) as count
FROM layer_rewards lr
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.status = 'pending'
  AND lr.expires_at > NOW()
  AND m.current_level >= lr.recipient_required_level;

-- 2. 检查活跃的 timers 数量
SELECT 
    '2. Active timers:' as check_name,
    COUNT(*) as count
FROM reward_timers
WHERE is_active = true;

-- 3. 检查特定钱包的奖励状态
SELECT 
    '3. Wallet 0x9aAF...bE7e6 rewards:' as check_name,
    status,
    COUNT(*) as count,
    SUM(reward_amount) as total_amount
FROM layer_rewards
WHERE reward_recipient_wallet = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6'
GROUP BY status;

-- 4. 测试 process_expired_timers 函数
SELECT '4. Test process_expired_timers():' as check_name;
SELECT process_expired_timers();

-- 5. 验证触发器是否存在
SELECT 
    '5. Trigger status:' as check_name,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%level_upgrade%'
  AND event_object_table = 'members';
