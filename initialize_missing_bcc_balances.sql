-- Initialize Missing BCC Balances for Existing Members
-- Members 4018-4023 need BCC initialization: 500 BCC available + 10450 BCC locked

BEGIN;

-- Fix member 4020 (has balance record but BCC is zero)
UPDATE user_balances
SET
    bcc_balance = 500.0,
    bcc_locked = 10450.0,
    activation_tier = 1,
    tier_multiplier = 1.0,
    last_updated = NOW()
WHERE wallet_address ILIKE '0x17918ABa958f332717e594C53906F77afa551BFB'
  AND bcc_balance = 0;

-- Create balance records for members without user_balances
INSERT INTO user_balances (
    wallet_address,
    bcc_balance,
    bcc_locked,
    activation_tier,
    tier_multiplier,
    available_balance,
    total_earned,
    total_withdrawn,
    reward_balance,
    reward_claimed,
    bcc_used,
    bcc_total_unlocked,
    last_updated
)
SELECT
    m.wallet_address,
    500.0,              -- 500 BCC available
    10450.0,            -- 10450 BCC locked
    1,                  -- Tier 1
    1.0,                -- Full multiplier
    0,                  -- No USDT balance yet
    0,                  -- No earnings yet
    0,                  -- No withdrawals
    0,                  -- No reward balance
    0,                  -- No rewards claimed
    0,                  -- No BCC used
    0,                  -- No BCC unlocked yet (still at Level 1)
    NOW()
FROM members m
LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
WHERE ub.wallet_address IS NULL
  AND m.activation_sequence >= 4018  -- Recent members
ON CONFLICT (wallet_address) DO UPDATE
SET
    bcc_balance = CASE WHEN user_balances.bcc_balance = 0 THEN 500.0 ELSE user_balances.bcc_balance END,
    bcc_locked = CASE WHEN user_balances.bcc_locked = 0 THEN 10450.0 ELSE user_balances.bcc_locked END,
    activation_tier = CASE WHEN user_balances.activation_tier = 0 THEN 1 ELSE user_balances.activation_tier END,
    tier_multiplier = CASE WHEN user_balances.tier_multiplier = 0 THEN 1.0 ELSE user_balances.tier_multiplier END,
    last_updated = NOW();

-- Verification
SELECT
    '=== BCC Balance Initialization Verification ===' as info;

SELECT
    m.wallet_address,
    m.activation_sequence,
    m.current_level,
    ub.bcc_balance as available_bcc,
    ub.bcc_locked as locked_bcc,
    ub.bcc_balance + ub.bcc_locked as total_bcc,
    ub.activation_tier,
    ub.tier_multiplier
FROM members m
INNER JOIN user_balances ub ON m.wallet_address = ub.wallet_address
WHERE m.activation_sequence >= 4018
ORDER BY m.activation_sequence;

COMMIT;

SELECT '✅ BCC initialization complete for all recent members!' as result;
