-- ========================================
-- 完整的Beehive矩阵系统 (Complete Matrix System)
-- 包括：直推记录、安置记录、递归关系、L-M-R完成情况、奖励触发
-- ========================================

-- 1. 更新referrals表结构以区分直推和安置
-- ========================================
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS is_direct_referral BOOLEAN DEFAULT false;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS is_spillover_placed BOOLEAN DEFAULT false;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS direct_referrer_wallet VARCHAR(42);

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_referrals_direct_referral ON referrals (is_direct_referral);
CREATE INDEX IF NOT EXISTS idx_referrals_spillover_placed ON referrals (is_spillover_placed);
CREATE INDEX IF NOT EXISTS idx_referrals_direct_referrer ON referrals (direct_referrer_wallet);

-- 2. 创建实际直推关系记录函数
-- ========================================
CREATE OR REPLACE FUNCTION record_direct_referrals()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    total_direct INTEGER := 0;
BEGIN
    -- 标记所有直推关系 (基于members表的referrer_wallet)
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet 
        FROM members 
        WHERE referrer_wallet IS NOT NULL 
        AND current_level > 0
    LOOP
        -- 在referrals表中标记直推关系
        INSERT INTO referrals (
            member_wallet, 
            referrer_wallet, 
            direct_referrer_wallet,
            matrix_root, 
            matrix_layer, 
            matrix_position, 
            is_direct_referral,
            is_spillover_placed,
            placed_at
        ) VALUES (
            member_rec.wallet_address,
            member_rec.referrer_wallet,
            member_rec.referrer_wallet, -- 直推者就是推荐人
            member_rec.referrer_wallet, -- 在直推者的矩阵中
            1, -- 直推都在第1层
            'L', -- 暂时标记，后续会调整为正确的L-M-R位置
            true, -- 是直推关系
            false, -- 不是滑落安置
            NOW()
        ) ON CONFLICT (member_wallet, matrix_root) DO UPDATE SET
            is_direct_referral = true,
            direct_referrer_wallet = EXCLUDED.direct_referrer_wallet;
            
        total_direct := total_direct + 1;
    END LOOP;
    
    RETURN format('记录了%s个直推关系', total_direct);
END;
$$ LANGUAGE plpgsql;

-- 3. 安置系统函数 (L->M->R 顺序，滑落到可用位置)
-- ========================================
CREATE OR REPLACE FUNCTION place_members_with_spillover()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    root_rec RECORD;
    current_layer INTEGER;
    current_position CHAR(1);
    position_count INTEGER;
    total_placed INTEGER := 0;
BEGIN
    -- 为每个root处理其直推成员的安置
    FOR root_rec IN 
        SELECT wallet_address 
        FROM members 
        WHERE current_level > 0
        ORDER BY wallet_address
    LOOP
        current_layer := 1;
        
        -- 获取该root的所有直推成员
        FOR member_rec IN
            SELECT member_wallet, direct_referrer_wallet
            FROM referrals 
            WHERE matrix_root = root_rec.wallet_address
            AND is_direct_referral = true
            ORDER BY placed_at
        LOOP
            -- 找到可用的L-M-R位置
            WHILE current_layer <= 19 LOOP
                -- 检查当前层的L-M-R位置可用性
                FOR current_position IN SELECT unnest(ARRAY['L','M','R']) LOOP
                    -- 检查位置是否已占用
                    SELECT COUNT(*) INTO position_count
                    FROM referrals 
                    WHERE matrix_root = root_rec.wallet_address
                    AND matrix_layer = current_layer
                    AND matrix_position = current_position;
                    
                    -- 如果位置可用，则安置
                    IF position_count = 0 THEN
                        -- 更新成员位置
                        UPDATE referrals 
                        SET 
                            matrix_layer = current_layer,
                            matrix_position = current_position,
                            is_spillover_placed = (current_layer > 1 OR root_rec.wallet_address != member_rec.direct_referrer_wallet)
                        WHERE member_wallet = member_rec.member_wallet
                        AND matrix_root = root_rec.wallet_address;
                        
                        total_placed := total_placed + 1;
                        GOTO next_member; -- 成功安置，处理下个成员
                    END IF;
                END LOOP;
                
                current_layer := current_layer + 1;
            END LOOP;
            
            <<next_member>>
        END LOOP;
    END LOOP;
    
    RETURN format('安置了%s个成员', total_placed);
