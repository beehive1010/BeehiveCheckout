-- 修复正确的单一Layer奖励机制
-- ========================================
-- 每个会员的NFT claim只给一个Layer奖励给他们的直接matrix_root
-- ========================================

SELECT '=== 修复单一Layer奖励机制 ===' as status;

-- 第1步：理解正确的机制
-- ========================================
-- 每个会员激活NFT时，只给他们的**直接matrix_root**一个Layer奖励
-- Layer奖励金额 = NFT price
-- 不是19层的奖励链，而是单一的直接奖励

SELECT '=== 当前Matrix安置情况分析 ===' as section;
SELECT 
    r.member_activation_sequence,
    member_u.username as member_name,
    root_u.username as matrix_root_name,
    root_m.activation_sequence as root_sequence,
    r.matrix_layer,
    r.matrix_position,
    r.is_direct_referral,
    m.current_level as member_nft_level
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
JOIN users member_u ON m.wallet_address = member_u.wallet_address
JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address  
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
WHERE r.matrix_layer > 0  -- 只看实际的Matrix安置
ORDER BY r.member_activation_sequence;

-- 第2步：为每个会员创建单一Layer奖励
-- ========================================

DO $$
DECLARE
    member_rec RECORD;
    nft_price DECIMAL(18,6);
    reward_id UUID;
    total_rewards_created INTEGER := 0;
BEGIN
    RAISE NOTICE '开始为每个会员创建单一Layer奖励...';
    
    -- 为每个Matrix中的会员创建一个Layer奖励给他们的直接matrix_root
    FOR member_rec IN 
        SELECT 
            r.member_wallet,
            r.member_activation_sequence,
            r.matrix_root_wallet,
            root_m.activation_sequence as root_sequence,
            root_u.username as root_username,
            m.current_level as member_nft_level,
            member_u.username as member_username
        FROM referrals r
        JOIN members m ON r.member_wallet = m.wallet_address
        JOIN users member_u ON m.wallet_address = member_u.wallet_address
        JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
        JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
        WHERE r.matrix_layer > 0  -- 只处理实际Matrix安置
        ORDER BY r.member_activation_sequence
    LOOP
        -- 获取NFT价格（基于成员的level）
        SELECT nml.nft_price_usdt INTO nft_price
        FROM nft_membership_levels nml
        WHERE nml.level = member_rec.member_nft_level;
        
        IF nft_price IS NULL THEN
            nft_price := CASE member_rec.member_nft_level WHEN 2 THEN 150.00 ELSE 100.00 END;
        END IF;
        
        -- 创建单一Layer奖励给直接matrix_root
        INSERT INTO layer_rewards (
            triggering_member_wallet,
            reward_recipient_wallet, 
            matrix_root_wallet,
            triggering_nft_level,
            reward_amount,
            layer_position,
            matrix_layer,
            status,
            recipient_required_level,
            recipient_current_level,
            requires_direct_referrals,
            direct_referrals_required,
            direct_referrals_current,
            expires_at
        ) VALUES (
            member_rec.member_wallet,               -- 触发奖励的会员
            member_rec.matrix_root_wallet,          -- 获得奖励的matrix_root
            member_rec.matrix_root_wallet,          -- matrix_root_wallet
            member_rec.member_nft_level,            -- triggering_nft_level
            nft_price,                              -- reward_amount = NFT price
            'L1',                                   -- layer_position  
            1,                                      -- matrix_layer
            'pending',                              -- status (需要检查资格)
            CASE WHEN member_rec.root_sequence = 0 THEN 1 ELSE 2 END,  -- Super Root只需Level 1
            (SELECT current_level FROM members WHERE wallet_address = member_rec.matrix_root_wallet),
            CASE WHEN member_rec.root_sequence = 0 THEN false ELSE true END, -- Super Root不需要直推要求
            CASE WHEN member_rec.root_sequence = 0 THEN 0 ELSE 3 END,   -- Super Root不需要直推
            (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = member_rec.matrix_root_wallet AND is_direct_referral = true)::INTEGER,
            NOW() + INTERVAL '30 days'
        ) RETURNING id INTO reward_id;
        
        total_rewards_created := total_rewards_created + 1;
        
        RAISE NOTICE '会员 % (Sequence %) -> Matrix Root % (Sequence %): 创建 % USDT 奖励', 
            member_rec.member_username,
            member_rec.member_activation_sequence,
            member_rec.root_username, 
            member_rec.root_sequence,
            nft_price;
    END LOOP;
    
    RAISE NOTICE '单一Layer奖励创建完成: 总计创建了%个奖励记录', total_rewards_created;
