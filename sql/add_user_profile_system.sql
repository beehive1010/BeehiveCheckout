-- 添加用户Profile系统（username、email等）
-- ========================================
-- 基于MarketingPlan.md的用户注册流程
-- ========================================

-- 第1步：重新设计users表结构
-- ========================================

-- 删除现有的users表并重新创建
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    wallet_address VARCHAR(42) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    referrer_wallet VARCHAR(42), -- 推荐人钱包（注册时记录）
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'member', 'admin')) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    profile_completed BOOLEAN DEFAULT false,
    registration_source VARCHAR(50), -- 注册来源（mainnet/testnet/simulation）
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 约束条件
    CONSTRAINT valid_wallet_format CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT valid_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT username_length CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 50)
);

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referrer ON users(referrer_wallet);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 第2步：更新membership表关联users
-- ========================================

-- 为membership表添加外键约束到users表
ALTER TABLE membership 
ADD CONSTRAINT fk_membership_users 
FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE;

-- 第3步：创建用户Profile管理函数
-- ========================================

-- 用户注册函数
CREATE OR REPLACE FUNCTION register_user(
    p_wallet_address VARCHAR(42),
    p_username VARCHAR(50),
    p_email VARCHAR(255),
    p_referrer_wallet VARCHAR(42) DEFAULT NULL,
    p_source VARCHAR(50) DEFAULT 'mainnet'
)
RETURNS TEXT AS $$
DECLARE
    result_message TEXT;
BEGIN
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
    
    -- 插入用户记录
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
        'user', -- 初始为user，激活后变为member
        true,   -- profile已完成
        p_source
    );
    
    result_message := format('用户注册成功：%s (%s, %s)', p_username, p_wallet_address, p_email);
    
    -- 如果有推荐人，记录推荐关系
    IF p_referrer_wallet IS NOT NULL THEN
        result_message := result_message || format(' 推荐人：%s', p_referrer_wallet);
    END IF;
    
    RETURN result_message;
    
EXCEPTION
    WHEN unique_violation THEN
        IF SQLERRM LIKE '%username%' THEN
            RETURN format('用户名 %s 已存在', p_username);
        ELSIF SQLERRM LIKE '%email%' THEN
            RETURN format('邮箱 %s 已存在', p_email);
        ELSIF SQLERRM LIKE '%wallet_address%' THEN
            RETURN format('钱包地址 %s 已注册', p_wallet_address);
        ELSE
            RETURN '注册失败：' || SQLERRM;
        END IF;
    WHEN OTHERS THEN
        RETURN '注册失败：' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 用户激活为会员函数
CREATE OR REPLACE FUNCTION activate_membership(
    p_wallet_address VARCHAR(42),
    p_nft_level INTEGER DEFAULT 1,
    p_activation_source VARCHAR(50) DEFAULT 'mainnet'
)
RETURNS TEXT AS $$
DECLARE
    user_rec RECORD;
    next_activation_id INTEGER;
    referrer_wallet VARCHAR(42);
    result_message TEXT;
BEGIN
    -- 获取用户信息
    SELECT * INTO user_rec FROM users WHERE wallet_address = p_wallet_address;
    
    IF NOT FOUND THEN
        RETURN format('用户 %s 未注册', p_wallet_address);
    END IF;
    
    -- 检查是否已经是会员
    IF EXISTS (SELECT 1 FROM membership WHERE wallet_address = p_wallet_address) THEN
        RETURN format('用户 %s 已经是会员', user_rec.username);
    END IF;
    
    -- 获取下一个激活序号
    SELECT COALESCE(MAX(activation_id), -1) + 1 INTO next_activation_id FROM membership;
    
    -- 获取推荐人
    referrer_wallet := user_rec.referrer_wallet;
    
    -- 为超级根节点设置特殊处理
    IF next_activation_id = 0 THEN
        referrer_wallet := NULL; -- 超级根节点没有推荐人
    END IF;
    
    -- 插入会员记录
    INSERT INTO membership (
        wallet_address,
        referrer_wallet,
        current_level,
        activation_id,
        activation_time,
        nft_claimed_levels
    ) VALUES (
        p_wallet_address,
        referrer_wallet,
        p_nft_level,
        next_activation_id,
        NOW(),
        ARRAY[p_nft_level]
    );
    
    -- 更新用户角色
    UPDATE users 
    SET role = 'member', updated_at = NOW()
    WHERE wallet_address = p_wallet_address;
    
    result_message := format('用户 %s 激活成功！激活序号：%s，当前等级：%s', 
                            user_rec.username, next_activation_id, p_nft_level);
    
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN '激活失败：' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 第4步：创建完整的用户信息视图
-- ========================================

CREATE OR REPLACE VIEW user_complete_profile AS
SELECT 
    -- 基础信息
    u.wallet_address as 钱包地址,
    u.username as 用户名,
    u.email as 邮箱,
    u.role as 角色,
    u.is_active as 是否激活,
    u.email_verified as 邮箱验证,
    u.registration_source as 注册来源,
    u.created_at as 注册时间,
    
    -- 推荐信息
    u.referrer_wallet as 推荐人钱包,
    ref_u.username as 推荐人用户名,
    
    -- 会员信息
    m.activation_id as 激活序号,
    CASE 
        WHEN m.activation_id IS NULL THEN '未激活'
        ELSE nml.level_name
    END as 当前等级名称,
    COALESCE(m.current_level, 0) as 当前等级,
    COALESCE(nml.nft_price_usdt, 0) as NFT价格USDT,
    m.activation_time as 激活时间,
    
    -- 推荐统计
    COALESCE(rs.直推人数, 0) as 直推人数,
    COALESCE(rs.溢出人数, 0) as 溢出人数,
    COALESCE(rs.Layer1完成度, '0/3') as Layer1完成度,
    
    -- 奖励统计
    COALESCE(mrs.总奖励数, 0) as 总奖励数,
    COALESCE(mrs.可领取奖励, 0) as 可领取奖励,
    COALESCE(mrs.可领取金额USDT, 0) as 可领取金额USDT,
    COALESCE(mrs.已领取金额USDT, 0) as 已领取金额USDT
    
