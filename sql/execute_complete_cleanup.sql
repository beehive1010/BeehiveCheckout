-- 完整数据清理：处理外键约束并只保留Beehive Root用户
-- 此脚本将按正确顺序删除数据，避免外键约束冲突

BEGIN;

-- 执行前最后确认
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ⚠️ ⚠️  即将执行完整数据清理 ⚠️ ⚠️ ⚠️';
    RAISE NOTICE '将删除除Beehive Root外的所有数据！';
    RAISE NOTICE '';
END $$;

-- 执行完整清理，按正确顺序避免外键约束冲突
DO $$
DECLARE
    deleted_activity INTEGER := 0;
    deleted_rewards INTEGER := 0;
    deleted_referrals INTEGER := 0;
    deleted_matrix INTEGER := 0;
    deleted_members INTEGER := 0;
    deleted_users INTEGER := 0;
    table_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🧹 开始执行完整数据清理...';
    RAISE NOTICE '';
    
    -- 1. 首先清理可能存在的matrix_activity_log表（避免外键约束）
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'matrix_activity_log'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM matrix_activity_log;
        GET DIAGNOSTICS deleted_activity = ROW_COUNT;
        RAISE NOTICE '✅ 删除matrix_activity_log记录: % 条', deleted_activity;
    ELSE
        RAISE NOTICE '✅ matrix_activity_log表不存在，跳过';
    END IF;
    
    -- 2. 清空layer_rewards表
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'layer_rewards'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM layer_rewards;
        GET DIAGNOSTICS deleted_rewards = ROW_COUNT;
        RAISE NOTICE '✅ 删除layer_rewards记录: % 条', deleted_rewards;
    END IF;
    
    -- 3. 清空referrals表
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'referrals'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM referrals;
        GET DIAGNOSTICS deleted_referrals = ROW_COUNT;
        RAISE NOTICE '✅ 删除referrals记录: % 条', deleted_referrals;
    END IF;
    
    -- 4. 清空individual_matrix_placements表
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'individual_matrix_placements'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM individual_matrix_placements;
        GET DIAGNOSTICS deleted_matrix = ROW_COUNT;
        RAISE NOTICE '✅ 删除matrix_placements记录: % 条', deleted_matrix;
    END IF;
    
    -- 5. 清空members表
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'members'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM members;
        GET DIAGNOSTICS deleted_members = ROW_COUNT;
        RAISE NOTICE '✅ 删除members记录: % 条', deleted_members;
    END IF;
    
    -- 6. 删除所有非root用户
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
    ) INTO table_exists;
    
    IF table_exists THEN
        DELETE FROM users 
        WHERE wallet_address != '0x0000000000000000000000000000000000000001';
        GET DIAGNOSTICS deleted_users = ROW_COUNT;
        RAISE NOTICE '✅ 删除非root用户: % 个', deleted_users;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 数据清理完成！';
END $$;

-- 验证清理结果
DO $$
DECLARE
    remaining_users INTEGER := 0;
    remaining_members INTEGER := 0;
    remaining_referrals INTEGER := 0;
    remaining_matrix INTEGER := 0;
    remaining_rewards INTEGER := 0;
    remaining_activity INTEGER := 0;
    root_user_exists BOOLEAN := false;
    table_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 清理结果验证 ===';
    
    -- 检查各表剩余数据
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO remaining_users FROM users;
        SELECT EXISTS(
            SELECT 1 FROM users 
            WHERE wallet_address = '0x0000000000000000000000000000000000000001'
        ) INTO root_user_exists;
    END IF;
    
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'members') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO remaining_members FROM members;
    END IF;
    
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'referrals') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO remaining_referrals FROM referrals;
    END IF;
    
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'individual_matrix_placements') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO remaining_matrix FROM individual_matrix_placements;
    END IF;
    
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'layer_rewards') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO remaining_rewards FROM layer_rewards;
    END IF;
    
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'matrix_activity_log') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO remaining_activity FROM matrix_activity_log;
    END IF;
    
    RAISE NOTICE 'users表剩余: % 个', remaining_users;
    RAISE NOTICE 'members表剩余: % 个', remaining_members;
    RAISE NOTICE 'referrals表剩余: % 条', remaining_referrals;
    RAISE NOTICE 'matrix_placements表剩余: % 条', remaining_matrix;
    RAISE NOTICE 'layer_rewards表剩余: % 条', remaining_rewards;
    RAISE NOTICE 'matrix_activity_log表剩余: % 条', remaining_activity;
    RAISE NOTICE 'Beehive Root存在: %', CASE WHEN root_user_exists THEN 'YES ✅' ELSE 'NO ❌' END;
    
    IF remaining_referrals = 0 AND remaining_matrix = 0 AND remaining_members = 0 
       AND remaining_rewards = 0 AND remaining_activity = 0 THEN
        IF remaining_users <= 1 AND (remaining_users = 0 OR root_user_exists) THEN
            RAISE NOTICE '';
            RAISE NOTICE '🎯 清理成功！数据库已恢复到最小状态';
            IF remaining_users = 1 THEN
                RAISE NOTICE '只保留Beehive Root用户，所有matrix数据已清空';
            ELSE
                RAISE NOTICE '所有数据已清空，包括root用户';
            END IF;
        ELSE
            RAISE NOTICE '';
            RAISE NOTICE '❌ 用户数据清理不完整';
        END IF;
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '❌ 清理可能不完整，请检查数据状态';
    END IF;
END $$;

-- 显示最终保留的数据（如果有）
DO $$
DECLARE
    table_exists BOOLEAN;
    user_count INTEGER;
BEGIN
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO user_count FROM users;
        IF user_count > 0 THEN
            RAISE NOTICE '';
            RAISE NOTICE '=== 最终保留的用户数据 ===';
        END IF;
    END IF;
END $$;

SELECT 
    wallet_address,
    username,
    referrer_wallet,
    created_at
FROM users
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')
ORDER BY created_at;

COMMIT;

-- 最终总结
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 清理总结:';
    RAISE NOTICE '✅ 数据库已重置';
    RAISE NOTICE '✅ 所有外键约束冲突已避免';
    RAISE NOTICE '✅ 按正确顺序清理了所有相关表';
    RAISE NOTICE '✅ 可以重新开始构建matrix网络';
    RAISE NOTICE '';
END $$;