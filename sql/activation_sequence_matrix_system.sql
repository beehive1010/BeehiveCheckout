-- 基于全网激活序号的矩阵安置系统
-- ========================================
-- 根据用户描述的逻辑：全网只有一个原始根节点，按激活序号0,1,2,3...进行安置
-- ========================================

-- 第1步：创建全网激活序号表
-- ========================================

DROP TABLE IF EXISTS member_activation_sequence CASCADE;
CREATE TABLE member_activation_sequence (
    activation_id INTEGER PRIMARY KEY,  -- 全网激活序号：0,1,2,3...
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    referrer_wallet VARCHAR(42), -- 推荐人
    activation_time TIMESTAMP NOT NULL,
    current_level INTEGER NOT NULL,
    FOREIGN KEY (wallet_address) REFERENCES members(wallet_address)
);

-- 填充激活序号表
INSERT INTO member_activation_sequence (
    activation_id,
    wallet_address, 
    referrer_wallet,
    activation_time,
    current_level
)
SELECT 
    ROW_NUMBER() OVER (ORDER BY created_at) - 1 as activation_id,  -- 从0开始
    wallet_address,
    referrer_wallet,
    created_at,
    current_level
FROM members 
WHERE current_level > 0
ORDER BY created_at;

-- 第2步：创建按激活序号的安置逻辑函数
-- ========================================

CREATE OR REPLACE FUNCTION place_members_by_activation_sequence()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    target_member_rec RECORD;
    current_activation_id INTEGER;
    placement_found BOOLEAN;
    target_wallet VARCHAR(42);
    position_char CHAR(1);
    positions CHAR(1)[] := ARRAY['L','M','R'];
    pos_idx INTEGER;
    layer_num INTEGER;
    total_placements INTEGER := 0;
    root_wallet VARCHAR(42);
BEGIN
    -- 获取根节点地址（激活序号0）
    SELECT wallet_address INTO root_wallet 
    FROM member_activation_sequence 
    WHERE activation_id = 0;
    
    -- 清空现有referrals表
    DELETE FROM referrals;
    
    -- 按激活序号处理每个成员（从序号1开始，跳过根节点0）
    FOR member_rec IN 
        SELECT 
            activation_id,
            wallet_address,
            referrer_wallet,
            activation_time
        FROM member_activation_sequence
        WHERE activation_id > 0  -- 跳过根节点
        ORDER BY activation_id
    LOOP
        placement_found := false;
        
        -- 确定安置目标：优先直推推荐人，其次溢出到上级
        -- 1. 如果是根节点的直推，优先安置在根节点矩阵
        -- 2. 如果根节点Layer 1已满，则溢出
        -- 3. 如果是其他人的直推，安置在推荐人矩阵
        
        -- 先尝试安置在推荐人的矩阵中
        IF member_rec.referrer_wallet IS NOT NULL THEN
            target_wallet := member_rec.referrer_wallet;
        ELSE
            target_wallet := root_wallet; -- 如果没有推荐人，安置在根节点
        END IF;
        
        -- 在目标矩阵中寻找位置
        layer_num := 1;
        WHILE layer_num <= 19 AND NOT placement_found LOOP
            pos_idx := 1;
            WHILE pos_idx <= 3 AND NOT placement_found LOOP
                position_char := positions[pos_idx];
                
                -- 检查位置是否可用
                IF NOT EXISTS (
                    SELECT 1 FROM referrals 
                    WHERE matrix_root = target_wallet
                    AND matrix_layer = layer_num
                    AND matrix_position = position_char
                ) THEN
                    -- 找到可用位置，进行安置
                    INSERT INTO referrals (
                        member_wallet,
                        referrer_wallet,
                        matrix_root,
                        matrix_parent,
                        matrix_layer,
                        matrix_position,
                        is_direct_referral,
                        is_spillover_placed,
                        placed_at,
                        activation_rank
                    ) VALUES (
                        member_rec.wallet_address,
                        member_rec.referrer_wallet,
                        target_wallet,
                        CASE 
                            WHEN layer_num = 1 THEN target_wallet
                            ELSE (
                                SELECT member_wallet FROM referrals 
                                WHERE matrix_root = target_wallet
                                AND matrix_layer = layer_num - 1
                                AND matrix_position = position_char
                                LIMIT 1
                            )
                        END,
                        layer_num,
                        position_char,
                        (member_rec.referrer_wallet = target_wallet),
                        (layer_num > 1 OR member_rec.referrer_wallet != target_wallet),
                        member_rec.activation_time,
                        member_rec.activation_id
                    );
                    
                    placement_found := true;
                    total_placements := total_placements + 1;
                    
                    RAISE NOTICE '激活序号% (%): 安置在 % 的Layer%-% (推荐人: %)', 
                        member_rec.activation_id,
                        SUBSTRING(member_rec.wallet_address, 1, 8),
                        SUBSTRING(target_wallet, 1, 8),
                        layer_num,
                        position_char,
                        COALESCE(SUBSTRING(member_rec.referrer_wallet, 1, 8), 'NULL');
                END IF;
                
                pos_idx := pos_idx + 1;
            END LOOP;
            layer_num := layer_num + 1;
        END LOOP;
        
        -- 如果在推荐人矩阵中没找到位置，尝试溢出安置
        IF NOT placement_found AND member_rec.referrer_wallet = root_wallet THEN
            -- 根节点直推溢出：寻找前面激活成员的空位
            FOR target_member_rec IN
                SELECT wallet_address FROM member_activation_sequence
                WHERE activation_id > 0 AND activation_id < member_rec.activation_id
                ORDER BY activation_id
            LOOP
                layer_num := 1;
                WHILE layer_num <= 19 AND NOT placement_found LOOP
                    pos_idx := 1;
                    WHILE pos_idx <= 3 AND NOT placement_found LOOP
                        position_char := positions[pos_idx];
                        
                        IF NOT EXISTS (
                            SELECT 1 FROM referrals 
                            WHERE matrix_root = target_member_rec.wallet_address
                            AND matrix_layer = layer_num
                            AND matrix_position = position_char
                        ) THEN
                            INSERT INTO referrals (
                                member_wallet,
                                referrer_wallet, 
                                matrix_root,
                                matrix_parent,
                                matrix_layer,
                                matrix_position,
                                is_direct_referral,
                                is_spillover_placed,
                                placed_at,
                                activation_rank
                            ) VALUES (
                                member_rec.wallet_address,
                                member_rec.referrer_wallet,
                                target_member_rec.wallet_address,
                                CASE 
                                    WHEN layer_num = 1 THEN target_member_rec.wallet_address
                                    ELSE target_member_rec.wallet_address -- 简化parent逻辑
                                END,
                                layer_num,
                                position_char,
                                false, -- 溢出安置不算直推
                                true,  -- 这是溢出安置
                                member_rec.activation_time,
                                member_rec.activation_id
                            );
                            
                            placement_found := true;
                            total_placements := total_placements + 1;
                            
                            RAISE NOTICE '激活序号% (%): 溢出安置到 % 的Layer%-% (原推荐人: %)', 
                                member_rec.activation_id,
                                SUBSTRING(member_rec.wallet_address, 1, 8),
                                SUBSTRING(target_member_rec.wallet_address, 1, 8),
                                layer_num,
                                position_char,
                                SUBSTRING(member_rec.referrer_wallet, 1, 8);
                        END IF;
                        
                        pos_idx := pos_idx + 1;
                    END LOOP;
                    layer_num := layer_num + 1;
                END LOOP;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN format('按激活序号安置了%s个成员', total_placements);