END;
$$ LANGUAGE plpgsql;

-- 4. 生成递归关系 (每个成员出现在所有上级的矩阵中)
-- ========================================
CREATE OR REPLACE FUNCTION generate_recursive_matrix_records()
RETURNS TEXT AS $$
DECLARE
    placement_rec RECORD;
    ancestor_rec RECORD;
    total_recursive INTEGER := 0;
    recursive_layer INTEGER;
    recursive_position CHAR(1);
    position_counter INTEGER;
BEGIN
    -- 删除现有递归记录（保留第1层安置记录）
    DELETE FROM referrals WHERE matrix_layer > 1;
    
    -- 为每个安置记录生成递归记录
    FOR placement_rec IN
        SELECT DISTINCT member_wallet, matrix_root, matrix_layer, matrix_position
        FROM referrals 
        WHERE matrix_layer = 1
        ORDER BY matrix_root, member_wallet
    LOOP
        -- 生成2-19层的递归记录
        FOR recursive_layer IN 2..19 LOOP
            -- 找到该成员的上级矩阵
            FOR ancestor_rec IN
                WITH RECURSIVE upline_matrix AS (
                    -- 起点：成员的直接安置矩阵
                    SELECT 
                        placement_rec.matrix_root as ancestor_root,
                        1 as depth
                    
                    UNION ALL
                    
                    -- 递归：找到上级矩阵
                    SELECT 
                        r.matrix_root as ancestor_root,
                        u.depth + 1 as depth
                    FROM upline_matrix u
                    JOIN referrals r ON r.member_wallet = u.ancestor_root
                    WHERE r.matrix_layer = 1 
                    AND u.depth < recursive_layer
                    AND r.matrix_root != placement_rec.member_wallet -- 避免循环
                )
                SELECT ancestor_root 
                FROM upline_matrix 
                WHERE depth = recursive_layer
                LIMIT 1
            LOOP
                -- 计算在该层的位置
                SELECT COALESCE(COUNT(*), 0) + 1 INTO position_counter
                FROM referrals 
                WHERE matrix_root = ancestor_rec.ancestor_root
                AND matrix_layer = recursive_layer;
                
                -- 按L-M-R循环分配
                recursive_position := CASE 
                    WHEN position_counter % 3 = 1 THEN 'L'
                    WHEN position_counter % 3 = 2 THEN 'M'
                    ELSE 'R'
                END;
                
                -- 插入递归记录
                INSERT INTO referrals (
                    member_wallet,
                    referrer_wallet,
                    direct_referrer_wallet,
                    matrix_root,
                    matrix_layer,
                    matrix_position,
                    is_direct_referral,
                    is_spillover_placed,
                    placed_at
                ) VALUES (
                    placement_rec.member_wallet,
                    placement_rec.matrix_root, -- 安置者作为推荐人
                    placement_rec.matrix_root,
                    ancestor_rec.ancestor_root,
                    recursive_layer,
                    recursive_position,
                    false, -- 不是直推关系
                    true,  -- 是递归安置
                    NOW()
                ) ON CONFLICT (member_wallet, matrix_root) DO NOTHING;
                
                total_recursive := total_recursive + 1;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RETURN format('生成了%s个递归记录', total_recursive);
END;
$$ LANGUAGE plpgsql;

-- 5. 创建实际直推统计VIEW
-- ========================================
CREATE OR REPLACE VIEW direct_referrals_stats AS
SELECT 
    matrix_root as referrer_wallet,
    COUNT(*) as total_direct_referrals,
    COUNT(CASE WHEN matrix_layer = 1 THEN 1 END) as direct_placed_count,
    COUNT(CASE WHEN is_spillover_placed = true THEN 1 END) as spillover_count,
    ARRAY_AGG(DISTINCT member_wallet ORDER BY member_wallet) as direct_members
FROM referrals
WHERE is_direct_referral = true
GROUP BY matrix_root;

