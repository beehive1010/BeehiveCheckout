-- 检查并补充钱包地址 0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF 的所有记录
-- 这个脚本会检查所有必需的表并补充缺失的记录

-- 设置变量
DO $$
DECLARE
    v_wallet_address TEXT := '0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF';
    v_referrer_wallet TEXT := '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
    v_level INT := 1;
    v_activation_seq INT;
    v_user_exists BOOLEAN;
    v_member_exists BOOLEAN;
    v_membership_exists BOOLEAN;
    v_referral_exists BOOLEAN;
    v_balance_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🔍 开始检查钱包地址: %', v_wallet_address;
    RAISE NOTICE '🔗 推荐人地址: %', v_referrer_wallet;

    -- ========================================
    -- 1. 检查 users 表
    -- ========================================
    SELECT EXISTS(
        SELECT 1 FROM users WHERE wallet_address ILIKE v_wallet_address
    ) INTO v_user_exists;

    IF v_user_exists THEN
        RAISE NOTICE '✅ users 表记录已存在';
    ELSE
        RAISE NOTICE '❌ users 表记录缺失，准备创建...';
        INSERT INTO users (wallet_address, username, referrer_wallet, created_at)
        VALUES (v_wallet_address, 'Test1LA', v_referrer_wallet, NOW())
        ON CONFLICT (wallet_address) DO NOTHING;
        RAISE NOTICE '✅ users 表记录已创建';
    END IF;

    -- ========================================
    -- 2. 检查 membership 表
    -- ========================================
    SELECT EXISTS(
        SELECT 1 FROM membership
        WHERE wallet_address ILIKE v_wallet_address
        AND nft_level = v_level
    ) INTO v_membership_exists;

    IF v_membership_exists THEN
        RAISE NOTICE '✅ membership 表记录已存在 (Level %))', v_level;
    ELSE
        RAISE NOTICE '❌ membership 表记录缺失，准备创建...';
        INSERT INTO membership (wallet_address, nft_level, is_member, claimed_at)
        VALUES (v_wallet_address, v_level, true, NOW())
        ON CONFLICT DO NOTHING;
        RAISE NOTICE '✅ membership 表记录已创建';
    END IF;

    -- ========================================
    -- 3. 检查 members 表
    -- ========================================
    SELECT EXISTS(
        SELECT 1 FROM members WHERE wallet_address ILIKE v_wallet_address
    ) INTO v_member_exists;

    IF v_member_exists THEN
        RAISE NOTICE '✅ members 表记录已存在';

        -- 更新激活状态
        UPDATE members
        SET
            current_level = GREATEST(current_level, v_level),
            activation_time = COALESCE(activation_time, NOW()),
            referrer_wallet = COALESCE(referrer_wallet, v_referrer_wallet),
            total_nft_claimed = GREATEST(total_nft_claimed, 1)
        WHERE wallet_address ILIKE v_wallet_address;

        RAISE NOTICE '✅ members 表记录已更新';
    ELSE
        RAISE NOTICE '❌ members 表记录缺失，准备创建...';

        -- 获取下一个激活序列号
        SELECT COALESCE(MAX(activation_sequence), 0) + 1
        INTO v_activation_seq
        FROM members;

        INSERT INTO members (
            wallet_address,
            referrer_wallet,
            current_level,
            activation_sequence,
            activation_time,
            total_nft_claimed
        )
        VALUES (
            v_wallet_address,
            v_referrer_wallet,
            v_level,
            v_activation_seq,
            NOW(),
            1
        )
        ON CONFLICT (wallet_address) DO UPDATE
        SET
            current_level = GREATEST(members.current_level, v_level),
            activation_time = COALESCE(members.activation_time, NOW()),
            referrer_wallet = COALESCE(members.referrer_wallet, v_referrer_wallet);

        RAISE NOTICE '✅ members 表记录已创建 (activation_sequence: %)', v_activation_seq;
    END IF;

    -- ========================================
    -- 4. 检查 referrals 表
    -- ========================================
    SELECT EXISTS(
        SELECT 1 FROM referrals
        WHERE referee_wallet ILIKE v_wallet_address
        AND referrer_wallet ILIKE v_referrer_wallet
    ) INTO v_referral_exists;

    IF v_referral_exists THEN
        RAISE NOTICE '✅ referrals 表记录已存在';
    ELSE
        RAISE NOTICE '❌ referrals 表记录缺失，准备创建...';
        INSERT INTO referrals (referrer_wallet, referee_wallet, created_at, is_active)
        VALUES (v_referrer_wallet, v_wallet_address, NOW(), true)
        ON CONFLICT DO NOTHING;
        RAISE NOTICE '✅ referrals 表记录已创建';
    END IF;

    -- ========================================
    -- 5. 检查 user_balances 表
    -- ========================================
    SELECT EXISTS(
        SELECT 1 FROM user_balances WHERE wallet_address ILIKE v_wallet_address
    ) INTO v_balance_exists;

    IF v_balance_exists THEN
        RAISE NOTICE '✅ user_balances 表记录已存在';
    ELSE
        RAISE NOTICE '❌ user_balances 表记录缺失，准备创建...';
        INSERT INTO user_balances (
            wallet_address,
            transferable_bcc,
            locked_bcc,
            direct_reward_usdc,
            layer_reward_usdc,
            last_updated
        )
        VALUES (
            v_wallet_address,
            0,
            0,
            0,
            0,
            NOW()
        )
        ON CONFLICT (wallet_address) DO NOTHING;
        RAISE NOTICE '✅ user_balances 表记录已创建';
    END IF;

    -- ========================================
    -- 6. 调用矩阵放置函数
    -- ========================================
    RAISE NOTICE '🎯 准备执行矩阵放置...';
    BEGIN
        PERFORM recursive_matrix_placement(v_wallet_address, v_referrer_wallet);
        RAISE NOTICE '✅ 矩阵放置完成';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ 矩阵放置可能已存在或出错: %', SQLERRM;
    END;

    -- ========================================
    -- 7. 显示最终状态
    -- ========================================
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 最终记录状态检查:';
    RAISE NOTICE '========================================';

    -- users 表
    RAISE NOTICE 'users 表:';
    PERFORM * FROM users WHERE wallet_address ILIKE v_wallet_address;
    IF FOUND THEN
        RAISE NOTICE '  ✅ 存在';
    ELSE
        RAISE NOTICE '  ❌ 不存在';
    END IF;

    -- membership 表
    RAISE NOTICE 'membership 表 (Level %):' , v_level;
    PERFORM * FROM membership WHERE wallet_address ILIKE v_wallet_address AND nft_level = v_level;
    IF FOUND THEN
        RAISE NOTICE '  ✅ 存在';
    ELSE
        RAISE NOTICE '  ❌ 不存在';
    END IF;

    -- members 表
    RAISE NOTICE 'members 表:';
    PERFORM * FROM members WHERE wallet_address ILIKE v_wallet_address;
    IF FOUND THEN
        RAISE NOTICE '  ✅ 存在';
    ELSE
        RAISE NOTICE '  ❌ 不存在';
    END IF;

    -- referrals 表
    RAISE NOTICE 'referrals 表:';
    PERFORM * FROM referrals WHERE referee_wallet ILIKE v_wallet_address;
    IF FOUND THEN
        RAISE NOTICE '  ✅ 存在';
    ELSE
        RAISE NOTICE '  ❌ 不存在';
    END IF;

    -- user_balances 表
    RAISE NOTICE 'user_balances 表:';
    PERFORM * FROM user_balances WHERE wallet_address ILIKE v_wallet_address;
    IF FOUND THEN
        RAISE NOTICE '  ✅ 存在';
    ELSE
        RAISE NOTICE '  ❌ 不存在';
    END IF;

    -- matrix_referrals 表
    RAISE NOTICE 'matrix_referrals 表:';
    PERFORM * FROM matrix_referrals WHERE member_wallet ILIKE v_wallet_address;
    IF FOUND THEN
        RAISE NOTICE '  ✅ 存在';
    ELSE
        RAISE NOTICE '  ❌ 不存在';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ 所有记录检查和补充完成！';

