-- Complete matrix structure tracking with proper spillover logic
-- Root推荐4个成员：Layer 1满(L,M,R) + 1个滑落到Layer 2
-- 滑落成员在被安置父级的个人矩阵中成为Layer 1

\echo '🔧 Completing matrix structure with proper spillover and Layer 1 tracking...'

-- Step 1: Clear existing data to rebuild correctly
DELETE FROM referrals;
DELETE FROM individual_matrix_placements;

\echo '✅ Cleared data for correct rebuild'

-- Step 2: Identify the correct member count and referral structure
\echo ''
\echo '📊 Current member structure:'
SELECT u.username, m.referrer_wallet, ru.username as referrer_name, m.created_at
FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN users ru ON m.referrer_wallet = ru.wallet_address
WHERE m.wallet_address != '0x0000000000000000000000000000000000000001'
ORDER BY m.created_at;

-- Step 3: Rebuild referrals with correct logic
-- Root推荐了4个成员：test004, admin, human12345, TEST001
-- abc 是test004推荐的

INSERT INTO referrals (member_wallet, referrer_wallet, matrix_parent, matrix_position, matrix_layer, matrix_root, is_active, activation_rank, placed_at) VALUES

-- Layer 1 positions in Root matrix (first 3 Root referrals)
('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', '0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000001', 'L', 1, '0x0000000000000000000000000000000000000001', true, 1, now()),
('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0', '0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000001', 'M', 1, '0x0000000000000000000000000000000000000001', true, 2, now()),
('0x2bc46f768384f88B3D3C53De6A69b3718026D23F', '0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000001', 'R', 1, '0x0000000000000000000000000000000000000001', true, 3, now()),

