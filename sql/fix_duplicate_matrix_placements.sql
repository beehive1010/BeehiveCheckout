-- 修复individual_matrix_placements表中的重复位置错误
-- 解决Root matrix Layer 1有多个L位置等问题

\echo '🔧 Fixing duplicate matrix placements and enforcing 3x3 matrix rules...'
\echo ''

BEGIN;

-- 先备份现有数据
CREATE TEMP TABLE matrix_placements_backup AS 
SELECT * FROM individual_matrix_placements WHERE is_active = true;

\echo '✅ Created backup of current matrix placements'

-- Step 1: 分析并标记需要保留的记录 (每个位置保留最早的placement_order)
\echo ''
\echo '🎯 Step 1: Identifying valid placements to keep...'

WITH ranked_placements AS (
    SELECT 
        imp.*,
        ROW_NUMBER() OVER (
            PARTITION BY imp.matrix_owner, imp.layer_in_owner_matrix, imp.position_in_layer 
            ORDER BY imp.placement_order ASC, imp.placed_at ASC, imp.id ASC
        ) as position_rank
    FROM individual_matrix_placements imp
    WHERE imp.is_active = true
),
valid_placements AS (
    SELECT * FROM ranked_placements WHERE position_rank = 1
),
invalid_placements AS (
    SELECT * FROM ranked_placements WHERE position_rank > 1
)
SELECT 
    'Placements to keep: ' || COUNT(*) as action
FROM valid_placements
UNION ALL
SELECT 
    'Placements to remove: ' || COUNT(*)
FROM invalid_placements;

-- Step 2: 禁用重复的placement记录
\echo ''
\echo '🚮 Step 2: Deactivating duplicate placements...'

WITH ranked_placements AS (
    SELECT 
        imp.id,
        ROW_NUMBER() OVER (
            PARTITION BY imp.matrix_owner, imp.layer_in_owner_matrix, imp.position_in_layer 
            ORDER BY imp.placement_order ASC, imp.placed_at ASC, imp.id ASC
        ) as position_rank
    FROM individual_matrix_placements imp
    WHERE imp.is_active = true
)
UPDATE individual_matrix_placements 
SET is_active = false, updated_at = NOW()
WHERE id IN (
    SELECT id FROM ranked_placements WHERE position_rank > 1
);

\echo '✅ Deactivated duplicate placements'

-- Step 3: 验证Root matrix Layer 1只有3个位置
\echo ''
\echo '🎯 Step 3: Validating Root matrix Layer 1 structure...'

WITH root_layer1_check AS (
    SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN position_in_layer = 'L' THEN 1 END) as l_count,
        COUNT(CASE WHEN position_in_layer = 'M' THEN 1 END) as m_count,
        COUNT(CASE WHEN position_in_layer = 'R' THEN 1 END) as r_count
    FROM individual_matrix_placements 
    WHERE matrix_owner = '0x0000000000000000000000000000000000000001'
    AND layer_in_owner_matrix = 1
    AND is_active = true
)
SELECT 
    'Root Layer 1: ' || total_members || ' total, L:' || l_count || ' M:' || m_count || ' R:' || r_count as validation,
    CASE 
        WHEN total_members = 3 AND l_count = 1 AND m_count = 1 AND r_count = 1 THEN '✅ CORRECT'
        WHEN total_members > 3 THEN '❌ TOO MANY MEMBERS'
        WHEN l_count > 1 OR m_count > 1 OR r_count > 1 THEN '❌ DUPLICATE POSITIONS'
        ELSE '⚠️ INCOMPLETE'
    END as status
FROM root_layer1_check;

-- Step 4: 重新排序placement_order以反映正确的激活顺序
\echo ''
\echo '🔄 Step 4: Reordering placement_order by activation sequence...'

-- 首先获取正确的激活顺序 (基于activation_rank)
WITH correct_order AS (
    SELECT 
        imp.id,
        m.activation_rank,
        ROW_NUMBER() OVER (
            PARTITION BY imp.matrix_owner 
            ORDER BY m.activation_rank ASC, imp.placed_at ASC
        ) as new_placement_order
    FROM individual_matrix_placements imp
    JOIN members m ON imp.member_wallet = m.wallet_address
    WHERE imp.is_active = true
)
UPDATE individual_matrix_placements 
SET placement_order = co.new_placement_order,
    updated_at = NOW()
