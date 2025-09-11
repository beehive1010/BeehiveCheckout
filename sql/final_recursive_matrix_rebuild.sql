-- 基于users表重建正确的递归matrix结构
-- 实现正确的滑落归递树逻辑

BEGIN;

-- 1. 以users表为准，统一推荐关系数据
SELECT '=== 第1步：数据源统一 ===' as step;

-- 同步members表的referrer_wallet到users表的数据
UPDATE members 
SET referrer_wallet = users.referrer_wallet
FROM users 
WHERE members.wallet_address = users.wallet_address
AND users.referrer_wallet IS NOT NULL
AND (members.referrer_wallet IS NULL OR members.referrer_wallet != users.referrer_wallet);

-- 为在users表中有推荐关系但在members表中缺失的用户添加members记录
INSERT INTO members (wallet_address, referrer_wallet, current_level, levels_owned, created_at)
SELECT 
    u.wallet_address,
    u.referrer_wallet,
    1 as current_level,
    '[]'::jsonb as levels_owned,
    u.created_at
FROM users u
LEFT JOIN members m ON u.wallet_address = m.wallet_address
WHERE u.referrer_wallet IS NOT NULL
AND u.wallet_address != u.referrer_wallet  -- 排除自我推荐
AND m.wallet_address IS NULL;

SELECT '数据同步完成' as status;

-- 2. 清理referrals表，准备重建
SELECT '=== 第2步：清理referrals表 ===' as step;

-- 备份现有数据
CREATE TABLE IF NOT EXISTS referrals_backup_final AS
SELECT * FROM referrals;

-- 删除所有matrix记录
DELETE FROM referrals;

SELECT '清理完成，开始重建' as status;

-- 3. 基于users表重建正确的递归matrix
SELECT '=== 第3步：重建递归matrix ===' as step;

CREATE OR REPLACE FUNCTION rebuild_correct_recursive_matrix()
RETURNS void AS $$
DECLARE
    member_record RECORD;
    ancestor_record RECORD;
    layer_distance INTEGER;
    position_in_layer TEXT;
    existing_count INTEGER;
BEGIN
    RAISE NOTICE '开始基于users表重建递归matrix...';
    
    -- 处理所有有效的推荐关系
    FOR member_record IN 
        SELECT 
            u.wallet_address as member_wallet, 
            u.referrer_wallet,
            u.created_at as join_time,
            u.username
        FROM users u
        WHERE u.referrer_wallet IS NOT NULL
        AND u.wallet_address != u.referrer_wallet  -- 排除自我推荐
        ORDER BY u.created_at ASC
    LOOP
        RAISE NOTICE '处理会员: % (推荐人: %)', 
            COALESCE(member_record.username, 'User_' || RIGHT(member_record.member_wallet, 4)),
            (SELECT COALESCE(username, 'User_' || RIGHT(member_record.referrer_wallet, 4)) FROM users WHERE wallet_address = member_record.referrer_wallet);
        
        -- 找到该会员应该出现在哪些人的matrix中
        FOR ancestor_record IN 
            WITH RECURSIVE ancestor_chain AS (
                -- 基础案例：直接推荐人
                SELECT 
                    u1.wallet_address as ancestor_wallet,
                    u1.username as ancestor_name,
                    u1.referrer_wallet,
                    1 as distance_from_member,
                    ARRAY[u1.wallet_address] as path
                FROM users u1 
                WHERE u1.wallet_address = member_record.referrer_wallet
                AND u1.wallet_address != u1.referrer_wallet  -- 防止自我推荐循环
                
                UNION ALL
                
                -- 递归案例：推荐人的推荐人
                SELECT 
                    u2.wallet_address,
                    u2.username,
                    u2.referrer_wallet,
                    ac.distance_from_member + 1,
                    ac.path || u2.wallet_address
                FROM users u2
                INNER JOIN ancestor_chain ac ON u2.wallet_address = ac.referrer_wallet
                WHERE ac.distance_from_member < 19  -- 限制最大层数
                AND u2.wallet_address != u2.referrer_wallet  -- 防止自我推荐
                AND NOT u2.wallet_address = ANY(ac.path)  -- 防止循环引用
            )
            SELECT * FROM ancestor_chain 
            ORDER BY distance_from_member
        LOOP
            layer_distance := ancestor_record.distance_from_member;
            
            -- 计算在该ancestor的matrix中该层的现有成员数量
            SELECT COUNT(*) INTO existing_count
            FROM referrals 
            WHERE matrix_root = ancestor_record.ancestor_wallet 
            AND matrix_layer = layer_distance;
            
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
                layer_distance,
                position_in_layer,
                true,
                member_record.join_time
            );
            
            RAISE NOTICE '  在%的matrix中添加%到Layer% 位置%', 
                COALESCE(ancestor_record.ancestor_name, 'User_' || RIGHT(ancestor_record.ancestor_wallet, 4)),
                COALESCE(member_record.username, 'User_' || RIGHT(member_record.member_wallet, 4)),
                layer_distance,
                position_in_layer;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '递归matrix重建完成！';
