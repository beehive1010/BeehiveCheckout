-- Verify all database functions (例程) are correct for 3x3 matrix system
-- Check key functions that might reference matrix positions or calculations

\echo '🔍 Verifying database functions for 3x3 matrix system...'

-- Check analyze_matrix_structure function
\echo ''
\echo '1. Checking analyze_matrix_structure function:'
SELECT 'analyze_matrix_structure' as function_name,
       CASE 
           WHEN prosrc LIKE '%L_positions%' AND prosrc LIKE '%M_positions%' AND prosrc LIKE '%R_positions%' 
           THEN '✅ Correctly uses L, M, R positions for 3x3 matrix'
           ELSE '⚠️  May need updates for 3x3 matrix'
       END as status
FROM pg_proc 
WHERE proname = 'analyze_matrix_structure';

-- Check calculate_matrix_parent function  
\echo ''
\echo '2. Checking calculate_matrix_parent function:'
SELECT 'calculate_matrix_parent' as function_name,
       CASE 
           WHEN prosrc LIKE '%>= 3%' OR prosrc LIKE '%< 3%'
           THEN '✅ Correctly uses 3 children limit for 3x3 matrix'
           ELSE '⚠️  May use wrong child count limit'
       END as status
FROM pg_proc 
WHERE proname = 'calculate_matrix_parent';

-- Check get_next_matrix_position function
\echo ''
\echo '3. Checking get_next_matrix_position function:'
SELECT 'get_next_matrix_position' as function_name,
       CASE 
           WHEN prosrc LIKE '%L%' AND prosrc LIKE '%M%' AND prosrc LIKE '%R%'
           THEN '✅ Uses L, M, R positions for 3x3 matrix'
           WHEN prosrc LIKE '%Left%' AND prosrc LIKE '%Right%' AND NOT prosrc LIKE '%Middle%'
           THEN '❌ Uses binary positions - needs 3x3 update'
           ELSE '⚠️  Position logic unclear'
       END as status
FROM pg_proc 
WHERE proname = 'get_next_matrix_position';

-- Check place_member_in_matrix function
\echo ''
\echo '4. Checking place_member_in_matrix function:'
SELECT 'place_member_in_matrix' as function_name,
       CASE 
           WHEN prosrc LIKE '%L%' AND prosrc LIKE '%M%' AND prosrc LIKE '%R%'
           THEN '✅ Uses L, M, R positions for 3x3 matrix'
           ELSE '⚠️  May need 3x3 matrix position updates'
       END as status
FROM pg_proc 
WHERE proname = 'place_member_in_matrix';

-- Check functions that calculate matrix positions/rewards
\echo ''
\echo '5. Functions that may need verification:'
SELECT proname as function_name,
       CASE 
           WHEN proname LIKE '%matrix%' THEN 'Matrix-related function'
           WHEN proname LIKE '%position%' THEN 'Position-related function'  
           WHEN proname LIKE '%layer%' THEN 'Layer-related function'
           WHEN proname LIKE '%reward%' THEN 'Reward calculation function'
           ELSE 'Other function'
       END as category
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND prokind = 'f'
AND (proname LIKE '%matrix%' OR proname LIKE '%position%' OR proname LIKE '%layer%' OR proname LIKE '%reward%')
ORDER BY proname;

-- Test the analyze_matrix_structure function with current data
\echo ''
\echo '6. Testing analyze_matrix_structure with current data:'
SELECT * FROM analyze_matrix_structure() LIMIT 3;

-- Check if any functions reference old 2^layer calculations
\echo ''
\echo '7. Functions that might use 2^layer instead of 3^layer:'
SELECT proname,
       CASE 
           WHEN prosrc LIKE '%POWER(2,%' THEN '❌ Uses 2^layer (binary matrix)'
           WHEN prosrc LIKE '%POWER(3,%' THEN '✅ Uses 3^layer (3x3 matrix)'
           WHEN prosrc LIKE '%power(2,%' THEN '❌ Uses 2^layer (binary matrix)'
           WHEN prosrc LIKE '%power(3,%' THEN '✅ Uses 3^layer (3x3 matrix)'
           ELSE '✓ No power calculations found'
       END as matrix_calculation_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND prokind = 'f'
AND (prosrc LIKE '%POWER(%' OR prosrc LIKE '%power(%');

\echo ''
\echo '✅ Database function verification completed!'
\echo 'Review the results above to identify functions that may need updates for the 3x3 matrix system.'