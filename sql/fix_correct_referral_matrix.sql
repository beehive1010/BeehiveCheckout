-- 正确的基于推荐关系的L-M-R矩阵重排
-- 基于真实的推荐关系来构建每个成员的矩阵，而不是将所有成员放在每个矩阵中

BEGIN;

-- Step 1: Backup existing data
CREATE TEMP TABLE backup_individual_matrix_placements_referral AS 
SELECT * FROM individual_matrix_placements;

CREATE TEMP TABLE backup_referrals_referral AS 
SELECT * FROM referrals;

-- Step 2: Clear existing incorrect matrix placements
DELETE FROM individual_matrix_placements;

-- Step 3: Create function to build matrix based on actual referral relationships
CREATE OR REPLACE FUNCTION build_referral_based_matrix()
RETURNS void AS $$
DECLARE
    member_rec RECORD;
    referrer_position RECORD;
    new_position TEXT;
    new_layer INTEGER;
    placement_counter INTEGER := 0;
BEGIN
    RAISE NOTICE 'Building referral-based L-M-R matrix structure...';
    
    -- Process members in activation order
    FOR member_rec IN 
        SELECT 
            r.member_wallet,
            r.referrer_wallet,
            r.activation_rank,
            u.username,
            r.placed_at
        FROM referrals r
        LEFT JOIN users u ON r.member_wallet = u.wallet_address
        WHERE r.member_wallet != '0x0000000000000000000000000000000000000001'  -- Skip root
        ORDER BY 
            CASE WHEN r.activation_rank IS NOT NULL THEN r.activation_rank ELSE 999999 END,
            r.placed_at
    LOOP
        RAISE NOTICE 'Processing member: % (rank: %) referred by %', 
            member_rec.username, 
            member_rec.activation_rank,
            (SELECT username FROM users WHERE wallet_address = member_rec.referrer_wallet);
        
        -- For each existing matrix owner, place this member if they should be in that matrix
        -- A member should be in someone's matrix if that person is in their upline
        
        -- Place member in matrices of all their upline members
        INSERT INTO individual_matrix_placements (
            matrix_owner,
            member_wallet,
            layer_in_owner_matrix,
            position_in_layer,
            placed_at,
            placement_order
        )
        SELECT 
            upline.member_wallet as matrix_owner,
            member_rec.member_wallet,
            1 as layer_in_owner_matrix,  -- Start with layer 1 for now
            CASE 
                WHEN upline_placement_count = 0 THEN 'L'
                WHEN upline_placement_count = 1 THEN 'M'
                WHEN upline_placement_count = 2 THEN 'R'
                ELSE 'OVERFLOW'
            END as position_in_layer,
            NOW(),
            placement_counter
        FROM (
            -- Find all upline members (including direct referrer and their uplines)
            WITH RECURSIVE upline_tree AS (
                -- Start with the member's direct referrer
                SELECT 
                    r.referrer_wallet as member_wallet,
                    0 as distance
                FROM referrals r 
                WHERE r.member_wallet = member_rec.member_wallet
                
                UNION ALL
                
                -- Recursively find upline members
                SELECT 
                    r.referrer_wallet as member_wallet,
                    ut.distance + 1
                FROM referrals r
                JOIN upline_tree ut ON r.member_wallet = ut.member_wallet
                WHERE r.member_wallet != '0x0000000000000000000000000000000000000001'
                  AND ut.distance < 10  -- Limit recursion depth
            )
            SELECT 
                ut.member_wallet,
                ut.distance,
                -- Count existing placements in this matrix
                COALESCE((
                    SELECT COUNT(*) 
                    FROM individual_matrix_placements imp 
                    WHERE imp.matrix_owner = ut.member_wallet
                ), 0) as upline_placement_count
            FROM upline_tree ut
            WHERE ut.member_wallet != '0x0000000000000000000000000000000000000001'  -- Don't include root as matrix owner
        ) upline
        WHERE upline.upline_placement_count < 3;  -- Only if there's space in layer 1
        
        placement_counter := placement_counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Referral-based matrix building completed';
END;
$$ LANGUAGE plpgsql;

-- Step 4: Execute the referral-based matrix building
SELECT build_referral_based_matrix();

-- Step 5: Update referrals table to match the new matrix placements
UPDATE referrals r SET
    matrix_position = imp.position_in_layer,
    matrix_layer = imp.layer_in_owner_matrix,
    matrix_parent = imp.matrix_owner,  -- The matrix owner is the parent in this layer
    matrix_root = imp.matrix_owner     -- For single layer, root = parent
FROM individual_matrix_placements imp
WHERE r.member_wallet = imp.member_wallet
  AND r.referrer_wallet = imp.matrix_owner;  -- Only update where referrer relationship matches

-- Step 6: Verification and reporting
DO $$
DECLARE
    matrix_summary RECORD;
    placement_summary RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== REFERRAL-BASED MATRIX VERIFICATION ===';
    
    -- Overall summary
    SELECT 
        COUNT(DISTINCT matrix_owner) as total_matrices,
        COUNT(*) as total_placements,
        AVG(layer_in_owner_matrix) as avg_layer
    INTO matrix_summary
    FROM individual_matrix_placements;
    
    RAISE NOTICE 'Total matrices: %', matrix_summary.total_matrices;
    RAISE NOTICE 'Total placements: %', matrix_summary.total_placements;
    RAISE NOTICE 'Average layer: %', ROUND(matrix_summary.avg_layer, 2);
    
    -- Matrix size distribution
    FOR placement_summary IN
        SELECT 
            matrix_owner,
            u.username as owner_name,
            COUNT(*) as members_count,
            string_agg(position_in_layer, ', ' ORDER BY position_in_layer) as positions
        FROM individual_matrix_placements imp
        LEFT JOIN users u ON imp.matrix_owner = u.wallet_address
        GROUP BY matrix_owner, u.username
        ORDER BY members_count DESC
    LOOP
        RAISE NOTICE 'Matrix owner % (%) has % members: %', 
            placement_summary.owner_name,
            placement_summary.matrix_owner,
            placement_summary.members_count,
            placement_summary.positions;
    END LOOP;
END $$;

-- Step 7: Display sample matrix structures based on referral relationships
SELECT '=== REFERRAL-BASED MATRIX SAMPLE ===' as section;

SELECT 
    imp.matrix_owner,
    owner_u.username as matrix_owner_name,
    imp.member_wallet,
    member_u.username as member_name,
    imp.layer_in_owner_matrix as layer,
    imp.position_in_layer as position,
    r.activation_rank as member_activation_rank
FROM individual_matrix_placements imp
LEFT JOIN users owner_u ON imp.matrix_owner = owner_u.wallet_address
LEFT JOIN users member_u ON imp.member_wallet = member_u.wallet_address
LEFT JOIN referrals r ON imp.member_wallet = r.member_wallet
ORDER BY imp.matrix_owner, imp.layer_in_owner_matrix, imp.position_in_layer
LIMIT 20;

-- Clean up function
DROP FUNCTION IF EXISTS build_referral_based_matrix();

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '✅ Referral-based matrix structure completed!';
RAISE NOTICE 'Matrices now reflect actual referral relationships with proper L-M-R positioning';