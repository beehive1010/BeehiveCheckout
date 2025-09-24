-- Fix referrer_stats view to use correct column names
-- This fixes the "column referrer_stats.direct_referrals does not exist" error

DROP VIEW IF EXISTS referrer_stats CASCADE;

CREATE OR REPLACE VIEW referrer_stats AS
WITH referrer_summary AS (
    SELECT 
        m.activation_id,
        m.wallet_address,
        m.username,
        m.current_level,
        m.is_activated,
        m.created_at,
        
        -- Count direct referrals from referrals table (not matrix placements)
        (SELECT COUNT(*) 
         FROM referrals r 
         WHERE r.referrer_wallet = m.wallet_address 
         AND r.is_direct_referral = true) as direct_referrals,
         
        -- Matrix placement statistics
        COUNT(mp.member_wallet) as total_matrix_members,
        COUNT(mp.member_wallet) FILTER (WHERE mp.is_spillover = true) as spillover_count,
        COUNT(mp.member_wallet) FILTER (WHERE mp.matrix_position = 'L' AND mp.matrix_layer = 1) as L_filled,
        COUNT(mp.member_wallet) FILTER (WHERE mp.matrix_position = 'M' AND mp.matrix_layer = 1) as M_filled,
        COUNT(mp.member_wallet) FILTER (WHERE mp.matrix_position = 'R' AND mp.matrix_layer = 1) as R_filled
    FROM members m
    LEFT JOIN matrix_placements mp ON m.wallet_address = mp.matrix_root
    GROUP BY m.activation_id, m.wallet_address, m.username, m.current_level, m.is_activated, m.created_at
),
reward_summary AS (
    SELECT 
        lr.reward_recipient_wallet,
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'claimed') as claimed_rewards,
        COALESCE(SUM(lr.reward_amount) FILTER (WHERE lr.status = 'claimed'), 0) as total_earned,
        COALESCE(SUM(lr.reward_amount) FILTER (WHERE lr.status = 'pending'), 0) as pending_amount
    FROM layer_rewards lr
    GROUP BY lr.reward_recipient_wallet
)
SELECT 
    rs.activation_id,
    rs.wallet_address,
    rs.username,
    rs.current_level,
    rs.is_activated,
    rs.created_at,
    rs.direct_referrals,
    rs.total_matrix_members,
    rs.spillover_count,
    rs.L_filled,
    rs.M_filled, 
    rs.R_filled,
    (rs.L_filled + rs.M_filled + rs.R_filled) as layer1_filled,
    CASE 
        WHEN rs.L_filled = 0 THEN 'L'
        WHEN rs.M_filled = 0 THEN 'M' 
        WHEN rs.R_filled = 0 THEN 'R'
        ELSE 'Full'
    END as next_vacant_position,
    COALESCE(rw.total_rewards, 0) as total_rewards,
    COALESCE(rw.pending_rewards, 0) as pending_rewards,
    COALESCE(rw.claimed_rewards, 0) as claimed_rewards,
    COALESCE(rw.total_earned, 0) as total_earned,
    COALESCE(rw.pending_amount, 0) as pending_amount
FROM referrer_summary rs
LEFT JOIN reward_summary rw ON rs.wallet_address = rw.reward_recipient_wallet;

-- Grant permissions
GRANT SELECT ON referrer_stats TO anon;
GRANT SELECT ON referrer_stats TO authenticated;

-- Test the view
SELECT 'Testing referrer_stats view...' as status;
SELECT 
    activation_id, 
    username, 
    direct_referrals, 
    total_matrix_members,
    layer1_filled,
    total_rewards
FROM referrer_stats 
ORDER BY activation_id 
LIMIT 5;