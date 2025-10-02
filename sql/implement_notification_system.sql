-- Implement Basic Notification System for Membership Activities
-- This uses the existing user_notifications table for key events like activations, rewards, etc.

-- 1. Create notification creation function using user_notifications table
CREATE OR REPLACE FUNCTION create_notification(
    p_user_wallet VARCHAR(42),
    p_type VARCHAR(50),
    p_title TEXT,
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_action_url TEXT DEFAULT NULL,
    p_priority INTEGER DEFAULT 1,
    p_category VARCHAR(50) DEFAULT 'general'
) RETURNS JSON AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO user_notifications (
        wallet_address,
        type,
        title,
        message,
        metadata,
        action_url,
        priority,
        category,
        created_at
    ) VALUES (
        p_user_wallet,
        p_type,
        p_title,
        p_message,
        p_metadata,
        p_action_url,
        p_priority,
        p_category,
        NOW()
    ) RETURNING id INTO notification_id;
    
    RETURN json_build_object(
        'success', true,
        'notification_id', notification_id,
        'type', p_type,
        'title', p_title
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Failed to create notification: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Create welcome notification for new activations
CREATE OR REPLACE FUNCTION create_welcome_notifications(
    p_wallet_address VARCHAR(42),
    p_activation_sequence INTEGER,
    p_placement_result JSONB DEFAULT NULL,
    p_rewards_result JSONB DEFAULT NULL,
    p_bcc_result JSONB DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    welcome_notification_result JSON;
    matrix_notification_result JSON;
    reward_notification_result JSON;
    bcc_notification_result JSON;
    notifications_created INTEGER := 0;
BEGIN
    -- 1. Welcome notification
    SELECT create_notification(
        p_wallet_address,
        'welcome'::VARCHAR(50),
        '🎉 Welcome to Beehive!'::TEXT,
        format('Congratulations! You have successfully activated your Level 1 NFT membership. Your activation sequence is #%s.', p_activation_sequence)::TEXT,
        json_build_object(
            'activation_sequence', p_activation_sequence,
            'level', 1,
            'timestamp', NOW()
        )::JSONB,
        NULL::TEXT,
        2::INTEGER,
        'membership'::VARCHAR(50)
    ) INTO welcome_notification_result;
    
    IF welcome_notification_result->>'success' = 'true' THEN
        notifications_created := notifications_created + 1;
    END IF;
    
    -- 2. Matrix placement notification
    IF p_placement_result IS NOT NULL AND p_placement_result->>'success' = 'true' THEN
        SELECT create_notification(
            p_wallet_address,
            'matrix_placement',
            '📊 Matrix Position Assigned',
            format('You have been placed in the matrix at Layer %s, Position %s. Your matrix journey begins now!', 
                p_placement_result->'placement'->>'matrix_layer',
                p_placement_result->'placement'->>'matrix_position'
            ),
            json_build_object(
                'matrix_root', p_placement_result->'placement'->>'matrix_root',
                'matrix_layer', p_placement_result->'placement'->>'matrix_layer',
                'matrix_position', p_placement_result->'placement'->>'matrix_position',
                'is_spillover', p_placement_result->'placement'->>'is_spillover'
            )
        ) INTO matrix_notification_result;
        
        IF matrix_notification_result->>'success' = 'true' THEN
            notifications_created := notifications_created + 1;
        END IF;
    END IF;
    
    -- 3. BCC unlock notification
    IF p_bcc_result IS NOT NULL AND p_bcc_result->>'success' = 'true' THEN
        SELECT create_notification(
            p_wallet_address,
            'bcc_unlock',
            '🪙 BCC Unlocked!',
            format('Great news! %s BCC has been unlocked and added to your available balance. Your new available balance is %s BCC.',
                p_bcc_result->>'release_amount',
                p_bcc_result->>'new_available_balance'
            ),
            json_build_object(
                'release_amount', p_bcc_result->>'release_amount',
                'new_available_balance', p_bcc_result->>'new_available_balance',
                'new_locked_balance', p_bcc_result->>'new_locked_balance',
                'level', 1
            )
        ) INTO bcc_notification_result;
        
        IF bcc_notification_result->>'success' = 'true' THEN
            notifications_created := notifications_created + 1;
        END IF;
    END IF;
    
    -- 4. Potential earnings notification
    SELECT create_notification(
        p_wallet_address,
        'earnings_info',
        '💰 Start Earning Rewards',
        'Your matrix is now active! You can earn $100 for each member that joins your Layer 1 positions (L-M-R). Invite friends to maximize your earnings!',
        json_build_object(
            'reward_per_member', 100,
            'max_layer1_positions', 3,
            'max_potential_earnings', 300,
            'next_steps', 'Invite friends and family to join your matrix'
        )
    ) INTO reward_notification_result;
    
    IF reward_notification_result->>'success' = 'true' THEN
        notifications_created := notifications_created + 1;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'notifications_created', notifications_created,
        'welcome_notification', welcome_notification_result,
        'matrix_notification', matrix_notification_result,
        'bcc_notification', bcc_notification_result,
        'reward_notification', reward_notification_result
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Failed to create welcome notifications: ' || SQLERRM,
        'notifications_created', notifications_created
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Create reward earned notification function
CREATE OR REPLACE FUNCTION create_reward_earned_notification(
    p_recipient_wallet VARCHAR(42),
    p_triggering_member VARCHAR(42),
    p_reward_amount NUMERIC,
    p_matrix_layer INTEGER,
    p_matrix_position VARCHAR(10)
) RETURNS JSON AS $$
BEGIN
    RETURN create_notification(
        p_recipient_wallet,
        'reward_earned',
        '🎊 Reward Earned!',
        format('Congratulations! You earned $%s from %s joining your matrix at Layer %s, Position %s. Keep building your network!',
            p_reward_amount,
            p_triggering_member,
            p_matrix_layer,
            p_matrix_position
        ),
        json_build_object(
            'reward_amount', p_reward_amount,
            'triggering_member', p_triggering_member,
            'matrix_layer', p_matrix_layer,
            'matrix_position', p_matrix_position,
            'reward_type', 'layer_reward'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Test the notification system
SELECT 'Testing Notification System' as test_section;

-- Test creating a welcome notification
SELECT create_welcome_notifications(
    '0xTEST_NOTIFICATION_001000000000000000'::VARCHAR(42),
    99::INTEGER,
    json_build_object(
        'success', true,
        'placement', json_build_object(
            'matrix_root', '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C',
            'matrix_layer', 1,
            'matrix_position', 'L',
            'is_spillover', false
        )
    )::JSONB,
    json_build_object('success', true)::JSONB,
    json_build_object(
        'success', true,
        'release_amount', 100,
        'new_available_balance', 600,
        'new_locked_balance', 10350
    )::JSONB
) as notification_test_result;

-- Show created notifications
SELECT 'Created Notifications:' as section;
SELECT type, title, message, created_at 
FROM user_notifications 
WHERE wallet_address = '0xTEST_NOTIFICATION_001000000000000000'
ORDER BY created_at DESC;