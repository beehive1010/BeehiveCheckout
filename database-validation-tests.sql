-- =====================================================
-- BEEHIVE Member Flow Database Validation Tests
-- =====================================================
-- Database: PostgreSQL (Supabase)
-- Purpose: Validate complete member activation and upgrade flow
-- Date: 2025-10-06
-- =====================================================

-- =====================================================
-- PART 1: SCHEMA VALIDATION
-- =====================================================

-- 1.1 Check all required tables exist
SELECT
  table_name,
  CASE
    WHEN table_name IN (
      'users', 'members', 'membership', 'referrals', 'matrix_referrals',
      'direct_rewards', 'layer_rewards_2', 'layer_rewards_3', 'layer_rewards_4',
      'layer_rewards_5', 'layer_rewards_6', 'layer_rewards_7', 'layer_rewards_8',
      'layer_rewards_9', 'layer_rewards_10', 'layer_rewards_11', 'layer_rewards_12',
      'layer_rewards_13', 'layer_rewards_14', 'layer_rewards_15', 'layer_rewards_16',
      'layer_rewards_17', 'layer_rewards_18', 'layer_rewards_19',
      'reward_timers', 'user_balances', 'bcc_release_logs', 'bcc_transactions',
      'platform_fees'
    ) THEN '✅ Required'
    ELSE '⚠️ Additional'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY
  CASE WHEN table_name IN (
    'users', 'members', 'membership', 'referrals', 'matrix_referrals',
    'direct_rewards', 'user_balances', 'bcc_release_logs', 'platform_fees'
  ) THEN 1 ELSE 2 END,
  table_name;

-- 1.2 Check database functions exist
SELECT
  routine_name as function_name,
  routine_type,
  CASE
    WHEN routine_name LIKE '%activation_sequence%' THEN '✅ Activation'
    WHEN routine_name LIKE '%matrix%' THEN '✅ Matrix'
    WHEN routine_name LIKE '%reward%' THEN '✅ Rewards'
    WHEN routine_name LIKE '%bcc%' THEN '✅ BCC'
    ELSE '⚠️ Other'
  END as category
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY category, routine_name;

-- 1.3 Check triggers exist
SELECT
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation as event_type,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- PART 2: LEVEL 1 ACTIVATION VALIDATION
-- =====================================================

-- Replace 'TEST_WALLET' with actual test wallet address
\set test_wallet 'TEST_WALLET'

-- 2.1 Verify User Registration
SELECT
  '2.1 User Registration' as test_case,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ Pass'
    WHEN COUNT(*) = 0 THEN '❌ Fail: User not registered'
    ELSE '⚠️ Warning: Multiple records'
  END as status,
  COUNT(*) as record_count
FROM users
WHERE LOWER(wallet_address) = LOWER(:'test_wallet');

-- 2.2 Verify Member Record Created
SELECT
  '2.2 Member Record' as test_case,
  CASE
    WHEN COUNT(*) = 1 AND MIN(activation_sequence) IS NOT NULL THEN '✅ Pass'
    WHEN COUNT(*) = 0 THEN '❌ Fail: Member not created'
    WHEN MIN(activation_sequence) IS NULL THEN '❌ Fail: No activation sequence'
    ELSE '⚠️ Warning: Multiple records'
  END as status,
  COUNT(*) as record_count,
  MIN(activation_sequence) as activation_seq,
  MIN(current_level) as level
FROM members
WHERE LOWER(wallet_address) = LOWER(:'test_wallet');

-- 2.3 Verify Membership Level 1
SELECT
  '2.3 Membership Level 1' as test_case,
  CASE
    WHEN COUNT(*) >= 1 AND MIN(nft_level) = 1 THEN '✅ Pass'
    WHEN COUNT(*) = 0 THEN '❌ Fail: No membership record'
    WHEN MIN(nft_level) != 1 THEN '❌ Fail: Wrong level'
    ELSE '⚠️ Warning'
  END as status,
  COUNT(*) as record_count,
  MIN(nft_level) as nft_level,
  MIN(claim_price) as price
FROM membership
WHERE LOWER(wallet_address) = LOWER(:'test_wallet')
AND nft_level = 1;

