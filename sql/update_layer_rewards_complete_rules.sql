-- Update layer reward functions with complete rules for all 19 layers
-- Layer奖励规则:
-- 每个layer的前两个奖励(L, M): 需要接收会员等级 >= 该layer等级
-- 每个layer的第三个奖励(R): 需要接收会员等级 >= 该layer等级+1
-- 例如: Layer1 R需要Level2+, Layer2 R需要Level3+, ..., Layer18 R需要Level19+

-- 1. Update trigger_layer_rewards_on_upgrade function with complete layer rules
CREATE OR REPLACE FUNCTION public.trigger_layer_rewards_on_upgrade(
    p_upgrading_member_wallet text, 
    p_new_level integer, 
    p_nft_price numeric
) RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    matrix_root_info RECORD;
    root_current_level INTEGER;
    required_level INTEGER;
    reward_status TEXT;
    expires_timestamp TIMESTAMP;
    new_reward_id UUID;
    target_layer INTEGER;
    layer_position TEXT;
BEGIN
    target_layer := p_new_level;

    -- Get matrix information
    SELECT
        matrix_root_wallet,
        layer as matrix_layer,
        position as matrix_position
    INTO matrix_root_info
    FROM matrix_referrals_tree_view
    WHERE member_wallet ILIKE p_upgrading_member_wallet
    AND layer = 1  
    LIMIT 1;

    IF matrix_root_info.matrix_root_wallet IS NULL THEN
        SELECT
            referrer_wallet as matrix_root_wallet,
            1 as matrix_layer,
            'L' as matrix_position
        INTO matrix_root_info
        FROM referrals_new
        WHERE referred_wallet ILIKE p_upgrading_member_wallet
        LIMIT 1;
    END IF;

    IF matrix_root_info.matrix_root_wallet IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Member not found in any matrix or referrals_new'
        );
    END IF;

    -- Check for self-rewards
    IF matrix_root_info.matrix_root_wallet ILIKE p_upgrading_member_wallet THEN
        RETURN json_build_object(
            'success', true,
            'message', 'No reward for matrix root upgrading themselves',
            'rewards_created', 0
        );
    END IF;

    -- Check for duplicates
    IF EXISTS (
        SELECT 1 FROM layer_rewards
        WHERE triggering_member_wallet ILIKE p_upgrading_member_wallet
          AND reward_recipient_wallet ILIKE matrix_root_info.matrix_root_wallet
          AND matrix_layer = target_layer
    ) THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Reward already exists for this member activation',
            'rewards_created', 0
        );
    END IF;

    -- Get matrix root's current level
    SELECT current_level INTO root_current_level
    FROM members
    WHERE wallet_address ILIKE matrix_root_info.matrix_root_wallet;

    layer_position := matrix_root_info.matrix_position;

    -- 🎯 COMPLETE LAYER RULES:
    -- L, M positions: require level >= target_layer
    -- R position: require level >= target_layer + 1
    IF layer_position = 'R' THEN
        -- R position requires one level higher than the layer
        required_level := target_layer + 1;
        
        -- Special case: Layer 18 R position requires Level 19 (maximum level)
        IF target_layer = 18 THEN
            required_level := 19;
        END IF;
        
        -- Check if recipient meets the higher level requirement
        IF root_current_level >= required_level THEN
            reward_status := 'claimable';
            expires_timestamp := NULL;
        ELSE
            reward_status := 'pending';
            expires_timestamp := NOW() + INTERVAL '72 hours';
        END IF;
    ELSE
        -- L, M positions require level >= target_layer
        required_level := target_layer;
        
        IF root_current_level >= required_level THEN
            reward_status := 'claimable';
            expires_timestamp := NULL;
        ELSE
            reward_status := 'pending';
            expires_timestamp := NOW() + INTERVAL '72 hours';
        END IF;
    END IF;

    -- Create the layer reward
    INSERT INTO layer_rewards (
        reward_recipient_wallet,
        triggering_member_wallet,
        matrix_root_wallet,
        triggering_nft_level,
        matrix_layer,
        layer_position,
        reward_amount,
        status,
        recipient_required_level,
        recipient_current_level,
        direct_referrals_required,
        direct_referrals_current,
        requires_direct_referrals,
        created_at,
        expires_at
    ) VALUES (
        matrix_root_info.matrix_root_wallet,
        p_upgrading_member_wallet,
        matrix_root_info.matrix_root_wallet,
        p_new_level,
        target_layer,
        layer_position,
        p_nft_price,
        reward_status,
        required_level,
        root_current_level,
        0,  -- No direct referrals required for any position
        0,  -- No direct referrals needed
        false,  -- No direct referrals requirement
        NOW(),
        expires_timestamp
    )
    RETURNING id INTO new_reward_id;

    -- Create countdown timer for pending rewards
    IF reward_status = 'pending' THEN
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
            matrix_root_info.matrix_root_wallet,
            'pending_reward',
            format('Layer %s %s Position Reward', target_layer, layer_position),
            CASE 
                WHEN layer_position = 'R' THEN
                    format('Layer %s R Position: Need Level %s+ to claim this %s USDT reward. You currently have Level %s.',
                           target_layer, required_level, p_nft_price, root_current_level)
                ELSE
                    format('Layer %s %s Position: Need Level %s+ to claim this %s USDT reward. You currently have Level %s.',
                           target_layer, layer_position, required_level, p_nft_price, root_current_level)
            END,
            NOW(),
            expires_timestamp,
            true,
            'expire_reward',
            json_build_object(
                'reward_id', new_reward_id,
                'reward_amount', p_nft_price,
                'reward_layer', target_layer,
                'layer_position', layer_position,
                'required_level', required_level,
                'current_level', root_current_level,
                'is_r_position_special_rule', (layer_position = 'R'),
                'upgrade_incentive', CASE WHEN layer_position = 'R' 
                    THEN format('Upgrade to Level %s to claim this reward!', required_level)
                    ELSE format('Upgrade to Level %s to claim this reward!', required_level)
                END
            ),
            new_reward_id
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', format('Layer %s %s position reward created for Level %s membership', 
                         target_layer, layer_position, p_new_level),
        'matrix_root', matrix_root_info.matrix_root_wallet,
        'matrix_layer', target_layer,
        'layer_position', layer_position,
        'membership_level', p_new_level,
        'reward_amount', p_nft_price,
        'status', reward_status,
        'required_level', required_level,
        'current_level', root_current_level,
        'is_r_position_upgrade_incentive', (layer_position = 'R'),
        'upgrade_message', CASE WHEN reward_status = 'pending' AND layer_position = 'R' 
            THEN format('Recipient needs to upgrade to Level %s+ to claim this Layer %s R reward', required_level, target_layer)
            WHEN reward_status = 'pending'
            THEN format('Recipient needs to upgrade to Level %s+ to claim this Layer %s %s reward', required_level, target_layer, layer_position)
            ELSE NULL
        END,
        'rewards_created', 1
    );
