-- Create a simple referrer_stats view using only existing tables
DROP VIEW IF EXISTS referrer_stats CASCADE;

CREATE OR REPLACE VIEW referrer_stats AS
SELECT 
    m.activation_sequence as activation_id,
    m.wallet_address,
    'User' || m.activation_sequence as username,
    m.current_level,
    true as is_activated,
    m.activation_time as created_at,
    
    -- Count direct referrals
    COALESCE(ref_counts.direct_referrals, 0) as direct_referrals,
    
    -- Matrix members count
    COALESCE(ref_counts.total_matrix_members, 0) as total_matrix_members,
    
    -- Spillover count
    COALESCE(ref_counts.spillover_count, 0) as spillover_count,
    
    -- Layer 1 position counts
    COALESCE(ref_counts.L_filled, 0) as L_filled,
    COALESCE(ref_counts.M_filled, 0) as M_filled,
    COALESCE(ref_counts.R_filled, 0) as R_filled,
    
    -- Layer 1 total filled
    COALESCE(ref_counts.L_filled, 0) + COALESCE(ref_counts.M_filled, 0) + COALESCE(ref_counts.R_filled, 0) as layer1_filled,
    
    -- Next vacant position
    CASE 
        WHEN COALESCE(ref_counts.L_filled, 0) = 0 THEN 'L'
        WHEN COALESCE(ref_counts.M_filled, 0) = 0 THEN 'M'
        WHEN COALESCE(ref_counts.R_filled, 0) = 0 THEN 'R'
        ELSE 'Full'
    END as next_vacant_position,
    
    -- Reward information
    COALESCE(rewards.total_rewards, 0) as total_rewards,
    COALESCE(rewards.pending_rewards, 0) as pending_rewards,
    COALESCE(rewards.claimed_rewards, 0) as claimed_rewards,
    COALESCE(rewards.total_earned, 0) as total_earned,
    COALESCE(rewards.pending_amount, 0) as pending_amount
    
FROM members m

-- Join with referral counts
LEFT JOIN (
    SELECT 
        r.referrer_wallet,
        COUNT(*) FILTER (WHERE r.is_direct_referral = true) as direct_referrals,
        COUNT(*) as total_matrix_members,
        COUNT(*) FILTER (WHERE r.is_spillover_placement = true) as spillover_count,
        COUNT(*) FILTER (WHERE r.matrix_layer = 1 AND r.matrix_position = 'L') as L_filled,
        COUNT(*) FILTER (WHERE r.matrix_layer = 1 AND r.matrix_position = 'M') as M_filled,
        COUNT(*) FILTER (WHERE r.matrix_layer = 1 AND r.matrix_position = 'R') as R_filled
    FROM referrals r
    GROUP BY r.referrer_wallet
) ref_counts ON m.wallet_address = ref_counts.referrer_wallet

-- Join with reward summaries
LEFT JOIN (
    SELECT 
        lr.reward_recipient_wallet,
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'claimed' OR lr.status = 'claimable') as claimed_rewards,
        COALESCE(SUM(lr.reward_amount) FILTER (WHERE lr.status = 'claimed' OR lr.status = 'claimable'), 0) as total_earned,
        COALESCE(SUM(lr.reward_amount) FILTER (WHERE lr.status = 'pending'), 0) as pending_amount
    FROM layer_rewards lr
    GROUP BY lr.reward_recipient_wallet
) rewards ON m.wallet_address = rewards.reward_recipient_wallet;

-- Grant permissions
GRANT SELECT ON referrer_stats TO anon;
GRANT SELECT ON referrer_stats TO authenticated;

-- Test the view
SELECT 'referrer_stats view created successfully' as status;
SELECT activation_id, username, direct_referrals, total_rewards 
FROM referrer_stats 
ORDER BY activation_id 
LIMIT 3;