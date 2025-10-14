-- Manual Fix for Level 2 Upgrade
-- Use this when NFT claim succeeded but database records were not created
--
-- INSTRUCTIONS:
-- 1. Replace WALLET_ADDRESS with the actual wallet
-- 2. Replace TX_HASH with the actual NFT claim transaction hash (optional)
-- 3. Run this script in psql or Supabase SQL Editor

BEGIN;

-- ============================================================================
-- CONFIGURATION
-- ============================================================================
\set target_wallet '''0x17918ABa958f332717e594C53906F77afa551BFB'''
\set tx_hash '''0xPUT_ACTUAL_TX_HASH_HERE'''
\set target_level 2
\set level_price 150

-- ============================================================================
-- STEP 1: Verify Current State
-- ============================================================================
SELECT '=== STEP 1: CURRENT STATE ===' as step;

SELECT
    'Member Record' as check,
    wallet_address,
    current_level,
    activation_time
FROM members
WHERE wallet_address ILIKE :target_wallet;

SELECT
    'Membership Records' as check,
    nft_level,
    is_member,
    claimed_at
FROM membership
WHERE wallet_address ILIKE :target_wallet
ORDER BY nft_level;

SELECT
    'Direct Referrals' as check,
    COUNT(*) as count
FROM referrals
WHERE referrer_wallet ILIKE :target_wallet
  AND referral_depth = 1;

-- ============================================================================
-- STEP 2: Create Membership Level 2 Record
-- ============================================================================
SELECT '=== STEP 2: CREATE MEMBERSHIP RECORD ===' as step;

INSERT INTO membership (
    wallet_address,
    nft_level,
    is_member,
    claimed_at,
    claim_price,
    total_cost,
    unlock_membership_level,
    platform_activation_fee
)
SELECT
    :target_wallet,
    :target_level,
    true,
    NOW(),
    :level_price,
    :level_price,
    :target_level + 1,
    0
WHERE NOT EXISTS (
    SELECT 1 FROM membership
    WHERE wallet_address ILIKE :target_wallet
      AND nft_level = :target_level
)
RETURNING
    wallet_address,
    nft_level,
    claimed_at,
    'CREATED' as status;

-- If already exists, show it
SELECT
    wallet_address,
    nft_level,
    claimed_at,
    'ALREADY EXISTS' as status
FROM membership
WHERE wallet_address ILIKE :target_wallet
  AND nft_level = :target_level;

-- ============================================================================
-- STEP 3: Update Members Current Level
-- ============================================================================
SELECT '=== STEP 3: UPDATE MEMBER LEVEL ===' as step;

UPDATE members
SET
    current_level = :target_level,
    updated_at = NOW()
WHERE wallet_address ILIKE :target_wallet
  AND current_level < :target_level
RETURNING
    wallet_address,
    current_level,
    'UPDATED' as status;

-- If already at correct level
SELECT
    wallet_address,
    current_level,
    'ALREADY AT LEVEL ' || current_level as status
FROM members
WHERE wallet_address ILIKE :target_wallet
  AND current_level >= :target_level;

-- ============================================================================
-- STEP 4: Trigger Matrix Layer Rewards (Level 2-19)
-- ============================================================================
SELECT '=== STEP 4: TRIGGER LAYER REWARDS ===' as step;

-- For Level 2-19, trigger matrix layer rewards
DO $$
DECLARE
    reward_result JSON;
BEGIN
    IF 2 >= 2 AND 2 <= 19 THEN
        SELECT trigger_matrix_layer_rewards(
            '0x17918ABa958f332717e594C53906F77afa551BFB'::VARCHAR,
            2,
            150::NUMERIC
        ) INTO reward_result;

        RAISE NOTICE 'Layer Rewards Result: %', reward_result;
    ELSE
        RAISE NOTICE 'Level 2 does not trigger matrix layer rewards (only Level 2-19)';
    END IF;
END $$;

-- Verify layer rewards created
SELECT
    'Layer Rewards Created' as check,
    COUNT(*) as rewards_count,
    SUM(reward_amount) as total_rewards,
    STRING_AGG(DISTINCT status, ', ') as statuses
FROM layer_rewards
WHERE triggering_member_wallet ILIKE :target_wallet
  AND triggering_nft_level = :target_level
  AND matrix_layer = :target_level;

-- ============================================================================
-- STEP 5: Check and Promote Pending Rewards
-- ============================================================================
SELECT '=== STEP 5: PROMOTE PENDING REWARDS ===' as step;

-- Call the pending rewards check function
DO $$
DECLARE
    pending_result JSON;
BEGIN
    SELECT check_pending_rewards_after_upgrade(
        '0x17918ABa958f332717e594C53906F77afa551BFB'::VARCHAR,
        2
    ) INTO pending_result;

    RAISE NOTICE 'Pending Rewards Result: %', pending_result;
END $$;

-- Verify pending rewards were promoted
SELECT
    'Promoted Rewards' as check,
    COUNT(CASE WHEN status = 'claimable' AND recipient_current_level >= recipient_required_level THEN 1 END) as promoted_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as still_pending
FROM layer_rewards
WHERE reward_recipient_wallet ILIKE :target_wallet;

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================
SELECT '=== STEP 6: FINAL VERIFICATION ===' as step;

-- Member info
SELECT
    'Final State' as section,
    wallet_address,
    current_level,
    updated_at
FROM members
WHERE wallet_address ILIKE :target_wallet;

-- Membership records
SELECT
    'Membership Levels' as section,
    STRING_AGG(nft_level::text, ', ' ORDER BY nft_level) as levels_owned
FROM membership
WHERE wallet_address ILIKE :target_wallet
  AND is_member = true;

-- Layer rewards summary
SELECT
    'Layer Rewards Summary' as section,
    COUNT(*) as total_rewards,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    SUM(reward_amount) as total_value
FROM layer_rewards
WHERE reward_recipient_wallet ILIKE :target_wallet;

-- BCC unlock verification (should have unlocked Level 2 BCC)
SELECT
    'BCC Balance' as section,
    bcc_balance as available_bcc,
    bcc_locked as locked_bcc,
    bcc_total_unlocked as total_unlocked
FROM user_balances
WHERE wallet_address ILIKE :target_wallet;

COMMIT;

SELECT '✅ Level 2 upgrade fix completed!' as result;
SELECT 'Please verify the member can now see Level 2 in dashboard' as instruction;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if something went wrong)
-- ============================================================================
-- If you need to rollback, run:
-- BEGIN;
-- DELETE FROM layer_rewards WHERE triggering_member_wallet ILIKE '0x...' AND triggering_nft_level = 2;
-- DELETE FROM membership WHERE wallet_address ILIKE '0x...' AND nft_level = 2;
-- UPDATE members SET current_level = 1 WHERE wallet_address ILIKE '0x...';
-- COMMIT;
