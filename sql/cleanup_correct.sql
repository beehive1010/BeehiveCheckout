-- 正确的清理脚本 - 处理所有外键约束

BEGIN;

-- 显示清理前统计
SELECT '=== BEFORE CLEANUP ===' as status;
SELECT 'users' as table_name, count(*) as count FROM users
UNION ALL SELECT 'members', count(*) FROM members
UNION ALL SELECT 'referrals', count(*) FROM referrals
UNION ALL SELECT 'individual_matrix_placements', count(*) FROM individual_matrix_placements  
UNION ALL SELECT 'layer_rewards', count(*) FROM layer_rewards
UNION ALL SELECT 'user_balances', count(*) FROM user_balances
UNION ALL SELECT 'countdown_timers', count(*) FROM countdown_timers
UNION ALL SELECT 'reward_claims', count(*) FROM reward_claims;

-- 正确的删除顺序

-- 1. 删除countdown_timers 
DELETE FROM countdown_timers 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 2. 删除reward_claims (根据triggering_member_wallet)
DELETE FROM reward_claims 
WHERE triggering_member_wallet != '0x0000000000000000000000000000000000000001';

-- 3. 删除user_balances
DELETE FROM user_balances 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 4. 删除layer_rewards - 删除所有涉及非root用户的记录
-- 包括recipient_wallet或payer_wallet为非root的
DELETE FROM layer_rewards 
WHERE recipient_wallet != '0x0000000000000000000000000000000000000001'
   OR payer_wallet != '0x0000000000000000000000000000000000000001';

-- 5. 删除individual_matrix_placements (保留root拥有的matrix)
DELETE FROM individual_matrix_placements 
WHERE matrix_owner != '0x0000000000000000000000000000000000000001';

-- 6. 删除referrals (保留root作为matrix_root的)
DELETE FROM referrals 
WHERE matrix_root != '0x0000000000000000000000000000000000000001';

-- 7. 删除非root members
DELETE FROM members 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 8. 删除非root users
DELETE FROM users 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 显示清理后统计
SELECT '=== AFTER CLEANUP ===' as status;
SELECT 'users' as table_name, count(*) as count FROM users
UNION ALL SELECT 'members', count(*) FROM members
UNION ALL SELECT 'referrals', count(*) FROM referrals
UNION ALL SELECT 'individual_matrix_placements', count(*) FROM individual_matrix_placements
UNION ALL SELECT 'layer_rewards', count(*) FROM layer_rewards
UNION ALL SELECT 'user_balances', count(*) FROM user_balances
UNION ALL SELECT 'countdown_timers', count(*) FROM countdown_timers
UNION ALL SELECT 'reward_claims', count(*) FROM reward_claims;

-- 显示保留的数据
SELECT '=== PRESERVED DATA ===' as status;
SELECT * FROM users WHERE wallet_address = '0x0000000000000000000000000000000000000001';

COMMIT;

SELECT '🎯 DATABASE SUCCESSFULLY RESET' as result;
SELECT 'Only root user (0x0000000000000000000000000000000000000001) remains' as message;