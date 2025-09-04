-- Data Correction Script for Matrix System
-- 修正现有推荐矩阵数据中的错误

-- 1. 修正referrals表中的层级关系和position逻辑
-- Fix layer relationships and position logic in referrals table

-- 首先备份原始数据
CREATE TABLE IF NOT EXISTS referrals_backup AS 
SELECT * FROM referrals;

-- 2. 修正Layer 1的parent_wallet应该指向root_wallet
UPDATE referrals 
SET parent_wallet = root_wallet 
WHERE layer = 1 AND parent_wallet != root_wallet;

-- 3. 修正所有层级的position分配 - 按照L→M→R的顺序重新分配
WITH layer_positions AS (
    SELECT 
        id,
        root_wallet,
        layer,
        ROW_NUMBER() OVER (
            PARTITION BY root_wallet, layer 
            ORDER BY placed_at, id
        ) as row_num
    FROM referrals 
    WHERE is_active = true
),
position_mapping AS (
    SELECT 
        id,
        CASE 
            WHEN (row_num - 1) % 3 = 0 THEN 'L'
            WHEN (row_num - 1) % 3 = 1 THEN 'M'
            WHEN (row_num - 1) % 3 = 2 THEN 'R'
        END as new_position
    FROM layer_positions
)
UPDATE referrals 
SET "position" = pm.new_position
FROM position_mapping pm
WHERE referrals.id = pm.id;

-- 4. 修正层级2及以上的parent_wallet关系
-- 根据正确的3x3矩阵逻辑重新分配parent

-- 为每一层重新计算正确的parent_wallet
DO $$
DECLARE
    current_layer INTEGER;
    max_layer INTEGER;
BEGIN
    -- 获取最大层级
    SELECT COALESCE(MAX(layer), 1) INTO max_layer FROM referrals WHERE is_active = true;
    
    -- 从第2层开始修正parent关系
    FOR current_layer IN 2..max_layer LOOP
        -- 更新当前层的parent_wallet
        UPDATE referrals current_ref
        SET parent_wallet = (
            SELECT parent_candidates.member_wallet
            FROM (
                SELECT 
                    member_wallet,
                    "position",
                    ROW_NUMBER() OVER (
                        ORDER BY 
                            CASE "position" WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END,
                            placed_at
                    ) as parent_order
                FROM referrals 
                WHERE root_wallet = current_ref.root_wallet 
                AND layer = current_layer - 1 
                AND is_active = true
            ) parent_candidates
            WHERE parent_candidates.parent_order = CEIL((
                SELECT COUNT(*) + 1
                FROM referrals 
                WHERE root_wallet = current_ref.root_wallet 
                AND layer = current_layer 
                AND placed_at < current_ref.placed_at
                AND is_active = true
            ) / 3.0)
            LIMIT 1
        )
        WHERE current_ref.layer = current_layer
        AND current_ref.is_active = true;
    END LOOP;
END $$;

-- 5. 清理孤立的推荐记录 (没有有效parent的记录)
-- Clean up orphaned referral records
UPDATE referrals 
SET is_active = false 
WHERE layer > 1 
AND parent_wallet NOT IN (
    SELECT DISTINCT member_wallet 
    FROM referrals parent_refs 
    WHERE parent_refs.root_wallet = referrals.root_wallet 
    AND parent_refs.is_active = true
);

-- 6. 修正placement_type逻辑
UPDATE referrals 
SET placement_type = CASE 
    WHEN layer = 1 THEN 'direct'
    ELSE 'spillover'
END;

-- 7. 修正placer_wallet逻辑
UPDATE referrals 
SET placer_wallet = CASE 
    WHEN layer = 1 THEN root_wallet
    ELSE parent_wallet
END;

-- 8. 重新计算和验证矩阵完整性
-- Recalculate and validate matrix integrity

-- 创建临时表来存储验证结果
CREATE TEMP TABLE matrix_validation AS
SELECT 
    root_wallet,
    layer,
    COUNT(*) as actual_count,
    CASE 
        WHEN layer = 1 THEN 3
        ELSE POWER(3, layer)::INTEGER
    END as expected_max,
    CASE 
        WHEN COUNT(*) > POWER(3, layer) THEN 'OVERCAPACITY'
        WHEN COUNT(*) = POWER(3, layer) THEN 'FULL'
        WHEN COUNT(*) = 0 THEN 'EMPTY'
        ELSE 'PARTIAL'
    END as layer_status
FROM referrals 
WHERE is_active = true
GROUP BY root_wallet, layer
ORDER BY root_wallet, layer;

-- 9. 修正超容量的层级 - 将多余的成员移动到下一层
DO $$
DECLARE
    validation_record RECORD;
    excess_count INTEGER;
    moved_count INTEGER := 0;
BEGIN
    FOR validation_record IN 
        SELECT * FROM matrix_validation WHERE layer_status = 'OVERCAPACITY'
    LOOP
        excess_count := validation_record.actual_count - validation_record.expected_max;
        
        -- 将多余的成员标记为需要重新放置
        UPDATE referrals 
        SET layer = layer + 1,
            placement_type = 'spillover_correction'
        WHERE id IN (
            SELECT id 
            FROM referrals 
            WHERE root_wallet = validation_record.root_wallet 
            AND layer = validation_record.layer
            AND is_active = true
            ORDER BY placed_at DESC
            LIMIT excess_count
        );
        
        moved_count := moved_count + excess_count;
    END LOOP;
    
    RAISE NOTICE 'Moved % members to correct layer overflow', moved_count;
END $$;

-- 10. 重新运行parent_wallet修正，以处理移动后的成员
DO $$
DECLARE
    current_layer INTEGER;
    max_layer INTEGER;
