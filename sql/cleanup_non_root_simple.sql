-- 清理除了root用户(0x0000000000000000000000000000000000000001)之外的所有数据
-- 简化版本，无需ROW_COUNT()

BEGIN;

-- 1. 显示清理前数据概览
SELECT '=== BEFORE CLEANUP ===' as status;
SELECT 'users' as table_name, count(*) as count FROM users;
SELECT 'members' as table_name, count(*) as count FROM members;
SELECT 'referrals' as table_name, count(*) as count FROM referrals;

-- 2. 按依赖顺序删除数据

-- 删除countdown_timers
DELETE FROM countdown_timers 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 删除user_balances  
DELETE FROM user_balances 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 删除layer_rewards (保留root作为recipient的)
DELETE FROM layer_rewards 
WHERE recipient_wallet != '0x0000000000000000000000000000000000000001';

-- 删除individual_matrix_placements (保留root拥有的matrix)
DELETE FROM individual_matrix_placements 
WHERE matrix_owner != '0x0000000000000000000000000000000000000001';

-- 删除referrals (保留root作为matrix_root的)
DELETE FROM referrals 
WHERE matrix_root != '0x0000000000000000000000000000000000000001';

-- 删除非root members
DELETE FROM members 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 删除非root users
DELETE FROM users 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 3. 显示清理后统计
SELECT '=== AFTER CLEANUP ===' as status;
SELECT 'users' as table_name, count(*) as count FROM users;
SELECT 'members' as table_name, count(*) as count FROM members;  
SELECT 'referrals' as table_name, count(*) as count FROM referrals;
SELECT 'individual_matrix_placements' as table_name, count(*) as count FROM individual_matrix_placements;
SELECT 'layer_rewards' as table_name, count(*) as count FROM layer_rewards;
SELECT 'user_balances' as table_name, count(*) as count FROM user_balances;
SELECT 'countdown_timers' as table_name, count(*) as count FROM countdown_timers;

-- 4. 显示保留的root数据
SELECT '=== ROOT DATA PRESERVED ===' as status;
SELECT 'Root user:' as info, username, wallet_address FROM users WHERE wallet_address = '0x0000000000000000000000000000000000000001';

COMMIT;

SELECT '✅ CLEANUP COMPLETED' as result;