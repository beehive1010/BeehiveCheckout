-- 简化的用户和管理员架构重设计
-- Simplified user and admin architecture redesign

BEGIN;

-- ===== 第1步：更新users表结构 =====
-- Step 1: Update users table structure

-- 确保users表有正确的列
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS username VARCHAR(100),
ADD COLUMN IF NOT EXISTS pre_referrer VARCHAR(42),
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin'));

-- 创建pre_referrer的自引用外键
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pre_referrer_fkey;
ALTER TABLE users 
ADD CONSTRAINT users_pre_referrer_fkey 
FOREIGN KEY (pre_referrer) REFERENCES users(wallet_address) 
ON DELETE SET NULL;

-- ===== 第2步：创建admins表 =====
-- Step 2: Create admins table

CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    admin_level INTEGER DEFAULT 1 CHECK (admin_level BETWEEN 1 AND 3),
    permissions JSONB DEFAULT '[]'::jsonb,
    created_by VARCHAR(42),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 外键约束
    CONSTRAINT admins_wallet_fkey 
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) 
        ON DELETE CASCADE,
    CONSTRAINT admins_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(wallet_address) 
        ON DELETE SET NULL
);

-- ===== 第3步：创建管理员权限表 =====
-- Step 3: Create admin permissions table

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

-- ===== 第4步：创建管理员权限检查函数 =====
-- Step 4: Create admin permission check function

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

-- ===== 第5步：创建用户完整信息视图 =====
-- Step 5: Create user complete info view

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

-- ===== 第6步：创建管理员列表视图 =====
-- Step 6: Create admin list view

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

-- ===== 第7步：创建索引 =====
-- Step 7: Create indexes

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_pre_referrer ON users(pre_referrer);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE INDEX IF NOT EXISTS idx_admins_level ON admins(admin_level);
CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(is_active);
CREATE INDEX IF NOT EXISTS idx_admins_permissions ON admins USING GIN(permissions);

-- ===== 第8步：创建触发器 =====
-- Step 8: Create triggers

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

-- ===== 完成信息 =====
SELECT 'User and Admin Architecture Redesign Completed!' as status;
SELECT 'New Structure:' as summary;
SELECT '✅ users: wallet_address, email, username, pre_referrer, role' as structure1;
SELECT '✅ admins: separate admin management with levels and permissions' as structure2;
SELECT '✅ admin_permissions: permission definitions and required levels' as structure3;
SELECT '✅ Functions: check_admin_permission() for permission checking' as functions;
SELECT '✅ Views: user_complete_info, admin_list' as views;

COMMIT;