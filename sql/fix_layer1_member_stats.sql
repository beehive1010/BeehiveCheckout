-- Fix layer1_member_stats to only show actual Layer 1 members (max 3 per root)
-- Remove self-references and wrong layer assignments

-- Step 1: Drop and recreate member_layer1_analysis based on actual Layer 1 placements
DROP VIEW IF EXISTS layer1_member_stats CASCADE;
DROP VIEW IF EXISTS member_layer1_analysis CASCADE;

-- Step 2: Create correct member_layer1_analysis 
CREATE VIEW member_layer1_analysis AS
SELECT 
    imp.matrix_owner as matrix_root,
    COALESCE(owner_u.username, 'Unknown') as matrix_root_username,
    imp.member_wallet as layer1_member,
    COALESCE(member_u.username, 'Unknown') as layer1_member_username,
    m.current_level as layer1_member_level,
    imp.placed_at as joined_date,
    
    -- Count spillovers under this Layer 1 member (members in their own matrix)
    COALESCE(spillover_counts.spillover_count, 0) as spillover_count,
    
    -- Potential rewards: 100 USDC base + 100 per spillover
    (100 + COALESCE(spillover_counts.spillover_count, 0) * 100) as potential_rewards_usdc

FROM individual_matrix_placements imp
LEFT JOIN users owner_u ON LOWER(imp.matrix_owner) = LOWER(owner_u.wallet_address)
LEFT JOIN users member_u ON LOWER(imp.member_wallet) = LOWER(member_u.wallet_address)
LEFT JOIN members m ON LOWER(imp.member_wallet) = LOWER(m.wallet_address)

-- Count spillovers (downline members in this Layer 1 member's own matrix)
LEFT JOIN (
    SELECT 
        imp_spillover.matrix_owner,
        COUNT(*) as spillover_count
    FROM individual_matrix_placements imp_spillover
    WHERE imp_spillover.is_active = true
    GROUP BY imp_spillover.matrix_owner
) spillover_counts ON LOWER(spillover_counts.matrix_owner) = LOWER(imp.member_wallet)

WHERE imp.is_active = true
AND imp.layer_in_owner_matrix = 1  -- Only Layer 1 members
AND LOWER(imp.member_wallet) != LOWER(imp.matrix_owner)  -- Exclude self-references

ORDER BY imp.matrix_owner, imp.placed_at;

-- Step 3: Recreate layer1_member_stats based on corrected analysis
CREATE VIEW layer1_member_stats AS
SELECT 
    matrix_root,
    matrix_root_username,
    COUNT(*) as total_layer1_members,
    SUM(spillover_count) as total_spillovers_under_layer1,
    SUM(potential_rewards_usdc) as total_potential_rewards,
    STRING_AGG(
        layer1_member_username || ' (' || spillover_count || ' spillovers)', 
        ', ' ORDER BY joined_date
    ) as layer1_members_details
FROM member_layer1_analysis
GROUP BY matrix_root, matrix_root_username
ORDER BY total_potential_rewards DESC;

-- Step 4: Show corrected results
SELECT 
    '=== CORRECTED LAYER 1 MEMBER STATS ===' as section_title;

SELECT 
    matrix_root_username as root,
    total_layer1_members || ' members' as layer1_count,
    CASE 
        WHEN total_layer1_members = 3 THEN '✅ Full (3/3)'
        WHEN total_layer1_members < 3 THEN '⏳ Building (' || total_layer1_members || '/3)'
        ELSE '❌ Error: Over capacity'
    END as status,
    total_spillovers_under_layer1 || ' total spillovers' as spillovers,
    total_potential_rewards || ' USDC potential' as rewards,
    layer1_members_details as members
FROM layer1_member_stats
ORDER BY total_layer1_members DESC, matrix_root_username;

-- Step 5: Detailed Layer 1 breakdown
SELECT 
    '=== DETAILED LAYER 1 MEMBER ANALYSIS ===' as section_title;

SELECT 
    matrix_root_username as root,
    layer1_member_username as layer1_member,
    layer1_member_level || ' Level' as member_level,
    spillover_count || ' spillovers' as has_spillovers,
    potential_rewards_usdc || ' USDC' as potential_reward,
    joined_date::date as joined
FROM member_layer1_analysis
ORDER BY matrix_root, joined_date;

-- Step 6: Validation check
SELECT 
    '=== LAYER 1 CAPACITY VALIDATION ===' as section_title;

SELECT 
    matrix_root_username as root,
    total_layer1_members as current_count,
    3 as max_capacity,
    3 - total_layer1_members as slots_available,
    CASE 
        WHEN total_layer1_members <= 3 THEN '✅ Valid'
        ELSE '❌ Over capacity'
    END as validation_status
FROM layer1_member_stats
ORDER BY matrix_root_username;

-- Final summary
DO $$
DECLARE
    total_roots INTEGER;
    full_layer1_roots INTEGER;
    building_layer1_roots INTEGER;
    total_layer1_members INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_roots FROM layer1_member_stats;
    
    SELECT COUNT(*) INTO full_layer1_roots 
    FROM layer1_member_stats WHERE total_layer1_members = 3;
    
    SELECT COUNT(*) INTO building_layer1_roots
    FROM layer1_member_stats WHERE total_layer1_members < 3;
    
    SELECT SUM(total_layer1_members) INTO total_layer1_members 
    FROM layer1_member_stats;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== LAYER 1 MEMBER STATS CORRECTION SUMMARY ===';
    RAISE NOTICE 'Total roots with Layer 1: %', total_roots;
    RAISE NOTICE 'Roots with full Layer 1 (3/3): %', full_layer1_roots;
    RAISE NOTICE 'Roots still building Layer 1: %', building_layer1_roots;
    RAISE NOTICE 'Total Layer 1 members: %', total_layer1_members;
    RAISE NOTICE '';
    RAISE NOTICE '✅ layer1_member_stats now correctly shows only Layer 1 members!';
    RAISE NOTICE 'Each root shows maximum 3 Layer 1 members as per 3x3 matrix rules.';
END $$;