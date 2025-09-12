-- Fix Matrix RPC functions with correct column names
-- ========================================

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS get_matrix_downline(VARCHAR(42), INTEGER);
DROP FUNCTION IF EXISTS get_matrix_stats(VARCHAR(42));

-- 第1步：创建修复的Matrix层级递归函数
CREATE OR REPLACE FUNCTION get_matrix_downline(
    p_root_wallet VARCHAR(42),
    p_max_depth INTEGER DEFAULT 19
)
RETURNS TABLE (
    member_wallet VARCHAR(42),
    member_sequence INTEGER,
    member_username VARCHAR(50),
    member_level INTEGER,
    matrix_layer INTEGER,
    matrix_position VARCHAR(1),
    referrer_wallet VARCHAR(42),
    is_direct_referral BOOLEAN,
    depth_level INTEGER,
    path_from_root TEXT,
    total_earned DECIMAL(18,6),
    available_balance DECIMAL(18,6),
    placed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE matrix_tree AS (
        -- 基础查询：直接下级（Level 1）
        SELECT 
            r.member_wallet,
            r.member_activation_sequence as member_sequence,
            u.username as member_username,
            m.current_level as member_level,
            r.matrix_layer,
            r.matrix_position,
            r.referrer_wallet,
            r.is_direct_referral,
            1 as depth_level,
            r.matrix_position::TEXT as path_from_root,
            COALESCE(ub.total_earned, 0) as total_earned,
            COALESCE(ub.available_balance, 0) as available_balance,
            r.placed_at
        FROM referrals r
        JOIN members m ON r.member_wallet = m.wallet_address
        JOIN users u ON m.wallet_address = u.wallet_address
        LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
        WHERE r.matrix_root_wallet = p_root_wallet
        AND r.matrix_layer > 0
        
        UNION ALL
        
        -- 递归查询：下级的下级
        SELECT 
            r.member_wallet,
            r.member_activation_sequence as member_sequence,
            u.username as member_username,
            m.current_level as member_level,
            r.matrix_layer,
            r.matrix_position,
            r.referrer_wallet,
            r.is_direct_referral,
            mt.depth_level + 1,
            mt.path_from_root || '->' || r.matrix_position as path_from_root,
            COALESCE(ub.total_earned, 0) as total_earned,
            COALESCE(ub.available_balance, 0) as available_balance,
            r.placed_at
        FROM referrals r
        JOIN members m ON r.member_wallet = m.wallet_address
        JOIN users u ON m.wallet_address = u.wallet_address
        LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
        JOIN matrix_tree mt ON r.matrix_root_wallet = mt.member_wallet
        WHERE mt.depth_level < p_max_depth
        AND r.matrix_layer > 0
    )
    SELECT 
        mt.member_wallet,
        mt.member_sequence,
        mt.member_username,
        mt.member_level,
        mt.matrix_layer,
        mt.matrix_position,
        mt.referrer_wallet,
        mt.is_direct_referral,
        mt.depth_level,
        mt.path_from_root,
        mt.total_earned,
        mt.available_balance,
        mt.placed_at
    FROM matrix_tree mt
    ORDER BY mt.depth_level, mt.matrix_layer, 
             CASE mt.matrix_position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END;
END;
$$;

-- 第2步：创建修复的Matrix统计函数
CREATE OR REPLACE FUNCTION get_matrix_stats(
    p_root_wallet VARCHAR(42)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_downline INTEGER;
    direct_referrals INTEGER;
    layer_stats JSON;
    level_distribution JSON;
    earnings_stats JSON;
BEGIN
    -- 计算总下级数
    SELECT COUNT(*) INTO total_downline
    FROM get_matrix_downline(p_root_wallet, 19);
    
    -- 计算直接推荐数
    SELECT COUNT(*) INTO direct_referrals
    FROM referrals
    WHERE referrer_wallet = p_root_wallet
    AND is_direct_referral = true;
    
    -- 按层级统计
    SELECT json_object_agg(matrix_layer, layer_count) INTO layer_stats
    FROM (
        SELECT 
            matrix_layer,
            COUNT(*) as layer_count
        FROM get_matrix_downline(p_root_wallet, 19)
        GROUP BY matrix_layer
        ORDER BY matrix_layer
    ) layer_data;
    
    -- 按会员等级分布
    SELECT json_object_agg(member_level, level_count) INTO level_distribution
    FROM (
        SELECT 
            member_level,
            COUNT(*) as level_count
        FROM get_matrix_downline(p_root_wallet, 19)
        GROUP BY member_level
        ORDER BY member_level
    ) level_data;
    
    -- 收益统计
    SELECT json_build_object(
        'total_team_earned', COALESCE(SUM(total_earned), 0),
        'total_team_balance', COALESCE(SUM(available_balance), 0),
        'average_earned', COALESCE(AVG(total_earned), 0)
    ) INTO earnings_stats
    FROM get_matrix_downline(p_root_wallet, 19);
    
    -- 构建完整结果
    result := json_build_object(
        'root_wallet', p_root_wallet,
        'total_downline', total_downline,
        'direct_referrals', direct_referrals,
        'layer_stats', layer_stats,
        'level_distribution', level_distribution,
        'earnings_stats', earnings_stats,
        'generated_at', NOW()
    );
    
    RETURN result;
END;
$$;

-- 测试函数
SELECT 'Matrix RPC functions fixed and deployed' as status;