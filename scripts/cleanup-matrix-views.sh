#!/bin/bash
# 🗑️ Cleanup Redundant Matrix Views Script
# Usage: ./scripts/cleanup-matrix-views.sh
# Purpose: Remove redundant views identified in optimization

set -e

echo "🧹 Starting matrix views cleanup..."

# Database connection details
DB_HOST="34.56.229.13"
DB_USER="postgres"
DB_NAME="postgres"
export PGPASSWORD="bee8881941"

# List of redundant views to remove
VIEWS_TO_DROP=(
    "matrix_structure_view"
    "matrix_vacancy_quick" 
    "personal_matrix_view"
    "matrix_layer_view"
    "member_matrix_layers_view"
    "referral_hierarchy_view"
)

echo "📋 Views to be removed:"
for view in "${VIEWS_TO_DROP[@]}"; do
    echo "  - $view"
done

echo ""
echo "⚠️  WARNING: This will permanently delete the above views!"
echo "✅ Keep these optimized views:"
echo "  - matrix_referrals_tree_view"
echo "  - matrix_layer_stats_optimized" 
echo "  - referrals_stats_optimized"
echo ""

# Function to drop a view safely
drop_view() {
    local view_name=$1
    echo "🗑️  Dropping view: $view_name"
    
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "DROP VIEW IF EXISTS $view_name CASCADE;" > /dev/null 2>&1; then
        echo "✅ Successfully dropped: $view_name"
    else
        echo "⚠️  Failed to drop or view doesn't exist: $view_name"
    fi
}

# Execute cleanup
echo "🚀 Starting cleanup process..."
for view in "${VIEWS_TO_DROP[@]}"; do
    drop_view "$view"
    sleep 1  # Small delay between operations
done

echo ""
echo "🎉 Matrix views cleanup completed!"
echo ""
echo "📊 Remaining optimized views should be:"
echo "  1. matrix_referrals_tree_view"
echo "  2. matrix_layer_stats_optimized"
echo "  3. referrals_stats_optimized"
echo "  4. matrix_layer_stats_view (legacy, still used)"
echo "  5. matrix_referrals_view (legacy, still used)"
echo "  6. recursive_matrix_complete (legacy, still used)"
echo "  7. referral_hierarchy_19_levels (legacy, still used)"
echo ""
echo "✅ Cleanup complete! Frontend components now use optimized views."