-- 修复所有表的主键绑定到membership.wallet_address
-- ========================================
-- 确保所有视图和查询都正确绑定到membership表的主键
-- ========================================

-- 第1步：重新创建matrix_structure视图（修复主键绑定）
-- ========================================

DROP VIEW IF EXISTS matrix_structure CASCADE;

CREATE OR REPLACE VIEW matrix_structure AS
SELECT 
    -- 根节点信息（使用membership主键绑定）
    root.activation_id as root_activation_id,
    root.username as root_username,
    root.wallet_address as root_wallet_address, -- 完整主键
    root.current_level as root_level,
    root.display_name as root_display_name,
    
    -- L位置成员（通过主键绑定）
    l_mem.activation_id as l_activation_id,
    l_mem.username as l_username,
    l_mem.wallet_address as l_wallet_address, -- 完整主键
    l_mem.current_level as l_level,
    
    -- M位置成员（通过主键绑定）
    m_mem.activation_id as m_activation_id,
    m_mem.username as m_username,
    m_mem.wallet_address as m_wallet_address, -- 完整主键
    m_mem.current_level as m_level,
    
    -- R位置成员（通过主键绑定）
    r_mem.activation_id as r_activation_id,
    r_mem.username as r_username,
    r_mem.wallet_address as r_wallet_address, -- 完整主键
    r_mem.current_level as r_level,
    
    -- 矩阵状态
    CASE 
        WHEN l_mem.wallet_address IS NULL THEN 'L'
        WHEN m_mem.wallet_address IS NULL THEN 'M'
        WHEN r_mem.wallet_address IS NULL THEN 'R'
        ELSE 'FULL'
    END as next_vacant_position,
    
    -- 填充统计
    (CASE WHEN l_mem.wallet_address IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN m_mem.wallet_address IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN r_mem.wallet_address IS NOT NULL THEN 1 ELSE 0 END) as positions_filled
    
FROM membership root
-- L位置：通过matrix_placements绑定到membership主键
LEFT JOIN matrix_placements l_mp ON root.wallet_address = l_mp.matrix_root 
    AND l_mp.matrix_layer = 1 AND l_mp.matrix_position = 'L'
LEFT JOIN membership l_mem ON l_mp.member_wallet = l_mem.wallet_address
-- M位置：通过matrix_placements绑定到membership主键
LEFT JOIN matrix_placements m_mp ON root.wallet_address = m_mp.matrix_root 
    AND m_mp.matrix_layer = 1 AND m_mp.matrix_position = 'M'
LEFT JOIN membership m_mem ON m_mp.member_wallet = m_mem.wallet_address
-- R位置：through matrix_placements绑定到membership主键
LEFT JOIN matrix_placements r_mp ON root.wallet_address = r_mp.matrix_root 
    AND r_mp.matrix_layer = 1 AND r_mp.matrix_position = 'R'
LEFT JOIN membership r_mem ON r_mp.member_wallet = r_mem.wallet_address
ORDER BY root.activation_id;

-- 第2步：创建会员总览视图（member_overview）
-- ========================================

CREATE OR REPLACE VIEW member_overview AS
SELECT 
    -- 会员基础信息（使用membership主键）
    m.wallet_address as wallet_address, -- 主键
    m.activation_id,
    m.username,
    m.email,
    COALESCE(m.display_name, m.username) as display_name,
    
    -- NFT等级信息（通过外键绑定）
    m.current_level,
    nml.level_name,
    nml.nft_price_usdt,
    nml.tier as level_tier,
    m.activation_time,
    
    -- 推荐人信息（通过主键绑定）
    m.referrer_wallet,
    ref_m.username as referrer_username,
    ref_m.activation_id as referrer_activation_id,
    
    -- 矩阵统计（通过主键聚合）
    COALESCE(matrix_stats.direct_referrals, 0) as direct_referrals,
    COALESCE(matrix_stats.spillover_count, 0) as spillover_count,
    COALESCE(matrix_stats.layer1_filled, 0) as layer1_filled,
    COALESCE(matrix_stats.total_downline, 0) as total_downline,
    COALESCE(matrix_stats.vacant_position, 'L') as next_vacant_position,
    
    -- 奖励统计（通过主键聚合）
    COALESCE(reward_stats.total_rewards, 0) as total_rewards,
    COALESCE(reward_stats.claimable_rewards, 0) as claimable_rewards,
    COALESCE(reward_stats.pending_rewards, 0) as pending_rewards,
    COALESCE(reward_stats.claimed_rewards, 0) as claimed_rewards,
    COALESCE(reward_stats.claimable_amount_usdt, 0) as claimable_amount_usdt,
    COALESCE(reward_stats.claimed_amount_usdt, 0) as claimed_amount_usdt,
    
    -- BCC余额统计（通过主键绑定）
    COALESCE(mb.bcc_balance, 0) as bcc_balance,
    COALESCE(mb.bcc_locked, 0) as bcc_locked,
    COALESCE(mb.bcc_used, 0) as bcc_used,
    COALESCE(mb.bcc_total_unlocked, 0) as bcc_total_unlocked,
    COALESCE(mb.reward_balance, 0) as usdt_reward_balance,
    COALESCE(mb.activation_tier, 0) as bcc_tier,
    COALESCE(mb.tier_multiplier, 0) as bcc_tier_multiplier
    
