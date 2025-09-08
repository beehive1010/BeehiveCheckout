-- 重新设计用户和管理员架构
-- Redesign user and admin architecture

BEGIN;

-- ===== 第1步：重新设计users表结构 =====
-- Step 1: Redesign users table structure

-- users表应该只包含基础信息：
-- - wallet_address (主键)
-- - email (邮箱)  
-- - username (用户名)
-- - pre_referrer (注册时的推荐人，引用users表)
-- - role (角色：'member' 或 'admin')
-- - created_at, updated_at

-- 1.1 添加缺失的列到users表
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS username VARCHAR(100),
ADD COLUMN IF NOT EXISTS pre_referrer VARCHAR(42),
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin'));

-- 1.2 更新users表的pre_referrer外键（自引用）
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pre_referrer_fkey;
ALTER TABLE users 
ADD CONSTRAINT users_pre_referrer_fkey 
FOREIGN KEY (pre_referrer) REFERENCES users(wallet_address) 
ON DELETE SET NULL;

-- 1.3 重命名现有的referrer_wallet为pre_referrer（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'referrer_wallet'
        AND table_schema = 'public'
    ) THEN
        -- 如果pre_referrer列为空，从referrer_wallet复制数据
        UPDATE users 
        SET pre_referrer = referrer_wallet 
        WHERE pre_referrer IS NULL AND referrer_wallet IS NOT NULL;
        
        -- 删除旧列
        ALTER TABLE users DROP COLUMN referrer_wallet CASCADE;
    END IF;
END $$;

-- ===== 第2步：创建单独的管理员表 =====
-- Step 2: Create separate admin table

-- 2.1 创建admins表
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    admin_level INTEGER DEFAULT 1, -- 1: 基础管理员, 2: 高级管理员, 3: 超级管理员
    permissions JSONB DEFAULT '[]'::jsonb, -- 权限数组
    created_by VARCHAR(42), -- 创建此管理员的管理员
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 外键约束
    CONSTRAINT admins_wallet_fkey 
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) 
        ON DELETE CASCADE,
    CONSTRAINT admins_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(wallet_address) 
        ON DELETE SET NULL,
        
    -- 检查约束
    CONSTRAINT check_admin_level CHECK (admin_level BETWEEN 1 AND 3)
);

