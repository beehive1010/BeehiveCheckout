-- ============================================================================
-- Convert User Balances to Withdrawal Records
-- Purpose: Mark all existing user balances as withdrawn by creating withdrawal records
-- Date: 2025-10-27
-- ============================================================================

-- This script handles legacy users who already claimed rewards in the old system
-- We convert their existing balances to "withdrawn" status to prevent duplicate payouts

-- ===================================
-- Step 1: Backup Current State
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '📦 Creating backup of user_reward_balances...';
END $$;

DROP TABLE IF EXISTS user_balances_backup_conversion_20251027 CASCADE;
CREATE TABLE user_balances_backup_conversion_20251027 AS
SELECT * FROM user_balances;

DROP TABLE IF EXISTS usdt_withdrawals_backup_conversion_20251027 CASCADE;
CREATE TABLE usdt_withdrawals_backup_conversion_20251027 AS
SELECT * FROM usdt_withdrawals;

DO $$
BEGIN
    RAISE NOTICE '✅ Backup created: user_balances (%), usdt_withdrawals (%)',
        (SELECT COUNT(*) FROM user_balances_backup_conversion_20251027),
        (SELECT COUNT(*) FROM usdt_withdrawals_backup_conversion_20251027);
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 2: Create Withdrawal Records for Existing Balances
-- ===================================

DO $$
DECLARE
    v_user RECORD;
    v_total_created INTEGER := 0;
    v_total_amount NUMERIC(18,6) := 0;
    v_withdrawal_id UUID;
BEGIN
    RAISE NOTICE '💰 Converting user balances to withdrawal records...';
    RAISE NOTICE '';

    -- Process each user with reward_balance > 0
    FOR v_user IN
        SELECT
            wallet_address,
            reward_balance,
            reward_claimed
        FROM user_balances
        WHERE reward_balance > 0
        ORDER BY wallet_address
    LOOP
        -- Create withdrawal record for reward_balance amount
        v_withdrawal_id := gen_random_uuid();

        INSERT INTO usdt_withdrawals (
            id,
            wallet_address,
            amount,
            withdrawal_address,
            network,
            status,
            transaction_hash,
            requested_at,
            processed_at
        ) VALUES (
            v_withdrawal_id,
            v_user.wallet_address,
            v_user.reward_balance,
            v_user.wallet_address,  -- Same wallet for legacy conversion
            'polygon',  -- Default network
            'completed',  -- Mark as completed/withdrawn
            'LEGACY_BALANCE_CONVERSION',  -- Placeholder tx_hash
            NOW(),
            NOW()
        );

        v_total_created := v_total_created + 1;
        v_total_amount := v_total_amount + v_user.reward_balance;

        -- Update user_balances to move reward_balance → reward_claimed
        UPDATE user_balances
        SET
            reward_claimed = reward_claimed + reward_balance,
            reward_balance = 0,
            total_withdrawn = total_withdrawn + reward_balance,
            last_updated = NOW()
        WHERE wallet_address = v_user.wallet_address;

        -- Progress notification every 100 users
        IF v_total_created % 100 = 0 THEN
            RAISE NOTICE '  ✅ Progress: % withdrawal records created', v_total_created;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Withdrawal conversion completed!';
    RAISE NOTICE '📊 Statistics:';
    RAISE NOTICE '   - Total withdrawal records created: %', v_total_created;
    RAISE NOTICE '   - Total amount marked as withdrawn: % USDC', v_total_amount;
    RAISE NOTICE '';
END $$;

-- ===================================
-- Step 3: Verification
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔍 VERIFICATION';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Check 1: User balances summary (should have 0 reward_balance)
SELECT
    '📊 User Balances After Conversion' as info,
    COUNT(*) as total_users,
    SUM(reward_balance) as total_reward_balance,
    SUM(reward_claimed) as total_reward_claimed,
    SUM(total_withdrawn) as total_withdrawn,
    COUNT(*) FILTER (WHERE reward_balance > 0) as users_with_balance,
    COUNT(*) FILTER (WHERE reward_claimed > 0) as users_with_claimed
FROM user_balances;

-- Check 2: Withdrawal records summary
SELECT
    '💸 Withdrawal Records Summary' as info,
    COUNT(*) as total_withdrawals,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    SUM(amount) as total_amount,
    SUM(amount) FILTER (WHERE status = 'completed') as completed_amount,
    COUNT(*) FILTER (WHERE transaction_hash = 'LEGACY_BALANCE_CONVERSION') as legacy_conversions
FROM usdt_withdrawals;

-- Check 3: Users with reward_balance (should be 0 after conversion)
SELECT
    '⚠️ Users Still With Reward Balance' as info,
    COUNT(*) as user_count,
    SUM(reward_balance) as total_reward_balance_remaining
FROM user_balances
WHERE reward_balance > 0;

-- Check 4: Detailed view of legacy withdrawals
SELECT
    '📋 Legacy Withdrawal Records' as info,
    wallet_address,
    amount,
    status,
    requested_at
FROM usdt_withdrawals
WHERE transaction_hash = 'LEGACY_BALANCE_CONVERSION'
ORDER BY requested_at DESC
LIMIT 10;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Balance conversion complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Summary:';
    RAISE NOTICE '   - All user reward balances have been converted to withdrawal records';
    RAISE NOTICE '   - Withdrawal records marked as "completed" status';
    RAISE NOTICE '   - transaction_hash set to "LEGACY_BALANCE_CONVERSION" for identification';
    RAISE NOTICE '   - Users'' reward_claimed and total_withdrawn fields updated';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT:';
    RAISE NOTICE '   - Legacy users now have $0 reward_balance';
    RAISE NOTICE '   - New rewards from regeneration will be their fresh start';
    RAISE NOTICE '   - Withdrawal records preserve historical data for auditing';
    RAISE NOTICE '';
END $$;
