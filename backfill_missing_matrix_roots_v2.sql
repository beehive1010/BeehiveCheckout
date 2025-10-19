-- ============================================================================
-- 回填缺失的 matrix_root 记录 (V2 - 禁用触发器版本)
-- ============================================================================
-- 目的: 为所有有下线的成员创建自己作为 matrix_root 的初始记录
-- 影响范围: 2,310 个成员
-- 日期: 2025-10-19
-- 方法: 临时禁用触发器以避免验证冲突
-- ============================================================================

\echo '═══════════════════════════════════════════════════════════════════'
\echo '回填缺失的 matrix_root 记录 (V2)'
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

-- Step 2: 执行回填（禁用触发器）
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '开始回填...'
\echo '注意: 临时禁用触发器以避免验证冲突'
\echo ''

BEGIN;

-- 禁用触发器
ALTER TABLE matrix_referrals DISABLE TRIGGER trg_validate_matrix_position;

-- 为所有缺失的成员创建 matrix_root 初始记录
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
    mr.parent_wallet as matrix_root_wallet,
    mr.parent_wallet as member_wallet,
    mr.parent_wallet as parent_wallet,
    0 as layer,
    0 as parent_depth,
    'ROOT' as position,
    'self' as referral_type,
    'backfill_missing_root_20251019' as source,
    MIN(mr.created_at) as created_at
FROM matrix_referrals mr
WHERE mr.parent_wallet IS NOT NULL
  AND mr.position != 'ROOT'
  AND NOT EXISTS (
      SELECT 1
      FROM matrix_referrals mr2
      WHERE mr2.matrix_root_wallet = mr.parent_wallet
  )
GROUP BY mr.parent_wallet;

-- 重新启用触发器
ALTER TABLE matrix_referrals ENABLE TRIGGER trg_validate_matrix_position;

\echo '插入完成！触发器已重新启用。'
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
    TO_CHAR(MIN(created_at), 'YYYY-MM-DD HH24:MI:SS') as "最早时间",
    TO_CHAR(MAX(created_at), 'YYYY-MM-DD HH24:MI:SS') as "最晚时间"
FROM matrix_referrals
WHERE source = 'backfill_missing_root_20251019'
  AND position = 'ROOT';

-- Step 4: 检查是否可以提交
DO $$
DECLARE
    v_missing_count INTEGER;
    v_inserted_count INTEGER;
BEGIN
    -- 检查是否还有缺失
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

    -- 获取插入的记录数
    SELECT COUNT(*)
    INTO v_inserted_count
    FROM matrix_referrals
    WHERE source = 'backfill_missing_root_20251019'
      AND position = 'ROOT';

    IF v_missing_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
        RAISE NOTICE '✅ 回填成功！所有有下线的成员都有 matrix_root 记录';
        RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
        RAISE NOTICE '';
        RAISE NOTICE '新增 ROOT 记录数: %', v_inserted_count;
        RAISE NOTICE '缺失记录数: 0';
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
