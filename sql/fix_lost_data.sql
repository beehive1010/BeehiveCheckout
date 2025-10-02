-- 修复丢失的数据 - 补充缺失的referral记录和Matrix结构
-- ========================================
-- 修复root member缺失的referral记录和其他数据不一致问题
-- ========================================

-- 第1步：识别丢失的数据
-- ========================================

SELECT '=== 修复丢失的数据 ===' as status;

-- 检查丢失的referral记录
SELECT '=== 检查丢失的referral记录 ===' as section;
SELECT 
    m.activation_sequence,
    m.wallet_address,
    u.username,
    CASE WHEN r.member_wallet IS NULL THEN 'MISSING' ELSE 'OK' END as referral_status
FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
ORDER BY m.activation_sequence;

-- 第2步：修复root member的referral记录
-- ========================================

-- 为root member创建referral记录（作为Matrix的根节点）
DO $$
DECLARE
    root_member RECORD;
    referral_exists BOOLEAN;
BEGIN
    -- 获取root member信息
    SELECT m.wallet_address, m.activation_sequence, u.username
    INTO root_member
    FROM members m
    JOIN users u ON m.wallet_address = u.wallet_address
    WHERE m.activation_sequence = 0;
    
    IF root_member IS NOT NULL THEN
        -- 检查是否已存在referral记录
        SELECT EXISTS(
            SELECT 1 FROM referrals 
            WHERE member_wallet = root_member.wallet_address
        ) INTO referral_exists;
        
        IF NOT referral_exists THEN
            -- 为root member创建特殊的referral记录
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
                root_member.wallet_address,    -- member_wallet
                NULL,                          -- referrer_wallet (root没有推荐人)
                root_member.wallet_address,    -- matrix_root_wallet (自己就是root)
                root_member.activation_sequence, -- matrix_root_sequence
                0,                             -- matrix_layer (root是layer 0)
                NULL,                          -- matrix_position (root没有position)
                root_member.activation_sequence, -- member_activation_sequence
                false,                         -- is_direct_referral (root不是任何人的直推)
                false                          -- is_spillover_placement
            );
            
            RAISE NOTICE '已为root member % 创建referral记录', root_member.username;
        ELSE
            RAISE NOTICE 'Root member % 的referral记录已存在', root_member.username;
        END IF;
    ELSE
        RAISE WARNING '未找到activation_sequence = 0 的root member';
    END IF;
END $$;

-- 第3步：验证和修复Matrix结构的完整性
-- ========================================

-- 检查Matrix结构的完整性
SELECT '=== 检查Matrix结构完整性 ===' as section;

-- 检查每个matrix_root的下级成员分布
WITH matrix_analysis AS (
    SELECT 
        mr.matrix_root_wallet,
        mu.username as root_username,
        mr.matrix_layer,
        COUNT(*) as members_in_layer,
        string_agg(r.matrix_position::text, ',' ORDER BY r.matrix_position) as positions_filled
    FROM referrals r
    JOIN members mr ON r.matrix_root_wallet = mr.wallet_address
    JOIN users mu ON mr.wallet_address = mu.wallet_address
    WHERE r.matrix_layer > 0  -- 排除root自己的记录
    GROUP BY mr.matrix_root_wallet, mu.username, mr.matrix_layer
)
SELECT 
    root_username,
    matrix_layer,
    members_in_layer,
    positions_filled,
    CASE 
        WHEN members_in_layer = 3 THEN '满员'
        WHEN members_in_layer < 3 THEN '有空位'
        ELSE '异常'
    END as status
FROM matrix_analysis
ORDER BY root_username, matrix_layer;

-- 第4步：重新计算Layer奖励（为root member）
-- ========================================

-- 为root member重新计算应得的层级奖励
DO $$
DECLARE
    root_wallet VARCHAR(42);
    reward_result JSONB;
    existing_rewards INTEGER;
BEGIN
    -- 获取root member钱包地址
    SELECT wallet_address INTO root_wallet 
    FROM members 
    WHERE activation_sequence = 0;
    
    IF root_wallet IS NOT NULL THEN
        -- 检查是否已有奖励记录
        SELECT COUNT(*) INTO existing_rewards
        FROM layer_rewards
        WHERE reward_recipient_wallet = root_wallet;
        
        RAISE NOTICE 'Root member现有奖励记录数: %', existing_rewards;
        
        -- 如果奖励记录不完整，可以选择重新计算
        -- 注意：这里不自动重新计算，因为可能会产生重复奖励
        -- 如果需要重新计算，需要先清理现有数据
        
        RAISE NOTICE 'Root member钱包地址: %', root_wallet;
    END IF;
