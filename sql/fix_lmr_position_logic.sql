-- Fix L→M→R position assignment logic in individual_matrix_placements
-- This script corrects the position assignment to properly fill L, then M, then R positions
-- Based on the 3x3 matrix system with proper spillover logic

DO $$
BEGIN
    -- Check if tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE '⚠️  Database appears to be empty. Please run initial schema setup first.';
        RETURN;
    END IF;
    
    RAISE NOTICE '🔧 Fixing L→M→R position assignment logic...';
    
    -- Drop existing table if it exists
    DROP TABLE IF EXISTS individual_matrix_placements CASCADE;
    
    -- Create the individual_matrix_placements table
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
        
        CONSTRAINT unique_member_per_owner_matrix UNIQUE (matrix_owner, member_wallet),
        CONSTRAINT valid_layer CHECK (layer_in_owner_matrix >= 1 AND layer_in_owner_matrix <= 19)
    );
    
    -- Add foreign key constraints if tables exist
    ALTER TABLE individual_matrix_placements 
    ADD CONSTRAINT fk_matrix_owner 
    FOREIGN KEY (matrix_owner) REFERENCES users(wallet_address);
    
    ALTER TABLE individual_matrix_placements 
    ADD CONSTRAINT fk_member_wallet 
    FOREIGN KEY (member_wallet) REFERENCES users(wallet_address);
    
    ALTER TABLE individual_matrix_placements 
    ADD CONSTRAINT fk_original_referrer 
    FOREIGN KEY (original_referrer) REFERENCES users(wallet_address);
    
    RAISE NOTICE '✅ Created individual_matrix_placements table with proper L→M→R logic';
END $$;

-- Function to get the next available position (L, M, or R) for a given layer
CREATE OR REPLACE FUNCTION get_next_position_in_layer(
    p_matrix_owner TEXT, 
    p_layer INTEGER
) RETURNS TEXT AS $$
DECLARE
    l_count INTEGER;
    m_count INTEGER;
    r_count INTEGER;
BEGIN
    -- Count existing positions in this layer
    SELECT 
        COUNT(*) FILTER (WHERE position_in_layer = 'L'),
        COUNT(*) FILTER (WHERE position_in_layer = 'M'),
        COUNT(*) FILTER (WHERE position_in_layer = 'R')
    INTO l_count, m_count, r_count
    FROM individual_matrix_placements 
    WHERE matrix_owner = p_matrix_owner 
    AND layer_in_owner_matrix = p_layer 
    AND is_active = true;
    
    -- Max positions per position type in each layer = 3^(layer-1)
    DECLARE max_per_position INTEGER := POWER(3, p_layer - 1);
    
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

-- Function to populate individual matrix placements with correct L→M→R logic
CREATE OR REPLACE FUNCTION populate_matrix_with_lmr_logic()
RETURNS VOID AS $$
DECLARE
    member_rec RECORD;
    owner_rec RECORD;
    current_layer INTEGER;
    next_position TEXT;
    placement_order_counter INTEGER;
BEGIN
    RAISE NOTICE '📊 Populating individual matrix with L→M→R logic...';
    
    -- Clear existing data
    DELETE FROM individual_matrix_placements;
    
    -- Step 1: Process direct referrals first (they become Layer 1 in referrer's matrix)
    RAISE NOTICE '  Processing direct referrals as Layer 1...';
    
    FOR member_rec IN 
        SELECT DISTINCT
            m_referrer.wallet_address as matrix_owner,
            m_member.wallet_address as member_wallet,
            m_member.created_at as placed_at,
            m_referrer.wallet_address as original_referrer
        FROM members m_referrer
        JOIN members m_member ON m_member.referrer_wallet = m_referrer.wallet_address
        WHERE m_member.is_activated = true
        AND m_referrer.is_activated = true
        ORDER BY m_member.created_at -- Process in chronological order
    LOOP
        -- Get next available position in Layer 1 for this matrix owner
        next_position := get_next_position_in_layer(member_rec.matrix_owner, 1);
        
        IF next_position IS NOT NULL THEN
            -- Get the placement order within this layer
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
                'direct_referral',
                placement_order_counter
            );
            
            RAISE NOTICE '    Placed % in % position Layer 1 of %', 
                (SELECT username FROM users WHERE wallet_address = member_rec.member_wallet),
                next_position,
                (SELECT username FROM users WHERE wallet_address = member_rec.matrix_owner);
        END IF;
    END LOOP;
    
    -- Step 2: Process spillover placements from referrals table
    RAISE NOTICE '  Processing spillover placements...';
    
    FOR member_rec IN 
        SELECT DISTINCT
            COALESCE(r.matrix_parent, r.parent_wallet) as matrix_owner,
            r.member_wallet,
            LEAST(COALESCE(r.matrix_layer, r.layer, 1), 19) as target_layer,
            r.created_at as placed_at,
            COALESCE(r.placer_wallet, r.member_wallet) as original_referrer,
            CASE 
                WHEN r.placement_type = 'direct' THEN 'direct_referral'
                ELSE 'spillover'
            END as placement_type
        FROM referrals r
        WHERE r.parent_wallet IS NOT NULL
        AND r.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM individual_matrix_placements imp 
            WHERE imp.matrix_owner = COALESCE(r.matrix_parent, r.parent_wallet)
            AND imp.member_wallet = r.member_wallet
        )
        ORDER BY r.created_at
    LOOP
        -- Get next available position in the target layer
        next_position := get_next_position_in_layer(member_rec.matrix_owner, member_rec.target_layer);
        
        IF next_position IS NOT NULL THEN
            -- Get the placement order within this layer
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
            
            RAISE NOTICE '    Spillover: Placed % in % position Layer % of %', 
                (SELECT username FROM users WHERE wallet_address = member_rec.member_wallet),
                next_position,
                member_rec.target_layer,
                (SELECT username FROM users WHERE wallet_address = member_rec.matrix_owner);
        ELSE
            -- If target layer is full, try to place in next layer
            FOR current_layer IN (member_rec.target_layer + 1)..19 LOOP
                next_position := get_next_position_in_layer(member_rec.matrix_owner, current_layer);
                
                IF next_position IS NOT NULL THEN
                    SELECT COALESCE(MAX(placement_order), 0) + 1 
                    INTO placement_order_counter
                    FROM individual_matrix_placements 
                    WHERE matrix_owner = member_rec.matrix_owner 
                    AND layer_in_owner_matrix = current_layer;
                    
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
                        current_layer,
                        next_position,
                        member_rec.placed_at,
                        member_rec.original_referrer,
                        'spillover',
                        placement_order_counter
                    ) ON CONFLICT (matrix_owner, member_wallet) DO NOTHING;
                    
                    RAISE NOTICE '    Spillover to Layer %: Placed % in % position of %', 
                        current_layer,
                        (SELECT username FROM users WHERE wallet_address = member_rec.member_wallet),
                        next_position,
                        (SELECT username FROM users WHERE wallet_address = member_rec.matrix_owner);
                    
                    EXIT; -- Found a spot, exit the layer loop
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Completed L→M→R matrix placement logic';
END;
$$ LANGUAGE plpgsql;

