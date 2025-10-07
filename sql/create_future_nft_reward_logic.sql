-- Create proper logic for triggering layer_rewards when members claim higher NFT levels
-- This function should be called whenever a member upgrades their NFT level

CREATE OR REPLACE FUNCTION trigger_layer_rewards_for_nft_claim(
    claiming_member_wallet TEXT,
    new_nft_level INTEGER
) RETURNS VOID AS $$
DECLARE
    matrix_owner_rec RECORD;
    existing_reward_id UUID;
BEGIN
    RAISE NOTICE 'Processing layer rewards for % claiming Level % NFT', 
        (SELECT COALESCE(username, claiming_member_wallet) FROM users WHERE wallet_address = claiming_member_wallet),
        new_nft_level;
    
    -- For each matrix owner where this member appears in their individual matrix
    FOR matrix_owner_rec IN 
        SELECT DISTINCT
            imp.matrix_owner,
            imp.layer_in_owner_matrix,
            recipient_m.current_level as owner_current_level,
            COALESCE(owner_u.username, 'Unknown') as owner_username
        FROM individual_matrix_placements imp
        LEFT JOIN members recipient_m ON LOWER(recipient_m.wallet_address) = LOWER(imp.matrix_owner)
        LEFT JOIN users owner_u ON LOWER(owner_u.wallet_address) = LOWER(imp.matrix_owner)
        WHERE LOWER(imp.member_wallet) = LOWER(claiming_member_wallet)
        AND imp.is_active = true
    LOOP
        RAISE NOTICE '  Checking matrix owner: % (Level %) for layer % reward',
            matrix_owner_rec.owner_username,
            matrix_owner_rec.owner_current_level,
            matrix_owner_rec.layer_in_owner_matrix;
        
        -- Check if a reward already exists for this combination
        SELECT id INTO existing_reward_id
        FROM layer_rewards lr
        WHERE LOWER(lr.recipient_wallet) = LOWER(matrix_owner_rec.matrix_owner)
        AND LOWER(lr.payer_wallet) = LOWER(claiming_member_wallet)
        AND lr.layer = matrix_owner_rec.layer_in_owner_matrix
        AND lr.nft_level = new_nft_level
        LIMIT 1;
        
        IF existing_reward_id IS NULL THEN
            -- Create new layer reward
            INSERT INTO layer_rewards (
                recipient_wallet,
                payer_wallet,
                layer,
                reward_type,
                amount_usdt,
                amount_bcc,
                source_transaction_id,
                nft_level,
                is_claimed,
                created_at
            ) VALUES (
                matrix_owner_rec.matrix_owner,
                claiming_member_wallet,
                matrix_owner_rec.layer_in_owner_matrix,
                
                -- Determine if immediately claimable or pending
                CASE 
                    WHEN matrix_owner_rec.owner_current_level >= matrix_owner_rec.layer_in_owner_matrix THEN 'layer_reward'
                    ELSE 'pending_layer_reward'
                END,
                
                -- Reward amount based on NFT level claimed
                CASE new_nft_level
                    WHEN 1 THEN 100.000000
                    WHEN 2 THEN 150.000000
                    WHEN 3 THEN 200.000000
                    ELSE (100.000000 + (new_nft_level - 1) * 50.000000)
                END,
                
                CASE new_nft_level
                    WHEN 1 THEN 100.00000000
                    WHEN 2 THEN 150.00000000
                    WHEN 3 THEN 200.00000000
                    ELSE ((100.00000000 + (new_nft_level - 1) * 50.00000000))
                END,
                
                'nft_upgrade_level_' || new_nft_level || '_' || claiming_member_wallet || '_' || matrix_owner_rec.matrix_owner,
                new_nft_level,
                false,
                now()
            );
            
            RAISE NOTICE '    ✅ Created % reward: % USDT for %',
                CASE 
                    WHEN matrix_owner_rec.owner_current_level >= matrix_owner_rec.layer_in_owner_matrix THEN 'claimable'
                    ELSE 'pending'
                END,
                CASE new_nft_level
                    WHEN 1 THEN 100
                    WHEN 2 THEN 150
                    WHEN 3 THEN 200
                    ELSE (100 + (new_nft_level - 1) * 50)
                END,
                matrix_owner_rec.owner_username;
        ELSE
            RAISE NOTICE '    ⚠️ Reward already exists, skipping';
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed layer reward processing for Level % NFT claim', new_nft_level;
END;
$$ LANGUAGE plpgsql;