-- 2.2 创建管理员权限枚举
CREATE TABLE IF NOT EXISTS admin_permissions (
    permission_name VARCHAR(50) PRIMARY KEY,
    description TEXT,
    required_level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入基础权限
INSERT INTO admin_permissions (permission_name, description, required_level) VALUES
    ('manage_users', '管理用户账户', 1),
    ('manage_members', '管理会员激活和状态', 1),
    ('manage_rewards', '管理奖励分配', 2),
    ('manage_nfts', '管理NFT和等级', 2),
    ('manage_finances', '管理财务和提现', 2),
    ('manage_system', '管理系统设置', 3),
    ('manage_admins', '管理其他管理员', 3),
    ('view_analytics', '查看数据分析', 1),
    ('manage_content', '管理内容和博客', 1),
    ('manage_courses', '管理课程', 1)
ON CONFLICT (permission_name) DO NOTHING;

-- 2.3 更新users表中现有管理员的role
UPDATE users 
SET role = 'admin' 
WHERE wallet_address IN (
    SELECT DISTINCT admin_wallet 
    FROM admin_actions 
    WHERE admin_wallet IS NOT NULL
) OR wallet_address IN (
    SELECT DISTINCT admin_wallet 
    FROM countdown_timers 
    WHERE admin_wallet IS NOT NULL
);

-- 2.4 为现有管理员创建admins记录
INSERT INTO admins (wallet_address, admin_level, permissions, is_active)
SELECT 
    wallet_address,
    3 as admin_level, -- 默认为超级管理员
    '["manage_users", "manage_members", "manage_rewards", "manage_nfts", "manage_finances", "manage_system", "manage_admins", "view_analytics", "manage_content", "manage_courses"]'::jsonb,
    true
FROM users 
WHERE role = 'admin'
ON CONFLICT (wallet_address) DO NOTHING;

-- ===== 第3步：更新外键绑定使用新的架构 =====
-- Step 3: Update foreign key bindings for new architecture

-- 3.1 管理员相关表现在绑定到admins表而不是users表

-- admin_actions表
ALTER TABLE admin_actions DROP CONSTRAINT IF EXISTS admin_actions_admin_wallet_fkey;
-- 先检查admin_actions表是否存在
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_actions' AND table_schema = 'public') THEN
        ALTER TABLE admin_actions 
        ADD CONSTRAINT admin_actions_admin_wallet_fkey 
        FOREIGN KEY (admin_wallet) REFERENCES admins(wallet_address) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- countdown_timers表的admin_wallet
ALTER TABLE countdown_timers DROP CONSTRAINT IF EXISTS countdown_timers_admin_wallet_fkey;
ALTER TABLE countdown_timers 
ADD CONSTRAINT countdown_timers_admin_wallet_fkey 
FOREIGN KEY (admin_wallet) REFERENCES admins(wallet_address) 
ON DELETE SET NULL;

-- 3.2 内容创作类表绑定到users表（用户和管理员都可以创作）
-- blog_posts表
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_author_wallet_fkey;
-- 检查列是否存在
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'blog_posts' 
        AND column_name = 'author_wallet'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE blog_posts 
        ADD CONSTRAINT blog_posts_author_wallet_fkey 
        FOREIGN KEY (author_wallet) REFERENCES users(wallet_address) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- courses表
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_instructor_wallet_fkey;
-- 检查列是否存在
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' 
        AND column_name = 'instructor_wallet'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE courses 
        ADD CONSTRAINT courses_instructor_wallet_fkey 
        FOREIGN KEY (instructor_wallet) REFERENCES users(wallet_address) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- ===== 第4步：更新membership表的推荐关系 =====
-- Step 4: Update membership table referral relationships

-- membership表的referrer_wallet应该引用users表的pre_referrer
ALTER TABLE membership DROP CONSTRAINT IF EXISTS membership_referrer_wallet_fkey;
ALTER TABLE membership 
ADD CONSTRAINT membership_referrer_wallet_fkey 
FOREIGN KEY (referrer_wallet) REFERENCES users(wallet_address) 
ON DELETE SET NULL;

-- ===== 第5步：创建有用的视图和函数 =====
-- Step 5: Create useful views and functions

-- 5.1 管理员权限检查函数
CREATE OR REPLACE FUNCTION check_admin_permission(
    p_wallet_address VARCHAR(42),
    p_permission VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    admin_record RECORD;
    required_level INTEGER;
BEGIN
    -- 获取管理员信息
    SELECT * INTO admin_record 
    FROM admins 
    WHERE wallet_address = p_wallet_address 
    AND is_active = TRUE;
    
    -- 如果不是管理员，返回false
    IF admin_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 获取权限所需等级
    SELECT required_level INTO required_level 
    FROM admin_permissions 
    WHERE permission_name = p_permission;
    
    -- 如果权限不存在，返回false
    IF required_level IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 检查管理员等级是否足够
    IF admin_record.admin_level >= required_level THEN
        RETURN TRUE;
    END IF;
    
    -- 检查是否在permissions数组中
    RETURN admin_record.permissions ? p_permission;
END;
$$ LANGUAGE plpgsql;

-- 5.2 用户完整信息视图（更新版）
CREATE OR REPLACE VIEW user_complete_info AS
SELECT 
    u.wallet_address,
    u.email,
    u.username,
    u.pre_referrer,
    u.role,
    u.created_at as registered_at,
    
    -- 管理员信息
    a.admin_level,
    a.permissions as admin_permissions,
    a.is_active as admin_active,
    
    -- 会员信息
    mem.is_activated as is_member,
    mem.current_level as member_level,
    mem.activation_rank,
    
    -- 激活状态信息
    m.claim_status,
    m.activated_at,
    m.activation_tier,
    m.bcc_locked_amount,
    
    -- BCC余额信息
    ub.bcc_transferable,
    ub.bcc_locked,
    (ub.bcc_transferable + ub.bcc_locked) as total_bcc,
    
    -- 总体状态
    CASE 
        WHEN mem.is_activated = TRUE THEN 'active_member'
        WHEN m.activated_at IS NOT NULL THEN 'activated_pending'  
        WHEN m.claimed_at IS NOT NULL THEN 'claimed_pending'
        WHEN m.wallet_address IS NOT NULL THEN 'membership_initiated'
        WHEN u.role = 'admin' THEN 'admin'
        ELSE 'registered_user'
    END as overall_status
    
FROM users u
LEFT JOIN admins a ON u.wallet_address = a.wallet_address
LEFT JOIN members mem ON u.wallet_address = mem.wallet_address  
LEFT JOIN membership m ON u.wallet_address = m.wallet_address
LEFT JOIN user_balances ub ON u.wallet_address = ub.wallet_address;

-- 5.3 管理员列表视图
CREATE OR REPLACE VIEW admin_list AS
SELECT 
    u.wallet_address,
    u.username,
    u.email,
    a.admin_level,
    a.permissions,
    a.is_active,
    a.created_at as admin_since,
    creator.username as created_by_username
FROM admins a
JOIN users u ON a.wallet_address = u.wallet_address
LEFT JOIN users creator ON a.created_by = creator.wallet_address
ORDER BY a.admin_level DESC, a.created_at ASC;

-- ===== 第6步：创建索引优化 =====
-- Step 6: Create index optimizations

-- users表索引
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_pre_referrer ON users(pre_referrer);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- admins表索引  
CREATE INDEX IF NOT EXISTS idx_admins_level ON admins(admin_level);
CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(is_active);
CREATE INDEX IF NOT EXISTS idx_admins_permissions ON admins USING GIN(permissions);

-- ===== 第7步：更新触发器 =====
-- Step 7: Update triggers

-- 创建更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为admins表添加更新时间触发器
DROP TRIGGER IF EXISTS trigger_admins_updated_at ON admins;
CREATE TRIGGER trigger_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为users表添加更新时间触发器
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 第8步：示例数据和使用方法 =====
-- Step 8: Example data and usage

SELECT 'User and Admin Architecture Redesign Completed!' as status;
SELECT 'Key Changes:' as summary;
SELECT '- users table: email, username, pre_referrer, role (member/admin)' as change1;
SELECT '- admins table: separate admin management with levels and permissions' as change2;
SELECT '- Foreign keys updated: admin functions → admins table, content → users table' as change3;
SELECT '- New functions: check_admin_permission(), updated views' as change4;

-- 显示架构摘要
SELECT 'Architecture Summary:' as architecture;
SELECT 'users (basic identity) → admins (admin management) + members (activated members)' as flow;

COMMIT;