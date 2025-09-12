-- 创建Matrix组件专用视图 - 层级滑落占位呈现
-- ========================================
-- 为前端Matrix组件提供精确的层级、滑落、占位信息
-- ========================================

-- 第1步：分析Matrix组件的数据需求
-- ========================================

SELECT '=== Matrix组件数据需求分析 ===' as status;

-- Matrix组件需要的核心信息：
-- 1. 每个会员的完整矩阵树结构（多层级）
-- 2. 直推 vs 滑落(spillover)的明确区分
-- 3. 每个位置的占用状态和成员信息
-- 4. 空缺位置的标识
-- 5. 层级深度和扩展情况

-- 检查当前matrix_placements表的滑落数据质量
SELECT '=== 滑落占位数据质量检查 ===' as section;
SELECT 
    matrix_layer,
    is_direct_referral,
    is_spillover_placed,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM matrix_placements
GROUP BY matrix_layer, is_direct_referral, is_spillover_placed
ORDER BY matrix_layer, is_direct_referral DESC, is_spillover_placed DESC;

-- 第2步：创建Matrix树状结构视图
-- ========================================

-- 完整的Matrix树视图（支持多层级展示）
CREATE OR REPLACE VIEW matrix_tree_structure AS
WITH RECURSIVE matrix_tree AS (
    -- 根节点
    SELECT 
        m.wallet_address as root_wallet,
        m.activation_id as root_activation_id,
        m.username as root_username,
        m.wallet_address as current_wallet,
        m.activation_id as current_activation_id,
        m.username as current_username,
        0 as level,
        ''::VARCHAR as position_path,
        'ROOT'::VARCHAR as position,
        false as is_spillover,
        ARRAY[m.activation_id] as path_ids
    FROM membership m
    WHERE m.activation_id IS NOT NULL
    
    UNION ALL
    
    -- 递归获取子节点
    SELECT 
        mt.root_wallet,
        mt.root_activation_id,
        mt.root_username,
        child_m.wallet_address as current_wallet,
        child_m.activation_id as current_activation_id,
        child_m.username as current_username,
        mt.level + 1 as level,
        CASE WHEN mt.position_path = '' 
             THEN mp.matrix_position::VARCHAR
             ELSE mt.position_path || '-' || mp.matrix_position 
        END as position_path,
        mp.matrix_position as position,
        mp.is_spillover_placed as is_spillover,
        mt.path_ids || child_m.activation_id as path_ids
    FROM matrix_tree mt
    JOIN matrix_placements mp ON mt.current_wallet = mp.matrix_root
    JOIN membership child_m ON mp.member_wallet = child_m.wallet_address
    WHERE mt.level < 5 -- 限制递归深度，避免无限递归
    AND NOT (child_m.activation_id = ANY(mt.path_ids)) -- 避免循环引用
)
SELECT 
    root_activation_id,
    root_username,
    root_wallet,
    current_activation_id,
    current_username,
    current_wallet,
    level as matrix_level,
    position_path,
    position as matrix_position,
    is_spillover,
    path_ids,
    
    -- 节点类型分类
    CASE 
        WHEN level = 0 THEN 'ROOT'
        WHEN level = 1 AND NOT is_spillover THEN 'DIRECT_REFERRAL'
        WHEN level = 1 AND is_spillover THEN 'SPILLOVER_L1'
        WHEN level > 1 AND NOT is_spillover THEN 'MATRIX_DEEP'
        WHEN level > 1 AND is_spillover THEN 'SPILLOVER_DEEP'
        ELSE 'UNKNOWN'
    END as node_type,
    
    -- 位置描述
    CASE 
        WHEN level = 0 THEN 'Root Position'
        WHEN level = 1 THEN 'Layer 1 - Position ' || position
        ELSE 'Layer ' || level || ' - Path: ' || position_path
    END as position_description
    
FROM matrix_tree
ORDER BY root_activation_id, level, position_path;

-- 第3步：创建Matrix组件专用的层级视图
-- ========================================

