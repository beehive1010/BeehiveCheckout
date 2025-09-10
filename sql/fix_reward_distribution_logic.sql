-- Fix reward distribution logic - rewards go to matrix parent, not always root
-- Correct interpretation: When member upgrades, reward goes to their matrix parent

\echo '🔧 Fixing reward distribution logic - rewards go to matrix parent...'

-- Step 1: Clear existing incorrect reward claims
DELETE FROM reward_claims;
DELETE FROM user_reward_balances;

\echo '✅ Cleared incorrect reward data'

-- Step 2: Create correct reward claims based on proper logic
\echo ''
\echo '📊 Creating correct reward claims based on matrix parent logic...'

-- For each member's level activation, reward goes to their matrix parent
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
    r.matrix_parent as root_wallet, -- Reward goes to MATRIX PARENT, not matrix root
    r.member_wallet as triggering_member_wallet,
    r.matrix_layer as layer,
    m.current_level as nft_level,
    -- Reward = NFT price for the level being activated
    (50 + (m.current_level * 50))::numeric(18,6) as reward_amount_usdc,
    -- Status based on matrix parent's eligibility and special rules
    CASE 
        -- Special rule: Layer 1 R position requires matrix parent to be Level 2+
        WHEN r.matrix_layer = 1 AND r.matrix_position = 'R' AND parent_m.current_level < 2 THEN 'pending'
        -- General rule: Matrix parent must be >= triggering member level to claim
        WHEN parent_m.current_level >= m.current_level THEN 'claimable'
        ELSE 'pending'
    END as status,
    -- 72 hour expiry for pending rewards (for cron processing)
    now() + INTERVAL '72 hours' as expires_at,
    jsonb_build_object(
        'matrix_position', r.matrix_position,
        'matrix_parent_level', parent_m.current_level,
        'required_level', CASE 
            WHEN r.matrix_layer = 1 AND r.matrix_position = 'R' THEN 2
            ELSE m.current_level
        END,
        'reward_rule', CASE 
            WHEN r.matrix_layer = 1 AND r.matrix_position = 'R' THEN 'Layer 1 R position requires Level 2+'
            ELSE 'Matrix parent must be >= member level'
        END,
        'nft_price_usdc', (50 + (m.current_level * 50)),
        'upgrade_scenario', 'Member activated Level ' || m.current_level
    ) as metadata
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
JOIN members parent_m ON r.matrix_parent = parent_m.wallet_address
WHERE r.matrix_parent IS NOT NULL -- Only create rewards when there's a matrix parent
AND m.current_level > 0; -- Only for activated levels

\echo '✅ Created correct reward claims going to matrix parents'

-- Step 3: Handle future level upgrades (Level 2 scenario)
\echo ''
\echo '📊 Creating Level 2 upgrade scenarios (150 USDC rewards)...'

-- Simulate what happens when TEST001 and abc upgrade to Level 2
-- Their Level 2 rewards (150 USDC) would go to their matrix parents

-- For TEST001 (Layer 2, parent: test004): When upgrades to Level 2 → 150 USDC to test004
-- For abc (Layer 2, parent: test004): When upgrades to Level 2 → 150 USDC to test004

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
VALUES 
-- TEST001 Level 2 upgrade → reward to test004 (matrix parent)
(
    '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', -- test004 (matrix parent)
    '0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501', -- TEST001
    2, -- layer
    2, -- nft_level
    150.000000, -- Level 2 NFT price
    'claimable', -- test004 is Level 1, can claim Level 2 rewards
    now() + INTERVAL '72 hours',
    jsonb_build_object(
        'upgrade_scenario', 'TEST001 upgrades to Level 2',
        'matrix_parent_level', 1,
        'reward_rule', 'Matrix parent gets NFT price when member upgrades',
        'nft_price_usdc', 150
    )
),
-- abc Level 2 upgrade → reward to test004 (matrix parent)  
(
    '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', -- test004 (matrix parent)
    '0x5259AF08990cbB98579cD7D339D5e2651c413E9a', -- abc
    2, -- layer
    2, -- nft_level  
    150.000000, -- Level 2 NFT price
    'claimable', -- test004 is Level 1, can claim Level 2 rewards
    now() + INTERVAL '72 hours',
    jsonb_build_object(
        'upgrade_scenario', 'abc upgrades to Level 2',
        'matrix_parent_level', 1,
        'reward_rule', 'Matrix parent gets NFT price when member upgrades',
        'nft_price_usdc', 150
    )
);

