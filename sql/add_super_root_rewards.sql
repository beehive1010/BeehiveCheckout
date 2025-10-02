-- 添加Super Root的奖励
-- ========================================
-- Super Root应该从安置到他Matrix下的会员获得Layer奖励
-- ========================================

SELECT '=== 添加Super Root奖励 ===' as status;

-- 检查哪些会员直接安置到Super Root的Matrix下
SELECT '=== 检查Super Root的直接下级 ===' as section;
SELECT 
    r.member_activation_sequence,
    member_u.username as member_name,
    r.matrix_layer,
    r.matrix_position,
    m.current_level as member_nft_level
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
JOIN users member_u ON m.wallet_address = member_u.wallet_address
JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
WHERE root_m.activation_sequence = 0  -- Super Root
AND r.matrix_layer > 0
ORDER BY r.member_activation_sequence;

-- 为每个安置到Super Root的会员创建Layer奖励
DO $$
DECLARE
    member_rec RECORD;
    super_root_wallet VARCHAR(42);
    nft_price DECIMAL(18,6);
    reward_id UUID;
    total_super_root_rewards INTEGER := 0;
BEGIN
    -- 获取Super Root钱包地址
    SELECT wallet_address INTO super_root_wallet
    FROM members
    WHERE activation_sequence = 0;
    
    RAISE NOTICE 'Super Root钱包地址: %', super_root_wallet;
    
    -- 为每个直接安置到Super Root的会员创建奖励
    FOR member_rec IN 
        SELECT 
            r.member_wallet,
            r.member_activation_sequence,
            m.current_level as member_nft_level,
            member_u.username as member_username
        FROM referrals r
        JOIN members m ON r.member_wallet = m.wallet_address
        JOIN users member_u ON m.wallet_address = member_u.wallet_address
        JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
        WHERE root_m.activation_sequence = 0  -- Super Root
        AND r.matrix_layer > 0
        ORDER BY r.member_activation_sequence
    LOOP
        -- 获取NFT价格
        SELECT nml.nft_price_usdt INTO nft_price
        FROM nft_membership_levels nml
        WHERE nml.level = member_rec.member_nft_level;
        
        IF nft_price IS NULL THEN
            nft_price := CASE member_rec.member_nft_level WHEN 2 THEN 150.00 ELSE 100.00 END;
        END IF;
        
        -- 创建Super Root的Layer奖励
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
            member_rec.member_wallet,     -- 触发奖励的会员
            super_root_wallet,            -- Super Root获得奖励
            super_root_wallet,            -- matrix_root_wallet
            member_rec.member_nft_level,  -- triggering_nft_level
            nft_price,                    -- reward_amount = NFT price
            'SUPER',                      -- layer_position
            0,                           -- matrix_layer (Super Root是特殊的layer 0)
            'claimable',                 -- Super Root的奖励直接可领取
            1,                           -- Super Root只需要Level 1
            (SELECT current_level FROM members WHERE wallet_address = super_root_wallet),
            false,                       -- Super Root不需要直推要求
            0,                           -- 不需要直推
            0,                           -- 当前直推数（不重要）
            NOW() + INTERVAL '30 days'
        ) RETURNING id INTO reward_id;
        
        total_super_root_rewards := total_super_root_rewards + 1;
        
        RAISE NOTICE 'Super Root <- 会员 % (Sequence %): 创建 % USDT 奖励', 
            member_rec.member_username,
            member_rec.member_activation_sequence,
            nft_price;
    END LOOP;
    
    RAISE NOTICE 'Super Root奖励创建完成: 总计创建了%个奖励', total_super_root_rewards;
END $$;

-- 验证完整的奖励分配
SELECT '=== 完整奖励分配验证 ===' as section;

-- 所有Matrix Root的奖励统计
SELECT 
    root_m.activation_sequence as root_sequence,
    root_u.username as root_username,
    CASE 
        WHEN root_m.activation_sequence = 0 THEN 'SUPER ROOT'
        ELSE 'MATRIX ROOT'
    END as root_type,
    root_m.current_level as root_level,
    
    COUNT(lr.id) as rewards_received,
    SUM(lr.reward_amount) as total_amount,
    COUNT(*) FILTER (WHERE lr.status = 'claimable') as claimable_count,
    COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_count,
    
    -- 下级成员数量（直接安置到此Root的成员）
    (SELECT COUNT(*) 
     FROM referrals 
     WHERE matrix_root_wallet = root_m.wallet_address 
     AND matrix_layer > 0
     AND member_wallet != matrix_root_wallet  -- 排除自己
    ) as direct_members
    
FROM members root_m
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
LEFT JOIN layer_rewards lr ON root_m.wallet_address = lr.reward_recipient_wallet
GROUP BY root_m.activation_sequence, root_u.username, root_m.current_level, root_m.wallet_address
HAVING COUNT(lr.id) > 0 OR root_m.activation_sequence = 0  -- 显示有奖励的Root或Super Root
ORDER BY root_m.activation_sequence;

-- 奖励触发者完整列表
SELECT '=== 奖励触发者完整列表 ===' as section;
SELECT 
    trigger_m.activation_sequence as member_sequence,
    trigger_u.username as member_name,
    trigger_m.current_level as member_level,
    
    root_m.activation_sequence as recipient_sequence,
    root_u.username as recipient_name,
    CASE 
        WHEN root_m.activation_sequence = 0 THEN 'SUPER ROOT'
        ELSE 'MATRIX ROOT'
    END as recipient_type,
    
    lr.reward_amount,
    lr.status,
    CASE WHEN lr.status = 'claimable' THEN '✅ 可领取' ELSE '⏳ 等待中' END as reward_status
    
FROM layer_rewards lr
JOIN members trigger_m ON lr.triggering_member_wallet = trigger_m.wallet_address
JOIN users trigger_u ON trigger_m.wallet_address = trigger_u.wallet_address
JOIN members root_m ON lr.reward_recipient_wallet = root_m.wallet_address
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
ORDER BY trigger_m.activation_sequence;

-- 最终完整统计
SELECT '=== 完整Layer奖励系统统计 ===' as final_section;
WITH complete_stats AS (
    SELECT 
        COUNT(*) as total_rewards,
        COUNT(DISTINCT triggering_member_wallet) as unique_triggers,
        COUNT(DISTINCT reward_recipient_wallet) as unique_recipients,
        SUM(reward_amount) as total_amount,
        
        COUNT(*) FILTER (WHERE status = 'claimable') as claimable_rewards,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_rewards,
        
        SUM(reward_amount) FILTER (WHERE status = 'claimable') as claimable_amount,
        SUM(reward_amount) FILTER (WHERE status = 'pending') as pending_amount,
        
        -- Super Root相关统计
        COUNT(*) FILTER (WHERE matrix_layer = 0) as super_root_rewards,
        SUM(reward_amount) FILTER (WHERE matrix_layer = 0) as super_root_amount
    FROM layer_rewards
)
SELECT 
    '总奖励记录: ' || total_rewards as stat1,
    '触发者数: ' || unique_triggers as stat2,
    '受益者数: ' || unique_recipients as stat3,
    '总金额: ' || total_amount || ' USDT' as stat4,
    'Claimable: ' || claimable_rewards || ' (' || claimable_amount || ' USDT)' as stat5,
    'Pending: ' || pending_rewards || ' (' || pending_amount || ' USDT)' as stat6,
    'Super Root奖励: ' || super_root_rewards || ' (' || super_root_amount || ' USDT)' as stat7
FROM complete_stats;

SELECT '✅ Layer奖励系统修复完成：每个会员激活 -> 给其matrix_root一个奖励' as completion;