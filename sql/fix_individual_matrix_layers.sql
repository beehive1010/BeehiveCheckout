-- Fix individual matrix layers - spillover members should be Layer 1 in their placement parent's matrix
-- Create proper matrix layer tracking for each individual member matrix

\echo '🔧 Fixing individual matrix layer tracking...'

-- Step 1: Create table to track individual matrix placements
CREATE TABLE IF NOT EXISTS individual_matrix_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matrix_owner TEXT NOT NULL REFERENCES users(wallet_address),
    member_wallet TEXT NOT NULL REFERENCES users(wallet_address), 
    layer_in_owner_matrix INTEGER NOT NULL,
    position_in_layer TEXT,
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT unique_member_per_owner_matrix UNIQUE (matrix_owner, member_wallet),
    CONSTRAINT valid_layer CHECK (layer_in_owner_matrix >= 1 AND layer_in_owner_matrix <= 19),
    CONSTRAINT valid_position CHECK (position_in_layer IN ('L', 'M', 'R'))
);

\echo '✅ Created individual_matrix_placements table'

-- Step 2: Populate individual matrix placements based on current structure
\echo ''
\echo '📊 Populating individual matrix placements...'

-- For each member, record who is in their individual matrix
INSERT INTO individual_matrix_placements (
    matrix_owner,
    member_wallet,
    layer_in_owner_matrix,
    position_in_layer,
    placed_at
)
-- Direct referrals are Layer 1 in referrer's matrix
SELECT 
    m_referrer.wallet_address as matrix_owner,
    m_member.wallet_address as member_wallet,
    1 as layer_in_owner_matrix, -- Direct referrals = Layer 1
    'L' as position_in_layer, -- Simplified for now
    m_member.created_at as placed_at
FROM members m_referrer
JOIN members m_member ON m_member.referrer_wallet = m_referrer.wallet_address

UNION ALL

-- Spillover members are Layer 1 in their matrix_parent's matrix
SELECT 
    r.matrix_parent as matrix_owner,
    r.member_wallet as member_wallet,
    1 as layer_in_owner_matrix, -- Spillover members = Layer 1 in placement parent's matrix
    r.matrix_position as position_in_layer,
    r.placed_at
FROM referrals r
WHERE r.matrix_parent != r.matrix_root -- Not the main root placement
AND r.matrix_parent IS NOT NULL

ON CONFLICT (matrix_owner, member_wallet) DO NOTHING;

\echo '✅ Populated individual matrix placements'

-- Step 3: Create view to show corrected individual matrices
CREATE OR REPLACE VIEW corrected_individual_matrices AS
SELECT 
    imp.matrix_owner,
    owner_u.username as matrix_owner_username,
    imp.member_wallet,
    member_u.username as member_username,
    imp.layer_in_owner_matrix,
    imp.position_in_layer,
    imp.placed_at,
    -- Member info
    m.current_level as member_level,
    m.referrer_wallet as member_original_referrer,
    ref_u.username as member_original_referrer_username
FROM individual_matrix_placements imp
JOIN users owner_u ON imp.matrix_owner = owner_u.wallet_address
JOIN users member_u ON imp.member_wallet = member_u.wallet_address
JOIN members m ON imp.member_wallet = m.wallet_address
LEFT JOIN users ref_u ON m.referrer_wallet = ref_u.wallet_address
WHERE imp.is_active = true
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix, imp.position_in_layer;

\echo '✅ Created corrected_individual_matrices view'

-- Step 4: Show corrected individual matrices
\echo ''
\echo '📊 Corrected Individual Matrices:'

\echo 'Root Individual Matrix:'
SELECT 
    'Layer ' || layer_in_owner_matrix as layer,
    member_username || ' (' || position_in_layer || ')' as member_info,
    'Originally referred by: ' || COALESCE(member_original_referrer_username, 'None') as referrer_info
FROM corrected_individual_matrices
WHERE matrix_owner = '0x0000000000000000000000000000000000000001'
ORDER BY layer_in_owner_matrix, position_in_layer;

\echo ''
\echo 'test004 Individual Matrix:'
SELECT 
    'Layer ' || layer_in_owner_matrix as layer,
    member_username || ' (' || position_in_layer || ')' as member_info,
    'Originally referred by: ' || COALESCE(member_original_referrer_username, 'None') as referrer_info
