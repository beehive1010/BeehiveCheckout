-- Analyze new database schema and identify key structural changes
-- Compare with existing views and functions

BEGIN;

SELECT '🔍 ANALYZING NEW DATABASE SCHEMA' as analysis_header;

-- ===== Key Changes Analysis =====
SELECT '=== Key Changes Identified ===' as section;

-- 1. Check if membership table exists in new schema
SELECT 'Checking membership table existence...' as check_name;
SELECT CASE 
    WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'membership' AND table_schema = 'public'
    ) THEN 'EXISTS - Need to check structure'
    ELSE 'MISSING - Major schema change!'
END as membership_table_status;

-- 2. Check members table structure changes
SELECT 'Analyzing members table structure...' as check_name;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'members' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check user_balances structure changes  
SELECT 'Analyzing user_balances table structure...' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_balances' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check referrals table structure
SELECT 'Analyzing referrals table structure...' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'referrals' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check new tables that might affect edge functions
SELECT 'Identifying new/important tables...' as check_name;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'bcc_transactions',
    'layer_rewards', 
    'reward_claims',
    'member_activation_tiers',
    'nft_levels',
    'platform_fees'
)
ORDER BY table_name;

-- ===== Structure Comparison Analysis =====
SELECT '=== Structure Comparison ===' as section;

-- Check if our views still work with new schema
SELECT 'Checking view compatibility...' as compatibility_check;

-- Test our key views
SELECT 'user_complete_info:' as view_name, 
       CASE 
           WHEN EXISTS (SELECT 1 FROM user_complete_info LIMIT 1) THEN 'WORKS'
           ELSE 'BROKEN'
       END as status;

SELECT 'user_balance_summary:' as view_name,
       CASE 
           WHEN EXISTS (SELECT 1 FROM user_balance_summary LIMIT 1) THEN 'WORKS'
           ELSE 'BROKEN' 
       END as status;

-- ===== Column Mapping Analysis =====
SELECT '=== Column Mapping Changes ===' as section;

-- New user_balances structure analysis
SELECT 'New user_balances columns:' as info;
SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) as all_columns
FROM information_schema.columns 
WHERE table_name = 'user_balances' AND table_schema = 'public';

-- New members table structure analysis  
SELECT 'New members columns:' as info;
SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) as all_columns
FROM information_schema.columns 
WHERE table_name = 'members' AND table_schema = 'public';

COMMIT;

SELECT '✅ Schema analysis complete - ready for updates!' as status;