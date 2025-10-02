-- 修复3x3 Matrix滑落机制和Layer奖励
-- ========================================
-- 正确实现3x3滑落：每3个人填满一个Matrix后，第4个人要开新Matrix
-- ========================================

SELECT '=== 修复3x3 Matrix滑落机制 ===' as status;

-- 第1步：分析当前错误的Matrix安置
-- ========================================

SELECT '=== 当前Matrix安置问题分析 ===' as section;

-- 显示当前安置vs应该的安置
WITH current_placement AS (
    SELECT 
        m.activation_sequence,
        u.username,
        r.matrix_root_wallet,
        root_m.activation_sequence as current_root_seq,
        r.matrix_layer,
        r.matrix_position
    FROM members m
    JOIN users u ON m.wallet_address = u.wallet_address
    LEFT JOIN referrals r ON m.wallet_address = r.member_wallet AND r.matrix_layer > 0
    LEFT JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
    WHERE m.activation_sequence > 0
    ORDER BY m.activation_sequence
)
SELECT 
    activation_sequence as seq,
    username,
    current_root_seq as current_root,
    matrix_layer || matrix_position as current_pos,
    CASE 
        WHEN activation_sequence = 1 THEN 'Super Root L1L (正确)'
        WHEN activation_sequence = 2 THEN 'Super Root L1M (正确)' 
        WHEN activation_sequence = 3 THEN 'Super Root L1R (正确)'
        WHEN activation_sequence = 4 THEN 'Member#1 L1L (正确)'
        WHEN activation_sequence = 5 THEN 'Member#1 L1M (正确)'
        WHEN activation_sequence = 6 THEN 'Member#1 L1R (正确)'
        WHEN activation_sequence = 7 THEN 'Member#2 L1L (应该是Member#2的Matrix)'
        WHEN activation_sequence = 8 THEN 'Member#2 L1M (应该是Member#2的Matrix)' 
        WHEN activation_sequence = 9 THEN 'Member#2 L1R (应该是Member#2的Matrix)'
        WHEN activation_sequence = 10 THEN 'Member#3 L1L (应该是Member#3的Matrix)'
        WHEN activation_sequence = 11 THEN 'Member#3 L1M (应该是Member#3的Matrix)'
        WHEN activation_sequence = 12 THEN 'Member#3 L1R (应该是Member#3的Matrix)'
        ELSE '继续滑落'
    END as correct_placement
FROM current_placement;

-- 第2步：重建正确的3x3 Matrix滑落结构
-- ========================================

DO $$
DECLARE
    super_root_wallet VARCHAR(42);
    member_1_wallet VARCHAR(42);
    member_2_wallet VARCHAR(42); 
    member_3_wallet VARCHAR(42);
    member_4_wallet VARCHAR(42);
    member_7_wallet VARCHAR(42);
    member_8_wallet VARCHAR(42);
    member_9_wallet VARCHAR(42);
    member_10_wallet VARCHAR(42);
    member_11_wallet VARCHAR(42);
    member_12_wallet VARCHAR(42);
BEGIN
    -- 获取相关钱包地址
    SELECT wallet_address INTO super_root_wallet FROM members WHERE activation_sequence = 0;
    SELECT wallet_address INTO member_1_wallet FROM members WHERE activation_sequence = 1;
    SELECT wallet_address INTO member_2_wallet FROM members WHERE activation_sequence = 2;
    SELECT wallet_address INTO member_3_wallet FROM members WHERE activation_sequence = 3;
    SELECT wallet_address INTO member_4_wallet FROM members WHERE activation_sequence = 4;
    SELECT wallet_address INTO member_7_wallet FROM members WHERE activation_sequence = 7;
    SELECT wallet_address INTO member_8_wallet FROM members WHERE activation_sequence = 8;
    SELECT wallet_address INTO member_9_wallet FROM members WHERE activation_sequence = 9;
    SELECT wallet_address INTO member_10_wallet FROM members WHERE activation_sequence = 10;
    SELECT wallet_address INTO member_11_wallet FROM members WHERE activation_sequence = 11;
    SELECT wallet_address INTO member_12_wallet FROM members WHERE activation_sequence = 12;
    
    RAISE NOTICE '开始重建3x3 Matrix滑落结构...';
    
    -- Super Root Matrix: Members 1,2,3 (已正确)
    -- Member #1 Matrix: Members 4,5,6 (已正确)
    
    -- 修正：Member #2 应该有自己的Matrix，Members 7,8,9 安置到他下面
    UPDATE referrals 
    SET matrix_root_wallet = member_2_wallet,
        matrix_root_sequence = 2,
        matrix_layer = 1,
        matrix_position = 'L'
    WHERE member_wallet = member_7_wallet AND matrix_layer > 0;
    
    -- Member #8 应该安置到 Member #2 的 M 位置
    UPDATE referrals 
    SET matrix_root_wallet = member_2_wallet,
        matrix_root_sequence = 2,  
        matrix_layer = 1,
        matrix_position = 'M'
    WHERE member_wallet = member_8_wallet AND matrix_layer > 0;
    
    -- Member #9 应该安置到 Member #2 的 R 位置
    UPDATE referrals 
    SET matrix_root_wallet = member_2_wallet,
        matrix_root_sequence = 2,
        matrix_layer = 1, 
        matrix_position = 'R'
    WHERE member_wallet = member_9_wallet AND matrix_layer > 0;
    
    -- 修正：Member #3 应该有自己的Matrix，Members 10,11,12 安置到他下面
    UPDATE referrals 
    SET matrix_root_wallet = member_3_wallet,
        matrix_root_sequence = 3,
        matrix_layer = 1,
        matrix_position = 'L'
    WHERE member_wallet = member_10_wallet AND matrix_layer > 0;
    
    UPDATE referrals 
    SET matrix_root_wallet = member_3_wallet,
        matrix_root_sequence = 3,
        matrix_layer = 1,
        matrix_position = 'M' 
    WHERE member_wallet = member_11_wallet AND matrix_layer > 0;
    
    UPDATE referrals 
    SET matrix_root_wallet = member_3_wallet,
        matrix_root_sequence = 3,
        matrix_layer = 1,
        matrix_position = 'R'
    WHERE member_wallet = member_12_wallet AND matrix_layer > 0;
    
    RAISE NOTICE '3x3 Matrix滑落结构重建完成';
