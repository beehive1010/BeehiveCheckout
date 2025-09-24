-- Sync Level 3 NFT ownership to membership table
-- ===============================================
-- User: 0xa212A85f7434A5EBAa5b468971EC3972cE72a544
-- Issue: Level 3 NFT exists on blockchain but no membership record in database

BEGIN;

-- Step 1: Check current membership records for user
SELECT 
  '=== CURRENT MEMBERSHIP RECORDS ===' as section,
  nft_level,
  unlock_membership_level,
  claimed_at,
  is_member
FROM membership 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
ORDER BY nft_level;

-- Step 2: Insert Level 3 membership record if it doesn't exist
INSERT INTO membership (
  wallet_address,
  nft_level,
  claim_price,
  claimed_at,
  is_member,
  unlock_membership_level
) VALUES (
  '0xa212A85f7434A5EBAa5b468971EC3972cE72a544',
  3,
  200.0,
  NOW(),
  true,
  4  -- Level 3 unlocks Level 4
) ON CONFLICT (wallet_address, nft_level) DO UPDATE SET
  is_member = EXCLUDED.is_member,
  unlock_membership_level = EXCLUDED.unlock_membership_level,
  claimed_at = COALESCE(membership.claimed_at, EXCLUDED.claimed_at);

-- Step 3: Verify the record was created/updated
SELECT 
  '=== UPDATED MEMBERSHIP RECORDS ===' as section,
  nft_level,
  unlock_membership_level,
  claimed_at,
  is_member
FROM membership 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
ORDER BY nft_level;

-- Step 4: Check unlock level for UI
SELECT 
  '=== NEXT UNLOCK LEVEL ===' as section,
  MAX(unlock_membership_level) as next_unlock_level
FROM membership 
WHERE wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
AND is_member = true;

SELECT '✅ Level 3 membership record synchronized successfully!' as result;

COMMIT;