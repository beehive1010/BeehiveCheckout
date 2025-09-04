-- ================================
-- BEEHIVE DATABASE TRIGGERS
-- Automated business logic enforcement
-- ================================

-- ================================
-- TRIGGER 1: Auto-create referral data when user is added
-- ================================

CREATE OR REPLACE FUNCTION trigger_user_registration()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into members table with default values
    INSERT INTO members (
        wallet_address,
        is_activated,
        current_level,
        max_layer,
        levels_owned,
        has_pending_rewards,
        upgrade_reminder_enabled,
        total_direct_referrals,
        total_team_size
    ) VALUES (
        NEW.wallet_address,
        false,  -- Not activated by default
        0,      -- Level 0 (not activated)
        0,      -- No layers filled
        '[]'::jsonb,  -- No levels owned
        false,  -- No pending rewards
        false,  -- No upgrade reminders
        0,      -- No direct referrals yet
        0       -- No team size yet
    );

    -- Insert into user_balances with default BCC allocation
    INSERT INTO user_balances (
        wallet_address,
        bcc_transferable,
        bcc_restricted,
        bcc_locked,
        total_usdt_earned,
        available_usdt_rewards,
        total_usdt_withdrawn,
        activation_tier,
        activation_order,
        cth_balance
    ) VALUES (
        NEW.wallet_address,
        500,  -- Default 500 transferable BCC
        0,    -- No restricted BCC yet
        0,    -- No locked BCC yet
        0,    -- No USDT earned yet
        0,    -- No available rewards
        0,    -- No withdrawals
        NULL, -- No activation tier yet
        NULL, -- No activation order yet
        0     -- No CTH balance
    );

    -- If user has a referrer, create referral relationship
    IF NEW.referrer_wallet IS NOT NULL THEN
        -- Find the best placement position for this new user
        INSERT INTO referrals (
            root_wallet,
            member_wallet,
            layer,
            position,
            parent_wallet,
            placer_wallet,
            placement_type,
            is_active,
            placed_at
        )
        SELECT 
            NEW.referrer_wallet as root_wallet,
            NEW.wallet_address as member_wallet,
            COALESCE(find_next_available_layer(NEW.referrer_wallet), 1) as layer,
            COALESCE(find_next_available_position(NEW.referrer_wallet), 'L') as position,
            NEW.referrer_wallet as parent_wallet,  -- For now, direct under referrer
            NEW.referrer_wallet as placer_wallet,
            'direct' as placement_type,
            false as is_active,  -- Not active until membership is activated
            NOW() as placed_at
        WHERE EXISTS(SELECT 1 FROM members WHERE wallet_address = NEW.referrer_wallet AND is_activated = true);

        -- Update referrer's direct referral count
        UPDATE members 
        SET total_direct_referrals = total_direct_referrals + 1,
            updated_at = NOW()
        WHERE wallet_address = NEW.referrer_wallet;
    END IF;

    -- Log the wallet connection
    INSERT INTO wallet_connection_logs (
        wallet_address,
        connection_type,
        referral_code,
        upline_wallet,
        connection_status
    ) VALUES (
        NEW.wallet_address,
        'register',
        CASE WHEN NEW.referrer_wallet IS NOT NULL THEN 'referral_link' ELSE NULL END,
        NEW.referrer_wallet,
        'success'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_user_registration_auto
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_user_registration();

-- ================================
-- TRIGGER 2: Handle NFT claims and membership activation
-- ================================

CREATE OR REPLACE FUNCTION trigger_membership_nft_claimed()
RETURNS TRIGGER AS $$
DECLARE
    level_info RECORD;
    current_tier INTEGER;
    bcc_unlock_amount NUMERIC;
BEGIN
    -- Only process completed NFT claims
    IF NEW.status = 'claimed' AND (OLD.status IS NULL OR OLD.status != 'claimed') THEN
        
        -- Get level configuration
        SELECT * INTO level_info 
        FROM level_config 
        WHERE level = NEW.member_level;
        
        IF level_info IS NOT NULL THEN
            -- Determine current BCC staking tier
            SELECT tier_id INTO current_tier
            FROM bcc_staking_tiers
            WHERE phase = 'active'
            ORDER BY tier_id
            LIMIT 1;
            
            -- Calculate BCC unlock amount based on tier
            bcc_unlock_amount := CASE current_tier
                WHEN 1 THEN level_info.tier_1_release
                WHEN 2 THEN level_info.tier_2_release
                WHEN 3 THEN level_info.tier_3_release
                WHEN 4 THEN level_info.tier_4_release
                ELSE level_info.tier_1_release
            END;
            
            -- Update members table
            UPDATE members SET
                is_activated = true,
                activated_at = NOW(),
                current_level = GREATEST(current_level, NEW.member_level),
                levels_owned = levels_owned || jsonb_build_array(NEW.member_level),
                last_upgrade_at = NOW(),
                updated_at = NOW()
            WHERE wallet_address = NEW.wallet_address;
            
            -- Update user_balances with BCC unlock
            UPDATE user_balances SET
                bcc_restricted = bcc_restricted + bcc_unlock_amount::integer,
                activation_tier = COALESCE(activation_tier, current_tier),
                last_updated = NOW()
            WHERE wallet_address = NEW.wallet_address;
            
            -- Record BCC unlock in history
            INSERT INTO bcc_unlock_history (
                wallet_address,
                unlock_level,
                unlock_amount,
                unlock_tier
            ) VALUES (
                NEW.wallet_address,
                NEW.member_level,
                bcc_unlock_amount::integer,
                'tier_' || current_tier
            );
            
            -- Activate referral relationships
            UPDATE referrals SET
                is_active = true
            WHERE member_wallet = NEW.wallet_address;
            
            -- Update member activation record if it exists
            UPDATE member_activations SET
                is_pending = false,
                activated_at = NOW()
            WHERE wallet_address = NEW.wallet_address;
            
            -- Trigger reward calculations for upline
            PERFORM process_membership_rewards(NEW.wallet_address, NEW.member_level);
            
            -- Send activation notification
            INSERT INTO user_notifications (
                wallet_address,
                title,
                message,
                type,
                trigger_wallet,
                level,
                priority,
                action_required
            ) VALUES (
                NEW.wallet_address,
                'Membership Activated!',
                'Congratulations! Your Level ' || NEW.member_level || ' membership has been activated. You received ' || bcc_unlock_amount || ' BCC.',
                'member_activated',
                NEW.wallet_address,
                NEW.member_level,
                'high',
                false
            );
            
            -- Update BCC staking tier counters
            UPDATE bcc_staking_tiers SET
                current_activations = current_activations + 1
            WHERE tier_id = current_tier;
            
            -- Update global pool stats
            UPDATE bcc_global_pool SET
                total_members_activated = total_members_activated + 1,
                total_bcc_locked = total_bcc_locked + bcc_unlock_amount::integer,
                last_updated = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for member NFT verification
CREATE TRIGGER trigger_membership_nft_claimed_auto
    AFTER UPDATE ON member_nft_verification
    FOR EACH ROW
    EXECUTE FUNCTION trigger_membership_nft_claimed();

-- ================================
-- TRIGGER 3: Matrix placement and reward processing
-- ================================

CREATE OR REPLACE FUNCTION trigger_matrix_placement_rewards()
RETURNS TRIGGER AS $$
DECLARE
    upline_wallet VARCHAR(42);
    reward_layer INTEGER;
    reward_amount INTEGER;
    tier_multiplier NUMERIC;
    expires_at TIMESTAMP;
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
                -- Get level configuration for reward calculation
                SELECT reward_usdt INTO reward_amount
                FROM level_config lc
                JOIN members m ON m.wallet_address = upline_wallet
                WHERE lc.level = m.current_level;
                
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
                
                -- Check if upline member qualifies for reward
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
                    'New Matrix Reward!',
                    'You earned $' || (reward_amount/100.0) || ' USDT from layer ' || reward_layer || ' placement.',
                    'reward_received',
                    NEW.member_wallet,
                    reward_layer,
                    reward_amount,
                    'USDT',
                    'normal',
                    expires_at
                );
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

