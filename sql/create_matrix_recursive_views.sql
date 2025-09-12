-- 创建Matrix递归views - 支持19层NFT等级的1x3矩阵结构
-- ========================================
-- 为每个Matrix Root创建完整的下级结构查询
-- ========================================

SELECT '=== 创建Matrix递归Views ===' as matrix_views_section;

-- 第1步：创建Matrix层级递归函数
-- ========================================

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
            m.activation_sequence as member_sequence,
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
            m.activation_sequence as member_sequence,
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
    SELECT * FROM matrix_tree
    ORDER BY depth_level, matrix_layer, 
             CASE matrix_position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END;
END;
$$;

-- 第2步：创建Matrix统计函数
-- ========================================

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

-- 第3步：创建1x3 Matrix展示函数
-- ========================================

CREATE OR REPLACE FUNCTION get_1x3_matrix_view(
    p_root_wallet VARCHAR(42),
    p_target_layer INTEGER DEFAULT 1
)
RETURNS TABLE (
    position VARCHAR(1),
    member_wallet VARCHAR(42),
    member_sequence INTEGER,
    member_username VARCHAR(50),
    member_level INTEGER,
    total_earned DECIMAL(18,6),
    downline_count INTEGER,
    is_filled BOOLEAN,
    placed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH positions AS (
        SELECT unnest(ARRAY['L', 'M', 'R']) as position
    ),
    layer_members AS (
        SELECT 
            r.matrix_position,
            r.member_wallet,
            m.activation_sequence as member_sequence,
            u.username as member_username,
            m.current_level as member_level,
            COALESCE(ub.total_earned, 0) as total_earned,
            r.placed_at,
            -- 计算该成员的下级数量
            (SELECT COUNT(*) FROM get_matrix_downline(r.member_wallet, 19)) as downline_count
        FROM referrals r
        JOIN members m ON r.member_wallet = m.wallet_address
        JOIN users u ON m.wallet_address = u.wallet_address
        LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
        WHERE r.matrix_root_wallet = p_root_wallet
        AND r.matrix_layer = p_target_layer
    )
    SELECT 
        p.position,
        lm.member_wallet,
        lm.member_sequence,
        lm.member_username,
        lm.member_level,
        lm.total_earned,
        lm.downline_count,
        (lm.member_wallet IS NOT NULL) as is_filled,
        lm.placed_at
    FROM positions p
    LEFT JOIN layer_members lm ON p.position = lm.matrix_position
    ORDER BY CASE p.position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END;
END;
$$;

-- 第4步：创建Matrix Root列表函数
-- ========================================

CREATE OR REPLACE FUNCTION get_all_matrix_roots()
RETURNS TABLE (
    root_wallet VARCHAR(42),
    root_sequence INTEGER,
    root_username VARCHAR(50),
    root_level INTEGER,
    direct_referrals_count INTEGER,
    matrix_members_count INTEGER,
    layer_rewards_count INTEGER,
    total_rewards_amount DECIMAL(18,6),
    claimable_rewards_amount DECIMAL(18,6),
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.wallet_address as root_wallet,
        m.activation_sequence as root_sequence,
        u.username as root_username,
        m.current_level as root_level,
        
        -- 直接推荐数
        (SELECT COUNT(*)::INTEGER 
         FROM referrals r1 
         WHERE r1.referrer_wallet = m.wallet_address 
         AND r1.is_direct_referral = true) as direct_referrals_count,
         
        -- Matrix成员数
        (SELECT COUNT(*)::INTEGER
         FROM referrals r2
         WHERE r2.matrix_root_wallet = m.wallet_address
         AND r2.matrix_layer > 0) as matrix_members_count,
         
        -- Layer奖励数
        (SELECT COUNT(*)::INTEGER
         FROM layer_rewards lr
         WHERE lr.reward_recipient_wallet = m.wallet_address) as layer_rewards_count,
         
        -- 总奖励金额
        (SELECT COALESCE(SUM(lr2.reward_amount), 0)
         FROM layer_rewards lr2
         WHERE lr2.reward_recipient_wallet = m.wallet_address) as total_rewards_amount,
         
        -- 可领取奖励金额
        (SELECT COALESCE(SUM(lr3.reward_amount), 0)
         FROM layer_rewards lr3
         WHERE lr3.reward_recipient_wallet = m.wallet_address
         AND lr3.status = 'claimable') as claimable_rewards_amount,
         
        m.created_at
    FROM members m
    JOIN users u ON m.wallet_address = u.wallet_address
    WHERE m.activation_sequence >= 0  -- 包括Super Root
    ORDER BY m.activation_sequence;
END;
$$;

-- 第5步：创建Matrix导航函数
-- ========================================

CREATE OR REPLACE FUNCTION get_matrix_navigation(
    p_current_root VARCHAR(42)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    current_info JSON;
    upline_info JSON;
    siblings_info JSON;
BEGIN
    -- 获取当前Root信息
    SELECT json_build_object(
        'wallet_address', m.wallet_address,
        'activation_sequence', m.activation_sequence,
        'username', u.username,
        'current_level', m.current_level
    ) INTO current_info
    FROM members m
    JOIN users u ON m.wallet_address = u.wallet_address
    WHERE m.wallet_address = p_current_root;
    
    -- 获取上级信息（如果有）
    SELECT json_build_object(
        'wallet_address', m.wallet_address,
        'activation_sequence', m.activation_sequence,
        'username', u.username,
        'current_level', m.current_level
    ) INTO upline_info
    FROM members m
    JOIN users u ON m.wallet_address = u.wallet_address
    JOIN referrals r ON m.wallet_address = r.matrix_root_wallet
    WHERE r.member_wallet = p_current_root
    AND r.matrix_layer > 0
    LIMIT 1;
    
    -- 获取同级Root信息（同一个上级的其他成员）
    SELECT json_agg(
        json_build_object(
            'wallet_address', m.wallet_address,
            'activation_sequence', m.activation_sequence,
            'username', u.username,
            'current_level', m.current_level,
            'matrix_position', r.matrix_position
        )
    ) INTO siblings_info
    FROM members m
    JOIN users u ON m.wallet_address = u.wallet_address
    JOIN referrals r ON m.wallet_address = r.member_wallet
    WHERE r.matrix_root_wallet = (
        SELECT r2.matrix_root_wallet
        FROM referrals r2
        WHERE r2.member_wallet = p_current_root
        AND r2.matrix_layer > 0
        LIMIT 1
    )
    AND r.matrix_layer > 0
    AND m.wallet_address != p_current_root;
    
    result := json_build_object(
        'current', current_info,
        'upline', upline_info,
        'siblings', siblings_info
    );
    
    RETURN result;
END;
$$;

-- 第6步：验证Matrix views创建
-- ========================================

SELECT '=== Matrix Views验证 ===' as verification_section;

-- 测试Matrix Root列表
SELECT 
    '=== Matrix Roots概览 ===' as test_section,
    root_sequence,
    root_username,
    direct_referrals_count,
    matrix_members_count,
    total_rewards_amount
FROM get_all_matrix_roots()
ORDER BY root_sequence;

-- 测试Super Root的1x3视图
SELECT 
    '=== Super Root 1x3 Matrix ===' as test_section,
    position,
    member_username,
    member_level,
    downline_count,
    is_filled
FROM get_1x3_matrix_view('0x0000000000000000000000000000000000000001', 1);

SELECT '✅ Matrix递归Views创建完成' as completion_message;