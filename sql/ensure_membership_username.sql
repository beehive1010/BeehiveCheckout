-- 确保membership表包含username字段并正确配置
-- ========================================
-- 补充membership表的username字段处理
-- ========================================

-- 第1步：检查membership表的当前结构
-- ========================================

SELECT '=== 检查membership表当前结构 ===' as status;
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'membership'
ORDER BY ordinal_position;

-- 第2步：确保membership表包含所有必需的username相关字段
-- ========================================

DO $$ 
BEGIN
    -- 添加username字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'membership' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE membership ADD COLUMN username VARCHAR(50);
        RAISE NOTICE '已添加username字段到membership表';
    END IF;
    
    -- 添加email字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'membership' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE membership ADD COLUMN email VARCHAR(255);
        RAISE NOTICE '已添加email字段到membership表';
    END IF;
    
    -- 添加display_name字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'membership' 
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE membership ADD COLUMN display_name VARCHAR(100);
        RAISE NOTICE '已添加display_name字段到membership表';
    END IF;
    
    -- 添加profile_avatar_url字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'membership' 
        AND column_name = 'profile_avatar_url'
    ) THEN
        ALTER TABLE membership ADD COLUMN profile_avatar_url TEXT;
        RAISE NOTICE '已添加profile_avatar_url字段到membership表';
    END IF;
END $$;

-- 第3步：设置username字段的约束和索引
-- ========================================

-- 设置username字段为NOT NULL（如果数据允许）
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    -- 检查是否有NULL值
    SELECT COUNT(*) INTO null_count FROM membership WHERE username IS NULL;
    
    IF null_count > 0 THEN
        -- 为NULL值生成临时username
        UPDATE membership 
        SET username = 'member_' || activation_id
        WHERE username IS NULL;
        
        RAISE NOTICE '已为%个会员生成临时username', null_count;
    END IF;
    
    -- 设置NOT NULL约束
    ALTER TABLE membership ALTER COLUMN username SET NOT NULL;
    RAISE NOTICE '已设置username字段为NOT NULL';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '设置username约束失败: %', SQLERRM;
END $$;

-- 创建username唯一约束（如果不存在）
DO $$
BEGIN
    -- 首先解决可能的重复username
    WITH duplicate_usernames AS (
        SELECT username, COUNT(*) as count_dup, array_agg(activation_id ORDER BY activation_id) as activation_ids
        FROM membership 
        WHERE username IS NOT NULL
        GROUP BY username 
        HAVING COUNT(*) > 1
    )
    UPDATE membership 
    SET username = username || '_' || activation_id
    WHERE username IN (SELECT username FROM duplicate_usernames)
    AND activation_id != (
        SELECT activation_ids[1] FROM duplicate_usernames du WHERE du.username = membership.username
    );
    
    -- 创建唯一约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'membership' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%username%'
    ) THEN
        ALTER TABLE membership ADD CONSTRAINT membership_username_unique UNIQUE (username);
        RAISE NOTICE '已创建username唯一约束';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '创建username唯一约束失败: %', SQLERRM;
END $$;

-- 创建username索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_membership_username ON membership(username);
CREATE INDEX IF NOT EXISTS idx_membership_email ON membership(email);
CREATE INDEX IF NOT EXISTS idx_membership_display_name ON membership(display_name);

-- 第4步：从users表同步username数据到membership表
-- ========================================

DO $$
DECLARE
    sync_count INTEGER := 0;
    member_rec RECORD;
BEGIN
    -- 同步users表的数据到membership表
    FOR member_rec IN 
        SELECT 
            u.wallet_address,
            u.username,
            u.email,
            m.activation_id
        FROM users u
        JOIN membership m ON u.wallet_address = m.wallet_address
        WHERE m.username IS NULL OR m.username = '' 
           OR m.email IS NULL OR m.email = ''
    LOOP
        UPDATE membership 
        SET username = COALESCE(member_rec.username, 'member_' || member_rec.activation_id),
            email = member_rec.email,
            display_name = COALESCE(member_rec.username, 'member_' || member_rec.activation_id)
        WHERE wallet_address = member_rec.wallet_address;
        
        sync_count := sync_count + 1;
    END LOOP;
    
    IF sync_count > 0 THEN
        RAISE NOTICE '已从users表同步%个会员的profile信息到membership表', sync_count;
    ELSE
        RAISE NOTICE '无需同步，membership表profile信息完整';
    END IF;
END $$;

-- 第5步：创建会员信息完整性检查函数
-- ========================================

