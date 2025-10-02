-- 最终修复 - 完全不使用user_keys概念
-- ========================================
-- 只使用wallet_address作为主键，username作为显示名称
-- ========================================

-- 第1步：彻底检查并清理任何user_keys残留
-- ========================================

SELECT '=== 彻底清理user_keys概念 ===' as status;

-- 删除任何包含user_keys的表、视图、函数
DROP TABLE IF EXISTS user_keys CASCADE;
DROP VIEW IF EXISTS user_keys CASCADE;
DROP FUNCTION IF EXISTS generate_user_keys() CASCADE;
DROP FUNCTION IF EXISTS get_user_key(VARCHAR) CASCADE;

-- 检查所有表，确保没有user_key相关字段
DO $$ 
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT table_name, column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND (column_name ILIKE '%user_key%' OR column_name ILIKE '%userkey%')
    LOOP
        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %I CASCADE', rec.table_name, rec.column_name);
        RAISE NOTICE '删除了表 % 中的 % 字段', rec.table_name, rec.column_name;
    END LOOP;
    
    IF NOT FOUND THEN
        RAISE NOTICE '确认：系统中没有user_keys相关字段';
    END IF;
END $$;

-- 第2步：修复membership表（只使用wallet_address + username）
-- ========================================

-- 确保membership表结构正确
DO $$ 
BEGIN
    RAISE NOTICE '修复membership表结构...';
    
    -- 确保主键是wallet_address
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'membership' 
        AND constraint_type = 'PRIMARY KEY'
        AND constraint_name IN (
            SELECT constraint_name FROM information_schema.key_column_usage 
            WHERE table_name = 'membership' AND column_name = 'wallet_address'
        )
    ) THEN
        ALTER TABLE membership DROP CONSTRAINT IF EXISTS membership_pkey;
        ALTER TABLE membership ADD PRIMARY KEY (wallet_address);
        RAISE NOTICE '设置wallet_address为主键';
    END IF;
    
    -- 添加必要字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'username') THEN
        ALTER TABLE membership ADD COLUMN username VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'activation_id') THEN
        ALTER TABLE membership ADD COLUMN activation_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'referrer_wallet') THEN
        ALTER TABLE membership ADD COLUMN referrer_wallet VARCHAR(42);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'current_level') THEN
        ALTER TABLE membership ADD COLUMN current_level INTEGER DEFAULT 1;
    END IF;
    
    RAISE NOTICE 'membership表结构检查完成';
END $$;

-- 第3步：修复matrix_placements表（只使用wallet_address引用）
-- ========================================

-- 确保matrix_placements表存在且结构正确
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matrix_placements') THEN
        CREATE TABLE matrix_placements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            member_wallet VARCHAR(42) NOT NULL,      -- 被安置的会员wallet
            matrix_root VARCHAR(42) NOT NULL,        -- 矩阵根节点wallet  
            matrix_layer INTEGER NOT NULL DEFAULT 1,
            matrix_position CHAR(1) CHECK (matrix_position IN ('L','M','R')),
            is_direct_referral BOOLEAN DEFAULT false,
            is_spillover_placed BOOLEAN DEFAULT false,
            placed_at TIMESTAMP DEFAULT NOW(),
            
            -- 外键约束直接引用membership.wallet_address
            FOREIGN KEY (member_wallet) REFERENCES membership(wallet_address) ON DELETE CASCADE,
            FOREIGN KEY (matrix_root) REFERENCES membership(wallet_address) ON DELETE CASCADE
        );
        RAISE NOTICE '创建了matrix_placements表';
    END IF;
    
    -- 确保关键字段存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matrix_placements' AND column_name = 'is_direct_referral') THEN
        ALTER TABLE matrix_placements ADD COLUMN is_direct_referral BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matrix_placements' AND column_name = 'is_spillover_placed') THEN
        ALTER TABLE matrix_placements ADD COLUMN is_spillover_placed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 第4步：重新创建纯净的视图（完全不涉及user_keys）
-- ========================================

-- 会员信息视图（只使用wallet_address和username）
CREATE OR REPLACE VIEW member_info AS
SELECT 
    m.wallet_address,           -- 主键
    m.activation_id,            -- 激活序号
    m.username,                 -- 用户名（显示用）
    m.referrer_wallet,          -- 推荐人wallet地址
    m.current_level,
    
    -- 推荐人用户名（通过wallet_address关联）
    ref_m.username as referrer_username,
    ref_m.activation_id as referrer_activation_id,
    
    -- 统计信息（通过wallet_address聚合）
    COALESCE(stats.direct_referrals, 0) as direct_referrals,
    COALESCE(stats.total_team, 0) as total_team,
    COALESCE(stats.max_layer, 0) as max_layer
    
