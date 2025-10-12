-- ============================================================================
-- BACKFILL SCRIPT: Missing Matrix Placements and Direct Rewards
-- Date: 2025-10-12
-- Priority: P0 - Run AFTER deploying fix_registration_flow_critical.sql
--
-- Purpose: Retroactively place 10 affected members in matrix and create
--          their missing direct referral rewards
--
-- Affected Members: 10 members from 2025-10-05 to 2025-10-10
-- Expected Rewards: 10 × 100 USDT = 1,000 USDT total
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Verify the fix is deployed
-- ============================================================================

DO $$
DECLARE
    v_function_exists BOOLEAN;
    v_view_exists BOOLEAN;
BEGIN
    -- Check if fix function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = 'backfill_missing_matrix_placements'
    ) INTO v_function_exists;

    -- Check if monitoring view exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public'
          AND table_name = 'v_members_missing_matrix_placement'
    ) INTO v_view_exists;

    IF NOT v_function_exists THEN
        RAISE EXCEPTION 'backfill_missing_matrix_placements() function not found. Deploy fix_registration_flow_critical.sql first!';
    END IF;

    IF NOT v_view_exists THEN
        RAISE EXCEPTION 'v_members_missing_matrix_placement view not found. Deploy fix_registration_flow_critical.sql first!';
    END IF;

    RAISE NOTICE '✅ Prerequisites verified - fix is deployed';
END $$;

-- ============================================================================
-- STEP 2: Show affected members before backfill
-- ============================================================================

DO $$
DECLARE
    v_missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_missing_count
    FROM v_members_missing_matrix_placement;

    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'BACKFILL OPERATION: Missing Matrix Placements';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Members missing matrix placement: %', v_missing_count;
    RAISE NOTICE '';
END $$;

-- Show detailed list
SELECT
    wallet_address,
    referrer_wallet,
    activation_sequence,
    TO_CHAR(activation_time, 'YYYY-MM-DD HH24:MI:SS') AS activation_time,
    current_level,
    ROUND(hours_since_activation::NUMERIC, 1) AS hours_ago
FROM v_members_missing_matrix_placement
ORDER BY activation_time ASC;

-- ============================================================================
-- STEP 3: Dry-run backfill to preview results
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'DRY RUN: Preview Backfill Results';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- Preview backfill results
SELECT
    wallet_address,
    referrer_wallet,
    placement_success,
    placement_message,
    created_reward
FROM backfill_missing_matrix_placements(TRUE);

-- ============================================================================
-- STEP 4: Execute actual backfill (UNCOMMENT TO RUN)
-- ============================================================================

-- ⚠️  IMPORTANT: Review dry-run results before uncommenting this section!
-- ⚠️  This will create actual matrix_referrals records

/*
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 EXECUTING BACKFILL...';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- Execute backfill
SELECT
    wallet_address,
    referrer_wallet,
    placement_success,
    placement_message,
    created_reward
FROM backfill_missing_matrix_placements(FALSE);

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Backfill execution completed';
    RAISE NOTICE '';
END $$;
*/

-- ============================================================================
-- STEP 5: Create direct rewards for backfilled members
-- ============================================================================

-- After successful placement, create direct rewards
-- (This should happen automatically via triggers, but verify manually)

/*
DO $$
DECLARE
    v_member RECORD;
    v_reward_exists BOOLEAN;
    v_referrer_level INTEGER;
    v_reward_status VARCHAR(20);
    v_rewards_created INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Creating Missing Direct Rewards';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- Process each member that was just backfilled
    FOR v_member IN
        SELECT m.wallet_address, m.referrer_wallet, m.current_level
        FROM members m
        JOIN matrix_referrals mr ON m.wallet_address = mr.member_wallet
        LEFT JOIN direct_referral_rewards drr ON drr.referred_member_wallet = m.wallet_address
        WHERE m.activation_time >= '2025-10-05'
          AND drr.id IS NULL  -- No reward exists yet
        ORDER BY m.activation_time ASC
    LOOP
        -- Get referrer level
        SELECT current_level INTO v_referrer_level
        FROM members
        WHERE wallet_address = v_member.referrer_wallet;

        -- Determine reward status based on gates
        -- Gate logic: 1st & 2nd referral need level ≥ 1, 3rd+ need level ≥ 2
        IF v_referrer_level >= 2 THEN
            v_reward_status := 'claimable';
        ELSIF v_referrer_level >= 1 THEN
            -- Check if this is 1st or 2nd referral for this referrer
            IF (SELECT COUNT(*) FROM direct_referral_rewards
                WHERE referrer_wallet = v_member.referrer_wallet) < 2 THEN
                v_reward_status := 'claimable';
            ELSE
                v_reward_status := 'pending';  -- Would need timer
            END IF;
        ELSE
            v_reward_status := 'pending';  -- Would need timer
        END IF;

        -- Create the reward
        INSERT INTO direct_referral_rewards (
            referrer_wallet,
            referred_member_wallet,
            reward_amount,
            status,
            created_at,
            metadata
        ) VALUES (
            v_member.referrer_wallet,
            v_member.wallet_address,
            100.000000,
            v_reward_status,
            NOW(),
            json_build_object(
                'backfilled', true,
                'backfill_date', NOW(),
                'original_activation', (
                    SELECT activation_time FROM members WHERE wallet_address = v_member.wallet_address
                ),
                'referrer_level_at_backfill', v_referrer_level
            )
        );

        v_rewards_created := v_rewards_created + 1;

        RAISE NOTICE '  ✅ Reward created: % → % (status: %)',
            v_member.referrer_wallet, v_member.wallet_address, v_reward_status;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Total rewards created: %', v_rewards_created;
    RAISE NOTICE '';
END $$;
*/

