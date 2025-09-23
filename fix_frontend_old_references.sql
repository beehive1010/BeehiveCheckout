-- Frontend components fix to use new table structure
-- Files that need updating to use new views instead of old 'referrals' table

-- 1. useBeeHiveStats.ts line 135: Change from 'referrals' to 'matrix_referrals_tree_view'
-- 2. MatrixTestPage.tsx line 26: Change from 'referrals' to 'matrix_referrals_tree_view'  
-- 3. directReferralService.ts line 100: Change from 'referrals' to 'referrals_new'
-- 4. EnhancedMe.tsx line 163: Change from 'referrals' to 'referrals_new'
-- 5. Dashboard.tsx line 145: Change from 'referrals' to 'matrix_referrals_tree_view'

-- Need to update these components to use:
-- - referrals_new: for URL direct referrals (MasterSpec 2.4)
-- - matrix_referrals_tree_view: for complete matrix tree with 19 layers
-- - matrix_layers_view: for layer statistics
-- - referrer_stats: for comprehensive referral statistics