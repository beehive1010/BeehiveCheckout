-- Frontend-Backend Integration Verification
-- Check data flow: Frontend → Edge Functions → Database Functions → Triggers

BEGIN;

-- ============================================================================
-- PART 1: Database Views Used by Frontend
-- ============================================================================
SELECT '=== PART 1: FRONTEND DATABASE VIEWS ===' as section;

-- Check if critical views exist
SELECT
    'View Existence Check' as check,
    table_name,
    CASE
        WHEN table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'v_member_overview',          -- Dashboard member info
    'v_direct_referrals',          -- Referrals page
    'v_reward_overview',           -- Rewards page
    'v_matrix_overview',           -- Matrix visualization
    'v_user_balance_overview'      -- Balance display
  )
ORDER BY table_name;

-- ============================================================================
-- PART 2: Edge Functions RPC Endpoints
-- ============================================================================
SELECT '=== PART 2: EDGE FUNCTIONS (RPC ENDPOINTS) ===' as section;

-- Check if critical RPC functions exist
SELECT
    'RPC Function Existence' as check,
    routine_name,
    routine_type,
    CASE
        WHEN routine_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    -- Membership activation
    'place_new_member_in_matrix_correct',
    'trigger_layer_rewards_on_upgrade',

    -- Level upgrade
    'check_pending_rewards_after_upgrade',
    'trigger_matrix_layer_rewards',

    -- Rewards
    'claim_layer_reward',
    'get_user_pending_rewards',

    -- Balance
    'process_reward_rollup'
  )
ORDER BY routine_name;

-- ============================================================================
-- PART 3: Database Triggers
-- ============================================================================
SELECT '=== PART 3: DATABASE TRIGGERS ===' as section;

-- Check critical triggers
SELECT
    'Trigger Check' as check,
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement,
    CASE
        WHEN trigger_name IS NOT NULL THEN '✅ ACTIVE'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.triggers
WHERE event_object_table IN ('members', 'membership', 'layer_rewards')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- PART 4: Data Flow Test - New Member Registration
-- ============================================================================
SELECT '=== PART 4: NEW MEMBER REGISTRATION FLOW ===' as section;

-- Test data flow for recent member
WITH test_member AS (
    SELECT wallet_address, activation_sequence, current_level, activation_time
    FROM members
    WHERE activation_sequence >= 4020
    ORDER BY activation_sequence DESC
    LIMIT 1
)
SELECT
    'Step 1: Members Table' as flow_step,
    CASE WHEN COUNT(*) > 0 THEN '✅ Record exists' ELSE '❌ Missing' END as status,
    COUNT(*) as count
FROM test_member

UNION ALL

SELECT
    'Step 2: Membership Table' as flow_step,
    CASE WHEN COUNT(*) > 0 THEN '✅ Level 1 created' ELSE '❌ Missing' END as status,
    COUNT(*) as count
FROM test_member tm
INNER JOIN membership m ON tm.wallet_address = m.wallet_address
WHERE m.nft_level = 1

UNION ALL

SELECT
    'Step 3: User Balances (BCC)' as flow_step,
    CASE
        WHEN COUNT(*) > 0 AND MAX(ub.bcc_balance) = 500 AND MAX(ub.bcc_locked) = 10450
            THEN '✅ BCC initialized correctly'
        WHEN COUNT(*) > 0 THEN '⚠️ BCC values incorrect'
        ELSE '❌ Missing'
    END as status,
    COUNT(*) as count
FROM test_member tm
INNER JOIN user_balances ub ON tm.wallet_address = ub.wallet_address

UNION ALL

SELECT
    'Step 4: Matrix Placements' as flow_step,
    CASE
        WHEN COUNT(*) >= 18 THEN '✅ Matrix placements created'
        WHEN COUNT(*) > 0 THEN '⚠️ Incomplete (' || COUNT(*) || ' placements)'
        ELSE '❌ No placements'
    END as status,
    COUNT(*) as count
FROM test_member tm
INNER JOIN matrix_referrals mr ON tm.wallet_address = mr.member_wallet

UNION ALL

