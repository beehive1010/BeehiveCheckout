-- 快速修复Layer 2溢出问题
-- 将12个Layer 2成员正确分配到Layer 2 (9个) 和 Layer 3 (3个)

BEGIN;

-- 显示修复前状态
SELECT 
    '修复前 - Layer分布' as status,
    matrix_layer,
    COUNT(*) as count
FROM referrals 
WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 修复Layer 2的12个成员：
-- - 前9个保留在Layer 2，按L/M/R正确分配
-- - 后3个移到Layer 3，按L/M/R分配

WITH layer2_members AS (
    SELECT 
        id,
        member_wallet,
        placed_at,
        ROW_NUMBER() OVER (ORDER BY placed_at ASC, member_wallet ASC) as position_order
    FROM referrals 
    WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E' 
      AND matrix_layer = 2
),
corrected_assignments AS (
    SELECT 
        id,
        member_wallet,
        CASE 
            WHEN position_order <= 9 THEN 2  -- 前9个留在Layer 2
            ELSE 3                          -- 后3个移到Layer 3
        END as new_layer,
        CASE ((position_order - 1) % 3)
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M' 
            WHEN 2 THEN 'R'
        END as new_position
    FROM layer2_members
)
UPDATE referrals 
SET 
    matrix_layer = ca.new_layer,
    matrix_position = ca.new_position,
    updated_at = NOW()
FROM corrected_assignments ca
WHERE referrals.id = ca.id;

-- 显示修复后状态
SELECT 
    '修复后 - Layer分布' as status,
    matrix_layer,
    matrix_position,
    COUNT(*) as count
FROM referrals 
WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
GROUP BY matrix_layer, matrix_position
ORDER BY matrix_layer, matrix_position;

-- 验证容量
SELECT 
    '容量验证' as status,
    matrix_layer,
    COUNT(*) as actual_count,
    POWER(3, matrix_layer)::INTEGER as max_capacity,
    CASE 
        WHEN COUNT(*) <= POWER(3, matrix_layer)::INTEGER THEN '✅ 正常'
        ELSE '❌ 超出'
    END as status_check
FROM referrals 
WHERE matrix_root = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
GROUP BY matrix_layer
ORDER BY matrix_layer;

COMMIT;