-- 删除多余的视图和冗余的奖励相关表

BEGIN;

SELECT '=== 删除多余的奖励相关视图和表 ===' as step;

-- 删除多余的奖励视图
DROP VIEW IF EXISTS individual_matrix_rewards CASCADE;
DROP VIEW IF EXISTS layer_rewards CASCADE; 
DROP VIEW IF EXISTS matrix_reward_summary CASCADE;
DROP VIEW IF EXISTS reward_notifications CASCADE;
DROP VIEW IF EXISTS reward_rollups CASCADE;
DROP VIEW IF EXISTS reward_rules CASCADE;
DROP VIEW IF EXISTS reward_structure_explanation CASCADE;
DROP VIEW IF EXISTS reward_summary CASCADE;
DROP VIEW IF EXISTS rewards_summary CASCADE;

-- 删除多余的奖励表（保留core表：reward_claims, reward_records, user_reward_balances）
DROP TABLE IF EXISTS individual_matrix_rewards CASCADE;
DROP TABLE IF EXISTS layer_rewards CASCADE;
DROP TABLE IF EXISTS matrix_reward_summary CASCADE;
DROP TABLE IF EXISTS reward_notifications CASCADE;
DROP TABLE IF EXISTS reward_rollups CASCADE;
DROP TABLE IF EXISTS reward_rules CASCADE;
DROP TABLE IF EXISTS reward_structure_explanation CASCADE;
DROP TABLE IF EXISTS reward_summary CASCADE;
DROP TABLE IF EXISTS rewards_summary CASCADE;

-- 删除旧的matrix相关视图（如果还有遗留）
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

-- 检查保留的核心表
SELECT '=== 验证保留的核心奖励表 ===' as step;

SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
    'preserved' as status
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
AND t.table_name IN (
    'reward_claims',
    'reward_records', 
    'user_reward_balances',
    'roll_up_rewards',
    'user_notifications',
    'bcc_release_logs'
)
ORDER BY table_name;

-- 检查清理后的函数
SELECT '=== 验证清理后的函数列表 ===' as step;

SELECT 
    proname as function_name,
    pronargs as num_args
FROM pg_proc 
WHERE proname LIKE '%reward%' OR proname LIKE '%bcc%' OR proname LIKE '%matrix%'
ORDER BY proname;

-- 检查清理后的视图
SELECT '=== 验证清理后的视图列表 ===' as step;

SELECT 
    schemaname,
    viewname
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

SELECT '=== 清理完成 ===' as final_status;

COMMIT;