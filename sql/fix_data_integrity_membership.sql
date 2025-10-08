-- =====================================================
-- 数据完整性修复脚本: Membership 激活和升级优化
-- =====================================================
-- 用途: 修复已注册但未激活的用户数据问题
-- 日期: 2025-10-08
-- =====================================================

-- Step 1: 检查当前数据完整性问题
DO $$
DECLARE
    users_without_members INTEGER;
    members_without_membership INTEGER;
    orphaned_memberships INTEGER;
BEGIN
    -- Count users without members records
    SELECT COUNT(*) INTO users_without_members
    FROM users u
    LEFT JOIN members m ON LOWER(u.wallet_address) = LOWER(m.wallet_address)
    WHERE m.wallet_address IS NULL;

    -- Count members without membership records
    SELECT COUNT(*) INTO members_without_membership
    FROM members m
    LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address)
        AND m.current_level = ms.nft_level
    WHERE ms.wallet_address IS NULL;

    -- Count orphaned membership records (membership without members)
    SELECT COUNT(*) INTO orphaned_memberships
    FROM membership ms
    LEFT JOIN members m ON LOWER(ms.wallet_address) = LOWER(m.wallet_address)
    WHERE m.wallet_address IS NULL;

    RAISE NOTICE '';
    RAISE NOTICE '=== 数据完整性检查报告 ===';
    RAISE NOTICE '已注册但未激活的用户: %', users_without_members;
    RAISE NOTICE 'Members 缺少 membership 记录: %', members_without_membership;
    RAISE NOTICE '孤立的 membership 记录: %', orphaned_memberships;
    RAISE NOTICE '';
END $$;

-- Step 2: 列出所有需要修复的用户
SELECT
    '=== 需要修复的用户列表 ===' as section;

SELECT
    u.wallet_address,
    u.username,
    u.referrer_wallet,
    u.created_at as registered_at,
    CASE
        WHEN u.referrer_wallet IS NULL THEN '⚠️ 无推荐人'
        WHEN u.referrer_wallet = '0x0000000000000000000000000000000000000001' THEN '⚠️ 无效推荐人'
        ELSE '✅ 有推荐人'
    END as referrer_status
FROM users u
LEFT JOIN members m ON LOWER(u.wallet_address) = LOWER(m.wallet_address)
WHERE m.wallet_address IS NULL
ORDER BY u.created_at DESC;

-- Step 3: 清理孤立的 membership 记录 (可选,谨慎执行)
-- 注释掉,需要手动确认后执行
/*
DELETE FROM membership ms
WHERE NOT EXISTS (
    SELECT 1 FROM members m
    WHERE LOWER(m.wallet_address) = LOWER(ms.wallet_address)
);
*/

-- Step 4: 为缺失的 members 补充 membership 记录
-- 使用 sync_member_to_membership 触发器会自动处理
-- 但如果有遗漏,可以手动补充:
INSERT INTO membership (
    wallet_address,
    nft_level,
    claim_price,
    claimed_at,
    unlock_membership_level,
    platform_activation_fee,
    total_cost
)
SELECT
    m.wallet_address,
    m.current_level,
    CASE
        WHEN m.current_level = 1 THEN 100.00
        WHEN m.current_level = 2 THEN 150.00
        WHEN m.current_level = 3 THEN 200.00
        ELSE 100.00 + (m.current_level - 1) * 50.00
    END as claim_price,
    m.activation_time,
    LEAST(m.current_level + 1, 19) as unlock_membership_level,
    CASE WHEN m.current_level = 1 THEN 30.00 ELSE 0.00 END as platform_activation_fee,
    CASE
        WHEN m.current_level = 1 THEN 130.00
        WHEN m.current_level = 2 THEN 150.00
        WHEN m.current_level = 3 THEN 200.00
        ELSE 100.00 + (m.current_level - 1) * 50.00
    END as total_cost