SELECT
    'Step 5: Referral Record' as flow_step,
    CASE WHEN COUNT(*) > 0 THEN '✅ Referral created' ELSE '⚠️ No referral (may be normal)' END as status,
    COUNT(*) as count
FROM test_member tm
INNER JOIN referrals r ON tm.wallet_address = r.referred_wallet

UNION ALL

SELECT
    'Step 6: Direct Reward (to referrer)' as flow_step,
    CASE WHEN COUNT(*) > 0 THEN '✅ Reward created for referrer' ELSE '⚠️ No reward (check if referrer exists)' END as status,
    COUNT(*) as count
FROM test_member tm
INNER JOIN layer_rewards lr ON tm.wallet_address = lr.triggering_member_wallet
WHERE lr.matrix_layer = 1;

-- ============================================================================
-- PART 5: Data Flow Test - Level Upgrade
-- ============================================================================
SELECT '=== PART 5: LEVEL UPGRADE FLOW ===' as section;

-- Find a member who upgraded from Level 1 to Level 2
WITH upgraded_member AS (
    SELECT m.wallet_address, m.current_level
    FROM members m
    INNER JOIN membership mem1 ON m.wallet_address = mem1.wallet_address AND mem1.nft_level = 1
    INNER JOIN membership mem2 ON m.wallet_address = mem2.wallet_address AND mem2.nft_level = 2
    WHERE m.current_level >= 2
    ORDER BY mem2.created_at DESC
    LIMIT 1
)
SELECT
    'Upgraded Member Found' as check,
    CASE WHEN COUNT(*) > 0 THEN '✅ Found Level 2 member' ELSE 'ℹ️ No Level 2 upgrades yet' END as status,
    wallet_address,
    current_level
FROM upgraded_member
GROUP BY wallet_address, current_level;

-- If Level 2 member exists, check complete flow
WITH upgraded_member AS (
    SELECT m.wallet_address, m.current_level
    FROM members m
    INNER JOIN membership mem1 ON m.wallet_address = mem1.wallet_address AND mem1.nft_level = 1
    INNER JOIN membership mem2 ON m.wallet_address = mem2.wallet_address AND mem2.nft_level = 2
    WHERE m.current_level >= 2
    ORDER BY mem2.created_at DESC
    LIMIT 1
)
SELECT
    'Step 1: Membership Level 2' as flow_step,
    CASE WHEN COUNT(*) > 0 THEN '✅ Level 2 record exists' ELSE '❌ Missing' END as status,
    COUNT(*) as count
FROM upgraded_member um
INNER JOIN membership m ON um.wallet_address = m.wallet_address
WHERE m.nft_level = 2

UNION ALL

SELECT
    'Step 2: Members.current_level' as flow_step,
    CASE WHEN MAX(current_level) >= 2 THEN '✅ Updated to Level 2+' ELSE '❌ Not updated' END as status,
    COUNT(*) as count
FROM upgraded_member

UNION ALL

SELECT
    'Step 3: Matrix Layer Rewards' as flow_step,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ Layer rewards created'
        ELSE '⚠️ No layer rewards (may need verification)'
    END as status,
    COUNT(*) as count
FROM upgraded_member um
INNER JOIN layer_rewards lr ON um.wallet_address = lr.triggering_member_wallet
WHERE lr.matrix_layer = 2;

-- ============================================================================
-- PART 6: Frontend View Data Contract Verification
-- ============================================================================
SELECT '=== PART 6: FRONTEND VIEW CONTRACTS ===' as section;

-- Check v_member_overview structure (used by Dashboard)
SELECT
    'v_member_overview columns' as view_check,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'v_member_overview'
  AND table_schema = 'public'
GROUP BY table_name;

-- Check v_direct_referrals structure (used by Referrals page)
SELECT
    'v_direct_referrals columns' as view_check,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'v_direct_referrals'
  AND table_schema = 'public'
GROUP BY table_name;

-- Check v_reward_overview structure (used by Rewards page)
SELECT
    'v_reward_overview columns' as view_check,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'v_reward_overview'
  AND table_schema = 'public'
