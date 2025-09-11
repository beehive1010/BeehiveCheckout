-- BEEHIVE 19层1x3递归推荐树结构规范
-- 每个会员都有自己独立的19层matrix

BEGIN;

-- ========================================
-- 1x3 Matrix 结构说明
-- ========================================

/*
19层1x3递归推荐树结构 (每个会员都是matrix_root):

规则:
1. 每个会员(matrix_root)都有自己独立的19层matrix
2. 每层位置分配: L (Left), M (Middle), R (Right)
3. 每层最大容量: 3^layer
   - Layer 1: 3个位置 (L, M, R)
   - Layer 2: 9个位置 (LLL, LLM, LLR, LML, LMM, LMR, LRL, LRM, LRR)
   - Layer 3: 27个位置
   - ...以此类推到Layer 19

4. 填充顺序: 按照时间顺序在每层循环分配L-M-R位置
5. 滑落机制: 当某个分支满员时，新成员滑落到其他分支

关键概念:
- matrix_root: 该matrix的拥有者
- matrix_layer: 在该matrix中的层级 (1-19)
- matrix_position: 在该层的位置 (L/M/R)
- member_wallet: 被推荐的会员钱包地址
- referrer_wallet: 直接推荐人（可能与matrix_root不同，因为滑落）

示例matrix结构:
    Root User (matrix_root)
         |
    Layer 1: [L] [M] [R]
         |     |     |
    Layer 2: LLL LLM LLR | MLL MLM MLR | RLL RLM RLR
*/

-- ========================================
-- 验证当前matrix结构
-- ========================================

-- 检查每个matrix_root的层级分布
CREATE OR REPLACE VIEW matrix_structure_summary AS
SELECT 
    matrix_root,
    COUNT(*) as total_members,
    COUNT(DISTINCT matrix_layer) as active_layers,
    MAX(matrix_layer) as deepest_layer,
    COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) as total_L_positions,
    COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) as total_M_positions,
    COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) as total_R_positions
FROM referrals 
WHERE matrix_root IS NOT NULL
GROUP BY matrix_root
ORDER BY total_members DESC;

-- 检查每层的容量使用情况
CREATE OR REPLACE VIEW layer_capacity_analysis AS
SELECT 
    matrix_layer,
    COUNT(*) as total_members_in_layer,
    POWER(3, matrix_layer) as theoretical_max_capacity,
    ROUND(COUNT(*) * 100.0 / POWER(3, matrix_layer), 2) as capacity_usage_percent,
    COUNT(DISTINCT matrix_root) as active_matrices_at_layer
FROM referrals 
WHERE matrix_root IS NOT NULL
GROUP BY matrix_layer
ORDER BY matrix_layer;

-- 检查第1层L-M-R分布（最重要的验证）
CREATE OR REPLACE VIEW layer1_lmr_distribution AS
SELECT 
    matrix_root,
    COUNT(CASE WHEN matrix_position = 'L' THEN 1 END) as L_count,
    COUNT(CASE WHEN matrix_position = 'M' THEN 1 END) as M_count,
    COUNT(CASE WHEN matrix_position = 'R' THEN 1 END) as R_count,
    COUNT(*) as total_layer1,
    CASE 
        WHEN COUNT(*) <= 3 THEN 'VALID'
        ELSE 'INVALID - Too many members'
    END as status
FROM referrals 
WHERE matrix_layer = 1 
AND matrix_root IS NOT NULL
GROUP BY matrix_root
ORDER BY total_layer1 DESC;

-- ========================================
-- 创建正确的matrix placement函数
-- ========================================

CREATE OR REPLACE FUNCTION get_next_matrix_position(
    p_matrix_root TEXT,
    p_target_layer INTEGER DEFAULT NULL
) RETURNS TABLE(
    layer INTEGER,
    position TEXT,
    current_count INTEGER,
    max_capacity INTEGER
) AS $$
DECLARE
    current_layer INTEGER := 1;
    layer_capacity INTEGER;
    layer_count INTEGER;
    available_position TEXT;
BEGIN
    -- 如果指定了目标层级，从该层开始
    IF p_target_layer IS NOT NULL THEN
        current_layer := p_target_layer;
    END IF;
    
    -- 查找可用位置
    WHILE current_layer <= 19 LOOP
        -- 计算该层最大容量
        layer_capacity := POWER(3, current_layer);
        
        -- 获取该层当前成员数
        SELECT COUNT(*) INTO layer_count
        FROM referrals 
        WHERE matrix_root = p_matrix_root 
        AND matrix_layer = current_layer;
        
        -- 如果该层还有空位
        IF layer_count < layer_capacity THEN
            -- 计算下一个L-M-R位置
            available_position := CASE (layer_count % 3)
                WHEN 0 THEN 'L'
                WHEN 1 THEN 'M'
                WHEN 2 THEN 'R'
            END;
            
            RETURN QUERY SELECT 
                current_layer as layer,
                available_position as position,
                layer_count as current_count,
                layer_capacity as max_capacity;
            RETURN;
        END IF;
        
        current_layer := current_layer + 1;
    END LOOP;
    
    -- 如果所有层都满了（理论上不应该发生）
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 测试matrix结构
-- ========================================

-- 1. 查看总体matrix结构摘要
SELECT 'Matrix Structure Summary' as section;
SELECT * FROM matrix_structure_summary LIMIT 10;

-- 2. 查看层级容量分析
SELECT 'Layer Capacity Analysis' as section;
SELECT * FROM layer_capacity_analysis WHERE matrix_layer <= 5;

-- 3. 查看第1层L-M-R分布
SELECT 'Layer 1 L-M-R Distribution' as section;
SELECT * FROM layer1_lmr_distribution WHERE total_layer1 > 0 LIMIT 10;

-- 4. 测试position分配函数
SELECT 'Next Position Test' as section;
SELECT * FROM get_next_matrix_position('0x1234567890123456789012345678901234567890');

-- ========================================
-- 清理和优化建议
-- ========================================

-- 如果发现数据不一致，运行以下修复:
-- CALL fix_matrix_to_correct_lmr_structure.sql

COMMIT;