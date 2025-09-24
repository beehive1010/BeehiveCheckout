-- Correct Layer 1 R position rule: Only require Level 2+, no direct referrals requirement
-- This simplifies the rule significantly

DO $correct_layer1_r_rule$ 
DECLARE
    reward_record RECORD;
    should_be_claimable BOOLEAN;
    corrected_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Correcting Layer 1 R position rule: Only Level 2+ required, no direct referrals...';
    
    -- Update all Layer 1 R position rewards to remove direct referrals requirement
    FOR reward_record IN 
        SELECT * FROM layer_rewards 
        WHERE matrix_layer = 1 AND layer_position = 'R'
        ORDER BY created_at
    LOOP
        RAISE NOTICE 'Processing reward ID: % for wallet: %', 
                     reward_record.id, reward_record.reward_recipient_wallet;
        
        -- Simplified rule: Only Level 2+ required for Layer 1 R position
        should_be_claimable := (reward_record.recipient_current_level >= 2);
        
        RAISE NOTICE 'Wallet: %, Current Level: %, Should be claimable: %',
                     reward_record.reward_recipient_wallet,
                     reward_record.recipient_current_level,
                     should_be_claimable;
        
        -- Update the reward with correct simplified requirements
        UPDATE layer_rewards
        SET 
            -- Simplified rule requirements
            recipient_required_level = 2,  -- Layer 1 R requires Level 2+
            direct_referrals_required = 0, -- NO direct referrals required
            requires_direct_referrals = false, -- Layer 1 R does NOT require direct referrals
            
            -- Fix the status based on simplified rule
            status = CASE 
                WHEN should_be_claimable THEN 'claimable'
                ELSE 'pending'
            END,
            
            -- Set expiration for pending rewards (72 hours from now)
            expires_at = CASE 
                WHEN should_be_claimable THEN NULL
                ELSE NOW() + INTERVAL '72 hours'
            END
            
        WHERE id = reward_record.id;
        
        -- Update existing countdown timers with simplified description
        UPDATE countdown_timers
        SET 
            description = format('You need Level 2+ to claim this %s USDT reward. You currently have Level %s.',
                               reward_record.reward_amount,
                               reward_record.recipient_current_level),
            metadata = json_build_object(
                'reward_id', reward_record.id,
                'reward_amount', reward_record.reward_amount,
                'required_level', 2,
                'current_level', reward_record.recipient_current_level,
                'is_layer_1_r_special_rule', true,
                'simplified_rule', 'Only Level 2+ required, no direct referrals'
            )
        WHERE related_reward_id = reward_record.id AND is_active = true;
        
        corrected_count := corrected_count + 1;
    END LOOP;
    
    -- Log the correction
    INSERT INTO audit_logs (user_wallet, action, new_values)
    VALUES ('SYSTEM', 'correct_layer1_r_rule', json_build_object(
        'corrected_rewards_count', corrected_count,
        'new_rule', 'Layer 1 R position only requires Level 2+, no direct referrals',
        'correction_timestamp', NOW()
    ));
    
    RAISE NOTICE 'Layer 1 R rule correction completed: % rewards updated with simplified rule', corrected_count;
    
END $correct_layer1_r_rule$;