-- ============================================================================
-- STEP 6: Validation after backfill
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'VALIDATION: Post-Backfill Status';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- Check remaining members without placement
SELECT
    COUNT(*) AS still_missing_placement
FROM v_members_missing_matrix_placement;

-- Verify matrix placements created
SELECT
    COUNT(*) AS total_placements_last_7_days,
    COUNT(DISTINCT matrix_root_wallet) AS unique_roots,
    COUNT(DISTINCT member_wallet) AS unique_members
FROM matrix_referrals
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Verify rewards created
SELECT
    COUNT(*) AS total_rewards_last_7_days,
    SUM(reward_amount) AS total_reward_amount,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) AS claimable_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count
FROM direct_referral_rewards
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Show members with placement but no reward (should be 0)
SELECT
    m.wallet_address,
    m.referrer_wallet,
    m.activation_time,
    mr.matrix_root_wallet,
    mr.layer,
    mr.position
FROM members m
JOIN matrix_referrals mr ON m.wallet_address = mr.member_wallet
LEFT JOIN direct_referral_rewards drr ON drr.referred_member_wallet = m.wallet_address
WHERE m.activation_time >= NOW() - INTERVAL '7 days'
  AND drr.id IS NULL;

-- ============================================================================
-- STEP 7: Update member balances (if rewards were created as claimable)
-- ============================================================================

/*
DO $$
DECLARE
    v_referrer RECORD;
    v_total_new_rewards NUMERIC(18,6);
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Updating Member Balances';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- For each referrer with new claimable rewards
    FOR v_referrer IN
        SELECT
            referrer_wallet,
            SUM(reward_amount) AS total_claimable
        FROM direct_referral_rewards
        WHERE status = 'claimable'
          AND created_at >= NOW() - INTERVAL '1 hour'  -- Recently created
          AND metadata->>'backfilled' = 'true'
        GROUP BY referrer_wallet
    LOOP
        -- Update member_balances (if table exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_balances') THEN
            UPDATE member_balances
            SET
                available_usd = available_usd + v_referrer.total_claimable,
                lifetime_earned_usd = lifetime_earned_usd + v_referrer.total_claimable,
                updated_at = NOW()
            WHERE member_id = v_referrer.referrer_wallet;

            RAISE NOTICE '  ✅ Balance updated for %: +% USDT',
                v_referrer.referrer_wallet, v_referrer.total_claimable;
        END IF;
    END LOOP;

    RAISE NOTICE '';
END $$;
*/

-- ============================================================================
-- STEP 8: Final summary
-- ============================================================================

DO $$
DECLARE
    v_initial_missing INTEGER;
    v_final_missing INTEGER;
    v_backfilled INTEGER;
BEGIN
    -- This is placeholder - would need to track initial count
    SELECT COUNT(*) INTO v_final_missing
    FROM v_members_missing_matrix_placement;

    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 BACKFILL SUMMARY';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Members still missing placement: %', v_final_missing;
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Review validation query results above';
    RAISE NOTICE '  2. If all successful, uncomment reward creation section';
    RAISE NOTICE '  3. Test new registration flow with test wallet';
    RAISE NOTICE '  4. Monitor v_members_missing_matrix_placement view daily';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Remember: Test thoroughly in staging before production!';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SAFETY
-- ============================================================================

-- If something goes wrong during backfill, you can identify backfilled records:
/*
SELECT * FROM matrix_referrals
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND source = 'generation_based_placement'
ORDER BY created_at DESC;

SELECT * FROM direct_referral_rewards
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND metadata->>'backfilled' = 'true'
ORDER BY created_at DESC;
*/
