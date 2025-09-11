-- 根据被安置的root生成正确的递归记录
-- 每个会员被滑落安置后，应该在其安置位置的所有上级矩阵中都出现

CREATE OR REPLACE FUNCTION fix_spillover_recursive_by_placement()
RETURNS TABLE(
    summary text,
    total_recursive_records integer,
    max_layer_depth integer
) AS $$
DECLARE
    placement_rec RECORD;
    ancestor_rec RECORD;
    total_records INTEGER := 0;
    max_depth INTEGER := 0;
BEGIN
    RAISE NOTICE '根据滑落安置位置生成递归记录...';
    
    -- 删除现有的递归记录（保留第1层滑落安置记录）
    DELETE FROM referrals WHERE matrix_layer > 1;
    
    -- 对每个第1层的滑落安置记录，生成其在上级矩阵中的递归记录
    FOR placement_rec IN
        SELECT DISTINCT 
            matrix_root,
            member_wallet,
            matrix_position
        FROM referrals 
        WHERE matrix_layer = 1
        ORDER BY matrix_root, member_wallet
    LOOP
        RAISE NOTICE '为会员 % 在矩阵 % 生成递归记录', 
            placement_rec.member_wallet, placement_rec.matrix_root;
        
        -- 找到该矩阵根的所有上级矩阵，并在每个上级矩阵中为该会员创建记录
        FOR ancestor_rec IN
            WITH RECURSIVE matrix_ancestors AS (
                -- 起点：当前安置的矩阵根作为第1层
                SELECT 
                    placement_rec.matrix_root as current_matrix,
                    placement_rec.member_wallet as member_addr,
                    1 as layer_level
                
                UNION ALL
                
                -- 递归：找到矩阵根的上级矩阵
                SELECT 
                    r.matrix_root as current_matrix,
                    ma.member_addr,
                    ma.layer_level + 1 as layer_level
                FROM matrix_ancestors ma
                JOIN referrals r ON r.member_wallet = ma.current_matrix
                WHERE r.matrix_layer = 1  -- 只考虑第1层安置
                AND ma.layer_level < 19   -- 最多19层
                AND r.matrix_root != ma.member_addr  -- 避免循环
            )
            SELECT DISTINCT
                current_matrix,
                member_addr,
                layer_level
            FROM matrix_ancestors
            WHERE layer_level > 1  -- 跳过第1层，因为已经存在
            AND current_matrix != member_addr  -- 确保不是自己
        LOOP
            -- 计算在该上级矩阵中的位置
            DECLARE
                position_count INTEGER;
                assigned_position CHAR(1);
            BEGIN
                -- 获取该层级的现有成员数
                SELECT COUNT(*) INTO position_count
                FROM referrals 
                WHERE matrix_root = ancestor_rec.current_matrix
                AND matrix_layer = ancestor_rec.layer_level;
                
                -- 按L-M-R循环分配位置
                assigned_position := CASE 
                    WHEN position_count % 3 = 0 THEN 'L'
                    WHEN position_count % 3 = 1 THEN 'M'
                    ELSE 'R'
                END;
                
                -- 插入递归记录
                INSERT INTO referrals (
                    matrix_root,
                    member_wallet,
                    referrer_wallet,
                    matrix_layer,
                    matrix_position,
                    placed_at,
                    is_active
                ) VALUES (
                    ancestor_rec.current_matrix,
                    ancestor_rec.member_addr,
                    placement_rec.matrix_root,  -- 直接安置的矩阵根作为referrer
                    ancestor_rec.layer_level,
                    assigned_position,
                    NOW(),
                    true
                ) ON CONFLICT (member_wallet, matrix_root) DO NOTHING;
                
                -- 更新统计
                GET DIAGNOSTICS total_records = ROW_COUNT;
                IF total_records > 0 THEN
                    max_depth := GREATEST(max_depth, ancestor_rec.layer_level);
                    RAISE NOTICE '  -> 添加到矩阵 % 第%层 %位置', 
                        ancestor_rec.current_matrix, ancestor_rec.layer_level, assigned_position;
                END IF;
            END;
        END LOOP;
    END LOOP;
    
    -- 获取最终统计
    SELECT COUNT(*) INTO total_records FROM referrals;
    SELECT MAX(matrix_layer) INTO max_depth FROM referrals;
    
    RETURN QUERY SELECT 
        '基于安置位置的递归记录生成完成'::text as summary,
        total_records as total_recursive_records,
        max_depth as max_layer_depth;
END;
$$ LANGUAGE plpgsql;

-- 执行基于安置位置的递归记录生成
SELECT * FROM fix_spillover_recursive_by_placement();

-- 验证每个会员的递归情况
SELECT 
    '递归记录验证（按安置）' as 检查,
    m.wallet_address as 会员,
    COUNT(r.id) as 总记录数,
    COUNT(DISTINCT r.matrix_root) as 矩阵根数,
    MAX(r.matrix_layer) as 最深层级,
    -- 显示第1层安置位置
    (SELECT matrix_root FROM referrals r1 WHERE r1.member_wallet = m.wallet_address AND r1.matrix_layer = 1 LIMIT 1) as 主要安置矩阵,
    -- 显示所有矩阵根
    ARRAY_AGG(DISTINCT r.matrix_root ORDER BY r.matrix_root) as 所有矩阵根
FROM members m
LEFT JOIN referrals r ON r.member_wallet = m.wallet_address
WHERE m.current_level > 0
GROUP BY m.wallet_address
ORDER BY COUNT(r.id) DESC;
"