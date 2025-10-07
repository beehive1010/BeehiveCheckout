-- Fix and create reward_summary, rewards_summary, and reward_claims_dashboard
-- These views provide comprehensive reward tracking and management

-- Step 1: Create comprehensive reward_summary view
CREATE OR REPLACE VIEW reward_summary AS
SELECT 
    lr.recipient_wallet,
    COALESCE(recipient_u.username, 'Unknown') as recipient_username,
    recipient_m.current_level as recipient_level,
    
    -- Reward counts by type
    COUNT(*) as total_rewards,
    COUNT(*) FILTER (WHERE lr.reward_type = 'layer_reward') as claimable_rewards,
    COUNT(*) FILTER (WHERE lr.reward_type = 'pending_layer_reward') as pending_rewards,
    COUNT(*) FILTER (WHERE lr.is_claimed = true) as claimed_rewards,
    
    -- Reward amounts
    SUM(lr.amount_usdt) as total_usdt_rewards,
    SUM(lr.amount_bcc) as total_bcc_rewards,
    SUM(CASE WHEN lr.reward_type = 'layer_reward' THEN lr.amount_usdt ELSE 0 END) as claimable_usdt,
    SUM(CASE WHEN lr.reward_type = 'pending_layer_reward' THEN lr.amount_usdt ELSE 0 END) as pending_usdt,
    SUM(CASE WHEN lr.is_claimed = true THEN lr.amount_usdt ELSE 0 END) as claimed_usdt,
    
    -- Layer breakdown
    COUNT(*) FILTER (WHERE lr.layer = 1) as layer_1_rewards,
    COUNT(*) FILTER (WHERE lr.layer = 2) as layer_2_rewards,
    COUNT(*) FILTER (WHERE lr.layer = 3) as layer_3_rewards,
    
    -- Countdown timers info
    COUNT(DISTINCT ct.id) as active_countdowns,
    MIN(ct.end_time) as next_countdown_expires,
    
    -- Status summary
    CASE 
        WHEN COUNT(*) FILTER (WHERE lr.reward_type = 'pending_layer_reward') > 0 THEN 'Has Pending Rewards'
        WHEN COUNT(*) FILTER (WHERE lr.reward_type = 'layer_reward') > 0 THEN 'Has Claimable Rewards'
        WHEN COUNT(*) FILTER (WHERE lr.is_claimed = true) > 0 THEN 'Claimed Only'
        ELSE 'No Active Rewards'
    END as status_summary

FROM layer_rewards lr
LEFT JOIN users recipient_u ON LOWER(lr.recipient_wallet) = LOWER(recipient_u.wallet_address)
LEFT JOIN members recipient_m ON LOWER(lr.recipient_wallet) = LOWER(recipient_m.wallet_address)
LEFT JOIN countdown_timers ct ON (
    LOWER(ct.wallet_address) = LOWER(lr.recipient_wallet)
    AND ct.timer_type = 'layer_reward_upgrade'
    AND ct.is_active = true
)
GROUP BY lr.recipient_wallet, recipient_u.username, recipient_m.current_level
ORDER BY total_usdt_rewards DESC;

-- Step 2: Create rewards_summary view (alternative name/format)
CREATE OR REPLACE VIEW rewards_summary AS
SELECT 
    rs.recipient_username as member_name,
    rs.recipient_wallet,
    rs.recipient_level as current_level,
    rs.total_rewards,
    rs.total_usdt_rewards || ' USDT' as total_value,
    
    -- Status breakdown
    CASE 
        WHEN rs.claimable_rewards > 0 THEN rs.claimable_rewards || ' ready to claim (' || rs.claimable_usdt || ' USDT)'
        ELSE '0 claimable'
    END as claimable_status,
    
    CASE 
        WHEN rs.pending_rewards > 0 THEN rs.pending_rewards || ' pending (' || rs.pending_usdt || ' USDT)'
        ELSE '0 pending'
    END as pending_status,
    
    CASE 
        WHEN rs.active_countdowns > 0 THEN rs.active_countdowns || ' ActiveMember (expires: ' || rs.next_countdown_expires::date || ')'
        ELSE '0 ActiveMember'
    END as countdown_status,
    
    rs.status_summary,
    
    -- Layer distribution
    'L1:' || rs.layer_1_rewards || ' L2:' || rs.layer_2_rewards || ' L3:' || rs.layer_3_rewards as layer_distribution

