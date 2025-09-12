-- 修复正确的Layer奖励分配机制
-- ========================================
-- 重新实现正确的Layer奖励逻辑：给安置路径上的matrix_root发奖励
-- ========================================

-- 第1步：理解正确的奖励机制
-- ========================================

SELECT '=== 修复正确的Layer奖励分配机制 ===' as status;

-- 清除之前错误的奖励记录
DELETE FROM layer_rewards;

-- 显示当前Matrix结构用于理解奖励分配
SELECT '=== 当前Matrix结构分析 ===' as section;
SELECT 
    r.member_activation_sequence,
    LEFT(r.member_wallet, 10) || '...' as member_short,
    LEFT(r.matrix_root_wallet, 10) || '...' as matrix_root_short,
    root_m.activation_sequence as root_sequence,
    r.matrix_layer,
    r.matrix_position,
    r.is_direct_referral
FROM referrals r
JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
ORDER BY r.member_activation_sequence;

-- 第2步：重新创建正确的Layer奖励计算函数
-- ========================================

-- 正确的Layer奖励计算函数：给安置路径上的matrix_root发奖励
CREATE OR REPLACE FUNCTION calculate_correct_layer_rewards(
    p_new_member_wallet VARCHAR(42),
    p_nft_level INTEGER
) RETURNS JSONB AS $$
DECLARE
    placement_record RECORD;
    nft_price DECIMAL(18,6);
    result JSONB := '[]'::jsonb;
    reward_id UUID;
    layer_count INTEGER := 0;
BEGIN
    -- 获取新会员的placement信息
    SELECT 
        r.matrix_root_wallet,
        r.matrix_layer,
        r.matrix_position,
        root_m.activation_sequence as root_sequence
    INTO placement_record
    FROM referrals r
    JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
    WHERE r.member_wallet = p_new_member_wallet
    ORDER BY r.placed_at DESC
    LIMIT 1;
    
    IF placement_record IS NULL THEN
        RETURN jsonb_build_object('error', 'No placement record found for new member');
    END IF;
    
    -- 获取NFT价格
    SELECT nml.nft_price_usdt INTO nft_price
    FROM nft_membership_levels nml
    WHERE nml.level = p_nft_level;
    
    IF nft_price IS NULL THEN
        nft_price := CASE p_nft_level WHEN 2 THEN 150.00 ELSE 100.00 END;
    END IF;
    
    -- Layer 1奖励：直接给placement的matrix_root
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
    )
    SELECT 
        p_new_member_wallet,                    -- triggering_member_wallet
        placement_record.matrix_root_wallet,    -- reward_recipient_wallet (获得Layer 1奖励)
        placement_record.matrix_root_wallet,    -- matrix_root_wallet
        p_nft_level,                            -- triggering_nft_level
        nft_price,                              -- reward_amount (Layer奖励 = NFT price)
        'L1',                                   -- layer_position
        1,                                      -- matrix_layer (Layer 1)
        'pending',                              -- status (默认pending，需要检查资格)
        2,                                      -- recipient_required_level (Layer 1需要Level 2)
        (SELECT current_level FROM members WHERE wallet_address = placement_record.matrix_root_wallet),
        true,                                   -- requires_direct_referrals
        3,                                      -- direct_referrals_required
        (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = placement_record.matrix_root_wallet AND is_direct_referral = true)::INTEGER,
        NOW() + INTERVAL '30 days'
    RETURNING id INTO reward_id;
    
    layer_count := layer_count + 1;
    
    result := result || jsonb_build_object(
        'layer', 1,
        'reward_id', reward_id,
        'recipient_wallet', placement_record.matrix_root_wallet,
        'recipient_sequence', placement_record.root_sequence,
        'amount_usdt', nft_price,
        'reward_type', 'Layer 1 - Direct Matrix Root'
    );
    
    -- Layer 2+ 奖励：给上级matrix_root们
    DECLARE
        current_member_wallet VARCHAR(42) := placement_record.matrix_root_wallet;
        layer_num INTEGER;
        upper_matrix_root VARCHAR(42);
        upper_root_sequence INTEGER;
    BEGIN
        FOR layer_num IN 2..19 LOOP
            -- 寻找当前成员的上级matrix_root
            SELECT 
                r.matrix_root_wallet,
                root_m.activation_sequence
            INTO upper_matrix_root, upper_root_sequence
            FROM referrals r
            JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
            WHERE r.member_wallet = current_member_wallet
            AND r.matrix_layer > 0  -- 排除特殊记录
            ORDER BY r.placed_at DESC
            LIMIT 1;
            
            EXIT WHEN upper_matrix_root IS NULL;
            EXIT WHEN upper_matrix_root = current_member_wallet; -- 避免循环
            
            -- 创建上级Layer奖励
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
            )
            VALUES (
                p_new_member_wallet,
                upper_matrix_root,                  -- 上级matrix_root获得奖励
                upper_matrix_root,
                p_nft_level,
                nft_price,
                'L' || layer_num,
                layer_num,
                'pending',
                CASE 
                    WHEN layer_num <= 3 THEN 3
                    WHEN layer_num <= 6 THEN 5
                    WHEN layer_num <= 10 THEN 8
                    WHEN layer_num <= 15 THEN 12
                    ELSE 19
                END,
                (SELECT current_level FROM members WHERE wallet_address = upper_matrix_root),
                true,
                CASE 
                    WHEN layer_num <= 3 THEN 5
                    WHEN layer_num <= 6 THEN 10
                    WHEN layer_num <= 10 THEN 20
                    WHEN layer_num <= 15 THEN 50
                    ELSE 100
                END,
                (SELECT COUNT(*) FROM referrals WHERE matrix_root_wallet = upper_matrix_root AND is_direct_referral = true)::INTEGER,
                NOW() + INTERVAL '30 days'
            ) RETURNING id INTO reward_id;
            
            layer_count := layer_count + 1;
            
            result := result || jsonb_build_object(
                'layer', layer_num,
                'reward_id', reward_id,
                'recipient_wallet', upper_matrix_root,
                'recipient_sequence', upper_root_sequence,
                'amount_usdt', nft_price,
                'reward_type', 'Layer ' || layer_num || ' - Upper Matrix Root'
            );
            
            -- 移动到下一个上级
            current_member_wallet := upper_matrix_root;
        END LOOP;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'new_member', p_new_member_wallet,
        'nft_level', p_nft_level,
        'nft_price_usdt', nft_price,
        'total_layers_processed', layer_count,
        'layer_rewards', result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', 'Correct layer reward calculation failed: ' || SQLERRM,
            'new_member', p_new_member_wallet
        );