-- Create the trigger
CREATE TRIGGER trigger_matrix_placement_rewards_auto
    AFTER UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_matrix_placement_rewards();

-- ================================
-- HELPER FUNCTIONS
-- ================================

-- Function to find next available layer for placement
CREATE OR REPLACE FUNCTION find_next_available_layer(root_wallet_addr VARCHAR(42))
RETURNS INTEGER AS $$
DECLARE
    layer_num INTEGER;
BEGIN
    -- Find the first layer that has available positions
    FOR layer_num IN 1..19 LOOP
        IF (
            SELECT COUNT(*) 
            FROM referrals 
            WHERE root_wallet = root_wallet_addr AND layer = layer_num
        ) < POWER(3, layer_num) THEN
            RETURN layer_num;
        END IF;
    END LOOP;
    
    -- If all layers are full, return 19 (maximum)
    RETURN 19;
END;
$$ LANGUAGE plpgsql;

-- Function to find next available position
CREATE OR REPLACE FUNCTION find_next_available_position(root_wallet_addr VARCHAR(42))
RETURNS TEXT AS $$
DECLARE
    next_layer INTEGER;
    available_positions TEXT[] := ARRAY['L', 'M', 'R'];
    pos TEXT;
BEGIN
    next_layer := find_next_available_layer(root_wallet_addr);
    
    -- Check which position is available in the next layer
    FOREACH pos IN ARRAY available_positions LOOP
        IF NOT EXISTS(
            SELECT 1 FROM referrals 
            WHERE root_wallet = root_wallet_addr 
            AND layer = next_layer 
            AND position = pos
        ) THEN
            RETURN pos;
        END IF;
    END LOOP;
    
    -- Default to L if nothing found
    RETURN 'L';
