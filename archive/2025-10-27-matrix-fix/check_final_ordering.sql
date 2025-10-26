-- Final check: Verify L-M-R ordering follows activation time
-- Correctly partitioned by BOTH matrix_root AND parent_wallet

WITH layer_children AS (
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
            PARTITION BY mr.matrix_root_wallet, mr.parent_wallet, mr.layer
            ORDER BY m.activation_time, m.activation_sequence
        ) as time_order_in_layer,
        CASE mr.position
            WHEN 'L' THEN 1
            WHEN 'M' THEN 2
            WHEN 'R' THEN 3
        END as position_order
    FROM matrix_referrals mr
    LEFT JOIN members m ON mr.member_wallet = m.wallet_address
    WHERE mr.layer IN (1, 2, 3)  
),
parent_layer_stats AS (
    SELECT 
        matrix_root_wallet,
        parent_wallet,
        layer,
        COUNT(DISTINCT referral_type) as type_count,
        COUNT(*) as child_count
    FROM layer_children
    GROUP BY matrix_root_wallet, parent_wallet, layer
    HAVING COUNT(DISTINCT referral_type) > 1  -- Only mixed direct/spillover
      AND COUNT(*) >= 2  -- At least 2 children
)
SELECT 
    lc.matrix_root_wallet,
    lc.parent_wallet,
    lc.layer,
    pls.child_count,
    lc.position,
    lc.referral_type,
    TO_CHAR(lc.activation_time, 'YYYY-MM-DD HH24:MI') as activated_at,
    lc.time_order_in_layer,
    lc.position_order,
    CASE 
        WHEN lc.time_order_in_layer = lc.position_order THEN '✓' 
        ELSE '✗ WRONG' 
    END as check_result
FROM layer_children lc
JOIN parent_layer_stats pls 
  ON lc.matrix_root_wallet = pls.matrix_root_wallet
  AND lc.parent_wallet = pls.parent_wallet 
  AND lc.layer = pls.layer
ORDER BY 
    lc.matrix_root_wallet, 
    lc.parent_wallet, 
    lc.layer, 
    lc.activation_time
LIMIT 100;
