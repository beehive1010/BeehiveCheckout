-- 完整的矩阵激活和奖励系统
-- Complete matrix activation and reward system

BEGIN;

-- ===== 第1步：移除members表的is_activated列 =====
-- Step 1: Remove is_activated column from members table

ALTER TABLE members DROP COLUMN IF EXISTS is_activated;

-- ===== 第2步：创建奖励余额表 =====
-- Step 2: Create reward balance table

CREATE TABLE IF NOT EXISTS user_reward_balances (
    wallet_address VARCHAR(42) PRIMARY KEY,
    usdc_claimable NUMERIC(18,8) DEFAULT 0,
    usdc_pending NUMERIC(18,8) DEFAULT 0,
    usdc_claimed NUMERIC(18,8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT user_reward_balances_wallet_fkey 
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
);

-- ===== 第3步：创建奖励记录表 =====
-- Step 3: Create reward records table

CREATE TABLE IF NOT EXISTS reward_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_wallet VARCHAR(42) NOT NULL,
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('layer1_L', 'layer1_M', 'layer1_R')),
    reward_amount NUMERIC(18,8) NOT NULL,
    reward_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (reward_status IN ('claimable', 'pending', 'claimed', 'expired', 'rolled_up')),
    
    -- 触发信息
    triggered_by_wallet VARCHAR(42) NOT NULL, -- 触发奖励的新激活会员
    triggered_by_placement VARCHAR(10) NOT NULL, -- L, M, R 安置位置
    layer_number INTEGER NOT NULL DEFAULT 1,
    
    -- 时间信息
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NULL, -- R区奖励的过期时间
    claimed_at TIMESTAMP WITH TIME ZONE NULL,
    rolled_up_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- 外键
    CONSTRAINT reward_records_recipient_fkey 
        FOREIGN KEY (recipient_wallet) REFERENCES users(wallet_address),
    CONSTRAINT reward_records_triggered_by_fkey 
        FOREIGN KEY (triggered_by_wallet) REFERENCES users(wallet_address)
);

-- ===== 第4步：创建奖励rollup表 =====
-- Step 4: Create reward rollup table

CREATE TABLE IF NOT EXISTS reward_rollups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_recipient VARCHAR(42) NOT NULL,
    rolled_up_to VARCHAR(42) NOT NULL,
    original_reward_id UUID NOT NULL,
    rollup_amount NUMERIC(18,8) NOT NULL,
    rollup_reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT rollups_original_recipient_fkey 
        FOREIGN KEY (original_recipient) REFERENCES users(wallet_address),
    CONSTRAINT rollups_rolled_up_to_fkey 
        FOREIGN KEY (rolled_up_to) REFERENCES users(wallet_address),
    CONSTRAINT rollups_original_reward_fkey 
        FOREIGN KEY (original_reward_id) REFERENCES reward_records(id)
);

-- ===== 第5步：创建矩阵树表（替换原referrals表结构） =====
-- Step 5: Create matrix tree table (replacing referrals table structure)

DROP TABLE IF EXISTS referrals CASCADE;

CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_wallet VARCHAR(42) NOT NULL,
    referrer_wallet VARCHAR(42) NULL, -- 直接推荐者
    matrix_parent VARCHAR(42) NULL,   -- 矩阵安置父级
    matrix_position VARCHAR(1) NULL CHECK (matrix_position IN ('L', 'M', 'R')), -- 在父级的位置
    matrix_layer INTEGER DEFAULT 1,   -- 在推荐者为root的第几层
    matrix_root VARCHAR(42) NULL,     -- 矩阵树的根节点
    
    -- 状态信息
    is_active BOOLEAN DEFAULT TRUE,
    activation_rank BIGINT,
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 外键约束
    CONSTRAINT referrals_member_fkey 
        FOREIGN KEY (member_wallet) REFERENCES users(wallet_address),
    CONSTRAINT referrals_referrer_fkey 
        FOREIGN KEY (referrer_wallet) REFERENCES users(wallet_address),
    CONSTRAINT referrals_matrix_parent_fkey 
        FOREIGN KEY (matrix_parent) REFERENCES users(wallet_address),
    CONSTRAINT referrals_matrix_root_fkey 
        FOREIGN KEY (matrix_root) REFERENCES users(wallet_address),
    
    -- 唯一约束
    UNIQUE(member_wallet, matrix_root)
);

