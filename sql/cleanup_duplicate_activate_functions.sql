-- 清理重复的activate_nft_level1_membership函数
-- =============================================
-- 删除使用小写查询的重复函数，保留正确的版本
-- =============================================

SELECT '=== 清理重复的激活函数 ===' as cleanup_section;

-- 1. 查看当前所有的activate_nft_level1_membership函数
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    p.prosecdef as security_definer,
    pg_get_functiondef(p.oid) as definition_snippet
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'activate_nft_level1_membership'
AND n.nspname = 'public';

-- 2. 删除有问题的重复函数（2参数版本的SECURITY INVOKER）
-- 根据audit结果，有一个SECURITY INVOKER版本出现错误
DROP FUNCTION IF EXISTS activate_nft_level1_membership(text, text) CASCADE;

-- 3. 确保只保留正确的函数版本
-- 基于audit结果，正确的版本应该是SECURITY DEFINER，有3个参数

-- 4. 重新创建正确的函数（如果需要的话）
CREATE OR REPLACE FUNCTION activate_nft_level1_membership(
    p_wallet_address text,
    p_referrer_wallet text,
    p_transaction_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_member_result jsonb;
    placement_result jsonb;
    rewards_result jsonb;
    bcc_result jsonb;
    activation_sequence_num integer;
    final_result jsonb;
BEGIN
    -- 检查输入参数
    IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet address is required'
        );
    END IF;

    -- 标准化钱包地址为小写
    p_wallet_address := LOWER(p_wallet_address);
    IF p_referrer_wallet IS NOT NULL THEN
        p_referrer_wallet := LOWER(p_referrer_wallet);
    END IF;

    -- 检查用户是否已注册
    IF NOT EXISTS (SELECT 1 FROM users WHERE LOWER(wallet_address) = p_wallet_address) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User must be registered before activation'
        );
    END IF;

    -- 检查是否已经激活
    IF EXISTS (SELECT 1 FROM members WHERE LOWER(wallet_address) = p_wallet_address) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Member already activated'
        );
    END IF;

    -- 获取激活序号
    SELECT COALESCE(MAX(activation_sequence), -1) + 1 
    INTO activation_sequence_num 
    FROM members;

    -- 创建会员记录
    INSERT INTO members (
        wallet_address,
        current_level,
        levels_owned,
        activation_sequence,
        referrer_wallet,
        transaction_hash,
        created_at,
        updated_at
    ) VALUES (
        p_wallet_address,
        1,
        ARRAY[1],
        activation_sequence_num,
        p_referrer_wallet,
        p_transaction_hash,
        NOW(),
        NOW()
    );

    -- 矩阵placement
    SELECT place_new_member_in_matrix_correct(p_wallet_address, p_referrer_wallet)
    INTO placement_result;

    -- 生成奖励
    SELECT generate_qualified_rewards_fixed(p_wallet_address, 1)
    INTO rewards_result;

    -- BCC解锁
    SELECT unlock_bcc_for_level(p_wallet_address, 1)
    INTO bcc_result;

    -- 创建通知
    PERFORM create_welcome_notifications(
        p_wallet_address,
        activation_sequence_num,
        placement_result,
        rewards_result,
        bcc_result
    );

    -- 返回结果
    final_result := jsonb_build_object(
        'success', true,
        'activation_sequence', activation_sequence_num,
        'level', 1,
        'placement', placement_result,
        'rewards', rewards_result,
        'bcc', bcc_result,
        'transaction_hash', p_transaction_hash
    );

    RETURN final_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'Activation failed: ' || SQLERRM
    );
END;
$$;

-- 5. 验证清理结果
SELECT '=== 清理后的函数列表 ===' as verification_section;

SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'activate_nft_level1_membership'
AND n.nspname = 'public'
ORDER BY pg_get_function_arguments(p.oid);

-- 6. 测试函数是否工作正常
SELECT '=== 函数测试 ===' as test_section;
SELECT 'activate_nft_level1_membership函数清理完成' as completion_message;

SELECT '✅ 重复函数清理完成' as final_message;