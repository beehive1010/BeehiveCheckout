-- Adjust reward system - Layer rewards only trigger when members activate corresponding NFT levels
-- Currently only Level 1 NFT claimed, so only Layer 1 rewards should exist
-- Layer 2 rewards only trigger when Layer 2 members activate Level 2 NFT

\echo '🔧 Adjusting reward system for correct layer-level activation logic...'

-- Step 1: Clear existing reward data
DELETE FROM reward_claims;
DELETE FROM user_reward_balances;

\echo '✅ Cleared existing reward data'

-- Step 2: Check current member levels
\echo ''
\echo '📊 Current member NFT levels:'
SELECT 
    u.username,
    m.current_level as nft_level_owned,
    r.matrix_layer as position_in_main_matrix,
    r.matrix_position,
    r.matrix_root,
    root_u.username as matrix_root_name
FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
LEFT JOIN users root_u ON r.matrix_root = root_u.wallet_address
WHERE m.wallet_address != '0x0000000000000000000000000000000000000001'
ORDER BY r.matrix_layer, r.matrix_position;

-- Step 3: Create Layer 1 rewards (only for Layer 1 members who have Level 1 NFT)
\echo ''
\echo '📊 Creating Layer 1 rewards for Level 1 NFT activations...'

INSERT INTO reward_claims (
    root_wallet,
    triggering_member_wallet,
    layer, -- Matrix layer of the member
    nft_level, -- NFT level activated by member
    reward_amount_usdc,
    status,
    expires_at,
    metadata
)
SELECT 
    r.matrix_root as root_wallet, -- Reward goes to matrix root
    r.member_wallet as triggering_member_wallet,
    r.matrix_layer as layer, -- Layer 1 members generate Layer 1 rewards
    m.current_level as nft_level, -- Level 1 NFT activated
    100.00 as reward_amount_usdc, -- Level 1 NFT price = 100 USDC
    -- Status based on matrix root's level and special rules
    CASE 
        -- Special rule: Layer 1 R position requires matrix root to be Level 2+
        WHEN r.matrix_layer = 1 AND r.matrix_position = 'R' 
             AND (SELECT current_level FROM members WHERE wallet_address = r.matrix_root) < 2 
        THEN 'pending'
        -- General rule: Matrix root must own >= NFT level being activated
        WHEN (SELECT current_level FROM members WHERE wallet_address = r.matrix_root) >= m.current_level 
        THEN 'claimable'
        ELSE 'pending'
    END as status,
    now() + INTERVAL '72 hours' as expires_at,
    jsonb_build_object(
        'reward_type', 'Layer Reward',
        'matrix_layer', r.matrix_layer,
        'matrix_position', r.matrix_position,
        'nft_level_activated', m.current_level,
        'matrix_root_level', (SELECT current_level FROM members WHERE wallet_address = r.matrix_root),
        'reward_rule', CASE 
            WHEN r.matrix_layer = 1 AND r.matrix_position = 'R' THEN 'Layer 1 R position requires Level 2+ matrix root'
            ELSE 'Matrix root must own >= NFT level being activated'
        END,
        'activation_scenario', 'Member activated Level ' || m.current_level || ' NFT in Layer ' || r.matrix_layer
    ) as metadata
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.is_active = true
-- Only create rewards for Layer 1 members (since only Level 1 NFT is claimed)
AND r.matrix_layer = 1
-- Only for members who have activated Level 1 NFT
AND m.current_level >= 1;

\echo '✅ Created Layer 1 rewards for Level 1 NFT activations'

-- Step 4: Show what Layer 2 rewards would look like (but not create them yet)
\echo ''
\echo '📊 Future Layer 2 Reward Scenarios (when Layer 2 members activate Level 2):'
SELECT 
    'Future: ' || u.username || ' activates Level 2 NFT' as scenario,
    '→ 150 USDC to ' || root_u.username as reward_outcome,
    'Layer ' || r.matrix_layer as member_layer,
    r.matrix_position as position
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address  
JOIN users u ON r.member_wallet = u.wallet_address
JOIN users root_u ON r.matrix_root = root_u.wallet_address
WHERE r.matrix_layer = 2 -- Layer 2 members
ORDER BY r.matrix_position;