-- 2.4 Verify Platform Fee Recorded
SELECT
  '2.4 Platform Fee' as test_case,
  CASE
    WHEN COUNT(*) >= 1 AND MIN(fee_amount) = 30 THEN '✅ Pass'
    WHEN COUNT(*) = 0 THEN '❌ Fail: No platform fee recorded'
    WHEN MIN(fee_amount) != 30 THEN '⚠️ Warning: Fee amount mismatch'
    ELSE '⚠️ Warning'
  END as status,
  COUNT(*) as record_count,
  MIN(fee_amount) as fee_amount,
  MIN(admin_wallet) as admin_wallet
FROM platform_fees
WHERE LOWER(wallet_address) = LOWER(:'test_wallet')
AND level = 1;

-- 2.5 Verify Referral Record
SELECT
  '2.5 Referral Record' as test_case,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ Pass'
    WHEN COUNT(*) = 0 THEN '❌ Fail: No referral record'
    ELSE '⚠️ Warning: Multiple records'
  END as status,
  COUNT(*) as record_count,
  MIN(referrer_wallet) as referrer
FROM referrals
WHERE LOWER(referred_wallet) = LOWER(:'test_wallet');

-- 2.6 Verify Matrix Placements
SELECT
  '2.6 Matrix Placements' as test_case,
  CASE
    WHEN COUNT(*) > 0 AND COUNT(*) <= 19 THEN '✅ Pass'
    WHEN COUNT(*) = 0 THEN '❌ Fail: No matrix placements'
    WHEN COUNT(*) > 19 THEN '⚠️ Warning: Too many placements'
    ELSE '⚠️ Warning'
  END as status,
  COUNT(*) as total_placements,
  MIN(layer) as min_layer,
  MAX(layer) as max_layer
FROM matrix_referrals
WHERE LOWER(wallet_address) = LOWER(:'test_wallet');

-- 2.7 Verify Direct Reward Created (for referrer)
SELECT
  '2.7 Direct Reward (Referrer)' as test_case,
  CASE
    WHEN COUNT(*) >= 1 THEN '✅ Pass (Check referrer wallet)'
    WHEN COUNT(*) = 0 THEN '⚠️ Info: No direct reward (check if member has referrals)'
    ELSE '⚠️ Warning'
  END as status,
  COUNT(*) as reward_count
FROM direct_rewards dr
JOIN referrals r ON LOWER(r.referrer_wallet) = LOWER(dr.root_wallet)
WHERE LOWER(r.referred_wallet) = LOWER(:'test_wallet');

-- 2.8 Verify BCC Initialization
SELECT
  '2.8 BCC Balance' as test_case,
  CASE
    WHEN COUNT(*) = 1 AND MIN(bcc_balance) = 500 AND MIN(bcc_locked) > 0 THEN '✅ Pass'
    WHEN COUNT(*) = 0 THEN '❌ Fail: No BCC balance record'
    WHEN MIN(bcc_balance) != 500 THEN '❌ Fail: Wrong BCC balance'
    WHEN MIN(bcc_locked) = 0 THEN '❌ Fail: No BCC locked'
    ELSE '⚠️ Warning'
  END as status,
  MIN(bcc_balance) as bcc_balance,
  MIN(bcc_locked) as bcc_locked,
  CASE
    WHEN MIN(bcc_locked) = 10450 THEN 'Phase 1'
    WHEN MIN(bcc_locked) = 5225 THEN 'Phase 2'
    WHEN MIN(bcc_locked) = 2612.5 THEN 'Phase 3'
    WHEN MIN(bcc_locked) = 1306.25 THEN 'Phase 4'
    ELSE 'Unknown'
  END as phase
FROM user_balances
WHERE LOWER(wallet_address) = LOWER(:'test_wallet');

-- 2.9 Verify BCC Transactions Logged
SELECT
  '2.9 BCC Transactions' as test_case,
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ Pass'
    WHEN COUNT(*) = 0 THEN '❌ Fail: No BCC transactions'
    WHEN COUNT(*) = 1 THEN '⚠️ Warning: Only 1 transaction (expected 2)'
    ELSE '⚠️ Warning'
  END as status,
  COUNT(*) as transaction_count,
  STRING_AGG(DISTINCT balance_type, ', ') as balance_types
