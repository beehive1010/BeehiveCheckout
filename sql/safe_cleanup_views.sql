-- 安全删除多余的视图和表

BEGIN;

SELECT '=== 安全清理多余对象 ===' as step;

-- 1. 首先检查哪些是视图，哪些是表
SELECT '=== 检查对象类型 ===' as check_step;

SELECT 
    schemaname,
    viewname as object_name,
    'VIEW' as object_type
FROM pg_views 
WHERE schemaname = 'public'
AND viewname LIKE '%reward%'

UNION ALL

SELECT 
    schemaname,
    tablename as object_name,
    'TABLE' as object_type  
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%reward%'

ORDER BY object_type, object_name;

-- 2. 安全删除确认存在的视图
DO $$
DECLARE
    view_name TEXT;
    view_list TEXT[] := ARRAY[
        'individual_matrix_rewards',
        'matrix_reward_summary', 
        'reward_notifications',
        'reward_structure_explanation',
        'reward_summary',
        'rewards_summary'
    ];
BEGIN
    FOREACH view_name IN ARRAY view_list LOOP
        IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = view_name AND schemaname = 'public') THEN
            EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(view_name) || ' CASCADE';
            RAISE NOTICE 'Dropped view: %', view_name;
        END IF;
    END LOOP;
END$$;

-- 3. 安全删除确认存在的表
DO $$
DECLARE
    table_name TEXT;
    table_list TEXT[] := ARRAY[
        'individual_matrix_rewards',
        'matrix_reward_summary',
        'reward_notifications', 
        'reward_rollups',
        'reward_rules',
        'reward_structure_explanation',
        'reward_summary',
        'rewards_summary'
    ];
BEGIN
    FOREACH table_name IN ARRAY table_list LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = table_name AND schemaname = 'public') THEN
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(table_name) || ' CASCADE';
            RAISE NOTICE 'Dropped table: %', table_name;
        END IF;
    END LOOP;
END$$;

-- 4. 检查保留的核心对象
SELECT '=== 保留的核心对象验证 ===' as preserved_step;

SELECT 
    'TABLE' as object_type,
    tablename as object_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN (
    'reward_claims',
    'reward_records', 
    'user_reward_balances',
    'roll_up_rewards',
    'user_notifications',
    'bcc_release_logs',
    'layer_rewards'
)

UNION ALL

SELECT 
    'VIEW' as object_type,
    viewname as object_name,
    0 as column_count
FROM pg_views
WHERE schemaname = 'public' 
AND viewname IN (
    'original_referral_tree',
    'spillover_matrix_tree', 
    'matrix_comparison_view',
    'matrix_statistics_view'
)

ORDER BY object_type, object_name;

-- 5. 检查所有剩余的奖励相关对象
SELECT '=== 所有剩余奖励相关对象 ===' as remaining_step;

SELECT 
    'TABLE' as type,
    tablename as name
FROM pg_tables
WHERE schemaname = 'public' 
AND (tablename LIKE '%reward%' OR tablename LIKE '%bcc%')

UNION ALL

SELECT 
    'VIEW' as type,
    viewname as name
FROM pg_views
WHERE schemaname = 'public'
AND (viewname LIKE '%reward%' OR viewname LIKE '%bcc%')

UNION ALL

SELECT 
    'FUNCTION' as type,
    proname as name
FROM pg_proc
WHERE (proname LIKE '%reward%' OR proname LIKE '%bcc%')

ORDER BY type, name;

SELECT '=== 安全清理完成 ===' as final_status;

COMMIT;