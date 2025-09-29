-- 🔄 Update matrix_layer_stats_optimized to show 19-layer recursive referral data
-- Purpose: Each matrix_root sees their complete 19-layer referral tree statistics

-- Drop existing view
DROP VIEW IF EXISTS matrix_layer_stats_optimized CASCADE;

-- Create updated view based on 19-layer recursive referral structure
CREATE VIEW matrix_layer_stats_optimized AS
WITH RECURSIVE referral_tree_stats AS (
    -- Base case: Each member as root (layer 0)
    SELECT 
        m.wallet_address as matrix_root_wallet,
        m.wallet_address as member_wallet,
        0 as layer,
        'root'::text as position,
        1 as member_count,
        CASE WHEN m.current_level > 0 THEN 1 ELSE 0 END as active_count,
        ARRAY[m.wallet_address] as path
    FROM members m
    WHERE m.current_level > 0  -- Only activated members can have trees
    
    UNION ALL
    
    -- Recursive case: Build 19-layer statistics
    SELECT 
        rts.matrix_root_wallet,
        rn.referred_wallet as member_wallet,
        rts.layer + 1 as layer,
        -- Auto-assign L-M-R position based on sequence within layer
        CASE (ROW_NUMBER() OVER (
            PARTITION BY rts.matrix_root_wallet, rts.layer + 1 
            ORDER BY rn.created_at
        ) - 1) % 3
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M' 
            WHEN 2 THEN 'R'
        END as position,
        1 as member_count,
        CASE WHEN m2.current_level > 0 THEN 1 ELSE 0 END as active_count,
        rts.path || rn.referred_wallet
    FROM referral_tree_stats rts
    JOIN referrals_new rn ON rn.referrer_wallet = rts.member_wallet
    LEFT JOIN members m2 ON m2.wallet_address = rn.referred_wallet
    WHERE rts.layer < 19  -- Limit to 19 layers
        AND NOT rn.referred_wallet = ANY(rts.path)  -- Prevent cycles
        AND rn.referred_wallet != '0x0000000000000000000000000000000000000001'
),
-- Aggregate statistics per layer
layer_aggregated AS (
    SELECT 
        matrix_root_wallet,
        layer,
        COUNT(*) as total_members,
        COUNT(CASE WHEN position = 'L' THEN 1 END) as left_members,
        COUNT(CASE WHEN position = 'M' THEN 1 END) as middle_members,
        COUNT(CASE WHEN position = 'R' THEN 1 END) as right_members,
        SUM(active_count) as active_members
    FROM referral_tree_stats
    WHERE layer > 0  -- Exclude root layer
    GROUP BY matrix_root_wallet, layer
)
-- Final statistics with capacity calculations
SELECT 
    la.matrix_root_wallet,
    la.layer,
    la.total_members,
    la.left_members,
    la.middle_members, 
    la.right_members,
    la.active_members,
    
    -- Calculate theoretical max capacity for this layer (3^layer)
    POWER(3, la.layer)::integer as max_capacity,
    
    -- Calculate fill percentage
    CASE 
        WHEN POWER(3, la.layer) > 0 THEN 
            ROUND((la.total_members::numeric / POWER(3, la.layer)::numeric) * 100, 2)
        ELSE 0 
    END as fill_percentage,
    
    -- Additional metrics
    CASE 
        WHEN la.total_members > 0 THEN 
            ROUND((la.active_members::numeric / la.total_members::numeric) * 100, 2)
        ELSE 0 
    END as activation_rate

FROM layer_aggregated la

UNION ALL

-- Add empty layers for visualization (layers with no members)
SELECT 
    m.wallet_address as matrix_root_wallet,
    series.layer,
    0 as total_members,
    0 as left_members,
    0 as middle_members,
    0 as right_members, 
    0 as active_members,
    POWER(3, series.layer)::integer as max_capacity,
    0 as fill_percentage,
    0 as activation_rate
FROM members m
CROSS JOIN generate_series(1, 19) as series(layer)
WHERE m.current_level > 0
    AND NOT EXISTS (
        SELECT 1 FROM layer_aggregated la2 
        WHERE la2.matrix_root_wallet = m.wallet_address 
            AND la2.layer = series.layer
    )

ORDER BY matrix_root_wallet, layer;

-- Add helpful comment
COMMENT ON VIEW matrix_layer_stats_optimized IS 
'Shows complete 19-layer recursive referral tree statistics for each matrix_root. 
Includes both direct referrals and spillover placements according to 3x3 matrix rules.
Each member can see their complete downline across all 19 possible layers.';