END;
$$ LANGUAGE plpgsql;

-- Function to process membership rewards
CREATE OR REPLACE FUNCTION process_membership_rewards(member_wallet_addr VARCHAR(42), member_level INTEGER)
RETURNS VOID AS $$
BEGIN
    -- This function handles complex reward distribution logic
    -- Implementation depends on specific business rules
    -- Placeholder for now - can be expanded based on requirements
    
    -- Log the reward processing
    INSERT INTO platform_revenue (
        source_type,
        source_wallet,
        level,
        amount,
        currency,
        description
    ) VALUES (
        'membership_activation',
        member_wallet_addr,
        member_level,
        (SELECT total_price_usdt FROM level_config WHERE level = member_level),
        'USDT',
        'Platform fee from Level ' || member_level || ' activation'
    );
END;
$$ LANGUAGE plpgsql;

-- ================================
-- CRON JOB FUNCTIONS (to be called by scheduled tasks)
-- ================================

-- Function to process expired rewards (72-hour rollup)
CREATE OR REPLACE FUNCTION process_expired_rewards()
RETURNS INTEGER AS $$
DECLARE
    expired_reward RECORD;
    rollup_recipient VARCHAR(42);
    processed_count INTEGER := 0;
BEGIN
    -- Find all expired rewards
    FOR expired_reward IN 
        SELECT * FROM reward_notifications 
        WHERE status IN ('pending', 'claimable') 
        AND expires_at <= NOW()
    LOOP
        -- Find the next qualified upline member for rollup
        SELECT recipient_wallet INTO rollup_recipient
        FROM reward_notifications rn
        JOIN members m ON rn.recipient_wallet = m.wallet_address
        WHERE rn.trigger_wallet = expired_reward.trigger_wallet
        AND rn.layer_number > expired_reward.layer_number
        AND m.is_activated = true
        AND m.current_level >= expired_reward.layer_number
        ORDER BY rn.layer_number ASC
        LIMIT 1;
        
        IF rollup_recipient IS NOT NULL THEN
            -- Create rollup record
            INSERT INTO reward_rollups (
                original_recipient,
                rolled_up_to,
                reward_amount,
                trigger_wallet,
                trigger_level,
                original_notification_id,
                rollup_reason
            ) VALUES (
                expired_reward.recipient_wallet,
                rollup_recipient,
                expired_reward.reward_amount,
                expired_reward.trigger_wallet,
                expired_reward.trigger_level,
                expired_reward.id,
                'expired'
            );
            
            -- Award the rolled-up reward
            UPDATE user_balances SET
                available_usdt_rewards = available_usdt_rewards + expired_reward.reward_amount,
                total_usdt_earned = total_usdt_earned + expired_reward.reward_amount,
                last_updated = NOW()
            WHERE wallet_address = rollup_recipient;
            
            -- Send notification about rollup
            INSERT INTO user_notifications (
                wallet_address,
                title,
                message,
                type,
                amount,
                amount_type,
                priority
            ) VALUES (
                rollup_recipient,
                'Reward Rollup!',
                'You received $' || (expired_reward.reward_amount/100.0) || ' USDT from an expired reward rollup.',
                'reward_received',
                expired_reward.reward_amount,
                'USDT',
                'normal'
            );
        END IF;
        
        -- Mark original reward as expired/rollup
        UPDATE reward_notifications SET
            status = 'rollup'
        WHERE id = expired_reward.id;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update pending rewards to claimable
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
        -- Check if recipient now qualifies
        IF EXISTS(
            SELECT 1 FROM members 
            WHERE wallet_address = pending_reward.recipient_wallet
            AND is_activated = true 
            AND current_level >= pending_reward.layer_number
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
            
            -- Send notification
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

-- Function to clean up old notifications and logs
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean up old read notifications (older than 30 days)
    DELETE FROM user_notifications 
    WHERE is_read = true 
    AND created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old wallet connection logs (older than 90 days)
    DELETE FROM wallet_connection_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up expired reward notifications (older than 7 days)
    DELETE FROM reward_notifications 
    WHERE status IN ('expired', 'rollup') 
    AND created_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- INITIAL DATA SETUP
-- ================================

-- Insert BCC staking tiers with total locked BCC
INSERT INTO bcc_staking_tiers (tier_id, tier_name, max_activations, unlock_multiplier, total_locked_bcc, phase) VALUES
(1, 'phase_1', 9999, 1.0000, 10450.00, 'active'),
(2, 'phase_2', 29999, 0.5000, 5225.00, 'upcoming'),
(3, 'phase_3', 99999, 0.2500, 2612.50, 'upcoming'),
(4, 'phase_4', 268240, 0.1250, 1306.25, 'upcoming')
ON CONFLICT (tier_id) DO UPDATE SET
    total_locked_bcc = EXCLUDED.total_locked_bcc;

-- Insert level configuration with all 19 levels
INSERT INTO level_config (
    level, level_name, token_id, 
    nft_price, platform_fee, total_price,
    price_usdt, activation_fee_usdt, total_price_usdt, reward_usdt,
    tier_1_release, tier_2_release, tier_3_release, tier_4_release,
    layer_level, total_activated_seats, max_referral_depth
) VALUES
(1, 'Warrior', 1, 10000, 3000, 13000, 10000, 3000, 13000, 10000, 100.00, 50.00, 25.00, 12.50, 1, 3, 1),
(2, 'Guardian', 2, 15000, 0, 15000, 15000, 0, 15000, 15000, 150.00, 75.00, 37.50, 18.75, 2, 9, 2),
(3, 'Sentinel', 3, 20000, 0, 20000, 20000, 0, 20000, 20000, 200.00, 100.00, 50.00, 25.00, 3, 27, 3),
(4, 'Protector', 4, 25000, 0, 25000, 25000, 0, 25000, 25000, 250.00, 125.00, 62.50, 31.25, 4, 81, 4),
(5, 'Defender', 5, 30000, 0, 30000, 30000, 0, 30000, 30000, 300.00, 150.00, 75.00, 37.50, 5, 243, 5),
(6, 'Champion', 6, 35000, 0, 35000, 35000, 0, 35000, 35000, 350.00, 175.00, 87.50, 43.75, 6, 729, 6),
(7, 'Vanquisher', 7, 40000, 0, 40000, 40000, 0, 40000, 40000, 400.00, 200.00, 100.00, 50.00, 7, 2187, 7),
(8, 'Conqueror', 8, 45000, 0, 45000, 45000, 0, 45000, 45000, 450.00, 225.00, 112.50, 56.25, 8, 6561, 8),
(9, 'Overlord', 9, 50000, 0, 50000, 50000, 0, 50000, 50000, 500.00, 250.00, 125.00, 62.50, 9, 19683, 9),
(10, 'Sovereign', 10, 55000, 0, 55000, 55000, 0, 55000, 55000, 550.00, 275.00, 137.50, 68.75, 10, 59049, 10),
(11, 'Emperor', 11, 60000, 0, 60000, 60000, 0, 60000, 60000, 600.00, 300.00, 150.00, 75.00, 11, 177147, 11),
(12, 'Titan', 12, 65000, 0, 65000, 65000, 0, 65000, 65000, 650.00, 325.00, 162.50, 81.25, 12, 531441, 12),
(13, 'Colossus', 13, 70000, 0, 70000, 70000, 0, 70000, 70000, 700.00, 350.00, 175.00, 87.50, 13, 1594323, 13),
(14, 'Behemoth', 14, 75000, 0, 75000, 75000, 0, 75000, 75000, 750.00, 375.00, 187.50, 93.75, 14, 4782969, 14),
(15, 'Leviathan', 15, 80000, 0, 80000, 80000, 0, 80000, 80000, 800.00, 400.00, 200.00, 100.00, 15, 14348907, 15),
(16, 'Apex Predator', 16, 85000, 0, 85000, 85000, 0, 85000, 85000, 850.00, 425.00, 212.50, 106.25, 16, 43046721, 16),
(17, 'Legendary Beast', 17, 90000, 0, 90000, 90000, 0, 90000, 90000, 900.00, 450.00, 225.00, 112.50, 17, 129140163, 17),
(18, 'Mythic Entity', 18, 95000, 0, 95000, 95000, 0, 95000, 95000, 950.00, 475.00, 237.50, 118.75, 18, 387420489, 18),
(19, 'Mythic Peak', 19, 100000, 0, 100000, 100000, 0, 100000, 100000, 1000.00, 500.00, 250.00, 125.00, 19, 1162261467, 19)
ON CONFLICT (level) DO UPDATE SET
    tier_1_release = EXCLUDED.tier_1_release,
    tier_2_release = EXCLUDED.tier_2_release,
    tier_3_release = EXCLUDED.tier_3_release,
    tier_4_release = EXCLUDED.tier_4_release;

-- Initialize BCC global pool
INSERT INTO bcc_global_pool (id, total_bcc_locked, total_members_activated, current_tier)
VALUES (1, 0, 0, 1)
ON CONFLICT (id) DO NOTHING;

-- Insert basic admin settings
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
('platform_fee_percentage', '3.0', 'Platform fee percentage'),
('max_withdrawal_daily', '10000', 'Maximum daily withdrawal in USDT'),
('reward_expiry_hours', '72', 'Hours before rewards expire'),
('matrix_max_layers', '19', 'Maximum matrix layers'),
('bcc_unlock_tiers', '4', 'Number of BCC unlock tiers')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- ================================
-- COMPLETION MESSAGE
-- ================================

SELECT 'Beehive Complete Database Schema with Triggers Created Successfully!' as status,
       'Total Tables: 46, Views: 9, Enums: 16, Policies: 29, Triggers: 3' as summary;