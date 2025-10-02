-- Fix reward_claims_dashboard to show all rewards correctly
-- Base it on actual layer_rewards data instead of separate table

-- Step 1: Check what's missing from current dashboard
SELECT 
    '=== CURRENT LAYER_REWARDS vs REWARD_CLAIMS_DASHBOARD ===' as section_title;

-- Show all layer_rewards
SELECT 
    'LAYER_REWARDS TABLE:' as source,
    COALESCE(recipient_u.username, 'Unknown') as recipient,
    COALESCE(payer_u.username, 'Unknown') as from_member,
    lr.layer,
    lr.reward_type,
    lr.amount_usdt,
    lr.is_claimed
FROM layer_rewards lr
LEFT JOIN users recipient_u ON LOWER(lr.recipient_wallet) = LOWER(recipient_u.wallet_address)
LEFT JOIN users payer_u ON LOWER(lr.payer_wallet) = LOWER(payer_u.wallet_address)
ORDER BY recipient_u.username, lr.layer

UNION ALL

-- Show current dashboard
SELECT 
    'DASHBOARD VIEW:' as source,
    rcd.root_username as recipient,
    rcd.triggering_member_username as from_member,
    rcd.layer,
    rcd.status as reward_type,
    rcd.reward_amount_usdc,
    CASE WHEN rcd.claimed_at IS NOT NULL THEN true ELSE false END as is_claimed
FROM reward_claims_dashboard rcd
ORDER BY recipient, layer;

-- Step 2: Create new comprehensive reward_claims_dashboard based on layer_rewards
DROP VIEW IF EXISTS reward_claims_dashboard CASCADE;

CREATE VIEW reward_claims_dashboard AS
SELECT 
    lr.id,
    
    -- Recipient (matrix owner) information
    lr.recipient_wallet as root_wallet,
    COALESCE(recipient_u.username, 'Unknown') as root_username,
    recipient_m.current_level as root_current_level,
    
    -- Payer (triggering member) information  
    lr.payer_wallet as triggering_member_wallet,
    COALESCE(payer_u.username, 'Unknown') as triggering_member_username,
    payer_m.current_level as triggering_member_level,
    
    -- Reward details
    lr.layer,
    lr.nft_level,
    lr.amount_usdt as reward_amount_usdc,
    lr.amount_bcc as reward_amount_bcc,
    
    -- Status and timing
    CASE lr.reward_type
        WHEN 'layer_reward' THEN 
            CASE WHEN lr.is_claimed THEN 'claimed' ELSE 'claimable' END
        WHEN 'pending_layer_reward' THEN 'pending'
        WHEN 'rolled_up_reward' THEN 'rolled_up'
        WHEN 'forfeited_reward' THEN 'forfeited'
        ELSE lr.reward_type
    END as status,
    
    -- Matrix position information
    COALESCE(imp.position_in_layer, '?') as matrix_position,
    
    -- Countdown information for pending rewards
    ct.end_time as expires_at,
    CASE 
        WHEN lr.reward_type = 'pending_layer_reward' AND ct.end_time IS NOT NULL THEN
            CASE 
                WHEN ct.end_time > now() THEN ct.end_time - now()
                ELSE interval '0'
            END
        ELSE NULL
    END as time_remaining,
    
    -- Requirements and actions
    CASE 
        WHEN lr.reward_type = 'pending_layer_reward' THEN
            'Need Level ' || lr.layer || '+ NFT'
        WHEN lr.reward_type = 'layer_reward' AND lr.is_claimed = false THEN
            'Ready to claim'
        WHEN lr.is_claimed THEN
            'Already claimed'
        ELSE 'No action needed'
    END as action_needed,
    
    -- Timestamps
    lr.created_at,
    lr.updated_at,
    CASE WHEN lr.is_claimed THEN lr.updated_at END as claimed_at,
    
    -- Additional metadata
    jsonb_build_object(
        'reward_type', lr.reward_type,
        'layer', lr.layer,
        'nft_level', lr.nft_level,
        'matrix_position', COALESCE(imp.position_in_layer, 'unknown'),
        'root_level', recipient_m.current_level,
        'triggering_member_level', payer_m.current_level,
        'has_countdown', CASE WHEN ct.id IS NOT NULL THEN true ELSE false END
    ) as metadata

FROM layer_rewards lr
LEFT JOIN users recipient_u ON LOWER(lr.recipient_wallet) = LOWER(recipient_u.wallet_address)
LEFT JOIN users payer_u ON LOWER(lr.payer_wallet) = LOWER(payer_u.wallet_address)
LEFT JOIN members recipient_m ON LOWER(lr.recipient_wallet) = LOWER(recipient_m.wallet_address)
LEFT JOIN members payer_m ON LOWER(lr.payer_wallet) = LOWER(payer_m.wallet_address)

