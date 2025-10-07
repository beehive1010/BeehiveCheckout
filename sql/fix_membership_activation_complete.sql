-- Complete Membership Activation Function with Auto Rewards and BCC Release
-- This function integrates everything needed for proper membership activation

CREATE OR REPLACE FUNCTION activate_nft_level1_membership(
    p_wallet_address TEXT,
    p_referrer_wallet TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    new_activation_sequence INTEGER;
    result_member_data JSON;
    matrix_placement_result JSON;
    layer_reward_result JSON;
    bcc_release_result JSON;
    final_result JSON;
BEGIN
    -- Check if user already exists as a member
    IF EXISTS (SELECT 1 FROM members WHERE wallet_address = p_wallet_address) THEN
        SELECT json_build_object(
            'wallet_address', wallet_address,
            'current_level', current_level,
            'activation_sequence', activation_sequence,
            'referrer_wallet', referrer_wallet
        ) INTO result_member_data
        FROM members 
        WHERE wallet_address = p_wallet_address;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Member already exists',
            'member_data', result_member_data,
            'already_activated', true
        );
    END IF;

    -- Check if user exists in users table
    IF NOT EXISTS (SELECT 1 FROM users WHERE wallet_address = p_wallet_address) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User must register first before activating membership'
        );
    END IF;

    RAISE NOTICE 'Starting NFT Level 1 activation for wallet: %', p_wallet_address;
    RAISE NOTICE 'Using referrer wallet: %', p_referrer_wallet;

    -- Get next activation sequence
    SELECT COALESCE(MAX(activation_sequence), 0) + 1 
    INTO new_activation_sequence 
    FROM members;
    
    RAISE NOTICE 'Assigned activation_sequence: %', new_activation_sequence;

    -- Create members record
    INSERT INTO members (
        wallet_address,
        referrer_wallet,
        current_level,
        activation_sequence,
        activation_time
    ) VALUES (
        p_wallet_address,
        p_referrer_wallet,
        1,
        new_activation_sequence,
        NOW()
    );

    RAISE NOTICE 'Created members record for wallet: %', p_wallet_address;

    -- The trigger will automatically create user_balance with proper initial amounts
    -- No need to manually create it anymore
    
    RAISE NOTICE 'User balance will be created automatically by trigger with initial amounts';

    -- Note: memberships table not needed for core activation
    -- NFT tracking handled via members table current_level field
    RAISE NOTICE 'NFT Level 1 recorded via members table current_level field';

    -- STEP 1: Matrix Placement (place new member in matrix structure)
    IF p_referrer_wallet IS NOT NULL THEN
        RAISE NOTICE 'Placing member in matrix structure: %', p_wallet_address;
        
        BEGIN
            SELECT place_new_member_in_matrix_correct(
                p_wallet_address,
                p_referrer_wallet
            ) INTO matrix_placement_result;
            
            RAISE NOTICE 'Matrix placement result: %', matrix_placement_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Matrix placement failed: %', SQLERRM;
            matrix_placement_result := json_build_object(
                'success', false,
                'message', 'Matrix placement failed: ' || SQLERRM
            );
        END;
    ELSE
        matrix_placement_result := json_build_object(
            'success', true,
            'message', 'No referrer, no matrix placement needed'
        );
    END IF;

    -- STEP 2: Trigger layer reward (if this member is placed in someone's matrix)
    IF p_referrer_wallet IS NOT NULL THEN
        RAISE NOTICE 'Triggering layer reward for activation of: %', p_wallet_address;
        
        BEGIN
            SELECT trigger_layer_rewards_on_upgrade(
                p_wallet_address,
                1,
                100.0  -- Level 1 NFT price
            ) INTO layer_reward_result;
            
            RAISE NOTICE 'Layer reward result: %', layer_reward_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Layer reward triggering failed: %', SQLERRM;
            layer_reward_result := json_build_object(
                'success', false,
                'message', 'Layer reward triggering failed: ' || SQLERRM
            );
        END;
    ELSE
        layer_reward_result := json_build_object(
            'success', true,
            'message', 'No referrer, no layer reward triggered'
        );
    END IF;

    -- STEP 3: Release BCC for Level 1
    RAISE NOTICE 'Releasing BCC for Level 1 activation of: %', p_wallet_address;
    
    BEGIN
        SELECT unlock_bcc_for_level(
            p_wallet_address,
            1  -- Level 1
        ) INTO bcc_release_result;
        
        RAISE NOTICE 'BCC release result: %', bcc_release_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'BCC release failed: %', SQLERRM;
        bcc_release_result := json_build_object(
            'success', false,
            'message', 'BCC release failed: ' || SQLERRM
        );
    END;

    -- STEP 4: Create Welcome Notifications
    RAISE NOTICE 'Creating welcome notifications for: %', p_wallet_address;
    
    BEGIN
        -- Welcome notification
        INSERT INTO user_notifications (
            wallet_address, type, title, message, metadata, priority, category
        ) VALUES (
            p_wallet_address,
            'welcome',
            '🎉 Welcome to Beehive!',
            format('Congratulations! You have successfully activated your Level 1 NFT membership. Your activation sequence is #%s. Welcome to the Beehive community!', new_activation_sequence),
            json_build_object('activation_sequence', new_activation_sequence, 'level', 1),
            2,
            'membership'
        );
        
        -- BCC unlock notification (if successful)
        IF bcc_release_result->>'success' = 'true' THEN
            INSERT INTO user_notifications (
                wallet_address, type, title, message, metadata, priority, category
            ) VALUES (
                p_wallet_address,
                'bcc_unlock',
                '🪙 BCC Unlocked!',
                format('Great news! %s BCC has been unlocked and added to your available balance. Your new available balance is %s BCC.',
                    (bcc_release_result->>'release_amount')::NUMERIC,
                    (bcc_release_result->>'new_available_balance')::NUMERIC
                ),
                json_build_object(
                    'release_amount', bcc_release_result->>'release_amount',
                    'new_available_balance', bcc_release_result->>'new_available_balance',
                    'level', 1
                ),
                2,
                'rewards'
            );
        END IF;
        
        -- Matrix placement notification (if successful)
        IF matrix_placement_result->>'success' = 'true' THEN
            INSERT INTO user_notifications (
                wallet_address, type, title, message, metadata, priority, category
            ) VALUES (
                p_wallet_address,
                'matrix_placement',
                '📊 Matrix Position Assigned',
                format('You have been placed in the matrix at Layer %s, Position %s. Your matrix journey begins now!',
                    matrix_placement_result->'placement'->>'matrix_layer',
                    matrix_placement_result->'placement'->>'matrix_position'
                ),
                matrix_placement_result->'placement',
                2,
                'matrix'
            );
        END IF;
        
        -- Earning potential notification
        INSERT INTO user_notifications (
            wallet_address, type, title, message, metadata, priority, category
        ) VALUES (
            p_wallet_address,
            'earnings_info',
            '💰 Start Earning Rewards',
            'Your matrix is now ActiveMember! You can earn $100 for each member that joins your Layer 1 positions (L-M-R). Invite friends to maximize your earnings!',
            json_build_object(
                'reward_per_member', 100,
                'max_layer1_positions', 3,
                'max_potential_earnings', 300
            ),
            1,
            'guidance'
        );
        
        RAISE NOTICE 'Welcome notifications created for: %', p_wallet_address;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create notifications: %', SQLERRM;
    END;

    -- Prepare member data for response
    result_member_data := json_build_object(
        'wallet_address', p_wallet_address,
        'current_level', 1,
        'activation_sequence', new_activation_sequence,
        'referrer_wallet', p_referrer_wallet
    );

    -- Build final result
    final_result := json_build_object(
        'success', true,
        'message', 'NFT Level 1 activation completed successfully - Welcome to Beehive!',
        'member_data', result_member_data,
        'activation_sequence', new_activation_sequence,
        'matrix_placement_result', matrix_placement_result,
        'layer_reward_result', layer_reward_result,
        'bcc_release_result', bcc_release_result,
        'auto_triggers', json_build_object(
            'matrix_placement', CASE 
                WHEN matrix_placement_result->>'success' = 'true' THEN 'success'
                ELSE 'failed'
            END,
            'layer_rewards', CASE 
                WHEN layer_reward_result->>'success' = 'true' THEN 'success'
                ELSE 'failed'
            END,
            'bcc_release', CASE 
                WHEN bcc_release_result->>'success' = 'true' THEN 'success'
                ELSE 'failed'
            END
        )
    );

    RAISE NOTICE 'NFT Level 1 activation completed for wallet: %', p_wallet_address;
    
    RETURN final_result;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in activate_nft_level1_membership: %', SQLERRM;
    RETURN json_build_object(
        'success', false,
        'message', 'Activation failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Test the complete activation function with a new test user
SELECT 'Testing Complete Activation Function' as test_section;

-- Create a test user first
INSERT INTO users (wallet_address, username, email, referrer_wallet)
VALUES (
    '0xTEST_COMPLETE_001000000000000000000000',
    'CompleteTestUser',
    'completetest@example.com',
    '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C'
) ON CONFLICT (wallet_address) DO NOTHING;

-- Now test the complete activation
SELECT activate_nft_level1_membership(
    '0xTEST_COMPLETE_001000000000000000000000',
    '0x781665DaeD20238fFA341085aA77d31b8c0Cf68C'
) as complete_activation_test;