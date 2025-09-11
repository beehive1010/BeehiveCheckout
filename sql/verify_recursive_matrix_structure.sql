-- 基于现有表结构验证递归矩阵排列的查询视图

BEGIN;

-- 1. 首先检查当前referrals表的结构和数据
SELECT '=== 当前referrals表结构检查 ===' as step;

-- 检查表中的列
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'referrals' 
ORDER BY ordinal_position;

-- 检查当前数据样本
SELECT '=== 当前数据样本 ===' as step;
SELECT 
    member_wallet,
    username,
    referrer_wallet,
    matrix_root,
    matrix_layer,
    matrix_position,
    is_active,
    created_at
FROM referrals 
WHERE member_wallet IS NOT NULL
ORDER BY created_at
LIMIT 10;

-- 2. 创建递归矩阵验证视图
CREATE OR REPLACE VIEW recursive_matrix_verification_view AS
WITH RECURSIVE referral_chain AS (
    -- 基础情况：所有根节点（没有推荐人的会员）
    SELECT 
        member_wallet,
        username,
        referrer_wallet,
        member_wallet as chain_root,
        0 as depth_from_root,
        ARRAY[member_wallet] as referral_path,
        member_wallet::text as path_string
    FROM referrals 
    WHERE referrer_wallet IS NULL
    
    UNION ALL
    
    -- 递归情况：找到每个推荐链
    SELECT 
        r.member_wallet,
        r.username,
        r.referrer_wallet,
        rc.chain_root,
        rc.depth_from_root + 1,
        rc.referral_path || r.member_wallet,
        rc.path_string || ' → ' || r.member_wallet
    FROM referrals r
    INNER JOIN referral_chain rc ON r.referrer_wallet = rc.member_wallet
    WHERE rc.depth_from_root < 20  -- 防止无限递归
      AND NOT r.member_wallet = ANY(rc.referral_path)  -- 防止循环引用
)
SELECT 
    chain_root,
    depth_from_root,
    member_wallet,
    username,
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

