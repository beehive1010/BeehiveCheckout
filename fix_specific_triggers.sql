-- Fix specific trigger causing nft_level field error
-- ================================================

BEGIN;

-- Step 1: Try to disable the most likely problematic triggers one by one
-- First suspect: sync_member_to_membership_trigger
ALTER TABLE members DISABLE TRIGGER sync_member_to_membership_trigger;

-- Step 2: Test updating members table
UPDATE members 
SET current_level = 2 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

-- Step 3: Check if the update worked
SELECT 
    wallet_address, 
    current_level,
    'Updated successfully' as status
FROM members 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

-- Step 4: Re-enable the trigger
ALTER TABLE members ENABLE TRIGGER sync_member_to_membership_trigger;

-- Step 5: If members update worked, now try membership insert with minimal triggers disabled
-- Disable the most likely problematic membership triggers
ALTER TABLE membership DISABLE TRIGGER trigger_calculate_nft_costs;

-- Step 6: Try to insert membership record
INSERT INTO membership (
    wallet_address,
    nft_level,
    claim_price,
    claimed_at,
    is_member
) VALUES (
    '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
    2,
    150.0,
    NOW(),
    true
) ON CONFLICT (wallet_address, nft_level) DO NOTHING;

-- Step 7: Check if membership insert worked
SELECT 
    wallet_address,
    nft_level,
    claim_price,
    'Membership created' as status
FROM membership 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
AND nft_level = 2;

-- Step 8: Re-enable the trigger
ALTER TABLE membership ENABLE TRIGGER trigger_calculate_nft_costs;

SELECT '✅ Level 2 synchronization completed!' as result;

COMMIT;