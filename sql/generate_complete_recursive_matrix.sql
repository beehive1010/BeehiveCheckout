-- Generate Complete Recursive Matrix Records for All 19 Layers
-- This function ensures each member appears in all their ancestor matrices

CREATE OR REPLACE FUNCTION generate_complete_recursive_matrix() 
RETURNS TABLE(
    processing_summary text,
    total_members integer,
    total_matrix_records integer
) AS $$
DECLARE
    member_record RECORD;
    ancestor_record RECORD;
    current_layer INTEGER;
    total_members_count INTEGER;
    total_records_created INTEGER := 0;
    temp_records_created INTEGER := 0;
BEGIN
    -- Clear existing matrix records to rebuild from scratch
    DELETE FROM referrals WHERE matrix_root IS NOT NULL;
    
    -- Get total members count
    SELECT COUNT(*) INTO total_members_count FROM members WHERE current_level > 0;
    
    -- For each active member, build their complete matrix
    FOR member_record IN 
        SELECT wallet_address, referrer_wallet, current_level 
        FROM members 
        WHERE current_level > 0
        ORDER BY wallet_address
    LOOP
        temp_records_created := 0;
        
        -- Build matrix for this member by traversing their downline
        -- Each member in their downline appears at appropriate layer
        FOR ancestor_record IN
            WITH RECURSIVE downline_tree AS (
                -- Base case: direct referrals (layer 1)
                SELECT 
                    m.wallet_address as member_wallet,
                    m.referrer_wallet,
                    member_record.wallet_address as matrix_root,
                    1 as layer,
                    CASE 
                        WHEN ROW_NUMBER() OVER (ORDER BY m.wallet_address) % 3 = 1 THEN 'L'
                        WHEN ROW_NUMBER() OVER (ORDER BY m.wallet_address) % 3 = 2 THEN 'M'
                        ELSE 'R'
                    END as position
                FROM members m
                WHERE m.referrer_wallet = member_record.wallet_address
                  AND m.current_level > 0
                
                UNION ALL
                
                -- Recursive case: indirect referrals (layers 2-19)
                SELECT 
                    m.wallet_address as member_wallet,
                    m.referrer_wallet,
                    dt.matrix_root,
                    dt.layer + 1 as layer,
                    CASE 
                        WHEN (dt.layer + 1) <= 19 AND ROW_NUMBER() OVER (ORDER BY m.wallet_address) % 3 = 1 THEN 'L'
                        WHEN (dt.layer + 1) <= 19 AND ROW_NUMBER() OVER (ORDER BY m.wallet_address) % 3 = 2 THEN 'M'
                        WHEN (dt.layer + 1) <= 19 THEN 'R'
                        ELSE NULL
                    END as position
                FROM members m
                INNER JOIN downline_tree dt ON m.referrer_wallet = dt.member_wallet
                WHERE dt.layer < 19
                  AND m.current_level > 0
            )
            SELECT * FROM downline_tree WHERE layer <= 19
        LOOP
            -- Insert matrix record
            INSERT INTO referrals (
                matrix_root,
                member_wallet,
                matrix_layer,
                matrix_position,
                placed_at,
                referrer_wallet
            ) VALUES (
                member_record.wallet_address,
                ancestor_record.member_wallet,
                ancestor_record.layer,
                ancestor_record.position,
                NOW(),
                ancestor_record.referrer_wallet
            ) ON CONFLICT (member_wallet, matrix_root) DO NOTHING;
            
            temp_records_created := temp_records_created + 1;
        END LOOP;
        
        total_records_created := total_records_created + temp_records_created;
        
        -- Log progress for every 10 members
        IF total_records_created % 100 = 0 THEN
            RAISE NOTICE 'Processed matrix for member %, created % total records', 
                member_record.wallet_address, total_records_created;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        'Matrix generation completed successfully'::text as processing_summary,
        total_members_count as total_members,
        total_records_created as total_matrix_records;
        
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT * FROM generate_complete_recursive_matrix();

-- Verify results by showing matrix distribution
SELECT 
    'Matrix Distribution Summary' as summary_type,
    COUNT(DISTINCT matrix_root) as unique_matrix_roots,
    COUNT(*) as total_matrix_records,
    MIN(matrix_layer) as min_layer,
    MAX(matrix_layer) as max_layer,
    COUNT(DISTINCT matrix_position) as position_types
FROM referrals;

-- Show sample of created records
SELECT 
    matrix_root,
    COUNT(*) as total_members_in_matrix,
    COUNT(CASE WHEN matrix_layer = 1 THEN 1 END) as layer_1_members,
    COUNT(CASE WHEN matrix_layer = 2 THEN 1 END) as layer_2_members,
    COUNT(CASE WHEN matrix_layer >= 3 THEN 1 END) as deeper_layer_members
FROM referrals 
GROUP BY matrix_root 
ORDER BY total_members_in_matrix DESC 
LIMIT 10;