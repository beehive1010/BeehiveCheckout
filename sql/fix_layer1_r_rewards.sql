-- Fix Layer 1 R position rewards that were created with incorrect rules
-- These rewards should require Level 2+ AND 3+ direct referrals

DO $fix_layer1_r_rewards$ 
DECLARE
    reward_record RECORD;
    current_direct_referrals INTEGER;
    should_be_claimable BOOLEAN;
    corrected_count INTEGER := 0;
    made_pending_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting Layer 1 R position rewards correction...';
    
    -- Process all Layer 1 R position rewards
    FOR reward_record IN 
        SELECT * FROM layer_rewards 
        WHERE matrix_layer = 1 AND layer_position = 'R'
        ORDER BY created_at
    LOOP
        RAISE NOTICE 'Processing reward ID: % for wallet: %', 
                     reward_record.id, reward_record.reward_recipient_wallet;
        
        -- Get current direct referrals count
        SELECT COUNT(*) INTO current_direct_referrals
        FROM referrals_new
        WHERE referrer_wallet = reward_record.reward_recipient_wallet;
        
        -- Determine if reward should be claimable based on Layer 1 R rules:
        -- 1. User must be Level 2+ 
        -- 2. User must have 3+ direct referrals
        should_be_claimable := (
            reward_record.recipient_current_level >= 2 AND 
            current_direct_referrals >= 3
        );
        
        RAISE NOTICE 'Wallet: %, Current Level: %, Direct Referrals: %, Should be claimable: %',
                     reward_record.reward_recipient_wallet,
                     reward_record.recipient_current_level,
                     current_direct_referrals,
                     should_be_claimable;
        
        -- Update the reward with correct requirements and status
        UPDATE layer_rewards
        SET 
            -- Fix the rule requirements
            recipient_required_level = 2,  -- Layer 1 R always requires Level 2+
            direct_referrals_required = 3, -- Layer 1 R requires 3+ direct referrals
            direct_referrals_current = current_direct_referrals,
            requires_direct_referrals = true, -- Layer 1 R position ALWAYS requires direct referrals
            
            -- Fix the status based on current situation
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
        
        -- Create countdown timer for pending rewards
        IF NOT should_be_claimable THEN
            -- Check if timer already exists
            IF NOT EXISTS (
                SELECT 1 FROM countdown_timers 
                WHERE related_reward_id = reward_record.id AND is_active = true
            ) THEN
                INSERT INTO countdown_timers (
                    wallet_address,
                    timer_type,
                    title,
                    description,
                    start_time,
                    end_time,
                    is_active,
                    auto_action,
                    metadata,
                    related_reward_id
                ) VALUES (
                    reward_record.reward_recipient_wallet,
                    'pending_reward',
                    'Layer 1 R Position Reward Countdown',
                    format('You need Level 2+ and 3+ direct referrals to claim this %s USDT reward. Time remaining: 72 hours.',
                           reward_record.reward_amount),
                    NOW(),
                    NOW() + INTERVAL '72 hours',
                    true,
                    'expire_reward',
                    json_build_object(
                        'reward_id', reward_record.id,
                        'reward_amount', reward_record.reward_amount,
                        'required_level', 2,
                        'required_direct_referrals', 3,
                        'current_level', reward_record.recipient_current_level,
                        'current_direct_referrals', current_direct_referrals,
                        'is_layer_1_r_special_rule', true
                    ),
                    reward_record.id
                );
                
                made_pending_count := made_pending_count + 1;
                RAISE NOTICE 'Created countdown timer for pending reward: %', reward_record.id;
            END IF;
        END IF;
        
        corrected_count := corrected_count + 1;
    END LOOP;
    
    -- Log the correction summary
    INSERT INTO audit_logs (user_wallet, action, new_values)
    VALUES ('SYSTEM', 'fix_layer1_r_rewards', json_build_object(
        'corrected_rewards_count', corrected_count,
        'made_pending_count', made_pending_count,
        'correction_timestamp', NOW(),
        'description', 'Fixed Layer 1 R position rewards to require Level 2+ and 3+ direct referrals'
    ));
    
    RAISE NOTICE 'Layer 1 R rewards correction completed:';
    RAISE NOTICE '- Total rewards corrected: %', corrected_count;
    RAISE NOTICE '- Rewards made pending (with timers): %', made_pending_count;
    
END $fix_layer1_r_rewards$;