-- ================================
-- UPDATED TRIGGERS WITH DIRECT REFERRER REQUIREMENTS AND 72-HOUR COUNTDOWN
-- ================================

-- Drop existing triggers to replace them
DROP TRIGGER IF EXISTS trigger_membership_nft_claimed_auto ON member_nft_verification;
DROP TRIGGER IF EXISTS trigger_matrix_placement_rewards_auto ON referrals;
DROP FUNCTION IF EXISTS trigger_membership_nft_claimed();
DROP FUNCTION IF EXISTS trigger_matrix_placement_rewards();

-- ================================
-- HELPER FUNCTIONS
-- ================================

-- Function to check if user meets direct referrer requirements
CREATE OR REPLACE FUNCTION check_direct_referrer_requirement(user_wallet VARCHAR(42), target_level INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    required_referrers INTEGER;
    actual_referrers INTEGER;
BEGIN
    -- Get required direct referrers for target level
    SELECT direct_referrers_required INTO required_referrers
    FROM level_config 
    WHERE level = target_level;
    
    -- Count activated direct referrers
    SELECT COUNT(*) INTO actual_referrers
    FROM users u
    JOIN members m ON u.wallet_address = m.wallet_address
    WHERE u.referrer_wallet = user_wallet 
    AND m.is_activated = true;
    
    -- Return true if requirement is met
    RETURN actual_referrers >= COALESCE(required_referrers, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get user's direct referrer count
CREATE OR REPLACE FUNCTION get_direct_referrer_count(user_wallet VARCHAR(42))
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*) INTO count
    FROM users u
    JOIN members m ON u.wallet_address = m.wallet_address
    WHERE u.referrer_wallet = user_wallet 
    AND m.is_activated = true;
    
    RETURN COALESCE(count, 0);
END;
$$ LANGUAGE plpgsql;

-- ================================
-- UPDATED TRIGGER 1: NFT Claim with Referrer Requirements and 72h Countdown
-- ================================

CREATE OR REPLACE FUNCTION trigger_membership_nft_claimed()
RETURNS TRIGGER AS $$
DECLARE
    level_info RECORD;
    current_tier INTEGER;
    bcc_unlock_amount NUMERIC;
    direct_referrers_count INTEGER;
    required_referrers INTEGER;
    countdown_expires_at TIMESTAMP;
    can_activate_immediately BOOLEAN := false;
BEGIN
    -- Only process completed NFT claims
    IF NEW.status = 'claimed' AND (OLD.status IS NULL OR OLD.status != 'claimed') THEN
        
        -- Get level configuration
        SELECT * INTO level_info 
        FROM level_config 
        WHERE level = NEW.member_level;
        
        IF level_info IS NOT NULL THEN
            -- Get current direct referrer count
            direct_referrers_count := get_direct_referrer_count(NEW.wallet_address);
            required_referrers := level_info.direct_referrers_required;
            
            -- Check if user can activate immediately
            can_activate_immediately := (direct_referrers_count >= required_referrers);
            
            -- Set countdown expiry (72 hours from now)
            countdown_expires_at := NOW() + INTERVAL '72 hours';
            
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
            
            IF can_activate_immediately THEN
                -- IMMEDIATE ACTIVATION: User meets referrer requirements
                
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
                    'Congratulations! Your Level ' || NEW.member_level || ' membership has been activated immediately. You received ' || bcc_unlock_amount || ' BCC.',
                    'member_activated',
                    NEW.wallet_address,
                    NEW.member_level,
                    'high',
                    false
                );
                
            ELSE
                -- PENDING ACTIVATION: User needs to meet referrer requirements within 72 hours
                
                -- Create pending upgrade record
                INSERT INTO member_upgrade_pending (
                    wallet_address,
                    target_level,
                    current_level,
                    upgrade_fee_paid,
                    direct_referrers_count,
                    direct_referrers_required,
                    countdown_expires_at,
                    status,
                    payment_tx_hash
                ) VALUES (
                    NEW.wallet_address,
                    NEW.member_level,
                    COALESCE((SELECT current_level FROM members WHERE wallet_address = NEW.wallet_address), 0),
                    level_info.total_price,
                    direct_referrers_count,
                    required_referrers,
                    countdown_expires_at,
                    'pending',
                    NEW.tx_hash
                );
                
                -- Send pending notification with countdown
                INSERT INTO user_notifications (
                    wallet_address,
                    title,
                    message,
                    type,
                    trigger_wallet,
                    level,
                    priority,
                    action_required,
                    expires_at
                ) VALUES (
                    NEW.wallet_address,
                    'Membership Pending - Action Required!',
                    'Your Level ' || NEW.member_level || ' membership is pending. You need ' || (required_referrers - direct_referrers_count) || ' more direct activated referrers within 72 hours to activate. Current: ' || direct_referrers_count || '/' || required_referrers,
                    'upgrade_reminder',
                    NEW.wallet_address,
                    NEW.member_level,
                    'urgent',
                    true,
                    countdown_expires_at
                );
            END IF;
            
            -- Update BCC staking tier counters (regardless of immediate vs pending)
            UPDATE bcc_staking_tiers SET
                current_activations = current_activations + 1
            WHERE tier_id = current_tier;
            
            -- Update global pool stats (regardless of immediate vs pending)
            UPDATE bcc_global_pool SET
                total_members_activated = total_members_activated + 1,
                total_bcc_locked = total_bcc_locked + bcc_unlock_amount::integer,
                last_updated = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_membership_nft_claimed_auto
    AFTER UPDATE ON member_nft_verification
    FOR EACH ROW
    EXECUTE FUNCTION trigger_membership_nft_claimed();

