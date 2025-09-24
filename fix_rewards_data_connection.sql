-- Fix rewards data connection between layer_rewards table and user_balances table
-- This ensures all rewards data is properly connected for the UI

\echo '=== Checking Rewards Data Connection Issues ==='

-- 1. Check layer_rewards table structure and data
SELECT 
    'layer_rewards' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_count,
    COUNT(CASE WHEN status = 'rolled_up' THEN 1 END) as rolled_up_count
FROM layer_rewards;

\echo ''

-- 2. Check user_balances table structure and data
SELECT 
    'user_balances' as table_name,
    COUNT(*) as total_records,
    SUM(COALESCE(usdc_claimable, 0)) as total_claimable,
    SUM(COALESCE(usdc_pending, 0)) as total_pending,
    SUM(COALESCE(usdc_claimed_total, 0)) as total_claimed
FROM user_balances;

\echo ''

-- 3. Find rewards without corresponding balance records
SELECT 
    'Missing Balance Records' as issue,
    COUNT(DISTINCT lr.reward_recipient_wallet) as wallets_with_rewards,
    COUNT(DISTINCT ub.wallet_address) as wallets_with_balances,
    COUNT(DISTINCT lr.reward_recipient_wallet) - COUNT(DISTINCT ub.wallet_address) as missing_balance_records
FROM layer_rewards lr
FULL OUTER JOIN user_balances ub ON LOWER(lr.reward_recipient_wallet) = LOWER(ub.wallet_address);

\echo ''

-- 4. Create missing user_balance records for wallets with rewards but no balance record
INSERT INTO user_balances (
    wallet_address,
    usdc_claimable,
    usdc_pending,
    usdc_claimed_total,
    bcc_transferable,
    bcc_locked,
    created_at,
    updated_at
)
SELECT DISTINCT
    LOWER(lr.reward_recipient_wallet) as wallet_address,
    0 as usdc_claimable,
    0 as usdc_pending,
    0 as usdc_claimed_total,
    0 as bcc_transferable,
    0 as bcc_locked,
    NOW() as created_at,
    NOW() as updated_at
FROM layer_rewards lr
LEFT JOIN user_balances ub ON LOWER(lr.reward_recipient_wallet) = LOWER(ub.wallet_address)
WHERE ub.wallet_address IS NULL;

\echo ''
\echo '=== Synchronizing Balance Data with Layer Rewards ==='

-- 5. Update user_balances to reflect actual layer_rewards data
WITH reward_totals AS (
    SELECT 
        LOWER(reward_recipient_wallet) as wallet_address,
        SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as total_claimable,
        SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'claimed' THEN reward_amount ELSE 0 END) as total_claimed
    FROM layer_rewards
    GROUP BY LOWER(reward_recipient_wallet)
)
UPDATE user_balances
SET 
    usdc_claimable = rt.total_claimable,
    usdc_pending = rt.total_pending,
    usdc_claimed_total = rt.total_claimed,
    updated_at = NOW()
FROM reward_totals rt
WHERE LOWER(user_balances.wallet_address) = rt.wallet_address;

\echo ''
\echo '=== Fixing specific wallet 0xa212A85f7434A5EBAa5b468971EC3972cE72a544 ==='