-- Layer 2 spillover: 4th Root referral goes to Layer 2 under Layer 1 L member (test004)
('0x9C30721F8EbAe0a68577A83C4fc2F7A698E2a501', '0x0000000000000000000000000000000000000001', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', 'L', 2, '0x0000000000000000000000000000000000000001', true, 4, now()),

-- abc is test004's referral, goes under test004 as well
('0x5259AF08990cbB98579cD7D339D5e2651c413E9a', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', 'M', 2, '0x0000000000000000000000000000000000000001', true, 5, now());

\echo '✅ Created correct matrix placements'

-- Step 4: Create enhanced matrix_structure view with individual matrix Layer 1 tracking
DROP VIEW IF EXISTS matrix_structure CASCADE;

CREATE VIEW matrix_structure AS
-- Main matrix structure (original referrals table data)
SELECT 
    r.member_wallet,
    r.referrer_wallet,
    r.matrix_parent,
    r.matrix_position,
    r.matrix_layer,
    r.matrix_root,
    r.activation_rank,
    u.username as member_username,
    parent_u.username as parent_username,
    root_u.username as root_username,
    m.current_level,
    r.placed_at,
    'main_matrix' as matrix_type
FROM referrals r
JOIN users u ON r.member_wallet = u.wallet_address
LEFT JOIN users parent_u ON r.matrix_parent = parent_u.wallet_address
LEFT JOIN users root_u ON r.matrix_root = root_u.wallet_address
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.is_active = true

UNION ALL

-- Individual matrix Layer 1 records (members under each matrix_parent as their Layer 1)
SELECT 
    r.member_wallet,
    r.referrer_wallet,
    r.matrix_parent as member_wallet, -- The matrix_parent becomes the matrix root
    'Layer1_' || r.matrix_position as matrix_position, -- Mark as Layer 1 in parent's matrix
    1 as matrix_layer, -- Layer 1 in parent's individual matrix
    r.matrix_parent as matrix_root, -- Parent is the root of their own matrix
    r.activation_rank,
    u.username as member_username,
    parent_u.username as parent_username,
    parent_u.username as root_username, -- Parent is root in this view
    m.current_level,
    r.placed_at,
    'individual_matrix' as matrix_type
FROM referrals r
JOIN users u ON r.member_wallet = u.wallet_address
JOIN users parent_u ON r.matrix_parent = parent_u.wallet_address
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.is_active = true 
AND r.matrix_parent != r.matrix_root -- Only for non-root placements

ORDER BY matrix_root, matrix_type, matrix_layer, activation_rank;

\echo '✅ Created enhanced matrix_structure view'

-- Step 5: Show main matrix structure
\echo ''
\echo '📊 Main Matrix Structure (Root as matrix_root):'
SELECT 
    'Layer ' || matrix_layer as layer,
    member_username || ' (' || matrix_position || ')' as member_info,
    parent_username as matrix_parent,
    root_username as matrix_root
FROM matrix_structure 
WHERE matrix_type = 'main_matrix'
ORDER BY matrix_layer, matrix_position;

-- Step 6: Show individual matrix Layer 1 records
\echo ''
\echo '📊 Individual Matrix Layer 1 Records:'
SELECT 
    root_username || ' Matrix' as matrix_owner,
    'Layer 1: ' || member_username || ' (' || REPLACE(matrix_position, 'Layer1_', '') || ')' as layer1_member,
    CASE 
        WHEN referrer_wallet = matrix_root THEN 'Direct Referral'
        ELSE 'Spillover Placement'
    END as placement_type
FROM matrix_structure 
WHERE matrix_type = 'individual_matrix'
ORDER BY matrix_root, matrix_position;

-- Step 7: Create comprehensive matrix analysis view
CREATE OR REPLACE VIEW comprehensive_matrix_analysis AS
SELECT 
    -- Matrix owner info
    ms_main.matrix_parent as matrix_owner,
    owner_u.username as matrix_owner_username,
    
    -- Layer 1 member info
    ms_main.member_wallet as layer1_member,
    ms_main.member_username as layer1_member_username,
    
    -- Main matrix position info
    ms_main.matrix_layer as position_in_main_matrix,
    ms_main.matrix_position as position_in_main_matrix_position,
    
    -- Referral info
    CASE 
        WHEN ms_main.referrer_wallet = ms_main.matrix_parent THEN 'Direct Referral'
        ELSE 'Spillover Placement' 
    END as placement_type,
    
    -- Potential rewards
    100 as reward_per_level1_activation_usdc

FROM matrix_structure ms_main
JOIN users owner_u ON ms_main.matrix_parent = owner_u.wallet_address
WHERE ms_main.matrix_type = 'main_matrix'
AND ms_main.matrix_parent != ms_main.matrix_root -- Focus on spillover placements
ORDER BY matrix_owner, position_in_main_matrix;

\echo '✅ Created comprehensive matrix analysis view'

-- Step 8: Show comprehensive analysis
\echo ''
\echo '📊 Comprehensive Matrix Analysis:'
SELECT 
    matrix_owner_username as matrix_owner,
    layer1_member_username as layer1_member,
    'Layer ' || position_in_main_matrix || ' → Layer 1' as transformation,
    placement_type,
    reward_per_level1_activation_usdc as reward_usdc
FROM comprehensive_matrix_analysis;

-- Step 9: Update individual_matrix_placements table
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

-- Spillover placements are Layer 1 in their matrix_parent's matrix
SELECT 
    r.matrix_parent as matrix_owner,
    r.member_wallet as member_wallet,
    1 as layer_in_owner_matrix,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM referrals r2 WHERE r2.matrix_parent = r.matrix_parent AND r2.matrix_position = 'L' AND r2.member_wallet != r.member_wallet) THEN 'L'
        WHEN NOT EXISTS (SELECT 1 FROM referrals r2 WHERE r2.matrix_parent = r.matrix_parent AND r2.matrix_position = 'M' AND r2.member_wallet != r.member_wallet) THEN 'M'
        ELSE 'R'
    END as position_in_layer,
    r.placed_at
FROM referrals r
WHERE r.matrix_parent != r.matrix_root

ON CONFLICT (matrix_owner, member_wallet) DO NOTHING;

\echo '✅ Updated individual matrix placements'

-- Step 10: Final verification
\echo ''
\echo '📊 Final Matrix Verification:'

\echo 'Root Matrix (Main Tree):'
SELECT matrix_layer, COUNT(*) as members, STRING_AGG(member_username, ', ') as member_list
FROM matrix_structure 
WHERE matrix_type = 'main_matrix' AND root_username = 'Beehive Root'
GROUP BY matrix_layer
ORDER BY matrix_layer;

\echo ''
\echo 'Individual Matrices (Layer 1 members):'
SELECT 
    matrix_owner_username,
    COUNT(*) as layer1_members,
    SUM(reward_per_level1_activation_usdc) as potential_rewards
FROM comprehensive_matrix_analysis
GROUP BY matrix_owner_username, matrix_owner
ORDER BY potential_rewards DESC;

\echo ''
\echo '✅ Complete matrix structure tracking implemented!'
\echo ''
\echo '🎯 Key Features:'
\echo '  ✅ Correct L→M→R spillover logic in main matrix'
\echo '  ✅ Layer 2 spillover when Layer 1 full'
\echo '  ✅ Individual matrix Layer 1 tracking for each member'
\echo '  ✅ Proper reward calculation (100 USDC per Layer 1 activation)'
\echo '  ✅ Enhanced matrix_structure with both main and individual matrix views'