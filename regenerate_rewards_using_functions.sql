-- ============================================================================
-- Regenerate Rewards Using Database Functions
-- Purpose: Regenerate all rewards by calling existing database functions
-- Date: 2025-10-27
-- ============================================================================

-- ===================================
-- Step 1: Backup and Clear
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '📦 Creating backup of existing reward data...';
END $$;

-- Backup existing rewards (if any)
DROP TABLE IF EXISTS direct_rewards_backup_20251027_functions CASCADE;
CREATE TABLE direct_rewards_backup_20251027_functions AS
SELECT * FROM direct_rewards;

DROP TABLE IF EXISTS layer_rewards_backup_20251027_functions CASCADE;
CREATE TABLE layer_rewards_backup_20251027_functions AS
SELECT * FROM layer_rewards;

DROP TABLE IF EXISTS reward_timers_backup_20251027_functions CASCADE;
CREATE TABLE reward_timers_backup_20251027_functions AS
SELECT * FROM reward_timers;

DO $$
BEGIN
    RAISE NOTICE '✅ Backup created: direct_rewards %, layer_rewards %, reward_timers %',
        (SELECT COUNT(*) FROM direct_rewards_backup_20251027_functions),
        (SELECT COUNT(*) FROM layer_rewards_backup_20251027_functions),
        (SELECT COUNT(*) FROM reward_timers_backup_20251027_functions);
    RAISE NOTICE '';
END $$;

-- Clear reward tables
TRUNCATE TABLE reward_timers CASCADE;
TRUNCATE TABLE direct_rewards CASCADE;
TRUNCATE TABLE layer_rewards CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ Reward tables cleared';
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 2: Disable Triggers Temporarily
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '⏸️ Disabling auto-timer creation triggers...';
END $$;

-- Disable auto-reward-timer creation triggers to avoid duplicate timers
ALTER TABLE direct_rewards DISABLE TRIGGER trigger_auto_create_reward_timer;
ALTER TABLE layer_rewards DISABLE TRIGGER trigger_auto_create_reward_timer;

DO $$
BEGIN
    RAISE NOTICE '✅ Triggers disabled';
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 3: Regenerate Direct Rewards (Level 1)
-- ===================================

DO $$
DECLARE
    v_membership RECORD;
    v_result JSON;
    v_total_processed INTEGER := 0;
    v_total_succeeded INTEGER := 0;
    v_total_failed INTEGER := 0;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
BEGIN
    RAISE NOTICE '💰 Starting direct reward regeneration for Level 1 activations...';
    RAISE NOTICE '';

    v_start_time := clock_timestamp();

    -- Process all Level 1 memberships in claimed_at order
    FOR v_membership IN
        SELECT
            m.wallet_address,
            m.claimed_at,
            m.nft_level
        FROM membership m
        WHERE m.nft_level = 1
        ORDER BY m.claimed_at ASC
    LOOP
        v_total_processed := v_total_processed + 1;

        BEGIN
            -- Call trigger_direct_referral_rewards function
            SELECT trigger_direct_referral_rewards(
                v_membership.wallet_address,  -- p_upgrading_member_wallet
                1,                            -- p_new_level (always 1 for direct rewards)
                100.00                        -- p_nft_price (fixed 100 USD for Level 1)
            ) INTO v_result;

            -- Check if function succeeded
            IF (v_result->>'success')::BOOLEAN THEN
                v_total_succeeded := v_total_succeeded + 1;

                -- Log every 100 successes
                IF v_total_succeeded % 100 = 0 THEN
                    RAISE NOTICE '  ✅ Progress: % direct rewards created', v_total_succeeded;
                END IF;
            ELSE
                v_total_failed := v_total_failed + 1;
                RAISE NOTICE '  ⚠️ Failed for %: %',
                    SUBSTRING(v_membership.wallet_address, 39, 4),
                    v_result->>'message';
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_total_failed := v_total_failed + 1;
            RAISE NOTICE '  ❌ Error for %: %',
                SUBSTRING(v_membership.wallet_address, 39, 4),
                SQLERRM;
        END;
    END LOOP;

    v_end_time := clock_timestamp();

    RAISE NOTICE '';
    RAISE NOTICE '✅ Direct reward regeneration completed!';
    RAISE NOTICE '📊 Statistics:';
    RAISE NOTICE '   - Total processed: %', v_total_processed;
    RAISE NOTICE '   - Succeeded: %', v_total_succeeded;
    RAISE NOTICE '   - Failed: %', v_total_failed;
    RAISE NOTICE '   - Duration: %', v_end_time - v_start_time;
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 4: Regenerate Layer Rewards (Level 2-19)
-- ===================================

