-- 检查推荐链深度
-- 从会员的推荐人开始，递归查找所有上线

WITH RECURSIVE upline_chain AS (
    -- 起点：会员的直接推荐人
    SELECT 
        wallet_address,
        referrer_wallet,
        1 as depth,
        wallet_address as chain_member
    FROM members
    WHERE wallet_address = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'  -- 会员的推荐人
    
    UNION ALL
    
    -- 递归：向上查找推荐人的推荐人
    SELECT 
        m.wallet_address,
        m.referrer_wallet,
        uc.depth + 1,
        m.wallet_address
    FROM upline_chain uc
    INNER JOIN members m ON uc.referrer_wallet = m.wallet_address
    WHERE uc.depth < 19
      AND m.referrer_wallet IS NOT NULL
)
SELECT 
    depth as "推荐链层级",
    LEFT(chain_member, 12) || '...' as "上线钱包",
    LEFT(referrer_wallet, 12) || '...' as "该上线的推荐人"
FROM upline_chain
ORDER BY depth;

-- 统计推荐链深度
\echo ''
\echo '推荐链深度统计:'
WITH RECURSIVE upline_chain AS (
    SELECT 
        wallet_address,
        referrer_wallet,
        1 as depth
    FROM members
    WHERE wallet_address = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
    
    UNION ALL
    
    SELECT 
        m.wallet_address,
        m.referrer_wallet,
        uc.depth + 1
    FROM upline_chain uc
    INNER JOIN members m ON uc.referrer_wallet = m.wallet_address
    WHERE uc.depth < 19
      AND m.referrer_wallet IS NOT NULL
)
SELECT 
    COUNT(*) as "总上线数量",
    MAX(depth) as "最大深度",
    CASE 
        WHEN MAX(depth) = 19 THEN '✓ 达到19层'
        WHEN MAX(depth) < 19 THEN '⚠ 推荐链深度不足 (仅' || MAX(depth) || '层)'
        ELSE '状态未知'
    END as "推荐链状态"
FROM upline_chain;
