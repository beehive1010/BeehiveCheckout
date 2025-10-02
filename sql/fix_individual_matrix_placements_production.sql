-- Production-ready fix for individual_matrix_placements table
-- This script fixes the L→M→R position assignment logic
-- Based on the 3x3 matrix system described in MarketingPlan.md

-- Step 1: Create individual_matrix_placements table if it doesn't exist
DO $$
BEGIN
    -- Only proceed if we have the required tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        RAISE NOTICE 'Warning: users table does not exist. This script requires existing schema.';
        RETURN;
    END IF;
    
    -- Create the table
    DROP TABLE IF EXISTS individual_matrix_placements CASCADE;
    
    CREATE TABLE individual_matrix_placements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        matrix_owner TEXT NOT NULL,
        member_wallet TEXT NOT NULL,
        layer_in_owner_matrix INTEGER NOT NULL CHECK (layer_in_owner_matrix >= 1 AND layer_in_owner_matrix <= 19),
        position_in_layer TEXT CHECK (position_in_layer IN ('L', 'M', 'R')),
        placed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        is_active BOOLEAN DEFAULT true,
        original_referrer TEXT, 
        placement_type TEXT CHECK (placement_type IN ('direct_referral', 'spillover', 'recursive_placement')),
        placement_order INTEGER, -- Order within the layer for L→M→R sequencing
        
        CONSTRAINT unique_member_per_owner_matrix UNIQUE (matrix_owner, member_wallet)
    );
    
    -- Add indexes for better performance
    CREATE INDEX idx_individual_matrix_owner ON individual_matrix_placements(matrix_owner);
    CREATE INDEX idx_individual_matrix_layer ON individual_matrix_placements(layer_in_owner_matrix);
    CREATE INDEX idx_individual_matrix_position ON individual_matrix_placements(position_in_layer);
    CREATE INDEX idx_individual_matrix_active ON individual_matrix_placements(is_active);
    
    RAISE NOTICE 'Created individual_matrix_placements table with proper structure';
END $$;

-- Step 2: Create function to get next available L→M→R position
CREATE OR REPLACE FUNCTION get_next_lmr_position(
    p_matrix_owner TEXT, 
    p_layer INTEGER
) RETURNS TEXT AS $$
DECLARE
    l_count INTEGER := 0;
    m_count INTEGER := 0;
    r_count INTEGER := 0;
    max_per_position INTEGER;
BEGIN
    -- Calculate max positions per position type for this layer
    -- Layer 1: 1 each (L,M,R) = 3 total
    -- Layer 2: 3 each (L,M,R) = 9 total  
    -- Layer 3: 9 each (L,M,R) = 27 total
    max_per_position := POWER(3, p_layer - 1);
    
    -- Count existing positions in this layer for this matrix owner
    SELECT 
        COALESCE(COUNT(*) FILTER (WHERE position_in_layer = 'L'), 0),
        COALESCE(COUNT(*) FILTER (WHERE position_in_layer = 'M'), 0),
        COALESCE(COUNT(*) FILTER (WHERE position_in_layer = 'R'), 0)
    INTO l_count, m_count, r_count
    FROM individual_matrix_placements 
    WHERE matrix_owner = p_matrix_owner 
    AND layer_in_owner_matrix = p_layer 
    AND is_active = true;
    
    -- Return next available position following L→M→R priority
    IF l_count < max_per_position THEN
        RETURN 'L';
    ELSIF m_count < max_per_position THEN
        RETURN 'M';
    ELSIF r_count < max_per_position THEN
        RETURN 'R';
    ELSE
        RETURN NULL; -- Layer is full
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create function to populate matrix with correct L→M→R logic
CREATE OR REPLACE FUNCTION populate_individual_matrix_lmr()
RETURNS VOID AS $$
DECLARE
    member_rec RECORD;
    next_position TEXT;
    placement_order_counter INTEGER;
    processed_count INTEGER := 0;
