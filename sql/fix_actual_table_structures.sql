-- 修复实际表结构和数据 - membership和matrix_placements
-- ========================================
-- 确保表结构正确，数据完整，支持Matrix组件需求
-- ========================================

-- 第1步：检查当前表结构状态
-- ========================================

SELECT '=== 检查当前表结构 ===' as status;

-- 检查membership表结构
SELECT '--- membership表结构 ---' as section;
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'wallet_address' THEN 'PRIMARY KEY'
        WHEN column_name = 'username' THEN 'UNIQUE, NOT NULL'
        WHEN column_name = 'activation_id' THEN 'UNIQUE, NOT NULL'
        WHEN column_name = 'referrer_wallet' THEN 'FOREIGN KEY'
        ELSE 'REGULAR'
    END as importance
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'membership'
ORDER BY ordinal_position;

-- 检查matrix_placements表结构
SELECT '--- matrix_placements表结构 ---' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('member_wallet', 'matrix_root') THEN 'FOREIGN KEY'
        WHEN column_name LIKE '%referral%' OR column_name LIKE '%spillover%' THEN 'CRITICAL LOGIC'
        WHEN column_name IN ('matrix_layer', 'matrix_position') THEN 'POSITION INFO'
        ELSE 'REGULAR'
    END as importance
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'matrix_placements'
ORDER BY ordinal_position;

-- 第2步：修复membership表结构
-- ========================================

DO $$ 
BEGIN
    -- 确保membership表有所有必要字段
    RAISE NOTICE '开始修复membership表结构...';
    
    -- 添加username字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'username') THEN
        ALTER TABLE membership ADD COLUMN username VARCHAR(50);
        RAISE NOTICE '添加了username字段';
    END IF;
    
    -- 添加email字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'email') THEN
        ALTER TABLE membership ADD COLUMN email VARCHAR(255);
        RAISE NOTICE '添加了email字段';
    END IF;
    
    -- 添加display_name字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'display_name') THEN
        ALTER TABLE membership ADD COLUMN display_name VARCHAR(100);
        RAISE NOTICE '添加了display_name字段';
    END IF;
    
    -- 添加profile_avatar_url字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profile_avatar_url' AND column_name = 'profile_avatar_url') THEN
        ALTER TABLE membership ADD COLUMN profile_avatar_url TEXT;
        RAISE NOTICE '添加了profile_avatar_url字段';
    END IF;
    
    -- 确保activation_id字段存在且唯一
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'activation_id') THEN
        ALTER TABLE membership ADD COLUMN activation_id INTEGER UNIQUE;
        RAISE NOTICE '添加了activation_id字段';
    END IF;
    
    -- 确保referrer_wallet字段存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'referrer_wallet') THEN
        ALTER TABLE membership ADD COLUMN referrer_wallet VARCHAR(42);
        RAISE NOTICE '添加了referrer_wallet字段';
    END IF;
    
    -- 确保current_level字段存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'current_level') THEN
        ALTER TABLE membership ADD COLUMN current_level INTEGER DEFAULT 1;
        RAISE NOTICE '添加了current_level字段';
    END IF;
    
    -- 确保activation_time字段存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'activation_time') THEN
        ALTER TABLE membership ADD COLUMN activation_time TIMESTAMP DEFAULT NOW();
        RAISE NOTICE '添加了activation_time字段';
    END IF;
    
    -- 确保nft_claimed_levels字段存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership' AND column_name = 'nft_claimed_levels') THEN
        ALTER TABLE membership ADD COLUMN nft_claimed_levels INTEGER[] DEFAULT ARRAY[1];
        RAISE NOTICE '添加了nft_claimed_levels字段';
    END IF;
    
END $$;

-- 第3步：修复matrix_placements表结构
-- ========================================

