-- Universal script to check and supplement incomplete activations
-- This handles cases where users have membership record but missing members record due to timeout
--
-- Usage: Replace the wallet address in the WHERE clause at the bottom

BEGIN;

SELECT '=== Checking and Supplementing Activation Data ===' as step;

-- Helper function to check and supplement a single wallet
CREATE OR REPLACE FUNCTION check_and_supplement_activation(p_wallet TEXT)
RETURNS TABLE(
  status TEXT,
  message TEXT,
  details JSONB
) AS $$
DECLARE
  v_has_membership BOOLEAN;
  v_has_members BOOLEAN;
  v_referrer TEXT;
  v_username TEXT;
  v_claimed_at TIMESTAMP;
  v_nft_level INT;
  v_next_sequence INT;
  v_result JSONB := '{}'::jsonb;
BEGIN
  -- 1. Check if membership record exists
  SELECT EXISTS(
    SELECT 1 FROM membership
    WHERE wallet_address ILIKE p_wallet AND nft_level >= 1
  ) INTO v_has_membership;

  -- 2. Check if members record exists
  SELECT EXISTS(
    SELECT 1 FROM members
    WHERE wallet_address ILIKE p_wallet
  ) INTO v_has_members;

  -- Build status info
  v_result := jsonb_build_object(
    'wallet', p_wallet,
    'has_membership', v_has_membership,
    'has_members', v_has_members
  );

  -- Case 1: No membership record - user never activated
  IF NOT v_has_membership THEN
    RETURN QUERY SELECT
      'NOT_ACTIVATED'::TEXT,
      'User has no membership record. Never activated.'::TEXT,
      v_result;
    RETURN;
  END IF;

  -- Case 2: Both records exist - activation complete
  IF v_has_membership AND v_has_members THEN
    -- Get member details
    SELECT current_level, activation_sequence, activation_time
    INTO v_nft_level, v_next_sequence, v_claimed_at
    FROM members
    WHERE wallet_address ILIKE p_wallet;

    v_result := v_result || jsonb_build_object(
      'current_level', v_nft_level,
      'activation_sequence', v_next_sequence,
      'activation_time', v_claimed_at
    );

    RETURN QUERY SELECT
      'COMPLETE'::TEXT,
      'Activation is complete. No action needed.'::TEXT,
      v_result;
    RETURN;
  END IF;

  -- Case 3: Has membership but no members - INCOMPLETE (needs补充)
  IF v_has_membership AND NOT v_has_members THEN
    -- Get membership details
    SELECT claimed_at, nft_level
    INTO v_claimed_at, v_nft_level
    FROM membership
    WHERE wallet_address ILIKE p_wallet
    ORDER BY nft_level DESC
    LIMIT 1;

    -- Get user info
    SELECT referrer_wallet, username
    INTO v_referrer, v_username
    FROM users
    WHERE wallet_address ILIKE p_wallet;

    -- Get next activation sequence
    SELECT COALESCE(MAX(activation_sequence), 0) + 1
    INTO v_next_sequence
    FROM members;

    v_result := v_result || jsonb_build_object(
      'username', v_username,
      'referrer', v_referrer,
      'claimed_at', v_claimed_at,
      'nft_level', v_nft_level,
      'next_sequence', v_next_sequence
    );

    -- Create missing members record
    -- This will trigger all necessary cascading effects:
    -- - Matrix placement (matrix_referrals)
    -- - Direct referral creation (referrals with is_direct_referral=true)
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
      p_wallet,
      v_referrer,
      v_nft_level,
      v_next_sequence,
      v_claimed_at,
      v_nft_level  -- Assume total_nft_claimed = current level
    );

    RETURN QUERY SELECT
      'SUPPLEMENTED'::TEXT,
      format('✅ Created members record with activation_sequence %s. Triggers will create matrix_referrals and referrals records.', v_next_sequence)::TEXT,
      v_result;
    RETURN;
  END IF;

END;
$$ LANGUAGE plpgsql;

-- Example: Check and supplement a specific wallet
-- Replace this address with the wallet you want to check
SELECT * FROM check_and_supplement_activation('0xYOUR_WALLET_ADDRESS_HERE');

-- Verification queries (run after补充)
SELECT 'Verification: Members Record' as check;
SELECT
  wallet_address,
  current_level,
  activation_sequence,
  activation_time,
  referrer_wallet,
  total_nft_claimed
FROM members
WHERE wallet_address ILIKE '0xYOUR_WALLET_ADDRESS_HERE';

SELECT 'Verification: Direct Referrals (referrals table)' as check;
SELECT
  referrer_wallet,
  member_wallet,
  is_direct_referral,
  referral_time
FROM referrals
WHERE member_wallet ILIKE '0xYOUR_WALLET_ADDRESS_HERE';

SELECT 'Verification: Matrix Placement (matrix_referrals table)' as check;
SELECT
  matrix_root_wallet,
  member_wallet,
  matrix_layer,
  slot_num_seq,
  parent_wallet,
  child_position
FROM matrix_referrals
WHERE member_wallet ILIKE '0xYOUR_WALLET_ADDRESS_HERE'
LIMIT 5;

SELECT 'Verification: Rewards Created' as check;
SELECT
  reward_type,
  reward_recipient_wallet,
  reward_amount_usdt,
  reward_status,
  created_at
FROM rewards
WHERE reward_recipient_wallet ILIKE '0xYOUR_WALLET_ADDRESS_HERE'
LIMIT 10;

COMMIT;
