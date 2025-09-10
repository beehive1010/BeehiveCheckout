-- Fix matrix_structure view with proper type casting
-- Create individual matrix views for each member as matrix root

\echo '🔧 Creating fixed matrix_structure view...'

-- Step 1: Create enhanced matrix_structure view with proper types
CREATE OR REPLACE VIEW matrix_structure AS
WITH RECURSIVE member_matrices AS (
    -- Base case: Each member is the root of their own matrix
    SELECT 
        m.wallet_address as matrix_root,
        m.wallet_address as member_wallet,
        m.referrer_wallet,
        m.wallet_address as matrix_parent,
        'ROOT'::character varying(1) as matrix_position, -- Proper type cast
        0 as matrix_layer,
        m.activation_rank,
        u.username as member_username,
        u.username as parent_username,
        u.username as root_username,
        m.current_level,
        m.created_at as placed_at
    FROM members m
    JOIN users u ON m.wallet_address = u.wallet_address
    WHERE m.wallet_address != '0x0000000000000000000000000000000000000001' -- Skip root for now
    
    UNION ALL
    
    -- Recursive case: Find all members placed under each matrix root
    SELECT 
        mm.matrix_root,
        r.member_wallet,
        r.referrer_wallet,
        r.matrix_parent,
        r.matrix_position,
        mm.matrix_layer + 1 as matrix_layer,
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
    WHERE mm.matrix_layer < 19
)
-- Add main root matrix records manually
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
WHERE matrix_layer > 0 -- Exclude root self-records

UNION ALL

-- Add the main root (Beehive Root) matrix structure
SELECT 
    r.matrix_root,
    r.member_wallet,
    r.referrer_wallet,
    r.matrix_parent,
    r.matrix_position,
    r.matrix_layer,
    r.activation_rank,
    u.username as member_username,
    parent_u.username as parent_username,
    root_u.username as root_username,
    m.current_level,
    r.placed_at
FROM referrals r
JOIN users u ON r.member_wallet = u.wallet_address
LEFT JOIN users parent_u ON r.matrix_parent = parent_u.wallet_address
LEFT JOIN users root_u ON r.matrix_root = root_u.wallet_address
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.is_active = true
ORDER BY matrix_root, matrix_layer, activation_rank;

\echo '✅ Created fixed matrix_structure view'

-- Step 2: Test the view
\echo ''
\echo '📊 Matrix Structure - Main Root (Beehive Root):'
SELECT 
    matrix_layer,
    member_username || ' (' || matrix_position || ')' as member_info,
    parent_username
FROM matrix_structure 
WHERE matrix_root = '0x0000000000000000000000000000000000000001'
ORDER BY matrix_layer, matrix_position;

-- Step 3: Show individual member matrices
\echo ''
\echo '📊 Individual Member Matrices:'
SELECT DISTINCT 
    root_username,
    matrix_root,
    COUNT(*) as members_in_matrix
FROM matrix_structure
GROUP BY root_username, matrix_root
ORDER BY members_in_matrix DESC;

-- Step 4: Create simplified individual matrix stats
CREATE OR REPLACE VIEW member_matrix_overview AS
SELECT 
    ms.matrix_root,
    ru.username as root_username,
    COUNT(*) as total_downline_members,
    COUNT(DISTINCT ms.matrix_layer) as active_layers,
    MAX(ms.matrix_layer) as deepest_layer,
    -- Layer breakdown
    COUNT(*) FILTER (WHERE ms.matrix_layer = 1) as layer_1_count,
    COUNT(*) FILTER (WHERE ms.matrix_layer = 2) as layer_2_count,
    COUNT(*) FILTER (WHERE ms.matrix_layer = 3) as layer_3_count,
    -- Position breakdown
    COUNT(*) FILTER (WHERE ms.matrix_position = 'L') as l_positions,
    COUNT(*) FILTER (WHERE ms.matrix_position = 'M') as m_positions,
    COUNT(*) FILTER (WHERE ms.matrix_position = 'R') as r_positions
FROM matrix_structure ms
JOIN users ru ON ms.matrix_root = ru.wallet_address
GROUP BY ms.matrix_root, ru.username
ORDER BY total_downline_members DESC;

\echo '✅ Created member_matrix_overview'

-- Step 5: Test member matrix overview
\echo ''
\echo '📊 Member Matrix Overview:'
SELECT 
    root_username,
    total_downline_members,
    active_layers,
    deepest_layer,
    layer_1_count,
    layer_2_count,
    l_positions as L_pos,
    m_positions as M_pos,
    r_positions as R_pos
FROM member_matrix_overview;

-- Step 6: Show specific member matrix examples
\echo ''
\echo '📊 Specific Matrix Examples:'

-- Show test004 as matrix root (if has downline)
SELECT 
    'test004 Matrix' as matrix_type,
    matrix_layer,
    member_username || ' (' || matrix_position || ')' as member_info
FROM matrix_structure 
WHERE matrix_root = (SELECT wallet_address FROM users WHERE username = 'test004')
ORDER BY matrix_layer, matrix_position;

\echo ''
\echo '✅ Enhanced matrix structure views completed!'
\echo ''
\echo '🔑 Key Features:'
\echo '  - Every member can be viewed as their own matrix root'
\echo '  - Spillover members appear in their referrer matrix'
\echo '  - Layer structure: Layer 1 = direct, Layer 2+ = spillover'
\echo '  - Full 3x3 matrix visualization capability'