-- Find each user's Layer 1 members in their individual matrix
-- Layer 1 = Direct referrals who become their downline

\echo '🔍 Finding each user Layer 1 members (individual matrix system)...'

-- Step 1: Create view to show each member's Layer 1 (direct referrals)
CREATE OR REPLACE VIEW member_layer1_analysis AS
SELECT 
    referrer.wallet_address as matrix_root,
    referrer_u.username as matrix_root_username,
    member.wallet_address as layer1_member,
    member_u.username as layer1_member_username,
    member.current_level as layer1_member_level,
    member.created_at as joined_date,
    -- Check if this Layer 1 member has spillovers under them
    COUNT(spillover.member_wallet) as spillover_count,
    -- Calculate rewards this Layer 1 member can generate
    (100 * (1 + COUNT(spillover.member_wallet))) as potential_rewards_usdc
FROM members referrer
JOIN users referrer_u ON referrer.wallet_address = referrer_u.wallet_address
-- Find direct referrals (Layer 1 in their matrix)
JOIN members member ON member.referrer_wallet = referrer.wallet_address
JOIN users member_u ON member.wallet_address = member_u.wallet_address
-- Find spillovers under each Layer 1 member
LEFT JOIN referrals spillover ON spillover.matrix_parent = member.wallet_address
GROUP BY 
    referrer.wallet_address, referrer_u.username,
    member.wallet_address, member_u.username, 
    member.current_level, member.created_at
ORDER BY referrer.wallet_address, member.created_at;

\echo '✅ Created member_layer1_analysis view'

-- Step 2: Show current Layer 1 members for each matrix root
\echo ''
\echo '📊 Each Member Layer 1 Analysis:'
SELECT 
    matrix_root_username as matrix_root,
    layer1_member_username as layer1_member,
    layer1_member_level as member_level,
    spillover_count,
    potential_rewards_usdc
FROM member_layer1_analysis
ORDER BY matrix_root_username, layer1_member_username;