-- Create function to upgrade member and trigger rewards
CREATE OR REPLACE FUNCTION upgrade_member_nft_level(
    member_wallet TEXT,
    new_level INTEGER
) RETURNS TABLE(
    reward_recipient TEXT,
    reward_amount_usdt NUMERIC,
    reward_status TEXT
) AS $$
BEGIN
    RAISE NOTICE 'Upgrading % to Level %', 
        (SELECT COALESCE(username, member_wallet) FROM users WHERE wallet_address = member_wallet),
        new_level;
    
    -- Update member's current level and levels_owned
    UPDATE members 
    SET 
        current_level = new_level,
        levels_owned = (
            SELECT jsonb_agg(DISTINCT level_num ORDER BY level_num)
            FROM (
                SELECT jsonb_array_elements_text(levels_owned)::integer as level_num
                UNION 
                SELECT new_level
            ) levels
        ),
        updated_at = now()
    WHERE LOWER(wallet_address) = LOWER(member_wallet);
    
    -- Trigger layer rewards for this NFT claim
    PERFORM trigger_layer_rewards_for_nft_claim(member_wallet, new_level);
    
    -- Return summary of rewards generated
    RETURN QUERY
    SELECT 
        COALESCE(owner_u.username, lr.recipient_wallet) as reward_recipient,
        lr.amount_usdt as reward_amount_usdt,
        lr.reward_type as reward_status
    FROM layer_rewards lr
    LEFT JOIN users owner_u ON LOWER(lr.recipient_wallet) = LOWER(owner_u.wallet_address)
    WHERE LOWER(lr.payer_wallet) = LOWER(member_wallet)
    AND lr.nft_level = new_level
    ORDER BY lr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Example usage demonstration (commented out)
/*
-- When a member claims Level 2 NFT:
SELECT * FROM upgrade_member_nft_level('0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab', 2);

-- When a member claims Level 3 NFT:
SELECT * FROM upgrade_member_nft_level('0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0', 3);
*/

-- Create view to monitor potential future rewards
CREATE OR REPLACE VIEW potential_future_rewards AS
SELECT 
    imp.matrix_owner,
    COALESCE(owner_u.username, 'Unknown') as matrix_owner_name,
    owner_m.current_level as owner_current_level,
    imp.member_wallet,
    COALESCE(member_u.username, 'Unknown') as member_name,
    member_m.current_level as member_current_level,
    imp.layer_in_owner_matrix as reward_layer,
    
    -- Potential rewards for each level they could claim
    'Level 2: ' || 150 || ' USDT' as level_2_potential,
    'Level 3: ' || 200 || ' USDT' as level_3_potential,
    'Level 4: ' || 250 || ' USDT' as level_4_potential,
    
    -- Current eligibility status
    CASE 
        WHEN owner_m.current_level >= imp.layer_in_owner_matrix THEN 'Owner ready to receive'
        ELSE 'Owner needs Level ' || imp.layer_in_owner_matrix || '+'
    END as current_eligibility
    
FROM individual_matrix_placements imp
LEFT JOIN users owner_u ON LOWER(imp.matrix_owner) = LOWER(owner_u.wallet_address)
LEFT JOIN users member_u ON LOWER(imp.member_wallet) = LOWER(member_u.wallet_address)  
LEFT JOIN members owner_m ON LOWER(imp.matrix_owner) = LOWER(owner_m.wallet_address)
LEFT JOIN members member_m ON LOWER(imp.member_wallet) = LOWER(member_m.wallet_address)
WHERE imp.is_active = true
AND member_m.current_level < 19  -- Members who can still upgrade
ORDER BY owner_u.username, imp.layer_in_owner_matrix;

-- Show the potential future rewards
SELECT 
    '=== POTENTIAL FUTURE REWARDS SYSTEM ===' as section_title;

SELECT 
    matrix_owner_name,
    member_name || ' (currently Level ' || member_current_level || ')' as member_info,
    'Layer ' || reward_layer as reward_for,
    level_2_potential,
    level_3_potential,
    current_eligibility
FROM potential_future_rewards
LIMIT 10;

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== FUTURE NFT REWARD SYSTEM READY ===';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Functions created:';
    RAISE NOTICE '- trigger_layer_rewards_for_nft_claim(): Processes rewards when NFT is claimed';
    RAISE NOTICE '- upgrade_member_nft_level(): Upgrades member and triggers rewards';
    RAISE NOTICE '- potential_future_rewards view: Shows potential future rewards';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Usage: When a member claims Level 2 NFT:';
    RAISE NOTICE 'SELECT * FROM upgrade_member_nft_level(''wallet_address'', 2);';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Current state: All ActiveMember members have Level 1 NFTs';
    RAISE NOTICE 'Ready to process Level 2+ claims when they happen!';
END $$;