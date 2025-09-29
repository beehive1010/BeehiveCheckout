#!/bin/bash
# 🌳 Create 19-Layer Recursive Referral Tree Views
# Purpose: Create comprehensive views showing each member's complete 19-layer referral tree

set -e

echo "🌳 Creating 19-layer recursive referral tree views..."

# Database connection
DB_HOST="34.56.229.13"
DB_USER="postgres" 
DB_NAME="postgres"
export PGPASSWORD="bee8881941"

echo "📡 Connecting to database..."

# Create the recursive referral tree view
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- 🌳 19-Layer Recursive Referral Tree View
CREATE OR REPLACE VIEW recursive_referral_tree_19_layers AS
WITH RECURSIVE referral_tree AS (
    -- Base: Each member as root of their tree
    SELECT 
        m.wallet_address as tree_root,
        m.wallet_address as member_wallet,
        u.username,
        m.current_level,
        m.activation_time,
        0 as layer,
        'root'::text as position,
        ARRAY[m.wallet_address] as path
    FROM members m
    LEFT JOIN users u ON u.wallet_address = m.wallet_address
    WHERE m.current_level > 0
    
    UNION ALL
    
    -- Recursive: Build 19-layer tree from referrals_new
    SELECT 
        rt.tree_root,
        rn.referred_wallet,
        u2.username,
        m2.current_level,
        m2.activation_time,
        rt.layer + 1,
        -- Auto-assign L-M-R position based on sequence
        CASE (ROW_NUMBER() OVER (PARTITION BY rt.tree_root, rt.layer + 1 ORDER BY rn.created_at) - 1) % 3
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M' 
            WHEN 2 THEN 'R'
        END,
        rt.path || rn.referred_wallet
    FROM referral_tree rt
    JOIN referrals_new rn ON rn.referrer_wallet = rt.member_wallet
    LEFT JOIN users u2 ON u2.wallet_address = rn.referred_wallet
    LEFT JOIN members m2 ON m2.wallet_address = rn.referred_wallet
    WHERE rt.layer < 19
        AND NOT rn.referred_wallet = ANY(rt.path)
        AND rn.referred_wallet != '0x0000000000000000000000000000000000000001'
)
SELECT * FROM referral_tree ORDER BY tree_root, layer, position;
EOF

echo "✅ Created recursive_referral_tree_19_layers view"

# Create matrix integration view  
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- 🔄 Integrate Matrix + Referral Tree Data
CREATE OR REPLACE VIEW complete_member_tree_view AS
SELECT 
    COALESCE(rrt.tree_root, mr.matrix_root_wallet) as member_root,
    COALESCE(rrt.member_wallet, mr.member_wallet) as member_wallet,
    COALESCE(rrt.username, u.username) as username,
    COALESCE(rrt.current_level, m.current_level) as current_level,
    
    -- Layer information (prefer matrix layer, fallback to referral layer)
    COALESCE(mr.matrix_layer, rrt.layer) as layer,
    COALESCE(mr.matrix_position, rrt.position) as position,
    
    -- Source tracking
    CASE 
        WHEN mr.member_wallet IS NOT NULL AND rrt.member_wallet IS NOT NULL THEN 'referral_and_matrix'
        WHEN mr.member_wallet IS NOT NULL THEN 'matrix_spillover'
        WHEN rrt.member_wallet IS NOT NULL THEN 'direct_referral'
    END as placement_type,
    
    -- Timestamps
    rrt.activation_time as referral_time,
    mr.placed_at as matrix_time,
    
    -- Status
    CASE WHEN COALESCE(rrt.current_level, m.current_level) > 0 THEN true ELSE false END as is_active
    
FROM recursive_referral_tree_19_layers rrt
FULL OUTER JOIN matrix_referrals mr ON (
    mr.matrix_root_wallet = rrt.tree_root 
    AND mr.member_wallet = rrt.member_wallet
)
LEFT JOIN users u ON u.wallet_address = COALESCE(rrt.member_wallet, mr.member_wallet)
LEFT JOIN members m ON m.wallet_address = COALESCE(rrt.member_wallet, mr.member_wallet)
WHERE COALESCE(rrt.tree_root, mr.matrix_root_wallet) IS NOT NULL
ORDER BY member_root, layer, position;
EOF

echo "✅ Created complete_member_tree_view"

echo "🎉 Successfully created 19-layer recursive referral tree views!"
echo ""
echo "📊 Available views:"
echo "  1. recursive_referral_tree_19_layers - Pure referral chains (19 layers)"
echo "  2. complete_member_tree_view - Combined referral + matrix data"
echo ""
echo "🔍 Usage examples:"
echo "  -- See user's complete 19-layer tree:"
echo "  SELECT * FROM complete_member_tree_view WHERE member_root = 'wallet_address';"
echo ""
echo "  -- Count team size per layer:"
echo "  SELECT member_root, layer, COUNT(*) FROM complete_member_tree_view GROUP BY member_root, layer;"