END;
$function$;

-- 2. Update check_pending_rewards_after_upgrade function for all layer requirements
CREATE OR REPLACE FUNCTION public.check_pending_rewards_after_upgrade(
    p_upgraded_wallet text,
    p_new_level integer
) RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    pending_reward RECORD;
    updated_count INTEGER := 0;
    total_rewards_value NUMERIC := 0;
BEGIN
    -- Find all pending rewards for this wallet that might now be claimable
    FOR pending_reward IN
        SELECT * FROM layer_rewards
        WHERE reward_recipient_wallet ILIKE p_upgraded_wallet
          AND status = 'pending'
          AND expires_at > NOW()  -- Not expired yet
    LOOP
        -- Check if reward can now be claimed based on complete layer rules
        IF p_new_level >= pending_reward.recipient_required_level THEN
            -- Update reward to claimable
            UPDATE layer_rewards
            SET 
                status = 'claimable',
                recipient_current_level = p_new_level,
                expires_at = NULL  -- Remove expiration since it's now claimable
            WHERE id = pending_reward.id;
            
            -- Deactivate the countdown timer
            UPDATE countdown_timers
            SET 
                is_active = false,
                completed_at = NOW(),
                auto_action_data = json_build_object(
                    'completion_reason', 'reward_became_claimable',
                    'user_upgraded_to_level', p_new_level,
                    'reward_layer', pending_reward.matrix_layer,
                    'layer_position', pending_reward.layer_position,
                    'was_r_position_upgrade_incentive', (pending_reward.layer_position = 'R')
                )
            WHERE related_reward_id = pending_reward.id
              AND is_active = true;
            
            updated_count := updated_count + 1;
            total_rewards_value := total_rewards_value + pending_reward.reward_amount;
            
            -- Log the change with detailed layer information
            INSERT INTO audit_logs (user_wallet, action, new_values)
            VALUES (p_upgraded_wallet, 'pending_reward_became_claimable', json_build_object(
                'reward_id', pending_reward.id,
                'reward_amount', pending_reward.reward_amount,
                'matrix_layer', pending_reward.matrix_layer,
                'layer_position', pending_reward.layer_position,
                'old_level', pending_reward.recipient_current_level,
                'new_level', p_new_level,
                'required_level', pending_reward.recipient_required_level,
                'was_r_position_incentive', (pending_reward.layer_position = 'R'),
                'upgrade_success_message', format('Layer %s %s position reward unlocked by upgrading to Level %s!', 
                    pending_reward.matrix_layer, pending_reward.layer_position, p_new_level)
            ));
        ELSE
            -- Update current level but keep as pending
            UPDATE layer_rewards
            SET recipient_current_level = p_new_level
            WHERE id = pending_reward.id;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'wallet_address', p_upgraded_wallet,
        'upgraded_to_level', p_new_level,
        'rewards_made_claimable', updated_count,
        'total_claimable_value', total_rewards_value,
        'message', format('Checked pending rewards after Level %s upgrade. %s rewards became claimable (total value: %s USDT)', 
                         p_new_level, updated_count, total_rewards_value),
        'upgrade_incentives_claimed', updated_count > 0
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to check pending rewards after upgrade'
    );
