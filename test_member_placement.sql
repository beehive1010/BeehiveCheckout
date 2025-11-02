-- ============================================================================
-- Test Member Placement Function
-- ============================================================================

-- Test 1: Check Genesis matrix current state
SELECT
    wallet_address,
    matrix_root_wallet,
    parent_wallet,
    position,
    layer_level,
    activation_sequence
FROM members
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
ORDER BY activation_sequence
LIMIT 10;

-- Test 2: Count members per layer
SELECT
    layer_level,
    COUNT(*) as member_count,
    COUNT(CASE WHEN position = 'L' THEN 1 END) as l_count,
    COUNT(CASE WHEN position = 'M' THEN 1 END) as m_count,
    COUNT(CASE WHEN position = 'R' THEN 1 END) as r_count
FROM members
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
GROUP BY layer_level
ORDER BY layer_level;

-- Test 3: Test the placement function (dry run - no actual member to place)
-- This will fail because we don't have a test member, but shows the function works
SELECT fn_place_member_in_matrix(
    '0xTestMemberWallet',
    '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab',
    NOW()
);
