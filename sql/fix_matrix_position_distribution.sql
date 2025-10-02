-- 修复导致Matrix Position分配错误的函数
-- 问题：所有matrix_position都被记录为'L'，应该按L→M→R→L循环分配
-- 原因：find_matrix_placement函数总是优先选择'L'位置

BEGIN;

-- 1. 先修复现有的错误数据
SELECT '=== 开始修复现有Matrix Position分配错误 ===' as step;

-- 备份当前错误的数据（为了安全）
CREATE TABLE IF NOT EXISTS referrals_backup_before_fix AS
SELECT * FROM referrals WHERE matrix_position = 'L';

-- 重新分配所有的matrix_position为正确的L/M/R分布
WITH position_fix AS (
    SELECT 
        r.id,
        r.matrix_root,
        r.matrix_layer,
        r.member_wallet,
        r.placed_at,
        -- 按每个matrix_root和layer分组，按时间顺序重新分配L/M/R位置
        CASE ((ROW_NUMBER() OVER (
            PARTITION BY r.matrix_root, r.matrix_layer 
            ORDER BY r.placed_at ASC, r.member_wallet ASC
        ) - 1) % 3)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            WHEN 2 THEN 'R'
        END as new_position
    FROM referrals r
    WHERE r.matrix_root IS NOT NULL
)
UPDATE referrals 
SET matrix_position = position_fix.new_position,
    updated_at = NOW()
FROM position_fix
WHERE referrals.id = position_fix.id;

SELECT '=== Position分配修复完成 ===' as step;

-- 查看修复后的分布
SELECT 
    matrix_position,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM referrals 
WHERE matrix_position IS NOT NULL
GROUP BY matrix_position
ORDER BY matrix_position;

-- 2. 创建正确的递归matrix生成函数
CREATE OR REPLACE FUNCTION fix_recursive_matrix_structure()
RETURNS void AS $$
DECLARE
    member_record RECORD;
    ancestor_record RECORD;
    layer_in_matrix INTEGER;
    position_in_layer TEXT;
    existing_count INTEGER;
BEGIN
    RAISE NOTICE '开始修复递归matrix结构...';
    
    -- 删除所有当前的matrix记录，保留基础推荐关系
    DELETE FROM referrals WHERE matrix_root IS NOT NULL;
    
    RAISE NOTICE '已清空现有matrix记录，开始重建...';
    
    -- 按时间顺序处理每个会员的推荐关系
    FOR member_record IN 
        SELECT 
            r.member_wallet, 
            r.referrer_wallet,
            r.placed_at
        FROM (
            SELECT DISTINCT member_wallet, referrer_wallet, placed_at
            FROM referrals 
            WHERE referrer_wallet IS NOT NULL
        ) r
        ORDER BY r.placed_at ASC
    LOOP
        RAISE NOTICE '处理会员: %', member_record.member_wallet;
        
        -- 使用递归CTE找到该会员的所有祖先（上级链）
        FOR ancestor_record IN 
            WITH RECURSIVE ancestor_chain AS (
                -- 基础案例：直接推荐人
                SELECT 
                    r1.member_wallet as ancestor_wallet,
                    1 as distance_from_member
                FROM referrals r1 
                WHERE r1.member_wallet = member_record.referrer_wallet
                
                UNION ALL
                
                -- 递归案例：推荐人的推荐人
                SELECT 
                    r2.member_wallet,
                    ac.distance_from_member + 1
                FROM referrals r2
                INNER JOIN ancestor_chain ac ON r2.member_wallet = ac.ancestor_wallet
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
                member_record.placed_at
            )
            ON CONFLICT (member_wallet, matrix_root) 
            DO UPDATE SET
                matrix_layer = EXCLUDED.matrix_layer,
                matrix_position = EXCLUDED.matrix_position,
                placed_at = EXCLUDED.placed_at;
                
            RAISE NOTICE '  在%的matrix中添加%到Layer% 位置%', 
                ancestor_record.ancestor_wallet,
                member_record.member_wallet,
                layer_in_matrix,
                position_in_layer;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '递归matrix结构修复完成！';
END;
$$ LANGUAGE plpgsql;

-- 3. 修复现有的find_matrix_placement函数，使其正确分配L/M/R位置
CREATE OR REPLACE FUNCTION find_matrix_placement_fixed(p_referrer_wallet character varying, p_new_member_wallet character varying)
RETURNS TABLE(placement_parent character varying, placement_position character varying, placement_layer integer, matrix_root character varying)
LANGUAGE plpgsql
AS $$
DECLARE
    current_layer INTEGER := 1;
    root_wallet VARCHAR(42) := p_referrer_wallet;
    search_nodes VARCHAR(42)[];
    next_layer_nodes VARCHAR(42)[];
    node_wallet VARCHAR(42);
    available_position VARCHAR(1);
    position_count INTEGER;
BEGIN
    -- 初始化搜索：从推荐者开始
    search_nodes := ARRAY[p_referrer_wallet];
    
    -- 按层级搜索，最多19层
    WHILE current_layer <= 19 AND array_length(search_nodes, 1) > 0 LOOP
        next_layer_nodes := ARRAY[]::VARCHAR(42)[];
        
        -- 遍历当前层的所有节点
        FOREACH node_wallet IN ARRAY search_nodes LOOP
            -- 计算该节点下已有的子节点数量
            SELECT COUNT(*) INTO position_count
            FROM referrals 
            WHERE matrix_parent = node_wallet 
            AND matrix_root = root_wallet
            AND is_active = TRUE;
            
            -- 如果该节点下的子节点少于3个，则可以放置
            IF position_count < 3 THEN
                -- 按L→M→R顺序分配下一个可用位置
                available_position := CASE (position_count % 3)
                    WHEN 0 THEN 'L'
                    WHEN 1 THEN 'M'
                    WHEN 2 THEN 'R'
                END;
                
                -- 返回结果
                RETURN QUERY SELECT 
                    node_wallet,
                    available_position,
                    current_layer,
                    root_wallet;
                RETURN;
            END IF;
            
            -- 将该节点的子节点添加到下一层搜索
            next_layer_nodes := next_layer_nodes || ARRAY(
                SELECT r.member_wallet 
                FROM referrals r 
                WHERE r.matrix_parent = node_wallet 
                AND r.matrix_root = root_wallet
                AND r.is_active = TRUE
            );
        END LOOP;
        
        -- 移动到下一层
        search_nodes := next_layer_nodes;
        current_layer := current_layer + 1;
    END LOOP;
    
    -- 如果19层都满了，返回NULL
    RETURN;
END;
$$;

-- 4. 创建验证视图
CREATE OR REPLACE VIEW fixed_matrix_verification AS
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

-- 5. 执行修复
SELECT '=== 执行递归matrix结构修复 ===' as step;
SELECT fix_recursive_matrix_structure();

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
    COUNT(DISTINCT matrix_root) as "不同Root数"
FROM referrals 
WHERE matrix_layer IS NOT NULL
GROUP BY matrix_layer
ORDER BY matrix_layer;

SELECT '=== 修复后的递归Matrix验证 ===' as step;
SELECT * FROM fixed_matrix_verification ORDER BY "Matrix Root", "层级", "位置";

COMMIT;