-- 将Profile信息绑定到membership表，方便前端查询
-- ========================================
-- 将常用的username、email直接存储到membership表中
-- ========================================

-- 第1步：为membership表添加profile字段
-- ========================================

ALTER TABLE membership 
ADD COLUMN IF NOT EXISTS username VARCHAR(50),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS profile_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_membership_username ON membership(username);
CREATE INDEX IF NOT EXISTS idx_membership_email ON membership(email);

-- 第2步：更新激活会员函数，同时写入profile信息
-- ========================================

CREATE OR REPLACE FUNCTION activate_membership_with_profile(
    p_wallet_address VARCHAR(42),
    p_username VARCHAR(50),
    p_email VARCHAR(255),
    p_referrer_wallet VARCHAR(42) DEFAULT NULL,
    p_nft_level INTEGER DEFAULT 1,
    p_activation_source VARCHAR(50) DEFAULT 'mainnet',
    p_display_name VARCHAR(100) DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    next_activation_id INTEGER;
    result_message TEXT;
BEGIN
    -- 检查是否已经是会员
    IF EXISTS (SELECT 1 FROM membership WHERE wallet_address = p_wallet_address) THEN
        RETURN format('钱包 %s 已经是会员', p_wallet_address);
    END IF;
    
    -- 检查username是否重复
    IF EXISTS (SELECT 1 FROM membership WHERE username = p_username) THEN
        RETURN format('用户名 %s 已被使用', p_username);
    END IF;
    
    -- 检查email是否重复
    IF EXISTS (SELECT 1 FROM membership WHERE email = p_email) THEN
        RETURN format('邮箱 %s 已被使用', p_email);
    END IF;
    
    -- 验证推荐人是否存在且是激活会员
    IF p_referrer_wallet IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM membership 
            WHERE wallet_address = p_referrer_wallet 
            AND current_level > 0
        ) THEN
            RETURN format('推荐人 %s 不是激活会员', p_referrer_wallet);
        END IF;
    END IF;
    
    -- 获取下一个激活序号
    SELECT COALESCE(MAX(activation_id), -1) + 1 INTO next_activation_id FROM membership;
    
    -- 为超级根节点设置特殊处理
    IF next_activation_id = 0 THEN
        p_referrer_wallet := NULL; -- 超级根节点没有推荐人
    END IF;
    
    -- 同时注册users表（如果不存在）
    INSERT INTO users (
        wallet_address,
        username,
        email,
        referrer_wallet,
        role,
        profile_completed,
        registration_source
    ) VALUES (
        p_wallet_address,
        p_username,
        p_email,
        p_referrer_wallet,
        'member',
        true,
        p_activation_source
    )
    ON CONFLICT (wallet_address) DO UPDATE SET
        role = 'member',
        updated_at = NOW();
    
    -- 插入会员记录（包含profile信息）
    INSERT INTO membership (
        wallet_address,
        referrer_wallet,
        current_level,
        activation_id,
        activation_time,
        nft_claimed_levels,
        username,
        email,
        display_name
    ) VALUES (
        p_wallet_address,
        p_referrer_wallet,
        p_nft_level,
        next_activation_id,
        NOW(),
        ARRAY[p_nft_level],
        p_username,
        p_email,
        COALESCE(p_display_name, p_username)
    );
    
    result_message := format('用户 %s (%s) 激活成功！激活序号：%s，当前等级：%s', 
                            p_username, p_wallet_address, next_activation_id, p_nft_level);
    
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN '激活失败：' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 第3步：创建简化的前端查询视图
-- ========================================

-- 前端会员列表视图（包含所有常用信息）
CREATE OR REPLACE VIEW frontend_members AS
SELECT 
    -- 基础信息
    m.activation_id as activation_id,
    m.wallet_address as wallet_address,
    m.username as username,
    m.email as email,
    COALESCE(m.display_name, m.username) as display_name,
    m.profile_avatar_url as avatar_url,
    
    -- 会员等级信息
    m.current_level as current_level,
    nml.level_name as level_name,
    nml.nft_price_usdt as level_price_usdt,
    nml.tier as level_tier,
    m.activation_time as activation_time,
    
    -- 推荐信息
    m.referrer_wallet as referrer_wallet,
    ref_m.username as referrer_username,
    ref_m.display_name as referrer_display_name,
    
    -- 矩阵统计
    COALESCE(matrix_stats.direct_referrals, 0) as direct_referrals,
    COALESCE(matrix_stats.spillover_count, 0) as spillover_count,
    COALESCE(matrix_stats.layer1_filled, 0) as layer1_filled,
    COALESCE(matrix_stats.next_vacant_position, 'L') as next_vacant_position,
    
    -- 奖励统计
    COALESCE(reward_stats.total_rewards, 0) as total_rewards,
    COALESCE(reward_stats.claimable_rewards, 0) as claimable_rewards,
    COALESCE(reward_stats.claimable_amount, 0) as claimable_amount_usdt,
    COALESCE(reward_stats.claimed_amount, 0) as claimed_amount_usdt
    
