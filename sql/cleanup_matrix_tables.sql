-- 清理所有matrix相关的表和视图
-- 保留root用户相关数据

BEGIN;

-- 显示清理前统计
SELECT '=== BEFORE MATRIX CLEANUP ===' as status;

-- 检查所有matrix相关表的数据
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

-- 清理所有matrix相关数据表 (保留root用户数据)

-- 1. 清理matrix_activity_log
DELETE FROM matrix_activity_log 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 2. 清理matrix_structure  
DELETE FROM matrix_structure
WHERE root_wallet != '0x0000000000000000000000000000000000000001';

-- 3. 清理matrix_stats (保留root的统计)
DELETE FROM matrix_stats
WHERE root_wallet != '0x0000000000000000000000000000000000000001';

-- 4. 清理reward相关表
DELETE FROM reward_records
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

DELETE FROM reward_rollups
WHERE root_wallet != '0x0000000000000000000000000000000000000001';

DELETE FROM roll_up_rewards  
WHERE root_wallet != '0x0000000000000000000000000000000000000001';

-- 5. 清理user_reward_balances (保留root的余额)
DELETE FROM user_reward_balances
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 6. 清理membership
DELETE FROM membership
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 7. 清理member_activation_tiers
DELETE FROM member_activation_tiers
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 8. 清理reward_notifications
DELETE FROM reward_notifications
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 显示清理后统计
SELECT '=== AFTER MATRIX CLEANUP ===' as status;

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

-- 显示保留的数据
SELECT '=== PRESERVED ROOT DATA ===' as status;
SELECT 'matrix_stats' as source, root_wallet FROM matrix_stats WHERE root_wallet = '0x0000000000000000000000000000000000000001'
UNION ALL
SELECT 'user_reward_balances', wallet_address FROM user_reward_balances WHERE wallet_address = '0x0000000000000000000000000000000000000001'
UNION ALL  
SELECT 'member_activation_tiers', wallet_address FROM member_activation_tiers WHERE wallet_address = '0x0000000000000000000000000000000000000001';

COMMIT;

SELECT '🧹 ALL MATRIX TABLES CLEANED' as result;
SELECT 'System completely reset - only root user data remains' as message;