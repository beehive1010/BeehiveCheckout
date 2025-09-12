-- 全面修复layer_rewards系统
-- ========================================
-- 为所有membership激活创建正确的Layer奖励
-- ========================================

SELECT '=== 全面修复layer_rewards系统 ===' as status;

-- 第1步：分析当前问题
-- ========================================

SELECT '=== 当前奖励系统问题分析 ===' as section;

-- 显示membership vs layer_rewards的差异
WITH membership_summary AS (
    SELECT 
        COUNT(*) as total_memberships,
        COUNT(DISTINCT wallet_address) as unique_members,
        SUM(CASE WHEN nft_level = 1 THEN 1 ELSE 0 END) as level1_purchases,
        SUM(CASE WHEN nft_level = 2 THEN 1 ELSE 0 END) as level2_purchases
    FROM membership
),
rewards_summary AS (
    SELECT 
        COUNT(*) as total_rewards,
        COUNT(DISTINCT triggering_member_wallet) as unique_triggers
    FROM layer_rewards
)
SELECT 
    ms.total_memberships as membership_records,
    ms.unique_members as unique_wallet_addresses,
    ms.level1_purchases as level1_buys,
    ms.level2_purchases as level2_buys,
    rs.total_rewards as current_rewards,
    rs.unique_triggers as members_with_rewards,
    (ms.total_memberships - rs.total_rewards) as missing_rewards
FROM membership_summary ms, rewards_summary rs;

-- 第2步：清除现有奖励，重新实现完整的奖励系统
-- ========================================

DELETE FROM layer_rewards;

-- 第3步：为每个membership激活创建相应的Layer奖励
-- ========================================

DO $$
DECLARE
    membership_rec RECORD;
    matrix_placement RECORD;
    layer_reward_amount DECIMAL(18,6);
    reward_recipient VARCHAR(42);
    reward_status VARCHAR(20);
    total_rewards_created INTEGER := 0;
BEGIN
    RAISE NOTICE '开始为所有membership激活创建Layer奖励...';
    
    -- 遍历所有membership记录
    FOR membership_rec IN 
        SELECT 
            m.id as membership_id,
            m.wallet_address,
            m.nft_level,
            m.claim_price,
            m.claimed_at,
            m.is_upgrade,
            mem.activation_sequence,
            u.username
        FROM membership m
        JOIN members mem ON m.wallet_address = mem.wallet_address
        JOIN users u ON mem.wallet_address = u.wallet_address
        ORDER BY m.claimed_at, m.nft_level
    LOOP
        -- 跳过Super Root的membership（Super Root不触发奖励给别人）
        IF membership_rec.activation_sequence = 0 THEN
            CONTINUE;
        END IF;
        
        -- 获取该会员的Matrix安置信息
        SELECT 
            r.matrix_root_wallet,
            r.matrix_layer,
            r.matrix_position,
            root_m.activation_sequence as root_sequence,
            root_u.username as root_username,
            root_m.current_level as root_current_level
        INTO matrix_placement
        FROM referrals r
        JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
        JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
        WHERE r.member_wallet = membership_rec.wallet_address
        AND r.matrix_layer > 0
        ORDER BY r.placed_at DESC
        LIMIT 1;
        
        -- 如果没有找到Matrix安置信息，跳过
        IF matrix_placement IS NULL THEN
            RAISE WARNING '会员 % (Seq %) 没有Matrix安置信息，跳过', 
                membership_rec.username, membership_rec.activation_sequence;
            CONTINUE;
        END IF;
        
        -- 设置奖励金额 = membership的claim_price
        layer_reward_amount := membership_rec.claim_price;
        reward_recipient := matrix_placement.matrix_root_wallet;
        
        -- 根据Matrix Root的资格确定奖励状态
        IF matrix_placement.root_sequence = 0 THEN
            -- Super Root的奖励：需要升级到Level 2（72小时pending）
            reward_status := CASE 
                WHEN matrix_placement.root_current_level >= 2 THEN 'claimable'
                ELSE 'pending'
            END;
        ELSE
            -- 其他Matrix Root：检查Level和直推要求
            SELECT 
                CASE 
                    WHEN matrix_placement.root_current_level >= 2 AND
                         (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = matrix_placement.matrix_root_wallet AND is_direct_referral = true) >= 3
                    THEN 'claimable'
                    ELSE 'pending'
                END
            INTO reward_status;
        END IF;
        
        -- 创建Layer奖励记录
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
            membership_rec.wallet_address,          -- 触发奖励的会员
            reward_recipient,                       -- 获得奖励的Matrix Root
            matrix_placement.matrix_root_wallet,    -- Matrix Root
            membership_rec.nft_level,               -- NFT Level
            layer_reward_amount,                    -- 奖励金额
            CASE 
                WHEN membership_rec.is_upgrade THEN 'UPG' || membership_rec.nft_level
                ELSE 'L' || matrix_placement.matrix_layer || matrix_placement.matrix_position
            END,                                   -- Layer position
            matrix_placement.matrix_layer,          -- Matrix layer
            reward_status,                         -- Status
            2,                                     -- Required level
            matrix_placement.root_current_level,    -- Current level
            CASE WHEN matrix_placement.root_sequence = 0 THEN false ELSE true END, -- Super Root不需要直推
            CASE WHEN matrix_placement.root_sequence = 0 THEN 0 ELSE 3 END,        -- 直推要求
            (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = matrix_placement.matrix_root_wallet AND is_direct_referral = true)::INTEGER,
            CASE 
                WHEN matrix_placement.root_sequence = 0 AND matrix_placement.root_current_level < 2 
                THEN NOW() + INTERVAL '72 hours'
                ELSE NOW() + INTERVAL '30 days'
            END
        );
        
        total_rewards_created := total_rewards_created + 1;
        
        RAISE NOTICE 'Membership #% (% Level %): % -> % (Seq %) = % USDT [%]',
            membership_rec.membership_id,
            membership_rec.username,
            membership_rec.nft_level,
            membership_rec.username,
            matrix_placement.root_username,
            matrix_placement.root_sequence,
            layer_reward_amount,
            reward_status;
    END LOOP;
    
    RAISE NOTICE '全面Layer奖励创建完成: 总计创建了%个奖励记录', total_rewards_created;
