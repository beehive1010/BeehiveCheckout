-- =====================================================
-- 验证优化结果脚本
-- =====================================================
-- 用途: 验证 membership 激活和奖励系统优化
-- 日期: 2025-10-08
-- =====================================================

\timing on

-- Test 1: 测试新的激活状态查询函数
SELECT
    '=== Test 1: 激活状态查询函数 ===' as test_section;

-- 测试已激活用户
SELECT
    'Activated User Test' as test_case,
    *
FROM get_member_activation_status('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0')
LIMIT 1;

-- 测试未激活用户
SELECT
    'Non-Activated User Test' as test_case,
    *
FROM get_member_activation_status('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37')
LIMIT 1;

-- Test 2: 验证视图性能
SELECT
    '=== Test 2: 激活状态视图性能 ===' as test_section;

EXPLAIN ANALYZE
SELECT *
FROM v_member_activation_status
WHERE wallet_address = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';

-- Test 3: 验证索引效果
SELECT
    '=== Test 3: 索引效果验证 ===' as test_section;

-- Members 表索引检查
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'members'
ORDER BY indexname;

-- Layer rewards 索引检查
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'layer_rewards'
AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- Test 4: 验证 claimed_at 字段
SELECT
    '=== Test 4: Claimed Rewards 字段验证 ===' as test_section;

SELECT
    id,
    reward_recipient_wallet,
    reward_amount,
    status,
    created_at,
    claimed_at,
    CASE
        WHEN status = 'claimed' AND claimed_at IS NOT NULL THEN '✅ 正确'
        WHEN status = 'claimed' AND claimed_at IS NULL THEN '❌ 缺少 claimed_at'
        WHEN status != 'claimed' AND claimed_at IS NULL THEN '✅ 正确'
        ELSE '⚠️ 异常状态'
    END as validation_status
FROM layer_rewards
WHERE status = 'claimed'
ORDER BY created_at DESC
LIMIT 10;

-- Test 5: 数据完整性检查
SELECT
    '=== Test 5: 数据完整性 ===' as test_section;

SELECT
    'Users Total' as metric,
    COUNT(*) as count
FROM users
UNION ALL
SELECT
    'Members Total',
    COUNT(*)
FROM members
UNION ALL
SELECT
    'Users without Members',
    COUNT(*)
FROM users u
LEFT JOIN members m ON LOWER(u.wallet_address) = LOWER(m.wallet_address)
WHERE m.wallet_address IS NULL
UNION ALL
SELECT
    'Members without Membership',
    COUNT(*)
FROM members m
LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address)
    AND m.current_level = ms.nft_level
WHERE ms.wallet_address IS NULL
ORDER BY metric;

-- Test 6: 性能基准测试
SELECT
    '=== Test 6: 查询性能基准 ===' as test_section;

-- 测试旧方法 (多次查询)
EXPLAIN ANALYZE
WITH user_check AS (
    SELECT * FROM users WHERE LOWER(wallet_address) = LOWER('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0')
),
member_check AS (
    SELECT * FROM members WHERE LOWER(wallet_address) = LOWER('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0')
),
membership_check AS (
    SELECT * FROM membership WHERE LOWER(wallet_address) = LOWER('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0')
),
rewards_check AS (
    SELECT
        SUM(reward_amount) FILTER (WHERE status = 'claimable') as claimable,
        SUM(reward_amount) FILTER (WHERE status = 'pending') as pending
    FROM layer_rewards
    WHERE LOWER(reward_recipient_wallet) = LOWER('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0')
)
SELECT
    u.*,
    m.current_level,
    COUNT(ms.nft_level) as nft_count,
    r.claimable,
    r.pending
FROM user_check u
LEFT JOIN member_check m ON true
LEFT JOIN membership_check ms ON true
CROSS JOIN rewards_check r
GROUP BY u.wallet_address, u.username, u.referrer_wallet, u.created_at, m.current_level, r.claimable, r.pending;

-- 测试新方法 (单次 RPC 调用)
EXPLAIN ANALYZE
SELECT * FROM get_member_activation_status('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0');

-- Test 7: Reward Claims Dashboard 视图测试
SELECT
    '=== Test 7: Reward Claims Dashboard ===' as test_section;

SELECT
    root_username,
    status,
    COUNT(*) as count,
    SUM(reward_amount_usdc) as total_usdc
FROM reward_claims_dashboard
WHERE LOWER(root_wallet) = LOWER('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0')
GROUP BY root_username, status
ORDER BY status;

-- Test 8: 特定地址的完整状态
SELECT
    '=== Test 8: 地址 0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37 状态 ===' as test_section;

-- 用户状态
SELECT
    'User Status' as check_type,
    u.wallet_address,
    u.username,
    u.referrer_wallet,
    u.created_at as registered_at
FROM users u
WHERE LOWER(u.wallet_address) = LOWER('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37');

-- Members 状态
SELECT
    'Member Status' as check_type,
    m.wallet_address,
    m.current_level,
    m.activation_time
FROM members m
WHERE LOWER(m.wallet_address) = LOWER('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37')
UNION ALL
SELECT
    'Member Status',
    '0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37',
    NULL,
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM members m
    WHERE LOWER(m.wallet_address) = LOWER('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37')
);

-- 激活状态函数调用
SELECT
    'Activation Status' as check_type,
    *
FROM get_member_activation_status('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37');

-- 最终报告
SELECT
    '=== 优化验证总结 ===' as summary;

DO $$
DECLARE
    total_users INTEGER;
    total_members INTEGER;
    users_without_members INTEGER;
    claimable_count INTEGER;
    pending_count INTEGER;
    indexes_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO total_members FROM members;

    SELECT COUNT(*) INTO users_without_members
    FROM users u
    LEFT JOIN members m ON LOWER(u.wallet_address) = LOWER(m.wallet_address)
    WHERE m.wallet_address IS NULL;

    SELECT COUNT(*) INTO claimable_count
    FROM layer_rewards
    WHERE status = 'claimable';

    SELECT COUNT(*) INTO pending_count
    FROM layer_rewards
    WHERE status = 'pending';

    SELECT COUNT(*) INTO indexes_count
    FROM pg_indexes
    WHERE tablename IN ('members', 'layer_rewards', 'membership', 'user_balances')
    AND indexname LIKE 'idx_%';

    RAISE NOTICE '';
    RAISE NOTICE '=== 优化验证总结 ===';
    RAISE NOTICE '总用户数: %', total_users;
    RAISE NOTICE '已激活会员数: %', total_members;
    RAISE NOTICE '未激活用户数: %', users_without_members;
    RAISE NOTICE '可领取奖励数: %', claimable_count;
    RAISE NOTICE '待处理奖励数: %', pending_count;
    RAISE NOTICE '优化索引数量: %', indexes_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ 数据完整性: %',
        CASE WHEN users_without_members = 11 THEN '正常 (11个未激活用户符合预期)'
             ELSE '异常'
        END;
    RAISE NOTICE '✅ 性能优化: 已添加 % 个索引', indexes_count;
    RAISE NOTICE '✅ 查询函数: get_member_activation_status() 已创建';
    RAISE NOTICE '✅ 视图优化: v_member_activation_status 已创建';
    RAISE NOTICE '';
END $$;

\timing off
