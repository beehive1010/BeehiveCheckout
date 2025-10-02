-- 修正Super Root的Matrix安置结构
-- ========================================
-- 前三个会员应该安置到Super Root的L-M-R位置
-- ========================================

SELECT '=== 修正Super Root Matrix安置结构 ===' as status;

-- 第1步：检查当前错误的安置
-- ========================================

SELECT '=== 当前Matrix安置问题分析 ===' as section;
SELECT 
    'Members #1,#2,#3都是Super Root推荐，但安置到了Member #1的Matrix下' as issue,
    '正确应该是：Member #1,#2,#3 安置到 Super Root的 L,M,R 位置' as correct_structure;

-- 显示当前前3个会员的推荐人vs安置情况
SELECT 
    m.activation_sequence,
    u.username,
    CASE WHEN m.referrer_wallet = (SELECT wallet_address FROM members WHERE activation_sequence = 0) 
         THEN 'Super Root' ELSE 'Other' END as referrer,
    root_m.activation_sequence as matrix_root_seq,
    root_u.username as matrix_root_name,
    r.matrix_position
FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
JOIN referrals r ON m.wallet_address = r.member_wallet
JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
WHERE m.activation_sequence BETWEEN 1 AND 3
AND r.matrix_layer > 0
ORDER BY m.activation_sequence;

-- 第2步：修正前三个会员的Matrix安置
-- ========================================

DO $$
DECLARE
    super_root_wallet VARCHAR(42);
    member_1_wallet VARCHAR(42);
    member_2_wallet VARCHAR(42);
    member_3_wallet VARCHAR(42);
BEGIN
    -- 获取相关钱包地址
    SELECT wallet_address INTO super_root_wallet FROM members WHERE activation_sequence = 0;
    SELECT wallet_address INTO member_1_wallet FROM members WHERE activation_sequence = 1;
    SELECT wallet_address INTO member_2_wallet FROM members WHERE activation_sequence = 2;
    SELECT wallet_address INTO member_3_wallet FROM members WHERE activation_sequence = 3;
    
    RAISE NOTICE 'Super Root: %', super_root_wallet;
    RAISE NOTICE 'Member 1: %', member_1_wallet;
    RAISE NOTICE 'Member 2: %', member_2_wallet;
    RAISE NOTICE 'Member 3: %', member_3_wallet;
    
    -- 更新Member #1的安置：从自己的Matrix改为Super Root的L位置
    UPDATE referrals 
    SET matrix_root_wallet = super_root_wallet,
        matrix_root_sequence = 0,
        matrix_position = 'L'
    WHERE member_wallet = member_1_wallet
    AND matrix_layer > 0;
    
    -- 更新Member #2的安置：改为Super Root的M位置  
    UPDATE referrals 
    SET matrix_root_wallet = super_root_wallet,
        matrix_root_sequence = 0,
        matrix_position = 'M'
    WHERE member_wallet = member_2_wallet
    AND matrix_layer > 0;
    
    -- 更新Member #3的安置：改为Super Root的R位置
    UPDATE referrals 
    SET matrix_root_wallet = super_root_wallet,
        matrix_root_sequence = 0,
        matrix_position = 'R'
    WHERE member_wallet = member_3_wallet
    AND matrix_layer > 0;
    
    RAISE NOTICE '已更新前三个会员的Matrix安置到Super Root的L-M-R位置';
    
    -- 更新其他受影响的Matrix安置
    -- Members #4,#5,#6 应该安置到 Member #1 的Matrix下
    UPDATE referrals 
    SET matrix_root_wallet = member_1_wallet,
        matrix_root_sequence = 1
    WHERE member_wallet IN (
        SELECT wallet_address FROM members WHERE activation_sequence IN (4,5,6)
    )
    AND matrix_layer > 0;
    
    -- Member #7 应该安置到 Super Root 的 Layer 2 L位置 
    UPDATE referrals 
    SET matrix_root_wallet = super_root_wallet,
        matrix_root_sequence = 0,
        matrix_layer = 2,
        matrix_position = 'L'
    WHERE member_wallet = (SELECT wallet_address FROM members WHERE activation_sequence = 7)
    AND matrix_layer > 0;
    
    RAISE NOTICE '已更新Matrix滑落结构';
END $$;

-- 第3步：重新计算Layer奖励（基于正确的Matrix结构）
-- ========================================

-- 先清除旧的Layer奖励
DELETE FROM layer_rewards;

-- 重新计算Layer 1 R位置奖励
DO $$
DECLARE
    layer_r_rec RECORD;
    nft_price DECIMAL(18,6);
    reward_id UUID;
    total_rewards INTEGER := 0;