FROM membership m
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN membership ref_m ON m.referrer_wallet = ref_m.wallet_address
LEFT JOIN (
    -- 矩阵统计子查询
    SELECT 
        matrix_root,
        COUNT(*) FILTER (WHERE is_direct_referral = true) as direct_referrals,
        COUNT(*) FILTER (WHERE is_spillover_placed = true) as spillover_count,
        COUNT(*) FILTER (WHERE matrix_layer = 1) as layer1_filled,
        CASE 
            WHEN COUNT(*) FILTER (WHERE matrix_layer = 1 AND matrix_position = 'L') = 0 THEN 'L'
            WHEN COUNT(*) FILTER (WHERE matrix_layer = 1 AND matrix_position = 'M') = 0 THEN 'M'
            WHEN COUNT(*) FILTER (WHERE matrix_layer = 1 AND matrix_position = 'R') = 0 THEN 'R'
            ELSE 'FULL'
        END as next_vacant_position
    FROM matrix_placements
    GROUP BY matrix_root
) matrix_stats ON m.wallet_address = matrix_stats.matrix_root
LEFT JOIN (
    -- 奖励统计子查询
    SELECT 
        reward_recipient,
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE status = 'claimable') as claimable_rewards,
        SUM(final_reward_amount) FILTER (WHERE status = 'claimable') as claimable_amount,
        SUM(final_reward_amount) FILTER (WHERE status = 'claimed') as claimed_amount
    FROM layer_rewards
    GROUP BY reward_recipient
) reward_stats ON m.wallet_address = reward_stats.reward_recipient
ORDER BY m.activation_id;

-- 第4步：创建前端API函数
-- ========================================

