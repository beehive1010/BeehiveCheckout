-- 更新现有Layer奖励系统 - 基于实际数据库结构
-- ========================================
-- 适配现有的members, referrals, layer_rewards表结构
-- ========================================

-- 第1步：检查现有系统状态
-- ========================================

SELECT '=== 更新现有Layer奖励系统 ===' as status;

-- 检查现有数据
SELECT '=== 检查现有数据结构 ===' as section;
SELECT 
    'members表记录数' as table_name, COUNT(*) as count FROM members
UNION ALL
SELECT 
    'referrals表记录数', COUNT(*) FROM referrals
UNION ALL  
SELECT 
    'layer_rewards表记录数', COUNT(*) FROM layer_rewards
UNION ALL
SELECT 
    'users表记录数', COUNT(*) FROM users;

-- 第2步：创建层级奖励资格检查函数（基于实际表结构）
-- ========================================

-- 检查matrix_root是否满足层级奖励条件
CREATE OR REPLACE FUNCTION check_layer_reward_qualification(
    p_matrix_root_wallet VARCHAR(42),
    p_layer_number INTEGER
) RETURNS TABLE(
    qualified BOOLEAN,
    current_level INTEGER,
    required_level INTEGER,
    direct_referrals_count BIGINT,
    required_direct_referrals INTEGER,
    qualification_details TEXT
) AS $$
DECLARE
    root_member RECORD;
    required_level_for_layer INTEGER;
    required_direct_refs INTEGER;
    actual_direct_refs BIGINT;
BEGIN
    -- 获取matrix root基础信息
    SELECT m.current_level, u.username, m.activation_sequence
    INTO root_member
    FROM members m
    JOIN users u ON m.wallet_address = u.wallet_address
    WHERE m.wallet_address = p_matrix_root_wallet;
    
    IF root_member IS NULL THEN
        RETURN QUERY SELECT false, 0, 0, 0::BIGINT, 0, 'Matrix root member not found';
        RETURN;
    END IF;
    
    -- 根据MarketingPlan.md规则确定所需level
    -- Layer 1 Right slot需要Level 2, Level 2需要3个直推
    CASE 
        WHEN p_layer_number = 1 THEN 
            required_level_for_layer := 2;
            required_direct_refs := 3;
        WHEN p_layer_number <= 3 THEN
            required_level_for_layer := 3;
            required_direct_refs := 5;
        WHEN p_layer_number <= 6 THEN
            required_level_for_layer := 5;
            required_direct_refs := 10;
        WHEN p_layer_number <= 10 THEN
            required_level_for_layer := 8;
            required_direct_refs := 20;
        WHEN p_layer_number <= 15 THEN
            required_level_for_layer := 12;
            required_direct_refs := 50;
        ELSE
            required_level_for_layer := 19;
            required_direct_refs := 100;
    END CASE;
    
    -- 计算实际直推数量（从referrals表）
    SELECT COUNT(*)
    INTO actual_direct_refs
    FROM referrals r
    WHERE r.matrix_root_wallet = p_matrix_root_wallet
    AND r.is_direct_referral = true;
    
    -- 返回资格检查结果
    RETURN QUERY SELECT 
        (root_member.current_level >= required_level_for_layer AND actual_direct_refs >= required_direct_refs),
        root_member.current_level,
        required_level_for_layer,
        actual_direct_refs,
        required_direct_refs,
        CASE 
            WHEN root_member.current_level >= required_level_for_layer AND actual_direct_refs >= required_direct_refs THEN
                'Qualified: Level ' || root_member.current_level || ' with ' || actual_direct_refs || ' direct referrals'
            WHEN root_member.current_level < required_level_for_layer THEN
                'Insufficient level: ' || root_member.current_level || ' < ' || required_level_for_layer
            ELSE
                'Insufficient direct referrals: ' || actual_direct_refs || ' < ' || required_direct_refs
        END;
END;
$$ LANGUAGE plpgsql;

-- 第3步：创建增强的层级奖励计算函数
-- ========================================

