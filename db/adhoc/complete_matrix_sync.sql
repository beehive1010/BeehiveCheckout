-- =====================================================
-- 完整矩阵系统同步 - 基于 MarketingPlan.md
-- Complete Matrix System Sync based on MarketingPlan.md
-- =====================================================

-- 第一阶段：检查和扩展数据库结构
-- Phase 1: Check and extend database structure

-- 1. 扩展 referrals 表结构
-- Extend referrals table structure
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS matrix_parent TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS matrix_position TEXT; -- 'L', 'M', 'R'
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS matrix_layer INTEGER DEFAULT 1;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS matrix_root TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS placement_order INTEGER;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 2. 创建矩阵位置追踪表
-- Create matrix positions tracking table
CREATE TABLE IF NOT EXISTS matrix_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_wallet TEXT NOT NULL,
    matrix_parent TEXT,
    matrix_root TEXT NOT NULL,
    layer_number INTEGER NOT NULL,
    position_in_layer TEXT NOT NULL, -- 'L', 'M', 'R'
    position_path TEXT, -- 'L.M.R' etc for deep positions
    placement_order INTEGER,
    is_complete BOOLEAN DEFAULT FALSE,
    children_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(member_wallet)
);

-- 3. 创建层级奖励表
-- Create layer rewards table  
CREATE TABLE IF NOT EXISTS layer_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_member TEXT NOT NULL,
    triggering_member TEXT NOT NULL,
    layer_number INTEGER NOT NULL,
    nft_level INTEGER NOT NULL,
    reward_amount DECIMAL(18,6) NOT NULL,
    reward_currency TEXT DEFAULT 'USDC',
    status TEXT DEFAULT 'pending', -- pending, claimable, claimed, rolled_up
    expires_at TIMESTAMP,
    claimed_at TIMESTAMP,
    rolled_up_to TEXT, -- wallet address if rolled up
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 第二阶段：基础数据同步
-- Phase 2: Basic data synchronization

-- 4. 同步基础推荐关系（大小写不敏感）
-- Sync basic referral relationships (case insensitive)
INSERT INTO referrals (member_wallet, referrer_wallet, created_at)
SELECT DISTINCT
    LOWER(m.wallet_address) as member_wallet,
    LOWER(m.referrer_wallet) as referrer_wallet,
    COALESCE(m.created_at, NOW()) as created_at
FROM members m
WHERE m.referrer_wallet IS NOT NULL
  AND m.referrer_wallet != ''
  AND NOT EXISTS (
    SELECT 1 FROM referrals r 
    WHERE LOWER(r.member_wallet) = LOWER(m.wallet_address)
  );

-- 5. 设置初始矩阵根节点
-- Set initial matrix root nodes
UPDATE referrals 
SET matrix_root = COALESCE(matrix_root, referrer_wallet)
WHERE matrix_root IS NULL;

-- 第三阶段：矩阵位置计算
-- Phase 3: Matrix position calculation

-- 6. 创建矩阵放置算法函数
-- Create matrix placement algorithm function
CREATE OR REPLACE FUNCTION calculate_matrix_positions()
RETURNS TEXT AS $$
DECLARE
    member_record RECORD;
    placement_counter INTEGER := 0;
    processed_count INTEGER := 0;
BEGIN
    -- 按照激活时间顺序处理所有成员
    -- Process all members by activation time order
    FOR member_record IN 
        SELECT 
            r.member_wallet,
            r.referrer_wallet,
            r.matrix_root,
            r.created_at,
            m.created_at as member_created
        FROM referrals r
        JOIN members m ON LOWER(r.member_wallet) = LOWER(m.wallet_address)
        WHERE m.current_level >= 1  -- Only activated members
        ORDER BY m.created_at ASC
    LOOP
        placement_counter := placement_counter + 1;
        
        -- 计算矩阵位置
        -- Calculate matrix position
        PERFORM place_member_in_matrix(
            member_record.member_wallet,
            member_record.referrer_wallet,
            member_record.matrix_root,
            placement_counter
        );
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN 'Processed ' || processed_count || ' members';
END;
$$ LANGUAGE plpgsql;

-- 7. 创建矩阵放置核心函数
-- Create core matrix placement function
CREATE OR REPLACE FUNCTION place_member_in_matrix(
    member_addr TEXT,
    referrer_addr TEXT, 
    root_addr TEXT,
    placement_num INTEGER
)
RETURNS VOID AS $$
DECLARE
    matrix_parent TEXT;
    matrix_pos TEXT;
    matrix_lyr INTEGER := 1;
    available_parent RECORD;