END $$;

-- 查询最终结果，用于验证
SELECT
    '用户信息' as table_name,
    wallet_address,
    username,
    referrer_wallet,
    created_at
FROM users
WHERE wallet_address ILIKE '0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF'

UNION ALL

SELECT
    'Membership Level ' || nft_level::text as table_name,
    wallet_address,
    is_member::text as info1,
    claimed_at::text as info2,
    NULL as info3
FROM membership
WHERE wallet_address ILIKE '0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF'

UNION ALL

SELECT
    '会员记录' as table_name,
    wallet_address,
    'Level: ' || current_level::text as info1,
    'Seq: ' || activation_sequence::text as info2,
    to_char(activation_time, 'YYYY-MM-DD HH24:MI:SS') as info3
FROM members
WHERE wallet_address ILIKE '0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF'

UNION ALL

SELECT
    '推荐关系' as table_name,
    referee_wallet as wallet_address,
    'Referrer: ' || referrer_wallet as info1,
    is_active::text as info2,
    to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as info3
FROM referrals
WHERE referee_wallet ILIKE '0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF'

UNION ALL

SELECT
    '余额记录' as table_name,
    wallet_address,
    'BCC: ' || transferable_bcc::text as info1,
    'USDC: ' || direct_reward_usdc::text as info2,
    to_char(last_updated, 'YYYY-MM-DD HH24:MI:SS') as info3
FROM user_balances
WHERE wallet_address ILIKE '0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF';

-- 查看矩阵位置
SELECT
    mr.member_wallet,
    mr.parent_wallet,
    mr.matrix_layer,
    mr.slot_num_seq,
    mr.child_position,
    mr.created_at
FROM matrix_referrals mr
WHERE mr.member_wallet ILIKE '0x47098712EeEd62d22B60508A24B0ce54C5EDD9eF'
ORDER BY mr.matrix_layer, mr.slot_num_seq;