-- ===== 第6步：创建矩阵安置核心函数 =====
-- Step 6: Create matrix placement core function

CREATE OR REPLACE FUNCTION find_matrix_placement(
    p_referrer_wallet VARCHAR(42),
    p_new_member_wallet VARCHAR(42)
) RETURNS TABLE(
    placement_parent VARCHAR(42),
    placement_position VARCHAR(1),
    placement_layer INTEGER,
    matrix_root VARCHAR(42)
) AS $$
DECLARE
    current_layer INTEGER := 1;
    root_wallet VARCHAR(42) := p_referrer_wallet;
    search_nodes VARCHAR(42)[];
    next_layer_nodes VARCHAR(42)[];
    node_wallet VARCHAR(42);
    available_position VARCHAR(1);
BEGIN
    -- 初始化搜索：从推荐者开始
    search_nodes := ARRAY[p_referrer_wallet];
    
    -- 按层级搜索，最多19层
    WHILE current_layer <= 19 AND array_length(search_nodes, 1) > 0 LOOP
        next_layer_nodes := ARRAY[]::VARCHAR(42)[];
        
        -- 遍历当前层的所有节点
        FOREACH node_wallet IN ARRAY search_nodes LOOP
            -- 检查该节点是否有空位
            SELECT pos INTO available_position
            FROM (
                SELECT 'L' as pos
                WHERE NOT EXISTS (
                    SELECT 1 FROM referrals 
                    WHERE matrix_parent = node_wallet 
                    AND matrix_position = 'L' 
                    AND matrix_root = root_wallet
                    AND is_active = TRUE
                )
                UNION ALL
                SELECT 'M' as pos
                WHERE NOT EXISTS (
                    SELECT 1 FROM referrals 
                    WHERE matrix_parent = node_wallet 
                    AND matrix_position = 'M' 
                    AND matrix_root = root_wallet
                    AND is_active = TRUE
                )
                UNION ALL
                SELECT 'R' as pos
                WHERE NOT EXISTS (
                    SELECT 1 FROM referrals 
                    WHERE matrix_parent = node_wallet 
                    AND matrix_position = 'R' 
                    AND matrix_root = root_wallet
                    AND is_active = TRUE
                )
            ) positions
            ORDER BY 
                CASE pos 
                    WHEN 'L' THEN 1
                    WHEN 'M' THEN 2  
                    WHEN 'R' THEN 3
                END
            LIMIT 1;
            
            -- 如果找到空位，返回结果
            IF available_position IS NOT NULL THEN
                RETURN QUERY SELECT 
                    node_wallet,
                    available_position,
                    current_layer,
                    root_wallet;
                RETURN;
            END IF;
            
            -- 将该节点的子节点添加到下一层搜索
            next_layer_nodes := next_layer_nodes || ARRAY(
                SELECT r.member_wallet 
                FROM referrals r 
                WHERE r.matrix_parent = node_wallet 
                AND r.matrix_root = root_wallet
                AND r.is_active = TRUE
            );
        END LOOP;
        
        -- 移动到下一层
        search_nodes := next_layer_nodes;
        current_layer := current_layer + 1;
    END LOOP;
    
    -- 如果19层都满了，返回NULL（理论上不应该发生）
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ===== 第7步：创建奖励触发函数 =====
-- Step 7: Create reward trigger function

