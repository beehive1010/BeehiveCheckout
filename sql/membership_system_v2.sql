-- BEEHIVE 会员矩阵系统 V2
-- ==========================================
-- 重新设计的清晰表结构
-- ==========================================

-- 第1步：创建V2表结构
-- ==========================================

-- V2_1: Users表 - 基础用户信息
CREATE TABLE v2_users (
    wallet_address VARCHAR(42) PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'member', 'admin')) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- V2_2: Membership表 - NFT认领和等级管理
CREATE TABLE v2_membership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
    nft_level INTEGER NOT NULL CHECK (nft_level BETWEEN 1 AND 19),
    claim_price DECIMAL(18,6) NOT NULL,
    claimed_at TIMESTAMP DEFAULT NOW(),
    is_upgrade BOOLEAN DEFAULT false, -- 是否为升级
    previous_level INTEGER, -- 升级前的等级
    
    FOREIGN KEY (wallet_address) REFERENCES v2_users(wallet_address),
    UNIQUE(wallet_address, nft_level) -- 每个等级只能claim一次
);

-- V2_3: Members表 - 会员激活和推荐关系
CREATE TABLE v2_members (
    wallet_address VARCHAR(42) PRIMARY KEY,
    referrer_wallet VARCHAR(42), -- 推荐人
    current_level INTEGER NOT NULL DEFAULT 1, -- 当前最高等级
    activation_sequence INTEGER UNIQUE NOT NULL, -- 全网激活序号
    activation_time TIMESTAMP NOT NULL DEFAULT NOW(),
    total_nft_claimed INTEGER DEFAULT 1, -- 已claim的NFT数量
    
    FOREIGN KEY (wallet_address) REFERENCES v2_users(wallet_address),
    FOREIGN KEY (referrer_wallet) REFERENCES v2_members(wallet_address)
);

-- V2_4: Referrals表 - 矩阵安置记录
CREATE TABLE v2_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_wallet VARCHAR(42) NOT NULL, -- 被安置的成员
    referrer_wallet VARCHAR(42), -- 实际推荐人
    matrix_root_wallet VARCHAR(42) NOT NULL, -- 矩阵根节点
    matrix_root_sequence INTEGER NOT NULL, -- 矩阵根的激活序号
    matrix_layer INTEGER NOT NULL DEFAULT 1,
    matrix_position CHAR(1) CHECK (matrix_position IN ('L','M','R')),
    member_activation_sequence INTEGER NOT NULL, -- 被安置成员的激活序号
    is_direct_referral BOOLEAN DEFAULT false, -- 是否为直推
    is_spillover_placement BOOLEAN DEFAULT false, -- 是否为滑落安置
    placed_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (member_wallet) REFERENCES v2_members(wallet_address),
    FOREIGN KEY (referrer_wallet) REFERENCES v2_members(wallet_address),
    FOREIGN KEY (matrix_root_wallet) REFERENCES v2_members(wallet_address),
    UNIQUE(member_wallet, matrix_root_wallet) -- 每个成员在每个矩阵中只能有一条记录
);

-- V2_5: User Balances表 - 用户余额管理
CREATE TABLE v2_user_balances (
    wallet_address VARCHAR(42) PRIMARY KEY,
    available_balance DECIMAL(18,6) DEFAULT 0,
    total_earned DECIMAL(18,6) DEFAULT 0,
    total_withdrawn DECIMAL(18,6) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (wallet_address) REFERENCES v2_members(wallet_address)
);

-- 创建索引优化查询
CREATE INDEX idx_v2_membership_wallet ON v2_membership(wallet_address);
CREATE INDEX idx_v2_members_activation_seq ON v2_members(activation_sequence);
CREATE INDEX idx_v2_members_referrer ON v2_members(referrer_wallet);
CREATE INDEX idx_v2_referrals_matrix_root ON v2_referrals(matrix_root_wallet);
CREATE INDEX idx_v2_referrals_member ON v2_referrals(member_wallet);
CREATE INDEX idx_v2_referrals_sequence ON v2_referrals(member_activation_sequence);

-- 第1.5步：创建触发器和同步函数
-- ==========================================

-- 自动更新用户角色的函数
CREATE OR REPLACE FUNCTION update_user_role()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE v2_users 
    SET role = CASE 
        WHEN NEW.current_level >= 19 THEN 'admin'
        WHEN NEW.current_level > 0 THEN 'member'
        ELSE 'user'
    END,
    updated_at = NOW()
    WHERE wallet_address = NEW.wallet_address;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 自动更新NFT统计的函数
