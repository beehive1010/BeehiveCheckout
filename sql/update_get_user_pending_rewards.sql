-- Update get_user_pending_rewards function to support Layer 1 R position special rules

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
            WHEN lr.matrix_layer = 1 AND lr.layer_position = 'R' THEN 'layer_1_r_position'::text
            ELSE 'qualification_wait'::text
        END,
        CASE
            WHEN lr.expires_at IS NOT NULL AND lr.expires_at > NOW()
            THEN EXTRACT(EPOCH FROM (lr.expires_at - NOW()))::integer
            ELSE 0
        END,
        lr.expires_at,
        CASE
            -- Layer 1 R position special description
            WHEN lr.matrix_layer = 1 AND lr.layer_position = 'R' THEN
                CASE 
                    WHEN lr.recipient_current_level < 2 AND lr.direct_referrals_current < 3 THEN
                        format('Layer 1 R Position: Need Level 2+ (current: %s) and 3+ direct referrals (current: %s). Expires in %s hours.',
                               lr.recipient_current_level, 
                               lr.direct_referrals_current,
                               CASE WHEN lr.expires_at IS NOT NULL AND lr.expires_at > NOW() 
                                    THEN EXTRACT(EPOCH FROM (lr.expires_at - NOW()))::integer / 3600
                                    ELSE 0 END)
                    WHEN lr.recipient_current_level < 2 THEN
                        format('Layer 1 R Position: Need Level 2+ (current: %s). You have enough referrals (%s). Expires in %s hours.',
                               lr.recipient_current_level, 
                               lr.direct_referrals_current,
                               CASE WHEN lr.expires_at IS NOT NULL AND lr.expires_at > NOW() 
                                    THEN EXTRACT(EPOCH FROM (lr.expires_at - NOW()))::integer / 3600
                                    ELSE 0 END)
                    WHEN lr.direct_referrals_current < 3 THEN
                        format('Layer 1 R Position: Need 3+ direct referrals (current: %s). Your level is sufficient (%s). Expires in %s hours.',
                               lr.direct_referrals_current,
                               lr.recipient_current_level,
                               CASE WHEN lr.expires_at IS NOT NULL AND lr.expires_at > NOW() 
                                    THEN EXTRACT(EPOCH FROM (lr.expires_at - NOW()))::integer / 3600
                                    ELSE 0 END)
                    ELSE 'Layer 1 R Position: Requirements met, should be claimable soon.'
                END
            -- Standard description for other positions
            WHEN lr.status = 'pending' AND lr.expires_at IS NOT NULL AND lr.expires_at > NOW() THEN
                format('Waiting for level upgrade to Level %s (current: %s). Expires in %s hours.',
                       lr.recipient_required_level,
                       lr.recipient_current_level,
                       EXTRACT(EPOCH FROM (lr.expires_at - NOW()))::integer / 3600)
            WHEN lr.status = 'pending' AND (lr.expires_at IS NULL OR lr.expires_at <= NOW()) THEN
                format('Pending level upgrade to Level %s (current: %s). No expiration.',
                       lr.recipient_required_level,
                       lr.recipient_current_level)
            ELSE 'Unknown status'
        END::text,
        -- Enhanced can_claim logic for Layer 1 R position
        CASE 
            WHEN lr.matrix_layer = 1 AND lr.layer_position = 'R' THEN
                (lr.recipient_current_level >= 2 AND lr.direct_referrals_current >= 3)
            ELSE 
                (lr.recipient_current_level >= lr.recipient_required_level)
        END
    FROM layer_rewards lr
    LEFT JOIN users u ON u.wallet_address = lr.triggering_member_wallet
    WHERE lr.reward_recipient_wallet = p_wallet_address
      AND lr.status = 'pending'
    ORDER BY lr.created_at DESC;
END;
$function$;