CREATE OR REPLACE FUNCTION trigger_layer1_rewards(
    p_new_member_wallet VARCHAR(42),
    p_placement_parent VARCHAR(42),
    p_placement_position VARCHAR(1),
    p_matrix_root VARCHAR(42)
) RETURNS VOID AS $$
DECLARE
    reward_amount NUMERIC(18,8) := 100.00;
    expires_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 如果是L或M位置，奖励立即可领取
    IF p_placement_position IN ('L', 'M') THEN
        -- 插入奖励记录
        INSERT INTO reward_records (
            recipient_wallet,
            reward_type,
            reward_amount,
            reward_status,
            triggered_by_wallet,
            triggered_by_placement,
            layer_number
        ) VALUES (
            p_placement_parent,
            'layer1_' || p_placement_position,
            reward_amount,
            'claimable',
            p_new_member_wallet,
            p_placement_position,
            1
        );
        
        -- 更新用户可领取余额
        INSERT INTO user_reward_balances (wallet_address, usdc_claimable)
        VALUES (p_placement_parent, reward_amount)
        ON CONFLICT (wallet_address) DO UPDATE SET
            usdc_claimable = user_reward_balances.usdc_claimable + reward_amount,
            updated_at = NOW();
            
    -- 如果是R位置，需要检查升级状态，设置pending
    ELSIF p_placement_position = 'R' THEN
        -- 计算过期时间（72小时后）
        expires_time := NOW() + INTERVAL '72 hours';
        
        -- 插入pending奖励记录
        INSERT INTO reward_records (
            recipient_wallet,
            reward_type,
            reward_amount,
            reward_status,
            triggered_by_wallet,
            triggered_by_placement,
            layer_number,
            expires_at
        ) VALUES (
            p_placement_parent,
            'layer1_R',
            reward_amount,
            'pending',
            p_new_member_wallet,
            p_placement_position,
            1,
            expires_time
        );
        
        -- 更新用户pending余额
        INSERT INTO user_reward_balances (wallet_address, usdc_pending)
        VALUES (p_placement_parent, reward_amount)
        ON CONFLICT (wallet_address) DO UPDATE SET
            usdc_pending = user_reward_balances.usdc_pending + reward_amount,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===== 第8步：创建奖励rollup处理函数 =====
-- Step 8: Create reward rollup processing function

CREATE OR REPLACE FUNCTION process_reward_rollup(
    p_expired_reward_id UUID
) RETURNS VOID AS $$
DECLARE
    expired_reward RECORD;
    rollup_target VARCHAR(42);
    rollup_success BOOLEAN := FALSE;
    current_parent VARCHAR(42);
    check_depth INTEGER := 0;
BEGIN
    -- 获取过期奖励信息
    SELECT * INTO expired_reward
    FROM reward_records 
    WHERE id = p_expired_reward_id 
    AND reward_status = 'pending'
    AND expires_at <= NOW();
    
    IF expired_reward IS NULL THEN
        RETURN;
    END IF;
    
    -- 查找符合条件的上级（有Level 2激活的）
    current_parent := expired_reward.recipient_wallet;
    
    WHILE check_depth < 19 AND NOT rollup_success LOOP
        -- 查找当前成员的矩阵父级
        SELECT matrix_parent INTO current_parent
        FROM referrals
        WHERE member_wallet = current_parent 
        AND matrix_root = (
            SELECT matrix_root 
            FROM referrals 
            WHERE member_wallet = expired_reward.recipient_wallet
            LIMIT 1
        )
        AND is_active = TRUE;
        
        -- 如果没有上级了，跳出
        IF current_parent IS NULL THEN
            EXIT;
        END IF;
        
        -- 检查该上级是否有Level 2激活
        IF EXISTS (
            SELECT 1 FROM membership 
            WHERE wallet_address = current_parent 
            AND nft_level >= 2 
            AND activated_at IS NOT NULL
        ) THEN
            rollup_target := current_parent;
            rollup_success := TRUE;
            EXIT;
        END IF;
        
        check_depth := check_depth + 1;
    END LOOP;
    
    -- 执行rollup
    IF rollup_success THEN
        -- 更新原奖励状态
        UPDATE reward_records 
        SET 
            reward_status = 'rolled_up',
            rolled_up_at = NOW()
        WHERE id = p_expired_reward_id;
        
        -- 记录rollup
        INSERT INTO reward_rollups (
            original_recipient,
            rolled_up_to,
            original_reward_id,
            rollup_amount,
            rollup_reason
        ) VALUES (
            expired_reward.recipient_wallet,
            rollup_target,
            p_expired_reward_id,
            expired_reward.reward_amount,
            'Level 2 upgrade requirement met by upline'
        );
        
        -- 给rollup目标增加可领取余额
        INSERT INTO user_reward_balances (wallet_address, usdc_claimable)
        VALUES (rollup_target, expired_reward.reward_amount)
        ON CONFLICT (wallet_address) DO UPDATE SET
            usdc_claimable = user_reward_balances.usdc_claimable + expired_reward.reward_amount,
            updated_at = NOW();
        
        -- 减少原接收者的pending余额
        UPDATE user_reward_balances
        SET 
            usdc_pending = usdc_pending - expired_reward.reward_amount,
            updated_at = NOW()
        WHERE wallet_address = expired_reward.recipient_wallet;
        
    ELSE
        -- 没有符合条件的上级，奖励过期
        UPDATE reward_records 
        SET 
            reward_status = 'expired',
            rolled_up_at = NOW()
        WHERE id = p_expired_reward_id;
        
        -- 减少pending余额
        UPDATE user_reward_balances
        SET 
            usdc_pending = usdc_pending - expired_reward.reward_amount,
            updated_at = NOW()
        WHERE wallet_address = expired_reward.recipient_wallet;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===== 第9步：创建主激活处理函数 =====
