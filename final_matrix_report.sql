-- 完整矩阵占位报告
-- 会员：0x623F77138f688933b5d03e39511F982b6B0FdF08

\echo '========================================='
\echo '矩阵递归占位完整报告'
\echo '========================================='
\echo ''

-- 1. 会员基本信息
\echo '【1】会员基本信息:'
SELECT 
    '钱包' as "字段", '0x623F77138f688933b5d03e39511F982b6B0FdF08' as "值"
UNION ALL
SELECT '推荐人', LEFT(referrer_wallet, 42)
FROM members WHERE wallet_address = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
UNION ALL  
SELECT '激活序号', activation_sequence::text
FROM members WHERE wallet_address = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
UNION ALL
SELECT '激活时间', TO_CHAR(activation_time, 'YYYY-MM-DD HH24:MI:SS')
FROM members WHERE wallet_address = '0x623F77138f688933b5d03e39511F982b6B0FdF08';

-- 2. 推荐链分析
\echo ''
\echo '【2】推荐人的上线链 (递归19层):'
WITH RECURSIVE upline AS (
    -- 起点：会员的推荐人
    SELECT 
        wallet_address,
        referrer_wallet,
        0 as depth,
        '推荐人(本人)' as role
    FROM members 
    WHERE wallet_address = (
        SELECT referrer_wallet FROM members 
        WHERE wallet_address = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
    )
    
    UNION ALL
    
    -- 递归查找上线
    SELECT 
        m.wallet_address,
        m.referrer_wallet,
        u.depth + 1,
        '上线' || (u.depth + 1) as role
    FROM upline u
    JOIN members m ON u.referrer_wallet = m.wallet_address
    WHERE u.depth < 18  -- 最多19层，从0开始所以<18
)
SELECT 
    depth as "深度",
    role as "角色",
    LEFT(wallet_address, 12) || '...' as "钱包地址"
FROM upline
ORDER BY depth;

-- 3. 实际矩阵占位情况
\echo ''
\echo '【3】实际矩阵占位情况:'
SELECT 
    layer as "层",
    position as "位",
    referral_type as "类型",
    LEFT(matrix_root_wallet, 10) || '...' as "矩阵根",
    LEFT(parent_wallet, 10) || '...' as "父节点"
FROM matrix_referrals
WHERE member_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
ORDER BY layer;

-- 4. 统计对比
\echo ''
\echo '【4】占位统计分析:'
WITH upline_count AS (
    WITH RECURSIVE u AS (
        SELECT wallet_address, 0 as d
        FROM members 
        WHERE wallet_address = (
            SELECT referrer_wallet FROM members 
            WHERE wallet_address = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
        )
        UNION ALL
        SELECT m.wallet_address, u2.d + 1
        FROM u u2
        JOIN members m ON u2.referrer_wallet = m.wallet_address
        WHERE u2.d < 18
    )
    SELECT COUNT(*) as cnt FROM u
),
placement_count AS (
    SELECT COUNT(*) as cnt
    FROM matrix_referrals
    WHERE member_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
)
SELECT 
    (SELECT cnt FROM upline_count) as "应占位数量(推荐链深度)",
    (SELECT cnt FROM placement_count) as "实际占位数量",
    CASE 
        WHEN (SELECT cnt FROM upline_count) = (SELECT cnt FROM placement_count)
        THEN '✓ 完全匹配'
        WHEN (SELECT cnt FROM upline_count) < (SELECT cnt FROM placement_count)
        THEN '⚠ 超出预期'
        ELSE '✗ 占位不足'
    END as "状态";

-- 5. 会员自己的矩阵发展
\echo ''
\echo '【5】会员自己的矩阵发展:'
SELECT 
    COALESCE(layer, 0) as "层级",
    COALESCE(COUNT(*), 0) as "成员数",
    COALESCE(SUM(CASE WHEN referral_type = 'direct' THEN 1 ELSE 0 END), 0) as "直推",
    COALESCE(SUM(CASE WHEN referral_type = 'spillover' THEN 1 ELSE 0 END), 0) as "滑落"
FROM matrix_referrals
WHERE matrix_root_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
GROUP BY layer
ORDER BY layer;

\echo ''
\echo '【总结】'
\echo '该会员的矩阵占位状态已完成检查。'
\echo '========================================='
