-- Fix individual_matrix_placements to respect strict 3x3 matrix structure
-- Layer 1: max 3 members, Layer 2: max 9 members, Layer 3: max 27 members, etc.
-- Based on MarketingPlan.md: Each member maintains their own 19-layer matrix with 3^n capacity per layer

-- Step 1: Clear and rebuild with proper 3x3 matrix structure
DELETE FROM individual_matrix_placements;

-- Step 2: Create function to properly place members in 3x3 matrix with spillover
CREATE OR REPLACE FUNCTION place_members_in_3x3_matrix()
RETURNS VOID AS $$
DECLARE
    matrix_owner_rec RECORD;
    member_rec RECORD;
    current_layer INTEGER;
    members_in_layer INTEGER;
    max_capacity INTEGER;
    placement_order INTEGER;
BEGIN
    RAISE NOTICE 'Rebuilding individual matrices with strict 3x3 structure...';
    
    -- For each potential matrix owner
    FOR matrix_owner_rec IN 
        SELECT DISTINCT 
            u.wallet_address as matrix_owner,
            u.username as owner_name,
            u.created_at
        FROM users u
        WHERE EXISTS (
            SELECT 1 FROM users u2 
            WHERE LOWER(u2.referrer_wallet) = LOWER(u.wallet_address)
        ) OR EXISTS (
            SELECT 1 FROM referrals r 
            WHERE LOWER(r.matrix_parent) = LOWER(u.wallet_address)
        )
        ORDER BY u.created_at
    LOOP
        RAISE NOTICE 'Processing 3x3 matrix for: %', matrix_owner_rec.owner_name;
        
        placement_order := 0;
        
        -- Get all members that should be in this matrix owner's individual matrix
        -- Sort by placement time for consistent ordering
        FOR member_rec IN 
            -- Direct referrals
            SELECT DISTINCT
                u_member.wallet_address as member_wallet,
                COALESCE(m_member.created_at, u_member.created_at) as placed_at,
                'direct_referral' as source_type,
                1 as priority -- Direct referrals get priority
            FROM users u_member
            LEFT JOIN members m_member ON LOWER(m_member.wallet_address) = LOWER(u_member.wallet_address)
            WHERE LOWER(u_member.referrer_wallet) = LOWER(matrix_owner_rec.matrix_owner)
            AND u_member.wallet_address != matrix_owner_rec.matrix_owner
            
            UNION ALL
            
            -- Spillover from referrals table
            SELECT DISTINCT
                r.member_wallet,
                r.placed_at,
                'spillover' as source_type,
                2 as priority -- Spillovers come after direct referrals
            FROM referrals r
            WHERE LOWER(r.matrix_parent) = LOWER(matrix_owner_rec.matrix_owner)
            AND r.is_active = true
            AND r.member_wallet != matrix_owner_rec.matrix_owner
            AND NOT EXISTS (
                -- Avoid duplicates with direct referrals
                SELECT 1 FROM users u_check 
                WHERE LOWER(u_check.wallet_address) = LOWER(r.member_wallet)
                AND LOWER(u_check.referrer_wallet) = LOWER(matrix_owner_rec.matrix_owner)
            )
            
            ORDER BY priority, placed_at
        LOOP
            placement_order := placement_order + 1;
            
            -- Determine which layer this member goes to based on 3^n capacity
            current_layer := 1;
            
            WHILE current_layer <= 19 LOOP
                -- Calculate max capacity for this layer: 3^layer
                max_capacity := POWER(3, current_layer);
                
                -- Count how many members are already in this layer for this matrix owner
                SELECT COUNT(*) INTO members_in_layer
                FROM individual_matrix_placements
                WHERE matrix_owner = matrix_owner_rec.matrix_owner
                AND layer_in_owner_matrix = current_layer
                AND is_active = true;
                
                -- If there's space in this layer, place the member here
                IF members_in_layer < max_capacity THEN
                    INSERT INTO individual_matrix_placements (
                        matrix_owner,
                        member_wallet,
                        layer_in_owner_matrix,
                        position_in_layer,
                        placed_at,
                        is_active
                    ) VALUES (
                        matrix_owner_rec.matrix_owner,
                        member_rec.member_wallet,
                        current_layer,
                        NULL, -- We'll assign L/M/R positions later if needed
                        member_rec.placed_at,
                        true
                    );
                    
                    RAISE NOTICE '  Placed % in Layer % (% of % capacity)', 
                        (SELECT COALESCE(username, SUBSTRING(member_rec.member_wallet, 1, 8)) FROM users WHERE wallet_address = member_rec.member_wallet),
                        current_layer,
                        members_in_layer + 1,
                        max_capacity;
                    
                    EXIT; -- Successfully placed, move to next member
                END IF;
                
                -- Layer is full, try next layer
                current_layer := current_layer + 1;
            END LOOP;
            
            -- If we couldn't place in any layer (shouldn't happen with 19 layers)
            IF current_layer > 19 THEN
                RAISE NOTICE '  WARNING: Could not place % - all layers full!', 
                    (SELECT COALESCE(username, SUBSTRING(member_rec.member_wallet, 1, 8)) FROM users WHERE wallet_address = member_rec.member_wallet);
            END IF;
        END LOOP;
        
    END LOOP;
    
    RAISE NOTICE 'Completed 3x3 matrix structure rebuild!';
