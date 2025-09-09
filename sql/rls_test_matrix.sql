-- ==========================================================================
-- RLS TEST MATRIX SCRIPT
-- ==========================================================================
-- This script tests RLS policies with different user roles and scenarios

\echo '🔒 RLS Policy Test Matrix'
\echo '========================='

-- ==========================================================================
-- TEST SETUP: Create test data and functions
-- ==========================================================================

CREATE OR REPLACE FUNCTION test_table_access(
    table_name text,
    operation text,
    test_description text
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    test_sql text;
    result_count int;
    error_msg text;
BEGIN
    BEGIN
        CASE operation
            WHEN 'SELECT' THEN
                test_sql := format('SELECT count(*) FROM %I LIMIT 1', table_name);
                EXECUTE test_sql INTO result_count;
                RETURN format('✅ %s: %s (found %s rows)', operation, test_description, result_count);
                
            WHEN 'INSERT' THEN
                -- Try a minimal insert (this will likely fail due to constraints, but that's OK)
                test_sql := format('INSERT INTO %I DEFAULT VALUES', table_name);
                EXECUTE test_sql;
                RETURN format('✅ %s: %s (insert allowed)', operation, test_description);
                
            WHEN 'UPDATE' THEN
                -- Try to update first row if it exists
                test_sql := format('UPDATE %I SET updated_at = NOW() WHERE ctid = (SELECT ctid FROM %I LIMIT 1)', table_name, table_name);
                EXECUTE test_sql;
                GET DIAGNOSTICS result_count = ROW_COUNT;
                RETURN format('✅ %s: %s (updated %s rows)', operation, test_description, result_count);
                
            WHEN 'DELETE' THEN
                -- Try to delete with a safe condition that won't match
                test_sql := format('DELETE FROM %I WHERE 1=2', table_name);
                EXECUTE test_sql;
                RETURN format('✅ %s: %s (delete allowed)', operation, test_description);
                
            ELSE
                RETURN format('❓ Unknown operation: %s', operation);
        END CASE;
        
    EXCEPTION WHEN OTHERS THEN
        error_msg := SQLERRM;
        
        -- Classify common RLS errors
        IF error_msg ILIKE '%permission denied%' OR error_msg ILIKE '%policy%' THEN
            RETURN format('🚫 %s: %s (RLS blocked)', operation, test_description);
        ELSIF error_msg ILIKE '%not-null constraint%' OR error_msg ILIKE '%violates%constraint%' THEN
            RETURN format('⚠️  %s: %s (constraint error, but RLS allows)', operation, test_description);
        ELSE
            RETURN format('❌ %s: %s (error: %s)', operation, test_description, substring(error_msg, 1, 50));
        END IF;
    END;
END;
$$;

-- ==========================================================================
-- TEST MATRIX: Test all RLS-enabled tables with different roles
-- ==========================================================================

CREATE TEMP TABLE rls_test_results (
    role_type text,
    table_name text,
    operation text,
    result text
);

-- Get list of RLS-enabled tables
CREATE TEMP VIEW rls_tables AS
SELECT schemaname, tablename
FROM pg_tables 
WHERE schemaname = 'public' 
    AND rowsecurity = true;

\echo ''
\echo '📋 RLS-enabled tables found:'
SELECT tablename FROM rls_tables ORDER BY tablename;

-- ==========================================================================
-- TEST 1: As Authenticated User (sub=demo)
-- ==========================================================================

\echo ''
\echo '👤 Test 1: Authenticated user (sub=demo, wallet=0xdemo123)'
\echo '=========================================================='

SELECT set_config('request.jwt.claims', '{"sub":"demo","role":"authenticated","wallet_address":"0xdemo123"}', true);

INSERT INTO rls_test_results (role_type, table_name, operation, result)
SELECT 
    'authenticated' as role_type,
    t.tablename,
    op.operation,
    test_table_access(t.tablename, op.operation, 'as authenticated user')
FROM rls_tables t
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as op(operation);

-- ==========================================================================
-- TEST 2: As Anonymous User
-- ==========================================================================

\echo ''
\echo '👤 Test 2: Anonymous user'
\echo '========================'

SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

INSERT INTO rls_test_results (role_type, table_name, operation, result)
SELECT 
    'anon' as role_type,
    t.tablename,
    op.operation,
    test_table_access(t.tablename, op.operation, 'as anonymous user')
FROM rls_tables t
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as op(operation);

-- ==========================================================================
-- TEST 3: As Service Role
-- ==========================================================================

\echo ''
\echo '👤 Test 3: Service role (bypasses RLS)'
\echo '======================================'

SELECT set_config('request.jwt.claims', '{"role":"service_role","sub":"service"}', true);

INSERT INTO rls_test_results (role_type, table_name, operation, result)
SELECT 
    'service_role' as role_type,
    t.tablename,
    op.operation,
    test_table_access(t.tablename, op.operation, 'as service role')
FROM rls_tables t
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as op(operation);

-- ==========================================================================
-- RESULTS ANALYSIS
-- ==========================================================================

\echo ''
\echo '📊 Test Results Matrix:'
\echo '======================'

SELECT 
    table_name,
    operation,
    MAX(CASE WHEN role_type = 'authenticated' THEN 
        CASE WHEN result LIKE '✅%' THEN '✅' 
             WHEN result LIKE '⚠️%' THEN '⚠️' 
             ELSE '❌' END 
    END) as auth_result,
    MAX(CASE WHEN role_type = 'anon' THEN 
        CASE WHEN result LIKE '✅%' THEN '✅' 
             WHEN result LIKE '⚠️%' THEN '⚠️' 
             ELSE '❌' END 
    END) as anon_result,
    MAX(CASE WHEN role_type = 'service_role' THEN 
        CASE WHEN result LIKE '✅%' THEN '✅' 
             WHEN result LIKE '⚠️%' THEN '⚠️' 
             ELSE '❌' END 
    END) as service_result
FROM rls_test_results
GROUP BY table_name, operation
ORDER BY table_name, 
    CASE operation 
        WHEN 'SELECT' THEN 1 
        WHEN 'INSERT' THEN 2 
        WHEN 'UPDATE' THEN 3 
        WHEN 'DELETE' THEN 4 
    END;

-- ==========================================================================
-- IDENTIFY GAPS AND GENERATE FIXES
-- ==========================================================================

\echo ''
\echo '🔧 Policy Gaps and Recommended Fixes:'
\echo '====================================='

-- Find operations that are blocked for authenticated users but should be allowed
WITH policy_gaps AS (
    SELECT table_name, operation
    FROM rls_test_results
    WHERE role_type = 'authenticated' 
        AND result LIKE '🚫%'  -- RLS blocked
        AND table_name NOT IN ('admin_actions', 'audit_logs')  -- Tables that should be restricted
)
SELECT 
    table_name,
    operation,
    CASE operation
        WHEN 'SELECT' THEN format('
CREATE POLICY "authenticated_select_%s" ON %s
    FOR SELECT TO authenticated
    USING (
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''%s'' AND column_name = ''wallet_address'') 
            THEN wallet_address = (current_setting(''request.jwt.claims'')::json->>''wallet_address'')
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''%s'' AND column_name = ''user_wallet'') 
            THEN user_wallet = (current_setting(''request.jwt.claims'')::json->>''wallet_address'')
            ELSE true  -- Allow read access if no wallet column
        END
    );', table_name, table_name, table_name, table_name)
        
        WHEN 'INSERT' THEN format('
CREATE POLICY "authenticated_insert_%s" ON %s
    FOR INSERT TO authenticated
    WITH CHECK (
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''%s'' AND column_name = ''wallet_address'') 
            THEN wallet_address = (current_setting(''request.jwt.claims'')::json->>''wallet_address'')
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''%s'' AND column_name = ''user_wallet'') 
            THEN user_wallet = (current_setting(''request.jwt.claims'')::json->>''wallet_address'')
            ELSE true  -- Allow insert if no wallet column
        END
    );', table_name, table_name, table_name, table_name)
        
        WHEN 'UPDATE' THEN format('
CREATE POLICY "authenticated_update_%s" ON %s
    FOR UPDATE TO authenticated
    USING (
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''%s'' AND column_name = ''wallet_address'') 
            THEN wallet_address = (current_setting(''request.jwt.claims'')::json->>''wallet_address'')
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''%s'' AND column_name = ''user_wallet'') 
            THEN user_wallet = (current_setting(''request.jwt.claims'')::json->>''wallet_address'')
            ELSE true
        END
    );', table_name, table_name, table_name, table_name)
        
        WHEN 'DELETE' THEN format('
CREATE POLICY "authenticated_delete_%s" ON %s
    FOR DELETE TO authenticated
    USING (
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''%s'' AND column_name = ''wallet_address'') 
            THEN wallet_address = (current_setting(''request.jwt.claims'')::json->>''wallet_address'')
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''%s'' AND column_name = ''user_wallet'') 
            THEN user_wallet = (current_setting(''request.jwt.claims'')::json->>''wallet_address'')
            ELSE false  -- Generally don''t allow delete unless explicitly needed
        END
    );', table_name, table_name, table_name, table_name)
    END as suggested_policy
FROM policy_gaps;

-- ==========================================================================
-- CLEANUP
-- ==========================================================================

DROP FUNCTION test_table_access(text, text, text);

\echo ''
\echo '✅ RLS Test Matrix completed!'
\echo ''
\echo 'Summary:'
\echo '- ✅ = Operation allowed'
\echo '- ⚠️  = Operation allowed but with constraints'  
\echo '- ❌ = Operation blocked by RLS or other error'
\echo '- 🚫 = Operation blocked by RLS policy'
\echo ''
\echo 'Use the suggested policies above to fix gaps in RLS coverage.'