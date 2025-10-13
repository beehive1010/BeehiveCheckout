-- ============================================================================
-- Create Full Membership Records (Level 1-19) for Specific Wallet
-- Date: 2025-10-12
-- Target Wallet: 0xfd91667229a122265aF123a75bb624A9C35B5032
--
-- Purpose: Grant complete membership access (all 19 levels) to wallet
-- ============================================================================

BEGIN;

-- Target wallet address
\set target_wallet '''0xfd91667229a122265aF123a75bb624A9C35B5032'''

SELECT '═══════════════════════════════════════════════════════════' as separator;
SELECT 'CREATING FULL MEMBERSHIP RECORDS (LEVEL 1-19)' as action;
SELECT '═══════════════════════════════════════════════════════════' as separator;

-- Step 1: Check if member exists
SELECT
    wallet_address,
    current_level,
    activation_time,
    referrer_wallet
FROM members
WHERE wallet_address ILIKE :target_wallet;

-- Step 2: Create membership records for all 19 levels
-- Level pricing based on LEVEL_CONFIG
WITH level_pricing AS (
    SELECT level, price FROM (VALUES
        (1, 130),   -- Level 1: 130 USDC (includes 30 USDC platform fee)
        (2, 150),   -- Level 2: 150 USDC
        (3, 200),   -- Level 3: 200 USDC
        (4, 250),   (5, 300),   (6, 350),   (7, 400),   (8, 450),   (9, 500),
        (10, 550),  (11, 600),  (12, 650),  (13, 700),  (14, 750),  (15, 800),
        (16, 850),  (17, 900),  (18, 950),  (19, 1000)  -- Level 19: 1000 USDC
    ) AS t(level, price)
)
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
    transaction_hash
)
SELECT
    :target_wallet,
    lp.level,
    true,
    NOW(),
    'mainnet',
    lp.price,
    lp.price,
    CASE
        WHEN lp.level < 19 THEN lp.level + 1
        ELSE 19
    END,
    CASE
        WHEN lp.level = 1 THEN 30
        ELSE 0
    END,
    'admin_grant_' || lp.level || '_' || EXTRACT(EPOCH FROM NOW())::TEXT
FROM level_pricing lp
ON CONFLICT (wallet_address, nft_level) DO UPDATE
SET
    is_member = true,
    claimed_at = NOW(),
    unlock_membership_level = CASE
        WHEN EXCLUDED.nft_level < 19 THEN EXCLUDED.nft_level + 1
        ELSE 19
    END,
    updated_at = NOW();

-- Step 3: Update member's current_level to 19
UPDATE members
SET
    current_level = 19,
    updated_at = NOW()
WHERE wallet_address ILIKE :target_wallet;

-- Step 4: Verification - Show all membership records
SELECT '═══════════════════════════════════════════════════════════' as separator;
SELECT 'VERIFICATION: MEMBERSHIP RECORDS CREATED' as section;
SELECT '═══════════════════════════════════════════════════════════' as separator;

SELECT
    nft_level,
    is_member,
    claim_price,
    unlock_membership_level,
    claimed_at,
    transaction_hash
FROM membership
WHERE wallet_address ILIKE :target_wallet
ORDER BY nft_level;

-- Step 5: Verification - Show member's current level
SELECT '═══════════════════════════════════════════════════════════' as separator;
SELECT 'VERIFICATION: MEMBER CURRENT LEVEL' as section;
SELECT '═══════════════════════════════════════════════════════════' as separator;

SELECT
    wallet_address,
    current_level,
    activation_time,
    referrer_wallet,
    updated_at
FROM members
WHERE wallet_address ILIKE :target_wallet;

-- Step 6: Summary
SELECT '═══════════════════════════════════════════════════════════' as separator;
SELECT 'SUMMARY' as section;
SELECT '═══════════════════════════════════════════════════════════' as separator;

SELECT
    COUNT(*) as total_membership_records,
    MIN(nft_level) as lowest_level,
    MAX(nft_level) as highest_level,
    SUM(claim_price) as total_investment,
    m.current_level as member_current_level
FROM membership mem
CROSS JOIN members m
WHERE mem.wallet_address ILIKE :target_wallet
  AND m.wallet_address ILIKE :target_wallet
GROUP BY m.current_level;

COMMIT;

-- ============================================================================
-- Expected Results:
-- - 19 membership records created (Level 1-19)
-- - members.current_level = 19
-- - Total investment: 9,900 USDC (sum of all level prices)
-- ============================================================================

SELECT '✅ COMPLETE: All 19 membership levels granted to ' || :target_wallet as result;