-- Matrix层级详细信息视图
CREATE OR REPLACE VIEW matrix_layers_detailed AS
WITH layer_stats AS (
    SELECT 
        mp.matrix_root,
        mp.matrix_layer,
        mp.matrix_position,
        member_m.wallet_address as member_wallet,
        member_m.activation_id as member_activation_id,
        member_m.username as member_username,
        member_m.display_name as member_display_name,
        member_m.current_level as member_level,
        nml.level_name as member_level_name,
        mp.is_direct_referral,
        mp.is_spillover_placed,
        mp.placed_at,
        
        -- 计算位置索引（用于前端渲染）
        CASE mp.matrix_position 
            WHEN 'L' THEN 1
            WHEN 'M' THEN 2  
            WHEN 'R' THEN 3
            ELSE 0
        END as position_index
        
    FROM matrix_placements mp
    JOIN membership member_m ON mp.member_wallet = member_m.wallet_address
    LEFT JOIN nft_membership_levels nml ON member_m.current_level = nml.level
),
root_info AS (
    SELECT 
        m.wallet_address as root_wallet,
        m.activation_id as root_activation_id,
        m.username as root_username,
        m.display_name as root_display_name,
        m.current_level as root_level,
        nml.level_name as root_level_name
    FROM membership m
    LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
)
SELECT 
    ri.root_activation_id,
    ri.root_username,
    ri.root_display_name,
    ri.root_wallet,
    ri.root_level,
    ri.root_level_name,
    
    ls.matrix_layer,
    ls.matrix_position,
    ls.position_index,
    
    -- 成员信息
    ls.member_wallet,
    ls.member_activation_id,
    ls.member_username,
    ls.member_display_name,
    ls.member_level,
    ls.member_level_name,
    
    -- 关系类型
    ls.is_direct_referral,
    ls.is_spillover_placed,
    CASE 
        WHEN ls.is_direct_referral THEN 'direct'
        WHEN ls.is_spillover_placed THEN 'spillover'
        ELSE 'matrix'
    END as placement_type,
    
    ls.placed_at,
    
    -- 为前端提供的层级容量信息
    POWER(3, ls.matrix_layer) as layer_capacity,
    
    -- 层级描述
    'Layer ' || ls.matrix_layer || ' - Position ' || ls.matrix_position as position_label
    
FROM root_info ri
LEFT JOIN layer_stats ls ON ri.root_wallet = ls.matrix_root
ORDER BY ri.root_activation_id, ls.matrix_layer, ls.position_index;

-- 第4步：创建Matrix空位快速查询视图
-- ========================================

-- Matrix空位快速查询视图（专为前端优化）
CREATE OR REPLACE VIEW matrix_vacancy_quick AS
WITH position_grid AS (
    -- 生成所有可能的位置组合（前3层）
    SELECT 
        m.wallet_address as root_wallet,
        m.activation_id as root_activation_id,
        m.username as root_username,
        layer_num,
        position_char,
        position_char || layer_num as position_id,
        CASE position_char 
            WHEN 'L' THEN 1
            WHEN 'M' THEN 2  
            WHEN 'R' THEN 3
        END as position_index
    FROM membership m
    CROSS JOIN generate_series(1, 3) as layer_num
    CROSS JOIN unnest(ARRAY['L','M','R']) as position_char
),
occupied_positions AS (
    SELECT 
        mp.matrix_root,
        mp.matrix_layer,
        mp.matrix_position,
        mp.matrix_position || mp.matrix_layer as position_id,
        member_m.activation_id as occupant_activation_id,
        member_m.username as occupant_username,
        member_m.display_name as occupant_display_name,
        member_m.current_level as occupant_level,
        mp.is_direct_referral,
        mp.is_spillover_placed
    FROM matrix_placements mp
    JOIN membership member_m ON mp.member_wallet = member_m.wallet_address
    WHERE mp.matrix_layer <= 3 -- 只处理前3层
)
SELECT 
    pg.root_activation_id,
    pg.root_username,
    pg.root_wallet,
    pg.layer_num as matrix_layer,
    pg.position_char as matrix_position,
    pg.position_index,
    pg.position_id,
    
    -- 占用状态
    CASE WHEN op.occupant_activation_id IS NOT NULL THEN 'occupied' ELSE 'vacant' END as status,
    
    -- 占用者信息
    op.occupant_activation_id,
    op.occupant_username,
    op.occupant_display_name,
    op.occupant_level,
    
    -- 关系类型
    op.is_direct_referral,
    op.is_spillover_placed,
    CASE 
        WHEN op.is_direct_referral THEN 'direct'
        WHEN op.is_spillover_placed THEN 'spillover'
        WHEN op.occupant_activation_id IS NOT NULL THEN 'matrix'
        ELSE NULL
    END as placement_type,
    
    -- 前端渲染辅助信息
    'layer-' || pg.layer_num || '-' || LOWER(pg.position_char) as css_class,
    pg.layer_num * 10 + pg.position_index as sort_order
    
