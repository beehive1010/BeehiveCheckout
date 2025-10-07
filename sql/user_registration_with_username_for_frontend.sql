-- 用户注册时收集username，为前端UserProfile组件提供查询接口
-- ========================================
-- 完整的用户注册流程和前端Profile查询系统
-- ========================================

-- 第1步：确保users表包含username字段且为必填
-- ========================================

-- 更新users表结构，确保username是必填的
ALTER TABLE users 
ALTER COLUMN username SET NOT NULL,
ADD CONSTRAINT username_min_length CHECK (LENGTH(TRIM(username)) >= 3),
ADD CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$');

-- 创建唯一约束确保username不重复
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(LOWER(username));

-- 第2步：创建完整的用户注册函数
-- ========================================

CREATE OR REPLACE FUNCTION register_user_complete(
    p_wallet_address VARCHAR(42),
    p_username VARCHAR(50),
    p_email VARCHAR(255),
    p_referrer_wallet VARCHAR(42) DEFAULT NULL,
    p_registration_source VARCHAR(50) DEFAULT 'mainnet'
)
RETURNS JSONB AS $$
DECLARE
    result_json JSONB;
    referrer_username VARCHAR(50);
BEGIN
    -- 验证参数
    IF p_wallet_address IS NULL OR LENGTH(TRIM(p_wallet_address)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet address is required');
    END IF;
    
    IF p_username IS NULL OR LENGTH(TRIM(p_username)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Username must be at least 3 characters');
    END IF;
    
    IF p_email IS NULL OR LENGTH(TRIM(p_email)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email is required');
    END IF;
    
    -- 验证推荐人（如果提供）
    IF p_referrer_wallet IS NOT NULL THEN
        -- 检查推荐人是否存在且已激活
        IF NOT EXISTS (
            SELECT 1 FROM membership 
            WHERE wallet_address = p_referrer_wallet 
            AND current_level > 0
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Referrer is not an ActiveMember member');
        END IF;
        
        -- 获取推荐人用户名
        SELECT username INTO referrer_username 
        FROM membership 
        WHERE wallet_address = p_referrer_wallet;
    END IF;
    
    -- 插入用户记录
    INSERT INTO users (
        wallet_address,
        username,
        email,
        referrer_wallet,
        role,
        profile_completed,
        registration_source,
        created_at
    ) VALUES (
        p_wallet_address,
        TRIM(p_username),
        LOWER(TRIM(p_email)),
        p_referrer_wallet,
        'user',
        true,
        p_registration_source,
        NOW()
    );
    
    -- 构建成功响应
    result_json := jsonb_build_object(
        'success', true,
        'message', 'User registered successfully',
        'data', jsonb_build_object(
            'wallet_address', p_wallet_address,
            'username', TRIM(p_username),
            'email', LOWER(TRIM(p_email)),
            'referrer_wallet', p_referrer_wallet,
            'referrer_username', referrer_username,
            'registration_source', p_registration_source,
            'status', 'registered',
            'is_member', false
        )
    );
    
    RETURN result_json;
    
EXCEPTION
    WHEN unique_violation THEN
        IF SQLERRM LIKE '%username%' THEN
            RETURN jsonb_build_object('success', false, 'error', format('Username "%s" is already taken', p_username));
        ELSIF SQLERRM LIKE '%email%' THEN
            RETURN jsonb_build_object('success', false, 'error', format('Email "%s" is already registered', p_email));
        ELSIF SQLERRM LIKE '%wallet_address%' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Wallet address is already registered');
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Registration failed: duplicate entry');
        END IF;
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Registration failed: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 第3步：创建前端UserProfile查询函数
-- ========================================

-- 根据username获取完整用户Profile信息
CREATE OR REPLACE FUNCTION get_user_profile(p_username VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
    user_data JSONB;
    member_data JSONB;
    referral_data JSONB;
    reward_data JSONB;
    matrix_data JSONB;
BEGIN
    -- 检查用户是否存在
    IF NOT EXISTS (SELECT 1 FROM users WHERE LOWER(username) = LOWER(p_username)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- 获取基础用户信息
    SELECT jsonb_build_object(
        'wallet_address', u.wallet_address,
        'username', u.username,
        'email', u.email,
        'role', u.role,
        'is_active', u.is_active,
        'email_verified', u.email_verified,
        'registration_source', u.registration_source,
        'created_at', u.created_at,
        'referrer_wallet', u.referrer_wallet
    ) INTO user_data
    FROM users u 
    WHERE LOWER(u.username) = LOWER(p_username);
    
    -- 获取会员信息（如果是会员）
    SELECT jsonb_build_object(
        'activation_id', m.activation_id,
        'current_level', m.current_level,
        'level_name', nml.level_name,
        'level_price_usdt', nml.nft_price_usdt,
        'level_tier', nml.tier,
        'activation_time', m.activation_time,
        'nft_claimed_levels', m.nft_claimed_levels,
        'is_member', true
    ) INTO member_data
    FROM membership m
    LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
    WHERE m.wallet_address = (user_data->>'wallet_address')::VARCHAR;
    
    IF member_data IS NULL THEN
        member_data := jsonb_build_object('is_member', false);
    END IF;
    
    -- 获取推荐统计信息
    SELECT jsonb_build_object(
        'direct_referrals', COALESCE(COUNT(*) FILTER (WHERE mp.is_direct_referral = true), 0),
        'spillover_count', COALESCE(COUNT(*) FILTER (WHERE mp.is_spillover_placed = true), 0),
        'layer1_filled', COALESCE(COUNT(*) FILTER (WHERE mp.matrix_layer = 1), 0),
        'total_team_size', COALESCE(COUNT(*), 0)
    ) INTO referral_data
    FROM matrix_placements mp
    WHERE mp.matrix_root = (user_data->>'wallet_address')::VARCHAR;
    
    IF referral_data IS NULL THEN
        referral_data := jsonb_build_object(
            'direct_referrals', 0, 'spillover_count', 0, 
            'layer1_filled', 0, 'total_team_size', 0
        );
    END IF;
    
    -- 获取奖励信息
    SELECT jsonb_build_object(
        'total_rewards', COALESCE(COUNT(*), 0),
        'claimable_rewards', COALESCE(COUNT(*) FILTER (WHERE lr.status = 'claimable'), 0),
        'claimed_rewards', COALESCE(COUNT(*) FILTER (WHERE lr.status = 'claimed'), 0),
        'pending_rewards', COALESCE(COUNT(*) FILTER (WHERE lr.status = 'pending'), 0),
        'claimable_amount_usdt', COALESCE(SUM(lr.final_reward_amount) FILTER (WHERE lr.status = 'claimable'), 0),
        'claimed_amount_usdt', COALESCE(SUM(lr.final_reward_amount) FILTER (WHERE lr.status = 'claimed'), 0),
        'pending_amount_usdt', COALESCE(SUM(lr.final_reward_amount) FILTER (WHERE lr.status = 'pending'), 0)
    ) INTO reward_data
    FROM layer_rewards lr
    WHERE lr.reward_recipient = (user_data->>'wallet_address')::VARCHAR;
    
    IF reward_data IS NULL THEN
        reward_data := jsonb_build_object(
            'total_rewards', 0, 'claimable_rewards', 0, 'claimed_rewards', 0, 'pending_rewards', 0,
            'claimable_amount_usdt', 0, 'claimed_amount_usdt', 0, 'pending_amount_usdt', 0
        );
    END IF;
    
    -- 获取矩阵位置信息（如果是会员）
    IF (member_data->>'is_member')::BOOLEAN THEN
        SELECT jsonb_build_object(
            'l_position', jsonb_build_object(
                'activation_id', l_m.activation_id,
                'username', l_m.username,
                'wallet_address', l_m.wallet_address
            ),
            'm_position', jsonb_build_object(
                'activation_id', m_m.activation_id,
                'username', m_m.username,
                'wallet_address', m_m.wallet_address
            ),
            'r_position', jsonb_build_object(
                'activation_id', r_m.activation_id,
                'username', r_m.username,
                'wallet_address', r_m.wallet_address
            ),
            'vacant_position', CASE 
                WHEN l_m.activation_id IS NULL THEN 'L'
                WHEN m_m.activation_id IS NULL THEN 'M'
                WHEN r_m.activation_id IS NULL THEN 'R'
                ELSE 'FULL'
            END
        ) INTO matrix_data
        FROM membership root_m
        LEFT JOIN matrix_placements l_mp ON root_m.wallet_address = l_mp.matrix_root AND l_mp.matrix_layer = 1 AND l_mp.matrix_position = 'L'
        LEFT JOIN membership l_m ON l_mp.member_wallet = l_m.wallet_address
        LEFT JOIN matrix_placements m_mp ON root_m.wallet_address = m_mp.matrix_root AND m_mp.matrix_layer = 1 AND m_mp.matrix_position = 'M'
        LEFT JOIN membership m_m ON m_mp.member_wallet = m_m.wallet_address
        LEFT JOIN matrix_placements r_mp ON root_m.wallet_address = r_mp.matrix_root AND r_mp.matrix_layer = 1 AND r_mp.matrix_position = 'R'
        LEFT JOIN membership r_m ON r_mp.member_wallet = r_m.wallet_address
        WHERE root_m.wallet_address = (user_data->>'wallet_address')::VARCHAR;
    END IF;
    
    IF matrix_data IS NULL THEN
        matrix_data := jsonb_build_object('vacant_position', 'L');
    END IF;
    
    -- 构建完整响应
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'user', user_data,
            'membership', member_data,
            'referrals', referral_data,
            'rewards', reward_data,
            'matrix', matrix_data
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to get user profile: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 第4步：创建用户检查函数（用于前端验证）
-- ========================================

-- 检查用户名是否可用
CREATE OR REPLACE FUNCTION check_username_available(p_username VARCHAR(50))
RETURNS JSONB AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = LOWER(p_username)) THEN
        RETURN jsonb_build_object('available', false, 'message', 'Username is already taken');
    ELSE
        RETURN jsonb_build_object('available', true, 'message', 'Username is available');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 检查邮箱是否可用
CREATE OR REPLACE FUNCTION check_email_available(p_email VARCHAR(255))
RETURNS JSONB AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE LOWER(email) = LOWER(p_email)) THEN
        RETURN jsonb_build_object('available', false, 'message', 'Email is already registered');
    ELSE
        RETURN jsonb_build_object('available', true, 'message', 'Email is available');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 检查钱包地址是否已注册
CREATE OR REPLACE FUNCTION check_wallet_registered(p_wallet_address VARCHAR(42))
RETURNS JSONB AS $$
DECLARE
    user_info JSONB;
BEGIN
    SELECT jsonb_build_object(
        'registered', true,
        'username', u.username,
        'email', u.email,
        'role', u.role,
        'is_member', CASE WHEN m.wallet_address IS NOT NULL THEN true ELSE false END,
        'activation_id', m.activation_id
    ) INTO user_info
    FROM users u
    LEFT JOIN membership m ON u.wallet_address = m.wallet_address
    WHERE u.wallet_address = p_wallet_address;
    
    IF user_info IS NULL THEN
        RETURN jsonb_build_object('registered', false, 'message', 'Wallet not registered');
    ELSE
        RETURN user_info;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 第5步：创建前端UserProfile组件所需的视图
-- ========================================

-- 简化的用户Profile视图（用于快速查询）
CREATE OR REPLACE VIEW user_profile_view AS
SELECT 
    u.username,
    u.wallet_address,
    u.email,
    u.role,
    u.registration_source,
    u.created_at as registered_at,
    
    -- 会员信息
    m.activation_id,
    m.current_level,
    nml.level_name,
    nml.nft_price_usdt as level_price,
    nml.tier as level_tier,
    m.activation_time,
    
    -- 推荐人信息
    ref_m.username as referrer_username,
    ref_m.activation_id as referrer_activation_id,
    
    -- 统计信息
    COALESCE(stats.direct_referrals, 0) as direct_referrals,
    COALESCE(stats.total_rewards, 0) as total_rewards,
    COALESCE(stats.claimable_amount, 0) as claimable_amount_usdt,
    
    -- 状态信息
    CASE 
        WHEN m.activation_id IS NOT NULL THEN 'member'
        ELSE 'registered'
    END as status
    
FROM users u
LEFT JOIN membership m ON u.wallet_address = m.wallet_address
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN membership ref_m ON u.referrer_wallet = ref_m.wallet_address
LEFT JOIN (
    SELECT 
        mp.matrix_root,
        COUNT(*) FILTER (WHERE mp.is_direct_referral = true) as direct_referrals,
        COUNT(lr.id) as total_rewards,
        SUM(lr.final_reward_amount) FILTER (WHERE lr.status = 'claimable') as claimable_amount
    FROM matrix_placements mp
    LEFT JOIN layer_rewards lr ON mp.matrix_root = lr.reward_recipient
    GROUP BY mp.matrix_root
) stats ON u.wallet_address = stats.matrix_root;

-- 第6步：测试和演示函数
-- ========================================

-- 演示注册用户
SELECT '=== 用户注册和Profile系统完成 ===' as status;

-- 显示用户Profile视图预览
SELECT '=== 用户Profile视图预览 ===' as section;
SELECT 
    username, wallet_address, status, level_name, 
    direct_referrals, total_rewards, claimable_amount_usdt
FROM user_profile_view 
ORDER BY registered_at DESC
LIMIT 5;

-- 演示函数使用
SELECT '=== 函数使用演示 ===' as section;

-- 检查用户名可用性示例
SELECT '检查用户名可用性' as demo, check_username_available('newuser123') as result
UNION ALL
SELECT '检查邮箱可用性', check_email_available('test@example.com')
UNION ALL  
SELECT '检查钱包注册状态', check_wallet_registered('0x0000000000000000000000000000000000000000');

-- 使用说明
SELECT '=== 前端使用说明 ===' as usage_guide;
SELECT '1. 用户注册: SELECT register_user_complete(wallet, username, email, referrer)' as instruction
UNION ALL
SELECT '2. 获取Profile: SELECT get_user_profile(username)'
UNION ALL
SELECT '3. 检查可用性: SELECT check_username_available(username)'
UNION ALL
SELECT '4. 快速查询: SELECT * FROM user_profile_view WHERE username = ?';