-- ============================================================================
-- 完整矩阵占位验证脚本
-- ============================================================================
-- 目的: 验证整个 matrix_referrals 表是否符合正确的 BFS 放置逻辑
-- 基于: members 表和 referrals 表的推荐关系
-- 日期: 2025-10-19
-- ============================================================================

\echo '═══════════════════════════════════════════════════════════════════'
\echo '完整矩阵占位验证报告'
\echo '═══════════════════════════════════════════════════════════════════'
\echo ''

-- ============================================================================
-- 问题 1: 检查 parent_depth 是否等于 layer
-- ============================================================================
\echo '【问题 1】检查 parent_depth 是否等于 layer'
\echo '期望: 所有记录的 parent_depth 应该等于 layer'
\echo ''

SELECT
    '错误记录数量' as "指标",
    COUNT(*)::text as "值"
FROM matrix_referrals
WHERE parent_depth != layer
  AND position != 'ROOT'  -- 排除根节点

UNION ALL

SELECT
    '总记录数',
    COUNT(*)::text
FROM matrix_referrals

UNION ALL

SELECT
    '错误率',
    ROUND(
        100.0 * COUNT(CASE WHEN parent_depth != layer AND position != 'ROOT' THEN 1 END) / NULLIF(COUNT(*), 0),
        2
    )::text || '%'
FROM matrix_referrals;

\echo ''
\echo '详细错误分布 (按 layer):'
SELECT
    layer as "Layer",
    COUNT(*) as "总数",
    SUM(CASE WHEN parent_depth = layer THEN 1 ELSE 0 END) as "正确",
    SUM(CASE WHEN parent_depth != layer THEN 1 ELSE 0 END) as "错误",
    ROUND(
        100.0 * SUM(CASE WHEN parent_depth != layer THEN 1 ELSE 0 END) / COUNT(*),
        2
    ) as "错误率%"
FROM matrix_referrals
WHERE position != 'ROOT'
GROUP BY layer
HAVING SUM(CASE WHEN parent_depth != layer THEN 1 ELSE 0 END) > 0
ORDER BY layer;

-- ============================================================================
-- 问题 2: 检查 Layer 1 的 parent_wallet 是否都是 matrix_root
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '【问题 2】检查 Layer 1 的 parent_wallet 是否都是 matrix_root'
\echo '期望: Layer 1 的所有成员的 parent_wallet 应该等于 matrix_root_wallet'
\echo ''

SELECT
    COUNT(*) as "Layer 1 总成员数",
    SUM(CASE
        WHEN parent_wallet = matrix_root_wallet THEN 1
        ELSE 0
    END) as "正确 (parent=root)",
    SUM(CASE
        WHEN parent_wallet != matrix_root_wallet THEN 1
        ELSE 0
    END) as "错误 (parent≠root)"
FROM matrix_referrals
WHERE layer = 1;

\echo ''
\echo 'Layer 1 错误记录详情:'
SELECT
    LEFT(matrix_root_wallet, 12) || '...' as "矩阵根",
    LEFT(member_wallet, 12) || '...' as "成员",
    LEFT(parent_wallet, 12) || '...' as "父节点",
    position as "位置",
    CASE
        WHEN parent_wallet = matrix_root_wallet THEN '✓ 正确'
        ELSE '✗ 错误: parent应该是矩阵根'
    END as "状态"
FROM matrix_referrals
WHERE layer = 1
  AND parent_wallet != matrix_root_wallet
ORDER BY matrix_root_wallet, created_at
LIMIT 20;

-- ============================================================================
-- 问题 3: 检查每个矩阵根的 Layer 1 是否超过 3 个成员
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '【问题 3】检查每个矩阵根的 Layer 1 是否超过 3 个成员'
\echo '期望: 每个矩阵根的 Layer 1 最多只有 3 个成员 (L, M, R)'
\echo ''

WITH layer1_counts AS (
    SELECT
        matrix_root_wallet,
        COUNT(*) as member_count
    FROM matrix_referrals
    WHERE layer = 1
    GROUP BY matrix_root_wallet
)
SELECT
    COUNT(*) as "矩阵根总数",
    SUM(CASE WHEN member_count <= 3 THEN 1 ELSE 0 END) as "正确 (≤3个)",
    SUM(CASE WHEN member_count > 3 THEN 1 ELSE 0 END) as "错误 (>3个)"