FROM bcc_transactions
WHERE LOWER(wallet_address) = LOWER(:'test_wallet')
AND purpose LIKE '%activation%' OR purpose LIKE '%locked%';

-- =====================================================
-- PART 3: LEVEL 2 UPGRADE VALIDATION
-- =====================================================

-- 3.1 Verify Direct Referral Count (Requirement for Level 2)
SELECT
  '3.1 Direct Referral Count' as test_case,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ Pass (Can upgrade to Level 2)'
    WHEN COUNT(*) > 0 AND COUNT(*) < 3 THEN '⚠️ Warning: Need ' || (3 - COUNT(*))::text || ' more referrals'
    WHEN COUNT(*) = 0 THEN '❌ Fail: No direct referrals'
    ELSE '⚠️ Warning'
  END as status,
  COUNT(*) as direct_referral_count
FROM referrals
WHERE LOWER(referrer_wallet) = LOWER(:'test_wallet');

-- 3.2 Verify Level 2 Membership (If upgraded)
SELECT
  '3.2 Membership Level 2' as test_case,
  CASE
    WHEN COUNT(*) >= 1 THEN '✅ Pass'
    WHEN COUNT(*) = 0 THEN '⚠️ Info: Not yet upgraded to Level 2'
    ELSE '⚠️ Warning'
  END as status,
  COUNT(*) as record_count,
  MIN(claim_price) as price_paid
FROM membership
WHERE LOWER(wallet_address) = LOWER(:'test_wallet')
AND nft_level = 2;

-- 3.3 Verify Member Level Updated
SELECT
  '3.3 Member Level Updated' as test_case,
  CASE
    WHEN COUNT(*) = 1 AND MIN(current_level) >= 2 THEN '✅ Pass'
    WHEN COUNT(*) = 1 AND MIN(current_level) = 1 THEN '⚠️ Info: Still Level 1'
    WHEN COUNT(*) = 0 THEN '❌ Fail: No member record'
    ELSE '⚠️ Warning'
  END as status,
  MIN(current_level) as current_level,
  MIN(levels_owned::text) as levels_owned
FROM members
WHERE LOWER(wallet_address) = LOWER(:'test_wallet');

-- 3.4 Verify Layer Rewards Created (Level 2)
SELECT
  '3.4 Layer Rewards L2 Created' as test_case,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Pass (' || COUNT(*) || ' rewards)'
    WHEN COUNT(*) = 0 THEN '⚠️ Info: No Layer 2 rewards (check if upgraded)'
    ELSE '⚠️ Warning'
  END as status,
  COUNT(*) as total_rewards,
  COUNT(*) FILTER (WHERE status = 'claimable') as claimable,
  COUNT(*) FILTER (WHERE status = 'pending') as pending
FROM layer_rewards_2
WHERE LOWER(referral_wallet) = LOWER(:'test_wallet');

-- 3.5 Verify BCC Unlock for Level 2
SELECT
  '3.5 BCC Unlock Level 2' as test_case,
  CASE
    WHEN COUNT(*) >= 1 AND MIN(bcc_released) = 100 THEN '✅ Pass'
    WHEN COUNT(*) = 0 THEN '⚠️ Info: No Level 2 BCC unlock'
    WHEN MIN(bcc_released) != 100 THEN '❌ Fail: Wrong BCC amount'
    ELSE '⚠️ Warning'
  END as status,
  MIN(bcc_released) as bcc_unlocked,
  MIN(bcc_remaining_locked) as remaining_locked
FROM bcc_release_logs
WHERE LOWER(wallet_address) = LOWER(:'test_wallet')
AND to_level = 2;

-- 3.6 Verify BCC Balance After Level 2
SELECT
  '3.6 BCC Balance After L2' as test_case,
  CASE
    WHEN MIN(bcc_balance) >= 600 THEN '✅ Pass (Level 2+ completed)'
    WHEN MIN(bcc_balance) = 500 THEN '⚠️ Info: Still Level 1 (500 BCC)'
    ELSE '⚠️ Warning: Unexpected balance'
  END as status,
  MIN(bcc_balance) as bcc_balance,
  MIN(bcc_locked) as bcc_locked
