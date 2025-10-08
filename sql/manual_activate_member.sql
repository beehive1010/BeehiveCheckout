-- =====================================================
-- 手动激活会员脚本 (链上已 claim,数据库未同步)
-- =====================================================
-- 用途: 为已在链上 claim NFT 但数据库未同步的用户手动创建记录
-- 地址: 0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37
-- =====================================================

-- Step 1: 验证用户状态
DO $$
DECLARE
    v_wallet TEXT := '0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37';
    v_user_exists BOOLEAN;
    v_member_exists BOOLEAN;
    v_membership_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(wallet_address) = LOWER(v_wallet))
    INTO v_user_exists;

    -- Check if member exists
    SELECT EXISTS(SELECT 1 FROM members WHERE LOWER(wallet_address) = LOWER(v_wallet))
    INTO v_member_exists;

    -- Check if membership exists
    SELECT EXISTS(SELECT 1 FROM membership WHERE LOWER(wallet_address) = LOWER(v_wallet))
    INTO v_membership_exists;

    RAISE NOTICE '';
    RAISE NOTICE '=== 用户状态检查 ===';
    RAISE NOTICE '地址: %', v_wallet;
    RAISE NOTICE 'Users 表: %', CASE WHEN v_user_exists THEN '✅ 存在' ELSE '❌ 不存在' END;
    RAISE NOTICE 'Members 表: %', CASE WHEN v_member_exists THEN '✅ 存在' ELSE '❌ 不存在' END;
    RAISE NOTICE 'Membership 表: %', CASE WHEN v_membership_exists THEN '✅ 存在' ELSE '❌ 不存在' END;
    RAISE NOTICE '';
END $$;

-- Step 2: 获取用户信息
SELECT
    '=== 用户详细信息 ===' as section;

SELECT
    wallet_address,
    username,
    referrer_wallet,
    created_at as registered_at
FROM users
WHERE LOWER(wallet_address) = LOWER('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37');

-- Step 3: 手动创建 members 记录 (这将触发所有相关触发器)
-- ⚠️ 注意: 这个 INSERT 将自动触发:
-- 1. sync_member_to_membership_trigger - 创建 membership
-- 2. trigger_recursive_matrix_placement - 矩阵放置
-- 3. trigger_auto_create_balance_with_initial - 创建余额
-- 4. trigger_member_initial_level1_rewards - 创建奖励
-- 等多个触发器

DO $$
DECLARE
    v_wallet TEXT := '0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37';
    v_referrer TEXT;
    v_next_seq INTEGER;
    v_member_exists BOOLEAN;
BEGIN
    -- Check if member already exists
    SELECT EXISTS(SELECT 1 FROM members WHERE LOWER(wallet_address) = LOWER(v_wallet))
    INTO v_member_exists;

    IF v_member_exists THEN
        RAISE NOTICE '⚠️ Member record already exists for %', v_wallet;
        RETURN;
    END IF;

    -- Get referrer from users table
    SELECT referrer_wallet INTO v_referrer
    FROM users
    WHERE LOWER(wallet_address) = LOWER(v_wallet);

    IF v_referrer IS NULL THEN
        RAISE EXCEPTION 'No referrer found for user %', v_wallet;
    END IF;

    -- Get next activation sequence
    SELECT COALESCE(MAX(activation_sequence), 0) + 1 INTO v_next_seq
    FROM members;

    RAISE NOTICE '';
    RAISE NOTICE '=== 创建 Members 记录 ===';
    RAISE NOTICE '地址: %', v_wallet;
    RAISE NOTICE '推荐人: %', v_referrer;
    RAISE NOTICE '激活序列: %', v_next_seq;
    RAISE NOTICE '等级: Level 1';
    RAISE NOTICE '';

    -- Insert member record
    -- This will trigger ALL database triggers automatically
    INSERT INTO members (
        wallet_address,
        referrer_wallet,
        current_level,
        activation_sequence,
        activation_time,
        total_nft_claimed
    ) VALUES (
        v_wallet,
        v_referrer,
        1, -- Level 1
        v_next_seq,
        NOW(),
        1
    );

    RAISE NOTICE '✅ Members 记录创建成功';
    RAISE NOTICE '✅ 触发器将自动创建:';
    RAISE NOTICE '   - Membership 记录';
    RAISE NOTICE '   - Matrix 放置';
    RAISE NOTICE '   - User Balance';
    RAISE NOTICE '   - Layer Rewards';
    RAISE NOTICE '';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ 创建失败: %', SQLERRM;
        RAISE EXCEPTION '%', SQLERRM;
END $$;

-- Step 4: 等待触发器执行完成 (3秒)
SELECT pg_sleep(3);

