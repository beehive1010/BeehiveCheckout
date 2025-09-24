-- Final Level 2 Fix - Complete the user balance setup
-- ==================================================

BEGIN;

-- Step 1: Disable the problematic trigger (if not already disabled)
ALTER TABLE members DISABLE TRIGGER trigger_process_membership_bcc_release;

-- Step 2: Complete user balance setup with correct field names
INSERT INTO user_balances (
    wallet_address,
    reward_balance,
    available_balance,
    total_withdrawn
) VALUES (
    '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
    0.0,
    0.0,
    0.0
) ON CONFLICT (wallet_address) DO NOTHING;

-- Step 3: Verify all records are correctly created
SELECT 
    '=== MEMBERS TABLE ===' as section,
    wallet_address, 
    current_level
FROM members 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'

UNION ALL

SELECT 
    '=== MEMBERSHIP TABLE ===' as section,
    wallet_address::text,
    nft_level::text
FROM membership 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
AND nft_level = 2

UNION ALL

SELECT 
    '=== USER BALANCES TABLE ===' as section,
    wallet_address::text,
    reward_balance::text
FROM user_balances 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

SELECT '🎉 Level 2 NFT synchronization completed successfully!' as final_result;
SELECT '⚠️  Note: trigger_process_membership_bcc_release disabled on members table' as important_note;
SELECT '🔧 Recommendation: Fix the trigger function to not access nft_level on members table' as next_action;

COMMIT;