-- Step 3: Create detailed spillover analysis
CREATE OR REPLACE VIEW detailed_spillover_analysis AS
SELECT 
    -- Matrix root info
    referrer.wallet_address as matrix_root,
    referrer_u.username as matrix_root_username,
    
    -- Layer 1 member info  
    layer1.wallet_address as layer1_member,
    layer1_u.username as layer1_member_username,
    
    -- Spillover member info (Layer 2+ in matrix root's matrix)
    spillover.member_wallet as spillover_member,
    spillover_u.username as spillover_member_username,
    spillover.matrix_position as spillover_position,
    spillover.matrix_layer as spillover_matrix_layer,
    spillover.placed_at as spillover_date,
    
    -- Original referrer of spillover member
    spillover_m.referrer_wallet as spillover_original_referrer,
    orig_ref_u.username as spillover_original_referrer_username

FROM members referrer
JOIN users referrer_u ON referrer.wallet_address = referrer_u.wallet_address

-- Layer 1: Direct referrals of matrix root
JOIN members layer1 ON layer1.referrer_wallet = referrer.wallet_address
JOIN users layer1_u ON layer1.wallet_address = layer1_u.wallet_address

-- Spillovers: Members placed under Layer 1 members
JOIN referrals spillover ON spillover.matrix_parent = layer1.wallet_address
JOIN users spillover_u ON spillover.member_wallet = spillover_u.wallet_address
JOIN members spillover_m ON spillover.member_wallet = spillover_m.wallet_address
LEFT JOIN users orig_ref_u ON spillover_m.referrer_wallet = orig_ref_u.wallet_address

ORDER BY referrer.wallet_address, layer1.wallet_address, spillover.placed_at;

\echo '✅ Created detailed_spillover_analysis view'

-- Step 4: Show detailed spillover patterns
\echo ''
\echo '📊 Detailed Spillover Analysis:'
SELECT 
    matrix_root_username,
    layer1_member_username || ' (Layer 1)' as layer1_info,
    spillover_member_username || ' → ' || spillover_position || ' (Layer ' || spillover_matrix_layer || ')' as spillover_info,
    spillover_original_referrer_username as original_referrer
FROM detailed_spillover_analysis
ORDER BY matrix_root_username, layer1_member_username, spillover_date;

-- Step 5: Create Layer 1 member matrix statistics
CREATE OR REPLACE VIEW layer1_member_stats AS
SELECT 
    mla.matrix_root,
    mla.matrix_root_username,
    -- Layer 1 statistics
    COUNT(*) as total_layer1_members,
    SUM(mla.spillover_count) as total_spillovers_under_layer1,
    SUM(mla.potential_rewards_usdc) as total_potential_rewards,
    
    -- Individual Layer 1 member details
    STRING_AGG(
        mla.layer1_member_username || ' (' || mla.spillover_count || ' spillovers)', 
        ', ' ORDER BY mla.layer1_member_username
    ) as layer1_members_details
    
FROM member_layer1_analysis mla
GROUP BY mla.matrix_root, mla.matrix_root_username
ORDER BY total_potential_rewards DESC;

\echo '✅ Created layer1_member_stats view'

-- Step 6: Show Layer 1 member statistics
\echo ''
\echo '📊 Layer 1 Member Statistics by Matrix Root:'
SELECT 
    matrix_root_username,
    total_layer1_members,
    total_spillovers_under_layer1,
    total_potential_rewards,
    layer1_members_details
FROM layer1_member_stats;

-- Step 7: Create function to get specific member's Layer 1 analysis
CREATE OR REPLACE FUNCTION get_member_layer1_details(target_wallet TEXT)
RETURNS TABLE(
    layer1_member_username TEXT,
    layer1_member_wallet TEXT,
    layer1_member_level INTEGER,
    spillover_count BIGINT,
    spillover_members TEXT,
    potential_rewards_usdc NUMERIC
) 
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mla.layer1_member_username::TEXT,
        mla.layer1_member::TEXT,
        mla.layer1_member_level,
        mla.spillover_count,
        COALESCE(
            STRING_AGG(dsa.spillover_member_username, ', ' ORDER BY dsa.spillover_date),
            'No spillovers'
        )::TEXT as spillover_members,
        mla.potential_rewards_usdc::NUMERIC
    FROM member_layer1_analysis mla
    LEFT JOIN detailed_spillover_analysis dsa ON mla.matrix_root = dsa.matrix_root 
                                              AND mla.layer1_member = dsa.layer1_member
    WHERE mla.matrix_root = target_wallet
    GROUP BY 
        mla.layer1_member_username, mla.layer1_member, 
        mla.layer1_member_level, mla.spillover_count, mla.potential_rewards_usdc
    ORDER BY mla.layer1_member_username;
END;
$$;

\echo '✅ Created get_member_layer1_details() function'

-- Step 8: Test the function with specific members
\echo ''
\echo '📊 Beehive Root Layer 1 Details:'
SELECT * FROM get_member_layer1_details('0x0000000000000000000000000000000000000001');

\echo ''
\echo '📊 test004 Layer 1 Details:'
SELECT * FROM get_member_layer1_details('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab');

-- Step 9: Summary of findings
\echo ''
\echo '🎯 Layer 1 Member Summary:'
\echo 'Each member matrix structure:'
\echo '  - Layer 1: Direct referrals of matrix root'
\echo '  - Layer 2+: Spillover members under Layer 1 members'
\echo '  - Rewards: Each Level 1 activation generates 100 USDC to matrix root'
\echo '  - Matrix root needs appropriate level to claim rewards'

SELECT 
    'Summary' as analysis,
    COUNT(DISTINCT matrix_root) as total_matrix_roots,
    COUNT(*) as total_layer1_relationships,
    SUM(spillover_count) as total_spillover_placements
FROM member_layer1_analysis;

\echo ''
\echo '✅ Individual Layer 1 analysis completed!'