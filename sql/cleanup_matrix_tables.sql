-- ========================================
-- Matrix系统清理脚本
-- 删除不需要的表和views，保留核心功能
-- ========================================

-- 分析需求：
-- ✅ 保留：referrals表 (supabase/functions和前端组件都在使用)
-- ✅ 保留：spillover_matrix表 (supabase/functions需要)
-- ✅ 保留：members表 (基础数据)
-- ❌ 删除：不必要的views和表

-- ========================================
-- 第一步：删除多余的Views
-- ========================================

-- 删除多余的统计views (保留核心功能即可)
DROP VIEW IF EXISTS comprehensive_matrix_analysis CASCADE;
DROP VIEW IF EXISTS matrix_structure CASCADE;
DROP VIEW IF EXISTS direct_referrals_stats CASCADE;
DROP VIEW IF EXISTS total_team_stats CASCADE;
DROP VIEW IF EXISTS vacant_positions CASCADE;

-- 保留matrix_completion_status view (显示L-M-R完成情况)
-- 这个view在前端组件中有用

SELECT '已删除多余的统计views' as step_1;

-- ========================================
-- 第二步：删除多余的Tables (谨慎删除)
-- ========================================

-- 删除activation_rewards表 (如果不需要奖励功能)
-- DROP TABLE IF EXISTS activation_rewards CASCADE;

-- 删除可能不需要的表
DROP TABLE IF EXISTS matrix_activity_log CASCADE;
DROP TABLE IF EXISTS matrix_layer_summary CASCADE;

-- 保留重要的表：
-- ✅ referrals (核心矩阵数据)
-- ✅ spillover_matrix (Edge Functions需要)  
-- ✅ members (基础会员数据)
-- ✅ referral_links (推荐链接)
-- ✅ course_activations (课程激活)
-- ✅ member_activation_tiers (会员激活层级)
-- ✅ activation_rewards (奖励系统，如果需要的话)

SELECT '已删除多余的表' as step_2;

-- ========================================
-- 第三步：创建简化的必要Views
-- ========================================

-- 创建简化的矩阵完成状态view (前端需要)
CREATE OR REPLACE VIEW matrix_layer_status AS
SELECT 
    matrix_root,
    matrix_layer,
    COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) as left_count,
    COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) as middle_count,
    COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) as right_count,
    COUNT(*) as total_members,
    POWER(3, matrix_layer) as max_capacity
FROM referrals
WHERE matrix_root IS NOT NULL
GROUP BY matrix_root, matrix_layer
ORDER BY matrix_root, matrix_layer;

-- 创建简化的团队统计view
CREATE OR REPLACE VIEW team_stats AS
SELECT 
    matrix_root,
    COUNT(DISTINCT member_wallet) as total_team_size,
    MAX(matrix_layer) as max_layer
FROM referrals
WHERE matrix_root IS NOT NULL
GROUP BY matrix_root;

SELECT '已创建简化的必要views' as step_3;

-- ========================================
-- 第四步：清理referrals表的多余字段 (可选)
-- ========================================

-- 移除我们添加的额外字段，保持表结构简洁
-- 但保留核心的matrix字段
ALTER TABLE referrals DROP COLUMN IF EXISTS is_direct_referral;
ALTER TABLE referrals DROP COLUMN IF EXISTS is_spillover_placed;
ALTER TABLE referrals DROP COLUMN IF EXISTS direct_referrer_wallet;

-- 保留的核心字段：
-- ✅ member_wallet
-- ✅ referrer_wallet  
-- ✅ matrix_root
-- ✅ matrix_layer
-- ✅ matrix_position
-- ✅ matrix_parent
-- ✅ is_active
-- ✅ placed_at

SELECT '已清理referrals表多余字段' as step_4;

-- ========================================
-- 第五步：验证核心功能
-- ========================================

-- 验证Edge Functions需要的表和字段存在
SELECT 'referrals表验证' as check_type, 
       COUNT(*) as record_count,
       COUNT(DISTINCT matrix_root) as roots,
       MIN(matrix_layer) as min_layer,
       MAX(matrix_layer) as max_layer
FROM referrals;

-- 验证spillover_matrix表存在
SELECT 'spillover_matrix表验证' as check_type,
       COUNT(*) as record_count
FROM spillover_matrix;

-- 验证创建的views
SELECT 'matrix_layer_status view验证' as check_type,
       COUNT(*) as record_count
FROM matrix_layer_status;

-- 显示保留的表
SELECT 'REMAINING_TABLES' as type, tablename as name 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('referrals', 'spillover_matrix', 'members', 'referral_links', 'activation_rewards')
ORDER BY name;

-- 显示保留的views
SELECT 'REMAINING_VIEWS' as type, viewname as name
FROM pg_views 
WHERE schemaname = 'public'
AND viewname IN ('matrix_layer_status', 'team_stats', 'matrix_completion_status')
ORDER BY name;

SELECT '========== 清理完成 ==========' as status;