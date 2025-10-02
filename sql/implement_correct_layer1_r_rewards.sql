-- 实现正确的Layer1 R位置奖励机制
-- ========================================
-- 只有Layer 1的R位置被激活时才触发Layer奖励
-- ========================================

SELECT '=== 实现正确的Layer1 R位置奖励机制 ===' as status;

-- 第1步：分析当前Matrix结构，找出Layer 1的R位置激活
-- ========================================

SELECT '=== 分析Matrix结构：Layer 1的R位置激活 ===' as section;
SELECT 
    r.member_activation_sequence,
    member_u.username as member_name,
    root_u.username as matrix_root_name,
    root_m.activation_sequence as root_sequence,
    r.matrix_layer,
    r.matrix_position,
    r.is_direct_referral,
    m.current_level as member_level,
    CASE WHEN r.matrix_layer = 1 AND r.matrix_position = 'R' THEN '✅ 触发Layer奖励' ELSE '' END as reward_trigger
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
JOIN users member_u ON m.wallet_address = member_u.wallet_address
JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
WHERE r.matrix_layer > 0  -- 排除Super Root的特殊记录
ORDER BY root_m.activation_sequence, r.matrix_layer, 
         CASE r.matrix_position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END;

-- 第2步：为每个Layer 1 R位置激活创建Layer奖励
-- ========================================

DO $$
DECLARE
    layer_r_rec RECORD;
    nft_price DECIMAL(18,6);
    reward_id UUID;
    total_rewards_created INTEGER := 0;
BEGIN
    RAISE NOTICE '开始为Layer 1 R位置激活创建Layer奖励...';
    
    -- 找到所有Layer 1的R位置激活
    FOR layer_r_rec IN 
        SELECT 
            r.member_wallet,
            r.member_activation_sequence,
            r.matrix_root_wallet,
            root_m.activation_sequence as root_sequence,
            root_u.username as root_username,
            member_u.username as member_username,
            m.current_level as member_level,
            root_m.current_level as root_current_level
        FROM referrals r
        JOIN members m ON r.member_wallet = m.wallet_address
        JOIN users member_u ON m.wallet_address = member_u.wallet_address
        JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
        JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
        WHERE r.matrix_layer = 1  -- Layer 1
        AND r.matrix_position = 'R'  -- R位置
        ORDER BY root_m.activation_sequence
    LOOP
        -- 获取触发Layer奖励的NFT价格
        SELECT nml.nft_price_usdt INTO nft_price
        FROM nft_membership_levels nml
        WHERE nml.level = layer_r_rec.member_level;
        
        IF nft_price IS NULL THEN
            nft_price := CASE layer_r_rec.member_level WHEN 2 THEN 150.00 ELSE 100.00 END;
        END IF;
        
        -- 创建Layer奖励给matrix_root
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
            layer_r_rec.member_wallet,              -- 触发奖励的R位置成员
            layer_r_rec.matrix_root_wallet,         -- 获得奖励的matrix_root
            layer_r_rec.matrix_root_wallet,         -- matrix_root_wallet
            layer_r_rec.member_level,               -- triggering_nft_level
            nft_price,                              -- Layer奖励 = NFT price (100 USDT)
            'L1R',                                  -- Layer 1 R位置奖励
            1,                                      -- matrix_layer = 1
            CASE 
                -- Super Root (sequence 0) 需要升级到Level 2，72小时pending
                WHEN layer_r_rec.root_sequence = 0 AND layer_r_rec.root_current_level < 2 THEN 'pending'
                -- 其他Root需要满足相应条件
                WHEN layer_r_rec.root_current_level >= 2 THEN 'claimable'
                ELSE 'pending'
            END,
            2,                                      -- Layer 1 R需要Level 2
            layer_r_rec.root_current_level,         -- 当前level
            true,                                   -- 需要直推要求
            3,                                      -- Layer 1需要3个直推
            (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = layer_r_rec.matrix_root_wallet AND is_direct_referral = true)::INTEGER,
            CASE 
                WHEN layer_r_rec.root_sequence = 0 AND layer_r_rec.root_current_level < 2 
                THEN NOW() + INTERVAL '72 hours'  -- Super Root 72小时后可能变为claimable
                ELSE NOW() + INTERVAL '30 days'   -- 30天过期
            END
        ) RETURNING id INTO reward_id;
        
        total_rewards_created := total_rewards_created + 1;
        
        RAISE NOTICE 'Layer 1 R位置激活: 会员 % (Seq %) -> Matrix Root % (Seq %): % USDT 奖励 [%]', 
            layer_r_rec.member_username,
            layer_r_rec.member_activation_sequence,
            layer_r_rec.root_username,
            layer_r_rec.root_sequence,
            nft_price,
            CASE WHEN layer_r_rec.root_sequence = 0 AND layer_r_rec.root_current_level < 2 
                 THEN 'PENDING - 需要升级Level 2' 
                 ELSE 'CLAIMABLE' END;
    END LOOP;
    
    RAISE NOTICE 'Layer 1 R位置奖励创建完成: 总计创建了%个奖励记录', total_rewards_created;
END $$;

-- 第3步：验证Layer 1 R位置奖励结果
-- ========================================

SELECT '=== Layer 1 R位置奖励验证 ===' as section;

