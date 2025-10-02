-- 清理多余的视图和旧的matrix相关对象

BEGIN;

SELECT '=== 清理多余的视图 ===' as step;

-- 删除可能存在的多余视图
DROP VIEW IF EXISTS matrix_verification CASCADE;
DROP VIEW IF EXISTS individual_matrix_layer_summary CASCADE;
DROP VIEW IF EXISTS potential_future_rewards CASCADE;
DROP VIEW IF EXISTS matrix_stats CASCADE;
DROP VIEW IF EXISTS member_layer1_analysis CASCADE;
DROP VIEW IF EXISTS layer1_member_stats CASCADE;
DROP VIEW IF EXISTS reward_claims_dashboard CASCADE;
DROP VIEW IF EXISTS corrected_individual_matrices CASCADE;
DROP VIEW IF EXISTS corrected_matrix_stats CASCADE;
DROP VIEW IF EXISTS corrected_individual_rewards CASCADE;

-- 删除旧的函数（如果存在）
DROP FUNCTION IF EXISTS view_member_matrix(text) CASCADE;
DROP FUNCTION IF EXISTS view_member_current_matrix(text) CASCADE;
DROP FUNCTION IF EXISTS show_referral_chain_analysis(text) CASCADE;
DROP FUNCTION IF EXISTS generate_matrix_records_for_new_member(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS trigger_generate_matrix_records() CASCADE;
DROP FUNCTION IF EXISTS rebuild_all_matrix_records() CASCADE;
DROP FUNCTION IF EXISTS generate_recursive_matrix_records() CASCADE;
DROP FUNCTION IF EXISTS apply_spillover_mechanism() CASCADE;
DROP FUNCTION IF EXISTS create_test_referral_chain() CASCADE;

SELECT '=== 验证保留的核心视图 ===' as step;

-- 检查应该保留的视图
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'original_referral_tree',
    'spillover_matrix_tree', 
    'matrix_comparison_view',
    'matrix_statistics_view'
)
ORDER BY viewname;

SELECT '=== 验证保留的核心函数 ===' as step;

-- 检查应该保留的函数
SELECT 
    proname as function_name,
    pronargs as num_args,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN (
    'get_member_spillover_position',
    'get_matrix_layer_stats',
    'calculate_matrix_rewards',
    'trigger_matrix_rewards_on_join',
    'trigger_matrix_rewards_on_level_up',
    'trigger_layer1_right_reward',
    'get_nft_price'
)
ORDER BY proname;

SELECT '=== 清理旧表（如果存在） ===' as step;

-- 删除可能存在的测试或临时表
DROP TABLE IF EXISTS matrix_activity_log CASCADE;
DROP TABLE IF EXISTS referrals_backup_final CASCADE;
DROP TABLE IF EXISTS referrals_backup_before_fix CASCADE; 
DROP TABLE IF EXISTS referrals_matrix_backup CASCADE;
DROP TABLE IF EXISTS table_responsibilities CASCADE;
DROP TABLE IF EXISTS recursive_tree_logic CASCADE;
DROP TABLE IF EXISTS test_matrix_data CASCADE;
DROP TABLE IF EXISTS matrix_placement_test CASCADE;

SELECT '=== 验证核心表完整性 ===' as step;

-- 验证核心表结构
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
    (SELECT COUNT(*) FROM pg_stat_user_tables WHERE relname = t.table_name) as exists_check
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
AND t.table_name IN ('users', 'members', 'referrals', 'spillover_matrix')
ORDER BY table_name;

-- 检查数据完整性
SELECT '=== 数据完整性检查 ===' as step;

SELECT 
    'users' as table_name,
    COUNT(*) as record_count
FROM users
UNION ALL
SELECT 
    'members',
    COUNT(*)
FROM members  
UNION ALL
SELECT 
    'referrals',
    COUNT(*)
FROM referrals
UNION ALL
SELECT 
    'spillover_matrix',
    COUNT(*)
FROM spillover_matrix
ORDER BY table_name;

-- 检查spillover_matrix表的滑落情况
SELECT '=== 滑落Matrix分析 ===' as step;

SELECT 
    matrix_root,
    COUNT(*) as total_members,
    COUNT(CASE WHEN matrix_layer != original_layer THEN 1 END) as spillover_members,
    ROUND(
        (COUNT(CASE WHEN matrix_layer != original_layer THEN 1 END) * 100.0 / COUNT(*)), 
        2
    ) as spillover_percentage
FROM spillover_matrix
GROUP BY matrix_root
ORDER BY spillover_percentage DESC;

SELECT '=== 清理完成 ===' as final_status;

COMMIT;