CREATE OR REPLACE FUNCTION update_nft_claimed_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新会员的NFT claim数量和当前等级
    UPDATE v2_members 
    SET total_nft_claimed = (
        SELECT COUNT(*) FROM v2_membership 
        WHERE wallet_address = NEW.wallet_address
    ),
    current_level = (
        SELECT MAX(nft_level) FROM v2_membership 
        WHERE wallet_address = NEW.wallet_address
    )
    WHERE wallet_address = NEW.wallet_address;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 级联删除关联数据的函数
CREATE OR REPLACE FUNCTION cascade_delete_member_data()
RETURNS TRIGGER AS $$
BEGIN
    -- 删除该会员的所有矩阵安置记录
    DELETE FROM v2_referrals WHERE member_wallet = OLD.wallet_address;
    
    -- 删除该会员作为矩阵根的所有记录
    DELETE FROM v2_referrals WHERE matrix_root_wallet = OLD.wallet_address;
    
    -- 删除NFT购买记录
    DELETE FROM v2_membership WHERE wallet_address = OLD.wallet_address;
    
    -- 删除余额记录
    DELETE FROM v2_user_balances WHERE wallet_address = OLD.wallet_address;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_user_role
    AFTER INSERT OR UPDATE ON v2_members
    FOR EACH ROW EXECUTE FUNCTION update_user_role();

CREATE TRIGGER trigger_update_nft_count
    AFTER INSERT ON v2_membership
    FOR EACH ROW EXECUTE FUNCTION update_nft_claimed_count();

CREATE TRIGGER trigger_cascade_delete
    BEFORE DELETE ON v2_members
    FOR EACH ROW EXECUTE FUNCTION cascade_delete_member_data();

-- 自动创建会员余额记录的函数
CREATE OR REPLACE FUNCTION auto_create_user_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO v2_user_balances (wallet_address)
    VALUES (NEW.wallet_address)
    ON CONFLICT (wallet_address) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_balance
    AFTER INSERT ON v2_members
    FOR EACH ROW EXECUTE FUNCTION auto_create_user_balance();

-- 第2步：创建V2视图
-- ==========================================

-- V2视图1：用户激活映射
CREATE OR REPLACE VIEW v2_user_activation_mapping AS
SELECT 
    m.activation_sequence as user_activation_id,
    m.wallet_address as user_wallet_address,
    'USER_' || m.activation_sequence::text as user_key,
    SUBSTRING(m.wallet_address, 1, 10) || '...' as wallet_short,
    m.current_level as membership_level,
    CASE 
        WHEN m.referrer_wallet IS NULL THEN 'SUPER_ROOT'
        WHEN m.activation_sequence = 0 THEN 'SUPER_ROOT'
        WHEN EXISTS(SELECT 1 FROM v2_members root WHERE root.activation_sequence = 0 AND m.referrer_wallet = root.wallet_address) THEN 'SUPER_ROOT_DIRECT'
        ELSE 'OTHER_REFERRAL'
    END as user_type,
    m.activation_time,
    m.total_nft_claimed
FROM v2_members m
ORDER BY m.activation_sequence;

-- V2视图2：团队统计
CREATE OR REPLACE VIEW v2_user_team_stats AS
WITH direct_referral_stats AS (
    SELECT 
        m.activation_sequence,
        m.wallet_address,
        COUNT(ref.wallet_address) as direct_referral_count
    FROM v2_members m
    LEFT JOIN v2_members ref ON ref.referrer_wallet = m.wallet_address
    GROUP BY m.activation_sequence, m.wallet_address
),
matrix_placement_stats AS (
    SELECT 
        r.matrix_root_wallet,
        COUNT(*) as total_placements,
        COUNT(*) FILTER (WHERE r.is_direct_referral = true) as direct_placements,
        COUNT(*) FILTER (WHERE r.is_spillover_placement = true) as spillover_placements
    FROM v2_referrals r
    GROUP BY r.matrix_root_wallet
)
SELECT 
    m.activation_sequence as activation_sequence_id,
    m.wallet_address as user_wallet_address,
    m.current_level as current_membership_level,
    CASE 
        WHEN m.referrer_wallet IS NULL THEN 'SUPER_ROOT'
        WHEN m.activation_sequence = 0 THEN 'SUPER_ROOT'
        WHEN EXISTS(SELECT 1 FROM v2_members root WHERE root.activation_sequence = 0 AND m.referrer_wallet = root.wallet_address) THEN 'SUPER_ROOT_DIRECT'
        ELSE 'OTHER_REFERRAL'
    END as referral_type,
    COALESCE(drs.direct_referral_count, 0) as direct_referrals_count,
    COALESCE(mps.total_placements, 0) as total_matrix_placements,
    COALESCE(mps.direct_placements, 0) as direct_matrix_placements,
    COALESCE(mps.spillover_placements, 0) as spillover_matrix_placements,
    COALESCE(mps.total_placements, 0) as total_team_size,
    m.activation_time as activation_timestamp,
    m.total_nft_claimed
