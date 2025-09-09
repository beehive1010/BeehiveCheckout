-- =====================================================
-- 修复版：矩阵父节点同步 - 解决变量名冲突
-- FIXED: Matrix Parent Sync - Resolve variable name conflicts
-- =====================================================

-- 第一步：检查当前表结构并添加缺失字段
-- Step 1: Check current table structure and add missing fields

DO $$
BEGIN
    -- 添加 matrix_parent 字段如果不存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'matrix_parent'
    ) THEN
        ALTER TABLE referrals ADD COLUMN matrix_parent TEXT;
    END IF;
    
    -- 添加其他矩阵相关字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'matrix_position'
    ) THEN
        ALTER TABLE referrals ADD COLUMN matrix_position TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'matrix_layer'
    ) THEN
        ALTER TABLE referrals ADD COLUMN matrix_layer INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'matrix_root'
    ) THEN
        ALTER TABLE referrals ADD COLUMN matrix_root TEXT;
    END IF;
END
$$;

-- 第二步：确保基础数据同步
-- Step 2: Ensure basic data sync

INSERT INTO referrals (member_wallet, referrer_wallet)
SELECT DISTINCT
    LOWER(m.wallet_address) as member_wallet,
    LOWER(m.referrer_wallet) as referrer_wallet
FROM members m
WHERE m.referrer_wallet IS NOT NULL
  AND m.referrer_wallet != ''
  AND NOT EXISTS (
    SELECT 1 FROM referrals r 
    WHERE LOWER(r.member_wallet) = LOWER(m.wallet_address)
  );

-- 第三步：简化的矩阵父节点计算
-- Step 3: Simplified matrix parent calculation

-- 创建简化版矩阵父节点更新
CREATE OR REPLACE FUNCTION update_matrix_parents()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    current_parent_addr TEXT;
    parent_child_count INTEGER;
    new_position TEXT;
    new_layer INTEGER;
    update_count INTEGER := 0;
BEGIN
    -- 按成员创建时间顺序处理
    FOR member_rec IN 
        SELECT 
            r.member_wallet,
            r.referrer_wallet,
            m.created_at
        FROM referrals r
        JOIN members m ON LOWER(r.member_wallet) = LOWER(m.wallet_address)
        WHERE m.current_level >= 1
        ORDER BY m.created_at ASC
    LOOP
        current_parent_addr := member_rec.referrer_wallet;
        new_layer := 1;
        
        -- 检查推荐人已有的直接矩阵子节点数量
        SELECT COUNT(*) INTO parent_child_count
        FROM referrals 
        WHERE LOWER(matrix_parent) = LOWER(current_parent_addr);
        
        -- 如果推荐人已有3个子节点，实施spillover
        IF parent_child_count >= 3 THEN
            -- 查找推荐人的第一个子节点作为新的父节点
            SELECT r.member_wallet INTO current_parent_addr
            FROM referrals r
            WHERE LOWER(r.matrix_parent) = LOWER(member_rec.referrer_wallet)
            AND (
                SELECT COUNT(*) 
                FROM referrals child 
                WHERE LOWER(child.matrix_parent) = LOWER(r.member_wallet)
            ) < 3
            ORDER BY r.member_wallet
            LIMIT 1;
            
            -- 如果找到了新的父节点，层级+1
            IF current_parent_addr IS NOT NULL AND current_parent_addr != member_rec.referrer_wallet THEN
                new_layer := 2;
            ELSE
                -- 没找到可用位置，回到原推荐人
                current_parent_addr := member_rec.referrer_wallet;
                new_layer := 1;
            END IF;
        END IF;
        
        -- 重新计算子节点数量确定位置
        SELECT COUNT(*) INTO parent_child_count
        FROM referrals 
        WHERE LOWER(matrix_parent) = LOWER(current_parent_addr);
        
        -- 确定矩阵位置
        new_position := CASE parent_child_count
            WHEN 0 THEN 'L'
            WHEN 1 THEN 'M'
            WHEN 2 THEN 'R'
            ELSE 'L'
        END;
        
        -- 更新矩阵信息（避免变量名冲突）
        UPDATE referrals 
        SET 
            matrix_parent = current_parent_addr,
            matrix_position = new_position,
            matrix_layer = new_layer,
            matrix_root = member_rec.referrer_wallet
        WHERE LOWER(member_wallet) = LOWER(member_rec.member_wallet);
        
        update_count := update_count + 1;
    END LOOP;
    
    RETURN 'Updated ' || update_count || ' members';
