-- 分析矩阵根 0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3 的数据问题

\echo '========================================='
\echo '问题分析：Layer 2 的 parent_depth 错误'
\echo '========================================='
\echo ''

-- 检查 Layer 2 的所有记录
SELECT 
    layer as "层",
    position as "位",
    LEFT(member_wallet, 10) || '...' as "成员",
    LEFT(parent_wallet, 10) || '...' as "父节点",
    parent_depth as "parent_depth",
    referral_type as "类型",
    TO_CHAR(created_at, 'MM-DD HH24:MI:SS') as "时间",
    CASE 
        WHEN parent_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3' THEN '✗ 错误(应该是Layer1成员)'
        WHEN parent_wallet IN (
            SELECT member_wallet FROM matrix_referrals 
            WHERE matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3' 
            AND layer = 1
        ) THEN '✓ 正确(是Layer1成员)'
        ELSE '? 未知'
    END as "父节点检查"
FROM matrix_referrals
WHERE matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
  AND layer = 2
ORDER BY created_at;

\echo ''
\echo '========================================='
\echo 'Layer 1 成员列表（应该只有3个）'
\echo '========================================='
SELECT 
    position as "位",
    LEFT(member_wallet, 10) || '...' as "成员钱包",
    referral_type as "类型"
FROM matrix_referrals
WHERE matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
  AND layer = 1
ORDER BY position;

\echo ''
\echo '========================================='
\echo '每个 Layer 1 成员的子节点统计'
\echo '========================================='
WITH layer1_members AS (
    SELECT member_wallet, position
    FROM matrix_referrals
    WHERE matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
      AND layer = 1
)
SELECT 
    l1.position as "Layer1位置",
    LEFT(l1.member_wallet, 10) || '...' as "Layer1成员",
    COUNT(mr2.member_wallet) as "子节点数量",
    STRING_AGG(mr2.position, ', ' ORDER BY mr2.position) as "子节点位置"
FROM layer1_members l1
LEFT JOIN matrix_referrals mr2 
    ON mr2.matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
    AND mr2.parent_wallet = l1.member_wallet
    AND mr2.layer = 2
GROUP BY l1.position, l1.member_wallet
ORDER BY l1.position;
