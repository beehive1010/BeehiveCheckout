-- 修复矩阵安置逻辑
-- ========================================
-- 1. 添加必要的字段到referrals表
-- ========================================

-- 添加直推标记字段
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS is_direct_referral BOOLEAN DEFAULT false;

-- 添加直推推荐人字段
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS direct_referrer_wallet VARCHAR(42);

-- 添加溢出安置标记
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS is_spillover_placed BOOLEAN DEFAULT false;

-- 为新字段添加索引
CREATE INDEX IF NOT EXISTS idx_referrals_is_direct_referral ON referrals(is_direct_referral);
CREATE INDEX IF NOT EXISTS idx_referrals_direct_referrer ON referrals(direct_referrer_wallet);

-- ========================================
-- 2. 清理错误数据 - 删除Root自己的矩阵记录
-- ========================================

-- 删除Root节点自己在自己矩阵中的记录（Root不应该占据自己矩阵的位置）
DELETE FROM referrals 
WHERE member_wallet = matrix_root;

-- ========================================
-- 3. 重新记录直推关系
-- ========================================

CREATE OR REPLACE FUNCTION record_direct_referrals_fixed()
RETURNS TEXT AS $$
DECLARE
    direct_count INTEGER := 0;
BEGIN
    -- 基于members表的referrer_wallet识别直推关系
    -- 更新现有记录的直推标记
    UPDATE referrals 
    SET 
        is_direct_referral = true,
        direct_referrer_wallet = matrix_root
    FROM members m
    WHERE referrals.member_wallet = m.wallet_address
    AND referrals.matrix_root = m.referrer_wallet
    AND m.referrer_wallet IS NOT NULL;
    
    GET DIAGNOSTICS direct_count = ROW_COUNT;
    
    RETURN format('标记了%s条直推关系', direct_count);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. 重新设计安置算法 - 直推成员优先
-- ========================================

CREATE OR REPLACE FUNCTION place_members_with_correct_priority()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    root_rec RECORD;
    current_layer INTEGER;
    current_position CHAR(1);
    position_count INTEGER;
    total_placed INTEGER := 0;
    position_found BOOLEAN;
    positions CHAR(1)[] := ARRAY['L','M','R'];
    pos_idx INTEGER;
BEGIN
    -- 为每个root处理其成员的安置
    FOR root_rec IN 
        SELECT wallet_address 
        FROM members 
        WHERE current_level > 0
        ORDER BY wallet_address
    LOOP
        -- 第一阶段：安置直推成员，按激活时间顺序，优先填L-M-R
        FOR member_rec IN
            SELECT r.member_wallet, r.referrer_wallet, m.created_at
            FROM referrals r
            JOIN members m ON r.member_wallet = m.wallet_address
            WHERE r.matrix_root = root_rec.wallet_address
            AND r.member_wallet != root_rec.wallet_address  -- 排除root自己
            AND EXISTS (
                SELECT 1 FROM members direct_m 
                WHERE direct_m.wallet_address = r.member_wallet 
                AND direct_m.referrer_wallet = root_rec.wallet_address
            )
            ORDER BY m.created_at  -- 按激活时间排序
        LOOP
            current_layer := 1;
            position_found := false;
            
            -- 找到可用的L-M-R位置
            WHILE current_layer <= 19 AND NOT position_found LOOP
                -- 检查当前层的L-M-R位置可用性
                pos_idx := 1;
                WHILE pos_idx <= 3 AND NOT position_found LOOP
                    current_position := positions[pos_idx];
                    
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
                            is_spillover_placed = (current_layer > 1),
                            is_direct_referral = true,
                            direct_referrer_wallet = root_rec.wallet_address
                        WHERE member_wallet = member_rec.member_wallet
                        AND matrix_root = root_rec.wallet_address;
                        
                        total_placed := total_placed + 1;
                        position_found := true;
                    END IF;
                    
                    pos_idx := pos_idx + 1;
                END LOOP;
                
                current_layer := current_layer + 1;
            END LOOP;
        END LOOP;
        
        -- 第二阶段：处理非直推成员（间接推荐、溢出等）
        FOR member_rec IN
            SELECT r.member_wallet, r.referrer_wallet, m.created_at
            FROM referrals r
            JOIN members m ON r.member_wallet = m.wallet_address
            WHERE r.matrix_root = root_rec.wallet_address
            AND r.member_wallet != root_rec.wallet_address  -- 排除root自己
            AND NOT EXISTS (
                SELECT 1 FROM members direct_m 
                WHERE direct_m.wallet_address = r.member_wallet 
                AND direct_m.referrer_wallet = root_rec.wallet_address
            )
            AND (r.matrix_layer IS NULL OR r.matrix_position IS NULL)  -- 只处理未安置的
            ORDER BY m.created_at
        LOOP
            current_layer := 1;
            position_found := false;
            
            -- 找到可用的L-M-R位置（从第1层开始，但优先级低于直推）
            WHILE current_layer <= 19 AND NOT position_found LOOP
                pos_idx := 1;
                WHILE pos_idx <= 3 AND NOT position_found LOOP
                    current_position := positions[pos_idx];
                    
                    SELECT COUNT(*) INTO position_count
                    FROM referrals 
                    WHERE matrix_root = root_rec.wallet_address
                    AND matrix_layer = current_layer
                    AND matrix_position = current_position;
                    
                    IF position_count = 0 THEN
                        UPDATE referrals 
                        SET 
                            matrix_layer = current_layer,
                            matrix_position = current_position,
                            is_spillover_placed = true,
                            is_direct_referral = false
                        WHERE member_wallet = member_rec.member_wallet
                        AND matrix_root = root_rec.wallet_address;
                        
                        total_placed := total_placed + 1;
                        position_found := true;
                    END IF;
                    
                    pos_idx := pos_idx + 1;
                END LOOP;
                
                current_layer := current_layer + 1;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RETURN format('重新安置了%s个成员', total_placed);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. 执行修复流程
-- ========================================

-- 步骤1: 记录直推关系
SELECT record_direct_referrals_fixed() as "直推关系标记结果";

-- 步骤2: 重新安置所有成员
SELECT place_members_with_correct_priority() as "成员重新安置结果";

-- 步骤3: 验证结果
SELECT '=== 修复后的矩阵状态 ===' as section;

-- 查看Root 0x000...0001的矩阵状态
SELECT 
    member_wallet,
    matrix_layer,
    matrix_position,
    is_direct_referral,
    is_spillover_placed
FROM referrals 
WHERE matrix_root LIKE '0x000%0001'
ORDER BY matrix_layer, 
         CASE matrix_position 
           WHEN 'L' THEN 1 
           WHEN 'M' THEN 2 
           WHEN 'R' THEN 3 
           ELSE 4 
         END;

-- 验证直推成员数量
SELECT 
    matrix_root,
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE is_direct_referral = true) as direct_referrals,
    COUNT(*) FILTER (WHERE is_spillover_placed = true) as spillover_members
FROM referrals 
WHERE matrix_root LIKE '0x000%0001'
GROUP BY matrix_root;