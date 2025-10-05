-- ============================================================================
-- Script: Update Balances and Create Withdrawal Requests
-- Purpose:
--   1. Set all members' BCC balance to 500 and locked BCC to 10450
--   2. Update user_balances with reward amounts
--   3. Create withdrawal_requests for all claimable rewards
--   4. Mark rewards as claimed and move amounts to total_withdrawn
-- ============================================================================

-- Step 1: Update all members' BCC balances (500 available, 10450 locked)
-- ============================================================================
UPDATE user_balances
SET
  bcc_balance = 500.000000,
  bcc_locked = 10450.000000,
  bcc_total_unlocked = 500.000000,
  last_updated = NOW()
WHERE wallet_address IN (SELECT wallet_address FROM members);

SELECT
  'Updated ' || COUNT(*) || ' member balances with BCC' as status,
  SUM(bcc_balance) as total_bcc_balance,
  SUM(bcc_locked) as total_bcc_locked
FROM user_balances;

-- Step 2: Calculate and update reward balances
-- ============================================================================
WITH direct_rewards_by_wallet AS (
  SELECT
    referrer_wallet as wallet_address,
    SUM(reward_amount) as direct_reward_total
  FROM direct_referral_rewards
  WHERE status = 'claimable'
  GROUP BY referrer_wallet
),
layer_rewards_by_wallet AS (
  SELECT
    reward_recipient_wallet as wallet_address,
    SUM(reward_amount) as layer_reward_total
  FROM layer_rewards
  WHERE status = 'claimable'
  GROUP BY reward_recipient_wallet
),
combined_rewards AS (
  SELECT
    COALESCE(d.wallet_address, l.wallet_address) as wallet_address,
    COALESCE(d.direct_reward_total, 0) as direct_rewards,
    COALESCE(l.layer_reward_total, 0) as layer_rewards,
    COALESCE(d.direct_reward_total, 0) + COALESCE(l.layer_reward_total, 0) as total_rewards
  FROM direct_rewards_by_wallet d
  FULL OUTER JOIN layer_rewards_by_wallet l ON d.wallet_address = l.wallet_address
)
UPDATE user_balances ub
SET
  reward_balance = cr.total_rewards,
  available_balance = cr.total_rewards,
  total_earned = cr.total_rewards,
  last_updated = NOW()
FROM combined_rewards cr
WHERE ub.wallet_address = cr.wallet_address;

SELECT
  'Updated ' || COUNT(*) || ' wallets with reward balances' as status,
  SUM(reward_balance) as total_reward_balance,
  SUM(available_balance) as total_available,
  SUM(total_earned) as total_earned
FROM user_balances
WHERE reward_balance > 0;

-- Step 3: Create withdrawal requests for all rewards
-- ============================================================================
-- Note: Using gen_random_uuid() for id, 'AUTO_WITHDRAWAL' signature for historical data
-- Token address: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 (USDT on Arbitrum One)
-- Chain ID: 42161 (Arbitrum One)

INSERT INTO withdrawal_requests (
  id,
  user_wallet,
  amount,
  target_chain_id,
  token_address,
  user_signature,
  transaction_hash,
  status,
  metadata,
  gas_fee_usd,
  estimated_completion,
  created_at,
  updated_at,
  completed_at
)
SELECT
  gen_random_uuid()::text as id,
  wallet_address as user_wallet,
  reward_balance as amount,
  42161 as target_chain_id,  -- Arbitrum One
  '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as token_address,  -- USDT on Arbitrum
  'AUTO_WITHDRAWAL_HISTORICAL_REWARDS' as user_signature,
  NULL as transaction_hash,
  'completed' as status,  -- Mark as completed since these are historical
  jsonb_build_object(
    'reward_type', 'historical_rewards',
    'auto_withdrawal', true,
    'direct_rewards_included', true,
    'layer_rewards_included', true,
    'withdrawal_date', NOW()
  ) as metadata,
  0 as gas_fee_usd,  -- No gas fee for historical auto-withdrawal
  NOW() as estimated_completion,
  NOW() as created_at,
  NOW() as updated_at,
  NOW() as completed_at
FROM user_balances
WHERE reward_balance > 0;

SELECT
  'Created ' || COUNT(*) || ' withdrawal requests' as status,
  SUM(amount) as total_withdrawal_amount
FROM withdrawal_requests
WHERE user_signature = 'AUTO_WITHDRAWAL_HISTORICAL_REWARDS';

-- Step 4: Mark all rewards as claimed
-- ============================================================================
UPDATE direct_referral_rewards
SET
  status = 'claimed',
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{claimed_at}',
    to_jsonb(NOW()::text)
  )
WHERE status = 'claimable';

SELECT
  'Marked ' || COUNT(*) || ' direct referral rewards as claimed' as status
FROM direct_referral_rewards
WHERE status = 'claimed';

UPDATE layer_rewards
SET
  status = 'claimed'
