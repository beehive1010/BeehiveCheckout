-- 清理数据库，只保留Beehive Root (0x0000000000000000000000000000000000000001) 的完整数据
-- 这个脚本会删除所有其他matrix root的数据，保持数据库干净

BEGIN;

-- Step 1: 分析当前数据状态
DO $$
DECLARE
    beehive_members INTEGER;
    other_roots INTEGER;
    total_users INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 数据清理前分析 ===';
    
    -- 统计Beehive Root的成员数量
    SELECT COUNT(*) INTO beehive_members 
    FROM referrals 
    WHERE matrix_root = '0x0000000000000000000000000000000000000001';
    
    -- 统计其他root的成员数量
    SELECT COUNT(*) INTO other_roots 
    FROM referrals 
    WHERE matrix_root != '0x0000000000000000000000000000000000000001';
    
    -- 统计总用户数
    SELECT COUNT(*) INTO total_users FROM users;
    
    RAISE NOTICE 'Beehive Root 成员数: %', beehive_members;
    RAISE NOTICE '其他Root成员数: %', other_roots;  
    RAISE NOTICE '总用户数: %', total_users;
    RAISE NOTICE '';
END $$;

-- Step 2: 备份Beehive Root的完整数据结构
CREATE TEMP TABLE backup_beehive_referrals AS 
SELECT * FROM referrals 
WHERE matrix_root = '0x0000000000000000000000000000000000000001';

CREATE TEMP TABLE backup_beehive_matrix AS 
SELECT * FROM individual_matrix_placements 
WHERE matrix_owner = '0x0000000000000000000000000000000000000001';

CREATE TEMP TABLE backup_beehive_users AS 
SELECT * FROM users 
WHERE wallet_address = '0x0000000000000000000000000000000000000001'
   OR referrer_wallet = '0x0000000000000000000000000000000000000001'
   OR wallet_address IN (
       SELECT member_wallet FROM referrals 
       WHERE matrix_root = '0x0000000000000000000000000000000000000001'
   );

-- Step 3: 显示将要保留的Beehive Root数据
SELECT '=== 将要保留的Beehive Root完整数据 ===' as section;

SELECT 
    'Beehive Root Matrix Structure' as data_type,
    matrix_layer as layer,
    matrix_position as position,
    member_wallet,
    placed_at
FROM backup_beehive_referrals
ORDER BY matrix_layer, 
         CASE matrix_position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END;

SELECT 
    'Beehive Users to Keep' as data_type,
    wallet_address,
    username,
    referrer_wallet,
    created_at
FROM backup_beehive_users
ORDER BY created_at;

-- Step 4: 清理其他所有matrix数据 (注释掉以确保安全)
/*
-- 清理referrals表中的非Beehive Root数据
DELETE FROM referrals 
WHERE matrix_root != '0x0000000000000000000000000000000000000001';

-- 清理individual_matrix_placements表中的非Beehive Root数据  
DELETE FROM individual_matrix_placements 
WHERE matrix_owner != '0x0000000000000000000000000000000000000001';

-- 清理layer_rewards中不相关的奖励记录
DELETE FROM layer_rewards 
WHERE payer_wallet NOT IN (
    SELECT member_wallet FROM referrals 
    WHERE matrix_root = '0x0000000000000000000000000000000000000001'
    UNION 
    SELECT '0x0000000000000000000000000000000000000001'
);

-- 清理members表中不相关的成员 (保留Beehive相关用户)
DELETE FROM members 
WHERE wallet_address NOT IN (
    SELECT wallet_address FROM backup_beehive_users
);

-- 可选：清理users表中不相关的用户 (谨慎执行)
-- DELETE FROM users 
-- WHERE wallet_address NOT IN (
--     SELECT wallet_address FROM backup_beehive_users  
-- );
*/

-- Step 5: 验证清理后的数据完整性
DO $$
DECLARE
    remaining_referrals INTEGER;
    remaining_matrix INTEGER; 
    remaining_users INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 数据清理后验证 (预览) ===';
    
    -- 如果执行了清理，这些统计会显示清理后的状态
    SELECT COUNT(*) INTO remaining_referrals FROM backup_beehive_referrals;
    SELECT COUNT(*) INTO remaining_matrix FROM backup_beehive_matrix;
    SELECT COUNT(*) INTO remaining_users FROM backup_beehive_users;
    
    RAISE NOTICE '保留的referrals记录数: %', remaining_referrals;
    RAISE NOTICE '保留的matrix_placements记录数: %', remaining_matrix;
    RAISE NOTICE '保留的users记录数: %', remaining_users;
    
    IF remaining_referrals > 0 AND remaining_matrix > 0 THEN
        RAISE NOTICE '✅ Beehive Root数据完整性验证通过';
    ELSE
        RAISE NOTICE '❌ 数据完整性验证失败';
    END IF;
END $$;

-- Step 6: 显示清理脚本的使用说明
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 数据清理脚本说明:';
    RAISE NOTICE '1. 当前脚本处于安全模式，所有清理操作被注释';
    RAISE NOTICE '2. 已创建完整的备份表验证数据完整性';
    RAISE NOTICE '3. 要执行实际清理，请取消注释Step 4中的DELETE语句';
    RAISE NOTICE '4. 建议先在测试环境运行，确认无误后再在生产环境执行';
    RAISE NOTICE '5. 清理后将只保留Beehive Root的完整matrix结构';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  执行前请确保:';  
    RAISE NOTICE '   - 已备份数据库';
    RAISE NOTICE '   - 在测试环境验证过脚本';
    RAISE NOTICE '   - 确认Beehive Root数据完整无误';
END $$;

COMMIT;