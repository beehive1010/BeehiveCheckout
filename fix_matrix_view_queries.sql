-- 修复Matrix视图查询问题
-- 执行日期: 2025-09-29
-- 
-- 问题：matrix_referrals_tree_view返回重复数据，Layer 1有9个成员但positions重复
-- 原因：referrals表中同一个成员可能在多个matrix_root下有记录

-- 1. 分析当前的数据结构问题
SELECT 'Matrix Data Structure Analysis' as section;

-- 检查0xA657F135485D8D28e893fd40c638BeF0d636d98F作为matrix root的数据
SELECT 
    'As Matrix Root - Unique Members' as subsection,
    COUNT(DISTINCT member_wallet) as unique_members,
    COUNT(*) as total_records,
    STRING_AGG(DISTINCT CONCAT(matrix_layer, ':', matrix_position), ', ' ORDER BY matrix_layer, matrix_position) as layer_positions
FROM referrals 
WHERE matrix_root_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F';

-- 检查具体的重复情况
SELECT 
    'Duplicate Analysis' as subsection,
    member_wallet,
    COUNT(*) as record_count,
    STRING_AGG(CONCAT(matrix_layer, ':', matrix_position, ':', is_direct_referral), ' | ') as positions_info
FROM referrals 
WHERE matrix_root_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
GROUP BY member_wallet
HAVING COUNT(*) > 1;

-- 检查Layer 1的正确数据
SELECT 
    'Correct Layer 1 Data' as subsection,
    member_wallet,
    matrix_position,
    is_direct_referral,
    referrer_wallet,
    placed_at
FROM referrals 
WHERE matrix_root_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
    AND matrix_layer = 1
ORDER BY matrix_position, placed_at;

-- 2. 创建修正的matrix查询函数
CREATE OR REPLACE VIEW corrected_matrix_members_view AS
SELECT 
    r.member_wallet,
    r.matrix_root_wallet,
    r.matrix_layer,
    r.matrix_position,
    r.placed_at,
    r.referrer_wallet as parent_wallet,
    u.username,
    m.current_level,
    CASE WHEN m.current_level >= 1 THEN true ELSE false END as is_active,
    CASE WHEN r.is_direct_referral = false THEN true ELSE false END as is_spillover,
    1 as referral_depth  -- 简化的深度计算
FROM referrals r
LEFT JOIN users u ON r.member_wallet = u.wallet_address
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.matrix_layer >= 1  -- 只包含有效的矩阵层级
    AND r.matrix_position IS NOT NULL;

-- 3. 测试修正后的查询
SELECT 'Corrected Query Test' as section;

-- 测试Layer 1的唯一成员
SELECT 
    'Layer 1 Corrected Results' as subsection,
    matrix_position,
    member_wallet,
    username,
    is_direct_referral,
    placed_at
FROM referrals r
LEFT JOIN users u ON r.member_wallet = u.wallet_address
WHERE r.matrix_root_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
    AND r.matrix_layer = 1
    AND r.matrix_position IN ('L', 'M', 'R')
ORDER BY 
    CASE matrix_position 
        WHEN 'L' THEN 1 
        WHEN 'M' THEN 2 
        WHEN 'R' THEN 3 
    END;

-- 按层级统计正确的数据
SELECT 
    'Corrected Layer Statistics' as subsection,
    matrix_layer,
    COUNT(DISTINCT member_wallet) as unique_members,
    STRING_AGG(DISTINCT matrix_position, ', ' ORDER BY matrix_position) as positions
FROM referrals 
WHERE matrix_root_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
    AND matrix_position IS NOT NULL
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 4. 检查其他测试钱包的数据
SELECT 'Other Test Wallets Data Check' as section;

-- 检查系统根节点
SELECT 
    'System Root Node Data' as subsection,
    matrix_layer,
    COUNT(DISTINCT member_wallet) as unique_members,
    STRING_AGG(DISTINCT matrix_position, ', ' ORDER BY matrix_position) as positions
FROM referrals 
WHERE matrix_root_wallet = '0x0000000000000000000000000000000000000001'
    AND matrix_layer <= 3
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 检查另一个测试地址
SELECT 
    'Test Address 0x0F5adA73e94867a678347D6c2284dBa565489183' as subsection,
    matrix_layer,
    COUNT(DISTINCT member_wallet) as unique_members,
    STRING_AGG(DISTINCT matrix_position, ', ' ORDER BY matrix_position) as positions
FROM referrals 
WHERE matrix_root_wallet = '0x0F5adA73e94867a678347D6c2284dBa565489183'
    AND matrix_layer <= 3
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 5. 生成MatrixTestPage的正确查询建议
SELECT 'MatrixTestPage Fix Recommendations' as section;
SELECT 
    'Recommendation' as type,
    'MatrixTestPage应该使用referrals表直接查询，而不是依赖可能有问题的matrix_referrals_tree_view。' ||
    '对于Layer 1，应该查询matrix_layer=1且matrix_position IN (L,M,R)的记录。' ||
    '需要添加DISTINCT子句来避免重复记录。' as suggestion;

-- 6. 创建推荐的查询示例
SELECT 'Recommended Query for Layer 1' as section;
WITH layer1_members AS (
    SELECT DISTINCT
        r.member_wallet,
        r.matrix_position,
        r.is_direct_referral,
        r.placed_at,
        u.username,
        m.current_level,
        CASE WHEN r.is_direct_referral = false THEN 'is_spillover' ELSE 'is_direct' END as type
    FROM referrals r
    LEFT JOIN users u ON r.member_wallet = u.wallet_address
    LEFT JOIN members m ON r.member_wallet = m.wallet_address
    WHERE r.matrix_root_wallet = '0xA657F135485D8D28e893fd40c638BeF0d636d98F'
        AND r.matrix_layer = 1
        AND r.matrix_position IN ('L', 'M', 'R')
)
SELECT 
    matrix_position,
    member_wallet,
    username,
    type,
    current_level,
    placed_at
FROM layer1_members
ORDER BY 
    CASE matrix_position 
        WHEN 'L' THEN 1 
        WHEN 'M' THEN 2 
        WHEN 'R' THEN 3 
    END;

SELECT 'Matrix查询问题诊断完成！需要修改前端查询逻辑。' as final_status;