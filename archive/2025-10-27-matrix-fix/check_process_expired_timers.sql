-- 获取 process_expired_timers 函数的定义
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'process_expired_timers' 
  AND pronamespace = 'public'::regnamespace;
