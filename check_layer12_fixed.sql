-- 检查为什么会有第12层占位

-- 1. 确认推荐链深度
\echo '推荐链实际深度:'
SELECT 
    COUNT(*) as "上线数量"
FROM (
    WITH RECURSIVE upline AS (
        SELECT wallet_address, referrer_wallet, 1 as d
        FROM members 
        WHERE wallet_address = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
        UNION ALL
        SELECT m.wallet_address, m.referrer_wallet, u.d + 1
        FROM upline u
        JOIN members m ON u.referrer_wallet = m.wallet_address
        WHERE u.d < 19
    )
    SELECT * FROM upline
) sub;

-- 2. 检查所有矩阵根是否在推荐链上
\echo ''
\echo '所有矩阵根检查:'
WITH member_placements AS (
    SELECT DISTINCT matrix_root_wallet, layer
    FROM matrix_referrals
    WHERE member_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
),
upline_chain AS (
    WITH RECURSIVE u AS (
        SELECT wallet_address, 1 as depth
        FROM members 
        WHERE wallet_address = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
        UNION ALL
        SELECT m.wallet_address, u2.depth + 1
        FROM u u2
        JOIN members m ON u2.wallet_address = m.referrer_wallet
        WHERE u2.depth < 19
    )
    SELECT wallet_address, depth FROM u
)
SELECT 
    mp.layer as "层级",
    LEFT(mp.matrix_root_wallet, 12) || '...' as "矩阵根",
    CASE 
        WHEN uc.wallet_address IS NOT NULL 
        THEN '✓ 在推荐链 (深度' || uc.depth || ')'
        ELSE '✗ 不在推荐链'
    END as "状态"
FROM member_placements mp
LEFT JOIN upline_chain uc ON mp.matrix_root_wallet = uc.wallet_address
ORDER BY mp.layer;

-- 3. 特别检查第12层
\echo ''
\echo '第12层特殊情况分析:'
SELECT 
    mr.layer as "层级",
    LEFT(mr.matrix_root_wallet, 12) || '...' as "矩阵根",
    LEFT(mr.parent_wallet, 12) || '...' as "父节点", 
    mr.position as "位置",
    mr.referral_type as "类型",
    m_root.activation_sequence as "根激活序号",
    m_parent.activation_sequence as "父激活序号"
FROM matrix_referrals mr
LEFT JOIN members m_root ON mr.matrix_root_wallet = m_root.wallet_address
LEFT JOIN members m_parent ON mr.parent_wallet = m_parent.wallet_address
WHERE mr.member_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
  AND mr.layer = 12;
