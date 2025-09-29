-- 修复Layer 2位置分配错误
-- 问题：所有Layer 2成员都在L位置，需要正确分配到L/M/R

\echo '🔧 修复Layer 2位置分配错误...'

-- 首先，检查当前的Layer 2分布
\echo '📊 当前Layer 2分布:'
SELECT 
    matrix_root_wallet,
    matrix_layer,
    matrix_position,
    COUNT(*) as member_count
FROM referrals
WHERE matrix_layer = 2
GROUP BY matrix_root_wallet, matrix_layer, matrix_position
ORDER BY matrix_root_wallet, matrix_position;

\echo '🎯 开始修复0xC813218A28E130B46f8247F0a23F0BD841A8DB4E的Layer 2分配...'

-- 更新Layer 2的位置分配
-- 按照激活序列重新分配：L(9-11), M(12-14), R(15+)
UPDATE referrals 
SET matrix_position = CASE 
    WHEN member_activation_sequence BETWEEN 9 AND 11 THEN 'L'
    WHEN member_activation_sequence BETWEEN 12 AND 14 THEN 'M'
    WHEN member_activation_sequence >= 15 THEN 'R'
    ELSE matrix_position
END
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND matrix_layer = 2;

\echo '📊 修复后的Layer 2分布:'
SELECT 
    r.member_wallet,
    r.matrix_position,
    r.member_activation_sequence,
    CASE 
        WHEN r.member_activation_sequence BETWEEN 9 AND 11 THEN 'L (正确)'
        WHEN r.member_activation_sequence BETWEEN 12 AND 14 THEN 'M (正确)'  
        WHEN r.member_activation_sequence >= 15 THEN 'R (正确)'
        ELSE 'ERROR'
    END as validation
FROM referrals r  
WHERE r.matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E' 
AND r.matrix_layer = 2
ORDER BY r.member_activation_sequence;

\echo '📈 汇总统计:'
SELECT 
    matrix_position,
    COUNT(*) as member_count,
    CASE 
        WHEN matrix_position = 'L' AND COUNT(*) = 3 THEN '✅ 正确'
        WHEN matrix_position = 'M' AND COUNT(*) = 3 THEN '✅ 正确'
        WHEN matrix_position = 'R' AND COUNT(*) = 4 THEN '✅ 正确 (包含最后一个)'
        ELSE '❌ 需要检查'
    END as status
FROM referrals
WHERE matrix_root_wallet = '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E'
AND matrix_layer = 2
GROUP BY matrix_position
ORDER BY matrix_position;

\echo '✅ Layer 2位置分配修复完成!'