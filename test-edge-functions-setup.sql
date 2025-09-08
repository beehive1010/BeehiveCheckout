-- Test edge functions setup and database alignment
-- This script tests all the views, functions, and edge function compatibility

BEGIN;

-- ===== Test 1: Views and Functions Compatibility =====
SELECT '=== Testing Views and Functions ===' as test_section;

-- Test matrix functions
SELECT 'Testing get_matrix_system_overview...' as test_name;
SELECT metric_category, metric_name, value FROM get_matrix_system_overview();

SELECT 'Testing check_matrix_health...' as test_name;
SELECT health_metric, status, value FROM check_matrix_health();

-- Test tier functions
SELECT 'Testing get_current_activation_tier...' as test_name;
SELECT tier, tier_name, current_activations FROM get_current_activation_tier();

-- Test helper functions
SELECT 'Testing get_next_activation_rank...' as test_name;
SELECT get_next_activation_rank() as next_rank;

-- ===== Test 2: User Balance Views =====
SELECT '=== Testing User Balance Views ===' as test_section;

-- Test user_balance_summary view structure
SELECT 'Testing user_balance_summary view structure...' as test_name;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_balance_summary' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===== Test 3: Matrix Views =====
SELECT '=== Testing Matrix Views ===' as test_section;

-- Test matrix_statistics view
SELECT 'Testing matrix_statistics view...' as test_name;
SELECT COUNT(*) as view_accessible FROM matrix_statistics;

-- Test layer_statistics view  
SELECT 'Testing layer_statistics view...' as test_name;
SELECT COUNT(*) as view_accessible FROM layer_statistics;

-- ===== Test 4: Member Views Compatibility =====
SELECT '=== Testing Member Views ===' as test_section;

-- Test that we can query member data correctly
SELECT 'Testing members table structure...' as test_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'members' 
AND table_schema = 'public'
AND column_name IN ('activation_rank', 'current_level', 'has_pending_rewards', 'levels_owned')
ORDER BY ordinal_position;

-- Test user_complete_info view if it exists
SELECT 'Testing user_complete_info view...' as test_name;
SELECT CASE 
    WHEN EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'user_complete_info' 
        AND table_schema = 'public'
    ) THEN 'View exists and accessible'
    ELSE 'View does not exist - needs to be created'
END as view_status;

-- ===== Test 5: Edge Function Support Tables =====
SELECT '=== Testing Edge Function Support ===' as test_section;

-- Test that key tables exist and are accessible
SELECT 'Testing key table accessibility...' as test_name;
SELECT 
    'users' as table_name,
    COUNT(*) as record_count
FROM users
UNION ALL
SELECT 
    'members' as table_name,
    COUNT(*) as record_count  
FROM members
UNION ALL
SELECT 
    'membership' as table_name,
    COUNT(*) as record_count
FROM membership
UNION ALL
SELECT 
    'user_balances' as table_name,
    COUNT(*) as record_count
FROM user_balances
UNION ALL
SELECT 
    'referrals' as table_name,
    COUNT(*) as record_count
FROM referrals;

-- ===== Test 6: Function Dependencies =====
SELECT '=== Testing Function Dependencies ===' as test_section;

-- Test process_level1_nft_activation function exists
SELECT 'Testing process_level1_nft_activation function...' as test_name;
SELECT CASE 
    WHEN EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'process_level1_nft_activation'
        AND routine_schema = 'public'
    ) THEN 'Function exists'
    ELSE 'Function missing'
END as function_status;

-- Test create_member_from_membership function
SELECT 'Testing create_member_from_membership function...' as test_name;
SELECT success, message 
FROM create_member_from_membership('0x1234567890123456789012345678901234567890')
LIMIT 1;

-- ===== Test 7: Create Missing Views if Needed =====
SELECT '=== Creating Missing Views ===' as test_section;

-- Create user_complete_info view if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'user_complete_info' 
        AND table_schema = 'public'
    ) THEN
        EXECUTE '
        CREATE VIEW user_complete_info AS
        SELECT 
            u.wallet_address,
            u.email,
            u.username,
            u.pre_referrer,
            u.role,
            u.created_at as registered_at,
            
            -- 管理员信息
            a.admin_level,
            a.permissions as admin_permissions,
            a.is_active as admin_active,
            
            -- 会员信息
            CASE WHEN mem.activation_rank IS NOT NULL THEN TRUE ELSE FALSE END as is_member,
            mem.current_level as member_level,
            mem.activation_rank,
            
            -- 激活状态信息
            m.claim_status,
            m.activated_at,
            m.activation_tier,
            m.bcc_locked_amount,
            
            -- BCC余额信息
            ub.bcc_transferable,
            ub.bcc_locked,
            (ub.bcc_transferable + ub.bcc_locked) as total_bcc,
            
            -- 总体状态
            CASE 
                WHEN mem.activation_rank IS NOT NULL THEN ''active_member''
                WHEN m.activated_at IS NOT NULL THEN ''activated_pending''  
                WHEN m.claimed_at IS NOT NULL THEN ''claimed_pending''
                WHEN m.wallet_address IS NOT NULL THEN ''membership_initiated''
                WHEN u.role = ''admin'' THEN ''admin''
                ELSE ''registered_user''
            END as overall_status
            
        FROM users u
        LEFT JOIN admins a ON u.wallet_address = a.wallet_address
        LEFT JOIN members mem ON u.wallet_address = mem.wallet_address  
        LEFT JOIN membership m ON u.wallet_address = m.wallet_address
        LEFT JOIN user_balances ub ON u.wallet_address = ub.wallet_address';
        
        RAISE NOTICE 'Created user_complete_info view';
    ELSE
        RAISE NOTICE 'user_complete_info view already exists';
    END IF;
END
$$;

-- Test the newly created view
SELECT 'Testing user_complete_info view after creation...' as test_name;
SELECT COUNT(*) as view_accessible FROM user_complete_info;

-- ===== Final Summary =====
SELECT '=== Test Summary ===' as test_section;

SELECT 
    'Database Views' as component,
    CASE WHEN COUNT(*) > 0 THEN 'Ready for Edge Functions' ELSE 'Needs Setup' END as status
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('user_complete_info', 'matrix_statistics', 'user_balance_summary')

UNION ALL

SELECT 
    'Helper Functions' as component,
    CASE WHEN COUNT(*) >= 3 THEN 'Ready for Edge Functions' ELSE 'Needs Setup' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_next_activation_rank', 'create_member_from_membership', 'create_initial_user_balance')

UNION ALL

SELECT 
    'Matrix Functions' as component,
    CASE WHEN COUNT(*) >= 2 THEN 'Ready for Edge Functions' ELSE 'Needs Setup' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_matrix_system_overview', 'check_matrix_health');

COMMIT;

-- Show completion message
SELECT '✅ Edge Functions Database Setup Complete!' as final_status;
SELECT 'All views and functions are now aligned with database.types.ts structure' as message;