END;
$$ LANGUAGE plpgsql;

-- 第3步：为所有会员重新计算正确的Layer奖励
-- ========================================

DO $$
DECLARE
    member_rec RECORD;
    calculation_result JSONB;
    total_processed INTEGER := 0;
    total_rewards_created INTEGER := 0;
BEGIN
    RAISE NOTICE '开始重新计算正确的Layer奖励分配...';
    
    -- 按激活顺序处理所有会员（包括那些安置到Super Root下的）
    FOR member_rec IN 
        SELECT 
            r.member_wallet,
            r.member_activation_sequence,
            m.current_level,
            root_m.activation_sequence as matrix_root_sequence
        FROM referrals r
        JOIN members m ON r.member_wallet = m.wallet_address
        JOIN members root_m ON r.matrix_root_wallet = root_m.wallet_address
        WHERE r.matrix_layer >= 0  -- 包括所有正常的Matrix记录
        ORDER BY r.member_activation_sequence
    LOOP
        -- 跳过Super Root自己
        IF member_rec.member_activation_sequence = 0 THEN
            CONTINUE;
        END IF;
        
        -- 为每个会员计算层级奖励
        SELECT calculate_correct_layer_rewards(
            member_rec.member_wallet,
            member_rec.current_level
        ) INTO calculation_result;
        
        total_processed := total_processed + 1;
        
        -- 检查是否成功创建奖励
        IF calculation_result->>'success' = 'true' THEN
            total_rewards_created := total_rewards_created + (calculation_result->>'total_layers_processed')::INTEGER;
            RAISE NOTICE 'Member % (Sequence %) -> Matrix Root %: Created % layer rewards', 
                LEFT(member_rec.member_wallet, 10) || '...', 
                member_rec.member_activation_sequence,
                member_rec.matrix_root_sequence,
                calculation_result->>'total_layers_processed';
        ELSE
            RAISE WARNING 'Member % (Sequence %): Failed - %', 
                LEFT(member_rec.member_wallet, 10) || '...', 
                member_rec.member_activation_sequence,
                calculation_result->>'error';
        END IF;
    END LOOP;
    
    RAISE NOTICE '正确的Layer奖励计算完成: 处理了%个会员, 创建了%个奖励记录', total_processed, total_rewards_created;
