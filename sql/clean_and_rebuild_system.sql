-- 清理现有结构并重新构建完整系统
-- ========================================

-- 第1步：完全清理现有结构
-- ========================================

-- 删除所有依赖的视图和表
DROP VIEW IF EXISTS referrer_stats CASCADE;
DROP VIEW IF EXISTS global_vacancy_list CASCADE;
DROP VIEW IF EXISTS reward_summary CASCADE;
DROP VIEW IF EXISTS referrals_stats CASCADE;
DROP VIEW IF EXISTS member_matrix_view CASCADE;

DROP TABLE IF EXISTS matrix_placements CASCADE;
DROP TABLE IF EXISTS layer_rewards CASCADE;
DROP TABLE IF EXISTS nft_claims CASCADE;
DROP TABLE IF EXISTS withdrawal_records CASCADE;
DROP TABLE IF EXISTS user_balances CASCADE;
DROP TABLE IF EXISTS membership CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 第2步：重新创建表结构
-- ========================================

-- Users表
CREATE TABLE users (
    wallet_address VARCHAR(42) PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'member', 'admin')) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Membership表
CREATE TABLE membership (
    wallet_address VARCHAR(42) PRIMARY KEY,
    referrer_wallet VARCHAR(42),
    current_level INTEGER NOT NULL DEFAULT 1,
    activation_id INTEGER UNIQUE NOT NULL, -- 全网激活序号
    activation_time TIMESTAMP DEFAULT NOW(),
    nft_claimed_levels INTEGER[] DEFAULT ARRAY[1],
    
    FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
);

-- NFT Claims表
CREATE TABLE nft_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
    nft_level INTEGER NOT NULL,
    claim_price DECIMAL(18,6) NOT NULL,
    claimed_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (wallet_address) REFERENCES membership(wallet_address)
);

-- Matrix Placements表
CREATE TABLE matrix_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_wallet VARCHAR(42) NOT NULL,
    matrix_root VARCHAR(42) NOT NULL,
    matrix_layer INTEGER NOT NULL DEFAULT 1,
    matrix_position CHAR(1) CHECK (matrix_position IN ('L','M','R')),
    activation_id INTEGER,
    is_direct_referral BOOLEAN DEFAULT false,
    is_spillover BOOLEAN DEFAULT false,
    placed_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (member_wallet) REFERENCES membership(wallet_address),
    FOREIGN KEY (matrix_root) REFERENCES membership(wallet_address)
);

-- Layer Rewards表
CREATE TABLE layer_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    triggering_member VARCHAR(42) NOT NULL,
    reward_recipient VARCHAR(42) NOT NULL,
    matrix_root VARCHAR(42) NOT NULL,
    layer_level INTEGER NOT NULL,
    nft_level INTEGER NOT NULL,
    reward_amount DECIMAL(18,6) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    root_level_requirement INTEGER NOT NULL,
    root_current_level INTEGER NOT NULL,
    pending_expires_at TIMESTAMP,
    rolled_up_to VARCHAR(42),
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (triggering_member) REFERENCES membership(wallet_address),
    FOREIGN KEY (reward_recipient) REFERENCES membership(wallet_address),
    FOREIGN KEY (matrix_root) REFERENCES membership(wallet_address)
);

-- User Balances表
CREATE TABLE user_balances (
    wallet_address VARCHAR(42) PRIMARY KEY,
    reward_balance DECIMAL(18,6) DEFAULT 0,
    total_earned DECIMAL(18,6) DEFAULT 0,
    total_withdrawn DECIMAL(18,6) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (wallet_address) REFERENCES membership(wallet_address)
);

-- 第3步：从备份恢复数据
-- ========================================

-- 恢复users数据
INSERT INTO users (wallet_address, role)
SELECT 
    wallet_address, 
    CASE 
        WHEN current_level >= 19 THEN 'admin'
        WHEN current_level > 0 THEN 'member' 
        ELSE 'user'
    END
FROM members_final_backup;

