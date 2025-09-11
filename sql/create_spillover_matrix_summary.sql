-- 创建spillover matrix摘要函数用于前端展示

BEGIN;

SELECT '=== 创建spillover matrix摘要函数 ===' as step;

-- 创建获取spillover matrix摘要的函数
CREATE OR REPLACE FUNCTION get_spillover_matrix_summary(
    p_root_wallet TEXT
)
RETURNS TABLE(
    layer_num INTEGER,
    current_count INTEGER,
    l_count INTEGER,
    m_count INTEGER,
    r_count INTEGER,
    max_capacity INTEGER,
    fill_percentage NUMERIC,
    layer_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH layer_stats AS (
        SELECT 
            sm.matrix_layer as layer,
            COUNT(*) as total_count,
            COUNT(CASE WHEN sm.matrix_position = 'L' THEN 1 END) as l_positions,
            COUNT(CASE WHEN sm.matrix_position = 'M' THEN 1 END) as m_positions,
            COUNT(CASE WHEN sm.matrix_position = 'R' THEN 1 END) as r_positions,
            POWER(3, sm.matrix_layer) as capacity
        FROM spillover_matrix sm
        WHERE sm.matrix_root = p_root_wallet
        AND sm.is_active = true
        GROUP BY sm.matrix_layer
    )
    SELECT 
        ls.layer as layer_num,
        ls.total_count::INTEGER as current_count,
        ls.l_positions::INTEGER as l_count,
        ls.m_positions::INTEGER as m_count,
        ls.r_positions::INTEGER as r_count,
        ls.capacity::INTEGER as max_capacity,
        ROUND((ls.total_count::NUMERIC / ls.capacity::NUMERIC) * 100, 2) as fill_percentage,
        jsonb_build_object(
            'is_full', ls.total_count >= ls.capacity,
            'available_slots', ls.capacity - ls.total_count,
            'distribution', jsonb_build_object(
                'L', ls.l_positions,
                'M', ls.m_positions, 
                'R', ls.r_positions
            )
        ) as layer_info
    FROM layer_stats ls
    ORDER BY ls.layer;
END;
$$ LANGUAGE plpgsql;

-- 创建获取用户Layer-Level奖励状态的函数
CREATE OR REPLACE FUNCTION get_user_layer_level_status(
    p_wallet_address TEXT
)
RETURNS TABLE(
    matrix_root character varying,
    root_name TEXT,
    root_level INTEGER,
    member_layer INTEGER,
    member_position character varying,
    can_earn_reward BOOLEAN,
    reward_reason TEXT,
    potential_reward NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.matrix_root,
        COALESCE(u.username, 'Member_' || RIGHT(sm.matrix_root, 4)) as root_name,
        COALESCE(m.current_level, 1) as root_level,
        sm.matrix_layer as member_layer,
        sm.matrix_position as member_position,
        CASE 
            WHEN COALESCE(m.current_level, 1) >= sm.matrix_layer THEN true
            ELSE false
        END as can_earn_reward,
        CASE 
            WHEN COALESCE(m.current_level, 1) >= sm.matrix_layer THEN 
                'Root Level ' || COALESCE(m.current_level, 1) || ' >= Member Layer ' || sm.matrix_layer || ', can earn rewards'
            ELSE 
                'Root Level ' || COALESCE(m.current_level, 1) || ' < Member Layer ' || sm.matrix_layer || ', rewards pending'
        END as reward_reason,
        get_nft_price(sm.matrix_layer) as potential_reward
    FROM spillover_matrix sm
    LEFT JOIN users u ON sm.matrix_root = u.wallet_address
    LEFT JOIN members m ON sm.matrix_root = m.wallet_address
    WHERE sm.member_wallet = p_wallet_address
    AND sm.is_active = true
    ORDER BY sm.matrix_root, sm.matrix_layer;
END;
$$ LANGUAGE plpgsql;

-- 创建完整的Layer-Level匹配状态检查函数
CREATE OR REPLACE FUNCTION check_layer_level_matching_status(
    p_wallet_address TEXT
)
RETURNS TABLE(
    user_current_level INTEGER,
    total_matrices_joined INTEGER,
    eligible_reward_layers INTEGER,
    pending_reward_layers INTEGER,
    total_potential_rewards NUMERIC,
    claimable_rewards NUMERIC,
    layer_level_breakdown JSONB
) AS $$
DECLARE
    current_level INTEGER;
    matrices_count INTEGER;
    eligible_layers INTEGER;
    pending_layers INTEGER;
    potential_total NUMERIC;
    claimable_total NUMERIC;
    breakdown JSONB;
BEGIN
    -- 获取用户当前级别
    SELECT COALESCE(current_level, 1) INTO current_level
    FROM members WHERE wallet_address = p_wallet_address;
    
    -- 计算参与的矩阵数量
    SELECT COUNT(DISTINCT matrix_root) INTO matrices_count
    FROM spillover_matrix 
    WHERE member_wallet = p_wallet_address AND is_active = true;
    
    -- 计算符合条件的层级数量（Root Level >= Member Layer）
    SELECT COUNT(*) INTO eligible_layers
    FROM spillover_matrix sm
    LEFT JOIN members m ON sm.matrix_root = m.wallet_address
    WHERE sm.member_wallet = p_wallet_address
    AND sm.is_active = true
    AND COALESCE(m.current_level, 1) >= sm.matrix_layer;
    
    -- 计算等待中的层级数量
    SELECT COUNT(*) INTO pending_layers
    FROM spillover_matrix sm
    LEFT JOIN members m ON sm.matrix_root = m.wallet_address
    WHERE sm.member_wallet = p_wallet_address
    AND sm.is_active = true
    AND COALESCE(m.current_level, 1) < sm.matrix_layer;
    
    -- 计算总潜在奖励
    SELECT COALESCE(SUM(get_nft_price(sm.matrix_layer)), 0) INTO potential_total
    FROM spillover_matrix sm
    WHERE sm.member_wallet = p_wallet_address AND sm.is_active = true;
    
    -- 计算可领取奖励
    SELECT COALESCE(SUM(get_nft_price(sm.matrix_layer)), 0) INTO claimable_total
    FROM spillover_matrix sm
    LEFT JOIN members m ON sm.matrix_root = m.wallet_address
    WHERE sm.member_wallet = p_wallet_address
    AND sm.is_active = true
    AND COALESCE(m.current_level, 1) >= sm.matrix_layer;
    
    -- 创建详细分解
    SELECT jsonb_agg(
        jsonb_build_object(
            'matrix_root', sm.matrix_root,
            'layer', sm.matrix_layer,
            'position', sm.matrix_position,
            'root_level', COALESCE(m.current_level, 1),
            'can_earn', COALESCE(m.current_level, 1) >= sm.matrix_layer,
            'potential_reward', get_nft_price(sm.matrix_layer)
        )
    ) INTO breakdown
    FROM spillover_matrix sm
    LEFT JOIN members m ON sm.matrix_root = m.wallet_address
    WHERE sm.member_wallet = p_wallet_address AND sm.is_active = true;
    
    RETURN QUERY SELECT 
        current_level,
        matrices_count,
        eligible_layers,
        pending_layers,
        potential_total,
        claimable_total,
        breakdown;
END;
$$ LANGUAGE plpgsql;

-- 测试新函数
SELECT '=== 测试spillover matrix摘要函数 ===' as test_step;

SELECT 'Testing spillover matrix summary:' as info;
SELECT * FROM get_spillover_matrix_summary('0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC') LIMIT 5;

SELECT 'Testing layer-level status:' as info;
SELECT * FROM get_user_layer_level_status('0x310053286b025De2a0816faEcBCaeB61B5f17aa1') LIMIT 3;

SELECT 'Testing layer-level matching status:' as info;
SELECT * FROM check_layer_level_matching_status('0x310053286b025De2a0816faEcBCaeB61B5f17aa1');

SELECT '=== spillover matrix摘要函数创建完成 ===' as final_status;

COMMIT;