GROUP BY table_name;

-- ============================================================================
-- PART 7: Edge Function Deployment Check
-- ============================================================================
SELECT '=== PART 7: EDGE FUNCTION DEPLOYMENT STATUS ===' as section;

-- Check recent function calls from audit logs
SELECT
    'Recent Edge Function Calls' as check,
    action,
    COUNT(*) as call_count,
    MAX(created_at) as last_called
FROM audit_logs
WHERE action IN ('level_1_activation', 'level_upgrade', 'reward_claim')
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY last_called DESC;

-- ============================================================================
-- PART 8: Trigger Execution Verification
-- ============================================================================
SELECT '=== PART 8: TRIGGER EXECUTION VERIFICATION ===' as section;

-- Check if triggers are firing correctly
-- Test: Recent members should have corresponding records in all tables

WITH recent_members AS (
    SELECT wallet_address
    FROM members
    WHERE activation_sequence >= 4020
)
SELECT
    'Trigger: BCC Initialization' as trigger_check,
    COUNT(rm.wallet_address) as total_members,
    COUNT(ub.wallet_address) as members_with_balance,
    CASE
        WHEN COUNT(rm.wallet_address) = COUNT(ub.wallet_address) THEN '✅ 100% coverage'
        WHEN COUNT(ub.wallet_address) > 0 THEN '⚠️ Partial coverage'
        ELSE '❌ Not firing'
    END as status
FROM recent_members rm
LEFT JOIN user_balances ub ON rm.wallet_address = ub.wallet_address;

WITH recent_members AS (
    SELECT wallet_address
    FROM members
    WHERE activation_sequence >= 4020
)
SELECT
    'Trigger: Membership Sync' as trigger_check,
    COUNT(rm.wallet_address) as total_members,
    COUNT(m.wallet_address) as members_with_membership,
    CASE
        WHEN COUNT(rm.wallet_address) = COUNT(m.wallet_address) THEN '✅ 100% coverage'
        WHEN COUNT(m.wallet_address) > 0 THEN '⚠️ Partial coverage'
        ELSE '❌ Not firing'
    END as status
FROM recent_members rm
LEFT JOIN membership m ON rm.wallet_address = m.wallet_address AND m.nft_level = 1;

ROLLBACK;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
SELECT '=== INTEGRATION SUMMARY ===' as section;

SELECT
    'Frontend Views' as component,
    (SELECT COUNT(*) FROM information_schema.views
     WHERE table_schema = 'public'
       AND table_name IN ('v_member_overview', 'v_direct_referrals', 'v_reward_overview', 'v_matrix_overview', 'v_user_balance_overview')
    )::TEXT || '/5' as status,
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.views
              WHERE table_schema = 'public'
                AND table_name IN ('v_member_overview', 'v_direct_referrals', 'v_reward_overview', 'v_matrix_overview', 'v_user_balance_overview')
             ) = 5 THEN '✅ All present'
        ELSE '❌ Some missing'
    END as result

UNION ALL

SELECT
    'Edge Functions (RPC)' as component,
    (SELECT COUNT(*) FROM information_schema.routines
     WHERE routine_schema = 'public'
       AND routine_name IN (
         'place_new_member_in_matrix_correct',
         'trigger_layer_rewards_on_upgrade',
         'check_pending_rewards_after_upgrade',
         'trigger_matrix_layer_rewards'
       )
    )::TEXT || '/4' as status,
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.routines
              WHERE routine_schema = 'public'
                AND routine_name IN (
                  'place_new_member_in_matrix_correct',
                  'trigger_layer_rewards_on_upgrade',
                  'check_pending_rewards_after_upgrade',
                  'trigger_matrix_layer_rewards'
                )
             ) = 4 THEN '✅ All present'
        ELSE '❌ Some missing'
    END as result

UNION ALL

SELECT
    'Database Triggers' as component,
    (SELECT COUNT(*) FROM information_schema.triggers
     WHERE event_object_table IN ('members', 'membership', 'layer_rewards')
    )::TEXT || ' active' as status,
    '✅ Check details above' as result;
