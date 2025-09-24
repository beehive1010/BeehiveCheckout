-- Fix trigger_layer_rewards_on_upgrade function to handle Layer 1 R position correctly
-- and use the correct timer system

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
    direct_referrals_count INTEGER;
BEGIN
    -- The target layer equals the membership level being activated
    target_layer := p_new_level;

    -- Get matrix information from matrix_referrals_tree_view
    -- Focus on the direct referrer relationship (layer 1)
    SELECT
        matrix_root_wallet,
        layer as matrix_layer,
        position as matrix_position
    INTO matrix_root_info
    FROM matrix_referrals_tree_view
    WHERE member_wallet ILIKE p_upgrading_member_wallet
    AND layer = 1  -- Focus on direct referrer relationship
    LIMIT 1;

    -- If not in matrix, try to get from referrals_new table
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

    -- If still not found, exit
    IF matrix_root_info.matrix_root_wallet IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Member not found in any matrix or referrals_new'
        );
    END IF;

    -- Check if this is the matrix root upgrading themselves (no self-rewards)
    IF matrix_root_info.matrix_root_wallet ILIKE p_upgrading_member_wallet THEN
        RETURN json_build_object(
            'success', true,
            'message', 'No reward for matrix root upgrading themselves',
            'rewards_created', 0
        );
    END IF;

    -- Check if reward already exists to prevent duplicates
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

    -- Get matrix root's current level and direct referrals count
    SELECT current_level INTO root_current_level
    FROM members
    WHERE wallet_address ILIKE matrix_root_info.matrix_root_wallet;

    -- Get the layer position for special rule checking
    layer_position := matrix_root_info.matrix_position;

    -- 🚨 FIXED: Layer 1 R position special rule
    IF target_layer = 1 AND layer_position = 'R' THEN
        -- Layer 1 R position requires Level 2+ AND 3 direct referrals
        required_level := 2;
        
        -- Check direct referrals count
        SELECT COUNT(*) INTO direct_referrals_count
        FROM referrals_new
        WHERE referrer_wallet ILIKE matrix_root_info.matrix_root_wallet;
        
        -- Both Level 2+ and 3+ direct referrals required for Layer 1 R position
        IF root_current_level >= 2 AND direct_referrals_count >= 3 THEN
            reward_status := 'claimable';
            expires_timestamp := NULL;
        ELSE
            reward_status := 'pending';
            expires_timestamp := NOW() + INTERVAL '72 hours';
        END IF;
    ELSE
        -- Standard rule: Root needs to own the level equal to the target layer
        required_level := target_layer;
        
        IF root_current_level >= required_level THEN
            reward_status := 'claimable';
            expires_timestamp := NULL;
        ELSE
            reward_status := 'pending';
            expires_timestamp := NOW() + INTERVAL '72 hours';
        END IF;
    END IF;

    -- Create the layer reward with ALL required fields
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
        CASE WHEN target_layer = 1 AND layer_position = 'R' THEN 3 ELSE 0 END,
        direct_referrals_count,
        CASE WHEN target_layer = 1 AND layer_position = 'R' THEN true ELSE false END,
        NOW(),
        expires_timestamp
    )
    RETURNING id INTO new_reward_id;

    -- 🚨 FIXED: Use countdown_timers table instead of reward_timers
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
            format('Layer %s Reward Countdown', target_layer),
            format('You have 72 hours to upgrade to Level %s%s to claim this %s USDT reward', 
                   required_level,
                   CASE WHEN target_layer = 1 AND layer_position = 'R' 
                        THEN ' and get 3+ direct referrals' 
                        ELSE '' END,
                   p_nft_price),
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
                'is_r_position_rule', (target_layer = 1 AND layer_position = 'R')
            ),
            new_reward_id
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', format('Layer %s reward created for Level %s membership (Position: %s)', 
                         target_layer, p_new_level, layer_position),
        'matrix_root', matrix_root_info.matrix_root_wallet,
        'matrix_layer', target_layer,
        'layer_position', layer_position,
        'membership_level', p_new_level,
        'reward_amount', p_nft_price,
        'status', reward_status,
        'required_level', required_level,
        'current_level', root_current_level,
        'expires_at', expires_timestamp,
        'is_r_position_special_rule', (target_layer = 1 AND layer_position = 'R'),
        'rewards_created', 1
    );
END;
$function$;