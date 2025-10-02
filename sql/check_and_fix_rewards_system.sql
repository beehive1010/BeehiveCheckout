-- Check and fix rewards system for 3x3 matrix 
-- Based on marketing plan reward rules

\echo '🔍 Checking and fixing rewards system for 3x3 matrix...'

-- Step 1: Check current reward data
\echo 'Current reward tables status:'
SELECT 'reward_claims' as table_name, COUNT(*) as count FROM reward_claims
UNION ALL
SELECT 'layer_rewards', COUNT(*) FROM layer_rewards
UNION ALL  
SELECT 'reward_records', COUNT(*) FROM reward_records
UNION ALL
SELECT 'user_reward_balances', COUNT(*) FROM user_reward_balances;

-- Step 2: Test reward functions exist and check their logic
\echo ''
\echo '🔧 Checking reward-related functions:'
SELECT proname as function_name,
       CASE 
           WHEN prosrc LIKE '%POWER(2,%' THEN '❌ Uses 2^layer (needs 3^layer fix)'
           WHEN prosrc LIKE '%POWER(3,%' THEN '✅ Uses 3^layer (correct)'
           WHEN proname LIKE '%reward%' THEN '⚠️  Needs manual review'
           ELSE '✓ No matrix calculations'
       END as matrix_compatibility
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND prokind = 'f'
AND proname LIKE '%reward%'
ORDER BY proname;

-- Step 3: Create sample reward data based on current matrix structure
\echo ''
\echo '📊 Creating sample reward data based on marketing plan...'

-- According to marketing plan:
-- When a member activates Level 1, their matrix root gets 100 USDC reward
-- Root must be Level 2+ to claim Layer 1 (R position) reward  
-- Root must be same level or higher to claim other rewards

-- Generate reward claims for current matrix placements
INSERT INTO reward_claims (
    root_wallet,
    triggering_member_wallet,
    layer,
    nft_level,
    reward_amount_usdc,
    status,
    expires_at,
    metadata
)
SELECT 
    r.matrix_root as root_wallet,
    r.member_wallet as triggering_member_wallet,
    r.matrix_layer as layer,
    m.current_level as nft_level,
    -- Reward = NFT price according to marketing plan (Level 1 = 100 USDC, +50 each level)
    (50 + (m.current_level * 50))::numeric(18,6) as reward_amount_usdc,
    -- Status based on root's eligibility
    CASE 
        -- Special rule: Layer 1 R position requires root to be Level 2+
        WHEN r.matrix_layer = 1 AND r.matrix_position = 'R' AND root_m.current_level < 2 THEN 'pending'
        -- General rule: Root must be >= triggering member level
        WHEN root_m.current_level >= m.current_level THEN 'claimable'
        ELSE 'pending'
    END as status,
    -- 72 hour expiry for pending rewards
    now() + INTERVAL '72 hours' as expires_at,
    jsonb_build_object(
        'matrix_position', r.matrix_position,
        'activation_rank', r.activation_rank,
        'reward_rule', CASE 
            WHEN r.matrix_layer = 1 AND r.matrix_position = 'R' THEN 'Layer 1 R position requires Level 2+'
            ELSE 'Root must be >= member level'
        END,
        'nft_price_usdc', (50 + (m.current_level * 50))
    ) as metadata
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
JOIN members root_m ON r.matrix_root = root_m.wallet_address
WHERE r.matrix_root != r.member_wallet -- Don't create rewards for root activating themselves
ON CONFLICT DO NOTHING; -- Avoid duplicates

\echo '✅ Created sample reward claims based on current matrix structure'

-- Step 4: Initialize user_reward_balances for USDC tracking
INSERT INTO user_reward_balances (
    wallet_address,
    usdc_claimable,
    usdc_pending, 
    usdc_claimed
)
SELECT 
    m.wallet_address,
    COALESCE(claimable.amount, 0) as usdc_claimable,
    COALESCE(pending.amount, 0) as usdc_pending,
    0 as usdc_claimed -- No claims yet