FROM correct_order co
WHERE individual_matrix_placements.id = co.id;

\echo '✅ Reordered placement_order by activation sequence'

-- Step 5: 检查是否有成员需要spillover到正确位置
\echo ''
\echo '🌊 Step 5: Checking for members that need spillover placement...'

-- 查找可能需要重新placement的成员 (Layer 1超过3个的情况)
WITH layer1_violations AS (
    SELECT 
        imp.matrix_owner,
        u.username as matrix_owner_name,
        COUNT(*) as layer1_count,
        CASE WHEN COUNT(*) > 3 THEN COUNT(*) - 3 ELSE 0 END as excess_members
    FROM individual_matrix_placements imp
    LEFT JOIN users u ON imp.matrix_owner = u.wallet_address
    WHERE imp.layer_in_owner_matrix = 1 
    AND imp.is_active = true
    GROUP BY imp.matrix_owner, u.username
    HAVING COUNT(*) > 3
)
SELECT 
    matrix_owner_name,
    layer1_count,
    excess_members,
    '❌ NEEDS SPILLOVER CORRECTION' as action_needed
FROM layer1_violations;

-- Step 6: 显示修复后的matrix结构
\echo ''
\echo '📊 Step 6: Final matrix structure after fixes...'

\echo 'Root Matrix After Fix:'
SELECT 
    imp.layer_in_owner_matrix as layer,
    imp.position_in_layer as position,
    u.username as member_name,
    imp.placement_order,
    m.activation_rank,
    imp.placed_at
FROM individual_matrix_placements imp
LEFT JOIN users u ON imp.member_wallet = u.wallet_address
LEFT JOIN members m ON imp.member_wallet = m.wallet_address
WHERE imp.matrix_owner = '0x0000000000000000000000000000000000000001'
AND imp.is_active = true
ORDER BY imp.layer_in_owner_matrix, imp.position_in_layer;

\echo ''
\echo '📈 Matrix Statistics After Fix:'
SELECT 
    u.username as matrix_owner_name,
    imp.layer_in_owner_matrix as layer,
    COUNT(*) as members,
    STRING_AGG(
        u_member.username || '(' || imp.position_in_layer || ')', 
        ', ' ORDER BY imp.placement_order
    ) as members_detail,
    CASE 
        WHEN COUNT(*) > 3 THEN '❌ STILL INVALID'
        WHEN COUNT(*) = 3 THEN '✅ FULL'
        ELSE '⏳ PARTIAL'
    END as status
FROM individual_matrix_placements imp
LEFT JOIN users u ON imp.matrix_owner = u.wallet_address
LEFT JOIN users u_member ON imp.member_wallet = u_member.wallet_address
WHERE imp.is_active = true
GROUP BY u.username, imp.matrix_owner, imp.layer_in_owner_matrix
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix;

-- Step 7: 最终验证
\echo ''
\echo '✅ Final Validation:'

SELECT 
    'Total active placements: ' || COUNT(*) as summary
FROM individual_matrix_placements 
WHERE is_active = true
UNION ALL
SELECT 
    'Inactive (removed) placements: ' || COUNT(*)
FROM individual_matrix_placements 
WHERE is_active = false;

-- 检查是否还有重复位置
WITH duplicate_check AS (
    SELECT 
        matrix_owner,
        layer_in_owner_matrix,
        position_in_layer,
        COUNT(*) as count
    FROM individual_matrix_placements 
    WHERE is_active = true
    GROUP BY matrix_owner, layer_in_owner_matrix, position_in_layer
    HAVING COUNT(*) > 1
)
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO DUPLICATE POSITIONS FOUND'
        ELSE '❌ ' || COUNT(*) || ' DUPLICATE POSITIONS STILL EXIST'
    END as duplicate_status
FROM duplicate_check;

COMMIT;

\echo ''
\echo '🎉 Matrix placement fix completed!'
\echo 'Actions performed:'
\echo '  - Removed duplicate position entries'
\echo '  - Reordered placement_order by activation sequence'  
\echo '  - Validated 3x3 matrix structure compliance'
\echo '  - Preserved earliest valid placements'
\echo ''
\echo '🔍 If Layer 1 violations still exist, run spillover correction next'