-- Fix individual_matrix_placements to focus on Layer 1-19 hierarchy only
-- Remove incorrect L/M/R position logic and focus on proper layer assignments
-- Based on MarketingPlan.md: Each member has their own 19-layer matrix for Layer Rewards

-- Step 1: Update table structure to remove position_in_layer requirement
ALTER TABLE individual_matrix_placements ALTER COLUMN position_in_layer DROP NOT NULL;
ALTER TABLE individual_matrix_placements DROP CONSTRAINT IF EXISTS valid_position;

-- Step 2: Create function to rebuild individual matrices based on referral hierarchy
CREATE OR REPLACE FUNCTION rebuild_individual_matrices()
RETURNS VOID AS $$
DECLARE
    matrix_owner_rec RECORD;
    placement_rec RECORD;
BEGIN
    -- Clear existing data
    DELETE FROM individual_matrix_placements;
    
    RAISE NOTICE 'Rebuilding individual matrix placements focusing on Layer 1-19 hierarchy...';
    
    -- For each member who can be a matrix owner (has downlines)
    FOR matrix_owner_rec IN 
        SELECT DISTINCT 
            COALESCE(r.parent_wallet, r.matrix_parent, u.wallet_address) as matrix_owner,
            u.username as owner_name
        FROM users u
        LEFT JOIN referrals r ON LOWER(r.parent_wallet) = LOWER(u.wallet_address) 
                              OR LOWER(r.matrix_parent) = LOWER(u.wallet_address)
        WHERE r.parent_wallet IS NOT NULL OR r.matrix_parent IS NOT NULL
        ORDER BY u.created_at
    LOOP
        RAISE NOTICE 'Processing matrix for: %', matrix_owner_rec.owner_name;
        
        -- Method 1: Direct referrals become Layer 1 in referrer's individual matrix
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
        SELECT DISTINCT
            matrix_owner_rec.matrix_owner,
            u_member.wallet_address,
            1 as layer_in_owner_matrix, -- Direct referrals are Layer 1
            NULL as position_in_layer, -- No L/M/R needed for individual matrix layers
            COALESCE(m_member.created_at, u_member.created_at) as placed_at,
            matrix_owner_rec.matrix_owner as original_referrer,
            'direct_referral' as placement_type,
            ROW_NUMBER() OVER (ORDER BY COALESCE(m_member.created_at, u_member.created_at)) as placement_order
        FROM users u_member
        LEFT JOIN members m_member ON LOWER(m_member.wallet_address) = LOWER(u_member.wallet_address)
        WHERE LOWER(u_member.referrer_wallet) = LOWER(matrix_owner_rec.matrix_owner)
        AND u_member.wallet_address != matrix_owner_rec.matrix_owner
        ON CONFLICT (matrix_owner, member_wallet) DO NOTHING;
        
        -- Method 2: Spillover placements from referrals table (various layers)
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
        SELECT DISTINCT
            matrix_owner_rec.matrix_owner,
            r.member_wallet,
            LEAST(COALESCE(r.layer, r.matrix_layer, 1), 19) as layer_in_owner_matrix,
            NULL as position_in_layer, -- No L/M/R for individual matrix
            r.created_at as placed_at,
            COALESCE(r.placer_wallet, r.member_wallet) as original_referrer,
            CASE 
                WHEN r.placement_type = 'direct' THEN 'direct_referral'
                ELSE 'spillover'
            END as placement_type,
            ROW_NUMBER() OVER (ORDER BY r.created_at) as placement_order
        FROM referrals r
        WHERE (LOWER(COALESCE(r.parent_wallet, r.matrix_parent)) = LOWER(matrix_owner_rec.matrix_owner))
        AND r.member_wallet != matrix_owner_rec.matrix_owner
        AND COALESCE(r.is_active, true) = true
        ON CONFLICT (matrix_owner, member_wallet) DO UPDATE SET
            layer_in_owner_matrix = EXCLUDED.layer_in_owner_matrix,
            placement_type = EXCLUDED.placement_type;
            
        -- Method 3: Recursive placement for deeper layers (Layer 2+)
        WITH RECURSIVE matrix_expansion AS (
            -- Start with existing Layer 1 members
            SELECT 
                imp.matrix_owner,
                imp.member_wallet,
                imp.layer_in_owner_matrix,
                1 as depth
            FROM individual_matrix_placements imp
            WHERE imp.matrix_owner = matrix_owner_rec.matrix_owner
            AND imp.layer_in_owner_matrix = 1
            
            UNION ALL
            
            -- Find members under each Layer 1 member (they become Layer 2+)
            SELECT 
                me.matrix_owner,
                r.member_wallet,
                me.layer_in_owner_matrix + 1,
                me.depth + 1
            FROM matrix_expansion me
            JOIN referrals r ON (
                LOWER(COALESCE(r.parent_wallet, r.matrix_parent)) = LOWER(me.member_wallet)
                OR LOWER(r.placer_wallet) = LOWER(me.member_wallet)
            )
            WHERE me.layer_in_owner_matrix < 19
            AND me.depth < 10  -- Prevent infinite recursion
            AND COALESCE(r.is_active, true) = true
        )
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
        SELECT 
            me.matrix_owner,
            me.member_wallet,
            me.layer_in_owner_matrix,
            NULL as position_in_layer,
            COALESCE(r.created_at, now()) as placed_at,
            COALESCE(r.placer_wallet, me.member_wallet) as original_referrer,
            'recursive_placement' as placement_type,
            ROW_NUMBER() OVER (ORDER BY COALESCE(r.created_at, now())) as placement_order
        FROM matrix_expansion me
        LEFT JOIN referrals r ON LOWER(r.member_wallet) = LOWER(me.member_wallet)
        WHERE me.layer_in_owner_matrix > 1
        AND NOT EXISTS (
            SELECT 1 FROM individual_matrix_placements imp2 
            WHERE imp2.matrix_owner = me.matrix_owner 
            AND LOWER(imp2.member_wallet) = LOWER(me.member_wallet)
        )
        ON CONFLICT (matrix_owner, member_wallet) DO NOTHING;
        
    END LOOP;
    
    RAISE NOTICE 'Individual matrix rebuilding completed!';
