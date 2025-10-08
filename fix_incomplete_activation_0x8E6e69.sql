-- Fix incomplete activation for wallet 0x8E6e69856FAb638537EC0b80e351eB029378F8e0
-- This user has membership record but missing members record due to timeout

BEGIN;

SELECT '=== Fixing Incomplete Activation ===' as step;

-- 1. Check current status
SELECT 'Current Status:' as info;
SELECT
  'Membership' as table_name,
  wallet_address,
  nft_level,
  claimed_at
FROM membership
WHERE wallet_address = '0x8E6e69856FAb638537EC0b80e351eB029378F8e0';

SELECT
  'Members' as table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM members WHERE wallet_address = '0x8E6e69856FAb638537EC0b80e351eB029378F8e0')
    THEN 'EXISTS'
    ELSE 'MISSING ❌'
  END as status;

-- 2. Get user info
DO $$
DECLARE
  v_wallet TEXT := '0x8E6e69856FAb638537EC0b80e351eB029378F8e0';
  v_referrer TEXT;
  v_username TEXT;
  v_claimed_at TIMESTAMP;
  v_next_sequence INT;
BEGIN
  -- Get referrer from users table
  SELECT referrer_wallet, username INTO v_referrer, v_username
  FROM users
  WHERE wallet_address = v_wallet;

  -- Get claimed_at from membership
  SELECT claimed_at INTO v_claimed_at
  FROM membership
  WHERE wallet_address = v_wallet AND nft_level = 1;

  -- Get next activation sequence
  SELECT COALESCE(MAX(activation_sequence), 0) + 1 INTO v_next_sequence
  FROM members;

  RAISE NOTICE 'User info:';
  RAISE NOTICE '  Wallet: %', v_wallet;
  RAISE NOTICE '  Username: %', v_username;
  RAISE NOTICE '  Referrer: %', v_referrer;
  RAISE NOTICE '  Claimed at: %', v_claimed_at;
  RAISE NOTICE '  Next sequence: %', v_next_sequence;

  -- 3. Create missing members record
  -- This will trigger all necessary database triggers:
  -- - Matrix placement
  -- - Referral creation
  -- - Reward calculation
  -- - Balance updates
  INSERT INTO members (
    wallet_address,
    referrer_wallet,
    current_level,
    activation_sequence,
    activation_time,
    total_nft_claimed
  ) VALUES (
    v_wallet,
    v_referrer,
    1,  -- Level 1
    v_next_sequence,  -- Will be 3961
    v_claimed_at,  -- Use original claim time
    1  -- Claimed 1 NFT
  );

  RAISE NOTICE '✅ Members record created successfully!';
  RAISE NOTICE '   activation_sequence: %', v_next_sequence;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create members record: %', SQLERRM;
END $$;

-- 4. Verify completion
SELECT 'Verification:' as info;

-- Check members record
SELECT
  wallet_address,
  current_level,
  activation_sequence,
  activation_time,
  referrer_wallet
FROM members
WHERE wallet_address = '0x8E6e69856FAb638537EC0b80e351eB029378F8e0';

-- Check referrals created
SELECT
  'Referrals' as table_name,
  COUNT(*) as count
FROM referrals
WHERE member_wallet = '0x8E6e69856FAb638537EC0b80e351eB029378F8e0';

-- Check rewards created
SELECT
  'Rewards' as table_name,
  COUNT(*) as count
FROM rewards
WHERE reward_recipient_wallet = '0x8E6e69856FAb638537EC0b80e351eB029378F8e0';

-- Check matrix placement
SELECT
  'Matrix Placement' as info,
  matrix_root_wallet,
  matrix_layer,
  slot_num_seq
FROM matrix_referrals
WHERE member_wallet = '0x8E6e69856FAb638537EC0b80e351eB029378F8e0'
LIMIT 1;

SELECT '=== Fix Complete ===' as final_status;

COMMIT;
