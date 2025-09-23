-- 🔧 修正递归推荐树的3x3矩阵滑落逻辑
-- 问题：当前逻辑没有实现正确的滑落规则
-- 正确规则：Layer满了才滑落到下一层，而不是所有推荐都在同一层

DROP VIEW IF EXISTS recursive_referral_tree_19_layers CASCADE;

CREATE VIEW recursive_referral_tree_19_layers AS
WITH referral_sequences AS (
    -- 为每个referrer的所有推荐按时间排序
    SELECT 
        referrer_wallet,
        referred_wallet,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY referrer_wallet ORDER BY created_at) as sequence_number
    FROM referrals_new
    WHERE referred_wallet <> '0x0000000000000000000000000000000000000001'
),
matrix_placement AS (
    -- 根据3x3矩阵规则计算正确的层级和位置
    SELECT 
        referrer_wallet,
        referred_wallet,
        created_at,
        sequence_number,
        -- 计算层级：使用3^n累积容量找到正确层级
        CASE 
            WHEN sequence_number <= 3 THEN 1     -- 1-3: Layer 1 (容量3)
            WHEN sequence_number <= 12 THEN 2    -- 4-12: Layer 2 (容量9)  
            WHEN sequence_number <= 39 THEN 3    -- 13-39: Layer 3 (容量27)
            WHEN sequence_number <= 120 THEN 4   -- 40-120: Layer 4 (容量81)
            WHEN sequence_number <= 363 THEN 5   -- Layer 5 (容量243)
            WHEN sequence_number <= 1092 THEN 6  -- Layer 6 (容量729)
            WHEN sequence_number <= 3279 THEN 7  -- Layer 7 (容量2187)
            WHEN sequence_number <= 9840 THEN 8  -- Layer 8 (容量6561)
            WHEN sequence_number <= 29523 THEN 9 -- Layer 9 (容量19683)
            ELSE LEAST(10 + (sequence_number - 29523) / 59049, 19) -- 继续计算到Layer 19
        END as layer,
        -- 计算在该层内的位置
        CASE 
            WHEN sequence_number <= 3 THEN
                CASE (sequence_number - 1) % 3 WHEN 0 THEN 'L' WHEN 1 THEN 'M' ELSE 'R' END
            WHEN sequence_number <= 12 THEN  
                CASE ((sequence_number - 4) % 9) / 3 WHEN 0 THEN 'L' WHEN 1 THEN 'M' ELSE 'R' END
            WHEN sequence_number <= 39 THEN
                CASE ((sequence_number - 13) % 27) / 9 WHEN 0 THEN 'L' WHEN 1 THEN 'M' ELSE 'R' END
            ELSE 
                CASE ((sequence_number - 1) % 3) WHEN 0 THEN 'L' WHEN 1 THEN 'M' ELSE 'R' END
        END as position
    FROM referral_sequences
),
RECURSIVE referral_tree AS (
    -- Base: 每个激活会员作为root
    SELECT 
        m.wallet_address as tree_root,
        m.wallet_address as member_wallet,
        u.username,
        m.current_level,
        m.activation_time,
        0 as layer,
        'root'::text as position,
        ARRAY[m.wallet_address]::text[] as path
    FROM members m
    LEFT JOIN users u ON u.wallet_address = m.wallet_address
    WHERE m.current_level > 0
    
    UNION ALL
    
    -- Recursive: 使用正确的滑落逻辑
    SELECT 
        rt.tree_root,
        mp.referred_wallet,
        u2.username,
        m2.current_level,
        m2.activation_time,
        mp.layer,
        mp.position,
        rt.path || mp.referred_wallet::text
    FROM referral_tree rt
    JOIN matrix_placement mp ON mp.referrer_wallet = rt.member_wallet
    LEFT JOIN users u2 ON u2.wallet_address = mp.referred_wallet
    LEFT JOIN members m2 ON m2.wallet_address = mp.referred_wallet
    WHERE mp.layer <= 19
        AND NOT mp.referred_wallet = ANY(rt.path)
)
SELECT tree_root, member_wallet, username, current_level, activation_time, layer, position 
FROM referral_tree 
WHERE layer <= 19
ORDER BY tree_root, layer, 
    CASE position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 ELSE 4 END;

-- 添加说明
COMMENT ON VIEW recursive_referral_tree_19_layers IS 
'正确的3x3矩阵滑落逻辑：
- 序号1-3: Layer 1 (L,M,R各1个)
- 序号4-12: Layer 2 (L,M,R各3个)  
- 序号13-39: Layer 3 (L,M,R各9个)
- 满层自动滑落到下一层，最多19层';