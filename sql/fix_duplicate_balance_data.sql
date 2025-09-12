-- 修复user_balances表中的重复数据
-- ========================================
-- 清理重复记录并确保数据一致性
-- ========================================

SELECT '=== 修复user_balances重复数据 ===' as balance_fix_section;

-- 第1步：检查重复数据情况
-- ========================================

-- 查找重复的钱包地址
WITH duplicate_analysis AS (
    SELECT 
        wallet_address,
        COUNT(*) as record_count,
        array_agg(available_balance) as balances,
        array_agg(last_updated ORDER BY last_updated) as update_times
    FROM user_balances 
    GROUP BY wallet_address
    HAVING COUNT(*) > 1
)
SELECT 
    '=== 发现的重复记录 ===' as duplicates_section,
    wallet_address,
    record_count,
    balances,
    update_times
FROM duplicate_analysis
ORDER BY record_count DESC;

-- 统计总体情况
WITH balance_stats AS (
    SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT wallet_address) as unique_wallets,
        (COUNT(*) - COUNT(DISTINCT wallet_address)) as duplicate_records
    FROM user_balances
)
SELECT 
    '总记录数: ' || total_records as stat1,
    '唯一钱包: ' || unique_wallets as stat2, 
    '重复记录: ' || duplicate_records as stat3
FROM balance_stats;

-- 第2步：检查是否所有members都有balance记录
-- ========================================

-- 检查缺失balance的members
SELECT 
    '=== 检查缺失balance的members ===' as missing_balance_section;

SELECT 
    m.activation_sequence,
    u.username,
    m.wallet_address,
    CASE WHEN ub.wallet_address IS NULL THEN '❌ 缺失balance记录' ELSE '✅ 有balance记录' END as balance_status
FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
ORDER BY m.activation_sequence;

-- 第3步：清理重复记录（保留最新的记录）
-- ========================================

-- 删除重复记录，只保留每个钱包地址的最新记录
DELETE FROM user_balances 
WHERE ctid NOT IN (
    SELECT DISTINCT ON (wallet_address) ctid
    FROM user_balances 
    ORDER BY wallet_address, last_updated DESC
);

-- 第4步：为缺失balance的members创建记录
-- ========================================

-- 为所有members创建初始balance记录（如果不存在）
INSERT INTO user_balances (
    wallet_address,
    available_balance,
    total_earned,
    total_withdrawn,
    last_updated,
    bcc_balance,
    bcc_locked,
    bcc_used,
    bcc_total_unlocked,
    reward_balance,
    reward_claimed,
    activation_tier,
    tier_multiplier
)
SELECT 
    m.wallet_address,
    0.000000,  -- available_balance
    0.000000,  -- total_earned
    0.000000,  -- total_withdrawn
    NOW(),     -- last_updated
    500.000000, -- bcc_balance (默认500)
    10450.000000, -- bcc_locked (默认10450)
    0.000000,  -- bcc_used
    0.000000,  -- bcc_total_unlocked
    0.000000,  -- reward_balance
    0.000000,  -- reward_claimed
    1,         -- activation_tier
    1.000      -- tier_multiplier
FROM members m
WHERE NOT EXISTS (
    SELECT 1 FROM user_balances ub 
    WHERE ub.wallet_address = m.wallet_address
);

-- 第5步：修复balance更新函数以使用正确的字段名
-- ========================================

-- 重新创建余额更新函数
CREATE OR REPLACE FUNCTION update_member_balance(
    p_wallet_address VARCHAR(42),
    p_amount DECIMAL(18,6),
    p_transaction_type VARCHAR(50),
    p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance DECIMAL(18,6);
    current_earned DECIMAL(18,6);
    new_balance DECIMAL(18,6);
    new_earned DECIMAL(18,6);
BEGIN
    -- 获取当前余额和总收入
    SELECT 
        COALESCE(available_balance, 0),
        COALESCE(total_earned, 0)
    INTO current_balance, current_earned
    FROM user_balances 
    WHERE wallet_address = p_wallet_address;
    
    -- 如果用户余额记录不存在，创建一个
    IF NOT FOUND THEN
        INSERT INTO user_balances (
            wallet_address,
            available_balance,
            total_earned,
            total_withdrawn,
            last_updated,
            bcc_balance,
            bcc_locked,
            bcc_used,
            bcc_total_unlocked,
            reward_balance,
            reward_claimed,
            activation_tier,
            tier_multiplier
        ) VALUES (
            p_wallet_address,
            0.000000,
            0.000000,
            0.000000,
            NOW(),
            500.000000,
            10450.000000,
            0.000000,
            0.000000,
            0.000000,
            0.000000,
            1,
            1.000
        );
        current_balance := 0.00;
        current_earned := 0.00;
    END IF;
    
    -- 计算新余额和总收入
    new_balance := current_balance + p_amount;
    new_earned := current_earned + p_amount;
    
    -- 更新用户余额
    UPDATE user_balances 
    SET available_balance = new_balance,
        total_earned = new_earned,
        last_updated = NOW()
    WHERE wallet_address = p_wallet_address;
    
    -- 记录余额变化历史
    INSERT INTO reward_records (
        wallet_address,
        amount,
        transaction_type,
        description,
        previous_balance,
        new_balance,
        created_at
    ) VALUES (
        p_wallet_address,
        p_amount,
        p_transaction_type,
        p_description,
        current_balance,
        new_balance,
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Balance updated successfully',
        'previous_balance', current_balance,
        'new_balance', new_balance,
        'amount_added', p_amount
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Balance update failed: ' || SQLERRM
    );
END;
$$;

-- 第6步：验证修复结果
-- ========================================

SELECT '=== 修复后验证 ===' as verification_section;

-- 检查修复后的情况
WITH final_stats AS (
    SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT wallet_address) as unique_wallets,
        (COUNT(*) - COUNT(DISTINCT wallet_address)) as remaining_duplicates
    FROM user_balances
)
SELECT 
    '修复后总记录数: ' || total_records as stat1,
    '唯一钱包数: ' || unique_wallets as stat2,
    '剩余重复记录: ' || remaining_duplicates as stat3
FROM final_stats;

-- 检查每个member的balance状态
SELECT 
    COUNT(m.wallet_address) as total_members,
    COUNT(ub.wallet_address) as members_with_balance,
    CASE 
        WHEN COUNT(m.wallet_address) = COUNT(ub.wallet_address) 
        THEN '✅ 所有members都有balance记录'
        ELSE '⚠️ 仍有members缺少balance记录'
    END as balance_completeness
FROM members m
LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address;

SELECT '✅ user_balances重复数据修复完成' as completion_message;