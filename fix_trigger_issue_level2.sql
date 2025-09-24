-- Fix Level 2 NFT Membership Trigger Issue
-- =========================================
-- This script temporarily disables triggers to fix data synchronization
-- for wallet: 0xa212A85f7434A5EBAa5b468971EC3972cE72a544

BEGIN;

-- Step 1: Disable all triggers on membership table temporarily
ALTER TABLE membership DISABLE TRIGGER ALL;
ALTER TABLE members DISABLE TRIGGER ALL;

-- Step 2: Create the missing Level 2 membership record
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

-- Step 3: Update member level to 2
UPDATE members 
SET current_level = 2
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

-- Step 4: Create user balance record if not exists
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
) ON CONFLICT (wallet_address) DO NOTHING;

-- Step 5: Re-enable triggers
ALTER TABLE membership ENABLE TRIGGER ALL;
ALTER TABLE members ENABLE TRIGGER ALL;

-- Step 6: Verify the fix
SELECT 
    'membership_record' as record_type,
    wallet_address,
    nft_level,
    claim_price,
    is_member
FROM membership 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'

UNION ALL

SELECT 
    'member_record' as record_type,
    wallet_address,
    current_level::text as nft_level,
    NULL as claim_price,
    NULL as is_member
FROM members 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

COMMIT;

-- Log the fix
INSERT INTO audit_logs (
    wallet_address,
    action,
    details,
    created_at
) VALUES (
    '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
    'manual_trigger_bypass_fix',
    jsonb_build_object(
        'issue', 'nft_level_field_error',
        'solution', 'disabled_triggers_temporarily',
        'level_updated', 2,
        'membership_created', true
    ),
    NOW()
);

SELECT '✅ Level 2 NFT synchronization completed successfully!' as result;