FROM layer1_counts;

\echo ''
\echo 'Layer 1 超过 3 个成员的矩阵根:'
SELECT
    LEFT(matrix_root_wallet, 12) || '...' as "矩阵根",
    COUNT(*) as "Layer 1成员数",
    STRING_AGG(position, ', ' ORDER BY created_at) as "位置列表",
    CASE
        WHEN COUNT(*) <= 3 THEN '✓ 正确'
        ELSE '✗ 错误: 超过3个'
    END as "状态"
FROM matrix_referrals
WHERE layer = 1
GROUP BY matrix_root_wallet
HAVING COUNT(*) > 3
ORDER BY COUNT(*) DESC
LIMIT 20;

-- ============================================================================
-- 问题 4: 检查 Layer 2+ 的 parent_wallet 是否存在于上一层
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '【问题 4】检查 Layer 2+ 的 parent_wallet 是否存在于上一层'
\echo '期望: Layer N 的 parent_wallet 应该是 Layer N-1 的 member_wallet'
\echo ''

WITH parent_validation AS (
    SELECT
        mr.matrix_root_wallet,
        mr.layer,
        mr.member_wallet,
        mr.parent_wallet,
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM matrix_referrals mr_parent
                WHERE mr_parent.matrix_root_wallet = mr.matrix_root_wallet
                  AND mr_parent.member_wallet = mr.parent_wallet
                  AND mr_parent.layer = mr.layer - 1
            ) THEN TRUE
            ELSE FALSE
        END as parent_in_previous_layer
    FROM matrix_referrals mr
    WHERE mr.layer > 1
      AND mr.position != 'ROOT'
)
SELECT
    layer as "Layer",
    COUNT(*) as "总成员数",
    SUM(CASE WHEN parent_in_previous_layer THEN 1 ELSE 0 END) as "正确",
    SUM(CASE WHEN NOT parent_in_previous_layer THEN 1 ELSE 0 END) as "错误",
    ROUND(
        100.0 * SUM(CASE WHEN NOT parent_in_previous_layer THEN 1 ELSE 0 END) / COUNT(*),
        2
    ) as "错误率%"
FROM parent_validation
GROUP BY layer
HAVING SUM(CASE WHEN NOT parent_in_previous_layer THEN 1 ELSE 0 END) > 0
ORDER BY layer;

-- ============================================================================
-- 问题 5: 检查每个父节点的子节点数是否超过 3 个
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '【问题 5】检查每个父节点的子节点数是否超过 3 个'
\echo '期望: 每个父节点最多只有 3 个子节点 (L, M, R)'
\echo ''

WITH children_counts AS (
    SELECT
        matrix_root_wallet,
        parent_wallet,
        layer,
        COUNT(*) as child_count,
        STRING_AGG(position, ', ' ORDER BY position) as positions
    FROM matrix_referrals
    WHERE position IN ('L', 'M', 'R')
    GROUP BY matrix_root_wallet, parent_wallet, layer
)
SELECT
    COUNT(*) as "父节点总数",
    SUM(CASE WHEN child_count <= 3 THEN 1 ELSE 0 END) as "正确 (≤3个)",
    SUM(CASE WHEN child_count > 3 THEN 1 ELSE 0 END) as "错误 (>3个)"
FROM children_counts;

\echo ''
\echo '超过 3 个子节点的父节点:'
SELECT
    LEFT(matrix_root_wallet, 12) || '...' as "矩阵根",
    LEFT(parent_wallet, 12) || '...' as "父节点",
    layer as "层",
    child_count as "子节点数",
    positions as "位置列表",
    CASE
        WHEN child_count <= 3 THEN '✓ 正确'
        ELSE '✗ 错误: 超过3个'
    END as "状态"
FROM (
    SELECT
        matrix_root_wallet,
        parent_wallet,
        layer,
        COUNT(*) as child_count,
        STRING_AGG(position, ', ' ORDER BY position) as positions
    FROM matrix_referrals
    WHERE position IN ('L', 'M', 'R')
    GROUP BY matrix_root_wallet, parent_wallet, layer
) sub
WHERE child_count > 3
ORDER BY child_count DESC
LIMIT 20;