-- 3x3滑落Matrix层级奖励计算主函数（基于现有结构）
CREATE OR REPLACE FUNCTION calculate_layer_rewards_3x3_enhanced(
    p_new_member_wallet VARCHAR(42),
    p_nft_level INTEGER
) RETURNS JSONB AS $$
DECLARE
    placement_record RECORD;
    current_root VARCHAR(42);
    current_layer INTEGER;
    layer_count INTEGER := 0;
    nft_price DECIMAL(18,6);
    qualification_check RECORD;
    result JSONB := '[]'::jsonb;
    reward_id UUID;
BEGIN
    -- 获取新会员的placement信息（从referrals表）
    SELECT r.matrix_root_wallet, r.matrix_layer, r.matrix_position
    INTO placement_record
    FROM referrals r
    WHERE r.member_wallet = p_new_member_wallet
    ORDER BY r.placed_at DESC
    LIMIT 1;
    
    IF placement_record IS NULL THEN
        RETURN jsonb_build_object('error', 'No placement record found for new member');
    END IF;
    
    -- 获取NFT价格
    SELECT nml.nft_price_usdt
    INTO nft_price
    FROM nft_membership_levels nml
    WHERE nml.level = p_nft_level;
    
    IF nft_price IS NULL THEN
        nft_price := 100.00; -- 默认价格
    END IF;
    
    -- 从placement位置开始向上计算19层奖励
    current_root := placement_record.matrix_root_wallet;
    current_layer := placement_record.matrix_layer;
    
    -- 计算19层Layer Rewards
    FOR layer_num IN 1..19 LOOP
        EXIT WHEN current_root IS NULL;
        
        -- 检查当前root的资格
        SELECT * INTO qualification_check
        FROM check_layer_reward_qualification(current_root, layer_num);
        
        -- 插入到现有的layer_rewards表
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
            p_new_member_wallet,                         -- 触发奖励的会员
            current_root,                                -- 获得奖励的会员
            current_root,                                -- Matrix根节点
            p_nft_level,                                 -- 触发的NFT level
            nft_price,                                   -- Layer Reward = NFT price
            'L' || layer_num,                           -- 层级位置
            current_layer,                               -- Matrix layer
            CASE 
                WHEN qualification_check.qualified THEN 'claimable'
                ELSE 'pending'
            END,
            qualification_check.required_level,          -- 需要的level
            qualification_check.current_level,           -- 当前level
            qualification_check.required_direct_referrals > 0, -- 是否需要直推
            qualification_check.required_direct_referrals,     -- 需要的直推数
            qualification_check.direct_referrals_count::INTEGER, -- 当前直推数
            NOW() + INTERVAL '30 days'                   -- 30天过期
        ) RETURNING id INTO reward_id;
        
        -- 添加到结果
        result := result || jsonb_build_object(
            'layer', layer_num,
            'reward_id', reward_id,
            'recipient_wallet', current_root,
            'amount_usdt', nft_price,
            'status', CASE WHEN qualification_check.qualified THEN 'claimable' ELSE 'pending' END,
            'qualified', qualification_check.qualified,
            'qualification_details', qualification_check.qualification_details
        );
        
        layer_count := layer_count + 1;
        
        -- 寻找上一层的matrix_root（从referrals表）
        SELECT r.matrix_root_wallet
        INTO current_root
        FROM referrals r
        WHERE r.member_wallet = current_root
        ORDER BY r.placed_at DESC
        LIMIT 1;
        
        current_layer := current_layer + 1;
    END LOOP;
    
    -- 构建返回结果
    RETURN jsonb_build_object(
        'success', true,
        'new_member', p_new_member_wallet,
        'nft_level', p_nft_level,
        'nft_price_usdt', nft_price,
        'total_layers_processed', layer_count,
        'layer_rewards', result,
        'summary', 'Created ' || layer_count || ' layer rewards, each worth ' || nft_price || ' USDT'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', 'Layer reward calculation failed: ' || SQLERRM,
            'new_member', p_new_member_wallet
        );
END;
$$ LANGUAGE plpgsql;

-- 第4步：创建奖励状态管理函数（基于现有layer_rewards表）
-- ========================================

