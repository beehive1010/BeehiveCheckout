-- Test script to verify all database fixes for BEEHIVE project
-- This script tests the created views and functions to ensure they work correctly

-- Test 1: Check if rewards_stats_view exists and works
SELECT 'Testing rewards_stats_view...' as test_name;
SELECT COUNT(*) as view_count FROM rewards_stats_view;

-- Test 2: Check if get_user_rewards_stats function works
SELECT 'Testing get_user_rewards_stats function...' as test_name;
SELECT wallet_address, total_earned, total_claimable, has_claimable_rewards 
FROM get_user_rewards_stats('0x7622c3BC5B44531D1c8ffce407f5A7295D1AA9b4');

-- Test 3: Check if matrix_referrals_tree_view exists and works
SELECT 'Testing matrix_referrals_tree_view...' as test_name;
SELECT COUNT(*) as view_count FROM matrix_referrals_tree_view;

-- Test 4: Test matrix view with specific root wallet
SELECT 'Testing matrix view with specific root...' as test_name;
SELECT member_wallet, matrix_layer, matrix_position, is_activated 
FROM matrix_referrals_tree_view 
WHERE matrix_root_wallet = '0x0000000000000000000000000000000000000001' 
LIMIT 5;

-- Test 5: Check if other reward views exist
SELECT 'Testing other reward views...' as test_name;
SELECT COUNT(*) as corrected_rewards_count FROM corrected_rewards_view;
SELECT COUNT(*) as reward_claims_count FROM reward_claims_dashboard;

-- Test 6: Test referrals_stats_view 
SELECT 'Testing referrals_stats_view...' as test_name;
SELECT COUNT(*) as referrals_stats_count FROM referrals_stats_view;

-- Summary
SELECT 'All tests completed!' as test_result;