-- Step 9: Create main activation processing function

CREATE OR REPLACE FUNCTION process_membership_activation(
    p_wallet_address VARCHAR(42),
    p_referrer_wallet VARCHAR(42) DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    placement_info JSONB,
    reward_info JSONB
) AS $$
DECLARE
    membership_record RECORD;
    placement_result RECORD;
    final_referrer VARCHAR(42);
    activation_rank_value BIGINT;
BEGIN
    -- 检查membership表中的Level 1激活记录
    SELECT * INTO membership_record
    FROM membership
    WHERE wallet_address = p_wallet_address 
    AND nft_level = 1
    AND activated_at IS NOT NULL;
    
    IF membership_record IS NULL THEN
        RETURN QUERY SELECT 
            FALSE,
            'No activated Level 1 membership found for this wallet',
            NULL::JSONB,
            NULL::JSONB;
        RETURN;
    END IF;
    
    -- 检查是否已经在矩阵中
    IF EXISTS (SELECT 1 FROM referrals WHERE member_wallet = p_wallet_address) THEN
        RETURN QUERY SELECT 
            FALSE,
            'Member already placed in matrix',
            NULL::JSONB,
            NULL::JSONB;
        RETURN;
    END IF;
    
    -- 确定最终推荐者
    final_referrer := COALESCE(
        p_referrer_wallet, 
        membership_record.referrer_wallet,
        (SELECT pre_referrer FROM users WHERE wallet_address = p_wallet_address)
    );
    
    -- 如果没有推荐者，无法进行矩阵安置
    IF final_referrer IS NULL THEN
        RETURN QUERY SELECT 
            FALSE,
            'No referrer found for matrix placement',
            NULL::JSONB,
            NULL::JSONB;
        RETURN;
    END IF;
    
    -- 检查推荐者是否已激活
    IF NOT EXISTS (
        SELECT 1 FROM membership 
        WHERE wallet_address = final_referrer 
        AND activated_at IS NOT NULL
    ) THEN
        RETURN QUERY SELECT 
            FALSE,
            'Referrer is not activated',
            NULL::JSONB,
            NULL::JSONB;
        RETURN;
    END IF;
    
    -- 查找矩阵安置位置
    SELECT * INTO placement_result
    FROM find_matrix_placement(final_referrer, p_wallet_address);
    
    IF placement_result IS NULL THEN
        RETURN QUERY SELECT 
            FALSE,
            'No available placement found in 19-layer matrix',
            NULL::JSONB,
            NULL::JSONB;
        RETURN;
    END IF;
    
    -- 获取activation_rank
    activation_rank_value := membership_record.activation_rank;
    
    -- 插入referrals表
    INSERT INTO referrals (
        member_wallet,
        referrer_wallet,
        matrix_parent,
        matrix_position,
        matrix_layer,
        matrix_root,
        activation_rank
    ) VALUES (
        p_wallet_address,
        final_referrer,
        placement_result.placement_parent,
        placement_result.placement_position,
        placement_result.placement_layer,
        placement_result.matrix_root,
        activation_rank_value
    );
    
    -- 创建或更新members记录
    INSERT INTO members (
        wallet_address,
        referrer_wallet,
        current_level,
        levels_owned,
        activation_rank,
        tier_level,
        bcc_locked_initial,
        bcc_locked_remaining,
        total_direct_referrals,
        created_at,
        updated_at
    ) VALUES (
        p_wallet_address,
        final_referrer,
        1,
        '[1]'::jsonb,
        activation_rank_value,
        membership_record.activation_tier,
        membership_record.bcc_locked_amount,
        membership_record.bcc_locked_amount - calculate_level_bcc_unlock(1, membership_record.activation_tier),
        0,
        NOW(),
        NOW()
    ) ON CONFLICT (wallet_address) DO UPDATE SET
        referrer_wallet = final_referrer,
        current_level = GREATEST(members.current_level, 1),
        levels_owned = CASE 
            WHEN members.levels_owned ? '1' THEN members.levels_owned
            ELSE members.levels_owned || '[1]'::jsonb
        END,
        activation_rank = activation_rank_value,
        tier_level = membership_record.activation_tier,
        bcc_locked_initial = membership_record.bcc_locked_amount,
        bcc_locked_remaining = membership_record.bcc_locked_amount - calculate_level_bcc_unlock(1, membership_record.activation_tier),
        updated_at = NOW();
    
    -- 触发Layer 1奖励
    PERFORM trigger_layer1_rewards(
        p_wallet_address,
        placement_result.placement_parent,
        placement_result.placement_position,
        placement_result.matrix_root
    );
    
    -- 更新推荐人的直推数量
    UPDATE members 
    SET 
        total_direct_referrals = total_direct_referrals + 1,
        updated_at = NOW()
    WHERE wallet_address = final_referrer;
    
    -- 返回结果
    RETURN QUERY SELECT 
        TRUE,
        format('Member successfully activated and placed in matrix at layer %s, position %s', 
               placement_result.placement_layer, placement_result.placement_position),
        jsonb_build_object(
            'matrix_parent', placement_result.placement_parent,
            'matrix_position', placement_result.placement_position,
            'matrix_layer', placement_result.placement_layer,
            'matrix_root', placement_result.matrix_root
        ),
        jsonb_build_object(
            'layer1_reward_triggered', true,
            'reward_type', 'layer1_' || placement_result.placement_position,
            'reward_status', CASE 
                WHEN placement_result.placement_position IN ('L', 'M') THEN 'claimable'
                ELSE 'pending_72h'
            END,
            'reward_amount', 100.00
        );
