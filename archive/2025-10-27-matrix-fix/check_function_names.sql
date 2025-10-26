-- 查找所有 timer 相关的函数
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE '%timer%'
  AND pronamespace = 'public'::regnamespace
ORDER BY proname;

-- 尝试调用 cron 使用的函数名
SELECT process_expired_timers();