DO $$
DECLARE
    v_membership RECORD;
    v_result JSON;
    v_nft_price NUMERIC;
    v_total_processed INTEGER := 0;
    v_total_succeeded INTEGER := 0;
    v_total_failed INTEGER := 0;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
BEGIN
    RAISE NOTICE '🎁 Starting layer reward regeneration for Level 2-19 upgrades...';
    RAISE NOTICE '';

    v_start_time := clock_timestamp();

    -- Process all Level 2-19 memberships in claimed_at order
    FOR v_membership IN
        SELECT
            m.wallet_address,
            m.nft_level,
            m.claimed_at,
            CASE m.nft_level
                WHEN 2 THEN 150
                WHEN 3 THEN 200
                WHEN 4 THEN 250
                WHEN 5 THEN 300
                WHEN 6 THEN 350
                WHEN 7 THEN 400
                WHEN 8 THEN 450
                WHEN 9 THEN 500
                WHEN 10 THEN 550
                WHEN 11 THEN 600
                WHEN 12 THEN 650
                WHEN 13 THEN 700
                WHEN 14 THEN 750
                WHEN 15 THEN 800
                WHEN 16 THEN 850
                WHEN 17 THEN 900
                WHEN 18 THEN 950
                WHEN 19 THEN 1000
            END as nft_price
        FROM membership m
        WHERE m.nft_level >= 2 AND m.nft_level <= 19
        ORDER BY m.claimed_at ASC
    LOOP
        v_total_processed := v_total_processed + 1;

        BEGIN
            -- Call trigger_matrix_layer_rewards function
            SELECT trigger_matrix_layer_rewards(
                v_membership.wallet_address,  -- p_upgrading_member_wallet
                v_membership.nft_level,       -- p_new_level
                v_membership.nft_price        -- p_nft_price
            ) INTO v_result;

            -- Check if function succeeded
            IF (v_result->>'success')::BOOLEAN THEN
                v_total_succeeded := v_total_succeeded + 1;

                -- Log every 100 successes
                IF v_total_succeeded % 100 = 0 THEN
                    RAISE NOTICE '  ✅ Progress: % layer rewards processed (Level %)',
                        v_total_succeeded, v_membership.nft_level;
                END IF;
            ELSE
                v_total_failed := v_total_failed + 1;
                RAISE NOTICE '  ⚠️ Failed for % Level %: %',
                    SUBSTRING(v_membership.wallet_address, 39, 4),
                    v_membership.nft_level,
                    v_result->>'message';
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_total_failed := v_total_failed + 1;
            RAISE NOTICE '  ❌ Error for % Level %: %',
                SUBSTRING(v_membership.wallet_address, 39, 4),
                v_membership.nft_level,
                SQLERRM;
        END;
    END LOOP;

    v_end_time := clock_timestamp();

    RAISE NOTICE '';
    RAISE NOTICE '✅ Layer reward regeneration completed!';
    RAISE NOTICE '📊 Statistics:';
    RAISE NOTICE '   - Total processed: %', v_total_processed;
    RAISE NOTICE '   - Succeeded: %', v_total_succeeded;
    RAISE NOTICE '   - Failed: %', v_total_failed;
    RAISE NOTICE '   - Duration: %', v_end_time - v_start_time;
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 5: Re-enable Triggers
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '▶️ Re-enabling triggers...';
END $$;

ALTER TABLE direct_rewards ENABLE TRIGGER trigger_auto_create_reward_timer;
ALTER TABLE layer_rewards ENABLE TRIGGER trigger_auto_create_reward_timer;

DO $$
BEGIN
    RAISE NOTICE '✅ Triggers re-enabled';
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 6: Create Timers for Pending Rewards
-- ===================================

DO $$
DECLARE
    v_pending_direct RECORD;
    v_pending_layer RECORD;
    v_timer_result JSON;
    v_timers_created INTEGER := 0;
    v_timers_failed INTEGER := 0;