FROM user_balances
WHERE LOWER(wallet_address) = LOWER(:'test_wallet');

-- =====================================================
-- PART 4: LEVEL 3-19 VALIDATION
-- =====================================================

-- 4.1 Check BCC Release Progression
SELECT
  '4.1 BCC Release Progression' as test_case,
  CASE
    WHEN COUNT(*) = expected_releases THEN '✅ Pass'
    WHEN COUNT(*) < expected_releases THEN '⚠️ Info: Level ' || (COUNT(*) + 1) || ' pending'
    WHEN COUNT(*) > expected_releases THEN '⚠️ Warning: Unexpected releases'
    ELSE '⚠️ Warning'
  END as status,
  COUNT(*) as actual_releases,
  (
    SELECT current_level - 1
    FROM members
    WHERE LOWER(wallet_address) = LOWER(:'test_wallet')
  ) as expected_releases,
  SUM(bcc_released) as total_bcc_unlocked
FROM bcc_release_logs
WHERE LOWER(wallet_address) = LOWER(:'test_wallet');

-- 4.2 Verify Level 19 Double Unlock (If reached)
SELECT
  '4.2 Level 19 Double Unlock' as test_case,
  CASE
    WHEN COUNT(*) = 2 AND SUM(bcc_released) = 1950 THEN '✅ Pass'
    WHEN COUNT(*) = 1 THEN '⚠️ Info: Only 1 of 2 unlocks completed'
    WHEN COUNT(*) = 0 THEN '⚠️ Info: Level 19 not reached'
    WHEN SUM(bcc_released) != 1950 THEN '❌ Fail: Wrong BCC amount'
    ELSE '⚠️ Warning'
  END as status,
  COUNT(*) as unlock_count,
  SUM(bcc_released) as total_unlocked,
  STRING_AGG(unlock_sequence::text || ':' || bcc_released::text, ', ') as sequences
FROM bcc_release_logs
WHERE LOWER(wallet_address) = LOWER(:'test_wallet')
AND to_level = 19;

-- 4.3 Verify All Membership Levels Match BCC Releases
WITH level_comparison AS (
  SELECT
    m.current_level,
    m.levels_owned,
    array_length(m.levels_owned, 1) as owned_count,
    (SELECT COUNT(*) FROM membership WHERE LOWER(wallet_address) = LOWER(:'test_wallet')) as membership_count,
    (SELECT COUNT(*) FROM bcc_release_logs WHERE LOWER(wallet_address) = LOWER(:'test_wallet')) as release_count
  FROM members m
  WHERE LOWER(m.wallet_address) = LOWER(:'test_wallet')
)
SELECT
  '4.3 Level Consistency Check' as test_case,
  CASE
    WHEN current_level = owned_count
     AND membership_count = owned_count
     AND release_count = (current_level - 1) THEN '✅ Pass'
    ELSE '⚠️ Warning: Inconsistent levels'
  END as status,
  current_level,
  owned_count,
  membership_count,
  release_count,
  'Expected releases: ' || (current_level - 1)::text as expected
FROM level_comparison;

-- =====================================================
-- PART 5: REWARD SYSTEM VALIDATION
-- =====================================================

-- 5.1 Check Reward Status Distribution
WITH all_rewards AS (
  SELECT 'Direct' as type, status, reward_usdt, expires_at
  FROM direct_rewards
  WHERE LOWER(root_wallet) = LOWER(:'test_wallet')

  UNION ALL

  SELECT 'Layer 2' as type, status, reward_usdt, expires_at
  FROM layer_rewards_2
  WHERE LOWER(root_wallet) = LOWER(:'test_wallet')

  -- Add more layer_rewards tables as needed
)
SELECT
  '5.1 Reward Status Summary' as test_case,
  type,
  status,
  COUNT(*) as count,
  SUM(reward_usdt) as total_usdt,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL) as with_timer
FROM all_rewards
GROUP BY type, status
ORDER BY type, status;

