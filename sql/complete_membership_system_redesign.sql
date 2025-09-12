-- 完整会员系统重新设计
-- ========================================
-- 基于NFT Claim的激活、推荐矩阵、奖励分配系统
-- ========================================

-- 备份现有数据
CREATE TABLE members_final_backup AS SELECT * FROM members;

-- 删除现有表结构
DROP VIEW IF EXISTS referrals_stats CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- ========================================
-- 第1部分：核心表结构设计
-- ========================================

-- 1. Users表 - 所有用户基础信息
CREATE TABLE users (
    wallet_address VARCHAR(42) PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'member', 'admin')) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Membership表 - NFT Claim和激活记录
CREATE TABLE membership (
    wallet_address VARCHAR(42) PRIMARY KEY,
    referrer_wallet VARCHAR(42), -- 推荐人
    current_level INTEGER NOT NULL DEFAULT 1,
    activation_id INTEGER UNIQUE, -- 全网激活序号
    activation_time TIMESTAMP DEFAULT NOW(),
    nft_claimed_levels INTEGER[] DEFAULT ARRAY[1], -- 已claim的NFT等级数组
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (wallet_address) REFERENCES users(wallet_address),
    FOREIGN KEY (referrer_wallet) REFERENCES users(wallet_address)
);

-- 3. NFT_Claims表 - 记录每次NFT claim
CREATE TABLE nft_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
    nft_level INTEGER NOT NULL,
    claim_price DECIMAL(18,6) NOT NULL, -- NFT价格
    claimed_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (wallet_address) REFERENCES membership(wallet_address),
    UNIQUE(wallet_address, nft_level) -- 每个等级只能claim一次
);

-- 4. Matrix_Placements表 - 矩阵安置记录
CREATE TABLE matrix_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_wallet VARCHAR(42) NOT NULL,
    matrix_root VARCHAR(42) NOT NULL, -- 矩阵根用户
    matrix_layer INTEGER NOT NULL DEFAULT 1,
    matrix_position CHAR(1) CHECK (matrix_position IN ('L','M','R')),
    activation_id INTEGER, -- 被安置成员的激活序号
    is_direct_referral BOOLEAN DEFAULT false,
    is_spillover BOOLEAN DEFAULT false,
    placed_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (member_wallet) REFERENCES membership(wallet_address),
    FOREIGN KEY (matrix_root) REFERENCES membership(wallet_address),
    UNIQUE(member_wallet, matrix_root) -- 每个成员在每个矩阵中只能有一条记录
);

-- 5. Layer_Rewards表 - 层级奖励记录
CREATE TABLE layer_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    triggering_member VARCHAR(42) NOT NULL, -- 触发奖励的成员
    reward_recipient VARCHAR(42) NOT NULL, -- 奖励接收人
    matrix_root VARCHAR(42) NOT NULL, -- 矩阵根
    layer_level INTEGER NOT NULL, -- 奖励层级
    nft_level INTEGER NOT NULL, -- 触发的NFT等级
    reward_amount DECIMAL(18,6) NOT NULL, -- 奖励金额
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'claimable', 'claimed', 'expired', 'rolled_up')),
    root_level_requirement INTEGER NOT NULL, -- 需要的根用户等级
    root_current_level INTEGER NOT NULL, -- 根用户当前等级
    pending_expires_at TIMESTAMP, -- pending状态过期时间
    rolled_up_to VARCHAR(42), -- roll up给谁
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (triggering_member) REFERENCES membership(wallet_address),
    FOREIGN KEY (reward_recipient) REFERENCES membership(wallet_address),
    FOREIGN KEY (matrix_root) REFERENCES membership(wallet_address)
);

-- 6. User_Balances表 - 用户余额管理
CREATE TABLE user_balances (
    wallet_address VARCHAR(42) PRIMARY KEY,
    reward_balance DECIMAL(18,6) DEFAULT 0, -- 可提现奖励余额
    total_earned DECIMAL(18,6) DEFAULT 0, -- 累计收入
    total_withdrawn DECIMAL(18,6) DEFAULT 0, -- 累计提现
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (wallet_address) REFERENCES membership(wallet_address)
);

