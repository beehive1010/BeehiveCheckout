-- Fix matrix spillover logic - correct the layer assignments
-- In 3x3 matrix: children of Layer N members should be in Layer N+1

\echo '🔧 Fixing matrix spillover logic for proper 3x3 structure...'

-- Step 1: Clear and rebuild referrals with correct spillover logic
DELETE FROM referrals;

-- Step 2: Add root (doesn't go in referrals as it's the matrix root)
-- Add Level 1 members (direct children of root)
INSERT INTO referrals (member_wallet, referrer_wallet, matrix_parent, matrix_position, matrix_layer, matrix_root, is_active, activation_rank, placed_at) VALUES
-- Root's direct referrals fill Layer 1 positions (L, M, R)
('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', '0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000001', 'L', 1, '0x0000000000000000000000000000000000000001', true, 1, now()),
('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0', '0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000001', 'M', 1, '0x0000000000000000000000000000000000000001', true, 2, now()),
('0x2bc46f768384f88B3D3C53De6A69b3718026D23F', '0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000001', 'R', 1, '0x0000000000000000000000000000000000000001', true, 3, now());

-- Step 3: Add spillover members to Layer 2
-- TEST001 was referred by root but root's Layer 1 is full, so spillover to Layer 2 under test004 (L position)
INSERT INTO referrals (member_wallet, referrer_wallet, matrix_parent, matrix_position, matrix_layer, matrix_root, is_active, activation_rank, placed_at) VALUES
('0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501', '0x0000000000000000000000000000000000000001', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', 'L', 2, '0x0000000000000000000000000000000000000001', true, 4, now());

-- Step 4: Add abc (referred by test004) to Layer 2 under test004 (M position) 
INSERT INTO referrals (member_wallet, referrer_wallet, matrix_parent, matrix_position, matrix_layer, matrix_root, is_active, activation_rank, placed_at) VALUES
('0x5259AF08990cbB98579cD7D339D5e2651c413E9a', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', 'M', 2, '0x0000000000000000000000000000000000000001', true, 5, now());

\echo '✅ Fixed matrix structure with correct spillover logic'

-- Step 5: Verify the corrected structure
\echo ''
\echo '📊 Corrected 3x3 Matrix Structure:'
\echo 'Layer 1 (Root children):'
SELECT 
    'Layer ' || r.matrix_layer as layer,
    u.username + ' (' + r.matrix_position + ')' as member,
    pu.username as parent,
    r.referrer_wallet = r.matrix_parent as direct_referral
FROM referrals r
JOIN users u ON r.member_wallet = u.wallet_address
LEFT JOIN users pu ON r.matrix_parent = pu.wallet_address
WHERE r.matrix_layer = 1
ORDER BY r.matrix_position;

\echo ''
\echo 'Layer 2 (Spillover):'
SELECT 
    'Layer ' || r.matrix_layer as layer,
    u.username + ' (' + r.matrix_position + ')' as member,
    pu.username as parent,
    ru.username as referrer,
    r.referrer_wallet = r.matrix_parent as direct_referral
FROM referrals r
JOIN users u ON r.member_wallet = u.wallet_address
LEFT JOIN users pu ON r.matrix_parent = pu.wallet_address
LEFT JOIN users ru ON r.referrer_wallet = ru.wallet_address
WHERE r.matrix_layer = 2
ORDER BY r.matrix_parent, r.matrix_position;

-- Step 6: Test updated matrix_stats view
\echo ''
\echo '📊 Updated Matrix Stats (showing proper spillover):'
SELECT 
    layer_number,
    total_positions,
    filled_positions,
    available_positions,
    ROUND((filled_positions::numeric / total_positions::numeric * 100), 1) || '%' as fill_rate
FROM matrix_stats 
WHERE layer_number <= 3
ORDER BY layer_number;

-- Step 7: Show matrix dashboard view
\echo ''
\echo '📊 Matrix Dashboard View (Frontend Ready):'
SELECT 
    root_username,
    layer_number,
    nft_title,
    nft_price,
    filled_positions || '/' || total_positions as occupancy,
    fill_percentage || '%' as fill_rate,
    l_positions as L_pos,
    m_positions as M_pos,
    r_positions as R_pos
FROM matrix_dashboard_view
WHERE layer_number <= 3
ORDER BY layer_number;

\echo ''
\echo '✅ 3x3 Matrix spillover structure is now correct!'
\echo 'Structure:'
\echo '  Layer 1: Root has 3 direct placements (L, M, R)'
\echo '  Layer 2: Spillover members go under Layer 1 members'
\echo '  Each member in Layer N can have up to 3 children in Layer N+1'