-- 创建双表系统：原始推荐关系 + 滑落后的Matrix表

BEGIN;

-- 1. 恢复原始推荐关系到referrals表
DELETE FROM referrals;

-- 重建原始推荐关系（不考虑滑落，纯粹的推荐链）
INSERT INTO referrals (
    member_wallet,
    referrer_wallet,
    matrix_root,
    matrix_layer,
    matrix_position,
    is_active,
    placed_at
)
WITH RECURSIVE original_matrix AS (
    SELECT 
        m.wallet_address as member_wallet,
        m.referrer_wallet,
        m.referrer_wallet as matrix_root,
        1 as matrix_layer,
        COALESCE(u.username, 'Member_' || RIGHT(m.wallet_address, 4)) as member_name,
        m.created_at
    FROM members m
    LEFT JOIN users u ON m.wallet_address = u.wallet_address
    WHERE m.referrer_wallet IS NOT NULL
    AND m.wallet_address != m.referrer_wallet
),
matrix_with_ancestors AS (
    SELECT 
        om.member_wallet,
        om.referrer_wallet,
        om.matrix_root,
        1 as distance,
        om.created_at
    FROM original_matrix om
    
    UNION ALL
    
    SELECT 
        mwa.member_wallet,
        mwa.referrer_wallet,
        m2.referrer_wallet as matrix_root,
        mwa.distance + 1,
        mwa.created_at
    FROM matrix_with_ancestors mwa
    JOIN members m2 ON mwa.matrix_root = m2.wallet_address
    WHERE m2.referrer_wallet IS NOT NULL
    AND m2.wallet_address != m2.referrer_wallet
    AND mwa.distance < 19
),
positioned_matrix AS (
    SELECT 
        member_wallet,
        referrer_wallet,
        matrix_root,
        distance as matrix_layer,
        CASE ((ROW_NUMBER() OVER (PARTITION BY matrix_root, distance ORDER BY created_at) - 1) % 3)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            WHEN 2 THEN 'R'
        END as matrix_position,
        true as is_active,
        created_at as placed_at
    FROM matrix_with_ancestors
)
SELECT * FROM positioned_matrix;

SELECT '=== 原始推荐关系表 (referrals) 重建完成 ===' as step;
SELECT COUNT(*) || ' 条原始推荐关系记录' as result FROM referrals;

-- 2. 创建新的滑落Matrix表
CREATE TABLE IF NOT EXISTS spillover_matrix (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_wallet character varying(42) NOT NULL,
    referrer_wallet character varying(42) NOT NULL,
    matrix_root character varying(42) NOT NULL,
    matrix_layer integer NOT NULL DEFAULT 1,
    matrix_position character varying(1) CHECK (matrix_position IN ('L', 'M', 'R')),
    is_active boolean DEFAULT true,
    placed_at timestamp with time zone DEFAULT now(),
    spillover_from_layer integer, -- 记录原本应该在哪一层
    created_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT spillover_matrix_member_root_unique UNIQUE (member_wallet, matrix_root),
    CONSTRAINT spillover_matrix_member_wallet_fkey FOREIGN KEY (member_wallet) REFERENCES members(wallet_address),
    CONSTRAINT spillover_matrix_matrix_root_fkey FOREIGN KEY (matrix_root) REFERENCES members(wallet_address)
);