-- Step 5: Update user_reward_balances
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
    0 as usdc_claimed
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
) pending ON m.wallet_address = pending.root_wallet;

\echo '✅ Updated user reward balances'

-- Step 6: Show current reward distribution
\echo ''
\echo '📊 Current Layer 1 Reward Distribution:'
SELECT 
    ru.username as matrix_root,
    tu.username as layer1_member,
    'Layer ' || rc.layer as reward_layer,
    'Level ' || rc.nft_level || ' NFT' as nft_activated,
    rc.reward_amount_usdc,
    rc.status,
    rc.metadata->>'reward_rule' as rule
FROM reward_claims rc
JOIN users ru ON rc.root_wallet = ru.wallet_address
JOIN users tu ON rc.triggering_member_wallet = tu.wallet_address
ORDER BY rc.layer, ru.username;

-- Step 7: Show reward balances by user
\echo ''
\echo '📊 User Reward Balances:'
SELECT 
    u.username,
    urb.usdc_claimable,
    urb.usdc_pending,
    (urb.usdc_claimable + urb.usdc_pending) as total_usdc_rewards
FROM user_reward_balances urb
JOIN users u ON urb.wallet_address = u.wallet_address
WHERE (urb.usdc_claimable > 0 OR urb.usdc_pending > 0)
ORDER BY total_usdc_rewards DESC;

-- Step 8: Create function to simulate Layer 2 reward activation
CREATE OR REPLACE FUNCTION simulate_layer2_activation(member_wallet TEXT)
RETURNS TABLE(
    reward_recipient TEXT,
    reward_amount_usdc NUMERIC,
    activation_scenario TEXT
) 
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        root_u.username::TEXT as reward_recipient,
        150.00::NUMERIC as reward_amount_usdc,
        ('When ' || u.username || ' activates Level 2 NFT in Layer ' || r.matrix_layer)::TEXT as activation_scenario
    FROM referrals r
    JOIN users u ON r.member_wallet = u.wallet_address
    JOIN users root_u ON r.matrix_root = root_u.wallet_address
    WHERE r.member_wallet = simulate_layer2_activation.member_wallet
    AND r.matrix_layer = 2; -- Only Layer 2 members can generate Layer 2 rewards
END;
$$;

\echo '✅ Created simulate_layer2_activation() function'

-- Step 9: Test Layer 2 simulation
\echo ''
\echo '📊 Layer 2 Activation Simulation:'
SELECT 
    'TEST001' as member,
    reward_recipient,
    reward_amount_usdc,
    activation_scenario
FROM simulate_layer2_activation((SELECT wallet_address FROM users WHERE username = 'TEST001'))
UNION ALL
SELECT 
    'abc' as member,
    reward_recipient,
    reward_amount_usdc,
    activation_scenario
FROM simulate_layer2_activation((SELECT wallet_address FROM users WHERE username = 'abc'))
UNION ALL
SELECT 
    'TestAA' as member,
    reward_recipient,
    reward_amount_usdc,
    activation_scenario
FROM simulate_layer2_activation((SELECT wallet_address FROM users WHERE username = 'TestAA'));

-- Step 10: Summary of reward logic
\echo ''
\echo '🎯 Reward Logic Summary:'
\echo 'Current State (Level 1 NFT activated):'
\echo '  ✅ Layer 1 members → Layer 1 rewards (100 USDC) → Matrix Root'
\echo '  ❌ Layer 2 members → No rewards yet (need Level 2 NFT)'
\echo ''
\echo 'Future State (when Level 2 NFT activated):'
\echo '  ✅ Layer 2 members → Layer 2 rewards (150 USDC) → Matrix Root'
\echo ''
\echo 'Rule: Layer X reward only triggers when member activates Level X NFT'

-- Step 11: Current reward summary
SELECT 
    'Current Active Rewards' as summary_type,
    COUNT(*) as total_rewards,
    SUM(reward_amount_usdc) as total_usdc,
    COUNT(*) FILTER (WHERE status = 'claimable') as claimable_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count
FROM reward_claims;

\echo ''
\echo '✅ Reward system adjusted for correct layer-level activation logic!'