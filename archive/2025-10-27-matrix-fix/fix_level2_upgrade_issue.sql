-- Fix Level 2 Upgrade Issue - Focused Diagnostic

-- 1. Check if claim_sync_queue table exists
SELECT
    '=== Check claim_sync_queue table ===' as info;

SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'claim_sync_queue'
) as table_exists;

-- 2. Find the most recent member who might have tried to upgrade
-- (Recent activation + 3+ referrals + no Level 2)
SELECT
    '=== Recent Members Eligible for Level 2 (Last 7 days) ===' as info;

WITH direct_ref_counts AS (
    SELECT
        referrer_wallet,
        COUNT(*) as direct_referrals
    FROM referrals
    WHERE referral_depth = 1
    GROUP BY referrer_wallet
)
SELECT
    m.wallet_address,
    m.current_level,
    m.activation_time,
    drc.direct_referrals,
    mem1.nft_level as has_level1_membership,
    mem2.nft_level as has_level2_membership
FROM members m
LEFT JOIN direct_ref_counts drc ON m.wallet_address = drc.referrer_wallet
LEFT JOIN membership mem1 ON m.wallet_address = mem1.wallet_address AND mem1.nft_level = 1
LEFT JOIN membership mem2 ON m.wallet_address = mem2.wallet_address AND mem2.nft_level = 2
WHERE m.current_level = 1
  AND m.activation_time >= NOW() - INTERVAL '7 days'
  AND drc.direct_referrals >= 3
ORDER BY m.activation_time DESC
LIMIT 10;

-- 3. Check the one successful Level 2 member
SELECT
    '=== Successful Level 2 Member ===' as info;

SELECT
    m.wallet_address,
    m.current_level,
    m.activation_time,
    mem.nft_level,
    mem.claimed_at,
    mem.created_at,
    mem.unlock_membership_level
FROM membership mem
INNER JOIN members m ON mem.wallet_address = m.wallet_address
WHERE mem.nft_level = 2
ORDER BY mem.created_at DESC
LIMIT 1;

-- 4. Detailed check for specific wallet (if provided)
-- Replace with actual wallet address from user
\set target_wallet '''PUT_WALLET_ADDRESS_HERE'''

SELECT
    '=== Specific Wallet Detailed Check ===' as info;

-- Member record
SELECT 'Members table:' as check_type, * FROM members WHERE wallet_address ILIKE :target_wallet;

-- Membership records
SELECT 'Membership table:' as check_type, * FROM membership WHERE wallet_address ILIKE :target_wallet ORDER BY nft_level;

-- Direct referrals
SELECT 'Direct referrals count:' as check_type, COUNT(*) as count
FROM referrals
WHERE referrer_wallet ILIKE :target_wallet
  AND referral_depth = 1;

-- Layer rewards
SELECT 'Layer rewards:' as check_type, id, triggering_nft_level, reward_amount, status, created_at
FROM layer_rewards
WHERE triggering_member_wallet ILIKE :target_wallet
ORDER BY created_at DESC
LIMIT 5;
