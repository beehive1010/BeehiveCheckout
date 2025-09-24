-- Fix rewards data connection with correct table schema
-- Using actual user_balances table structure

\echo '=== Fixing Rewards Data Connection ==='

-- 1. Check current user_balances structure and data
SELECT 
    'user_balances' as table_name,
    COUNT(*) as total_records,
    SUM(COALESCE(reward_balance, 0)) as total_reward_balance,
    SUM(COALESCE(reward_claimed, 0)) as total_claimed,
    SUM(COALESCE(available_balance, 0)) as total_available
FROM user_balances;

\echo ''

-- 2. Create missing user_balance records for wallets with rewards
INSERT INTO user_balances (
    wallet_address,
    reward_balance,
    reward_claimed,
    available_balance,
    bcc_balance,
    bcc_locked,
    total_earned,
    total_withdrawn,
    activation_tier,
    tier_multiplier,
    last_updated
)
SELECT DISTINCT
    LOWER(lr.reward_recipient_wallet) as wallet_address,
    0 as reward_balance,
    0 as reward_claimed,
    0 as available_balance,
    0 as bcc_balance,
    0 as bcc_locked,
    0 as total_earned,
    0 as total_withdrawn,
    1 as activation_tier,
    1.0 as tier_multiplier,
    NOW() as last_updated
FROM layer_rewards lr
LEFT JOIN user_balances ub ON LOWER(lr.reward_recipient_wallet) = LOWER(ub.wallet_address)
WHERE ub.wallet_address IS NULL
ON CONFLICT (wallet_address) DO NOTHING;

\echo ''
\echo '=== Synchronizing Balance Data with Layer Rewards ==='

-- 3. Update user_balances to reflect actual layer_rewards data
WITH reward_totals AS (
    SELECT 
        LOWER(reward_recipient_wallet) as wallet_address,
        SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END) as total_claimable,
        SUM(CASE WHEN status = 'claimed' THEN reward_amount ELSE 0 END) as total_claimed,
        SUM(reward_amount) as total_earned
    FROM layer_rewards
    GROUP BY LOWER(reward_recipient_wallet)
)
UPDATE user_balances
SET 
    reward_balance = COALESCE(rt.total_claimable, 0),
    reward_claimed = COALESCE(rt.total_claimed, 0),
    total_earned = COALESCE(rt.total_earned, 0),
    available_balance = COALESCE(rt.total_claimable, 0),  -- Available = claimable
    last_updated = NOW()
FROM reward_totals rt
WHERE LOWER(user_balances.wallet_address) = rt.wallet_address;

\echo ''
\echo '=== Check specific wallet 0xa212A85f7434A5EBAa5b468971EC3972cE72a544 ==='

-- 4. Show the specific wallet's data
SELECT 
    'Layer Rewards' as source,
    lr.id,
    lr.matrix_layer,
    lr.layer_position,
    lr.reward_amount,
    lr.status,
    lr.recipient_required_level,
    lr.recipient_current_level,
    CASE 
        WHEN lr.status = 'claimable' THEN '✅ Ready to claim'
        WHEN lr.status = 'pending' THEN '⏳ Pending upgrade'
        WHEN lr.status = 'claimed' THEN '✅ Already claimed'
        ELSE lr.status
    END as reward_status
FROM layer_rewards lr
WHERE lr.reward_recipient_wallet ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544'
ORDER BY lr.matrix_layer, lr.layer_position;

\echo ''

-- 5. Show user balance for this wallet
SELECT 
    'User Balance' as source,
    ub.wallet_address,
    ub.reward_balance as claimable_amount,
    ub.reward_claimed as claimed_amount,
    ub.total_earned,
    ub.available_balance,
    ub.last_updated
FROM user_balances ub
WHERE ub.wallet_address ILIKE '0xa212A85f7434A5EBAa5b468971EC3972cE72a544';

\echo ''
\echo '=== Verify Connection Status ==='

-- 6. Verify data consistency between tables
SELECT 
    'Data Consistency Check' as check_type,
    COUNT(DISTINCT lr.reward_recipient_wallet) as wallets_with_rewards,
    COUNT(DISTINCT ub.wallet_address) as wallets_with_balances,
    SUM(CASE WHEN lr.status = 'claimable' THEN lr.reward_amount ELSE 0 END) as total_claimable_rewards,
    SUM(ub.reward_balance) as total_balance_claimable,
    SUM(CASE WHEN lr.status = 'claimed' THEN lr.reward_amount ELSE 0 END) as total_claimed_rewards,
    SUM(ub.reward_claimed) as total_balance_claimed,
    CASE 
        WHEN SUM(CASE WHEN lr.status = 'claimable' THEN lr.reward_amount ELSE 0 END) = SUM(ub.reward_balance)
        AND SUM(CASE WHEN lr.status = 'claimed' THEN lr.reward_amount ELSE 0 END) = SUM(ub.reward_claimed)
        THEN '✅ Data is synchronized'
        ELSE '❌ Data needs synchronization'
    END as sync_status
FROM layer_rewards lr
FULL OUTER JOIN user_balances ub ON LOWER(lr.reward_recipient_wallet) = LOWER(ub.wallet_address);

\echo ''
\echo '=== Summary for All Users ==='

-- 7. Show a summary of reward status for all users
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'claimable' THEN 1 END) as claimable_rewards,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_rewards,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as claimed_rewards,
    COUNT(CASE WHEN status = 'rolled_up' THEN 1 END) as rolled_up_rewards,
    SUM(reward_amount) as total_reward_value,
    COUNT(DISTINCT reward_recipient_wallet) as unique_recipients
FROM layer_rewards;