FROM position_grid pg
LEFT JOIN occupied_positions op ON pg.root_wallet = op.matrix_root 
                               AND pg.layer_num = op.matrix_layer 
                               AND pg.position_char = op.matrix_position
ORDER BY pg.root_activation_id, pg.layer_num, pg.position_index;

-- 第5步：创建Matrix组件API函数
-- ========================================

-- 获取单个会员的完整Matrix信息
CREATE OR REPLACE FUNCTION get_matrix_data(p_identifier VARCHAR(100))
RETURNS JSONB AS $$
DECLARE
    target_wallet VARCHAR(42);
    matrix_data JSONB;
BEGIN
    -- 解析标识符（username或wallet地址）
    IF p_identifier ~ '^0x[a-fA-F0-9]{40}$' THEN
        target_wallet := p_identifier;
    ELSE
        SELECT wallet_address INTO target_wallet 
        FROM membership 
        WHERE LOWER(username) = LOWER(p_identifier);
    END IF;
    
    IF target_wallet IS NULL THEN
        RETURN jsonb_build_object('error', 'Member not found');
    END IF;
    
    -- 构建Matrix数据
    SELECT jsonb_build_object(
        'root_info', jsonb_build_object(
            'wallet_address', root_wallet,
            'activation_id', root_activation_id,
            'username', root_username
        ),
        'layers', jsonb_object_agg(
            'layer_' || matrix_layer,
            jsonb_build_object(
                'layer_number', matrix_layer,
                'positions', positions_data,
                'capacity', POWER(3, matrix_layer),
                'occupied_count', jsonb_array_length(positions_data),
                'vacancy_count', POWER(3, matrix_layer) - jsonb_array_length(positions_data)
            )
        ),
        'summary', jsonb_build_object(
            'total_members', COUNT(*),
            'direct_referrals', COUNT(*) FILTER (WHERE placement_type = 'direct'),
            'spillover_members', COUNT(*) FILTER (WHERE placement_type = 'spillover'),
            'deepest_layer', MAX(matrix_layer)
        )
    ) INTO matrix_data
    FROM (
        SELECT 
            root_activation_id,
            root_username,
            root_wallet,
            matrix_layer,
            jsonb_agg(
                jsonb_build_object(
                    'position', matrix_position,
                    'position_index', position_index,
                    'member', CASE WHEN status = 'occupied' THEN
                        jsonb_build_object(
                            'activation_id', occupant_activation_id,
                            'username', occupant_username,
                            'display_name', occupant_display_name,
                            'level', occupant_level,
                            'placement_type', placement_type
                        )
                    ELSE null END
                ) ORDER BY position_index
            ) as positions_data,
            COUNT(*) FILTER (WHERE placement_type = 'direct') as direct_count,
            COUNT(*) FILTER (WHERE placement_type = 'spillover') as spillover_count,
            COUNT(*) FILTER (WHERE placement_type IS NOT NULL) as total_count,
            MAX(CASE WHEN placement_type IS NOT NULL THEN matrix_layer ELSE 0 END) as max_layer
        FROM matrix_vacancy_quick
        WHERE root_wallet = target_wallet
        GROUP BY root_activation_id, root_username, root_wallet, matrix_layer
    ) layer_data
    GROUP BY root_activation_id, root_username, root_wallet;
    
    RETURN COALESCE(matrix_data, jsonb_build_object('error', 'No matrix data found'));