END;
$$ LANGUAGE plpgsql;

-- ===== 第10步：创建定期奖励rollup处理函数 =====
-- Step 10: Create periodic reward rollup processing function

CREATE OR REPLACE FUNCTION process_expired_rewards()
RETURNS INTEGER AS $$
DECLARE
    expired_reward_id UUID;
    processed_count INTEGER := 0;
BEGIN
    -- 处理所有过期的pending奖励
    FOR expired_reward_id IN 
        SELECT id 
        FROM reward_records 
        WHERE reward_status = 'pending' 
        AND expires_at <= NOW()
    LOOP
        PERFORM process_reward_rollup(expired_reward_id);
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- ===== 第11步：创建Level 2升级检查和奖励转换函数 =====
-- Step 11: Create Level 2 upgrade check and reward conversion function

CREATE OR REPLACE FUNCTION check_and_convert_r_rewards(
    p_wallet_address VARCHAR(42)
) RETURNS INTEGER AS $$
DECLARE
    converted_count INTEGER := 0;
    pending_reward_id UUID;
BEGIN
    -- 检查是否有Level 2激活
    IF NOT EXISTS (
        SELECT 1 FROM membership 
        WHERE wallet_address = p_wallet_address 
        AND nft_level >= 2 
        AND activated_at IS NOT NULL
    ) THEN
        RETURN 0;
    END IF;
    
    -- 将所有pending的R位奖励转为claimable
    FOR pending_reward_id IN 
        SELECT id 
        FROM reward_records 
        WHERE recipient_wallet = p_wallet_address 
        AND reward_status = 'pending'
        AND reward_type = 'layer1_R'
        AND expires_at > NOW()
    LOOP
        -- 更新奖励状态
        UPDATE reward_records 
        SET 
            reward_status = 'claimable',
            expires_at = NULL
        WHERE id = pending_reward_id;
        
        -- 转移余额从pending到claimable
        UPDATE user_reward_balances
        SET 
            usdc_pending = usdc_pending - 100.00,
            usdc_claimable = usdc_claimable + 100.00,
            updated_at = NOW()
        WHERE wallet_address = p_wallet_address;
        
        converted_count := converted_count + 1;
    END LOOP;
    
    RETURN converted_count;
