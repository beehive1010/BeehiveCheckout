-- 重新构建完整的会员矩阵系统
-- ========================================
-- 基于激活序号的全新设计
-- ========================================

-- 备份完成确认
SELECT '=== 开始重新构建系统 ===' as status;
SELECT COUNT(*) || '个会员数据已备份到 members_backup' as backup_status FROM members_backup;

-- 第1步：删除现有表格并重建
-- ========================================

-- 删除依赖的表和视图
DROP VIEW IF EXISTS member_matrix_status CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS spillover_matrix CASCADE;
DROP TABLE IF EXISTS activation_rewards CASCADE;
DROP TABLE IF EXISTS recursive_referrals CASCADE;
DROP TABLE IF EXISTS member_activation_sequence CASCADE;

-- 删除members表（谨慎操作）
DROP TABLE IF EXISTS members CASCADE;

-- 第2步：重新创建members表（加入激活序号）
-- ========================================

CREATE TABLE members (
    wallet_address VARCHAR(42) PRIMARY KEY,
    referrer_wallet VARCHAR(42), -- 推荐人地址
    current_level INTEGER NOT NULL DEFAULT 0,
    activation_id INTEGER UNIQUE, -- 全网激活序号
    activation_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_members_activation_id ON members(activation_id);
CREATE INDEX idx_members_referrer ON members(referrer_wallet);
CREATE INDEX idx_members_level ON members(current_level);

-- 第3步：从备份恢复数据并分配激活序号
-- ========================================

-- 恢复数据并分配激活序号，确保数据完整性
INSERT INTO members (
    wallet_address,
    referrer_wallet,
    current_level,
    activation_id,
    activation_time,
    created_at
)
SELECT 
    wallet_address,
    CASE 
        -- 自己不能推荐自己
        WHEN referrer_wallet = wallet_address THEN NULL
        -- 推荐者必须先是会员（在创建时间上早于被推荐人）
        WHEN referrer_wallet IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM members_backup ref 
            WHERE ref.wallet_address = members_backup.referrer_wallet 
            AND ref.current_level > 0
            AND ref.created_at < members_backup.created_at
        ) THEN NULL
        ELSE referrer_wallet
    END as referrer_wallet,
    current_level,
    ROW_NUMBER() OVER (ORDER BY created_at) - 1 as activation_id, -- 从0开始
    created_at as activation_time,
    created_at
FROM members_backup
WHERE current_level > 0
ORDER BY created_at;

-- 第4步：创建新的referrals表
-- ========================================

CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_wallet VARCHAR(42) NOT NULL,
    referrer_wallet VARCHAR(42) NOT NULL,
    matrix_root VARCHAR(42) NOT NULL, -- 矩阵根节点
    matrix_parent VARCHAR(42), -- 矩阵父节点
    matrix_position CHAR(1) CHECK (matrix_position IN ('L','M','R')),
    matrix_layer INTEGER NOT NULL DEFAULT 1,
    activation_id INTEGER, -- 全网激活序号
    is_direct_referral BOOLEAN DEFAULT false, -- 是否直推
    is_spillover_placed BOOLEAN DEFAULT false, -- 是否溢出安置
    placed_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (member_wallet) REFERENCES members(wallet_address),
    FOREIGN KEY (matrix_root) REFERENCES members(wallet_address),
    UNIQUE(member_wallet, matrix_root) -- 每个成员在每个矩阵中只能有一条记录
);

-- 创建索引
CREATE INDEX idx_referrals_member ON referrals(member_wallet);
CREATE INDEX idx_referrals_matrix_root ON referrals(matrix_root);
CREATE INDEX idx_referrals_activation_id ON referrals(activation_id);
CREATE INDEX idx_referrals_layer_position ON referrals(matrix_layer, matrix_position);

-- 第5步：创建核心安置函数
-- ========================================