-- 恢复membership数据
INSERT INTO membership (wallet_address, referrer_wallet, current_level, activation_id, activation_time, nft_claimed_levels)
SELECT 
    wallet_address,
    CASE 
        -- 确保只有一个超级根节点，0x2C84设为超级根直推
        WHEN wallet_address = '0x2C84e7DC65209730C067827b49AC7d5A1d25C8dC' 
        THEN '0x0000000000000000000000000000000000000001'
        WHEN referrer_wallet = wallet_address THEN NULL -- 自己不能推荐自己
        ELSE referrer_wallet
    END,
    current_level,
    ROW_NUMBER() OVER (ORDER BY created_at) - 1, -- 从0开始的激活序号
    created_at,
    ARRAY[LEAST(current_level, 19)] -- 设置已claim的NFT等级
FROM members_final_backup
WHERE current_level > 0
ORDER BY created_at;

-- 初始化用户余额
INSERT INTO user_balances (wallet_address)
SELECT wallet_address FROM membership;

-- 为每个会员创建NFT claim记录
INSERT INTO nft_claims (wallet_address, nft_level, claim_price)
SELECT wallet_address, 1, 100.00
FROM membership;

-- 第4步：创建核心函数
-- ========================================

CREATE OR REPLACE FUNCTION place_member_in_matrices()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    referrer_wallet VARCHAR(42);
    position_char CHAR(1);
    positions CHAR(1)[] := ARRAY['L','M','R'];
    direct_count INTEGER;
    total_placed INTEGER := 0;
BEGIN
    -- 为每个激活的会员进行矩阵安置
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet, activation_id, activation_time
        FROM membership 
        WHERE activation_id > 0 -- 跳过超级根
        ORDER BY activation_id
    LOOP
        referrer_wallet := COALESCE(member_rec.referrer_wallet, 
                          (SELECT wallet_address FROM membership WHERE activation_id = 0));
        
        -- 计算推荐人已有的直推数量
        SELECT COUNT(*) INTO direct_count
        FROM matrix_placements 
        WHERE matrix_root = referrer_wallet AND is_direct_referral = true;
        
        -- 在推荐人矩阵中安置
        IF direct_count < 3 THEN
            position_char := positions[direct_count + 1];
            
            INSERT INTO matrix_placements (
                member_wallet, matrix_root, matrix_layer, matrix_position,
                activation_id, is_direct_referral, is_spillover
            ) VALUES (
                member_rec.wallet_address, referrer_wallet, 1, position_char,
                member_rec.activation_id, true, false
            );
            
            total_placed := total_placed + 1;
        END IF;
        
        -- 为该成员在所有上级矩阵中创建记录（递归安置）
        -- 这里可以扩展19层递归逻辑
    END LOOP;
    
    RETURN format('成功安置了 %s 个会员', total_placed);
END;
$$ LANGUAGE plpgsql;

-- 第5步：创建视图
-- ========================================

-- 视图1：推荐者统计
CREATE OR REPLACE VIEW referrer_stats AS
WITH referrer_summary AS (
    SELECT 
        m.activation_id,
        m.wallet_address,
        m.current_level,
        COUNT(mp.member_wallet) FILTER (WHERE mp.is_direct_referral = true) as direct_count,
        COUNT(mp.member_wallet) FILTER (WHERE mp.is_spillover = true) as spillover_count,
        COUNT(mp.member_wallet) FILTER (WHERE mp.matrix_position = 'L' AND mp.matrix_layer = 1) as L_filled,
        COUNT(mp.member_wallet) FILTER (WHERE mp.matrix_position = 'M' AND mp.matrix_layer = 1) as M_filled,
        COUNT(mp.member_wallet) FILTER (WHERE mp.matrix_position = 'R' AND mp.matrix_layer = 1) as R_filled
    FROM membership m
    LEFT JOIN matrix_placements mp ON m.wallet_address = mp.matrix_root
    GROUP BY m.activation_id, m.wallet_address, m.current_level
),
position_members AS (
    SELECT 
        matrix_root,
        MAX(CASE WHEN matrix_position = 'L' AND matrix_layer = 1 THEN activation_id END) as L_activation_id,
        MAX(CASE WHEN matrix_position = 'M' AND matrix_layer = 1 THEN activation_id END) as M_activation_id,
        MAX(CASE WHEN matrix_position = 'R' AND matrix_layer = 1 THEN activation_id END) as R_activation_id
    FROM matrix_placements
    GROUP BY matrix_root
)
SELECT 
    rs.activation_id as 激活序号,
    rs.wallet_address as 会员地址,
    rs.current_level as 当前等级,
    rs.direct_count as 直推人数,
    rs.spillover_count as 溢出人数,
    COALESCE(pm.L_activation_id::text, '') as L位置激活序号,
    COALESCE(pm.M_activation_id::text, '') as M位置激活序号,
    COALESCE(pm.R_activation_id::text, '') as R位置激活序号,
    (rs.L_filled + rs.M_filled + rs.R_filled) || '/3' as Layer1完成进度,
    CASE 
        WHEN rs.L_filled = 0 THEN 'L'
        WHEN rs.M_filled = 0 THEN 'M'
        WHEN rs.R_filled = 0 THEN 'R'
        ELSE NULL
    END as 空缺位置
