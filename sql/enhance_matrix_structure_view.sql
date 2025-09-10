-- Enhance matrix_structure view to show each member as their own matrix root
-- Every member has their own 19-layer matrix with spillover members

\echo '🔧 Enhancing matrix_structure view for individual member matrices...'

-- Step 1: Drop existing matrix_structure view
DROP VIEW IF EXISTS matrix_structure CASCADE;

-- Step 2: Create enhanced matrix_structure view
CREATE VIEW matrix_structure AS
WITH RECURSIVE member_matrices AS (
    -- Base case: Each member is the root of their own matrix
    SELECT 
        m.wallet_address as matrix_root,
        m.wallet_address as member_wallet,
        m.referrer_wallet,
        m.wallet_address as matrix_parent, -- Self as parent for root
        'ROOT' as matrix_position,
        0 as matrix_layer, -- Root is layer 0
        m.activation_rank,
        u.username as member_username,
        u.username as parent_username,
        u.username as root_username,
        m.current_level,
        m.created_at as placed_at
    FROM members m
    JOIN users u ON m.wallet_address = u.wallet_address
    
    UNION ALL
    
    -- Recursive case: Find all members placed under each matrix root
    SELECT 
        mm.matrix_root,
        r.member_wallet,
        r.referrer_wallet,
        r.matrix_parent,
        r.matrix_position,
        -- Calculate layer relative to matrix root
        CASE 
            WHEN r.matrix_parent = mm.matrix_root THEN 1 -- Direct children are layer 1
            ELSE mm.matrix_layer + 1 -- Increment layer for each level down
        END as matrix_layer,
        r.activation_rank,
        u.username as member_username,
        parent_u.username as parent_username,
        mm.root_username,
        m.current_level,
        r.placed_at
    FROM member_matrices mm
    JOIN referrals r ON r.matrix_parent = mm.member_wallet
    JOIN users u ON r.member_wallet = u.wallet_address
    LEFT JOIN users parent_u ON r.matrix_parent = parent_u.wallet_address
    LEFT JOIN members m ON r.member_wallet = m.wallet_address
    WHERE mm.matrix_layer < 19 -- Limit to 19 layers as per marketing plan
)
SELECT 
    matrix_root,
    member_wallet,
    referrer_wallet,
    matrix_parent,
    matrix_position,
    matrix_layer,
    activation_rank,
    member_username,
    parent_username,
    root_username,
    current_level,
    placed_at
FROM member_matrices
WHERE matrix_layer > 0 -- Exclude the root records (layer 0)
ORDER BY matrix_root, matrix_layer, activation_rank;

\echo '✅ Created enhanced matrix_structure view'

-- Step 3: Create individual matrix stats view
CREATE OR REPLACE VIEW individual_matrix_stats AS
SELECT 
    ms.matrix_root,
    ru.username as root_username,
    ms.matrix_layer,
    COUNT(*) as filled_positions,
    POWER(3, ms.matrix_layer)::integer as total_positions,
    (POWER(3, ms.matrix_layer)::integer - COUNT(*)) as available_positions,
    ROUND((COUNT(*)::numeric / POWER(3, ms.matrix_layer)::numeric * 100), 2) as fill_percentage,
    -- Position breakdown
    COUNT(*) FILTER (WHERE ms.matrix_position = 'L') as l_positions,
    COUNT(*) FILTER (WHERE ms.matrix_position = 'M') as m_positions,
    COUNT(*) FILTER (WHERE ms.matrix_position = 'R') as r_positions,
    MAX(ms.placed_at) as last_placement
FROM matrix_structure ms
JOIN users ru ON ms.matrix_root = ru.wallet_address
GROUP BY ms.matrix_root, ru.username, ms.matrix_layer
ORDER BY ms.matrix_root, ms.matrix_layer;

\echo '✅ Created individual_matrix_stats view'

-- Step 4: Test the enhanced views
\echo ''
\echo '📊 Testing enhanced matrix_structure view:'
\echo 'Root (Beehive Root) Matrix:'
SELECT 
    'Layer ' || matrix_layer as layer,
    member_username || ' (' || matrix_position || ')' as member,
    parent_username as parent
FROM matrix_structure 
WHERE matrix_root = '0x0000000000000000000000000000000000000001'
ORDER BY matrix_layer, matrix_position;

\echo ''
\echo 'test004 Matrix (as matrix root):'
SELECT 
    'Layer ' || matrix_layer as layer,
    member_username || ' (' || matrix_position || ')' as member,
    parent_username as parent
FROM matrix_structure 
WHERE matrix_root = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
ORDER BY matrix_layer, matrix_position;

-- Step 5: Show individual matrix statistics
\echo ''
\echo '📊 Individual Matrix Statistics:'
SELECT 
    root_username,
    matrix_layer,
    filled_positions || '/' || total_positions as occupancy,
    fill_percentage || '%' as fill_rate,
    l_positions as L_pos,
    m_positions as M_pos,
    r_positions as R_pos
FROM individual_matrix_stats
WHERE filled_positions > 0
ORDER BY matrix_root, matrix_layer;

-- Step 6: Create matrix member count summary
\echo ''
\echo '📊 Matrix Member Count by Root:'
SELECT 
    root_username,
    COUNT(*) as total_members,
    COUNT(DISTINCT matrix_layer) as active_layers,
    MAX(matrix_layer) as deepest_layer
FROM matrix_structure
GROUP BY matrix_root, root_username
ORDER BY total_members DESC;

-- Step 7: Show spillover patterns
\echo ''
\echo '📊 Spillover Analysis:'
WITH spillover_analysis AS (
    SELECT 
        matrix_root,
        root_username,
        member_wallet,
        member_username,
        referrer_wallet,
        matrix_parent,
        CASE 
            WHEN referrer_wallet = matrix_parent THEN 'Direct Placement'
            ELSE 'Spillover Placement'
        END as placement_type,
        matrix_layer,
        matrix_position
    FROM matrix_structure ms
    JOIN users ru ON ms.matrix_root = ru.wallet_address
)
SELECT 
    placement_type,
    COUNT(*) as count,
    ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM spillover_analysis) * 100, 1) as percentage
FROM spillover_analysis
GROUP BY placement_type;

\echo ''
\echo '✅ Enhanced matrix structure views created!'
\echo 'New capabilities:'
\echo '  - matrix_structure: Recursive view showing each member as matrix root'
\echo '  - individual_matrix_stats: Stats for each member matrix'  
\echo '  - Spillover analysis: Direct vs spillover placement tracking'
\echo '  - Multi-level matrix visualization for every member'