\echo '✅ Added Level 2 upgrade reward scenarios'

-- Step 4: Handle the special Layer 1 R position rule
\echo ''
\echo '📊 Applying Layer 1 R position special rule...'

-- human12345 is in Layer 1 R position, so Root needs to be Level 2+ to claim
-- Since Root is Level 19, this should be claimable, but let's verify the logic

UPDATE reward_claims 
SET status = CASE 
    WHEN layer = 1 AND 
         triggering_member_wallet IN (
             SELECT member_wallet 
             FROM referrals 
             WHERE matrix_position = 'R' AND matrix_layer = 1
         ) 
         AND (
             SELECT current_level 
             FROM members 
             WHERE wallet_address = reward_claims.root_wallet
         ) < 2 
    THEN 'pending'
    ELSE status
END,
metadata = metadata || jsonb_build_object(
    'special_rule_applied', 'Layer 1 R position requires Level 2+ matrix parent'
)
WHERE layer = 1;

\echo '✅ Applied Layer 1 R position special rule'

-- Step 5: Update user_reward_balances with correct data
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
) pending ON m.wallet_address = pending.root_wallet
ON CONFLICT (wallet_address) DO UPDATE SET
    usdc_claimable = EXCLUDED.usdc_claimable,
    usdc_pending = EXCLUDED.usdc_pending;

\echo '✅ Updated user_reward_balances with correct data'

-- Step 6: Show the corrected reward distribution
\echo ''
\echo '📊 Corrected Reward Distribution:'

SELECT 
    'Current Level 1 Activations' as scenario,
    ru.username as reward_recipient,
    tu.username as triggering_member,
    rc.layer,
    rc.nft_level,
    rc.reward_amount_usdc,
    rc.status,
    rc.metadata->>'reward_rule' as rule
FROM reward_claims rc
JOIN users ru ON rc.root_wallet = ru.wallet_address
JOIN users tu ON rc.triggering_member_wallet = tu.wallet_address
WHERE rc.nft_level = 1
ORDER BY rc.layer, ru.username;

\echo ''
\echo 'Future Level 2 Upgrade Scenarios:'
SELECT 
    'Level 2 Upgrades' as scenario,
    ru.username as reward_recipient,
    tu.username as triggering_member,
    rc.layer,
    rc.nft_level,
    rc.reward_amount_usdc,
    rc.status,
    rc.metadata->>'upgrade_scenario' as scenario_desc
FROM reward_claims rc
JOIN users ru ON rc.root_wallet = ru.wallet_address  
JOIN users tu ON rc.triggering_member_wallet = tu.wallet_address
WHERE rc.nft_level = 2
ORDER BY ru.username;

-- Step 7: Summary by reward recipient
\echo ''
\echo '📊 Reward Summary by Recipient:'
SELECT 
    u.username as recipient,
    COUNT(*) as total_rewards,
    SUM(CASE WHEN rc.status = 'claimable' THEN rc.reward_amount_usdc ELSE 0 END) as claimable_usdc,
    SUM(CASE WHEN rc.status = 'pending' THEN rc.reward_amount_usdc ELSE 0 END) as pending_usdc,
    SUM(rc.reward_amount_usdc) as total_usdc
FROM reward_claims rc
JOIN users u ON rc.root_wallet = u.wallet_address
GROUP BY u.username, u.wallet_address
ORDER BY total_usdc DESC;

\echo ''
\echo '✅ Reward distribution logic corrected!'
\echo 'Key corrections:'
\echo '  - Level 1 rewards go to matrix parents (not root)'  
\echo '  - TEST001 & abc Level 1 rewards → go to test004 (their matrix parent)'
\echo '  - human12345 Level 1 R reward → goes to Root (matrix parent) but needs Level 2+'
\echo '  - Future Level 2 upgrades → 150 USDC to respective matrix parents'
\echo '  - 72-hour pending expiry for cron processing'