-- Create improved summary view that shows L→M→R distribution
CREATE OR REPLACE VIEW individual_matrix_lmr_summary AS
SELECT 
    imp.matrix_owner,
    owner_u.username as matrix_owner_username,
    imp.layer_in_owner_matrix,
    COUNT(*) as total_filled_positions,
    POWER(3, imp.layer_in_owner_matrix)::integer as max_positions_for_layer,
    
    -- L→M→R position breakdown
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'L') as l_positions,
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'M') as m_positions,
    COUNT(*) FILTER (WHERE imp.position_in_layer = 'R') as r_positions,
    
    -- Show which positions are filled
    STRING_AGG(
        CASE 
            WHEN imp.position_in_layer = 'L' THEN 'L'
            WHEN imp.position_in_layer = 'M' THEN 'M' 
            WHEN imp.position_in_layer = 'R' THEN 'R'
        END, 
        ', ' ORDER BY imp.placement_order
    ) as filled_positions_sequence,
    
    -- Max positions per position type in this layer
    POWER(3, imp.layer_in_owner_matrix - 1)::integer as max_per_position_type,
    
    -- Fill percentages
    ROUND((COUNT(*) FILTER (WHERE imp.position_in_layer = 'L')::numeric / POWER(3, imp.layer_in_owner_matrix - 1)::numeric * 100), 1) as l_fill_percentage,
    ROUND((COUNT(*) FILTER (WHERE imp.position_in_layer = 'M')::numeric / POWER(3, imp.layer_in_owner_matrix - 1)::numeric * 100), 1) as m_fill_percentage,
    ROUND((COUNT(*) FILTER (WHERE imp.position_in_layer = 'R')::numeric / POWER(3, imp.layer_in_owner_matrix - 1)::numeric * 100), 1) as r_fill_percentage
    
FROM individual_matrix_placements imp
JOIN users owner_u ON imp.matrix_owner = owner_u.wallet_address
WHERE imp.is_active = true
GROUP BY imp.matrix_owner, owner_u.username, imp.layer_in_owner_matrix
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix;

-- Execute the population function
SELECT populate_matrix_with_lmr_logic();

-- Show results
SELECT 
    '=== Individual Matrix L→M→R Summary ===' as section_title
UNION ALL
SELECT 
    matrix_owner_username || ' Layer ' || layer_in_owner_matrix || ': ' ||
    'L(' || l_positions || '/' || max_per_position_type || ') ' ||
    'M(' || m_positions || '/' || max_per_position_type || ') ' ||
    'R(' || r_positions || '/' || max_per_position_type || ') ' ||
    '= ' || filled_positions_sequence
FROM individual_matrix_lmr_summary
WHERE layer_in_owner_matrix <= 3 -- Show first 3 layers
ORDER BY matrix_owner_username, layer_in_owner_matrix;

RAISE NOTICE '';
RAISE NOTICE '✅ L→M→R position assignment logic has been fixed!';
RAISE NOTICE '';
RAISE NOTICE '🎯 Key Improvements:';
RAISE NOTICE '  ✅ Proper L→M→R sequential positioning';
RAISE NOTICE '  ✅ Correct spillover logic when positions are full';
RAISE NOTICE '  ✅ Placement order tracking within each layer';
RAISE NOTICE '  ✅ Position-specific capacity limits (3^(layer-1) per position)';
RAISE NOTICE '';
RAISE NOTICE '💡 Views available:';
RAISE NOTICE '  - individual_matrix_lmr_summary: Shows L→M→R distribution';
RAISE NOTICE '  - individual_matrix_placements: Detailed placement data';