-- 添加Super Root的推荐奖励
-- ========================================
-- Super Root作为推荐人应该从他推荐的会员获得奖励
-- ========================================

SELECT '=== 添加Super Root推荐奖励 ===' as status;

-- 检查Super Root推荐的会员
SELECT '=== Super Root推荐的会员列表 ===' as section;
SELECT 
    m.activation_sequence,
    u.username as member_name,
    m.current_level as member_nft_level,
    nml.nft_price_usdt as nft_price
FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
WHERE m.referrer_wallet = (SELECT wallet_address FROM members WHERE activation_sequence = 0)
ORDER BY m.activation_sequence;

-- 为Super Root推荐的每个会员创建奖励
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
    
    -- 为每个Super Root推荐的会员创建奖励
    FOR member_rec IN 
        SELECT 
            m.wallet_address as member_wallet,
            m.activation_sequence,
            m.current_level as member_nft_level,
            u.username as member_username
        FROM members m
        JOIN users u ON m.wallet_address = u.wallet_address
        WHERE m.referrer_wallet = super_root_wallet  -- Super Root推荐的会员
        ORDER BY m.activation_sequence
    LOOP
        -- 获取NFT价格
        SELECT nml.nft_price_usdt INTO nft_price
        FROM nft_membership_levels nml
        WHERE nml.level = member_rec.member_nft_level;
        
        IF nft_price IS NULL THEN
            nft_price := CASE member_rec.member_nft_level WHEN 2 THEN 150.00 ELSE 100.00 END;
        END IF;
        
        -- 创建Super Root的推荐奖励
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
            'REF',                        -- layer_position (推荐奖励)
            0,                           -- matrix_layer (Super Root特殊层级)
            'claimable',                 -- Super Root的奖励直接可领取
            1,                           -- Super Root只需要Level 1
            (SELECT current_level FROM members WHERE wallet_address = super_root_wallet),
            false,                       -- Super Root不需要直推要求
            0,                           -- 不需要直推
            0,                           -- 当前直推数（不重要）
            NOW() + INTERVAL '30 days'
        ) RETURNING id INTO reward_id;
        
        total_super_root_rewards := total_super_root_rewards + 1;
        
        RAISE NOTICE 'Super Root <- 推荐会员 % (Sequence %): 创建 % USDT 奖励', 
            member_rec.member_username,
            member_rec.activation_sequence,
            nft_price;
    END LOOP;
    
    RAISE NOTICE 'Super Root推荐奖励创建完成: 总计创建了%个奖励', total_super_root_rewards;
END $$;

-- 最终验证所有奖励
SELECT '=== 最终完整奖励验证 ===' as section;

-- 所有受益者的奖励统计
SELECT 
    root_m.activation_sequence as recipient_sequence,
    root_u.username as recipient_name,
    CASE 
        WHEN root_m.activation_sequence = 0 THEN 'SUPER ROOT (推荐人)'
        ELSE 'MATRIX ROOT'
    END as recipient_type,
    root_m.current_level as recipient_level,
    
    COUNT(lr.id) as total_rewards,
    SUM(lr.reward_amount) as total_amount,
    
    -- 按奖励类型分类
    COUNT(*) FILTER (WHERE lr.layer_position = 'REF') as referral_rewards,
    COUNT(*) FILTER (WHERE lr.layer_position != 'REF') as matrix_rewards,
    
    SUM(lr.reward_amount) FILTER (WHERE lr.layer_position = 'REF') as referral_amount,
    SUM(lr.reward_amount) FILTER (WHERE lr.layer_position != 'REF') as matrix_amount,
    
    COUNT(*) FILTER (WHERE lr.status = 'claimable') as claimable_count,
    COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_count
    
FROM members root_m
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
LEFT JOIN layer_rewards lr ON root_m.wallet_address = lr.reward_recipient_wallet
GROUP BY root_m.activation_sequence, root_u.username, root_m.current_level, root_m.wallet_address
HAVING COUNT(lr.id) > 0
ORDER BY root_m.activation_sequence;

-- 按触发者显示奖励分配
SELECT '=== 按触发者显示奖励分配 ===' as section;
SELECT 
    trigger_m.activation_sequence as trigger_sequence,
    trigger_u.username as trigger_name,
    trigger_m.current_level as trigger_level,
    
    recipient_m.activation_sequence as recipient_sequence,
    recipient_u.username as recipient_name,
    CASE 
        WHEN recipient_m.activation_sequence = 0 THEN 'SUPER ROOT'
        ELSE 'MATRIX ROOT'
    END as recipient_type,
    
    lr.layer_position,
    CASE lr.layer_position 
        WHEN 'REF' THEN '推荐奖励'
        ELSE 'Matrix奖励'
    END as reward_type,
    lr.reward_amount,
    lr.status
    
FROM layer_rewards lr
JOIN members trigger_m ON lr.triggering_member_wallet = trigger_m.wallet_address
JOIN users trigger_u ON trigger_m.wallet_address = trigger_u.wallet_address
JOIN members recipient_m ON lr.reward_recipient_wallet = recipient_m.wallet_address
JOIN users recipient_u ON recipient_m.wallet_address = recipient_u.wallet_address
ORDER BY trigger_m.activation_sequence, recipient_m.activation_sequence;

-- 系统总体统计
SELECT '=== 系统总体统计 ===' as final_section;
WITH system_stats AS (
    SELECT 
        COUNT(*) as total_rewards,
        COUNT(DISTINCT triggering_member_wallet) as unique_triggers,
        COUNT(DISTINCT reward_recipient_wallet) as unique_recipients,
        SUM(reward_amount) as total_amount,
        
        -- 按状态分类
        COUNT(*) FILTER (WHERE status = 'claimable') as claimable_rewards,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_rewards,
        SUM(reward_amount) FILTER (WHERE status = 'claimable') as claimable_amount,
        SUM(reward_amount) FILTER (WHERE status = 'pending') as pending_amount,
        
        -- 按奖励类型分类
        COUNT(*) FILTER (WHERE layer_position = 'REF') as referral_rewards,
        COUNT(*) FILTER (WHERE layer_position != 'REF') as matrix_rewards,
        SUM(reward_amount) FILTER (WHERE layer_position = 'REF') as referral_amount,
        SUM(reward_amount) FILTER (WHERE layer_position != 'REF') as matrix_amount,
        
        -- Super Root统计
        COUNT(*) FILTER (WHERE matrix_layer = 0) as super_root_rewards,
        SUM(reward_amount) FILTER (WHERE matrix_layer = 0) as super_root_amount
    FROM layer_rewards
)
SELECT 
    '总奖励: ' || total_rewards as stat1,
    '触发者: ' || unique_triggers as stat2,
    '受益者: ' || unique_recipients as stat3,
    '总金额: ' || total_amount || ' USDT' as stat4,
    'Claimable: ' || claimable_rewards || ' (' || claimable_amount || ' USDT)' as stat5,
    'Pending: ' || pending_rewards || ' (' || pending_amount || ' USDT)' as stat6,
    '推荐奖励: ' || referral_rewards || ' (' || referral_amount || ' USDT)' as stat7,
    'Matrix奖励: ' || matrix_rewards || ' (' || matrix_amount || ' USDT)' as stat8,
    'Super Root: ' || super_root_rewards || ' (' || super_root_amount || ' USDT)' as stat9
FROM system_stats;

SELECT '✅ 完整的Layer奖励系统：Matrix奖励 + Super Root推荐奖励' as completion;