FROM v2_members m
LEFT JOIN direct_referral_stats drs ON m.activation_sequence = drs.activation_sequence
LEFT JOIN matrix_placement_stats mps ON m.wallet_address = mps.matrix_root_wallet
ORDER BY m.activation_sequence;

-- V2视图3：矩阵状态视图
CREATE OR REPLACE VIEW v2_matrix_status AS
WITH matrix_positions AS (
    SELECT 
        m.activation_sequence,
        m.wallet_address,
        m.current_level,
        -- Layer 1 positions
        MAX(CASE WHEN r.matrix_layer = 1 AND r.matrix_position = 'L' THEN r.member_activation_sequence END) as l1_activation_id,
        MAX(CASE WHEN r.matrix_layer = 1 AND r.matrix_position = 'M' THEN r.member_activation_sequence END) as m1_activation_id,
        MAX(CASE WHEN r.matrix_layer = 1 AND r.matrix_position = 'R' THEN r.member_activation_sequence END) as r1_activation_id,
        -- Layer 1 completion
        COUNT(*) FILTER (WHERE r.matrix_layer = 1) as layer1_count
    FROM v2_members m
    LEFT JOIN v2_referrals r ON m.wallet_address = r.matrix_root_wallet
    GROUP BY m.activation_sequence, m.wallet_address, m.current_level
)
SELECT 
    mp.activation_sequence as user_activation_id,
    'USER_' || mp.activation_sequence::text as user_key,
    SUBSTRING(mp.wallet_address, 1, 10) || '...' as wallet_short,
    mp.current_level as membership_level,
    COALESCE(mp.l1_activation_id::text, '') as l_position_user_id,
    COALESCE(mp.m1_activation_id::text, '') as m_position_user_id,
    COALESCE(mp.r1_activation_id::text, '') as r_position_user_id,
    mp.layer1_count || '/3' as layer1_completion,
    CASE 
        WHEN mp.l1_activation_id IS NULL THEN 'L'
        WHEN mp.m1_activation_id IS NULL THEN 'M'
        WHEN mp.r1_activation_id IS NULL THEN 'R'
        ELSE 'FULL'
    END as next_vacancy_position
FROM matrix_positions mp
ORDER BY mp.activation_sequence;

-- V2视图4：全网空缺位置
CREATE OR REPLACE VIEW v2_global_vacancy_list AS
WITH all_possible_positions AS (
    SELECT 
        m.activation_sequence as root_sequence,
        m.wallet_address as root_wallet,
        layer_pos.layer_num,
        layer_pos.position_char,
        (m.activation_sequence::text || layer_pos.layer_num::text || layer_pos.position_char) as position_id
    FROM v2_members m
    CROSS JOIN (
        SELECT 1 as layer_num, unnest(ARRAY['L','M','R']) as position_char
        UNION ALL
        SELECT 2 as layer_num, unnest(ARRAY['L','M','R']) as position_char
        UNION ALL
        SELECT 3 as layer_num, unnest(ARRAY['L','M','R']) as position_char
    ) layer_pos
)
SELECT 
    app.position_id,
    app.root_sequence as matrix_root_sequence,
    'USER_' || app.root_sequence::text as matrix_root_key,
    SUBSTRING(app.root_wallet, 1, 10) || '...' as matrix_root_wallet_short,
    app.layer_num as matrix_layer,
    app.position_char as matrix_position,
    CASE 
        WHEN r.member_wallet IS NULL THEN 'VACANT'
        ELSE 'OCCUPIED'
    END as position_status,
    COALESCE(r.member_activation_sequence::text, '') as occupant_user_id,
    COALESCE(SUBSTRING(r.member_wallet, 1, 10) || '...', '') as occupant_wallet_short
FROM all_possible_positions app
LEFT JOIN v2_referrals r ON 
    app.root_wallet = r.matrix_root_wallet 
    AND app.layer_num = r.matrix_layer 
    AND app.position_char = r.matrix_position
ORDER BY app.root_sequence, app.layer_num, app.position_char;

-- V2视图5：综合团队视图
CREATE OR REPLACE VIEW v2_team_comprehensive AS
SELECT 
    uts.activation_sequence_id,
    uam.user_key,
    uam.wallet_short,
    uam.user_wallet_address,
    uts.referral_type,
    uts.direct_referrals_count,
    uts.total_matrix_placements,
    uts.spillover_matrix_placements,
    uts.total_team_size,
    uts.current_membership_level,
    uts.total_nft_claimed,
    ms.layer1_completion,
    ms.next_vacancy_position
