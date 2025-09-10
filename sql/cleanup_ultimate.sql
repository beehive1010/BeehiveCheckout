-- 终极清理脚本 - 彻底处理所有外键依赖

BEGIN;

-- 显示清理前数据
SELECT '=== BEFORE CLEANUP ===' as status;
SELECT 'users' as table_name, count(*) as count FROM users
UNION ALL SELECT 'members', count(*) FROM members
UNION ALL SELECT 'referrals', count(*) FROM referrals
UNION ALL SELECT 'individual_matrix_placements', count(*) FROM individual_matrix_placements
UNION ALL SELECT 'layer_rewards', count(*) FROM layer_rewards
UNION ALL SELECT 'user_balances', count(*) FROM user_balances  
UNION ALL SELECT 'countdown_timers', count(*) FROM countdown_timers
UNION ALL SELECT 'reward_claims', count(*) FROM reward_claims;

-- 正确的删除顺序：从最依赖的表开始

-- 1. countdown_timers (依赖 members)
DELETE FROM countdown_timers 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 2. reward_claims (依赖 members)
DELETE FROM reward_claims 
WHERE triggering_member_wallet != '0x0000000000000000000000000000000000000001';

-- 3. user_balances (依赖 users)
DELETE FROM user_balances 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 4. layer_rewards (依赖 members via payer_wallet and recipient_wallet)
DELETE FROM layer_rewards 
WHERE recipient_wallet != '0x0000000000000000000000000000000000000001'
   OR payer_wallet != '0x0000000000000000000000000000000000000001';

-- 5. individual_matrix_placements (依赖 users via member_wallet)
-- 删除所有涉及非root用户的记录
DELETE FROM individual_matrix_placements 
WHERE matrix_owner != '0x0000000000000000000000000000000000000001'
   OR member_wallet != '0x0000000000000000000000000000000000000001';

-- 6. referrals (依赖 members via member_wallet) 
DELETE FROM referrals 
WHERE member_wallet != '0x0000000000000000000000000000000000000001';

-- 7. members (依赖 users)
DELETE FROM members 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 8. users (基础表)
DELETE FROM users 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';

-- 显示清理后数据
SELECT '=== AFTER CLEANUP ===' as status;
SELECT 'users' as table_name, count(*) as count FROM users
UNION ALL SELECT 'members', count(*) FROM members
UNION ALL SELECT 'referrals', count(*) FROM referrals  
UNION ALL SELECT 'individual_matrix_placements', count(*) FROM individual_matrix_placements
UNION ALL SELECT 'layer_rewards', count(*) FROM layer_rewards
UNION ALL SELECT 'user_balances', count(*) FROM user_balances
UNION ALL SELECT 'countdown_timers', count(*) FROM countdown_timers
UNION ALL SELECT 'reward_claims', count(*) FROM reward_claims;

-- 显示保留的root用户
SELECT '=== FINAL ROOT USER ===' as status;  
SELECT username, wallet_address, role FROM users WHERE wallet_address = '0x0000000000000000000000000000000000000001';

COMMIT;

SELECT '🚀 DATABASE COMPLETELY RESET' as result;
SELECT 'System ready for fresh data - only root user preserved' as message;