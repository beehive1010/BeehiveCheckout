-- 完整的19层递归矩阵占位检查
-- 会员：0x623F77138f688933b5d03e39511F982b6B0FdF08

-- Part 1: 会员基本信息
\echo '========================================='
\echo '会员基本信息'
\echo '========================================='
SELECT 
    wallet_address as "钱包地址",
    referrer_wallet as "推荐人",
    activation_sequence as "激活序号",
    TO_CHAR(activation_time, 'YYYY-MM-DD HH24:MI:SS') as "激活时间",
    current_level as "当前等级",
    total_nft_claimed as "NFT数量"
FROM members
WHERE wallet_address = '0x623F77138f688933b5d03e39511F982b6B0FdF08';

-- Part 2: 在所有上线矩阵中的占位（递归19层）
\echo ''
\echo '========================================='
\echo '在上线矩阵中的占位情况 (递归19层)'
\echo '========================================='
SELECT 
    layer as "层级",
    LEFT(matrix_root_wallet, 12) || '...' as "矩阵根",
    LEFT(parent_wallet, 12) || '...' as "父节点",
    position as "位置",
    referral_type as "类型",
    source as "来源"
FROM matrix_referrals
WHERE member_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
ORDER BY layer;

-- Part 3: 统计分析
\echo ''
\echo '========================================='
\echo '占位统计分析'
\echo '========================================='
SELECT 
    COUNT(*) as "总占位数",
    MIN(layer) as "最小层级",
    MAX(layer) as "最大层级",
    COUNT(DISTINCT matrix_root_wallet) as "矩阵根数量",
    COUNT(CASE WHEN referral_type = 'direct' THEN 1 END) as "直推占位",
    COUNT(CASE WHEN referral_type = 'spillover' THEN 1 END) as "滑落占位",
    CASE 
        WHEN MAX(layer) = 19 THEN '✓ 已达到19层'
        ELSE '✗ 未达到19层 (当前' || MAX(layer) || '层)'
    END as "递归状态"
FROM matrix_referrals
WHERE member_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08';

-- Part 4: 自己的矩阵发展情况
\echo ''
\echo '========================================='
\echo '自己的矩阵发展情况'
\echo '========================================='
SELECT 
    layer as "层级",
    COUNT(*) as "成员数量",
    COUNT(CASE WHEN referral_type = 'direct' THEN 1 END) as "直推数",
    COUNT(CASE WHEN referral_type = 'spillover' THEN 1 END) as "滑落数",
    STRING_AGG(DISTINCT position, ', ' ORDER BY position) as "占据位置"
FROM matrix_referrals
WHERE matrix_root_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
GROUP BY layer
ORDER BY layer;

-- Part 5: 检查是否存在缺失的层级
\echo ''
\echo '========================================='
\echo '层级完整性检查'
\echo '========================================='
WITH expected_layers AS (
    SELECT generate_series(1, 19) as layer
),
actual_layers AS (
    SELECT DISTINCT layer
    FROM matrix_referrals
    WHERE member_wallet = '0x623F77138f688933b5d03e39511F982b6B0FdF08'
)
SELECT 
    el.layer as "层级",
    CASE 
        WHEN al.layer IS NOT NULL THEN '✓ 已占位'
        ELSE '✗ 缺失'
    END as "状态"
FROM expected_layers el
LEFT JOIN actual_layers al ON el.layer = al.layer
ORDER BY el.layer;