END $$;

-- 第4步：更新奖励状态（检查资格条件）
-- ========================================

-- 更新符合资格条件的奖励为claimable状态
UPDATE layer_rewards 
SET status = 'claimable'
WHERE status = 'pending'
AND recipient_current_level >= recipient_required_level
AND direct_referrals_current >= direct_referrals_required;

-- 第5步：验证正确的奖励分配
-- ========================================

SELECT '=== 正确的Layer奖励分配验证 ===' as section;

-- 显示每个Matrix Root获得的奖励统计
SELECT 
    root_m.activation_sequence as root_sequence,
    root_u.username as root_username,
    root_m.current_level as root_level,
    COUNT(lr.id) as total_rewards,
    COUNT(*) FILTER (WHERE lr.status = 'claimable') as claimable_rewards,
    COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_rewards,
    SUM(lr.reward_amount) as total_amount,
    SUM(lr.reward_amount) FILTER (WHERE lr.status = 'claimable') as claimable_amount
FROM members root_m
JOIN users root_u ON root_m.wallet_address = root_u.wallet_address
LEFT JOIN layer_rewards lr ON root_m.wallet_address = lr.reward_recipient_wallet
GROUP BY root_m.activation_sequence, root_u.username, root_m.current_level, root_m.wallet_address
HAVING COUNT(lr.id) > 0
ORDER BY root_m.activation_sequence;

-- 显示Layer分布统计
SELECT '=== Layer奖励分布统计 ===' as section;
SELECT 
    lr.matrix_layer,
    COUNT(*) as reward_count,
    COUNT(DISTINCT lr.reward_recipient_wallet) as unique_recipients,
    SUM(lr.reward_amount) as layer_total_amount,
    COUNT(*) FILTER (WHERE lr.status = 'claimable') as claimable_count,
    COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_count
FROM layer_rewards lr
GROUP BY lr.matrix_layer
ORDER BY lr.matrix_layer;

-- 显示触发者分析（谁的激活产生了最多奖励）
SELECT '=== 奖励触发者分析 ===' as section;
SELECT 
    trigger_m.activation_sequence as trigger_sequence,
    trigger_u.username as trigger_username,
    COUNT(lr.id) as rewards_triggered,
    SUM(lr.reward_amount) as total_triggered_amount,
    COUNT(DISTINCT lr.reward_recipient_wallet) as beneficiaries_count
FROM layer_rewards lr
JOIN members trigger_m ON lr.triggering_member_wallet = trigger_m.wallet_address
JOIN users trigger_u ON trigger_m.wallet_address = trigger_u.wallet_address
GROUP BY trigger_m.activation_sequence, trigger_u.username
ORDER BY trigger_m.activation_sequence;

-- 最终总结
SELECT '=== 正确Layer奖励系统总结 ===' as final_section;
WITH system_stats AS (
    SELECT 
        COUNT(DISTINCT lr.triggering_member_wallet) as trigger_members,
        COUNT(DISTINCT lr.reward_recipient_wallet) as recipient_members,
        COUNT(*) as total_rewards,
        SUM(lr.reward_amount) as total_amount,
        COUNT(*) FILTER (WHERE lr.status = 'claimable') as claimable_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_rewards
    FROM layer_rewards lr
)
SELECT 
    '触发奖励的会员数: ' || trigger_members as stat1,
    '获得奖励的会员数: ' || recipient_members as stat2, 
    '总奖励记录数: ' || total_rewards as stat3,
    'Claimable奖励: ' || claimable_rewards as stat4,
    'Pending奖励: ' || pending_rewards as stat5,
    '总奖励金额: ' || total_amount || ' USDT' as stat6
FROM system_stats;

SELECT '修复完成：Layer奖励现在正确分配给安置路径上的Matrix Root们' as completion_message;