-- 检查和修复矩阵位置冲突问题
-- 解决多个用户占用同一矩阵位置的严重问题

BEGIN;

-- 1. 检查 matrix_activity_log 中的位置冲突
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 矩阵位置冲突检查 ===';
    RAISE NOTICE '';
END $$;

-- 检查是否有多个用户在同一位置
SELECT 
    '=== MATRIX POSITION CONFLICTS ===' as check_type;

WITH position_conflicts AS (
    SELECT 
        matrix_owner,
        matrix_layer,
        matrix_position,
        COUNT(*) as user_count,
        STRING_AGG(member_wallet, ', ' ORDER BY placed_at) as conflicting_wallets,
        MIN(placed_at) as first_placement,
        MAX(placed_at) as last_placement
    FROM matrix_activity_log
    WHERE matrix_activity_log.id IS NOT NULL
    GROUP BY matrix_owner, matrix_layer, matrix_position
    HAVING COUNT(*) > 1
)
SELECT 
    matrix_owner,
    'Layer ' || matrix_layer || ' Position ' || matrix_position as position,
    user_count || ' users conflicting' as conflict_info,
    conflicting_wallets,
    first_placement,
    last_placement
FROM position_conflicts
ORDER BY matrix_owner, matrix_layer, matrix_position;

-- 2. 检查 referrals 表中的位置冲突
SELECT 
    '=== REFERRALS TABLE CONFLICTS ===' as check_type;

WITH referral_conflicts AS (
    SELECT 
        matrix_root,
        matrix_layer,
        matrix_position,
        COUNT(*) as user_count,
        STRING_AGG(member_wallet, ', ' ORDER BY placed_at) as conflicting_wallets
    FROM referrals
    GROUP BY matrix_root, matrix_layer, matrix_position
    HAVING COUNT(*) > 1
)
SELECT 
    matrix_root,
    'Layer ' || matrix_layer || ' Position ' || matrix_position as position,
    user_count || ' users conflicting' as conflict_info,
    conflicting_wallets
FROM referral_conflicts
ORDER BY matrix_root, matrix_layer, matrix_position;

-- 3. 检查 individual_matrix_placements 表中的冲突
SELECT 
    '=== INDIVIDUAL MATRIX PLACEMENTS CONFLICTS ===' as check_type;

WITH matrix_conflicts AS (
    SELECT 
        matrix_owner,
        layer,
        position,
        COUNT(*) as user_count,
        STRING_AGG(wallet_address, ', ' ORDER BY created_at) as conflicting_wallets
    FROM individual_matrix_placements
    GROUP BY matrix_owner, layer, position
    HAVING COUNT(*) > 1
)
SELECT 
    matrix_owner,
    'Layer ' || layer || ' Position ' || position as position,
    user_count || ' users conflicting' as conflict_info,
    conflicting_wallets
FROM matrix_conflicts
ORDER BY matrix_owner, layer, position;

-- 4. 分析冲突原因 - 检查重复激活
SELECT 
    '=== DUPLICATE ACTIVATION ANALYSIS ===' as check_type;

SELECT 
    member_wallet,
    COUNT(*) as activation_count,
    STRING_AGG(DISTINCT matrix_owner, ', ') as different_roots,
    STRING_AGG(DISTINCT (matrix_layer || '-' || matrix_position), ', ') as different_positions,
    MIN(placed_at) as first_activation,
    MAX(placed_at) as last_activation
FROM matrix_activity_log
GROUP BY member_wallet
HAVING COUNT(*) > 1
ORDER BY activation_count DESC;

-- 5. 检查数据完整性 - matrix_activity_log vs referrals
SELECT 
    '=== DATA CONSISTENCY CHECK ===' as check_type;

-- 在matrix_activity_log中但不在referrals中的记录
WITH missing_in_referrals AS (
    SELECT mal.member_wallet, mal.matrix_owner, mal.matrix_layer, mal.matrix_position
    FROM matrix_activity_log mal
    LEFT JOIN referrals r ON (
        mal.member_wallet = r.member_wallet 
        AND mal.matrix_owner = r.matrix_root
        AND mal.matrix_layer = r.matrix_layer
        AND mal.matrix_position = r.matrix_position
    )
    WHERE r.id IS NULL
),
-- 在referrals中但不在matrix_activity_log中的记录
missing_in_activity AS (
    SELECT r.member_wallet, r.matrix_root, r.matrix_layer, r.matrix_position
    FROM referrals r
    LEFT JOIN matrix_activity_log mal ON (
        r.member_wallet = mal.member_wallet 
        AND r.matrix_root = mal.matrix_owner
        AND r.matrix_layer = mal.matrix_layer
        AND r.matrix_position = mal.matrix_position
    )
    WHERE mal.id IS NULL
)
SELECT 
    'Missing in referrals' as inconsistency_type,
    COUNT(*) as count
FROM missing_in_referrals
UNION ALL
SELECT 
    'Missing in activity_log' as inconsistency_type,
    COUNT(*) as count
FROM missing_in_activity;

-- 6. 生成修复建议
DO $$
DECLARE
    conflict_count INTEGER;
    duplicate_activations INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 修复建议 ===';
    
    -- 统计冲突数量
    SELECT COUNT(*) INTO conflict_count
    FROM (
        SELECT matrix_owner, matrix_layer, matrix_position
        FROM matrix_activity_log
        GROUP BY matrix_owner, matrix_layer, matrix_position
        HAVING COUNT(*) > 1
    ) conflicts;
    
    -- 统计重复激活数量
    SELECT COUNT(*) INTO duplicate_activations
    FROM (
        SELECT member_wallet
        FROM matrix_activity_log
        GROUP BY member_wallet
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE '发现 % 个位置冲突', conflict_count;
    RAISE NOTICE '发现 % 个重复激活用户', duplicate_activations;
    RAISE NOTICE '';
    
    IF conflict_count > 0 THEN
        RAISE NOTICE '🚨 严重问题：多个用户占用同一矩阵位置';
        RAISE NOTICE '📋 修复步骤建议：';
        RAISE NOTICE '1. 保留最早的放置记录';
        RAISE NOTICE '2. 为后续用户重新分配正确位置';
        RAISE NOTICE '3. 更新相关的rewards记录';
        RAISE NOTICE '4. 修复placement算法防止未来冲突';
    END IF;
    
    IF duplicate_activations > 0 THEN
        RAISE NOTICE '⚠️ 用户重复激活问题';
        RAISE NOTICE '📋 建议清理重复的activation记录';
    END IF;
    
    RAISE NOTICE '';
END $$;

COMMIT;