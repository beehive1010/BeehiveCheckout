-- 🌳 Create 19-Layer Recursive Referral Tree View
-- Purpose: Show complete referral tree for each member (19 layers deep)
-- Includes: Direct referrals + Matrix spillover placements

-- First, create the core recursive referral tree
CREATE OR REPLACE VIEW recursive_referral_tree_19_layers AS
WITH RECURSIVE referral_tree AS (
    -- Base case: Start with all members as potential roots
    SELECT 
        m.wallet_address as tree_root_wallet,
        m.wallet_address as member_wallet,
        u.username as member_username,
        m.current_level as member_level,
        m.activation_time,
        m.activation_sequence,
        0 as layer_depth,
        ARRAY[m.wallet_address] as path,
        m.wallet_address::text as referral_path
    FROM members m
    LEFT JOIN users u ON u.wallet_address = m.wallet_address
    WHERE m.current_level > 0  -- Only activated members can have trees
    
    UNION ALL
    
    -- Recursive case: Find referrals for each layer (up to 19 layers)
    SELECT 
        rt.tree_root_wallet,
        rn.referred_wallet as member_wallet,
        u2.username as member_username,
        m2.current_level as member_level,
        m2.activation_time,
        m2.activation_sequence,
        rt.layer_depth + 1,
        rt.path || rn.referred_wallet,
        rt.referral_path || ' → ' || COALESCE(u2.username, rn.referred_wallet::text)
    FROM referral_tree rt
    JOIN referrals_new rn ON rn.referrer_wallet = rt.member_wallet
    LEFT JOIN users u2 ON u2.wallet_address = rn.referred_wallet  
    LEFT JOIN members m2 ON m2.wallet_address = rn.referred_wallet
    WHERE rt.layer_depth < 19  -- Limit to 19 layers as per rules
        AND NOT rn.referred_wallet = ANY(rt.path)  -- Prevent cycles
        AND rn.referred_wallet != '0x0000000000000000000000000000000000000001'  -- Exclude null addresses
)
SELECT 
    tree_root_wallet,
    member_wallet,
    member_username,
    member_level,
    activation_time,
    activation_sequence,
    layer_depth,
    referral_path,
    -- Calculate position in tree (simplified 3-position mapping)
    CASE 
        WHEN layer_depth = 0 THEN 'root'
        ELSE 
            CASE (ROW_NUMBER() OVER (PARTITION BY tree_root_wallet, layer_depth ORDER BY activation_sequence NULLS LAST) - 1) % 3
                WHEN 0 THEN 'L'
                WHEN 1 THEN 'M' 
                WHEN 2 THEN 'R'
            END
    END as tree_position,
    -- Add matrix integration data
    CASE 
        WHEN member_level > 0 THEN true 
        ELSE false 
    END as is_activated,
    -- Calculate team size for this member
    (SELECT COUNT(*) 
     FROM referral_tree rt2 
     WHERE rt2.tree_root_wallet = referral_tree.member_wallet 
       AND rt2.layer_depth > 0) as team_size_below
FROM referral_tree
ORDER BY tree_root_wallet, layer_depth, activation_sequence NULLS LAST;

-- Create integrated matrix-referral tree view that combines both systems
CREATE OR REPLACE VIEW matrix_referral_integrated_tree AS
SELECT 
    -- From referral tree
    rrt.tree_root_wallet as matrix_root_wallet,
    rrt.member_wallet,
    rrt.member_username as username,
    rrt.member_level as current_level,
    rrt.activation_time,
    rrt.layer_depth as referral_layer,
    rrt.tree_position as referral_position,
    rrt.is_activated,
    rrt.team_size_below,
    rrt.referral_path,
    
    -- From matrix system (spillover placements)
    mr.matrix_layer,
    mr.matrix_position,
    mr.placed_at as matrix_placed_at,
    mr.referrer_wallet as matrix_referrer,
    
    -- Unified data
    COALESCE(mr.matrix_layer, rrt.layer_depth + 1) as unified_layer,
    COALESCE(mr.matrix_position, rrt.tree_position) as unified_position,
    
    -- Source tracking
    CASE 
        WHEN mr.member_wallet IS NOT NULL AND rrt.member_wallet IS NOT NULL THEN 'both'
        WHEN mr.member_wallet IS NOT NULL THEN 'matrix_spillover'
        WHEN rrt.member_wallet IS NOT NULL THEN 'direct_referral'
        ELSE 'unknown'
    END as placement_source,
    
    -- Timestamps
    LEAST(rrt.activation_time, mr.placed_at) as earliest_placement
    
FROM recursive_referral_tree_19_layers rrt
FULL OUTER JOIN matrix_referrals mr ON (
    mr.matrix_root_wallet = rrt.tree_root_wallet 
    AND mr.member_wallet = rrt.member_wallet
)
WHERE rrt.tree_root_wallet IS NOT NULL 
   OR mr.matrix_root_wallet IS NOT NULL
ORDER BY 
    COALESCE(rrt.tree_root_wallet, mr.matrix_root_wallet),
    COALESCE(mr.matrix_layer, rrt.layer_depth + 1),
    earliest_placement NULLS LAST;

-- Create summary view for each member's complete 19-layer tree
CREATE OR REPLACE VIEW member_complete_tree_summary AS
SELECT 
    matrix_root_wallet,
    -- Direct referral stats
    COUNT(CASE WHEN placement_source IN ('direct_referral', 'both') THEN 1 END) as direct_referrals_count,
    COUNT(CASE WHEN placement_source IN ('matrix_spillover', 'both') THEN 1 END) as matrix_spillover_count,
    COUNT(*) - 1 as total_team_size,  -- Exclude root
    
    -- Layer analysis
    MAX(unified_layer) as max_layer_reached,
    COUNT(DISTINCT unified_layer) as layers_with_members,
    
    -- Position analysis (Layer 1 only)
    COUNT(CASE WHEN unified_layer = 1 AND unified_position = 'L' THEN 1 END) as layer1_left_filled,
    COUNT(CASE WHEN unified_layer = 1 AND unified_position = 'M' THEN 1 END) as layer1_middle_filled,
    COUNT(CASE WHEN unified_layer = 1 AND unified_position = 'R' THEN 1 END) as layer1_right_filled,
    
    -- Activation stats
    COUNT(CASE WHEN is_activated = true THEN 1 END) - 1 as activated_team_members,  -- Exclude root
    
    -- Recent activity
    MAX(earliest_placement) as last_placement_time,
    MIN(CASE WHEN unified_layer > 0 THEN earliest_placement END) as first_team_placement
    
FROM matrix_referral_integrated_tree
WHERE matrix_root_wallet IS NOT NULL
GROUP BY matrix_root_wallet
ORDER BY total_team_size DESC;