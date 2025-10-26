-- Check referrer's matrix to validate L-M-R ordering
-- Referrer: 0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3

SELECT 
    '=== REFERRER LAYER 1 CHILDREN (L-M-R ordering check) ===' as info,
    mr.position,
    mr.member_wallet,
    mr.referral_type,
    m.activation_time,
    m.activation_sequence,
    u.username,
    ROW_NUMBER() OVER (ORDER BY m.activation_time, m.activation_sequence) as time_order,
    CASE mr.position
        WHEN 'L' THEN 1
        WHEN 'M' THEN 2
        WHEN 'R' THEN 3
    END as position_order,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY m.activation_time, m.activation_sequence) = 
             CASE mr.position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END
        THEN '✓ Correct'
        ELSE '✗ WRONG'
    END as order_check
FROM matrix_referrals mr
LEFT JOIN members m ON mr.member_wallet = m.wallet_address
LEFT JOIN users u ON mr.member_wallet = u.wallet_address
WHERE mr.matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
  AND mr.parent_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
  AND mr.layer = 1
ORDER BY m.activation_time, m.activation_sequence;

-- Also check layer 2 to see the full picture
SELECT 
    '=== REFERRER LAYER 2 CHILDREN ===' as info,
    mr.position,
    mr.parent_wallet,
    mr.member_wallet,
    mr.referral_type,
    m.activation_time,
    m.activation_sequence
FROM matrix_referrals mr
LEFT JOIN members m ON mr.member_wallet = m.wallet_address
WHERE mr.matrix_root_wallet = '0x982282D7e8EDa55d9EA7db8EFCbFA738D84029C3'
  AND mr.layer = 2
ORDER BY mr.parent_wallet, m.activation_time, m.activation_sequence
LIMIT 20;
