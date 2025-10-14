-- Verify Reward Rules Implementation
-- Check if current rewards follow the correct level requirements

BEGIN;

-- ============================================================================
-- PART 1: Direct Referral Rewards (Layer 1) Rules Verification
-- ============================================================================
SELECT '=== PART 1: DIRECT REFERRAL REWARDS (LAYER 1) ===' as section;

-- Rule: 1st & 2nd direct referrals require Level 1
-- Rule: 3rd+ direct referrals require Level 2+

WITH reward_sequence AS (
    SELECT
        lr.id,
        lr.reward_recipient_wallet,
        lr.triggering_member_wallet,
        lr.reward_amount,
        lr.status,
        lr.recipient_required_level,
        m.current_level as recipient_current_level,
        lr.created_at,
        ROW_NUMBER() OVER (
            PARTITION BY lr.reward_recipient_wallet
            ORDER BY lr.created_at
        ) as sequence_number
    FROM layer_rewards lr
    INNER JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
    WHERE lr.matrix_layer = 1  -- Direct referral rewards
)
SELECT
    'Direct Referral Rules Check' as check,
    sequence_number,
    COUNT(*) as rewards_count,
    recipient_required_level as rule_required_level,
    CASE
        WHEN sequence_number <= 2 AND recipient_required_level = 1 THEN '✅ CORRECT'
        WHEN sequence_number >= 3 AND recipient_required_level = 2 THEN '✅ CORRECT'
        ELSE '❌ INCORRECT'
    END as rule_status
FROM reward_sequence
GROUP BY sequence_number, recipient_required_level
ORDER BY sequence_number, recipient_required_level;

-- Show examples of direct referrals by sequence
SELECT '=== Direct Referral Examples ===' as info;

WITH reward_sequence AS (
    SELECT
        lr.reward_recipient_wallet,
        lr.triggering_member_wallet,
        lr.recipient_required_level,
        m.current_level,
        lr.status,
        ROW_NUMBER() OVER (
            PARTITION BY lr.reward_recipient_wallet
            ORDER BY lr.created_at
        ) as sequence_number
    FROM layer_rewards lr
    INNER JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
    WHERE lr.matrix_layer = 1
)
SELECT
    reward_recipient_wallet,
    sequence_number as referral_sequence,
    recipient_required_level as requires_level,
    current_level as has_level,
    status,
    CASE
        WHEN sequence_number <= 2 THEN 'Rule: Level >= 1'
        ELSE 'Rule: Level >= 2'
    END as rule,
    CASE
        WHEN sequence_number <= 2 AND recipient_required_level = 1 THEN '✅'
        WHEN sequence_number >= 3 AND recipient_required_level = 2 THEN '✅'
        ELSE '❌'
    END as correct
FROM reward_sequence
ORDER BY reward_recipient_wallet, sequence_number
LIMIT 20;

-- ============================================================================
-- PART 2: Matrix Layer Rewards (Layer 2-19) Rules Verification
-- ============================================================================
SELECT '=== PART 2: MATRIX LAYER REWARDS (LAYER 2-19) ===' as section;

-- Rule: 1st & 2nd rewards at each layer require Level = Layer
-- Rule: 3rd+ rewards at each layer require Level > Layer

WITH layer_reward_sequence AS (
    SELECT
        lr.id,
        lr.reward_recipient_wallet,
        lr.matrix_layer,
        lr.recipient_required_level,
        m.current_level as recipient_current_level,
        lr.status,
        ROW_NUMBER() OVER (
            PARTITION BY lr.reward_recipient_wallet, lr.matrix_layer
            ORDER BY lr.created_at
        ) as sequence_number
    FROM layer_rewards lr
    INNER JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
    WHERE lr.matrix_layer >= 2  -- Matrix layer rewards
      AND lr.matrix_layer <= 19
)
SELECT
    'Matrix Layer Rules Check' as check,
    matrix_layer,
    sequence_number,
    COUNT(*) as rewards_count,
    recipient_required_level as rule_required_level,
    CASE
        WHEN sequence_number <= 2 AND recipient_required_level = matrix_layer THEN '✅ CORRECT'
        WHEN sequence_number >= 3 AND recipient_required_level = matrix_layer + 1 THEN '✅ CORRECT'
        WHEN matrix_layer = 19 AND recipient_required_level = 19 THEN '✅ CORRECT (L19 special)'
        ELSE '❌ INCORRECT'
    END as rule_status
FROM layer_reward_sequence
GROUP BY matrix_layer, sequence_number, recipient_required_level
ORDER BY matrix_layer, sequence_number
LIMIT 30;

-- Show examples by layer
SELECT '=== Matrix Layer Examples ===' as info;

WITH layer_reward_sequence AS (
    SELECT
        lr.reward_recipient_wallet,
        lr.matrix_layer,
        lr.recipient_required_level,
        m.current_level,
        lr.status,
        ROW_NUMBER() OVER (
            PARTITION BY lr.reward_recipient_wallet, lr.matrix_layer
            ORDER BY lr.created_at
        ) as sequence_number
    FROM layer_rewards lr
    INNER JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
    WHERE lr.matrix_layer >= 2
      AND lr.matrix_layer <= 19
)
SELECT
    matrix_layer as layer,
    sequence_number as seq,
    recipient_required_level as requires,
    current_level as has,
    status,
    CASE
        WHEN sequence_number <= 2 THEN 'Rule: Level >= ' || matrix_layer
        WHEN matrix_layer = 19 THEN 'Rule: Level = 19'
        ELSE 'Rule: Level > ' || matrix_layer
    END as rule,
    CASE
        WHEN sequence_number <= 2 AND recipient_required_level = matrix_layer THEN '✅'
        WHEN sequence_number >= 3 AND recipient_required_level = matrix_layer + 1 THEN '✅'
        WHEN matrix_layer = 19 AND recipient_required_level = 19 THEN '✅'
        ELSE '❌'
    END as correct
