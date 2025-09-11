-- 删除旧的matrix表和views，重建符合新归递表的视图和奖励触发系统

BEGIN;

-- 1. 删除旧的matrix相关表和视图
SELECT '=== 清理旧的matrix表和视图 ===' as step;

-- 删除可能存在的旧表
DROP TABLE IF EXISTS individual_matrix_placements CASCADE;
DROP TABLE IF EXISTS matrix_activity_log CASCADE;
DROP TABLE IF EXISTS referrals_backup_final CASCADE;
DROP TABLE IF EXISTS referrals_backup_before_fix CASCADE;
DROP TABLE IF EXISTS referrals_matrix_backup CASCADE;

-- 删除旧的视图
DROP VIEW IF EXISTS recursive_matrix_verification_view CASCADE;
DROP VIEW IF EXISTS ideal_recursive_matrix_structure CASCADE;
DROP VIEW IF EXISTS matrix_structure_comparison CASCADE;
DROP VIEW IF EXISTS recursive_referral_chain_view CASCADE;
DROP VIEW IF EXISTS fixed_matrix_verification CASCADE;
DROP VIEW IF EXISTS matrix_statistics CASCADE;
DROP VIEW IF EXISTS recursive_matrix_verification CASCADE;

-- 删除旧的函数
DROP FUNCTION IF EXISTS analyze_matrix_structure() CASCADE;
DROP FUNCTION IF EXISTS calculate_matrix_parent(text, text) CASCADE;
DROP FUNCTION IF EXISTS check_matrix_health() CASCADE;
DROP FUNCTION IF EXISTS find_matrix_placement(character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS find_matrix_placement(text, text) CASCADE;
DROP FUNCTION IF EXISTS place_members_in_3x3_matrix() CASCADE;
DROP FUNCTION IF EXISTS rebuild_complete_matrix() CASCADE;
DROP FUNCTION IF EXISTS update_matrix_layer_summary() CASCADE;
DROP FUNCTION IF EXISTS get_matrix_system_overview() CASCADE;
DROP FUNCTION IF EXISTS get_member_matrix(text) CASCADE;
DROP FUNCTION IF EXISTS show_referral_chain_for_member(text) CASCADE;
DROP FUNCTION IF EXISTS view_member_matrix(text) CASCADE;
DROP FUNCTION IF EXISTS view_member_current_matrix(text) CASCADE;
DROP FUNCTION IF EXISTS show_referral_chain_analysis(text) CASCADE;
DROP FUNCTION IF EXISTS generate_matrix_records_for_new_member(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS trigger_generate_matrix_records() CASCADE;
DROP FUNCTION IF EXISTS rebuild_all_matrix_records() CASCADE;
DROP FUNCTION IF EXISTS generate_recursive_matrix_records() CASCADE;
DROP FUNCTION IF EXISTS apply_spillover_mechanism() CASCADE;
DROP FUNCTION IF EXISTS create_test_referral_chain() CASCADE;
DROP FUNCTION IF EXISTS generate_complete_recursive_matrix() CASCADE;
DROP FUNCTION IF EXISTS rebuild_correct_recursive_matrix() CASCADE;
DROP FUNCTION IF EXISTS build_recursive_matrix() CASCADE;
DROP FUNCTION IF EXISTS build_members_recursive_matrix() CASCADE;
DROP FUNCTION IF EXISTS build_spillover_matrix() CASCADE;
DROP FUNCTION IF EXISTS build_simple_spillover_matrix() CASCADE;
DROP FUNCTION IF EXISTS generate_simple_recursive_matrix() CASCADE;
DROP FUNCTION IF EXISTS build_correct_recursive_matrix() CASCADE;
DROP FUNCTION IF EXISTS fix_recursive_matrix_structure() CASCADE;

SELECT '旧系统清理完成' as status;

-- 2. 基于新双表系统创建视图
SELECT '=== 创建新的matrix视图系统 ===' as step;

-- 原始推荐关系视图
CREATE OR REPLACE VIEW original_referral_tree AS
SELECT 
    r.matrix_root,
    COALESCE(u_root.username, 'Member_' || RIGHT(r.matrix_root, 4)) as root_name,
    r.matrix_layer,
    r.matrix_position,
    r.member_wallet,
    COALESCE(u_member.username, 'Member_' || RIGHT(r.member_wallet, 4)) as member_name,
    r.referrer_wallet,
    r.is_active,
    r.placed_at,
    'original' as tree_type
FROM referrals r
LEFT JOIN users u_root ON r.matrix_root = u_root.wallet_address
LEFT JOIN users u_member ON r.member_wallet = u_member.wallet_address
ORDER BY r.matrix_root, r.matrix_layer, 
    CASE r.matrix_position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END;

-- 滑落后matrix视图
CREATE OR REPLACE VIEW spillover_matrix_tree AS
SELECT 
    sm.matrix_root,
    COALESCE(u_root.username, 'Member_' || RIGHT(sm.matrix_root, 4)) as root_name,
    sm.matrix_layer,
    sm.matrix_position,
    sm.member_wallet,
    COALESCE(u_member.username, 'Member_' || RIGHT(sm.member_wallet, 4)) as member_name,
    sm.referrer_wallet,
    sm.original_layer,
    sm.is_active,
    sm.placed_at,
    'spillover' as tree_type,
    POWER(3, sm.matrix_layer) as layer_capacity,
    CASE 
        WHEN sm.matrix_layer != sm.original_layer THEN true 
        ELSE false 
    END as was_spillover
FROM spillover_matrix sm
LEFT JOIN users u_root ON sm.matrix_root = u_root.wallet_address
LEFT JOIN users u_member ON sm.member_wallet = u_member.wallet_address
ORDER BY sm.matrix_root, sm.matrix_layer, 
    CASE sm.matrix_position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END;

-- 统一matrix对比视图
CREATE OR REPLACE VIEW matrix_comparison_view AS
SELECT 
    'Original Tree' as tree_type,
    matrix_root,
    root_name,
    matrix_layer,
    matrix_position,
    member_name,
    NULL as original_layer,
    false as was_spillover
FROM original_referral_tree
UNION ALL
SELECT 
    'Spillover Matrix',
    matrix_root,
    root_name,
    matrix_layer,
    matrix_position,
    member_name,
    original_layer,
    was_spillover
FROM spillover_matrix_tree
ORDER BY matrix_root, tree_type, matrix_layer, matrix_position;

-- Matrix统计视图
CREATE OR REPLACE VIEW matrix_statistics_view AS
SELECT 
    'Original Referrals' as matrix_type,
    matrix_root,
    COALESCE(u.username, 'Member_' || RIGHT(matrix_root, 4)) as root_name,
    COUNT(*) as total_members,
    MAX(matrix_layer) as deepest_layer,
    COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) as l_positions,
    COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) as m_positions,
    COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) as r_positions,
    COUNT(CASE WHEN is_active THEN 1 END) as active_members