-- 更新奖励状态（pending -> claimable，基于72小时timer）
CREATE OR REPLACE FUNCTION update_reward_status_by_timer()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    reward_rec RECORD;
    qualification_result RECORD;
BEGIN
    -- 处理pending状态的奖励
    FOR reward_rec IN 
        SELECT lr.id, lr.reward_recipient_wallet, lr.matrix_layer
        FROM layer_rewards lr
        WHERE lr.status = 'pending'
        AND lr.created_at <= NOW() - INTERVAL '72 hours'  -- 72小时后检查
        AND lr.expires_at > NOW()  -- 未过期
    LOOP
        -- 重新检查资格
        SELECT * INTO qualification_result
        FROM check_layer_reward_qualification(reward_rec.reward_recipient_wallet, reward_rec.matrix_layer);
        
        -- 如果现在符合资格，更新为claimable
        IF qualification_result.qualified THEN
            UPDATE layer_rewards 
            SET status = 'claimable',
                recipient_current_level = qualification_result.current_level,
                direct_referrals_current = qualification_result.direct_referrals_count::INTEGER
            WHERE id = reward_rec.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    -- 将过期的奖励标记为expired
    UPDATE layer_rewards 
    SET status = 'expired'
    WHERE status IN ('pending', 'claimable')
    AND expires_at <= NOW();
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Claim奖励函数（基于现有结构）
CREATE OR REPLACE FUNCTION claim_layer_reward(
    p_reward_id UUID,
    p_member_wallet VARCHAR(42)
) RETURNS JSONB AS $$
DECLARE
    reward_record RECORD;
BEGIN
    -- 验证奖励记录
    SELECT * INTO reward_record
    FROM layer_rewards
    WHERE id = p_reward_id
    AND reward_recipient_wallet = p_member_wallet
    AND status = 'claimable';
    
    IF reward_record IS NULL THEN
        RETURN jsonb_build_object('error', 'Reward not found or not claimable');
    END IF;
    
    -- 更新user_balances表
    INSERT INTO user_balances (
        wallet_address,
        balance_type,
        amount,
        transaction_type,
        description,
        created_at
    ) VALUES (
        p_member_wallet,
        'earnings',
        reward_record.reward_amount,
        'layer_reward_claim',
        'Layer ' || reward_record.matrix_layer || ' reward claimed',
        NOW()
    );
    
    -- 标记奖励为已claim
    UPDATE layer_rewards
    SET status = 'claimed',
        claimed_at = NOW()
    WHERE id = p_reward_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'reward_id', p_reward_id,
        'amount_usdt', reward_record.reward_amount,
        'layer_number', reward_record.matrix_layer,
        'claimed_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', 'Claim failed: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 第5步：创建自动触发器（当用户激活时触发层级奖励）
-- ========================================

-- 激活会员时自动触发层级奖励计算
CREATE OR REPLACE FUNCTION trigger_activation_rewards()
RETURNS TRIGGER AS $$
BEGIN
    -- 当新增referral记录时，触发层级奖励计算
    IF TG_OP = 'INSERT' THEN
        -- 异步计算层级奖励
        PERFORM calculate_layer_rewards_3x3_enhanced(
            NEW.member_wallet,
            (SELECT current_level FROM members WHERE wallet_address = NEW.member_wallet)
        );
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 更新触发器（如果已存在则先删除）
DROP TRIGGER IF EXISTS trigger_referral_layer_rewards ON referrals;
CREATE TRIGGER trigger_referral_layer_rewards
    AFTER INSERT ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_activation_rewards();

-- 第6步：创建实用的查询视图
-- ========================================

