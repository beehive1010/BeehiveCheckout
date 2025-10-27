-- ============================================================================
-- Comprehensive Reward Regeneration Script
-- Purpose: Regenerate all rewards based on membership data after matrix rebuild
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
CREATE TABLE IF NOT EXISTS direct_rewards_backup_20251027 AS
SELECT * FROM direct_rewards;

CREATE TABLE IF NOT EXISTS layer_rewards_backup_20251027 AS
SELECT * FROM layer_rewards;

CREATE TABLE IF NOT EXISTS reward_timers_backup_20251027 AS
SELECT * FROM reward_timers;

-- Clear reward tables
TRUNCATE TABLE reward_timers CASCADE;
TRUNCATE TABLE direct_rewards CASCADE;
TRUNCATE TABLE layer_rewards CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ Backup created, reward tables cleared';
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 2: Disable Triggers Temporarily
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '⏸️ Disabling triggers to improve performance...';
END $$;

-- Disable auto-reward-timer creation triggers
ALTER TABLE direct_rewards DISABLE TRIGGER trigger_auto_create_reward_timer;
ALTER TABLE layer_rewards DISABLE TRIGGER trigger_auto_create_reward_timer;

DO $$
BEGIN
    RAISE NOTICE '✅ Triggers disabled';
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 3: Regenerate Direct Rewards
-- ===================================

DO $$
DECLARE
    v_membership RECORD;
    v_referrer_wallet VARCHAR(42);
    v_referrer_level INTEGER;
    v_referrer_direct_count INTEGER;
    v_required_level INTEGER;
    v_is_third_plus BOOLEAN;
    v_reward_status VARCHAR(20);
    v_direct_rewards_created INTEGER := 0;
BEGIN
    RAISE NOTICE '💰 Starting direct reward regeneration for all Level 1 activations...';
    RAISE NOTICE '';

    -- Process all Level 1 memberships (activations)
    FOR v_membership IN
        SELECT
            m.wallet_address,
            m.claimed_at,
            mem.current_level
        FROM membership m
        JOIN members mem ON mem.wallet_address = m.wallet_address
        WHERE m.nft_level = 1
        ORDER BY m.claimed_at ASC
    LOOP
        -- Get referrer from members table
        SELECT referrer_wallet INTO v_referrer_wallet
        FROM members
        WHERE wallet_address = v_membership.wallet_address;

        -- Skip if no referrer (e.g., super root)
        IF v_referrer_wallet IS NULL THEN
            CONTINUE;
        END IF;

        -- Get referrer's current level
        SELECT current_level INTO v_referrer_level
        FROM members
        WHERE wallet_address = v_referrer_wallet;

        IF v_referrer_level IS NULL THEN
            v_referrer_level := 0;
        END IF;

        -- Count existing direct rewards for this referrer
        SELECT COUNT(*) INTO v_referrer_direct_count
        FROM direct_rewards
        WHERE reward_recipient_wallet = v_referrer_wallet;

        -- Determine qualification rules
        IF v_referrer_direct_count < 2 THEN
            v_required_level := 1;  -- 1st and 2nd require Level 1
            v_is_third_plus := FALSE;
        ELSE
            v_required_level := 2;  -- 3rd+ require Level 2
            v_is_third_plus := TRUE;
        END IF;

        -- Determine reward status
        IF v_referrer_level >= v_required_level THEN
            v_reward_status := 'claimable';
        ELSE
            v_reward_status := 'pending';
        END IF;

        -- Insert direct reward
        INSERT INTO direct_rewards (
            triggering_member_wallet,
            reward_recipient_wallet,
            reward_amount,
            status,
            recipient_required_level,
            recipient_current_level,
            requires_third_upgrade,
            is_third_generation,
            created_at,
            claimed_at
        ) VALUES (
            v_membership.wallet_address,
            v_referrer_wallet,
            100.00,  -- Fixed 100 USD for direct rewards
            v_reward_status,
            v_required_level,
            v_referrer_level,
            v_is_third_plus,
            v_is_third_plus,
            v_membership.claimed_at,
            NULL  -- claimable but not yet claimed by user
        );

        v_direct_rewards_created := v_direct_rewards_created + 1;

        -- Progress update every 100 rewards
        IF v_direct_rewards_created % 100 = 0 THEN
            RAISE NOTICE '  📊 Progress: % direct rewards created', v_direct_rewards_created;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Direct reward regeneration completed!';
    RAISE NOTICE '📊 Total direct rewards created: %', v_direct_rewards_created;
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 4: Regenerate Layer Rewards
-- ===================================

DO $$
DECLARE
    v_membership RECORD;
    v_matrix_position RECORD;
    v_matrix_root_level INTEGER;
    v_required_level INTEGER;
    v_reward_status VARCHAR(20);
    v_reward_sequence INTEGER;
    v_nft_price NUMERIC;
    v_layer_rewards_created INTEGER := 0;
