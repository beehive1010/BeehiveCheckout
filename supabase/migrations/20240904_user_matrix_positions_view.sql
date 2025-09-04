-- 用户矩阵排位视图
-- 显示每个用户作为root时的完整矩阵排位情况

-- 1. 基础矩阵排位视图 - 显示每个root的完整矩阵结构
CREATE OR REPLACE VIEW user_matrix_positions AS
WITH matrix_stats AS (
    -- 计算每个root的基础统计信息
    SELECT 
        root_wallet,
        COUNT(*) as total_members,
        COUNT(CASE WHEN layer = 1 THEN 1 END) as direct_referrals,
        MAX(layer) as deepest_layer,
        COUNT(DISTINCT layer) as active_layers
    FROM referrals 
    WHERE is_active = true
    GROUP BY root_wallet
),
layer_details AS (
    -- 获取每层的详细信息
    SELECT 
        r.root_wallet,
        r.layer,
        COUNT(*) as layer_member_count,
        POWER(3, r.layer) as layer_capacity,
        ROUND((COUNT(*) * 100.0 / POWER(3, r.layer))::NUMERIC, 2) as fill_percentage,
        STRING_AGG(
            r.member_wallet || ':' || r."position", 
            ',' ORDER BY 
            CASE r."position" 
                WHEN 'L' THEN 1 
                WHEN 'M' THEN 2 
                WHEN 'R' THEN 3 
            END
        ) as members_positions
    FROM referrals r
    WHERE r.is_active = true
    GROUP BY r.root_wallet, r.layer
),
position_status AS (
    -- 分析每层的位置状态（L/M/R是否已填）
    SELECT 
        root_wallet,
        layer,
        BOOL_OR(CASE WHEN "position" = 'L' THEN true ELSE false END) as has_left,
        BOOL_OR(CASE WHEN "position" = 'M' THEN true ELSE false END) as has_middle, 
        BOOL_OR(CASE WHEN "position" = 'R' THEN true ELSE false END) as has_right,
        CASE 
            WHEN COUNT(*) = POWER(3, layer) THEN 'FULL'
            WHEN COUNT(*) = 0 THEN 'EMPTY'
            ELSE 'PARTIAL'
        END as layer_status
    FROM referrals 
    WHERE is_active = true
    GROUP BY root_wallet, layer
)
SELECT 
    ms.root_wallet,
    u.username as root_username,
    m.is_activated as root_is_activated,
    m.current_level as root_current_level,
    
    -- 基础统计
    ms.total_members,
    ms.direct_referrals,
    ms.deepest_layer,
    ms.active_layers,
    
    -- 每层详细信息（JSON格式）
    JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'layer', ld.layer,
            'member_count', ld.layer_member_count,
            'capacity', ld.layer_capacity,
            'fill_percentage', ld.fill_percentage,
            'status', ps.layer_status,
            'positions', JSONB_BUILD_OBJECT(
                'L', ps.has_left,
                'M', ps.has_middle,
                'R', ps.has_right
            ),
            'members', ld.members_positions
        ) ORDER BY ld.layer
    ) as layer_details,
    
    -- 下一个可用位置
    CASE 
        WHEN ms.total_members = 0 THEN 
            JSONB_BUILD_OBJECT('layer', 1, 'position', 'L', 'parent', ms.root_wallet)
        ELSE 
            (SELECT 
                JSONB_BUILD_OBJECT(
                    'layer', layer_num, 
                    'position', position_slot, 
                    'parent', parent_wallet_address
                )
             FROM find_next_matrix_position(ms.root_wallet, 1) 
             LIMIT 1)
    END as next_available_position,
    
    -- 矩阵健康状态
    CASE 
        WHEN ms.total_members = 0 THEN 'EMPTY'
        WHEN ms.deepest_layer <= 3 AND ms.total_members < 39 THEN 'GROWING'
        WHEN ms.deepest_layer > 10 THEN 'MATURE'
        ELSE 'DEVELOPING'
    END as matrix_status,
    
    NOW() as last_updated

FROM matrix_stats ms
LEFT JOIN users u ON ms.root_wallet = u.wallet_address
LEFT JOIN members m ON ms.root_wallet = m.wallet_address
LEFT JOIN layer_details ld ON ms.root_wallet = ld.root_wallet
LEFT JOIN position_status ps ON ld.root_wallet = ps.root_wallet AND ld.layer = ps.layer
GROUP BY ms.root_wallet, u.username, m.is_activated, m.current_level,
         ms.total_members, ms.direct_referrals, ms.deepest_layer, ms.active_layers
