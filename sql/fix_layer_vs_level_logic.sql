-- Fix Layer vs Level logic - Layer is matrix position, Level is NFT owned
-- When member claims Level 1 NFT → Layer rewards go to their placement root (被安置root)

\echo '🔧 Fixing Layer vs Level logic - Layer rewards go to placement root...'

-- Step 1: Clear existing reward claims to rebuild correctly
DELETE FROM reward_claims;
DELETE FROM user_reward_balances;

\echo '✅ Cleared incorrect reward data'

-- Step 2: Understand the correct logic
\echo ''
\echo '📊 Current Matrix Structure Analysis:'
SELECT 
    u.username as member,
    r.matrix_layer as layer,
    r.matrix_position as position,
    m.current_level as owned_nft_level,
    pu.username as matrix_parent,
    ru.username as placement_root
FROM referrals r
JOIN users u ON r.member_wallet = u.wallet_address
JOIN members m ON r.member_wallet = m.wallet_address
LEFT JOIN users pu ON r.matrix_parent = pu.wallet_address
LEFT JOIN users ru ON r.matrix_root = ru.wallet_address
ORDER BY r.matrix_layer, r.matrix_position;

-- Step 3: Create Layer 1 rewards (when members claim Level 1 NFT)
\echo ''
\echo '📊 Creating Layer 1 rewards for Level 1 NFT claims...'

-- When a member claims Level 1 NFT, their placement root gets Layer 1 reward
-- All current members have claimed Level 1 NFT, so generate Layer 1 rewards

INSERT INTO reward_claims (
    root_wallet,
    triggering_member_wallet,
    layer, -- This is the MATRIX LAYER (position in tree)
    nft_level, -- This is the NFT LEVEL claimed by member
    reward_amount_usdc,
    status,
    expires_at,
    metadata
)
SELECT 
    r.matrix_root as root_wallet, -- Reward goes to PLACEMENT ROOT (被安置root)
    r.member_wallet as triggering_member_wallet,
    r.matrix_layer as layer, -- Matrix layer of the member who claimed NFT
    m.current_level as nft_level, -- NFT level claimed (Level 1)
    100.00 as reward_amount_usdc, -- Level 1 NFT price = 100 USDC
    -- Status based on placement root's level and special rules
    CASE 
        -- Special rule: Layer 1 R position requires placement root to be Level 2+
        WHEN r.matrix_layer = 1 AND r.matrix_position = 'R' 
             AND (SELECT current_level FROM members WHERE wallet_address = r.matrix_root) < 2 
        THEN 'pending'
        -- General rule: Placement root must own >= NFT level being claimed
        WHEN (SELECT current_level FROM members WHERE wallet_address = r.matrix_root) >= m.current_level 
        THEN 'claimable'
        ELSE 'pending'
    END as status,
    now() + INTERVAL '72 hours' as expires_at,
    jsonb_build_object(
        'reward_type', 'Layer Reward',
        'matrix_layer', r.matrix_layer,
        'matrix_position', r.matrix_position,
        'nft_level_claimed', m.current_level,
        'placement_root_level', (SELECT current_level FROM members WHERE wallet_address = r.matrix_root),
        'reward_rule', CASE 
            WHEN r.matrix_layer = 1 AND r.matrix_position = 'R' THEN 'Layer 1 R position requires Level 2+ placement root'
            ELSE 'Placement root must own >= NFT level being claimed'
        END
    ) as metadata
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
WHERE m.current_level >= 1 -- Members who have claimed Level 1 NFT
AND r.matrix_root IS NOT NULL;

\echo '✅ Created Layer 1 rewards for Level 1 NFT claims'

-- Step 4: Show the corrected understanding
\echo ''
\echo '📊 Corrected Layer Reward Distribution:'
SELECT 
    'Layer ' || rc.layer || ' Reward' as reward_type,
    ru.username as placement_root,
    tu.username as triggering_member,
    'Level ' || rc.nft_level || ' NFT' as nft_claimed,
    rc.reward_amount_usdc,
    rc.status,
    rc.metadata->>'matrix_position' as matrix_position,
    rc.metadata->>'reward_rule' as rule
FROM reward_claims rc
JOIN users ru ON rc.root_wallet = ru.wallet_address
JOIN users tu ON rc.triggering_member_wallet = tu.wallet_address
ORDER BY rc.layer, rc.metadata->>'matrix_position';

-- Step 5: Update user reward balances
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

-- Step 6: Summary by placement root
\echo ''
\echo '📊 Layer Reward Summary by Placement Root:'
SELECT 
    u.username as placement_root,
    urb.usdc_claimable,
    urb.usdc_pending,
    (urb.usdc_claimable + urb.usdc_pending) as total_layer_rewards,
    COUNT(rc.id) as layer_reward_count
FROM user_reward_balances urb
JOIN users u ON urb.wallet_address = u.wallet_address
LEFT JOIN reward_claims rc ON urb.wallet_address = rc.root_wallet
WHERE (urb.usdc_claimable > 0 OR urb.usdc_pending > 0)
GROUP BY u.username, urb.usdc_claimable, urb.usdc_pending, urb.wallet_address
ORDER BY total_layer_rewards DESC;

-- Step 7: Show the key insight
\echo ''
\echo '🔑 Key Understanding:'
\echo 'LAYER = Position in matrix tree (Layer 1, Layer 2...)'
\echo 'LEVEL = NFT owned by member (Level 1 NFT, Level 2 NFT...)'
\echo ''
\echo 'When member claims Level 1 NFT:'
\echo '  → Layer 1 members → Layer 1 reward (100 USDC) to placement root' 
\echo '  → Layer 2 members → Layer 2 reward (100 USDC) to placement root'
\echo '  → All rewards go to their 被安置root (placement root)'
\echo ''
\echo 'Special Rules:'
\echo '  → Layer 1 R position: Placement root needs Level 2+ to claim'
\echo '  → General: Placement root needs >= NFT level being claimed'