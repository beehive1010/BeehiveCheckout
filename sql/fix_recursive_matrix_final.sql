-- 最终修复递归Matrix - 解决自我推荐和错误层级问题
-- 正确实现递归推荐树逻辑

BEGIN;

-- 1. 清理和分析当前数据问题
SELECT '=== 分析members表中的推荐关系问题 ===' as step;

-- 找出自我推荐的问题数据
SELECT 
    'self_referral' as issue_type,
    wallet_address,
    COALESCE(username, 'User_' || RIGHT(wallet_address, 4)) as username,
    '自己推荐自己' as description
FROM members m
LEFT JOIN users u ON m.wallet_address = u.wallet_address
WHERE m.wallet_address = m.referrer_wallet;

-- 找出有效的推荐关系
SELECT 
    'valid_referral' as relationship_type,
    m.wallet_address as member,
    COALESCE(u1.username, 'User_' || RIGHT(m.wallet_address, 4)) as member_name,
    m.referrer_wallet as referrer,
    COALESCE(u2.username, 'User_' || RIGHT(m.referrer_wallet, 4)) as referrer_name,
    m.created_at
FROM members m
LEFT JOIN users u1 ON m.wallet_address = u1.wallet_address
LEFT JOIN users u2 ON m.referrer_wallet = u2.wallet_address
WHERE m.referrer_wallet IS NOT NULL 
AND m.wallet_address != m.referrer_wallet  -- 排除自我推荐
ORDER BY m.created_at;

-- 2. 创建正确的递归matrix生成函数
CREATE OR REPLACE FUNCTION generate_correct_recursive_matrix()
RETURNS void AS $$
DECLARE
    member_record RECORD;
    ancestor_record RECORD;
    layer_in_matrix INTEGER;
    position_in_layer TEXT;
    existing_count INTEGER;
BEGIN
    RAISE NOTICE '开始生成正确的递归matrix结构...';
    
    -- 删除所有现有的matrix记录
    DELETE FROM referrals WHERE matrix_root IS NOT NULL;
    
    RAISE NOTICE '已清空现有matrix记录，开始重建...';
    
    -- 只处理有效的推荐关系（排除自我推荐）
    FOR member_record IN 
        SELECT 
            m.wallet_address as member_wallet, 
            m.referrer_wallet,
            m.created_at as join_time
        FROM members m
        WHERE m.referrer_wallet IS NOT NULL
        AND m.wallet_address != m.referrer_wallet  -- 排除自我推荐
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
                    1 as distance_from_member,
                    ARRAY[m1.wallet_address] as path
                FROM members m1 
                WHERE m1.wallet_address = member_record.referrer_wallet
                AND m1.wallet_address != m1.referrer_wallet  -- 防止自我推荐循环
                
                UNION ALL
                
                -- 递归案例：推荐人的推荐人
                SELECT 
                    m2.wallet_address,
                    m2.referrer_wallet,
                    ac.distance_from_member + 1,
                    ac.path || m2.wallet_address
                FROM members m2
                INNER JOIN ancestor_chain ac ON m2.wallet_address = ac.referrer_wallet
                WHERE ac.distance_from_member < 19  -- 限制最大层数
                AND m2.wallet_address != m2.referrer_wallet  -- 防止自我推荐
                AND NOT m2.wallet_address = ANY(ac.path)  -- 防止循环引用
            )
            SELECT * FROM ancestor_chain 
            ORDER BY distance_from_member
        LOOP
            layer_in_matrix := ancestor_record.distance_from_member;
            
            -- 计算在该ancestor的matrix中该层的现有成员数量
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
    
    RAISE NOTICE '正确的递归matrix结构生成完成！';
END;
$$ LANGUAGE plpgsql;

-- 3. 执行正确的递归matrix生成
SELECT '=== 执行正确的递归matrix生成 ===' as step;
SELECT generate_correct_recursive_matrix();

-- 4. 验证修复结果
SELECT '=== 修复后的Matrix Position分布 ===' as step;
SELECT 
    matrix_position as "位置",
    COUNT(*) as "数量",
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as "百分比"
FROM referrals 
WHERE matrix_position IS NOT NULL
GROUP BY matrix_position
ORDER BY matrix_position;

SELECT '=== 修复后的Matrix层级分布 ===' as step;
SELECT 
    matrix_layer as "层级",
    COUNT(*) as "数量",
    COUNT(DISTINCT matrix_root) as "不同Root数量"
FROM referrals 
WHERE matrix_layer IS NOT NULL
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 5. 最终验证：按用户期望的递归逻辑验证
SELECT '=== 最终递归Matrix验证结果 ===' as step;
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

-- 6. 验证是否符合用户描述的递归逻辑
SELECT '=== 验证是否符合用户描述的递归逻辑 ===' as step;

-- 基于有效推荐关系，验证matrix记录是否正确
WITH valid_referrals AS (
    SELECT 
        m.wallet_address as member_wallet,
        m.referrer_wallet,
        COALESCE(u1.username, 'User_' || RIGHT(m.wallet_address, 4)) as member_name,
        COALESCE(u2.username, 'User_' || RIGHT(m.referrer_wallet, 4)) as referrer_name
    FROM members m
    LEFT JOIN users u1 ON m.wallet_address = u1.wallet_address
    LEFT JOIN users u2 ON m.referrer_wallet = u2.wallet_address
    WHERE m.referrer_wallet IS NOT NULL 
    AND m.wallet_address != m.referrer_wallet
),
actual_matrix AS (
    SELECT 
        r.matrix_root,
        r.matrix_layer,
        r.member_wallet,
        r.matrix_position
    FROM referrals r
    WHERE r.matrix_root IS NOT NULL
)
SELECT 
    vr.referrer_wallet as "应该拥有Matrix的用户",
    vr.referrer_name as "Matrix所有者名称",
    vr.member_wallet as "应该在Matrix中的成员",
    vr.member_name as "成员名称",
    '1' as "应该在层级",
    am.matrix_layer as "实际层级",
    am.matrix_position as "实际位置",
    CASE 
        WHEN am.member_wallet IS NULL THEN '❌ 缺失'
        WHEN am.matrix_layer = 1 THEN '✅ 正确'
        ELSE '⚠️ 层级错误'
    END as "验证结果"
FROM valid_referrals vr
LEFT JOIN actual_matrix am 
    ON vr.referrer_wallet = am.matrix_root 
    AND vr.member_wallet = am.member_wallet
ORDER BY vr.referrer_wallet, vr.member_wallet;

SELECT '=== 递归Matrix修复完成总结 ===' as step;

SELECT 
    '✅ 已修复问题' as status,
    'Position分配' as item,
    '现在按L→M→R正确循环分配' as result
UNION ALL
SELECT 
    '✅ 已修复问题',
    '自我推荐',
    '已排除自己推荐自己的错误数据'
UNION ALL
SELECT 
    '✅ 已修复问题',
    '层级分配',
    '现在按正确的距离分配层级(1,2,3...)'
UNION ALL
SELECT 
    '✅ 已修复问题',
    '递归Matrix',
    '每个会员现在都在其上级链的Matrix中有正确记录';

COMMIT;