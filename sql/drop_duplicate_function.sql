-- 删除重复的activate_nft_level1_membership函数
-- 只删除有问题的2参数版本，保留正确的3参数版本

DROP FUNCTION IF EXISTS activate_nft_level1_membership(text, text) CASCADE;

-- 验证删除结果
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'activate_nft_level1_membership'
AND n.nspname = 'public';