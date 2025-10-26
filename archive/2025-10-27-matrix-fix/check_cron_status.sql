-- 检查 pg_cron 扩展是否启用
SELECT 
    extname,
    extversion,
    'pg_cron extension installed' as status
FROM pg_extension
WHERE extname = 'pg_cron';

-- 检查所有已设置的 cron jobs
SELECT
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM cron.job
ORDER BY jobid;

-- 检查 cron job 执行历史
SELECT
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
