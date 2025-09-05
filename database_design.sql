-- ==================================================
-- Beehive 19层3×3矩阵推荐树系统 数据库设计
-- 设计目标：每个member拥有自己的推荐树，19层级别，3×3延展
-- 价格体系：100 USDT起步，每级别递增50 USDT
-- 奖励机制：100%奖励给root，72小时pending机制，自动上滚
-- ==================================================

-- 1. 级别配置表 (19个级别配置)
-- Level 1: 100 USDT, Level 2: 150 USDT, ..., Level 19: 950 USDT
DROP TABLE IF EXISTS level_config CASCADE;
CREATE TABLE level_config (
    level INTEGER PRIMARY KEY,
    level_name TEXT NOT NULL,
    token_id INTEGER NOT NULL, -- NFT token ID (1-19)
    
    -- 价格结构 (cents)
    nft_price_usdt INTEGER NOT NULL, -- Level 1=10000, Level 2=15000, etc.
    reward_amount_usdt INTEGER NOT NULL, -- 100%奖励金额 (等于nft_price_usdt)
    
    -- 层级矩阵配置
    layer_number INTEGER NOT NULL, -- 对应的层级号 (level = layer)
    max_positions_in_layer INTEGER NOT NULL, -- 该层最大位置数 (3^layer)
    left_zone_positions JSONB NOT NULL, -- 左区位置编号数组
    middle_zone_positions JSONB NOT NULL, -- 中区位置编号数组  
    right_zone_positions JSONB NOT NULL, -- 右区位置编号数组
    
    -- 奖励资格要求
    reward_requires_level INTEGER NOT NULL, -- 获得奖励需要的最低等级
    pending_timeout_hours INTEGER NOT NULL DEFAULT 72, -- 72小时待升级超时
    can_earn_rewards BOOLEAN NOT NULL DEFAULT true,
    
    -- BCC解锁数量配置
    tier_1_release_amount INTEGER NOT NULL, -- BCC解锁数量
    tier_2_release_amount INTEGER NOT NULL,
    tier_3_release_amount INTEGER NOT NULL,
    tier_4_release_amount INTEGER NOT NULL,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. 会员推荐树表 (每个会员都有自己的19层推荐树)
DROP TABLE IF EXISTS member_referral_tree CASCADE;
CREATE TABLE member_referral_tree (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    root_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address), -- 树的根用户(拥有者)
    member_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address), -- 被安置的会员
    layer INTEGER NOT NULL, -- 1-19层
    position INTEGER NOT NULL, -- 在该层的位置编号 (0-based)
    zone TEXT NOT NULL, -- 'L'(左区), 'M'(中区), 'R'(右区)
    parent_wallet VARCHAR(42), -- 直接上级 (layer n-1的父节点)
    parent_position INTEGER, -- 父节点在其层的位置
    placer_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address), -- 执行安置的用户
    placement_type TEXT NOT NULL, -- 'direct'(直推), 'spillover'(滑落)
    is_active_position BOOLEAN DEFAULT true NOT NULL, -- 位置是否激活
    member_activated BOOLEAN DEFAULT false NOT NULL, -- 会员是否已激活
    registration_order INTEGER NOT NULL, -- 注册顺序号
    placed_at TIMESTAMP DEFAULT NOW() NOT NULL, -- 安置时间
    activated_at TIMESTAMP, -- 会员激活时间
    
    -- 索引优化查询性能
    CONSTRAINT unique_root_member UNIQUE(root_wallet, member_wallet),
    CONSTRAINT unique_root_layer_position UNIQUE(root_wallet, layer, position)
);

-- 3. 矩阵概览表 (每个root用户的矩阵统计)
DROP TABLE IF EXISTS member_matrix_summary CASCADE;
CREATE TABLE member_matrix_summary (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    root_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
    
    -- 层级统计
    total_members INTEGER DEFAULT 0 NOT NULL, -- 总成员数
    activated_members INTEGER DEFAULT 0 NOT NULL, -- 已激活成员数
    deepest_layer INTEGER DEFAULT 0 NOT NULL, -- 最深层级
    
    -- 各层填充情况
    layer_stats JSONB NOT NULL DEFAULT '[]', -- 数组格式的层级统计
    -- layer_stats 结构:
    -- [{
    --   "layer": 1,
    --   "maxPositions": 3,
    --   "filledPositions": 2,
    --   "activatedPositions": 1,
    --   "leftZoneFilled": 1,
    --   "middleZoneFilled": 1,
    --   "rightZoneFilled": 0,
    --   "availablePositions": [2],
    --   "nextZone": "R"
    -- }]
    
    -- 下次安置信息
    next_placement_layer INTEGER DEFAULT 1 NOT NULL,
    next_placement_position INTEGER DEFAULT 0 NOT NULL,
    next_placement_zone TEXT DEFAULT 'L' NOT NULL,
    
    last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_matrix_root UNIQUE(root_wallet)
);