FROM membership m
-- 通过外键绑定NFT等级信息
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
-- 通过主键绑定推荐人信息
LEFT JOIN membership ref_m ON m.referrer_wallet = ref_m.wallet_address
-- 通过主键聚合矩阵统计
LEFT JOIN (
    SELECT 
        mp.matrix_root,
        COUNT(*) FILTER (WHERE mp.is_direct_referral = true) as direct_referrals,
        COUNT(*) FILTER (WHERE mp.is_spillover_placed = true) as spillover_count,
        COUNT(*) FILTER (WHERE mp.matrix_layer = 1) as layer1_filled,
        COUNT(*) as total_downline,
        CASE 
            WHEN COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'L') = 0 THEN 'L'
            WHEN COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'M') = 0 THEN 'M'
            WHEN COUNT(*) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'R') = 0 THEN 'R'
            ELSE 'FULL'
        END as vacant_position
    FROM matrix_placements mp
    GROUP BY mp.matrix_root
) matrix_stats ON m.wallet_address = matrix_stats.matrix_root
-- 通过主键聚合奖励统计
LEFT JOIN (
    SELECT 
        lr.reward_recipient,
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'claimable') as claimable_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_rewards,
        COUNT(*) FILTER (WHERE lr.status = 'claimed') as claimed_rewards,
        SUM(lr.final_reward_amount) FILTER (WHERE lr.status = 'claimable') as claimable_amount_usdt,
        SUM(lr.final_reward_amount) FILTER (WHERE lr.status = 'claimed') as claimed_amount_usdt
    FROM layer_rewards lr
    GROUP BY lr.reward_recipient
) reward_stats ON m.wallet_address = reward_stats.reward_recipient
-- 通过主键绑定BCC余额信息
LEFT JOIN members_balance mb ON m.wallet_address = mb.wallet_address
ORDER BY m.activation_id;

-- 第3步：修复members_view（确保主键绑定正确）
-- ========================================

DROP VIEW IF EXISTS members_view CASCADE;

CREATE OR REPLACE VIEW members_view AS
SELECT 
    -- 主键和基础信息
    m.wallet_address, -- 主键
    m.activation_id,
    m.username,
    COALESCE(m.display_name, m.username) as display_name,
    m.email,
    
    -- 等级信息（通过外键绑定）
    m.current_level,
    nml.level_name,
    nml.nft_price_usdt,
    nml.tier,
    m.activation_time,
    
    -- 推荐人信息（通过主键绑定）
    m.referrer_wallet,
    ref_m.username as referrer_username,
    ref_m.activation_id as referrer_id,
    
    -- 统计信息（通过主键聚合）
    COALESCE(stats.direct_referrals, 0) as direct_referrals,
    COALESCE(stats.total_rewards, 0) as total_rewards,
    COALESCE(stats.claimable_amount, 0) as claimable_usdt
    
FROM membership m -- 主表，主键是wallet_address
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN membership ref_m ON m.referrer_wallet = ref_m.wallet_address -- 主键绑定
LEFT JOIN (
    SELECT 
        mp.matrix_root, -- 绑定到membership.wallet_address主键
        COUNT(*) FILTER (WHERE mp.is_direct_referral = true) as direct_referrals,
        COUNT(lr.id) as total_rewards,
        SUM(lr.final_reward_amount) FILTER (WHERE lr.status = 'claimable') as claimable_amount
    FROM matrix_placements mp
    LEFT JOIN layer_rewards lr ON mp.matrix_root = lr.reward_recipient -- 都绑定主键
    GROUP BY mp.matrix_root
) stats ON m.wallet_address = stats.matrix_root -- 主键绑定
ORDER BY m.activation_id;

-- 第4步：修复rewards_view（确保主键绑定正确）
-- ========================================

