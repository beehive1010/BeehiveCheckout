-- 修复Super Root用户Matrix结构问题
-- ========================================
-- Super Root用户不应该在3x3 Matrix中，需要移除相关记录
-- ========================================

-- 第1步：识别Super Root用户
-- ========================================

SELECT '=== 修复Super Root用户Matrix问题 ===' as status;

-- 确认Super Root用户
SELECT '=== 确认Super Root用户 ===' as section;
SELECT 
    m.activation_sequence,
    m.wallet_address,
    u.username,
    m.referrer_wallet,
    CASE WHEN m.activation_sequence = 0 THEN 'SUPER ROOT' ELSE 'REGULAR MEMBER' END as user_type
FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
WHERE m.activation_sequence = 0;

-- 第2步：检查Super Root在Matrix中的错误记录
-- ========================================

SELECT '=== Super Root在Matrix中的错误记录 ===' as section;

-- 检查Super Root作为member的referral记录
SELECT 
    'Super Root作为member的referral记录' as record_type,
    r.matrix_layer,
    r.matrix_position,
    r.is_direct_referral
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
WHERE m.activation_sequence = 0;

-- 检查Super Root获得的层级奖励
SELECT 
    'Super Root获得的层级奖励' as record_type,
    COUNT(*) as reward_count,
    SUM(lr.reward_amount) as total_amount
FROM layer_rewards lr
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE m.activation_sequence = 0;

-- 第3步：移除Super Root的错误Matrix记录
-- ========================================

DO $$
DECLARE
    super_root_wallet VARCHAR(42);
    deleted_referrals INTEGER;
    deleted_rewards INTEGER;
BEGIN
    -- 获取Super Root钱包地址
    SELECT wallet_address INTO super_root_wallet
    FROM members
    WHERE activation_sequence = 0;
    
    IF super_root_wallet IS NOT NULL THEN
        RAISE NOTICE 'Super Root钱包地址: %', super_root_wallet;
        
        -- 删除Super Root作为member的referral记录（保留作为matrix_root的记录）
        DELETE FROM referrals
        WHERE member_wallet = super_root_wallet
        AND matrix_layer > 0;  -- 只删除在Matrix中的记录，保留作为根节点的记录
        
        GET DIAGNOSTICS deleted_referrals = ROW_COUNT;
        RAISE NOTICE '删除了Super Root的 % 条Matrix referral记录', deleted_referrals;
        
        -- 删除Super Root获得的层级奖励（Super Root不应该获得奖励）
        DELETE FROM layer_rewards
        WHERE reward_recipient_wallet = super_root_wallet;
        
        GET DIAGNOSTICS deleted_rewards = ROW_COUNT;
        RAISE NOTICE '删除了Super Root的 % 条层级奖励记录', deleted_rewards;
        
        -- 更新或保留Super Root作为Matrix根节点的记录
        -- Super Root应该只有一条记录：作为自己的Matrix根节点
        INSERT INTO referrals (
            member_wallet,
            referrer_wallet,
            matrix_root_wallet,
            matrix_root_sequence,
            matrix_layer,
            matrix_position,
            member_activation_sequence,
            is_direct_referral,
            is_spillover_placement
        ) VALUES (
            super_root_wallet,     -- member_wallet
            NULL,                  -- referrer_wallet (Super Root没有推荐人)
            super_root_wallet,     -- matrix_root_wallet (自己是根节点)
            0,                     -- matrix_root_sequence
            -1,                    -- matrix_layer (使用-1表示Super Root层级)
            NULL,                  -- matrix_position (Super Root没有position)
            0,                     -- member_activation_sequence
            false,                 -- is_direct_referral
            false                  -- is_spillover_placement
        )
        ON CONFLICT (member_wallet, matrix_root_wallet) DO NOTHING;
        
        RAISE NOTICE 'Super Root记录已标准化';
        
    ELSE
        RAISE WARNING '未找到Super Root用户';
    END IF;
END $$;

-- 第4步：验证修复结果
-- ========================================

SELECT '=== 修复后验证 ===' as section;

-- 重新检查数据统计
SELECT 
    'members' as table_name, COUNT(*) as count FROM members
UNION ALL
SELECT 
    'referrals', COUNT(*) FROM referrals  