FROM reward_summary rs
ORDER BY rs.total_usdt_rewards DESC;

-- Step 3: Create reward_claims_dashboard view
CREATE OR REPLACE VIEW reward_claims_dashboard AS
SELECT 
    -- Member info
    COALESCE(recipient_u.username, 'Unknown') as member,
    lr.recipient_wallet,
    recipient_m.current_level as member_level,
    
    -- Reward details
    COALESCE(payer_u.username, SUBSTRING(lr.payer_wallet, 1, 8)) as from_member,
    'Layer ' || lr.layer as reward_layer,
    COALESCE(imp.position_in_layer, '?') as matrix_position,
    lr.amount_usdt as usdt_amount,
    lr.amount_bcc as bcc_amount,
    
    -- Status and actions
    CASE lr.reward_type
        WHEN 'layer_reward' THEN '✅ Ready to Claim'
        WHEN 'pending_layer_reward' THEN '⏳ Pending Upgrade'
        WHEN 'rolled_up_reward' THEN '⬆️ Rolled Up'
        WHEN 'forfeited_reward' THEN '❌ Forfeited'
        ELSE lr.reward_type
    END as status,
    
    -- Countdown info for pending rewards
    CASE 
        WHEN lr.reward_type = 'pending_layer_reward' THEN
            COALESCE(
                'Expires: ' || ct.end_time::date || ' (' || 
                ROUND(EXTRACT(EPOCH FROM (ct.end_time - now()))/3600, 1) || 'h left)',
                'No countdown found'
            )
        ELSE NULL
    END as countdown_info,
    
    -- Requirements
    CASE 
        WHEN lr.reward_type = 'pending_layer_reward' AND lr.layer = 1 AND imp.position_in_layer = 'R' THEN
            'Need Level 2+ NFT'
        WHEN lr.reward_type = 'pending_layer_reward' THEN
            'Need Level ' || lr.layer || '+ NFT'
        ELSE NULL
    END as requirement,
    
    -- Action needed
    CASE 
        WHEN lr.reward_type = 'layer_reward' THEN 'Claim Now'
        WHEN lr.reward_type = 'pending_layer_reward' THEN 'Upgrade NFT Level'
        WHEN lr.is_claimed THEN 'Already Claimed'
        ELSE 'No Action'
    END as action_needed,
    
    lr.created_at,
    lr.updated_at,
    lr.is_claimed,
    lr.claimed_at

FROM layer_rewards lr
LEFT JOIN users recipient_u ON LOWER(lr.recipient_wallet) = LOWER(recipient_u.wallet_address)
LEFT JOIN users payer_u ON LOWER(lr.payer_wallet) = LOWER(payer_u.wallet_address)
LEFT JOIN members recipient_m ON LOWER(lr.recipient_wallet) = LOWER(recipient_m.wallet_address)
LEFT JOIN individual_matrix_placements imp ON (
    LOWER(imp.matrix_owner) = LOWER(lr.recipient_wallet)
    AND LOWER(imp.member_wallet) = LOWER(lr.payer_wallet)
    AND imp.layer_in_owner_matrix = lr.layer
)
LEFT JOIN countdown_timers ct ON (
    LOWER(ct.wallet_address) = LOWER(lr.recipient_wallet)
    AND ct.timer_type = 'layer_reward_upgrade'
    AND ct.is_active = true
    AND ct.auto_action_data->>'reward_id' = lr.id::text
)
ORDER BY 
    CASE lr.reward_type
        WHEN 'pending_layer_reward' THEN 1
        WHEN 'layer_reward' THEN 2
        ELSE 3
    END,
    recipient_u.username,
    lr.layer;

