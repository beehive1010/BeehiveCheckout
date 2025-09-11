-- 基于实际referrals表结构验证递归矩阵排列的查询视图
-- 调整为当前数据库里面的referrals表，然后做个views先看树状滑落逻辑是否正确

BEGIN;

-- 1. 首先检查当前referrals表的数据状况
SELECT '=== 当前referrals表数据状况 ===' as step;

-- 检查总体数据分布
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT member_wallet) as unique_members,
    COUNT(DISTINCT referrer_wallet) as unique_referrers,
    COUNT(DISTINCT matrix_root) as unique_matrix_roots,
    COUNT(CASE WHEN matrix_root IS NOT NULL THEN 1 END) as records_with_matrix_root,
    COUNT(CASE WHEN matrix_position IS NOT NULL THEN 1 END) as records_with_position
FROM referrals;

-- 检查matrix_position分布
SELECT '=== Matrix Position 分布 ===' as step;
SELECT 
    matrix_position,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM referrals 
WHERE matrix_position IS NOT NULL
GROUP BY matrix_position
ORDER BY matrix_position;

-- 检查matrix_layer分布
SELECT '=== Matrix Layer 分布 ===' as step;
SELECT 
    matrix_layer,
    COUNT(*) as count,
    COUNT(DISTINCT matrix_root) as different_roots
FROM referrals 
WHERE matrix_layer IS NOT NULL
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 2. 创建递归推荐链验证视图（基于实际表结构）
CREATE OR REPLACE VIEW recursive_referral_chain_view AS
WITH RECURSIVE referral_chain AS (
    -- 基础情况：所有根节点（没有推荐人的会员）
    SELECT 
        r.member_wallet,
        u.username,
        r.referrer_wallet,
        r.member_wallet as chain_root,
        0 as depth_from_root,
        ARRAY[r.member_wallet] as referral_path,
        r.member_wallet::text as path_string
    FROM referrals r
    LEFT JOIN users u ON r.member_wallet = u.wallet_address
    WHERE r.referrer_wallet IS NULL
    
    UNION ALL
    
    -- 递归情况：找到每个推荐链
    SELECT 
        r.member_wallet,
        u.username,
        r.referrer_wallet,
        rc.chain_root,
        rc.depth_from_root + 1,
        rc.referral_path || r.member_wallet,
        rc.path_string || ' → ' || COALESCE(u.username, r.member_wallet)
    FROM referrals r
    LEFT JOIN users u ON r.member_wallet = u.wallet_address
    INNER JOIN referral_chain rc ON r.referrer_wallet = rc.member_wallet
    WHERE rc.depth_from_root < 20  -- 防止无限递归
      AND NOT r.member_wallet = ANY(rc.referral_path)  -- 防止循环引用
)
SELECT 
    chain_root,
    depth_from_root,
    member_wallet,
    COALESCE(username, 'User_' || RIGHT(member_wallet, 4)) as display_name,
    referrer_wallet,
    path_string as referral_chain,
    -- 计算在每个上级的matrix中应该处于的层级
    CASE 
        WHEN depth_from_root = 0 THEN 'ROOT'
        WHEN depth_from_root <= 19 THEN 'Layer ' || depth_from_root
        ELSE 'Beyond Layer 19'
    END as expected_matrix_layer
FROM referral_chain
ORDER BY chain_root, depth_from_root, member_wallet;