-- 根据username获取会员信息
CREATE OR REPLACE FUNCTION get_member_by_username(p_username VARCHAR(50))
RETURNS TABLE(
    activation_id INTEGER,
    wallet_address VARCHAR(42),
    username VARCHAR(50),
    display_name VARCHAR(100),
    email VARCHAR(255),
    current_level INTEGER,
    level_name VARCHAR(50),
    level_price_usdt DECIMAL(10,2),
    referrer_username VARCHAR(50),
    direct_referrals BIGINT,
    claimable_amount_usdt NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fm.activation_id,
        fm.wallet_address,
        fm.username,
        fm.display_name,
        fm.email,
        fm.current_level,
        fm.level_name,
        fm.level_price_usdt,
        fm.referrer_username,
        fm.direct_referrals,
        fm.claimable_amount_usdt
    FROM frontend_members fm
    WHERE fm.username = p_username;
END;
$$ LANGUAGE plpgsql;

-- 根据激活序号获取会员信息
CREATE OR REPLACE FUNCTION get_member_by_activation_id(p_activation_id INTEGER)
RETURNS TABLE(
    activation_id INTEGER,
    wallet_address VARCHAR(42),
    username VARCHAR(50),
    display_name VARCHAR(100),
    email VARCHAR(255),
    current_level INTEGER,
    level_name VARCHAR(50),
    level_price_usdt DECIMAL(10,2),
    referrer_username VARCHAR(50),
    direct_referrals BIGINT,
    claimable_amount_usdt NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fm.activation_id,
        fm.wallet_address,
        fm.username,
        fm.display_name,
        fm.email,
        fm.current_level,
        fm.level_name,
        fm.level_price_usdt,
        fm.referrer_username,
        fm.direct_referrals,
        fm.claimable_amount_usdt
    FROM frontend_members fm
    WHERE fm.activation_id = p_activation_id;
END;
$$ LANGUAGE plpgsql;

-- 获取推荐排行榜
CREATE OR REPLACE FUNCTION get_referrer_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    rank INTEGER,
    activation_id INTEGER,
    username VARCHAR(50),
    display_name VARCHAR(100),
    wallet_address VARCHAR(42),
    direct_referrals BIGINT,
    total_team_value_usdt NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH referrer_stats AS (
        SELECT 
            fm.activation_id,
            fm.username,
            fm.display_name,
            fm.wallet_address,
            fm.direct_referrals,
            -- 计算团队总价值
            SUM(team_fm.level_price_usdt) as total_team_value
        FROM frontend_members fm
        LEFT JOIN frontend_members team_fm ON fm.wallet_address = team_fm.referrer_wallet
        WHERE fm.direct_referrals > 0
        GROUP BY fm.activation_id, fm.username, fm.display_name, fm.wallet_address, fm.direct_referrals
    )
    SELECT 
        ROW_NUMBER() OVER (ORDER BY rs.direct_referrals DESC, rs.total_team_value DESC)::INTEGER as rank,
        rs.activation_id,
        rs.username,
        rs.display_name,
        rs.wallet_address,
        rs.direct_referrals,
        COALESCE(rs.total_team_value, 0) as total_team_value_usdt
    FROM referrer_stats rs
    ORDER BY rs.direct_referrals DESC, rs.total_team_value DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 第5步：创建简化的矩阵视图（前端用）
-- ========================================

CREATE OR REPLACE VIEW frontend_matrix_structure AS
SELECT 
    m.activation_id as root_activation_id,
    m.username as root_username,
    m.display_name as root_display_name,
    m.wallet_address as root_wallet,
    
    -- Layer 1 位置信息
    l_member.activation_id as l_activation_id,
    l_member.username as l_username,
    l_member.display_name as l_display_name,
    
    m_member.activation_id as m_activation_id,
    m_member.username as m_username,
    m_member.display_name as m_display_name,
    
    r_member.activation_id as r_activation_id,
    r_member.username as r_username,
    r_member.display_name as r_display_name,
    
    -- 统计信息
    CASE 
        WHEN l_member.activation_id IS NULL THEN 'L'
        WHEN m_member.activation_id IS NULL THEN 'M'
        WHEN r_member.activation_id IS NULL THEN 'R'
        ELSE 'FULL'
    END as next_position,
    
    (CASE WHEN l_member.activation_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN m_member.activation_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN r_member.activation_id IS NOT NULL THEN 1 ELSE 0 END) as filled_positions
     
FROM membership m
LEFT JOIN matrix_placements mp_l ON m.wallet_address = mp_l.matrix_root AND mp_l.matrix_layer = 1 AND mp_l.matrix_position = 'L'
LEFT JOIN membership l_member ON mp_l.member_wallet = l_member.wallet_address
LEFT JOIN matrix_placements mp_m ON m.wallet_address = mp_m.matrix_root AND mp_m.matrix_layer = 1 AND mp_m.matrix_position = 'M'
LEFT JOIN membership m_member ON mp_m.member_wallet = m_member.wallet_address
LEFT JOIN matrix_placements mp_r ON m.wallet_address = mp_r.matrix_root AND mp_r.matrix_layer = 1 AND mp_r.matrix_position = 'R'
LEFT JOIN membership r_member ON mp_r.member_wallet = r_member.wallet_address
ORDER BY m.activation_id;

-- 第6步：显示系统状态
-- ========================================

SELECT '=== Profile信息绑定到membership表完成 ===' as status;

-- 显示前端会员信息预览
SELECT '=== 前端会员信息预览 ===' as section;
SELECT 
    activation_id, username, display_name, level_name, direct_referrals, 
    claimable_rewards, claimable_amount_usdt
FROM frontend_members 
ORDER BY activation_id 
LIMIT 5;

-- 显示矩阵结构预览
SELECT '=== 前端矩阵结构预览 ===' as section;
SELECT 
    root_activation_id, root_username, 
    l_username, m_username, r_username, 
    next_position, filled_positions
FROM frontend_matrix_structure 
ORDER BY root_activation_id 
LIMIT 5;

-- 显示推荐排行榜预览
SELECT '=== 推荐排行榜预览 ===' as section;
SELECT rank, username, direct_referrals, total_team_value_usdt
FROM get_referrer_leaderboard(5);