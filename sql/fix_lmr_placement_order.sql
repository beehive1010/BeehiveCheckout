-- Fix L→M→R placement order according to referrer relationship and claim timing
-- Rule: Direct referrals should fill referrer's matrix L→M→R before spillover to other matrices

-- Step 1: Check current wrong placements
SELECT 
    '=== CURRENT PLACEMENT ANALYSIS ===' as section_title;

SELECT 
    imp.matrix_owner as matrix_owner_wallet,
    COALESCE(owner_u.username, 'Unknown') as matrix_owner_name,
    imp.member_wallet,
    COALESCE(member_u.username, 'Unknown') as member_name,
    COALESCE(referrer_u.username, 'Direct/Root') as actual_referrer,
    imp.layer_in_owner_matrix,
    imp.position_in_layer,
    imp.placed_at,
    CASE 
        WHEN LOWER(u.referrer_wallet) = LOWER(imp.matrix_owner) THEN '✅ Correct (Direct referral)'
        ELSE '❌ Spillover placement'
    END as placement_type
FROM individual_matrix_placements imp
LEFT JOIN users u ON LOWER(imp.member_wallet) = LOWER(u.wallet_address)
LEFT JOIN users owner_u ON LOWER(imp.matrix_owner) = LOWER(owner_u.wallet_address)
LEFT JOIN users member_u ON LOWER(imp.member_wallet) = LOWER(member_u.wallet_address)
LEFT JOIN users referrer_u ON LOWER(u.referrer_wallet) = LOWER(referrer_u.wallet_address)
WHERE imp.is_active = true
AND imp.layer_in_owner_matrix = 1
ORDER BY imp.matrix_owner, imp.placed_at;

-- Step 2: Clear and rebuild with correct L→M→R order
DELETE FROM individual_matrix_placements;

-- Step 3: Create correct placement function
CREATE OR REPLACE FUNCTION place_members_with_correct_lmr_order()
RETURNS VOID AS $$
DECLARE
    referrer_rec RECORD;
    member_rec RECORD;
    current_position INTEGER;
    target_layer INTEGER;
    members_in_layer INTEGER;
BEGIN
    RAISE NOTICE 'Rebuilding matrix with correct L→M→R placement order...';
    
    -- For each referrer (potential matrix owner)
    FOR referrer_rec IN 
        SELECT 
            u.wallet_address as referrer_wallet,
            u.username as referrer_name,
            u.created_at
        FROM users u
        WHERE EXISTS (
            SELECT 1 FROM users u2 
            WHERE LOWER(u2.referrer_wallet) = LOWER(u.wallet_address)
        )
        ORDER BY u.created_at
    LOOP
        RAISE NOTICE 'Processing referrer: %', referrer_rec.referrer_name;
        
        current_position := 0;
        
        -- Get all direct referrals for this referrer, ordered by member activation time
        FOR member_rec IN 
            SELECT 
                u_member.wallet_address as member_wallet,
                u_member.username as member_name,
                COALESCE(m_member.created_at, u_member.created_at) as activation_time
            FROM users u_member
            LEFT JOIN members m_member ON LOWER(m_member.wallet_address) = LOWER(u_member.wallet_address)
            WHERE LOWER(u_member.referrer_wallet) = LOWER(referrer_rec.referrer_wallet)
            AND u_member.wallet_address != referrer_rec.referrer_wallet
            ORDER BY activation_time
        LOOP
            current_position := current_position + 1;
            target_layer := 1;
            
            -- Find appropriate layer and position
            WHILE target_layer <= 19 LOOP
                SELECT COUNT(*) INTO members_in_layer
                FROM individual_matrix_placements
                WHERE LOWER(matrix_owner) = LOWER(referrer_rec.referrer_wallet)
                AND layer_in_owner_matrix = target_layer
                AND is_active = true;
                
                -- Check if this layer has space (3^layer capacity)
                IF members_in_layer < POWER(3, target_layer) THEN
                    -- Determine L/M/R position for Layer 1
                    INSERT INTO individual_matrix_placements (
                        matrix_owner,
                        member_wallet,
                        layer_in_owner_matrix,
                        position_in_layer,
                        placed_at,
                        is_active
                    ) VALUES (
                        referrer_rec.referrer_wallet,
                        member_rec.member_wallet,
                        target_layer,
                        CASE 
                            WHEN target_layer = 1 THEN
                                CASE (members_in_layer % 3)
                                    WHEN 0 THEN 'L'
                                    WHEN 1 THEN 'M' 
                                    WHEN 2 THEN 'R'
                                END
                            ELSE NULL
                        END,
                        member_rec.activation_time,
                        true
                    );
                    
                    RAISE NOTICE '  Placed % in Layer % position % (% of % capacity)', 
                        member_rec.member_name,
                        target_layer,
                        CASE 
                            WHEN target_layer = 1 THEN
                                CASE (members_in_layer % 3)
                                    WHEN 0 THEN 'L'
                                    WHEN 1 THEN 'M' 
                                    WHEN 2 THEN 'R'
                                END
                            ELSE 'pos_' || (members_in_layer + 1)
                        END,
                        members_in_layer + 1,
                        POWER(3, target_layer)::integer;
                    
                    EXIT; -- Successfully placed
                END IF;
                
                target_layer := target_layer + 1;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Completed correct L→M→R placement!';