CREATE OR REPLACE FUNCTION place_by_activation_sequence()
RETURNS TEXT AS $$
DECLARE
    member_rec RECORD;
    root_wallet VARCHAR(42);
    target_matrix VARCHAR(42);
    position_char CHAR(1);
    layer_num INTEGER;
    total_placed INTEGER := 0;
    positions CHAR(1)[] := ARRAY['L','M','R'];
    pos_idx INTEGER;
    placement_found BOOLEAN;
BEGIN
    -- 获取原始根节点（激活序号0）
    SELECT wallet_address INTO root_wallet 
    FROM members WHERE activation_id = 0;
    
    -- 清空referrals表
    DELETE FROM referrals;
    
    -- 按激活序号处理每个成员
    FOR member_rec IN 
        SELECT 
            wallet_address,
            referrer_wallet,
            activation_id,
            activation_time
        FROM members
        WHERE activation_id > 0 -- 跳过根节点
        ORDER BY activation_id
    LOOP
        placement_found := false;
        
        -- 确定目标矩阵：优先推荐人，如果推荐人矩阵满了则溢出
        target_matrix := COALESCE(member_rec.referrer_wallet, root_wallet);
        
        -- 在目标矩阵中寻找位置
        layer_num := 1;
        WHILE layer_num <= 19 AND NOT placement_found LOOP
            pos_idx := 1;
            WHILE pos_idx <= 3 AND NOT placement_found LOOP
                position_char := positions[pos_idx];
                
                -- 检查位置是否可用
                IF NOT EXISTS (
                    SELECT 1 FROM referrals 
                    WHERE matrix_root = target_matrix
                    AND matrix_layer = layer_num
                    AND matrix_position = position_char
                ) THEN
                    -- 安置成员
                    INSERT INTO referrals (
                        member_wallet,
                        referrer_wallet,
                        matrix_root,
                        matrix_parent,
                        matrix_position,
                        matrix_layer,
                        activation_id,
                        is_direct_referral,
                        is_spillover_placed,
                        placed_at
                    ) VALUES (
                        member_rec.wallet_address,
                        member_rec.referrer_wallet,
                        target_matrix,
                        CASE 
                            WHEN layer_num = 1 THEN target_matrix
                            ELSE target_matrix -- 简化父节点逻辑
                        END,
                        position_char,
                        layer_num,
                        member_rec.activation_id,
                        (member_rec.referrer_wallet = target_matrix),
                        (layer_num > 1 OR member_rec.referrer_wallet != target_matrix),
                        member_rec.activation_time
                    );
                    
                    placement_found := true;
                    total_placed := total_placed + 1;
                    
                    RAISE NOTICE '激活序号%：% 安置在 % 的 Layer%-% 位置', 
                        member_rec.activation_id,
                        SUBSTRING(member_rec.wallet_address, 1, 8),
                        SUBSTRING(target_matrix, 1, 8),
                        layer_num,
                        position_char;
                END IF;
                
                pos_idx := pos_idx + 1;
            END LOOP;
            layer_num := layer_num + 1;
        END LOOP;
        
        -- 如果在推荐人矩阵中没找到位置，溢出到其他成员的空矩阵
        IF NOT placement_found THEN
            -- 寻找前面激活成员的空位置进行溢出安置
            FOR target_matrix IN
                SELECT wallet_address FROM members
                WHERE activation_id > 0 AND activation_id < member_rec.activation_id
                ORDER BY activation_id
            LOOP
                layer_num := 1;
                pos_idx := 1;
                WHILE pos_idx <= 3 AND NOT placement_found LOOP
                    position_char := positions[pos_idx];
                    
                    IF NOT EXISTS (
                        SELECT 1 FROM referrals 
                        WHERE matrix_root = target_matrix
                        AND matrix_layer = layer_num
                        AND matrix_position = position_char
                    ) THEN
                        INSERT INTO referrals (
                            member_wallet,
                            referrer_wallet,
                            matrix_root,
                            matrix_parent,
                            matrix_position,
                            matrix_layer,
                            activation_id,
                            is_direct_referral,
                            is_spillover_placed,
                            placed_at
                        ) VALUES (
                            member_rec.wallet_address,
                            member_rec.referrer_wallet,
                            target_matrix,
                            target_matrix,
                            position_char,
                            layer_num,
                            member_rec.activation_id,
                            false, -- 溢出不算直推
                            true,  -- 这是溢出安置
                            member_rec.activation_time
                        );
                        
                        placement_found := true;
                        total_placed := total_placed + 1;
                        
                        RAISE NOTICE '激活序号%：% 溢出到 % 的 Layer%-% 位置', 
                            member_rec.activation_id,
                            SUBSTRING(member_rec.wallet_address, 1, 8),
                            SUBSTRING(target_matrix, 1, 8),
                            layer_num,
                            position_char;
                        EXIT; -- 找到位置后退出循环
                    END IF;
                    
                    pos_idx := pos_idx + 1;
                END LOOP;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN format('成功安置了%s个成员', total_placed);
