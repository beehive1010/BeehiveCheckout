-- 检查 process_expired_timers 函数是否存在
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname LIKE '%expired_timer%'
  OR proname LIKE '%expired_reward%';

-- 手动执行一次，看看结果
SELECT process_expired_timers();