FROM referrer_summary rs
LEFT JOIN position_members pm ON rs.wallet_address = pm.matrix_root
ORDER BY rs.activation_id;

-- 视图2：全网空缺位置列表
CREATE OR REPLACE VIEW global_vacancy_list AS
WITH all_matrix_positions AS (
    SELECT 
        m.activation_id,
        m.wallet_address,
        pos.layer,
        pos.position,
        (m.activation_id::text || pos.layer::text || pos.position) as position_id
    FROM membership m
    CROSS JOIN (
        SELECT 1 as layer, unnest(ARRAY['L','M','R']) as position
        UNION ALL
        SELECT 2 as layer, unnest(ARRAY['L','M','R']) as position
        UNION ALL  
        SELECT 3 as layer, unnest(ARRAY['L','M','R']) as position
    ) pos
)
SELECT 
    amp.position_id as 位置标识,
    amp.activation_id as 根激活序号,
    amp.wallet_address as 根用户地址,
    amp.layer as 层级,
    amp.position as 位置,
    CASE 
        WHEN mp.member_wallet IS NULL THEN '空缺'
        ELSE '已占用'
    END as 状态,
    mp.member_wallet as 占用者地址,
    mp.activation_id as 占用者激活序号
FROM all_matrix_positions amp
LEFT JOIN matrix_placements mp ON 
    amp.wallet_address = mp.matrix_root 
    AND amp.layer = mp.matrix_layer 
    AND amp.position = mp.matrix_position
ORDER BY amp.activation_id, amp.layer, amp.position;

-- 视图3：奖励统计
CREATE OR REPLACE VIEW reward_summary AS
SELECT 
    m.activation_id as 激活序号,
    m.wallet_address as 用户地址,
    m.current_level as 当前等级,
    ub.reward_balance as 可提现余额,
    ub.total_earned as 累计收入,
    COALESCE(reward_stats.pending_count, 0) as 待定奖励数,
    COALESCE(reward_stats.claimable_count, 0) as 可领取奖励数,
    COALESCE(reward_stats.pending_amount, 0) as 待定奖励金额
FROM membership m
LEFT JOIN user_balances ub ON m.wallet_address = ub.wallet_address
LEFT JOIN (
    SELECT 
        reward_recipient,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'claimable') as claimable_count,
        SUM(reward_amount) FILTER (WHERE status = 'pending') as pending_amount
    FROM layer_rewards
    GROUP BY reward_recipient
) reward_stats ON m.wallet_address = reward_stats.reward_recipient
ORDER BY m.activation_id;

-- 第6步：执行初始化
-- ========================================

-- 执行矩阵安置
SELECT place_member_in_matrices() as "矩阵安置结果";

-- 显示系统状态
SELECT '=== 系统初始化完成 ===' as status;
SELECT COUNT(*) || '个用户' as users_count FROM users;
SELECT COUNT(*) || '个激活会员' as members_count FROM membership;
SELECT COUNT(*) || '个矩阵安置记录' as placements_count FROM matrix_placements;

-- 显示主要视图
SELECT '=== 推荐者统计（前5个） ===' as section;
SELECT * FROM referrer_stats ORDER BY 激活序号 LIMIT 5;

SELECT '=== 空缺位置（前10个） ===' as section;
SELECT * FROM global_vacancy_list WHERE 状态 = '空缺' ORDER BY 根激活序号, 层级, 位置 LIMIT 10;

SELECT '=== 奖励统计（前5个） ===' as section;
SELECT * FROM reward_summary ORDER BY 激活序号 LIMIT 5;