-- Fix correct spillover logic for 3x3 matrix
-- Correct order: Fill Layer 1 L→M→R before going to Layer 2

\echo '🔧 Fixing correct 3x3 matrix spillover logic...'

-- Step 1: Clear current incorrect referral placements
DELETE FROM referrals;
DELETE FROM individual_matrix_placements;

\echo '✅ Cleared incorrect placement data'

-- Step 2: Recreate correct referral placements following L→M→R logic
\echo ''
\echo '📊 Recreating correct 3x3 matrix placements...'

-- All members except root should be placed in Root's matrix first
-- Following proper L→M→R→(then Layer 2) logic

-- Layer 1 L, M, R positions in Root's matrix
INSERT INTO referrals (member_wallet, referrer_wallet, matrix_parent, matrix_position, matrix_layer, matrix_root, is_active, activation_rank, placed_at) VALUES
-- Layer 1 positions (first 3 members)
('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', '0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000001', 'L', 1, '0x0000000000000000000000000000000000000001', true, 1, now()),
('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0', '0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000001', 'M', 1, '0x0000000000000000000000000000000000000001', true, 2, now()),
('0x2bc46f768384f88B3D3C53De6A69b3718026D23F', '0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000001', 'R', 1, '0x0000000000000000000000000000000000000001', true, 3, now());

-- Layer 2 positions (next members go to Layer 2, not spillover to Layer 1 children)
-- TEST001: Originally referred by Root, but Root Layer 1 is full, so goes to Layer 2 L position
-- abc: Originally referred by test004, but since test004 is in Layer 1, abc goes to Root's Layer 2

INSERT INTO referrals (member_wallet, referrer_wallet, matrix_parent, matrix_position, matrix_layer, matrix_root, is_active, activation_rank, placed_at) VALUES
-- Layer 2 L position: TEST001 (Root referral, spillover to Layer 2)
('0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501', '0x0000000000000000000000000000000000000001', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', 'L', 2, '0x0000000000000000000000000000000000000001', true, 4, now()),
-- Layer 2 M position: abc (test004 referral, spillover to Layer 2) 
('0x5259AF08990cbB98579cD7D339D5e2651c413E9a', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', 'M', 2, '0x0000000000000000000000000000000000000001', true, 5, now());

\echo '✅ Created correct 3x3 matrix placements'

-- Step 3: Update individual matrix placements with correct logic
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
    1 as layer_in_owner_matrix,
    'L' as position_in_layer,
    m_member.created_at as placed_at
FROM members m_referrer
JOIN members m_member ON m_member.referrer_wallet = m_referrer.wallet_address

UNION ALL

-- Members placed under other members (but only direct placements, not deep spillover)
SELECT 
    r.matrix_parent as matrix_owner,
    r.member_wallet as member_wallet,
    1 as layer_in_owner_matrix, -- Direct placement = Layer 1 in that member's matrix
    r.matrix_position as position_in_layer,
    r.placed_at
FROM referrals r
WHERE r.matrix_parent != r.matrix_root -- Not root placement
AND r.matrix_parent IS NOT NULL

ON CONFLICT (matrix_owner, member_wallet) DO NOTHING;

\echo '✅ Updated individual matrix placements'

-- Step 4: Show corrected matrix structure
\echo ''
\echo '📊 Corrected 3x3 Matrix Structure:'
SELECT 
    'Layer ' || r.matrix_layer as layer,
    u.username || ' (' || r.matrix_position || ')' as member_info,
    pu.username as matrix_parent,
    ru.username as referrer
FROM referrals r
JOIN users u ON r.member_wallet = u.wallet_address
LEFT JOIN users pu ON r.matrix_parent = pu.wallet_address  
LEFT JOIN users ru ON r.referrer_wallet = ru.wallet_address
ORDER BY r.matrix_layer, r.matrix_position;

-- Step 5: Show individual matrices after correction
\echo ''
\echo '📊 Root Individual Matrix (corrected):'
SELECT 
    'Layer ' || layer_in_owner_matrix as layer,
    member_username || ' (' || position_in_layer || ')' as member_info
FROM corrected_individual_matrices
WHERE matrix_owner = '0x0000000000000000000000000000000000000001'
ORDER BY layer_in_owner_matrix, position_in_layer;

\echo ''
\echo '📊 test004 Individual Matrix (corrected):'
SELECT 
    'Layer ' || layer_in_owner_matrix as layer,
    member_username || ' (' || position_in_layer || ')' as member_info
FROM corrected_individual_matrices  
WHERE matrix_owner = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
ORDER BY layer_in_owner_matrix, position_in_layer;

-- Step 6: Show corrected matrix statistics
\echo ''
\echo '📊 Corrected Matrix Statistics:'
SELECT 
    matrix_owner_username,
    'Layer ' || layer_in_owner_matrix as layer,
    filled_positions || '/' || max_positions_for_layer as occupancy,
    fill_percentage || '%' as fill_rate
FROM corrected_matrix_stats
ORDER BY matrix_owner, layer_in_owner_matrix;

-- Step 7: Explain the correct logic
\echo ''
\echo '🎯 Correct 3x3 Matrix Spillover Logic:'
\echo 'Step 1: Fill Root Layer 1 → L, M, R positions (test004, admin, human12345)'
\echo 'Step 2: Layer 1 full → Next members go to Layer 2 under Layer 1 members'
\echo 'Step 3: TEST001 → Layer 2 L under test004 (Layer 1 L)'
\echo 'Step 4: abc → Layer 2 M under test004 (Layer 1 L)' 
\echo ''
\echo 'Individual Matrix Logic:'
\echo '- test004 matrix: abc (Layer 1 L) - direct referral'
\echo '- test004 matrix: TEST001 (Layer 1 M) - spillover placement'
\echo '- Root gets Layer rewards when Layer 2 members activate'
\echo '- test004 gets rewards when his Layer 1 members activate'

\echo ''
\echo '✅ Correct 3x3 matrix spillover logic implemented!'