-- Step 5: 验证创建结果
SELECT
    '=== 验证创建结果 ===' as section;

-- Check members table
SELECT
    'Members Table' as table_name,
    wallet_address,
    current_level,
    activation_sequence,
    activation_time,
    referrer_wallet
FROM members
WHERE LOWER(wallet_address) = LOWER('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37');

-- Check membership table
SELECT
    'Membership Table' as table_name,
    wallet_address,
    nft_level,
    claimed_at,
    unlock_membership_level,
    total_cost
FROM membership
WHERE LOWER(wallet_address) = LOWER('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37');

-- Check user_balances table
SELECT
    'User Balances' as table_name,
    wallet_address,
    usdc_claimable,
    usdc_pending,
    usdc_claimed_total,
    bcc_transferable,
    bcc_locked
FROM user_balances
WHERE LOWER(wallet_address) = LOWER('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37');

-- Check layer_rewards (as recipient)
SELECT
    'Layer Rewards (Recipient)' as table_name,
    COUNT(*) as reward_count,
    SUM(reward_amount) FILTER (WHERE status = 'claimable') as claimable_usdc,
    SUM(reward_amount) FILTER (WHERE status = 'pending') as pending_usdc,
    SUM(reward_amount) FILTER (WHERE status = 'claimed') as claimed_usdc
FROM layer_rewards
WHERE LOWER(reward_recipient_wallet) = LOWER('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37');

-- Check layer_rewards (as trigger - rewards created for upline)
SELECT
    'Layer Rewards (Triggered by user)' as table_name,
    COUNT(*) as reward_count,
    SUM(reward_amount) as total_usdc
FROM layer_rewards
WHERE LOWER(triggering_member_wallet) = LOWER('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37');

-- Check referrals/matrix placement
SELECT
    'Matrix Placements' as table_name,
    COUNT(*) as placement_count,
    STRING_AGG(DISTINCT 'Layer ' || matrix_layer::text, ', ' ORDER BY 'Layer ' || matrix_layer::text) as layers
FROM referrals
WHERE LOWER(member_wallet) = LOWER('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37');

-- Step 6: 测试激活状态函数
SELECT
    '=== 激活状态 (使用优化函数) ===' as section;

SELECT * FROM get_member_activation_status('0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37');

-- Final summary
DO $$
DECLARE
    v_wallet TEXT := '0xE38d25F180D17EbA3e5ebB65e8D310B5E9702a37';
    v_member_exists BOOLEAN;
    v_membership_exists BOOLEAN;
    v_balance_exists BOOLEAN;
    v_reward_count INTEGER;
    v_matrix_count INTEGER;
BEGIN
    SELECT EXISTS(SELECT 1 FROM members WHERE LOWER(wallet_address) = LOWER(v_wallet))
    INTO v_member_exists;

    SELECT EXISTS(SELECT 1 FROM membership WHERE LOWER(wallet_address) = LOWER(v_wallet))
    INTO v_membership_exists;

    SELECT EXISTS(SELECT 1 FROM user_balances WHERE LOWER(wallet_address) = LOWER(v_wallet))
    INTO v_balance_exists;

    SELECT COUNT(*) INTO v_reward_count
    FROM layer_rewards
    WHERE LOWER(triggering_member_wallet) = LOWER(v_wallet);

    SELECT COUNT(*) INTO v_matrix_count
    FROM referrals
    WHERE LOWER(member_wallet) = LOWER(v_wallet);

    RAISE NOTICE '';
    RAISE NOTICE '=== 手动激活完成总结 ===';
    RAISE NOTICE '地址: %', v_wallet;
    RAISE NOTICE '';
    RAISE NOTICE '数据同步状态:';
    RAISE NOTICE '  ✅ Members: %', CASE WHEN v_member_exists THEN '已创建' ELSE '❌ 失败' END;
    RAISE NOTICE '  ✅ Membership: %', CASE WHEN v_membership_exists THEN '已创建' ELSE '❌ 失败' END;
    RAISE NOTICE '  ✅ User Balance: %', CASE WHEN v_balance_exists THEN '已创建' ELSE '❌ 失败' END;
    RAISE NOTICE '  ✅ Upline Rewards: % 条奖励已创建', v_reward_count;
    RAISE NOTICE '  ✅ Matrix Placement: % 个矩阵位置已分配', v_matrix_count;
    RAISE NOTICE '';

    IF v_member_exists AND v_membership_exists AND v_balance_exists THEN
        RAISE NOTICE '🎉 激活成功! 用户现在可以正常使用系统。';
    ELSE
        RAISE NOTICE '⚠️ 部分同步失败,请检查日志。';
    END IF;
    RAISE NOTICE '';
END $$;
