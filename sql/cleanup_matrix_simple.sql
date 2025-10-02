-- 简化的matrix表清理脚本 - 只清理实际有数据的表

BEGIN;

-- 显示清理前状态
SELECT '=== BEFORE MATRIX CLEANUP ===' as status;
SELECT 'matrix_stats' as table_name, count(*) as count FROM matrix_stats
UNION ALL SELECT 'user_reward_balances', count(*) FROM user_reward_balances
UNION ALL SELECT 'member_activation_tiers', count(*) FROM member_activation_tiers;

-- 显示具体数据
SELECT '=== CURRENT DATA ===' as section;
SELECT 'matrix_stats data:' as info;
SELECT member_wallet, member_username, member_level FROM matrix_stats;

SELECT 'user_reward_balances data:' as info; 
SELECT wallet_address, usdc_claimable, usdc_pending FROM user_reward_balances;

SELECT 'member_activation_tiers data:' as info;
SELECT tier, tier_name, is_active FROM member_activation_tiers;

-- 清理策略：
-- 1. matrix_stats: 保留root的统计数据，它已经被清理后应该显示空矩阵
-- 2. user_reward_balances: 保留root的余额数据  
-- 3. member_activation_tiers: 保留系统配置数据

-- 简单清理：清空所有空表，保留有意义的表
DELETE FROM matrix_structure WHERE member_wallet != '0x0000000000000000000000000000000000000001';
DELETE FROM matrix_activity_log WHERE root_wallet != '0x0000000000000000000000000000000000000001';
DELETE FROM reward_records;
DELETE FROM reward_rollups;
DELETE FROM roll_up_rewards;
DELETE FROM membership;
DELETE FROM reward_notifications;

-- 显示清理后状态
SELECT '=== AFTER CLEANUP ===' as status;
SELECT 'Tables cleared - system ready for fresh data' as message;

-- 显示保留的核心数据
SELECT '=== PRESERVED DATA ===' as status;
SELECT member_wallet, member_username, matrix_status FROM matrix_stats;

COMMIT;

SELECT '✅ MATRIX SYSTEM RESET COMPLETE' as result;