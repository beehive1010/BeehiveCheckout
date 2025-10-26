-- ===========================================================================
-- Diagnose Level 2 Claim Issue
-- Date: 2025-10-12
--
-- User reports having 9 direct referrals but cannot claim Level 2
-- This script checks all conditions required for Level 2 upgrade
-- ===========================================================================

-- Step 1: Check user's current membership status
-- Replace 'YOUR_WALLET_ADDRESS' with the actual wallet address
\set wallet_address '''YOUR_WALLET_ADDRESS'''

SELECT '═══════════════════════════════════════════════════════' as separator;
SELECT '1. MEMBER STATUS CHECK' as check_name;
SELECT '═══════════════════════════════════════════════════════' as separator;

SELECT
    wallet_address,
    current_level,
    activation_sequence,
    activation_time,
    referrer_wallet,
    is_active,
    created_at
FROM members
WHERE wallet_address ILIKE :wallet_address;

-- Step 2: Check membership table (NFT ownership)
SELECT '═══════════════════════════════════════════════════════' as separator;
SELECT '2. NFT OWNERSHIP CHECK' as check_name;
SELECT '═══════════════════════════════════════════════════════' as separator;

SELECT
    wallet_address,
    nft_level,
    unlock_membership_level,
    is_member,
    claimed_at,
    transaction_hash
FROM membership
WHERE wallet_address ILIKE :wallet_address
ORDER BY nft_level DESC;

-- Step 3: Check direct referrals count (from v_direct_referrals view)
SELECT '═══════════════════════════════════════════════════════' as separator;
SELECT '3. DIRECT REFERRALS COUNT (from v_direct_referrals view)' as check_name;
SELECT '═══════════════════════════════════════════════════════' as separator;

SELECT
    COUNT(*) as direct_referrals_count,
    COUNT(*) FILTER (WHERE m.current_level > 0) as activated_referrals_count
FROM v_direct_referrals vdr
LEFT JOIN members m ON m.wallet_address = vdr.referred_wallet
WHERE vdr.referrer_wallet ILIKE :wallet_address;

-- Step 4: List all direct referrals
SELECT '═══════════════════════════════════════════════════════' as separator;
SELECT '4. DIRECT REFERRALS LIST' as check_name;
SELECT '═══════════════════════════════════════════════════════' as separator;

SELECT
    vdr.referred_wallet,
    vdr.referral_depth,
    m.current_level as referred_current_level,
    m.activation_time as referred_activation_time,
    vdr.referral_date
FROM v_direct_referrals vdr
LEFT JOIN members m ON m.wallet_address = vdr.referred_wallet
WHERE vdr.referrer_wallet ILIKE :wallet_address
ORDER BY vdr.referral_date DESC;

-- Step 5: Check referrals table (raw data)
SELECT '═══════════════════════════════════════════════════════' as separator;
SELECT '5. REFERRALS TABLE (raw data)' as check_name;
SELECT '═══════════════════════════════════════════════════════' as separator;

SELECT
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE referral_depth = 1) as direct_referrals
FROM referrals
WHERE referrer_wallet ILIKE :wallet_address;

-- Step 6: Check Level 2 eligibility conditions
SELECT '═══════════════════════════════════════════════════════' as separator;
SELECT '6. LEVEL 2 ELIGIBILITY CHECK' as check_name;
SELECT '═══════════════════════════════════════════════════════' as separator;

WITH user_status AS (
    SELECT
        m.wallet_address,
        m.current_level,
        COALESCE(
            (SELECT COUNT(*)
             FROM v_direct_referrals vdr
             WHERE vdr.referrer_wallet ILIKE :wallet_address),
            0
        ) as direct_referrals_count,
        EXISTS(
            SELECT 1 FROM membership
            WHERE wallet_address ILIKE :wallet_address
            AND nft_level = 2
        ) as owns_level2_nft,
        (SELECT MAX(nft_level) FROM membership WHERE wallet_address ILIKE :wallet_address) as highest_owned_level,
        (SELECT unlock_membership_level FROM membership WHERE wallet_address ILIKE :wallet_address ORDER BY nft_level DESC LIMIT 1) as next_unlockable_level
    FROM members m
    WHERE m.wallet_address ILIKE :wallet_address
)
SELECT
    wallet_address,
    current_level,
    direct_referrals_count,
    owns_level2_nft,
    highest_owned_level,
    next_unlockable_level,
    -- Condition checks
    CASE
        WHEN current_level IS NULL THEN '❌ Member not found'
        WHEN current_level = 0 THEN '❌ Level 1 not activated'
        WHEN current_level > 1 THEN '❌ Already above Level 1'
        WHEN current_level <> 1 THEN '❌ Must be Level 1 to claim Level 2'
        ELSE '✅ Current level is 1'
    END as level_check,
    CASE
        WHEN direct_referrals_count < 3 THEN CONCAT('❌ Need ', 3 - direct_referrals_count, ' more direct referrals')
        ELSE CONCAT('✅ Has ', direct_referrals_count, ' direct referrals (>= 3)')
    END as referral_check,
    CASE
        WHEN owns_level2_nft THEN '❌ Already owns Level 2 NFT'
        ELSE '✅ Does not own Level 2 NFT yet'
    END as nft_ownership_check,
    CASE
        WHEN next_unlockable_level <> 2 THEN CONCAT('❌ Next unlockable level is ', next_unlockable_level, ', not 2')
        ELSE '✅ Next unlockable level is 2'
    END as unlock_level_check,
    -- Overall eligibility
    CASE
        WHEN current_level = 1
         AND direct_referrals_count >= 3
         AND NOT owns_level2_nft
         AND next_unlockable_level = 2
        THEN '✅ ELIGIBLE FOR LEVEL 2'
        ELSE '❌ NOT ELIGIBLE - Check conditions above'
    END as overall_eligibility
FROM user_status;

-- Step 7: Check for any potential data issues
SELECT '═══════════════════════════════════════════════════════' as separator;
SELECT '7. POTENTIAL DATA ISSUES' as check_name;
SELECT '═══════════════════════════════════════════════════════' as separator;

-- Check for self-referrals (should not exist)
SELECT
    'Self-referrals found' as issue_type,
    COUNT(*) as issue_count
FROM referrals
WHERE referrer_wallet ILIKE :wallet_address
  AND referred_wallet ILIKE :wallet_address;

-- Check for duplicate referrals
SELECT
    'Duplicate referrals' as issue_type,
    referred_wallet,
    COUNT(*) as duplicate_count
FROM referrals
WHERE referrer_wallet ILIKE :wallet_address
GROUP BY referred_wallet
HAVING COUNT(*) > 1;

-- ===========================================================================
-- USAGE:
-- 1. Replace 'YOUR_WALLET_ADDRESS' at the top with the actual wallet address
-- 2. Run this script in psql or Supabase SQL Editor
-- 3. Review all checks to identify the blocker
-- ===========================================================================
