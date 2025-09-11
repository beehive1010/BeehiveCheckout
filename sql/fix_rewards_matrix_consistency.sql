-- Fix Rewards-Matrix Data Consistency
-- Generate missing matrix records for existing layer rewards

CREATE OR REPLACE FUNCTION fix_rewards_matrix_consistency()
RETURNS TABLE(
    summary text,
    records_created integer,
    consistency_check text
) AS $$
DECLARE
    reward_rec RECORD;
    created_count INTEGER := 0;
    position_assignment CHAR(1);
BEGIN
    -- For each layer reward without corresponding matrix record
    FOR reward_rec IN 
        SELECT DISTINCT
            lr.payer_wallet as matrix_root,
            lr.recipient_wallet as member_wallet,
            lr.layer as matrix_layer
        FROM layer_rewards lr
        WHERE NOT EXISTS (
            SELECT 1 FROM referrals r 
            WHERE r.matrix_root = lr.payer_wallet 
            AND r.matrix_layer = lr.layer
            AND r.member_wallet = lr.recipient_wallet
        )
        ORDER BY lr.payer_wallet, lr.layer
    LOOP
        -- Determine position assignment (L, M, R)
        -- Use simple round-robin based on existing records in this layer
        SELECT 
            CASE 
                WHEN COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) <= 
                     COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) AND
                     COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) <= 
                     COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) THEN 'L'
                WHEN COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) <= 
                     COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) THEN 'M'
                ELSE 'R'
            END INTO position_assignment
        FROM referrals 
        WHERE matrix_root = reward_rec.matrix_root 
        AND matrix_layer = reward_rec.matrix_layer;
        
        -- If no existing records for this layer, default to L
        IF position_assignment IS NULL THEN
            position_assignment := 'L';
        END IF;
        
        -- Insert missing matrix record
        INSERT INTO referrals (
            matrix_root,
            member_wallet,
            referrer_wallet,
            matrix_layer,
            matrix_position,
            placed_at,
            is_active
        ) VALUES (
            reward_rec.matrix_root,
            reward_rec.member_wallet,
            -- Get referrer from members table
            (SELECT referrer_wallet FROM members WHERE wallet_address = reward_rec.member_wallet),
            reward_rec.matrix_layer,
            position_assignment,
            NOW(),
            true
        ) ON CONFLICT (member_wallet, matrix_root) DO NOTHING;
        
        GET DIAGNOSTICS created_count = ROW_COUNT;
        
        IF created_count > 0 THEN
            RAISE NOTICE 'Created matrix record: % -> % (Layer %, Position %)', 
                reward_rec.matrix_root, reward_rec.member_wallet, 
                reward_rec.matrix_layer, position_assignment;
        END IF;
    END LOOP;
    
    -- Final consistency check
    RETURN QUERY
    WITH consistency_stats AS (
        SELECT 
            COUNT(*) as total_rewards,
            COUNT(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM referrals r 
                    WHERE r.matrix_root = lr.payer_wallet 
                    AND r.matrix_layer = lr.layer
                    AND r.member_wallet = lr.recipient_wallet
                ) THEN 1 
            END) as rewards_with_matrix
        FROM layer_rewards lr
    )
    SELECT 
        'Matrix-Rewards consistency fix completed'::text,
        (rewards_with_matrix - (total_rewards - rewards_with_matrix))::integer,
        CASE 
            WHEN total_rewards = rewards_with_matrix 
            THEN 'All layer rewards now have corresponding matrix records'
            ELSE 'Some inconsistencies remain: ' || (total_rewards - rewards_with_matrix)::text || ' orphaned rewards'
        END::text
    FROM consistency_stats;
END;
$$ LANGUAGE plpgsql;

-- Execute the consistency fix
SELECT * FROM fix_rewards_matrix_consistency();

-- Verify the fix worked
SELECT 
    'Post-fix verification' as check_type,
    COUNT(*) as total_layer_rewards,
    COUNT(CASE 
        WHEN EXISTS (
            SELECT 1 FROM referrals r 
            WHERE r.matrix_root = lr.payer_wallet 
            AND r.matrix_layer = lr.layer
            AND r.member_wallet = lr.recipient_wallet
        ) THEN 1 
    END) as rewards_with_matrix_records,
    COUNT(*) - COUNT(CASE 
        WHEN EXISTS (
            SELECT 1 FROM referrals r 
            WHERE r.matrix_root = lr.payer_wallet 
            AND r.matrix_layer = lr.layer
            AND r.member_wallet = lr.recipient_wallet
        ) THEN 1 
    END) as orphaned_rewards
FROM layer_rewards lr;