-- ============================================================================
-- 问题 6: 检查位置重复（同一父节点下同一位置有多个成员）
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '【问题 6】检查位置重复'
\echo '期望: 同一父节点下的每个位置 (L/M/R) 只能有一个成员'
\echo ''

WITH duplicate_positions AS (
    SELECT
        matrix_root_wallet,
        parent_wallet,
        layer,
        position,
        COUNT(*) as duplicate_count
    FROM matrix_referrals
    WHERE position IN ('L', 'M', 'R')
    GROUP BY matrix_root_wallet, parent_wallet, layer, position
    HAVING COUNT(*) > 1
)
SELECT
    COUNT(*) as "重复位置数量"
FROM duplicate_positions;

\echo ''
\echo '位置重复详情:'
SELECT
    LEFT(matrix_root_wallet, 12) || '...' as "矩阵根",
    LEFT(parent_wallet, 12) || '...' as "父节点",
    layer as "层",
    position as "位置",
    duplicate_count as "重复数",
    '✗ 错误: 位置重复' as "状态"
FROM (
    SELECT
        matrix_root_wallet,
        parent_wallet,
        layer,
        position,
        COUNT(*) as duplicate_count
    FROM matrix_referrals
    WHERE position IN ('L', 'M', 'R')
    GROUP BY matrix_root_wallet, parent_wallet, layer, position
    HAVING COUNT(*) > 1
) sub
ORDER BY duplicate_count DESC
LIMIT 20;

-- ============================================================================
-- 问题 7: 检查双记录机制（成员是否作为 matrix_root 存在）
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '【问题 7】检查双记录机制'
\echo '期望: 每个有下线的成员应该有自己作为 matrix_root 的记录'
\echo ''

WITH members_with_downlines AS (
    -- 所有作为 parent_wallet 出现的成员（有下线）
    SELECT DISTINCT parent_wallet as wallet
    FROM matrix_referrals
    WHERE parent_wallet IS NOT NULL
      AND position != 'ROOT'
),
members_as_roots AS (
    -- 所有作为 matrix_root 出现的成员
    SELECT DISTINCT matrix_root_wallet as wallet
    FROM matrix_referrals
)
SELECT
    COUNT(DISTINCT mwd.wallet) as "有下线的成员数",
    COUNT(DISTINCT mar.wallet) as "作为矩阵根的成员数",
    COUNT(DISTINCT mwd.wallet) - COUNT(DISTINCT mar.wallet) as "缺失矩阵根记录数"
FROM members_with_downlines mwd
LEFT JOIN members_as_roots mar ON mwd.wallet = mar.wallet;

\echo ''
\echo '缺失矩阵根记录的成员 (前 20 个):'
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
    '✗ 缺失 matrix_root 记录' as "状态"
FROM members_with_downlines mwd
LEFT JOIN members_as_roots mar ON mwd.wallet = mar.wallet
WHERE mar.wallet IS NULL
ORDER BY (
    SELECT COUNT(*)
    FROM matrix_referrals mr
    WHERE mr.parent_wallet = mwd.wallet
) DESC
LIMIT 20;

-- ============================================================================
-- 问题 8: 检查推荐关系一致性
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '【问题 8】检查推荐关系一致性'
\echo '期望: members 表的推荐关系应该与 matrix_referrals 的放置一致'
\echo ''

\echo '检查: Layer 1 的 direct 类型成员的推荐人是否是矩阵根'
SELECT
    COUNT(*) as "Layer 1 direct 成员数",
    SUM(CASE
        WHEN m.referrer_wallet = mr.matrix_root_wallet THEN 1
        ELSE 0
    END) as "正确 (推荐人=矩阵根)",
    SUM(CASE
        WHEN m.referrer_wallet != mr.matrix_root_wallet THEN 1
        ELSE 0
    END) as "错误 (推荐人≠矩阵根)"
FROM matrix_referrals mr
INNER JOIN members m ON mr.member_wallet = m.wallet_address
WHERE mr.layer = 1
  AND mr.referral_type = 'direct';