-- ================================
-- UPDATED TRIGGER 2: Matrix placement rewards with strict level requirements
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
    layer_reward_base INTEGER;
BEGIN
    -- Only process active placements
    IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
        
        -- Calculate rewards for layers based on exact level matching
        -- Layer X rewards require >= Level X membership
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
                WHERE wallet_address = upline_wallet 
                AND is_activated = true;
                
                -- Only proceed if upline exists, is activated, and meets level requirement
                IF upline_level IS NOT NULL AND upline_level >= reward_layer THEN
                    
                    -- Get NFT price for the layer as reward base (100% of NFT price)
                    SELECT nft_price INTO layer_reward_base
                    FROM level_config 
                    WHERE level = reward_layer;
                    
                    -- Get current tier multiplier
                    SELECT unlock_multiplier INTO tier_multiplier
                    FROM bcc_staking_tiers
                    WHERE phase = 'active'
                    ORDER BY tier_id
                    LIMIT 1;
                    
                    -- Reward = 100% of NFT price for that layer
                    reward_amount := layer_reward_base;  -- Already in cents
                    
                    -- Set expiry time (72 hours)
                    expires_at := NOW() + INTERVAL '72 hours';
                    
                    -- Reward is claimable immediately (user already qualified)
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
                        'Matrix Reward Earned!',
                        'You earned $' || (reward_amount/100.0) || ' USDT from layer ' || reward_layer || ' placement (100% of Level ' || reward_layer || ' NFT price).',
                        'reward_received',
                        NEW.member_wallet,
                        reward_layer,
                        reward_amount,
                        'USDT',
                        'normal',
                        expires_at
                    );
                    
                ELSE
                    -- User doesn't qualify - no pending reward, they miss this opportunity
                    -- This enforces the strict "Level X rewards require >= Level X" rule
                    NULL;
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

-- Create the trigger
CREATE TRIGGER trigger_matrix_placement_rewards_auto
    AFTER UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_matrix_placement_rewards();

-- ================================
-- CRON JOB FUNCTIONS FOR 72-HOUR COUNTDOWN MANAGEMENT
-- ================================

-- Function to check pending upgrades and activate when requirements are met
CREATE OR REPLACE FUNCTION process_pending_upgrades()
RETURNS INTEGER AS $$
DECLARE
    pending_upgrade RECORD;
    current_referrers INTEGER;
    processed_count INTEGER := 0;
    level_info RECORD;
    current_tier INTEGER;
    bcc_unlock_amount NUMERIC;