-- 6. 创建总团队统计VIEW
-- ========================================
CREATE OR REPLACE VIEW total_team_stats AS
SELECT 
    matrix_root,
    COUNT(DISTINCT member_wallet) as total_team_size,
    COUNT(DISTINCT CASE WHEN is_direct_referral = true THEN member_wallet END) as direct_count,
    COUNT(DISTINCT CASE WHEN is_spillover_placed = true THEN member_wallet END) as spillover_count,
    MAX(matrix_layer) as deepest_layer
FROM referrals
GROUP BY matrix_root;

-- 7. 创建L-M-R完成情况VIEW
-- ========================================
CREATE OR REPLACE VIEW matrix_completion_status AS
SELECT 
    matrix_root,
    matrix_layer,
    COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) as left_count,
    COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) as middle_count,
    COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) as right_count,
    CASE 
        WHEN COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) = 0 THEN 'L'
        WHEN COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) = 0 THEN 'M'
        WHEN COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) = 0 THEN 'R'
        ELSE 'COMPLETE'
    END as next_available_position,
    CASE 
        WHEN COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) > 0
         AND COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) > 0
         AND COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) > 0
        THEN true 
        ELSE false 
    END as layer_complete,
    POWER(3, matrix_layer) as max_capacity,
    COUNT(*) as current_members
FROM referrals
GROUP BY matrix_root, matrix_layer
ORDER BY matrix_root, matrix_layer;

-- 8. 创建空缺位置详情VIEW
-- ========================================
CREATE OR REPLACE VIEW vacant_positions AS
SELECT 
    matrix_root,
    matrix_layer,
    ARRAY_REMOVE(ARRAY[
        CASE WHEN LEFT(left_members, 1) = '0' THEN 'L' ELSE NULL END,
        CASE WHEN LEFT(middle_members, 1) = '0' THEN 'M' ELSE NULL END,
        CASE WHEN LEFT(right_members, 1) = '0' THEN 'R' ELSE NULL END
    ], NULL) as vacant_positions,
    left_members || ' in L, ' || middle_members || ' in M, ' || right_members || ' in R' as position_summary
FROM (
    SELECT 
        matrix_root,
        matrix_layer,
        COALESCE(COUNT(CASE WHEN matrix_position = 'L' THEN 1 END)::text, '0') as left_members,
        COALESCE(COUNT(CASE WHEN matrix_position = 'M' THEN 1 END)::text, '0') as middle_members,
        COALESCE(COUNT(CASE WHEN matrix_position = 'R' THEN 1 END)::text, '0') as right_members
    FROM referrals
    GROUP BY matrix_root, matrix_layer
) sub
WHERE matrix_layer <= 5 -- 只显示前5层
ORDER BY matrix_root, matrix_layer;

-- 9. 创建激活奖励触发表
-- ========================================
CREATE TABLE IF NOT EXISTS activation_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    triggering_member VARCHAR(42) NOT NULL, -- 激活的会员
    recipient_wallet VARCHAR(42) NOT NULL,  -- 接收奖励的上级
    matrix_root VARCHAR(42) NOT NULL,      -- 在哪个矩阵中
    matrix_layer INTEGER NOT NULL,         -- 在第几层
    reward_amount NUMERIC(18,8) DEFAULT 0,  -- 奖励金额
    reward_type VARCHAR(50) DEFAULT 'activation', -- 奖励类型
    activation_level INTEGER DEFAULT 1,     -- 激活的等级
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,        -- 是否已处理
    
    FOREIGN KEY (triggering_member) REFERENCES members(wallet_address),
    FOREIGN KEY (recipient_wallet) REFERENCES members(wallet_address)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_activation_rewards_triggering ON activation_rewards (triggering_member);
