-- Script to fix missing lower-level membership records
-- This script will insert missing level 1-N records for members who have level N+1 or higher

-- Step 1: Create a temporary table to hold missing records
CREATE TEMP TABLE missing_membership_records AS
WITH member_levels AS (
  SELECT wallet_address, MAX(nft_level) as max_level, MIN(claimed_at) as earliest_claim
  FROM membership
  GROUP BY wallet_address
  HAVING MAX(nft_level) > 1
),
missing_levels AS (
  SELECT
    ml.wallet_address,
    level as missing_level,
    ml.earliest_claim,
    ml.max_level
  FROM member_levels ml
  CROSS JOIN LATERAL (
    SELECT level
    FROM generate_series(1, ml.max_level - 1) AS level
    WHERE NOT EXISTS (
      SELECT 1 FROM membership m
      WHERE m.wallet_address = ml.wallet_address
      AND m.nft_level = level
    )
  ) levels
)
SELECT
  wallet_address,
  missing_level as nft_level,
  -- Price calculation based on level (using formula: 130 * 2^(level-1) for levels 1-19)
  CASE
    WHEN missing_level = 1 THEN 130
    WHEN missing_level = 2 THEN 150
    WHEN missing_level = 3 THEN 200
    WHEN missing_level = 4 THEN 300
    WHEN missing_level = 5 THEN 500
    WHEN missing_level = 6 THEN 800
    WHEN missing_level = 7 THEN 1300
    WHEN missing_level = 8 THEN 2100
    WHEN missing_level = 9 THEN 3400
    WHEN missing_level = 10 THEN 5500
    WHEN missing_level = 11 THEN 8900
    WHEN missing_level = 12 THEN 14400
    WHEN missing_level = 13 THEN 23300
    WHEN missing_level = 14 THEN 37700
    WHEN missing_level = 15 THEN 61000
    WHEN missing_level = 16 THEN 98700
    WHEN missing_level = 17 THEN 159700
    WHEN missing_level = 18 THEN 258400
    WHEN missing_level = 19 THEN 418100
    ELSE 130
  END as claim_price,
  earliest_claim as claimed_at,
  true as is_member,
  missing_level as unlock_membership_level,
  0 as platform_activation_fee,
  CASE
    WHEN missing_level = 1 THEN 130
    WHEN missing_level = 2 THEN 150
    WHEN missing_level = 3 THEN 200
    WHEN missing_level = 4 THEN 300
    WHEN missing_level = 5 THEN 500
    WHEN missing_level = 6 THEN 800
    WHEN missing_level = 7 THEN 1300
    WHEN missing_level = 8 THEN 2100
    WHEN missing_level = 9 THEN 3400
    WHEN missing_level = 10 THEN 5500
    WHEN missing_level = 11 THEN 8900
    WHEN missing_level = 12 THEN 14400
    WHEN missing_level = 13 THEN 23300
    WHEN missing_level = 14 THEN 37700
    WHEN missing_level = 15 THEN 61000
    WHEN missing_level = 16 THEN 98700
    WHEN missing_level = 17 THEN 159700
    WHEN missing_level = 18 THEN 258400
    WHEN missing_level = 19 THEN 418100
    ELSE 130
  END as total_cost,
  false as is_upgrade,
  CASE WHEN missing_level > 1 THEN missing_level - 1 ELSE NULL END as previous_level
FROM missing_levels
ORDER BY wallet_address, missing_level;

-- Step 2: Show what will be inserted
SELECT
  COUNT(*) as total_missing_records,
  COUNT(DISTINCT wallet_address) as affected_wallets
FROM missing_membership_records;

-- Step 3: Show sample of missing records
SELECT * FROM missing_membership_records LIMIT 20;

-- Step 4: Insert missing records (COMMENTED OUT - Review first!)
-- Uncomment the following lines after reviewing the data above
/*
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
FROM missing_membership_records
ON CONFLICT (wallet_address, nft_level) DO NOTHING;

-- Verify the insertion
SELECT
  'Inserted' as status,
  COUNT(*) as record_count,
  COUNT(DISTINCT wallet_address) as wallet_count
FROM membership
WHERE (wallet_address, nft_level) IN (
  SELECT wallet_address, nft_level FROM missing_membership_records
);
*/

-- Step 5: Verify there are no more gaps
WITH member_levels AS (
  SELECT wallet_address, MAX(nft_level) as max_level
  FROM membership
  GROUP BY wallet_address
  HAVING MAX(nft_level) > 1
),
remaining_gaps AS (
  SELECT
    ml.wallet_address,
    ml.max_level,
    level as missing_level
  FROM member_levels ml
  CROSS JOIN LATERAL (
    SELECT level
    FROM generate_series(1, ml.max_level - 1) AS level
    WHERE NOT EXISTS (
      SELECT 1 FROM membership m
      WHERE m.wallet_address = ml.wallet_address
      AND m.nft_level = level
    )
  ) levels
)
SELECT
  COUNT(*) as remaining_gaps,
  COUNT(DISTINCT wallet_address) as wallets_with_gaps
FROM remaining_gaps;
