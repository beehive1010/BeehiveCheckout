-- 修复matrix结构为正确的19层1x3 L-M-R递归推荐树
-- 每个成员都有自己的19层matrix，每层最多3^layer个位置

BEGIN;

-- 创建临时函数来正确分配L-M-R位置
CREATE OR REPLACE FUNCTION assign_correct_lmr_positions()
RETURNS void AS $$
DECLARE
    matrix_owner TEXT;
    ref_record RECORD;
    current_layer INTEGER;
    position_counter INTEGER;
    new_position TEXT;
BEGIN
    -- 遍历每个matrix_root
    FOR matrix_owner IN 
        SELECT DISTINCT matrix_root 
        FROM referrals 
        WHERE matrix_root IS NOT NULL
    LOOP
        RAISE NOTICE '处理matrix_root: %', matrix_owner;
        
        -- 遍历每一层 (1-19)
        FOR current_layer IN 1..19 LOOP
            position_counter := 0;
            
            -- 获取该matrix_root该层的所有成员，按加入时间排序
            FOR ref_record IN 
                SELECT member_wallet, created_at
                FROM referrals 
                WHERE matrix_root = matrix_owner 
                AND matrix_layer = current_layer
                ORDER BY created_at ASC
            LOOP
                position_counter := position_counter + 1;
                
                -- 按照L-M-R循环分配位置
                CASE (position_counter - 1) % 3
                    WHEN 0 THEN new_position := 'L';
                    WHEN 1 THEN new_position := 'M';
                    WHEN 2 THEN new_position := 'R';
                END CASE;
                
                -- 更新matrix_position
                UPDATE referrals 
                SET matrix_position = new_position,
                    updated_at = NOW()
                WHERE matrix_root = matrix_owner 
                AND matrix_layer = current_layer
                AND member_wallet = ref_record.member_wallet;
                
                RAISE NOTICE '  Layer % - Position %: % -> %', 
                    current_layer, position_counter, ref_record.member_wallet, new_position;
            END LOOP;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 执行位置修复
SELECT assign_correct_lmr_positions();

-- 清理临时函数
DROP FUNCTION assign_correct_lmr_positions();

-- 验证修复结果
-- 1. 检查每层的L-M-R分布
SELECT 
    matrix_root,
    matrix_layer,
    COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) as L_count,
    COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) as M_count,
    COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) as R_count,
    COUNT(*) as total_count
FROM referrals 
WHERE matrix_root IS NOT NULL
GROUP BY matrix_root, matrix_layer
HAVING COUNT(*) > 0
ORDER BY matrix_root, matrix_layer
LIMIT 20;

-- 2. 确认每个matrix_root第1层最多3个成员
SELECT 
    matrix_root,
    COUNT(*) as layer1_count,
    array_agg(matrix_position ORDER BY matrix_position) as positions
FROM referrals 
WHERE matrix_layer = 1 
AND matrix_root IS NOT NULL
GROUP BY matrix_root
ORDER BY layer1_count DESC
LIMIT 10;

-- 3. 检查position分布情况
SELECT 
    matrix_position,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM referrals 
WHERE matrix_position IS NOT NULL
GROUP BY matrix_position
ORDER BY count DESC;

COMMIT;