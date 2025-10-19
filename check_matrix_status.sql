-- ============================================================================
-- 矩阵排位状态检查脚本
-- 检查当前数据库中的矩阵排位情况
-- ============================================================================

-- 1. 总体统计
SELECT '=== 总体统计 ===' as section;

SELECT
    COUNT(DISTINCT wallet_address) as total_members,
    COUNT(DISTINCT CASE WHEN membership_status = 'active' THEN wallet_address END) as active_members,
    MIN(activation_sequence) as min_sequence,
    MAX(activation_sequence) as max_sequence
FROM members;

-- 2. 矩阵排位总数
SELECT '=== 矩阵排位总数 ===' as section;

SELECT
    COUNT(*) as total_matrix_placements,
    COUNT(DISTINCT member_wallet) as unique_members_placed,
    COUNT(DISTINCT matrix_root_wallet) as unique_matrix_roots,
    MIN(created_at) as earliest_placement,
    MAX(created_at) as latest_placement
FROM matrix_referrals;

-- 3. 按层级统计
SELECT '=== 按层级统计 ===' as section;

SELECT
    layer,
    COUNT(*) as placement_count,
    COUNT(DISTINCT member_wallet) as unique_members,
    COUNT(DISTINCT matrix_root_wallet) as unique_roots,
    ROUND(AVG(CASE WHEN position IS NOT NULL THEN 1.0 ELSE 0 END) * 100, 2) as slot_fill_rate
FROM matrix_referrals
GROUP BY layer
ORDER BY layer;

-- 4. 最深层级
SELECT '=== 最深层级 ===' as section;

SELECT
    matrix_root_wallet,
    MAX(layer) as max_layer,
    COUNT(*) as total_placements,
    COUNT(DISTINCT member_wallet) as unique_members
FROM matrix_referrals
GROUP BY matrix_root_wallet
ORDER BY max_layer DESC, total_placements DESC
LIMIT 10;

-- 5. 直推 vs 滑落比例
SELECT '=== 直推 vs 滑落比例 ===' as section;

SELECT
    referral_type,
    COUNT(*) as count,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM matrix_referrals) * 100, 2) as percentage
FROM matrix_referrals
GROUP BY referral_type;

-- 6. 检查列名（position vs slot）
SELECT '=== 检查列名 ===' as section;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'matrix_referrals'
AND column_name IN ('position', 'slot', 'layer', 'matrix_layer')
ORDER BY column_name;

-- 7. 检查是否有新列（Branch-First BFS）
SELECT '=== 检查新列 ===' as section;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'matrix_referrals'
AND column_name IN ('entry_anchor', 'bfs_order', 'activation_time', 'tx_hash', 'source')
ORDER BY column_name;

-- 8. 检查数据完整性
SELECT '=== 数据完整性 ===' as section;

SELECT
    'Members without matrix placement' as check_type,
    COUNT(*) as count
FROM members m
LEFT JOIN matrix_referrals mr ON mr.member_wallet = m.wallet_address
WHERE m.membership_status = 'active'
AND mr.member_wallet IS NULL

UNION ALL

SELECT
    'Matrix placements without members' as check_type,
    COUNT(*)
FROM matrix_referrals mr
LEFT JOIN members m ON m.wallet_address = mr.member_wallet
WHERE m.wallet_address IS NULL

UNION ALL

SELECT
    'Members without referrals' as check_type,
    COUNT(*)
FROM members m
LEFT JOIN referrals r ON r.referred_wallet = m.wallet_address
WHERE m.membership_status = 'active'
AND m.referrer_wallet IS NOT NULL
AND r.referred_wallet IS NULL;

-- 9. 样本数据查看
SELECT '=== 样本数据（前10条）===' as section;

SELECT
    member_wallet,
    matrix_root_wallet,
    parent_wallet,
    layer,
    COALESCE(slot, position) as slot_or_position,
    referral_type,
    source,
    entry_anchor,
    bfs_order,
    created_at
FROM matrix_referrals
ORDER BY created_at DESC
LIMIT 10;

-- 10. 检查19层矩阵是否存在
SELECT '=== 19层矩阵检查 ===' as section;

SELECT
    matrix_root_wallet,
    COUNT(DISTINCT layer) as layer_count,
    MAX(layer) as max_layer,
    COUNT(*) as total_placements,
    STRING_AGG(DISTINCT layer::TEXT, ',' ORDER BY layer::TEXT) as layers_present
FROM matrix_referrals
GROUP BY matrix_root_wallet
HAVING MAX(layer) >= 19
ORDER BY max_layer DESC, total_placements DESC;

-- 11. 检查视图是否存在
SELECT '=== 检查视图是否存在 ===' as section;

SELECT
    table_name as view_name,
    CASE WHEN table_type = 'VIEW' THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'v_matrix_layer_tree',
    'v_matrix_layer_summary',
    'v_direct_vs_layer_mismatch',
    'v_matrix_next_open_slots',
    'v_matrix_root_summary',
    'v_direct_referrals',
    'v_matrix_direct_children'
)
ORDER BY table_name;
