-- Step 5: Final Verification
-- Execute this against your Supabase database to verify migration success

-- Check all expected tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') 
        THEN '✅ admins table exists'
        ELSE '❌ admins table missing'
    END as admin_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'multi_chain_payments') 
        THEN '✅ multi_chain_payments exists'
        ELSE '❌ multi_chain_payments missing'
    END as payments_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_bcc_balance_overview') 
        THEN '✅ user_bcc_balance_overview exists'
        ELSE '❌ user_bcc_balance_overview missing'
    END as view_check;

-- Test edge function dependencies
SELECT count(*) as admin_count FROM admins;
SELECT count(*) as payment_count FROM multi_chain_payments;
SELECT count(*) as bridge_count FROM bridge_requests;
SELECT count(*) as chains_count FROM supported_chains;

-- Test the updated view
SELECT wallet_address, total_bcc_balance, current_level, is_activated 
FROM user_bcc_balance_overview 
LIMIT 5;

-- Check RLS policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('admins', 'multi_chain_payments', 'bridge_requests', 'supported_chains')
ORDER BY tablename, policyname;

-- Check indexes were created
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE tablename IN ('admins', 'multi_chain_payments', 'bridge_requests', 'supported_chains')
ORDER BY tablename, indexname;

-- Check triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE event_object_table IN ('admins', 'multi_chain_payments', 'bridge_requests', 'supported_chains')
ORDER BY event_object_table, trigger_name;