-- 3. 创建理想递归matrix结构视图（根据您的逻辑）
CREATE OR REPLACE VIEW ideal_recursive_matrix_structure AS
WITH RECURSIVE referral_chain AS (
    -- 构建完整的推荐链树
    SELECT 
        r.member_wallet,
        u.username,
        r.referrer_wallet,
        r.member_wallet as original_member,
        0 as depth,
        ARRAY[r.member_wallet] as path
    FROM referrals r
    LEFT JOIN users u ON r.member_wallet = u.wallet_address
    WHERE r.member_wallet IS NOT NULL
    
    UNION ALL
    
    SELECT 
        r.member_wallet,
        u.username,
        r.referrer_wallet,
        rc.original_member,
        rc.depth + 1,
        rc.path || r.member_wallet
    FROM referrals r
    LEFT JOIN users u ON r.member_wallet = u.wallet_address
    INNER JOIN referral_chain rc ON r.referrer_wallet = rc.member_wallet
    WHERE rc.depth < 19
      AND NOT r.member_wallet = ANY(rc.path)
),
-- 为每个会员生成他们应该拥有的matrix记录
matrix_records AS (
    SELECT DISTINCT
        path[i] as matrix_root,
        rc.member_wallet as matrix_member,
        COALESCE(rc.username, 'User_' || RIGHT(rc.member_wallet, 4)) as display_name,
        (array_position(rc.path, path[i]) - array_position(rc.path, rc.member_wallet)) as layer_in_matrix,
        -- 计算L-M-R位置（按顺序分配）
        CASE (row_number() OVER (
            PARTITION BY path[i], (array_position(rc.path, path[i]) - array_position(rc.path, rc.member_wallet))
            ORDER BY rc.member_wallet
        ) - 1) % 3
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            WHEN 2 THEN 'R'
        END as ideal_position
    FROM referral_chain rc,
         unnest(rc.path) WITH ORDINALITY AS t(path_element, i)
    WHERE array_position(rc.path, rc.member_wallet) > array_position(rc.path, path[i])
      AND (array_position(rc.path, path[i]) - array_position(rc.path, rc.member_wallet)) <= 19
      AND (array_position(rc.path, path[i]) - array_position(rc.path, rc.member_wallet)) > 0
)
SELECT 
    matrix_root,
    layer_in_matrix,
    ideal_position,
    matrix_member,
    display_name,
    COUNT(*) OVER (PARTITION BY matrix_root) as total_in_matrix,
    COUNT(*) OVER (PARTITION BY matrix_root, layer_in_matrix) as count_in_layer,
    POWER(3, layer_in_matrix) as max_capacity_for_layer
FROM matrix_records
WHERE layer_in_matrix > 0
ORDER BY matrix_root, layer_in_matrix, ideal_position, matrix_member;

-- 4. 对比当前实际数据与理想结构
CREATE OR REPLACE VIEW matrix_structure_comparison AS
SELECT 
    COALESCE(actual.matrix_root, ideal.matrix_root) as matrix_root,
    COALESCE(actual.matrix_layer, ideal.layer_in_matrix) as layer,
    COALESCE(actual.member_wallet, ideal.matrix_member) as member_wallet,
    actual.matrix_position as current_position,
    ideal.ideal_position,
    COALESCE(actual_user.username, 'User_' || RIGHT(COALESCE(actual.member_wallet, ideal.matrix_member), 4)) as display_name,
    CASE 
        WHEN actual.matrix_root IS NULL THEN 'MISSING_IN_ACTUAL'
        WHEN ideal.matrix_root IS NULL THEN 'EXTRA_IN_ACTUAL'
        WHEN actual.matrix_position != ideal.ideal_position THEN 'POSITION_MISMATCH'
        WHEN actual.matrix_layer != ideal.layer_in_matrix THEN 'LAYER_MISMATCH'
        ELSE 'MATCH'
    END as comparison_status
FROM (
    SELECT r.matrix_root, r.matrix_layer, r.matrix_position, r.member_wallet
    FROM referrals r
    WHERE r.matrix_root IS NOT NULL
) actual
FULL OUTER JOIN ideal_recursive_matrix_structure ideal 
    ON actual.matrix_root = ideal.matrix_root 
    AND actual.matrix_layer = ideal.layer_in_matrix
    AND actual.member_wallet = ideal.matrix_member
LEFT JOIN users actual_user ON COALESCE(actual.member_wallet, ideal.matrix_member) = actual_user.wallet_address
ORDER BY matrix_root, layer, member_wallet;

