-- Matrix Position Adjustment - 根据每个矩阵根的第一层L-M-R位置进行调整

-- 查看当前第一层的位置分布
CREATE OR REPLACE FUNCTION show_layer1_position_distribution()
RETURNS TABLE(
    matrix_root varchar,
    total_layer1 bigint,
    left_count bigint,
    middle_count bigint,
    right_count bigint,
    balance_status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.matrix_root::varchar,
        COUNT(*) as total_layer1,
        COUNT(CASE WHEN r.matrix_position = 'L' THEN 1 END) as left_count,
        COUNT(CASE WHEN r.matrix_position = 'M' THEN 1 END) as middle_count,
        COUNT(CASE WHEN r.matrix_position = 'R' THEN 1 END) as right_count,
        CASE 
            WHEN COUNT(CASE WHEN r.matrix_position = 'L' THEN 1 END) = 
                 COUNT(CASE WHEN r.matrix_position = 'M' THEN 1 END) AND
                 COUNT(CASE WHEN r.matrix_position = 'M' THEN 1 END) = 
                 COUNT(CASE WHEN r.matrix_position = 'R' THEN 1 END) 
            THEN '完全平衡'
            ELSE '需要调整'
        END as balance_status
    FROM referrals r
    WHERE r.matrix_layer = 1
    GROUP BY r.matrix_root
    ORDER BY total_layer1 DESC;
END;
$$ LANGUAGE plpgsql;

-- 执行位置调整的主函数
CREATE OR REPLACE FUNCTION adjust_matrix_positions()
RETURNS TABLE(
    summary text,
    adjustments_made integer,
    final_balance text
) AS $$
DECLARE
    root_rec RECORD;
    member_rec RECORD;
    position_assignments char(1)[] := ARRAY['L', 'M', 'R'];
    assignment_index integer := 1;
    total_adjustments integer := 0;
BEGIN
    RAISE NOTICE '开始调整矩阵位置分配...';
    
    -- 对每个矩阵根进行位置重新分配
    FOR root_rec IN 
        SELECT DISTINCT matrix_root 
        FROM referrals 
        WHERE matrix_layer = 1
        ORDER BY matrix_root
    LOOP
        assignment_index := 1;
        
        -- 为该矩阵根的第一层成员重新分配位置
        FOR member_rec IN
            SELECT id, member_wallet
            FROM referrals 
            WHERE matrix_root = root_rec.matrix_root 
            AND matrix_layer = 1
            ORDER BY member_wallet -- 确保分配的一致性
        LOOP
            -- 更新位置
            UPDATE referrals 
            SET matrix_position = position_assignments[assignment_index]
            WHERE id = member_rec.id;
            
            -- 循环分配位置 L->M->R->L->M->R...
            assignment_index := (assignment_index % 3) + 1;
            total_adjustments := total_adjustments + 1;
            
            RAISE NOTICE '调整 % 在矩阵 % 的位置为 %', 
                member_rec.member_wallet, root_rec.matrix_root, 
                position_assignments[((assignment_index - 2 + 3) % 3) + 1];
        END LOOP;
    END LOOP;
    
    RETURN QUERY
    SELECT 
        '矩阵位置调整完成'::text as summary,
        total_adjustments as adjustments_made,
        '位置已重新平衡分配'::text as final_balance;
END;
$$ LANGUAGE plpgsql;

-- 显示当前位置分布
SELECT '调整前的位置分布' as stage, * FROM show_layer1_position_distribution();

-- 执行位置调整
SELECT * FROM adjust_matrix_positions();

-- 显示调整后的位置分布
SELECT '调整后的位置分布' as stage, * FROM show_layer1_position_distribution();

-- 详细显示每个矩阵根的第一层成员及其位置
SELECT 
    '详细位置分配' as 详情,
    r.matrix_root as 矩阵根,
    r.member_wallet as 会员地址,
    r.matrix_position as 位置,
    ROW_NUMBER() OVER (PARTITION BY r.matrix_root ORDER BY r.member_wallet) as 序号
FROM referrals r
WHERE r.matrix_layer = 1
ORDER BY r.matrix_root, r.member_wallet;