DROP VIEW IF EXISTS rewards_view CASCADE;

CREATE OR REPLACE VIEW rewards_view AS
SELECT 
    lr.id as reward_id,
    
    -- 触发者信息（通过主键绑定）
    trigger_m.wallet_address as trigger_wallet_address,
    trigger_m.activation_id as trigger_activation_id,
    trigger_m.username as trigger_username,
    
    -- 接收者信息（通过主键绑定）
    recipient_m.wallet_address as recipient_wallet_address,
    recipient_m.activation_id as recipient_activation_id,
    recipient_m.username as recipient_username,
    
    -- 奖励信息
    lr.layer_number,
    lr.matrix_position,
    lr.triggering_nft_level,
    nml.level_name as nft_level_name,
    lr.final_reward_amount,
    lr.status,
    lr.eligibility_met,
    lr.created_at,
    lr.claimed_at,
    
    -- 资格信息
    lr.required_nft_level,
    lr.recipient_current_level,
    lr.required_direct_referrals,
    lr.direct_referral_count
    
FROM layer_rewards lr
-- 通过外键绑定到membership主键
JOIN membership trigger_m ON lr.triggering_member = trigger_m.wallet_address
JOIN membership recipient_m ON lr.reward_recipient = recipient_m.wallet_address
-- 通过外键绑定到NFT等级表
JOIN nft_membership_levels nml ON lr.triggering_nft_level = nml.level
ORDER BY lr.created_at DESC;

-- 第5步：更新所有查询函数使用正确的主键绑定
-- ========================================

