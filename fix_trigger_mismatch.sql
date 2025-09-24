-- Fix trigger function mismatch issue
-- ===================================
-- The process_membership_bcc_release function should only be used on membership table,
-- not on members table since it references nft_level field

-- Step 1: Drop the incorrect trigger from members table
DROP TRIGGER IF EXISTS trigger_process_membership_bcc_release ON members;

-- Step 2: Verify that the membership table trigger is still working
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    CASE WHEN t.tgenabled = 'D' THEN 'DISABLED' 
         WHEN t.tgenabled = 'O' THEN 'ENABLED' 
         ELSE 'UNKNOWN' END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE p.proname = 'process_membership_bcc_release'
ORDER BY c.relname, t.tgname;

-- Step 3: Test that members table updates work now
-- Create a test function to verify 
CREATE OR REPLACE FUNCTION test_members_update()
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Try to update a member's level (should work without nft_level error now)
    UPDATE members 
    SET current_level = current_level 
    WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';
    
    RETURN '✅ Members table update successful - trigger issue fixed!';
EXCEPTION WHEN OTHERS THEN
    RETURN '❌ Error: ' || SQLERRM;
END;
$function$;

-- Test the fix
SELECT test_members_update() as result;

-- Step 4: Drop the test function
DROP FUNCTION test_members_update();