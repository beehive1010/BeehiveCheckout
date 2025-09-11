-- 完整的递归Matrix修复
-- 基于members和referrals表，创建正确的递归matrix记录

BEGIN;

-- 1. 检查当前推荐关系数据来源
SELECT '=== 检查推荐关系数据来源 ===' as step;

-- 从members表查看推荐关系
SELECT 
    'members表' as source,
    m.wallet_address as member_wallet,
    m.referrer_wallet,
    COALESCE(u1.username, 'User_' || RIGHT(m.wallet_address, 4)) as member_name,
    COALESCE(u2.username, 'User_' || RIGHT(m.referrer_wallet, 4)) as referrer_name,
    m.created_at
FROM members m
LEFT JOIN users u1 ON m.wallet_address = u1.wallet_address
LEFT JOIN users u2 ON m.referrer_wallet = u2.wallet_address
WHERE m.referrer_wallet IS NOT NULL
ORDER BY m.created_at;

-- 从referrals表查看推荐关系（仅基础关系，非matrix记录）
SELECT 
    'referrals表(基础关系)' as source,
    r.member_wallet,
    r.referrer_wallet,
    COALESCE(u1.username, 'User_' || RIGHT(r.member_wallet, 4)) as member_name,
    COALESCE(u2.username, 'User_' || RIGHT(r.referrer_wallet, 4)) as referrer_name,
    r.placed_at as created_at
FROM referrals r
LEFT JOIN users u1 ON r.member_wallet = u1.wallet_address
LEFT JOIN users u2 ON r.referrer_wallet = u2.wallet_address
WHERE r.matrix_root IS NULL  -- 只看基础推荐关系
ORDER BY r.placed_at;

-- 2. 创建递归matrix生成函数（基于members表）
CREATE OR REPLACE FUNCTION generate_complete_recursive_matrix()
RETURNS void AS $$
DECLARE
    member_record RECORD;
    ancestor_record RECORD;
    layer_in_matrix INTEGER;
    position_in_layer TEXT;
    existing_count INTEGER;
BEGIN
    RAISE NOTICE '开始生成完整的递归matrix结构...';
    
    -- 备份当前matrix记录
    CREATE TABLE IF NOT EXISTS referrals_matrix_backup AS
    SELECT * FROM referrals WHERE matrix_root IS NOT NULL;
    
    -- 删除所有当前的matrix记录，保留基础推荐关系
    DELETE FROM referrals WHERE matrix_root IS NOT NULL;
    
    RAISE NOTICE '已清空现有matrix记录，开始重建...';
    
    -- 基于members表的推荐关系重建递归matrix
    FOR member_record IN 
        SELECT 
            m.wallet_address as member_wallet, 
            m.referrer_wallet,
            m.created_at as join_time
        FROM members m
        WHERE m.referrer_wallet IS NOT NULL
        ORDER BY m.created_at ASC
    LOOP
        RAISE NOTICE '处理会员: % (推荐人: %)', 
            (SELECT COALESCE(username, 'User_' || RIGHT(member_record.member_wallet, 4)) FROM users WHERE wallet_address = member_record.member_wallet),
            (SELECT COALESCE(username, 'User_' || RIGHT(member_record.referrer_wallet, 4)) FROM users WHERE wallet_address = member_record.referrer_wallet);
        
        -- 使用递归查询找到该会员的所有祖先（上级链）
        FOR ancestor_record IN 
            WITH RECURSIVE ancestor_chain AS (
                -- 基础案例：直接推荐人
                SELECT 
                    m1.wallet_address as ancestor_wallet,
                    m1.referrer_wallet,
                    1 as distance_from_member
                FROM members m1 
                WHERE m1.wallet_address = member_record.referrer_wallet
                
                UNION ALL
                
                -- 递归案例：推荐人的推荐人
                SELECT 
                    m2.wallet_address,
                    m2.referrer_wallet,
                    ac.distance_from_member + 1
                FROM members m2
                INNER JOIN ancestor_chain ac ON m2.wallet_address = ac.referrer_wallet
                WHERE ac.distance_from_member < 19  -- 限制最大层数
            )
            SELECT * FROM ancestor_chain 
            ORDER BY distance_from_member
        LOOP
            layer_in_matrix := ancestor_record.distance_from_member;
            
            -- 计算在该ancestor的matrix中的位置数量
            SELECT COUNT(*) INTO existing_count
            FROM referrals 
            WHERE matrix_root = ancestor_record.ancestor_wallet 
            AND matrix_layer = layer_in_matrix;
            
            -- 按L→M→R→L循环分配位置
            position_in_layer := CASE (existing_count % 3)
                WHEN 0 THEN 'L'
                WHEN 1 THEN 'M'
                WHEN 2 THEN 'R'
            END;
            
            -- 插入matrix记录
            INSERT INTO referrals (
                member_wallet,
                referrer_wallet,
                matrix_root,
                matrix_layer,
                matrix_position,
                is_active,
                placed_at
            ) VALUES (
                member_record.member_wallet,
                member_record.referrer_wallet,
                ancestor_record.ancestor_wallet,
                layer_in_matrix,
                position_in_layer,
                true,
                member_record.join_time
            )
            ON CONFLICT (member_wallet, matrix_root) 
            DO UPDATE SET
                matrix_layer = EXCLUDED.matrix_layer,
                matrix_position = EXCLUDED.matrix_position,
                placed_at = EXCLUDED.placed_at;
                
            RAISE NOTICE '  在%的matrix中添加%到Layer% 位置%', 
                (SELECT COALESCE(username, 'User_' || RIGHT(ancestor_record.ancestor_wallet, 4)) FROM users WHERE wallet_address = ancestor_record.ancestor_wallet),
                (SELECT COALESCE(username, 'User_' || RIGHT(member_record.member_wallet, 4)) FROM users WHERE wallet_address = member_record.member_wallet),
                layer_in_matrix,
                position_in_layer;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '完整递归matrix结构生成完成！';