CREATE OR REPLACE FUNCTION check_membership_profile_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    count_result BIGINT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    
    -- 检查username完整性
    SELECT 
        'username_integrity'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        COUNT(*),
        CASE WHEN COUNT(*) = 0 THEN 'All members have username' 
             ELSE COUNT(*)::TEXT || ' members missing username' END::TEXT
    FROM membership 
    WHERE username IS NULL OR username = ''
    
    UNION ALL
    
    -- 检查username唯一性
    SELECT 
        'username_uniqueness',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END,
        COUNT(*),
        CASE WHEN COUNT(*) = 0 THEN 'All usernames are unique' 
             ELSE COUNT(*)::TEXT || ' duplicate usernames found' END
    FROM (
        SELECT username 
        FROM membership 
        WHERE username IS NOT NULL 
        GROUP BY username 
        HAVING COUNT(*) > 1
    ) duplicates
    
    UNION ALL
    
    -- 检查email完整性
    SELECT 
        'email_integrity',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
        COUNT(*),
        CASE WHEN COUNT(*) = 0 THEN 'All members have email' 
             ELSE COUNT(*)::TEXT || ' members missing email' END
    FROM membership 
    WHERE email IS NULL OR email = ''
    
    UNION ALL
    
    -- 检查与users表的数据一致性
    SELECT 
        'users_membership_sync',
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
        COUNT(*),
        CASE WHEN COUNT(*) = 0 THEN 'users and membership tables in sync' 
             ELSE COUNT(*)::TEXT || ' members have inconsistent data between tables' END
    FROM membership m
    JOIN users u ON m.wallet_address = u.wallet_address
    WHERE m.username != u.username OR m.email != u.email;
END;
$$ LANGUAGE plpgsql;

-- 第6步：更新会员Profile相关的视图和函数
-- ========================================

-- 重新创建会员基础信息视图
CREATE OR REPLACE VIEW member_basic_info AS
SELECT 
    m.wallet_address,
    m.activation_id,
    m.username,
    m.email,
    COALESCE(m.display_name, m.username) as display_name,
    m.profile_avatar_url,
    m.current_level,
    nml.level_name,
    nml.nft_price_usdt,
    nml.tier,
    m.activation_time,
    m.referrer_wallet,
    ref_m.username as referrer_username,
    ref_m.activation_id as referrer_activation_id
FROM membership m
LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
LEFT JOIN membership ref_m ON m.referrer_wallet = ref_m.wallet_address
ORDER BY m.activation_id;

-- 创建username查询函数
CREATE OR REPLACE FUNCTION find_member_by_username(p_username VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'found', CASE WHEN m.wallet_address IS NOT NULL THEN true ELSE false END,
        'member', CASE WHEN m.wallet_address IS NOT NULL THEN
            jsonb_build_object(
                'wallet_address', m.wallet_address,
                'activation_id', m.activation_id,
                'username', m.username,
                'display_name', COALESCE(m.display_name, m.username),
                'email', m.email,
                'current_level', m.current_level,
                'level_name', nml.level_name,
                'activation_time', m.activation_time
            )
        ELSE null END
    ) INTO result
    FROM membership m
    LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
    WHERE LOWER(m.username) = LOWER(p_username);
    
    RETURN COALESCE(result, jsonb_build_object('found', false, 'member', null));
END;
$$ LANGUAGE plpgsql;

-- 创建会员搜索函数（支持username、email、wallet地址）
CREATE OR REPLACE FUNCTION search_member(p_search_term VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
    results JSONB;
BEGIN
    SELECT jsonb_build_object(
        'search_term', p_search_term,
        'results', COALESCE(jsonb_agg(
            jsonb_build_object(
                'wallet_address', m.wallet_address,
                'activation_id', m.activation_id,
                'username', m.username,
                'display_name', COALESCE(m.display_name, m.username),
                'email', m.email,
                'current_level', m.current_level,
                'level_name', nml.level_name
            )
        ), '[]'::jsonb),
        'count', COUNT(*)
    ) INTO results
    FROM membership m
    LEFT JOIN nft_membership_levels nml ON m.current_level = nml.level
    WHERE LOWER(m.username) LIKE LOWER('%' || p_search_term || '%')
       OR LOWER(m.email) LIKE LOWER('%' || p_search_term || '%')
       OR LOWER(m.wallet_address) LIKE LOWER('%' || p_search_term || '%')
       OR m.activation_id::TEXT = p_search_term;
    
    RETURN results;
END;
$$ LANGUAGE plpgsql;

-- 第7步：显示membership表的完整状态
-- ========================================

SELECT '=== membership表username补充完成 ===' as status;

-- 显示membership表结构
SELECT '=== membership表结构 ===' as section;
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    CASE WHEN column_name IN ('wallet_address', 'username', 'email') THEN 'CRITICAL' 
         ELSE 'OPTIONAL' END as importance
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'membership'
ORDER BY 
    CASE WHEN column_name = 'wallet_address' THEN 1
         WHEN column_name = 'activation_id' THEN 2  
         WHEN column_name = 'username' THEN 3
         WHEN column_name = 'email' THEN 4
         ELSE 5 END,
    column_name;

-- 执行profile完整性检查
SELECT '=== 会员Profile完整性检查 ===' as section;
SELECT * FROM check_membership_profile_integrity();

-- 显示会员基础信息预览
SELECT '=== 会员基础信息预览 ===' as section;
SELECT 
    activation_id, username, email, current_level, level_name, referrer_username
FROM member_basic_info 
ORDER BY activation_id 
LIMIT 5;

-- 显示搜索功能演示
SELECT '=== 搜索功能演示 ===' as section;
SELECT '可以使用以下函数:' as demo,
       'find_member_by_username(''username'') - 精确查找' as function1,
       'search_member(''keyword'') - 模糊搜索username/email/wallet' as function2;