FROM membership m
LEFT JOIN membership ref_m ON m.referrer_wallet = ref_m.wallet_address  -- 直接wallet关联
LEFT JOIN (
    SELECT 
        mp.matrix_root,  -- 直接使用wallet_address
        COUNT(*) FILTER (WHERE mp.is_direct_referral = true) as direct_referrals,
        COUNT(*) as total_team,
        MAX(mp.matrix_layer) as max_layer
    FROM matrix_placements mp
    GROUP BY mp.matrix_root
) stats ON m.wallet_address = stats.matrix_root  -- 直接wallet关联
ORDER BY m.activation_id;

-- Matrix结构视图（只使用wallet_address）
CREATE OR REPLACE VIEW matrix_structure AS
SELECT 
    -- 根节点（使用wallet_address）
    root.wallet_address as root_wallet,
    root.activation_id as root_activation_id,
    root.username as root_username,
    
    -- L位置成员
    l_mem.wallet_address as l_wallet,
    l_mem.activation_id as l_activation_id,
    l_mem.username as l_username,
    
    -- M位置成员  
    m_mem.wallet_address as m_wallet,
    m_mem.activation_id as m_activation_id,
    m_mem.username as m_username,
    
    -- R位置成员
    r_mem.wallet_address as r_wallet,
    r_mem.activation_id as r_activation_id,  
    r_mem.username as r_username,
    
    -- 空缺位置
    CASE 
        WHEN l_mem.wallet_address IS NULL THEN 'L'
        WHEN m_mem.wallet_address IS NULL THEN 'M'
        WHEN r_mem.wallet_address IS NULL THEN 'R'
        ELSE 'FULL'
    END as next_vacant_position
    
FROM membership root
-- 通过wallet_address直接关联
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

-- 第5步：重新创建查询函数（只使用wallet_address和username）
-- ========================================