-- Step 4: Create countdown_timers_dashboard view
CREATE OR REPLACE VIEW countdown_timers_dashboard AS
SELECT 
    ct.id as timer_id,
    COALESCE(u.username, 'Unknown') as member,
    ct.wallet_address,
    ct.title,
    ct.description,
    ct.start_time,
    ct.end_time,
    
    -- Time remaining
    CASE 
        WHEN ct.end_time > now() THEN 
            ROUND(EXTRACT(EPOCH FROM (ct.end_time - now()))/3600, 1) || ' hours remaining'
        ELSE 'EXPIRED ' || ROUND(EXTRACT(EPOCH FROM (now() - ct.end_time))/3600, 1) || ' hours ago'
    END as time_status,
    
    -- Progress
    ROUND(
        EXTRACT(EPOCH FROM (now() - ct.start_time)) / 
        EXTRACT(EPOCH FROM (ct.end_time - ct.start_time)) * 100, 
        1
    ) as progress_percentage,
    
    ct.is_active,
    ct.auto_action,
    ct.auto_action_data,
    
    -- Related reward info
    (ct.auto_action_data->>'reward_amount')::NUMERIC as reward_amount,
    (ct.auto_action_data->>'required_level')::INTEGER as required_level,
    
    -- Current member level
    m.current_level as member_current_level,
    
    -- Status
    CASE 
        WHEN NOT ct.is_active THEN '🏁 Completed'
        WHEN ct.end_time <= now() THEN '⏰ Expired - Needs Processing'
        WHEN m.current_level >= (ct.auto_action_data->>'required_level')::INTEGER THEN '✅ Requirement Met'
        ELSE '⏳ Countdown Active'
    END as status

FROM countdown_timers ct
LEFT JOIN users u ON LOWER(ct.wallet_address) = LOWER(u.wallet_address)
LEFT JOIN members m ON LOWER(ct.wallet_address) = LOWER(m.wallet_address)
WHERE ct.timer_type = 'layer_reward_upgrade'
ORDER BY 
    ct.is_active DESC,
    CASE 
        WHEN ct.end_time <= now() THEN 1
        ELSE 2
    END,
    ct.end_time;

-- Step 5: Show current status using new views
SELECT '=== REWARD SUMMARY ===' as section_title;

SELECT 
    member_name,
    current_level,
    total_rewards,
    total_value,
    claimable_status,
    pending_status,
    countdown_status,
    status_summary
FROM rewards_summary;

SELECT '=== REWARD CLAIMS DASHBOARD ===' as section_title;

SELECT 
    member,
    from_member,
    reward_layer || ' (' || matrix_position || ')' as position,
    usdt_amount || ' USDT' as reward,
    status,
    countdown_info,
    requirement,
    action_needed
FROM reward_claims_dashboard
LIMIT 20;

SELECT '=== COUNTDOWN TIMERS DASHBOARD ===' as section_title;

SELECT 
    member,
    title,
    time_status,
    progress_percentage || '%' as progress,
    reward_amount || ' USDT' as reward,
    'Need Level ' || required_level as requirement,
    'Currently Level ' || member_current_level as current,
    status
FROM countdown_timers_dashboard
WHERE is_active = true;

-- Final summary
DO $$
DECLARE
    total_members INTEGER;
    claimable_rewards INTEGER;
    pending_rewards INTEGER;
    active_countdowns INTEGER;
    total_claimable_usdt NUMERIC;
    total_pending_usdt NUMERIC;
BEGIN
    SELECT 
        COUNT(DISTINCT recipient_wallet),
        SUM(claimable_rewards),
        SUM(pending_rewards),
        SUM(active_countdowns),
        SUM(claimable_usdt),
        SUM(pending_usdt)
    INTO total_members, claimable_rewards, pending_rewards, active_countdowns, total_claimable_usdt, total_pending_usdt
    FROM reward_summary;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== REWARDS SYSTEM STATUS ===';
    RAISE NOTICE 'Members with rewards: %', total_members;
    RAISE NOTICE 'Claimable rewards: % (% USDT)', claimable_rewards, total_claimable_usdt;
    RAISE NOTICE 'Pending rewards: % (% USDT)', pending_rewards, total_pending_usdt;
    RAISE NOTICE 'Active countdowns: %', active_countdowns;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Reward summaries and dashboard created!';
    RAISE NOTICE 'Views available:';
    RAISE NOTICE '- reward_summary: Comprehensive member reward stats';
    RAISE NOTICE '- rewards_summary: User-friendly reward overview';
    RAISE NOTICE '- reward_claims_dashboard: Detailed reward claims interface';
    RAISE NOTICE '- countdown_timers_dashboard: Timer management interface';
END $$;