END;
$$ LANGUAGE plpgsql;

-- 获取Matrix滑落候选位置
CREATE OR REPLACE FUNCTION get_spillover_candidates()
RETURNS JSONB AS $$
DECLARE
    candidates JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'root_activation_id', root_activation_id,
            'root_username', root_username,
            'available_positions', vacant_positions,
            'priority_score', priority_score
        ) ORDER BY priority_score DESC
    ) INTO candidates
    FROM (
        SELECT 
            mvq.root_activation_id,
            mvq.root_username,
            COUNT(*) FILTER (WHERE mvq.status = 'vacant') as vacant_positions,
            -- 优先级评分：激活序号越小，空位越多，优先级越高
            (10000 - mvq.root_activation_id) + COUNT(*) FILTER (WHERE mvq.status = 'vacant') * 100 as priority_score
        FROM matrix_vacancy_quick mvq
        WHERE mvq.matrix_layer = 1 -- 优先Layer 1滑落
        GROUP BY mvq.root_activation_id, mvq.root_username
        HAVING COUNT(*) FILTER (WHERE mvq.status = 'vacant') > 0
        ORDER BY priority_score DESC
        LIMIT 20 -- 返回前20个候选位置
    ) candidates_data;
    
    RETURN COALESCE(candidates, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 第6步：性能优化检查和索引
-- ========================================

-- 检查关键查询的索引需求
CREATE INDEX IF NOT EXISTS idx_matrix_placements_root_layer_pos 
ON matrix_placements(matrix_root, matrix_layer, matrix_position);

CREATE INDEX IF NOT EXISTS idx_matrix_placements_spillover 
ON matrix_placements(is_spillover_placed, matrix_layer) 
WHERE is_spillover_placed = true;

CREATE INDEX IF NOT EXISTS idx_matrix_placements_direct 
ON matrix_placements(is_direct_referral, matrix_root) 
WHERE is_direct_referral = true;

-- 第7步：验证Matrix组件视图功能
-- ========================================

SELECT '=== Matrix组件视图创建完成 ===' as status;

-- 测试Matrix空位快速查询
SELECT '=== Matrix空位快速查询测试 ===' as section;
SELECT 
    root_username, matrix_layer, matrix_position, status, 
    placement_type, occupant_username
FROM matrix_vacancy_quick 
WHERE root_activation_id <= 3
ORDER BY root_activation_id, matrix_layer, position_index
LIMIT 15;

-- 测试层级详细信息
SELECT '=== Matrix层级详细信息测试 ===' as section;
SELECT 
    root_username, matrix_layer, matrix_position, 
    member_username, placement_type, position_label
FROM matrix_layers_detailed 
WHERE root_activation_id <= 2
ORDER BY root_activation_id, matrix_layer, position_index
LIMIT 10;

-- 显示Matrix树结构示例
SELECT '=== Matrix树结构示例 ===' as section;
SELECT 
    root_username, current_username, matrix_level, 
    position_path, node_type, position_description
FROM matrix_tree_structure 
WHERE root_activation_id <= 2
ORDER BY root_activation_id, matrix_level, position_path
LIMIT 15;

-- API函数使用示例
SELECT '=== Matrix API函数使用示例 ===' as demo_section;
SELECT 'Matrix组件可以使用以下函数:' as usage,
       'get_matrix_data(''username'') - 获取完整Matrix数据' as function1,
       'get_spillover_candidates() - 获取滑落候选位置' as function2,
       '视图: matrix_vacancy_quick - 快速空位查询' as view1,
       '视图: matrix_layers_detailed - 层级详细信息' as view2;