END;
$$ LANGUAGE plpgsql;

-- 第3步：创建自动矩阵状态视图
-- ========================================

CREATE OR REPLACE VIEW member_matrix_status AS
WITH matrix_summary AS (
    SELECT 
        mas.activation_id,
        mas.wallet_address as matrix_root,
        mas.referrer_wallet,
        COUNT(r.id) FILTER (WHERE r.matrix_layer = 1 AND r.matrix_position = 'L') as layer1_L,
        COUNT(r.id) FILTER (WHERE r.matrix_layer = 1 AND r.matrix_position = 'M') as layer1_M,  
        COUNT(r.id) FILTER (WHERE r.matrix_layer = 1 AND r.matrix_position = 'R') as layer1_R,
        COUNT(r.id) FILTER (WHERE r.matrix_layer = 1) as layer1_total,
        COUNT(r.id) FILTER (WHERE r.is_direct_referral = true) as direct_referrals,
        COUNT(r.id) FILTER (WHERE r.is_spillover_placed = true) as spillover_count
    FROM member_activation_sequence mas
    LEFT JOIN referrals r ON mas.wallet_address = r.matrix_root
    GROUP BY mas.activation_id, mas.wallet_address, mas.referrer_wallet
)
SELECT 
    activation_id as 激活序号,
    SUBSTRING(matrix_root, 1, 10) || '...' as 会员地址,
    CASE 
        WHEN referrer_wallet IS NULL THEN '🌟 原始根节点'
        ELSE SUBSTRING(referrer_wallet, 1, 8) || '...'
    END as 推荐人,
    direct_referrals as 直推会员人数,
    spillover_count as 溢出人数,
    CASE WHEN layer1_L > 0 THEN SUBSTRING((
        SELECT member_wallet FROM referrals 
        WHERE matrix_root = ms.matrix_root AND matrix_layer = 1 AND matrix_position = 'L'
        LIMIT 1
    ), 1, 8) || '...' ELSE NULL END as L安置会员,
    CASE WHEN layer1_M > 0 THEN SUBSTRING((
        SELECT member_wallet FROM referrals 
        WHERE matrix_root = ms.matrix_root AND matrix_layer = 1 AND matrix_position = 'M' 
        LIMIT 1
    ), 1, 8) || '...' ELSE NULL END as M安置会员,
    CASE WHEN layer1_R > 0 THEN SUBSTRING((
        SELECT member_wallet FROM referrals 
        WHERE matrix_root = ms.matrix_root AND matrix_layer = 1 AND matrix_position = 'R'
        LIMIT 1  
    ), 1, 8) || '...' ELSE NULL END as R安置会员,
    CASE 
        WHEN layer1_L = 0 THEN 'L'
        WHEN layer1_M = 0 THEN 'M'
        WHEN layer1_R = 0 THEN 'R' 
        ELSE 'FULL'
    END as 空缺安置位置,
    layer1_total as Layer1总数
FROM matrix_summary ms
ORDER BY activation_id;

-- 第4步：执行安置并显示结果
-- ========================================

-- 显示激活序号表
SELECT '=== 全网会员激活序号表 ===' as section;
SELECT * FROM member_activation_sequence ORDER BY activation_id;

-- 执行按激活序号安置
SELECT place_members_by_activation_sequence() as "激活序号安置结果";

-- 显示最终矩阵状态
SELECT '=== 每个会员作为根的矩阵状态 ===' as section;
SELECT * FROM member_matrix_status;