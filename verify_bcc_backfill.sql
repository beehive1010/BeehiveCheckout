-- Verification Script: Check BCC Backfill Results
-- Run this after applying migration 20251017000001_backfill_missing_bcc_releases.sql

-- 1. Check total users backfilled
SELECT
    '=== Backfill Summary ===' as section;

SELECT
    COUNT(DISTINCT user_wallet) as total_users_backfilled,
    SUM((new_values->>'missing_bcc_amount')::INTEGER) as total_bcc_released,
    MIN(created_at) as backfill_start_time,
    MAX(created_at) as backfill_end_time
FROM audit_logs
WHERE action = 'bcc_backfill_missing_level_release';

-- 2. Breakdown by level
SELECT
    '=== Backfill by Level ===' as section;

SELECT
    (old_values->>'current_level')::INTEGER as level,
    COUNT(*) as users_backfilled,
    MAX((new_values->>'missing_bcc_amount')::INTEGER) as bcc_per_user,
    SUM((new_values->>'missing_bcc_amount')::INTEGER) as total_bcc_for_level
FROM audit_logs
WHERE action = 'bcc_backfill_missing_level_release'
GROUP BY (old_values->>'current_level')::INTEGER
ORDER BY (old_values->>'current_level')::INTEGER;

-- 3. Verify specific levels (Level 2, 18, 19)
SELECT
    '=== Critical Level Verification ===' as section;

-- Level 2 users (should receive 150 BCC)
SELECT
    'Level 2' as level,
    COUNT(*) as user_count,
    150 as expected_bcc,
    MAX((new_values->>'missing_bcc_amount')::INTEGER) as actual_bcc,
    CASE
        WHEN MAX((new_values->>'missing_bcc_amount')::INTEGER) = 150 THEN '✅ Correct'
        ELSE '❌ Incorrect'
    END as status
FROM audit_logs
WHERE action = 'bcc_backfill_missing_level_release'
  AND (old_values->>'current_level')::INTEGER = 2

UNION ALL

-- Level 18 users (should receive 950 BCC)
SELECT
    'Level 18' as level,
    COUNT(*) as user_count,
    950 as expected_bcc,
    MAX((new_values->>'missing_bcc_amount')::INTEGER) as actual_bcc,
    CASE
        WHEN MAX((new_values->>'missing_bcc_amount')::INTEGER) = 950 THEN '✅ Correct'
        ELSE '❌ Incorrect'
    END as status
FROM audit_logs
WHERE action = 'bcc_backfill_missing_level_release'
  AND (old_values->>'current_level')::INTEGER = 18

UNION ALL

-- Level 19 users (should receive 1000 BCC)
SELECT
    'Level 19' as level,
    COUNT(*) as user_count,
    1000 as expected_bcc,
    MAX((new_values->>'missing_bcc_amount')::INTEGER) as actual_bcc,
    CASE
        WHEN MAX((new_values->>'missing_bcc_amount')::INTEGER) = 1000 THEN '✅ Correct'
        ELSE '❌ Incorrect'
    END as status
FROM audit_logs
WHERE action = 'bcc_backfill_missing_level_release'
  AND (old_values->>'current_level')::INTEGER = 19;

-- 4. Sample user verification - show actual balance changes
SELECT
    '=== Sample User Balance Verification ===' as section;

SELECT
    al.user_wallet,
    (al.old_values->>'current_level')::INTEGER as level,
    (al.old_values->>'old_bcc_balance')::INTEGER as old_balance,
    (al.new_values->>'missing_bcc_amount')::INTEGER as bcc_added,
    (al.new_values->>'new_bcc_balance')::INTEGER as expected_new_balance,
    ub.bcc_balance as actual_new_balance,
    CASE
        WHEN ub.bcc_balance = (al.new_values->>'new_bcc_balance')::INTEGER THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as verification_status
FROM audit_logs al
JOIN user_balances ub ON al.user_wallet = ub.wallet_address
WHERE al.action = 'bcc_backfill_missing_level_release'
ORDER BY (al.old_values->>'current_level')::INTEGER DESC
LIMIT 10;

-- 5. Check for any anomalies
SELECT
    '=== Anomaly Check ===' as section;

-- Check if any user was backfilled multiple times
SELECT
    user_wallet,
    COUNT(*) as backfill_count,
    CASE
        WHEN COUNT(*) > 1 THEN '⚠️ Multiple backfills detected'
        ELSE '✅ OK'
    END as status
FROM audit_logs
WHERE action = 'bcc_backfill_missing_level_release'
GROUP BY user_wallet
HAVING COUNT(*) > 1;

-- If no duplicates, show success message
SELECT
    CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM audit_logs
            WHERE action = 'bcc_backfill_missing_level_release'
            GROUP BY user_wallet
            HAVING COUNT(*) > 1
        ) THEN '✅ No duplicate backfills detected'
        ELSE '⚠️ Some users have duplicate backfills'
    END as duplicate_check;

-- 6. Verify bcc_total_unlocked is correct
SELECT
    '=== Total Unlocked Verification ===' as section;

SELECT
    al.user_wallet,
    m.current_level,
    (al.old_values->>'old_total_unlocked')::INTEGER as old_total_unlocked,
    (al.new_values->>'missing_bcc_amount')::INTEGER as bcc_added,
    (al.new_values->>'new_total_unlocked')::INTEGER as expected_total,
    ub.bcc_total_unlocked as actual_total,
    CASE
        WHEN ub.bcc_total_unlocked = (al.new_values->>'new_total_unlocked')::INTEGER THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as status
FROM audit_logs al
JOIN user_balances ub ON al.user_wallet = ub.wallet_address
JOIN members m ON al.user_wallet = m.wallet_address
WHERE al.action = 'bcc_backfill_missing_level_release'
ORDER BY m.current_level DESC
LIMIT 10;

-- 7. Summary statistics
SELECT
    '=== Final Summary ===' as section;

WITH backfill_stats AS (
    SELECT
        COUNT(DISTINCT user_wallet) as total_users,
        SUM((new_values->>'missing_bcc_amount')::INTEGER) as total_bcc,
        MIN((old_values->>'current_level')::INTEGER) as min_level,
        MAX((old_values->>'current_level')::INTEGER) as max_level
    FROM audit_logs
    WHERE action = 'bcc_backfill_missing_level_release'
)
SELECT
    total_users as users_backfilled,
    total_bcc as total_bcc_released,
    min_level as lowest_level_backfilled,
    max_level as highest_level_backfilled,
    ROUND(total_bcc::NUMERIC / NULLIF(total_users, 0), 2) as avg_bcc_per_user
FROM backfill_stats;

-- 8. Show users with highest backfill amounts (Level 19 users)
SELECT
    '=== Top Backfill Recipients (Level 19) ===' as section;

SELECT
    al.user_wallet,
    (al.old_values->>'current_level')::INTEGER as level,
    (al.new_values->>'missing_bcc_amount')::INTEGER as bcc_received,
    (al.old_values->>'old_bcc_balance')::INTEGER as old_balance,
    ub.bcc_balance as new_balance,
    al.created_at as backfill_timestamp
FROM audit_logs al
JOIN user_balances ub ON al.user_wallet = ub.wallet_address
WHERE al.action = 'bcc_backfill_missing_level_release'
  AND (al.old_values->>'current_level')::INTEGER = 19
ORDER BY al.created_at DESC
LIMIT 5;
