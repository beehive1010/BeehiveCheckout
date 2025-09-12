-- 修复matrix_parent逻辑 - 构建正确的矩阵树结构
-- ========================================

CREATE OR REPLACE FUNCTION fix_matrix_parent_structure()
RETURNS TEXT AS $$
DECLARE
    total_updated INTEGER := 0;
    layer_count INTEGER;
BEGIN
    -- 第1层：matrix_parent = matrix_root
    UPDATE referrals 
    SET matrix_parent = matrix_root
    WHERE matrix_layer = 1 
    AND matrix_parent IS NULL;
    
    GET DIAGNOSTICS layer_count = ROW_COUNT;
    total_updated := total_updated + layer_count;
    
    -- 第2层及以上：matrix_parent = 上一层对应位置的成员
    -- 第2层的parent是第1层的成员
    UPDATE referrals r2
    SET matrix_parent = (
        -- 找到第1层对应位置的成员作为parent
        SELECT r1.member_wallet
        FROM referrals r1
        WHERE r1.matrix_root = r2.matrix_root
        AND r1.matrix_layer = 1
        AND r1.matrix_position = (
            -- 根据第2层位置确定对应的第1层parent
            CASE 
                WHEN r2.matrix_position = 'L' THEN 
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM referrals WHERE matrix_root = r2.matrix_root AND matrix_layer = 1 AND matrix_position = 'L') 
                        THEN 'L'
                        ELSE 'M'  -- 如果L位置不存在，fallback到M
                    END
                WHEN r2.matrix_position = 'M' THEN 
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM referrals WHERE matrix_root = r2.matrix_root AND matrix_layer = 1 AND matrix_position = 'M') 
                        THEN 'M'
                        ELSE 'L'  -- 如果M位置不存在，fallback到L
                    END
                WHEN r2.matrix_position = 'R' THEN 
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM referrals WHERE matrix_root = r2.matrix_root AND matrix_layer = 1 AND matrix_position = 'R') 
                        THEN 'R'
                        ELSE 'M'  -- 如果R位置不存在，fallback到M
                    END
                ELSE 'L'
            END
        )
        LIMIT 1
    )
    WHERE r2.matrix_layer = 2 
    AND r2.matrix_parent IS NULL;
    
    GET DIAGNOSTICS layer_count = ROW_COUNT;
    total_updated := total_updated + layer_count;
    
    -- 第3层：matrix_parent = 第2层对应位置的成员
    UPDATE referrals r3
    SET matrix_parent = (
        SELECT r2.member_wallet
        FROM referrals r2
        WHERE r2.matrix_root = r3.matrix_root
        AND r2.matrix_layer = 2
        AND r2.matrix_position = r3.matrix_position
        LIMIT 1
    )
    WHERE r3.matrix_layer = 3 
    AND r3.matrix_parent IS NULL;
    
    GET DIAGNOSTICS layer_count = ROW_COUNT;
    total_updated := total_updated + layer_count;
    
    RETURN format('更新了%s个matrix_parent关系', total_updated);
END;
$$ LANGUAGE plpgsql;

-- 执行修复
SELECT fix_matrix_parent_structure() as "matrix_parent修复结果";

-- 验证结果
SELECT '=== matrix_parent修复后的结构 ===' as section;

SELECT 
    member_wallet,
    matrix_parent,
    matrix_layer,
    matrix_position,
    CASE 
        WHEN matrix_parent = matrix_root THEN 'ROOT'
        ELSE COALESCE(matrix_parent, 'NULL')
    END as parent_display
FROM referrals 
WHERE matrix_root LIKE '0x000%0001'
ORDER BY matrix_layer, 
         CASE matrix_position 
           WHEN 'L' THEN 1 
           WHEN 'M' THEN 2 
           WHEN 'R' THEN 3 
         END;

-- 验证父子关系的完整性
SELECT '=== 父子关系验证 ===' as section;

WITH matrix_tree AS (
    SELECT 
        member_wallet,
        matrix_parent,
        matrix_layer,
        matrix_position,
        matrix_root
    FROM referrals 
    WHERE matrix_root LIKE '0x000%0001'
)
SELECT 
    child.matrix_layer as child_layer,
    child.matrix_position as child_pos,
    child.member_wallet as child_wallet,
    parent.matrix_layer as parent_layer,
    parent.matrix_position as parent_pos,
    parent.member_wallet as parent_wallet
FROM matrix_tree child
LEFT JOIN matrix_tree parent ON child.matrix_parent = parent.member_wallet
ORDER BY child.matrix_layer, child.matrix_position;