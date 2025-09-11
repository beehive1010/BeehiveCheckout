-- 检查当前matrix position分布情况
-- 查看是否所有记录都是L位置，而不是L/M/R分布

BEGIN;

-- 1. 检查referrals表中的matrix_position分布
SELECT 
    matrix_position,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM referrals 
WHERE matrix_position IS NOT NULL
GROUP BY matrix_position
ORDER BY count DESC;

-- 2. 检查每个matrix_root下的position分布
SELECT 
    matrix_root,
    matrix_layer,
    matrix_position,
    COUNT(*) as member_count
FROM referrals 
WHERE matrix_root IS NOT NULL 
AND matrix_position IS NOT NULL
GROUP BY matrix_root, matrix_layer, matrix_position
ORDER BY matrix_root, matrix_layer, 
    CASE matrix_position 
        WHEN 'L' THEN 1 
        WHEN '1' THEN 1
        WHEN 'M' THEN 2 
        WHEN '2' THEN 2
        WHEN 'R' THEN 3 
        WHEN '3' THEN 3
        ELSE 4 
    END;

-- 3. 查看第1层的L-M-R分布（应该每个matrix_root最多3个成员: L, M, R）
SELECT 
    matrix_root,
    COALESCE(SUM(CASE WHEN matrix_position IN ('L', '1') THEN 1 ELSE 0 END), 0) as L_count,
    COALESCE(SUM(CASE WHEN matrix_position IN ('M', '2') THEN 1 ELSE 0 END), 0) as M_count,
    COALESCE(SUM(CASE WHEN matrix_position IN ('R', '3') THEN 1 ELSE 0 END), 0) as R_count,
    COUNT(*) as total_layer1_members
FROM referrals 
WHERE matrix_layer = 1 
AND matrix_root IS NOT NULL
GROUP BY matrix_root
HAVING COUNT(*) > 0
ORDER BY total_layer1_members DESC
LIMIT 10;

-- 4. 检查是否有超过3个成员在同一个layer 1的情况（错误情况）
SELECT 
    matrix_root,
    matrix_layer,
    COUNT(*) as member_count,
    array_agg(matrix_position ORDER BY matrix_position) as positions
FROM referrals 
WHERE matrix_layer = 1 
AND matrix_root IS NOT NULL
GROUP BY matrix_root, matrix_layer
HAVING COUNT(*) > 3
ORDER BY member_count DESC;

-- 5. 查看所有matrix_root及其总的下级数量
SELECT 
    matrix_root,
    COUNT(*) as total_downlines,
    MAX(matrix_layer) as deepest_layer,
    COUNT(DISTINCT matrix_layer) as active_layers
FROM referrals 
WHERE matrix_root IS NOT NULL
GROUP BY matrix_root
ORDER BY total_downlines DESC
LIMIT 10;

-- 6. 检查是否有position为NULL或空值的记录
SELECT 
    COUNT(*) as records_with_null_position,
    COUNT(CASE WHEN matrix_position = '' THEN 1 END) as records_with_empty_position,
    COUNT(CASE WHEN matrix_position IS NOT NULL AND matrix_position != '' THEN 1 END) as records_with_valid_position
FROM referrals 
WHERE matrix_root IS NOT NULL;

COMMIT;