END;
$$ LANGUAGE plpgsql;

-- 第6步：创建矩阵状态视图
-- ========================================

CREATE OR REPLACE VIEW member_matrix_view AS
SELECT 
    m.activation_id as 激活序号,
    SUBSTRING(m.wallet_address, 1, 10) || '...' as 会员地址,
    CASE 
        WHEN m.referrer_wallet IS NULL THEN '🌟 原始根节点'
        ELSE SUBSTRING(m.referrer_wallet, 1, 8) || '...'
    END as 推荐人,
    COUNT(r.id) FILTER (WHERE r.is_direct_referral = true) as 直推会员人数,
    COUNT(r.id) FILTER (WHERE r.is_spillover_placed = true) as 溢出人数,
    SUBSTRING(COALESCE((
        SELECT member_wallet FROM referrals 
        WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'L'
        LIMIT 1
    ), ''), 1, 8) || CASE WHEN LENGTH(COALESCE((
        SELECT member_wallet FROM referrals 
        WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'L'
        LIMIT 1
    ), '')) > 0 THEN '...' ELSE '' END as L安置会员,
    SUBSTRING(COALESCE((
        SELECT member_wallet FROM referrals 
        WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'M'
        LIMIT 1
    ), ''), 1, 8) || CASE WHEN LENGTH(COALESCE((
        SELECT member_wallet FROM referrals 
        WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'M'
        LIMIT 1
    ), '')) > 0 THEN '...' ELSE '' END as M安置会员,
    SUBSTRING(COALESCE((
        SELECT member_wallet FROM referrals 
        WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'R'
        LIMIT 1
    ), ''), 1, 8) || CASE WHEN LENGTH(COALESCE((
        SELECT member_wallet FROM referrals 
        WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'R'
        LIMIT 1
    ), '')) > 0 THEN '...' ELSE '' END as R安置会员,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM referrals WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'L') THEN 'L'
        WHEN NOT EXISTS (SELECT 1 FROM referrals WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'M') THEN 'M'
        WHEN NOT EXISTS (SELECT 1 FROM referrals WHERE matrix_root = m.wallet_address AND matrix_layer = 1 AND matrix_position = 'R') THEN 'R'
        ELSE 'FULL'
    END as 空缺安置位置
FROM members m
LEFT JOIN referrals r ON m.wallet_address = r.matrix_root
GROUP BY m.activation_id, m.wallet_address, m.referrer_wallet
ORDER BY m.activation_id;

-- 第7步：执行重建
-- ========================================

SELECT '=== 数据恢复完成 ===' as status;
SELECT COUNT(*) || '个会员已重新创建' as members_count FROM members;

-- 执行安置
SELECT place_by_activation_sequence() as "安置执行结果";

-- 显示最终结果
SELECT '=== 重构后的矩阵系统 ===' as final_result;
SELECT * FROM member_matrix_view;