END;
$$ LANGUAGE plpgsql;

-- 第四步：执行矩阵父节点更新
-- Step 4: Execute matrix parent update

SELECT update_matrix_parents() as update_result;

-- 第五步：验证结果
-- Step 5: Validate results

SELECT 
    '🔧 矩阵父节点同步验证' as report_section,
    NOW() as report_time;

-- 基础统计
SELECT 
    '📊 基础统计' as section,
    COUNT(*) as total_referrals,
    COUNT(CASE WHEN matrix_parent IS NOT NULL THEN 1 END) as has_matrix_parent,
    COUNT(CASE WHEN matrix_position IS NOT NULL THEN 1 END) as has_matrix_position,
    COUNT(CASE WHEN matrix_layer IS NOT NULL THEN 1 END) as has_matrix_layer,
    ROUND(
        COUNT(CASE WHEN matrix_parent IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as sync_percentage
FROM referrals;

-- 检查问题地址
SELECT 
    '🎯 问题地址验证' as section,
    r.member_wallet as 成员地址,
    r.referrer_wallet as 推荐人,
    r.matrix_parent as 矩阵父节点,
    r.matrix_position as 矩阵位置,
    r.matrix_layer as 矩阵层级,
    CASE 
        WHEN r.matrix_parent IS NOT NULL THEN '✅ 已同步'
        ELSE '❌ 未同步'
    END as 同步状态
FROM referrals r
WHERE LOWER(r.member_wallet) = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';

-- 显示矩阵结构示例
SELECT 
    '🌳 矩阵结构示例' as section,
    matrix_root as 矩阵根节点,
    matrix_parent as 矩阵父节点, 
    member_wallet as 成员地址,
    matrix_position as 位置,
    matrix_layer as 层级
FROM referrals 
WHERE matrix_parent IS NOT NULL
ORDER BY matrix_root, matrix_layer, matrix_position
LIMIT 15;

-- 检查每个父节点的子节点分布
SELECT 
    '👥 父节点子节点分布' as section,
    matrix_parent as 父节点,
    COUNT(*) as 子节点数量,
    string_agg(matrix_position, ', ' ORDER BY matrix_position) as 位置分布,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ 已满员'
        WHEN COUNT(*) > 3 THEN '⚠️ 超出限制'
        ELSE '🔄 可继续添加'
    END as 状态
FROM referrals 
WHERE matrix_parent IS NOT NULL
GROUP BY matrix_parent
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 层级分布统计
SELECT 
    '📈 层级分布' as section,
    matrix_layer as 层级,
    COUNT(*) as 成员数量,
    string_agg(DISTINCT matrix_position, ', ') as 使用的位置
FROM referrals 
WHERE matrix_layer IS NOT NULL
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 创建索引优化性能
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_parent ON referrals(matrix_parent);
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_root ON referrals(matrix_root);
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_layer ON referrals(matrix_layer);

-- 最终状态检查
SELECT 
    '✅ 同步完成状态' as final_check,
    CASE 
        WHEN (SELECT COUNT(*) FROM referrals WHERE matrix_parent IS NULL AND referrer_wallet IS NOT NULL) = 0 
        THEN '完全成功 - 所有成员都有矩阵父节点'
        ELSE '部分成功 - 还有' || (SELECT COUNT(*) FROM referrals WHERE matrix_parent IS NULL AND referrer_wallet IS NOT NULL) || '个成员待处理'
    END as 同步结果;