-- ============================================================================
-- Convert Available Balances to Withdrawal Records
-- Purpose: Mark all existing available_balance as withdrawn
-- Date: 2025-10-27
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📦 Creating backup of user_balances...';
END $$;

DROP TABLE IF EXISTS user_balances_backup_available_20251027 CASCADE;
CREATE TABLE user_balances_backup_available_20251027 AS
SELECT * FROM user_balances;

DO $$
BEGIN
    RAISE NOTICE '✅ Backup created: user_balances (%)',
        (SELECT COUNT(*) FROM user_balances_backup_available_20251027);
    RAISE NOTICE '';
END $$;

-- ===================================
-- Convert Available Balance to Withdrawals
-- ===================================

DO $$
DECLARE
    v_user RECORD;
    v_total_created INTEGER := 0;
    v_total_amount NUMERIC(18,6) := 0;
    v_withdrawal_id UUID;
BEGIN
    RAISE NOTICE '💰 Converting available_balance to withdrawal records...';
    RAISE NOTICE '';

    -- Process each user with available_balance > 0
    FOR v_user IN
        SELECT
            wallet_address,
            available_balance,
            total_withdrawn
        FROM user_balances
        WHERE available_balance > 0
        ORDER BY wallet_address
    LOOP
        -- Create withdrawal record for available_balance
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
            v_user.available_balance,
            v_user.wallet_address,
            'polygon',
            'completed',
            'LEGACY_AVAILABLE_BALANCE_CONVERSION',
            NOW(),
            NOW()
        );

        v_total_created := v_total_created + 1;
        v_total_amount := v_total_amount + v_user.available_balance;

        -- Update user_balances: available_balance → 0, update total_withdrawn
        UPDATE user_balances
        SET
            available_balance = 0,
            total_withdrawn = total_withdrawn + available_balance,
            last_updated = NOW()
        WHERE wallet_address = v_user.wallet_address;

        -- Progress notification every 100 users
        IF v_total_created % 100 = 0 THEN
            RAISE NOTICE '  ✅ Progress: % withdrawal records created', v_total_created;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Available balance conversion completed!';
    RAISE NOTICE '📊 Statistics:';
    RAISE NOTICE '   - Total withdrawal records created: %', v_total_created;
    RAISE NOTICE '   - Total amount marked as withdrawn: % USDC', v_total_amount;
    RAISE NOTICE '';
END $$;

-- ===================================
-- Verification
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔍 VERIFICATION';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Check 1: User balances (should have 0 available_balance)
SELECT
    '📊 User Balances After Conversion' as info,
    COUNT(*) as total_users,
    SUM(available_balance) as total_available_balance,
    SUM(reward_balance) as total_reward_balance,
    SUM(total_withdrawn) as total_withdrawn,
    COUNT(*) FILTER (WHERE available_balance > 0) as users_with_available,
    COUNT(*) FILTER (WHERE reward_balance > 0) as users_with_reward
FROM user_balances;

-- Check 2: Withdrawal records
SELECT
    '💸 Legacy Available Balance Withdrawals' as info,
    COUNT(*) as total_withdrawals,
    SUM(amount) as total_amount
FROM usdt_withdrawals
WHERE transaction_hash = 'LEGACY_AVAILABLE_BALANCE_CONVERSION';

-- Check 3: All withdrawal records summary
SELECT
    '💸 All Withdrawal Records Summary' as info,
    COUNT(*) as total_withdrawals,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    SUM(amount) as total_amount,
    COUNT(*) FILTER (WHERE transaction_hash LIKE 'LEGACY%') as legacy_conversions
FROM usdt_withdrawals;

-- Check 4: Users still with balances (should be 0)
SELECT
    '⚠️ Users Still With Available Balance' as info,
    COUNT(*) as user_count,
    SUM(available_balance) as total_available_remaining
FROM user_balances
WHERE available_balance > 0;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Available balance conversion complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Summary:';
    RAISE NOTICE '   - All available_balance converted to withdrawal records';
    RAISE NOTICE '   - All users now have $0 available_balance';
    RAISE NOTICE '   - total_withdrawn field updated for all users';
    RAISE NOTICE '   - Withdrawal records marked as "completed"';
    RAISE NOTICE '';
END $$;