FROM corrected_individual_matrices
WHERE matrix_owner = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
ORDER BY layer_in_owner_matrix, position_in_layer;

-- Step 5: Create corrected matrix statistics
CREATE OR REPLACE VIEW corrected_matrix_stats AS
SELECT 
    imp.matrix_owner,
    owner_u.username as matrix_owner_username,
    imp.layer_in_owner_matrix,
    COUNT(*) as filled_positions,
    POWER(3, imp.layer_in_owner_matrix)::integer as max_positions_for_layer,
    (POWER(3, imp.layer_in_owner_matrix)::integer - COUNT(*)) as available_positions,
    ROUND((COUNT(*)::numeric / POWER(3, imp.layer_in_owner_matrix)::numeric * 100), 1) as fill_percentage,
    -- Position breakdown
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'L') as l_positions,
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'M') as m_positions,  
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'R') as r_positions
FROM individual_matrix_placements imp
JOIN users owner_u ON imp.matrix_owner = owner_u.wallet_address
WHERE imp.is_active = true
GROUP BY imp.matrix_owner, owner_u.username, imp.layer_in_owner_matrix
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix;

\echo '✅ Created corrected_matrix_stats view'

-- Step 6: Show corrected matrix statistics
\echo ''
\echo '📊 Corrected Matrix Statistics:'
SELECT 
    matrix_owner_username,
    'Layer ' || layer_in_owner_matrix as layer,
    filled_positions || '/' || max_positions_for_layer as occupancy,
    fill_percentage || '%' as fill_rate,
    l_positions as L_pos,
    m_positions as M_pos,
    r_positions as R_pos
FROM corrected_matrix_stats
ORDER BY matrix_owner, layer_in_owner_matrix;

-- Step 7: Create corrected reward analysis
CREATE OR REPLACE VIEW corrected_individual_rewards AS
SELECT 
    cms.matrix_owner,
    cms.matrix_owner_username,
    -- Total members in their matrix
    SUM(cms.filled_positions) as total_matrix_members,
    -- Layer 1 rewards (each Layer 1 member Level 1 activation = 100 USDC)
    (cms.filled_positions * 100) as layer1_reward_potential_usdc,
    -- Current member level (to determine if they can claim rewards)
    owner_m.current_level as matrix_owner_level,
    -- Can claim status
    CASE 
        WHEN owner_m.current_level >= 1 THEN 'Can claim Layer 1 rewards'
        ELSE 'Need Level 1+ to claim'
    END as claim_status
FROM corrected_matrix_stats cms
JOIN members owner_m ON cms.matrix_owner = owner_m.wallet_address
WHERE cms.layer_in_owner_matrix = 1 -- Focus on Layer 1 for rewards
GROUP BY cms.matrix_owner, cms.matrix_owner_username, cms.filled_positions, owner_m.current_level
ORDER BY total_matrix_members DESC;

\echo '✅ Created corrected_individual_rewards view'

-- Step 8: Show corrected reward analysis
\echo ''
\echo '📊 Corrected Individual Matrix Rewards:'
SELECT 
    matrix_owner_username,
    total_matrix_members,
    layer1_reward_potential_usdc,
    matrix_owner_level,
    claim_status
FROM corrected_individual_rewards;

-- Step 9: Summary of key corrections
\echo ''
\echo '🎯 Key Corrections Made:'
\echo '✅ TEST001 & abc are now Layer 1 in test004 matrix (not Layer 2)'
\echo '✅ Each spillover member becomes Layer 1 in their placement parent matrix'  
\echo '✅ Individual matrix layer tracking separated from main matrix tree'
\echo '✅ Reward calculations based on individual matrix Layer 1 members'

-- Show the correction example
\echo ''
\echo '📋 Example Correction:'
SELECT 
    'Before: TEST001 was Layer 2 in Root matrix' as correction_example
UNION ALL
SELECT 'After: TEST001 is Layer 1 in test004 matrix' 
UNION ALL  
SELECT 'Result: test004 gets 100 USDC when TEST001 activates Level 1';

\echo ''
\echo '✅ Individual matrix layer tracking corrected!'