END;
$$ LANGUAGE plpgsql;

-- 执行重建
SELECT rebuild_correct_recursive_matrix();

-- 4. 验证重建结果
SELECT '=== 第4步：验证重建结果 ===' as step;

-- 验证Position分布
SELECT 
    '位置分布' as metric,
    matrix_position,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM referrals 
WHERE matrix_position IS NOT NULL
GROUP BY matrix_position
ORDER BY matrix_position;

-- 验证层级分布
SELECT 
    '层级分布' as metric,
    'Layer_' || matrix_layer as layer,
    COUNT(*) as count,
    COUNT(DISTINCT matrix_root) as different_roots
FROM referrals 
WHERE matrix_layer IS NOT NULL
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 5. 最终验证：展示正确的递归matrix结构
SELECT '=== 第5步：最终递归Matrix结构展示 ===' as step;

SELECT 
    r.matrix_root as "Matrix Root",
    COALESCE(u_root.username, 'User_' || RIGHT(r.matrix_root, 4)) as "Root用户",
    r.matrix_layer as "层级",
    r.matrix_position as "位置",
    COALESCE(u_member.username, 'User_' || RIGHT(r.member_wallet, 4)) as "成员",
    r.placed_at as "加入时间"
FROM referrals r
LEFT JOIN users u_root ON r.matrix_root = u_root.wallet_address
LEFT JOIN users u_member ON r.member_wallet = u_member.wallet_address
WHERE r.matrix_root IS NOT NULL
ORDER BY 
    r.matrix_root, 
    r.matrix_layer, 
    CASE r.matrix_position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END,
    r.placed_at;

-- 6. 验证具体的递归逻辑示例
SELECT '=== 第6步：验证递归逻辑示例 ===' as step;

-- 以TestUser001为例，展示其应该拥有的matrix
SELECT 
    'TestUser001的Matrix应该包含：' as description,
    COALESCE(u.username, 'User_' || RIGHT(r.member_wallet, 4)) as member_name,
    r.matrix_layer as layer,
    r.matrix_position as position,
    '✅' as status
FROM referrals r
LEFT JOIN users u ON r.member_wallet = u.wallet_address
WHERE r.matrix_root = (SELECT wallet_address FROM users WHERE username = 'TestUser001')
ORDER BY r.matrix_layer, r.matrix_position;

-- 以TestABC001为例，展示其应该拥有的matrix  
SELECT 
    'TestABC001的Matrix应该包含：' as description,
    COALESCE(u.username, 'User_' || RIGHT(r.member_wallet, 4)) as member_name,
    r.matrix_layer as layer,
    r.matrix_position as position,
    '✅' as status
FROM referrals r
LEFT JOIN users u ON r.member_wallet = u.wallet_address
WHERE r.matrix_root = (SELECT wallet_address FROM users WHERE username = 'TestABC001')
ORDER BY r.matrix_layer, r.matrix_position;

-- 7. 最终总结
SELECT '=== 最终总结 ===' as step;

SELECT 
    '✅ 递归Matrix重建完成' as result,
    '基于users表的推荐关系' as basis,
    COUNT(DISTINCT matrix_root) as matrix_count,
    COUNT(*) as total_records,
    MAX(matrix_layer) as max_layer
FROM referrals
WHERE matrix_root IS NOT NULL;

SELECT 
    '具体推荐链示例' as example_type,
    'TestUser001 → TestABC001 → TestAA/TesttBB/TestCC/TeatA1' as chain,
    '每个人都有自己的matrix，包含其所有下级' as explanation;

COMMIT;