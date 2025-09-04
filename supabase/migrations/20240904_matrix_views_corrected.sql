-- 矩阵视图系统 - 修正版本
-- 修复所有类型转换和语法问题

-- 1. 用户矩阵排位视图 - 修正版
DROP VIEW IF EXISTS user_matrix_positions CASCADE;
CREATE VIEW user_matrix_positions AS
WITH matrix_stats AS (
    SELECT 
        root_wallet,
        COUNT(*)::INTEGER as total_members,
        COUNT(CASE WHEN layer = 1 THEN 1 END)::INTEGER as direct_referrals,
        MAX(layer)::INTEGER as deepest_layer,
        COUNT(DISTINCT layer)::INTEGER as active_layers
    FROM referrals 
    WHERE is_active = true
    GROUP BY root_wallet
),
layer_details AS (
    SELECT 
        r.root_wallet,
        r.layer,
        COUNT(*)::INTEGER as layer_member_count,
        POWER(3, r.layer)::INTEGER as layer_capacity,
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
    COALESCE(m.is_activated, false) as root_is_activated,
    COALESCE(m.current_level, u.current_level, 0) as root_current_level,
    
    -- 基础统计
    ms.total_members,
    ms.direct_referrals,
    ms.deepest_layer,
    ms.active_layers,
    
    -- 每层详细信息（JSON格式）
    COALESCE(
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
        ) FILTER (WHERE ld.layer IS NOT NULL),
        '[]'::JSONB
    ) as layer_details,
    
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
GROUP BY ms.root_wallet, u.username, m.is_activated, m.current_level, u.current_level,
         ms.total_members, ms.direct_referrals, ms.deepest_layer, ms.active_layers
ORDER BY ms.total_members DESC, ms.deepest_layer DESC;

-- 2. 用户矩阵概览 - 修正版  
DROP VIEW IF EXISTS user_matrix_summary CASCADE;
CREATE VIEW user_matrix_summary AS
SELECT 
    r.root_wallet,
    u.username as root_username,
    COUNT(*)::BIGINT as total_team_members,
    COUNT(CASE WHEN r.layer = 1 THEN 1 END)::BIGINT as direct_referrals,
    COUNT(CASE WHEN r.layer <= 3 THEN 1 END)::BIGINT as first_three_layers,
    MAX(r.layer) as deepest_layer,
    
    -- 每层统计
    COUNT(CASE WHEN r.layer = 1 THEN 1 END)::INTEGER as layer_1_count,
    COUNT(CASE WHEN r.layer = 2 THEN 1 END)::INTEGER as layer_2_count,
    COUNT(CASE WHEN r.layer = 3 THEN 1 END)::INTEGER as layer_3_count,
    COUNT(CASE WHEN r.layer = 4 THEN 1 END)::INTEGER as layer_4_count,
    COUNT(CASE WHEN r.layer = 5 THEN 1 END)::INTEGER as layer_5_count,
    
    -- 激活统计
    COUNT(CASE WHEN COALESCE(m.is_activated, false) = true THEN 1 END)::INTEGER as activated_members,
    CASE 
        WHEN COUNT(*) > 0 THEN
            ROUND((COUNT(CASE WHEN COALESCE(m.is_activated, false) = true THEN 1 END) * 100.0 / COUNT(*))::NUMERIC, 2)
        ELSE 0
    END as activation_rate,
    
    -- 最近活动
    MAX(r.placed_at) as latest_placement,
    MIN(r.placed_at) as first_placement,
    
    -- 矩阵效率分数 (0-100)
    LEAST(100, 
        ROUND(
            (COUNT(*) * 10.0 + 
             COUNT(CASE WHEN COALESCE(m.is_activated, false) = true THEN 1 END) * 5.0 +
             COALESCE(MAX(r.layer), 0) * 2.0)::NUMERIC, 0
        )
    )::INTEGER as matrix_efficiency_score

FROM referrals r
LEFT JOIN users u ON r.root_wallet = u.wallet_address  
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.is_active = true
GROUP BY r.root_wallet, u.username
ORDER BY total_team_members DESC, matrix_efficiency_score DESC;

-- 3. 矩阵位置详细视图 - 修正版
DROP VIEW IF EXISTS matrix_position_details CASCADE;
CREATE VIEW matrix_position_details AS
SELECT 
    r.root_wallet,
    u_root.username as root_username,
    r.layer,
    r."position",
    r.member_wallet,
    u_member.username as member_username,
    COALESCE(m.is_activated, false) as member_is_activated,
    COALESCE(m.current_level, u_member.current_level, 0) as member_level,
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
     AND r2.is_active = true)::INTEGER as downline_count,
     
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

-- 4. 更新get_user_matrix_overview函数
DROP FUNCTION IF EXISTS get_user_matrix_overview CASCADE;
CREATE OR REPLACE FUNCTION get_user_matrix_overview(user_wallet VARCHAR(42))
RETURNS TABLE(
    total_members BIGINT,
    direct_referrals BIGINT,
    deepest_layer INTEGER,
    matrix_status TEXT,
    efficiency_score INTEGER,
    activation_rate NUMERIC
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ump.total_team_members as total_members,
        ump.direct_referrals,
        ump.deepest_layer,
        CASE 
            WHEN ump.total_team_members = 0 THEN 'EMPTY'::TEXT
            WHEN ump.deepest_layer <= 3 THEN 'GROWING'::TEXT
            WHEN ump.deepest_layer > 6 THEN 'MATURE'::TEXT
            ELSE 'DEVELOPING'::TEXT
        END as matrix_status,
        ump.matrix_efficiency_score as efficiency_score,
        ump.activation_rate
    FROM user_matrix_summary ump
    WHERE ump.root_wallet = user_wallet;
END;
$function$;

-- 授予权限
GRANT SELECT ON user_matrix_positions TO authenticated;
GRANT SELECT ON user_matrix_summary TO authenticated;
GRANT SELECT ON matrix_position_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_matrix_overview TO authenticated;

-- 添加注释
COMMENT ON VIEW user_matrix_positions IS '完整的用户矩阵排位视图 - 显示每个root的详细矩阵结构（修正版）';
COMMENT ON VIEW user_matrix_summary IS '用户矩阵概览 - 显示关键统计信息和效率分数（修正版）';
COMMENT ON VIEW matrix_position_details IS '矩阵位置详细信息 - 显示每个位置的具体情况（修正版）';
COMMENT ON FUNCTION get_user_matrix_overview IS '获取用户矩阵概览的便捷函数（修正版）';

-- 创建索引以提高性能
CREATE INDEX IF NOT EXISTS idx_referrals_performance_root_layer_active 
ON referrals(root_wallet, layer, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_referrals_performance_member_root_active 
ON referrals(member_wallet, root_wallet, is_active) 
WHERE is_active = true;