-- 5.2 Check Reward Timers
SELECT
  '5.2 Reward Timers' as test_case,
  CASE
    WHEN COUNT(*) > 0 AND COUNT(*) FILTER (WHERE expires_at > NOW()) > 0 THEN '✅ Active timers'
    WHEN COUNT(*) > 0 AND COUNT(*) FILTER (WHERE expires_at <= NOW()) > 0 THEN '⚠️ Warning: Expired timers'
    WHEN COUNT(*) = 0 THEN '⚠️ Info: No pending rewards'
    ELSE '⚠️ Warning'
  END as status,
  COUNT(*) as total_timers,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired
FROM reward_timers
WHERE LOWER(recipient_wallet) = LOWER(:'test_wallet');

-- 5.3 Check User Balance Sync
WITH balance_check AS (
  SELECT
    ub.total_usdt_earned,
    ub.reward_balance,
    (
      SELECT COALESCE(SUM(reward_usdt), 0)
      FROM direct_rewards
      WHERE LOWER(root_wallet) = LOWER(:'test_wallet')
      AND status = 'claimable'
    ) +
    (
      SELECT COALESCE(SUM(reward_usdt), 0)
      FROM layer_rewards_2
      WHERE LOWER(root_wallet) = LOWER(:'test_wallet')
      AND status = 'claimable'
    ) as calculated_claimable
  FROM user_balances ub
  WHERE LOWER(ub.wallet_address) = LOWER(:'test_wallet')
)
SELECT
  '5.3 Balance Sync Check' as test_case,
  CASE
    WHEN total_usdt_earned >= calculated_claimable THEN '✅ Pass'
    WHEN total_usdt_earned < calculated_claimable THEN '⚠️ Warning: Balance mismatch'
    ELSE '⚠️ Warning'
  END as status,
  total_usdt_earned,
  calculated_claimable,
  reward_balance
FROM balance_check;

-- =====================================================
-- PART 6: MATRIX STRUCTURE VALIDATION
-- =====================================================

-- 6.1 Verify Matrix Path Integrity
WITH matrix_paths AS (
  SELECT
    layer,
    position,
    path,
    matrix_root,
    parent_wallet,
    referral_type
  FROM matrix_referrals
  WHERE LOWER(wallet_address) = LOWER(:'test_wallet')
  ORDER BY layer
)
SELECT
  '6.1 Matrix Path Check' as test_case,
  layer,
  position,
  path,
  referral_type,
  CASE
    WHEN layer = 1 AND parent_wallet IS NOT NULL THEN '✅ Has parent'
    WHEN layer > 1 AND parent_wallet IS NOT NULL THEN '✅ Has parent'
    WHEN parent_wallet IS NULL THEN '⚠️ No parent (check if root)'
    ELSE '⚠️ Warning'
  END as parent_status
FROM matrix_paths;

-- 6.2 Verify Matrix Children Count (if member has referrals)
SELECT
  '6.2 Matrix Children Count' as test_case,
  layer,
  COUNT(*) as children_count,
  STRING_AGG(position, ',') as positions_filled
FROM matrix_referrals
WHERE LOWER(matrix_root) = LOWER(:'test_wallet')
GROUP BY layer
ORDER BY layer;

-- =====================================================
-- PART 7: FINAL SUMMARY REPORT
-- =====================================================

-- 7.1 Complete Member Summary
SELECT
  '=== MEMBER SUMMARY ===' as section,
  m.wallet_address,
  m.activation_sequence as rank,
  m.current_level,
  array_length(m.levels_owned, 1) as total_levels_owned,
  m.referrer_wallet,
  m.activation_time
FROM members m
WHERE LOWER(m.wallet_address) = LOWER(:'test_wallet')

UNION ALL

SELECT
  '=== BCC SUMMARY ===' as section,
  ub.wallet_address,
  ub.bcc_balance::text,
  ub.bcc_locked::text,
  (ub.bcc_balance + ub.bcc_locked)::text as total_bcc,
  NULL,
  NULL
FROM user_balances ub
WHERE LOWER(ub.wallet_address) = LOWER(:'test_wallet')

UNION ALL