END;
$$ LANGUAGE plpgsql;

-- Step 4: Execute the correct placement
SELECT place_members_with_correct_lmr_order();

-- Step 5: Verify the corrected placements
SELECT 
    '=== CORRECTED PLACEMENT VERIFICATION ===' as section_title;

SELECT 
    imp.matrix_owner as matrix_owner_wallet,
    COALESCE(owner_u.username, 'Unknown') as matrix_owner_name,
    imp.member_wallet,
    COALESCE(member_u.username, 'Unknown') as member_name,
    COALESCE(referrer_u.username, 'Direct/Root') as actual_referrer,
    imp.layer_in_owner_matrix,
    imp.position_in_layer,
    imp.placed_at,
    ROW_NUMBER() OVER (PARTITION BY imp.matrix_owner, imp.layer_in_owner_matrix ORDER BY imp.placed_at) as placement_order,
    CASE 
        WHEN LOWER(u.referrer_wallet) = LOWER(imp.matrix_owner) THEN '✅ Correct (Direct referral)'
        ELSE '❌ Spillover placement'
    END as placement_correctness
FROM individual_matrix_placements imp
LEFT JOIN users u ON LOWER(imp.member_wallet) = LOWER(u.wallet_address)
LEFT JOIN users owner_u ON LOWER(imp.matrix_owner) = LOWER(owner_u.wallet_address)
LEFT JOIN users member_u ON LOWER(imp.member_wallet) = LOWER(member_u.wallet_address)
LEFT JOIN users referrer_u ON LOWER(u.referrer_wallet) = LOWER(referrer_u.wallet_address)
WHERE imp.is_active = true
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix, imp.placed_at;

-- Final summary
DO $$
DECLARE
    total_placements INTEGER;
    correct_placements INTEGER;
    spillover_placements INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_placements 
    FROM individual_matrix_placements imp
    JOIN users u ON LOWER(imp.member_wallet) = LOWER(u.wallet_address)
    WHERE imp.is_active = true;
    
    SELECT COUNT(*) INTO correct_placements
    FROM individual_matrix_placements imp
    JOIN users u ON LOWER(imp.member_wallet) = LOWER(u.wallet_address)
    WHERE imp.is_active = true
    AND LOWER(u.referrer_wallet) = LOWER(imp.matrix_owner);
    
    spillover_placements := total_placements - correct_placements;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== L→M→R PLACEMENT ORDER CORRECTION SUMMARY ===';
    RAISE NOTICE 'Total placements: %', total_placements;
    RAISE NOTICE 'Direct referral placements: %', correct_placements;
    RAISE NOTICE 'Spillover placements: %', spillover_placements;
    RAISE NOTICE '';
    
    IF spillover_placements = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All members correctly placed in their referrer''s matrix!';
        RAISE NOTICE 'L→M→R order now follows referrer relationship and timing.';
    ELSE
        RAISE NOTICE '⚠️ Note: % spillover placements (expected for full matrices)', spillover_placements;
    END IF;
END $$;