-- ============================================================================
-- 问题 9: 统计各层的成员分布
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '【问题 9】各层成员分布统计'
\echo ''

SELECT
    layer as "Layer",
    COUNT(DISTINCT matrix_root_wallet) as "矩阵根数",
    COUNT(*) as "总成员数",
    ROUND(AVG(
        CASE
            WHEN layer = 1 THEN 1
            WHEN layer > 1 THEN (
                SELECT COUNT(*)
                FROM matrix_referrals mr_parent
                WHERE mr_parent.matrix_root_wallet = mr.matrix_root_wallet
                  AND mr_parent.layer = mr.layer - 1
            )
            ELSE 0
        END
    ), 2) as "平均上层父节点数",
    ROUND(COUNT(*)::numeric / COUNT(DISTINCT matrix_root_wallet), 2) as "平均每矩阵成员数"
FROM matrix_referrals mr
WHERE position != 'ROOT'
GROUP BY layer
ORDER BY layer;

-- ============================================================================
-- 问题 10: 检查 source 字段分布
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '【问题 10】检查记录来源 (source 字段)'
\echo ''

SELECT
    COALESCE(source, 'NULL') as "来源",
    COUNT(*) as "记录数",
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as "百分比%"
FROM matrix_referrals
GROUP BY source
ORDER BY COUNT(*) DESC;

-- ============================================================================
-- 总结
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '验证总结'
\echo '═══════════════════════════════════════════════════════════════════'
\echo ''

WITH validation_summary AS (
    SELECT
        1 as check_order,
        'parent_depth = layer' as check_name,
        (SELECT COUNT(*) FROM matrix_referrals WHERE parent_depth != layer AND position != 'ROOT') as error_count
    UNION ALL
    SELECT
        2,
        'Layer 1 parent = root',
        (SELECT COUNT(*) FROM matrix_referrals WHERE layer = 1 AND parent_wallet != matrix_root_wallet)
    UNION ALL
    SELECT
        3,
        'Layer 1 ≤ 3 members',
        (SELECT COUNT(*) FROM (
            SELECT matrix_root_wallet, COUNT(*) as cnt
            FROM matrix_referrals
            WHERE layer = 1
            GROUP BY matrix_root_wallet
            HAVING COUNT(*) > 3
        ) sub)
    UNION ALL
    SELECT
        4,
        'Parent in previous layer',
        (SELECT COUNT(*) FROM matrix_referrals mr
         WHERE mr.layer > 1 AND mr.position != 'ROOT'
           AND NOT EXISTS (
               SELECT 1 FROM matrix_referrals mr_parent
               WHERE mr_parent.matrix_root_wallet = mr.matrix_root_wallet
                 AND mr_parent.member_wallet = mr.parent_wallet
                 AND mr_parent.layer = mr.layer - 1
           ))
    UNION ALL
    SELECT
        5,
        'Max 3 children per parent',
        (SELECT COUNT(*) FROM (
            SELECT matrix_root_wallet, parent_wallet, layer, COUNT(*) as cnt
            FROM matrix_referrals
            WHERE position IN ('L', 'M', 'R')
            GROUP BY matrix_root_wallet, parent_wallet, layer
            HAVING COUNT(*) > 3
        ) sub)
    UNION ALL
    SELECT
        6,
        'No duplicate positions',
        (SELECT COUNT(*) FROM (
            SELECT matrix_root_wallet, parent_wallet, layer, position, COUNT(*) as cnt
            FROM matrix_referrals
            WHERE position IN ('L', 'M', 'R')
            GROUP BY matrix_root_wallet, parent_wallet, layer, position
            HAVING COUNT(*) > 1
        ) sub)
)
SELECT
    check_order as "#",
    check_name as "检查项",
    error_count as "错误数",
    CASE
        WHEN error_count = 0 THEN '✓ 通过'
        WHEN error_count > 0 AND error_count < 10 THEN '⚠ 警告'
        ELSE '✗ 失败'
    END as "状态"
FROM validation_summary
ORDER BY check_order;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '报告生成完成'
\echo '═══════════════════════════════════════════════════════════════════'
