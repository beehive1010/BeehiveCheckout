-- RLS (Row Level Security) Audit Script
-- This script audits all tables with RLS enabled and identifies gaps

-- ==========================================================================
-- PART 1: ENUMERATE ALL TABLES WITH RLS ENABLED
-- ==========================================================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    -- Count policies per operation type
    (SELECT count(*) FROM pg_policies pp WHERE pp.schemaname = t.schemaname AND pp.tablename = t.tablename AND 'SELECT' = ANY(string_to_array(upper(pp.cmd), ','))) as select_policies,
    (SELECT count(*) FROM pg_policies pp WHERE pp.schemaname = t.schemaname AND pp.tablename = t.tablename AND 'INSERT' = ANY(string_to_array(upper(pp.cmd), ','))) as insert_policies,
    (SELECT count(*) FROM pg_policies pp WHERE pp.schemaname = t.schemaname AND pp.tablename = t.tablename AND 'UPDATE' = ANY(string_to_array(upper(pp.cmd), ','))) as update_policies,
    (SELECT count(*) FROM pg_policies pp WHERE pp.schemaname = t.schemaname AND pp.tablename = t.tablename AND 'DELETE' = ANY(string_to_array(upper(pp.cmd), ','))) as delete_policies,
    (SELECT count(*) FROM pg_policies pp WHERE pp.schemaname = t.schemaname AND pp.tablename = t.tablename AND upper(pp.cmd) = 'ALL') as all_policies
FROM pg_tables t
WHERE schemaname = 'public' 
    AND rowsecurity = true
ORDER BY tablename;

-- ==========================================================================
-- PART 2: DETAILED POLICY ANALYSIS PER TABLE
-- ==========================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operations,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==========================================================================
-- PART 3: IDENTIFY UNCOVERED OPERATIONS
-- ==========================================================================

WITH table_operations AS (
    SELECT 
        t.schemaname,
        t.tablename,
        ops.operation
    FROM pg_tables t
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS ops(operation)
    WHERE t.schemaname = 'public' 
        AND t.rowsecurity = true
),
covered_operations AS (
    SELECT DISTINCT
        p.schemaname,
        p.tablename,
        CASE 
            WHEN upper(p.cmd) = 'ALL' THEN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'])
            ELSE upper(p.cmd)
        END as operation
    FROM pg_policies p
    WHERE p.schemaname = 'public'
)
SELECT 
    to_.schemaname,
    to_.tablename,
    to_.operation,
    'UNCOVERED' as status,
    CASE to_.operation
        WHEN 'SELECT' THEN 'Users cannot read their own records'
        WHEN 'INSERT' THEN 'Users cannot create new records'
        WHEN 'UPDATE' THEN 'Users cannot modify their own records'
        WHEN 'DELETE' THEN 'Users cannot delete their own records'
    END as issue_description
FROM table_operations to_
LEFT JOIN covered_operations co 
    ON to_.schemaname = co.schemaname 
    AND to_.tablename = co.tablename 
    AND to_.operation = co.operation
WHERE co.operation IS NULL
ORDER BY to_.tablename, to_.operation;

-- ==========================================================================
-- PART 4: TEST MATRIX SETUP
-- ==========================================================================

-- Test as authenticated user with sub=demo
SELECT set_config('request.jwt.claims', '{"sub":"demo","role":"authenticated","wallet_address":"0xdemo123"}', true);
SELECT current_setting('request.jwt.claims', true) as current_jwt_claims;

-- Test basic operations on key tables (adjust table names as needed)
-- These will be used in the test matrix below