-- 会员奖励概览视图（基于实际表结构）
CREATE OR REPLACE VIEW member_rewards_overview_v2 AS
SELECT 
    m.wallet_address,
    m.activation_sequence,
    u.username,
    m.current_level,
    nml.level_name,
    
    -- 奖励统计
    COALESCE(reward_stats.total_rewards, 0) as total_rewards_count,
    COALESCE(reward_stats.pending_rewards, 0) as pending_rewards_count,
    COALESCE(reward_stats.claimable_rewards, 0) as claimable_rewards_count,
    COALESCE(reward_stats.claimed_rewards, 0) as claimed_rewards_count,
    COALESCE(reward_stats.expired_rewards, 0) as expired_rewards_count,
    
    -- 金额统计
    COALESCE(reward_stats.total_amount, 0) as total_amount_usdt,
    COALESCE(reward_stats.pending_amount, 0) as pending_amount_usdt,
    COALESCE(reward_stats.claimable_amount, 0) as claimable_amount_usdt,
    COALESCE(reward_stats.claimed_amount, 0) as claimed_amount_usdt,
    
    -- 时间统计
    reward_stats.latest_reward_time,
    reward_stats.latest_claim_time

FROM members m
JOIN users u ON m.wallet_address = u.wallet_address
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN (
    SELECT 
        lr.reward_recipient_wallet,
        
        -- 数量统计
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'claimable') as claimable_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'claimed') as claimed_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'expired') as expired_rewards,
        
        -- 金额统计
        SUM(lr.reward_amount) as total_amount,
        SUM(lr.reward_amount) FILTER (WHERE lr.status = 'pending') as pending_amount,
        SUM(lr.reward_amount) FILTER (WHERE lr.status = 'claimable') as claimable_amount,
        SUM(lr.reward_amount) FILTER (WHERE lr.status = 'claimed') as claimed_amount,
        
        -- 时间统计
        MAX(lr.created_at) as latest_reward_time,
        MAX(lr.claimed_at) as latest_claim_time
        
    FROM layer_rewards lr
    GROUP BY lr.reward_recipient_wallet
) reward_stats ON m.wallet_address = reward_stats.reward_recipient_wallet
ORDER BY m.activation_sequence;

-- 第7步：验证和测试更新后的系统
-- ========================================

SELECT '=== 现有Layer奖励系统更新完成 ===' as status;

-- 测试资格检查函数
SELECT '=== 资格检查函数测试（基于现有数据）===' as section;

-- 测试前几个会员的资格
WITH test_members AS (
    SELECT wallet_address, activation_sequence, current_level
    FROM members 
    ORDER BY activation_sequence 
    LIMIT 3
)
SELECT 
    tm.activation_sequence,
    tm.current_level,
    lrq.qualified,
    lrq.current_level,
    lrq.required_level,
    lrq.direct_referrals_count,
    lrq.qualification_details
FROM test_members tm
CROSS JOIN LATERAL check_layer_reward_qualification(tm.wallet_address, 1) lrq
ORDER BY tm.activation_sequence;

-- 显示会员奖励概览示例
SELECT '=== 会员奖励概览示例 ===' as section;
SELECT 
    activation_sequence, username, current_level, level_name,
    total_rewards_count, claimable_rewards_count, total_amount_usdt
FROM member_rewards_overview_v2 
ORDER BY activation_sequence 
LIMIT 5;

-- 显示层级奖励记录示例
SELECT '=== 层级奖励记录示例 ===' as section;
SELECT 
    lr.triggering_nft_level,
    LEFT(lr.triggering_member_wallet, 10) || '...' as trigger_wallet_short,
    LEFT(lr.reward_recipient_wallet, 10) || '...' as recipient_wallet_short,
    lr.reward_amount,
    lr.status,
    lr.matrix_layer,
    lr.recipient_current_level,
    lr.recipient_required_level
FROM layer_rewards lr
ORDER BY lr.created_at DESC
LIMIT 5;

-- 显示系统使用说明
SELECT '=== 更新后Layer奖励系统使用说明 ===' as usage_section;
SELECT 'Enhanced Layer Reward Functions:' as title,
       'calculate_layer_rewards_3x3_enhanced(wallet, nft_level) - 计算19层奖励' as function1,
       'claim_layer_reward(reward_id, wallet) - Claim奖励' as function2,
       'update_reward_status_by_timer() - 更新72小时timer状态' as function3,
       'check_layer_reward_qualification(wallet, layer) - 检查资格' as function4,
       '视图: member_rewards_overview_v2 - 会员奖励概览' as view1;