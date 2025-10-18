-- Check if matrix positions follow activation time order
-- User requirement: If spillover activated before direct, spillover should get L position

-- Check recent placements with activation times
SELECT 
    mr.matrix_root_wallet,
    mr.parent_wallet,
    mr.layer,
    mr.position,
    mr.member_wallet,
    mr.referral_type,
    m.activation_time,
    m.activation_sequence,
    mr.created_at as placed_at,
    ROW_NUMBER() OVER (
        PARTITION BY mr.matrix_root_wallet, mr.parent_wallet 
        ORDER BY m.activation_time, m.activation_sequence
    ) as time_order,
    CASE mr.position
        WHEN 'L' THEN 1
        WHEN 'M' THEN 2
        WHEN 'R' THEN 3
    END as position_order
FROM matrix_referrals mr
LEFT JOIN members m ON mr.member_wallet = m.wallet_address
WHERE mr.layer = 1  -- Check layer 1 (direct children of root)
  AND mr.parent_wallet = mr.matrix_root_wallet  -- Direct children only
ORDER BY mr.matrix_root_wallet, m.activation_time, m.activation_sequence
LIMIT 50;