SELECT
  '=== USDT REWARDS ===' as section,
  ub.wallet_address,
  ub.total_usdt_earned::text,
  ub.reward_balance::text,
  (ub.total_usdt_earned - ub.reward_balance)::text as claimed,
  NULL,
  NULL
FROM user_balances ub
WHERE LOWER(ub.wallet_address) = LOWER(:'test_wallet')

UNION ALL

SELECT
  '=== REFERRAL STATS ===' as section,
  m.wallet_address,
  (SELECT COUNT(*) FROM referrals WHERE LOWER(referrer_wallet) = LOWER(m.wallet_address))::text,
  (SELECT COUNT(*) FROM matrix_referrals WHERE LOWER(matrix_root) = LOWER(m.wallet_address))::text,
  NULL,
  NULL,
  NULL
FROM members m
WHERE LOWER(m.wallet_address) = LOWER(:'test_wallet');

-- =====================================================
-- PART 8: ERROR DETECTION
-- =====================================================

-- 8.1 Detect Missing Records
SELECT
  'Missing Records Check' as test_case,
  'User' as record_type,
  CASE WHEN COUNT(*) = 0 THEN '❌ Missing' ELSE '✅ Exists' END as status
FROM users WHERE LOWER(wallet_address) = LOWER(:'test_wallet')

UNION ALL

SELECT 'Missing Records Check', 'Member',
  CASE WHEN COUNT(*) = 0 THEN '❌ Missing' ELSE '✅ Exists' END
FROM members WHERE LOWER(wallet_address) = LOWER(:'test_wallet')

UNION ALL

SELECT 'Missing Records Check', 'Membership',
  CASE WHEN COUNT(*) = 0 THEN '❌ Missing' ELSE '✅ Exists' END
FROM membership WHERE LOWER(wallet_address) = LOWER(:'test_wallet')

UNION ALL

SELECT 'Missing Records Check', 'Referral',
  CASE WHEN COUNT(*) = 0 THEN '⚠️ No referral' ELSE '✅ Exists' END
FROM referrals WHERE LOWER(referred_wallet) = LOWER(:'test_wallet')

UNION ALL

SELECT 'Missing Records Check', 'Matrix Placement',
  CASE WHEN COUNT(*) = 0 THEN '❌ Missing' ELSE '✅ Exists' END
FROM matrix_referrals WHERE LOWER(wallet_address) = LOWER(:'test_wallet')

UNION ALL

SELECT 'Missing Records Check', 'BCC Balance',
  CASE WHEN COUNT(*) = 0 THEN '❌ Missing' ELSE '✅ Exists' END
FROM user_balances WHERE LOWER(wallet_address) = LOWER(:'test_wallet');

-- 8.2 Detect Orphaned Records
SELECT
  'Orphaned Records Check' as test_case,
  'Membership without Member' as issue,
  COUNT(*) as count
FROM membership ms
LEFT JOIN members m ON LOWER(ms.wallet_address) = LOWER(m.wallet_address)
WHERE m.wallet_address IS NULL
AND LOWER(ms.wallet_address) = LOWER(:'test_wallet')

UNION ALL

SELECT 'Orphaned Records Check', 'Matrix without Member', COUNT(*)
FROM matrix_referrals mr
LEFT JOIN members m ON LOWER(mr.wallet_address) = LOWER(m.wallet_address)
WHERE m.wallet_address IS NULL
AND LOWER(mr.wallet_address) = LOWER(:'test_wallet')

UNION ALL

SELECT 'Orphaned Records Check', 'Reward without Member', COUNT(*)
FROM direct_rewards dr
LEFT JOIN members m ON LOWER(dr.root_wallet) = LOWER(m.wallet_address)
WHERE m.wallet_address IS NULL
AND LOWER(dr.root_wallet) = LOWER(:'test_wallet');

-- =====================================================
-- END OF VALIDATION TESTS
-- =====================================================

-- Usage Instructions:
-- 1. Replace 'TEST_WALLET' with actual test wallet address
-- 2. Execute all queries in sequence
-- 3. Review ✅ Pass, ⚠️ Warning, and ❌ Fail results
-- 4. Document any failures in test report
-- =====================================================
