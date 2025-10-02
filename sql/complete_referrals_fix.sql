-- Complete Referrals Matrix Fix - Start from scratch and ensure all members have complete 19-layer matrix

-- Step 1: Clear all existing matrix records to rebuild from scratch
DELETE FROM referrals WHERE matrix_root IS NOT NULL;

-- Step 2: Create improved recursive matrix generation
CREATE OR REPLACE FUNCTION generate_complete_19_layer_matrix()
RETURNS TABLE(
    summary text,
    total_members integer,
    total_matrix_records integer,
    max_layer_reached integer
) AS $$
DECLARE
    member_rec RECORD;
    total_members_count INTEGER := 0;
    total_records_count INTEGER := 0;
    max_layer_found INTEGER := 0;
    records_for_member INTEGER;
BEGIN
    -- Get all active members count
    SELECT COUNT(*) INTO total_members_count FROM members WHERE current_level > 0;
    RAISE NOTICE 'Starting matrix generation for % members', total_members_count;
    
    -- Generate matrix for each member
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet, current_level 
        FROM members 
        WHERE current_level > 0 
        ORDER BY wallet_address
    LOOP
        records_for_member := 0;
        
        -- Generate complete 19-layer matrix for this member
        WITH RECURSIVE member_downline AS (
            -- Layer 1: Direct referrals
            SELECT 
                m.wallet_address as descendant_wallet,
                m.referrer_wallet as descendant_referrer,
                member_rec.wallet_address as matrix_root,
                1 as layer_num
            FROM members m
            WHERE m.referrer_wallet = member_rec.wallet_address
              AND m.current_level > 0
              AND m.wallet_address != member_rec.wallet_address
            
            UNION ALL
            
            -- Layer 2-19: Recursive downline
            SELECT 
                m.wallet_address as descendant_wallet,
                m.referrer_wallet as descendant_referrer,
                md.matrix_root,
                md.layer_num + 1 as layer_num
            FROM members m
            INNER JOIN member_downline md ON m.referrer_wallet = md.descendant_wallet
            WHERE md.layer_num < 19
              AND m.current_level > 0
              AND m.wallet_address != md.matrix_root
        ),
        -- Add position assignments
        positioned_downline AS (
            SELECT 
                *,
                ROW_NUMBER() OVER (PARTITION BY matrix_root, layer_num ORDER BY descendant_wallet) as position_num
            FROM member_downline
        )
        -- Insert all matrix records for this member
        INSERT INTO referrals (
            matrix_root,
            member_wallet,
            referrer_wallet,
            matrix_layer,
            matrix_position,
            placed_at,
            is_active
        )
        SELECT DISTINCT
            matrix_root,
            descendant_wallet,
            descendant_referrer,
            layer_num,
            CASE 
                WHEN position_num % 3 = 1 THEN 'L'
                WHEN position_num % 3 = 2 THEN 'M'
                ELSE 'R'
            END as position,
            NOW(),
            true
        FROM positioned_downline
        WHERE layer_num <= 19
        ON CONFLICT (member_wallet, matrix_root) DO NOTHING;
        
        -- Get record count for this member
        SELECT COUNT(*) INTO records_for_member 
        FROM referrals 
        WHERE matrix_root = member_rec.wallet_address;
        
        -- Update max layer found
        SELECT COALESCE(MAX(matrix_layer), 0) INTO max_layer_found
        FROM referrals 
        WHERE matrix_root = member_rec.wallet_address;
        
        -- Progress notification every 3 members
        IF (total_members_count - (SELECT COUNT(*) FROM unnest(string_to_array(member_rec.wallet_address, '')))) % 3 = 0 THEN
            RAISE NOTICE 'Processed member %, created % records, max layer %', 
                member_rec.wallet_address, records_for_member, max_layer_found;
        END IF;
    END LOOP;
    
    -- Final counts
    SELECT COUNT(*) INTO total_records_count FROM referrals;
    SELECT MAX(matrix_layer) INTO max_layer_found FROM referrals;
    
    RETURN QUERY SELECT 
        '完整19层矩阵生成完成'::text as summary,
        total_members_count as total_members,
        total_records_count as total_matrix_records,
        max_layer_found as max_layer_reached;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Execute the matrix generation
SELECT * FROM generate_complete_19_layer_matrix();

-- Step 4: Verification queries
SELECT 
    '最终验证结果' as verification_stage,
    COUNT(DISTINCT matrix_root) as 矩阵根数量,
    COUNT(*) as 总矩阵记录数,
    MIN(matrix_layer) as 最小层级,
    MAX(matrix_layer) as 最大层级,
    COUNT(DISTINCT matrix_position) as 位置类型
FROM referrals;

-- Show each member's matrix completeness
SELECT 
    matrix_root as 矩阵根,
    COUNT(*) as 总下级数,
    COUNT(CASE WHEN matrix_layer = 1 THEN 1 END) as 第1层,
    COUNT(CASE WHEN matrix_layer = 2 THEN 1 END) as 第2层,
    COUNT(CASE WHEN matrix_layer = 3 THEN 1 END) as 第3层,
    COUNT(CASE WHEN matrix_layer BETWEEN 4 AND 9 THEN 1 END) as 第4到9层,
    COUNT(CASE WHEN matrix_layer BETWEEN 10 AND 19 THEN 1 END) as 第10到19层,
    MAX(matrix_layer) as 最深层级
FROM referrals
GROUP BY matrix_root
ORDER BY 总下级数 DESC;

-- Ensure all members have matrix records
SELECT 
    'Missing matrix check' as check_type,
    COUNT(*) as members_without_matrix
FROM members m
WHERE m.current_level > 0 
AND NOT EXISTS (SELECT 1 FROM referrals r WHERE r.matrix_root = m.wallet_address);