-- 检查matrix_placements表是否存在，不存在则创建
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matrix_placements') THEN
        RAISE NOTICE '创建matrix_placements表...';
        
        CREATE TABLE matrix_placements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            member_wallet VARCHAR(42) NOT NULL,
            matrix_root VARCHAR(42) NOT NULL,
            matrix_layer INTEGER NOT NULL DEFAULT 1,
            matrix_position CHAR(1) CHECK (matrix_position IN ('L','M','R')),
            activation_id INTEGER,
            is_direct_referral BOOLEAN DEFAULT false,
            is_spillover_placed BOOLEAN DEFAULT false,
            placed_at TIMESTAMP DEFAULT NOW(),
            
            FOREIGN KEY (member_wallet) REFERENCES membership(wallet_address) ON DELETE CASCADE,
            FOREIGN KEY (matrix_root) REFERENCES membership(wallet_address) ON DELETE CASCADE
        );
        
        -- 创建索引
        CREATE INDEX idx_matrix_placements_member ON matrix_placements(member_wallet);
        CREATE INDEX idx_matrix_placements_root ON matrix_placements(matrix_root);
        CREATE INDEX idx_matrix_placements_layer_pos ON matrix_placements(matrix_layer, matrix_position);
        CREATE INDEX idx_matrix_placements_referral ON matrix_placements(is_direct_referral);
        CREATE INDEX idx_matrix_placements_spillover ON matrix_placements(is_spillover_placed);
        
        RAISE NOTICE 'matrix_placements表创建完成';
    ELSE
        RAISE NOTICE 'matrix_placements表已存在，检查字段...';
        
        -- 确保关键字段存在
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matrix_placements' AND column_name = 'is_direct_referral') THEN
            ALTER TABLE matrix_placements ADD COLUMN is_direct_referral BOOLEAN DEFAULT false;
            RAISE NOTICE '添加了is_direct_referral字段';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matrix_placements' AND column_name = 'is_spillover_placed') THEN
            ALTER TABLE matrix_placements ADD COLUMN is_spillover_placed BOOLEAN DEFAULT false;
            RAISE NOTICE '添加了is_spillover_placed字段';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matrix_placements' AND column_name = 'activation_id') THEN
            ALTER TABLE matrix_placements ADD COLUMN activation_id INTEGER;
            RAISE NOTICE '添加了activation_id字段';
        END IF;
    END IF;
END $$;

-- 第4步：初始化membership表数据
-- ========================================

DO $$
DECLARE
    member_count INTEGER;
    updated_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO member_count FROM membership;
    RAISE NOTICE '当前membership表有%个记录', member_count;
    
    -- 如果表为空，创建测试数据
    IF member_count = 0 THEN
        RAISE NOTICE '创建测试会员数据...';
        
        -- 创建超级根节点
        INSERT INTO membership (
            wallet_address, username, email, display_name,
            activation_id, current_level, referrer_wallet,
            activation_time, nft_claimed_levels
        ) VALUES (
            '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC',
            'SuperRoot',
            'root@beehive.com',
            'Super Root',
            0,
            19,
            NULL,
            NOW() - INTERVAL '365 days',
            ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]
        );
        
        -- 创建测试会员
        INSERT INTO membership (
            wallet_address, username, email, display_name,
            activation_id, current_level, referrer_wallet,
            activation_time, nft_claimed_levels
        ) VALUES 
        ('0x1111111111111111111111111111111111111111', 'member001', 'member001@test.com', 'Member 001', 1, 1, '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC', NOW() - INTERVAL '300 days', ARRAY[1]),
        ('0x2222222222222222222222222222222222222222', 'member002', 'member002@test.com', 'Member 002', 2, 2, '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC', NOW() - INTERVAL '290 days', ARRAY[1,2]),
        ('0x3333333333333333333333333333333333333333', 'member003', 'member003@test.com', 'Member 003', 3, 1, '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC', NOW() - INTERVAL '280 days', ARRAY[1]),
        ('0x4444444444444444444444444444444444444444', 'member004', 'member004@test.com', 'Member 004', 4, 3, '0x1111111111111111111111111111111111111111', NOW() - INTERVAL '270 days', ARRAY[1,2,3]),
        ('0x5555555555555555555555555555555555555555', 'member005', 'member005@test.com', 'Member 005', 5, 1, '0x1111111111111111111111111111111111111111', NOW() - INTERVAL '260 days', ARRAY[1]);
        
        updated_count := 6;
        RAISE NOTICE '创建了%个测试会员', updated_count;
    ELSE
        -- 修复现有数据的缺失字段
        UPDATE membership 
        SET username = 'member_' || COALESCE(activation_id::text, row_number() OVER()::text),
            display_name = COALESCE(display_name, 'member_' || COALESCE(activation_id::text, row_number() OVER()::text))
        WHERE username IS NULL OR username = '';
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE '修复了%个会员的username字段', updated_count;
    END IF;