FROM v2_user_team_stats uts
JOIN v2_user_activation_mapping uam ON uts.activation_sequence_id = uam.user_activation_id
LEFT JOIN v2_matrix_status ms ON uts.activation_sequence_id = ms.user_activation_id
ORDER BY uts.activation_sequence_id;

-- 第3步：创建数据迁移函数
-- ==========================================

CREATE OR REPLACE FUNCTION migrate_to_v2_schema()
RETURNS TEXT AS $$
DECLARE
    migration_result TEXT := '';
    user_count INTEGER := 0;
    member_count INTEGER := 0;
    referral_count INTEGER := 0;
BEGIN
    -- 清空V2表
    DELETE FROM v2_referrals;
    DELETE FROM v2_user_balances;
    DELETE FROM v2_membership;
    DELETE FROM v2_members;
    DELETE FROM v2_users;
    
    -- 迁移用户数据
    INSERT INTO v2_users (wallet_address, role)
    SELECT 
        wallet_address,
        CASE 
            WHEN current_level >= 19 THEN 'admin'
            WHEN current_level > 0 THEN 'member'
            ELSE 'user'
        END as role
    FROM member_activations;
    
    GET DIAGNOSTICS user_count = ROW_COUNT;
    
    -- 迁移会员激活数据
    INSERT INTO v2_members (wallet_address, referrer_wallet, current_level, activation_sequence, activation_time, total_nft_claimed)
    SELECT 
        wallet_address,
        referrer_wallet,
        current_level,
        activation_id,
        activation_time,
        1 as total_nft_claimed -- 默认每个会员claim了1个NFT
    FROM member_activations;
    
    GET DIAGNOSTICS member_count = ROW_COUNT;
    
    -- 迁移NFT购买记录
    INSERT INTO v2_membership (wallet_address, nft_level, claim_price)
    SELECT wallet_address, nft_level, claim_price
    FROM nft_purchase_records;
    
    -- 迁移矩阵安置记录
    INSERT INTO v2_referrals (
        member_wallet, 
        referrer_wallet, 
        matrix_root_wallet, 
        matrix_root_sequence,
        matrix_layer, 
        matrix_position,
        member_activation_sequence,
        is_direct_referral, 
        is_spillover_placement
    )
    SELECT 
        mp.member_wallet,
        m.referrer_wallet,
        mp.matrix_root,
        (SELECT activation_id FROM member_activations WHERE wallet_address = mp.matrix_root) as matrix_root_sequence,
        mp.matrix_layer,
        mp.matrix_position,
        mp.activation_id,
        mp.is_direct_referral,
        mp.is_spillover
    FROM matrix_placement_records mp
    JOIN member_activations m ON mp.member_wallet = m.wallet_address;
    
    GET DIAGNOSTICS referral_count = ROW_COUNT;
    
    -- 迁移用户余额
    INSERT INTO v2_user_balances (wallet_address, available_balance, total_earned, total_withdrawn)
    SELECT wallet_address, reward_balance, total_earned, total_withdrawn
    FROM user_reward_balances;
    
    migration_result := format('V2迁移完成: %s个用户, %s个会员, %s个安置记录', 
                              user_count, member_count, referral_count);
    
    RETURN migration_result;
END;
$$ LANGUAGE plpgsql;

-- 第4步：创建V2矩阵安置函数
-- ==========================================

CREATE OR REPLACE FUNCTION v2_place_members_in_matrix()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    total_placed INTEGER := 0;
    vacancy_rec RECORD;
    placement_found BOOLEAN;