END $$;

-- 第3步：更新奖励状态
-- ========================================

-- 更新符合资格的奖励为claimable
UPDATE layer_rewards 
SET status = 'claimable'
WHERE status = 'pending'
AND recipient_current_level >= recipient_required_level
AND direct_referrals_current >= direct_referrals_required;

-- 第4步：验证单一Layer奖励结果
-- ========================================

SELECT '=== 单一Layer奖励验证 ===' as section;

-- 每个Matrix Root获得的奖励汇总
SELECT 
    root_m.activation_sequence as root_sequence,
    root_u.username as root_username,
    CASE WHEN root_m.activation_sequence = 0 THEN 'SUPER ROOT' ELSE 'MATRIX ROOT' END as root_type,
    root_m.current_level as root_level,
    
    -- 奖励统计
    COUNT(lr.id) as rewards_received,
    SUM(lr.reward_amount) as total_amount,
    COUNT(*) FILTER (WHERE lr.status = 'claimable') as claimable_count,
    COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_count,
    SUM(lr.reward_amount) FILTER (WHERE lr.status = 'claimable') as claimable_amount,
    SUM(lr.reward_amount) FILTER (WHERE lr.status = 'pending') as pending_amount,
    
    -- 下级成员数量
    (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = root_m.wallet_address AND matrix_layer > 0) as downstream_members
    
FROM members root_m
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
LEFT JOIN layer_rewards lr ON root_m.wallet_address = lr.reward_recipient_wallet
GROUP BY root_m.activation_sequence, root_u.username, root_m.current_level, root_m.wallet_address
HAVING COUNT(lr.id) > 0
ORDER BY root_m.activation_sequence;

-- 显示每个触发者及其产生的奖励
SELECT '=== 奖励触发者明细 ===' as section;
SELECT 
    trigger_m.activation_sequence as member_sequence,
    trigger_u.username as member_name,
    trigger_m.current_level as member_level,
    
    root_m.activation_sequence as matrix_root_sequence,
    root_u.username as matrix_root_name,
    
    lr.reward_amount,
    lr.status,
    CASE WHEN lr.status = 'claimable' THEN '✅ 可领取' ELSE '⏳ 等待中' END as reward_status
    
FROM layer_rewards lr
JOIN members trigger_m ON lr.triggering_member_wallet = trigger_m.wallet_address
JOIN users trigger_u ON trigger_m.wallet_address = trigger_u.wallet_address
JOIN members root_m ON lr.reward_recipient_wallet = root_m.wallet_address  
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
ORDER BY trigger_m.activation_sequence;

-- 最终统计
SELECT '=== 单一Layer奖励系统总结 ===' as final_section;
WITH reward_summary AS (
    SELECT 
        COUNT(*) as total_rewards,
        COUNT(DISTINCT triggering_member_wallet) as triggering_members,
        COUNT(DISTINCT reward_recipient_wallet) as recipient_roots,
        SUM(reward_amount) as total_amount,
        COUNT(*) FILTER (WHERE status = 'claimable') as claimable_rewards,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_rewards,
        SUM(reward_amount) FILTER (WHERE status = 'claimable') as claimable_amount,
        SUM(reward_amount) FILTER (WHERE status = 'pending') as pending_amount
    FROM layer_rewards
)
SELECT 
    '总奖励记录: ' || total_rewards as stat1,
    '触发会员数: ' || triggering_members as stat2,
    '获益Root数: ' || recipient_roots as stat3,
    'Claimable奖励: ' || claimable_rewards || ' 个 (' || claimable_amount || ' USDT)' as stat4,
    'Pending奖励: ' || pending_rewards || ' 个 (' || pending_amount || ' USDT)' as stat5,
    '总奖励金额: ' || total_amount || ' USDT' as stat6
FROM reward_summary;

-- 验证逻辑正确性
SELECT '=== 逻辑验证 ===' as validation;
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM layer_rewards) = 
             (SELECT COUNT(*) FROM referrals WHERE matrix_layer > 0)
        THEN '✅ 每个会员产生了一个奖励'
        ELSE '❌ 奖励数量不匹配'
    END as reward_count_check,
    
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM layer_rewards lr
            WHERE lr.triggering_member_wallet = lr.reward_recipient_wallet
        )
        THEN '✅ 没有自我奖励'
        ELSE '❌ 存在自我奖励'
    END as self_reward_check,
    
    '每个会员激活 -> 给其matrix_root一个Layer奖励' as mechanism_description;