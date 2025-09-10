-- 激进数据清理：只保留Beehive Root用户本身，清空所有matrix成员数据
-- 恢复到最初的干净状态，只有root用户存在

BEGIN;

-- Step 1: 显示当前数据状态
DO $$
DECLARE
    total_referrals INTEGER;
    total_matrix INTEGER;
    total_users INTEGER;
    total_members INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 清理前数据统计 ===';
    
    SELECT COUNT(*) INTO total_referrals FROM referrals;
    SELECT COUNT(*) INTO total_matrix FROM individual_matrix_placements;
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO total_members FROM members;
    
    RAISE NOTICE 'referrals总记录: %', total_referrals;
    RAISE NOTICE 'matrix_placements总记录: %', total_matrix;
    RAISE NOTICE 'users总记录: %', total_users;
    RAISE NOTICE 'members总记录: %', total_members;
    RAISE NOTICE '';
END $$;

-- Step 2: 显示将要删除的数据
SELECT '=== 将要删除的数据预览 ===' as section;

SELECT 'Non-Root Referrals' as data_type, COUNT(*) as count
FROM referrals 
WHERE matrix_root != '0x0000000000000000000000000000000000000001'
   OR member_wallet != '0x0000000000000000000000000000000000000001'
UNION ALL
SELECT 'All Matrix Placements' as data_type, COUNT(*) as count
FROM individual_matrix_placements
UNION ALL  
SELECT 'Non-Root Users' as data_type, COUNT(*) as count
FROM users
WHERE wallet_address != '0x0000000000000000000000000000000000000001'
UNION ALL
SELECT 'All Members' as data_type, COUNT(*) as count
FROM members;

-- Step 3: 保留的原始数据 (只有Beehive Root用户)
SELECT '=== 将要保留的数据 ===' as section;

SELECT 
    'Root User' as data_type,
    wallet_address,
    username,
    referrer_wallet,
    created_at
FROM users 
WHERE wallet_address = '0x0000000000000000000000000000000000000001';

-- Step 4: 激进清理所有非root数据 (注释掉确保安全)
/*
-- 清空所有referrals数据 (包括root的matrix成员)
DELETE FROM referrals;

-- 清空所有individual_matrix_placements数据
DELETE FROM individual_matrix_placements;

-- 清空所有layer_rewards数据  
DELETE FROM layer_rewards;

-- 清空所有members数据
DELETE FROM members;

-- 删除所有非root用户
DELETE FROM users 
WHERE wallet_address != '0x0000000000000000000000000000000000000001';
*/

-- Step 5: 验证清理后状态 (预览)
DO $$
DECLARE
    remaining_users INTEGER;
    remaining_referrals INTEGER;
    remaining_matrix INTEGER;
    remaining_members INTEGER;
    remaining_rewards INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 清理后预期状态 ===';
    
    -- 模拟清理后的状态
    SELECT COUNT(*) INTO remaining_users 
    FROM users 
    WHERE wallet_address = '0x0000000000000000000000000000000000000001';
    
    remaining_referrals := 0;  -- 全部删除
    remaining_matrix := 0;     -- 全部删除  
    remaining_members := 0;    -- 全部删除
    remaining_rewards := 0;    -- 全部删除
    
    RAISE NOTICE 'users表剩余记录: % (只有Beehive Root)', remaining_users;
    RAISE NOTICE 'referrals表剩余记录: %', remaining_referrals;
    RAISE NOTICE 'matrix_placements表剩余记录: %', remaining_matrix;
    RAISE NOTICE 'members表剩余记录: %', remaining_members;
    RAISE NOTICE 'layer_rewards表剩余记录: %', remaining_rewards;
    
    IF remaining_users = 1 THEN
        RAISE NOTICE '✅ 清理后将保持最小状态：只有Beehive Root用户';
    ELSE
        RAISE NOTICE '❌ Root用户验证失败';
    END IF;
END $$;

-- Step 6: 使用说明
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 激进数据清理脚本说明:';
    RAISE NOTICE '1. 此脚本将删除除Beehive Root用户外的所有数据';
    RAISE NOTICE '2. 清理后数据库恢复到初始状态：只有root用户存在';
    RAISE NOTICE '3. 所有matrix、referrals、members数据将被清空';
    RAISE NOTICE '4. 当前处于安全模式，DELETE语句已注释';
    RAISE NOTICE '';
    RAISE NOTICE '📋 执行步骤:';
    RAISE NOTICE '1. 确认已备份重要数据';
    RAISE NOTICE '2. 取消注释Step 4中的DELETE语句';
    RAISE NOTICE '3. 重新运行脚本执行清理';
    RAISE NOTICE '4. 验证清理结果';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  注意: 此操作不可逆！请谨慎执行！';
END $$;

-- Step 7: 快速执行选项 (取消注释下面的代码可直接执行清理)
/*
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚡ 执行激进清理...';
    
    -- 直接执行清理
    DELETE FROM referrals;
    DELETE FROM individual_matrix_placements;  
    DELETE FROM layer_rewards;
    DELETE FROM members;
    DELETE FROM users WHERE wallet_address != '0x0000000000000000000000000000000000000001';
    
    RAISE NOTICE '✅ 清理完成！';
    RAISE NOTICE '数据库已恢复到最小状态：只保留Beehive Root用户';
END $$;
*/

COMMIT;