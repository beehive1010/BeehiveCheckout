-- Create function to check and update pending rewards after level upgrade

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
    direct_referrals_count INTEGER;
BEGIN
    -- Get current direct referrals count
    SELECT COUNT(*) INTO direct_referrals_count
    FROM referrals_new
    WHERE referrer_wallet ILIKE p_upgraded_wallet;

    -- Find all pending rewards for this wallet that might now be claimable
    FOR pending_reward IN
        SELECT * FROM layer_rewards
        WHERE reward_recipient_wallet ILIKE p_upgraded_wallet
          AND status = 'pending'
          AND expires_at > NOW()  -- Not expired yet
    LOOP
        -- Check if reward can now be claimed based on rules
        IF (
            -- Standard rule: user level >= required level
            p_new_level >= pending_reward.recipient_required_level
            AND 
            -- Special Layer 1 R rule: also need 3+ direct referrals
            (
                NOT (pending_reward.matrix_layer = 1 AND pending_reward.layer_position = 'R')
                OR direct_referrals_count >= 3
            )
        ) THEN
            -- Update reward to claimable
            UPDATE layer_rewards
            SET 
                status = 'claimable',
                recipient_current_level = p_new_level,
                expires_at = NULL,  -- Remove expiration since it's now claimable
                direct_referrals_current = direct_referrals_count
            WHERE id = pending_reward.id;
            
            -- Deactivate the countdown timer
            UPDATE countdown_timers
            SET 
                is_active = false,
                completed_at = NOW(),
                auto_action_data = json_build_object(
                    'completion_reason', 'reward_became_claimable',
                    'user_upgraded_to_level', p_new_level,
                    'direct_referrals_count', direct_referrals_count
                )
            WHERE related_reward_id = pending_reward.id
              AND is_active = true;
            
            updated_count := updated_count + 1;
            total_rewards_value := total_rewards_value + pending_reward.reward_amount;
            
            -- Log the change
            INSERT INTO audit_logs (user_wallet, action, new_values)
            VALUES (p_upgraded_wallet, 'pending_reward_became_claimable', json_build_object(
                'reward_id', pending_reward.id,
                'reward_amount', pending_reward.reward_amount,
                'matrix_layer', pending_reward.matrix_layer,
                'layer_position', pending_reward.layer_position,
                'old_level', pending_reward.recipient_current_level,
                'new_level', p_new_level,
                'direct_referrals', direct_referrals_count
            ));
        ELSE
            -- Update current level but keep as pending
            UPDATE layer_rewards
            SET 
                recipient_current_level = p_new_level,
                direct_referrals_current = direct_referrals_count
            WHERE id = pending_reward.id;
        END IF;
    END LOOP;

    -- Return summary
    RETURN json_build_object(
        'success', true,
        'wallet_address', p_upgraded_wallet,
        'upgraded_to_level', p_new_level,
        'direct_referrals_count', direct_referrals_count,
        'rewards_made_claimable', updated_count,
        'total_claimable_value', total_rewards_value,
        'message', format('Checked pending rewards after Level %s upgrade. %s rewards became claimable (total value: %s USDT)', 
                         p_new_level, updated_count, total_rewards_value)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to check pending rewards after upgrade'
    );
END;
$function$;