-- 最终matrix表清理脚本 - 基于正确的表结构

BEGIN;

-- 显示清理前状态
SELECT '=== MATRIX TABLES BEFORE CLEANUP ===' as status;

-- 检查有数据的表
SELECT 'matrix_stats' as table_name, count(*) as count FROM matrix_stats
UNION ALL SELECT 'matrix_structure', count(*) FROM matrix_structure
UNION ALL SELECT 'matrix_activity_log', count(*) FROM matrix_activity_log
UNION ALL SELECT 'reward_records', count(*) FROM reward_records
UNION ALL SELECT 'reward_rollups', count(*) FROM reward_rollups
UNION ALL SELECT 'roll_up_rewards', count(*) FROM roll_up_rewards
UNION ALL SELECT 'user_reward_balances', count(*) FROM user_reward_balances
UNION ALL SELECT 'membership', count(*) FROM membership
UNION ALL SELECT 'member_activation_tiers', count(*) FROM member_activation_tiers
UNION ALL SELECT 'reward_notifications', count(*) FROM reward_notifications;

-- 清理matrix相关数据表

-- 1. 清理matrix_activity_log (使用正确的列名)
DELETE FROM matrix_activity_log 
WHERE root_wallet != '0x0000000000000000000000000000000000000001'
   OR member_wallet != '0x0000000000000000000000000000000000000001';

-- 2. 清理matrix_structure
DELETE FROM matrix_structure
WHERE root_wallet != '0x0000000000000000000000000000000000000001';

-- 3. matrix_stats保留root的统计 (不删除，因为是root的数据)

-- 4. 清理reward_records
DELETE FROM reward_records;  -- 清空所有reward_records

-- 5. 清理reward_rollups
DELETE FROM reward_rollups;  -- 清空所有rollups

-- 6. 清理roll_up_rewards
DELETE FROM roll_up_rewards;  -- 清空所有roll_up_rewards

-- 7. user_reward_balances保留root的余额 (不删除)

-- 8. 清理membership
DELETE FROM membership;  -- 清空membership

-- 9. member_activation_tiers保留 (这是系统配置，不删除)

-- 10. 清理reward_notifications
DELETE FROM reward_notifications;  -- 清空所有通知

-- 显示清理后状态
SELECT '=== MATRIX TABLES AFTER CLEANUP ===' as status;

SELECT 'matrix_stats' as table_name, count(*) as count FROM matrix_stats
UNION ALL SELECT 'matrix_structure', count(*) FROM matrix_structure
UNION ALL SELECT 'matrix_activity_log', count(*) FROM matrix_activity_log
UNION ALL SELECT 'reward_records', count(*) FROM reward_records
UNION ALL SELECT 'reward_rollups', count(*) FROM reward_rollups  
UNION ALL SELECT 'roll_up_rewards', count(*) FROM roll_up_rewards
UNION ALL SELECT 'user_reward_balances', count(*) FROM user_reward_balances
UNION ALL SELECT 'membership', count(*) FROM membership
UNION ALL SELECT 'member_activation_tiers', count(*) FROM member_activation_tiers
UNION ALL SELECT 'reward_notifications', count(*) FROM reward_notifications;

-- 显示保留的root数据
SELECT '=== PRESERVED ROOT MATRIX DATA ===' as status;
SELECT member_wallet, member_username, member_level, matrix_status 
FROM matrix_stats 
WHERE member_wallet = '0x0000000000000000000000000000000000000001';

COMMIT;

SELECT '🎯 MATRIX CLEANUP COMPLETE' as result;
SELECT 'All matrix data cleared except root statistics and system config' as message;