ORDER BY ms.total_members DESC, ms.deepest_layer DESC;

-- 2. 简化版本 - 用户矩阵概览
CREATE OR REPLACE VIEW user_matrix_summary AS
SELECT 
    r.root_wallet,
    u.username as root_username,
    COUNT(*) as total_team_members,
    COUNT(CASE WHEN r.layer = 1 THEN 1 END) as direct_referrals,
    COUNT(CASE WHEN r.layer <= 3 THEN 1 END) as first_three_layers,
    MAX(r.layer) as deepest_layer,
    
    -- 每层统计
    COUNT(CASE WHEN r.layer = 1 THEN 1 END) as layer_1_count,
    COUNT(CASE WHEN r.layer = 2 THEN 1 END) as layer_2_count,
    COUNT(CASE WHEN r.layer = 3 THEN 1 END) as layer_3_count,
    COUNT(CASE WHEN r.layer = 4 THEN 1 END) as layer_4_count,
    COUNT(CASE WHEN r.layer = 5 THEN 1 END) as layer_5_count,
    
    -- 激活统计
    COUNT(CASE WHEN m.is_activated = true THEN 1 END) as activated_members,
    ROUND(
        (COUNT(CASE WHEN m.is_activated = true THEN 1 END) * 100.0 / COUNT(*))::NUMERIC, 2
    ) as activation_rate,
    
    -- 最近活动
    MAX(r.placed_at) as latest_placement,
    MIN(r.placed_at) as first_placement,
    
    -- 矩阵效率分数 (0-100)
    LEAST(100, 
        ROUND(
            (COUNT(*) * 10.0 + 
             COUNT(CASE WHEN m.is_activated = true THEN 1 END) * 5.0 +
             MAX(r.layer) * 2.0)::NUMERIC, 0
        )
    ) as matrix_efficiency_score

FROM referrals r
LEFT JOIN users u ON r.root_wallet = u.wallet_address  
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.is_active = true
GROUP BY r.root_wallet, u.username
ORDER BY total_team_members DESC, matrix_efficiency_score DESC;

-- 3. 位置详细视图 - 显示具体的矩阵位置排列
CREATE OR REPLACE VIEW matrix_position_details AS
SELECT 
    r.root_wallet,
    u_root.username as root_username,
    r.layer,
    r."position",
    r.member_wallet,
    u_member.username as member_username,
    m.is_activated as member_is_activated,
    m.current_level as member_level,
    r.parent_wallet,
    r.placement_type,
    r.placed_at,
    
    -- 计算在该层的序号
    ROW_NUMBER() OVER (
        PARTITION BY r.root_wallet, r.layer 
        ORDER BY 
            CASE r."position" WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END,
            r.placed_at
    ) as position_order_in_layer,
    
    -- 该位置的下级数量
    (SELECT COUNT(*) FROM referrals r2 
     WHERE r2.root_wallet = r.root_wallet 
     AND r2.parent_wallet = r.member_wallet 
     AND r2.is_active = true) as downline_count,
     
    -- 该位置是否有下级
    EXISTS(
        SELECT 1 FROM referrals r3
        WHERE r3.root_wallet = r.root_wallet
        AND r3.parent_wallet = r.member_wallet
        AND r3.is_active = true
    ) as has_downline

FROM referrals r
LEFT JOIN users u_root ON r.root_wallet = u_root.wallet_address
LEFT JOIN users u_member ON r.member_wallet = u_member.wallet_address  
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.is_active = true
ORDER BY r.root_wallet, r.layer, 
         CASE r."position" WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END;

