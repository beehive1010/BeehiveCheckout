-- 清理除了root用户(0x0000000000000000000000000000000000000001)之外的所有数据
-- 
-- 警告：此脚本将删除大量数据，请确认执行前做好备份
--

-- 设置root用户地址为常量
\set ROOT_WALLET '0x0000000000000000000000000000000000000001'

BEGIN;

-- 1. 显示将要删除的数据概览
SELECT '=== DATA TO BE DELETED ===' as action;

-- 显示非root用户数量
SELECT 'Non-root users to delete' as category, COUNT(*) as count 
FROM users 
WHERE wallet_address != :'ROOT_WALLET';

SELECT 'Non-root members to delete' as category, COUNT(*) as count 
FROM members 
WHERE wallet_address != :'ROOT_WALLET';

-- 2. 删除countdown_timers (依赖于members)
SELECT '=== DELETING COUNTDOWN_TIMERS ===' as action;
DELETE FROM countdown_timers 
WHERE wallet_address != :'ROOT_WALLET';
SELECT 'Deleted countdown_timers' as result, ROW_COUNT() as rows_deleted;

-- 3. 删除user_balances (依赖于users/members)
SELECT '=== DELETING USER_BALANCES ===' as action;
DELETE FROM user_balances 
WHERE wallet_address != :'ROOT_WALLET';
SELECT 'Deleted user_balances' as result, ROW_COUNT() as rows_deleted;

-- 4. 删除layer_rewards (依赖于users via wallet addresses)
SELECT '=== DELETING LAYER_REWARDS ===' as action;
-- 保留root作为recipient的奖励，删除其他所有奖励
DELETE FROM layer_rewards 
WHERE recipient_wallet != :'ROOT_WALLET';
SELECT 'Deleted layer_rewards (non-root recipients)' as result, ROW_COUNT() as rows_deleted;

-- 5. 删除individual_matrix_placements 
SELECT '=== DELETING INDIVIDUAL_MATRIX_PLACEMENTS ===' as action;
-- 保留root拥有的matrix，删除其他matrix
DELETE FROM individual_matrix_placements 
WHERE matrix_owner != :'ROOT_WALLET';
SELECT 'Deleted individual_matrix_placements (non-root owners)' as result, ROW_COUNT() as rows_deleted;

-- 6. 删除referrals
SELECT '=== DELETING REFERRALS ===' as action;  
-- 保留root作为matrix_root的推荐关系，删除其他
DELETE FROM referrals 
WHERE matrix_root != :'ROOT_WALLET';
SELECT 'Deleted referrals (non-root matrix_root)' as result, ROW_COUNT() as rows_deleted;

-- 7. 删除非root members
SELECT '=== DELETING MEMBERS ===' as action;
DELETE FROM members 
WHERE wallet_address != :'ROOT_WALLET';
SELECT 'Deleted members' as result, ROW_COUNT() as rows_deleted;

-- 8. 删除非root users
SELECT '=== DELETING USERS ===' as action;
DELETE FROM users 
WHERE wallet_address != :'ROOT_WALLET';
SELECT 'Deleted users' as result, ROW_COUNT() as rows_deleted;

-- 9. 显示清理后的数据统计
SELECT '=== POST-CLEANUP STATISTICS ===' as action;

SELECT 'users remaining' as table_name, COUNT(*) as count FROM users;
SELECT 'members remaining' as table_name, COUNT(*) as count FROM members;
SELECT 'referrals remaining' as table_name, COUNT(*) as count FROM referrals;
SELECT 'individual_matrix_placements remaining' as table_name, COUNT(*) as count FROM individual_matrix_placements;
SELECT 'layer_rewards remaining' as table_name, COUNT(*) as count FROM layer_rewards;
SELECT 'user_balances remaining' as table_name, COUNT(*) as count FROM user_balances;
SELECT 'countdown_timers remaining' as table_name, COUNT(*) as count FROM countdown_timers;

-- 10. 显示保留的root用户信息
SELECT '=== REMAINING ROOT DATA ===' as action;
SELECT username, wallet_address, role FROM users WHERE wallet_address = :'ROOT_WALLET';
SELECT wallet_address, current_level FROM members WHERE wallet_address = :'ROOT_WALLET';

COMMIT;

-- 成功消息
SELECT '✅ CLEANUP COMPLETED SUCCESSFULLY' as status;
SELECT 'All non-root user data has been deleted' as message;
SELECT 'Root user (0x0000000000000000000000000000000000000001) data preserved' as preserved;