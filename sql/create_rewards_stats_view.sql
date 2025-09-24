-- 创建奖励统计视图，连接总奖励和总提取数据
-- 用于rewards界面的stats显示

\echo '=== 创建奖励统计视图 ==='

-- 1. 先检查相关表的结构
\echo '检查user_balances表结构:'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_balances' 
ORDER BY column_name;

\echo ''
\echo '检查layer_rewards表结构:'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'layer_rewards' 
AND column_name IN ('status', 'reward_amount', 'reward_recipient_wallet')
ORDER BY column_name;

\echo ''

-- 2. 创建综合的奖励统计视图
CREATE OR REPLACE VIEW rewards_stats_view AS
SELECT 
    COALESCE(lr.wallet_address, ub.wallet_address) as wallet_address,
    
    -- 总奖励统计 (来自layer_rewards)
    COALESCE(lr.total_earned, 0) as total_earned,
    COALESCE(lr.total_claimable, 0) as total_claimable,
    COALESCE(lr.total_pending, 0) as total_pending,
    COALESCE(lr.total_claimed, 0) as total_claimed,
    COALESCE(lr.total_rolled_up, 0) as total_rolled_up,
    COALESCE(lr.total_rewards_count, 0) as total_rewards_count,
    
    -- 提取统计 (来自user_balances)
    COALESCE(ub.total_withdrawn, 0) as total_withdrawn,
    COALESCE(ub.available_balance, 0) as available_balance,
    COALESCE(ub.reward_balance, 0) as current_reward_balance,
    COALESCE(ub.reward_claimed, 0) as balance_claimed,
    
    -- 计算字段
    COALESCE(lr.total_earned, 0) - COALESCE(ub.total_withdrawn, 0) as net_earnings,
    CASE 
        WHEN COALESCE(lr.total_earned, 0) > 0 THEN 
            ROUND(COALESCE(ub.total_withdrawn, 0) * 100.0 / lr.total_earned, 2)
        ELSE 0 
    END as withdrawal_rate_percent,
    
    -- 状态标识
    CASE 
        WHEN COALESCE(lr.total_claimable, 0) > 0 THEN true 
        ELSE false 
    END as has_claimable_rewards,
    CASE 
        WHEN COALESCE(lr.total_pending, 0) > 0 THEN true 
        ELSE false 
    END as has_pending_rewards,
    
    -- 时间戳
    GREATEST(
        COALESCE(lr.last_reward_date, '1970-01-01'::timestamp),
        COALESCE(ub.last_updated, '1970-01-01'::timestamp)
    ) as last_updated

FROM (
    -- 子查询：汇总layer_rewards数据
    SELECT 
        LOWER(reward_recipient_wallet) as wallet_address,
        SUM(reward_amount) as total_earned,
        SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as total_claimable,
        SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'claimed' THEN reward_amount ELSE 0 END) as total_claimed,
        SUM(CASE WHEN status = 'rolled_up' THEN reward_amount ELSE 0 END) as total_rolled_up,
        COUNT(*) as total_rewards_count,
        MAX(created_at) as last_reward_date
    FROM layer_rewards
    GROUP BY LOWER(reward_recipient_wallet)
) lr

FULL OUTER JOIN (
    -- 子查询：user_balances数据
    SELECT 
        LOWER(wallet_address) as wallet_address,
        total_withdrawn,
        available_balance,
        reward_balance,
        reward_claimed,
        last_updated
    FROM user_balances
) ub ON lr.wallet_address = ub.wallet_address;

\echo ''

-- 3. 创建视图注释
COMMENT ON VIEW rewards_stats_view IS '综合奖励统计视图，包含总奖励和提取统计数据';

-- 4. 测试视图数据
\echo '=== 测试视图数据 (前5名用户) ==='
SELECT 
    wallet_address,
    total_earned,
    total_withdrawn,
    net_earnings,
    total_claimable,
    total_pending,
    withdrawal_rate_percent,
    has_claimable_rewards,
    has_pending_rewards
FROM rewards_stats_view
ORDER BY total_earned DESC
LIMIT 5;

\echo ''

-- 5. 测试特定用户数据
\echo '=== 测试用户 0xa212A85f7434A5EBAa5b468971EC3972cE72a544 的数据 ==='
SELECT 
    'Rewards Stats for Test User' as info,
    wallet_address,
    total_earned,
    total_withdrawn,
    net_earnings,
    total_claimable,
    total_pending,
    total_claimed,
    current_reward_balance,
    withdrawal_rate_percent,
    has_claimable_rewards,
    has_pending_rewards,
    last_updated
FROM rewards_stats_view
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

\echo ''

-- 6. 创建一个函数来获取用户奖励统计
CREATE OR REPLACE FUNCTION get_user_rewards_stats(p_wallet_address text)
RETURNS TABLE(
    wallet_address text,
    total_earned numeric,
    total_withdrawn numeric,
    net_earnings numeric,
    total_claimable numeric,
    total_pending numeric,
    total_claimed numeric,
    current_reward_balance numeric,
    withdrawal_rate_percent numeric,
    has_claimable_rewards boolean,
    has_pending_rewards boolean,
    total_rewards_count bigint,
    last_updated timestamp without time zone
) 
LANGUAGE sql STABLE
AS $$
    SELECT 
        rsv.wallet_address::text,
        rsv.total_earned,
        rsv.total_withdrawn,
        rsv.net_earnings,
        rsv.total_claimable,
        rsv.total_pending,
        rsv.total_claimed,
        rsv.current_reward_balance,
        rsv.withdrawal_rate_percent,
        rsv.has_claimable_rewards,
        rsv.has_pending_rewards,
        rsv.total_rewards_count,
        rsv.last_updated
    FROM rewards_stats_view rsv
    WHERE rsv.wallet_address ILIKE p_wallet_address;
$$;

\echo ''

-- 7. 测试函数
\echo '=== 测试函数调用 ==='
SELECT * FROM get_user_rewards_stats('0xa212A85f7434A5EBAa5b468971EC3972cE72a544');

\echo ''
\echo '=== 视图创建完成 ==='
\echo '✅ rewards_stats_view 已创建'
\echo '✅ get_user_rewards_stats 函数已创建'
\echo '🎯 现在可以在前端使用这个视图获取完整的奖励统计数据'
\echo '📊 包含总奖励、总提取、净收益等全部统计信息'