FROM users u
LEFT JOIN users ref_u ON u.referrer_wallet = ref_u.wallet_address
LEFT JOIN membership m ON u.wallet_address = m.wallet_address
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN referrals_stats rs ON u.wallet_address = rs.会员地址
LEFT JOIN member_rewards_summary mrs ON u.wallet_address = mrs.钱包地址
ORDER BY COALESCE(m.activation_id, 999999), u.created_at;

-- 第5步：创建用户查询函数
-- ========================================

-- 根据用户名查询完整信息
CREATE OR REPLACE FUNCTION get_user_by_username(p_username VARCHAR(50))
RETURNS TABLE(
    钱包地址 VARCHAR(42),
    用户名 VARCHAR(50),
    邮箱 VARCHAR(255),
    角色 VARCHAR(20),
    激活序号 INTEGER,
    当前等级名称 TEXT,
    直推人数 BIGINT,
    可领取金额USDT NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ucp.钱包地址,
        ucp.用户名,
        ucp.邮箱,
        ucp.角色,
        ucp.激活序号,
        ucp.当前等级名称,
        ucp.直推人数,
        ucp.可领取金额USDT
    FROM user_complete_profile ucp
    WHERE ucp.用户名 = p_username;
END;
$$ LANGUAGE plpgsql;

-- 根据邮箱查询完整信息
CREATE OR REPLACE FUNCTION get_user_by_email(p_email VARCHAR(255))
RETURNS TABLE(
    钱包地址 VARCHAR(42),
    用户名 VARCHAR(50),
    邮箱 VARCHAR(255),
    角色 VARCHAR(20),
    激活序号 INTEGER,
    当前等级名称 TEXT,
    直推人数 BIGINT,
    可领取金额USDT NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ucp.钱包地址,
        ucp.用户名,
        ucp.邮箱,
        ucp.角色,
        ucp.激活序号,
        ucp.当前等级名称,
        ucp.直推人数,
        ucp.可领取金额USDT
    FROM user_complete_profile ucp
    WHERE ucp.邮箱 = p_email;
END;
$$ LANGUAGE plpgsql;

-- 第6步：创建用户管理视图
-- ========================================

-- 未激活用户列表
CREATE OR REPLACE VIEW unactivated_users AS
SELECT 
    u.username as 用户名,
    u.email as 邮箱,
    u.wallet_address as 钱包地址,
    u.referrer_wallet as 推荐人钱包,
    ref_u.username as 推荐人用户名,
    u.registration_source as 注册来源,
    u.created_at as 注册时间,
    EXTRACT(DAY FROM NOW() - u.created_at) as 注册天数
FROM users u
LEFT JOIN users ref_u ON u.referrer_wallet = ref_u.wallet_address
WHERE u.role = 'user'
AND NOT EXISTS (SELECT 1 FROM membership WHERE wallet_address = u.wallet_address)
ORDER BY u.created_at DESC;

-- 推荐人排行榜
CREATE OR REPLACE VIEW referrer_leaderboard AS
SELECT 
    u.username as 推荐人用户名,
    u.wallet_address as 推荐人钱包,
    COUNT(ref_u.wallet_address) as 总推荐人数,
    COUNT(m.wallet_address) as 激活会员人数,
    ROUND(COUNT(m.wallet_address)::NUMERIC / NULLIF(COUNT(ref_u.wallet_address), 0) * 100, 2) as 激活转化率,
    SUM(COALESCE(nml.nft_price_usdt, 0)) as 推荐总价值USDT
FROM users u
LEFT JOIN users ref_u ON u.wallet_address = ref_u.referrer_wallet
LEFT JOIN membership m ON ref_u.wallet_address = m.wallet_address
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
WHERE EXISTS (SELECT 1 FROM users WHERE referrer_wallet = u.wallet_address)
GROUP BY u.username, u.wallet_address
ORDER BY 激活会员人数 DESC, 总推荐人数 DESC;

-- 第7步：显示系统状态
-- ========================================

SELECT '=== 用户Profile系统创建完成 ===' as status;
SELECT COUNT(*) || '个用户记录' as users_count FROM users;
SELECT COUNT(*) || '个激活会员' as members_count FROM membership;

-- 示例：注册一些测试用户
SELECT '=== 注册测试用户示例 ===' as section;

-- 显示用户完整信息预览
SELECT '=== 用户完整信息预览 ===' as section;
SELECT 
    激活序号, 用户名, 钱包地址, 角色, 当前等级名称, 直推人数, 总奖励数, 可领取金额USDT
FROM user_complete_profile 
ORDER BY COALESCE(激活序号, 999999)
LIMIT 5;

-- 显示未激活用户
SELECT '=== 未激活用户列表 ===' as section;
SELECT * FROM unactivated_users LIMIT 3;

-- 显示推荐人排行榜
SELECT '=== 推荐人排行榜 ===' as section;
SELECT * FROM referrer_leaderboard LIMIT 3;