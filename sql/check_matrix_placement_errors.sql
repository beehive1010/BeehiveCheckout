-- 检查individual_matrix_placements表中的数据错误
-- 特别是Root matrix中Layer 1的重复位置问题

\echo '🔍 Checking individual_matrix_placements for data errors...'
\echo ''

-- 1. 检查Root用户的matrix结构
\echo '📊 Root Matrix Structure Check:'
SELECT 
    'Root Matrix (0x0000000000000000000000000000000000000001)' as matrix_info;

SELECT 
    imp.layer_in_owner_matrix as layer,
    imp.position_in_layer as position,
    u.username as member_name,
    imp.member_wallet,
    imp.placement_order,
    imp.placed_at,
    imp.is_active
FROM individual_matrix_placements imp
LEFT JOIN users u ON imp.member_wallet = u.wallet_address
WHERE imp.matrix_owner = '0x0000000000000000000000000000000000000001'
AND imp.is_active = true
ORDER BY imp.layer_in_owner_matrix, imp.position_in_layer, imp.placement_order;

\echo ''
\echo '❌ Problem Analysis: Duplicate Position Detection'

-- 2. 检查重复位置 (同一matrix_owner, layer, position有多个member)
SELECT 
    'DUPLICATE POSITIONS FOUND:' as error_type;

SELECT 
    imp.matrix_owner,
    u_owner.username as matrix_owner_name,
    imp.layer_in_owner_matrix,
    imp.position_in_layer,
    COUNT(*) as members_in_same_position,
    STRING_AGG(u_member.username, ', ') as conflicting_members,
    STRING_AGG(imp.member_wallet, ', ') as conflicting_wallets
FROM individual_matrix_placements imp
LEFT JOIN users u_owner ON imp.matrix_owner = u_owner.wallet_address
LEFT JOIN users u_member ON imp.member_wallet = u_member.wallet_address
WHERE imp.is_active = true
GROUP BY imp.matrix_owner, u_owner.username, imp.layer_in_owner_matrix, imp.position_in_layer
HAVING COUNT(*) > 1
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix, imp.position_in_layer;

\echo ''
\echo '🔢 Position Count Analysis per Matrix:'

-- 3. 检查每个matrix每层的位置数量
SELECT 
    u.username as matrix_owner_name,
    imp.layer_in_owner_matrix as layer,
    COUNT(*) as total_positions,
    COUNT(CASE WHEN imp.position_in_layer = 'L' THEN 1 END) as l_positions,
    COUNT(CASE WHEN imp.position_in_layer = 'M' THEN 1 END) as m_positions,
    COUNT(CASE WHEN imp.position_in_layer = 'R' THEN 1 END) as r_positions,
    CASE 
        WHEN COUNT(*) > 3 THEN '❌ TOO MANY (' || COUNT(*) || '/3)'
        WHEN COUNT(*) = 3 THEN '✅ FULL (3/3)'
        ELSE '⏳ PARTIAL (' || COUNT(*) || '/3)'
    END as status
FROM individual_matrix_placements imp
LEFT JOIN users u ON imp.matrix_owner = u.wallet_address
WHERE imp.is_active = true
GROUP BY u.username, imp.matrix_owner, imp.layer_in_owner_matrix
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix;

\echo ''
\echo '📋 Layer 1 Detailed Analysis:'

-- 4. 专门检查Layer 1的错误 (Layer 1每个matrix最多3个位置: L, M, R)
SELECT 
    'LAYER 1 VIOLATIONS:' as check_type;

SELECT 
    u.username as matrix_owner_name,
    imp.matrix_owner,
    COUNT(*) as layer1_members,
    STRING_AGG(
        u_member.username || '(' || imp.position_in_layer || ')', 
        ', ' ORDER BY imp.placement_order
    ) as layer1_details,
    CASE 
        WHEN COUNT(*) > 3 THEN 'VIOLATION: ' || COUNT(*) || ' members in Layer 1 (max=3)'
        ELSE 'OK'
    END as violation_status
FROM individual_matrix_placements imp
LEFT JOIN users u ON imp.matrix_owner = u.wallet_address
LEFT JOIN users u_member ON imp.member_wallet = u_member.wallet_address
WHERE imp.layer_in_owner_matrix = 1 
AND imp.is_active = true
GROUP BY u.username, imp.matrix_owner
HAVING COUNT(*) > 3
ORDER BY COUNT(*) DESC;

\echo ''
\echo '🎯 Root Matrix Layer 1 Specific Check:'

-- 5. Root matrix Layer 1应该只有3个成员
SELECT 
    'Root Layer 1 should have exactly 3 members (L, M, R):' as rule;

WITH root_layer1 AS (
    SELECT 
        imp.position_in_layer,
        u.username as member_name,
        imp.member_wallet,
        imp.placement_order,
        imp.placed_at,
        ROW_NUMBER() OVER (PARTITION BY imp.position_in_layer ORDER BY imp.placement_order, imp.placed_at) as position_rank
    FROM individual_matrix_placements imp
    LEFT JOIN users u ON imp.member_wallet = u.wallet_address
    WHERE imp.matrix_owner = '0x0000000000000000000000000000000000000001'
    AND imp.layer_in_owner_matrix = 1
    AND imp.is_active = true
)
SELECT 
    position_in_layer,
    position_rank,
    member_name,
    member_wallet,
    placement_order,
    placed_at,
    CASE 
        WHEN position_rank = 1 THEN '✅ VALID (First in position)'
        ELSE '❌ DUPLICATE (Should not exist)'
    END as status
FROM root_layer1
ORDER BY position_in_layer, position_rank;

\echo ''
\echo '🧮 Total Matrix Statistics:'

-- 6. 整体统计
SELECT 'OVERALL MATRIX STATISTICS:' as summary;

SELECT 
    COUNT(DISTINCT imp.matrix_owner) as total_matrices,
    COUNT(*) as total_placements,
    COUNT(CASE WHEN imp.layer_in_owner_matrix = 1 THEN 1 END) as layer1_placements,
    COUNT(CASE WHEN imp.layer_in_owner_matrix = 2 THEN 1 END) as layer2_placements,
    COUNT(CASE WHEN imp.layer_in_owner_matrix > 2 THEN 1 END) as deeper_layer_placements
FROM individual_matrix_placements imp
WHERE imp.is_active = true;

\echo ''
\echo '📝 Recommended Fix Actions:'
\echo '1. Remove duplicate entries in same position (keep earliest by placement_order)'
\echo '2. Ensure Root Layer 1 has exactly 3 members (L, M, R)'
\echo '3. Validate that Layer 1 members spillover to their own matrices'
\echo '4. Verify placement_order follows activation sequence'
\echo ''
\echo '🔧 Next: Run fix_duplicate_matrix_placements.sql to correct these issues'