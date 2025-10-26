-- Test 1: Check if v_matrix_tree_19_layers view exists
SELECT tablename, schemaname
FROM pg_catalog.pg_tables
WHERE schemaname = 'public' AND tablename LIKE '%matrix%tree%';

SELECT viewname, schemaname
FROM pg_catalog.pg_views
WHERE schemaname = 'public' AND viewname LIKE '%matrix%tree%';

-- Test 2: Check wallet address storage format in matrix_referrals
SELECT member_wallet, matrix_root_wallet, parent_wallet, LOWER(member_wallet) as lower_member
FROM matrix_referrals
LIMIT 5;

-- Test 3: Test case-sensitive query
SELECT member_wallet FROM matrix_referrals
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
AND parent_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
LIMIT 3;

-- Test 4: Test case-insensitive query
SELECT member_wallet FROM matrix_referrals
WHERE LOWER(matrix_root_wallet) = LOWER('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab')
AND LOWER(parent_wallet) = LOWER('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab')
LIMIT 3;
