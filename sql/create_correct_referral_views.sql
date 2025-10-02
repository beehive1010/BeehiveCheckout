-- 创建正确的推荐关系和Matrix视图，符合前端组件需求

BEGIN;

SELECT '=== 创建正确的推荐关系和Matrix视图 ===' as step;

-- 1. 清理和规范referrals表的作用：只存储原始推荐关系
-- referrals表应该只记录谁推荐了谁，不应该包含matrix位置信息
DROP VIEW IF EXISTS direct_referrals_view CASCADE;
DROP VIEW IF EXISTS matrix_team_view CASCADE;
DROP VIEW IF EXISTS referral_stats_view CASCADE;

-- 2. 创建直推关系视图（基于users表的referrer_wallet字段）
CREATE OR REPLACE VIEW direct_referrals_view AS
SELECT 
    r.wallet_address as referrer_wallet,
    r.username as referrer_name,
    m.wallet_address as member_wallet,
    m.username as member_name,
    m.created_at as referred_at,
    CASE 
        WHEN members.wallet_address IS NOT NULL THEN true 
        ELSE false 
    END as is_activated,
    members.current_level as member_level,
    members.activation_rank
FROM users r
JOIN users m ON m.referrer_wallet = r.wallet_address
LEFT JOIN members ON members.wallet_address = m.wallet_address
WHERE r.wallet_address != '0x0000000000000000000000000000000000000001' -- 排除系统根地址
ORDER BY m.created_at DESC;

-- 3. 创建Matrix团队视图（基于spillover_matrix表）
CREATE OR REPLACE VIEW matrix_team_view AS
SELECT 
    sm.matrix_root,
    sm.member_wallet,
    sm.matrix_layer,
    sm.matrix_position,
    sm.placed_at,
    sm.is_active,
    u.username as member_name,
    m.current_level as member_level,
    -- 确定这是直推还是spillover
    CASE 
        WHEN u.referrer_wallet = sm.matrix_root THEN 'direct'
        ELSE 'spillover'
    END as placement_type,
    -- 获取原始推荐人
    ru.wallet_address as original_referrer,
    ru.username as original_referrer_name
FROM spillover_matrix sm
LEFT JOIN users u ON sm.member_wallet = u.wallet_address
LEFT JOIN users ru ON u.referrer_wallet = ru.wallet_address
LEFT JOIN members m ON sm.member_wallet = m.wallet_address
WHERE sm.is_active = true
ORDER BY sm.matrix_root, sm.matrix_layer, sm.matrix_position;

-- 4. 创建推荐统计视图（符合前端ReferralStatsCard需求）
CREATE OR REPLACE VIEW referral_stats_view AS
WITH direct_stats AS (
    -- 直推统计
    SELECT 
        referrer_wallet,
        COUNT(*) as total_direct_referrals,
        COUNT(CASE WHEN is_activated THEN 1 END) as activated_referrals,
        MAX(member_level) as highest_referral_level
    FROM direct_referrals_view
    GROUP BY referrer_wallet
),
matrix_stats AS (
    -- Matrix团队统计
    SELECT 
        matrix_root,
        COUNT(*) as total_team_size,
        COUNT(CASE WHEN member_level > 0 THEN 1 END) as activated_members,
        MAX(matrix_layer) as max_depth,
        -- 各层分布
        COUNT(CASE WHEN matrix_layer = 1 THEN 1 END) as layer_1_count,
        COUNT(CASE WHEN matrix_layer = 2 THEN 1 END) as layer_2_count,
        COUNT(CASE WHEN matrix_layer = 3 THEN 1 END) as layer_3_count,
        COUNT(CASE WHEN matrix_layer = 4 THEN 1 END) as layer_4_count,
        COUNT(CASE WHEN matrix_layer = 5 THEN 1 END) as layer_5_count,
        -- L-M-R分布
        COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) as l_positions,
        COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) as m_positions,
        COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) as r_positions,
        -- 直推vs溢出
        COUNT(CASE WHEN placement_type = 'direct' THEN 1 END) as direct_placements,
        COUNT(CASE WHEN placement_type = 'spillover' THEN 1 END) as spillover_placements
    FROM matrix_team_view
    GROUP BY matrix_root
),
network_strength AS (
    -- 网络强度计算
    SELECT 
        matrix_root,
        CASE 
            WHEN total_team_size = 0 THEN 0
            ELSE ROUND(
                (total_team_size * 0.4 + max_depth * 0.3 + (activated_members::float / total_team_size) * 100 * 0.3) * 10
            ) / 10
        END as network_strength_score
    FROM matrix_stats
)
SELECT 
    u.wallet_address,
    u.username,
    -- 直推数据
    COALESCE(ds.total_direct_referrals, 0) as total_direct_referrals,
    COALESCE(ds.activated_referrals, 0) as activated_referrals,
    COALESCE(ds.highest_referral_level, 0) as highest_referral_level,
    -- Matrix数据（作为根）
    COALESCE(ms.total_team_size, 0) as total_team_size,
    COALESCE(ms.activated_members, 0) as activated_members,
    COALESCE(ms.max_depth, 0) as max_depth,
    -- 层级分布
    jsonb_build_object(
        '1', COALESCE(ms.layer_1_count, 0),
        '2', COALESCE(ms.layer_2_count, 0),
        '3', COALESCE(ms.layer_3_count, 0),
        '4', COALESCE(ms.layer_4_count, 0),
        '5', COALESCE(ms.layer_5_count, 0)
    ) as layer_distribution,
    -- 位置分布
    jsonb_build_object(
        'L', COALESCE(ms.l_positions, 0),
        'M', COALESCE(ms.m_positions, 0),
        'R', COALESCE(ms.r_positions, 0)
    ) as position_distribution,
    -- 放置类型
    jsonb_build_object(
        'direct', COALESCE(ms.direct_placements, 0),
        'spillover', COALESCE(ms.spillover_placements, 0)
    ) as placement_distribution,
    -- 网络强度
    COALESCE(ns.network_strength_score, 0) as network_strength
