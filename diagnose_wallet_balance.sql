-- 诊断钱包 0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6 的余额问题

-- 1. 检查 user_balances 表
SELECT
    '1. user_balances 表:' as section,
    wallet_address,
    available_balance as 可提现余额,
    reward_balance as 奖励余额,
    total_earned as 总收益,
    total_withdrawn as 已提现,
    reward_claimed as 已领取奖励
FROM user_balances
WHERE wallet_address = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6';

-- 2. 检查 layer_rewards 表
SELECT
    '2. layer_rewards 各状态统计:' as section,
    status,
    COUNT(*) as 数量,
    SUM(reward_amount) as 总金额
FROM layer_rewards
WHERE reward_recipient_wallet = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6'
GROUP BY status;

-- 3. 检查 rewards_stats_view 视图
SELECT
    '3. rewards_stats_view 视图:' as section,
    total_earned as 总收益,
    total_withdrawn as 已提现,
    total_claimable as 可领取,
    total_pending as 待定中,
    total_claimed as 已领取,
    current_reward_balance as 当前奖励余额
FROM rewards_stats_view
WHERE wallet_address = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6';

-- 4. 模拟 balance Edge Function 的查询
WITH balance_data AS (
    SELECT * FROM user_balances
    WHERE wallet_address = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6'
),
pending_rewards AS (
    SELECT SUM(reward_amount) as pending_amount
    FROM layer_rewards
    WHERE reward_recipient_wallet = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6'
      AND status IN ('pending', 'claimable')
)
SELECT
    '4. Edge Function 返回值模拟:' as section,
    COALESCE(b.available_balance, b.reward_balance, 0) as reward_balance字段,
    b.available_balance,
    b.reward_balance,
    p.pending_amount as pending_rewards_usdt
FROM balance_data b
CROSS JOIN pending_rewards p;

-- 5. 检查最近的提现记录
SELECT
    '5. 最近提现记录:' as section,
    id,
    member_wallet,
    amount,
    net_amount,
    fee_amount,
    status,
    target_chain_id,
    created_at
FROM withdrawal_transactions
WHERE member_wallet = '0x9aAF0ED38C24A1A51836ec1F67fF13731d7bE7e6'
ORDER BY created_at DESC
LIMIT 5;