-- 5. 创建特定会员matrix查看函数
CREATE OR REPLACE FUNCTION view_member_current_matrix(p_wallet_address TEXT)
RETURNS TABLE(
    layer INTEGER,
    position TEXT,
    member_wallet TEXT,
    display_name TEXT,
    join_date TIMESTAMP,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.matrix_layer as layer,
        r.matrix_position as position,
        r.member_wallet,
        COALESCE(u.username, 'User_' || RIGHT(r.member_wallet, 4)) as display_name,
        r.placed_at as join_date,
        r.is_active
    FROM referrals r
    LEFT JOIN users u ON r.member_wallet = u.wallet_address
    WHERE r.matrix_root = p_wallet_address
    ORDER BY r.matrix_layer, 
        CASE r.matrix_position 
            WHEN 'L' THEN 1 
            WHEN 'M' THEN 2 
            WHEN 'R' THEN 3 
            ELSE 4 
        END,
        r.placed_at;
END;
$$ LANGUAGE plpgsql;

-- 6. 显示推荐链分析
CREATE OR REPLACE FUNCTION show_referral_chain_analysis(p_member_wallet TEXT)
RETURNS TABLE(
    step_number INTEGER,
    member_wallet TEXT,
    display_name TEXT,
    role_in_chain TEXT,
    should_be_in_matrices_of TEXT[]
) AS $$
WITH RECURSIVE downstream_chain AS (
    -- 从指定会员开始
    SELECT 
        p_member_wallet as member_wallet,
        COALESCE(u.username, 'User_' || RIGHT(p_member_wallet, 4)) as display_name,
        0 as step,
        ARRAY[p_member_wallet] as path
    FROM users u
    WHERE u.wallet_address = p_member_wallet
    
    UNION ALL
    
    -- 找到所有下级
    SELECT 
        r.member_wallet,
        COALESCE(u.username, 'User_' || RIGHT(r.member_wallet, 4)) as display_name,
        dc.step + 1,
        dc.path || r.member_wallet
    FROM referrals r
    LEFT JOIN users u ON r.member_wallet = u.wallet_address
    INNER JOIN downstream_chain dc ON r.referrer_wallet = dc.member_wallet
    WHERE dc.step < 19
      AND NOT r.member_wallet = ANY(dc.path)
)
SELECT 
    dc.step as step_number,
    dc.member_wallet,
    dc.display_name,
    CASE 
        WHEN dc.step = 0 THEN 'ROOT (查询目标)'
        WHEN dc.step = 1 THEN '直接推荐'
        ELSE dc.step || '级下线'
    END as role_in_chain,
    -- 计算这个成员应该出现在哪些人的matrix中
    (SELECT ARRAY_AGG(ancestor_wallet)
     FROM unnest(dc.path[1:array_length(dc.path, 1)-1]) WITH ORDINALITY AS t(ancestor_wallet, pos)
     WHERE pos <= 19) as should_be_in_matrices_of
FROM downstream_chain dc
ORDER BY dc.step, dc.member_wallet;
$$ LANGUAGE sql;

-- 7. 执行验证查询
SELECT '=== 当前推荐链结构 ===' as step;
SELECT 
    chain_root as "Matrix Root",
    depth_from_root as "层级",
    display_name as "成员名称",
    LEFT(member_wallet, 10) || '...' as "钱包地址"
FROM recursive_referral_chain_view 
WHERE depth_from_root <= 5
ORDER BY chain_root, depth_from_root
LIMIT 20;

SELECT '=== 理想matrix结构示例 ===' as step;
SELECT 
    LEFT(matrix_root, 10) || '...' as "Matrix Root",
    layer_in_matrix as "层级",
    ideal_position as "位置",
    display_name as "成员名称",
    count_in_layer as "该层总数",
    max_capacity_for_layer as "层级容量"
FROM ideal_recursive_matrix_structure 
ORDER BY matrix_root, layer_in_matrix, ideal_position
LIMIT 20;

SELECT '=== 当前与理想结构对比统计 ===' as step;
SELECT 
    comparison_status as "比较状态",
    COUNT(*) as "数量"
FROM matrix_structure_comparison 
GROUP BY comparison_status
ORDER BY COUNT(*) DESC;

-- 显示具体的不匹配案例
SELECT '=== 位置不匹配的具体案例 ===' as step;
SELECT 
    LEFT(matrix_root, 10) || '...' as "Matrix Root",
    layer as "层级",
    display_name as "成员名称",
    current_position as "当前位置",
    ideal_position as "理想位置"
FROM matrix_structure_comparison 
WHERE comparison_status IN ('POSITION_MISMATCH', 'MISSING_IN_ACTUAL')
ORDER BY matrix_root, layer
LIMIT 10;

SELECT '=== 当前数据库问题总结 ===' as step;
SELECT 
    'Position Distribution' as issue_type,
    'All positions are L, should be L/M/R distributed' as description,
    (SELECT COUNT(*) FROM referrals WHERE matrix_position = 'L') as count_L,
    (SELECT COUNT(*) FROM referrals WHERE matrix_position = 'M') as count_M,
    (SELECT COUNT(*) FROM referrals WHERE matrix_position = 'R') as count_R;

COMMIT;