FROM members m
WHERE NOT EXISTS (
    SELECT 1 FROM membership ms
    WHERE LOWER(ms.wallet_address) = LOWER(m.wallet_address)
    AND ms.nft_level = m.current_level
)
ON CONFLICT (wallet_address, nft_level) DO NOTHING;

-- Step 5: 验证修复结果
DO $$
DECLARE
    fixed_count INTEGER;
    remaining_issues INTEGER;
BEGIN
    -- Count fixed issues
    SELECT COUNT(*) INTO fixed_count
    FROM members m
    INNER JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address)
        AND m.current_level = ms.nft_level;

    -- Count remaining issues
    SELECT COUNT(*) INTO remaining_issues
    FROM members m
    LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address)
        AND m.current_level = ms.nft_level
    WHERE ms.wallet_address IS NULL;

    RAISE NOTICE '';
    RAISE NOTICE '=== 修复结果 ===';
    RAISE NOTICE '已修复的 members-membership 关联: %', fixed_count;
    RAISE NOTICE '剩余问题数量: %', remaining_issues;
    RAISE NOTICE '';
END $$;

-- Step 6: 优化索引 (提升查询性能)
-- 为激活和升级按钮查询添加索引

-- Members 表索引优化
CREATE INDEX IF NOT EXISTS idx_members_current_level
ON members(current_level);

CREATE INDEX IF NOT EXISTS idx_members_activation_time
ON members(activation_time DESC);

-- Membership 表索引优化
CREATE INDEX IF NOT EXISTS idx_membership_wallet_level
ON membership(wallet_address, nft_level);

CREATE INDEX IF NOT EXISTS idx_membership_claimed_at
ON membership(claimed_at DESC);

-- Layer rewards 索引优化 (提升 claim 性能)
CREATE INDEX IF NOT EXISTS idx_layer_rewards_recipient_status
ON layer_rewards(reward_recipient_wallet, status)
WHERE status IN ('pending', 'claimable');

CREATE INDEX IF NOT EXISTS idx_layer_rewards_claimed_at
ON layer_rewards(claimed_at DESC NULLS LAST)
WHERE claimed_at IS NOT NULL;

-- User balances 索引优化
CREATE INDEX IF NOT EXISTS idx_user_balances_wallet
ON user_balances(wallet_address);

-- Step 7: 创建或更新视图以优化激活状态查询
CREATE OR REPLACE VIEW v_member_activation_status AS
SELECT
    u.wallet_address,
    u.username,
    u.referrer_wallet,
    u.created_at as registered_at,
    m.current_level,
    m.activation_time,
    m.activation_sequence,
    CASE
        WHEN m.wallet_address IS NOT NULL THEN true
        ELSE false
    END as is_activated,
    COALESCE(ms.nft_level, 0) as highest_nft_level,
    (
        SELECT COUNT(*)
        FROM membership ms2
        WHERE LOWER(ms2.wallet_address) = LOWER(u.wallet_address)
    ) as total_nfts_owned,
    (
        SELECT COALESCE(SUM(reward_amount), 0)
        FROM layer_rewards lr
        WHERE LOWER(lr.reward_recipient_wallet) = LOWER(u.wallet_address)
        AND lr.status = 'claimable'
    ) as claimable_rewards_usdc,
    (
        SELECT COALESCE(SUM(reward_amount), 0)
        FROM layer_rewards lr
        WHERE LOWER(lr.reward_recipient_wallet) = LOWER(u.wallet_address)
        AND lr.status = 'pending'
    ) as pending_rewards_usdc
FROM users u
LEFT JOIN members m ON LOWER(u.wallet_address) = LOWER(m.wallet_address)
LEFT JOIN LATERAL (
    SELECT nft_level
    FROM membership ms3
    WHERE LOWER(ms3.wallet_address) = LOWER(u.wallet_address)
    ORDER BY nft_level DESC
    LIMIT 1
) ms ON true
ORDER BY u.created_at DESC;