END;
$$ LANGUAGE plpgsql;

-- ===== 第12步：创建索引优化 =====
-- Step 12: Create index optimizations

CREATE INDEX IF NOT EXISTS idx_referrals_member_wallet ON referrals(member_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_parent ON referrals(matrix_parent);
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_root ON referrals(matrix_root);
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_position ON referrals(matrix_position);
CREATE INDEX IF NOT EXISTS idx_referrals_activation_rank ON referrals(activation_rank);

CREATE INDEX IF NOT EXISTS idx_reward_records_recipient ON reward_records(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_reward_records_status ON reward_records(reward_status);
CREATE INDEX IF NOT EXISTS idx_reward_records_expires_at ON reward_records(expires_at);
CREATE INDEX IF NOT EXISTS idx_reward_records_triggered_by ON reward_records(triggered_by_wallet);

CREATE INDEX IF NOT EXISTS idx_user_reward_balances_claimable ON user_reward_balances(usdc_claimable);
CREATE INDEX IF NOT EXISTS idx_user_reward_balances_pending ON user_reward_balances(usdc_pending);

-- ===== 第13步：创建触发器 =====
-- Step 13: Create triggers

-- 为新表添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_reward_balances_updated_at ON user_reward_balances;
CREATE TRIGGER trigger_user_reward_balances_updated_at
    BEFORE UPDATE ON user_reward_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 第14步：创建视图 =====
-- Step 14: Create views

-- 矩阵结构查看视图
CREATE OR REPLACE VIEW matrix_structure AS
SELECT 
    r.member_wallet,
    r.referrer_wallet,
    r.matrix_parent,
    r.matrix_position,
    r.matrix_layer,
    r.matrix_root,
    r.activation_rank,
    u.username as member_username,
    parent_u.username as parent_username,
    root_u.username as root_username,
    m.current_level,
    r.placed_at
FROM referrals r
JOIN users u ON r.member_wallet = u.wallet_address
LEFT JOIN users parent_u ON r.matrix_parent = parent_u.wallet_address
LEFT JOIN users root_u ON r.matrix_root = root_u.wallet_address
LEFT JOIN members m ON r.member_wallet = m.wallet_address
WHERE r.is_active = TRUE
ORDER BY r.matrix_root, r.matrix_layer, r.activation_rank;

-- 奖励总览视图
CREATE OR REPLACE VIEW reward_summary AS
SELECT 
    urb.wallet_address,
    u.username,
    urb.usdc_claimable,
    urb.usdc_pending,
    urb.usdc_claimed,
    (urb.usdc_claimable + urb.usdc_pending + urb.usdc_claimed) as total_rewards,
    
    -- 奖励统计
    (SELECT COUNT(*) FROM reward_records WHERE recipient_wallet = urb.wallet_address AND reward_status = 'claimable') as claimable_count,
    (SELECT COUNT(*) FROM reward_records WHERE recipient_wallet = urb.wallet_address AND reward_status = 'pending') as pending_count,
    (SELECT COUNT(*) FROM reward_records WHERE recipient_wallet = urb.wallet_address AND reward_status = 'claimed') as claimed_count,
    (SELECT COUNT(*) FROM reward_records WHERE recipient_wallet = urb.wallet_address AND reward_status = 'rolled_up') as rolled_up_count,
    
    urb.updated_at
FROM user_reward_balances urb
JOIN users u ON urb.wallet_address = u.wallet_address
ORDER BY (urb.usdc_claimable + urb.usdc_pending + urb.usdc_claimed) DESC;

-- ===== 完成信息 =====
SELECT '🎉 Matrix Activation Complete System Created Successfully!' as status;
SELECT 'Key Features:' as features_header;
SELECT '✅ Removed is_activated column from members table' as feature1;
SELECT '✅ Matrix placement with 19-layer recursive spillover' as feature2;
SELECT '✅ L/M position: instant claimable rewards (100 USDC)' as feature3;  
SELECT '✅ R position: pending rewards with 72h timer' as feature4;
SELECT '✅ Automatic reward rollup to Level 2+ uplines' as feature5;
SELECT '✅ Complete reward tracking and balance management' as feature6;
SELECT '✅ Matrix tree visualization and management' as feature7;

COMMIT;