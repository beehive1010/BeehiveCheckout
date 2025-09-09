-- =====================================================
-- 最终版本：完整3x3矩阵同步 - 支持19层递归放置
-- FINAL VERSION: Complete 3x3 Matrix Sync - 19 Layer Recursive Placement
-- 
-- 这个脚本解决了以下问题：
-- 1. matrix_parent 字段未更新
-- 2. 多层矩阵放置逻辑不正确
-- 3. 地址大小写不敏感匹配
-- 4. 3x3矩阵spillover规则实现
-- =====================================================

-- 第一步：确保表结构完整
-- Step 1: Ensure complete table structure
DO $$
BEGIN
    -- 添加矩阵相关字段到 referrals 表
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'matrix_parent'
    ) THEN
        ALTER TABLE referrals ADD COLUMN matrix_parent TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'matrix_position'
    ) THEN
        ALTER TABLE referrals ADD COLUMN matrix_position TEXT; -- 'L', 'M', 'R'
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
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'referrals' AND column_name = 'placement_order'
    ) THEN
        ALTER TABLE referrals ADD COLUMN placement_order INTEGER;
    END IF;
END
$$;

-- 第二步：同步基础数据（大小写不敏感）
-- Step 2: Sync basic data (case insensitive)
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

-- 第三步：清空现有矩阵数据，重新计算
-- Step 3: Clear existing matrix data for recalculation
UPDATE referrals SET 
    matrix_parent = NULL,
    matrix_position = NULL,
    matrix_layer = NULL,
    matrix_root = NULL,
    placement_order = NULL;

-- 第四步：创建矩阵放置算法
-- Step 4: Create matrix placement algorithm

-- 主要的矩阵重建函数
CREATE OR REPLACE FUNCTION rebuild_complete_3x3_matrix()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    order_counter INTEGER := 0;
    processed_count INTEGER := 0;
    matrix_root_addr TEXT;
BEGIN
    RAISE NOTICE '🚀 开始重建3x3矩阵结构...';
    
    -- 按激活时间顺序处理所有已激活成员
    FOR member_rec IN 
        SELECT 
            LOWER(m.wallet_address) as wallet,
            LOWER(m.referrer_wallet) as referrer,
            m.created_at,
            m.current_level
        FROM members m
        WHERE m.current_level >= 1
        AND m.referrer_wallet IS NOT NULL
        AND m.referrer_wallet != ''
        ORDER BY m.created_at ASC
    LOOP
        order_counter := order_counter + 1;
        
        -- 确定矩阵根节点（向上追溯到最顶层推荐人）
        matrix_root_addr := member_rec.referrer;
        
        -- 使用矩阵放置算法找到正确位置
        PERFORM place_member_in_matrix_tree(
            member_rec.wallet,
            member_rec.referrer, 
            matrix_root_addr,
            order_counter
        );
        
        processed_count := processed_count + 1;
        
        -- 每50个成员输出一次进度
        IF processed_count % 50 = 0 THEN
            RAISE NOTICE '已处理 % 个成员', processed_count;
        END IF;
    END LOOP;
    
    RETURN '✅ 矩阵重建完成！处理了 ' || processed_count || ' 个成员';
END;
$$ LANGUAGE plpgsql;

-- 矩阵放置核心函数 - 实现真正的多层3x3逻辑
CREATE OR REPLACE FUNCTION place_member_in_matrix_tree(
    member_addr TEXT,
    referrer_addr TEXT,
    root_addr TEXT,
    order_num INTEGER
) RETURNS VOID AS $$
DECLARE
    target_parent TEXT;
    target_position TEXT;
    target_layer INTEGER;
    available_spot RECORD;
    current_layer INTEGER := 1;
    max_search_layers INTEGER := 19;
BEGIN
    -- 在矩阵中寻找第一个可用位置
    WHILE current_layer <= max_search_layers LOOP
        -- 查找当前层级中第一个可用的父节点
        SELECT 
            r.member_wallet as parent_wallet,
            r.matrix_layer as parent_layer,
            COUNT(child.member_wallet) as children_count
        INTO available_spot
        FROM referrals r
        LEFT JOIN referrals child ON LOWER(child.matrix_parent) = LOWER(r.member_wallet)
            AND child.matrix_root = root_addr
        WHERE r.matrix_root = root_addr
        AND r.matrix_layer = current_layer
        GROUP BY r.member_wallet, r.matrix_layer, r.placement_order
        HAVING COUNT(child.member_wallet) < 3  -- 少于3个子节点
        ORDER BY MIN(r.placement_order) ASC
        LIMIT 1;
        
        -- 如果在当前层找到了可用位置
        IF available_spot.parent_wallet IS NOT NULL THEN
            target_parent := available_spot.parent_wallet;
            target_layer := current_layer + 1;
            
            -- 确定具体位置 (L, M, R)
            target_position := CASE available_spot.children_count
                WHEN 0 THEN 'L'
                WHEN 1 THEN 'M'
                WHEN 2 THEN 'R'
                ELSE 'L' -- 默认
            END;
            
            EXIT; -- 找到位置，退出循环
        END IF;
        
        current_layer := current_layer + 1;
    END LOOP;
    
    -- 如果没找到位置，放在根节点的第一层
    IF target_parent IS NULL THEN
        target_parent := root_addr;
        target_layer := 1;
        target_position := 'L';
    END IF;
    
    -- 更新成员的矩阵位置信息
    UPDATE referrals 
    SET 
        matrix_parent = target_parent,
        matrix_position = target_position,
        matrix_layer = target_layer,
        matrix_root = root_addr,
        placement_order = order_num
    WHERE LOWER(member_wallet) = LOWER(member_addr);
    
    -- 调试信息
    IF order_num <= 10 THEN
        RAISE NOTICE '成员 % 放置在父节点 % 的位置 % (层级%)', 
            LEFT(member_addr, 10), LEFT(target_parent, 10), target_position, target_layer;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 第五步：执行完整重建