END;
$function$;

-- 3. Update get_user_pending_rewards function with complete layer descriptions
CREATE OR REPLACE FUNCTION public.get_user_pending_rewards(p_wallet_address character varying)
RETURNS TABLE(
    reward_id text, 
    reward_amount numeric, 
    triggering_member_username text, 
    timer_type text, 
    time_remaining_seconds integer, 
    expires_at timestamp without time zone, 
    status_description text, 
    can_claim boolean
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        lr.id::text,
        lr.reward_amount,
        COALESCE(u.username, 'Unknown User')::text,
        CASE 
            WHEN lr.layer_position = 'R' THEN 'layer_r_upgrade_incentive'::text
            ELSE 'layer_qualification_wait'::text
        END,
        CASE
            WHEN lr.expires_at IS NOT NULL AND lr.expires_at > NOW()
            THEN EXTRACT(EPOCH FROM (lr.expires_at - NOW()))::integer
            ELSE 0
        END,
        lr.expires_at,
        CASE
            -- R position special descriptions with upgrade incentive
            WHEN lr.layer_position = 'R' THEN
                format('Layer %s R Position: Upgrade to Level %s+ to claim this %s USDT reward! (Current: Level %s). Expires in %s hours.',
                       lr.matrix_layer,
                       lr.recipient_required_level,
                       lr.reward_amount,
                       lr.recipient_current_level,
                       CASE WHEN lr.expires_at IS NOT NULL AND lr.expires_at > NOW() 
                            THEN EXTRACT(EPOCH FROM (lr.expires_at - NOW()))::integer / 3600
                            ELSE 0 END)
            -- L, M position descriptions
            WHEN lr.layer_position IN ('L', 'M') THEN
                format('Layer %s %s Position: Need Level %s+ to claim this %s USDT reward (Current: Level %s). Expires in %s hours.',
                       lr.matrix_layer,
                       lr.layer_position,
                       lr.recipient_required_level,
                       lr.reward_amount,
                       lr.recipient_current_level,
                       CASE WHEN lr.expires_at IS NOT NULL AND lr.expires_at > NOW() 
                            THEN EXTRACT(EPOCH FROM (lr.expires_at - NOW()))::integer / 3600
                            ELSE 0 END)
            -- Fallback for expired or unknown status
            WHEN lr.status = 'pending' AND (lr.expires_at IS NULL OR lr.expires_at <= NOW()) THEN
                format('Layer %s %s Position: Need Level %s+ (Current: Level %s). No expiration.',
                       lr.matrix_layer,
                       lr.layer_position,
                       lr.recipient_required_level,
                       lr.recipient_current_level)
            ELSE 'Unknown status'
        END::text,
        -- Simple level requirement check (works for all positions)
        (lr.recipient_current_level >= lr.recipient_required_level)
    FROM layer_rewards lr
    LEFT JOIN users u ON u.wallet_address = lr.triggering_member_wallet
    WHERE lr.reward_recipient_wallet = p_wallet_address
      AND lr.status = 'pending'
    ORDER BY lr.created_at DESC;
END;
$function$;