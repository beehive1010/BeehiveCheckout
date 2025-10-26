-- ============================================================================
-- CRITICAL FIX: Registration Flow - Matrix Placement Failure
-- Date: 2025-10-12
-- Priority: P0 - DEPLOY IMMEDIATELY
--
-- Issue: place_new_member_in_matrix_correct() references non-existent table
--        causing all new member registrations to fail matrix placement
--
-- Impact: 10+ members without matrix placement, 1,000+ USDT in missing rewards
--
-- Solution: Replace broken function to call working placement logic
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Fix the placement function to call working implementation
-- ============================================================================

CREATE OR REPLACE FUNCTION place_new_member_in_matrix_correct(
    p_member_wallet TEXT,
    p_referrer_wallet TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Log the placement attempt
    RAISE LOG 'Attempting matrix placement for member: %, referrer: %',
        p_member_wallet, p_referrer_wallet;

    -- Call the working placement function
    SELECT place_member_matrix_complete(
        p_member_wallet::VARCHAR(42),
        p_referrer_wallet::VARCHAR(42)
    ) INTO v_result;

    -- Log the result
    IF (v_result->>'success')::BOOLEAN THEN
        RAISE LOG 'Matrix placement succeeded for %: %',
            p_member_wallet, v_result;
    ELSE
        RAISE WARNING 'Matrix placement failed for %: %',
            p_member_wallet, v_result;
    END IF;

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Matrix placement exception for %: %',
            p_member_wallet, SQLERRM;
        RETURN json_build_object(
            'success', false,
            'message', 'Error during matrix placement: ' || SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION place_new_member_in_matrix_correct IS
'Fixed placement function that calls place_member_matrix_complete()
to correctly insert into matrix_referrals table. Includes logging for debugging.';

-- ============================================================================
-- STEP 2: Update trigger to raise errors on placement failure
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_membership_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_referrer_wallet TEXT;
    placement_result JSON;
    placement_success BOOLEAN;
BEGIN
    -- Only process when membership is claimed
    IF NEW.claimed_at IS NOT NULL AND (OLD.claimed_at IS NULL OR OLD IS NULL) THEN

        -- Get referrer wallet from users table
        SELECT referrer_wallet INTO user_referrer_wallet
        FROM users
        WHERE wallet_address = NEW.wallet_address;

        -- Call matrix placement if referrer exists
        IF user_referrer_wallet IS NOT NULL THEN
            BEGIN
                -- Attempt placement
                SELECT place_new_member_in_matrix_correct(
                    NEW.wallet_address,
                    user_referrer_wallet
                ) INTO placement_result;

                -- Extract success flag
                placement_success := (placement_result->>'success')::BOOLEAN;

                -- Log to audit_logs regardless of success
                INSERT INTO audit_logs (user_wallet, action, new_values)
                VALUES (NEW.wallet_address, 'membership_nft_claimed', json_build_object(
                    'membership_id', NEW.id,
                    'nft_level', NEW.nft_level,
                    'claim_price', NEW.claim_price,
                    'referrer_wallet', user_referrer_wallet,
                    'claimed_at', NEW.claimed_at,
                    'placement_success', placement_success,
                    'placement_result', placement_result
                ));

                -- Raise exception if placement failed (prevents silent failure)
                IF NOT placement_success THEN
                    RAISE EXCEPTION 'Matrix placement failed: %',
                        placement_result->>'message';
                END IF;

            EXCEPTION
                WHEN OTHERS THEN
                    -- Log the error
                    INSERT INTO activation_issues (
                        wallet_address,
                        error_message,
                        error_details,
                        attempt_method,
                        created_at
                    ) VALUES (
                        NEW.wallet_address,
                        'Matrix placement failed during membership processing',
                        json_build_object(
                            'error', SQLERRM,
                            'referrer_wallet', user_referrer_wallet,
                            'membership_id', NEW.id
                        ),
                        'trigger_membership_processing',
                        NOW()
                    );

                    -- Re-raise the exception so membership processing fails loudly
                    RAISE;
            END;
        ELSE
            -- Log missing referrer
            INSERT INTO audit_logs (user_wallet, action, new_values)
            VALUES (NEW.wallet_address, 'membership_nft_claimed', json_build_object(
                'membership_id', NEW.id,
                'nft_level', NEW.nft_level,
                'claim_price', NEW.claim_price,
                'referrer_wallet', NULL,
                'claimed_at', NEW.claimed_at,
                'warning', 'No referrer wallet found'
            ));
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_membership_processing IS
'Updated trigger function that raises exceptions on placement failure
instead of silent errors. Logs all attempts to audit_logs and errors to activation_issues.';

-- ============================================================================
-- STEP 3: Create monitoring view for failed registrations
-- ============================================================================

CREATE OR REPLACE VIEW v_members_missing_matrix_placement AS
SELECT
    m.wallet_address,
    m.referrer_wallet,
    m.activation_sequence,
    m.activation_time,
    m.current_level,
    EXTRACT(EPOCH FROM (NOW() - m.activation_time)) / 3600 AS hours_since_activation,
    u.created_at AS user_created_at,
    mem.claimed_at AS membership_claimed_at,
    mem.nft_level
FROM members m
LEFT JOIN matrix_referrals mr ON m.wallet_address = mr.member_wallet
LEFT JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN membership mem ON m.wallet_address = mem.wallet_address AND mem.nft_level = 1
WHERE mr.member_wallet IS NULL  -- No matrix placement
  AND m.activation_time >= NOW() - INTERVAL '30 days'  -- Last 30 days only
ORDER BY m.activation_time DESC;

COMMENT ON VIEW v_members_missing_matrix_placement IS
'Monitoring view to identify members who were registered but not placed in matrix.
Use this for alerting and backfill operations.';

-- ============================================================================
-- STEP 4: Create function to backfill missing placements
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_missing_matrix_placements(
    p_dry_run BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
    wallet_address VARCHAR(42),
    referrer_wallet VARCHAR(42),
    placement_success BOOLEAN,
    placement_message TEXT,
    created_reward BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_member RECORD;
    v_placement_result JSON;
    v_placement_success BOOLEAN;
    v_reward_count INTEGER;
BEGIN
    FOR v_member IN
        SELECT * FROM v_members_missing_matrix_placement
        ORDER BY activation_time ASC  -- Process oldest first
    LOOP
        BEGIN
            -- Attempt placement
            IF NOT p_dry_run THEN
                SELECT place_new_member_in_matrix_correct(
                    v_member.wallet_address,
                    v_member.referrer_wallet
                ) INTO v_placement_result;

                v_placement_success := (v_placement_result->>'success')::BOOLEAN;

                -- Check if reward was created
                SELECT COUNT(*) INTO v_reward_count
                FROM direct_referral_rewards
                WHERE referred_member_wallet = v_member.wallet_address;
            ELSE
                -- Dry run mode
                v_placement_result := json_build_object(
                    'success', true,
                    'message', 'DRY RUN - would attempt placement'
                );
                v_placement_success := NULL;
                v_reward_count := 0;
            END IF;

            RETURN QUERY SELECT
                v_member.wallet_address,
                v_member.referrer_wallet,
                v_placement_success,
                v_placement_result->>'message',
                (v_reward_count > 0);

        EXCEPTION
            WHEN OTHERS THEN
                RETURN QUERY SELECT
                    v_member.wallet_address,
                    v_member.referrer_wallet,
                    FALSE,
                    'ERROR: ' || SQLERRM,
                    FALSE;
        END;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION backfill_missing_matrix_placements IS
'Backfills matrix placements for members who were registered without placement.
Set p_dry_run=FALSE to execute actual placements. Returns detailed results.';

-- ============================================================================
-- STEP 5: Validation queries
-- ============================================================================

-- Check that the fix was applied
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ CRITICAL FIX APPLIED: Registration Flow Matrix Placement';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes Applied:';
    RAISE NOTICE '  1. place_new_member_in_matrix_correct() - Now calls working function';
    RAISE NOTICE '  2. trigger_membership_processing() - Now raises errors on failure';
    RAISE NOTICE '  3. v_members_missing_matrix_placement - Monitoring view created';
    RAISE NOTICE '  4. backfill_missing_matrix_placements() - Backfill utility created';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Test new registration flow with test wallet';
    RAISE NOTICE '  2. Run: SELECT * FROM v_members_missing_matrix_placement;';
    RAISE NOTICE '  3. Run dry-run: SELECT * FROM backfill_missing_matrix_placements(TRUE);';
    RAISE NOTICE '  4. Execute backfill: SELECT * FROM backfill_missing_matrix_placements(FALSE);';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Test thoroughly before running backfill!';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- POST-DEPLOYMENT VALIDATION
-- ============================================================================

-- Count members still missing placement
SELECT
    COUNT(*) AS members_missing_placement,
    MIN(activation_time) AS oldest_missing,
    MAX(activation_time) AS newest_missing
FROM v_members_missing_matrix_placement;

-- Show summary by referrer
SELECT
    referrer_wallet,
    COUNT(*) AS missing_count
FROM v_members_missing_matrix_placement
GROUP BY referrer_wallet
ORDER BY missing_count DESC;
