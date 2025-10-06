-- ============================================================================
-- Script: Add Missing Members to Database
-- Purpose: Add 2984 users marked as 'member' in users table to members table
-- ============================================================================

-- Step 1: Backup existing data
-- ============================================================================
CREATE TEMP TABLE backup_members AS SELECT * FROM members;
CREATE TEMP TABLE backup_membership AS SELECT * FROM membership;
CREATE TEMP TABLE backup_referrals AS SELECT * FROM referrals;
CREATE TEMP TABLE backup_matrix_referrals AS SELECT * FROM matrix_referrals;

SELECT
  'Backed up ' || COUNT(*) || ' members' as status
FROM backup_members
UNION ALL
SELECT
  'Backed up ' || COUNT(*) || ' membership records'
FROM backup_membership
UNION ALL
SELECT
  'Backed up ' || COUNT(*) || ' referrals'
FROM backup_referrals
UNION ALL
SELECT
  'Backed up ' || COUNT(*) || ' matrix referrals'
FROM backup_matrix_referrals;

-- Step 2: Identify users to add
-- ============================================================================
WITH users_to_add AS (
  SELECT
    u.wallet_address,
    u.referrer_wallet,
    u.created_at,
    ROW_NUMBER() OVER (ORDER BY u.created_at) as seq_offset
  FROM users u
  WHERE u.role = 'member'
    AND NOT EXISTS (SELECT 1 FROM members m WHERE m.wallet_address = u.wallet_address)
)
SELECT
  COUNT(*) as users_to_add,
  MIN(created_at) as earliest_date,
  MAX(created_at) as latest_date
FROM users_to_add;

-- Step 3: Insert into members table
-- ============================================================================
-- Note: activation_sequence continues from current max (958)
-- current_level = 1 for all new members
-- total_nft_claimed = 1 (Level 1 NFT)

WITH users_to_add AS (
  SELECT
    u.wallet_address,
    u.referrer_wallet,
    u.created_at as activation_time,
    ROW_NUMBER() OVER (ORDER BY u.created_at) + (SELECT MAX(activation_sequence) FROM members) as activation_sequence
  FROM users u
  WHERE u.role = 'member'
    AND NOT EXISTS (SELECT 1 FROM members m WHERE m.wallet_address = u.wallet_address)
)
INSERT INTO members (
  wallet_address,
  referrer_wallet,
  current_level,
  activation_sequence,
  activation_time,
  total_nft_claimed
)
SELECT
  wallet_address,
  referrer_wallet,
  1 as current_level,
  activation_sequence,
  activation_time,
  1 as total_nft_claimed
FROM users_to_add;

SELECT
  'Inserted ' || COUNT(*) || ' new members' as status
FROM members
WHERE activation_sequence > 958;

-- Step 4: Create membership Level 1 records for new members
-- ============================================================================
-- All new members get Level 1 membership with standard pricing

INSERT INTO membership (
  wallet_address,
  nft_level,
  claim_price,
  claimed_at,
  is_member,
  unlock_membership_level,
  platform_activation_fee,
  total_cost,
  is_upgrade,
  previous_level
)
SELECT
  m.wallet_address,
  1 as nft_level,
  130.0 as claim_price,
  m.activation_time as claimed_at,
  true as is_member,
  1 as unlock_membership_level,
  0 as platform_activation_fee,
  130.0 as total_cost,
  false as is_upgrade,
  NULL as previous_level
FROM members m
WHERE m.activation_sequence > 958
  AND NOT EXISTS (
    SELECT 1 FROM membership mship
    WHERE mship.wallet_address = m.wallet_address
    AND mship.nft_level = 1
  );

SELECT
  'Inserted ' || COUNT(*) || ' new Level 1 membership records' as status
FROM membership
WHERE wallet_address IN (
  SELECT wallet_address FROM members WHERE activation_sequence > 958
);

-- Step 5: Create user_balances records for new members
-- ============================================================================
-- BCC balance: 500, BCC locked: 10450

INSERT INTO user_balances (
  wallet_address,
  available_balance,
  total_earned,
  total_withdrawn,
  bcc_balance,
  bcc_locked,
  bcc_used,
  bcc_total_unlocked,
  reward_balance,
  reward_claimed,
  activation_tier,
  tier_multiplier,
  last_updated
)
SELECT
  m.wallet_address,
  0 as available_balance,
  0 as total_earned,
  0 as total_withdrawn,
  500.0 as bcc_balance,
  10450.0 as bcc_locked,
  0 as bcc_used,
  500.0 as bcc_total_unlocked,
  0 as reward_balance,
  0 as reward_claimed,
  1 as activation_tier,
  1.000 as tier_multiplier,
  NOW() as last_updated
FROM members m
WHERE m.activation_sequence > 958
  AND NOT EXISTS (
    SELECT 1 FROM user_balances ub
    WHERE ub.wallet_address = m.wallet_address
  );

SELECT
  'Inserted ' || COUNT(*) || ' new user_balance records' as status
FROM user_balances
WHERE wallet_address IN (
  SELECT wallet_address FROM members WHERE activation_sequence > 958
);

-- Step 6: Summary
-- ============================================================================
SELECT '════════════════════════════════════════' as separator
UNION ALL
SELECT '  NEW MEMBERS ADDITION SUMMARY' as separator
UNION ALL
SELECT '════════════════════════════════════════' as separator
UNION ALL
SELECT '' as separator;

SELECT
  'Total members before: ' || (SELECT COUNT(*) FROM backup_members) as info
UNION ALL
SELECT
  'Total members after: ' || (SELECT COUNT(*) FROM members) as info
UNION ALL
SELECT
  'New members added: ' || (SELECT COUNT(*) FROM members WHERE activation_sequence > 958) as info
UNION ALL
SELECT
  'New membership records: ' || (SELECT COUNT(*) FROM membership WHERE wallet_address IN (SELECT wallet_address FROM members WHERE activation_sequence > 958)) as info
UNION ALL
SELECT
  'New user_balance records: ' || (SELECT COUNT(*) FROM user_balances WHERE wallet_address IN (SELECT wallet_address FROM members WHERE activation_sequence > 958)) as info;

SELECT '' as separator
UNION ALL
SELECT '════════════════════════════════════════' as separator
UNION ALL
SELECT '  ✅ MEMBER ADDITION COMPLETE' as separator
UNION ALL
SELECT '════════════════════════════════════════' as separator
UNION ALL
SELECT '' as separator
UNION ALL
SELECT '⚠️  NEXT STEPS:' as separator
UNION ALL
SELECT '1. Run referrals placement script' as separator
UNION ALL
SELECT '2. Run matrix placement script' as separator
UNION ALL
SELECT '3. Recalculate all rewards' as separator
UNION ALL
SELECT '4. Update balances and withdrawals' as separator;