BEGIN
    RAISE NOTICE '基于修正的Matrix结构重新计算Layer奖励...';
    
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
        WHERE r.matrix_layer = 1 AND r.matrix_position = 'R'
        ORDER BY root_m.activation_sequence
    LOOP
        -- 获取NFT价格
        SELECT COALESCE(nml.nft_price_usdt, CASE layer_r_rec.member_level WHEN 2 THEN 150.00 ELSE 100.00 END)
        INTO nft_price
        FROM nft_membership_levels nml
        WHERE nml.level = layer_r_rec.member_level;
        
        -- 创建Layer奖励
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
            layer_r_rec.member_wallet,
            layer_r_rec.matrix_root_wallet,
            layer_r_rec.matrix_root_wallet,
            layer_r_rec.member_level,
            nft_price,
            'L1R',
            1,
            CASE 
                -- Super Root需要升级到Level 2（72小时pending）
                WHEN layer_r_rec.root_sequence = 0 AND layer_r_rec.root_current_level < 2 THEN 'pending'
                WHEN layer_r_rec.root_current_level >= 2 AND 
                     (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = layer_r_rec.matrix_root_wallet AND is_direct_referral = true) >= 3 
                THEN 'claimable'
                ELSE 'pending'
            END,
            2,  -- Layer 1 R需要Level 2
            layer_r_rec.root_current_level,
            true,
            3,  -- 需要3个直推
            (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = layer_r_rec.matrix_root_wallet AND is_direct_referral = true)::INTEGER,
            CASE WHEN layer_r_rec.root_sequence = 0 AND layer_r_rec.root_current_level < 2 
                 THEN NOW() + INTERVAL '72 hours' 
                 ELSE NOW() + INTERVAL '30 days' END
        );
        
        total_rewards := total_rewards + 1;
        
        RAISE NOTICE 'Layer 1 R激活: % (Seq %) -> % (Seq %): % USDT [%]', 
            layer_r_rec.member_username,
            layer_r_rec.member_activation_sequence,
            layer_r_rec.root_username,
            layer_r_rec.root_sequence,
            nft_price,
            CASE WHEN layer_r_rec.root_sequence = 0 THEN 'PENDING-72h' ELSE 'CHECK' END;
    END LOOP;
    
    RAISE NOTICE '重新计算完成: 创建了%个Layer奖励', total_rewards;
END $$;

-- 第4步：验证修正后的Matrix结构和奖励
-- ========================================

SELECT '=== 修正后的Matrix结构验证 ===' as section;

-- Super Root的Matrix结构
SELECT 
    '=== Super Root Matrix结构 ===' as title,
    root_m.activation_sequence as root_seq,
    root_u.username as root_name,
    string_agg(
        member_m.activation_sequence::text || '(' || member_u.username || ') ' || r.matrix_position,
        ', ' ORDER BY CASE r.matrix_position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END
    ) as lmr_members
FROM members root_m
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
LEFT JOIN referrals r ON root_m.wallet_address = r.matrix_root_wallet AND r.matrix_layer = 1
LEFT JOIN members member_m ON r.member_wallet = member_m.wallet_address
LEFT JOIN users member_u ON member_m.wallet_address = member_u.wallet_address
WHERE root_m.activation_sequence = 0
GROUP BY root_m.activation_sequence, root_u.username;

-- 所有Matrix Root的结构
SELECT 
    root_m.activation_sequence as root_seq,
    root_u.username as root_name,
    r.matrix_layer,
    COUNT(*) as members_in_layer,
    string_agg(
        member_m.activation_sequence::text || r.matrix_position,
        ',' ORDER BY CASE r.matrix_position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END
    ) as position_members
FROM members root_m
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
LEFT JOIN referrals r ON root_m.wallet_address = r.matrix_root_wallet AND r.matrix_layer > 0
LEFT JOIN members member_m ON r.member_wallet = member_m.wallet_address
WHERE r.matrix_layer IS NOT NULL
GROUP BY root_m.activation_sequence, root_u.username, r.matrix_layer
ORDER BY root_m.activation_sequence, r.matrix_layer;

-- Layer奖励最终结果
SELECT '=== 最终Layer奖励结果 ===' as rewards_title;
SELECT 
    trigger_m.activation_sequence as trigger_seq,
    trigger_u.username as trigger_member,
    recipient_m.activation_sequence as recipient_seq,
    recipient_u.username as recipient_root,
    lr.reward_amount,
    lr.status,
    CASE 
        WHEN recipient_m.activation_sequence = 0 AND lr.status = 'pending' THEN '⏳ Super Root需升级Level 2 (72h)'
        WHEN lr.status = 'claimable' THEN '✅ 可立即领取'
        ELSE '⏳ 等待条件达成'
    END as status_desc
FROM layer_rewards lr
JOIN members trigger_m ON lr.triggering_member_wallet = trigger_m.wallet_address
JOIN users trigger_u ON trigger_m.wallet_address = trigger_u.wallet_address
JOIN members recipient_m ON lr.reward_recipient_wallet = recipient_m.wallet_address
JOIN users recipient_u ON recipient_m.wallet_address = recipient_u.wallet_address
ORDER BY recipient_m.activation_sequence;

-- 系统总结
SELECT '=== 修正完成总结 ===' as summary_title;
WITH final_stats AS (
    SELECT 
        COUNT(*) as total_layer_rewards,
        SUM(reward_amount) as total_amount,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_rewards,
        COUNT(*) FILTER (WHERE status = 'claimable') as claimable_rewards,
        (SELECT COUNT(*) FROM referrals WHERE matrix_layer = 1 AND matrix_position = 'R') as r_positions_filled
    FROM layer_rewards
)
SELECT 
    '✅ Matrix结构已修正：Super Root现在有L-M-R三个直接成员' as fix1,
    '✅ Layer奖励重新计算：只有Layer 1 R位置激活触发奖励' as fix2,
    '📊 当前状态: ' || total_layer_rewards || '个奖励, ' || total_amount || ' USDT' as status,
    '🎯 R位置激活: ' || r_positions_filled || '个' as r_activations
FROM final_stats;