END $$;

-- 第5步：初始化matrix_placements表数据
-- ========================================

DO $$
DECLARE
    placement_count INTEGER;
    member_rec RECORD;
    referrer_wallet VARCHAR(42);
    position_chars CHAR(1)[] := ARRAY['L','M','R'];
    position_idx INTEGER;
    direct_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO placement_count FROM matrix_placements;
    RAISE NOTICE '当前matrix_placements表有%个记录', placement_count;
    
    -- 如果表为空或数据不完整，重新生成
    IF placement_count < 3 THEN
        RAISE NOTICE '重新生成matrix_placements数据...';
        
        -- 清空表
        DELETE FROM matrix_placements;
        
        -- 为每个激活的会员创建矩阵安置记录
        FOR member_rec IN 
            SELECT wallet_address, activation_id, referrer_wallet, activation_time
            FROM membership 
            WHERE activation_id > 0 -- 跳过超级根节点
            ORDER BY activation_id
        LOOP
            referrer_wallet := COALESCE(member_rec.referrer_wallet, 
                              (SELECT wallet_address FROM membership WHERE activation_id = 0));
            
            -- 计算推荐人的直推数量
            SELECT COUNT(*) INTO direct_count
            FROM matrix_placements 
            WHERE matrix_root = referrer_wallet AND is_direct_referral = true;
            
            -- 确定安置位置
            IF direct_count < 3 THEN
                position_idx := direct_count + 1;
                
                -- 在推荐人的Layer 1安置
                INSERT INTO matrix_placements (
                    member_wallet,
                    matrix_root,
                    matrix_layer,
                    matrix_position,
                    activation_id,
                    is_direct_referral,
                    is_spillover_placed,
                    placed_at
                ) VALUES (
                    member_rec.wallet_address,
                    referrer_wallet,
                    1,
                    position_chars[position_idx],
                    member_rec.activation_id,
                    true,  -- 是直推
                    false, -- 不是溢出
                    member_rec.activation_time
                );
                
                RAISE NOTICE '会员%安置在%的Layer1-%位置', 
                    member_rec.activation_id, 
                    (SELECT activation_id FROM membership WHERE wallet_address = referrer_wallet),
                    position_chars[position_idx];
            ELSE
                -- 推荐人Layer 1已满，需要溢出安置
                -- 这里简化处理，安置到Layer 2
                INSERT INTO matrix_placements (
                    member_wallet,
                    matrix_root,
                    matrix_layer,
                    matrix_position,
                    activation_id,
                    is_direct_referral,
                    is_spillover_placed,
                    placed_at
                ) VALUES (
                    member_rec.wallet_address,
                    referrer_wallet,
                    2,
                    position_chars[1], -- 默认L位置
                    member_rec.activation_id,
                    true,  -- 仍是直推关系
                    true,  -- 是溢出安置
                    member_rec.activation_time
                );
                
                RAISE NOTICE '会员%溢出安置在%的Layer2-L位置', 
                    member_rec.activation_id,
                    (SELECT activation_id FROM membership WHERE wallet_address = referrer_wallet);
            END IF;
        END LOOP;
        
        SELECT COUNT(*) INTO placement_count FROM matrix_placements;
        RAISE NOTICE '生成了%个矩阵安置记录', placement_count;
    END IF;
END $$;

-- 第6步：同步users表数据（如果存在）
-- ========================================

