-- 刷新 PostgREST schema cache
-- 这会强制 PostgREST 重新加载数据库 schema，识别所有表和列

NOTIFY pgrst, 'reload schema';

SELECT 'Schema cache reload notification sent' AS status;
