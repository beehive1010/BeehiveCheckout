-- Fix matrix_stats to include ALL members, not just those with downlines
-- This ensures every member appears in the matrix stats, even if they have no downline

DROP VIEW IF EXISTS matrix_stats CASCADE;

CREATE VIEW matrix_stats AS
SELECT 
    m.wallet_address as member_wallet,
    COALESCE(u.username, 'Unknown') as member_username,
    m.current_level as member_level,
    
    -- Count downline members in their individual matrix
    COALESCE(downline_counts.total_downline_members, 0) as total_downline_members,
    
    -- Count of ActiveMember layers with members
    COALESCE(downline_counts.active_layers, 0) as active_layers,
    
    -- Deepest layer with members
    COALESCE(downline_counts.deepest_layer, 0) as deepest_layer,
    
    -- Layer-specific counts
    COALESCE(downline_counts.layer_1_count, 0) as layer_1_count,
    COALESCE(downline_counts.layer_2_count, 0) as layer_2_count,
    COALESCE(downline_counts.layer_3_count, 0) as layer_3_count,
    
    -- Layer 1 position breakdown (L/M/R)
    COALESCE(layer_1_positions.l_count, 0) as layer_1_l_count,
    COALESCE(layer_1_positions.m_count, 0) as layer_1_m_count,
    COALESCE(layer_1_positions.r_count, 0) as layer_1_r_count,
    
    -- Layer 1 completion percentage
    CASE 
        WHEN COALESCE(downline_counts.layer_1_count, 0) = 0 THEN 0.0
        ELSE ROUND((COALESCE(downline_counts.layer_1_count, 0)::NUMERIC / 3.0) * 100, 1)
    END as layer_1_completion_percent,
    
    -- Total rewards from their matrix
    COALESCE(reward_stats.total_rewards, 0) as total_rewards_from_matrix,
    COALESCE(reward_stats.total_usdt, 0.0) as total_usdt_from_matrix,
    COALESCE(reward_stats.pending_rewards, 0) as pending_rewards,
    
    -- Direct referrals count (from users table)
    COALESCE(direct_refs.referral_count, 0) as direct_referrals_count,
    
    -- Matrix status
    CASE 
        WHEN COALESCE(downline_counts.total_downline_members, 0) = 0 THEN 'No Downline'
        WHEN COALESCE(downline_counts.active_layers, 0) = 1 AND COALESCE(downline_counts.layer_1_count, 0) = 3 THEN 'Layer 1 Complete'
        WHEN COALESCE(downline_counts.active_layers, 0) >= 2 THEN 'Multi-Layer Active'
        ELSE 'Building Layer 1'
    END as matrix_status,
    
    -- Latest placement in their matrix
    downline_counts.latest_placement,
    
    -- Countdown status
    CASE 
        WHEN countdown_info.active_countdowns > 0 THEN 'Has Active Countdown'
        ELSE 'No Pending Countdowns'
    END as countdown_status

FROM members m
LEFT JOIN users u ON LOWER(m.wallet_address) = LOWER(u.wallet_address)

-- Downline statistics
LEFT JOIN (
    SELECT 
        imp.matrix_owner,
        COUNT(*) as total_downline_members,
        COUNT(DISTINCT imp.layer_in_owner_matrix) as active_layers,
        MAX(imp.layer_in_owner_matrix) as deepest_layer,
        COUNT(*) FILTER (WHERE imp.layer_in_owner_matrix = 1) as layer_1_count,
        COUNT(*) FILTER (WHERE imp.layer_in_owner_matrix = 2) as layer_2_count,
        COUNT(*) FILTER (WHERE imp.layer_in_owner_matrix = 3) as layer_3_count,
        MAX(imp.placed_at) as latest_placement
    FROM individual_matrix_placements imp
    WHERE imp.is_active = true
    GROUP BY imp.matrix_owner
) downline_counts ON LOWER(downline_counts.matrix_owner) = LOWER(m.wallet_address)

-- Layer 1 L/M/R position breakdown
LEFT JOIN (
    SELECT 
        imp.matrix_owner,
        COUNT(*) FILTER (WHERE imp.position_in_layer = 'L') as l_count,
        COUNT(*) FILTER (WHERE imp.position_in_layer = 'M') as m_count,
        COUNT(*) FILTER (WHERE imp.position_in_layer = 'R') as r_count
    FROM individual_matrix_placements imp
    WHERE imp.is_active = true AND imp.layer_in_owner_matrix = 1
    GROUP BY imp.matrix_owner
) layer_1_positions ON LOWER(layer_1_positions.matrix_owner) = LOWER(m.wallet_address)

-- Reward statistics
LEFT JOIN (
    SELECT 
        lr.recipient_wallet,
        COUNT(*) as total_rewards,
        SUM(lr.amount_usdt) as total_usdt,
        COUNT(*) FILTER (WHERE lr.reward_type = 'pending_layer_reward') as pending_rewards
    FROM layer_rewards lr
    GROUP BY lr.recipient_wallet
) reward_stats ON LOWER(reward_stats.recipient_wallet) = LOWER(m.wallet_address)

-- Direct referrals count
LEFT JOIN (
    SELECT 
        u_ref.referrer_wallet,
        COUNT(*) as referral_count
    FROM users u_ref
    WHERE u_ref.referrer_wallet IS NOT NULL
    GROUP BY u_ref.referrer_wallet
) direct_refs ON LOWER(direct_refs.referrer_wallet) = LOWER(m.wallet_address)

-- Countdown information
LEFT JOIN (
    SELECT 
        ct.wallet_address,
        COUNT(*) as active_countdowns
    FROM countdown_timers ct
    WHERE ct.is_active = true
    GROUP BY ct.wallet_address
) countdown_info ON LOWER(countdown_info.wallet_address) = LOWER(m.wallet_address)

ORDER BY m.current_level DESC, u.username;

-- Show all members in matrix_stats
SELECT 
    '=== ALL MEMBERS MATRIX STATISTICS ===' as section_title;

SELECT 
    member_username,
    member_level || ' Level' as level,
    total_downline_members || ' downline' as downline,
    direct_referrals_count || ' direct refs' as direct_refs,
    matrix_status,
    COALESCE(total_usdt_from_matrix, 0) || ' USDT earned' as total_earned
FROM matrix_stats
ORDER BY member_level DESC, member_username;

-- Summary by level
SELECT 
    '=== SUMMARY BY MEMBER LEVEL ===' as section_title;

SELECT 
    member_level,
    COUNT(*) as member_count,
    SUM(total_downline_members) as total_downlines,
    SUM(direct_referrals_count) as total_direct_refs,
    SUM(total_usdt_from_matrix) as total_usdt_earned,
    ARRAY_AGG(member_username ORDER BY member_username) as members
FROM matrix_stats
GROUP BY member_level
ORDER BY member_level DESC;

-- Final summary
DO $$
DECLARE
    total_members INTEGER;
    members_with_downline INTEGER;
    members_without_downline INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_members FROM matrix_stats;
    SELECT COUNT(*) INTO members_with_downline FROM matrix_stats WHERE total_downline_members > 0;
    SELECT COUNT(*) INTO members_without_downline FROM matrix_stats WHERE total_downline_members = 0;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MATRIX STATS - ALL MEMBERS INCLUDED ===';
    RAISE NOTICE 'Total members: %', total_members;
    RAISE NOTICE 'Members with downline: %', members_with_downline;
    RAISE NOTICE 'Members without downline: %', members_without_downline;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Matrix stats now includes ALL members!';
    RAISE NOTICE 'Every member appears regardless of downline status.';
END $$;