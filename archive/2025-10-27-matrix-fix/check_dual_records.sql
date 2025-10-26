-- 检查是否同时创建了成员自己作为 matrix_root 的记录

\echo '========================================='
\echo '检查双记录问题'
\echo '========================================='
\echo ''
\echo '选择一个 Layer 2 成员: 0xD95E2e17507E25C6a8556dB3d65cC47664Bf96df'
\echo ''

-- 1. 作为 member 被放置在上线矩阵中的记录
\echo '【1】作为 member_wallet 的记录（在上线矩阵中）:'
SELECT 
    matrix_root_wallet as "矩阵根",
    layer as "层",
    parent_wallet as "父节点",
    position as "位置"
FROM matrix_referrals
WHERE member_wallet = '0xD95E2e17507E25C6a8556dB3d65cC47664Bf96df'
ORDER BY layer
LIMIT 5;

\echo ''
\echo '【2】作为 matrix_root_wallet 的记录（自己的矩阵）:'
SELECT 
    COUNT(*) as "记录数",
    CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 不存在' END as "状态"
FROM matrix_referrals
WHERE matrix_root_wallet = '0xD95E2e17507E25C6a8556dB3d65cC47664Bf96df';

\echo ''
\echo '========================================='
\echo '检查所有 Layer 2 成员的双记录情况'
\echo '========================================='

WITH layer2_members AS (
    SELECT DISTINCT member_wallet
    FROM matrix_referrals
    WHERE matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
      AND layer = 2
)
SELECT 
    LEFT(l2.member_wallet, 12) || '...' as "Layer2成员",
    COALESCE(
        (SELECT COUNT(*) FROM matrix_referrals mr 
         WHERE mr.matrix_root_wallet = l2.member_wallet), 
        0
    ) as "作为matrix_root的记录数",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM matrix_referrals mr 
            WHERE mr.matrix_root_wallet = l2.member_wallet
        ) THEN '✓ 有'
        ELSE '✗ 无'
    END as "状态"
FROM layer2_members l2
ORDER BY l2.member_wallet;

\echo ''
\echo '========================================='
\echo '检查 parent_depth 的含义'
\echo '========================================='
\echo ''
\echo '理解: parent_depth 应该表示什么？'
\echo '  - 如果表示"与matrix_root的推荐深度"，则可能混乱'
\echo '  - 如果表示"在矩阵中的层级"，应该等于 layer'
\echo ''

SELECT 
    layer as "layer",
    parent_depth as "parent_depth",
    COUNT(*) as "记录数",
    CASE 
        WHEN layer = parent_depth THEN '✓ 匹配'
        ELSE '✗ 不匹配'
    END as "layer vs parent_depth"
FROM matrix_referrals
WHERE matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
  AND layer IN (1, 2, 3)
GROUP BY layer, parent_depth
ORDER BY layer, parent_depth;