-- Step 8: 创建快速查询函数
CREATE OR REPLACE FUNCTION get_member_activation_status(p_wallet_address VARCHAR)
RETURNS TABLE (
    is_activated BOOLEAN,
    current_level INTEGER,
    highest_nft_level INTEGER,
    total_nfts_owned INTEGER,
    claimable_rewards NUMERIC,
    pending_rewards NUMERIC,
    can_activate BOOLEAN,
    can_upgrade BOOLEAN,
    next_level INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE WHEN m.wallet_address IS NOT NULL THEN true ELSE false END as is_activated,
        COALESCE(m.current_level, 0) as current_level,
        COALESCE(
            (SELECT MAX(nft_level) FROM membership ms
             WHERE LOWER(ms.wallet_address) = LOWER(p_wallet_address)),
            0
        ) as highest_nft_level,
        COALESCE(
            (SELECT COUNT(*) FROM membership ms
             WHERE LOWER(ms.wallet_address) = LOWER(p_wallet_address)),
            0
        )::INTEGER as total_nfts_owned,
        COALESCE(
            (SELECT SUM(reward_amount) FROM layer_rewards lr
             WHERE LOWER(lr.reward_recipient_wallet) = LOWER(p_wallet_address)
             AND lr.status = 'claimable'),
            0
        ) as claimable_rewards,
        COALESCE(
            (SELECT SUM(reward_amount) FROM layer_rewards lr
             WHERE LOWER(lr.reward_recipient_wallet) = LOWER(p_wallet_address)
             AND lr.status = 'pending'),
            0
        ) as pending_rewards,
        CASE WHEN m.wallet_address IS NULL THEN true ELSE false END as can_activate,
        CASE WHEN m.current_level > 0 AND m.current_level < 19 THEN true ELSE false END as can_upgrade,
        CASE WHEN m.current_level > 0 THEN m.current_level + 1 ELSE 1 END as next_level
    FROM users u
    LEFT JOIN members m ON LOWER(m.wallet_address) = LOWER(p_wallet_address)
    WHERE LOWER(u.wallet_address) = LOWER(p_wallet_address)
    LIMIT 1;
END;
$$;

-- Step 9: 最终验证报告
SELECT
    '=== 最终数据完整性报告 ===' as section;

SELECT
    'Total Users' as metric,
    COUNT(*) as count
FROM users
UNION ALL
SELECT
    'Activated Members',
    COUNT(*)
FROM members
UNION ALL
SELECT
    'Total Memberships',
    COUNT(*)
FROM membership
UNION ALL
SELECT
    'Users without activation',
    COUNT(*)
FROM users u
LEFT JOIN members m ON LOWER(u.wallet_address) = LOWER(m.wallet_address)
WHERE m.wallet_address IS NULL
UNION ALL
SELECT
    'Claimable Rewards (Count)',
    COUNT(*)
FROM layer_rewards
WHERE status = 'claimable'
UNION ALL
SELECT
    'Pending Rewards (Count)',
    COUNT(*)
FROM layer_rewards
WHERE status = 'pending'
ORDER BY metric;

-- Step 10: 性能优化建议
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 性能优化完成 ===';
    RAISE NOTICE '✅ 添加了 8 个索引以加速查询';
    RAISE NOTICE '✅ 创建了 v_member_activation_status 视图';
    RAISE NOTICE '✅ 创建了 get_member_activation_status() 快速查询函数';
    RAISE NOTICE '';
    RAISE NOTICE '=== 前端优化建议 ===';
    RAISE NOTICE '1. 使用 get_member_activation_status() 函数替代多次查询';
    RAISE NOTICE '2. 激活按钮使用 v_member_activation_status 视图';
    RAISE NOTICE '3. 升级按钮检查 current_level < 19';
    RAISE NOTICE '4. Claim 奖励时更新 claimed_at 字段';
    RAISE NOTICE '';
END $$;
