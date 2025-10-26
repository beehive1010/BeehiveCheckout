-- Diagnose Level 2 Upgrade Issue
-- Check why Level 2 upgrade claim didn't record to database

-- Step 1: Find members at Level 1 who should be able to upgrade to Level 2
-- (Have 3+ direct referrals)
SELECT
    '=== Members at Level 1 with 3+ Direct Referrals (Eligible for Level 2) ===' as info;

WITH direct_referral_counts AS (
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
    CASE
        WHEN mem2.nft_level IS NOT NULL THEN 'HAS Level 2 membership'
        ELSE 'NO Level 2 membership'
    END as level2_status
FROM members m
LEFT JOIN direct_referral_counts drc ON m.wallet_address = drc.referrer_wallet
LEFT JOIN membership mem2 ON m.wallet_address = mem2.wallet_address AND mem2.nft_level = 2
WHERE m.current_level = 1
  AND drc.direct_referrals >= 3
ORDER BY m.activation_time DESC;

-- Step 2: Check recent membership table insertions (last 24 hours)
SELECT
    '=== Recent Membership Records (Last 24 hours) ===' as info;

SELECT
    wallet_address,
    nft_level,
    is_member,
    claimed_at,
    transaction_hash,
    created_at
FROM membership
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- Step 3: Check members table updates (last 24 hours)
SELECT
    '=== Recent Members Level Updates (Last 24 hours) ===' as info;

SELECT
    wallet_address,
    current_level,
    activation_time,
    updated_at
FROM members
WHERE updated_at >= NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC
LIMIT 20;

-- Step 4: Check specific wallet if provided
-- Replace 'WALLET_ADDRESS_HERE' with actual wallet address
SELECT
    '=== Specific Wallet Analysis ===' as info;

-- Member info
SELECT
    'm.members table' as source,
    wallet_address,
    current_level,
    referrer_wallet,
    activation_time,
    total_nft_claimed
FROM members
WHERE wallet_address ILIKE 'WALLET_ADDRESS_HERE';

-- Membership records
SELECT
    'membership table' as source,
    wallet_address,
    nft_level,
    is_member,
    claimed_at,
    unlock_membership_level
FROM membership
WHERE wallet_address ILIKE 'WALLET_ADDRESS_HERE'
ORDER BY nft_level;

-- Direct referrals count
SELECT
    'referrals count' as source,
    COUNT(*) as direct_referrals
FROM referrals
WHERE referrer_wallet ILIKE 'WALLET_ADDRESS_HERE'
  AND referral_depth = 1;

-- Layer rewards
SELECT
    'layer_rewards' as source,
    id,
    triggering_nft_level,
    reward_amount,
    status,
    created_at
FROM layer_rewards
WHERE triggering_member_wallet ILIKE 'WALLET_ADDRESS_HERE'
ORDER BY created_at DESC;

-- Step 5: Check for failed transactions or errors in audit_logs
SELECT
    '=== Recent Audit Logs (Upgrade Actions) ===' as info;

SELECT
    wallet_address,
    action,
    details,
    created_at
FROM audit_logs
WHERE action = 'level_upgrade'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;