BEGIN
    -- Clear existing data
    DELETE FROM individual_matrix_placements;
    
    -- Method 1: Process direct referrals (members table referrer_wallet)
    -- These become Layer 1 in their referrer's individual matrix
    FOR member_rec IN 
        SELECT DISTINCT
            u_referrer.wallet_address as matrix_owner,
            u_member.wallet_address as member_wallet,
            COALESCE(m_member.created_at, u_member.created_at) as placed_at,
            u_referrer.wallet_address as original_referrer,
            'direct_referral' as placement_type
        FROM users u_referrer
        JOIN users u_member ON LOWER(u_member.referrer_wallet) = LOWER(u_referrer.wallet_address)
        LEFT JOIN members m_member ON LOWER(m_member.wallet_address) = LOWER(u_member.wallet_address)
        WHERE u_member.referrer_wallet IS NOT NULL
        AND u_referrer.wallet_address != u_member.wallet_address
        ORDER BY COALESCE(m_member.created_at, u_member.created_at)
    LOOP
        -- Get next available position in Layer 1 for this matrix owner
        next_position := get_next_lmr_position(member_rec.matrix_owner, 1);
        
        IF next_position IS NOT NULL THEN
            -- Get placement order
            SELECT COALESCE(MAX(placement_order), 0) + 1 
            INTO placement_order_counter
            FROM individual_matrix_placements 
            WHERE matrix_owner = member_rec.matrix_owner 
            AND layer_in_owner_matrix = 1;
            
            INSERT INTO individual_matrix_placements (
                matrix_owner,
                member_wallet,
                layer_in_owner_matrix,
                position_in_layer,
                placed_at,
                original_referrer,
                placement_type,
                placement_order
            ) VALUES (
                member_rec.matrix_owner,
                member_rec.member_wallet,
                1,
                next_position,
                member_rec.placed_at,
                member_rec.original_referrer,
                member_rec.placement_type,
                placement_order_counter
            );
            
            processed_count := processed_count + 1;
        END IF;
    END LOOP;
    
    -- Method 2: Process referrals table data for spillover placements
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referrals') THEN
        FOR member_rec IN 
            SELECT DISTINCT
                COALESCE(r.parent_wallet, r.matrix_parent) as matrix_owner,
                r.member_wallet,
                LEAST(COALESCE(r.layer, r.matrix_layer, 1), 19) as target_layer,
                r.created_at as placed_at,
                COALESCE(r.placer_wallet, r.member_wallet) as original_referrer,
                CASE 
                    WHEN r.placement_type = 'direct' THEN 'direct_referral'
                    ELSE 'spillover'
                END as placement_type
            FROM referrals r
            WHERE COALESCE(r.parent_wallet, r.matrix_parent) IS NOT NULL
            AND COALESCE(r.is_active, true) = true
            AND NOT EXISTS (
                SELECT 1 FROM individual_matrix_placements imp 
                WHERE LOWER(imp.matrix_owner) = LOWER(COALESCE(r.parent_wallet, r.matrix_parent))
                AND LOWER(imp.member_wallet) = LOWER(r.member_wallet)
            )
            ORDER BY r.created_at
        LOOP
            -- Try to place in target layer first
            next_position := get_next_lmr_position(member_rec.matrix_owner, member_rec.target_layer);
            
            IF next_position IS NOT NULL THEN
                SELECT COALESCE(MAX(placement_order), 0) + 1 
                INTO placement_order_counter
                FROM individual_matrix_placements 
                WHERE matrix_owner = member_rec.matrix_owner 
                AND layer_in_owner_matrix = member_rec.target_layer;
                
                INSERT INTO individual_matrix_placements (
                    matrix_owner,
                    member_wallet,
                    layer_in_owner_matrix,
                    position_in_layer,
                    placed_at,
                    original_referrer,
                    placement_type,
                    placement_order
                ) VALUES (
                    member_rec.matrix_owner,
                    member_rec.member_wallet,
                    member_rec.target_layer,
                    next_position,
                    member_rec.placed_at,
                    member_rec.original_referrer,
                    member_rec.placement_type,
                    placement_order_counter
                ) ON CONFLICT (matrix_owner, member_wallet) DO NOTHING;
                
                processed_count := processed_count + 1;
            ELSE
                -- If target layer is full, find next available layer
                FOR layer_check IN (member_rec.target_layer + 1)..19 LOOP
                    next_position := get_next_lmr_position(member_rec.matrix_owner, layer_check);
                    
                    IF next_position IS NOT NULL THEN
                        SELECT COALESCE(MAX(placement_order), 0) + 1 
                        INTO placement_order_counter
                        FROM individual_matrix_placements 
                        WHERE matrix_owner = member_rec.matrix_owner 
                        AND layer_in_owner_matrix = layer_check;
                        
                        INSERT INTO individual_matrix_placements (
                            matrix_owner,
                            member_wallet,
                            layer_in_owner_matrix,
                            position_in_layer,
                            placed_at,
                            original_referrer,
                            placement_type,
                            placement_order
                        ) VALUES (
                            member_rec.matrix_owner,
                            member_rec.member_wallet,
                            layer_check,
                            next_position,
                            member_rec.placed_at,
                            member_rec.original_referrer,
                            'spillover',
                            placement_order_counter
                        ) ON CONFLICT (matrix_owner, member_wallet) DO NOTHING;
                        
                        processed_count := processed_count + 1;
                        EXIT; -- Found a spot, exit layer loop
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;
    
    RAISE NOTICE 'Processed % member placements with L→M→R logic', processed_count;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create summary view