-- 根据username查找会员（返回wallet_address）
CREATE OR REPLACE FUNCTION find_member(p_username VARCHAR(50))
RETURNS TABLE(
    wallet_address VARCHAR(42),
    activation_id INTEGER,
    username VARCHAR(50),
    referrer_wallet VARCHAR(42),
    direct_referrals BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.wallet_address,    -- 返回主键wallet_address
        mi.activation_id,
        mi.username,
        mi.referrer_wallet,   -- 推荐人的wallet_address
        mi.direct_referrals
    FROM member_info mi
    WHERE LOWER(mi.username) = LOWER(p_username);
END;
$$ LANGUAGE plpgsql;

-- 根据wallet_address查找会员
CREATE OR REPLACE FUNCTION find_member_by_wallet(p_wallet VARCHAR(42))
RETURNS TABLE(
    wallet_address VARCHAR(42),
    activation_id INTEGER,
    username VARCHAR(50),
    referrer_wallet VARCHAR(42),
    direct_referrals BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.wallet_address,
        mi.activation_id,
        mi.username,
        mi.referrer_wallet,
        mi.direct_referrals
    FROM member_info mi
    WHERE mi.wallet_address = p_wallet;
END;
$$ LANGUAGE plpgsql;

-- Matrix组件数据获取（只使用wallet_address）
CREATE OR REPLACE FUNCTION get_matrix_data(p_wallet_or_username VARCHAR(100))
RETURNS JSONB AS $$
DECLARE
    target_wallet VARCHAR(42);
    result JSONB;
BEGIN
    -- 判断输入是wallet地址还是username
    IF p_wallet_or_username ~ '^0x[a-fA-F0-9]{40}$' THEN
        target_wallet := p_wallet_or_username;
    ELSE
        -- 通过username查找wallet_address
        SELECT wallet_address INTO target_wallet 
        FROM membership 
        WHERE LOWER(username) = LOWER(p_wallet_or_username);
    END IF;
    
    IF target_wallet IS NULL THEN
        RETURN jsonb_build_object('error', 'Member not found');
    END IF;
    
    -- 构建Matrix数据（只使用wallet_address）
    SELECT jsonb_build_object(
        'member', jsonb_build_object(
            'wallet_address', ms.root_wallet,
            'activation_id', ms.root_activation_id,
            'username', ms.root_username
        ),
        'matrix', jsonb_build_object(
            'L', CASE WHEN ms.l_wallet IS NOT NULL THEN
                jsonb_build_object(
                    'wallet_address', ms.l_wallet,
                    'activation_id', ms.l_activation_id,
                    'username', ms.l_username
                ) ELSE null END,
            'M', CASE WHEN ms.m_wallet IS NOT NULL THEN
                jsonb_build_object(
                    'wallet_address', ms.m_wallet,
                    'activation_id', ms.m_activation_id,
                    'username', ms.m_username
                ) ELSE null END,
            'R', CASE WHEN ms.r_wallet IS NOT NULL THEN
                jsonb_build_object(
                    'wallet_address', ms.r_wallet,
                    'activation_id', ms.r_activation_id,
                    'username', ms.r_username
                ) ELSE null END,
            'next_vacant', ms.next_vacant_position
        )
    ) INTO result
    FROM matrix_structure ms
    WHERE ms.root_wallet = target_wallet;
    
    RETURN COALESCE(result, jsonb_build_object('error', 'No matrix data'));
END;
$$ LANGUAGE plpgsql;

-- 第6步：创建测试数据（如果需要）
-- ========================================

DO $$
DECLARE
    member_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO member_count FROM membership;
    
    IF member_count = 0 THEN
        RAISE NOTICE '创建测试数据...';
        
        -- 创建测试会员（只使用wallet_address + username）
        INSERT INTO membership (wallet_address, username, activation_id, referrer_wallet, current_level) VALUES
        ('0x0000000000000000000000000000000000000000', 'root', 0, NULL, 19),
        ('0x1111111111111111111111111111111111111111', 'alice', 1, '0x0000000000000000000000000000000000000000', 1),
        ('0x2222222222222222222222222222222222222222', 'bob', 2, '0x0000000000000000000000000000000000000000', 2),
        ('0x3333333333333333333333333333333333333333', 'charlie', 3, '0x0000000000000000000000000000000000000000', 1);
        
        -- 创建Matrix安置记录（只使用wallet_address）
        INSERT INTO matrix_placements (member_wallet, matrix_root, matrix_layer, matrix_position, is_direct_referral) VALUES
        ('0x1111111111111111111111111111111111111111', '0x0000000000000000000000000000000000000000', 1, 'L', true),
        ('0x2222222222222222222222222222222222222222', '0x0000000000000000000000000000000000000000', 1, 'M', true),
        ('0x3333333333333333333333333333333333333333', '0x0000000000000000000000000000000000000000', 1, 'R', true);
        
        RAISE NOTICE '创建了测试数据';
    END IF;
END $$;

-- 第7步：最终验证 - 确保完全没有user_keys
-- ========================================

SELECT '=== 最终验证：完全清除user_keys概念 ===' as status;

-- 检查是否还有任何user_keys相关内容
SELECT '--- 检查表和字段 ---' as section;
SELECT 
    CASE WHEN COUNT(*) = 0 THEN '✓ 确认：没有user_keys相关字段' 
         ELSE '✗ 警告：仍有user_keys相关字段' END as check_result
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (column_name ILIKE '%user_key%' OR column_name ILIKE '%userkey%');

-- 显示当前系统的标识符使用情况
SELECT '--- 当前标识符系统 ---' as section;
SELECT 
    'wallet_address' as identifier_type,
    'PRIMARY KEY - 唯一标识符' as usage,
    COUNT(*) as count
FROM membership
UNION ALL
SELECT 
    'username',
    'DISPLAY NAME - 用户友好标识符', 
    COUNT(*) FILTER (WHERE username IS NOT NULL)
FROM membership
UNION ALL
SELECT 
    'activation_id',
    'SEQUENCE NUMBER - 激活顺序',
    COUNT(*) FILTER (WHERE activation_id IS NOT NULL)
FROM membership;

-- 显示示例数据
SELECT '--- 会员数据示例（只使用wallet_address + username）---' as section;
SELECT 
    activation_id,
    username,
    LEFT(wallet_address, 10) || '...' as wallet_short,
    CASE WHEN referrer_wallet IS NULL THEN 'ROOT' ELSE LEFT(referrer_wallet, 10) || '...' END as referrer_short,
    current_level
FROM member_info 
ORDER BY activation_id 
LIMIT 5;

-- 显示Matrix结构示例
SELECT '--- Matrix结构示例（只使用wallet_address关联）---' as section;
SELECT 
    root_username,
    l_username,
    m_username, 
    r_username,
    next_vacant_position
FROM matrix_structure 
ORDER BY root_activation_id 
LIMIT 3;