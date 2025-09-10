-- 清理所有matrix相关的BASE TABLE（不包括VIEW）
-- VIEW会自动基于基础表数据更新

BEGIN;

-- 显示清理前的BASE TABLE数据量
SELECT '=== MATRIX BASE TABLES BEFORE CLEANUP ===' as status;
SELECT 'matrix_activity_log' as table_name, count(*) as count FROM matrix_activity_log
UNION ALL SELECT 'matrix_layer_summary', count(*) FROM matrix_layer_summary
UNION ALL SELECT 'member_activation_tiers', count(*) FROM member_activation_tiers  
UNION ALL SELECT 'member_requirements', count(*) FROM member_requirements
UNION ALL SELECT 'membership', count(*) FROM membership
UNION ALL SELECT 'reward_notifications', count(*) FROM reward_notifications
UNION ALL SELECT 'reward_records', count(*) FROM reward_records
UNION ALL SELECT 'reward_rollups', count(*) FROM reward_rollups
UNION ALL SELECT 'reward_rules', count(*) FROM reward_rules
UNION ALL SELECT 'roll_up_rewards', count(*) FROM roll_up_rewards
UNION ALL SELECT 'user_reward_balances', count(*) FROM user_reward_balances
ORDER BY count DESC;

-- 清理BASE TABLE数据（保留系统配置和root用户数据）

-- 1. 清理matrix_activity_log
DELETE FROM matrix_activity_log;

-- 2. 清理matrix_layer_summary (如果有非root数据)
DELETE FROM matrix_layer_summary 
WHERE root_wallet != '0x0000000000000000000000000000000000000001';

-- 3. 保留member_activation_tiers (系统配置)

-- 4. 清理member_requirements (保留root的)
DELETE FROM member_requirements 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 5. 清理membership
DELETE FROM membership;

-- 6. 清理reward_notifications  
DELETE FROM reward_notifications;

-- 7. 清理reward_records
DELETE FROM reward_records;

-- 8. 清理reward_rollups
DELETE FROM reward_rollups;

-- 9. 保留reward_rules (系统配置)

-- 10. 清理roll_up_rewards
DELETE FROM roll_up_rewards;

-- 11. 保留user_reward_balances中root的数据

-- 显示清理后的状态
SELECT '=== MATRIX BASE TABLES AFTER CLEANUP ===' as status;
SELECT 'matrix_activity_log' as table_name, count(*) as count FROM matrix_activity_log
UNION ALL SELECT 'matrix_layer_summary', count(*) FROM matrix_layer_summary
UNION ALL SELECT 'member_activation_tiers', count(*) FROM member_activation_tiers
UNION ALL SELECT 'member_requirements', count(*) FROM member_requirements
UNION ALL SELECT 'membership', count(*) FROM membership
UNION ALL SELECT 'reward_notifications', count(*) FROM reward_notifications
UNION ALL SELECT 'reward_records', count(*) FROM reward_records
UNION ALL SELECT 'reward_rollups', count(*) FROM reward_rollups
UNION ALL SELECT 'reward_rules', count(*) FROM reward_rules
UNION ALL SELECT 'roll_up_rewards', count(*) FROM roll_up_rewards
UNION ALL SELECT 'user_reward_balances', count(*) FROM user_reward_balances;

-- 显示保留的核心数据
SELECT '=== PRESERVED SYSTEM DATA ===' as status;
SELECT tier, tier_name FROM member_activation_tiers WHERE is_active = true;

COMMIT;

SELECT '🎯 ALL MATRIX BASE TABLES CLEANED' as result;
SELECT 'Views will auto-update based on cleaned base tables' as note;