-- 显示所有Layer奖励记录
SELECT 
    trigger_m.activation_sequence as trigger_seq,
    trigger_u.username as trigger_member,
    
    recipient_m.activation_sequence as recipient_seq,
    recipient_u.username as recipient_root,
    CASE WHEN recipient_m.activation_sequence = 0 THEN 'SUPER ROOT' ELSE 'MATRIX ROOT' END as root_type,
    
    lr.reward_amount,
    lr.status,
    lr.layer_position,
    
    -- 资格检查
    lr.recipient_current_level as current_level,
    lr.recipient_required_level as required_level,
    lr.direct_referrals_current as current_refs,
    lr.direct_referrals_required as required_refs,
    
    CASE 
        WHEN lr.status = 'claimable' THEN '✅ 可立即领取'
        WHEN lr.status = 'pending' AND recipient_m.activation_sequence = 0 THEN '⏳ Super Root需升级Level 2 (72小时)'
        ELSE '⏳ 等待资格达成'
    END as status_description
    
FROM layer_rewards lr
JOIN members trigger_m ON lr.triggering_member_wallet = trigger_m.wallet_address
JOIN users trigger_u ON trigger_m.wallet_address = trigger_u.wallet_address
JOIN members recipient_m ON lr.reward_recipient_wallet = recipient_m.wallet_address
JOIN users recipient_u ON recipient_m.wallet_address = recipient_u.wallet_address
ORDER BY recipient_m.activation_sequence;

-- 第4步：显示Matrix完整结构与奖励对应关系
-- ========================================

SELECT '=== Matrix完整结构与Layer奖励对应 ===' as section;

-- 按Matrix Root分组显示结构和奖励
WITH matrix_summary AS (
    SELECT 
        root_m.activation_sequence as root_seq,
        root_u.username as root_name,
        root_m.current_level as root_level,
        
        -- Matrix结构统计
        COUNT(*) FILTER (WHERE r.matrix_layer = 1 AND r.matrix_position = 'L') as l_count,
        COUNT(*) FILTER (WHERE r.matrix_layer = 1 AND r.matrix_position = 'M') as m_count,
        COUNT(*) FILTER (WHERE r.matrix_layer = 1 AND r.matrix_position = 'R') as r_count,
        
        -- Layer 1填满情况
        CASE WHEN COUNT(*) FILTER (WHERE r.matrix_layer = 1) = 3 THEN '✅ Layer 1满员' 
             ELSE '⚠️  Layer 1未满 (' || COUNT(*) FILTER (WHERE r.matrix_layer = 1) || '/3)' END as layer1_status,
             
        -- 是否有R位置（触发奖励条件）
        COUNT(*) FILTER (WHERE r.matrix_layer = 1 AND r.matrix_position = 'R') > 0 as has_r_position,
        
        -- 总下级数
        COUNT(*) FILTER (WHERE r.matrix_layer > 0) as total_downstream
        
    FROM members root_m
    JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
    LEFT JOIN referrals r ON root_m.wallet_address = r.matrix_root_wallet 
                          AND r.member_wallet != root_m.wallet_address  -- 排除自己
    GROUP BY root_m.activation_sequence, root_u.username, root_m.current_level, root_m.wallet_address
),
reward_summary AS (
    SELECT 
        recipient_m.activation_sequence as root_seq,
        COUNT(*) as reward_count,
        SUM(lr.reward_amount) as total_amount,
        string_agg(lr.status, ', ') as reward_statuses
    FROM layer_rewards lr
    JOIN members recipient_m ON lr.reward_recipient_wallet = recipient_m.wallet_address
    GROUP BY recipient_m.activation_sequence
)
SELECT 
    ms.root_seq,
    ms.root_name,
    ms.root_level,
    ms.layer1_status,
    ms.l_count || '-' || ms.m_count || '-' || ms.r_count as lmr_structure,
    ms.total_downstream as total_members,
    
    CASE WHEN ms.has_r_position THEN '🎯 有R位置激活' ELSE '❌ 无R位置激活' END as r_activation,
    
    COALESCE(rs.reward_count, 0) as layer_rewards,
    COALESCE(rs.total_amount, 0) as reward_amount,
    COALESCE(rs.reward_statuses, 'N/A') as reward_status
    
FROM matrix_summary ms
LEFT JOIN reward_summary rs ON ms.root_seq = rs.root_seq
WHERE ms.root_seq = 0 OR ms.total_downstream > 0  -- 显示Super Root或有下级的Root
ORDER BY ms.root_seq;

-- 第5步：系统总结
-- ========================================

SELECT '=== Layer 1 R位置奖励系统总结 ===' as final_section;

WITH system_stats AS (
    SELECT 
        (SELECT COUNT(*) FROM members WHERE activation_sequence > 0) as total_members,
        (SELECT COUNT(DISTINCT matrix_root_wallet) FROM referrals WHERE matrix_layer > 0) as active_roots,
        (SELECT COUNT(*) FROM referrals WHERE matrix_layer = 1 AND matrix_position = 'R') as r_positions_filled,
        COUNT(*) as total_layer_rewards,
        SUM(reward_amount) as total_reward_amount,
        COUNT(*) FILTER (WHERE status = 'claimable') as claimable_rewards,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_rewards,
        SUM(reward_amount) FILTER (WHERE status = 'claimable') as claimable_amount,
        SUM(reward_amount) FILTER (WHERE status = 'pending') as pending_amount
    FROM layer_rewards
)
SELECT 
    '总会员数: ' || total_members as stat1,
    '活跃Matrix Roots: ' || active_roots as stat2,
    'Layer 1 R位置填满: ' || r_positions_filled as stat3,
    'Layer奖励记录: ' || total_layer_rewards as stat4,
    'Claimable: ' || claimable_rewards || ' (' || claimable_amount || ' USDT)' as stat5,
    'Pending: ' || pending_rewards || ' (' || pending_amount || ' USDT)' as stat6,
    '总奖励金额: ' || total_reward_amount || ' USDT' as stat7
FROM system_stats;

SELECT '✅ Layer奖励机制：只有Layer 1 R位置激活才触发奖励' as mechanism_summary;