-- 6. Fix the specific wallet mentioned by user
UPDATE layer_rewards
SET 
    status = CASE 
        WHEN matrix_layer = 1 AND layer_position = 'R' AND recipient_current_level < 2 THEN 'pending'
        WHEN matrix_layer = 2 AND layer_position = 'R' AND recipient_current_level < 3 THEN 'pending'
        WHEN matrix_layer = 3 AND layer_position = 'R' AND recipient_current_level < 4 THEN 'pending'
        WHEN matrix_layer >= 1 AND layer_position IN ('L', 'M') AND recipient_current_level < matrix_layer THEN 'pending'
        ELSE status  -- Keep current status if already correct
    END,
    recipient_required_level = CASE 
        WHEN layer_position = 'R' THEN matrix_layer + 1
        ELSE matrix_layer
    END,
    expires_at = CASE 
        WHEN (
            (matrix_layer = 1 AND layer_position = 'R' AND recipient_current_level < 2) OR
            (matrix_layer = 2 AND layer_position = 'R' AND recipient_current_level < 3) OR
            (matrix_layer = 3 AND layer_position = 'R' AND recipient_current_level < 4) OR
            (matrix_layer >= 1 AND layer_position IN ('L', 'M') AND recipient_current_level < matrix_layer)
        ) THEN NOW() + INTERVAL '72 hours'
        ELSE NULL
    END,
    requires_direct_referrals = false,
    direct_referrals_required = 0
WHERE reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

-- Create countdown timers for new pending rewards
INSERT INTO countdown_timers (
    wallet_address,
    timer_type,
    title,
    description,
    start_time,
    end_time,
    is_active,
    auto_action,
    metadata,
    related_reward_id
)
SELECT 
    lr.reward_recipient_wallet,
    'pending_reward',
    format('Layer %s %s Position Reward', lr.matrix_layer, lr.layer_position),
    format('Layer %s %s Position: Need Level %s+ to claim this %s USDT reward. You currently have Level %s.',
           lr.matrix_layer, lr.layer_position, lr.recipient_required_level, lr.reward_amount, lr.recipient_current_level),
    NOW(),
    lr.expires_at,
    true,
    'expire_reward',
    json_build_object(
        'reward_id', lr.id,
        'reward_amount', lr.reward_amount,
        'reward_layer', lr.matrix_layer,
        'layer_position', lr.layer_position,
        'required_level', lr.recipient_required_level,
        'current_level', lr.recipient_current_level,
        'is_r_position_upgrade_incentive', (lr.layer_position = 'R'),
        'wallet_fixed', true
    ),
    lr.id
FROM layer_rewards lr
WHERE lr.reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
  AND lr.status = 'pending'
  AND lr.expires_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM countdown_timers ct 
    WHERE ct.related_reward_id = lr.id 
    AND ct.is_active = true
  );

\echo ''
\echo '=== Final Verification ==='

-- 7. Show final state for the specific wallet
SELECT 
    'Final State for 0xa212A85f7434A5EBAa5b468971EC3972cE72a544' as section,
    lr.id,
    lr.matrix_layer,
    lr.layer_position,
    lr.reward_amount,
    lr.status,
    lr.recipient_required_level,
    lr.recipient_current_level,
    lr.expires_at IS NOT NULL as has_expiry,
    CASE 
        WHEN lr.status = 'pending' AND lr.expires_at IS NOT NULL THEN '✅ Properly configured pending reward'
        WHEN lr.status = 'claimable' THEN '✅ Ready to claim'
        ELSE '❓ Other status'
    END as fix_status
FROM layer_rewards lr
WHERE lr.reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
ORDER BY lr.matrix_layer, lr.layer_position;

-- 8. Check countdown timers for this wallet
SELECT 
    'Active Timers for 0xa212A85f7434A5EBAa5b468971EC3972cE72a544' as section,
    ct.id,
    ct.timer_type,
    ct.title,
    ct.is_active,
    EXTRACT(EPOCH FROM (ct.end_time - NOW()))/3600 as hours_remaining,
    lr.matrix_layer,
    lr.layer_position,
    lr.reward_amount
FROM countdown_timers ct
JOIN layer_rewards lr ON ct.related_reward_id = lr.id
WHERE ct.wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
  AND ct.is_active = true
ORDER BY lr.matrix_layer, lr.layer_position;

\echo ''
\echo '=== Summary Statistics ==='

SELECT 
    'Final Summary' as section,
    COUNT(*) as total_rewards,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed,
    SUM(reward_amount) as total_value
FROM layer_rewards 
WHERE reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';