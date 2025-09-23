-- 🗑️ Clean up redundant matrix views after optimization
-- Created: 2025-09-23
-- Purpose: Remove old views that have been replaced by optimized versions

-- List of views to remove (as identified in MATRIX_VIEWS_OPTIMIZATION.md):
-- 1. matrix_structure_view (redundant)
-- 2. matrix_vacancy_quick (redundant) 
-- 3. personal_matrix_view (redundant)
-- 4. matrix_layer_view (replaced by matrix_layer_stats_optimized)
-- 5. member_matrix_layers_view (replaced by matrix_layer_stats_optimized)
-- 6. referral_hierarchy_view (replaced by referrals_stats_optimized)
-- 7. matrix_view (replaced by matrix_referrals_tree_view)

-- NOTE: We keep these views as they might still be used:
-- - matrix_layer_stats_view (being used by components)  
-- - matrix_referrals_view (being used by components)
-- - recursive_matrix_complete (being used by components)
-- - referral_hierarchy_19_levels (being used by components)
-- - spillover_matrix_view (might have special spillover logic)

-- ⚠️ Before dropping views, check for dependencies
-- Run this query first to check dependencies:
-- SELECT * FROM information_schema.view_table_usage WHERE view_name IN ('matrix_structure_view', 'matrix_vacancy_quick', 'personal_matrix_view');

BEGIN;

-- Drop redundant views (safe ones first)
DROP VIEW IF EXISTS matrix_structure_view CASCADE;
DROP VIEW IF EXISTS matrix_vacancy_quick CASCADE; 
DROP VIEW IF EXISTS personal_matrix_view CASCADE;

-- These might have dependencies, drop with CASCADE if needed
DROP VIEW IF EXISTS matrix_layer_view CASCADE;
DROP VIEW IF EXISTS member_matrix_layers_view CASCADE;
DROP VIEW IF EXISTS referral_hierarchy_view CASCADE;

-- This one might be more complex, check first
-- DROP VIEW IF EXISTS matrix_view CASCADE;

COMMIT;

-- ✅ After cleanup, we should have these optimized views:
-- 1. matrix_referrals_tree_view - Complete recursive matrix data
-- 2. matrix_layer_stats_optimized - Layer statistics 
-- 3. referrals_stats_optimized - Complete referrals statistics

-- 📊 And these existing views (still in use):
-- 1. matrix_layer_stats_view 
-- 2. matrix_referrals_view
-- 3. recursive_matrix_complete  
-- 4. referral_hierarchy_19_levels
-- 5. spillover_matrix_view (if needed)