WHERE status = 'claimable';

SELECT
  'Marked ' || COUNT(*) || ' layer rewards as claimed' as status
FROM layer_rewards
WHERE status = 'claimed';

-- Step 5: Update user_balances - move rewards to total_withdrawn, zero out reward_balance
-- ============================================================================
UPDATE user_balances
SET
  total_withdrawn = reward_balance,
  reward_claimed = reward_balance,
  reward_balance = 0,
  available_balance = 0,
  last_updated = NOW()
WHERE reward_balance > 0;

SELECT
  'Updated ' || COUNT(*) || ' user balances - moved to total_withdrawn' as status,
  SUM(total_withdrawn) as total_withdrawn_amount,
  SUM(reward_claimed) as total_reward_claimed
FROM user_balances
WHERE total_withdrawn > 0;

-- Step 6: Final Summary Report
-- ============================================================================
SELECT '════════════════════════════════════════' as separator
UNION ALL
SELECT '  BALANCE & WITHDRAWAL UPDATE SUMMARY' as separator
UNION ALL
SELECT '════════════════════════════════════════' as separator
UNION ALL
SELECT '' as separator
UNION ALL
SELECT '1. BCC BALANCES:' as separator;

SELECT
  '   Total Members: ' || COUNT(*) as info
FROM user_balances
WHERE bcc_balance > 0
UNION ALL
SELECT
  '   BCC Balance per member: ' || DISTINCT bcc_balance as info
FROM user_balances
WHERE bcc_balance > 0
LIMIT 1
UNION ALL
SELECT
  '   BCC Locked per member: ' || DISTINCT bcc_locked as info
FROM user_balances
WHERE bcc_locked > 0
LIMIT 1
UNION ALL
SELECT
  '   Total BCC Balance: ' || SUM(bcc_balance) as info
FROM user_balances
UNION ALL
SELECT
  '   Total BCC Locked: ' || SUM(bcc_locked) as info
FROM user_balances;

SELECT '' as separator
UNION ALL
SELECT '2. REWARD WITHDRAWALS:' as separator;

SELECT
  '   Wallets with withdrawals: ' || COUNT(DISTINCT user_wallet) as info
FROM withdrawal_requests
WHERE user_signature = 'AUTO_WITHDRAWAL_HISTORICAL_REWARDS'
UNION ALL
SELECT
  '   Total withdrawal requests: ' || COUNT(*) as info
FROM withdrawal_requests
WHERE user_signature = 'AUTO_WITHDRAWAL_HISTORICAL_REWARDS'
UNION ALL
SELECT
  '   Total withdrawn amount: ' || SUM(amount) || ' USDT' as info
FROM withdrawal_requests
WHERE user_signature = 'AUTO_WITHDRAWAL_HISTORICAL_REWARDS'
UNION ALL
SELECT
  '   Min withdrawal: ' || MIN(amount) || ' USDT' as info
FROM withdrawal_requests
WHERE user_signature = 'AUTO_WITHDRAWAL_HISTORICAL_REWARDS'
UNION ALL
SELECT
  '   Max withdrawal: ' || MAX(amount) || ' USDT' as info
FROM withdrawal_requests
WHERE user_signature = 'AUTO_WITHDRAWAL_HISTORICAL_REWARDS'
UNION ALL
SELECT
  '   Avg withdrawal: ' || ROUND(AVG(amount), 2) || ' USDT' as info
FROM withdrawal_requests
WHERE user_signature = 'AUTO_WITHDRAWAL_HISTORICAL_REWARDS';

SELECT '' as separator
UNION ALL
SELECT '3. USER BALANCES:' as separator;

SELECT
  '   Total earned (all time): ' || SUM(total_earned) || ' USDT' as info
FROM user_balances
UNION ALL
SELECT
  '   Total withdrawn: ' || SUM(total_withdrawn) || ' USDT' as info
FROM user_balances
UNION ALL
SELECT
  '   Total claimed rewards: ' || SUM(reward_claimed) || ' USDT' as info
FROM user_balances
UNION ALL
SELECT
  '   Current reward balance: ' || SUM(reward_balance) || ' USDT' as info
FROM user_balances
UNION ALL
SELECT
  '   Current available balance: ' || SUM(available_balance) || ' USDT' as info
FROM user_balances;

SELECT '' as separator
UNION ALL
SELECT '4. REWARD STATUS:' as separator;

SELECT
  '   Direct referral rewards claimed: ' || COUNT(*) as info
FROM direct_referral_rewards
WHERE status = 'claimed'
UNION ALL
SELECT
  '   Layer rewards claimed: ' || COUNT(*) as info
FROM layer_rewards
WHERE status = 'claimed';

SELECT '' as separator
UNION ALL
SELECT '════════════════════════════════════════' as separator
UNION ALL
SELECT '  ✅ UPDATE COMPLETE' as separator
UNION ALL
SELECT '════════════════════════════════════════' as separator;
