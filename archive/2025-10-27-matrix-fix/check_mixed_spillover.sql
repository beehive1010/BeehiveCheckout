-- Check for parents that have both direct and spillover children
-- To verify if activation time ordering is maintained when mixing types

WITH parent_children AS (
    SELECT 
        mr.matrix_root_wallet,
        mr.parent_wallet,
        mr.layer,
        mr.position,
        mr.member_wallet,
        mr.referral_type,
        m.activation_time,
        m.activation_sequence,
        ROW_NUMBER() OVER (
            PARTITION BY mr.parent_wallet 
            ORDER BY m.activation_time, m.activation_sequence
        ) as time_order,
        CASE mr.position
            WHEN 'L' THEN 1
            WHEN 'M' THEN 2
            WHEN 'R' THEN 3
        END as position_order
    FROM matrix_referrals mr
    LEFT JOIN members m ON mr.member_wallet = m.wallet_address
    WHERE mr.layer <= 3  -- Check first few layers
),
mixed_parents AS (
    SELECT parent_wallet
    FROM parent_children
    GROUP BY parent_wallet
    HAVING COUNT(DISTINCT referral_type) > 1  -- Has both direct and spillover
)
SELECT 
    pc.parent_wallet,
    pc.layer,
    pc.position,
    pc.member_wallet,
    pc.referral_type,
    pc.activation_time,
    pc.activation_sequence,
    pc.time_order,
    pc.position_order,
    CASE WHEN pc.time_order = pc.position_order THEN '✓ Correct' ELSE '✗ WRONG' END as order_check
FROM parent_children pc
WHERE pc.parent_wallet IN (SELECT parent_wallet FROM mixed_parents)
ORDER BY pc.parent_wallet, pc.activation_time, pc.activation_sequence
LIMIT 50;
