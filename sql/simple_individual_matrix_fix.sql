-- Simple fix for individual_matrix_placements - focus on Layer 1-19 hierarchy only
-- Remove position_in_layer dependency and rebuild based on actual referral data

-- Step 1: Clear position_in_layer data since it's not needed for individual matrices
UPDATE individual_matrix_placements SET position_in_layer = NULL;

-- Step 2: Simple rebuild based on existing referrals data
DELETE FROM individual_matrix_placements;

-- Step 3: Rebuild individual matrices focusing on layer hierarchy
INSERT INTO individual_matrix_placements (
    matrix_owner,
    member_wallet,
    layer_in_owner_matrix,
    position_in_layer,
    placed_at,
    original_referrer,
    placement_type,
    placement_order
)
-- Method 1: Direct referrals from users table (these are Layer 1 in referrer's individual matrix)
SELECT DISTINCT
    u_referrer.wallet_address as matrix_owner,
    u_member.wallet_address as member_wallet,
    1 as layer_in_owner_matrix, -- Direct referrals = Layer 1
    NULL as position_in_layer, -- No L/M/R for individual matrix layers
    COALESCE(m_member.created_at, u_member.created_at) as placed_at,
    u_referrer.wallet_address as original_referrer,
    'direct_referral' as placement_type,
    ROW_NUMBER() OVER (
        PARTITION BY u_referrer.wallet_address 
        ORDER BY COALESCE(m_member.created_at, u_member.created_at)
    ) as placement_order
FROM users u_referrer
JOIN users u_member ON LOWER(u_member.referrer_wallet) = LOWER(u_referrer.wallet_address)
LEFT JOIN members m_member ON LOWER(m_member.wallet_address) = LOWER(u_member.wallet_address)
WHERE u_member.referrer_wallet IS NOT NULL
AND u_referrer.wallet_address != u_member.wallet_address

UNION ALL

-- Method 2: Matrix placements from referrals table (these go to their appropriate layers)
SELECT DISTINCT
    COALESCE(r.matrix_parent, r.referrer_wallet) as matrix_owner,
    r.member_wallet,
    COALESCE(r.matrix_layer, 1) as layer_in_owner_matrix,
    NULL as position_in_layer, -- No L/M/R for individual matrix
    r.placed_at,
    r.referrer_wallet as original_referrer,
    CASE 
        WHEN r.matrix_parent = r.referrer_wallet THEN 'direct_referral'
        ELSE 'spillover'
    END as placement_type,
    COALESCE(r.placement_order, r.activation_rank) as placement_order
FROM referrals r
WHERE r.matrix_parent IS NOT NULL
AND r.is_active = true

-- Remove duplicates (keep the most complete record)
ON CONFLICT (matrix_owner, member_wallet) DO UPDATE SET
    layer_in_owner_matrix = CASE 
        WHEN EXCLUDED.placement_type = 'direct_referral' THEN 1
        ELSE EXCLUDED.layer_in_owner_matrix
    END,
    placement_type = CASE
        WHEN EXCLUDED.placement_type = 'direct_referral' THEN 'direct_referral'
        ELSE individual_matrix_placements.placement_type
    END;

-- Step 4: Show results
SELECT 
    '=== INDIVIDUAL MATRIX SUMMARY (Layer-Based) ===' as section_title;

-- Create a simple summary view
SELECT 
    COALESCE(owner_u.username, 'Unknown') as matrix_owner_name,
    imp.layer_in_owner_matrix,
    COUNT(*) as members_count,
    STRING_AGG(
        COALESCE(member_u.username, SUBSTRING(imp.member_wallet, 1, 8)),
        ', ' ORDER BY imp.placement_order
    ) as members_in_layer,
    -- Potential Layer Rewards (from MarketingPlan.md)
    CASE imp.layer_in_owner_matrix
        WHEN 1 THEN COUNT(*) * 100
        WHEN 2 THEN COUNT(*) * 150
        WHEN 3 THEN COUNT(*) * 200
        ELSE COUNT(*) * (100 + (imp.layer_in_owner_matrix - 1) * 50)
    END as potential_rewards_usdc
FROM individual_matrix_placements imp
LEFT JOIN users owner_u ON LOWER(imp.matrix_owner) = LOWER(owner_u.wallet_address)
LEFT JOIN users member_u ON LOWER(imp.member_wallet) = LOWER(member_u.wallet_address)
WHERE imp.is_active = true
GROUP BY imp.matrix_owner, owner_u.username, imp.layer_in_owner_matrix
ORDER BY owner_u.username, imp.layer_in_owner_matrix;

-- Show detailed breakdown for verification
SELECT 
    '=== DETAILED BREAKDOWN ===' as section_title;

SELECT 
    COALESCE(owner_u.username, 'Unknown') as matrix_owner,
    'Layer ' || imp.layer_in_owner_matrix as layer,
    COALESCE(member_u.username, SUBSTRING(imp.member_wallet, 1, 10)) as member_name,
    imp.placement_type,
    imp.placed_at,
    CASE imp.layer_in_owner_matrix
        WHEN 1 THEN '100 USDC'
        WHEN 2 THEN '150 USDC'  
        WHEN 3 THEN '200 USDC'
        ELSE (100 + (imp.layer_in_owner_matrix - 1) * 50)::text || ' USDC'
    END as reward_per_activation
FROM individual_matrix_placements imp
LEFT JOIN users owner_u ON LOWER(imp.matrix_owner) = LOWER(owner_u.wallet_address)
LEFT JOIN users member_u ON LOWER(imp.member_wallet) = LOWER(member_u.wallet_address)
WHERE imp.is_active = true
ORDER BY owner_u.username, imp.layer_in_owner_matrix, imp.placement_order;

-- Final summary
DO $$
DECLARE
    total_owners INTEGER;
    total_placements INTEGER;
    layer_1_count INTEGER;
    layer_2_count INTEGER;
    layer_3_count INTEGER;
BEGIN
    SELECT 
        COUNT(DISTINCT matrix_owner),
        COUNT(*),
        COUNT(*) FILTER (WHERE layer_in_owner_matrix = 1),
        COUNT(*) FILTER (WHERE layer_in_owner_matrix = 2),
        COUNT(*) FILTER (WHERE layer_in_owner_matrix = 3)
    INTO total_owners, total_placements, layer_1_count, layer_2_count, layer_3_count
    FROM individual_matrix_placements 
    WHERE is_active = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== FINAL SUMMARY ===';
    RAISE NOTICE 'Total matrix owners: %', total_owners;
    RAISE NOTICE 'Total member placements: %', total_placements;
    RAISE NOTICE 'Layer 1 members: % (% USDC potential)', layer_1_count, layer_1_count * 100;
    RAISE NOTICE 'Layer 2 members: % (% USDC potential)', layer_2_count, layer_2_count * 150;
    RAISE NOTICE 'Layer 3 members: % (% USDC potential)', layer_3_count, layer_3_count * 200;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Individual matrix now correctly focuses on Layer 1-19 hierarchy!';
    RAISE NOTICE 'Each member can earn Layer Rewards when their downlines activate NFT levels.';
    RAISE NOTICE 'No more L/M/R positions - this table tracks layer-based reward potential.';
END $$;