-- 4. 层级奖励表 (记录所有奖励分配)
DROP TABLE IF EXISTS layer_rewards CASCADE;
CREATE TABLE layer_rewards (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    root_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address), -- 推荐树根用户
    recipient_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address), -- 奖励接收人
    trigger_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address), -- 触发奖励的会员
    trigger_level INTEGER NOT NULL, -- 触发的等级
    layer_number INTEGER NOT NULL, -- 层级号 (1-19)
    reward_amount_usdt INTEGER NOT NULL, -- 奖励金额 (cents)
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending'(待升级), 'claimable'(可领取), 'rollup'(已上滚), 'claimed'(已领取)
    requires_level INTEGER NOT NULL, -- 需要达到的等级才能领取
    current_recipient_level INTEGER NOT NULL, -- 当前接收人等级
    pending_expires_at TIMESTAMP NOT NULL, -- 72小时超时时间
    claimed_at TIMESTAMP, -- 领取时间
    rolled_up_at TIMESTAMP, -- 上滚时间
    rollup_to_wallet VARCHAR(42), -- 上滚到哪个钱包
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 5. 奖励上滚记录表
DROP TABLE IF EXISTS roll_up_records CASCADE;
CREATE TABLE roll_up_records (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    original_recipient VARCHAR(42) NOT NULL REFERENCES users(wallet_address), -- 原始受益人
    final_recipient VARCHAR(42) NOT NULL REFERENCES users(wallet_address), -- 最终受益人
    trigger_wallet VARCHAR(42) NOT NULL REFERENCES users(wallet_address), -- 触发升级的会员
    trigger_level INTEGER NOT NULL, -- 触发的等级
    reward_amount_usdt INTEGER NOT NULL, -- 奖励金额 (cents)
    rollup_reason TEXT NOT NULL, -- 'pending_expired'(72小时超时), 'level_insufficient'(等级不够)
    original_pending_id VARCHAR, -- 原始pending奖励记录ID
    rollup_path JSONB NOT NULL, -- 上滚路径 [{wallet, level, reason}]
    rollup_layer INTEGER NOT NULL, -- 上滚到第几层
    processed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ==================================================
-- 索引创建 (优化查询性能)
-- ==================================================

-- member_referral_tree 索引
CREATE INDEX IF NOT EXISTS idx_member_referral_tree_root_layer ON member_referral_tree(root_wallet, layer);
CREATE INDEX IF NOT EXISTS idx_member_referral_tree_member ON member_referral_tree(member_wallet);
CREATE INDEX IF NOT EXISTS idx_member_referral_tree_root_active ON member_referral_tree(root_wallet, is_active_position);
CREATE INDEX IF NOT EXISTS idx_member_referral_tree_placement_order ON member_referral_tree(root_wallet, registration_order);

-- layer_rewards 索引
CREATE INDEX IF NOT EXISTS idx_layer_rewards_root ON layer_rewards(root_wallet);
CREATE INDEX IF NOT EXISTS idx_layer_rewards_recipient ON layer_rewards(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_layer_rewards_status ON layer_rewards(status);
CREATE INDEX IF NOT EXISTS idx_layer_rewards_expires ON layer_rewards(pending_expires_at);
CREATE INDEX IF NOT EXISTS idx_layer_rewards_trigger ON layer_rewards(trigger_wallet, trigger_level);

-- roll_up_records 索引
CREATE INDEX IF NOT EXISTS idx_roll_up_records_original ON roll_up_records(original_recipient);
CREATE INDEX IF NOT EXISTS idx_roll_up_records_final ON roll_up_records(final_recipient);
CREATE INDEX IF NOT EXISTS idx_roll_up_records_trigger ON roll_up_records(trigger_wallet, trigger_level);

-- member_matrix_summary 索引
CREATE INDEX IF NOT EXISTS idx_member_matrix_summary_root ON member_matrix_summary(root_wallet);

-- ==================================================
-- 初始数据插入
-- ==================================================

-- 插入19个级别配置 (100-950 USDT)
INSERT INTO level_config (
    level, level_name, token_id, 
    nft_price_usdt, reward_amount_usdt,
    layer_number, max_positions_in_layer,
    left_zone_positions, middle_zone_positions, right_zone_positions,
    reward_requires_level,
    tier_1_release_amount, tier_2_release_amount, tier_3_release_amount, tier_4_release_amount
) VALUES 
-- Level 1: 100 USDT
(1, 'Warrior Level 1', 1, 10000, 10000, 1, 3, '[0]', '[1]', '[2]', 1, 100, 50, 25, 12),
-- Level 2: 150 USDT
(2, 'Guardian Level 2', 2, 15000, 15000, 2, 9, '[0,1,2]', '[3,4,5]', '[6,7,8]', 2, 150, 75, 37, 18),
-- Level 3: 200 USDT
(3, 'Knight Level 3', 3, 20000, 20000, 3, 27, '[0,1,2,3,4,5,6,7,8]', '[9,10,11,12,13,14,15,16,17]', '[18,19,20,21,22,23,24,25,26]', 3, 200, 100, 50, 25),
-- Level 4: 250 USDT
(4, 'Champion Level 4', 4, 25000, 25000, 4, 81, '[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26]', '[27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53]', '[54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80]', 4, 250, 125, 62, 31),
-- Level 5: 300 USDT
(5, 'Master Level 5', 5, 30000, 30000, 5, 243, '[]', '[]', '[]', 5, 300, 150, 75, 37),
-- Level 6-19 类似...
(6, 'Elite Level 6', 6, 35000, 35000, 6, 729, '[]', '[]', '[]', 6, 350, 175, 87, 43),
(7, 'Legend Level 7', 7, 40000, 40000, 7, 2187, '[]', '[]', '[]', 7, 400, 200, 100, 50),
(8, 'Mythic Level 8', 8, 45000, 45000, 8, 6561, '[]', '[]', '[]', 8, 450, 225, 112, 56),
(9, 'Divine Level 9', 9, 50000, 50000, 9, 19683, '[]', '[]', '[]', 9, 500, 250, 125, 62),
(10, 'Immortal Level 10', 10, 55000, 55000, 10, 59049, '[]', '[]', '[]', 10, 550, 275, 137, 68),
(11, 'Cosmic Level 11', 11, 60000, 60000, 11, 177147, '[]', '[]', '[]', 11, 600, 300, 150, 75),
(12, 'Galactic Level 12', 12, 65000, 65000, 12, 531441, '[]', '[]', '[]', 12, 650, 325, 162, 81),
(13, 'Universal Level 13', 13, 70000, 70000, 13, 1594323, '[]', '[]', '[]', 13, 700, 350, 175, 87),
(14, 'Infinite Level 14', 14, 75000, 75000, 14, 4782969, '[]', '[]', '[]', 14, 750, 375, 187, 93),
(15, 'Eternal Level 15', 15, 80000, 80000, 15, 14348907, '[]', '[]', '[]', 15, 800, 400, 200, 100),
(16, 'Supreme Level 16', 16, 85000, 85000, 16, 43046721, '[]', '[]', '[]', 16, 850, 425, 212, 106),
(17, 'Transcendent Level 17', 17, 90000, 90000, 17, 129140163, '[]', '[]', '[]', 17, 900, 450, 225, 112),
(18, 'Omnipotent Level 18', 18, 95000, 95000, 18, 387420489, '[]', '[]', '[]', 18, 950, 475, 237, 118),
(19, 'Apex Level 19', 19, 100000, 100000, 19, 1162261467, '[]', '[]', '[]', 19, 1000, 500, 250, 125);

-- ==================================================
-- 重要函数和触发器
-- ==================================================

-- 1. 计算层级位置的区域函数
CREATE OR REPLACE FUNCTION calculate_zone_for_position(layer_num INTEGER, position_num INTEGER) 
RETURNS TEXT AS $$
DECLARE
    positions_per_zone INTEGER;
BEGIN
    positions_per_zone := POWER(3, layer_num - 1);
    
    IF position_num < positions_per_zone THEN
        RETURN 'L';
    ELSIF position_num < 2 * positions_per_zone THEN
        RETURN 'M';
    ELSE
        RETURN 'R';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. 更新矩阵概览触发器函数
CREATE OR REPLACE FUNCTION update_matrix_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新或插入矩阵概览数据
    INSERT INTO member_matrix_summary (root_wallet, total_members, activated_members, deepest_layer)
    VALUES (NEW.root_wallet, 1, CASE WHEN NEW.member_activated THEN 1 ELSE 0 END, NEW.layer)
    ON CONFLICT (root_wallet) DO UPDATE SET
        total_members = member_matrix_summary.total_members + 1,
        activated_members = member_matrix_summary.activated_members + CASE WHEN NEW.member_activated THEN 1 ELSE 0 END,
        deepest_layer = GREATEST(member_matrix_summary.deepest_layer, NEW.layer),
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_matrix_summary ON member_referral_tree;
CREATE TRIGGER trigger_update_matrix_summary
    AFTER INSERT ON member_referral_tree
    FOR EACH ROW EXECUTE FUNCTION update_matrix_summary();

-- 3. 72小时奖励过期检查函数 (需要定时任务调用)
CREATE OR REPLACE FUNCTION process_expired_rewards()
RETURNS INTEGER AS $$
DECLARE
    expired_reward RECORD;
    rollup_count INTEGER := 0;
BEGIN
    -- 查找所有过期的pending奖励
    FOR expired_reward IN 
        SELECT * FROM layer_rewards 
        WHERE status = 'pending' AND pending_expires_at < NOW()
    LOOP
        -- 执行上滚逻辑
        -- TODO: 实现复杂的上滚算法
        rollup_count := rollup_count + 1;
    END LOOP;
    
    RETURN rollup_count;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 示例查询语句
-- ==================================================

-- 查询某个用户的推荐树概览
-- SELECT * FROM member_matrix_summary WHERE root_wallet = '0x123...';

-- 查询某个用户推荐树的第N层成员
-- SELECT * FROM member_referral_tree WHERE root_wallet = '0x123...' AND layer = 1 ORDER BY position;

-- 查询某个用户的pending奖励
-- SELECT * FROM layer_rewards WHERE recipient_wallet = '0x123...' AND status = 'pending';

-- 查询需要处理的过期奖励
-- SELECT * FROM layer_rewards WHERE status = 'pending' AND pending_expires_at < NOW();