END $$;

-- 第3步：清除错误的Layer奖励，重新计算正确奖励
-- ========================================

DELETE FROM layer_rewards;

-- 第4步：基于正确的Matrix结构创建Layer奖励
-- ========================================

DO $$
DECLARE
    layer_reward_rec RECORD;
    total_rewards INTEGER := 0;
BEGIN
    RAISE NOTICE '开始基于正确Matrix结构创建Layer奖励...';
    
    -- 遍历所有membership激活，为其matrix_root创建奖励
    FOR layer_reward_rec IN 
        SELECT DISTINCT ON (m.wallet_address)
            m.wallet_address as member_wallet,
            mem.activation_sequence as member_seq,
            mem_u.username as member_name,
            
            r.matrix_root_wallet,
            root_m.activation_sequence as root_seq,
            root_u.username as root_name,
            
            membership.nft_level,
            membership.claim_price,
            r.matrix_layer,
            r.matrix_position
        FROM membership m
        JOIN members mem ON m.wallet_address = mem.wallet_address
        JOIN users mem_u ON mem.wallet_address = mem_u.wallet_address
        JOIN referrals r ON m.wallet_address = r.member_wallet AND r.matrix_layer > 0
        JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address  
        JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
        WHERE mem.activation_sequence > 0  -- 排除Super Root
        ORDER BY m.wallet_address, m.claimed_at DESC  -- 取每个成员最新的membership
    LOOP
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
            layer_reward_rec.member_wallet,
            layer_reward_rec.matrix_root_wallet,
            layer_reward_rec.matrix_root_wallet,
            layer_reward_rec.nft_level,
            layer_reward_rec.claim_price,
            'L' || layer_reward_rec.matrix_layer || layer_reward_rec.matrix_position,
            layer_reward_rec.matrix_layer,
            CASE 
                -- Super Root需要升级到Level 2（72小时pending）
                WHEN layer_reward_rec.root_seq = 0 THEN 'pending'
                -- 其他Matrix Root根据Level和直推确定状态
                ELSE 'claimable'
            END,
            2,
            (SELECT current_level FROM members WHERE wallet_address = layer_reward_rec.matrix_root_wallet),
            CASE WHEN layer_reward_rec.root_seq = 0 THEN false ELSE true END,
            CASE WHEN layer_reward_rec.root_seq = 0 THEN 0 ELSE 3 END,
            (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = layer_reward_rec.matrix_root_wallet AND is_direct_referral = true)::INTEGER,
            CASE 
                WHEN layer_reward_rec.root_seq = 0 THEN NOW() + INTERVAL '72 hours'
                ELSE NOW() + INTERVAL '30 days'
            END
        );
        
        total_rewards := total_rewards + 1;
        
        RAISE NOTICE 'Member % (Seq %): % USDT -> Matrix Root % (Seq %)',
            layer_reward_rec.member_name,
            layer_reward_rec.member_seq,
            layer_reward_rec.claim_price,
            layer_reward_rec.root_name,
            layer_reward_rec.root_seq;
    END LOOP;
    
    RAISE NOTICE 'Layer奖励创建完成: 总计%个奖励', total_rewards;
END $$;

-- 第5步：验证修复后的Matrix和奖励分配
-- ========================================

SELECT '=== 修复后Matrix结构验证 ===' as section;

-- 显示正确的Matrix结构
SELECT 
    root_m.activation_sequence as matrix_root_seq,
    root_u.username as matrix_root_name,
    r.matrix_layer,
    COUNT(*) as members_in_layer,
    string_agg(
        member_m.activation_sequence::text || '(' || r.matrix_position || ')',
        ', ' ORDER BY CASE r.matrix_position WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END
    ) as lmr_positions
FROM members root_m
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
LEFT JOIN referrals r ON root_m.wallet_address = r.matrix_root_wallet AND r.matrix_layer > 0
LEFT JOIN members member_m ON r.member_wallet = member_m.wallet_address
WHERE r.matrix_layer IS NOT NULL
GROUP BY root_m.activation_sequence, root_u.username, r.matrix_layer
ORDER BY root_m.activation_sequence, r.matrix_layer;

-- 显示Layer奖励分配
SELECT '=== Layer奖励分配验证 ===' as rewards_section;

SELECT 
    recipient_m.activation_sequence as recipient_seq,
    recipient_u.username as recipient_name,
    COUNT(lr.id) as rewards_received,
    SUM(lr.reward_amount) as total_amount,
    string_agg(
        'Seq' || trigger_m.activation_sequence::text,
        ', ' ORDER BY trigger_m.activation_sequence
    ) as triggered_by
FROM layer_rewards lr
JOIN members recipient_m ON lr.reward_recipient_wallet = recipient_m.wallet_address
JOIN users recipient_u ON recipient_m.wallet_address = recipient_u.wallet_address
JOIN members trigger_m ON lr.triggering_member_wallet = trigger_m.wallet_address
GROUP BY recipient_m.activation_sequence, recipient_u.username
ORDER BY recipient_m.activation_sequence;

SELECT '✅ 3x3 Matrix滑落和Layer奖励修复完成' as completion;