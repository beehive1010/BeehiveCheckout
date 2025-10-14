-- Fix Level 2 Upgrade for 0x17918ABa958f332717e594C53906F77afa551BFB
-- This wallet owns Level 2 NFT on-chain but database records are missing

BEGIN;

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
WHERE wallet_address ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB';

SELECT
    'Membership Records' as check,
    nft_level,
    is_member,
    claimed_at
FROM membership
WHERE wallet_address ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB'
ORDER BY nft_level;

SELECT
    'Direct Referrals' as check,
    COUNT(*) as count
FROM referrals
WHERE referrer_wallet ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB'
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
VALUES (
    '0x17918ABa958f332717e594C53906F77afa551BFB',
    2,
    true,
    NOW(),
    150,
    150,
    3,
    0
)
ON CONFLICT (wallet_address, nft_level) DO UPDATE
SET is_member = true, claimed_at = NOW()
RETURNING
    wallet_address,
    nft_level,
    claimed_at,
    'CREATED/UPDATED' as status;

-- ============================================================================
-- STEP 3: Update Members Current Level
-- ============================================================================
SELECT '=== STEP 3: UPDATE MEMBER LEVEL ===' as step;

UPDATE members
SET current_level = 2
WHERE wallet_address ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB'
  AND current_level < 2
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
WHERE wallet_address ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB'
  AND current_level >= 2;

-- ============================================================================
-- STEP 4: Trigger Matrix Layer Rewards (Level 2-19)
-- ============================================================================
SELECT '=== STEP 4: TRIGGER LAYER REWARDS ===' as step;

-- Trigger matrix layer rewards for Level 2
SELECT trigger_matrix_layer_rewards(
    '0x17918ABa958f332717e594C53906F77afa551BFB',
    2,
    150
) as layer_rewards_result;

-- Verify layer rewards created
SELECT
    'Layer Rewards Created' as check,
    COUNT(*) as rewards_count,
    SUM(reward_amount) as total_rewards,
    STRING_AGG(DISTINCT status, ', ') as statuses
FROM layer_rewards
WHERE triggering_member_wallet ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB'
  AND triggering_nft_level = 2
  AND matrix_layer = 2;

-- ============================================================================
-- STEP 5: Check and Promote Pending Rewards
-- ============================================================================
SELECT '=== STEP 5: PROMOTE PENDING REWARDS ===' as step;

-- Call the pending rewards check function
SELECT check_pending_rewards_after_upgrade(
    '0x17918ABa958f332717e594C53906F77afa551BFB',
    2
) as pending_rewards_result;

-- Verify pending rewards were promoted
SELECT
    'Promoted Rewards' as check,
    COUNT(CASE WHEN status = 'claimable' AND recipient_current_level >= recipient_required_level THEN 1 END) as promoted_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as still_pending
FROM layer_rewards
WHERE reward_recipient_wallet ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB';

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================
SELECT '=== STEP 6: FINAL VERIFICATION ===' as step;

-- Member info
SELECT
    'Final State' as section,
    wallet_address,
    current_level,
    activation_time
FROM members
WHERE wallet_address ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB';

-- Membership records
SELECT
    'Membership Levels' as section,
    STRING_AGG(DISTINCT nft_level::text, ', ' ORDER BY nft_level::text) as levels_owned
FROM membership
WHERE wallet_address ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB'
  AND is_member = true;

-- Layer rewards summary
SELECT
    'Layer Rewards Summary' as section,
    COUNT(*) as total_rewards,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    SUM(reward_amount) as total_value
FROM layer_rewards
WHERE reward_recipient_wallet ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB';

-- BCC unlock verification (should have unlocked Level 2 BCC)
SELECT
    'BCC Balance' as section,
    bcc_balance as available_bcc,
    bcc_locked as locked_bcc,
    bcc_total_unlocked as total_unlocked
FROM user_balances
WHERE wallet_address ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB';

COMMIT;

SELECT '✅ Level 2 upgrade fix completed successfully!' as result;
SELECT 'Member can now see Level 2 in dashboard' as instruction;
