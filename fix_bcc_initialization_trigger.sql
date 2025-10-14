-- Fix BCC Initialization Trigger
-- Create trigger to automatically initialize BCC balance when member is created
-- Initial values: 500 BCC available + 10450 BCC locked

BEGIN;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_create_balance_with_initial ON members;

-- Create trigger to initialize BCC balance on member creation
CREATE TRIGGER trigger_auto_create_balance_with_initial
    AFTER INSERT ON members
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_user_balance_with_initial();

-- Verify trigger was created
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'members'
  AND trigger_name = 'trigger_auto_create_balance_with_initial';

COMMIT;

-- Test: Check a recent member to see if they have BCC initialized
SELECT
    '=== Recent Member BCC Balance Check ===' as info;

SELECT
    m.wallet_address,
    m.current_level,
    m.activation_sequence,
    ub.bcc_balance,
    ub.bcc_locked,
    ub.activation_tier,
    ub.tier_multiplier
FROM members m
LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
WHERE m.activation_sequence >= 4020
ORDER BY m.activation_sequence DESC
LIMIT 5;

-- If any members don't have balances, this will show them
SELECT
    '=== Members Without BCC Balance ===' as info;

SELECT
    m.wallet_address,
    m.current_level,
    m.activation_sequence,
    m.activation_time
FROM members m
LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
WHERE ub.wallet_address IS NULL
ORDER BY m.activation_sequence DESC
LIMIT 10;
