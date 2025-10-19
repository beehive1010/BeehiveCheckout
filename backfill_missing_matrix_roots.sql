-- ============================================================================
-- 回填缺失的 matrix_root 记录
-- ============================================================================
-- 目的: 为所有有下线的成员创建自己作为 matrix_root 的初始记录
-- 影响范围: 2,310 个成员
-- 日期: 2025-10-19
-- ============================================================================

\echo '═══════════════════════════════════════════════════════════════════'
\echo '回填缺失的 matrix_root 记录'
\echo '═══════════════════════════════════════════════════════════════════'
\echo ''

-- Step 1: 显示回填前的统计
\echo '【回填前】统计:'

WITH members_with_downlines AS (
    SELECT DISTINCT parent_wallet as wallet
    FROM matrix_referrals
    WHERE parent_wallet IS NOT NULL
      AND position != 'ROOT'
),
members_as_roots AS (
    SELECT DISTINCT matrix_root_wallet as wallet
    FROM matrix_referrals
)
SELECT
    '有下线的成员数' as "指标",
    COUNT(DISTINCT mwd.wallet)::text as "数量"
FROM members_with_downlines mwd

UNION ALL

SELECT
    '作为矩阵根的成员数',
    COUNT(DISTINCT mar.wallet)::text
FROM members_as_roots mar

UNION ALL

SELECT
    '缺失矩阵根记录数',
    (COUNT(DISTINCT mwd.wallet) - COUNT(DISTINCT mar.wallet))::text
FROM members_with_downlines mwd
LEFT JOIN members_as_roots mar ON mwd.wallet = mar.wallet;

\echo ''
\echo '缺失记录最多的成员 (前 10):'
WITH members_with_downlines AS (
    SELECT DISTINCT parent_wallet as wallet
    FROM matrix_referrals
    WHERE parent_wallet IS NOT NULL
      AND position != 'ROOT'
),
members_as_roots AS (
    SELECT DISTINCT matrix_root_wallet as wallet
    FROM matrix_referrals
)
SELECT
    LEFT(mwd.wallet, 12) || '...' as "成员钱包",
    (
        SELECT COUNT(*)
        FROM matrix_referrals mr
        WHERE mr.parent_wallet = mwd.wallet
    ) as "下线数量",
    '✗ 缺失' as "状态"
FROM members_with_downlines mwd
LEFT JOIN members_as_roots mar ON mwd.wallet = mar.wallet
WHERE mar.wallet IS NULL
ORDER BY (
    SELECT COUNT(*)
    FROM matrix_referrals mr
    WHERE mr.parent_wallet = mwd.wallet
) DESC
LIMIT 10;

-- Step 2: 执行回填
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '开始回填...'
\echo ''

BEGIN;

-- 为所有缺失的成员创建 matrix_root 初始记录
-- 使用 Layer 0 + position 'ROOT' 表示矩阵根自己
INSERT INTO matrix_referrals (
    matrix_root_wallet,
    member_wallet,
    parent_wallet,
    layer,
    parent_depth,
    position,
    referral_type,
    source,
    created_at
)
SELECT DISTINCT
    mr.parent_wallet as matrix_root_wallet,  -- 该成员作为矩阵根
    mr.parent_wallet as member_wallet,       -- 成员是自己
    mr.parent_wallet as parent_wallet,       -- 父节点是自己
    0 as layer,                               -- Layer 0 表示根
    0 as parent_depth,                        -- parent_depth = 0
    'ROOT' as position,                       -- ROOT 位置
    'self' as referral_type,                  -- 自己
    'backfill_missing_root_20251019' as source,  -- 来源标记
    MIN(mr.created_at) as created_at          -- 使用最早的下线注册时间
FROM matrix_referrals mr
WHERE mr.parent_wallet IS NOT NULL
  AND mr.position != 'ROOT'
  AND NOT EXISTS (
      -- 确保不存在该成员作为 matrix_root 的记录
      SELECT 1
      FROM matrix_referrals mr2
      WHERE mr2.matrix_root_wallet = mr.parent_wallet
  )