CREATE OR REPLACE VIEW individual_matrix_summary AS
SELECT 
    imp.matrix_owner,
    COALESCE(owner_u.username, imp.matrix_owner) as matrix_owner_name,
    imp.layer_in_owner_matrix,
    COUNT(*) as filled_positions,
    POWER(3, imp.layer_in_owner_matrix)::integer as max_layer_positions,
    
    -- L→M→R breakdown
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'L') as l_positions,
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'M') as m_positions,
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'R') as r_positions,
    
    -- Max per position type
    POWER(3, imp.layer_in_owner_matrix - 1)::integer as max_per_position,
    
    -- Status
    CASE 
        WHEN COUNT(*) = POWER(3, imp.layer_in_owner_matrix)::integer THEN 'FULL'
        WHEN COUNT(*) FILTER (WHERE imp.position_in_layer = 'R') > 0 THEN 'FILLING R'
        WHEN COUNT(*) FILTER (WHERE imp.position_in_layer = 'M') > 0 THEN 'FILLING M'
        ELSE 'FILLING L'
    END as layer_status
    
FROM individual_matrix_placements imp
LEFT JOIN users owner_u ON LOWER(imp.matrix_owner) = LOWER(owner_u.wallet_address)
WHERE imp.is_active = true
GROUP BY imp.matrix_owner, owner_u.username, imp.layer_in_owner_matrix
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix;

-- Step 5: Execute the population
SELECT populate_individual_matrix_lmr();

-- Step 6: Show results
SELECT 
    'Matrix Owner: ' || matrix_owner_name || 
    ' | Layer ' || layer_in_owner_matrix || 
    ' | L:' || l_positions || '/' || max_per_position ||
    ' M:' || m_positions || '/' || max_per_position ||
    ' R:' || r_positions || '/' || max_per_position ||
    ' | Status: ' || layer_status as matrix_summary
FROM individual_matrix_summary
WHERE layer_in_owner_matrix <= 3  -- Show first 3 layers
ORDER BY matrix_owner, layer_in_owner_matrix;

-- Final summary
DO $$
DECLARE
    total_placements INTEGER;
    total_owners INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(DISTINCT matrix_owner) 
    INTO total_placements, total_owners
    FROM individual_matrix_placements 
    WHERE is_active = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== SUMMARY ===';
    RAISE NOTICE 'Total matrix owners: %', total_owners;
    RAISE NOTICE 'Total member placements: %', total_placements;
    RAISE NOTICE 'L→M→R logic implemented successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Views created:';
    RAISE NOTICE '- individual_matrix_summary: Shows L→M→R distribution per layer';
    RAISE NOTICE '- individual_matrix_placements: Detailed placement data';
END $$;