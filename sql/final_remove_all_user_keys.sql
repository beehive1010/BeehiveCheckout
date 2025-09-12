-- 彻底删除所有user_keys概念，只使用钱包地址和username
-- ========================================
-- 最终清理，确保没有任何user_keys残留
-- ========================================

-- 第1步：检查并删除所有包含user_keys的代码
-- ========================================

-- 搜索并删除所有可能包含user_keys的视图
DROP VIEW IF EXISTS user_complete_profile CASCADE;
DROP VIEW IF EXISTS frontend_members CASCADE;
DROP VIEW IF EXISTS user_profile_view CASCADE;

-- 删除包含user_keys的函数
DROP FUNCTION IF EXISTS get_member_by_username(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_member_by_activation_id(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_referrer_leaderboard(INTEGER) CASCADE;

-- 第2步：重新创建纯净的视图（只使用钱包地址、username、activation_id）
-- ========================================

-- 简洁的会员信息视图
CREATE OR REPLACE VIEW members_view AS
SELECT 
    -- 主要标识
    m.activation_id,
    m.wallet_address,
    m.username,
    COALESCE(m.display_name, m.username) as display_name,
    m.email,
    
    -- 等级信息
    m.current_level,
    nml.level_name,
    nml.nft_price_usdt,
    nml.tier,
    m.activation_time,
    
    -- 推荐人信息
    m.referrer_wallet,
    ref_m.username as referrer_username,
    ref_m.activation_id as referrer_id,
    
    -- 统计
    COALESCE(stats.direct_referrals, 0) as direct_referrals,
    COALESCE(stats.total_rewards, 0) as total_rewards,
    COALESCE(stats.claimable_amount, 0) as claimable_usdt
    
FROM membership m
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN membership ref_m ON m.referrer_wallet = ref_m.wallet_address
LEFT JOIN (
    SELECT 
        mp.matrix_root,
        COUNT(*) FILTER (WHERE mp.is_direct_referral = true) as direct_referrals,
        COUNT(lr.id) as total_rewards,
        SUM(lr.final_reward_amount) FILTER (WHERE lr.status = 'claimable') as claimable_amount
    FROM matrix_placements mp
    LEFT JOIN layer_rewards lr ON mp.matrix_root = lr.reward_recipient
    GROUP BY mp.matrix_root
) stats ON m.wallet_address = stats.matrix_root
ORDER BY m.activation_id;

-- 矩阵结构视图
CREATE OR REPLACE VIEW matrix_structure AS
SELECT 
    root.activation_id as root_id,
    root.username as root_username,
    root.wallet_address as root_wallet,
    
    -- L位置
    l_mem.activation_id as l_id,
    l_mem.username as l_username,
    l_mem.wallet_address as l_wallet,
    
    -- M位置
    m_mem.activation_id as m_id,
    m_mem.username as m_username,
    m_mem.wallet_address as m_wallet,
    
    -- R位置
    r_mem.activation_id as r_id,
    r_mem.username as r_username,
    r_mem.wallet_address as r_wallet,
    
    -- 状态
    CASE 
        WHEN l_mem.activation_id IS NULL THEN 'L'
        WHEN m_mem.activation_id IS NULL THEN 'M'
        WHEN r_mem.activation_id IS NULL THEN 'R'
        ELSE 'FULL'
    END as next_position
    
FROM membership root
LEFT JOIN matrix_placements l_mp ON root.wallet_address = l_mp.matrix_root 
    AND l_mp.matrix_layer = 1 AND l_mp.matrix_position = 'L'
LEFT JOIN membership l_mem ON l_mp.member_wallet = l_mem.wallet_address
LEFT JOIN matrix_placements m_mp ON root.wallet_address = m_mp.matrix_root 
    AND m_mp.matrix_layer = 1 AND m_mp.matrix_position = 'M'
LEFT JOIN membership m_mem ON m_mp.member_wallet = m_mem.wallet_address
LEFT JOIN matrix_placements r_mp ON root.wallet_address = r_mp.matrix_root 
    AND r_mp.matrix_layer = 1 AND r_mp.matrix_position = 'R'
LEFT JOIN membership r_mem ON r_mp.member_wallet = r_mem.wallet_address
ORDER BY root.activation_id;

-- 奖励信息视图
CREATE OR REPLACE VIEW rewards_view AS
SELECT 
    trigger_m.activation_id as trigger_id,
    trigger_m.username as trigger_username,
    recipient_m.activation_id as recipient_id,
    recipient_m.username as recipient_username,
    lr.layer_number,
    lr.matrix_position,
    nml.level_name,
    lr.final_reward_amount,
    lr.status,
    lr.created_at
FROM layer_rewards lr
JOIN membership trigger_m ON lr.triggering_member = trigger_m.wallet_address
JOIN membership recipient_m ON lr.reward_recipient = recipient_m.wallet_address
JOIN nft_membership_levels nml ON lr.triggering_nft_level = nml.level
ORDER BY lr.created_at DESC;

-- 第3步：重新创建查询函数（不使用user_keys）
-- ========================================

-- 根据username查找会员
CREATE OR REPLACE FUNCTION find_member(p_username VARCHAR(50))
RETURNS TABLE(
    activation_id INTEGER,
    username VARCHAR(50),
    wallet_address VARCHAR(42),
    current_level INTEGER,
    level_name VARCHAR(50),
    direct_referrals BIGINT,
    claimable_usdt NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mv.activation_id,
        mv.username,
        mv.wallet_address,
        mv.current_level,
        mv.level_name,
        mv.direct_referrals,
        mv.claimable_usdt
    FROM members_view mv
    WHERE LOWER(mv.username) = LOWER(p_username);
END;
$$ LANGUAGE plpgsql;

-- 根据钱包地址查找会员
CREATE OR REPLACE FUNCTION find_member_by_wallet(p_wallet_address VARCHAR(42))
RETURNS TABLE(
    activation_id INTEGER,
    username VARCHAR(50),
    wallet_address VARCHAR(42),
    current_level INTEGER,
    level_name VARCHAR(50),
    direct_referrals BIGINT,
    claimable_usdt NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mv.activation_id,
        mv.username,
        mv.wallet_address,
        mv.current_level,
        mv.level_name,
        mv.direct_referrals,
        mv.claimable_usdt
    FROM members_view mv
    WHERE mv.wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql;

-- 根据激活序号查找会员
CREATE OR REPLACE FUNCTION find_member_by_id(p_activation_id INTEGER)
RETURNS TABLE(
    activation_id INTEGER,
    username VARCHAR(50),
    wallet_address VARCHAR(42),
    current_level INTEGER,
    level_name VARCHAR(50),
    direct_referrals BIGINT,
    claimable_usdt NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mv.activation_id,
        mv.username,
        mv.wallet_address,
        mv.current_level,
        mv.level_name,
        mv.direct_referrals,
        mv.claimable_usdt
    FROM members_view mv
    WHERE mv.activation_id = p_activation_id;
END;
$$ LANGUAGE plpgsql;

-- 第4步：更新get_user_profile函数（移除user_keys）
-- ========================================

CREATE OR REPLACE FUNCTION get_user_profile(p_username VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
    profile_data JSONB;
BEGIN
    -- 检查用户是否存在
    IF NOT EXISTS (SELECT 1 FROM membership WHERE LOWER(username) = LOWER(p_username)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member not found');
    END IF;
    
    -- 获取完整Profile信息
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            -- 基础信息
            'activation_id', mv.activation_id,
            'wallet_address', mv.wallet_address,
            'username', mv.username,
            'display_name', mv.display_name,
            'email', mv.email,
            
            -- 等级信息
            'current_level', mv.current_level,
            'level_name', mv.level_name,
            'level_price_usdt', mv.nft_price_usdt,
            'level_tier', mv.tier,
            'activation_time', mv.activation_time,
            
            -- 推荐信息
            'referrer_wallet', mv.referrer_wallet,
            'referrer_username', mv.referrer_username,
            'referrer_id', mv.referrer_id,
            
            -- 统计信息
            'direct_referrals', mv.direct_referrals,
            'total_rewards', mv.total_rewards,
            'claimable_usdt', mv.claimable_usdt,
            
            -- 矩阵信息
            'matrix', (
                SELECT jsonb_build_object(
                    'l_position', jsonb_build_object(
                        'id', ms.l_id,
                        'username', ms.l_username,
                        'wallet', ms.l_wallet
                    ),
                    'm_position', jsonb_build_object(
                        'id', ms.m_id,
                        'username', ms.m_username,
                        'wallet', ms.m_wallet
                    ),
                    'r_position', jsonb_build_object(
                        'id', ms.r_id,
                        'username', ms.r_username,
                        'wallet', ms.r_wallet
                    ),
                    'next_position', ms.next_position
                )
                FROM matrix_structure ms
                WHERE ms.root_wallet = mv.wallet_address
            )
        )
    ) INTO profile_data
    FROM members_view mv
    WHERE LOWER(mv.username) = LOWER(p_username);
    
    RETURN profile_data;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to get profile: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 第5步：前端UserProfile组件专用查询
-- ========================================

-- 前端UserProfile组件数据查询
CREATE OR REPLACE FUNCTION get_frontend_profile(p_identifier VARCHAR(100))
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    search_wallet VARCHAR(42);
BEGIN
    -- 判断输入是钱包地址还是用户名
    IF p_identifier ~ '^0x[a-fA-F0-9]{40}$' THEN
        search_wallet := p_identifier;
    ELSE
        SELECT wallet_address INTO search_wallet 
        FROM membership 
        WHERE LOWER(username) = LOWER(p_identifier);
    END IF;
    
    IF search_wallet IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member not found');
    END IF;
    
    -- 构建前端所需的完整数据
    SELECT jsonb_build_object(
        'success', true,
        'profile', jsonb_build_object(
            'activation_id', mv.activation_id,
            'wallet_address', mv.wallet_address,
            'username', mv.username,
            'display_name', mv.display_name,
            'level', jsonb_build_object(
                'current', mv.current_level,
                'name', mv.level_name,
                'price_usdt', mv.nft_price_usdt,
                'tier', mv.tier
            ),
            'referrer', jsonb_build_object(
                'wallet', mv.referrer_wallet,
                'username', mv.referrer_username,
                'id', mv.referrer_id
            ),
            'stats', jsonb_build_object(
                'direct_referrals', mv.direct_referrals,
                'total_rewards', mv.total_rewards,
                'claimable_usdt', mv.claimable_usdt
            ),
            'matrix', (
                SELECT jsonb_build_object(
                    'positions', jsonb_build_object(
                        'L', CASE WHEN ms.l_username IS NOT NULL 
                             THEN jsonb_build_object('id', ms.l_id, 'username', ms.l_username)
                             ELSE null END,
                        'M', CASE WHEN ms.m_username IS NOT NULL 
                             THEN jsonb_build_object('id', ms.m_id, 'username', ms.m_username)
                             ELSE null END,
                        'R', CASE WHEN ms.r_username IS NOT NULL 
                             THEN jsonb_build_object('id', ms.r_id, 'username', ms.r_username)
                             ELSE null END
                    ),
                    'next_vacant', ms.next_position
                )
                FROM matrix_structure ms
                WHERE ms.root_wallet = search_wallet
            )
        )
    ) INTO result
    FROM members_view mv
    WHERE mv.wallet_address = search_wallet;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 第6步：显示最终清理状态
-- ========================================

SELECT '=== 彻底删除所有user_keys概念完成 ===' as status;

-- 显示纯净的会员视图
SELECT '=== 会员信息视图（无user_keys）===' as section;
SELECT activation_id, username, wallet_address, level_name, direct_referrals, claimable_usdt
FROM members_view 
ORDER BY activation_id 
LIMIT 5;

-- 显示矩阵结构视图
SELECT '=== 矩阵结构视图（无user_keys）===' as section;
SELECT root_id, root_username, l_username, m_username, r_username, next_position
FROM matrix_structure 
ORDER BY root_id 
LIMIT 5;

-- 演示前端查询函数
SELECT '=== 前端Profile查询演示 ===' as section;
-- 注意：这里只是演示语法，实际使用时需要传入真实的username
SELECT '前端UserProfile组件可以使用:' as usage,
       'SELECT get_frontend_profile(''username'') 或 get_frontend_profile(''0x...'')' as example;

-- 确认系统中没有user_keys残留
SELECT '=== 确认无user_keys残留 ===' as confirmation;
SELECT 
    table_name, 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name LIKE '%user_key%'
ORDER BY table_name, column_name;