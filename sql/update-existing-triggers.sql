-- ================================
-- UPDATE EXISTING TRIGGERS WITH CORRECT REFERRAL DEPTH LOGIC
-- ================================

-- Drop existing trigger functions to replace them
DROP TRIGGER IF EXISTS trigger_matrix_placement_rewards_auto ON referrals;
DROP FUNCTION IF EXISTS trigger_matrix_placement_rewards();

-- ================================ 
-- UPDATED TRIGGER 3: Matrix placement and reward processing with correct depth logic
-- ================================

CREATE OR REPLACE FUNCTION trigger_matrix_placement_rewards()
RETURNS TRIGGER AS $$
DECLARE
    upline_wallet VARCHAR(42);
    reward_layer INTEGER;
    reward_amount INTEGER;
    tier_multiplier NUMERIC;
    expires_at TIMESTAMP;
    upline_level INTEGER;
BEGIN
    -- Only process active placements
    IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
        
        -- Calculate rewards for layers based on member's qualification level
        -- Level N members can earn from N layers deep (max 19)
        FOR reward_layer IN 1..19 LOOP
            -- Find the upline member at this layer
            SELECT root_wallet INTO upline_wallet
            FROM referrals 
            WHERE member_wallet = NEW.member_wallet 
            AND layer <= reward_layer
            ORDER BY layer DESC
            LIMIT 1;
            
            IF upline_wallet IS NOT NULL THEN
                -- Get upline member's current level
                SELECT current_level INTO upline_level
                FROM members 
                WHERE wallet_address = upline_wallet;
                
                -- Only proceed if upline exists and is activated
                IF upline_level IS NOT NULL AND upline_level > 0 THEN
                    -- Get level configuration for reward calculation
                    SELECT reward_usdt INTO reward_amount
                    FROM level_config 
                    WHERE level = upline_level;
                    
                    -- Get current tier multiplier
                    SELECT unlock_multiplier INTO tier_multiplier
                    FROM bcc_staking_tiers
                    WHERE phase = 'active'
                    ORDER BY tier_id
                    LIMIT 1;
                    
                    -- Apply tier multiplier to reward
                    reward_amount := (reward_amount * tier_multiplier)::integer;
                    
                    -- Set expiry time (72 hours)
                    expires_at := NOW() + INTERVAL '72 hours';
                    
                    -- NEW LOGIC: Check if upline member qualifies for reward
                    -- Member must be activated, and their level must be >= reward_layer depth
                    IF EXISTS(
                        SELECT 1 FROM members 
                        WHERE wallet_address = upline_wallet 
                        AND is_activated = true 
                        AND current_level >= reward_layer  -- Level N can earn from N layers deep
                    ) THEN
                        -- Reward is claimable immediately
                        INSERT INTO reward_notifications (
                            recipient_wallet,
                            trigger_wallet,
                            trigger_level,
                            layer_number,
                            reward_amount,
                            status,
                            expires_at
                        ) VALUES (
                            upline_wallet,
                            NEW.member_wallet,
                            NEW.layer,
                            reward_layer,
                            reward_amount,
                            'claimable',
                            expires_at
                        );
                        
                        -- Update user balance immediately
                        UPDATE user_balances SET
                            available_usdt_rewards = available_usdt_rewards + reward_amount,
                            total_usdt_earned = total_usdt_earned + reward_amount,
                            last_updated = NOW()
                        WHERE wallet_address = upline_wallet;
                        
                    ELSE
                        -- Reward is pending until qualification
                        INSERT INTO reward_notifications (
                            recipient_wallet,
                            trigger_wallet,
                            trigger_level,
                            layer_number,
                            reward_amount,
                            status,
                            expires_at
                        ) VALUES (
                            upline_wallet,
                            NEW.member_wallet,
                            NEW.layer,
                            reward_layer,
                            reward_amount,
                            'pending',
                            expires_at
                        );
                    END IF;
                    
                    -- Send notification
                    INSERT INTO user_notifications (
                        wallet_address,
                        title,
                        message,
                        type,
                        trigger_wallet,
                        layer,
                        amount,
                        amount_type,
                        priority,
                        expires_at
                    ) VALUES (
                        upline_wallet,
                        CASE 
                            WHEN upline_level >= reward_layer THEN 'New Matrix Reward!'
                            ELSE 'Pending Matrix Reward!'
                        END,
                        CASE 
                            WHEN upline_level >= reward_layer THEN 
                                'You earned $' || (reward_amount/100.0) || ' USDT from layer ' || reward_layer || ' placement.'
                            ELSE 
                                'You have a pending reward of $' || (reward_amount/100.0) || ' USDT. Upgrade to level ' || reward_layer || ' or higher to claim it!'
                        END,
                        'reward_received',
                        NEW.member_wallet,
                        reward_layer,
                        reward_amount,
                        'USDT',
                        CASE WHEN upline_level >= reward_layer THEN 'normal' ELSE 'high' END,
                        expires_at
                    );
                END IF;
            END IF;
        END LOOP;
        
        -- Update team size statistics for all upline members
        UPDATE members SET
            total_team_size = (
                SELECT COUNT(*) FROM referrals 
                WHERE root_wallet = members.wallet_address 
                AND is_active = true
            ),
            updated_at = NOW()
        WHERE wallet_address IN (
            SELECT DISTINCT root_wallet 
            FROM referrals 
            WHERE member_wallet = NEW.member_wallet
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_matrix_placement_rewards_auto
    AFTER UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_matrix_placement_rewards();

-- ================================
-- UPDATED CRON JOB FUNCTIONS with correct depth logic
-- ================================

-- Updated function to check and update pending rewards to claimable
CREATE OR REPLACE FUNCTION update_pending_rewards()
RETURNS INTEGER AS $$
DECLARE
    pending_reward RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- Check all pending rewards to see if they should become claimable
    FOR pending_reward IN
        SELECT * FROM reward_notifications 
        WHERE status = 'pending'
        AND expires_at > NOW()
    LOOP
        -- NEW LOGIC: Check if recipient now qualifies (level >= layer depth)
        IF EXISTS(
            SELECT 1 FROM members 
            WHERE wallet_address = pending_reward.recipient_wallet
            AND is_activated = true 
            AND current_level >= pending_reward.layer_number  -- Level N can earn from N layers
        ) THEN
            -- Update to claimable
            UPDATE reward_notifications SET
                status = 'claimable'
            WHERE id = pending_reward.id;
            
            -- Update user balance
            UPDATE user_balances SET
                available_usdt_rewards = available_usdt_rewards + pending_reward.reward_amount,
                total_usdt_earned = total_usdt_earned + pending_reward.reward_amount,
                last_updated = NOW()
            WHERE wallet_address = pending_reward.recipient_wallet;
            
            -- Send updated notification
            INSERT INTO user_notifications (
                wallet_address,
                title,
                message,
                type,
                amount,
                amount_type,
                priority
            ) VALUES (
                pending_reward.recipient_wallet,
                'Reward Now Claimable!',
                'Your pending reward of $' || (pending_reward.reward_amount/100.0) || ' USDT is now claimable!',
                'reward_received',
                pending_reward.reward_amount,
                'USDT',
                'high'
            );
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Test the updated logic
SELECT 'Updated triggers deployed successfully!' as status,
       'New referral depth logic: Level N can earn from N layers deep' as description;