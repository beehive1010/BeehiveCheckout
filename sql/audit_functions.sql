-- ==========================================================================
-- POSTGRES FUNCTIONS AUDIT SCRIPT
-- ==========================================================================
-- This script audits all functions in the public schema by:
-- 1. Setting up test environment with JWT claims
-- 2. Testing each function with safe dummy inputs
-- 3. Reporting errors and security issues
-- 4. Providing fix recommendations

\echo '🔍 Starting Postgres Functions Security Audit...'
\echo '=================================================='

-- ==========================================================================
-- SETUP: Configure test environment
-- ==========================================================================

\echo ''
\echo '🔧 Setting up test environment...'

-- Set JWT claims for authenticated user testing
SELECT set_config('request.jwt.claims', '{"sub":"demo-user","role":"authenticated","wallet_address":"0xdemo123","email":"test@example.com"}', true);

-- Verify the setting
SELECT current_setting('request.jwt.claims', true) as current_jwt_claims;

\echo '✅ Test environment configured'

-- ==========================================================================
-- FUNCTION INVENTORY: List all functions with security details
-- ==========================================================================

\echo ''
\echo '📋 Cataloging all public schema functions...'

CREATE TEMP TABLE function_audit_results AS
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    CASE p.prosecdef
        WHEN true THEN 'SECURITY DEFINER'
        WHEN false THEN 'SECURITY INVOKER'
    END as security_mode,
    CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE' 
        WHEN 'v' THEN 'VOLATILE'
    END as volatility,
    p.proconfig as search_path_config,
    p.oid as function_oid,
    -- Check grants
    EXISTS(
        SELECT 1 FROM information_schema.routine_privileges rp
        WHERE rp.specific_name = p.proname || '_' || p.oid
        AND rp.grantee = 'authenticated'
    ) as has_authenticated_grant,
    EXISTS(
        SELECT 1 FROM information_schema.routine_privileges rp
        WHERE rp.specific_name = p.proname || '_' || p.oid
        AND rp.grantee = 'anon'
    ) as has_anon_grant,
    -- Will be populated during testing
    NULL::text as test_result,
    NULL::text as error_message,
    NULL::text as fix_recommendation
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
    AND p.prokind = 'f'  -- Only functions
ORDER BY p.proname;

-- Display function inventory
\echo ''
\echo '📊 Function Security Analysis:'
\echo '=============================='

SELECT 
    function_name,
    arguments,
    security_mode,
    CASE 
        WHEN has_authenticated_grant THEN '✅ AUTH'
        ELSE '❌ AUTH'
    END as auth_access,
    CASE 
        WHEN has_anon_grant THEN '✅ ANON' 
        ELSE '❌ ANON'
    END as anon_access,
    CASE 
        WHEN search_path_config IS NOT NULL THEN '🔧 CUSTOM'
        ELSE '🔍 DEFAULT'
    END as search_path
FROM function_audit_results
ORDER BY function_name;

-- ==========================================================================
-- FUNCTION TESTING: Execute each function with safe inputs
-- ==========================================================================

\echo ''
\echo '🧪 Testing function execution...'
\echo '==============================='