BEGIN
    RAISE NOTICE '⏲️ Creating timers for pending rewards...';
    RAISE NOTICE '';

    -- Create timers for pending direct rewards
    FOR v_pending_direct IN
        SELECT id, reward_recipient_wallet
        FROM direct_rewards
        WHERE status = 'pending'
    LOOP
        BEGIN
            SELECT create_reward_timer(
                v_pending_direct.id,
                v_pending_direct.reward_recipient_wallet,
                'qualification_wait',
                72  -- 72 hours
            ) INTO v_timer_result;

            IF (v_timer_result->>'success')::BOOLEAN THEN
                v_timers_created := v_timers_created + 1;
            ELSE
                v_timers_failed := v_timers_failed + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_timers_failed := v_timers_failed + 1;
            RAISE NOTICE '  ⚠️ Timer creation failed for direct reward %: %',
                v_pending_direct.id, SQLERRM;
        END;
    END LOOP;

    -- Create timers for pending layer rewards
    FOR v_pending_layer IN
        SELECT id, reward_recipient_wallet
        FROM layer_rewards
        WHERE status = 'pending'
    LOOP
        BEGIN
            SELECT create_reward_timer(
                v_pending_layer.id,
                v_pending_layer.reward_recipient_wallet,
                'qualification_wait',
                72  -- 72 hours
            ) INTO v_timer_result;

            IF (v_timer_result->>'success')::BOOLEAN THEN
                v_timers_created := v_timers_created + 1;
            ELSE
                v_timers_failed := v_timers_failed + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_timers_failed := v_timers_failed + 1;
            RAISE NOTICE '  ⚠️ Timer creation failed for layer reward %: %',
                v_pending_layer.id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '✅ Reward timers: % created, % failed', v_timers_created, v_timers_failed;
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 7: Verification
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔍 VERIFICATION';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Check 1: Direct rewards summary
SELECT
    '📊 Direct Rewards Summary' as info,
    COUNT(*) as total_rewards,
    COUNT(*) FILTER (WHERE status = 'claimable') as claimable_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    SUM(reward_amount) as total_amount,
    SUM(reward_amount) FILTER (WHERE status = 'claimable') as claimable_amount,
    SUM(reward_amount) FILTER (WHERE status = 'pending') as pending_amount
FROM direct_rewards;

-- Check 2: Layer rewards summary
SELECT
    '📊 Layer Rewards Summary' as info,
    COUNT(*) as total_rewards,
    COUNT(*) FILTER (WHERE status = 'claimable') as claimable_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    SUM(reward_amount) as total_amount,
    SUM(reward_amount) FILTER (WHERE status = 'claimable') as claimable_amount,
    SUM(reward_amount) FILTER (WHERE status = 'pending') as pending_amount
FROM layer_rewards;

-- Check 3: Layer rewards by level
SELECT
    '📊 Layer Rewards by Level' as info,
    triggering_member_level,
    COUNT(*) as reward_count,
    SUM(reward_amount) as total_amount,
    COUNT(*) FILTER (WHERE status = 'claimable') as claimable_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count
FROM layer_rewards
GROUP BY triggering_member_level
ORDER BY triggering_member_level;

-- Check 4: Reward timers summary
SELECT
    '⏲️ Reward Timers Summary' as info,
    COUNT(*) as total_timers,
    COUNT(*) FILTER (WHERE is_expired = FALSE) as active_timers,
    COUNT(*) FILTER (WHERE is_expired = TRUE) as expired_timers
FROM reward_timers;

-- Check 5: Expected vs actual rewards
WITH level1_memberships AS (
    SELECT COUNT(*) as expected_direct
    FROM membership
    WHERE nft_level = 1
),
level2_19_memberships AS (
    SELECT
        nft_level,
        COUNT(*) as member_count
    FROM membership
    WHERE nft_level >= 2 AND nft_level <= 19
    GROUP BY nft_level
)
SELECT
    '✅ Expected vs Actual' as info,
    'Direct Rewards' as reward_type,
    (SELECT expected_direct FROM level1_memberships) as expected_count,
    (SELECT COUNT(*) FROM direct_rewards) as actual_count,
    CASE
        WHEN (SELECT COUNT(*) FROM direct_rewards) = (SELECT expected_direct FROM level1_memberships) THEN '✅ MATCH'
        WHEN (SELECT COUNT(*) FROM direct_rewards) < (SELECT expected_direct FROM level1_memberships) THEN '⚠️ LESS (some members have no referrer)'
        ELSE '❌ MISMATCH'
    END as status;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Reward regeneration complete!';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT: Legacy User Handling';
    RAISE NOTICE '   - Legacy users (usdc_claimed > 0 in user_reward_balances)';
    RAISE NOTICE '     should NOT have new claimable amounts synced to balance';
    RAISE NOTICE '   - Only new users should receive claimable balance updates';
    RAISE NOTICE '   - Next step: Sync rewards to balances with legacy check';
    RAISE NOTICE '';
END $$;