-- 3. 生成滑落后的Matrix数据
INSERT INTO spillover_matrix (
    member_wallet,
    referrer_wallet,
    matrix_root,
    matrix_layer,
    matrix_position,
    spillover_from_layer,
    is_active,
    placed_at
)
WITH ordered_members AS (
    SELECT 
        m.wallet_address,
        m.referrer_wallet,
        m.created_at,
        ROW_NUMBER() OVER (ORDER BY m.created_at) as join_order
    FROM members m
    WHERE m.referrer_wallet IS NOT NULL
    AND m.wallet_address != m.referrer_wallet
),
matrix_placements AS (
    SELECT 
        om.wallet_address as member_wallet,
        om.referrer_wallet,
        ancestor.wallet_address as matrix_root,
        ancestor_distance.distance as original_layer,
        om.created_at as placed_at
    FROM ordered_members om
    -- 找到所有祖先
    JOIN LATERAL (
        WITH RECURSIVE ancestors AS (
            SELECT om.referrer_wallet as wallet_address, 1 as distance
            UNION ALL
            SELECT m.referrer_wallet, a.distance + 1
            FROM ancestors a
            JOIN members m ON a.wallet_address = m.wallet_address
            WHERE m.referrer_wallet IS NOT NULL 
            AND m.wallet_address != m.referrer_wallet
            AND a.distance < 19
        )
        SELECT wallet_address, distance FROM ancestors
    ) ancestor_distance ON true
    JOIN members ancestor ON ancestor.wallet_address = ancestor_distance.wallet_address
),
spillover_assignments AS (
    SELECT 
        mp.member_wallet,
        mp.referrer_wallet,
        mp.matrix_root,
        mp.original_layer,
        mp.placed_at,
        -- 为每个matrix_root分配实际层级和位置
        ROW_NUMBER() OVER (PARTITION BY mp.matrix_root ORDER BY mp.placed_at) as placement_order
    FROM matrix_placements mp
),
final_spillover AS (
    SELECT 
        sa.member_wallet,
        sa.referrer_wallet,
        sa.matrix_root,
        sa.original_layer,
        -- 计算实际放置层级（基于滑落逻辑）
        CASE 
            WHEN sa.placement_order <= 3 THEN 1  -- Layer 1 最多3人
            WHEN sa.placement_order <= 12 THEN 2 -- Layer 2 最多9人（3+9=12）
            WHEN sa.placement_order <= 39 THEN 3 -- Layer 3 最多27人（12+27=39）
            ELSE CEIL(LOG(3, sa.placement_order - 3)) + 1  -- 更高层级
        END as actual_layer,
        -- 计算位置
        CASE ((sa.placement_order - 1) % 3)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            WHEN 2 THEN 'R'
        END as matrix_position,
        sa.placed_at
    FROM spillover_assignments sa
)
SELECT 
    member_wallet,
    referrer_wallet,
    matrix_root,
    actual_layer as matrix_layer,
    matrix_position,
    original_layer as spillover_from_layer,
    true as is_active,
    placed_at
FROM final_spillover;

SELECT '=== 滑落Matrix表 (spillover_matrix) 创建完成 ===' as step;
SELECT COUNT(*) || ' 条滑落matrix记录' as result FROM spillover_matrix;

-- 4. 对比两个表的结构
SELECT '=== 对比原始 vs 滑落后的Matrix结构 ===' as step;

-- 原始推荐关系
SELECT 
    '原始推荐关系' as table_type,
    COALESCE(u_root.username, 'Root_' || RIGHT(r.matrix_root, 4)) as matrix_root,
    r.matrix_layer,
    r.matrix_position,
    COALESCE(u_member.username, 'Member_' || RIGHT(r.member_wallet, 4)) as member_name
FROM referrals r
LEFT JOIN users u_root ON r.matrix_root = u_root.wallet_address
LEFT JOIN users u_member ON r.member_wallet = u_member.wallet_address
WHERE r.matrix_root = (SELECT wallet_address FROM users WHERE username = 'TestUser001')
ORDER BY r.matrix_layer, r.matrix_position

UNION ALL

-- 滑落后的Matrix
SELECT 
    '滑落后Matrix' as table_type,
    COALESCE(u_root.username, 'Root_' || RIGHT(sm.matrix_root, 4)),
    sm.matrix_layer,
    sm.matrix_position,
    COALESCE(u_member.username, 'Member_' || RIGHT(sm.member_wallet, 4))
FROM spillover_matrix sm
LEFT JOIN users u_root ON sm.matrix_root = u_root.wallet_address
LEFT JOIN users u_member ON sm.member_wallet = u_member.wallet_address
WHERE sm.matrix_root = (SELECT wallet_address FROM users WHERE username = 'TestUser001')
ORDER BY sm.matrix_layer, sm.matrix_position;

COMMIT;