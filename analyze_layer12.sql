-- 分析第12层的异常情况

\echo '========================================='
\echo '第12层占位详细分析'
\echo '========================================='
SELECT 
    '会员在第12层' as "说明",
    matrix_root_wallet as "矩阵根",
    parent_wallet as "父节点",
    position as "位置",
    referral_type as "类型",
    source as "来源"
FROM matrix_referrals
WHERE member_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
  AND layer = 12;

-- 检查这个矩阵根是不是在推荐链上
\echo ''
\echo '检查第12层矩阵根 0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab:'
WITH RECURSIVE upline_chain AS (
    SELECT 
        wallet_address,
        1 as depth
    FROM members
    WHERE wallet_address = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
    
    UNION ALL
    
    SELECT 
        m.wallet_address,
        uc.depth + 1
    FROM upline_chain uc
    INNER JOIN members m ON uc.referrer_wallet = m.wallet_address
    WHERE uc.depth < 20
)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM upline_chain 
            WHERE wallet_address = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
        ) THEN '✓ 在推荐链上 (深度' || (SELECT depth FROM upline_chain WHERE wallet_address = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab') || ')'
        ELSE '✗ 不在推荐链上 - 这是额外的矩阵占位'
    END as "矩阵根状态";

-- 检查父节点 0x81fC848EAb4F2168Abb851a3664956AF71531B45
\echo ''
\echo '检查第12层父节点 0x81fC848EAb4F2168Abb851a3664956AF71531B45:'
SELECT 
    wallet_address as "父节点钱包",
    referrer_wallet as "父节点的推荐人",
    activation_sequence as "激活序号",
    activation_time as "激活时间"
FROM members
WHERE wallet_address = '0x81fC848EAb4F2168Abb851a3664956AF71531B45';

-- 检查会员的推荐人链
\echo ''
\echo '========================================='
\echo '完整推荐链展示 (从会员到最顶层)'
\echo '========================================='
WITH RECURSIVE upline_chain AS (
    SELECT 
        '0x623F77138f688933b5d03e39511F982b6B0FdF08' as wallet,
        '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3' as referrer,
        0 as depth,
        '本人' as role
    
    UNION ALL
    
    SELECT 
        m.wallet_address,
        m.referrer_wallet,
        uc.depth + 1,
        '上线' || (uc.depth + 1) as role
    FROM upline_chain uc
    INNER JOIN members m ON uc.referrer = m.wallet_address
    WHERE uc.depth < 19
      AND m.referrer_wallet IS NOT NULL
)
SELECT 
    depth as "深度",
    role as "角色",
    LEFT(wallet, 12) || '...' as "钱包地址",
    LEFT(COALESCE(referrer, '无'), 12) || '...' as "推荐人"
FROM upline_chain
ORDER BY depth;