-- Matrix position information
LEFT JOIN individual_matrix_placements imp ON (
    LOWER(imp.matrix_owner) = LOWER(lr.recipient_wallet)
    AND LOWER(imp.member_wallet) = LOWER(lr.payer_wallet)
    AND imp.layer_in_owner_matrix = lr.layer
    AND imp.is_active = true
)

-- Countdown timer for pending rewards
LEFT JOIN countdown_timers ct ON (
    LOWER(ct.wallet_address) = LOWER(lr.recipient_wallet)
    AND ct.timer_type = 'layer_reward_upgrade'
    AND ct.is_active = true
    AND ct.auto_action_data->>'reward_id' = lr.id::text
)

ORDER BY 
    recipient_u.username,
    lr.layer,
    CASE lr.reward_type
        WHEN 'pending_layer_reward' THEN 1
        WHEN 'layer_reward' THEN 2
        ELSE 3
    END;

-- Step 3: Show the fixed reward_claims_dashboard
SELECT 
    '=== FIXED REWARD_CLAIMS_DASHBOARD ===' as section_title;

SELECT 
    root_username as recipient,
    triggering_member_username as from_member,
    'Layer ' || layer as reward_layer,
    matrix_position as position,
    reward_amount_usdc || ' USDC' as reward,
    status,
    action_needed,
    CASE 
        WHEN expires_at IS NOT NULL AND expires_at > now() THEN
            ROUND(EXTRACT(EPOCH FROM (expires_at - now()))/3600, 1) || 'h left'
        WHEN expires_at IS NOT NULL AND expires_at <= now() THEN
            'EXPIRED'
        ELSE NULL
    END as countdown_status
FROM reward_claims_dashboard
ORDER BY root_username, layer, status;

-- Step 4: Summary by recipient
SELECT 
    '=== REWARD CLAIMS SUMMARY BY RECIPIENT ===' as section_title;

SELECT 
    root_username as recipient,
    COUNT(*) as total_rewards,
    COUNT(*) FILTER (WHERE status = 'claimable') as claimable_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'claimed') as claimed_count,
    SUM(reward_amount_usdc) FILTER (WHERE status = 'claimable') as claimable_usdc,
    SUM(reward_amount_usdc) FILTER (WHERE status = 'pending') as pending_usdc,
    SUM(reward_amount_usdc) as total_usdc
FROM reward_claims_dashboard
GROUP BY root_username
ORDER BY total_usdc DESC;

-- Step 5: Pending rewards with countdown details
SELECT 
    '=== PENDING REWARDS WITH COUNTDOWN DETAILS ===' as section_title;

SELECT 
    root_username as recipient,
    triggering_member_username as from_member,
    'Layer ' || layer as layer,
    reward_amount_usdc || ' USDC' as reward,
    action_needed,
    CASE 
        WHEN expires_at > now() THEN
            'Expires in ' || ROUND(EXTRACT(EPOCH FROM (expires_at - now()))/3600, 1) || ' hours'
        ELSE 'EXPIRED - needs processing'
    END as countdown_status,
    expires_at::date as expires_date
FROM reward_claims_dashboard
WHERE status = 'pending'
ORDER BY expires_at;

-- Final summary
DO $$
DECLARE
    total_claims INTEGER;
    claimable_claims INTEGER;
    pending_claims INTEGER;
    total_claimable_usdc NUMERIC;
    total_pending_usdc NUMERIC;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'claimable'),
        COUNT(*) FILTER (WHERE status = 'pending'),
        SUM(reward_amount_usdc) FILTER (WHERE status = 'claimable'),
        SUM(reward_amount_usdc) FILTER (WHERE status = 'pending')
    INTO total_claims, claimable_claims, pending_claims, total_claimable_usdc, total_pending_usdc
    FROM reward_claims_dashboard;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== REWARD CLAIMS DASHBOARD FIXED ===';
    RAISE NOTICE 'Total reward claims: %', total_claims;
    RAISE NOTICE 'Claimable rewards: % (% USDC)', claimable_claims, COALESCE(total_claimable_usdc, 0);
    RAISE NOTICE 'Pending rewards: % (% USDC)', pending_claims, COALESCE(total_pending_usdc, 0);
    RAISE NOTICE '';
    RAISE NOTICE '✅ Dashboard now shows all layer_rewards data';
    RAISE NOTICE '✅ Includes pending rewards with countdown timers';
    RAISE NOTICE '✅ Shows matrix positions and action needed';
END $$;