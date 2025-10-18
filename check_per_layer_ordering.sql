-- Check if L-M-R positions follow activation time order WITHIN each layer
-- Separate check for each parent-layer combination

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
            PARTITION BY mr.parent_wallet, mr.layer
            ORDER BY m.activation_time, m.activation_sequence
        ) as time_order_in_layer,
        CASE mr.position
            WHEN 'L' THEN 1
            WHEN 'M' THEN 2
            WHEN 'R' THEN 3
        END as position_order
    FROM matrix_referrals mr
    LEFT JOIN members m ON mr.member_wallet = m.wallet_address
    WHERE mr.layer IN (1, 2, 3)  -- Check first 3 layers
),
parent_layer_stats AS (
    SELECT 
        parent_wallet,
        layer,
        COUNT(DISTINCT referral_type) as type_count,
        STRING_AGG(DISTINCT referral_type, ', ' ORDER BY referral_type) as types,
        COUNT(*) as child_count
    FROM layer_children
    GROUP BY parent_wallet, layer
    HAVING COUNT(*) >= 2  -- Only show parents with multiple children in same layer
)
SELECT 
    lc.parent_wallet,
    lc.layer,
    pls.types as "has_types",
    lc.position,
    lc.referral_type,
    lc.activation_time,
    lc.time_order_in_layer,
    lc.position_order,
    CASE 
        WHEN lc.time_order_in_layer = lc.position_order THEN '✓' 
        ELSE '✗ ORDER WRONG' 
    END as check_result
FROM layer_children lc
JOIN parent_layer_stats pls ON lc.parent_wallet = pls.parent_wallet AND lc.layer = pls.layer
WHERE pls.type_count > 1  -- Only show cases with mixed direct/spillover
ORDER BY lc.parent_wallet, lc.layer, lc.activation_time
LIMIT 50;