-- 7. Withdrawal_Records表 - 提现记录
CREATE TABLE withdrawal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
    amount DECIMAL(18,6) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    transaction_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    FOREIGN KEY (wallet_address) REFERENCES membership(wallet_address)
);

-- ========================================
-- 第2部分：创建索引
-- ========================================

CREATE INDEX idx_membership_activation_id ON membership(activation_id);
CREATE INDEX idx_membership_referrer ON membership(referrer_wallet);
CREATE INDEX idx_matrix_placements_root ON matrix_placements(matrix_root);
CREATE INDEX idx_matrix_placements_layer ON matrix_placements(matrix_layer, matrix_position);
CREATE INDEX idx_layer_rewards_recipient ON layer_rewards(reward_recipient);
CREATE INDEX idx_layer_rewards_status ON layer_rewards(status);
CREATE INDEX idx_layer_rewards_expires ON layer_rewards(pending_expires_at);

-- ========================================
-- 第3部分：初始化数据
-- ========================================

-- 从备份恢复用户数据
INSERT INTO users (wallet_address, role)
SELECT 
    wallet_address, 
    CASE 
        WHEN current_level >= 19 THEN 'admin'
        WHEN current_level > 0 THEN 'member' 
        ELSE 'user'
    END
FROM members_final_backup;

-- 恢复会员数据并分配正确的激活序号
INSERT INTO membership (
    wallet_address,
    referrer_wallet,
    current_level,
    activation_id,
    activation_time,
    nft_claimed_levels
)
SELECT 
    wallet_address,
    CASE 
        -- 自己不能推荐自己，0x2C84改为超级根直推
        WHEN wallet_address = '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC' 
        THEN '0x0000000000000000000000000000000000000001'
        WHEN referrer_wallet = wallet_address THEN NULL
        ELSE referrer_wallet
    END,
    current_level,
    ROW_NUMBER() OVER (ORDER BY created_at) - 1, -- 激活序号从0开始
    created_at,
    CASE 
        WHEN current_level >= 1 THEN ARRAY[1]
        ELSE ARRAY[]::INTEGER[]
    END
FROM members_final_backup
WHERE current_level > 0
ORDER BY created_at;

-- 初始化用户余额
INSERT INTO user_balances (wallet_address)
SELECT wallet_address FROM membership;

-- 为每个level 1 NFT创建claim记录
INSERT INTO nft_claims (wallet_address, nft_level, claim_price)
SELECT wallet_address, 1, 100.00 -- 假设Level 1 NFT价格为100
FROM membership;

-- ========================================
-- 第4部分：核心函数
-- ========================================

-- 4.1 会员激活和矩阵安置函数
CREATE OR REPLACE FUNCTION place_member_in_matrix(member_wallet VARCHAR(42))
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    placement_target VARCHAR(42);
    position_char CHAR(1);
    layer_num INTEGER := 1;
    positions CHAR(1)[] := ARRAY['L','M','R'];
    pos_idx INTEGER;
    direct_count INTEGER;
    placement_found BOOLEAN := false;
BEGIN
    -- 获取成员信息
    SELECT activation_id, referrer_wallet INTO member_rec
    FROM membership WHERE wallet_address = member_wallet;
    
    -- 确定安置目标（优先推荐人）
    placement_target := COALESCE(member_rec.referrer_wallet, 
                       (SELECT wallet_address FROM membership WHERE activation_id = 0));
    
    -- 在推荐人矩阵中寻找位置
    SELECT COUNT(*) INTO direct_count
    FROM matrix_placements 
    WHERE matrix_root = placement_target AND is_direct_referral = true;
    
    -- 安置在推荐人的Layer 1
    IF direct_count < 3 THEN
        position_char := positions[direct_count + 1];
        
        INSERT INTO matrix_placements (
            member_wallet, matrix_root, matrix_layer, matrix_position,
            activation_id, is_direct_referral, is_spillover
        ) VALUES (
            member_wallet, placement_target, 1, position_char,
            member_rec.activation_id, true, false
        );
        
        placement_found := true;
    ELSE
        -- 推荐人Layer 1已满，溢出处理
        -- 这里可以添加复杂的溢出逻辑
        NULL;
    END IF;
    
    IF placement_found THEN
        RETURN format('成员 %s 已安置在 %s 的 Layer%s-%s 位置', 
               SUBSTRING(member_wallet,1,8), SUBSTRING(placement_target,1,8), 
               layer_num, position_char);
    ELSE
        RETURN format('成员 %s 安置失败', SUBSTRING(member_wallet,1,8));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4.2 NFT升级和奖励触发函数
