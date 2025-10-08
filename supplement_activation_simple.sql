-- 简单补充激活记录脚本
-- 用于补充因超时而丢失的members记录
--
-- 使用方法：替换下面的钱包地址

\set wallet_address '0xYOUR_WALLET_ADDRESS_HERE'

BEGIN;

DO $$
DECLARE
    v_wallet TEXT := :'wallet_address';
    v_referrer TEXT;
    v_username TEXT;
    v_next_sequence INT;
    v_has_members BOOLEAN;
    v_has_membership BOOLEAN;
BEGIN
    -- 1. 检查当前状态
    SELECT EXISTS(SELECT 1 FROM members WHERE wallet_address ILIKE v_wallet) INTO v_has_members;
    SELECT EXISTS(SELECT 1 FROM membership WHERE wallet_address ILIKE v_wallet) INTO v_has_membership;

    RAISE NOTICE '====================================';
    RAISE NOTICE '📊 Checking Activation Status';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Wallet: %', v_wallet;
    RAISE NOTICE 'Has members record: %', v_has_members;
    RAISE NOTICE 'Has membership record: %', v_has_membership;
    RAISE NOTICE '';

    -- 2. 如果已经有members记录，不需要操作
    IF v_has_members THEN
        RAISE NOTICE '✅ Members record already exists';
        RAISE NOTICE '✅ Activation is complete - no action needed';
        RAISE NOTICE '';
        RETURN;
    END IF;

    -- 3. 从users表获取信息
    SELECT referrer_wallet, username INTO v_referrer, v_username
    FROM users
    WHERE wallet_address ILIKE v_wallet;

    IF v_referrer IS NULL THEN
        RAISE EXCEPTION '❌ ERROR: User record not found for wallet %', v_wallet;
    END IF;

    -- 4. 获取下一个activation_sequence
    SELECT COALESCE(MAX(activation_sequence), 0) + 1 INTO v_next_sequence
    FROM members;

    RAISE NOTICE '====================================';
    RAISE NOTICE '👤 User Information';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Username: %', v_username;
    RAISE NOTICE 'Referrer: %', v_referrer;
    RAISE NOTICE 'Next Sequence: %', v_next_sequence;
    RAISE NOTICE '';

    -- 5. 插入members记录
    RAISE NOTICE '====================================';
    RAISE NOTICE '🔧 Creating Members Record';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Inserting members record...';
    RAISE NOTICE 'This will trigger:';
    RAISE NOTICE '  1. sync_member_to_membership_trigger';
    RAISE NOTICE '  2. trigger_recursive_matrix_placement';
    RAISE NOTICE '  3. trigger_auto_create_balance';
    RAISE NOTICE '  4. trigger_member_initial_level1_rewards';
    RAISE NOTICE '';

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
        1,
        v_next_sequence,
        NOW(),
        1
    );

    RAISE NOTICE '✅ Members record created successfully!';
    RAISE NOTICE '✅ Activation sequence: %', v_next_sequence;
    RAISE NOTICE '';

END $$;

-- 6. 验证结果
SELECT '====================================';
SELECT '📋 Verification Results';
SELECT '====================================';

\echo ''
\echo 'Members Record:'
SELECT
  wallet_address,
  current_level,
  activation_sequence,
  activation_time,
  referrer_wallet
FROM members
WHERE wallet_address ILIKE :'wallet_address';

\echo ''
\echo 'Membership Record:'
SELECT
  wallet_address,
  nft_level,
  claimed_at,
  is_member
FROM membership
WHERE wallet_address ILIKE :'wallet_address';

\echo ''
\echo 'Referrals (Direct):'
SELECT
  referrer_wallet,
  is_direct_referral,
  referral_time
FROM referrals
WHERE member_wallet ILIKE :'wallet_address';

\echo ''
\echo 'Matrix Referrals:'
SELECT
  matrix_root_wallet,
  layer,
  position,
  parent_wallet
FROM matrix_referrals
WHERE member_wallet ILIKE :'wallet_address'
ORDER BY layer
LIMIT 10;

\echo ''
\echo 'Summary:'
SELECT
  (SELECT COUNT(*) FROM referrals WHERE member_wallet ILIKE :'wallet_address') as referrals_count,
  (SELECT COUNT(*) FROM matrix_referrals WHERE member_wallet ILIKE :'wallet_address') as matrix_count,
  (SELECT MAX(layer) FROM matrix_referrals WHERE member_wallet ILIKE :'wallet_address') as max_layer;

COMMIT;

\echo ''
\echo '====================================';
\echo '✅ Supplement Complete!';
\echo '====================================';