END $$;

-- 第5步：验证修复后的数据完整性
-- ========================================

SELECT '=== 修复后数据完整性验证 ===' as section;

-- 重新检查所有表的记录数
SELECT 
    'members' as table_name, COUNT(*) as count FROM members
UNION ALL
SELECT 
    'users', COUNT(*) FROM users
UNION ALL  
SELECT 
    'referrals', COUNT(*) FROM referrals
UNION ALL
SELECT 
    'layer_rewards', COUNT(*) FROM layer_rewards
ORDER BY table_name;

-- 检查members和referrals的一致性
SELECT '=== Members-Referrals一致性检查 ===' as section;
SELECT 
    'Members有referral记录' as check_type,
    COUNT(*) as count
FROM members m
JOIN referrals r ON m.wallet_address = r.member_wallet

UNION ALL

SELECT 
    'Members缺失referral记录',
    COUNT(*)
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.member_wallet
WHERE r.member_wallet IS NULL;

-- 显示Matrix结构概览
SELECT '=== Matrix结构概览 ===' as section;
SELECT 
    r.matrix_layer,
    COUNT(*) as total_members,
    COUNT(DISTINCT r.matrix_root_wallet) as unique_roots,
    string_agg(DISTINCT r.matrix_position::text, ',' ORDER BY r.matrix_position::text) as positions_used
FROM referrals r
WHERE r.matrix_layer >= 0
GROUP BY r.matrix_layer
ORDER BY r.matrix_layer;

-- 第6步：检查Layer奖励的分配情况
-- ========================================

SELECT '=== Layer奖励分配检查 ===' as section;

-- 按接收者统计奖励
SELECT 
    m.activation_sequence,
    u.username,
    COUNT(lr.id) as rewards_count,
    SUM(lr.reward_amount) as total_amount,
    string_agg(DISTINCT lr.status, ',' ORDER BY lr.status) as statuses
FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN layer_rewards lr ON m.wallet_address = lr.reward_recipient_wallet
GROUP BY m.activation_sequence, u.username, m.wallet_address
ORDER BY m.activation_sequence;

-- 检查是否有孤儿奖励记录
SELECT '=== 孤儿奖励记录检查 ===' as section;
SELECT 
    'Layer奖励记录引用不存在的member' as issue_type,
    COUNT(*) as count
FROM layer_rewards lr
LEFT JOIN members m ON lr.reward_recipient_wallet = m.wallet_address
WHERE m.wallet_address IS NULL

UNION ALL

SELECT 
    'Layer奖励记录引用不存在的triggering member',
    COUNT(*)
FROM layer_rewards lr
LEFT JOIN members m ON lr.triggering_member_wallet = m.wallet_address
WHERE m.wallet_address IS NULL;

-- 第7步：显示修复总结
-- ========================================

SELECT '=== 数据修复完成总结 ===' as final_section;

WITH data_summary AS (
    SELECT 
        (SELECT COUNT(*) FROM members) as total_members,
        (SELECT COUNT(*) FROM referrals) as total_referrals,
        (SELECT COUNT(*) FROM layer_rewards) as total_rewards,
        (SELECT COUNT(*) FROM members m LEFT JOIN referrals r ON m.wallet_address = r.member_wallet WHERE r.member_wallet IS NULL) as missing_referrals,
        (SELECT SUM(reward_amount) FROM layer_rewards) as total_reward_amount
)
SELECT 
    '总会员数: ' || total_members as stat1,
    '总Referral记录: ' || total_referrals as stat2,
    '总Layer奖励: ' || total_rewards as stat3,
    '缺失Referral记录: ' || missing_referrals as stat4,
    '总奖励金额: ' || total_reward_amount || ' USDT' as stat5
FROM data_summary;

SELECT '=== 修复状态 ===' as status_section;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM members m LEFT JOIN referrals r ON m.wallet_address = r.member_wallet WHERE r.member_wallet IS NULL)
        THEN '⚠️  仍有数据不一致问题'
        ELSE '✅ 数据结构完整'
    END as data_integrity_status;