-- 3. 创建理想递归矩阵结构视图（按照您描述的逻辑）
CREATE OR REPLACE VIEW ideal_recursive_matrix_structure AS
WITH RECURSIVE referral_chain AS (
    -- 找到所有推荐链
    SELECT 
        member_wallet,
        username,
        referrer_wallet,
        member_wallet as original_member,
        0 as depth,
        ARRAY[member_wallet] as path
    FROM referrals 
    WHERE member_wallet IS NOT NULL
    
    UNION ALL
    
    SELECT 
        r.member_wallet,
        r.username,
        r.referrer_wallet,
        rc.original_member,
        rc.depth + 1,
        rc.path || r.member_wallet
    FROM referrals r
    INNER JOIN referral_chain rc ON r.referrer_wallet = rc.member_wallet
    WHERE rc.depth < 19
      AND NOT r.member_wallet = ANY(rc.path)
),
-- 为每个会员生成他们应该拥有的matrix记录
matrix_records AS (
    SELECT DISTINCT
        path[i] as matrix_root,
        rc.member_wallet as matrix_member,
        rc.username,
        (array_position(rc.path, path[i]) - array_position(rc.path, rc.member_wallet)) as layer_in_matrix,
        -- 计算L-M-R位置（简化版，按顺序分配）
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
    username,
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
    actual.username as current_username,
    ideal.username as ideal_username,
    CASE 
        WHEN actual.matrix_root IS NULL THEN 'MISSING_IN_ACTUAL'
        WHEN ideal.matrix_root IS NULL THEN 'EXTRA_IN_ACTUAL'
        WHEN actual.matrix_position != ideal.ideal_position THEN 'POSITION_MISMATCH'
        WHEN actual.matrix_layer != ideal.layer_in_matrix THEN 'LAYER_MISMATCH'
        ELSE 'MATCH'
    END as comparison_status
FROM (
    SELECT matrix_root, matrix_layer, matrix_position, member_wallet, username
    FROM referrals 
    WHERE matrix_root IS NOT NULL
) actual
FULL OUTER JOIN ideal_recursive_matrix_structure ideal 
    ON actual.matrix_root = ideal.matrix_root 
    AND actual.matrix_layer = ideal.layer_in_matrix
    AND actual.member_wallet = ideal.matrix_member
ORDER BY matrix_root, layer, member_wallet;

-- 5. 简化的递归推荐链查看器
CREATE OR REPLACE FUNCTION show_referral_chain_for_member(p_member_wallet TEXT)
RETURNS TABLE(
    step_number INTEGER,
    member_wallet TEXT,
    username TEXT,
    role_in_chain TEXT,
    downstream_count BIGINT
) AS $$
WITH RECURSIVE downstream_chain AS (
    -- 从指定会员开始
    SELECT 
        p_member_wallet as member_wallet,
        r.username,
        0 as step,
        ARRAY[p_member_wallet] as path
    FROM referrals r
    WHERE r.member_wallet = p_member_wallet
    
    UNION ALL
    
    -- 找到所有下级
    SELECT 
        r.member_wallet,
        r.username,
        dc.step + 1,
        dc.path || r.member_wallet
    FROM referrals r
    INNER JOIN downstream_chain dc ON r.referrer_wallet = dc.member_wallet
    WHERE dc.step < 19
      AND NOT r.member_wallet = ANY(dc.path)
)
SELECT 
    dc.step as step_number,
    dc.member_wallet,
    dc.username,
    CASE 
        WHEN dc.step = 0 THEN 'ROOT (查询目标)'
        WHEN dc.step = 1 THEN '直接推荐'
        ELSE dc.step || '级下线'
    END as role_in_chain,
    COUNT(*) OVER (PARTITION BY dc.step) - 1 as downstream_count
FROM downstream_chain dc
ORDER BY dc.step, dc.member_wallet;
$$ LANGUAGE sql;

-- 6. 执行验证查询
SELECT '=== 递归推荐链验证 ===' as step;
SELECT * FROM recursive_matrix_verification_view 
WHERE depth_from_root <= 5
LIMIT 20;

SELECT '=== 理想递归矩阵结构（前20条）===' as step;
SELECT * FROM ideal_recursive_matrix_structure 
LIMIT 20;

SELECT '=== 当前与理想结构对比 ===' as step;
SELECT 
    comparison_status,
    COUNT(*) as count
FROM matrix_structure_comparison 
GROUP BY comparison_status
ORDER BY count DESC;

-- 显示一些具体的不匹配案例
SELECT '=== 位置不匹配案例 ===' as step;
SELECT * FROM matrix_structure_comparison 
WHERE comparison_status = 'POSITION_MISMATCH'
LIMIT 10;

-- 7. 为了测试，选择一个样本会员查看他的推荐链
SELECT '=== 样本会员推荐链展示 ===' as step;
DO $$
DECLARE
    sample_wallet TEXT;
BEGIN
    -- 选择一个有推荐关系的会员
    SELECT member_wallet INTO sample_wallet
    FROM referrals 
    WHERE referrer_wallet IS NOT NULL
    LIMIT 1;
    
    IF sample_wallet IS NOT NULL THEN
        RAISE NOTICE '查看会员 % 的推荐链:', sample_wallet;
        PERFORM show_referral_chain_for_member(sample_wallet);
    ELSE
        RAISE NOTICE '没有找到有推荐关系的会员数据';
    END IF;
END $$;

-- 8. 创建修复建议
SELECT '=== 修复建议 ===' as step;
SELECT 
    'DELETE FROM referrals WHERE matrix_root = ''' || matrix_root || 
    ''' AND matrix_layer = ' || layer || 
    ' AND member_wallet = ''' || member_wallet || ''';' as cleanup_sql
FROM matrix_structure_comparison 
WHERE comparison_status = 'EXTRA_IN_ACTUAL'
LIMIT 5;

SELECT 
    'INSERT INTO referrals (member_wallet, username, matrix_root, matrix_layer, matrix_position, is_active) VALUES (''' ||
    member_wallet || ''', ''' || ideal_username || ''', ''' || matrix_root || ''', ' || 
    layer || ', ''' || ideal_position || ''', true);' as insert_sql
FROM matrix_structure_comparison 
WHERE comparison_status = 'MISSING_IN_ACTUAL'
LIMIT 5;

COMMIT;