FROM layer_reward_sequence
WHERE matrix_layer IN (2, 5, 10, 19)  -- Sample layers
ORDER BY matrix_layer, sequence_number
LIMIT 20;

-- ============================================================================
-- PART 3: Pending Rewards Status Check
-- ============================================================================
SELECT '=== PART 3: PENDING REWARDS STATUS ===' as section;

-- Check pending rewards logic
SELECT
    lr.matrix_layer as layer,
    COUNT(*) as pending_count,
    SUM(lr.reward_amount) as total_pending_value,
    AVG(m.current_level) as avg_recipient_level,
    AVG(lr.recipient_required_level) as avg_required_level,
    COUNT(CASE WHEN m.current_level >= lr.recipient_required_level THEN 1 END) as should_be_claimable,
    COUNT(CASE WHEN m.current_level < lr.recipient_required_level THEN 1 END) as correctly_pending
FROM layer_rewards lr
INNER JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE lr.status = 'pending'
GROUP BY lr.matrix_layer
ORDER BY lr.matrix_layer;

-- ============================================================================
-- PART 4: Rollup Functions Check
-- ============================================================================
SELECT '=== PART 4: ROLLUP FUNCTIONS ===' as section;

-- Check if rollup functions exist
SELECT
    'Rollup Function' as check,
    routine_name,
    CASE
        WHEN routine_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'process_reward_rollup',
    'rollup_unqualified_reward',
    'validate_and_rollup_rewards',
    'process_rollup_reward_to_balance'
  )
ORDER BY routine_name;

-- Check for rolled_up rewards
SELECT '=== Rolled Up Rewards ===' as info;

SELECT
    COUNT(*) as rolled_up_count,
    SUM(reward_amount) as total_rolled_up_value,
    COUNT(DISTINCT reward_recipient_wallet) as original_recipients,
    COUNT(DISTINCT rolled_up_to) as rollup_recipients
FROM layer_rewards
WHERE status = 'rolled_up';

ROLLBACK;  -- Don't commit, this is verification only

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '=== VERIFICATION SUMMARY ===' as section;

-- Summary of rule compliance
WITH rule_check AS (
    -- Direct referrals
    SELECT
        'Direct Referrals (1st-2nd)' as rule_type,
        COUNT(*) as total,
        COUNT(CASE WHEN recipient_required_level = 1 THEN 1 END) as correct,
        COUNT(CASE WHEN recipient_required_level != 1 THEN 1 END) as incorrect
    FROM (
        SELECT
            lr.recipient_required_level,
            ROW_NUMBER() OVER (
                PARTITION BY lr.reward_recipient_wallet
                ORDER BY lr.created_at
            ) as seq
        FROM layer_rewards lr
        WHERE lr.matrix_layer = 1
    ) t
    WHERE seq <= 2

    UNION ALL

    -- Direct referrals 3rd+
    SELECT
        'Direct Referrals (3rd+)' as rule_type,
        COUNT(*) as total,
        COUNT(CASE WHEN recipient_required_level = 2 THEN 1 END) as correct,
        COUNT(CASE WHEN recipient_required_level != 2 THEN 1 END) as incorrect
    FROM (
        SELECT
            lr.recipient_required_level,
            ROW_NUMBER() OVER (
                PARTITION BY lr.reward_recipient_wallet
                ORDER BY lr.created_at
            ) as seq
        FROM layer_rewards lr
        WHERE lr.matrix_layer = 1
    ) t
    WHERE seq >= 3

    UNION ALL

    -- Matrix layers 1st-2nd
    SELECT
        'Matrix Layers (1st-2nd)' as rule_type,
        COUNT(*) as total,
        COUNT(CASE WHEN recipient_required_level = matrix_layer THEN 1 END) as correct,
        COUNT(CASE WHEN recipient_required_level != matrix_layer THEN 1 END) as incorrect
    FROM (
        SELECT
            lr.recipient_required_level,
            lr.matrix_layer,
            ROW_NUMBER() OVER (
                PARTITION BY lr.reward_recipient_wallet, lr.matrix_layer
                ORDER BY lr.created_at
            ) as seq
        FROM layer_rewards lr
        WHERE lr.matrix_layer >= 2
    ) t
    WHERE seq <= 2

    UNION ALL

    -- Matrix layers 3rd+
    SELECT
        'Matrix Layers (3rd+)' as rule_type,
        COUNT(*) as total,
        COUNT(CASE WHEN recipient_required_level = matrix_layer + 1 THEN 1 END) as correct,
        COUNT(CASE WHEN recipient_required_level != matrix_layer + 1 THEN 1 END) as incorrect
    FROM (
        SELECT
            lr.recipient_required_level,
            lr.matrix_layer,
            ROW_NUMBER() OVER (
                PARTITION BY lr.reward_recipient_wallet, lr.matrix_layer
                ORDER BY lr.created_at
            ) as seq
        FROM layer_rewards lr
        WHERE lr.matrix_layer >= 2 AND lr.matrix_layer < 19
    ) t
    WHERE seq >= 3
)
SELECT
    rule_type,
    total,
    correct,
    incorrect,
    ROUND(correct::NUMERIC / NULLIF(total, 0) * 100, 2) as compliance_percentage,
    CASE
        WHEN incorrect = 0 THEN '✅ PERFECT'
        WHEN correct::NUMERIC / NULLIF(total, 0) >= 0.95 THEN '✅ GOOD'
        ELSE '❌ NEEDS FIXING'
    END as status
FROM rule_check
ORDER BY rule_type;
