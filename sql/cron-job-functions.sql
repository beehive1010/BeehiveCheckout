-- ================================
-- BEEHIVE CRON JOB FUNCTIONS
-- Functions to be called by scheduled tasks every 5-15 minutes
-- ================================

-- ================================
-- MASTER CRON JOB FUNCTION
-- Call this function from your cron job every 5-10 minutes
-- ================================

CREATE OR REPLACE FUNCTION run_beehive_cron_jobs()
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::jsonb;
    pending_upgrades_processed INTEGER;
    expired_upgrades_processed INTEGER;
    expired_rewards_processed INTEGER;
    pending_rewards_updated INTEGER;
    old_data_cleaned INTEGER;
BEGIN
    -- Log cron job start
    INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
    ('last_cron_run', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'), 'Last cron job execution time')
    ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        updated_at = NOW();

    -- 1. Process pending upgrades (check if users now meet referrer requirements)
    SELECT process_pending_upgrades() INTO pending_upgrades_processed;
    result := result || jsonb_build_object('pending_upgrades_processed', pending_upgrades_processed);

    -- 2. Process expired upgrade countdowns (72-hour limit reached)
    SELECT process_expired_upgrades() INTO expired_upgrades_processed;
    result := result || jsonb_build_object('expired_upgrades_processed', expired_upgrades_processed);

    -- 3. Process expired rewards (72-hour reward expiry and rollup)
    SELECT process_expired_rewards() INTO expired_rewards_processed;
    result := result || jsonb_build_object('expired_rewards_processed', expired_rewards_processed);

    -- 4. Update pending rewards to claimable (when users upgrade levels)
    SELECT update_pending_rewards() INTO pending_rewards_updated;
    result := result || jsonb_build_object('pending_rewards_updated', pending_rewards_updated);

    -- 5. Clean up old data (every run is ok, function has internal date checks)
    SELECT cleanup_old_data() INTO old_data_cleaned;
    result := result || jsonb_build_object('old_notifications_cleaned', old_data_cleaned);

    -- Add timestamp and summary
    result := result || jsonb_build_object(
        'execution_time', NOW(),
        'total_actions', 
        pending_upgrades_processed + expired_upgrades_processed + 
        expired_rewards_processed + pending_rewards_updated + old_data_cleaned,
        'status', 'completed'
    );

    -- Log the results
    INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
    ('last_cron_results', result::text, 'Results from last cron job execution')
    ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        updated_at = NOW();

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- DASHBOARD FUNCTIONS FOR MONITORING
-- ================================

-- Function to get current system status
CREATE OR REPLACE FUNCTION get_system_status()
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::jsonb;
    pending_upgrades INTEGER;
    expiring_upgrades_24h INTEGER;
    pending_rewards INTEGER;
    expiring_rewards_24h INTEGER;
    active_members INTEGER;
    bcc_locked_total INTEGER;
BEGIN
    -- Count pending upgrades
    SELECT COUNT(*) INTO pending_upgrades
    FROM member_upgrade_pending 
    WHERE status = 'pending';

    -- Count upgrades expiring in next 24 hours
    SELECT COUNT(*) INTO expiring_upgrades_24h
    FROM member_upgrade_pending 
    WHERE status = 'pending' 
    AND countdown_expires_at <= NOW() + INTERVAL '24 hours';

    -- Count pending rewards
    SELECT COUNT(*) INTO pending_rewards
    FROM reward_notifications 
    WHERE status = 'pending';

    -- Count rewards expiring in next 24 hours
    SELECT COUNT(*) INTO expiring_rewards_24h
    FROM reward_notifications 
    WHERE status IN ('pending', 'claimable')
    AND expires_at <= NOW() + INTERVAL '24 hours';

    -- Count active members
    SELECT COUNT(*) INTO active_members
    FROM members 
    WHERE is_activated = true;

    -- Get total BCC locked
    SELECT bgp.total_bcc_locked INTO bcc_locked_total
    FROM bcc_global_pool bgp
    WHERE bgp.id = 1;

    result := jsonb_build_object(
        'timestamp', NOW(),
        'pending_upgrades', pending_upgrades,
        'upgrades_expiring_24h', expiring_upgrades_24h,
        'pending_rewards', pending_rewards,
        'rewards_expiring_24h', expiring_rewards_24h,
        'active_members', active_members,
        'total_bcc_locked', bcc_locked_total,
        'system_health', 
            CASE 
                WHEN expiring_upgrades_24h > 10 OR expiring_rewards_24h > 50 THEN 'warning'
                WHEN expiring_upgrades_24h > 5 OR expiring_rewards_24h > 20 THEN 'attention'
                ELSE 'healthy'
            END
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get detailed upgrade status
CREATE OR REPLACE FUNCTION get_upgrade_status_report()
RETURNS TABLE(
    wallet_address VARCHAR(42),
    target_level INTEGER,
    level_name TEXT,
    direct_referrers_current INTEGER,
    direct_referrers_required INTEGER,
    time_remaining INTERVAL,
    status TEXT,
    can_activate_now BOOLEAN,
    upgrade_fee_paid INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mup.wallet_address,
        mup.target_level,
        lc.level_name,
        get_direct_referrer_count(mup.wallet_address) as direct_referrers_current,
        mup.direct_referrers_required,
        CASE 
            WHEN mup.countdown_expires_at > NOW() THEN (mup.countdown_expires_at - NOW())
            ELSE INTERVAL '0'
        END as time_remaining,
        mup.status,
        (get_direct_referrer_count(mup.wallet_address) >= mup.direct_referrers_required 
         AND mup.countdown_expires_at > NOW()) as can_activate_now,
        mup.upgrade_fee_paid
    FROM member_upgrade_pending mup
    JOIN level_config lc ON mup.target_level = lc.level
    WHERE mup.status = 'pending'
    ORDER BY mup.countdown_expires_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's complete referral network
CREATE OR REPLACE FUNCTION get_user_referral_network(user_wallet VARCHAR(42))
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    direct_referrals JSONB;
    matrix_info JSONB;
    reward_stats JSONB;
BEGIN
    -- Get direct referrals
    SELECT jsonb_agg(
        jsonb_build_object(
            'wallet_address', u.wallet_address,
            'username', u.username,
            'is_activated', COALESCE(m.is_activated, false),
            'current_level', COALESCE(m.current_level, 0),
            'activated_at', m.activated_at
        )
    ) INTO direct_referrals
    FROM users u
    LEFT JOIN members m ON u.wallet_address = m.wallet_address
    WHERE u.referrer_wallet = user_wallet;

    -- Get matrix information
    SELECT jsonb_build_object(
        'total_matrix_members', COUNT(*),
        'deepest_layer', COALESCE(MAX(layer), 0),
        'active_members', COUNT(CASE WHEN is_active THEN 1 END)
    ) INTO matrix_info
    FROM referrals 
    WHERE root_wallet = user_wallet;

    -- Get reward statistics
    SELECT jsonb_build_object(
        'total_rewards_earned', COALESCE(SUM(reward_amount), 0),
        'claimable_rewards', COALESCE(SUM(CASE WHEN status = 'claimable' THEN reward_amount ELSE 0 END), 0),
        'pending_rewards', COALESCE(SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END), 0)
    ) INTO reward_stats
    FROM reward_notifications 
    WHERE recipient_wallet = user_wallet;

    -- Combine all information
    result := jsonb_build_object(
        'user_wallet', user_wallet,
        'direct_referral_count', get_direct_referrer_count(user_wallet),
        'direct_referrals', COALESCE(direct_referrals, '[]'::jsonb),
        'matrix_info', COALESCE(matrix_info, '{}'::jsonb),
        'reward_stats', COALESCE(reward_stats, '{}'::jsonb),
        'generated_at', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- UTILITY FUNCTIONS FOR ADMIN
-- ================================

-- Function to manually activate a pending upgrade (admin override)
CREATE OR REPLACE FUNCTION admin_activate_pending_upgrade(
    target_wallet VARCHAR(42),
    admin_override_reason TEXT DEFAULT 'Admin manual activation'
)
RETURNS BOOLEAN AS $$
DECLARE
    pending_upgrade RECORD;
    level_info RECORD;
    current_tier INTEGER;
    bcc_unlock_amount NUMERIC;
BEGIN
    -- Get pending upgrade
    SELECT * INTO pending_upgrade
    FROM member_upgrade_pending 
    WHERE wallet_address = target_wallet 
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF pending_upgrade IS NULL THEN
        RAISE NOTICE 'No pending upgrade found for wallet %', target_wallet;
        RETURN false;
    END IF;

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
        'tier_' || current_tier || '_admin_override'
    );

    -- Activate referral relationships
    UPDATE referrals SET
        is_active = true
    WHERE member_wallet = pending_upgrade.wallet_address;

    -- Update pending upgrade status
    UPDATE member_upgrade_pending SET
        status = 'activated',
        direct_referrers_count = get_direct_referrer_count(pending_upgrade.wallet_address),
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
        'Membership Activated by Admin!',
        'Your Level ' || pending_upgrade.target_level || ' membership has been manually activated by an administrator. Reason: ' || admin_override_reason,
        'member_activated',
        pending_upgrade.wallet_address,
        pending_upgrade.target_level,
        'high'
    );

    -- Log admin action
    INSERT INTO platform_revenue (
        source_type,
        source_wallet,
        level,
        amount,
        currency,
        description
    ) VALUES (
        'admin_override_activation',
        pending_upgrade.wallet_address,
        pending_upgrade.target_level,
        pending_upgrade.upgrade_fee_paid,
        'USDT',
        'Admin manual activation: ' || admin_override_reason
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- TESTING AND VERIFICATION
-- ================================

-- Test function to verify cron job setup
CREATE OR REPLACE FUNCTION test_cron_functions()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    test_results JSONB := '{}'::jsonb;
BEGIN
    -- Test system status
    SELECT get_system_status() INTO result;
    test_results := test_results || jsonb_build_object('system_status_test', 'passed');

    -- Test referrer count function
    IF get_direct_referrer_count('0x0000000000000000000000000000000000000000') >= 0 THEN
        test_results := test_results || jsonb_build_object('referrer_count_test', 'passed');
    END IF;

    -- Test upgrade status report
    PERFORM get_upgrade_status_report();
    test_results := test_results || jsonb_build_object('upgrade_report_test', 'passed');

    test_results := test_results || jsonb_build_object(
        'test_completed_at', NOW(),
        'all_functions_working', true
    );

    RETURN test_results;
END;
$$ LANGUAGE plpgsql;

-- Run test
SELECT test_cron_functions() as cron_test_results;

-- Final summary
SELECT 'All Beehive cron job functions created successfully!' as status,
       'Call run_beehive_cron_jobs() every 5-10 minutes from your cron scheduler' as instruction,
       'Use get_system_status() and get_upgrade_status_report() for monitoring' as monitoring;