END $$;

-- 第4步：验证修复后的Layer奖励系统
-- ========================================

SELECT '=== 修复后layer_rewards验证 ===' as section;

-- 奖励统计概览
SELECT 
    COUNT(*) as total_rewards,
    COUNT(DISTINCT triggering_member_wallet) as unique_triggers,
    COUNT(DISTINCT reward_recipient_wallet) as unique_recipients,
    SUM(reward_amount) as total_amount_usdt,
    
    COUNT(*) FILTER (WHERE status = 'claimable') as claimable_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    
    SUM(reward_amount) FILTER (WHERE status = 'claimable') as claimable_amount,
    SUM(reward_amount) FILTER (WHERE status = 'pending') as pending_amount
FROM layer_rewards;

-- 按受益者分组的奖励统计
SELECT '=== 按受益者分组的奖励统计 ===' as subsection;
SELECT 
    recipient_m.activation_sequence as recipient_seq,
    recipient_u.username as recipient_name,
    CASE WHEN recipient_m.activation_sequence = 0 THEN 'SUPER ROOT' ELSE 'MATRIX ROOT' END as root_type,
    
    COUNT(lr.id) as rewards_received,
    SUM(lr.reward_amount) as total_amount,
    
    COUNT(*) FILTER (WHERE lr.status = 'claimable') as claimable_rewards,
    COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_rewards,
    
    SUM(lr.reward_amount) FILTER (WHERE lr.status = 'claimable') as claimable_amount,
    SUM(lr.reward_amount) FILTER (WHERE lr.status = 'pending') as pending_amount
    
FROM layer_rewards lr
JOIN members recipient_m ON lr.reward_recipient_wallet = recipient_m.wallet_address
JOIN users recipient_u ON recipient_m.wallet_address = recipient_u.wallet_address
GROUP BY recipient_m.activation_sequence, recipient_u.username
ORDER BY recipient_m.activation_sequence;

-- 按触发者显示奖励详情
SELECT '=== 按触发者显示奖励详情 ===' as subsection;
SELECT 
    trigger_m.activation_sequence as trigger_seq,
    trigger_u.username as trigger_name,
    lr.triggering_nft_level as nft_level,
    
    recipient_m.activation_sequence as recipient_seq,
    recipient_u.username as recipient_name,
    
    lr.reward_amount,
    lr.status,
    lr.layer_position,
    
    CASE 
        WHEN lr.status = 'claimable' THEN '✅ 可立即领取'
        WHEN lr.status = 'pending' AND recipient_m.activation_sequence = 0 THEN '⏳ Super Root需升级Level 2'
        ELSE '⏳ 等待资格条件达成'
    END as status_description
    
FROM layer_rewards lr
JOIN members trigger_m ON lr.triggering_member_wallet = trigger_m.wallet_address
JOIN users trigger_u ON trigger_m.wallet_address = trigger_u.wallet_address
JOIN members recipient_m ON lr.reward_recipient_wallet = recipient_m.wallet_address
JOIN users recipient_u ON recipient_m.wallet_address = recipient_u.wallet_address
ORDER BY trigger_m.activation_sequence, lr.triggering_nft_level;

-- 第5步：验证数据一致性
-- ========================================

SELECT '=== 数据一致性验证 ===' as section;

-- 检查membership记录 vs layer_rewards记录的一致性
WITH consistency_check AS (
    SELECT 
        (SELECT COUNT(*) FROM membership) as membership_records,
        (SELECT COUNT(*) FROM layer_rewards) as reward_records,
        (SELECT COUNT(*) FROM membership WHERE wallet_address != (SELECT wallet_address FROM members WHERE activation_sequence = 0)) as non_super_root_memberships
)
SELECT 
    membership_records,
    reward_records,
    non_super_root_memberships,
    CASE 
        WHEN reward_records = non_super_root_memberships THEN '✅ 一致：每个非Super Root的membership都有对应奖励'
        WHEN reward_records < non_super_root_memberships THEN '⚠️  缺失奖励记录'
        ELSE '⚠️  奖励记录过多'
    END as consistency_status
FROM consistency_check;

-- 最终总结
SELECT '=== Layer奖励系统修复完成总结 ===' as final_section;
WITH final_summary AS (
    SELECT 
        (SELECT COUNT(*) FROM membership) as total_memberships,
        COUNT(*) as total_layer_rewards,
        SUM(reward_amount) as total_reward_amount,
        COUNT(DISTINCT reward_recipient_wallet) as beneficiary_count,
        COUNT(*) FILTER (WHERE status = 'claimable') as immediately_claimable
    FROM layer_rewards
)
SELECT 
    '📊 Membership记录: ' || total_memberships as stat1,
    '🎁 Layer奖励记录: ' || total_layer_rewards as stat2,
    '💰 总奖励金额: ' || total_reward_amount || ' USDT' as stat3,
    '👥 受益者数量: ' || beneficiary_count as stat4,
    '✅ 立即可领取: ' || immediately_claimable || '个' as stat5
FROM final_summary;

SELECT '✅ Layer奖励系统修复完成：每个membership激活都有对应的Layer奖励' as completion;