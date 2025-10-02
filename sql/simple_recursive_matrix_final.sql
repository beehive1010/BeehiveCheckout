-- 简化版递归matrix重建 - 避免复杂的数组类型问题
-- 基于users表的推荐关系，正确实现递归matrix逻辑

BEGIN;

-- 1. 清理和重建基础推荐关系
DELETE FROM referrals;

-- 2. 创建简化的递归matrix生成函数
CREATE OR REPLACE FUNCTION generate_simple_recursive_matrix()
RETURNS void AS $$
DECLARE
    member_record RECORD;
    ancestor_wallet TEXT;
    layer_counter INTEGER;
    position_letter TEXT;
    existing_in_layer INTEGER;
BEGIN
    RAISE NOTICE '开始生成简化递归matrix...';
    
    -- 遍历每个会员
    FOR member_record IN 
        SELECT 
            u.wallet_address as member_wallet, 
            u.referrer_wallet,
            u.username,
            u.created_at
        FROM users u
        WHERE u.referrer_wallet IS NOT NULL
        AND u.wallet_address != u.referrer_wallet  -- 排除自我推荐
        ORDER BY u.created_at ASC
    LOOP
        RAISE NOTICE '处理会员: %', COALESCE(member_record.username, 'User_' || RIGHT(member_record.member_wallet, 4));
        
        -- 为该会员在其直接推荐人的matrix中创建Layer 1记录
        ancestor_wallet := member_record.referrer_wallet;
        layer_counter := 1;
        
        WHILE ancestor_wallet IS NOT NULL AND layer_counter <= 19 LOOP
            -- 计算该层现有成员数量
            SELECT COUNT(*) INTO existing_in_layer
            FROM referrals 
            WHERE matrix_root = ancestor_wallet 
            AND matrix_layer = layer_counter;
            
            -- L→M→R循环分配
            position_letter := CASE (existing_in_layer % 3)
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
                ancestor_wallet,
                layer_counter,
                position_letter,
                true,
                member_record.created_at
            );
            
            RAISE NOTICE '  在%的matrix中添加%到Layer% 位置%', 
                (SELECT COALESCE(username, 'User_' || RIGHT(ancestor_wallet, 4)) FROM users WHERE wallet_address = ancestor_wallet),
                COALESCE(member_record.username, 'User_' || RIGHT(member_record.member_wallet, 4)),
                layer_counter,
                position_letter;
            
            -- 找到下一个祖先（上级的推荐人）
            SELECT referrer_wallet INTO ancestor_wallet
            FROM users 
            WHERE wallet_address = ancestor_wallet
            AND referrer_wallet != wallet_address  -- 防止自我推荐循环
            AND referrer_wallet IS NOT NULL;
            
            layer_counter := layer_counter + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '简化递归matrix生成完成！';
END;
$$ LANGUAGE plpgsql;

-- 3. 执行生成
SELECT '=== 执行递归matrix生成 ===' as step;
SELECT generate_simple_recursive_matrix();

-- 4. 验证结果
SELECT '=== 验证Position分布 ===' as step;
SELECT 
    matrix_position,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM referrals 
GROUP BY matrix_position
ORDER BY matrix_position;

SELECT '=== 验证层级分布 ===' as step;
SELECT 
    matrix_layer,
    COUNT(*) as count,
    COUNT(DISTINCT matrix_root) as roots
FROM referrals 
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 5. 展示完整的递归matrix结构
SELECT '=== 完整Matrix结构 ===' as step;
SELECT 
    COALESCE(u_root.username, 'Root_' || RIGHT(r.matrix_root, 4)) as "Matrix Root",
    r.matrix_layer as "层级",
    r.matrix_position as "位置", 
    COALESCE(u_member.username, 'User_' || RIGHT(r.member_wallet, 4)) as "成员",
    r.placed_at as "时间"
FROM referrals r
LEFT JOIN users u_root ON r.matrix_root = u_root.wallet_address
LEFT JOIN users u_member ON r.member_wallet = u_member.wallet_address
ORDER BY r.matrix_root, r.matrix_layer, r.matrix_position;

-- 6. 验证具体推荐链的matrix
SELECT '=== TestUser001的Matrix ===' as step;
SELECT 
    r.matrix_layer as "层级",
    r.matrix_position as "位置",
    COALESCE(u.username, 'User_' || RIGHT(r.member_wallet, 4)) as "成员名称"
FROM referrals r
LEFT JOIN users u ON r.member_wallet = u.wallet_address
WHERE r.matrix_root = (SELECT wallet_address FROM users WHERE username = 'TestUser001')
ORDER BY r.matrix_layer, r.matrix_position;

SELECT '=== TestABC001的Matrix ===' as step;
SELECT 
    r.matrix_layer as "层级",
    r.matrix_position as "位置",
    COALESCE(u.username, 'User_' || RIGHT(r.member_wallet, 4)) as "成员名称"
FROM referrals r
LEFT JOIN users u ON r.member_wallet = u.wallet_address
WHERE r.matrix_root = (SELECT wallet_address FROM users WHERE username = 'TestABC001')
ORDER BY r.matrix_layer, r.matrix_position;

-- 7. 最终验证递归逻辑
SELECT '=== 递归逻辑验证 ===' as step;
WITH referral_chain AS (
    SELECT 
        u1.username as level1,
        u2.username as level2,
        u3.username as level3
    FROM users u1
    LEFT JOIN users u2 ON u2.referrer_wallet = u1.wallet_address AND u2.wallet_address != u2.referrer_wallet
    LEFT JOIN users u3 ON u3.referrer_wallet = u2.wallet_address AND u3.wallet_address != u3.referrer_wallet
    WHERE u1.username = 'TestUser001'
)
SELECT 
    level1 || ' 的matrix应包含: ' as description,
    COALESCE(level2, '无') as "Layer1成员",
    COALESCE(level3, '无') as "Layer2成员"
FROM referral_chain;

COMMIT;