CREATE OR REPLACE FUNCTION claim_nft_and_trigger_rewards(
    user_wallet VARCHAR(42), 
    nft_level INTEGER, 
    nft_price DECIMAL(18,6)
)
RETURNS TEXT AS $$
DECLARE
    reward_rec RECORD;
    matrix_rec RECORD;
    reward_amount DECIMAL(18,6);
    root_level INTEGER;
    layer_requirement INTEGER;
    expires_time TIMESTAMP;
BEGIN
    -- 更新用户等级和NFT记录
    UPDATE membership 
    SET current_level = GREATEST(current_level, nft_level),
        nft_claimed_levels = array_append(nft_claimed_levels, nft_level)
    WHERE wallet_address = user_wallet;
    
    -- 记录NFT claim
    INSERT INTO nft_claims (wallet_address, nft_level, claim_price)
    VALUES (user_wallet, nft_level, nft_price);
    
    -- 触发层级奖励
    FOR matrix_rec IN 
        SELECT DISTINCT matrix_root 
        FROM matrix_placements 
        WHERE member_wallet = user_wallet
    LOOP
        -- 获取矩阵根的等级
        SELECT current_level INTO root_level 
        FROM membership WHERE wallet_address = matrix_rec.matrix_root;
        
        -- 计算奖励要求
        layer_requirement := CASE 
            WHEN nft_level = 1 THEN 1
            ELSE nft_level
        END;
        
        reward_amount := nft_price; -- 100%奖励
        expires_time := NOW() + INTERVAL '72 hours';
        
        -- 创建奖励记录
        INSERT INTO layer_rewards (
            triggering_member, reward_recipient, matrix_root,
            layer_level, nft_level, reward_amount,
            status, root_level_requirement, root_current_level,
            pending_expires_at
        ) VALUES (
            user_wallet, matrix_rec.matrix_root, matrix_rec.matrix_root,
            nft_level, nft_level, reward_amount,
            CASE WHEN root_level >= layer_requirement THEN 'claimable' ELSE 'pending' END,
            layer_requirement, root_level, expires_time
        );
        
        -- 如果符合条件，立即增加余额
        IF root_level >= layer_requirement THEN
            UPDATE user_balances 
            SET reward_balance = reward_balance + reward_amount,
                total_earned = total_earned + reward_amount
            WHERE wallet_address = matrix_rec.matrix_root;
        END IF;
    END LOOP;
    
    RETURN format('NFT Level %s 已claim，价格 %s，奖励已分配', nft_level, nft_price);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 第5部分：视图创建
-- ========================================

-- 视图1：每个用户作为推荐者的统计
CREATE OR REPLACE VIEW referrer_stats AS
WITH referrer_data AS (
    SELECT 
        m.wallet_address as referrer,
        m.activation_id,
        m.current_level,
        COUNT(mp.member_wallet) as direct_referrals,
        COUNT(mp.member_wallet) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'L') as L_count,
        COUNT(mp.member_wallet) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'M') as M_count,
        COUNT(mp.member_wallet) FILTER (WHERE mp.matrix_layer = 1 AND mp.matrix_position = 'R') as R_count,
        COUNT(mp.member_wallet) FILTER (WHERE mp.is_spillover = true) as spillover_count
    FROM membership m
    LEFT JOIN matrix_placements mp ON m.wallet_address = mp.matrix_root
    GROUP BY m.wallet_address, m.activation_id, m.current_level
),
position_details AS (
    SELECT 
        matrix_root,
        MAX(CASE WHEN matrix_position = 'L' THEN activation_id END) as L_activation_id,
        MAX(CASE WHEN matrix_position = 'M' THEN activation_id END) as M_activation_id,
        MAX(CASE WHEN matrix_position = 'R' THEN activation_id END) as R_activation_id
    FROM matrix_placements 
    WHERE matrix_layer = 1
    GROUP BY matrix_root
)
SELECT 
    rd.activation_id as 激活序号,
    rd.referrer as 会员地址,
    rd.current_level as 当前等级,
    rd.direct_referrals as 直推人数,
    rd.spillover_count as 溢出人数,
    COALESCE(pd.L_activation_id::text, '') as L位置激活序号,
    COALESCE(pd.M_activation_id::text, '') as M位置激活序号,
    COALESCE(pd.R_activation_id::text, '') as R位置激活序号,
    (rd.L_count + rd.M_count + rd.R_count) || '/3' as 完成进度,
    CASE 
        WHEN rd.L_count = 0 THEN 'L'
        WHEN rd.M_count = 0 THEN 'M'
        WHEN rd.R_count = 0 THEN 'R'
        ELSE NULL
    END as 空缺位置