DO $$
DECLARE 
    sync_count INTEGER := 0;
BEGIN
    -- 如果users表存在，同步数据到membership
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- 从users表同步缺失的数据到membership
        UPDATE membership m
        SET email = u.email,
            username = COALESCE(m.username, u.username),
            display_name = COALESCE(m.display_name, u.username)
        FROM users u 
        WHERE m.wallet_address = u.wallet_address
        AND (m.email IS NULL OR m.username IS NULL OR m.display_name IS NULL);
        
        GET DIAGNOSTICS sync_count = ROW_COUNT;
        RAISE NOTICE '从users表同步了%个会员的数据', sync_count;
        
        -- 同时也从membership同步到users（保持一致性）
        UPDATE users u
        SET username = m.username,
            email = m.email
        FROM membership m
        WHERE u.wallet_address = m.wallet_address
        AND u.username != m.username;
    END IF;
END $$;

-- 第7步：创建约束和索引
-- ========================================

-- 为membership表创建约束
DO $$
BEGIN
    -- username唯一约束
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'membership' AND constraint_name LIKE '%username%') THEN
        ALTER TABLE membership ADD CONSTRAINT membership_username_unique UNIQUE (username);
        RAISE NOTICE '创建了username唯一约束';
    END IF;
    
    -- activation_id唯一约束
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'membership' AND constraint_name LIKE '%activation_id%') THEN
        ALTER TABLE membership ADD CONSTRAINT membership_activation_id_unique UNIQUE (activation_id);
        RAISE NOTICE '创建了activation_id唯一约束';
    END IF;
END $$;

-- 创建必要的索引
CREATE INDEX IF NOT EXISTS idx_membership_username ON membership(username);
CREATE INDEX IF NOT EXISTS idx_membership_activation_id ON membership(activation_id);
CREATE INDEX IF NOT EXISTS idx_membership_referrer ON membership(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_membership_level ON membership(current_level);

-- 第8步：验证修复结果
-- ========================================

SELECT '=== 表结构修复完成 ===' as status;

-- 显示修复后的membership表状态
SELECT '=== membership表状态 ===' as section;
SELECT 
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE username IS NOT NULL) as with_username,
    COUNT(*) FILTER (WHERE email IS NOT NULL) as with_email,
    COUNT(*) FILTER (WHERE activation_id IS NOT NULL) as with_activation_id,
    COUNT(DISTINCT activation_id) as unique_activation_ids,
    MIN(activation_id) as min_activation_id,
    MAX(activation_id) as max_activation_id
FROM membership;

-- 显示matrix_placements表状态
SELECT '=== matrix_placements表状态 ===' as section;
SELECT 
    COUNT(*) as total_placements,
    COUNT(*) FILTER (WHERE is_direct_referral = true) as direct_referrals,
    COUNT(*) FILTER (WHERE is_spillover_placed = true) as spillover_placements,
    COUNT(DISTINCT matrix_root) as unique_roots,
    COUNT(DISTINCT member_wallet) as unique_members,
    MAX(matrix_layer) as max_layer
FROM matrix_placements;

-- 显示会员数据样例
SELECT '=== 会员数据样例 ===' as section;
SELECT 
    activation_id, username, email, current_level, 
    CASE WHEN referrer_wallet IS NULL THEN 'Root' ELSE 'Has Referrer' END as referrer_status
FROM membership 
ORDER BY activation_id 
LIMIT 5;

-- 显示矩阵安置数据样例
SELECT '=== 矩阵安置数据样例 ===' as section;
SELECT 
    m1.activation_id as member_id,
    m1.username as member_name,
    m2.activation_id as root_id,
    m2.username as root_name,
    mp.matrix_layer,
    mp.matrix_position,
    mp.is_direct_referral,
    mp.is_spillover_placed
FROM matrix_placements mp
JOIN membership m1 ON mp.member_wallet = m1.wallet_address
JOIN membership m2 ON mp.matrix_root = m2.wallet_address
ORDER BY m2.activation_id, mp.matrix_layer, mp.matrix_position
LIMIT 10;