END;
$$ LANGUAGE plpgsql;

-- Step 3: Execute the rebuild
SELECT rebuild_individual_matrices();

-- Step 4: Create corrected summary view
CREATE OR REPLACE VIEW individual_matrix_layer_summary AS
SELECT 
    imp.matrix_owner,
    COALESCE(owner_u.username, 'Unknown') as matrix_owner_name,
    imp.layer_in_owner_matrix,
    COUNT(*) as members_in_layer,
    STRING_AGG(
        COALESCE(member_u.username, SUBSTRING(imp.member_wallet, 1, 8)),
        ', ' ORDER BY imp.placement_order
    ) as members_list,
    -- Potential rewards for this layer (from MarketingPlan.md)
    CASE imp.layer_in_owner_matrix
        WHEN 1 THEN COUNT(*) * 100  -- Layer 1: 100 USDC per member
        WHEN 2 THEN COUNT(*) * 150  -- Layer 2: 150 USDC per member  
        WHEN 3 THEN COUNT(*) * 200  -- Layer 3: 200 USDC per member
        ELSE COUNT(*) * (100 + (imp.layer_in_owner_matrix - 1) * 50)  -- +50 USDC per level
    END as potential_rewards_usdc
FROM individual_matrix_placements imp
LEFT JOIN users owner_u ON LOWER(imp.matrix_owner) = LOWER(owner_u.wallet_address)
LEFT JOIN users member_u ON LOWER(imp.member_wallet) = LOWER(member_u.wallet_address)
WHERE imp.is_active = true
GROUP BY imp.matrix_owner, owner_u.username, imp.layer_in_owner_matrix
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix;

-- Step 5: Show results
SELECT 
    '=== INDIVIDUAL MATRIX LAYER SUMMARY ===' as section;

SELECT 
    matrix_owner_name,
    'Layer ' || layer_in_owner_matrix as layer,
    members_in_layer || ' members' as count,
    members_list,
    potential_rewards_usdc || ' USDC potential' as rewards
FROM individual_matrix_layer_summary
WHERE layer_in_owner_matrix <= 5  -- Show first 5 layers
ORDER BY matrix_owner_name, layer_in_owner_matrix;

-- Final summary
DO $$
DECLARE
    total_owners INTEGER;
    total_placements INTEGER;
    max_layer INTEGER;
BEGIN
    SELECT 
        COUNT(DISTINCT matrix_owner),
        COUNT(*),
        MAX(layer_in_owner_matrix)
    INTO total_owners, total_placements, max_layer
    FROM individual_matrix_placements 
    WHERE is_active = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== CORRECTED INDIVIDUAL MATRIX SUMMARY ===';
    RAISE NOTICE 'Total matrix owners: %', total_owners;
    RAISE NOTICE 'Total member placements: %', total_placements;
    RAISE NOTICE 'Maximum layer depth: %', max_layer;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Individual matrix now correctly tracks Layer 1-19 hierarchy!';
    RAISE NOTICE 'No more L/M/R positions - focus is on layer-based rewards system.';
    RAISE NOTICE '';
    RAISE NOTICE 'Each member can earn rewards when their downlines activate:';
    RAISE NOTICE '- Layer 1 activations: 100 USDC each';
    RAISE NOTICE '- Layer 2 activations: 150 USDC each';
    RAISE NOTICE '- Layer 3 activations: 200 USDC each';
    RAISE NOTICE '- And so on up to Layer 19...';
END $$;