FROM referrer_data rd
LEFT JOIN position_details pd ON rd.referrer = pd.matrix_root
ORDER BY rd.activation_id;

-- 视图2：全网激活序号空缺位置列表
CREATE OR REPLACE VIEW global_vacancy_list AS
WITH all_positions AS (
    SELECT 
        m.activation_id,
        m.wallet_address,
        generate_series(1, 19) as layer,
        unnest(ARRAY['L','M','R']) as position
    FROM membership m
),
occupied_positions AS (
    SELECT 
        matrix_root,
        matrix_layer,
        matrix_position,
        member_wallet,
        activation_id
    FROM matrix_placements
)
SELECT 
    ap.activation_id || ap.position as 位置标识,
    ap.activation_id as 根激活序号,
    ap.wallet_address as 根用户地址,
    ap.layer as 层级,
    ap.position as 位置,
    CASE 
        WHEN op.member_wallet IS NULL THEN '空缺'
        ELSE '已占用'
    END as 状态,
    op.member_wallet as 占用者,
    op.activation_id as 占用者激活序号
FROM all_positions ap
LEFT JOIN occupied_positions op ON 
    ap.wallet_address = op.matrix_root 
    AND ap.layer = op.matrix_layer 
    AND ap.position = op.matrix_position
WHERE ap.layer <= 3 -- 只显示前3层
ORDER BY ap.activation_id, ap.layer, ap.position;

-- 视图3：奖励状态统计
CREATE OR REPLACE VIEW reward_summary AS
SELECT 
    lr.reward_recipient as 用户地址,
    m.activation_id as 激活序号,
    m.current_level as 当前等级,
    ub.reward_balance as 可提现余额,
    ub.total_earned as 累计收入,
    ub.total_withdrawn as 累计提现,
    COUNT(lr.id) FILTER (WHERE lr.status = 'claimable') as 可领取奖励数,
    COUNT(lr.id) FILTER (WHERE lr.status = 'pending') as 待定奖励数,
    SUM(lr.reward_amount) FILTER (WHERE lr.status = 'pending') as 待定奖励金额
FROM membership m
LEFT JOIN layer_rewards lr ON m.wallet_address = lr.reward_recipient
LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
GROUP BY lr.reward_recipient, m.activation_id, m.current_level, 
         ub.reward_balance, ub.total_earned, ub.total_withdrawn
ORDER BY m.activation_id;

-- ========================================
-- 第6部分：初始化和验证
-- ========================================

SELECT '=== 系统重构完成 ===' as status;
SELECT COUNT(*) || '个用户已创建' as users_count FROM users;
SELECT COUNT(*) || '个会员已激活' as members_count FROM membership;

-- 执行初始矩阵安置
DO $$
DECLARE
    member_wallet VARCHAR(42);
BEGIN
    FOR member_wallet IN 
        SELECT wallet_address FROM membership WHERE activation_id > 0 ORDER BY activation_id
    LOOP
        PERFORM place_member_in_matrix(member_wallet);
    END LOOP;
END $$;

-- 显示主要视图结果
SELECT '=== 推荐者统计视图 ===' as section;
SELECT * FROM referrer_stats LIMIT 5;

SELECT '=== 全网空缺位置视图 ===' as section;
SELECT * FROM global_vacancy_list WHERE 状态 = '空缺' LIMIT 10;

SELECT '=== 奖励统计视图 ===' as section;
SELECT * FROM reward_summary LIMIT 5;