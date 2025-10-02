-- 生成滑落后的完整递归树记录
-- 确保每个会员都在所有可能的上级矩阵中出现（最多19层）

CREATE OR REPLACE FUNCTION generate_complete_spillover_recursive()
RETURNS TABLE(
    summary text,
    total_records_added integer,
    max_depth_achieved integer
) AS $$
DECLARE
    member_rec RECORD;
    ancestor_rec RECORD;
    total_added INTEGER := 0;
    max_depth INTEGER := 0;
    current_layer INTEGER;
    position_counter INTEGER;
BEGIN
    RAISE NOTICE '开始生成滑落后的完整递归树记录...';
    
    -- 对每个会员，生成他们在所有上级矩阵中的递归记录
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet 
        FROM members 
        WHERE current_level > 0
        ORDER BY wallet_address
    LOOP
        -- 找到该会员的所有祖先链，生成递归矩阵记录
        current_layer := 1;
        
        WHILE current_layer <= 19 LOOP
            -- 在当前层级找到所有可能的祖先
            FOR ancestor_rec IN
                WITH RECURSIVE ancestor_path AS (
                    -- 起点：会员的直接或间接祖先
                    SELECT DISTINCT
                        member_rec.wallet_address as descendant,
                        r.matrix_root as ancestor,
                        current_layer as depth,
                        r.matrix_position as base_position
                    FROM referrals r
                    WHERE r.member_wallet = member_rec.wallet_address
                    AND r.matrix_layer <= current_layer
                    AND r.matrix_root != member_rec.wallet_address
                    
                    UNION ALL
                    
                    -- 递归：找到祖先的祖先
                    SELECT 
                        ap.descendant,
                        r.matrix_root as ancestor,
                        ap.depth + 1 as depth,
                        ap.base_position
                    FROM ancestor_path ap
                    JOIN referrals r ON r.member_wallet = ap.ancestor
                    WHERE ap.depth < current_layer
                    AND r.matrix_root != ap.descendant  -- 避免循环
                    AND r.matrix_layer = 1  -- 只考虑直接关系
                ),
                -- 找到还没有记录的祖先关系
                missing_records AS (
                    SELECT DISTINCT
                        descendant,
                        ancestor,
                        depth
                    FROM ancestor_path
                    WHERE depth = current_layer
                    AND NOT EXISTS (
                        SELECT 1 FROM referrals existing
                        WHERE existing.member_wallet = descendant
                        AND existing.matrix_root = ancestor
                        AND existing.matrix_layer = current_layer
                    )
                )
                SELECT * FROM missing_records
                ORDER BY ancestor, descendant
            LOOP
                -- 计算位置分配
                SELECT COALESCE(COUNT(*), 0) + 1 INTO position_counter
                FROM referrals 
                WHERE matrix_root = ancestor_rec.ancestor
                AND matrix_layer = current_layer;
                
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
                    ancestor_rec.ancestor,
                    ancestor_rec.descendant,
                    member_rec.referrer_wallet,
                    current_layer,
                    CASE 
                        WHEN position_counter % 3 = 1 THEN 'L'
                        WHEN position_counter % 3 = 2 THEN 'M'
                        ELSE 'R'
                    END,
                    NOW(),
                    true
                ) ON CONFLICT (member_wallet, matrix_root) DO NOTHING;
                
                GET DIAGNOSTICS total_added = ROW_COUNT;
                
                IF total_added > 0 THEN
                    max_depth := GREATEST(max_depth, current_layer);
                    RAISE NOTICE '添加递归记录: % 在 % 的第%层', 
                        ancestor_rec.descendant, ancestor_rec.ancestor, current_layer;
                END IF;
            END LOOP;
            
            current_layer := current_layer + 1;
        END LOOP;
    END LOOP;
    
    -- 获取最终统计
    SELECT COUNT(*) INTO total_added FROM referrals;
    SELECT MAX(matrix_layer) INTO max_depth FROM referrals;
    
    RETURN QUERY SELECT 
        '完整递归树生成完成'::text as summary,
        total_added as total_records_added,
        max_depth as max_depth_achieved;
END;
$$ LANGUAGE plpgsql;

-- 执行完整递归生成
SELECT * FROM generate_complete_spillover_recursive();

-- 验证完整的递归记录
SELECT 
    '递归记录验证' as 验证类型,
    m.wallet_address as 会员地址,
    COUNT(r.id) as 总递归次数,
    COUNT(DISTINCT r.matrix_root) as 出现在几个矩阵中,
    MAX(r.matrix_layer) as 最深层级,
    ARRAY_AGG(DISTINCT r.matrix_root ORDER BY r.matrix_root) as 所在矩阵根
FROM members m
LEFT JOIN referrals r ON r.member_wallet = m.wallet_address
WHERE m.current_level > 0
GROUP BY m.wallet_address
ORDER BY COUNT(r.id) DESC, m.wallet_address;

-- 显示矩阵层级分布
SELECT 
    '层级分布' as 统计类型,
    matrix_layer as 层级,
    COUNT(*) as 记录数,
    COUNT(DISTINCT matrix_root) as 矩阵根数,
    COUNT(DISTINCT member_wallet) as 会员数
FROM referrals
GROUP BY matrix_layer
ORDER BY matrix_layer;