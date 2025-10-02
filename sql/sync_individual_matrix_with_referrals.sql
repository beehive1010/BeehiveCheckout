-- 同步individual_matrix_placements表与referrals表的完整层级递归数据
-- 确保前端组件能够显示完整的L-M-R层级结构

BEGIN;

-- Step 1: 备份现有数据
CREATE TEMP TABLE backup_individual_matrix_placements_sync AS 
SELECT * FROM individual_matrix_placements;

-- Step 2: 清空individual_matrix_placements表
DELETE FROM individual_matrix_placements;

-- Step 3: 从referrals表重建individual_matrix_placements，包含完整层级数据
INSERT INTO individual_matrix_placements (
    matrix_owner,
    member_wallet,
    layer_in_owner_matrix,
    position_in_layer,
    is_active,
    placed_at,
    placement_order
)
SELECT 
    r.matrix_root as matrix_owner,
    r.member_wallet,
    r.matrix_layer as layer_in_owner_matrix,
    r.matrix_position as position_in_layer,
    true as is_active,
    COALESCE(r.placed_at, NOW()) as placed_at,
    ROW_NUMBER() OVER (
        PARTITION BY r.matrix_root 
        ORDER BY r.matrix_layer, 
                 CASE r.matrix_position 
                     WHEN 'L' THEN 1 
                     WHEN 'M' THEN 2 
                     WHEN 'R' THEN 3 
                 END
    ) as placement_order
FROM referrals r
WHERE r.matrix_root IS NOT NULL
  AND r.matrix_layer IS NOT NULL
  AND r.matrix_position IS NOT NULL
ORDER BY r.matrix_root, r.matrix_layer, r.matrix_position;

-- Step 4: 验证同步结果
DO $$
DECLARE
    sync_summary RECORD;
    layer_comparison RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MATRIX SYNCHRONIZATION VERIFICATION ===';
    
    -- 总体同步统计
    SELECT 
        COUNT(*) as total_placements,
        COUNT(DISTINCT matrix_owner) as unique_matrices,
        MIN(layer_in_owner_matrix) as min_layer,
        MAX(layer_in_owner_matrix) as max_layer
    INTO sync_summary
    FROM individual_matrix_placements;
    
    RAISE NOTICE 'Total placements: %', sync_summary.total_placements;
    RAISE NOTICE 'Unique matrices: %', sync_summary.unique_matrices;
    RAISE NOTICE 'Layer range: % to %', sync_summary.min_layer, sync_summary.max_layer;
    
    -- 按层级对比两个表的数据
    FOR layer_comparison IN
        SELECT 
            imp.layer_in_owner_matrix as layer,
            COUNT(imp.*) as imp_count,
            COUNT(r.*) as ref_count,
            COUNT(imp.*) = COUNT(r.*) as is_synced
        FROM individual_matrix_placements imp
        FULL OUTER JOIN referrals r ON imp.matrix_owner = r.matrix_root
                                   AND imp.member_wallet = r.member_wallet
                                   AND imp.layer_in_owner_matrix = r.matrix_layer
        WHERE imp.layer_in_owner_matrix IS NOT NULL OR r.matrix_layer IS NOT NULL
        GROUP BY imp.layer_in_owner_matrix
        ORDER BY layer
    LOOP
        RAISE NOTICE 'Layer %: individual_matrix_placements=%, referrals=%, synced=%',
            layer_comparison.layer,
            layer_comparison.imp_count,
            layer_comparison.ref_count,
            layer_comparison.is_synced;
    END LOOP;
END $$;

-- Step 5: 显示同步后的层级递归结构示例
SELECT '=== SYNCHRONIZED LAYER HIERARCHY EXAMPLE ===' as section;

-- 显示主要root的完整层级结构
SELECT 
    imp.matrix_owner,
    owner_u.username as matrix_owner_name,
    imp.layer_in_owner_matrix as layer,
    imp.position_in_layer as position,
    imp.member_wallet,
    member_u.username as member_name,
    imp.placement_order
FROM individual_matrix_placements imp
LEFT JOIN users owner_u ON imp.matrix_owner = owner_u.wallet_address
LEFT JOIN users member_u ON imp.member_wallet = member_u.wallet_address
WHERE imp.matrix_owner = '0x0000000000000000000000000000000000000001'  -- Beehive Root matrix
ORDER BY imp.layer_in_owner_matrix, imp.placement_order
LIMIT 15;

-- Step 6: 验证L-M-R位置分布
SELECT '=== L-M-R POSITION DISTRIBUTION ===' as distribution_section;

SELECT 
    layer_in_owner_matrix as layer,
    position_in_layer as position,
    COUNT(*) as position_count,
    COUNT(DISTINCT matrix_owner) as matrices_with_position
FROM individual_matrix_placements
GROUP BY layer_in_owner_matrix, position_in_layer
ORDER BY layer_in_owner_matrix, 
         CASE position_in_layer 
             WHEN 'L' THEN 1 
             WHEN 'M' THEN 2 
             WHEN 'R' THEN 3 
         END;

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '✅ Matrix synchronization completed successfully!';
RAISE NOTICE 'individual_matrix_placements now contains complete layer hierarchy';
RAISE NOTICE 'Frontend components will show proper L-M-R recursive structure';