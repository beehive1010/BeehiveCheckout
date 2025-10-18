-- Investigate the case with duplicate positions
SELECT 
    mr.matrix_root_wallet,
    mr.parent_wallet,
    mr.layer,
    mr.position,
    mr.member_wallet,
    mr.referral_type,
    mr.source,
    m.activation_time,
    m.activation_sequence,
    mr.created_at as placed_at
FROM matrix_referrals mr
LEFT JOIN members m ON mr.member_wallet = m.wallet_address
WHERE mr.parent_wallet = '0x01c413c7cA38CdAB47Bd09a3a04710A344ABA311'
  AND mr.layer = 3
ORDER BY mr.position, m.activation_time;