CREATE INDEX IF NOT EXISTS idx_activation_rewards_recipient ON activation_rewards (recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_activation_rewards_processed ON activation_rewards (processed);

-- 10. 激活奖励触发函数
-- ========================================
CREATE OR REPLACE FUNCTION trigger_activation_rewards(
    activated_member VARCHAR(42),
    activation_level INTEGER DEFAULT 1
)
RETURNS TEXT AS $$
DECLARE
    upline_rec RECORD;
    reward_count INTEGER := 0;
    base_reward NUMERIC(18,8) := 10.0; -- 基础奖励金额
BEGIN
    -- 为激活会员的所有上级矩阵根节点触发奖励
    FOR upline_rec IN
        SELECT DISTINCT 
            matrix_root,
            matrix_layer,
            COUNT(*) as layer_members
        FROM referrals 
        WHERE member_wallet = activated_member
        GROUP BY matrix_root, matrix_layer
        ORDER BY matrix_layer
    LOOP
        -- 计算基于层级的奖励金额
        INSERT INTO activation_rewards (
            triggering_member,
            recipient_wallet,
            matrix_root,
            matrix_layer,
            reward_amount,
            activation_level,
            created_at
        ) VALUES (
            activated_member,
            upline_rec.matrix_root,
            upline_rec.matrix_root,
            upline_rec.matrix_layer,
            base_reward * activation_level / upline_rec.matrix_layer, -- 层级越高奖励越少
            activation_level,
            NOW()
        );
        
        reward_count := reward_count + 1;
    END LOOP;
    
    RETURN format('为会员%s的%s级激活触发了%s个奖励', activated_member, activation_level, reward_count);
END;
$$ LANGUAGE plpgsql;

-- 11. 同步spillover_matrix表数据
-- ========================================
CREATE OR REPLACE FUNCTION sync_spillover_matrix()
RETURNS TEXT AS $$
DECLARE
    sync_count INTEGER := 0;
    spillover_rec RECORD;
BEGIN
    -- 清空spillover_matrix表
    DELETE FROM spillover_matrix;
    
    -- 将referrals表中的滑落安置记录同步到spillover_matrix
    FOR spillover_rec IN
        SELECT 
            member_wallet,
            referrer_wallet,
            matrix_root,
            matrix_layer,
            matrix_position,
            matrix_layer as original_layer, -- 假设原始层级等于当前层级
            is_active,
            placed_at
        FROM referrals
        WHERE is_spillover_placed = true
    LOOP
        INSERT INTO spillover_matrix (
            member_wallet,
            referrer_wallet,
            matrix_root,
            matrix_layer,
            matrix_position,
            original_layer,
            is_active,
            placed_at
        ) VALUES (
            spillover_rec.member_wallet,
            spillover_rec.referrer_wallet,
            spillover_rec.matrix_root,
            spillover_rec.matrix_layer,
            spillover_rec.matrix_position,
            spillover_rec.original_layer,
            spillover_rec.is_active,
            spillover_rec.placed_at
        );
        
        sync_count := sync_count + 1;
    END LOOP;
    
    RETURN format('同步了%s条记录到spillover_matrix表', sync_count);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 执行完整矩阵系统初始化
-- ========================================

-- 步骤1：记录直推关系
SELECT record_direct_referrals() as "1. 直推关系记录";

-- 步骤2：执行安置系统
SELECT place_members_with_spillover() as "2. 成员安置";

-- 步骤3：生成递归关系
SELECT generate_recursive_matrix_records() as "3. 递归记录生成";

-- 步骤4：同步spillover_matrix表
SELECT sync_spillover_matrix() as "4. 同步spillover_matrix";

-- ========================================
-- 验证结果
-- ========================================

-- 验证直推统计
SELECT '=== 直推统计 ===' as section;
SELECT * FROM direct_referrals_stats LIMIT 5;

-- 验证团队统计  
SELECT '=== 团队统计 ===' as section;
SELECT * FROM total_team_stats LIMIT 5;

-- 验证L-M-R完成情况
SELECT '=== L-M-R完成情况 ===' as section;
SELECT * FROM matrix_completion_status WHERE matrix_layer <= 3 LIMIT 10;

-- 验证空缺位置
SELECT '=== 空缺位置 ===' as section;
SELECT * FROM vacant_positions LIMIT 10;

-- 验证最终数据统计
SELECT 
    'referrals表总记录数' as 统计类型,
    COUNT(*) as 数量,
    COUNT(DISTINCT matrix_root) as 矩阵根数,
    MIN(matrix_layer) as 最小层级,
    MAX(matrix_layer) as 最大层级
FROM referrals;