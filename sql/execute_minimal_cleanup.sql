-- 立即执行激进清理：只保留Beehive Root，删除所有其他数据
-- 警告：此操作不可逆！

BEGIN;

-- 执行前最后确认
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ⚠️ ⚠️  即将执行数据清理 ⚠️ ⚠️ ⚠️';
    RAISE NOTICE '将删除除Beehive Root外的所有数据！';
    RAISE NOTICE '';
END $$;

-- 立即执行清理
DO $$
DECLARE
    deleted_referrals INTEGER;
    deleted_matrix INTEGER;
    deleted_users INTEGER;
    deleted_members INTEGER;
    deleted_rewards INTEGER;
BEGIN
    RAISE NOTICE '🧹 开始执行激进数据清理...';
    RAISE NOTICE '';
    
    -- 1. 清空referrals表
    DELETE FROM referrals;
    GET DIAGNOSTICS deleted_referrals = ROW_COUNT;
    RAISE NOTICE '✅ 删除referrals记录: % 条', deleted_referrals;
    
    -- 2. 清空individual_matrix_placements表
    DELETE FROM individual_matrix_placements;
    GET DIAGNOSTICS deleted_matrix = ROW_COUNT;
    RAISE NOTICE '✅ 删除matrix_placements记录: % 条', deleted_matrix;
    
    -- 3. 清空layer_rewards表
    DELETE FROM layer_rewards;
    GET DIAGNOSTICS deleted_rewards = ROW_COUNT;
    RAISE NOTICE '✅ 删除layer_rewards记录: % 条', deleted_rewards;
    
    -- 4. 清空members表
    DELETE FROM members;
    GET DIAGNOSTICS deleted_members = ROW_COUNT;
    RAISE NOTICE '✅ 删除members记录: % 条', deleted_members;
    
    -- 5. 删除所有非root用户
    DELETE FROM users 
    WHERE wallet_address != '0x0000000000000000000000000000000000000001';
    GET DIAGNOSTICS deleted_users = ROW_COUNT;
    RAISE NOTICE '✅ 删除非root用户: % 个', deleted_users;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 数据清理完成！';
END $$;

-- 验证清理结果
DO $$
DECLARE
    remaining_referrals INTEGER;
    remaining_matrix INTEGER;
    remaining_users INTEGER;
    remaining_members INTEGER;
    remaining_rewards INTEGER;
    root_user_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 清理结果验证 ===';
    
    SELECT COUNT(*) INTO remaining_referrals FROM referrals;
    SELECT COUNT(*) INTO remaining_matrix FROM individual_matrix_placements;
    SELECT COUNT(*) INTO remaining_users FROM users;
    SELECT COUNT(*) INTO remaining_members FROM members;
    SELECT COUNT(*) INTO remaining_rewards FROM layer_rewards;
    
    -- 检查Beehive Root是否还存在
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE wallet_address = '0x0000000000000000000000000000000000000001'
    ) INTO root_user_exists;
    
    RAISE NOTICE 'referrals表剩余: % 条', remaining_referrals;
    RAISE NOTICE 'matrix_placements表剩余: % 条', remaining_matrix;
    RAISE NOTICE 'users表剩余: % 个', remaining_users;
    RAISE NOTICE 'members表剩余: % 个', remaining_members;
    RAISE NOTICE 'layer_rewards表剩余: % 条', remaining_rewards;
    RAISE NOTICE 'Beehive Root存在: %', CASE WHEN root_user_exists THEN 'YES ✅' ELSE 'NO ❌' END;
    
    IF remaining_referrals = 0 AND remaining_matrix = 0 AND remaining_members = 0 
       AND remaining_rewards = 0 AND remaining_users = 1 AND root_user_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎯 清理成功！数据库已恢复到最小状态';
        RAISE NOTICE '只保留Beehive Root用户，所有matrix数据已清空';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '❌ 清理可能不完整，请检查数据状态';
    END IF;
END $$;

-- 显示最终保留的数据
SELECT '=== 最终保留的数据 ===' as final_data;

SELECT 
    wallet_address,
    username,
    referrer_wallet,
    created_at
FROM users
ORDER BY created_at;

COMMIT;

-- 最终总结
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 清理总结:';
    RAISE NOTICE '✅ 数据库已重置为初始状态';
    RAISE NOTICE '✅ 只保留Beehive Root用户';
    RAISE NOTICE '✅ 所有matrix、referral、member数据已清空';
    RAISE NOTICE '✅ 可以重新开始构建matrix网络';
    RAISE NOTICE '';
END $$;