-- 4. 矩阵空位分析视图
CREATE OR REPLACE VIEW matrix_available_positions AS
WITH all_possible_positions AS (
    -- 生成所有可能的矩阵位置
    SELECT 
        r.root_wallet,
        generate_series(1, GREATEST(MAX(r.layer) + 1, 3)) as layer,
        unnest(ARRAY['L', 'M', 'R']) as position
    FROM referrals r
    WHERE r.is_active = true
    GROUP BY r.root_wallet
),
occupied_positions AS (
    -- 已占用的位置
    SELECT 
        root_wallet,
        layer,
        "position"
    FROM referrals
    WHERE is_active = true
),
layer_capacity_check AS (
    -- 检查每层是否超过容量
    SELECT 
        app.root_wallet,
        app.layer,
        app.position,
        CASE 
            WHEN app.layer > 1 AND NOT EXISTS (
                SELECT 1 FROM referrals parent
                WHERE parent.root_wallet = app.root_wallet
                AND parent.layer = app.layer - 1
                AND parent.is_active = true
            ) THEN false  -- 上层无人，此位置不可用
            WHEN op.root_wallet IS NOT NULL THEN false  -- 已被占用
            ELSE true  -- 可用位置
        END as is_available
    FROM all_possible_positions app
    LEFT JOIN occupied_positions op ON 
        app.root_wallet = op.root_wallet AND 
        app.layer = op.layer AND 
        app.position = op.position
    WHERE app.layer <= 10  -- 限制到10层避免无限生成
)
SELECT 
    lcc.root_wallet,
    u.username as root_username,
    lcc.layer,
    lcc.position,
    lcc.is_available,
    
    -- 如果可用，显示应该的父级
    CASE 
        WHEN lcc.is_available AND lcc.layer = 1 THEN lcc.root_wallet
        WHEN lcc.is_available AND lcc.layer > 1 THEN (
            SELECT r.member_wallet 
            FROM referrals r 
            WHERE r.root_wallet = lcc.root_wallet 
            AND r.layer = lcc.layer - 1 
            AND r.is_active = true
            ORDER BY 
                CASE r."position" WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END,
                r.placed_at
            LIMIT 1
        )
        ELSE NULL
    END as expected_parent,
    
    -- 该位置的优先级（越小越优先）
    (lcc.layer * 10 + 
     CASE lcc.position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END
    ) as placement_priority

FROM layer_capacity_check lcc
LEFT JOIN users u ON lcc.root_wallet = u.wallet_address
WHERE lcc.is_available = true
ORDER BY lcc.root_wallet, placement_priority;

-- 授予权限
GRANT SELECT ON user_matrix_positions TO authenticated;
GRANT SELECT ON user_matrix_summary TO authenticated;
GRANT SELECT ON matrix_position_details TO authenticated;  
GRANT SELECT ON matrix_available_positions TO authenticated;

-- 添加注释
COMMENT ON VIEW user_matrix_positions IS '完整的用户矩阵排位视图 - 显示每个root的详细矩阵结构';
COMMENT ON VIEW user_matrix_summary IS '用户矩阵概览 - 显示关键统计信息和效率分数';
COMMENT ON VIEW matrix_position_details IS '矩阵位置详细信息 - 显示每个位置的具体情况';
COMMENT ON VIEW matrix_available_positions IS '矩阵空位分析 - 显示可用的放置位置';

-- 创建便捷查询函数
CREATE OR REPLACE FUNCTION get_user_matrix_overview(user_wallet VARCHAR(42))
RETURNS TABLE(
    total_members BIGINT,
    direct_referrals BIGINT,
    deepest_layer INTEGER,
    matrix_status TEXT,
    efficiency_score NUMERIC,
    next_position JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ump.total_team_members::BIGINT,
        ump.direct_referrals::BIGINT,
        ump.deepest_layer,
        CASE 
            WHEN ump.total_team_members = 0 THEN 'EMPTY'::TEXT
            WHEN ump.deepest_layer <= 3 THEN 'GROWING'::TEXT
            WHEN ump.deepest_layer > 6 THEN 'MATURE'::TEXT
            ELSE 'DEVELOPING'::TEXT
        END,
        ump.matrix_efficiency_score,
        (SELECT 
            JSONB_BUILD_OBJECT(
                'layer', layer_num, 
                'position', position_slot
            )
         FROM find_next_matrix_position(user_wallet, 1) 
         LIMIT 1) as next_position
    FROM user_matrix_summary ump
    WHERE ump.root_wallet = user_wallet;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_user_matrix_overview TO authenticated;

-- 使用示例查询
/*
-- 查看特定用户的矩阵排位
SELECT * FROM user_matrix_positions WHERE root_wallet = '0x...';

-- 查看所有用户的矩阵概览
SELECT * FROM user_matrix_summary ORDER BY total_team_members DESC;

-- 查看特定矩阵的详细位置
SELECT * FROM matrix_position_details WHERE root_wallet = '0x...' AND layer <= 3;

-- 查看可用的放置位置
SELECT * FROM matrix_available_positions WHERE root_wallet = '0x...' LIMIT 5;

-- 使用便捷函数
SELECT * FROM get_user_matrix_overview('0x...');
*/