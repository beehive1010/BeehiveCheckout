-- List all functions in public schema with detailed information
-- This query extracts function signatures, security settings, and grants

SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE' 
        WHEN 'v' THEN 'VOLATILE'
    END as volatility,
    CASE p.prosecdef
        WHEN true THEN 'SECURITY DEFINER'
        WHEN false THEN 'SECURITY INVOKER'
    END as security,
    p.proconfig as config_settings,
    pg_get_functiondef(p.oid) as function_definition,
    -- Get grants information
    (SELECT string_agg(
        format('%s: %s', 
            CASE r.rolname 
                WHEN 'anon' THEN 'anon'
                WHEN 'authenticated' THEN 'authenticated'
                WHEN 'service_role' THEN 'service_role'
                ELSE r.rolname 
            END,
            privilege_type
        ), ', ' ORDER BY r.rolname, privilege_type
    ) FROM information_schema.routine_privileges rp
    JOIN pg_roles r ON r.rolname = rp.grantee
    WHERE rp.specific_name = p.proname || '_' || p.oid
        AND rp.routine_schema = n.nspname
        AND r.rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
    ) as grants,
    p.oid as function_oid
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
    AND p.prokind = 'f'  -- Only functions, not procedures
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);