FROM users u
LEFT JOIN direct_stats ds ON u.wallet_address = ds.referrer_wallet
LEFT JOIN matrix_stats ms ON u.wallet_address = ms.matrix_root
LEFT JOIN network_strength ns ON u.wallet_address = ns.matrix_root
WHERE u.wallet_address != '0x0000000000000000000000000000000000000001';

-- 5. 创建获取用户推荐数据的函数（符合前端需求）
CREATE OR REPLACE FUNCTION get_user_referral_data(
    p_wallet_address TEXT
)
RETURNS TABLE(
    -- 直推数据
    direct_referrals JSONB,
    -- Matrix统计
    matrix_stats JSONB,
    -- 综合数据
    overall_stats JSONB
) AS $$
DECLARE
    stats_record RECORD;
    direct_referrals_data JSONB;
    recent_referrals JSONB;
BEGIN
    -- 获取统计数据
    SELECT * INTO stats_record 
    FROM referral_stats_view 
    WHERE wallet_address = p_wallet_address;
    
    -- 获取直推详情
    SELECT jsonb_agg(
        jsonb_build_object(
            'member_wallet', member_wallet,
            'member_name', member_name,
            'referred_at', referred_at,
            'is_activated', is_activated,
            'member_level', member_level,
            'activation_rank', activation_rank
        )
    ) INTO direct_referrals_data
    FROM direct_referrals_view 
    WHERE referrer_wallet = p_wallet_address
    ORDER BY referred_at DESC
    LIMIT 10;
    
    -- 获取最近的Matrix成员
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', sm.id,
            'member_wallet', sm.member_wallet,
            'member_name', u.username,
            'layer', sm.matrix_layer,
            'position', sm.matrix_position,
            'placement_type', CASE WHEN u.referrer_wallet = sm.matrix_root THEN 'direct' ELSE 'spillover' END,
            'placed_at', sm.placed_at,
            'is_active', sm.is_active,
            'member_level', m.current_level
        )
    ) INTO recent_referrals
    FROM spillover_matrix sm
    LEFT JOIN users u ON sm.member_wallet = u.wallet_address
    LEFT JOIN members m ON sm.member_wallet = m.wallet_address
    WHERE sm.matrix_root = p_wallet_address
    ORDER BY sm.placed_at DESC
    LIMIT 10;
    
    RETURN QUERY SELECT 
        -- 直推数据
        jsonb_build_object(
            'total_direct_referrals', COALESCE(stats_record.total_direct_referrals, 0),
            'activated_referrals', COALESCE(stats_record.activated_referrals, 0),
            'highest_referral_level', COALESCE(stats_record.highest_referral_level, 0),
            'referrals_list', COALESCE(direct_referrals_data, '[]'::jsonb)
        ) as direct_referrals,
        
        -- Matrix统计
        jsonb_build_object(
            'as_root', jsonb_build_object(
                'total_team_size', COALESCE(stats_record.total_team_size, 0),
                'activated_members', COALESCE(stats_record.activated_members, 0),
                'max_depth', COALESCE(stats_record.max_depth, 0),
                'layer_distribution', COALESCE(stats_record.layer_distribution, '{}'::jsonb)
            ),
            'recent_members', COALESCE(recent_referrals, '[]'::jsonb)
        ) as matrix_stats,
        
        -- 综合数据
        jsonb_build_object(
            'network_strength', COALESCE(stats_record.network_strength, 0),
            'position_distribution', COALESCE(stats_record.position_distribution, '{}'::jsonb),
            'placement_distribution', COALESCE(stats_record.placement_distribution, '{}'::jsonb)
        ) as overall_stats;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建获取直推人数的简化函数
CREATE OR REPLACE FUNCTION get_direct_referral_count(
    p_wallet_address TEXT
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM users 
        WHERE referrer_wallet = p_wallet_address
        AND wallet_address != '0x0000000000000000000000000000000000000001'
    );
END;
$$ LANGUAGE plpgsql;

-- 7. 测试新的视图和函数
SELECT '=== 测试新的推荐关系视图 ===' as test_step;

SELECT 'Testing direct referrals view:' as info;
SELECT * FROM direct_referrals_view WHERE referrer_wallet = '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC' LIMIT 3;

SELECT 'Testing matrix team view:' as info;
SELECT * FROM matrix_team_view WHERE matrix_root = '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC' LIMIT 3;

SELECT 'Testing referral stats view:' as info;
SELECT * FROM referral_stats_view WHERE wallet_address = '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC' LIMIT 1;

SELECT 'Testing user referral data function:' as info;
SELECT * FROM get_user_referral_data('0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC');

SELECT 'Testing direct referral count:' as info;
SELECT get_direct_referral_count('0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC') as direct_count;

SELECT '=== 推荐关系视图创建完成 ===' as final_status;

COMMIT;