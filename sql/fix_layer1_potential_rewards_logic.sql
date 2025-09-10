-- Fix Layer 1 potential rewards calculation
-- Remove incorrect spillover bonus counting - each Layer 1 should only count base 100 USDC per member

-- Step 1: Check current incorrect calculation
SELECT 
    '=== CURRENT INCORRECT CALCULATION ===' as section_title;

SELECT 
    matrix_root_username as root,
    total_layer1_members || ' Layer 1 members' as members,
    total_spillovers_under_layer1 || ' spillovers counted' as spillovers,
    total_potential_rewards || ' USDC (INCORRECT)' as incorrect_calculation,
    (total_layer1_members * 100) || ' USDC (CORRECT)' as correct_calculation,
    layer1_members_details
FROM layer1_member_stats
ORDER BY matrix_root_username;

-- Step 2: Fix member_layer1_analysis - remove spillover bonus
DROP VIEW IF EXISTS layer1_member_stats CASCADE;
DROP VIEW IF EXISTS member_layer1_analysis CASCADE;

-- Step 3: Create corrected member_layer1_analysis
CREATE VIEW member_layer1_analysis AS
SELECT 
    imp.matrix_owner as matrix_root,
    COALESCE(owner_u.username, 'Unknown') as matrix_root_username,
    imp.member_wallet as layer1_member,
    COALESCE(member_u.username, 'Unknown') as layer1_member_username,
    m.current_level as layer1_member_level,
    imp.placed_at as joined_date,
    imp.position_in_layer,
    
    -- Count spillovers under this Layer 1 member (for informational purposes only)
    COALESCE(spillover_counts.spillover_count, 0) as spillover_count,
    
    -- Correct potential reward: ONLY 100 USDC per Layer 1 activation (no spillover bonus)
    100 as potential_rewards_usdc

FROM individual_matrix_placements imp
LEFT JOIN users owner_u ON LOWER(imp.matrix_owner) = LOWER(owner_u.wallet_address)
LEFT JOIN users member_u ON LOWER(imp.member_wallet) = LOWER(member_u.wallet_address)
LEFT JOIN members m ON LOWER(imp.member_wallet) = LOWER(m.wallet_address)

-- Count spillovers (for information only, doesn't affect reward calculation)
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

-- Step 4: Recreate layer1_member_stats with correct calculation
CREATE VIEW layer1_member_stats AS
SELECT 
    matrix_root,
    matrix_root_username,
    COUNT(*) as total_layer1_members,
    SUM(spillover_count) as total_spillovers_under_layer1,
    
    -- Correct calculation: Layer 1 members × 100 USDC each
    COUNT(*) * 100 as total_potential_rewards,
    
    STRING_AGG(
        layer1_member_username || ' (' || spillover_count || ' spillovers)', 
        ', ' ORDER BY joined_date
    ) as layer1_members_details
FROM member_layer1_analysis
GROUP BY matrix_root, matrix_root_username
ORDER BY total_potential_rewards DESC;

-- Step 5: Show corrected results
SELECT 
    '=== CORRECTED LAYER 1 POTENTIAL REWARDS ===' as section_title;

SELECT 
    matrix_root_username as root,
    total_layer1_members || ' Layer 1 members' as members,
    CASE 
        WHEN total_layer1_members = 3 THEN '✅ Full (3/3)'
        WHEN total_layer1_members < 3 THEN '⏳ Building (' || total_layer1_members || '/3)'
        ELSE '❌ Error: Over capacity'
    END as status,
    total_potential_rewards || ' USDC' as correct_layer1_rewards,
    '(' || total_layer1_members || ' × 100 USDC each)' as calculation,
    total_spillovers_under_layer1 || ' total spillovers (info only)' as spillover_info
FROM layer1_member_stats
ORDER BY total_layer1_members DESC, matrix_root_username;

-- Step 6: Show detailed breakdown
SELECT 
    '=== DETAILED LAYER 1 REWARD BREAKDOWN ===' as section_title;

SELECT 
    matrix_root_username as root,
    layer1_member_username as member,
    position_in_layer as position,
    layer1_member_level || ' Level' as member_level,
    spillover_count || ' spillovers (info only)' as has_spillovers,
    potential_rewards_usdc || ' USDC' as reward_to_root,
    'When ' || layer1_member_username || ' activates Level 1 NFT' as reward_trigger
FROM member_layer1_analysis
ORDER BY matrix_root_username, joined_date;

-- Step 7: Compare with actual rewards earned
SELECT 
    '=== ACTUAL vs POTENTIAL REWARDS COMPARISON ===' as section_title;

SELECT 
    stats.matrix_root_username as root,
    stats.total_potential_rewards || ' USDC' as potential_layer1_rewards,
    COALESCE(actual.actual_rewards, 0) || ' USDC' as actual_rewards_earned,
    CASE 
        WHEN COALESCE(actual.actual_rewards, 0) = stats.total_potential_rewards THEN '✅ Match'
        WHEN COALESCE(actual.actual_rewards, 0) < stats.total_potential_rewards THEN '⏳ Pending activations'
        ELSE '⚠️ Check calculation'
    END as status
FROM layer1_member_stats stats
LEFT JOIN (
    SELECT 
        lr.recipient_wallet,
        SUM(lr.amount_usdt) as actual_rewards
    FROM layer_rewards lr
    WHERE lr.layer = 1
    GROUP BY lr.recipient_wallet
) actual ON LOWER(stats.matrix_root) = LOWER(actual.recipient_wallet)
ORDER BY stats.matrix_root_username;

-- Final summary
DO $$
DECLARE
    total_roots INTEGER;
    total_layer1_members INTEGER;
    correct_total_potential NUMERIC;
BEGIN
    SELECT 
        COUNT(*),
        SUM(total_layer1_members),
        SUM(total_potential_rewards)
    INTO total_roots, total_layer1_members, correct_total_potential
    FROM layer1_member_stats;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== LAYER 1 POTENTIAL REWARDS CORRECTION SUMMARY ===';
    RAISE NOTICE 'Total roots with Layer 1: %', total_roots;
    RAISE NOTICE 'Total Layer 1 members: %', total_layer1_members;
    RAISE NOTICE 'Correct total potential rewards: % USDC', correct_total_potential;
    RAISE NOTICE '';
    RAISE NOTICE '✅ CORRECTED LOGIC:';
    RAISE NOTICE '- Each Layer 1 member = 100 USDC reward to matrix owner';
    RAISE NOTICE '- Spillovers shown for info only, no bonus rewards';
    RAISE NOTICE '- Spillover members earn rewards in their own matrices';
    RAISE NOTICE '';
    RAISE NOTICE 'Beehive Root: 3 Layer 1 members × 100 = 300 USDC max';
    RAISE NOTICE 'test004: 2 Layer 1 members × 100 = 200 USDC max';
END $$;