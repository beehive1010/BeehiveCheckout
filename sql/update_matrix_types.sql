-- =============================================
-- 为TypeScript类型生成提供正确的matrix_referrals表结构
-- 修复后的表结构应该包含layer字段
-- =============================================

-- 显示当前matrix_referrals表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'matrix_referrals'
ORDER BY ordinal_position;

-- 显示matrix_referrals_tree_view视图结构
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'matrix_referrals_tree_view'
ORDER BY ordinal_position;

-- 验证layer字段数据
SELECT
    'matrix_referrals' as table_name,
    MIN(layer) as min_layer,
    MAX(layer) as max_layer,
    COUNT(DISTINCT layer) as unique_layers,
    COUNT(*) as total_records
FROM matrix_referrals
WHERE layer IS NOT NULL;

-- 验证position与layer的对应关系
SELECT
    layer,
    position,
    COUNT(*) as count
FROM matrix_referrals
GROUP BY layer, position
ORDER BY layer, position
LIMIT 30;