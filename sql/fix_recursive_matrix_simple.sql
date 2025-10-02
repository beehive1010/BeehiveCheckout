-- Simple Direct Recursive Matrix Generation
-- This approach builds each member's matrix by walking up their referral chain

-- First, clear existing matrix records
DELETE FROM referrals WHERE matrix_root IS NOT NULL;

-- Function to generate matrix records for all members
CREATE OR REPLACE FUNCTION build_member_matrices()
RETURNS void AS $$
DECLARE
    member_rec RECORD;
    referrer_rec RECORD;
    current_layer INTEGER;
    position_counter INTEGER;
BEGIN
    -- For each member, create their matrix by finding all their descendants
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet, current_level 
        FROM members 
        WHERE current_level > 0 
        ORDER BY wallet_address
    LOOP
        position_counter := 1;
        current_layer := 1;
        
        -- Find all members who have this member in their upline (up to 19 layers)
        WHILE current_layer <= 19 LOOP
            -- For each layer, find members whose referrer chain leads back to this member
            FOR referrer_rec IN
                WITH RECURSIVE upline_chain AS (
                    -- Start with members at the target layer distance
                    SELECT 
                        m1.wallet_address as descendant_wallet,
                        m1.referrer_wallet,
                        member_rec.wallet_address as matrix_root,
                        current_layer as target_layer,
                        0 as current_depth
                    FROM members m1
                    WHERE m1.current_level > 0
                    
                    UNION ALL
                    
                    -- Walk up the referral chain
                    SELECT 
                        uc.descendant_wallet,
                        m2.referrer_wallet,
                        uc.matrix_root,
                        uc.target_layer,
                        uc.current_depth + 1
                    FROM upline_chain uc
                    JOIN members m2 ON m2.wallet_address = uc.referrer_wallet
                    WHERE uc.current_depth < uc.target_layer
                      AND m2.current_level > 0
                )
                SELECT DISTINCT descendant_wallet
                FROM upline_chain
                WHERE current_depth = current_layer - 1
                  AND referrer_wallet = member_rec.wallet_address
            LOOP
                -- Insert matrix record with proper position assignment
                INSERT INTO referrals (
                    matrix_root,
                    member_wallet,
                    referrer_wallet,
                    matrix_layer,
                    matrix_position,
                    placed_at,
                    is_active
                ) VALUES (
                    member_rec.wallet_address,
                    referrer_rec.descendant_wallet,
                    (SELECT referrer_wallet FROM members WHERE wallet_address = referrer_rec.descendant_wallet),
                    current_layer,
                    CASE 
                        WHEN position_counter % 3 = 1 THEN 'L'
                        WHEN position_counter % 3 = 2 THEN 'M'
                        ELSE 'R'
                    END,
                    NOW(),
                    true
                ) ON CONFLICT (member_wallet, matrix_root) DO NOTHING;
                
                position_counter := position_counter + 1;
            END LOOP;
            
            current_layer := current_layer + 1;
        END LOOP;
        
        -- Progress indicator
        RAISE NOTICE 'Generated matrix for member: %', member_rec.wallet_address;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute matrix generation
SELECT build_member_matrices();

-- Verify the results
SELECT 
    'Final Matrix Results' as status,
    COUNT(DISTINCT matrix_root) as unique_matrix_roots,
    COUNT(*) as total_matrix_records,
    MIN(matrix_layer) as min_layer,
    MAX(matrix_layer) as max_layer
FROM referrals;

-- Show detailed matrix distribution
SELECT 
    matrix_root,
    COUNT(*) as total_descendants,
    COUNT(CASE WHEN matrix_layer = 1 THEN 1 END) as layer_1,
    COUNT(CASE WHEN matrix_layer = 2 THEN 1 END) as layer_2,
    COUNT(CASE WHEN matrix_layer = 3 THEN 1 END) as layer_3,
    COUNT(CASE WHEN matrix_layer >= 4 THEN 1 END) as layer_4_plus
FROM referrals
WHERE matrix_root IS NOT NULL
GROUP BY matrix_root
ORDER BY total_descendants DESC;