GROUP BY mr.parent_wallet;

-- 显示插入结果
\echo '插入完成！'
\echo ''

-- Step 3: 验证回填结果
\echo '【回填后】验证结果:'

WITH members_with_downlines AS (
    SELECT DISTINCT parent_wallet as wallet
    FROM matrix_referrals
    WHERE parent_wallet IS NOT NULL
      AND position != 'ROOT'
),
members_as_roots AS (
    SELECT DISTINCT matrix_root_wallet as wallet
    FROM matrix_referrals
)
SELECT
    '有下线的成员数' as "指标",
    COUNT(DISTINCT mwd.wallet)::text as "数量"
FROM members_with_downlines mwd

UNION ALL

SELECT
    '作为矩阵根的成员数',
    COUNT(DISTINCT mar.wallet)::text
FROM members_as_roots mar

UNION ALL

SELECT
    '仍缺失矩阵根记录数 (应该是0)',
    (COUNT(DISTINCT mwd.wallet) - COUNT(DISTINCT mar.wallet))::text
FROM members_with_downlines mwd
LEFT JOIN members_as_roots mar ON mwd.wallet = mar.wallet;

\echo ''
\echo '验证: 所有有下线的成员都有 matrix_root 记录'
WITH members_with_downlines AS (
    SELECT DISTINCT parent_wallet as wallet
    FROM matrix_referrals
    WHERE parent_wallet IS NOT NULL
      AND position != 'ROOT'
),
members_as_roots AS (
    SELECT DISTINCT matrix_root_wallet as wallet
    FROM matrix_referrals
)
SELECT
    CASE
        WHEN COUNT(DISTINCT mwd.wallet) = COUNT(DISTINCT mar.wallet)
        THEN '✓ 全部正确'
        ELSE '✗ 仍有缺失'
    END as "状态",
    COUNT(DISTINCT mwd.wallet) as "有下线成员数",
    COUNT(DISTINCT mar.wallet) as "矩阵根成员数",
    (COUNT(DISTINCT mwd.wallet) - COUNT(DISTINCT mar.wallet)) as "差异"
FROM members_with_downlines mwd
LEFT JOIN members_as_roots mar ON mwd.wallet = mar.wallet;

\echo ''
\echo '检查新创建的 ROOT 记录:'
SELECT
    COUNT(*) as "新ROOT记录数",
    MIN(created_at) as "最早时间",
    MAX(created_at) as "最晚时间"
FROM matrix_referrals
WHERE source = 'backfill_missing_root_20251019'
  AND position = 'ROOT';

-- Step 4: 检查是否可以提交
DO $$
DECLARE
    v_missing_count INTEGER;
BEGIN
    WITH members_with_downlines AS (
        SELECT DISTINCT parent_wallet as wallet
        FROM matrix_referrals
        WHERE parent_wallet IS NOT NULL
          AND position != 'ROOT'
    ),
    members_as_roots AS (
        SELECT DISTINCT matrix_root_wallet as wallet
        FROM matrix_referrals
    )
    SELECT COUNT(DISTINCT mwd.wallet) - COUNT(DISTINCT mar.wallet)
    INTO v_missing_count
    FROM members_with_downlines mwd
    LEFT JOIN members_as_roots mar ON mwd.wallet = mar.wallet;

    IF v_missing_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
        RAISE NOTICE '✅ 回填成功！所有有下线的成员都有 matrix_root 记录';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
        RAISE NOTICE '';
        RAISE NOTICE '提交事务...';
    ELSE
        RAISE EXCEPTION '❌ 回填失败！仍有 % 个成员缺失 matrix_root 记录', v_missing_count;
    END IF;
END $$;

COMMIT;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '✅ matrix_root 记录回填完成'
\echo '═══════════════════════════════════════════════════════════════════'
\echo ''
\echo '建议: 运行 validate_entire_matrix_placements.sql 再次验证'
\echo ''