BEGIN
    SELECT COALESCE(MAX(layer), 1) INTO max_layer FROM referrals WHERE is_active = true;
    
    FOR current_layer IN 2..max_layer LOOP
        UPDATE referrals current_ref
        SET parent_wallet = (
            SELECT member_wallet
            FROM referrals parent_refs
            WHERE parent_refs.root_wallet = current_ref.root_wallet 
            AND parent_refs.layer = current_layer - 1 
            AND parent_refs.is_active = true
            ORDER BY 
                CASE parent_refs."position" WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END,
                parent_refs.placed_at
            LIMIT 1 OFFSET (
                SELECT COUNT(*)
                FROM referrals existing_children
                WHERE existing_children.root_wallet = current_ref.root_wallet
                AND existing_children.layer = current_layer
                AND existing_children.placed_at < current_ref.placed_at
                AND existing_children.is_active = true
            ) / 3
        )
        WHERE current_ref.layer = current_layer
        AND current_ref.is_active = true;
    END LOOP;
END $$;

-- 11. 更新统计信息和时间戳
UPDATE referrals 
SET updated_at = NOW() 
WHERE id IN (
    SELECT id FROM referrals_backup 
    WHERE referrals_backup.id = referrals.id
    AND (
        referrals_backup."position" != referrals."position" OR
        referrals_backup.parent_wallet != referrals.parent_wallet OR
        referrals_backup.layer != referrals.layer OR
        referrals_backup.placement_type != referrals.placement_type
    )
);

-- 12. 创建数据修正报告
CREATE TEMP TABLE correction_report AS
WITH before_after AS (
    SELECT 
        'BEFORE' as status,
        COUNT(*) as total_referrals,
        COUNT(DISTINCT root_wallet) as unique_roots,
        AVG(layer) as avg_layer,
        MAX(layer) as max_layer
    FROM referrals_backup
    WHERE is_active = true
    
    UNION ALL
    
    SELECT 
        'AFTER' as status,
        COUNT(*) as total_referrals,
        COUNT(DISTINCT root_wallet) as unique_roots,
        AVG(layer) as avg_layer,
        MAX(layer) as max_layer
    FROM referrals
    WHERE is_active = true
),
changes_summary AS (
    SELECT 
        'CHANGED_POSITIONS' as metric,
        COUNT(*) as value
    FROM referrals r
    JOIN referrals_backup rb ON r.id = rb.id
    WHERE r."position" != rb."position"
    
    UNION ALL
    
    SELECT 
        'CHANGED_PARENTS' as metric,
        COUNT(*) as value
    FROM referrals r
    JOIN referrals_backup rb ON r.id = rb.id
    WHERE r.parent_wallet != rb.parent_wallet
    
    UNION ALL
    
    SELECT 
        'CHANGED_LAYERS' as metric,
        COUNT(*) as value
    FROM referrals r
    JOIN referrals_backup rb ON r.id = rb.id
    WHERE r.layer != rb.layer
    
    UNION ALL
    
    SELECT 
        'DEACTIVATED_ORPHANS' as metric,
        COUNT(*) as value
    FROM referrals r
    JOIN referrals_backup rb ON r.id = rb.id
    WHERE rb.is_active = true AND r.is_active = false
)
SELECT * FROM before_after
UNION ALL
SELECT metric as status, value::BIGINT as total_referrals, NULL::BIGINT as unique_roots, 
       NULL::NUMERIC as avg_layer, NULL::INTEGER as max_layer
FROM changes_summary;

-- 显示修正报告
SELECT * FROM correction_report;

-- 13. 验证修正后的数据完整性
SELECT 
    'MATRIX_VALIDATION' as report_type,
    root_wallet,
    layer,
    COUNT(*) as member_count,
    POWER(3, layer) as max_capacity,
    CASE 
        WHEN COUNT(*) > POWER(3, layer) THEN 'ERROR: OVERCAPACITY'
        WHEN COUNT(*) = POWER(3, layer) THEN 'FULL'
        ELSE 'OK'
    END as status
FROM referrals
WHERE is_active = true
GROUP BY root_wallet, layer
HAVING COUNT(*) > POWER(3, layer)
ORDER BY root_wallet, layer;

-- 14. 最终清理
-- 删除超过19层的记录（如果有的话）
UPDATE referrals 
SET is_active = false 
WHERE layer > 19;

-- 记录修正完成
INSERT INTO matrix_activity_log (
    root_wallet,
    member_wallet, 
    action_type,
    details,
    created_at
)
SELECT 
    'SYSTEM' as root_wallet,
    'DATA_CORRECTION' as member_wallet,
    'MATRIX_DATA_CORRECTION' as action_type,
    jsonb_build_object(
        'correction_timestamp', NOW(),
        'total_records_processed', (SELECT COUNT(*) FROM referrals),
        'backup_table_created', 'referrals_backup'
    ) as details,
    NOW() as created_at;

-- 添加注释
COMMENT ON TABLE referrals_backup IS 'Backup of referrals table before data correction on ' || NOW()::DATE;

-- 提供验证查询建议
DO $$
BEGIN
    RAISE NOTICE '=== DATA CORRECTION COMPLETED ===';
    RAISE NOTICE 'Backup table created: referrals_backup';
    RAISE NOTICE 'Run the following queries to verify corrections:';
    RAISE NOTICE '1. SELECT * FROM correction_report;';
    RAISE NOTICE '2. SELECT * FROM matrix_validation;';
    RAISE NOTICE '3. SELECT * FROM user_matrix_summary ORDER BY total_team_members DESC LIMIT 10;';
END $$;