FROM referrals r
LEFT JOIN users u ON r.matrix_root = u.wallet_address
GROUP BY matrix_root, u.username

UNION ALL

SELECT 
    'Spillover Matrix',
    matrix_root,
    COALESCE(u.username, 'Member_' || RIGHT(matrix_root, 4)),
    COUNT(*),
    MAX(matrix_layer),
    COUNT(CASE WHEN matrix_position = 'L' THEN 1 END),
    COUNT(CASE WHEN matrix_position = 'M' THEN 1 END),
    COUNT(CASE WHEN matrix_position = 'R' THEN 1 END),
    COUNT(CASE WHEN is_active THEN 1 END)
FROM spillover_matrix sm
LEFT JOIN users u ON sm.matrix_root = u.wallet_address
GROUP BY matrix_root, u.username
ORDER BY matrix_root, matrix_type;

-- 3. 创建奖励触发相关函数
SELECT '=== 创建奖励触发系统 ===' as step;

-- 获取会员在特定matrix中的位置
CREATE OR REPLACE FUNCTION get_member_spillover_position(
    p_member_wallet TEXT,
    p_matrix_root TEXT
)
RETURNS TABLE(
    layer INTEGER,
    position TEXT,
    was_spillover BOOLEAN,
    original_layer INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.matrix_layer,
        sm.matrix_position,
        (sm.matrix_layer != sm.original_layer) as was_spillover,
        sm.original_layer
    FROM spillover_matrix sm
    WHERE sm.member_wallet = p_member_wallet
    AND sm.matrix_root = p_matrix_root;
END;
$$ LANGUAGE plpgsql;

-- 获取matrix的层级统计
CREATE OR REPLACE FUNCTION get_matrix_layer_stats(p_matrix_root TEXT)
RETURNS TABLE(
    layer INTEGER,
    current_count BIGINT,
    max_capacity BIGINT,
    fill_percentage NUMERIC,
    l_count BIGINT,
    m_count BIGINT,
    r_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.matrix_layer as layer,
        COUNT(*) as current_count,
        POWER(3, sm.matrix_layer) as max_capacity,
        ROUND((COUNT(*) * 100.0 / POWER(3, sm.matrix_layer)), 2) as fill_percentage,
        COUNT(CASE WHEN sm.matrix_position = 'L' THEN 1 END) as l_count,
        COUNT(CASE WHEN sm.matrix_position = 'M' THEN 1 END) as m_count,
        COUNT(CASE WHEN sm.matrix_position = 'R' THEN 1 END) as r_count
    FROM spillover_matrix sm
    WHERE sm.matrix_root = p_matrix_root
    GROUP BY sm.matrix_layer
    ORDER BY sm.matrix_layer;
END;
$$ LANGUAGE plpgsql;

-- 计算matrix奖励应该给谁
CREATE OR REPLACE FUNCTION calculate_matrix_rewards(
    p_new_member_wallet TEXT,
    p_matrix_root TEXT
)
RETURNS TABLE(
    reward_recipient TEXT,
    recipient_name TEXT,
    reward_type TEXT,
    reward_layer INTEGER,
    reward_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH member_position AS (
        SELECT matrix_layer, matrix_position
        FROM spillover_matrix
        WHERE member_wallet = p_new_member_wallet
        AND matrix_root = p_matrix_root
    ),
    reward_calculation AS (
        SELECT 
            p_matrix_root as recipient_wallet,
            COALESCE(u.username, 'Member_' || RIGHT(p_matrix_root, 4)) as recipient_name,
            'Layer ' || mp.matrix_layer || ' Placement' as reward_type,
            mp.matrix_layer as reward_layer,
            -- 基础奖励逻辑，可根据需要调整
            CASE mp.matrix_layer
                WHEN 1 THEN 10.00
                WHEN 2 THEN 5.00
                ELSE 1.00
            END as amount
        FROM member_position mp
        LEFT JOIN users u ON u.wallet_address = p_matrix_root
    )
    SELECT 
        recipient_wallet,
        recipient_name,
        reward_type,
        reward_layer,
        amount
    FROM reward_calculation;
END;
$$ LANGUAGE plpgsql;

-- 新会员加入时的奖励触发函数
CREATE OR REPLACE FUNCTION trigger_matrix_rewards_on_join(
    p_new_member_wallet TEXT
)
RETURNS void AS $$
DECLARE
    matrix_record RECORD;
    reward_record RECORD;
BEGIN
    -- 为新会员在每个matrix中的位置计算奖励
    FOR matrix_record IN 
        SELECT DISTINCT matrix_root 
        FROM spillover_matrix 
        WHERE member_wallet = p_new_member_wallet
    LOOP
        -- 计算并记录奖励
        FOR reward_record IN 
            SELECT * FROM calculate_matrix_rewards(p_new_member_wallet, matrix_record.matrix_root)
        LOOP
            -- 这里可以插入到奖励记录表
            RAISE NOTICE '奖励触发: % 获得 % (Layer %) 奖励金额: %',
                reward_record.recipient_name,
                reward_record.reward_type,
                reward_record.reward_layer,
                reward_record.reward_amount;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. 测试新系统
SELECT '=== 测试新的matrix系统 ===' as step;

-- 测试视图
SELECT 'Original vs Spillover 对比' as test_type, COUNT(*) as record_count FROM matrix_comparison_view;
SELECT 'Matrix统计' as test_type, COUNT(*) as record_count FROM matrix_statistics_view;

-- 测试函数
SELECT '测试奖励触发函数' as test_type;
SELECT trigger_matrix_rewards_on_join(
    (SELECT wallet_address FROM members ORDER BY created_at DESC LIMIT 1)
);

SELECT '=== 新matrix系统构建完成 ===' as step;

COMMIT;