BEGIN
    RAISE NOTICE '🎁 Starting layer reward regeneration for Level 2-19 upgrades...';
    RAISE NOTICE '';

    -- Process all Level 2-19 memberships (upgrades)
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
        -- Find all matrix positions where this member is placed at the matching layer
        FOR v_matrix_position IN
            SELECT
                mr.matrix_root_wallet,
                mr.layer,
                mr.position,
                m.current_level as root_current_level
            FROM matrix_referrals mr
            JOIN members m ON m.wallet_address = mr.matrix_root_wallet
            WHERE mr.member_wallet = v_membership.wallet_address
              AND mr.layer = v_membership.nft_level  -- Layer must match NFT level
        LOOP
            v_matrix_root_level := v_matrix_position.root_current_level;

            -- Count how many rewards this matrix_root has received at this layer
            SELECT COUNT(*) INTO v_reward_sequence
            FROM layer_rewards
            WHERE reward_recipient_wallet = v_matrix_position.matrix_root_wallet
              AND triggering_member_level = v_membership.nft_level;

            -- Determine required level based on sequence
            IF v_membership.nft_level = 19 THEN
                -- Layer 19 always requires Level 19
                v_required_level := 19;
            ELSIF v_reward_sequence < 2 THEN
                -- 1st and 2nd reward: require same level
                v_required_level := v_membership.nft_level;
            ELSE
                -- 3rd+ reward: require one level higher
                v_required_level := v_membership.nft_level + 1;
            END IF;

            -- Determine reward status
            IF v_matrix_root_level >= v_required_level THEN
                v_reward_status := 'claimable';
            ELSE
                v_reward_status := 'pending';
            END IF;

            -- Insert layer reward
            INSERT INTO layer_rewards (
                matrix_root_wallet,
                triggering_member_wallet,
                triggering_member_level,
                reward_recipient_wallet,
                reward_amount,
                reward_layer,
                matrix_position,
                status,
                recipient_required_level,
                recipient_current_level,
                reward_sequence,
                created_at,
                claimed_at
            ) VALUES (
                v_matrix_position.matrix_root_wallet,
                v_membership.wallet_address,
                v_membership.nft_level,
                v_matrix_position.matrix_root_wallet,
                v_membership.nft_price,
                v_membership.nft_level,
                v_matrix_position.position,
                v_reward_status,
                v_required_level,
                v_matrix_root_level,
                v_reward_sequence + 1,
                v_membership.claimed_at,
                NULL  -- claimable but not yet claimed by user
            );

            v_layer_rewards_created := v_layer_rewards_created + 1;

            -- Progress update every 100 rewards
            IF v_layer_rewards_created % 100 = 0 THEN
                RAISE NOTICE '  📊 Progress: % layer rewards created', v_layer_rewards_created;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Layer reward regeneration completed!';
    RAISE NOTICE '📊 Total layer rewards created: %', v_layer_rewards_created;
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
BEGIN
    RAISE NOTICE '⏲️ Creating timers for pending rewards...';
    RAISE NOTICE '';

    -- Create timers for pending direct rewards
    FOR v_pending_direct IN
        SELECT id, reward_recipient_wallet
        FROM direct_rewards
        WHERE status = 'pending'
    LOOP
        SELECT create_reward_timer(
            v_pending_direct.id,
            v_pending_direct.reward_recipient_wallet,
            'qualification_wait',
            72  -- 72 hours
        ) INTO v_timer_result;

        IF (v_timer_result->>'success')::BOOLEAN THEN
            v_timers_created := v_timers_created + 1;
        END IF;
    END LOOP;

    -- Create timers for pending layer rewards
    FOR v_pending_layer IN
        SELECT id, reward_recipient_wallet
        FROM layer_rewards
        WHERE status = 'pending'
    LOOP
        SELECT create_reward_timer(
            v_pending_layer.id,
            v_pending_layer.reward_recipient_wallet,
            'qualification_wait',
            72  -- 72 hours
        ) INTO v_timer_result;

        IF (v_timer_result->>'success')::BOOLEAN THEN
            v_timers_created := v_timers_created + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '✅ Reward timers created: %', v_timers_created;
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

-- Check 5: Expected vs actual direct rewards
WITH expected AS (
    SELECT COUNT(*) as expected_count
    FROM membership
    WHERE nft_level = 1
),
actual AS (
    SELECT COUNT(*) as actual_count
    FROM direct_rewards
)
SELECT
    '✅ Direct Rewards Verification' as info,
    expected.expected_count,
    actual.actual_count,
    CASE
        WHEN expected.expected_count = actual.actual_count THEN 'MATCH ✅'
        ELSE 'MISMATCH ❌'
    END as status
FROM expected, actual;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Reward regeneration complete!';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT: Legacy User Handling';
    RAISE NOTICE '   - Legacy users (usdc_claimed > 0) should NOT have claimable';
    RAISE NOTICE '     amounts synced to their balance';
    RAISE NOTICE '   - Only new users should receive claimable balance updates';
    RAISE NOTICE '   - This will be handled by the sync_rewards_to_user_balances function';
    RAISE NOTICE '';
END $$;