BEGIN
    -- Process all pending upgrades
    FOR pending_upgrade IN
        SELECT * FROM member_upgrade_pending 
        WHERE status = 'pending'
        AND countdown_expires_at > NOW()  -- Not expired yet
    LOOP
        -- Get current direct referrer count
        current_referrers := get_direct_referrer_count(pending_upgrade.wallet_address);
        
        -- Check if user now meets requirements
        IF current_referrers >= pending_upgrade.direct_referrers_required THEN
            
            -- Get level configuration
            SELECT * INTO level_info 
            FROM level_config 
            WHERE level = pending_upgrade.target_level;
            
            -- Determine current BCC staking tier
            SELECT tier_id INTO current_tier
            FROM bcc_staking_tiers
            WHERE phase = 'active'
            ORDER BY tier_id
            LIMIT 1;
            
            -- Calculate BCC unlock amount
            bcc_unlock_amount := CASE current_tier
                WHEN 1 THEN level_info.tier_1_release
                WHEN 2 THEN level_info.tier_2_release
                WHEN 3 THEN level_info.tier_3_release
                WHEN 4 THEN level_info.tier_4_release
                ELSE level_info.tier_1_release
            END;
            
            -- ACTIVATE THE MEMBERSHIP
            
            -- Update members table
            UPDATE members SET
                is_activated = true,
                activated_at = NOW(),
                current_level = GREATEST(current_level, pending_upgrade.target_level),
                levels_owned = levels_owned || jsonb_build_array(pending_upgrade.target_level),
                last_upgrade_at = NOW(),
                updated_at = NOW()
            WHERE wallet_address = pending_upgrade.wallet_address;
            
            -- Update user_balances with BCC unlock
            UPDATE user_balances SET
                bcc_restricted = bcc_restricted + bcc_unlock_amount::integer,
                activation_tier = COALESCE(activation_tier, current_tier),
                last_updated = NOW()
            WHERE wallet_address = pending_upgrade.wallet_address;
            
            -- Record BCC unlock in history
            INSERT INTO bcc_unlock_history (
                wallet_address,
                unlock_level,
                unlock_amount,
                unlock_tier
            ) VALUES (
                pending_upgrade.wallet_address,
                pending_upgrade.target_level,
                bcc_unlock_amount::integer,
                'tier_' || current_tier
            );
            
            -- Activate referral relationships
            UPDATE referrals SET
                is_active = true
            WHERE member_wallet = pending_upgrade.wallet_address;
            
            -- Update pending upgrade status
            UPDATE member_upgrade_pending SET
                status = 'activated',
                direct_referrers_count = current_referrers,
                updated_at = NOW()
            WHERE id = pending_upgrade.id;
            
            -- Send activation notification
            INSERT INTO user_notifications (
                wallet_address,
                title,
                message,
                type,
                trigger_wallet,
                level,
                priority
            ) VALUES (
                pending_upgrade.wallet_address,
                'Membership Activated!',
                'Congratulations! Your Level ' || pending_upgrade.target_level || ' membership has been activated. You now have ' || current_referrers || ' direct referrers and received ' || bcc_unlock_amount || ' BCC.',
                'member_activated',
                pending_upgrade.wallet_address,
                pending_upgrade.target_level,
                'high'
            );
            
            -- Trigger reward calculations for upline
            PERFORM process_membership_rewards(pending_upgrade.wallet_address, pending_upgrade.target_level);
            
            processed_count := processed_count + 1;
        END IF;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to handle expired upgrade countdowns
CREATE OR REPLACE FUNCTION process_expired_upgrades()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
    expired_upgrade RECORD;
BEGIN
    -- Find all expired pending upgrades
    FOR expired_upgrade IN
        SELECT * FROM member_upgrade_pending 
        WHERE status = 'pending'
        AND countdown_expires_at <= NOW()
    LOOP
        -- Mark as expired
        UPDATE member_upgrade_pending SET
            status = 'expired',
            updated_at = NOW()
        WHERE id = expired_upgrade.id;
        
        -- Send expiry notification
        INSERT INTO user_notifications (
            wallet_address,
            title,
            message,
            type,
            level,
            priority
        ) VALUES (
            expired_upgrade.wallet_address,
            'Membership Upgrade Expired',
            'Your Level ' || expired_upgrade.target_level || ' membership upgrade has expired. You had ' || expired_upgrade.direct_referrers_count || '/' || expired_upgrade.direct_referrers_required || ' direct referrers. You can try again by purchasing a new NFT.',
            'system_announcement',
            expired_upgrade.target_level,
            'normal'
        );
        
        expired_count := expired_count + 1;
    END LOOP;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- TEST FUNCTIONS
-- ================================

-- Function to get upgrade status for a user
CREATE OR REPLACE FUNCTION get_user_upgrade_status(user_wallet VARCHAR(42))
RETURNS TABLE(
    target_level INTEGER,
    status TEXT,
    direct_referrers INTEGER,
    required_referrers INTEGER,
    time_remaining INTERVAL,
    can_activate BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mup.target_level,
        mup.status,
        get_direct_referrer_count(user_wallet) as direct_referrers,
        mup.direct_referrers_required as required_referrers,
        (mup.countdown_expires_at - NOW()) as time_remaining,
        (get_direct_referrer_count(user_wallet) >= mup.direct_referrers_required) as can_activate
    FROM member_upgrade_pending mup
    WHERE mup.wallet_address = user_wallet
    AND mup.status = 'pending'
    ORDER BY mup.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

SELECT 'Updated triggers with referrer requirements deployed successfully!' as status,
       'Level 2&3 need 2 direct referrers, 72h countdown, Layer X rewards require Level X+' as summary;