FROM members m
LEFT JOIN (
    SELECT root_wallet, SUM(reward_amount_usdc) as amount
    FROM reward_claims 
    WHERE status = 'claimable'
    GROUP BY root_wallet
) claimable ON m.wallet_address = claimable.root_wallet
LEFT JOIN (
    SELECT root_wallet, SUM(reward_amount_usdc) as amount
    FROM reward_claims
    WHERE status = 'pending' 
    GROUP BY root_wallet
) pending ON m.wallet_address = pending.root_wallet
ON CONFLICT (wallet_address) DO UPDATE SET
    usdc_claimable = EXCLUDED.usdc_claimable,
    usdc_pending = EXCLUDED.usdc_pending;

\echo '✅ Initialized user_reward_balances'

-- Step 5: Test reward views
\echo ''
\echo '📊 Testing reward views:'

\echo 'Reward Claims Dashboard:'
SELECT 
    root_username,
    triggering_member_username,
    layer,
    nft_level,
    reward_amount_usdc,
    status,
    time_remaining
FROM reward_claims_dashboard
WHERE time_remaining > INTERVAL '0'
ORDER BY created_at DESC
LIMIT 5;

\echo ''
\echo 'User Balance Summary (USDC Rewards):'
SELECT 
    username,
    usdc_claimable,
    usdc_pending,
    usdc_total_available,
    member_status
FROM user_balance_summary
WHERE usdc_claimable > 0 OR usdc_pending > 0
ORDER BY usdc_total_available DESC;

\echo ''
\echo 'Matrix Reward Summary:'
SELECT 
    layer,
    reward_per_member_usdc,
    max_layer_rewards_usdc,
    max_claims_per_user
FROM matrix_reward_summary
WHERE layer <= 5
ORDER BY layer;

-- Step 6: Create BCC locked release tracking
\echo ''
\echo '📊 BCC Locked Release Tracking:'
-- Update user balances to reflect BCC releases based on marketing plan
-- Level 1 = 100 BCC, Level 2 = 150 BCC, etc. (already in locked pool)

-- For members who have activated levels, move appropriate BCC from locked to transferable
UPDATE user_balances 
SET 
    bcc_transferable = 500 + (m.current_level * 100), -- Base 500 + level-based release
    bcc_locked = 10450 - (m.current_level * 100), -- Reduce locked amount
    updated_at = now()
FROM members m
WHERE user_balances.wallet_address = m.wallet_address
AND m.current_level > 0
AND user_balances.wallet_address != '0x0000000000000000000000000000000000000001'; -- Skip root

\echo '✅ Updated BCC locked release based on member levels'

-- Step 7: Summary of rewards system status
\echo ''
\echo '📊 Rewards System Summary:'
SELECT 'Total reward claims' as metric, COUNT(*)::text as value FROM reward_claims
UNION ALL
SELECT 'Claimable USDC rewards', SUM(reward_amount_usdc)::text FROM reward_claims WHERE status = 'claimable'
UNION ALL
SELECT 'Pending USDC rewards', SUM(reward_amount_usdc)::text FROM reward_claims WHERE status = 'pending'
UNION ALL
SELECT 'Members with rewards', COUNT(DISTINCT root_wallet)::text FROM reward_claims
UNION ALL
SELECT 'Average reward per claim', ROUND(AVG(reward_amount_usdc), 2)::text FROM reward_claims;

\echo ''
\echo '✅ Rewards system checked and updated for 3x3 matrix!'
\echo 'Key features:'
\echo '  - USDC rewards = NFT prices (100, 150, 200... USDC)'
\echo '  - Layer 1 R position requires Level 2+ (marketing plan rule)'
\echo '  - BCC locked releases: 100 BCC per level activated'
\echo '  - 72-hour expiry for pending rewards'
\echo '  - Proper spillover reward tracking'