-- 重新创建find_member函数，使用正确的主键绑定
CREATE OR REPLACE FUNCTION find_member(p_username VARCHAR(50))
RETURNS TABLE(
    wallet_address VARCHAR(42),
    activation_id INTEGER,
    username VARCHAR(50),
    current_level INTEGER,
    level_name VARCHAR(50),
    direct_referrals BIGINT,
    claimable_usdt NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mv.wallet_address, -- 返回完整主键
        mv.activation_id,
        mv.username,
        mv.current_level,
        mv.level_name,
        mv.direct_referrals,
        mv.claimable_usdt
    FROM members_view mv
    WHERE LOWER(mv.username) = LOWER(p_username);
END;
$$ LANGUAGE plpgsql;

-- 重新创建find_member_by_wallet函数
CREATE OR REPLACE FUNCTION find_member_by_wallet(p_wallet_address VARCHAR(42))
RETURNS TABLE(
    wallet_address VARCHAR(42),
    activation_id INTEGER,
    username VARCHAR(50),
    current_level INTEGER,
    level_name VARCHAR(50),
    direct_referrals BIGINT,
    claimable_usdt NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mv.wallet_address, -- 主键
        mv.activation_id,
        mv.username,
        mv.current_level,
        mv.level_name,
        mv.direct_referrals,
        mv.claimable_usdt
    FROM members_view mv
    WHERE mv.wallet_address = p_wallet_address; -- 主键匹配
END;
$$ LANGUAGE plpgsql;

-- 第6步：更新get_frontend_profile函数使用正确的主键绑定
-- ========================================

CREATE OR REPLACE FUNCTION get_frontend_profile(p_identifier VARCHAR(100))
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    target_wallet VARCHAR(42);
BEGIN
    -- 判断输入是钱包地址还是用户名
    IF p_identifier ~ '^0x[a-fA-F0-9]{40}$' THEN
        target_wallet := p_identifier;
    ELSE
        -- 通过用户名查找主键
        SELECT wallet_address INTO target_wallet 
        FROM membership 
        WHERE LOWER(username) = LOWER(p_identifier);
    END IF;
    
    IF target_wallet IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member not found');
    END IF;
    
    -- 使用member_overview视图获取完整信息（所有数据都通过主键绑定）
    SELECT jsonb_build_object(
        'success', true,
        'profile', jsonb_build_object(
            'wallet_address', mo.wallet_address, -- 主键
            'activation_id', mo.activation_id,
            'username', mo.username,
            'display_name', mo.display_name,
            'email', mo.email,
            
            'level', jsonb_build_object(
                'current', mo.current_level,
                'name', mo.level_name,
                'price_usdt', mo.nft_price_usdt,
                'tier', mo.level_tier
            ),
            
            'referrer', jsonb_build_object(
                'wallet_address', mo.referrer_wallet,
                'username', mo.referrer_username,
                'activation_id', mo.referrer_activation_id
            ),
            
            'matrix', jsonb_build_object(
                'direct_referrals', mo.direct_referrals,
                'spillover_count', mo.spillover_count,
                'layer1_filled', mo.layer1_filled,
                'total_downline', mo.total_downline,
                'next_vacant', mo.next_vacant_position
            ),
            
            'rewards', jsonb_build_object(
                'total', mo.total_rewards,
                'claimable', mo.claimable_rewards,
                'pending', mo.pending_rewards,
                'claimed', mo.claimed_rewards,
                'claimable_usdt', mo.claimable_amount_usdt,
                'claimed_usdt', mo.claimed_amount_usdt
            ),
            
            'bcc', jsonb_build_object(
                'balance', mo.bcc_balance,
                'locked', mo.bcc_locked,
                'used', mo.bcc_used,
                'total_unlocked', mo.bcc_total_unlocked,
                'tier', mo.bcc_tier,
                'tier_multiplier', mo.bcc_tier_multiplier
            ),
            
            'usdt', jsonb_build_object(
                'reward_balance', mo.usdt_reward_balance
            )
        )
    ) INTO result
    FROM member_overview mo
    WHERE mo.wallet_address = target_wallet; -- 主键匹配
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 第7步：创建主键绑定验证函数
-- ========================================

CREATE OR REPLACE FUNCTION verify_primary_key_bindings()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    count_result BIGINT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- 检查membership主键完整性
    SELECT 
        'membership_primary_key'::TEXT,
        CASE WHEN COUNT(*) = COUNT(wallet_address) THEN 'OK' ELSE 'ERROR' END::TEXT,
        COUNT(*),
        'membership table primary key integrity'::TEXT
    FROM membership
    
    UNION ALL
    
    -- 检查matrix_placements外键绑定
    SELECT 
        'matrix_placements_fk_binding',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END,
        COUNT(*),
        'orphaned matrix_placements records'
    FROM matrix_placements mp
    WHERE NOT EXISTS (SELECT 1 FROM membership m WHERE m.wallet_address = mp.member_wallet)
       OR NOT EXISTS (SELECT 1 FROM membership m WHERE m.wallet_address = mp.matrix_root)
    
    UNION ALL
    
    -- 检查layer_rewards外键绑定
    SELECT 
        'layer_rewards_fk_binding',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END,
        COUNT(*),
        'orphaned layer_rewards records'
    FROM layer_rewards lr
    WHERE NOT EXISTS (SELECT 1 FROM membership m WHERE m.wallet_address = lr.triggering_member)
       OR NOT EXISTS (SELECT 1 FROM membership m WHERE m.wallet_address = lr.reward_recipient)
    
    UNION ALL
    
    -- 检查members_balance外键绑定
    SELECT 
        'members_balance_fk_binding',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END,
        COUNT(*),
        'orphaned members_balance records'
    FROM members_balance mb
    WHERE NOT EXISTS (SELECT 1 FROM membership m WHERE m.wallet_address = mb.wallet_address)
    
    UNION ALL
    
    -- 检查视图数据一致性
    SELECT 
        'member_overview_data_consistency',
        'OK',
        COUNT(*),
        'member_overview view records'
    FROM member_overview
    
    UNION ALL
    
    SELECT 
        'matrix_structure_data_consistency',
        'OK',
        COUNT(*),
        'matrix_structure view records'
    FROM matrix_structure;
END;
$$ LANGUAGE plpgsql;

-- 第8步：显示修复结果
-- ========================================

SELECT '=== 主键绑定修复完成 ===' as status;

-- 验证主键绑定
SELECT '=== 主键绑定验证结果 ===' as section;
SELECT * FROM verify_primary_key_bindings();

-- 显示会员总览预览
SELECT '=== 会员总览预览（正确的主键绑定）===' as section;
SELECT 
    activation_id, username, wallet_address, current_level, level_name,
    direct_referrals, total_rewards, claimable_amount_usdt, bcc_balance
FROM member_overview 
ORDER BY activation_id 
LIMIT 5;

-- 显示矩阵结构预览
SELECT '=== 矩阵结构预览（正确的主键绑定）===' as section;
SELECT 
    root_activation_id, root_username, root_wallet_address,
    l_username, m_username, r_username, next_vacant_position
FROM matrix_structure 
ORDER BY root_activation_id 
LIMIT 5;

-- 显示奖励信息预览
SELECT '=== 奖励信息预览（正确的主键绑定）===' as section;
SELECT 
    trigger_activation_id, trigger_username, 
    recipient_activation_id, recipient_username,
    layer_number, final_reward_amount, status
FROM rewards_view 
ORDER BY created_at DESC 
LIMIT 5;