BEGIN
    -- 清空现有安置记录
    DELETE FROM v2_referrals;
    
    -- 按激活序号处理每个成员（跳过超级根）
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet, activation_sequence, activation_time
        FROM v2_members
        WHERE activation_sequence > 0
        ORDER BY activation_sequence
    LOOP
        placement_found := false;
        
        -- 步骤1：尝试直推安置（在推荐人矩阵中找位置）
        IF member_rec.referrer_wallet IS NOT NULL THEN
            -- 在推荐人矩阵中查找空位
            FOR vacancy_rec IN
                SELECT 
                    root_sequence,
                    root_wallet,
                    layer_num,
                    position_char
                FROM (
                    SELECT 
                        m.activation_sequence as root_sequence,
                        m.wallet_address as root_wallet,
                        pos.layer_num,
                        pos.position_char
                    FROM v2_members m
                    CROSS JOIN (
                        SELECT 1 as layer_num, unnest(ARRAY['L','M','R']) as position_char
                    ) pos
                    WHERE m.wallet_address = member_rec.referrer_wallet
                ) possible_positions
                WHERE NOT EXISTS (
                    SELECT 1 FROM v2_referrals r 
                    WHERE r.matrix_root_wallet = possible_positions.root_wallet
                    AND r.matrix_layer = possible_positions.layer_num
                    AND r.matrix_position = possible_positions.position_char
                )
                ORDER BY layer_num, 
                    CASE position_char WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END
                LIMIT 1
            LOOP
                INSERT INTO v2_referrals (
                    member_wallet, referrer_wallet, matrix_root_wallet, matrix_root_sequence,
                    matrix_layer, matrix_position, member_activation_sequence,
                    is_direct_referral, is_spillover_placement
                ) VALUES (
                    member_rec.wallet_address, member_rec.referrer_wallet, vacancy_rec.root_wallet, vacancy_rec.root_sequence,
                    vacancy_rec.layer_num, vacancy_rec.position_char::CHAR(1), member_rec.activation_sequence,
                    true, false
                );
                
                placement_found := true;
                total_placed := total_placed + 1;
                EXIT;
            END LOOP;
        END IF;
        
        -- 步骤2：滑落安置（按激活序号顺序找全网空位）
        IF NOT placement_found THEN
            FOR vacancy_rec IN
                SELECT 
                    root_sequence,
                    root_wallet,
                    layer_num,
                    position_char
                FROM (
                    SELECT 
                        m.activation_sequence as root_sequence,
                        m.wallet_address as root_wallet,
                        pos.layer_num,
                        pos.position_char
                    FROM v2_members m
                    CROSS JOIN (
                        SELECT 1 as layer_num, unnest(ARRAY['L','M','R']) as position_char
                        UNION ALL
                        SELECT 2 as layer_num, unnest(ARRAY['L','M','R']) as position_char
                    ) pos
                    WHERE m.activation_sequence >= 0
                ) possible_positions
                WHERE NOT EXISTS (
                    SELECT 1 FROM v2_referrals r 
                    WHERE r.matrix_root_wallet = possible_positions.root_wallet
                    AND r.matrix_layer = possible_positions.layer_num
                    AND r.matrix_position = possible_positions.position_char
                )
                ORDER BY root_sequence, layer_num, 
                    CASE position_char WHEN 'L' THEN 1 WHEN 'M' THEN 2 WHEN 'R' THEN 3 END
                LIMIT 1
            LOOP
                INSERT INTO v2_referrals (
                    member_wallet, referrer_wallet, matrix_root_wallet, matrix_root_sequence,
                    matrix_layer, matrix_position, member_activation_sequence,
                    is_direct_referral, is_spillover_placement
                ) VALUES (
                    member_rec.wallet_address, member_rec.referrer_wallet, vacancy_rec.root_wallet, vacancy_rec.root_sequence,
                    vacancy_rec.layer_num, vacancy_rec.position_char::CHAR(1), member_rec.activation_sequence,
                    false, true
                );
                
                placement_found := true;
                total_placed := total_placed + 1;
                EXIT;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN format('V2矩阵安置完成: 成功安置了 %s 个会员', total_placed);
END;
$$ LANGUAGE plpgsql;

-- 第5步：显示V2架构信息
-- ==========================================

SELECT '=== 🚀 BEEHIVE 会员矩阵系统 V2 架构已创建 ===' as status;
SELECT '--- 📋 V2表结构 ---' as section;
SELECT 'v2_users: 基础用户信息' as table_info
UNION ALL SELECT 'v2_membership: NFT认领和等级管理'
UNION ALL SELECT 'v2_members: 会员激活和推荐关系' 
UNION ALL SELECT 'v2_referrals: 矩阵安置记录'
UNION ALL SELECT 'v2_user_balances: 用户余额管理';

SELECT '--- 👁️ V2视图 ---' as section;
SELECT 'v2_user_activation_mapping: 用户激活映射' as view_info
UNION ALL SELECT 'v2_user_team_stats: 团队统计'
UNION ALL SELECT 'v2_matrix_status: 矩阵状态视图'
UNION ALL SELECT 'v2_global_vacancy_list: 全网空缺位置'
UNION ALL SELECT 'v2_team_comprehensive: 综合团队视图';

SELECT '--- ⚙️ V2函数 ---' as section;
SELECT 'migrate_to_v2_schema(): 数据迁移函数' as function_info
UNION ALL SELECT 'v2_place_members_in_matrix(): V2矩阵安置函数';