-- Step 5: Execute complete rebuild
SELECT rebuild_complete_3x3_matrix() as rebuild_result;

-- 第六步：验证结果
-- Step 6: Validation and reporting
SELECT 
    '🎯 矩阵同步验证报告' as report_title,
    NOW() as sync_time;

-- 基础统计
SELECT 
    '📊 基础统计' as section,
    COUNT(*) as 总推荐记录,
    COUNT(CASE WHEN matrix_parent IS NOT NULL THEN 1 END) as 已分配矩阵父节点,
    COUNT(CASE WHEN matrix_position IS NOT NULL THEN 1 END) as 已分配矩阵位置,
    COUNT(CASE WHEN matrix_layer IS NOT NULL THEN 1 END) as 已分配矩阵层级,
    ROUND(
        COUNT(CASE WHEN matrix_parent IS NOT NULL THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as 同步成功率
FROM referrals;

-- 层级分布统计
SELECT 
    '📈 层级分布' as section,
    matrix_layer as 层级,
    COUNT(*) as 成员数量,
    COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) as L位置,
    COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) as M位置,
    COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) as R位置
FROM referrals 
WHERE matrix_layer IS NOT NULL
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 检查特定地址
SELECT 
    '🎯 特定地址检查' as section,
    r.member_wallet as 成员地址,
    r.referrer_wallet as 推荐人,
    r.matrix_parent as 矩阵父节点,
    r.matrix_position as 矩阵位置,
    r.matrix_layer as 矩阵层级,
    r.placement_order as 放置顺序,
    CASE 
        WHEN r.matrix_parent IS NOT NULL THEN '✅ 已同步'
        ELSE '❌ 未同步'
    END as 同步状态
FROM referrals r
WHERE LOWER(r.member_wallet) = '0x479abda60f8c62a7c3fba411ab948a8be0e616ab';

-- 显示矩阵树结构示例
SELECT 
    '🌳 矩阵树结构示例' as section,
    r.matrix_root as 根节点,
    r.matrix_parent as 父节点,
    r.member_wallet as 成员,
    r.matrix_position as 位置,
    r.matrix_layer as 层级,
    r.placement_order as 顺序
FROM referrals r
WHERE r.matrix_layer IS NOT NULL
ORDER BY r.matrix_root, r.matrix_layer, r.placement_order
LIMIT 20;

-- 验证3x3规则
SELECT 
    '🔍 3x3规则验证' as section,
    matrix_parent as 父节点,
    COUNT(*) as 子节点数量,
    string_agg(matrix_position, '' ORDER BY 
        CASE matrix_position 
            WHEN 'L' THEN 1 
            WHEN 'M' THEN 2 
            WHEN 'R' THEN 3 
            ELSE 4
        END
    ) as 位置组合,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ 已满员'
        WHEN COUNT(*) > 3 THEN '❌ 超出限制'
        ELSE '🔄 未满员'
    END as 状态
FROM referrals 
WHERE matrix_parent IS NOT NULL
GROUP BY matrix_parent
HAVING COUNT(*) > 0
ORDER BY COUNT(*) DESC
LIMIT 15;

-- 创建性能索引
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_parent_lower ON referrals(LOWER(matrix_parent));
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_root_lower ON referrals(LOWER(matrix_root));
CREATE INDEX IF NOT EXISTS idx_referrals_matrix_layer ON referrals(matrix_layer);
CREATE INDEX IF NOT EXISTS idx_referrals_placement_order ON referrals(placement_order);
CREATE INDEX IF NOT EXISTS idx_referrals_member_wallet_lower ON referrals(LOWER(member_wallet));

-- 最终状态检查
SELECT 
    '✅ 最终同步状态' as final_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM referrals WHERE matrix_parent IS NULL AND referrer_wallet IS NOT NULL) = 0 
        THEN '🎉 完全成功 - 所有成员都已正确放置在矩阵中'
        ELSE '⚠️ 部分成功 - 还有 ' || (SELECT COUNT(*) FROM referrals WHERE matrix_parent IS NULL AND referrer_wallet IS NOT NULL) || ' 个成员需要处理'
    END as 同步结果,
    (SELECT COUNT(DISTINCT matrix_layer) FROM referrals WHERE matrix_layer IS NOT NULL) as 总层级数,
    (SELECT MAX(matrix_layer) FROM referrals) as 最深层级;