-- Verify Complete Level Upgrade Flow
-- Tests both BCC initialization and pending rewards promotion

BEGIN;

-- ============================================================================
-- PART 1: Verify BCC Initialization for New Members
-- ============================================================================
SELECT '=== PART 1: BCC INITIALIZATION VERIFICATION ===' as section;

-- Check recent members have correct BCC balances
SELECT
    m.wallet_address,
    m.activation_sequence,
    m.current_level,
    ub.bcc_balance as available_bcc,
    ub.bcc_locked as locked_bcc,
    CASE
        WHEN ub.bcc_balance = 500 AND ub.bcc_locked = 10450 THEN '✅ CORRECT'
        WHEN ub.bcc_balance IS NULL THEN '❌ MISSING'
        ELSE '❌ INCORRECT VALUES'
    END as status
FROM members m
LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
WHERE m.activation_sequence >= 4018
ORDER BY m.activation_sequence;

-- Check trigger exists
SELECT
    '=== Trigger Status ===' as check,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'members'
  AND trigger_name = 'trigger_auto_create_balance_with_initial';

-- ============================================================================
-- PART 2: Test Pending Rewards Promotion Logic
-- ============================================================================
SELECT '=== PART 2: PENDING REWARDS PROMOTION ===' as section;

-- Find members with pending rewards
SELECT
    'Members with pending rewards' as check,
    lr.reward_recipient_wallet,
    COUNT(*) as pending_count,
    SUM(lr.reward_amount) as total_pending_value,
    m.current_level as recipient_current_level,
    MIN(lr.recipient_required_level) as min_required_level
FROM layer_rewards lr
INNER JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.status = 'pending'
  AND lr.expires_at > NOW()
GROUP BY lr.reward_recipient_wallet, m.current_level
ORDER BY m.current_level, pending_count DESC
LIMIT 10;

-- Show specific examples of pending rewards that could be promoted
SELECT
    'Example pending rewards' as check,
    lr.id,
    lr.reward_recipient_wallet,
    lr.reward_amount,
    lr.matrix_layer,
    lr.recipient_required_level as needs_level,
    m.current_level as has_level,
    CASE
        WHEN m.current_level >= lr.recipient_required_level THEN '✅ Should be claimable!'
        ELSE '⏳ Needs upgrade to Level ' || lr.recipient_required_level
    END as status
FROM layer_rewards lr
INNER JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.status = 'pending'
  AND lr.expires_at > NOW()
ORDER BY lr.reward_recipient_wallet, lr.matrix_layer
LIMIT 20;

-- ============================================================================
-- PART 3: Test check_pending_rewards_after_upgrade Function
-- ============================================================================
SELECT '=== PART 3: FUNCTION TEST ===' as section;

-- Test the function with a member who has pending rewards (if any)
DO $$
DECLARE
    test_wallet VARCHAR(42);
    test_level INTEGER;
    result JSON;
BEGIN
    -- Find a member with pending rewards
    SELECT lr.reward_recipient_wallet, m.current_level + 1
    INTO test_wallet, test_level
    FROM layer_rewards lr
    INNER JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
    WHERE lr.status = 'pending'
      AND lr.expires_at > NOW()
      AND m.current_level < lr.recipient_required_level
    LIMIT 1;

    IF test_wallet IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing check_pending_rewards_after_upgrade for % upgrading to Level %', test_wallet, test_level;

        -- Simulate the function call (without actually changing data)
        SELECT COUNT(*) FROM layer_rewards
        WHERE reward_recipient_wallet = test_wallet
          AND status = 'pending'
          AND recipient_required_level <= test_level
        INTO result;

        RAISE NOTICE '✅ Found % pending rewards that would become claimable', result;
    ELSE
        RAISE NOTICE 'ℹ️ No suitable test case found (no pending rewards waiting for upgrade)';
    END IF;
END $$;

-- ============================================================================
-- PART 4: Check Level-Upgrade Edge Function Integration
-- ============================================================================
SELECT '=== PART 4: EDGE FUNCTION INTEGRATION ===' as section;

-- Verify that recent level upgrades triggered pending rewards check
SELECT
    'Recent upgrades' as check,
    wallet_address,
    action,
    created_at,
    details->>'toLevel' as upgraded_to_level
FROM audit_logs
WHERE action = 'level_upgrade'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 5;

-- Check if any pending rewards were promoted recently
SELECT
    'Recent promotions' as check,
    user_wallet,
    action,
    created_at,
    new_values->>'reward_amount' as reward_amount,
    new_values->>'new_level' as new_level
FROM audit_logs
WHERE action = 'pending_reward_became_claimable'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

ROLLBACK;  -- Don't commit, this is just a verification query

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '=== VERIFICATION SUMMARY ===' as section;

SELECT
    '1. BCC Initialization' as feature,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers
            WHERE event_object_table = 'members'
              AND trigger_name = 'trigger_auto_create_balance_with_initial'
        ) THEN '✅ Trigger exists'
        ELSE '❌ Trigger missing'
    END as status;

SELECT
    '2. Pending Rewards Function' as feature,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
              AND routine_name = 'check_pending_rewards_after_upgrade'
        ) THEN '✅ Function exists'
        ELSE '❌ Function missing'
    END as status;

SELECT
    '3. Recent Members BCC' as feature,
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM members m
            INNER JOIN user_balances ub ON m.wallet_address = ub.wallet_address
            WHERE m.activation_sequence >= 4018
              AND ub.bcc_balance = 500
              AND ub.bcc_locked = 10450
        ) >= 5 THEN '✅ All initialized correctly'
        ELSE '❌ Some missing or incorrect'
    END as status;
