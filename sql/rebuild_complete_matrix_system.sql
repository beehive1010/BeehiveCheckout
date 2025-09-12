-- 完全重构矩阵系统：基于members表的递归推荐关系
-- ========================================

-- 第1步：创建递归推荐关系表
-- ========================================

DROP TABLE IF EXISTS recursive_referrals CASCADE;
CREATE TABLE recursive_referrals (
    id SERIAL PRIMARY KEY,
    member_wallet VARCHAR(42) NOT NULL,
    referrer_wallet VARCHAR(42) NOT NULL,
    depth_level INTEGER NOT NULL, -- 推荐层级深度
    root_referrer VARCHAR(42) NOT NULL, -- 最终的根推荐人
    path VARCHAR[] NOT NULL, -- 推荐路径
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_recursive_referrals_member ON recursive_referrals(member_wallet);
CREATE INDEX idx_recursive_referrals_root ON recursive_referrals(root_referrer);
CREATE INDEX idx_recursive_referrals_depth ON recursive_referrals(depth_level);

-- 第2步：填充递归推荐关系
-- ========================================

CREATE OR REPLACE FUNCTION build_recursive_referrals()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    current_referrer VARCHAR(42);
    depth INTEGER;
    root_found VARCHAR(42);
    referral_path VARCHAR[];
    total_records INTEGER := 0;
BEGIN
    -- 清空现有数据
    DELETE FROM recursive_referrals;
    
    -- 为每个激活成员构建递归推荐路径
    FOR member_rec IN 
        SELECT wallet_address, referrer_wallet
        FROM members 
        WHERE current_level > 0
        ORDER BY created_at
    LOOP
        current_referrer := member_rec.referrer_wallet;
        depth := 1;
        root_found := member_rec.referrer_wallet;
        referral_path := ARRAY[member_rec.wallet_address];
        
        -- 向上查找，直到找到根推荐人（自己推荐自己的，或者达到最大深度）
        WHILE current_referrer IS NOT NULL AND depth <= 20 LOOP
            referral_path := referral_path || current_referrer;
            
            -- 查找上级推荐人
            SELECT referrer_wallet INTO current_referrer
            FROM members 
            WHERE wallet_address = current_referrer
            AND current_level > 0;
            
            -- 如果找到自己推荐自己的，这就是根
            IF current_referrer = referral_path[array_length(referral_path, 1)] THEN
                root_found := referral_path[array_length(referral_path, 1)];
                EXIT;
            END IF;
            
            -- 如果没有找到上级，当前就是根
            IF current_referrer IS NULL THEN
                root_found := referral_path[array_length(referral_path, 1)];
                EXIT;
            END IF;
            
            depth := depth + 1;
        END LOOP;
        
        -- 插入记录
        INSERT INTO recursive_referrals (
            member_wallet,
            referrer_wallet,
            depth_level,
            root_referrer,
            path
        ) VALUES (
            member_rec.wallet_address,
            member_rec.referrer_wallet,
            depth,
            root_found,
            referral_path
        );
        
        total_records := total_records + 1;
    END LOOP;
    
    RETURN format('构建了%s条递归推荐关系', total_records);
END;
$$ LANGUAGE plpgsql;

-- 第3步：清空并重建referrals表
-- ========================================

CREATE OR REPLACE FUNCTION rebuild_referrals_with_spillover()
RETURNS TEXT AS $$
DECLARE
    root_rec RECORD;
    member_rec RECORD;
    current_layer INTEGER;
    current_position CHAR(1);
    position_count INTEGER;
    parent_wallet VARCHAR(42);
    total_placed INTEGER := 0;
    position_found BOOLEAN;
    positions CHAR(1)[] := ARRAY['L','M','R'];
    pos_idx INTEGER;
BEGIN
    -- 清空现有referrals表
    DELETE FROM referrals;
    
    -- 为每个根推荐人构建矩阵
    FOR root_rec IN 
        SELECT DISTINCT root_referrer as wallet_address
        FROM recursive_referrals
        ORDER BY root_referrer
    LOOP
        -- 按推荐层级和激活时间顺序处理成员
        FOR member_rec IN
            SELECT 
                rr.member_wallet,
                rr.referrer_wallet,
                rr.depth_level,
                m.created_at
            FROM recursive_referrals rr
            JOIN members m ON rr.member_wallet = m.wallet_address
            WHERE rr.root_referrer = root_rec.wallet_address
            AND rr.member_wallet != root_rec.wallet_address  -- 排除根自己
            ORDER BY rr.depth_level, m.created_at  -- 先安置直推，再安置间接推荐
        LOOP
            current_layer := 1;
            position_found := false;
            
            -- 寻找可用位置
            WHILE current_layer <= 19 AND NOT position_found LOOP
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
                        -- 确定matrix_parent
                        IF current_layer = 1 THEN
                            parent_wallet := root_rec.wallet_address;
                        ELSE
                            -- 找到上层对应位置的成员作为parent
                            SELECT member_wallet INTO parent_wallet
                            FROM referrals 
                            WHERE matrix_root = root_rec.wallet_address
                            AND matrix_layer = current_layer - 1
                            AND matrix_position = current_position
                            LIMIT 1;
                            
                            -- 如果没找到对应位置，使用根作为parent
                            IF parent_wallet IS NULL THEN
                                parent_wallet := root_rec.wallet_address;
                            END IF;
                        END IF;
                        
                        -- 插入矩阵记录
                        INSERT INTO referrals (
                            member_wallet,
                            referrer_wallet,
                            matrix_root,
                            matrix_parent,
                            matrix_layer,
                            matrix_position,
                            is_direct_referral,
                            direct_referrer_wallet,
                            is_spillover_placed
                        ) VALUES (
                            member_rec.member_wallet,
                            member_rec.referrer_wallet,
                            root_rec.wallet_address,
                            parent_wallet,
                            current_layer,
                            current_position,
                            (member_rec.depth_level = 1), -- 第1层级是直推
                            CASE 
                                WHEN member_rec.depth_level = 1 THEN root_rec.wallet_address
                                ELSE NULL
                            END,
                            (current_layer > 1 OR member_rec.depth_level > 1) -- 第2层以上或非直推都算溢出
                        );
                        
                        total_placed := total_placed + 1;
                        position_found := true;
                    END IF;
                    
                    pos_idx := pos_idx + 1;
                END LOOP;
                
                current_layer := current_layer + 1;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RETURN format('重建了%s个矩阵位置记录', total_placed);
END;
$$ LANGUAGE plpgsql;

-- 第4步：创建矩阵视图
-- ========================================

-- 每个成员的三三矩阵视图
CREATE OR REPLACE VIEW member_matrix_view AS
WITH matrix_stats AS (
    SELECT 
        matrix_root,
        matrix_layer,
        COUNT(*) FILTER (WHERE matrix_position = 'L') as left_count,
        COUNT(*) FILTER (WHERE matrix_position = 'M') as middle_count,
        COUNT(*) FILTER (WHERE matrix_position = 'R') as right_count,
        COUNT(*) as total_in_layer,
        CASE 
            WHEN matrix_layer = 1 THEN 3
            WHEN matrix_layer = 2 THEN 9
            WHEN matrix_layer = 3 THEN 27
            ELSE POWER(3, matrix_layer)
        END as max_capacity
    FROM referrals
    GROUP BY matrix_root, matrix_layer
),
next_position AS (
    SELECT 
        matrix_root,
        matrix_layer,
        CASE 
            WHEN left_count = 0 THEN 'L'
            WHEN middle_count = 0 THEN 'M' 
            WHEN right_count = 0 THEN 'R'
            ELSE 'FULL'
        END as next_available_position,
        (left_count + middle_count + right_count) = max_capacity as layer_complete
    FROM matrix_stats
)
SELECT 
    m.wallet_address as matrix_root,
    m.current_level,
    COALESCE(ms.matrix_layer, 0) as matrix_layer,
    COALESCE(ms.left_count, 0) as left_count,
    COALESCE(ms.middle_count, 0) as middle_count,
    COALESCE(ms.right_count, 0) as right_count,
    COALESCE(ms.total_in_layer, 0) as total_in_layer,
    COALESCE(ms.max_capacity, 3) as max_capacity,
    COALESCE(np.next_available_position, 'L') as next_available_position,
    COALESCE(np.layer_complete, false) as layer_complete
FROM members m
LEFT JOIN matrix_stats ms ON m.wallet_address = ms.matrix_root
LEFT JOIN next_position np ON ms.matrix_root = np.matrix_root AND ms.matrix_layer = np.matrix_layer
WHERE m.current_level > 0
ORDER BY m.wallet_address, ms.matrix_layer;

-- 矩阵成员详情视图
CREATE OR REPLACE VIEW matrix_members_detail AS
SELECT 
    r.matrix_root,
    r.matrix_layer,
    r.matrix_position,
    r.member_wallet,
    r.matrix_parent,
    r.is_direct_referral,
    r.is_spillover_placed,
    m.current_level as member_level,
    m.created_at as member_activated_at
FROM referrals r
JOIN members m ON r.member_wallet = m.wallet_address
ORDER BY r.matrix_root, r.matrix_layer, 
         CASE r.matrix_position 
           WHEN 'L' THEN 1 
           WHEN 'M' THEN 2 
           WHEN 'R' THEN 3 
         END;

-- 第5步：执行重建
-- ========================================

-- 构建递归推荐关系
SELECT build_recursive_referrals() as "递归推荐关系构建结果";

-- 重建referrals表
SELECT rebuild_referrals_with_spillover() as "矩阵位置重建结果";

-- 验证结果
SELECT '=== 验证：递归推荐关系 ===' as section;
SELECT 
    root_referrer,
    depth_level,
    COUNT(*) as members_count
FROM recursive_referrals
GROUP BY root_referrer, depth_level
ORDER BY root_referrer, depth_level;

SELECT '=== 验证：每个成员的矩阵状态 ===' as section;
SELECT * FROM member_matrix_view WHERE matrix_layer <= 2;

SELECT '=== 验证：Root矩阵详情 ===' as section;
SELECT * FROM matrix_members_detail WHERE matrix_root LIKE '0x000%0001';