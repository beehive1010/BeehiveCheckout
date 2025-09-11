-- 彻底清理所有旧的matrix相关表、视图、函数

BEGIN;

-- 1. 删除所有旧的matrix相关函数
SELECT '=== 清理所有旧函数 ===' as step;

DROP FUNCTION IF EXISTS analyze_matrix_structure() CASCADE;
DROP FUNCTION IF EXISTS build_members_recursive_matrix() CASCADE;
DROP FUNCTION IF EXISTS build_recursive_matrix() CASCADE;
DROP FUNCTION IF EXISTS build_simple_spillover_matrix() CASCADE;
DROP FUNCTION IF EXISTS calculate_matrix_parent(text, text) CASCADE;
DROP FUNCTION IF EXISTS check_matrix_health() CASCADE;
DROP FUNCTION IF EXISTS find_matrix_placement(character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS find_matrix_placement(text, text) CASCADE;
DROP FUNCTION IF EXISTS generate_complete_recursive_matrix() CASCADE;
DROP FUNCTION IF EXISTS get_matrix_system_overview() CASCADE;
DROP FUNCTION IF EXISTS get_member_matrix(text) CASCADE;
DROP FUNCTION IF EXISTS place_members_in_3x3_matrix() CASCADE;
DROP FUNCTION IF EXISTS rebuild_complete_matrix() CASCADE;
DROP FUNCTION IF EXISTS update_matrix_layer_summary() CASCADE;

-- 2. 删除所有旧的视图
SELECT '=== 清理所有旧视图 ===' as step;

DROP VIEW IF EXISTS original_referral_tree CASCADE;
DROP VIEW IF EXISTS spillover_matrix_tree CASCADE;
DROP VIEW IF EXISTS matrix_comparison_view CASCADE;
DROP VIEW IF EXISTS matrix_statistics_view CASCADE;
DROP VIEW IF EXISTS corrected_individual_matrices CASCADE;
DROP VIEW IF EXISTS corrected_matrix_stats CASCADE;
DROP VIEW IF EXISTS corrected_individual_rewards CASCADE;
DROP VIEW IF EXISTS matrix_verification CASCADE;
DROP VIEW IF EXISTS individual_matrix_layer_summary CASCADE;
DROP VIEW IF EXISTS potential_future_rewards CASCADE;
DROP VIEW IF EXISTS matrix_stats CASCADE;
DROP VIEW IF EXISTS member_layer1_analysis CASCADE;
DROP VIEW IF EXISTS layer1_member_stats CASCADE;
DROP VIEW IF EXISTS reward_claims_dashboard CASCADE;

-- 3. 删除所有旧的表（保留核心表：users, members, referrals, spillover_matrix）
SELECT '=== 清理所有旧表 ===' as step;

DROP TABLE IF EXISTS matrix_activity_log CASCADE;
DROP TABLE IF EXISTS referrals_backup_final CASCADE;
DROP TABLE IF EXISTS referrals_backup_before_fix CASCADE;
DROP TABLE IF EXISTS referrals_matrix_backup CASCADE;
DROP TABLE IF EXISTS table_responsibilities CASCADE;
DROP TABLE IF EXISTS recursive_tree_logic CASCADE;

-- 4. 保留的核心函数检查
SELECT '=== 保留的核心函数 ===' as step;
SELECT proname FROM pg_proc WHERE proname IN (
    'get_member_spillover_position',
    'get_matrix_layer_stats', 
    'calculate_matrix_rewards',
    'trigger_matrix_rewards_on_join',
    'create_referral_link',
    'generate_referral_token',
    'process_referral_link'
) ORDER BY proname;

-- 5. 验证保留的核心表
SELECT '=== 核心表验证 ===' as step;
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
AND t.table_name IN ('users', 'members', 'referrals', 'spillover_matrix')
ORDER BY table_name;

-- 6. 验证spillover_matrix表结构
SELECT '=== spillover_matrix表结构验证 ===' as step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'spillover_matrix' 
ORDER BY ordinal_position;

-- 7. 最终数据统计
SELECT '=== 最终数据统计 ===' as step;
SELECT 
    'users' as table_name,
    COUNT(*) as record_count,
    '预注册用户' as description
FROM users
UNION ALL
SELECT 
    'members',
    COUNT(*),
    '活跃会员'
FROM members  
UNION ALL
SELECT 
    'referrals',
    COUNT(*),
    '原始归递关系'
FROM referrals
UNION ALL
SELECT 
    'spillover_matrix',
    COUNT(*),
    '滑落后Matrix'
FROM spillover_matrix
ORDER BY table_name;

SELECT '=== 清理完成！ ===' as final_status;

COMMIT;