BEGIN
    -- 为根节点的第一个成员
    -- For root's first member
    IF member_addr = root_addr THEN
        matrix_parent := NULL;
        matrix_pos := 'ROOT';
        matrix_lyr := 0;
    ELSE
        -- 寻找可用的矩阵父节点
        -- Find available matrix parent
        SELECT 
            member_wallet,
            layer_number,
            children_count
        INTO available_parent
        FROM matrix_positions
        WHERE matrix_root = root_addr
          AND children_count < 3  -- Less than 3 children
        ORDER BY layer_number ASC, placement_order ASC
        LIMIT 1;
        
        IF available_parent.member_wallet IS NOT NULL THEN
            matrix_parent := available_parent.member_wallet;
            matrix_lyr := available_parent.layer_number + 1;
            
            -- 确定位置 (L, M, R)
            -- Determine position (L, M, R)
            matrix_pos := CASE available_parent.children_count
                WHEN 0 THEN 'L'
                WHEN 1 THEN 'M'  
                WHEN 2 THEN 'R'
            END;
            
            -- 更新父节点的子节点计数
            -- Update parent's children count
            UPDATE matrix_positions 
            SET 
                children_count = children_count + 1,
                is_complete = (children_count + 1 >= 3)
            WHERE member_wallet = matrix_parent;
        ELSE
            -- 回退到推荐人作为父节点
            -- Fallback to referrer as parent
            matrix_parent := referrer_addr;
            matrix_pos := 'L';
            matrix_lyr := 1;
        END IF;
    END IF;
    
    -- 更新 referrals 表
    -- Update referrals table
    UPDATE referrals 
    SET 
        matrix_parent = matrix_parent,
        matrix_position = matrix_pos,
        matrix_layer = matrix_lyr,
        matrix_root = root_addr,
        placement_order = placement_num
    WHERE LOWER(member_wallet) = LOWER(member_addr);
    
    -- 插入到 matrix_positions 表
    -- Insert into matrix_positions table
    INSERT INTO matrix_positions (
        member_wallet,
        matrix_parent,
        matrix_root,
        layer_number,
        position_in_layer,
        placement_order,
        children_count
    ) VALUES (
        member_addr,
        matrix_parent,
        root_addr,
        matrix_lyr,
        matrix_pos,
        placement_num,
        0
    )
    ON CONFLICT (member_wallet) DO UPDATE SET
        matrix_parent = EXCLUDED.matrix_parent,
        matrix_root = EXCLUDED.matrix_root,
        layer_number = EXCLUDED.layer_number,
        position_in_layer = EXCLUDED.position_in_layer,
        placement_order = EXCLUDED.placement_order;
    
    -- 检查是否触发层级奖励
    -- Check if layer rewards are triggered
    PERFORM check_layer_reward_trigger(member_addr, matrix_parent, matrix_lyr);
    
END;
$$ LANGUAGE plpgsql;

-- 8. 创建层级奖励触发检查函数
-- Create layer reward trigger check function
CREATE OR REPLACE FUNCTION check_layer_reward_trigger(
    new_member TEXT,
    parent_member TEXT,
    layer_num INTEGER
)
RETURNS VOID AS $$
DECLARE
    parent_level INTEGER;
    reward_amount DECIMAL(18,6);
BEGIN
    -- 跳过根节点
    IF parent_member IS NULL THEN
        RETURN;
    END IF;
    
    -- 获取父节点的NFT等级
    -- Get parent's NFT level
    SELECT current_level INTO parent_level
    FROM members 
    WHERE LOWER(wallet_address) = LOWER(parent_member);
    
    -- 计算奖励金额（基于NFT等级）
    -- Calculate reward amount (based on NFT level)
    reward_amount := CASE layer_num
        WHEN 1 THEN 100  -- Level 1 NFT price
        WHEN 2 THEN 150  -- Level 2 NFT price  
        WHEN 3 THEN 200  -- Level 3 NFT price
        ELSE 100 + (layer_num - 1) * 50  -- Each level +50 USDC
    END;
    
    -- 创建层级奖励记录
    -- Create layer reward record
    INSERT INTO layer_rewards (
        root_member,
        triggering_member,
        layer_number,
        nft_level,
        reward_amount,
        status,
        expires_at
    ) VALUES (
        parent_member,
        new_member,
        layer_num,
        layer_num,
        reward_amount,
        CASE 
            WHEN parent_level >= layer_num THEN 'claimable'
            ELSE 'pending'
        END,
        CASE 
            WHEN parent_level < layer_num THEN NOW() + INTERVAL '72 hours'
            ELSE NULL
        END
    );
END;
$$ LANGUAGE plpgsql;

-- 第四阶段：执行同步
-- Phase 4: Execute synchronization

-- 9. 执行矩阵位置计算
-- Execute matrix position calculation
SELECT calculate_matrix_positions() as sync_result;

-- 第五阶段：验证和报告
-- Phase 5: Validation and reporting

-- 10. 验证同步结果
-- Validate sync results
SELECT 
    '🎯 矩阵同步验证报告' as report_title,
    '' as separator;

-- 基础统计
SELECT 
    '基础统计' as section,
    (SELECT COUNT(*) FROM members WHERE current_level >= 1) as activated_members,
    (SELECT COUNT(*) FROM referrals) as referral_records,
    (SELECT COUNT(*) FROM matrix_positions) as matrix_positions,
    (SELECT COUNT(*) FROM layer_rewards) as layer_rewards;

-- 矩阵根节点统计  
SELECT 
    '矩阵根节点' as section,
    matrix_root,
    COUNT(*) as total_members,
    MAX(matrix_layer) as max_layer
FROM referrals 
WHERE matrix_root IS NOT NULL
GROUP BY matrix_root
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 层级分布
SELECT 
    '层级分布' as section,
    matrix_layer,
    COUNT(*) as members_count,
    string_agg(DISTINCT matrix_position, ', ') as positions_used
FROM referrals 
WHERE matrix_layer IS NOT NULL
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 检查特定问题地址
SELECT 
    '特定地址检查' as section,
    r.*,
    mp.layer_number,
    mp.position_in_layer,
    mp.children_count
FROM referrals r
LEFT JOIN matrix_positions mp ON LOWER(r.member_wallet) = LOWER(mp.member_wallet)
WHERE LOWER(r.member_wallet) = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';

-- 创建索引优化查询性能
-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_root ON referrals(matrix_root);
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_parent ON referrals(matrix_parent);
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_layer ON referrals(matrix_layer);
CREATE INDEX IF NOT EXISTS idx_matrix_positions_root ON matrix_positions(matrix_root);
CREATE INDEX IF NOT EXISTS idx_matrix_positions_parent ON matrix_positions(matrix_parent);
CREATE INDEX IF NOT EXISTS idx_layer_rewards_root ON layer_rewards(root_member);

SELECT '✅ 矩阵系统同步完成！' as final_status;