END;
$$ LANGUAGE plpgsql;

-- 3. 执行递归matrix生成
SELECT '=== 执行完整递归matrix生成 ===' as step;
SELECT generate_complete_recursive_matrix();

-- 4. 验证结果
SELECT '=== 生成后的Matrix Position分布 ===' as step;
SELECT 
    matrix_position as "位置",
    COUNT(*) as "数量",
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as "百分比"
FROM referrals 
WHERE matrix_position IS NOT NULL
GROUP BY matrix_position
ORDER BY matrix_position;

SELECT '=== 生成后的Matrix层级分布 ===' as step;
SELECT 
    matrix_layer as "层级",
    COUNT(*) as "数量",
    COUNT(DISTINCT matrix_root) as "不同Root数"
FROM referrals 
WHERE matrix_layer IS NOT NULL
GROUP BY matrix_layer
ORDER BY matrix_layer;

SELECT '=== 完整的递归Matrix验证结果 ===' as step;
SELECT 
    r.matrix_root as "Matrix Root",
    COALESCE(u_root.username, 'User_' || RIGHT(r.matrix_root, 4)) as "Root用户名",
    r.matrix_layer as "层级",
    r.matrix_position as "位置",
    r.member_wallet as "成员钱包",
    COALESCE(u_member.username, 'User_' || RIGHT(r.member_wallet, 4)) as "成员名称",
    r.placed_at as "放置时间"
FROM referrals r
LEFT JOIN users u_root ON r.matrix_root = u_root.wallet_address
LEFT JOIN users u_member ON r.member_wallet = u_member.wallet_address
WHERE r.matrix_root IS NOT NULL
ORDER BY r.matrix_root, r.matrix_layer, r.matrix_position, r.placed_at;

-- 5. 验证递归逻辑是否正确
SELECT '=== 验证递归Matrix逻辑 ===' as step;

-- 检查每个会员应该在哪些Matrix中出现
WITH expected_matrix_memberships AS (
    SELECT 
        m.wallet_address as member_wallet,
        COALESCE(u1.username, 'User_' || RIGHT(m.wallet_address, 4)) as member_name,
        m.referrer_wallet as should_be_in_matrix_of,
        COALESCE(u2.username, 'User_' || RIGHT(m.referrer_wallet, 4)) as matrix_owner_name,
        1 as expected_layer
    FROM members m
    LEFT JOIN users u1 ON m.wallet_address = u1.wallet_address  
    LEFT JOIN users u2 ON m.referrer_wallet = u2.wallet_address
    WHERE m.referrer_wallet IS NOT NULL
),
actual_matrix_memberships AS (
    SELECT 
        r.member_wallet,
        r.matrix_root as is_in_matrix_of,
        r.matrix_layer as actual_layer,
        r.matrix_position
    FROM referrals r
    WHERE r.matrix_root IS NOT NULL
)
SELECT 
    COALESCE(exp.member_name, act.member_wallet) as "成员",
    COALESCE(exp.matrix_owner_name, act.is_in_matrix_of) as "Matrix所有者",
    exp.expected_layer as "期望层级",
    act.actual_layer as "实际层级",
    act.matrix_position as "实际位置",
    CASE 
        WHEN exp.member_wallet IS NULL THEN '意外记录'
        WHEN act.member_wallet IS NULL THEN '缺失记录'
        WHEN exp.expected_layer = act.actual_layer THEN '正确'
        ELSE '层级不匹配'
    END as "状态"
FROM expected_matrix_memberships exp
FULL OUTER JOIN actual_matrix_memberships act 
    ON exp.member_wallet = act.member_wallet 
    AND exp.should_be_in_matrix_of = act.is_in_matrix_of
ORDER BY "Matrix所有者", "期望层级", "成员";

COMMIT;