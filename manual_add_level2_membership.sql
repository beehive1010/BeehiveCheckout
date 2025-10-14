-- Manual Add Level 2 Membership Record
-- Use this script when NFT was claimed successfully but database wasn't updated
--
-- USAGE:
-- Replace 'WALLET_ADDRESS_HERE' with the actual wallet address
-- Replace 'TRANSACTION_HASH_HERE' with the actual NFT claim transaction hash (if available)

BEGIN;

\set target_wallet '''WALLET_ADDRESS_HERE'''
\set tx_hash '''TRANSACTION_HASH_HERE'''

-- Step 1: Verify current state
SELECT
    '=== BEFORE: Current State ===' as info;

SELECT
    'Member info' as check,
    wallet_address,
    current_level,
    referrer_wallet,
    activation_time
FROM members
WHERE wallet_address ILIKE :target_wallet;

SELECT
    'Membership records' as check,
    nft_level,
    is_member,
    claimed_at
FROM membership
WHERE wallet_address ILIKE :target_wallet
ORDER BY nft_level;

SELECT
    'Direct referrals' as check,
    COUNT(*) as count
FROM referrals
WHERE referrer_wallet ILIKE :target_wallet
  AND referral_depth = 1;

-- Step 2: Insert Level 2 membership record
SELECT
    '=== EXECUTING: Adding Level 2 Membership ===' as info;

INSERT INTO membership (
    wallet_address,
    nft_level,
    is_member,
    claimed_at,
    network,
    claim_price,
    total_cost,
    unlock_membership_level,
    platform_activation_fee,
    transaction_hash,
    created_at,
    updated_at
)
SELECT
    :target_wallet,
    2,  -- Level 2
    true,
    COALESCE(
        (SELECT claimed_at FROM membership WHERE wallet_address ILIKE :target_wallet AND nft_level = 1),
        NOW()
    ),  -- Use Level 1 claim time or now
    'mainnet',
    150,  -- Level 2 price
    150,  -- Total cost
    3,    -- Unlock Level 3
    0,    -- No platform fee for Level 2
    NULLIF(:tx_hash, 'TRANSACTION_HASH_HERE'),  -- Transaction hash if provided
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM membership
    WHERE wallet_address ILIKE :target_wallet
      AND nft_level = 2
);

-- Step 3: Update members.current_level to 2
SELECT
    '=== EXECUTING: Updating Member Level ===' as info;

UPDATE members
SET
    current_level = 2,
    updated_at = NOW()
WHERE wallet_address ILIKE :target_wallet
  AND current_level < 2;

-- Step 4: Trigger layer rewards for Level 2 upgrade
SELECT
    '=== EXECUTING: Triggering Layer Rewards ===' as info;

SELECT trigger_layer_rewards_on_upgrade(
    :target_wallet,  -- p_upgrading_member_wallet
    2,               -- p_new_level
    150              -- p_nft_price (Level 2 NFT price)
);

-- Step 5: Verify final state
SELECT
    '=== AFTER: Verification ===' as info;

SELECT
    'Member info' as check,
    wallet_address,
    current_level,
    updated_at
FROM members
WHERE wallet_address ILIKE :target_wallet;

SELECT
    'Membership records' as check,
    nft_level,
    is_member,
    claimed_at,
    unlock_membership_level
FROM membership
WHERE wallet_address ILIKE :target_wallet
ORDER BY nft_level;

SELECT
    'Layer rewards created' as check,
    COUNT(*) as rewards_count,
    SUM(reward_amount) as total_rewards
FROM layer_rewards
WHERE triggering_member_wallet ILIKE :target_wallet
  AND triggering_nft_level = 2;

-- Show created layer rewards details
SELECT
    'Layer rewards details' as check,
    matrix_root_wallet,
    matrix_layer,
    reward_amount,
    status,
    created_at
FROM layer_rewards
WHERE triggering_member_wallet ILIKE :target_wallet
  AND triggering_nft_level = 2
ORDER BY matrix_layer;

COMMIT;

SELECT '✅ Level 2 membership补充完成! Member upgraded to Level 2 with layer rewards.' as result;