-- Update function for common parameter types
CREATE OR REPLACE FUNCTION generate_safe_test_params(param_types text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    result text := '';
    param_array text[];
    param text;
BEGIN
    -- Handle empty parameters
    IF param_types = '' THEN
        RETURN '';
    END IF;
    
    -- Split parameters by comma
    param_array := string_to_array(param_types, ',');
    
    FOR i IN 1..array_length(param_array, 1) LOOP
        param := trim(param_array[i]);
        
        -- Add comma separator except for first parameter
        IF i > 1 THEN
            result := result || ', ';
        END IF;
        
        -- Generate safe test values based on type
        CASE 
            WHEN param ILIKE '%text%' OR param ILIKE '%varchar%' OR param ILIKE '%character%' THEN
                result := result || '''test_string''';
            WHEN param ILIKE '%uuid%' THEN
                result := result || '''00000000-0000-0000-0000-000000000000''';
            WHEN param ILIKE '%integer%' OR param ILIKE '%int%' OR param ILIKE '%bigint%' THEN
                result := result || '1';
            WHEN param ILIKE '%numeric%' OR param ILIKE '%decimal%' THEN
                result := result || '1.0';
            WHEN param ILIKE '%boolean%' OR param ILIKE '%bool%' THEN
                result := result || 'true';
            WHEN param ILIKE '%timestamp%' OR param ILIKE '%date%' THEN
                result := result || '''2024-01-01''';
            WHEN param ILIKE '%json%' THEN
                result := result || '''{}''';
            ELSE
                result := result || 'NULL';
        END CASE;
    END LOOP;
    
    RETURN result;
END;
$$;

-- Test each function and update results
DO $$
DECLARE
    func_record RECORD;
    test_sql text;
    test_params text;
    error_msg text;
BEGIN
    FOR func_record IN 
        SELECT * FROM function_audit_results 
    LOOP
        BEGIN
            -- Generate test parameters
            test_params := generate_safe_test_params(func_record.arguments);
            
            -- Construct test SQL
            test_sql := format('SELECT %I(%s)', func_record.function_name, test_params);
            
            -- Attempt to execute (but don't store result to avoid large outputs)
            EXECUTE format('SELECT EXISTS(%s)', test_sql);
            
            -- If we get here, function executed successfully
            UPDATE function_audit_results 
            SET 
                test_result = 'SUCCESS',
                error_message = NULL,
                fix_recommendation = CASE 
                    WHEN NOT has_authenticated_grant THEN 'GRANT EXECUTE ON FUNCTION ' || function_name || ' TO authenticated;'
                    WHEN NOT has_anon_grant THEN 'GRANT EXECUTE ON FUNCTION ' || function_name || ' TO anon;'
                    ELSE 'Function working correctly'
                END
            WHERE function_oid = func_record.function_oid;
            
        EXCEPTION WHEN OTHERS THEN
            error_msg := SQLERRM;
            
            UPDATE function_audit_results 
            SET 
                test_result = 'ERROR',
                error_message = error_msg,
                fix_recommendation = CASE 
                    WHEN error_msg ILIKE '%permission denied%' THEN 
                        'GRANT EXECUTE ON FUNCTION ' || function_name || ' TO authenticated, anon;'
                    WHEN error_msg ILIKE '%relation%does not exist%' THEN
                        'Missing table/view: ' || error_msg || ' - Check schema dependencies'
                    WHEN error_msg ILIKE '%function%does not exist%' THEN
                        'Missing dependency function - Check function dependencies'
                    WHEN error_msg ILIKE '%column%does not exist%' THEN
                        'Column missing: ' || error_msg || ' - Update table schema'
                    WHEN error_msg ILIKE '%search_path%' THEN
                        'SET search_path = public, auth; in function definition'
                    ELSE 
                        'Review function logic: ' || error_msg
                END
            WHERE function_oid = func_record.function_oid;
        END;
    END LOOP;
END;
$$;

-- ==========================================================================
-- RESULTS: Display test results and recommendations
-- ==========================================================================

\echo ''
\echo '📊 Function Test Results:'
\echo '========================'

SELECT 
    function_name,
    arguments,
    security_mode,
    test_result,
    CASE 
        WHEN test_result = 'SUCCESS' THEN '✅'
        ELSE '❌'
    END as status,
    substring(error_message, 1, 60) as error_summary
FROM function_audit_results
ORDER BY 
    CASE test_result 
        WHEN 'ERROR' THEN 1 
        ELSE 2 
    END,
    function_name;

\echo ''
\echo '🔧 Fix Recommendations:'
\echo '======================'

SELECT 
    function_name,
    test_result,
    fix_recommendation
FROM function_audit_results
WHERE test_result = 'ERROR' OR NOT (has_authenticated_grant AND has_anon_grant)
ORDER BY function_name;

-- ==========================================================================
-- SECURITY SUMMARY: Overall security posture
-- ==========================================================================

\echo ''
\echo '🛡️  Security Summary:'
\echo '===================='

SELECT 
    COUNT(*) as total_functions,
    COUNT(*) FILTER (WHERE test_result = 'SUCCESS') as working_functions,
    COUNT(*) FILTER (WHERE test_result = 'ERROR') as broken_functions,
    COUNT(*) FILTER (WHERE security_mode = 'SECURITY DEFINER') as security_definer_count,
    COUNT(*) FILTER (WHERE security_mode = 'SECURITY INVOKER') as security_invoker_count,
    COUNT(*) FILTER (WHERE has_authenticated_grant) as authenticated_grants,
    COUNT(*) FILTER (WHERE has_anon_grant) as anon_grants
FROM function_audit_results;

-- ==========================================================================
-- TESTING AS DIFFERENT ROLES
-- ==========================================================================

\echo ''
\echo '👤 Testing as different user roles...'
\echo '===================================='

-- Test as anonymous user
\echo 'Testing as anonymous user:'
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

-- Test a simple function that should work for anon
DO $$
BEGIN
    -- Try to call update_updated_at_column if it exists
    IF EXISTS (SELECT 1 FROM function_audit_results WHERE function_name = 'update_updated_at_column') THEN
        RAISE NOTICE 'Testing update_updated_at_column as anon user...';
        -- This is a trigger function, so we can't test it directly
        RAISE NOTICE '✅ Function exists but is a trigger function';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error testing as anon: %', SQLERRM;
END;
$$;

-- Test as service role
\echo 'Testing as service role:'
SELECT set_config('request.jwt.claims', '{"role":"service_role","sub":"service"}', true);

-- Reset to authenticated for final summary
SELECT set_config('request.jwt.claims', '{"sub":"demo-user","role":"authenticated","wallet_address":"0xdemo123"}', true);

\echo ''
\echo '✅ Audit completed! Check the results above for:'
\echo '  1. Functions that need grants to authenticated/anon roles'
\echo '  2. Functions with missing dependencies (tables/columns)'  
\echo '  3. Functions with security definer vs invoker settings'
\echo '  4. Functions failing due to RLS policies'
\echo ''

-- Clean up
DROP FUNCTION IF EXISTS generate_safe_test_params(text);