END;
$$ LANGUAGE plpgsql;

-- Step 3: Execute the placement function
SELECT place_members_in_3x3_matrix();

-- Step 4: Verify the 3x3 structure is correct
SELECT 
    '=== 3x3 MATRIX STRUCTURE VERIFICATION ===' as section_title;

-- Show layer capacity compliance
SELECT 
    COALESCE(owner_u.username, 'Unknown') as matrix_owner_name,
    imp.layer_in_owner_matrix,
    COUNT(*) as members_count,
    POWER(3, imp.layer_in_owner_matrix)::integer as max_capacity,
    CASE 
        WHEN COUNT(*) <= POWER(3, imp.layer_in_owner_matrix)::integer THEN '✅ VALID'
        ELSE '❌ EXCEEDS CAPACITY'
    END as capacity_status,
    STRING_AGG(
        COALESCE(member_u.username, SUBSTRING(imp.member_wallet, 1, 8)),
        ', ' ORDER BY imp.placed_at
    ) as members_in_layer,
    -- Potential Layer Rewards (NFT price per activation)
    CASE imp.layer_in_owner_matrix
        WHEN 1 THEN COUNT(*) * 100
        WHEN 2 THEN COUNT(*) * 150
        WHEN 3 THEN COUNT(*) * 200
        ELSE COUNT(*) * (100 + (imp.layer_in_owner_matrix - 1) * 50)
    END as potential_layer_rewards_usdc
FROM individual_matrix_placements imp
LEFT JOIN users owner_u ON LOWER(imp.matrix_owner) = LOWER(owner_u.wallet_address)
LEFT JOIN users member_u ON LOWER(imp.member_wallet) = LOWER(member_u.wallet_address)
WHERE imp.is_active = true
GROUP BY imp.matrix_owner, owner_u.username, imp.layer_in_owner_matrix
ORDER BY owner_u.username, imp.layer_in_owner_matrix;

-- Step 5: Show detailed member assignments
SELECT 
    '=== DETAILED MEMBER ASSIGNMENTS ===' as section_title;

SELECT 
    COALESCE(owner_u.username, 'Unknown') as matrix_owner,
    'Layer ' || imp.layer_in_owner_matrix || '/' || POWER(3, imp.layer_in_owner_matrix) as layer_capacity,
    COALESCE(member_u.username, SUBSTRING(imp.member_wallet, 1, 10)) as member_name,
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
ORDER BY owner_u.username, imp.layer_in_owner_matrix, imp.placed_at;

-- Final validation summary
DO $$
DECLARE
    total_owners INTEGER;
    total_placements INTEGER;
    invalid_layers INTEGER;
    layer_1_owners INTEGER;
    layer_2_owners INTEGER;
    layer_3_owners INTEGER;
BEGIN
    -- Count totals
    SELECT 
        COUNT(DISTINCT matrix_owner),
        COUNT(*)
    INTO total_owners, total_placements
    FROM individual_matrix_placements 
    WHERE is_active = true;
    
    -- Count invalid layers (exceeding 3^n capacity)
    SELECT COUNT(*) INTO invalid_layers
    FROM (
        SELECT 
            matrix_owner, 
            layer_in_owner_matrix,
            COUNT(*) as members,
            POWER(3, layer_in_owner_matrix)::integer as max_cap
        FROM individual_matrix_placements 
        WHERE is_active = true
        GROUP BY matrix_owner, layer_in_owner_matrix
        HAVING COUNT(*) > POWER(3, layer_in_owner_matrix)::integer
    ) violations;
    
    -- Count owners with members in each layer
    SELECT 
        COUNT(DISTINCT CASE WHEN layer_in_owner_matrix = 1 THEN matrix_owner END),
        COUNT(DISTINCT CASE WHEN layer_in_owner_matrix = 2 THEN matrix_owner END),
        COUNT(DISTINCT CASE WHEN layer_in_owner_matrix = 3 THEN matrix_owner END)
    INTO layer_1_owners, layer_2_owners, layer_3_owners
    FROM individual_matrix_placements
    WHERE is_active = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== FINAL 3x3 MATRIX VALIDATION ===';
    RAISE NOTICE 'Total matrix owners: %', total_owners;
    RAISE NOTICE 'Total member placements: %', total_placements;
    RAISE NOTICE 'Invalid layer violations: %', invalid_layers;
    RAISE NOTICE 'Owners with Layer 1 members: %', layer_1_owners;
    RAISE NOTICE 'Owners with Layer 2 members: %', layer_2_owners;
    RAISE NOTICE 'Owners with Layer 3 members: %', layer_3_owners;
    RAISE NOTICE '';
    
    IF invalid_layers = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All layers respect 3^n capacity limits!';
        RAISE NOTICE 'Matrix structure now correctly follows MarketingPlan.md specifications.';
    ELSE
        RAISE NOTICE '❌ ERROR: % layers exceed capacity limits!', invalid_layers;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Layer capacity limits:';
    RAISE NOTICE '- Layer 1: max 3 members (3^1)';
    RAISE NOTICE '- Layer 2: max 9 members (3^2)';
    RAISE NOTICE '- Layer 3: max 27 members (3^3)';
    RAISE NOTICE '- ... up to Layer 19: max % members (3^19)', POWER(3, 19)::bigint;
END $$;