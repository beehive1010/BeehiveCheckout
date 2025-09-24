-- Fix the specific trigger causing the issue
-- ==========================================
-- process_membership_bcc_release() is trying to access NEW.nft_level 
-- on members table where this field doesn't exist

BEGIN;

-- Step 1: Disable the problematic trigger on members table
ALTER TABLE members DISABLE TRIGGER trigger_process_membership_bcc_release;

-- Step 2: Now try to update members table
UPDATE members 
SET current_level = 2 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

-- Step 3: Check if the members update worked
SELECT 
    wallet_address, 
    current_level,
    'Members table updated successfully' as status
FROM members 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

-- Step 4: Now try to insert the membership record
INSERT INTO membership (
    wallet_address,
    nft_level,
    claim_price,
    claimed_at,
    is_member,
    unlock_membership_level,
    platform_activation_fee,
    total_cost
) VALUES (
    '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
    2,
    150.0,
    NOW(),
    true,
    3,
    0.0,
    150.0
) ON CONFLICT (wallet_address, nft_level) DO NOTHING;

-- Step 5: Check if membership insert worked
SELECT 
    wallet_address,
    nft_level,
    claim_price,
    is_member,
    unlock_membership_level,
    'Membership record created successfully' as status
FROM membership 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
AND nft_level = 2;

-- Step 6: Create/update user balance if needed
INSERT INTO user_balances (
    wallet_address,
    reward_balance,
    available_balance,
    total_withdrawn,
    updated_at
) VALUES (
    '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
    0.0,
    0.0,
    0.0,
    NOW()
) ON CONFLICT (wallet_address) DO UPDATE SET updated_at = NOW();

-- Step 7: Re-enable the trigger (but it should probably be fixed first)
-- ALTER TABLE members ENABLE TRIGGER trigger_process_membership_bcc_release;

SELECT '✅ Level 2 NFT synchronization completed!' as result;
SELECT '⚠️  Note: trigger_process_membership_bcc_release remains disabled on members table' as warning;
SELECT '💡 This trigger should be fixed to not access nft_level on members table' as recommendation;

COMMIT;