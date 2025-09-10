-- Create individual member matrix views
-- Each member becomes their own matrix root with spillover members as their downlines

\echo '🔧 Creating individual member matrix system...'

-- Step 1: Create function to build individual matrix for any member
CREATE OR REPLACE FUNCTION get_member_matrix(target_member_wallet TEXT)
RETURNS TABLE(
    matrix_root TEXT,
    member_wallet TEXT,
    matrix_layer INTEGER,
    matrix_position TEXT,
    member_username TEXT,
    referrer_wallet TEXT
) 
LANGUAGE plpgsql AS $$
BEGIN
    -- Return members who have this target_member as their referrer (direct referrals = Layer 1)
    -- and members who spillover under those referrals (Layer 2+)
    RETURN QUERY
    WITH RECURSIVE member_tree AS (
        -- Layer 1: Direct referrals of target member
        SELECT 
            target_member_wallet as matrix_root,
            m.wallet_address as member_wallet,
            1 as matrix_layer,
            'L'::text as matrix_position, -- Simplified for now
            u.username as member_username,
            m.referrer_wallet
        FROM members m
        JOIN users u ON m.wallet_address = u.wallet_address
        WHERE m.referrer_wallet = target_member_wallet
        
        UNION ALL
        
        -- Layer 2+: Members who spillover under direct referrals
        SELECT 
            mt.matrix_root,
            r.member_wallet,
            mt.matrix_layer + 1 as matrix_layer,
            r.matrix_position,
            u.username as member_username,
            r.referrer_wallet
        FROM member_tree mt
        JOIN referrals r ON r.matrix_parent = mt.member_wallet
        JOIN users u ON r.member_wallet = u.wallet_address
        WHERE mt.matrix_layer < 19 -- Limit depth
    )
    SELECT * FROM member_tree ORDER BY matrix_layer, member_wallet;
END;
$$;

\echo '✅ Created get_member_matrix() function'

-- Step 2: Create view that shows all individual matrices
CREATE OR REPLACE VIEW all_member_matrices AS
SELECT 
    m.wallet_address as matrix_root,
    u.username as root_username,
    -- Direct referrals (Layer 1 in their matrix)
    COUNT(direct.wallet_address) as direct_referrals,
    -- Spillover members (found via referrals table where this member is in the matrix tree)
    COUNT(spillover.member_wallet) as spillover_members,
    -- Total members in their matrix
    (COUNT(direct.wallet_address) + COUNT(spillover.member_wallet)) as total_matrix_members,
    -- Matrix depth
    COALESCE(MAX(spillover.matrix_layer), 1) as matrix_depth
FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
-- Direct referrals
LEFT JOIN members direct ON direct.referrer_wallet = m.wallet_address
-- Spillover members (members placed under this member's referrals)
LEFT JOIN referrals spillover ON EXISTS (
    SELECT 1 FROM referrals r2 
    WHERE r2.matrix_root = m.wallet_address 
    AND r2.member_wallet = spillover.member_wallet
)
GROUP BY m.wallet_address, u.username
ORDER BY total_matrix_members DESC;

\echo '✅ Created all_member_matrices view'

-- Step 3: Create specific examples for current members
\echo ''
\echo '📊 Current Member Matrix Overview:'
SELECT 
    root_username,
    direct_referrals,
    spillover_members,
    total_matrix_members,
    matrix_depth
FROM all_member_matrices
WHERE total_matrix_members > 0;

-- Step 4: Test individual member matrices
\echo ''
\echo '📊 test004 Individual Matrix (as matrix root):'
SELECT * FROM get_member_matrix('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab');

\echo ''
\echo '📊 Root Individual Matrix:'
SELECT * FROM get_member_matrix('0x0000000000000000000000000000000000000001');

-- Step 5: Create matrix layer rewards view based on individual matrices
CREATE OR REPLACE VIEW individual_matrix_rewards AS
SELECT 
    amm.matrix_root,
    amm.root_username,
    -- Potential Layer 1 rewards (when direct referrals upgrade)
    (amm.direct_referrals * 100) as potential_layer1_rewards_usdc,
    -- Potential Layer 2 rewards (when spillover members upgrade)  
    (amm.spillover_members * 100) as potential_layer2_rewards_usdc,
    -- Total potential rewards from their matrix
    ((amm.direct_referrals + amm.spillover_members) * 100) as total_potential_rewards_usdc,
    -- Current level requirement to claim all rewards
    CASE 
        WHEN amm.matrix_depth >= 2 THEN 2 -- Need Level 2+ to claim Layer 2 rewards
        ELSE 1 -- Only need Level 1 for Layer 1 rewards
    END as min_level_required_to_claim_all,
    amm.matrix_depth,
    amm.total_matrix_members
FROM all_member_matrices amm
WHERE amm.total_matrix_members > 0
ORDER BY total_potential_rewards_usdc DESC;

\echo '✅ Created individual_matrix_rewards view'

-- Step 6: Show individual matrix rewards potential
\echo ''
\echo '📊 Individual Matrix Reward Potential:'
SELECT 
    root_username,
    total_matrix_members,
    potential_layer1_rewards_usdc,
    potential_layer2_rewards_usdc,
    total_potential_rewards_usdc,
    min_level_required_to_claim_all
FROM individual_matrix_rewards
ORDER BY total_potential_rewards_usdc DESC;

-- Step 7: Create enhanced matrix stats per member
CREATE OR REPLACE VIEW member_matrix_stats AS
SELECT 
    ms.matrix_root,
    root_u.username as root_username,
    ms.matrix_layer,
    COUNT(*) as filled_positions,
    POWER(3, ms.matrix_layer)::integer as max_positions,
    (POWER(3, ms.matrix_layer)::integer - COUNT(*)) as available_positions,
    ROUND((COUNT(*)::numeric / POWER(3, ms.matrix_layer)::numeric * 100), 1) as fill_percentage
FROM matrix_structure ms
JOIN users root_u ON ms.matrix_root = root_u.wallet_address  
GROUP BY ms.matrix_root, root_u.username, ms.matrix_layer
ORDER BY ms.matrix_root, ms.matrix_layer;

\echo '✅ Created member_matrix_stats view'

-- Step 8: Show matrix stats
\echo ''
\echo '📊 Matrix Statistics by Layer:'
SELECT 
    root_username,
    matrix_layer,
    filled_positions || '/' || max_positions as occupancy,
    fill_percentage || '%' as fill_rate
FROM member_matrix_stats
ORDER BY matrix_root, matrix_layer;

\echo ''
\echo '✅ Individual member matrix system created!'
\echo ''
\echo '🔑 New Capabilities:'
\echo '  - get_member_matrix(wallet): Get any member matrix'
\echo '  - all_member_matrices: Overview of all member matrices'  
\echo '  - individual_matrix_rewards: Reward potential per matrix'
\echo '  - member_matrix_stats: Layer-by-layer matrix statistics'
\echo ''
\echo '💡 Usage Example:'
\echo '  SELECT * FROM get_member_matrix(''0x479...E616Ab''); -- test004 matrix'