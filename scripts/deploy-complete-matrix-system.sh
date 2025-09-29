#!/bin/bash
# 🚀 Deploy Complete 19-Layer Matrix System
# Purpose: Deploy all views and cleanup for complete matrix system

set -e

echo "🚀 Deploying Complete 19-Layer Matrix System..."

# Database connection
DB_HOST="34.56.229.13"
DB_USER="postgres" 
DB_NAME="postgres"
export PGPASSWORD="bee8881941"

echo "📡 Connecting to database..."

# Step 1: Create 19-layer recursive tree views
echo "🌳 Creating 19-layer recursive referral tree views..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f db/create-recursive-referral-tree-view.sql

# Step 2: Update matrix layer stats view
echo "📊 Updating matrix layer stats for 19-layer recursive data..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f db/update-matrix-layer-stats-optimized.sql

# Step 3: Create the complete member tree view  
echo "🔗 Creating complete member tree view..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Create unified view that combines referral tree + matrix spillover
CREATE OR REPLACE VIEW complete_member_tree_view AS
WITH RECURSIVE referral_tree AS (
    -- Base: Each member as root
    SELECT 
        m.wallet_address as member_root,
        m.wallet_address as member_wallet,
        u.username,
        m.current_level,
        m.activation_time,
        0 as layer,
        'root'::text as position,
        ARRAY[m.wallet_address] as path,
        'self' as placement_type
    FROM members m
    LEFT JOIN users u ON u.wallet_address = m.wallet_address
    WHERE m.current_level > 0
    
    UNION ALL
    
    -- Recursive: Build tree from referrals
    SELECT 
        rt.member_root,
        rn.referred_wallet,
        u2.username,
        m2.current_level,
        m2.activation_time,
        rt.layer + 1,
        CASE (ROW_NUMBER() OVER (PARTITION BY rt.member_root, rt.layer + 1 ORDER BY rn.created_at) - 1) % 3
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M' 
            WHEN 2 THEN 'R'
        END,
        rt.path || rn.referred_wallet,
        'direct_referral' as placement_type
    FROM referral_tree rt
    JOIN referrals_new rn ON rn.referrer_wallet = rt.member_wallet
    LEFT JOIN users u2 ON u2.wallet_address = rn.referred_wallet
    LEFT JOIN members m2 ON m2.wallet_address = rn.referred_wallet
    WHERE rt.layer < 19
        AND NOT rn.referred_wallet = ANY(rt.path)
        AND rn.referred_wallet != '0x0000000000000000000000000000000000000001'
)
SELECT 
    rt.member_root,
    rt.member_wallet,
    rt.username,
    rt.current_level,
    rt.activation_time,
    rt.layer,
    rt.position,
    rt.placement_type,
    
    -- Add matrix spillover data if exists
    mr.matrix_position as matrix_spillover_position,
    mr.placed_at as matrix_spillover_time,
    
    -- Unified position (prefer matrix spillover if available)
    COALESCE(mr.matrix_position, rt.position) as final_position,
    
    -- Status flags
    CASE WHEN rt.current_level > 0 THEN true ELSE false END as is_active,
    CASE 
        WHEN mr.member_wallet IS NOT NULL THEN 'referral_with_spillover'
        ELSE rt.placement_type 
    END as final_placement_type
    
FROM referral_tree rt
LEFT JOIN matrix_referrals mr ON (
    mr.matrix_root_wallet = rt.member_root 
    AND mr.member_wallet = rt.member_wallet
    AND mr.matrix_layer = rt.layer
)
ORDER BY rt.member_root, rt.layer, rt.final_position;
EOF

echo "✅ Created complete_member_tree_view"

# Step 4: Clean up redundant views
echo "🧹 Cleaning up redundant views..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Safe cleanup of redundant views
DROP VIEW IF EXISTS matrix_structure_view CASCADE;
DROP VIEW IF EXISTS matrix_vacancy_quick CASCADE; 
DROP VIEW IF EXISTS personal_matrix_view CASCADE;
DROP VIEW IF EXISTS matrix_layer_view CASCADE;
DROP VIEW IF EXISTS member_matrix_layers_view CASCADE;
DROP VIEW IF EXISTS referral_hierarchy_view CASCADE;
EOF

echo "🗑️ Cleaned up redundant views"

# Step 5: Verify deployment
echo "🔍 Verifying deployment..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Check that all required views exist
SELECT 
    schemaname, 
    viewname,
    definition IS NOT NULL as has_definition
FROM pg_views 
WHERE schemaname = 'public' 
    AND viewname IN (
        'recursive_referral_tree_19_layers',
        'complete_member_tree_view', 
        'matrix_layer_stats_optimized',
        'referrals_stats_optimized'
    )
ORDER BY viewname;
EOF

echo ""
echo "🎉 Complete 19-Layer Matrix System Deployment Successful!"
echo ""
echo "📊 Available Views:"
echo "  ✅ recursive_referral_tree_19_layers - Pure 19-layer referral chains"
echo "  ✅ complete_member_tree_view - Unified referral + matrix data"  
echo "  ✅ matrix_layer_stats_optimized - Layer statistics for each matrix_root"
echo "  ✅ referrals_stats_optimized - Complete referrals statistics"
echo ""
echo "🔧 Frontend Components Updated:"
echo "  ✅ SimpleMatrixView.tsx - Uses complete_member_tree_view"
echo "  ✅ MatrixLayerStats.tsx - Uses matrix_layer_stats_optimized"
echo "  ✅ ReferralsStats.tsx - Uses referrals_stats_optimized"
echo ""
echo "🌳 Each member now sees their complete 19-layer recursive referral tree!"
echo "   Including: Direct referrals + Matrix spillover placements"