UNION ALL
SELECT 
    'layer_rewards', COUNT(*) FROM layer_rewards
ORDER BY table_name;

-- 检查Matrix层级分布（应该不包含Super Root）
SELECT '=== Matrix层级分布（修复后）===' as section;
SELECT 
    r.matrix_layer,
    COUNT(*) as members_count,
    COUNT(DISTINCT r.matrix_root_wallet) as unique_roots,
    string_agg(DISTINCT m.activation_sequence::text, ',' ORDER BY m.activation_sequence::text) as member_sequences
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.matrix_layer >= 0  -- 只显示正常Matrix层级
GROUP BY r.matrix_layer
ORDER BY r.matrix_layer;

-- 检查Super Root的最终状态
SELECT '=== Super Root最终状态 ===' as section;
SELECT 
    'Super Root referral记录' as check_type,
    COUNT(*) as count,
    string_agg(DISTINCT r.matrix_layer::text, ',') as layers
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
WHERE m.activation_sequence = 0

UNION ALL

SELECT 
    'Super Root层级奖励',
    COUNT(*),
    COALESCE(SUM(lr.reward_amount)::text, '0')
FROM layer_rewards lr
JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE m.activation_sequence = 0;

-- 第5步：重新计算正确的Matrix结构
-- ========================================

SELECT '=== 正确的Matrix结构 ===' as section;

-- 显示正确的Matrix根节点（应该是activation_sequence = 1的用户）
WITH matrix_roots AS (
    SELECT DISTINCT 
        r.matrix_root_wallet,
        m.activation_sequence as root_sequence,
        u.username as root_username
    FROM referrals r
    JOIN members m ON r.matrix_root_wallet = m.wallet_address
    JOIN users u ON m.wallet_address = u.wallet_address
    WHERE r.matrix_layer > 0  -- 排除Super Root的特殊记录
)
SELECT 
    root_sequence,
    root_username,
    LEFT(matrix_root_wallet, 10) || '...' as root_wallet_short
FROM matrix_roots
ORDER BY root_sequence;

-- 显示每个正常Matrix根节点的下级成员
SELECT '=== Matrix根节点下级成员分布 ===' as section;
SELECT 
    root_m.activation_sequence as root_sequence,
    root_u.username as root_username,
    r.matrix_layer,
    COUNT(*) as members_in_layer,
    string_agg(r.matrix_position::text, ',' ORDER BY r.matrix_position) as positions_filled
FROM referrals r
JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
JOIN members member_m ON r.member_wallet = member_m.wallet_address
WHERE r.matrix_layer > 0  -- 只统计正常Matrix层级
AND member_m.activation_sequence > 0  -- 排除Super Root
GROUP BY root_m.activation_sequence, root_u.username, r.matrix_layer
ORDER BY root_m.activation_sequence, r.matrix_layer;

-- 第6步：显示修复总结
-- ========================================

SELECT '=== Super Root Matrix修复完成 ===' as final_status;

WITH summary_stats AS (
    SELECT 
        (SELECT COUNT(*) FROM members) as total_members,
        (SELECT COUNT(*) FROM referrals WHERE matrix_layer >= 0) as normal_matrix_members,
        (SELECT COUNT(*) FROM referrals WHERE matrix_layer < 0) as super_root_records,
        (SELECT COUNT(*) FROM layer_rewards) as total_rewards,
        (SELECT SUM(reward_amount) FROM layer_rewards) as total_reward_amount
)
SELECT 
    '总会员数: ' || total_members as stat1,
    '正常Matrix成员: ' || normal_matrix_members as stat2,
    'Super Root特殊记录: ' || super_root_records as stat3,
    '层级奖励总数: ' || total_rewards as stat4,
    '奖励总金额: ' || total_reward_amount || ' USDT' as stat5
FROM summary_stats;

SELECT '=== 修复要点总结 ===' as summary_section;
SELECT 'Super Root用户修复要点:' as title,
       '✓ 移除Super Root的Matrix参与记录' as point1,
       '✓ 删除Super Root不应获得的层级奖励' as point2,
       '✓ 保持Super Root作为系统管理员的特殊地位' as point3,
       '✓ 确保Matrix结构只包含普通会员' as point4;